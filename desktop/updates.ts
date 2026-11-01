import { createPublicKey, verify } from "node:crypto";
import { constants } from "node:fs";
import { access, mkdir, mkdtemp, readFile, realpath, rename, rm, statfs, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";

import { Updater } from "electrobun/bun";

import { DESKTOP_MANIFEST_FILE, RELEASE_LATEST_ROOT, desktopBundleUrl, desktopEnvelopeSchema, desktopManifestSchema, compareAppVersions } from "../src/shared/desktopUpdate.ts";
import type { DesktopManifest, DesktopUpdateController, DesktopUpdateStatus } from "../src/shared/desktopUpdate.ts";

import { UPDATE_HEALTH_TIMEOUT_MS, UPDATE_RECEIPT, updateHealthPath, updateReceiptSchema } from "./updateFiles.ts";

const CACHE_MS = 300_000;
const DOWNLOAD_TIMEOUT_MS = 180_000;
const MAX_BUNDLE_BYTES = 2_000_000_000;
const MANUAL_URL = "https://github.com/Antune-L/atelier/releases/latest";
const APP_NAME = "Atelier.app";
const INSTALLER_ACK_TIMEOUT_MS = 5_000;
const INSTALLER_POLL_INTERVAL_MS = 100;
const UPDATE_EXIT_DELAY_MS = 300;
const PUBLIC_DOWNLOAD_HOSTS = new Set(["github.com", "release-assets.githubusercontent.com", "objects.githubusercontent.com"]);

async function releaseResponse(url: string, timeoutMs = 8_000): Promise<Response> {
  const signal = AbortSignal.timeout(timeoutMs);
  let response: Response | null = null;
  let currentUrl = url;
  for (let redirect = 0; redirect < 4; redirect += 1) {
    const parsed = new URL(currentUrl);
    if (parsed.protocol !== "https:" || (parsed.port !== "" && parsed.port !== "443") || !PUBLIC_DOWNLOAD_HOSTS.has(parsed.hostname) || parsed.username || parsed.password) throw new Error("Untrusted release download URL.");
    response = await fetch(parsed, { signal, redirect: "manual" });
    if (response.status < 300 || response.status >= 400) break;
    const location = response.headers.get("location");
    if (!location) throw new Error("Release redirect is missing.");
    currentUrl = new URL(location, parsed).href;
  }
  if (!response?.ok || !response.body) throw new Error("Release download unavailable; private assets require manual authenticated download.");
  return response;
}

async function download(url: string, path: string, manifest: DesktopManifest): Promise<void> {
  const response = await releaseResponse(url, DOWNLOAD_TIMEOUT_MS);
  if (!response.body) throw new Error("Empty release download.");
  let bytes = 0;
  const hasher = new Bun.CryptoHasher("sha256");
  const writer = Bun.file(path).writer();
  try {
    const reader = response.body.getReader();
    for (;;) {
      const { done, value: chunk } = await reader.read();
      if (done) break;
      bytes += chunk.length;
      if (bytes > manifest.bytes || bytes > MAX_BUNDLE_BYTES) throw new Error("Release download exceeds the approved size.");
      hasher.update(chunk);
      writer.write(chunk);
    }
    await writer.end();
  } catch (error) { await writer.end(); throw error; }
  if (bytes !== manifest.bytes || hasher.digest("hex") !== manifest.sha256) throw new Error("Release artifact integrity verification failed.");
}

export function createDesktopUpdates(options: {
  resourcesRoot: string;
  dataRoot: string;
  reserve: () => (() => void) | null;
  stopAndExit: () => Promise<void>;
}): DesktopUpdateController {
  const appPath = resolve(options.resourcesRoot, "../../..");
  let status: DesktopUpdateStatus = { phase: "idle", target: null, message: null, checkedAt: null, manualUrl: MANUAL_URL };
  let pending: Promise<DesktopUpdateStatus> | null = null;
  let stagedApp: string | null = null;
  let preparing = false;
  let installing = false;

  async function readManifest(): Promise<DesktopManifest> {
    const trust = await Bun.file(join(options.resourcesRoot, "desktop-update-trust.json")).json();
    if (typeof trust !== "object" || trust === null || !("publicKey" in trust) || typeof trust.publicKey !== "string" || !trust.publicKey) throw new Error("Automatic updates require a publisher verification key. Install a trusted release manually for first adoption.");
    const response = await releaseResponse(`${RELEASE_LATEST_ROOT}${DESKTOP_MANIFEST_FILE}`);
    if (!response.body) throw new Error("Empty release manifest.");
    const chunks: Uint8Array[] = [];
    let bytes = 0;
    const reader = response.body.getReader();
    for (;;) {
      const { done, value: chunk } = await reader.read();
      if (done) break;
      bytes += chunk.length;
      if (bytes > 32_768) throw new Error("Release manifest exceeds its bound.");
      chunks.push(chunk);
    }
    const envelope = desktopEnvelopeSchema.parse(JSON.parse(Buffer.concat(chunks).toString("utf8")));
    const key = createPublicKey(trust.publicKey);
    if (key.asymmetricKeyType !== "ed25519" || !verify(null, Buffer.from(envelope.payload), key, Buffer.from(envelope.signature, "base64"))) throw new Error("Release publisher signature is invalid.");
    const manifest = desktopManifestSchema.parse(JSON.parse(envelope.payload));
    desktopBundleUrl(manifest);
    return manifest;
  }

  async function check(refresh = false): Promise<DesktopUpdateStatus> {
    const receipt = updateReceiptSchema.safeParse(await Bun.file(join(options.dataRoot, UPDATE_RECEIPT)).json().catch(() => null));
    if (receipt.success && (receipt.data.phase === "failed" || receipt.data.phase === "restored")) {
      status = { ...status, phase: "failed", message: receipt.data.message };
      installing = false;
      return status;
    }
    if (receipt.success && receipt.data.phase === "pending" && !installing) {
      const localInfo = await Updater.getLocalInfo();
      if (localInfo.version === receipt.data.version) return { ...status, phase: "installing", message: "Vérifications du redémarrage en cours." };
      return { ...status, phase: "failed", message: "Mise à jour interrompue : inspectez la transaction et la sauvegarde avant de réessayer." };
    }
    if (receipt.success && receipt.data.phase === "healthy" && status.checkedAt === null) status = { ...status, phase: "succeeded", message: "Application et programmes natifs vérifiés après redémarrage." };
    if (preparing || installing || status.phase === "ready") return status;
    if (pending) return pending;
    if (!refresh && status.checkedAt !== null && Date.now() - status.checkedAt < CACHE_MS) return status;
    pending = (async () => {
      try {
        const localInfo = await Updater.getLocalInfo();
        if (process.platform !== "darwin" || process.arch !== "arm64" || localInfo.channel === "dev") throw new Error("Automatic installation is limited to packaged macOS Apple Silicon releases.");
        const manifest = await readManifest();
        const newer = compareAppVersions(manifest.version, localInfo.version) > 0;
        status = { ...status, phase: newer ? "available" : "idle", target: manifest, checkedAt: Date.now(), message: newer ? null : "Application à jour." };
      } catch (error) {
        status = { ...status, phase: "unavailable", target: null, checkedAt: Date.now(), message: error instanceof Error ? error.message : "Update feed unavailable." };
      }
      return status;
    })().finally(() => { pending = null; });
    return pending;
  }

  async function prepare(target: string): Promise<DesktopUpdateStatus> {
    if (preparing || installing) throw new Error("An update operation is already running.");
    if (status.phase === "ready" && status.target?.version === target) return status;
    const approved = status.target;
    if (!approved || approved.version !== target || status.phase !== "available") throw new Error("Refresh and approve an available release first.");
    preparing = true;
    status = { ...status, phase: "downloading", message: null };
    let directory: string | null = null;
    try {
      if (await realpath(appPath) !== appPath || !appPath.endsWith(`/${APP_NAME}`) || /\/(AppTranslocation|Volumes)\//.test(appPath)) throw new Error("Install Atelier in a writable application folder before updating.");
      await access(dirname(appPath), constants.W_OK);
      await access(appPath, constants.W_OK);
      const disk = await statfs(dirname(appPath));
      if (disk.bavail * disk.bsize < approved.bytes * 4) throw new Error("Insufficient free space to stage and preserve the application.");
      const fresh = await readManifest();
      if (JSON.stringify(fresh) !== JSON.stringify(approved)) throw new Error("Release changed after approval. Refresh and confirm again.");
      directory = await mkdtemp(join(dirname(appPath), ".atelier-update-"));
      const archive = join(directory, "bundle.zip");
      await download(desktopBundleUrl(approved), archive, approved);
      const extract = Bun.spawn(["/usr/bin/ditto", "-x", "-k", archive, directory], { stdout: "ignore", stderr: "ignore", timeout: DOWNLOAD_TIMEOUT_MS });
      if (await extract.exited !== 0) throw new Error("Cannot extract the verified release.");
      const candidate = join(directory, APP_NAME);
      const plist = await readFile(join(candidate, "Contents/Info.plist"), "utf8");
      if (!plist.includes("<string>com.antune.atelier</string>") || !plist.includes(`<string>${approved.version}</string>`)) throw new Error("Staged application identity/version mismatch.");
      const version = await Bun.file(join(candidate, "Contents/Resources/version.json")).json();
      if (typeof version !== "object" || version === null || !("version" in version) || version.version !== approved.version) throw new Error("Staged runtime version mismatch.");
      await access(join(candidate, "Contents/MacOS/launcher"), constants.X_OK);
      const graph = await Bun.file(join(candidate, "Contents/Resources/app/provider-bun.lock")).text();
      const { lockedProviderVersions } = await import("../src/shared/providerUpdates.ts");
      if (JSON.stringify(lockedProviderVersions(graph)) !== JSON.stringify(approved.providers)) throw new Error("Staged provider graph mismatch.");
      for (const binary of ["codex-bin", "codex-code-mode-host"]) await access(join(candidate, "Contents/Resources/app", binary), constants.X_OK);
      stagedApp = candidate;
      status = { ...status, phase: "ready", message: "Version vérifiée et prête. Fermez les sessions avant de redémarrer." };
    } catch (error) {
      status = { ...status, phase: "failed", message: error instanceof Error ? error.message : "Update preparation failed." };
      if (directory) {
        try { await rm(directory, { recursive: true, force: true }); }
        catch { status = { ...status, message: `${status.message} Failed staging cleanup requires inspection: ${directory}` }; }
      }
    }
    finally { preparing = false; }
    return status;
  }

  async function install(target: string): Promise<DesktopUpdateStatus> {
    if (installing || status.phase !== "ready" || !stagedApp || status.target?.version !== target) throw new Error("No approved prepared release.");
    const release = options.reserve();
    if (!release) throw new Error("Close active provider work before installing.");
    let handedOff = false;
    let canRelease = true;
    let receiptOwned = false;
    let stopInstaller: (() => Promise<void>) | null = null;
    const nonce = crypto.randomUUID();
    const receiptPath = join(options.dataRoot, UPDATE_RECEIPT);
    installing = true;
    try {
      const directory = join(options.dataRoot, "desktop-updates");
      await mkdir(directory, { recursive: true, mode: 0o700 });
      const requestPath = join(directory, `${nonce}.json`);
      const readyPath = join(directory, `${nonce}.ready`);
      await writeFile(requestPath, JSON.stringify({ nonce, pid: process.pid, appPath, stagedApp, backupPath: join(dirname(appPath), `.Atelier.previous-${nonce}.app`), receiptPath, readyPath, manifest: status.target }), { mode: 0o600 });
      const temporaryReceipt = `${receiptPath}.${nonce}.tmp`;
      await writeFile(temporaryReceipt, JSON.stringify({ nonce, version: target, phase: "pending", message: null }), { mode: 0o600 });
      await rename(temporaryReceipt, receiptPath);
      receiptOwned = true;
      canRelease = false;
      const child = Bun.spawn([process.execPath, join(options.resourcesRoot, "scripts/updateInstaller.js"), requestPath], { stdin: "ignore", stdout: "ignore", stderr: "ignore", detached: true });
      stopInstaller = async () => {
        if (child.exitCode === null) child.kill("SIGKILL");
        await child.exited;
      };
      const deadline = Date.now() + INSTALLER_ACK_TIMEOUT_MS;
      let ready = false;
      while (Date.now() < deadline && child.exitCode === null) {
        if (await Bun.file(readyPath).text().catch(() => "") === nonce) { ready = true; break; }
        await new Promise((resolve) => setTimeout(resolve, INSTALLER_POLL_INTERVAL_MS));
      }
      if (!ready) throw new Error("The installer did not acknowledge preparation. The current app was not stopped.");
      child.unref();
      handedOff = true;
      status = { ...status, phase: "installing", message: "Arrêt propre puis remplacement de l'application. L'ancienne version reste sauvegardée." };
      setTimeout(() => { void options.stopAndExit(); }, UPDATE_EXIT_DELAY_MS);
      return status;
    } catch (error) {
      try {
        if (stopInstaller) await stopInstaller();
        if (receiptOwned) {
          const receipt = updateReceiptSchema.safeParse(await Bun.file(receiptPath).json().catch(() => null));
          if (!receipt.success || receipt.data.nonce !== nonce || receipt.data.phase !== "pending") throw new Error("Installer transaction ownership is uncertain.");
          await rm(receiptPath);
        }
        canRelease = true;
      } catch {
        status = { ...status, phase: "failed", message: "Installer handoff recovery could not be confirmed. Inspect the update transaction before restarting; maintenance remains active." };
        throw new Error(status.message ?? "Installer handoff recovery failed.");
      }
      throw error;
    } finally {
      if (!handedOff) {
        installing = false;
        if (canRelease) release();
      }
    }
  }
  return { check, prepare, install };
}

export async function confirmDesktopUpdateHealth(resourcesRoot: string, dataRoot: string, nativeHealth: () => Promise<void>): Promise<boolean> {
  const path = join(dataRoot, UPDATE_RECEIPT);
  const receipt = updateReceiptSchema.safeParse(await Bun.file(path).json().catch(() => null));
  if (!receipt.success || receipt.data.phase !== "pending") return false;
  const local: unknown = await Bun.file(join(resourcesRoot, "../version.json")).json();
  if (typeof local !== "object" || local === null || !("version" in local) || local.version !== receipt.data.version) return false;
  let phase: "healthy" | "failed" = "healthy";
  let message = "Application and native provider versions verified. No provider turn was started.";
  try {
    await nativeHealth();
  } catch {
    phase = "failed";
    message = "Native provider health failed. Inspect the saved previous application; no database rollback was performed.";
  }
  const healthPath = updateHealthPath(path, receipt.data.nonce);
  await writeFile(`${healthPath}.tmp`, JSON.stringify({ ...receipt.data, phase, message }), { mode: 0o600 });
  await rename(`${healthPath}.tmp`, healthPath);
  const deadline = Date.now() + UPDATE_HEALTH_TIMEOUT_MS;
  while (Date.now() < deadline) {
    const result = updateReceiptSchema.safeParse(await Bun.file(path).json().catch(() => null));
    if (!result.success || result.data.nonce !== receipt.data.nonce || result.data.version !== receipt.data.version) return false;
    if (result.data.phase !== "pending") return phase === "healthy" && result.data.phase === "healthy";
    await new Promise((resolve) => setTimeout(resolve, INSTALLER_POLL_INTERVAL_MS));
  }
  return false;
}
