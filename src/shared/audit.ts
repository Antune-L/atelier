import { z } from "zod";

import { ORCHESTRATORS } from "./constants.ts";

export const AUDIT_CLASSES = ["security", "business_logic", "regression", "data_integrity", "availability", "contract", "cost", "privacy"] as const;
export type AuditClass = (typeof AUDIT_CLASSES)[number];

export const AUDIT_CLASS_LABELS: Record<AuditClass, string> = {
  security: "Sécurité",
  business_logic: "Logique métier",
  regression: "Régression",
  data_integrity: "Intégrité des données",
  availability: "Disponibilité",
  contract: "Contrat d'interface",
  cost: "Coût",
  privacy: "Données personnelles",
};

export const AUDIT_SEVERITIES = ["critical", "warning"] as const;
export type AuditSeverity = (typeof AUDIT_SEVERITIES)[number];

export const AUDIT_SEVERITY_LABELS: Record<AuditSeverity, string> = {
  critical: "CRITIQUE",
  warning: "AVERTISSEMENT",
};

export const AUDIT_LENSES = ["security", "logic", "regression", "integrity"] as const;
export type AuditLens = (typeof AUDIT_LENSES)[number];

export const AUDIT_LENS_LABELS: Record<AuditLens, string> = {
  security: "Sécurité & données personnelles",
  logic: "Logique métier",
  regression: "Régressions & contrats",
  integrity: "Intégrité, disponibilité & coût",
};

export const AUDIT_LENS_CLASSES: Record<AuditLens, readonly AuditClass[]> = {
  security: ["security", "privacy"],
  logic: ["business_logic"],
  regression: ["regression", "contract"],
  integrity: ["data_integrity", "availability", "cost"],
};

export const AUDIT_VERDICTS = ["confirmed", "refuted", "intentional", "unsourced"] as const;
export type AuditVerdict = (typeof AUDIT_VERDICTS)[number];

export const AUDIT_VERDICT_LABELS: Record<AuditVerdict, string> = {
  confirmed: "Confirmé",
  refuted: "Réfuté",
  intentional: "Voulu",
  unsourced: "Non sourcé",
};

export const AUDIT_REVIEW_STATES = ["confirmed", "contested", "rejected", "unverified"] as const;
export type AuditReviewState = (typeof AUDIT_REVIEW_STATES)[number];

export const AUDIT_DECISIONS = ["false_positive", "intended", "not_priority", "already_fixed"] as const;
export type AuditDecisionKind = (typeof AUDIT_DECISIONS)[number];

export const AUDIT_DECISION_LABELS: Record<AuditDecisionKind, string> = {
  false_positive: "Faux positif",
  intended: "Comportement voulu",
  not_priority: "Pas prioritaire",
  already_fixed: "Déjà corrigé",
};

export const AUDIT_CARD_MODES = ["manual", "auto_create", "auto_launch"] as const;
export type AuditCardMode = (typeof AUDIT_CARD_MODES)[number];

export const AUDIT_RUN_TRIGGERS = ["scheduled", "manual", "catch_up"] as const;
export type AuditRunTrigger = (typeof AUDIT_RUN_TRIGGERS)[number];

export const AUDIT_RUN_STATUSES = ["waiting", "running", "completed", "partial", "no_changes", "failed", "interrupted", "rewritten"] as const;
export type AuditRunStatus = (typeof AUDIT_RUN_STATUSES)[number];

export const AUDIT_ACTIVE_RUN_STATUSES: readonly AuditRunStatus[] = ["waiting", "running"];

export const AUDIT_RUN_PHASES = ["preparing", "analyzing", "checking", "verifying", "saving"] as const;
export type AuditRunPhase = (typeof AUDIT_RUN_PHASES)[number];

export const AUDIT_WAITING_REASONS = ["cards_running", "budget"] as const;
export type AuditWaitingReason = (typeof AUDIT_WAITING_REASONS)[number];

export const AUDIT_MAX_PARALLEL_SESSIONS = 3;
export const AUDIT_MAX_CHUNKS_PER_RUN = 8;
export const AUDIT_MAX_CHUNK_CHARS = 60_000;
export const AUDIT_MAX_UNIT_DIFF_CHARS = 10 * AUDIT_MAX_CHUNK_CHARS;
export const AUDIT_SECOND_VERIFIER_SESSIONS = 1;
export const AUDIT_SESSIONS_PER_CHUNK = AUDIT_LENSES.length + 1;
export const AUDIT_MIN_RUN_SESSIONS = AUDIT_SESSIONS_PER_CHUNK + AUDIT_SECOND_VERIFIER_SESSIONS;
export const AUDIT_CRITICAL_RECHECK_SESSIONS = 2;
export const AUDIT_DAILY_SESSION_LIMIT = 60;
export const AUDIT_SESSION_TIMEOUT_MS = 30 * 60_000;
export const AUDIT_SCHEDULER_TICK_MS = 5 * 60_000;
export const AUDIT_BOOTSTRAP_HOURS = 24;
export const AUDIT_OBSERVATION_DAYS = 7;
export const AUDIT_NOT_PRIORITY_MASK_DAYS = 30;
export const AUDIT_DEFAULT_AUTO_LAUNCH_MAX = 2;
export const AUDIT_MAX_AUTO_LAUNCH = 5;
export const AUDIT_RUNS_LIMIT = 50;
export const AUDIT_DEFAULT_DAILY_TIME = "07:00";
export const AUDIT_DEFAULT_TIME_ZONE = "Europe/Paris";
export const AUDIT_HOURS_PER_DAY = 24;
export const AUDIT_MIN_INTERVAL_HOURS = 6;
export const AUDIT_MAX_INTERVAL_HOURS = 14 * AUDIT_HOURS_PER_DAY;
export const AUDIT_DEFAULT_INTERVAL_HOURS = AUDIT_HOURS_PER_DAY;
export const AUDIT_MAX_EVIDENCE_CHARS = 1_200;
export const AUDIT_DAY_MS = 24 * 60 * 60_000;

const nonEmptyTextSchema = z.string().trim().min(1);
const timestampSchema = z.number().int().nonnegative();
const shaSchema = z.string().regex(/^[0-9a-f]{7,40}$/);
const gitBranchSchema = z.string().trim().regex(/^(?!-)(?!.*\.\.)(?!.*\/\/)(?!.*\.lock$)[A-Za-z0-9._/-]+$/, "Nom de branche invalide.");
const dailyTimeSchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);
const dateKeySchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const auditProviderSchema = z.enum(ORCHESTRATORS);
export type AuditProvider = z.infer<typeof auditProviderSchema>;

export const auditProjectSettingsSchema = z.object({
  enabled: z.boolean().default(false),
  branch: gitBranchSchema.nullable().default(null),
  dailyTime: dailyTimeSchema.default(AUDIT_DEFAULT_DAILY_TIME),
  timeZone: nonEmptyTextSchema.default(AUDIT_DEFAULT_TIME_ZONE),
  intervalHours: z.number().int().min(AUDIT_MIN_INTERVAL_HOURS).max(AUDIT_MAX_INTERVAL_HOURS).default(AUDIT_DEFAULT_INTERVAL_HOURS),
  anchorDate: dateKeySchema.nullable().default(null),
  skipWeekends: z.boolean().default(false),
  provider: auditProviderSchema.nullable().default(null),
  model: nonEmptyTextSchema.nullable().default(null),
  effort: nonEmptyTextSchema.nullable().default(null),
  includeWarnings: z.boolean().default(true),
  cardMode: z.enum(AUDIT_CARD_MODES).default("manual"),
  autoLaunchMax: z.number().int().min(1).max(AUDIT_MAX_AUTO_LAUNCH).default(AUDIT_DEFAULT_AUTO_LAUNCH_MAX),
});
export type AuditProjectSettings = z.infer<typeof auditProjectSettingsSchema>;

export const updateAuditProjectSettingsSchema = z.object({
  enabled: auditProjectSettingsSchema.shape.enabled.removeDefault().optional(),
  branch: auditProjectSettingsSchema.shape.branch.removeDefault().optional(),
  dailyTime: auditProjectSettingsSchema.shape.dailyTime.removeDefault().optional(),
  timeZone: auditProjectSettingsSchema.shape.timeZone.removeDefault().optional(),
  intervalHours: auditProjectSettingsSchema.shape.intervalHours.removeDefault().optional(),
  anchorDate: auditProjectSettingsSchema.shape.anchorDate.removeDefault().optional(),
  skipWeekends: auditProjectSettingsSchema.shape.skipWeekends.removeDefault().optional(),
  provider: auditProjectSettingsSchema.shape.provider.removeDefault().optional(),
  model: auditProjectSettingsSchema.shape.model.removeDefault().optional(),
  effort: auditProjectSettingsSchema.shape.effort.removeDefault().optional(),
  includeWarnings: auditProjectSettingsSchema.shape.includeWarnings.removeDefault().optional(),
  cardMode: auditProjectSettingsSchema.shape.cardMode.removeDefault().optional(),
  autoLaunchMax: auditProjectSettingsSchema.shape.autoLaunchMax.removeDefault().optional(),
}).strict();
export type UpdateAuditProjectSettingsInput = z.infer<typeof updateAuditProjectSettingsSchema>;

export const auditProjectStateSchema = z.object({
  project: nonEmptyTextSchema,
  lastSha: shaSchema.nullable(),
  lastBranch: nonEmptyTextSchema.nullable(),
  lastScheduledDate: dateKeySchema.nullable(),
  lastScheduledAt: timestampSchema.nullable(),
  enabledAt: timestampSchema.nullable(),
  observationUntil: timestampSchema.nullable(),
});
export type AuditProjectState = z.infer<typeof auditProjectStateSchema>;

export const auditProjectViewSchema = z.object({
  project: nonEmptyTextSchema,
  supported: z.boolean(),
  unsupportedReason: z.string().nullable(),
  settings: auditProjectSettingsSchema,
  state: auditProjectStateSchema,
  nextRunAt: timestampSchema.nullable(),
  pendingTriage: z.number().int().nonnegative(),
});
export type AuditProjectView = z.infer<typeof auditProjectViewSchema>;

export const auditAgentFindingSchema = z.object({
  class: z.enum(AUDIT_CLASSES),
  severity: z.enum(AUDIT_SEVERITIES),
  title: nonEmptyTextSchema,
  file: nonEmptyTextSchema,
  line: z.number().int().positive(),
  symbol: z.string(),
  scenario: nonEmptyTextSchema,
  expected: nonEmptyTextSchema,
  expectedSource: nonEmptyTextSchema,
  impact: nonEmptyTextSchema,
  evidence: nonEmptyTextSchema,
  introducedBy: nonEmptyTextSchema,
  suggestedFix: z.string().nullable(),
});
export type AuditAgentFinding = z.infer<typeof auditAgentFindingSchema>;

export const auditAnalysisOutputSchema = z.object({
  coverage: z.object({
    read: z.array(nonEmptyTextSchema),
    skipped: z.array(z.object({ path: nonEmptyTextSchema, reason: nonEmptyTextSchema })),
  }),
  findings: z.array(auditAgentFindingSchema),
});
export type AuditAnalysisOutput = z.infer<typeof auditAnalysisOutputSchema>;

export const auditVerificationOutputSchema = z.object({
  verdicts: z.array(z.object({
    id: nonEmptyTextSchema,
    verdict: z.enum(AUDIT_VERDICTS),
    severity: z.enum(AUDIT_SEVERITIES),
    reason: nonEmptyTextSchema,
  })),
});
export type AuditVerificationOutput = z.infer<typeof auditVerificationOutputSchema>;

export const auditVerdictRecordSchema = z.object({
  role: z.enum(["verifier", "second_verifier", "arbiter", "recheck"]),
  provider: auditProviderSchema,
  model: nonEmptyTextSchema,
  verdict: z.enum(AUDIT_VERDICTS),
  severity: z.enum(AUDIT_SEVERITIES),
  reason: nonEmptyTextSchema,
  revision: shaSchema,
  at: timestampSchema,
});
export type AuditVerdictRecord = z.infer<typeof auditVerdictRecordSchema>;

export const auditCitationCheckSchema = z.object({
  fileExists: z.boolean(),
  lineInRange: z.boolean(),
  excerptFound: z.boolean(),
});
export type AuditCitationCheck = z.infer<typeof auditCitationCheckSchema>;

export const auditDecisionSchema = z.object({
  kind: z.enum(AUDIT_DECISIONS),
  note: z.string().nullable(),
  decidedAt: timestampSchema,
  introducedBy: nonEmptyTextSchema,
  until: timestampSchema.nullable(),
});
export type AuditDecision = z.infer<typeof auditDecisionSchema>;

export const auditFindingSchema = auditAgentFindingSchema.extend({
  id: nonEmptyTextSchema,
  project: nonEmptyTextSchema,
  fingerprint: nonEmptyTextSchema,
  firstRunId: nonEmptyTextSchema,
  lastRunId: nonEmptyTextSchema,
  seenCount: z.number().int().positive(),
  lens: z.enum(AUDIT_LENSES),
  reviewState: z.enum(AUDIT_REVIEW_STATES),
  verdicts: z.array(auditVerdictRecordSchema),
  citation: auditCitationCheckSchema,
  decision: auditDecisionSchema.nullable(),
  ticketId: nonEmptyTextSchema.nullable(),
  autoCreated: z.boolean(),
  recheckRunning: z.boolean(),
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
});
export type AuditFinding = z.infer<typeof auditFindingSchema>;

export const auditRunProgressSchema = z.object({
  phase: z.enum(AUDIT_RUN_PHASES),
  done: z.number().int().nonnegative(),
  total: z.number().int().nonnegative(),
});
export type AuditRunProgress = z.infer<typeof auditRunProgressSchema>;

export const auditChunkCoverageSchema = z.object({
  index: z.number().int().nonnegative(),
  baseSha: shaSchema,
  headSha: shaSchema,
  commitCount: z.number().int().nonnegative(),
  status: z.enum(["complete", "partial", "failed"]),
  filesRead: z.number().int().nonnegative(),
  skipped: z.array(z.object({ path: nonEmptyTextSchema, reason: nonEmptyTextSchema })),
});
export type AuditChunkCoverage = z.infer<typeof auditChunkCoverageSchema>;

export const auditRunCountsSchema = z.object({
  critical: z.number().int().nonnegative(),
  warning: z.number().int().nonnegative(),
  contested: z.number().int().nonnegative(),
  rejected: z.number().int().nonnegative(),
  unverified: z.number().int().nonnegative(),
  masked: z.number().int().nonnegative(),
  deferred: z.number().int().nonnegative(),
  filteredWarnings: z.number().int().nonnegative().default(0),
});
export type AuditRunCounts = z.infer<typeof auditRunCountsSchema>;

export const auditRunSchema = z.object({
  id: nonEmptyTextSchema,
  project: nonEmptyTextSchema,
  trigger: z.enum(AUDIT_RUN_TRIGGERS),
  status: z.enum(AUDIT_RUN_STATUSES),
  branch: nonEmptyTextSchema,
  baseSha: shaSchema.nullable(),
  tipSha: shaSchema.nullable(),
  coveredSha: shaSchema.nullable(),
  commitCount: z.number().int().nonnegative(),
  deferredCommitCount: z.number().int().nonnegative(),
  provider: auditProviderSchema,
  model: nonEmptyTextSchema,
  effort: z.string().nullable(),
  analystSessions: z.number().int().nonnegative(),
  verifierSessions: z.number().int().nonnegative(),
  progress: auditRunProgressSchema.nullable(),
  coverage: z.array(auditChunkCoverageSchema),
  counts: auditRunCountsSchema,
  autoCreated: z.number().int().nonnegative(),
  autoLaunched: z.number().int().nonnegative(),
  observation: z.boolean(),
  simulated: z.boolean(),
  waitingReason: z.enum(AUDIT_WAITING_REASONS).nullable().default(null),
  costUsd: z.number().nonnegative().nullable(),
  error: z.string().nullable(),
  startedAt: timestampSchema,
  finishedAt: timestampSchema.nullable(),
});
export type AuditRun = z.infer<typeof auditRunSchema>;

export const auditRunDetailSchema = z.object({
  run: auditRunSchema,
  findings: z.array(auditFindingSchema),
});
export type AuditRunDetail = z.infer<typeof auditRunDetailSchema>;

export const auditDecisionInputSchema = z.object({
  kind: z.enum(AUDIT_DECISIONS),
  note: z.string().trim().max(500).nullable().default(null),
  abandonTodoCard: z.boolean().default(false),
}).strict();
export type AuditDecisionInput = z.infer<typeof auditDecisionInputSchema>;

export const auditCreateCardInputSchema = z.object({
  start: z.boolean().default(false),
  provider: auditProviderSchema.optional(),
}).strict();
export type AuditCreateCardInput = z.infer<typeof auditCreateCardInputSchema>;

export const auditRunNowInputSchema = z.object({}).strict();

export const auditSetStartInputSchema = z.object({
  sha: shaSchema,
}).strict();
export type AuditSetStartInput = z.infer<typeof auditSetStartInputSchema>;

export const auditTicketOriginSchema = z.object({
  ticketId: nonEmptyTextSchema,
  findingId: nonEmptyTextSchema,
  runId: nonEmptyTextSchema,
  project: nonEmptyTextSchema,
  runStartedAt: timestampSchema,
});
export type AuditTicketOrigin = z.infer<typeof auditTicketOriginSchema>;

export const auditOverviewSchema = z.object({
  projects: z.array(auditProjectViewSchema),
  runs: z.array(auditRunSchema),
  ticketOrigins: z.array(auditTicketOriginSchema),
  rechecking: z.array(nonEmptyTextSchema).default([]),
});
export type AuditOverview = z.infer<typeof auditOverviewSchema>;

export const EMPTY_AUDIT_OVERVIEW: AuditOverview = { projects: [], runs: [], ticketOrigins: [], rechecking: [] };

export const AUDIT_MARKER_PATTERN = /<!-- kanban-audit:([0-9a-f]+) -->/g;
const HTML_COMMENT_PATTERN = /<!--[\s\S]*?(?:-->|$)/g;

export function auditFindingMarker(fingerprint: string): string {
  return `<!-- kanban-audit:${fingerprint} -->`;
}

export function findAuditMarker(text: string): string | null {
  const matches = text.match(AUDIT_MARKER_PATTERN);
  return matches?.at(-1) ?? null;
}

export function stripHtmlComments(text: string): string {
  return text.replaceAll(HTML_COMMENT_PATTERN, "");
}
