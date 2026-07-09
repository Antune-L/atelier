/**
 * Resolves — and, in the packaged app, provisions — the Agent SDK's native `claude` binary.
 *
 * The public release DMG does NOT embed `claude-bin` (the binary is proprietary — "All rights
 * reserved", no redistribution grant — unlike the Apache-2.0 codex binary, which stays bundled).
 * Instead `ensureClaudeBinary()` walks a provisioning chain and pins the winner into
 * KANBAN_CLAUDE_BINARY so the sync `resolveClaudeBinary()` stays valid everywhere after it:
 *
 *  1. KANBAN_CLAUDE_BINARY override (dev desktop builds, tests).
 *  2. node_modules resolution (dev/web mode — the SDK's platform package is installed).
 *  3. A previously provisioned binary under `<dataRoot>/bin/claude-<version>`.
 *  4. A user-installed Claude Code CLI (PATH + known install dirs), version-gated.
 *  5. Download of the exact pinned platform package from the npm registry (Anthropic's own
 *     distribution channel), sha512-verified against the registry's dist.integrity.
 *
 * The chain is single-flight: concurrent sessions during a cold download share one promise, and a
 * failed flight (e.g. offline first launch) resets so a later ticket launch retries.
 */

import { chmodSync, existsSync, mkdirSync, renameSync, rmSync } from "node:fs";
import { createRequire } from "node:module";
import { homedir } from "node:os";
import { dirname, join } from "node:path";

import { z } from "zod";

/** Env override for the CLI path (set by dev desktop builds, or pinned here once provisioned). */
const BINARY_PATH_ENV = "KANBAN_CLAUDE_BINARY";

/**
 * The platform-package version to download — MUST match the `@anthropic-ai/claude-agent-sdk`
 * version pinned in bun.lock (the SDK and its platform packages are released in lockstep). A
 * compiled desktop app cannot resolve this at runtime (no node_modules in $bunfs), hence the
 * constant; scripts/release-desktop.ts fails the build when it drifts from bun.lock.
 */
export const CLAUDE_SDK_VERSION = "0.3.205";

const CLAUDE_BIN_NAME = process.platform === "win32" ? "claude.exe" : "claude";
const NPM_REGISTRY_URL = "https://registry.npmjs.org";
/** SDK 0.3.205 ships CLI 2.1.205; older 2.1.x CLIs still speak the SDK's stream protocol. */
const MIN_DETECTED_CLI_VERSION: readonly [number, number, number] = [2, 1, 0];
const VERSION_PROBE_TIMEOUT_MS = 5_000;
const REGISTRY_METADATA_TIMEOUT_MS = 30_000;
const DOWNLOAD_PROGRESS_STEP_PERCENT = 20;
const SHA512_INTEGRITY_PREFIX = "sha512-";

const registryVersionSchema = z.object({
  dist: z.object({
    tarball: z.string(),
    integrity: z.string(),
  }),
});

let cached: string | null = null;

export function resolveClaudeBinary(): string {
  const override = process.env[BINARY_PATH_ENV];
  if (override && override.length > 0) return override;
  if (cached) return cached;

  // TODO(ali): musl Linux ships a `-musl`-suffixed platform package; detect libc when we target it.
  const platformPkg = platformPackageName();
  const require = createRequire(import.meta.url);

  try {
    // Resolve the per-platform package's real install dir (handles hoisting), then the binary next to it.
    cached = join(dirname(require.resolve(`${platformPkg}/package.json`)), CLAUDE_BIN_NAME);
  } catch {
    // Fallback: the platform package sits next to the SDK package under node_modules/@anthropic-ai/.
    const sdkPkgDir = dirname(require.resolve("@anthropic-ai/claude-agent-sdk/package.json"));
    cached = join(sdkPkgDir, "..", `claude-agent-sdk-${process.platform}-${process.arch}`, CLAUDE_BIN_NAME);
  }
  return cached;
}

function platformPackageName(): string {
  return `@anthropic-ai/claude-agent-sdk-${process.platform}-${process.arch}`;
}

// ---- provisioning chain (packaged app: detect a user install, else download the pinned binary) ----

type ProvisionProgress = (message: string) => void;

let provisionDir = join(homedir(), "Library", "Application Support", "kanban-agents", "bin");
let inflight: Promise<string> | null = null;
const progressListeners = new Set<ProvisionProgress>();

/** Point the provisioner at the app's writable data root (called once at server boot). */
export function configureClaudeProvisionDir(dir: string): void {
  provisionDir = dir;
}

/**
 * Resolve a runnable `claude` binary, downloading it if nothing is installed. Safe to call from
 * every session-launch path: instant once resolved, single-flight while a download is running.
 * `onProgress` receives user-facing lines (French) only while a real download is in flight.
 */
export function ensureClaudeBinary(onProgress?: ProvisionProgress): Promise<string> {
  if (onProgress) progressListeners.add(onProgress);
  if (!inflight) {
    inflight = provision()
      .catch((error: unknown) => {
        // A failed flight (offline, registry hiccup) must not poison later launches: reset and rethrow.
        inflight = null;
        throw error;
      })
      .finally(() => progressListeners.clear());
  }
  return inflight;
}

function emitProgress(message: string): void {
  for (const listener of progressListeners) listener(message);
}

/** Pin the winning path into the env override so the sync resolver agrees from now on. */
function adopt(binaryPath: string): string {
  process.env[BINARY_PATH_ENV] = binaryPath;
  return binaryPath;
}

async function provision(): Promise<string> {
  const override = process.env[BINARY_PATH_ENV];
  if (override && override.length > 0) return override;

  const fromNodeModules = tryResolveFromNodeModules();
  if (fromNodeModules) return fromNodeModules;

  const provisioned = join(provisionDir, `claude-${CLAUDE_SDK_VERSION}`);
  if (existsSync(provisioned)) return adopt(provisioned);

  const detected = await detectUserInstall();
  if (detected) return adopt(detected);

  return adopt(await downloadPinnedBinary());
}

/** Dev/web mode: the SDK's platform package is installed. Compiled apps have no node_modules → null. */
function tryResolveFromNodeModules(): string | null {
  try {
    const path = resolveClaudeBinary();
    return existsSync(path) ? path : null;
  } catch {
    return null;
  }
}

/** Known Claude Code install locations, PATH first (repaired for GUI launches by repairPath). */
function detectionCandidates(): string[] {
  const home = homedir();
  const fromPath = Bun.which("claude");
  return [
    ...(fromPath ? [fromPath] : []),
    join(home, ".local", "bin", "claude"),
    join(home, ".claude", "local", "claude"),
    "/opt/homebrew/bin/claude",
    "/usr/local/bin/claude",
  ];
}

async function detectUserInstall(): Promise<string | null> {
  for (const candidate of detectionCandidates()) {
    if (!existsSync(candidate)) continue;
    if (await isCompatibleCli(candidate)) return candidate;
  }
  return null;
}

/** True when `binary --version` answers with a semver ≥ MIN_DETECTED_CLI_VERSION within the budget. */
async function isCompatibleCli(binary: string): Promise<boolean> {
  try {
    const proc = Bun.spawn([binary, "--version"], {
      stdin: "ignore",
      stdout: "pipe",
      stderr: "ignore",
      timeout: VERSION_PROBE_TIMEOUT_MS,
      killSignal: "SIGKILL",
    });
    const [output, exitCode] = await Promise.all([new Response(proc.stdout).text(), proc.exited]);
    if (exitCode !== 0) return false;
    const match = output.match(/(\d+)\.(\d+)\.(\d+)/);
    if (!match) return false;
    const version: [number, number, number] = [Number(match[1]), Number(match[2]), Number(match[3])];
    return compareVersions(version, MIN_DETECTED_CLI_VERSION) >= 0;
  } catch {
    return false;
  }
}

function compareVersions(a: readonly [number, number, number], b: readonly [number, number, number]): number {
  if (a[0] !== b[0]) return a[0] - b[0];
  if (a[1] !== b[1]) return a[1] - b[1];
  return a[2] - b[2];
}

/**
 * Download the pinned platform package from the npm registry, verify the registry's sha512
 * dist.integrity over the streamed bytes, extract `package/claude` with the system tar, and move it
 * to its versioned resting place. Temp files are pid-suffixed so a crashed run can't corrupt a
 * concurrent one.
 */
async function downloadPinnedBinary(): Promise<string> {
  const pkg = platformPackageName();
  emitProgress("⬇️ Aucun agent Claude détecté — téléchargement du binaire (~220 Mo)…");

  const metaRes = await fetch(`${NPM_REGISTRY_URL}/${pkg}/${CLAUDE_SDK_VERSION}`, {
    signal: AbortSignal.timeout(REGISTRY_METADATA_TIMEOUT_MS),
  });
  if (!metaRes.ok) throw new Error(`registre npm indisponible pour ${pkg}@${CLAUDE_SDK_VERSION} (HTTP ${metaRes.status})`);
  const { dist } = registryVersionSchema.parse(await metaRes.json());
  if (!dist.integrity.startsWith(SHA512_INTEGRITY_PREFIX)) {
    throw new Error(`intégrité inattendue pour ${pkg}: ${dist.integrity.slice(0, 16)}…`);
  }

  mkdirSync(provisionDir, { recursive: true });
  const tarballPath = join(provisionDir, `.download-${process.pid}.tgz`);
  const extractDir = join(provisionDir, `.extract-${process.pid}`);
  try {
    await downloadAndVerifyTarball(dist.tarball, dist.integrity, tarballPath);

    rmSync(extractDir, { recursive: true, force: true });
    mkdirSync(extractDir, { recursive: true });
    const tar = Bun.spawn(["tar", "-xzf", tarballPath, "-C", extractDir], { stdin: "ignore", stdout: "ignore", stderr: "pipe" });
    const [tarStderr, tarExit] = await Promise.all([new Response(tar.stderr).text(), tar.exited]);
    if (tarExit !== 0) throw new Error(`extraction du binaire claude échouée : ${tarStderr.trim().slice(-300)}`);

    const extracted = join(extractDir, "package", CLAUDE_BIN_NAME);
    if (!existsSync(extracted)) throw new Error("archive npm inattendue : package/claude absent");
    chmodSync(extracted, 0o755);

    const finalPath = join(provisionDir, `claude-${CLAUDE_SDK_VERSION}`);
    renameSync(extracted, finalPath);
    emitProgress("✅ Agent Claude prêt.");
    return finalPath;
  } finally {
    rmSync(tarballPath, { force: true });
    rmSync(extractDir, { recursive: true, force: true });
  }
}

async function downloadAndVerifyTarball(url: string, integrity: string, destination: string): Promise<void> {
  const res = await fetch(url);
  if (!res.ok || !res.body) throw new Error(`téléchargement du binaire claude échoué (HTTP ${res.status})`);

  const total = Number(res.headers.get("content-length") ?? 0);
  const hasher = new Bun.CryptoHasher("sha512");
  const writer = Bun.file(destination).writer();
  let received = 0;
  let nextReportPercent = DOWNLOAD_PROGRESS_STEP_PERCENT;
  const reader = res.body.getReader();
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      hasher.update(value);
      writer.write(value);
      received += value.byteLength;
      if (total > 0) {
        const percent = Math.floor((received / total) * 100);
        if (percent >= nextReportPercent) {
          nextReportPercent = percent + DOWNLOAD_PROGRESS_STEP_PERCENT;
          emitProgress(`⬇️ Téléchargement de l'agent Claude… ${percent} %`);
        }
      }
    }
  } finally {
    await writer.end();
  }

  const digest = hasher.digest("base64");
  const expected = integrity.slice(SHA512_INTEGRITY_PREFIX.length);
  if (digest !== expected) {
    throw new Error("le binaire claude téléchargé ne correspond pas au sha512 du registre npm");
  }
}
