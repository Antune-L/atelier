import { createHash } from "node:crypto";
import { isAbsolute, join, relative, resolve } from "node:path";

import { z } from "zod";

import type { ProjectConfig } from "../config.ts";
import { matchesCodexBashAllowlist } from "../system/codexCommandPolicy.ts";
import { presentPackageManagerFiles, resolvePackageManager, scriptRunner } from "../system/packageManager.ts";
import { parsePackageManifest } from "../system/repoInspection.ts";
import type { CodeSnapshot } from "../system/types.ts";

const FUNCTIONAL_CHECK_NAMES = ["test:e2e", "e2e"];
const CHECK_NAMES = ["typecheck", "lint", "test"] satisfies Array<"typecheck" | "lint" | "test">;

export function implementationQualityConfig(project: ProjectConfig): string {
  return createHash("sha256").update(JSON.stringify([project.scripts ?? null, project.validation ?? null])).digest("hex");
}

export function qualityScopeHashes(snapshot: CodeSnapshot, files: readonly string[]): Record<string, string> {
  return Object.fromEntries(Object.entries(snapshot.fileHashes).filter(([path]) => files.length === 0 || files.some((scope) => path === scope || path.startsWith(`${scope}/`))));
}

export async function implementationCheckCommands(project: ProjectConfig, directory: string, simulated: boolean, functional: boolean): Promise<Array<{ name: string; command: string }>> {
  if (simulated) return CHECK_NAMES.flatMap((name) => project.scripts?.[name] ? [{ name, command: project.scripts[name] }] : []);
  const manifestFile = Bun.file(join(directory, "package.json"));
  const manifest = await manifestFile.exists() ? parsePackageManifest(await manifestFile.text()) : null;
  const runner = scriptRunner(resolvePackageManager(manifest?.packageManager, await presentPackageManagerFiles(directory)));
  const technical = CHECK_NAMES.flatMap((name) => {
    const command = project.scripts?.[name];
    if (command) return [{ name, command }];
    if (typeof manifest?.scripts?.[name] === "string") return [{ name, command: `${runner} ${name}` }];
    return [];
  });
  if (!functional) return technical;
  const name = FUNCTIONAL_CHECK_NAMES.find((candidate) => typeof manifest?.scripts?.[candidate] === "string");
  if (!name) throw new Error("Functional lot validation requires an existing e2e or test:e2e script in the isolated project. Configure it before consuming the lot.");
  return [...technical, { name, command: `${runner} ${name}` }];
}

export function implementationInspectionPath(cwd: string, files: readonly string[], tool: string, input: unknown): string | null {
  const parsed = z.object({ file_path: z.string().optional(), path: z.string().optional(), command: z.string().optional() }).safeParse(input);
  if (!parsed.success) return null;
  let path: string | undefined;
  if (tool === "Read") path = parsed.data.file_path;
  else if (tool === "Grep") path = parsed.data.path;
  else if (tool === "command_execution" && parsed.data.command) {
    const accepted = matchesCodexBashAllowlist(parsed.data.command, ["Bash(cat:*)", "Bash(head:*)", "Bash(tail:*)"], false, undefined, true, (words) => {
      const command = words[0];
      const file = words.at(-1);
      const direct = words.length === 2;
      const bounded = (command === "head" || command === "tail") && words.length === 4 && words[1] === "-n" && /^\d+$/.test(words[2] ?? "");
      if ((!direct && !bounded) || !file || file.startsWith("-")) return false;
      path = file;
      return true;
    });
    if (!accepted) return null;
  }
  if (!path) return null;
  const local = relative(cwd, resolve(cwd, path));
  if (local === ".." || local.startsWith("../") || isAbsolute(local)) return null;
  if (files.length > 0 && !files.some((scope) => local === scope || local.startsWith(`${scope}/`))) return null;
  return local;
}
