import { existsSync, realpathSync } from "node:fs";
import { basename, dirname, isAbsolute, relative, resolve } from "node:path";

export function qualityReadToolAllowed(cwd: string, tool: string, input: unknown): boolean {
  if (typeof input !== "object" || input === null || Array.isArray(input)) return false;
  if (tool === "Read") return "file_path" in input && typeof input.file_path === "string" && isQualityRepositoryPath(cwd, input.file_path);
  let path = cwd;
  if ("path" in input) {
    if (typeof input.path !== "string") return false;
    path = input.path;
  }
  if (!isQualityRepositoryPath(cwd, path)) return false;
  if (tool === "Glob") {
    if (!("pattern" in input) || typeof input.pattern !== "string" || !input.pattern || input.pattern.split("/").includes("..")) return false;
    const prefix = input.pattern.split(/[?*[\]]/, 1)[0] ?? "";
    return isQualityRepositoryPath(path, prefix || ".");
  }
  return tool === "Grep";
}

export function isQualityRepositoryPath(cwd: string, path: string): boolean {
  try {
    const root = realpathSync(cwd);
    let candidate = resolve(root, path);
    const missing: string[] = [];
    while (!existsSync(candidate)) {
      const parent = dirname(candidate);
      if (parent === candidate) return false;
      missing.unshift(basename(candidate));
      candidate = parent;
    }
    const target = resolve(realpathSync(candidate), ...missing);
    const offset = relative(root, target);
    return !isAbsolute(offset) && offset !== ".." && !offset.startsWith("../");
  } catch {
    return false;
  }
}

export function qualityReadScopeAllows(cwd: string, words: readonly string[]): boolean {
  const command = words[0];
  if (!command || !["pwd", "ls", "cat", "head", "tail", "wc", "rg"].includes(command)) return false;
  return words.slice(1).every((word) => {
    if (word.includes("~")) return false;
    if (word.startsWith("--pre") || word.startsWith("--follow") || word.startsWith("--files0-from")) return false;
    if (command === "rg" && (word === "--file" || word.startsWith("--file=") || /^-[^-]*f/.test(word))) return false;
    if ((command === "rg" || command === "ls") && /^-[^-]*L/.test(word)) return false;
    let value = word;
    if (word.startsWith("-")) {
      const assignment = word.indexOf("=");
      if (assignment >= 0) value = word.slice(assignment + 1);
      else if (word.includes("/")) value = word.slice(2);
      else return true;
    }
    return isQualityRepositoryPath(cwd, value);
  });
}
