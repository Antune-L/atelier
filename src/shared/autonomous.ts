import { z } from "zod";

import { qualityCriterionSchema, qualityScenarioInteractionSchema } from "./quality.ts";

export const AUTONOMOUS_DEFAULT_MAX_CORRECTIONS = 1;
export const AUTONOMOUS_MAX_CORRECTIONS = 3;
export const AUTONOMOUS_DEFAULT_TIMEOUT_MINUTES = 60;
export const AUTONOMOUS_MAX_TIMEOUT_MINUTES = 1440;

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

export const autonomousStateSchema = z.object({
  hostMutation: z.object({
    kind: z.enum(["create_pr", "merge"]),
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
  phase: z.enum(["planning", "checks", "preview", "validating", "correcting", "ready", "delivering", "completed", "paused"]),
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
  error: z.string().nullable(),
});
export type AutonomousState = z.infer<typeof autonomousStateSchema>;
