import { realpathSync } from "node:fs";

import type { ApplicationVersion } from "../shared/applicationVersion.ts";
import { RELEASE_REPOSITORY } from "../shared/desktopUpdate.ts";
import type { DesktopUpdateController } from "../shared/desktopUpdate.ts";
import { providerVersionSchema } from "../shared/providerUpdates.ts";
import type { AppUpdateTarget } from "../shared/providerUpdates.ts";

import { CLAUDE_SDK_VERSION } from "./system/claudeBinary.ts";
import { CODEX_SDK_VERSION } from "./system/codexBinary.ts";

const RELEASE_PATH = /^\/opt\/kanban\/releases\/([a-f0-9]{40})$/;
const REVISION = /^[a-f0-9]{40}$/;
const PLACEHOLDER_VERSION = "0.0.0";
const GIT_TIMEOUT_MS = 5_000;
const UPDATE_PAGE_URL = `https://github.com/${RELEASE_REPOSITORY}/releases/latest`;

export function captureSourceRevision(root: string): string | null {
  try {
    const physicalRoot = realpathSync(root);
    const release = RELEASE_PATH.exec(physicalRoot)?.[1];
    if (release) return release;
    const result = Bun.spawnSync(["git", "rev-parse", "--verify", "HEAD"], { cwd: physicalRoot, stdout: "pipe", stderr: "ignore", timeout: GIT_TIMEOUT_MS });
    const revision = result.stdout.toString().trim();
    if (result.exitCode === 0 && REVISION.test(revision)) return revision;
  } catch {
    return null;
  }
  return null;
}

export function createApplicationVersionReader(options: {
  sourceRevision: string | null;
  desktopVersion?: string;
  desktopUpdates?: DesktopUpdateController;
  cloud: boolean;
  readCloudTarget?: () => Promise<AppUpdateTarget>;
}): () => Promise<ApplicationVersion> {
  const desktop = options.desktopVersion !== undefined;
  let installed = options.sourceRevision;
  if (desktop) {
    const parsed = providerVersionSchema.safeParse(options.desktopVersion);
    installed = parsed.success && parsed.data !== PLACEHOLDER_VERSION ? parsed.data : null;
  }
  const base: ApplicationVersion = {
    installation: desktop ? "desktop" : "source",
    installed,
    available: null,
    updatePageUrl: desktop ? UPDATE_PAGE_URL : null,
    installedUnavailableReason: installed === null ? "installed_metadata_unavailable" : null,
    targetUnavailableReason: "target_not_configured",
  };
  const unavailable: ApplicationVersion = { ...base, targetUnavailableReason: "target_metadata_unavailable" };
  if (desktop) {
    return async () => {
      try {
        const status = await options.desktopUpdates?.check();
        const available = status?.target?.version ?? null;
        return available === null ? unavailable : { ...base, available, targetUnavailableReason: null };
      } catch {
        return unavailable;
      }
    };
  }
  const readCloudTarget = options.readCloudTarget;
  if (!options.cloud) return async () => base;
  if (!readCloudTarget) return async () => unavailable;
  return async () => {
    try {
      const target = await readCloudTarget();
      const updaterAccepts = target.providers.claude === CLAUDE_SDK_VERSION && target.providers.codex === CODEX_SDK_VERSION;
      return updaterAccepts ? { ...base, available: target.id, targetUnavailableReason: null } : unavailable;
    } catch {
      return unavailable;
    }
  };
}
