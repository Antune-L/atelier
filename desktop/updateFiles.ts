import { z } from "zod";

import { desktopManifestSchema } from "../src/shared/desktopUpdate.ts";

export const updateRequestSchema = z.object({
  nonce: z.string().uuid(),
  pid: z.number().int().positive(),
  appPath: z.string(),
  stagedApp: z.string(),
  backupPath: z.string(),
  receiptPath: z.string(),
  readyPath: z.string(),
  manifest: desktopManifestSchema,
});
export const updateReceiptSchema = z.object({
  nonce: z.string().uuid(),
  version: z.string(),
  phase: z.enum(["pending", "healthy", "failed", "restored"]),
  message: z.string().nullable(),
});
export const UPDATE_RECEIPT = "desktop-update-receipt.json";
export const UPDATE_HEALTH_TIMEOUT_MS = 90_000;

export function updateHealthPath(receiptPath: string, nonce: string): string {
  return `${receiptPath}.${nonce}.health.json`;
}
