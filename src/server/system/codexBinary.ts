/** Resolve the exact native Codex CLI used by the App Server and the TypeScript SDK. */

import { existsSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";

export const CODEX_SDK_VERSION = "0.153.4";

export class CodexBinaryVersionError extends Error {}

const BINARY_PATH_ENV = "KANBAN_CODEX_BINARY";
const require = createRequire(import.meta.url);

const TARGETS: Record<string, { packageName: string; triple: string }> = {
  "darwin-arm64": { packageName: "@openai/codex-darwin-arm64", triple: "aarch64-apple-darwin" },
  "darwin-x64": { packageName: "@openai/codex-darwin-x64", triple: "x86_64-apple-darwin" },
  "linux-arm64": { packageName: "@openai/codex-linux-arm64", triple: "aarch64-unknown-linux-musl" },
  "linux-x64": { packageName: "@openai/codex-linux-x64", triple: "x86_64-unknown-linux-musl" },
  "win32-arm64": { packageName: "@openai/codex-win32-arm64", triple: "aarch64-pc-windows-msvc" },
  "win32-x64": { packageName: "@openai/codex-win32-x64", triple: "x86_64-pc-windows-msvc" },
};

/** Desktop override, or undefined when package resolution should select the native binary. */
export function resolveCodexBinaryOverride(): string | undefined {
  const override = process.env[BINARY_PATH_ENV];
  return override && override.length > 0 ? override : undefined;
}

/** Absolute native CLI path. Throws before a session starts when the platform package is absent. */
export function resolveCodexBinary(): string {
  const override = resolveCodexBinaryOverride();
  if (override) {
    if (!existsSync(override)) throw new Error(`Binaire Codex introuvable : ${override}`);
    return override;
  }

  const target = TARGETS[`${process.platform}-${process.arch}`];
  if (!target) throw new Error(`Plateforme Codex non prise en charge : ${process.platform}/${process.arch}`);

  let packagePath: string;
  try {
    packagePath = require.resolve(`${target.packageName}/package.json`);
  } catch {
    throw new Error(`Runtime Codex ${CODEX_SDK_VERSION} absent pour ${process.platform}/${process.arch}`);
  }
  const executable = process.platform === "win32" ? "codex.exe" : "codex";
  const path = join(dirname(packagePath), "vendor", target.triple, "bin", executable);
  if (!existsSync(path)) throw new Error(`Binaire Codex introuvable dans ${target.packageName}`);
  return path;
}

/** Refuse a binary whose hook and App Server contracts do not match the pinned SDK. */
export async function verifyCodexBinaryVersion(
  binaryPath: string,
  environment: Record<string, string | undefined> = process.env,
): Promise<void> {
  const proc = Bun.spawn([binaryPath, "--version"], {
    env: environment,
    stdout: "pipe",
    stderr: "pipe",
  });
  const timeout = setTimeout(() => proc.kill(), 5_000);
  const [stdout, stderr, exitCode] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
    proc.exited,
  ]);
  clearTimeout(timeout);
  const actual = stdout.trim();
  const expected = `codex-cli ${CODEX_SDK_VERSION}`;
  if (exitCode !== 0 || actual !== expected) {
    const detail = actual || stderr.trim() || `sortie ${exitCode}`;
    throw new CodexBinaryVersionError(`Version du runtime Codex incompatible : attendu ${expected}, reçu ${detail}`);
  }
}
