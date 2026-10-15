import { z } from "zod";

import { ORCHESTRATORS } from "./constants.ts";

export const QUALITY_HISTORY_VERSION = 1;
export const QUALITY_HISTORY_EVENT_LIMIT = 2_000;
export const QUALITY_HISTORY_BYTE_LIMIT = 2_000_000;
export const QUALITY_HISTORY_SUMMARY_LIMIT = 1_000;
export const QUALITY_HISTORY_PAGE_LIMIT = 200;
export const QUALITY_HISTORY_DEFAULT_PAGE_SIZE = 50;
export const QUALITY_HISTORY_ARTIFACT_LIMIT = 10;
export const QUALITY_HISTORY_ACTION_REFERENCE_LIMIT = 64;
const textSchema = z.string().min(1);
const timestampSchema = z.number().int().nonnegative();

export const qualityRequestOriginSchema = z.enum(["manual", "autonomous", "system"]);
export const qualityRequestStatusSchema = z.enum(["reserved", "running", "completed", "refused", "interrupted"]);
export const qualityRequestSchema = z.object({
  requestId: textSchema,
  ticketId: textSchema,
  parameterHash: textSchema,
  origin: qualityRequestOriginSchema,
  provider: z.enum(ORCHESTRATORS).nullable().default(null),
  kind: z.enum(["checks", "behavior", "full", "functional", "combined"]).nullable().default(null),
  revision: z.string().max(QUALITY_HISTORY_SUMMARY_LIMIT).nullable().default(null),
  previewId: z.string().max(QUALITY_HISTORY_SUMMARY_LIMIT).nullable().default(null),
  status: qualityRequestStatusSchema,
  runId: textSchema.nullable(),
  deadlineAt: timestampSchema.nullable(),
  createdAt: timestampSchema,
  completedAt: timestampSchema.nullable(),
  reason: z.string().max(QUALITY_HISTORY_SUMMARY_LIMIT).nullable(),
  historyVersion: z.literal(QUALITY_HISTORY_VERSION),
  historyCompleteness: z.enum(["complete", "partial"]),
  truncated: z.boolean(),
});
export type QualityRequest = z.infer<typeof qualityRequestSchema>;
export type QualityRequestOrigin = z.infer<typeof qualityRequestOriginSchema>;
export type QualityRequestStatus = z.infer<typeof qualityRequestStatusSchema>;

export const qualityActionStatusSchema = z.enum(["started", "succeeded", "failed", "denied", "interrupted", "unknown"]);
export const qualityActionInputSchema = z.object({
  actionId: textSchema.optional(),
  nativeId: z.string().max(QUALITY_HISTORY_SUMMARY_LIMIT).nullable().optional(),
  sourceId: z.string().max(QUALITY_HISTORY_SUMMARY_LIMIT).nullable().optional(),
  sessionId: z.string().max(QUALITY_HISTORY_SUMMARY_LIMIT).nullable().optional(),
  provider: z.enum(ORCHESTRATORS).nullable().optional(),
  phase: z.string().max(QUALITY_HISTORY_SUMMARY_LIMIT).default("unknown"),
  kind: z.enum(["tool", "command", "service", "git", "cleanup", "denial", "observation", "history"]),
  toolName: z.string().max(QUALITY_HISTORY_SUMMARY_LIMIT).nullable().optional(),
  status: qualityActionStatusSchema,
  summary: z.string().max(QUALITY_HISTORY_SUMMARY_LIMIT),
  truncated: z.boolean().default(false),
  artifactPaths: z.array(z.string().max(QUALITY_HISTORY_SUMMARY_LIMIT)).max(QUALITY_HISTORY_ARTIFACT_LIMIT).default([]),
  actionIds: z.array(z.string().max(QUALITY_HISTORY_SUMMARY_LIMIT)).max(QUALITY_HISTORY_ACTION_REFERENCE_LIMIT).default([]),
  criterionId: z.string().max(QUALITY_HISTORY_SUMMARY_LIMIT).nullable().optional(),
});
export type QualityActionInput = z.input<typeof qualityActionInputSchema>;
export const qualityActionSchema = qualityActionInputSchema.extend({
  id: textSchema,
  requestId: textSchema,
  runId: textSchema.nullable(),
  sequence: z.number().int().positive(),
  actionId: textSchema,
  createdAt: timestampSchema,
});
export type QualityAction = z.infer<typeof qualityActionSchema>;
export const qualityActionPageSchema = z.object({
  actions: z.array(qualityActionSchema),
  nextSequence: z.number().int().positive().nullable(),
});
export type QualityActionPage = z.infer<typeof qualityActionPageSchema>;

export const qualityRequestPageSchema = z.object({
  requests: z.array(qualityRequestSchema),
  nextCursor: z.object({ beforeCreatedAt: timestampSchema, beforeRequestId: textSchema }).nullable(),
});
export type QualityRequestPage = z.infer<typeof qualityRequestPageSchema>;
