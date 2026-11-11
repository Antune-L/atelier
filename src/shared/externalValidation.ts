import { z } from "zod";
import { previewBranchSchema } from "./preview.ts";

export const EXTERNAL_PREVIEW_MARKER_PREFIX = "kanban-preview-external-";

export const externalScenarioSchema = z.object({ id: z.string().min(1).max(200), description: z.string().min(1).max(8000), expected: z.string().min(1).max(8000), interaction: z.enum(["interactive", "visual", "display"]) }).strict();
export const startExternalValidationSchema = z.object({
  requestId: z.string().min(1).max(200), missionId: z.string().min(1).max(200), project: z.string().min(1), branch: previewBranchSchema,
  headSha: z.string().regex(/^[a-f0-9]{40}$/), provider: z.enum(["claude", "codex"]), scenarios: z.array(externalScenarioSchema).min(1).max(50).refine(items => new Set(items.map(item => item.id)).size === items.length, "Scenario IDs must be unique"),
}).strict();
export const externalRequestSchema = startExternalValidationSchema.pick({ requestId: true });
export const externalArtifactRequestSchema = externalRequestSchema.extend({ artifactId: z.string().min(1) }).strict();
export const externalArtifactSchema = z.object({ id: z.string(), name: z.string(), mimeType: z.string(), sha256: z.string() });
export const externalValidationSchema = startExternalValidationSchema.extend({
  status: z.enum(["queued", "deploying", "running", "passed", "failed", "blocked", "inconclusive", "cancelled", "interrupted"]), simulated: z.boolean(),
  previewId: z.string().nullable(), previewUrl: z.string().nullable(), deploymentId: z.string().nullable(), deployedSha: z.string().nullable(), sessionId: z.string().nullable(),
  startedAt: z.iso.datetime(), finishedAt: z.iso.datetime().nullable(), cleanupStatus: z.enum(["pending", "complete", "failed"]), error: z.string().nullable(),
  results: z.array(z.object({ scenarioId: z.string(), status: z.enum(["passed", "failed", "blocked", "inconclusive"]), summary: z.string(), actions: z.array(z.string()), observed: z.string(), artifactIds: z.array(z.string()) })), artifacts: z.array(externalArtifactSchema),
});
export const externalValidationOutputSchema = z.object({ validation: externalValidationSchema.nullable() });
export const externalArtifactOutputSchema = z.object({ artifact: externalArtifactSchema.extend({ contentBase64: z.string().max(512_000) }) });
export type ExternalValidation = z.infer<typeof externalValidationSchema>;
export type StartExternalValidation = z.infer<typeof startExternalValidationSchema>;
