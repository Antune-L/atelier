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

export interface QualityPreviewTarget {
  previewId: string;
  revision: string;
  url: string;
  healthPath?: string;
  auth?: { username: string; password: string };
  assertCurrent?: () => Promise<void>;
  autonomous?: boolean;
}

export const qualityPreviewBindingSchema = z.object({
  previewId: nonEmptyTextSchema,
  revision: nonEmptyTextSchema,
  url: z.string().url(),
});
export type QualityPreviewBinding = z.infer<typeof qualityPreviewBindingSchema>;

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

export const qualityScenarioInteractionSchema = z.enum(["interactive", "display", "visual"]);
export type QualityScenarioInteraction = z.infer<typeof qualityScenarioInteractionSchema>;

export const qualityCriterionSchema = z.object({
  id: nonEmptyTextSchema,
  text: nonEmptyTextSchema,
  source: z.enum(["ticket", "prd", "user"]),
  required: z.boolean().default(true),
  independent: z.boolean().default(true),
  interaction: qualityScenarioInteractionSchema.optional(),
  expected: nonEmptyTextSchema.optional(),
  covers: z.array(nonEmptyTextSchema).optional(),
});
export type QualityCriterion = z.infer<typeof qualityCriterionSchema>;

export const qualityCriteriaPurposeSchema = z.enum(["acceptance", "functional"]);
export type QualityCriteriaPurpose = z.infer<typeof qualityCriteriaPurposeSchema>;

export const qualityUncoveredCriterionSchema = z.object({ criterionId: nonEmptyTextSchema, reason: nonEmptyTextSchema });
export type QualityUncoveredCriterion = z.infer<typeof qualityUncoveredCriterionSchema>;

export const qualityCriteriaSnapshotSchema = z.object({
  id: nonEmptyTextSchema,
  ticketId: nonEmptyTextSchema,
  version: z.number().int().positive(),
  criteria: z.array(qualityCriterionSchema).min(1),
  sourceFingerprint: nonEmptyTextSchema,
  mode: qualityValidationModeSchema.default("browser"),
  createdBy: z.enum(["user", "agent", "system"]),
  createdAt: timestampSchema,
  purpose: qualityCriteriaPurposeSchema.default("acceptance"),
  baseSnapshotId: nonEmptyTextSchema.nullable().default(null),
  uncovered: z.array(qualityUncoveredCriterionSchema).default([]),
  previewId: nonEmptyTextSchema.optional(),
}).refine((snapshot) => new Set(snapshot.criteria.map((criterion) => criterion.id)).size === snapshot.criteria.length, "Criterion ids must be unique");
export type QualityCriteriaSnapshot = z.infer<typeof qualityCriteriaSnapshotSchema>;

export function latestAcceptanceSnapshot(quality: Pick<TicketQuality, "criteriaSnapshots">): QualityCriteriaSnapshot | undefined {
  return quality.criteriaSnapshots.filter((snapshot) => snapshot.purpose === "acceptance").at(-1);
}

export function latestFunctionalSnapshot(quality: Pick<TicketQuality, "criteriaSnapshots">): QualityCriteriaSnapshot | undefined {
  return quality.criteriaSnapshots.filter((snapshot) => snapshot.purpose === "functional" && !snapshot.previewId).at(-1);
}

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

export const qualityPermissionBlockReasonSchema = z.enum(["invalid_tool_input", "unsupported_read_tool", "path_outside_workspace", "path_unresolvable", "home_expansion", "unsafe_read_option", "shell_expansion", "shell_syntax", "unquoted_glob", "working_directory_mismatch", "command_not_allowlisted", "workspace_unresolvable"]);
export type QualityPermissionBlockReason = z.infer<typeof qualityPermissionBlockReasonSchema>;

export const qualityBlockerCategorySchema = z.enum(["unsupported_operation", "path_or_directory", "workspace_unavailable", "filesystem_error", "access_restriction", "unknown"]);
export type QualityBlockerCategory = z.infer<typeof qualityBlockerCategorySchema>;

const QUALITY_BLOCKER_CATEGORIES = {
  invalid_tool_input: "unsupported_operation",
  unsupported_read_tool: "unsupported_operation",
  path_outside_workspace: "access_restriction",
  path_unresolvable: "filesystem_error",
  home_expansion: "access_restriction",
  unsafe_read_option: "unsupported_operation",
  shell_expansion: "unsupported_operation",
  shell_syntax: "unsupported_operation",
  unquoted_glob: "unsupported_operation",
  working_directory_mismatch: "path_or_directory",
  command_not_allowlisted: "unsupported_operation",
  workspace_unresolvable: "workspace_unavailable",
} satisfies Record<QualityPermissionBlockReason, QualityBlockerCategory>;

export function qualityBlockerCategory(reason: QualityPermissionBlockReason | null): QualityBlockerCategory {
  if (reason === null) return "unknown";
  return QUALITY_BLOCKER_CATEGORIES[reason];
}

export const qualityPermissionDenialSchema = z.object({
  provider: z.enum(ORCHESTRATORS),
  source: z.literal("provider_permission_denial"),
  toolName: nonEmptyTextSchema,
  commandShape: z.string().nullable(),
  reason: z.string(),
  blockReason: qualityPermissionBlockReasonSchema.nullable().default(null),
  signature: z.string().nullable().default(null),
  workspaceAvailable: z.boolean().nullable().default(null),
  reportedMs: z.number().nonnegative(),
});
export type QualityPermissionDenial = z.infer<typeof qualityPermissionDenialSchema>;

export const qualityFunctionalBlockerCodeSchema = z.enum(["start_configuration_missing", "environment_setup_failed", "dependency_installation_failed", "application_unavailable", "browser_unavailable", "authentication_required", "test_data_missing"]);
export type QualityFunctionalBlockerCode = z.infer<typeof qualityFunctionalBlockerCodeSchema>;

export const qualityFunctionalBlockerSchema = z.object({
  code: qualityFunctionalBlockerCodeSchema,
  scenarioId: z.string().nullable(),
  summary: z.string(),
});
export type QualityFunctionalBlocker = z.infer<typeof qualityFunctionalBlockerSchema>;

export const qualityRunDiagnosticSchema = z.object({
  category: z.enum(["code_nonconformance", "permission_denial", "timeout", "validation_incomplete", "backend_checks_failed", "environment_blocker"]),
  summary: nonEmptyTextSchema,
  permissionDenials: z.array(qualityPermissionDenialSchema).default([]),
  blockers: z.array(qualityFunctionalBlockerSchema).default([]),
});
export type QualityRunDiagnostic = z.infer<typeof qualityRunDiagnosticSchema>;

export const qualityValidationRunSchema = z.object({
  id: nonEmptyTextSchema,
  ticketId: nonEmptyTextSchema,
  criteriaSnapshotId: nonEmptyTextSchema.nullable(),
  kind: z.enum(["checks", "behavior", "full", "functional"]),
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
  diagnostic: qualityRunDiagnosticSchema.nullable().default(null),
  preview: qualityPreviewBindingSchema.nullable().optional(),
}).refine((run) => !run.preview || run.kind === "functional" && run.mode === "browser" && run.revision === run.preview.revision, "Preview validation must be a browser functional run of its bound revision");
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
  scenario: z.object({
    interaction: qualityScenarioInteractionSchema,
    expected: z.string(),
    actions: z.array(z.object({ tool: z.string(), ok: z.boolean() })),
    observed: z.string(),
  }).optional(),
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

export const QUALITY_ITERATION_ACTIVE_STATUSES = ["queued", "correcting", "verifying"] satisfies string[];

export const qualityIterationModeSchema = z.enum(["correction", "recovery"]);
export type QualityIterationMode = z.infer<typeof qualityIterationModeSchema>;

export const qualityIterationStatusSchema = z.enum(["queued", "correcting", "verifying", "completed", "failed", "cancelled", "interrupted"]);
export type QualityIterationStatus = z.infer<typeof qualityIterationStatusSchema>;

export const qualityIterationTriggerSchema = z.enum(["criteria", "checks", "incomplete", "functional"]);
export type QualityIterationTrigger = z.infer<typeof qualityIterationTriggerSchema>;

export const qualityIterationSchema = z.object({
  id: nonEmptyTextSchema,
  ticketId: nonEmptyTextSchema,
  project: nonEmptyTextSchema,
  prUrl: z.string().url().nullable(),
  headBranch: nonEmptyTextSchema.nullable(),
  sourceRunId: nonEmptyTextSchema,
  sourceRevision: nonEmptyTextSchema,
  criteriaSnapshot: qualityCriteriaSnapshotSchema.nullable(),
  originalTicket: z.object({ title: z.string(), description: z.string(), prdMarkdown: z.string().nullable() }),
  provider: z.enum(ORCHESTRATORS),
  mode: qualityIterationModeSchema,
  status: qualityIterationStatusSchema,
  retryOfIterationId: nonEmptyTextSchema.nullable().default(null),
  trigger: qualityIterationTriggerSchema.nullable().default(null),
  evidenceIds: z.array(nonEmptyTextSchema).default([]),
  resultRunId: nonEmptyTextSchema.nullable(),
  resultRevision: nonEmptyTextSchema.nullable(),
  diagnostic: z.string().nullable(),
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
  completedAt: timestampSchema.nullable(),
});
export type QualityIteration = z.infer<typeof qualityIterationSchema>;

export const ticketQualitySchema = z.object({
  ticketId: nonEmptyTextSchema,
  criteriaSnapshots: z.array(qualityCriteriaSnapshotSchema),
  runs: z.array(qualityValidationRunSchema),
  evidence: z.array(qualityEvidenceSchema),
  iterations: z.array(qualityIterationSchema).default([]),
  latestIteration: qualityIterationSchema.nullable().default(null),
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

export const qualityFollowUpIssueSchema = z.enum(["checks", "blocker", "functional"]);
export type QualityFollowUpIssue = z.infer<typeof qualityFollowUpIssueSchema>;

export const qualityProblemSchema = z.object({
  id: nonEmptyTextSchema,
  kind: z.enum(["technical_check", "read_blocker", "criterion_failed", "criterion_unverified", "scenario_failed", "scenario_unverified", "functional_blocker"]),
  authority: z.enum(["server", "agent"]),
  runId: nonEmptyTextSchema,
  summary: nonEmptyTextSchema,
  evidenceId: nonEmptyTextSchema.nullable(),
  criterionId: nonEmptyTextSchema.nullable(),
  blockReason: qualityPermissionBlockReasonSchema.nullable(),
  category: qualityBlockerCategorySchema.nullable(),
  toolName: z.string().nullable(),
  commandShape: z.string().nullable(),
  occurrences: z.number().int().positive(),
  repeated: z.boolean(),
  blockerCode: qualityFunctionalBlockerCodeSchema.nullable().default(null),
});
export type QualityProblem = z.infer<typeof qualityProblemSchema>;

export const qualityFollowUpSchema = z.object({
  issue: qualityFollowUpIssueSchema,
  sourceRunId: nonEmptyTextSchema,
  ticketId: nonEmptyTextSchema,
  title: z.string(),
  project: nonEmptyTextSchema,
});
export type QualityFollowUp = z.infer<typeof qualityFollowUpSchema>;

const qualityActionAvailabilitySchema = z.object({ available: z.boolean(), reason: z.string().nullable() });

export const qualityResponseSchema = z.object({
  quality: ticketQualitySchema,
  gate: qualityGateSchema,
  iterationActions: z.object({
    sourceRunId: nonEmptyTextSchema.nullable(),
    recommendedMode: z.enum(["correction", "recovery"]).nullable(),
    retryOfIterationId: nonEmptyTextSchema.nullable(),
    recovery: qualityActionAvailabilitySchema,
    correction: qualityActionAvailabilitySchema,
    checksCorrection: qualityActionAvailabilitySchema.extend({
      sourceRunId: nonEmptyTextSchema.nullable(),
      retryOfIterationId: nonEmptyTextSchema.nullable(),
    }).default({ available: false, reason: null, sourceRunId: null, retryOfIterationId: null }),
    functional: qualityActionAvailabilitySchema.extend({
      sourceRunId: nonEmptyTextSchema.nullable(),
      retryOfIterationId: nonEmptyTextSchema.nullable(),
    }).default({ available: false, reason: null, sourceRunId: null, retryOfIterationId: null }),
    followUp: z.object({
      checks: qualityActionAvailabilitySchema.extend({ sourceRunId: nonEmptyTextSchema.nullable() }),
      blocker: qualityActionAvailabilitySchema.extend({ sourceRunId: nonEmptyTextSchema.nullable() }),
      functional: qualityActionAvailabilitySchema.extend({ sourceRunId: nonEmptyTextSchema.nullable() }).default({ available: false, reason: null, sourceRunId: null }),
    }).default({ checks: { available: false, reason: null, sourceRunId: null }, blocker: { available: false, reason: null, sourceRunId: null }, functional: { available: false, reason: null, sourceRunId: null } }),
    problems: z.array(qualityProblemSchema).default([]),
    followUps: z.array(qualityFollowUpSchema).default([]),
  }).optional(),
});
export type QualityResponse = z.infer<typeof qualityResponseSchema>;
export type QualityIterationActions = NonNullable<QualityResponse["iterationActions"]>;

export const createQualityFollowUpSchema = z.object({
  sourceRunId: nonEmptyTextSchema,
  issue: qualityFollowUpIssueSchema,
  project: nonEmptyTextSchema,
});
export type CreateQualityFollowUpInput = z.infer<typeof createQualityFollowUpSchema>;

export const qualityFollowUpResponseSchema = qualityResponseSchema.extend({
  followUp: z.object({
    created: z.boolean(),
    ticketId: nonEmptyTextSchema,
    title: z.string(),
    project: nonEmptyTextSchema,
  }),
});
export type QualityFollowUpResponse = z.infer<typeof qualityFollowUpResponseSchema>;

export const startQualityIterationSchema = z.object({
  sourceRunId: nonEmptyTextSchema,
  provider: z.enum(ORCHESTRATORS),
  mode: z.enum(["correction", "recovery"]),
  retryOfIterationId: nonEmptyTextSchema.optional(),
  trigger: qualityIterationTriggerSchema.optional(),
});
export type StartQualityIterationInput = z.infer<typeof startQualityIterationSchema>;

export const validateQualitySchema = z.object({ provider: z.enum(ORCHESTRATORS) });
export type ValidateQualityInput = z.infer<typeof validateQualitySchema>;

export const manualQualityEvidenceSchema = z.object({
  criterionId: nonEmptyTextSchema,
  observation: nonEmptyTextSchema.max(QUALITY_MAX_OBSERVATION_LENGTH),
  status: z.enum(["passed", "failed", "inconclusive"]),
});
export type ManualQualityEvidenceInput = z.infer<typeof manualQualityEvidenceSchema>;
