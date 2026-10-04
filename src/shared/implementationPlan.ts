import { z } from "zod";

import { DEFAULT_PLAN_PARALLEL_IMPLEMENTERS, LOT_LABEL_MAX_LENGTH, MAX_PARALLEL_IMPLEMENTERS } from "./constants.ts";

export const implementationPlanLotDefinitionSchema = z.object({
  label: z.string().trim().min(1).max(LOT_LABEL_MAX_LENGTH),
  plan: z.string().min(1),
  files: z.array(z.string().min(1)).min(1),
  dependsOn: z.array(z.string().trim().min(1).max(LOT_LABEL_MAX_LENGTH)).default([]),
});

export const implementationPlanLotSchema = implementationPlanLotDefinitionSchema.extend({
  status: z.enum(["pending", "running", "completed", "failed", "interrupted", "blocked", "cancelled"]),
  attempts: z.number().int().nonnegative(),
  summary: z.string().nullable(),
  executionRunId: z.string().min(1).nullable(),
  infrastructureAttempts: z.number().int().nonnegative().optional(),
  failurePhase: z.enum(["preparation", "startup", "execution", "integration", "unknown"]).nullable().optional(),
  childResult: z.object({ summary: z.string(), executionRunId: z.string().nullable() }).nullable().optional(),
  retryBlockedReason: z.string().nullable().optional(),
  failureHistory: z.array(z.object({ phase: z.string(), summary: z.string(), at: z.number(), diagnostic: z.unknown().optional() })).optional(),
});
export type ImplementationPlanLot = z.infer<typeof implementationPlanLotSchema>;

export const implementationRecoverySchema = z.object({
  generation: z.string().min(1),
  actor: z.enum(["user", "agent"]),
  reason: z.string().min(1),
  status: z.enum(["freezing", "pending", "assessing", "assessed", "resolved"]),
  slotId: z.number().int(),
  obligations: z.array(implementationPlanLotDefinitionSchema).min(1),
  candidate: z.object({ commitSha: z.string(), fingerprint: z.string() }).nullable(),
  coverage: z.array(z.object({ label: z.string(), covered: z.boolean(), evidence: z.string() })),
  assessmentExecutionId: z.string().nullable(),
  archives: z.array(z.object({ label: z.string(), ticketId: z.string(), cycleId: z.string().optional(), archivePath: z.string(), journalPath: z.string().nullable(), verified: z.literal(true), unchanged: z.boolean() })),
  diagnostic: z.string().nullable(),
  prUrl: z.string().nullable(),
  createdAt: z.number(),
  updatedAt: z.number(),
});
export type ImplementationRecovery = z.infer<typeof implementationRecoverySchema>;

export const implementationPlanParallelSchema = z.number().int().min(1).max(MAX_PARALLEL_IMPLEMENTERS).default(DEFAULT_PLAN_PARALLEL_IMPLEMENTERS);

export const implementationPlanSchema = z.object({
  id: z.string().min(1),
  ticketId: z.string().min(1),
  status: z.enum(["pending", "running", "completed", "failed", "interrupted", "cancelled"]),
  maxParallel: implementationPlanParallelSchema,
  lots: z.array(implementationPlanLotSchema).min(1),
  createdAt: z.number().int().nonnegative(),
  updatedAt: z.number().int().nonnegative(),
  recovery: implementationRecoverySchema.nullable().optional(),
});
export type ImplementationPlan = z.infer<typeof implementationPlanSchema>;

export function hasUnresolvedImplementation(plan: ImplementationPlan | null | undefined): boolean {
  if (!plan) return false;
  if (plan.recovery) return true;
  return plan.lots.some((lot) => lot.status !== "completed");
}
