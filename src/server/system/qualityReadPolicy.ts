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
  try {
    const root = realpathSync(cwd);
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
  return words.slice(1).every((word) => {
    if (word.includes("~")) return deny("home_expansion");
    if (word.startsWith("--pre") || word.startsWith("--follow") || word.startsWith("--files0-from")) return deny("unsafe_read_option");
    if (command === "rg" && (word === "--file" || word.startsWith("--file=") || /^-[^-]*f/.test(word))) return deny("unsafe_read_option");
    if ((command === "rg" || command === "ls") && /^-[^-]*L/.test(word)) return deny("unsafe_read_option");
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
