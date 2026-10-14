import { z } from "zod";

import { qualityCriterionSchema, qualityScenarioInteractionSchema } from "./quality.ts";

export const AUTONOMOUS_DEFAULT_MAX_CORRECTIONS = 3;
export const AUTONOMOUS_MAX_CORRECTIONS = 3;
export const AUTONOMOUS_DEFAULT_TIMEOUT_MINUTES = 180;
export const AUTONOMOUS_MAX_ENVIRONMENT_RETRIES = 2;
export const AUTONOMOUS_MAX_TIMEOUT_MINUTES = 1440;

export const AUTONOMOUS_DEFAULT_MAX_STARTS = 64;
export const AUTONOMOUS_MAX_STARTS = 10_000;
export const AUTONOMOUS_MAX_FINALIZATION_MINUTES = 60;
export const AUTONOMOUS_MAX_PUBLICATION_ATTEMPTS = 10;
export const AUTONOMOUS_MAX_CUMULATIVE_PUBLICATION_ATTEMPTS = 10_000;
export const AUTONOMOUS_DEFAULT_FINALIZATION_MINUTES = 5;
export const AUTONOMOUS_DEFAULT_MAX_PUBLICATION_ATTEMPTS = 2;
export const AUTONOMOUS_MAX_SAME_FAILURE_REPAIRS = 2;
export const AUTONOMOUS_MINUTE_MS = 60_000;
export const autonomousMaxStartsSchema = z.number().int().positive().max(AUTONOMOUS_MAX_STARTS);
export const autonomousFinalizationMinutesSchema = z.number().int().positive().max(AUTONOMOUS_MAX_FINALIZATION_MINUTES);
export const autonomousMaxPublicationAttemptsSchema = z.number().int().positive().max(AUTONOMOUS_MAX_PUBLICATION_ATTEMPTS);
export const autonomousResumeSchema = z.object({
  action: z.enum(["resume", "publish", "extend"]),
  additionalStarts: autonomousMaxStartsSchema.optional(),
  additionalMinutes: z.number().int().positive().max(AUTONOMOUS_MAX_TIMEOUT_MINUTES).optional(),
  additionalCorrections: z.number().int().positive().max(AUTONOMOUS_MAX_CORRECTIONS).optional(),
});
export type AutonomousResumeInput = z.infer<typeof autonomousResumeSchema>;

export const autonomousDeliverySchema = z.enum(["pr_only", "merge"]);
export type AutonomousDelivery = z.infer<typeof autonomousDeliverySchema>;
export const autonomousMaxCorrectionsSchema = z.number().int().min(0).max(AUTONOMOUS_MAX_CORRECTIONS);
export const autonomousTimeoutMinutesSchema = z.number().int().positive().max(AUTONOMOUS_MAX_TIMEOUT_MINUTES);

export const autonomousPlanInputSchema = z.object({
  plan: z.string().trim().min(1),
  criteria: z.array(qualityCriterionSchema.extend({
    required: z.literal(true),
    expected: z.string().trim().min(1),
    interaction: qualityScenarioInteractionSchema,
  })).min(1),
  unitTests: z.enum(["present", "absent"]),
  unitTestPreparation: z.string().trim().min(1),
}).refine((input) => new Set(input.criteria.map((criterion) => criterion.id)).size === input.criteria.length, "Criterion ids must be unique");
export type AutonomousPlanInput = z.infer<typeof autonomousPlanInputSchema>;

export const autonomousStartKindSchema = z.enum(["orchestrator", "implementation", "review", "repair", "retry", "setup", "check", "preview", "publication", "validator", "diagnostic", "quality_run", "assessment", "other"]);
export type AutonomousStartKind = z.infer<typeof autonomousStartKindSchema>;
const timestampSchema = z.number().int().nonnegative();
export const autonomousExecutionSchema = z.object({
  version: z.literal(1),
  generation: z.number().int().nonnegative(),
  maxStarts: autonomousMaxStartsSchema,
  starts: z.array(z.object({ actionId: z.string().min(1), kind: autonomousStartKindSchema, sessionId: z.string().nullable().default(null), runId: z.string().nullable().default(null), startedAt: timestampSchema })).max(AUTONOMOUS_MAX_STARTS),
  deadlineAt: timestampSchema,
  maxCorrections: z.number().int().nonnegative(),
  maxEnvironmentRetries: z.number().int().nonnegative(),
  maxSameFailureRepairs: z.number().int().nonnegative(),
  failureRepairs: z.array(z.object({ fingerprint: z.string().min(1), count: z.number().int().nonnegative(), lastRunId: z.string().min(1) })).default([]),
  workRevokedAt: timestampSchema.nullable(),
  userStopRequestedAt: timestampSchema.nullable().default(null),
  revocationReason: z.string().nullable(),
  finalizationStartedAt: timestampSchema.nullable(),
  finalizationDeadlineAt: timestampSchema.nullable(),
  finalizationMinutes: autonomousFinalizationMinutesSchema,
  maxPublicationAttempts: z.number().int().positive().max(AUTONOMOUS_MAX_CUMULATIVE_PUBLICATION_ATTEMPTS),
  publicationAttempts: z.number().int().nonnegative(),
  closure: z.object({
    status: z.enum(["not_requested", "requested", "confirmed", "unknown"]),
    requestedAt: timestampSchema.nullable(),
    confirmedAt: timestampSchema.nullable(),
    retention: z.enum(["retained", "released"]),
  }),
  publication: z.object({
    status: z.enum(["none", "candidate", "confirmed", "failed", "unknown"]),
    candidatePrUrl: z.url().nullable(),
    prUrl: z.url().nullable(),
    revision: z.string().nullable(),
    bodyConfirmed: z.boolean(),
    simulated: z.boolean().default(false),
    error: z.string().nullable(),
  }),
});
export type AutonomousExecution = z.infer<typeof autonomousExecutionSchema>;
export const autonomousPhaseSchema = z.enum(["planning", "checks", "preview", "validating", "correcting", "ready", "delivering", "completed", "paused", "closing", "publishing_partial", "published_partial", "publication_failed"]);
const persistedPhaseSchema = z.string().transform((phase) => phase.startsWith("bounded_") ? phase.slice("bounded_".length) : phase).pipe(autonomousPhaseSchema);

export const autonomousStateSchema = z.object({
  execution: autonomousExecutionSchema.optional(),
  hostMutation: z.object({
    kind: z.enum(["create_pr", "merge", "prepare_candidate", "push_candidate", "draft_pr", "update_pr_body"]),
    operationId: z.string().min(1).optional(),
    startedAt: z.number().int().nonnegative(),
    revision: z.string().min(1),
  }).nullable().default(null),
  deliveryConfirmation: z.object({
    prUrl: z.url(),
    revision: z.string().min(1),
    outcome: autonomousDeliverySchema,
    confirmedAt: z.number().int().nonnegative(),
  }).nullable().default(null),
  sourceFingerprint: z.string().nullable().default(null),
  configFingerprint: z.string().nullable().default(null),
  planFingerprint: z.string().nullable().default(null),
  phase: persistedPhaseSchema,
  plan: autonomousPlanInputSchema.nullable(),
  acceptanceSnapshotId: z.string().nullable(),
  functionalSnapshotId: z.string().nullable(),
  revision: z.string().nullable(),
  fullRunId: z.string().nullable(),
  previewRunId: z.string().nullable(),
  previewId: z.string().nullable(),
  startedAt: z.number().int().nonnegative(),
  deadlineAt: z.number().int().nonnegative(),
  corrections: z.number().int().nonnegative(),
  environmentRetries: z.number().int().nonnegative().default(0),
  error: z.string().nullable(),
});
export type AutonomousState = z.infer<typeof autonomousStateSchema>;

export function serializeAutonomousState(state: AutonomousState): string {
  const validated = autonomousStateSchema.parse(state);
  if (!validated.execution) return JSON.stringify(validated);
  return JSON.stringify({ ...validated, phase: `bounded_${validated.phase}` });
}

export class AutonomousExecutionError extends Error {
  constructor(public readonly reason: "revoked" | "deadline" | "starts_exhausted" | "finalization_expired" | "publication_exhausted") {
    super(`Autonomous execution refused: ${reason}`);
    this.name = "AutonomousExecutionError";
  }
}

export const autonomousWorkspacesSchema = z.object({
  parent: z.object({ path: z.string().min(1), available: z.boolean(), simulated: z.boolean() }).nullable(),
  children: z.array(z.object({
    label: z.string(),
    workspacePath: z.string().nullable(),
    journalPath: z.string().nullable(),
    archivePath: z.string().nullable(),
    status: z.enum(["retained", "archived", "integrated", "unknown"]),
    verified: z.boolean(),
  })),
  diagnostic: z.string().nullable(),
});
export type AutonomousWorkspaces = z.infer<typeof autonomousWorkspacesSchema>;

export function isAutonomousParentIncomplete(input: { autonomous?: boolean; autonomousState?: { phase: string; execution?: { closure: { status: string } } } | null }): boolean {
  if (input.autonomous !== true) return false;
  if (input.autonomousState?.phase !== "completed") return true;
  const closureStatus = input.autonomousState.execution?.closure.status;
  return closureStatus === "requested" || closureStatus === "unknown";
}
