import { existsSync, realpathSync } from "node:fs";
import { basename, dirname, isAbsolute, relative, resolve } from "node:path";

import type { QualityPermissionBlockReason } from "../../shared/quality.ts";

export function qualityReadToolAllowed(cwd: string, tool: string, input: unknown, onDenied?: (reason: QualityPermissionBlockReason) => void): boolean {
  const deny = (reason: QualityPermissionBlockReason): false => { onDenied?.(reason); return false; };
  if (typeof input !== "object" || input === null || Array.isArray(input)) return deny("invalid_tool_input");
  if (tool === "Read") {
    if (!("file_path" in input) || typeof input.file_path !== "string") return deny("invalid_tool_input");
    return isQualityRepositoryPath(cwd, input.file_path, onDenied);
  }
  let path = cwd;
  if ("path" in input) {
    if (typeof input.path !== "string") return deny("invalid_tool_input");
    path = input.path;
  }
  if (!isQualityRepositoryPath(cwd, path, onDenied)) return false;
  if (tool === "Glob") {
    if (!("pattern" in input) || typeof input.pattern !== "string" || !input.pattern) return deny("invalid_tool_input");
    if (input.pattern.split("/").includes("..")) return deny("path_outside_workspace");
    const prefix = input.pattern.split(/[?*[\]]/, 1)[0] ?? "";
    return isQualityRepositoryPath(path, prefix || ".", onDenied);
  }
  return tool === "Grep" || deny("unsupported_read_tool");
}

export function isQualityRepositoryPath(cwd: string, path: string, onDenied?: (reason: QualityPermissionBlockReason) => void): boolean {
  const deny = (reason: QualityPermissionBlockReason): false => { onDenied?.(reason); return false; };
  let root: string;
  try {
    root = realpathSync(cwd);
  } catch {
    return deny("workspace_unresolvable");
  }
  try {
    let candidate = resolve(root, path);
    const missing: string[] = [];
    while (!existsSync(candidate)) {
      const parent = dirname(candidate);
      if (parent === candidate) return deny("path_unresolvable");
      missing.unshift(basename(candidate));
      candidate = parent;
    }
    const target = resolve(realpathSync(candidate), ...missing);
    const offset = relative(root, target);
    if (isAbsolute(offset) || offset === ".." || offset.startsWith("../")) return deny("path_outside_workspace");
    return true;
  } catch {
    return deny("path_unresolvable");
  }
}

export function qualityReadScopeAllows(cwd: string, words: readonly string[], onDenied?: (reason: QualityPermissionBlockReason) => void): boolean {
  const deny = (reason: QualityPermissionBlockReason): false => { onDenied?.(reason); return false; };
  const command = words[0];
  if (!command || !["pwd", "ls", "cat", "head", "tail", "wc", "rg"].includes(command)) return deny("command_not_allowlisted");
  const args = words.slice(1);
  const patternIndexes = new Set<number>();
  if (command === "rg") {
    const RG_SHORT_VALUE_FLAGS = "ABCEMTdgjmrt";
    const RG_LONG_VALUE_FLAGS = ["--after-context", "--before-context", "--context", "--encoding", "--max-columns", "--type-not", "--max-depth", "--glob", "--iglob", "--threads", "--max-count", "--replace", "--type", "--sort", "--sortr", "--type-add", "--max-filesize", "--context-separator", "--path-separator"];
    const RG_SHORT_SWITCHES = "0abciFHIlnNopPqsSuUvwxz";
    const RG_LONG_SWITCHES = ["--ignore-case", "--smart-case", "--case-sensitive", "--fixed-strings", "--word-regexp", "--line-regexp", "--invert-match", "--count", "--count-matches", "--files-with-matches", "--files-without-match", "--line-number", "--no-line-number", "--with-filename", "--no-filename", "--heading", "--no-heading", "--hidden", "--no-ignore", "--no-ignore-vcs", "--only-matching", "--multiline", "--json", "--vimgrep", "--column", "--byte-offset", "--text", "--null", "--quiet", "--pcre2", "--trim", "--stats", "--sort-files", "--no-messages", "--unrestricted", "--crlf", "--passthru", "--no-config"];
    const positionals: number[] = [];
    let patternSupplied = false;
    let optionsEnded = false;
    let optionsRecognized = true;
    for (let index = 0; index < args.length; index += 1) {
      const word = args[index] ?? "";
      if (optionsEnded || word === "-" || !word.startsWith("-")) {
        positionals.push(index);
        continue;
      }
      if (word === "--") {
        optionsEnded = true;
        continue;
      }
      if (word.startsWith("--")) {
        if (word === "--regexp") {
          patternSupplied = true;
          patternIndexes.add(index + 1);
          index += 1;
        } else if (word.startsWith("--regexp=")) {
          patternSupplied = true;
          patternIndexes.add(index);
        } else if (RG_LONG_VALUE_FLAGS.includes(word)) {
          index += 1;
        } else if (!word.includes("=") && !RG_LONG_SWITCHES.includes(word)) {
          optionsRecognized = false;
        }
        continue;
      }
      for (let letter = 1; letter < word.length; letter += 1) {
        const flag = word[letter] ?? "";
        if (flag !== "e" && !RG_SHORT_VALUE_FLAGS.includes(flag)) {
          if (!RG_SHORT_SWITCHES.includes(flag)) optionsRecognized = false;
          continue;
        }
        const attached = letter < word.length - 1;
        if (flag === "e") {
          patternSupplied = true;
          patternIndexes.add(attached ? index : index + 1);
        }
        if (!attached) index += 1;
        break;
      }
    }
    const firstPositional = positionals[0];
    if (!patternSupplied && firstPositional !== undefined) patternIndexes.add(firstPositional);
    if (!optionsRecognized) patternIndexes.clear();
  }
  return args.every((word, index) => {
    if (word.includes("~")) return deny("home_expansion");
    if (word.startsWith("--pre") || word.startsWith("--follow") || word.startsWith("--files0-from")) return deny("unsafe_read_option");
    if (command === "rg" && (word === "--file" || word.startsWith("--file=") || /^-[^-]*f/.test(word))) return deny("unsafe_read_option");
    if ((command === "rg" || command === "ls") && /^-[^-]*L/.test(word)) return deny("unsafe_read_option");
    if (patternIndexes.has(index)) return true;
    let value = word;
    if (word.startsWith("-")) {
      const assignment = word.indexOf("=");
      if (assignment >= 0) value = word.slice(assignment + 1);
      else if (word.includes("/")) value = word.slice(2);
      else return true;
    }
    return isQualityRepositoryPath(cwd, value, onDenied);
  });
}
