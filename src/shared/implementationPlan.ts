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
});
export type ImplementationPlanLot = z.infer<typeof implementationPlanLotSchema>;

export const implementationPlanParallelSchema = z.number().int().min(1).max(MAX_PARALLEL_IMPLEMENTERS).default(DEFAULT_PLAN_PARALLEL_IMPLEMENTERS);

export const implementationPlanSchema = z.object({
  id: z.string().min(1),
  ticketId: z.string().min(1),
  status: z.enum(["pending", "running", "completed", "failed", "interrupted", "cancelled"]),
  maxParallel: implementationPlanParallelSchema,
  lots: z.array(implementationPlanLotSchema).min(1),
  createdAt: z.number().int().nonnegative(),
  updatedAt: z.number().int().nonnegative(),
});
export type ImplementationPlan = z.infer<typeof implementationPlanSchema>;
