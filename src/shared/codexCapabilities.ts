import { z } from "zod";

import { CODEX_EFFORTS, CODEX_MODELS, pairedCodexEffort } from "./constants.ts";
import type { CodexEffort, CodexModel } from "./constants.ts";

export const codexRuntimeModelSchema = z
  .object({
    model: z.enum(CODEX_MODELS),
    efforts: z.array(z.enum(CODEX_EFFORTS)),
    defaultEffort: z.enum(CODEX_EFFORTS),
    serviceTiers: z.array(z.object({ id: z.string(), name: z.string(), description: z.string() })),
    defaultServiceTier: z.string().nullable(),
  })
  .refine((value) => value.efforts.includes(value.defaultEffort), {
    message: "l'effort par défaut doit être disponible",
    path: ["defaultEffort"],
  });
export type CodexRuntimeModel = z.infer<typeof codexRuntimeModelSchema>;

export const codexRuntimeStatusSchema = z.object({
  status: z.enum([
    "checking",
    "ready",
    "unauthenticated",
    "unavailable",
    "model_unavailable",
    "temporarily_unavailable",
    "error",
  ]),
  models: z.array(codexRuntimeModelSchema),
  checkedAt: z.number().int().nonnegative(),
  message: z.string().nullable(),
});
export type CodexRuntimeStatus = z.infer<typeof codexRuntimeStatusSchema>;

export const UNKNOWN_CODEX_RUNTIME_STATUS: CodexRuntimeStatus = {
  status: "checking",
  models: [],
  checkedAt: 0,
  message: "Vérification des capacités Codex…",
};

/** Keep a selection inside the freshly probed runtime pair, using its declared default if needed. */
export function pairedRuntimeCodexEffort(
  runtime: CodexRuntimeStatus,
  model: CodexModel,
  effort: CodexEffort,
): CodexEffort {
  const capability = runtime.models.find((entry) => entry.model === model);
  if (!capability) return pairedCodexEffort(model, effort);
  return capability.efforts.includes(effort) ? effort : capability.defaultEffort;
}

/** Catalog and response alias for the App Server fast request tier. */
export function isCodexFastServiceTier(tier: string | null): boolean {
  return tier === "fast" || tier === "priority";
}
