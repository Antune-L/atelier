/**
 * Release packaging for the desktop app (run by .github/workflows/release.yml, usable locally):
 *
 *   bun scripts/release-desktop.ts 0.1.0
 *
 * Validates the version (from the git tag, `v` already stripped), gates on CLAUDE_SDK_VERSION drift
 * (the packaged app downloads that exact binary at runtime — a stale constant would ship an app that
 * fetches the wrong version), builds the web UI + the Electrobun stable bundle with the version and
 * DMG enabled (the postBuild hook — scripts/verifyDesktopBundle.ts — asserts the embedded codex
 * binaries kept their +x bit), then normalizes the artifacts into release/: Atelier-vX.Y.Z-arm64.dmg
 * + its .sha256. `build:desktop` stays untouched for dev.
 */

import { copyFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";

import { CLAUDE_SDK_VERSION } from "../src/server/system/claudeBinary.ts";

const VERSION_PATTERN = /^\d+\.\d+\.\d+(-[0-9A-Za-z.-]+)?$/;
const REPO_ROOT = resolve(import.meta.dir, "..");
const STABLE_BUILD_FOLDER = join(REPO_ROOT, "build", "stable-macos-arm64");
const RELEASE_FOLDER = join(REPO_ROOT, "release");
const ELECTROBUN_BIN = join(REPO_ROOT, "node_modules", ".bin", "electrobun");

function fail(message: string): never {
  console.error(`release-desktop: ${message}`);
  process.exit(1);
}

async function run(cmd: string[], env: Record<string, string> = {}): Promise<void> {
  console.log(`$ ${cmd.join(" ")}`);
  const proc = Bun.spawn(cmd, {
    cwd: REPO_ROOT,
    env: { ...process.env, ...env },
    stdout: "inherit",
    stderr: "inherit",
  });
  if ((await proc.exited) !== 0) fail(`command failed: ${cmd.join(" ")}`);
}

function assertClaudeSdkVersionInSync(): void {
  const pkgPath = join(REPO_ROOT, "node_modules", "@anthropic-ai", "claude-agent-sdk", "package.json");
  const installed: unknown = JSON.parse(readFileSync(pkgPath, "utf8"));
  const version =
    typeof installed === "object" && installed !== null && "version" in installed ? installed.version : null;
  if (version !== CLAUDE_SDK_VERSION) {
    fail(
      `CLAUDE_SDK_VERSION (${CLAUDE_SDK_VERSION}) ne correspond pas au SDK installé (${String(version)}) — ` +
        "mettre à jour la constante dans src/server/system/claudeBinary.ts",
    );
  }
}

async function writeSha256(filePath: string, fileName: string): Promise<void> {
  const hasher = new Bun.CryptoHasher("sha256");
  hasher.update(await Bun.file(filePath).arrayBuffer());
  await Bun.write(`${filePath}.sha256`, `${hasher.digest("hex")}  ${fileName}\n`);
}

const version = process.argv[2] ?? "";
if (!VERSION_PATTERN.test(version)) {
  fail(`version invalide "${version}" — attendu X.Y.Z ou X.Y.Z-suffixe (tag sans le "v")`);
}

assertClaudeSdkVersionInSync();

await run(["bun", "run", "build:web"]);
await run([ELECTROBUN_BIN, "build", "--env=stable"], { ATELIER_VERSION: version, ATELIER_RELEASE: "1" });

const builtDmg = join(STABLE_BUILD_FOLDER, "Atelier.dmg");
if (!existsSync(builtDmg)) fail(`DMG introuvable : ${builtDmg}`);

mkdirSync(RELEASE_FOLDER, { recursive: true });
const artifactName = `Atelier-v${version}-arm64.dmg`;
const artifactPath = join(RELEASE_FOLDER, artifactName);
copyFileSync(builtDmg, artifactPath);
await writeSha256(artifactPath, artifactName);

console.log(`release-desktop: OK → release/${artifactName} (+ .sha256)`);
