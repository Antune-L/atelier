import type { QualityPermissionBlockReason } from "../../shared/quality.ts";

import { isQualityRepositoryPath, qualityReadScopeAllows, qualityReadToolAllowed } from "./qualityReadPolicy.ts";

export const CODEX_BASH_DENIAL_REASON = "Commande Bash non autorisée. Utilise une commande directe de la liste permise, sans expansion, redirection ni wrapper.";
export const CODEX_SCOUT_DENIAL_REASON = "Les sous-agents de recherche ne peuvent utiliser ni Bash, ni apply_patch, ni spawn_agent.";
export const CODEX_DELEGATED_DENIAL_REASON = "Une session d'implémentation déléguée ne peut pas créer de sous-agent natif.";
export const CODEX_VALIDATOR_DENIAL_REASON = "Une session de validation ne peut ni modifier les fichiers ni créer de sous-agent.";
export const CODEX_NO_MATCHES_OBSERVATION = "No matches (rg exit code 1).";
export const CODEX_VALIDATOR_READ_ALLOW = [
  "Bash(pwd:*)", "Bash(ls:*)", "Bash(cat:*)", "Bash(head:*)", "Bash(tail:*)", "Bash(wc:*)", "Bash(rg:*)",
];

export function matchesCodexBashAllowlist(command: string, patterns: readonly string[], restrictReadOnly = false, cwd?: string, singleCommand = false, inspectWords?: (words: readonly string[]) => boolean, onDenied?: (reason: QualityPermissionBlockReason) => void): boolean {
  const deny = (reason: QualityPermissionBlockReason): false => { onDenied?.(reason); return false; };
  const UNSAFE_SHELL_CHARACTERS = new Set(["<", ">", "(", ")", "{", "}", "#"]);
  const segments: string[][] = [];
  let words: string[] = [];
  let word = "";
  let hasWord = false;
  let quote: "'" | '"' | null = null;
  let escaped = false;

  function finishWord(): void {
    if (!hasWord) return;
    words.push(word);
    word = "";
    hasWord = false;
  }

  function finishSegment(): boolean {
    finishWord();
    if (words.length === 0) return deny("shell_syntax");
    segments.push(words);
    words = [];
    return true;
  }

  const input = command.trim();
  if (input === "") return deny("invalid_tool_input");
  for (let index = 0; index < input.length; index += 1) {
    const character = input[index];
    if (character === undefined) return deny("shell_syntax");
    if (escaped) {
      if (character === "\n") return deny("shell_syntax");
      word += character;
      hasWord = true;
      escaped = false;
      continue;
    }
    if (character === "\\" && quote !== "'") {
      escaped = true;
      hasWord = true;
      continue;
    }
    if (quote === "'") {
      if (character === "'") quote = null;
      else word += character;
      continue;
    }
    if (character === "$" || character === "`") return deny("shell_expansion");
    if (quote === '"') {
      if (character === '"') quote = null;
      else word += character;
      continue;
    }
    if (character === "'" || character === '"') {
      quote = character;
      hasWord = true;
      continue;
    }
    if (restrictReadOnly && (character === "*" || character === "?" || character === "[" || character === "]")) return deny("unquoted_glob");
    if (UNSAFE_SHELL_CHARACTERS.has(character)) return deny("shell_syntax");
    if (character === ";" || character === "|" || character === "&" || character === "\n") {
      if (character === "&" && input[index + 1] !== "&") return deny("shell_syntax");
      if (character === "|" && input[index + 1] === "&") return deny("shell_syntax");
      if (!finishSegment()) return false;
      if (character === "&" || (character === "|" && input[index + 1] === "|")) index += 1;
      continue;
    }
    if (/\s/.test(character)) {
      finishWord();
      continue;
    }
    word += character;
    hasWord = true;
  }
  if (quote !== null || escaped || !finishSegment()) return deny("shell_syntax");
  if (singleCommand && segments.length !== 1) return deny("shell_syntax");

  return segments.every((segment) => {
    if (inspectWords && !inspectWords(segment)) return deny("command_not_allowlisted");
    if (restrictReadOnly && !cwd) return deny("working_directory_mismatch");
    if (restrictReadOnly && cwd && !qualityReadScopeAllows(cwd, segment, onDenied)) return false;
    const normalized = segment.join(" ");
    const matched = patterns.some((pattern) => {
      if (!pattern.startsWith("Bash(") || !pattern.endsWith(":*)")) return false;
      const prefix = pattern.slice(5, -3);
      return normalized === prefix || normalized.startsWith(`${prefix} `);
    });
    return matched || deny("command_not_allowlisted");
  });
}

export function isCodexReadOnlyRgNoMatchCommand(command: string, cwd: string): boolean {
  const patterns = ["Bash(rg:*)"];
  if (matchesCodexBashAllowlist(command, patterns, true, cwd, true)) return true;
  let innerCommand: string | undefined;
  const shellEnvelope = matchesCodexBashAllowlist(command, ["Bash(/bin/zsh:*)", "Bash(/bin/bash:*)", "Bash(/bin/sh:*)"], false, undefined, true, (words) => {
    if (words.length !== 3 || words[1] !== "-c") return false;
    innerCommand = words[2];
    return typeof innerCommand === "string";
  });
  return shellEnvelope && typeof innerCommand === "string" && matchesCodexBashAllowlist(innerCommand, patterns, true, cwd, true);
}

export function codexCommandPolicyScript(
  patterns: readonly string[] | undefined,
  scoutTypes: readonly string[],
  restrictAllSubagents: boolean,
  restrictNestedAgents: boolean,
  restrictValidator = false,
  cwd?: string,
): string {
  return `import { existsSync, realpathSync } from "node:fs";
import { basename, dirname, isAbsolute, relative, resolve } from "node:path";
const isQualityRepositoryPath = ${isQualityRepositoryPath.toString()};
const qualityReadToolAllowed = ${qualityReadToolAllowed.toString()};
const qualityReadScopeAllows = ${qualityReadScopeAllows.toString()};
const matchesCodexBashAllowlist = ${matchesCodexBashAllowlist.toString()};
const patterns = ${JSON.stringify(patterns ?? null)};
const scoutTypes = new Set(${JSON.stringify(scoutTypes)});
const restrictAllSubagents = ${JSON.stringify(restrictAllSubagents)};
const restrictNestedAgents = ${JSON.stringify(restrictNestedAgents)};
const restrictValidator = ${JSON.stringify(restrictValidator)};
const cwd = ${JSON.stringify(cwd ?? null)};
let blockReason = null;
const onDenied = (reason) => { blockReason ??= reason; };
let request;
try { request = JSON.parse(await Bun.stdin.text()); } catch { process.stdout.write("deny:invalid_tool_input"); process.exit(0); }
const toolName = request?.tool_name;
const isScout = (typeof request?.agent_type === "string" && scoutTypes.has(request.agent_type))
  || (restrictAllSubagents && typeof request?.agent_id === "string" && request.agent_id.length > 0);
if (restrictValidator && (toolName === "apply_patch" || toolName === "spawn_agent")) {
  process.stdout.write("validator");
} else if (restrictValidator && (toolName === "Read" || toolName === "Glob" || toolName === "Grep")) {
  process.stdout.write(typeof cwd === "string" && qualityReadToolAllowed(cwd, toolName, request?.tool_input, onDenied) ? "allow" : "deny:" + (blockReason ?? "invalid_tool_input"));
} else if (isScout && (toolName === "Bash" || toolName === "apply_patch" || toolName === "spawn_agent")) {
  process.stdout.write("scout");
} else if (restrictNestedAgents && toolName === "spawn_agent") {
  process.stdout.write("nested");
} else if (toolName === "Bash" && patterns !== null) {
  const command = request?.tool_input?.command ?? request?.tool_input?.cmd;
  const requestedCwd = request?.tool_input?.cwd ?? request?.tool_input?.workdir ?? cwd;
  let scoped = !restrictValidator;
  if (restrictValidator && typeof requestedCwd === "string" && typeof cwd === "string") {
    try { scoped = realpathSync(requestedCwd) === realpathSync(cwd); } catch { scoped = false; }
  }
  if (!scoped) onDenied("working_directory_mismatch");
  else if (typeof command !== "string") onDenied("invalid_tool_input");
  process.stdout.write(scoped && typeof command === "string" && matchesCodexBashAllowlist(command, patterns, restrictValidator, cwd, false, undefined, onDenied) ? "allow" : "deny:" + (blockReason ?? "command_not_allowlisted"));
} else {
  process.stdout.write("allow");
}
`;
}
