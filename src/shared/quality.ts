import { z } from "zod";

import { ORCHESTRATORS } from "./constants.ts";

export const QUALITY_ACTIVE_STATUSES = ["queued", "running"] satisfies string[];
export const QUALITY_DEFAULT_TIMEOUT_MS = 120_000;
export const QUALITY_DEFAULT_HEALTH_PATH = "/";
export const QUALITY_MAX_OBSERVATION_LENGTH = 20_000;

const nonEmptyTextSchema = z.string().trim().min(1);
const timestampSchema = z.number().int().nonnegative();

export const qualityValidationModeSchema = z.enum(["repository", "browser"]);
export type QualityValidationMode = z.infer<typeof qualityValidationModeSchema>;

export const qualityRunPhaseSchema = z.enum(["planning", "preparing", "checks", "validating", "cleanup"]);
export type QualityRunPhase = z.infer<typeof qualityRunPhaseSchema>;

export const projectValidationSchema = z.object({
  enabled: z.boolean().default(true),
  requireBehavioral: z.boolean().default(true),
  isolated: z.boolean(),
  setupCommand: nonEmptyTextSchema.optional(),
  startCommand: nonEmptyTextSchema.optional(),
  teardownCommand: nonEmptyTextSchema.optional(),
  healthPath: z.string().startsWith("/").default(QUALITY_DEFAULT_HEALTH_PATH),
  timeoutMs: z.number().int().positive().default(QUALITY_DEFAULT_TIMEOUT_MS),
  environment: z.record(z.string(), z.string()).optional(),
});
export type ProjectValidation = z.infer<typeof projectValidationSchema>;

export const qualityCriterionSchema = z.object({
  id: nonEmptyTextSchema,
  text: nonEmptyTextSchema,
  source: z.enum(["ticket", "prd", "user"]),
  required: z.boolean().default(true),
  independent: z.boolean().default(true),
});
export type QualityCriterion = z.infer<typeof qualityCriterionSchema>;

export const qualityCriteriaSnapshotSchema = z.object({
  id: nonEmptyTextSchema,
  ticketId: nonEmptyTextSchema,
  version: z.number().int().positive(),
  criteria: z.array(qualityCriterionSchema).min(1),
  sourceFingerprint: nonEmptyTextSchema,
  mode: qualityValidationModeSchema.default("browser"),
  createdBy: z.enum(["user", "agent", "system"]),
  createdAt: timestampSchema,
}).refine((snapshot) => new Set(snapshot.criteria.map((criterion) => criterion.id)).size === snapshot.criteria.length, "Criterion ids must be unique");
export type QualityCriteriaSnapshot = z.infer<typeof qualityCriteriaSnapshotSchema>;

export const qualityEnvironmentSchema = z.object({
  directory: nonEmptyTextSchema,
  dataDirectory: nonEmptyTextSchema.optional(),
  port: z.number().int().positive(),
  databaseNamespace: nonEmptyTextSchema,
  teardownCommand: nonEmptyTextSchema.optional(),
  timeoutMs: z.number().int().positive().optional(),
  addresses: z.array(z.object({ label: nonEmptyTextSchema, url: z.string().url() })).optional(),
});
export type QualityEnvironment = z.infer<typeof qualityEnvironmentSchema>;

export const qualityRunStatusSchema = z.enum(["queued", "running", "passed", "failed", "cancelled", "interrupted", "inconclusive"]);
export type QualityRunStatus = z.infer<typeof qualityRunStatusSchema>;

export const qualityValidationRunSchema = z.object({
  id: nonEmptyTextSchema,
  ticketId: nonEmptyTextSchema,
  criteriaSnapshotId: nonEmptyTextSchema.nullable(),
  kind: z.enum(["checks", "behavior", "full"]),
  mode: qualityValidationModeSchema.nullable().default("browser"),
  phase: qualityRunPhaseSchema.nullable().default(null),
  failurePhase: qualityRunPhaseSchema.nullable().default(null),
  revision: nonEmptyTextSchema,
  fingerprint: nonEmptyTextSchema,
  configFingerprint: nonEmptyTextSchema,
  status: qualityRunStatusSchema,
  provider: z.enum(ORCHESTRATORS).nullable(),
  simulated: z.boolean(),
  evidenceAccepted: z.boolean().default(false),
  technicalEvidenceAccepted: z.boolean().default(false),
  startedAt: timestampSchema,
  completedAt: timestampSchema.nullable(),
  environment: qualityEnvironmentSchema.nullable(),
  cleanupStatus: z.enum(["pending", "complete", "failed"]),
  error: z.string().nullable(),
});
export type QualityValidationRun = z.infer<typeof qualityValidationRunSchema>;

export const qualityEvidenceSchema = z.object({
  id: nonEmptyTextSchema,
  runId: nonEmptyTextSchema,
  criterionId: nonEmptyTextSchema.nullable(),
  kind: z.enum(["command", "behavior"]),
  authority: z.enum(["server", "agent", "human"]),
  author: z.enum(["user", "agent", "system"]).default("system"),
  status: z.enum(["passed", "failed", "inconclusive"]),
  summary: nonEmptyTextSchema,
  output: z.string(),
  command: nonEmptyTextSchema.nullable(),
  exitCode: z.number().int().nullable(),
  timedOut: z.boolean(),
  durationMs: z.number().nonnegative(),
  artifactPath: nonEmptyTextSchema.nullable(),
  provider: z.enum(ORCHESTRATORS).nullable(),
  sessionId: nonEmptyTextSchema.nullable(),
  model: nonEmptyTextSchema.nullable(),
  createdAt: timestampSchema,
}).superRefine((evidence, context) => {
  if (evidence.status === "passed" && !evidence.output.trim()) {
    context.addIssue({ code: "custom", path: ["output"], message: "Passing evidence requires observed output" });
  }
  if (evidence.kind === "command" && evidence.authority !== "server") {
    context.addIssue({ code: "custom", path: ["authority"], message: "Command evidence must be server-owned" });
  }
  if (evidence.kind === "command" && !evidence.command) {
    context.addIssue({ code: "custom", path: ["command"], message: "Command evidence requires the executed command" });
  }
  if (evidence.kind === "behavior" && evidence.authority === "server") {
    context.addIssue({ code: "custom", path: ["authority"], message: "Behavioral evidence requires an attributed agent or human observation" });
  }
  if (evidence.authority === "human" && (evidence.author !== "user" || evidence.provider !== null || evidence.sessionId !== null)) {
    context.addIssue({ code: "custom", path: ["author"], message: "Human evidence must be authored by the user without agent provenance" });
  }
  if ((evidence.authority === "agent" && evidence.author !== "agent") || (evidence.authority === "server" && evidence.author !== "system")) {
    context.addIssue({ code: "custom", path: ["author"], message: "Evidence author must match its authority" });
  }
  if (evidence.kind === "command" && evidence.status === "passed" && (evidence.exitCode !== 0 || evidence.timedOut)) {
    context.addIssue({ code: "custom", path: ["status"], message: "Passing command evidence requires exit code zero without timeout" });
  }
  if (evidence.kind === "behavior" && !evidence.criterionId) {
    context.addIssue({ code: "custom", path: ["criterionId"], message: "Behavioral evidence requires a criterion" });
  }
  if (evidence.kind === "behavior" && evidence.authority !== "human" && (!evidence.provider || !evidence.sessionId)) {
    context.addIssue({ code: "custom", path: ["criterionId"], message: "Behavioral evidence requires criterion and session provenance" });
  }
});
export type QualityEvidence = z.infer<typeof qualityEvidenceSchema>;

export const ticketQualitySchema = z.object({
  ticketId: nonEmptyTextSchema,
  criteriaSnapshots: z.array(qualityCriteriaSnapshotSchema),
  runs: z.array(qualityValidationRunSchema),
  evidence: z.array(qualityEvidenceSchema),
});
export type TicketQuality = z.infer<typeof ticketQualitySchema>;

export const qualityGateSchema = z.object({
  enabled: z.boolean(),
  complete: z.boolean(),
  reservations: z.array(nonEmptyTextSchema),
  allowed: z.boolean(),
  stale: z.boolean(),
  reasons: z.array(nonEmptyTextSchema),
  requiredCriteria: z.array(nonEmptyTextSchema),
  verifiedCriteria: z.array(nonEmptyTextSchema),
  currentRunIds: z.array(nonEmptyTextSchema).default([]),
});
export type QualityGate = z.infer<typeof qualityGateSchema>;

export const setQualityCriteriaSchema = z.object({
  criteria: z.array(qualityCriterionSchema).min(1),
  mode: qualityValidationModeSchema.optional(),
});
export type SetQualityCriteriaInput = z.infer<typeof setQualityCriteriaSchema>;

export const qualityCriteriaPlanSchema = z.object({
  mode: qualityValidationModeSchema,
  criteria: z.array(qualityCriterionSchema).min(1),
}).refine((plan) => new Set(plan.criteria.map((criterion) => criterion.id)).size === plan.criteria.length, "Criterion ids must be unique");
export type QualityCriteriaPlan = z.infer<typeof qualityCriteriaPlanSchema>;

export const qualityPreflightSchema = z.object({
  ok: z.boolean(),
  blockers: z.array(nonEmptyTextSchema),
  reservations: z.array(nonEmptyTextSchema),
  revision: nonEmptyTextSchema.nullable(),
  configFingerprint: nonEmptyTextSchema,
});
export type QualityPreflight = z.infer<typeof qualityPreflightSchema>;

export const qualityResponseSchema = z.object({
  quality: ticketQualitySchema,
  gate: qualityGateSchema,
});
export type QualityResponse = z.infer<typeof qualityResponseSchema>;

export const validateQualitySchema = z.object({ provider: z.enum(ORCHESTRATORS) });
export type ValidateQualityInput = z.infer<typeof validateQualitySchema>;

export const manualQualityEvidenceSchema = z.object({
  criterionId: nonEmptyTextSchema,
  observation: nonEmptyTextSchema.max(QUALITY_MAX_OBSERVATION_LENGTH),
  status: z.enum(["passed", "failed", "inconclusive"]),
});
export type ManualQualityEvidenceInput = z.infer<typeof manualQualityEvidenceSchema>;
