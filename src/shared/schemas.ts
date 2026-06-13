import { z } from "zod";

import { AGENT_EFFORTS, AGENT_MODELS, COLUMNS, COMMENT_AUTHORS, IMPLEMENTERS, KINDS, REVIEW_DEPTHS, STAGES } from "./constants.ts";

// Project keys are validated server-side against the loaded config (src/server/config.ts);
// the shared schema only enforces a non-empty string so it stays runtime-agnostic.
const projectKeySchema = z.string().min(1);

// A git branch name accepted as a base-branch override. Restricted to safe ref
// characters (no leading dash, no shell metacharacters) because the value is
// interpolated into the `gh pr create --base <branch>` command the agent runs.
const BRANCH_NAME_RE = /^[A-Za-z0-9._/][A-Za-z0-9._/-]*$/;
const baseBranchSchema = z.string().regex(BRANCH_NAME_RE, "nom de branche invalide");
export const columnSchema = z.enum(COLUMNS);
export const stageSchema = z.enum(STAGES);
export const commentAuthorSchema = z.enum(COMMENT_AUTHORS);
export const agentModelSchema = z.enum(AGENT_MODELS);
export const agentEffortSchema = z.enum(AGENT_EFFORTS);
export const implementerSchema = z.enum(IMPLEMENTERS);
export const kindSchema = z.enum(KINDS);
export const reviewDepthSchema = z.enum(REVIEW_DEPTHS);

// ---- Implementability triage ("Analyser") ----

export const TRIAGE_STATUSES = ["none", "running", "done", "failed"] as const;
export const triageStatusSchema = z.enum(TRIAGE_STATUSES);
export type TriageStatus = z.infer<typeof triageStatusSchema>;

export const TRIAGE_VERDICTS = ["implementable", "needs_info", "needs_rework"] as const;
export const triageVerdictSchema = z.enum(TRIAGE_VERDICTS);
export type TriageVerdict = z.infer<typeof triageVerdictSchema>;

/** Shape the triage agent must emit (and we re-parse on both server and client). */
export const triageResultSchema = z.object({
  verdict: triageVerdictSchema,
  summary: z.string(),
  reasons: z.array(z.string()),
  questions: z.array(z.string()),
  files: z.array(z.string()),
});
export type TriageResult = z.infer<typeof triageResultSchema>;

export const TRIAGE_VERDICT_LABELS: Record<TriageVerdict, string> = {
  implementable: "Implémentable",
  needs_info: "Questions à répondre",
  needs_rework: "À retravailler",
};

export const ticketSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  project: projectKeySchema,
  /** What the ticket delivers: a feature implementation or an autonomous PR review. */
  kind: kindSchema,
  /** Argus depth for review tickets (null for feature tickets). */
  reviewDepth: reviewDepthSchema.nullable(),
  /** Number of the reviewed PR (review tickets only). */
  prNumber: z.number().int().nullable(),
  /** Head branch of the reviewed PR, passed to argus (review tickets only). */
  prHeadBranch: z.string().nullable(),
  /** Whether the review posts its findings inline on GitHub (argus --post). */
  postComments: z.boolean(),
  prdEnabled: z.boolean(),
  /** Open the PR as a draft (default true). Forced off when autoMerge is on. */
  prDraft: z.boolean(),
  /** Auto-merge the PR into the base branch once the done() gate passes. */
  autoMerge: z.boolean(),
  /** Branch the worktree forks from and the PR targets (null = project default). */
  baseBranch: z.string().nullable(),
  prdMarkdown: z.string().nullable(),
  column: columnSchema,
  stage: stageSchema.nullable(),
  /** Implementation agent overrides (null = fall back to the server config defaults). */
  model: agentModelSchema.nullable(),
  effort: agentEffortSchema.nullable(),
  implementer: implementerSchema,
  reviewRounds: z.number().int(),
  sessionId: z.string().nullable(),
  slotId: z.number().int().nullable(),
  branch: z.string().nullable(),
  prUrl: z.string().nullable(),
  error: z.string().nullable(),
  archived: z.boolean(),
  watchdogFlagged: z.boolean(),
  pendingQuestions: z.number().int(),
  triageStatus: triageStatusSchema,
  triageVerdict: triageVerdictSchema.nullable(),
  triageReport: z.string().nullable(),
  /** Epoch ms when the ticket reached a terminal state (done/failed/stalled/interrupted/abandoned); null otherwise. */
  finishedAt: z.number().int().nullable(),
  createdAt: z.number().int(),
  updatedAt: z.number().int(),
});
export type Ticket = z.infer<typeof ticketSchema>;

export const commentSchema = z.object({
  id: z.string(),
  ticketId: z.string(),
  author: commentAuthorSchema,
  body: z.string(),
  questionId: z.string().nullable(),
  answered: z.boolean(),
  createdAt: z.number().int(),
});
export type Comment = z.infer<typeof commentSchema>;

export const slotSchema = z.object({
  id: z.number().int(),
  ticketId: z.string().nullable(),
  repoPath: z.string().nullable(),
  tmuxSession: z.string().nullable(),
  status: z.enum(["free", "busy", "stalled", "interrupted", "failed"]),
});
export type Slot = z.infer<typeof slotSchema>;

export const projectInfoSchema = z.object({
  key: projectKeySchema,
  label: z.string(),
  baseBranch: z.string(),
  /** Default state of the "auto-merge PR" toggle for new tickets in this project. */
  defaultAutoMerge: z.boolean(),
});
export type ProjectInfo = z.infer<typeof projectInfoSchema>;

// ---- API input schemas ----

export const createTicketSchema = z.object({
  title: z.string().min(1),
  description: z.string().default(""),
  project: projectKeySchema,
  prdEnabled: z.boolean().default(false),
  prDraft: z.boolean().default(true),
  autoMerge: z.boolean().default(false),
  // Branch the worktree forks from and the PR targets (null = project default).
  baseBranch: baseBranchSchema.nullable().default(null),
  // Implementation agent knobs picked at creation (null = fall back to server config).
  model: agentModelSchema.nullable().default(null),
  effort: agentEffortSchema.nullable().default(null),
  implementer: implementerSchema.default("claude"),
});
export type CreateTicketInput = z.infer<typeof createTicketSchema>;

export const updateTicketSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  prdEnabled: z.boolean().optional(),
  prDraft: z.boolean().optional(),
  autoMerge: z.boolean().optional(),
  baseBranch: baseBranchSchema.nullable().optional(),
  model: agentModelSchema.nullable().optional(),
  effort: agentEffortSchema.nullable().optional(),
  implementer: implementerSchema.optional(),
});
export type UpdateTicketInput = z.infer<typeof updateTicketSchema>;

export const moveTicketSchema = z.object({
  column: columnSchema,
  confirmed: z.boolean().default(false),
});
export type MoveTicketInput = z.infer<typeof moveTicketSchema>;

/** One open GitHub PR surfaced by `gh pr list` (and the unit the user picks to review). */
export const openPrSchema = z.object({
  number: z.number().int(),
  title: z.string(),
  url: z.string().url(),
  headBranch: z.string(),
  isDraft: z.boolean(),
  /** "", "REVIEW_REQUIRED", "APPROVED", "CHANGES_REQUESTED" — drives the "needs attention" highlight. */
  reviewDecision: z.string(),
  updatedAt: z.string(),
  author: z.string(),
  additions: z.number().int(),
  deletions: z.number().int(),
});
export type OpenPr = z.infer<typeof openPrSchema>;

export const createReviewSchema = z.object({
  project: projectKeySchema,
  depth: reviewDepthSchema.default("full"),
  postComments: z.boolean().default(true),
  prs: z.array(openPrSchema).min(1),
});
export type CreateReviewInput = z.infer<typeof createReviewSchema>;

export const createCommentSchema = z.object({
  body: z.string().min(1),
  questionId: z.string().nullable().default(null),
});
export type CreateCommentInput = z.infer<typeof createCommentSchema>;

/** Optional note carried by PRD validation (compiled annotations the agent applies while implementing). */
export const validatePrdSchema = z.object({
  note: z.string().default(""),
});
export type ValidatePrdInput = z.infer<typeof validatePrdSchema>;

export const terminalOutputSchema = z.object({
  output: z.string(),
  /** Pre-output setup phase (worktree/install/spawn/waiting), or null once the agent streams. */
  phase: z.string().nullable(),
});
export type TerminalOutput = z.infer<typeof terminalOutputSchema>;

/** Live triage transcript (read-only feasibility analysis stream). */
export const triageOutputSchema = z.object({ output: z.string() });
export type TriageOutput = z.infer<typeof triageOutputSchema>;

export const uploadResultSchema = z.object({ path: z.string(), url: z.string() });
export type UploadResult = z.infer<typeof uploadResultSchema>;

/** Backend-provided client config: capability flags + orchestrator defaults (UI gating/labels). */
export const capabilitiesSchema = z.object({
  /** The Cursor headless CLI (Composer driver) is installed and authenticated. */
  composerAvailable: z.boolean(),
  /** Orchestrator model used when a ticket leaves it unset (raw config value, e.g. "opus"). */
  defaultModel: z.string(),
  /** Orchestrator reasoning effort used when a ticket leaves it unset (e.g. "xhigh"). */
  defaultEffort: z.string(),
});
export type Capabilities = z.infer<typeof capabilitiesSchema>;

// ---- WebSocket (backend → client) ----

export const wsClientEventSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("snapshot"), tickets: z.array(ticketSchema), slots: z.array(slotSchema) }),
  z.object({ type: z.literal("ticket"), ticket: ticketSchema }),
  z.object({ type: z.literal("ticket_removed"), ticketId: z.string() }),
  z.object({ type: z.literal("comment"), comment: commentSchema }),
  z.object({ type: z.literal("slots"), slots: z.array(slotSchema) }),
  z.object({ type: z.literal("notification"), title: z.string(), body: z.string() }),
]);
export type WsClientEvent = z.infer<typeof wsClientEventSchema>;

// ---- Worker channel: agent → backend (tool calls over WS) ----

export const workerToolNameSchema = z.enum([
  "update_stage",
  "ask_user",
  "submit_prd",
  "done",
  "fail",
]);
export type WorkerToolName = z.infer<typeof workerToolNameSchema>;

export const updateStageArgsSchema = z.object({
  stage: stageSchema,
});
export const askUserArgsSchema = z.object({
  question: z.string().min(1),
});
export const submitPrdArgsSchema = z.object({
  markdown: z.string().min(1),
});
export const doneArgsSchema = z.object({
  pr_url: z.string().url(),
});
export const failArgsSchema = z.object({
  reason: z.string().min(1),
  findings: z.string().default(""),
});

// ---- Worker channel: WS frames worker.ts ↔ backend ----

export const workerHelloSchema = z.object({
  type: z.literal("hello"),
  ticketId: z.string(),
  slotId: z.number().int(),
});

export const workerToolCallSchema = z.object({
  type: z.literal("tool_call"),
  id: z.string(),
  name: workerToolNameSchema,
  args: z.unknown(),
});

export const workerStopSchema = z.object({
  type: z.literal("stop"),
  sessionId: z.string().nullable().default(null),
});

export const workerInboundSchema = z.discriminatedUnion("type", [
  workerHelloSchema,
  workerToolCallSchema,
  workerStopSchema,
]);
export type WorkerInbound = z.infer<typeof workerInboundSchema>;

/** backend → worker.ts → injected as channel notification into the Claude session. */
export const channelEventSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("ticket"), payload: z.string() }),
  z.object({ type: z.literal("answer"), questionId: z.string(), answer: z.string() }),
  z.object({ type: z.literal("prd_validated"), note: z.string().default("") }),
  z.object({ type: z.literal("nudge"), message: z.string() }),
  z.object({ type: z.literal("user_comment"), body: z.string() }),
]);
export type ChannelEvent = z.infer<typeof channelEventSchema>;

/** backend → worker.ts: either a channel event, or a tool result for a pending tool_call. */
export const workerOutboundSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("event"), event: channelEventSchema }),
  z.object({ type: z.literal("tool_result"), id: z.string(), ok: z.boolean(), result: z.string() }),
]);
export type WorkerOutbound = z.infer<typeof workerOutboundSchema>;
