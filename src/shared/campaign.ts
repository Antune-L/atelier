import { z } from "zod";

export const CAMPAIGN_BRANCH_PREFIX = "campaign/";
export const CAMPAIGN_MAX_CARDS = 50;
export const CAMPAIGN_MAX_CRITERIA = 100;
export const CAMPAIGN_MAX_SAME_DEFECT_REPAIRS = 2;
export const CAMPAIGN_REQUIRED_SKILLS = ["simplifier", "argus-review"] as const;
export const CAMPAIGN_EVENTS_PAGE_SIZE = 200;

export const CAMPAIGN_STATUSES = [
  "planning",
  "queued",
  "running",
  "pausing",
  "paused",
  "quota_paused",
  "finalizing",
  "awaiting_report",
  "finished",
  "cancelled",
  "unknown",
] as const;
export type CampaignStatus = (typeof CAMPAIGN_STATUSES)[number];
export const TERMINAL_CAMPAIGN_STATUSES: readonly CampaignStatus[] = ["finished", "cancelled"];
export const EXECUTING_CAMPAIGN_STATUSES: readonly CampaignStatus[] = ["running", "pausing", "paused", "quota_paused", "finalizing", "awaiting_report", "unknown"];

export const CAMPAIGN_CARD_STATES = [
  "pending",
  "waiting_prerequisites",
  "running",
  "merging",
  "merged",
  "blocked",
  "suspended",
  "stopped",
] as const;
export type CampaignCardState = (typeof CAMPAIGN_CARD_STATES)[number];

export const CAMPAIGN_VERDICTS = ["unknown", "ready", "partial", "blocked"] as const;
export type CampaignVerdict = (typeof CAMPAIGN_VERDICTS)[number];

export const CAMPAIGN_OPERATION_STATUSES = ["intent", "done", "failed", "unknown"] as const;
export type CampaignOperationStatus = (typeof CAMPAIGN_OPERATION_STATUSES)[number];

const idSchema = z.string().trim().min(1).max(64).regex(/^[A-Za-z0-9][A-Za-z0-9_.-]*$/, "Use letters, digits, '.', '_' or '-'");
const textSchema = z.string().trim().min(1).max(4000);
const isoDateSchema = z.string().datetime({ offset: true });

export const campaignCriterionSchema = z.object({
  id: idSchema,
  data: textSchema,
  role: textSchema,
  actions: textSchema,
  observableResult: textSchema,
  proofMethod: textSchema,
});
export type CampaignCriterion = z.infer<typeof campaignCriterionSchema>;

const looseCriterionSchema = z.object({
  id: z.string().optional(),
  data: z.string().optional(),
  role: z.string().optional(),
  actions: z.string().optional(),
  observableResult: z.string().optional(),
  proofMethod: z.string().optional(),
}).passthrough();

export const campaignAttachmentSchema = z.object({
  id: idSchema,
  path: z.string().trim().min(1).max(1024),
  sha256: z.string().regex(/^[a-f0-9]{64}$/),
  rank: z.number().int().positive(),
  label: z.string().trim().max(200).optional(),
});
export type CampaignAttachment = z.infer<typeof campaignAttachmentSchema>;

export const campaignQuestionSchema = z.object({
  id: idSchema,
  text: textSchema,
  blocking: z.boolean(),
  cardIds: z.array(idSchema).default([]),
  recommended: z.string().trim().max(2000).nullable().default(null),
  answer: z.string().trim().max(4000).nullable().default(null),
});
export type CampaignQuestion = z.infer<typeof campaignQuestionSchema>;

export const campaignAssumptionSchema = z.object({
  id: idSchema,
  text: textSchema,
  accepted: z.boolean(),
});
export type CampaignAssumption = z.infer<typeof campaignAssumptionSchema>;

export const campaignCardPlanSchema = z.object({
  id: idSchema,
  title: z.string().trim().min(1).max(200),
  description: textSchema,
  dependsOn: z.array(idSchema).max(CAMPAIGN_MAX_CARDS).default([]),
  budgetTokens: z.number().int().positive(),
  criteria: z.array(looseCriterionSchema).max(CAMPAIGN_MAX_CRITERIA).default([]),
  provider: z.enum(["claude", "codex"]).optional(),
  deliveryMode: z.string().optional(),
  targetBranch: z.string().optional(),
});
export type CampaignCardPlan = z.infer<typeof campaignCardPlanSchema>;

export const campaignBudgetSchema = z.object({
  totalTokens: z.number().int().positive(),
  finalReserveTokens: z.number().int().nonnegative(),
  maxSameDefectRepairs: z.number().int().min(0).max(CAMPAIGN_MAX_SAME_DEFECT_REPAIRS).default(CAMPAIGN_MAX_SAME_DEFECT_REPAIRS),
});
export type CampaignBudget = z.infer<typeof campaignBudgetSchema>;

export const campaignScheduleSchema = z.object({
  deadlineAt: isoDateSchema,
  reportAt: isoDateSchema,
  reviewUntil: isoDateSchema,
});
export type CampaignSchedule = z.infer<typeof campaignScheduleSchema>;

export const campaignQuotaPolicySchema = z.object({
  autoResume: z.boolean().default(true),
  fallbackProvider: z.enum(["claude", "codex"]).nullable().default(null),
});
export type CampaignQuotaPolicy = z.infer<typeof campaignQuotaPolicySchema>;

export const CAMPAIGN_PARTIAL_DELIVERY = ["draft_pr", "report_only"] as const;
export type CampaignPartialDelivery = (typeof CAMPAIGN_PARTIAL_DELIVERY)[number];

export const campaignPlanSchema = z.object({
  project: z.string().trim().min(1),
  title: z.string().trim().min(1).max(200),
  summary: z.string().trim().max(4000).default(""),
  motherBranch: z.string().trim().min(1).max(200).optional(),
  cards: z.array(campaignCardPlanSchema).min(1).max(CAMPAIGN_MAX_CARDS),
  globalCriteria: z.array(looseCriterionSchema).max(CAMPAIGN_MAX_CRITERIA).default([]),
  attachments: z.array(campaignAttachmentSchema).max(100).default([]),
  assumptions: z.array(campaignAssumptionSchema).max(100).default([]),
  questions: z.array(campaignQuestionSchema).max(100).default([]),
  exclusions: z.array(z.string().trim().min(1).max(2000)).max(100).default([]),
  budget: campaignBudgetSchema,
  schedule: campaignScheduleSchema,
  quotaPolicy: campaignQuotaPolicySchema.default({ autoResume: true, fallbackProvider: null }),
  partialDelivery: z.enum(CAMPAIGN_PARTIAL_DELIVERY).default("draft_pr"),
  externalEffects: z.array(z.string().trim().min(1).max(200)).max(50).default([]),
  ciAbsenceAccepted: z.boolean().default(false),
  versionReason: z.string().trim().max(2000).default(""),
});
export type CampaignPlanInput = z.input<typeof campaignPlanSchema>;
export type CampaignPlan = z.infer<typeof campaignPlanSchema>;

export const campaignSkillFingerprintSchema = z.object({
  name: z.string().min(1),
  sha256: z.string().nullable(),
  path: z.string().nullable(),
  source: z.enum(["installed", "internal"]),
});
export type CampaignSkillFingerprint = z.infer<typeof campaignSkillFingerprintSchema>;

export const campaignPlanIssueSchema = z.object({ code: z.string(), message: z.string(), path: z.string().optional() });
export type CampaignPlanIssue = z.infer<typeof campaignPlanIssueSchema>;

export function campaignDescendants(cards: readonly Pick<CampaignCardPlan, "id" | "dependsOn">[], roots: Iterable<string>): Set<string> {
  const result = new Set<string>();
  const queue = [...roots];
  while (queue.length > 0) {
    const current = queue.shift();
    if (current === undefined) break;
    for (const card of cards) {
      if (card.dependsOn.includes(current) && !result.has(card.id)) {
        result.add(card.id);
        queue.push(card.id);
      }
    }
  }
  return result;
}

function findCycle(cards: readonly Pick<CampaignCardPlan, "id" | "dependsOn">[]): string[] | null {
  const byId = new Map(cards.map((card) => [card.id, card]));
  const state = new Map<string, "visiting" | "done">();
  const stack: string[] = [];
  const visit = (id: string): string[] | null => {
    const mark = state.get(id);
    if (mark === "done") return null;
    if (mark === "visiting") return [...stack.slice(stack.indexOf(id)), id];
    state.set(id, "visiting");
    stack.push(id);
    for (const dependency of byId.get(id)?.dependsOn ?? []) {
      if (!byId.has(dependency)) continue;
      const cycle = visit(dependency);
      if (cycle) return cycle;
    }
    stack.pop();
    state.set(id, "done");
    return null;
  };
  for (const card of cards) {
    const cycle = visit(card.id);
    if (cycle) return cycle;
  }
  return null;
}

const CRITERION_FIELDS = ["id", "data", "role", "actions", "observableResult", "proofMethod"] as const;

function criterionIssues(criteria: readonly z.infer<typeof looseCriterionSchema>[], path: string): CampaignPlanIssue[] {
  const issues: CampaignPlanIssue[] = [];
  const seen = new Set<string>();
  criteria.forEach((criterion, index) => {
    const missing = CRITERION_FIELDS.filter((field) => (criterion[field] ?? "").trim() === "");
    if (missing.length > 0) {
      issues.push({ code: "incomplete_criterion", path: `${path}[${index}]`, message: `Criterion ${criterion.id ?? `#${index + 1}`} is missing: ${missing.join(", ")}.` });
    }
    const parsed = campaignCriterionSchema.safeParse(criterion);
    if (missing.length === 0 && !parsed.success) {
      issues.push({ code: "invalid_criterion", path: `${path}[${index}]`, message: `Criterion ${criterion.id ?? `#${index + 1}`} is invalid: ${parsed.error.issues[0]?.message ?? "unknown error"}.` });
    }
    const id = criterion.id?.trim();
    if (id && seen.has(id)) issues.push({ code: "duplicate_criterion", path: `${path}[${index}]`, message: `Criterion id ${id} is used twice.` });
    if (id) seen.add(id);
  });
  return issues;
}

/** Structural checks that make a submitted plan unacceptable (FR1). */
export function validateCampaignPlan(plan: CampaignPlan, baseBranch: string): CampaignPlanIssue[] {
  const issues: CampaignPlanIssue[] = [];
  const ids = new Set<string>();
  for (const card of plan.cards) {
    if (ids.has(card.id)) issues.push({ code: "duplicate_card", path: `cards.${card.id}`, message: `Card id ${card.id} is used twice.` });
    ids.add(card.id);
  }
  for (const card of plan.cards) {
    for (const dependency of card.dependsOn) {
      if (!ids.has(dependency)) issues.push({ code: "unknown_prerequisite", path: `cards.${card.id}.dependsOn`, message: `Card ${card.id} depends on unknown card ${dependency}.` });
      if (dependency === card.id) issues.push({ code: "cycle", path: `cards.${card.id}.dependsOn`, message: `Card ${card.id} depends on itself.` });
    }
    if (card.criteria.length === 0) issues.push({ code: "missing_criteria", path: `cards.${card.id}.criteria`, message: `Card ${card.id} has no verifiable criterion.` });
    issues.push(...criterionIssues(card.criteria, `cards.${card.id}.criteria`));
    if (card.deliveryMode !== undefined && card.deliveryMode !== "pr_only") {
      issues.push({ code: "forbidden_delivery", path: `cards.${card.id}.deliveryMode`, message: `Card ${card.id} requests delivery "${card.deliveryMode}"; campaign cards only merge into the mother branch.` });
    }
    if (card.targetBranch !== undefined && card.targetBranch.trim() === baseBranch) {
      issues.push({ code: "forbidden_target", path: `cards.${card.id}.targetBranch`, message: `Card ${card.id} targets ${baseBranch}; campaign cards may only target the mother branch.` });
    }
  }
  const cycle = findCycle(plan.cards);
  if (cycle && !issues.some((issue) => issue.code === "cycle")) {
    issues.push({ code: "cycle", path: "cards", message: `Prerequisite cycle: ${cycle.join(" -> ")}.` });
  }
  if (plan.globalCriteria.length === 0) issues.push({ code: "missing_criteria", path: "globalCriteria", message: "The plan has no global criterion." });
  issues.push(...criterionIssues(plan.globalCriteria, "globalCriteria"));
  for (const question of plan.questions) {
    const unknown = question.cardIds.filter((id) => !ids.has(id));
    if (unknown.length > 0) issues.push({ code: "unknown_card", path: `questions.${question.id}`, message: `Question ${question.id} references unknown cards: ${unknown.join(", ")}.` });
  }
  const cardBudget = plan.cards.reduce((sum, card) => sum + card.budgetTokens, 0);
  if (plan.budget.finalReserveTokens >= plan.budget.totalTokens) {
    issues.push({ code: "invalid_budget", path: "budget", message: "The final reserve must be lower than the total envelope." });
  }
  if (cardBudget > plan.budget.totalTokens - plan.budget.finalReserveTokens) {
    issues.push({ code: "invalid_budget", path: "budget", message: `Card budgets (${cardBudget}) exceed the envelope minus the final reserve (${plan.budget.totalTokens - plan.budget.finalReserveTokens}).` });
  }
  const deadline = Date.parse(plan.schedule.deadlineAt);
  const report = Date.parse(plan.schedule.reportAt);
  const review = Date.parse(plan.schedule.reviewUntil);
  if (!(deadline <= report && report <= review)) {
    issues.push({ code: "invalid_schedule", path: "schedule", message: "Expected deadlineAt <= reportAt <= reviewUntil." });
  }
  if (plan.motherBranch !== undefined && (plan.motherBranch === baseBranch || !isSafeBranchName(plan.motherBranch))) {
    issues.push({ code: "invalid_mother_branch", path: "motherBranch", message: `Mother branch "${plan.motherBranch}" is not allowed.` });
  }
  const ranks = plan.attachments.map((attachment) => attachment.rank);
  if (new Set(ranks).size !== ranks.length) issues.push({ code: "invalid_attachments", path: "attachments", message: "Attachment ranks must be unique." });
  return issues;
}

/** Reasons that keep a structurally valid plan from being approved (FR1, FR2). */
export function campaignApprovalBlockers(plan: CampaignPlan): CampaignPlanIssue[] {
  const blockers: CampaignPlanIssue[] = [];
  for (const question of plan.questions) {
    if (question.blocking && (question.answer ?? "").trim() === "") {
      blockers.push({ code: "unanswered_question", path: `questions.${question.id}`, message: `Blocking question ${question.id} has no answer.` });
    }
  }
  for (const assumption of plan.assumptions) {
    if (!assumption.accepted) blockers.push({ code: "unaccepted_assumption", path: `assumptions.${assumption.id}`, message: `Assumption ${assumption.id} is not explicitly accepted.` });
  }
  return blockers;
}

const SAFE_BRANCH = /^(?!.*\.\.)(?!.*\/\/)(?!\/)(?!.*\/$)(?!.*\.lock$)[A-Za-z0-9._/-]+$/;

export function isSafeBranchName(name: string): boolean {
  return SAFE_BRANCH.test(name) && !name.startsWith("-");
}

export function campaignMotherBranch(campaignId: string, title: string, requested: string | undefined): string {
  if (requested !== undefined) return requested;
  const slug = title.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40);
  return `${CAMPAIGN_BRANCH_PREFIX}${campaignId}${slug ? `-${slug}` : ""}`;
}

/** Cards whose content differs between two plan versions, plus their descendants (FR1). */
export function changedCampaignCards(previous: CampaignPlan, next: CampaignPlan): Set<string> {
  const before = new Map(previous.cards.map((card) => [card.id, JSON.stringify(card)]));
  const changed = new Set<string>();
  for (const card of next.cards) {
    if (before.get(card.id) !== JSON.stringify(card)) changed.add(card.id);
  }
  for (const card of previous.cards) {
    if (!next.cards.some((candidate) => candidate.id === card.id)) changed.add(card.id);
  }
  const globalChanged = JSON.stringify(previous.globalCriteria) !== JSON.stringify(next.globalCriteria);
  const touched = new Set([...changed, ...campaignDescendants(next.cards, changed)]);
  if (globalChanged) touched.add("__global__");
  return touched;
}

const timestampSchema = z.number().int().nonnegative();

export const campaignDecisionSchema = z.object({
  cardId: z.string().nullable(),
  decision: z.string().min(1),
  rule: z.string().min(1),
  at: timestampSchema,
});
export type CampaignDecision = z.infer<typeof campaignDecisionSchema>;

export const campaignPendingQuestionSchema = z.object({
  cardId: z.string().nullable(),
  question: z.string().min(1),
  cause: z.string().min(1),
  at: timestampSchema,
});
export type CampaignPendingQuestion = z.infer<typeof campaignPendingQuestionSchema>;

export const campaignQuotaPauseSchema = z.object({
  provider: z.enum(["claude", "codex"]),
  since: timestampSchema,
  estimatedResumeAt: timestampSchema.nullable(),
  attempts: z.number().int().nonnegative(),
  nextAttemptAt: timestampSchema.nullable(),
});
export type CampaignQuotaPause = z.infer<typeof campaignQuotaPauseSchema>;

export const campaignFinalizationSchema = z.object({
  startedAt: timestampSchema,
  reason: z.enum(["all_merged", "deadline", "budget", "no_progress"]),
  frozenRevision: z.string().nullable(),
  targetBranch: z.string().min(1),
  prUrl: z.string().nullable(),
  prDraft: z.boolean().nullable(),
  previewUrl: z.string().nullable(),
  previewId: z.string().nullable(),
  previewKeepUntil: timestampSchema.nullable(),
  previewCleanup: z.enum(["pending", "done", "failed"]).nullable(),
  previewCleanupError: z.string().nullable(),
  criteria: z.array(z.object({
    id: z.string().min(1),
    status: z.enum(["passed", "failed", "inconclusive", "missing"]),
    evidence: z.string().nullable(),
    revision: z.string().nullable(),
  })),
  reserveUsedTokens: z.number().int().nonnegative(),
});
export type CampaignFinalization = z.infer<typeof campaignFinalizationSchema>;

export type CampaignCriterionResult = CampaignFinalization["criteria"][number];

export function missingCriterionResult(id: string): CampaignCriterionResult {
  return { id, status: "missing", evidence: null, revision: null };
}

export function missingGlobalCriteria(plan: Pick<CampaignPlan, "globalCriteria">): CampaignCriterionResult[] {
  return plan.globalCriteria.flatMap((criterion) => (criterion.id === undefined ? [] : [missingCriterionResult(criterion.id)]));
}

export const campaignExtensionSchema = z.object({
  deadlineAt: isoDateSchema,
  additionalTokens: z.number().int().positive(),
  at: timestampSchema,
});

export const CAMPAIGN_READINESS_ITEMS = [
  "repository",
  "base_protection",
  "mother_protection",
  "ci",
  "preview_recipe",
  "preview_capacity",
  "attachments",
  "quota",
  "autonomous_pilot",
  "base_drift",
  "skill:simplifier",
  "skill:argus-review",
] as const;
export type CampaignReadinessItemId = (typeof CAMPAIGN_READINESS_ITEMS)[number];

export const campaignSkillInstallSourceSchema = z.discriminatedUnion("source", [
  z.object({ source: z.literal("paired_machine") }),
  z.object({ source: z.literal("skillzer"), commit: z.string(), available: z.boolean() }),
]);

export const campaignReadinessItemSchema = z.object({
  id: z.enum(CAMPAIGN_READINESS_ITEMS),
  status: z.enum(["ok", "warning", "blocked"]),
  cause: z.string().nullable(),
  detail: z.record(z.string(), z.unknown()).default({}),
  action: z.discriminatedUnion("type", [
    z.object({ type: z.literal("install_skill"), skill: z.string(), sources: z.array(campaignSkillInstallSourceSchema) }),
    z.object({ type: z.literal("accept_ci_absence") }),
  ]).nullable().default(null),
});
export type CampaignReadinessItem = z.infer<typeof campaignReadinessItemSchema>;

export const campaignReadinessSchema = z.object({
  checkedAt: timestampSchema,
  host: z.enum(["vps", "mac"]),
  version: z.number().int().positive(),
  ready: z.boolean(),
  items: z.array(campaignReadinessItemSchema),
});
export type CampaignReadiness = z.infer<typeof campaignReadinessSchema>;

export const campaignRuntimeSchema = z.object({
  statusReason: z.string().nullable().default(null),
  previousStatus: z.enum(CAMPAIGN_STATUSES).nullable().default(null),
  statusBeforeUnknown: z.enum(CAMPAIGN_STATUSES).nullable().default(null),
  pauseRequestedAt: timestampSchema.nullable().default(null),
  quotaPause: campaignQuotaPauseSchema.nullable().default(null),
  quotaPausedMs: z.number().int().nonnegative().default(0),
  quotaRefusals: z.number().int().nonnegative().default(0),
  lastQuotaResumeAt: timestampSchema.nullable().default(null),
  finalization: campaignFinalizationSchema.nullable().default(null),
  decisions: z.array(campaignDecisionSchema).default([]),
  pendingQuestions: z.array(campaignPendingQuestionSchema).default([]),
  extensions: z.array(campaignExtensionSchema).default([]),
  sessionsStarted: z.number().int().nonnegative().default(0),
  reconciledAt: timestampSchema.nullable().default(null),
  reconciliationError: z.string().nullable().default(null),
  startedAt: timestampSchema.nullable().default(null),
  endedAt: timestampSchema.nullable().default(null),
  reportSentAt: timestampSchema.nullable().default(null),
  readiness: campaignReadinessSchema.nullable().default(null),
  approvedBaseRevision: z.string().nullable().default(null),
});
export type CampaignRuntime = z.infer<typeof campaignRuntimeSchema>;

export const campaignRepairSchema = z.object({
  fingerprint: z.string().min(1),
  count: z.number().int().nonnegative(),
});
export type CampaignRepair = z.infer<typeof campaignRepairSchema>;

export interface Campaign {
  id: string;
  project: string;
  title: string;
  status: CampaignStatus;
  currentVersion: number;
  approvedVersion: number | null;
  approvedAt: number | null;
  motherBranch: string | null;
  baseBranch: string | null;
  finalTicketId: string | null;
  runtime: CampaignRuntime;
  report: CampaignReport | null;
  createdAt: number;
  updatedAt: number;
}

export interface CampaignVersion {
  campaignId: string;
  version: number;
  plan: CampaignPlan;
  reason: string;
  skills: CampaignSkillFingerprint[] | null;
  createdAt: number;
}

export interface CampaignCard {
  campaignId: string;
  cardId: string;
  ticketId: string | null;
  state: CampaignCardState;
  planVersion: number;
  prUrl: string | null;
  mergeSha: string | null;
  tokensUsed: number;
  repairs: CampaignRepair[];
  blockedReason: string | null;
  updatedAt: number;
}

export interface CampaignOperation {
  id: string;
  campaignId: string;
  kind: string;
  status: CampaignOperationStatus;
  payload: unknown;
  result: unknown;
  createdAt: number;
  updatedAt: number;
}

export interface CampaignEvent {
  seq: number;
  campaignId: string;
  type: string;
  payload: unknown;
  createdAt: number;
}

export const campaignReportSchema = z.object({
  verdict: z.enum(CAMPAIGN_VERDICTS),
  producedAt: timestampSchema,
  activity: z.object({
    status: z.enum(CAMPAIGN_STATUSES),
    activeSessions: z.number().int().nonnegative(),
    mergesInFlight: z.number().int().nonnegative(),
    reconciledAt: timestampSchema.nullable(),
    endedAt: timestampSchema.nullable(),
  }),
  finalPr: z.object({ url: z.string().nullable(), draft: z.boolean().nullable() }),
  preview: z.object({ url: z.string().nullable(), keepUntil: timestampSchema.nullable(), cleanup: z.string().nullable(), cleanupError: z.string().nullable() }),
  criteria: z.object({ validated: z.number().int(), total: z.number().int(), items: campaignFinalizationSchema.shape.criteria }),
  cards: z.object({
    merged: z.number().int(),
    total: z.number().int(),
    items: z.array(z.object({ cardId: z.string(), title: z.string(), state: z.enum(CAMPAIGN_CARD_STATES), prUrl: z.string().nullable(), blockedReason: z.string().nullable(), tokensUsed: z.number().int(), budgetTokens: z.number().int() })),
  }),
  decisions: z.array(campaignDecisionSchema),
  pendingQuestions: z.array(campaignPendingQuestionSchema),
  consumption: z.object({
    tokensUsed: z.number().int(),
    envelopeTokens: z.number().int(),
    reserveTokens: z.number().int(),
    reserveUsedTokens: z.number().int(),
    sessions: z.number().int(),
    quotaPausedMs: z.number().int(),
    skills: z.array(campaignSkillFingerprintSchema),
  }),
});
export type CampaignReport = z.infer<typeof campaignReportSchema>;

/** Approved token envelope plus every explicit extension (FR12). */
export function campaignEnvelopeTokens(plan: CampaignPlan, runtime: Pick<CampaignRuntime, "extensions">): number {
  return plan.budget.totalTokens + runtime.extensions.reduce((sum, extension) => sum + extension.additionalTokens, 0);
}

export interface EffectiveSchedule {
  deadlineAt: number;
  reportAt: number;
  reviewUntil: number;
}

/** Approved times, shifted by the latest explicit extension given when resuming after the deadline (FR12). */
export function effectiveSchedule(plan: CampaignPlan, runtime: Pick<CampaignRuntime, "extensions">): EffectiveSchedule {
  const deadlineAt = Date.parse(plan.schedule.deadlineAt);
  const reportAt = Date.parse(plan.schedule.reportAt);
  const reviewUntil = Date.parse(plan.schedule.reviewUntil);
  const extension = runtime.extensions.at(-1);
  if (extension === undefined) return { deadlineAt, reportAt, reviewUntil };
  const shift = Math.max(0, Date.parse(extension.deadlineAt) - deadlineAt);
  return { deadlineAt: deadlineAt + shift, reportAt: reportAt + shift, reviewUntil: reviewUntil + shift };
}
