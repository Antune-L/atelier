import { readdir } from "node:fs/promises";
import { join } from "node:path";
import { z } from "zod";

import { PACKAGE_MANIFEST_FILE, parsePackageManifest } from "./repoInspection.ts";
import type { PackageManifest, WorkspacePackage } from "./repoInspection.ts";

const PNPM_WORKSPACE_FILE = "pnpm-workspace.yaml";
const MAX_WORKSPACE_PACKAGES = 200;
const TRAILING_WILDCARD_PATTERN = /\/\*{1,2}$/;
const EXCLUDED_PATTERN_PREFIX = "!";
const PARENT_SEGMENT = "..";
const WILDCARD = "*";
const HIDDEN_PREFIX = ".";
const DEPENDENCY_DIRECTORY = "node_modules";

const pnpmWorkspaceSchema = z.object({ packages: z.array(z.string()).optional().catch(undefined) });

function manifestPatterns(manifest: PackageManifest | null): string[] {
  const workspaces = manifest?.workspaces;
  if (!workspaces) return [];
  return Array.isArray(workspaces) ? workspaces : workspaces.packages ?? [];
}

async function pnpmPatterns(repoPath: string): Promise<string[]> {
  const file = Bun.file(join(repoPath, PNPM_WORKSPACE_FILE));
  if (!(await file.exists())) return [];
  try {
    const parsed = pnpmWorkspaceSchema.safeParse(Bun.YAML.parse(await file.text()));
    return parsed.success ? parsed.data.packages ?? [] : [];
  } catch {
    return [];
  }
}

async function packageDirectories(repoPath: string, pattern: string): Promise<string[]> {
  if (pattern.startsWith(EXCLUDED_PATTERN_PREFIX) || pattern.split("/").includes(PARENT_SEGMENT)) return [];
  const base = pattern.replace(TRAILING_WILDCARD_PATTERN, "");
  if (base.includes(WILDCARD)) return [];
  if (base === pattern) return [base];
  const entries = await readdir(join(repoPath, base), { withFileTypes: true }).catch(() => []);
  return entries
    .filter((entry) => entry.isDirectory() && !entry.name.startsWith(HIDDEN_PREFIX) && entry.name !== DEPENDENCY_DIRECTORY)
    .map((entry) => `${base}/${entry.name}`);
}

// NOTE: wildcards are expanded one level deep only (`apps/*` and `apps/**` alike) to keep inspection cheap.
export async function readWorkspacePackages(repoPath: string, manifest: PackageManifest | null): Promise<WorkspacePackage[]> {
  const patterns = [...new Set([...manifestPatterns(manifest), ...(await pnpmPatterns(repoPath))])];
  const directories = [...new Set((await Promise.all(patterns.map((pattern) => packageDirectories(repoPath, pattern)))).flat())]
    .sort()
    .slice(0, MAX_WORKSPACE_PACKAGES);
  const packages = await Promise.all(directories.map(async (path) => {
    const file = Bun.file(join(repoPath, path, PACKAGE_MANIFEST_FILE));
    const manifest = (await file.exists()) ? parsePackageManifest(await file.text().catch(() => "")) : null;
    return manifest ? { path, manifest } : null;
  }));
  return packages.filter((entry) => entry !== null);
}
