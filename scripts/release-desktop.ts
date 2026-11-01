import { tmpdir } from "node:os";
import { createPrivateKey, createPublicKey, sign } from "node:crypto";
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

import { desktopManifestSchema, DESKTOP_MANIFEST_FILE, RELEASE_DOWNLOAD_ROOT } from "../src/shared/desktopUpdate.ts";
import { lockedProviderVersions } from "../src/shared/providerUpdates.ts";

import { CLAUDE_SDK_VERSION } from "../src/server/system/claudeBinary.ts";
import { CODEX_SDK_VERSION } from "../src/server/system/codexBinary.ts";

// NOTE(ali): Publish the same locked provider graph in the DMG, full app archive and signed update manifest.
const VERSION_PATTERN = /^\d+\.\d+\.\d+(-[0-9A-Za-z.-]+)?$/;
const REPO_ROOT = resolve(import.meta.dir, "..");
/** electrobun's final "moving artifacts" step relocates the DMG here as `<platformPrefix>-<name>`. */
const BUILT_DMG = join(REPO_ROOT, "artifacts", "stable-macos-arm64-Atelier.dmg");
const RELEASE_FOLDER = join(REPO_ROOT, "release");
const ELECTROBUN_BIN = join(REPO_ROOT, "node_modules", ".bin", "electrobun");

function fail(message: string): never {
  console.error(`release-desktop: ${message}`);
  process.exit(1);
}

async function run(cmd: string[], env: Record<string, string> = {}): Promise<void> {
  console.log(`$ ${cmd.join(" ")}`);
  const { ATELIER_UPDATE_SIGNING_KEY: _signingKey, ...environment } = process.env;
  const proc = Bun.spawn(cmd, {
    cwd: REPO_ROOT,
    env: { ...environment, ...env },
    stdout: "inherit",
    stderr: "inherit",
  });
  if ((await proc.exited) !== 0) fail(`command failed: ${cmd.join(" ")}`);
}

function installedPackageVersion(pkgPath: string): unknown {
  const installed: unknown = JSON.parse(readFileSync(pkgPath, "utf8"));
  return typeof installed === "object" && installed !== null && "version" in installed
    ? installed.version
    : null;
}

function assertPackageVersionInSync(
  label: string,
  expected: string,
  packagePath: string,
  constantPath: string,
): void {
  const version = installedPackageVersion(packagePath);
  if (version !== expected) {
    fail(
      `${label} (${expected}) does not match the installed SDK (${String(version)}) — ` +
        `update the constant in ${constantPath}`,
    );
  }
}

function assertSdkVersionsInSync(): void {
  assertPackageVersionInSync(
    "CLAUDE_SDK_VERSION",
    CLAUDE_SDK_VERSION,
    join(REPO_ROOT, "node_modules", "@anthropic-ai", "claude-agent-sdk", "package.json"),
    "src/server/system/claudeBinary.ts",
  );
  assertPackageVersionInSync(
    "CODEX_SDK_VERSION",
    CODEX_SDK_VERSION,
    join(REPO_ROOT, "node_modules", "@openai", "codex-sdk", "package.json"),
    "src/server/system/codexBinary.ts",
  );
}

async function writeSha256(filePath: string, fileName: string): Promise<void> {
  const hasher = new Bun.CryptoHasher("sha256");
  hasher.update(await Bun.file(filePath).arrayBuffer());
  await Bun.write(`${filePath}.sha256`, `${hasher.digest("hex")}  ${fileName}\n`);
}

const version = process.argv[2] ?? "";
if (!VERSION_PATTERN.test(version)) {
  fail(`invalid version "${version}" — expected X.Y.Z or X.Y.Z-suffix (tag without the "v")`);
}

assertSdkVersionsInSync();
if (process.platform !== "darwin" || process.arch !== "arm64") fail("Only macOS arm64 releases are supported.");
const privateKeyText = process.env.ATELIER_UPDATE_SIGNING_KEY;
const privateKey = privateKeyText ? createPrivateKey(privateKeyText) : null;
if (privateKey && privateKey.asymmetricKeyType !== "ed25519") fail("The update signing key must be Ed25519.");
const publicKey = privateKey ? createPublicKey(privateKey.export({ type: "pkcs8", format: "pem" })).export({ type: "spki", format: "pem" }).toString() : "";
mkdirSync(join(REPO_ROOT, "dist"), { recursive: true });
writeFileSync(join(REPO_ROOT, "dist", "desktop-update-trust.json"), JSON.stringify({ publicKey }));
const providers = lockedProviderVersions(readFileSync(join(REPO_ROOT, "bun.lock"), "utf8"));

await run(["bun", "run", "build:web"]);
await run(["bun", "run", "build:preview-tools"]);
await run(["bun", "build", "desktop/updateInstaller.ts", "--target=bun", "--outfile=dist/updateInstaller.js"]);
await run([ELECTROBUN_BIN, "build", "--env=stable"], { ATELIER_VERSION: version, ATELIER_RELEASE: "1" });

if (!existsSync(BUILT_DMG)) fail(`DMG not found: ${BUILT_DMG}`);

mkdirSync(RELEASE_FOLDER, { recursive: true });
const artifactName = `Atelier-v${version}-arm64.dmg`;
const artifactPath = join(RELEASE_FOLDER, artifactName);
copyFileSync(BUILT_DMG, artifactPath);
await writeSha256(artifactPath, artifactName);

console.log(`release-desktop: OK → release/${artifactName} (+ .sha256)`);

const zipName = `Atelier-v${version}-arm64.app.zip`;
const zipPath = join(RELEASE_FOLDER, zipName);
const stage = mkdtempSync(join(tmpdir(), "atelier-release-"));
try {
  const tar = join(stage, "bundle.tar");
  await run([join(REPO_ROOT, "node_modules/electrobun/dist-macos-arm64/zig-zstd"), "decompress", "-i", join(REPO_ROOT, "artifacts/stable-macos-arm64-Atelier.app.tar.zst"), "-o", tar]);
  await run(["/usr/bin/tar", "-xf", tar, "-C", stage]);
  const app = readdirSync(stage).find((entry) => entry === "Atelier.app");
  if (!app) fail("Electrobun full archive did not contain Atelier.app.");
  const local: unknown = JSON.parse(readFileSync(join(stage, app, "Contents/Resources/version.json"), "utf8"));
  if (typeof local !== "object" || local === null || !("version" in local) || local.version !== version) fail("Full archive version mismatch.");
  await run(["/usr/bin/ditto", "-c", "-k", "--keepParent", join(stage, app), zipPath]);
} finally { rmSync(stage, { recursive: true, force: true }); }
const revisionResult = Bun.spawn(["git", "rev-parse", "HEAD"], { cwd: REPO_ROOT, stdout: "pipe", stderr: "ignore" });
const revision = (await new Response(revisionResult.stdout).text()).trim();
if (await revisionResult.exited !== 0) fail("Cannot identify the release source revision.");
const zip = Bun.file(zipPath);
const hasher = new Bun.CryptoHasher("sha256");
const zipReader = zip.stream().getReader();
for (;;) {
  const { done, value } = await zipReader.read();
  if (done) break;
  hasher.update(value);
}
const manifest = desktopManifestSchema.parse({ protocol: 1, platform: "macos-arm64", identifier: "com.antune.atelier", version, revision, providers, codexNative: CODEX_SDK_VERSION, bundle: `${RELEASE_DOWNLOAD_ROOT}v${version}/${zipName}`, bytes: zip.size, sha256: hasher.digest("hex") });
const payload = JSON.stringify(manifest);
await Bun.write(join(RELEASE_FOLDER, DESKTOP_MANIFEST_FILE), JSON.stringify({ payload, signature: privateKey ? sign(null, Buffer.from(payload), privateKey).toString("base64") : "" }));
await writeSha256(zipPath, zipName);
for (const name of ["stable-macos-arm64-update.json", "stable-macos-arm64-Atelier.app.tar.zst"]) {
  const path = join(REPO_ROOT, "artifacts", name);
  if (!existsSync(path)) fail(`Missing Electrobun release artifact: ${name}`);
  copyFileSync(path, join(RELEASE_FOLDER, name));
}
console.log(`release-desktop: coherent full bundle and ${privateKey ? "signed" : "unsigned (manual installation only)"} provider manifest ready`);
