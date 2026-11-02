import { z } from "zod";

import { providerVersionsSchema } from "./providerUpdates.ts";

export const ADOPTION_REPOSITORY = "Antune-L/atelier";
export const ADOPTION_WORKFLOW = "provider-adoption.yml";
export const ADOPTION_RECEIPT_FILE = "provider-adoption.json";
export const adoptionShaSchema = z.string().regex(/^[a-f0-9]{40}$/);
export const adoptionRequestSchema = z.object({ confirmed: z.literal(true) });
const qualificationEvidenceSchema = z.object({
  evidenceSha256: z.string().regex(/^[a-f0-9]{64}$/),
  nativeHashes: z.object({ claude: z.string().regex(/^[a-f0-9]{64}$/), codex: z.string().regex(/^[a-f0-9]{64}$/) }),
});
export const adoptionReceiptSchema = z.object({
  protocol: z.literal(1),
  requestId: z.string().uuid(),
  runId: z.number().int().positive(),
  base: adoptionShaSchema,
  revision: adoptionShaSchema,
  version: z.string().regex(/^0\.1\.\d+$/),
  providers: providerVersionsSchema,
  lockSha256: z.string().regex(/^[a-f0-9]{64}$/),
  qualifications: z.object({ linux: qualificationEvidenceSchema, mac: qualificationEvidenceSchema }),
  gates: z.object({ linux: z.literal("passed"), mac: z.literal("passed"), static: z.literal("passed") }),
  artifacts: z.array(z.object({ name: z.string().regex(/^[\w.-]+$/), sha256: z.string().regex(/^[a-f0-9]{64}$/) })).min(1),
});
export type AdoptionReceipt = z.infer<typeof adoptionReceiptSchema>;
export const adoptionStatusSchema = z.object({
  requestId: z.string().uuid(),
  providers: providerVersionsSchema.nullable(),
  base: adoptionShaSchema.nullable(),
  runId: z.number().int().positive().nullable(),
  phase: z.enum(["setup-required", "queued", "preparation", "qualification", "build", "publication", "ready", "failed", "unknown", "unchanged", "simulated"]),
  reason: z.string().max(512).nullable(),
  receipt: adoptionReceiptSchema.nullable(),
  updatedAt: z.number(),
});
export type AdoptionStatus = z.infer<typeof adoptionStatusSchema>;
