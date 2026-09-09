import { readFileSync } from "node:fs";
import { join } from "node:path";

import { z } from "zod";

const TYPECHECK_COMMANDS = new Set(["tsc", "vue-tsc", "tsgo"]);
const TYPECHECK_SCRIPTS = new Set(["typecheck", "type-check", "check:types", "check-types"]);
const COMMAND_WRAPPERS = new Set(["npx", "bunx"]);
const PACKAGE_MANAGERS = new Set(["npm", "pnpm", "yarn", "bun"]);
const OPTIONS_WITH_VALUE = new Set([
  "--package",
  "-p",
  "--filter",
  "-F",
  "--dir",
  "-C",
  "--workspace",
  "-w",
  "--prefix",
  "--cwd",
]);
const SHELL_WORDS = /(?:"(?:\\.|[^"\\])*"|'[^']*'|[^\s]+)/g;
const ENV_ASSIGNMENT = /^[A-Za-z_][A-Za-z0-9_]*=/;
const MAX_SCRIPT_DEPTH = 3;
const packageScriptsSchema = z.object({ scripts: z.record(z.string(), z.string()).optional() });

function executableName(value: string): string {
  const unquoted = value.replace(/^['"]|['"]$/g, "");
  return unquoted.slice(unquoted.lastIndexOf("/") + 1);
}

function commandSegments(command: string): string[] {
  const segments: string[] = [];
  let start = 0;
  let quote: "'" | '"' | null = null;
  let escaped = false;
  for (let index = 0; index < command.length; index += 1) {
    const character = command[index];
    if (escaped) {
      escaped = false;
      continue;
    }
    if (character === "\\" && quote !== "'") {
      escaped = true;
      continue;
    }
    if (character === "'" || character === '"') {
      quote = quote === character ? null : (quote ?? character);
      continue;
    }
    if (quote !== null || (character !== ";" && character !== "|" && character !== "&" && character !== "\n")) {
      continue;
    }
    segments.push(command.slice(start, index));
    while (command[index + 1] === character) index += 1;
    start = index + 1;
  }
  segments.push(command.slice(start));
  return segments;
}

function commandWords(segment: string): string[] {
  return segment.match(SHELL_WORDS)?.map(executableName) ?? [];
}

function skipOptions(words: string[], start: number): number {
  let index = start;
  while (words[index]?.startsWith("-") === true) {
    const option = words[index] ?? "";
    index += 1;
    if (OPTIONS_WITH_VALUE.has(option)) index += 1;
  }
  return index;
}

function launchedPackageScript(words: string[], managerIndex: number): string | null {
  const manager = words[managerIndex];
  let index = managerIndex + 1;
  index = skipOptions(words, index);
  const action = words[index];
  if (action === "run" || action === "run-script") {
    const scriptIndex = skipOptions(words, index + 1);
    return words[scriptIndex] ?? null;
  }
  if (manager === "pnpm" && action !== undefined && action !== "exec" && action !== "x" && action !== "dlx") {
    return action;
  }
  return null;
}

function packageManagerLaunchesTypecheck(words: string[], managerIndex: number): boolean {
  const actionIndex = skipOptions(words, managerIndex + 1);
  const action = words[actionIndex];
  if (action === "exec" || action === "x" || action === "dlx") {
    const executableIndex = skipOptions(words, actionIndex + 1);
    return TYPECHECK_COMMANDS.has(words[executableIndex] ?? "");
  }
  return TYPECHECK_SCRIPTS.has(launchedPackageScript(words, managerIndex) ?? "");
}

function segmentLaunchesTypecheck(segment: string, typecheckScripts: ReadonlySet<string>): boolean {
  const words = commandWords(segment);
  let index = 0;
  while (ENV_ASSIGNMENT.test(words[index] ?? "")) index += 1;
  if (words[index] === "env") {
    index = skipOptions(words, index + 1);
    while (ENV_ASSIGNMENT.test(words[index] ?? "")) index += 1;
  }
  if (words[index] === "rtk") index += 1;
  if (words[index] === "corepack") index += 1;
  const command = words[index];
  if (command === undefined) return false;
  if (TYPECHECK_COMMANDS.has(command)) return true;
  if (COMMAND_WRAPPERS.has(command)) {
    const executableIndex = skipOptions(words, index + 1);
    return TYPECHECK_COMMANDS.has(words[executableIndex] ?? "");
  }
  if (!PACKAGE_MANAGERS.has(command)) return false;
  if (packageManagerLaunchesTypecheck(words, index)) return true;
  const script = launchedPackageScript(words, index);
  return script !== null && typecheckScripts.has(script);
}

export function launchesTypecheck(command: string, typecheckScripts: ReadonlySet<string> = new Set()): boolean {
  return commandSegments(command).some((segment) => segmentLaunchesTypecheck(segment, typecheckScripts));
}

export function typecheckScriptNames(cwd: string): string[] {
  let parsed: z.infer<typeof packageScriptsSchema>;
  try {
    parsed = packageScriptsSchema.parse(JSON.parse(readFileSync(join(cwd, "package.json"), "utf8")));
  } catch {
    return [];
  }
  const scripts = parsed.scripts ?? {};
  const typecheckScripts = new Set<string>();

  function resolvesToTypecheck(name: string, depth: number, visiting: Set<string>): boolean {
    if (TYPECHECK_SCRIPTS.has(name)) return true;
    if (depth >= MAX_SCRIPT_DEPTH || visiting.has(name)) return false;
    const body = scripts[name];
    if (body === undefined) return false;
    if (launchesTypecheck(body)) return true;
    const nextVisiting = new Set(visiting);
    nextVisiting.add(name);
    return commandSegments(body).some((segment) => {
      const words = commandWords(segment);
      const managerIndex = words.findIndex((word) => PACKAGE_MANAGERS.has(word));
      if (managerIndex < 0) return false;
      const child = launchedPackageScript(words, managerIndex);
      return child !== null && resolvesToTypecheck(child, depth + 1, nextVisiting);
    });
  }

  for (const name of Object.keys(scripts)) {
    if (resolvesToTypecheck(name, 0, new Set())) typecheckScripts.add(name);
  }
  return [...typecheckScripts];
}

export const TYPECHECK_DENIAL_REASON =
  "Le typecheck est désactivé pendant les reviews pour limiter l'utilisation. Analyse le diff et les types statiquement sans lancer tsc ni script équivalent.";

const ERE_SEGMENT_START = "(^|&&|\\|\\||[;|])[[:space:]]*";
const ERE_ENV_PREFIX =
  "([A-Za-z_][A-Za-z0-9_]*=[^[:space:]]+[[:space:]]+)*" +
  "(env([[:space:]]+-[^[:space:]]+)*([[:space:]]+[A-Za-z_][A-Za-z0-9_]*=[^[:space:]]+)*[[:space:]]+)?" +
  "(rtk[[:space:]]+)?(corepack[[:space:]]+)?";
const ERE_PATH_PREFIX = "([^[:space:]]*/)?";
const ERE_OPTIONS = "([[:space:]]+-[^[:space:]]+)*";
const ERE_WORD_END = "([[:space:]]|$)";
const ERE_PNPM_DIR_OPTIONS = "([[:space:]]+(-C|--dir|--filter|-F)[[:space:]]+[^[:space:]]+)*";
const SCRIPT_NAME_SANITIZER = /[^a-zA-Z0-9:_-]/g;

function alternation(values: Iterable<string>): string {
  return `(${[...values].join("|")})`;
}

/**
 * POSIX ERE translations of `launchesTypecheck`, built from the SAME constant lists, for the
 * generated Codex PreToolUse shell hook which cannot import this module at runtime.
 */
export function typecheckDenyPatterns(cwd: string): string[] {
  const binaries = alternation(TYPECHECK_COMMANDS);
  const wrappers = alternation(COMMAND_WRAPPERS);
  const managers = alternation(PACKAGE_MANAGERS);
  const scripts = new Set<string>(TYPECHECK_SCRIPTS);
  for (const name of typecheckScriptNames(cwd)) {
    const sanitized = name.replaceAll(SCRIPT_NAME_SANITIZER, "");
    if (sanitized !== "") scripts.add(sanitized);
  }
  const scriptNames = alternation(scripts);
  const head = `${ERE_SEGMENT_START}${ERE_ENV_PREFIX}`;
  return [
    `${head}${ERE_PATH_PREFIX}${binaries}${ERE_WORD_END}`,
    `${head}${wrappers}${ERE_OPTIONS}[[:space:]]+${ERE_PATH_PREFIX}${binaries}${ERE_WORD_END}`,
    `${head}${managers}[[:space:]]+(exec|x|dlx)${ERE_OPTIONS}[[:space:]]+${ERE_PATH_PREFIX}${binaries}${ERE_WORD_END}`,
    `${head}${managers}[[:space:]]+(run|run-script)[[:space:]]+${scriptNames}${ERE_WORD_END}`,
    `${head}pnpm${ERE_PNPM_DIR_OPTIONS}[[:space:]]+${scriptNames}${ERE_WORD_END}`,
  ];
}
