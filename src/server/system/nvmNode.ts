/**
 * Resolve the Node version pinned by a project's `.nvmrc` to an installed nvm binary directory, so
 * agent sessions run with the project's Node on PATH instead of the user's nvm default alias. Under
 * `dontAsk`, agents cannot run `nvm use` themselves (not in the bash allowlist), so pre-commit hooks
 * like lefthook would otherwise execute under the wrong Node and fail.
 */

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

/** Prepend the pinned Node, or report an actionable error before running under a different version. */
export function envWithProjectNode(cwd: string): Record<string, string | undefined> {
  const binDir = nvmNodeBinDir(cwd);
  if (binDir === null) return { ...process.env };
  return { ...process.env, PATH: `${binDir}:${process.env.PATH ?? ""}` };
}

/**
 * The `<nvm>/versions/node/vX.Y.Z/bin` dir best matching `<cwd>/.nvmrc`, or null when there is no
 * `.nvmrc`. Unsupported aliases and missing installations are explicit setup errors.
 */
export function nvmNodeBinDir(cwd: string): string | null {
  const spec = readNvmrc(cwd);
  if (spec === null) return null;
  const versionsDir = join(process.env.NVM_DIR ?? join(homedir(), ".nvm"), "versions", "node");
  const best = bestInstalledMatch(versionsDir, spec);
  if (best === null) throw new Error(`Node ${spec} requis par ${join(cwd, ".nvmrc")} : installer cette version avec nvm avant de relancer.`);
  const binDir = join(versionsDir, best, "bin");
  if (!existsSync(join(binDir, "node"))) throw new Error(`Installation Node ${best} incomplète : exécutable node absent.`);
  return binDir;
}

const PLAIN_VERSION_PATTERN = /^v?(\d+(?:\.\d+){0,2})$/;

function readNvmrc(cwd: string): string | null {
  const path = join(cwd, ".nvmrc");
  if (!existsSync(path)) return null;
  let raw: string;
  try {
    raw = readFileSync(path, "utf8").trim();
  } catch {
    throw new Error(`Impossible de lire ${path}.`);
  }
  const version = PLAIN_VERSION_PATTERN.exec(raw)?.[1];
  if (!version) throw new Error(`Alias .nvmrc non pris en charge dans ${path} : épingler une version Node numérique installée.`);
  return version;
}

function bestInstalledMatch(versionsDir: string, spec: string): string | null {
  let entries: string[];
  try {
    entries = readdirSync(versionsDir);
  } catch {
    return null;
  }
  const specParts = spec.split(".").map(Number);
  let best: { name: string; parts: number[] } | null = null;
  for (const name of entries) {
    const version = PLAIN_VERSION_PATTERN.exec(name)?.[1];
    if (version === undefined) continue;
    const parts = version.split(".").map(Number);
    if (!specParts.every((wanted, i) => parts[i] === wanted)) continue;
    if (best === null || compareParts(parts, best.parts) > 0) best = { name, parts };
  }
  return best?.name ?? null;
}

function compareParts(a: number[], b: number[]): number {
  for (let i = 0; i < 3; i += 1) {
    const diff = (a[i] ?? 0) - (b[i] ?? 0);
    if (diff !== 0) return diff;
  }
  return 0;
}
