import { z } from "zod";

import { providerVersionsSchema, providerVersionSchema } from "./providerUpdates.ts";

export const RELEASE_REPOSITORY = "Antune-L/atelier";
export const RELEASE_DOWNLOAD_ROOT = `https://github.com/${RELEASE_REPOSITORY}/releases/download/`;
export const RELEASE_LATEST_ROOT = `https://github.com/${RELEASE_REPOSITORY}/releases/latest/download/`;
export const DESKTOP_MANIFEST_FILE = "atelier-macos-arm64.json";
export const desktopManifestSchema = z.object({
  protocol: z.literal(1),
  platform: z.literal("macos-arm64"),
  identifier: z.literal("com.antune.atelier"),
  version: providerVersionSchema,
  revision: z.string().regex(/^[a-f0-9]{40}$/),
  providers: providerVersionsSchema,
  codexNative: providerVersionSchema,
  bundle: z.string(),
  bytes: z.number().int().positive().max(2_000_000_000),
  sha256: z.string().regex(/^[a-f0-9]{64}$/),
});
export type DesktopManifest = z.infer<typeof desktopManifestSchema>;
export const desktopEnvelopeSchema = z.object({ payload: z.string().max(16_384), signature: z.string().max(1024) });
export const desktopUpdateStatusSchema = z.object({
  phase: z.enum(["unavailable", "idle", "available", "downloading", "ready", "installing", "succeeded", "failed"]),
  target: desktopManifestSchema.nullable(),
  message: z.string().nullable(),
  manualUrl: z.string().url(),
  checkedAt: z.number().nullable(),
});
export type DesktopUpdateStatus = z.infer<typeof desktopUpdateStatusSchema>;
export interface DesktopUpdateController {
  check(refresh?: boolean): Promise<DesktopUpdateStatus>;
  prepare(target: string): Promise<DesktopUpdateStatus>;
  install(target: string): Promise<DesktopUpdateStatus>;
}

export function desktopBundleUrl(manifest: DesktopManifest): string {
  const expected = `${RELEASE_DOWNLOAD_ROOT}v${manifest.version}/Atelier-v${manifest.version}-arm64.app.zip`;
  if (manifest.bundle !== expected || manifest.codexNative !== manifest.providers.codex) throw new Error("Inconsistent desktop release metadata.");
  return expected;
}

export function compareAppVersions(left: string, right: string): number {
  const [leftCore, leftPrerelease] = left.split("-", 2);
  const [rightCore, rightPrerelease] = right.split("-", 2);
  const a = leftCore?.split(".").map(Number) ?? [];
  const b = rightCore?.split(".").map(Number) ?? [];
  for (let i = 0; i < 3; i += 1) {
    const difference = (a[i] ?? 0) - (b[i] ?? 0);
    if (difference !== 0) return difference;
  }
  if (leftPrerelease === rightPrerelease) return 0;
  if (leftPrerelease === undefined) return 1;
  if (rightPrerelease === undefined) return -1;
  return leftPrerelease.localeCompare(rightPrerelease, undefined, { numeric: true });
}
