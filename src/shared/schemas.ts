import { z } from "zod";

import { AGENT_EFFORTS, AGENT_MODELS, COLUMNS, COMMENT_AUTHORS, COMMIT_LANGUAGES, IMPLEMENTERS, IMPORT_MAX_ROWS, KINDS, REVIEW_DEPTHS, STAGES, TRIAGE_VERDICTS } from "./constants.ts";

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
export const commitLanguageSchema = z.enum(COMMIT_LANGUAGES);

// ---- Token usage (cost tracking) ----

/**
 * One model's token usage within a session: the four billable buckets Claude Code records in the
 * transcript's `message.usage`. Coerced defensively (.catch(0)) so a malformed bucket counts as 0
 * rather than rejecting the whole entry.
 */
export const modelUsageSchema = z.object({
  input_tokens: z.number().nonnegative().catch(0),
  output_tokens: z.number().nonnegative().catch(0),
  cache_creation_input_tokens: z.number().nonnegative().catch(0),
  cache_read_input_tokens: z.number().nonnegative().catch(0),
});
export type ModelUsage = z.infer<typeof modelUsageSchema>;

/** A session's usage keyed by full model id (e.g. "claude-opus-4-7-20250930"). */
export const usageByModelSchema = z.record(z.string(), modelUsageSchema);
export type UsageByModel = z.infer<typeof usageByModelSchema>;

/** A ticket's usage keyed by sessionId (a ticket may span several sessions via auto-reclaim). */
export const sessionUsageSchema = z.record(z.string(), usageByModelSchema);
export type SessionUsage = z.infer<typeof sessionUsageSchema>;

// ---- App settings (global, persisted in the `meta` table) ----

/** Global, non-project settings editable from the settings modal's "general" tab. */
export const appSettingsSchema = z.object({
  /** Language the agent writes commit messages and PR title/description in. */
  commitLanguage: commitLanguageSchema,
  /** Language of the feasibility study (triage) prompt and verdict. */
  triageLanguage: commitLanguageSchema,
});
export type AppSettings = z.infer<typeof appSettingsSchema>;

export const updateAppSettingsSchema = z.object({
  commitLanguage: commitLanguageSchema.optional(),
  triageLanguage: commitLanguageSchema.optional(),
});
export type UpdateAppSettingsInput = z.infer<typeof updateAppSettingsSchema>;

// ---- Implementability triage ("Analyser") ----

export const TRIAGE_STATUSES = ["none", "running", "done", "failed"] as const;
export const triageStatusSchema = z.enum(TRIAGE_STATUSES);
export type TriageStatus = z.infer<typeof triageStatusSchema>;

export { TRIAGE_VERDICTS };
export const triageVerdictSchema = z.enum(TRIAGE_VERDICTS);
export type TriageVerdict = z.infer<typeof triageVerdictSchema>;

/** Shape the triage agent must emit (and we re-parse on both server and client). */
export const triageResultSchema = z.object({
  verdict: triageVerdictSchema,
  summary: z.string(),
  reasons: z.array(z.string()),
  questions: z.array(z.string()),
  files: z.array(z.string()),
  // Suggestion fields fall back to null on a missing OR invalid value (.catch), so a malformed
  // suggestion never rejects the whole report — verdict/summary/reasons stay intact.
  /** Suggested implementation-agent model (verdict=implementable only; null = no suggestion). */
  suggestedModel: agentModelSchema.nullable().default(null).catch(null),
  /** Suggested implementation-agent effort (verdict=implementable only; null = no suggestion). */
  suggestedEffort: agentEffortSchema.nullable().default(null).catch(null),
  /** Deployable approaches/solutions identified by a deep "Analyse +" run (empty for normal triage). */
  solutions: z.array(z.string()).default([]).catch([]),
});
export type TriageResult = z.infer<typeof triageResultSchema>;

/** One ticket's feasibility verdict in a batch analysis: a triage report keyed by its ticket id. */
export const feasibilityResultSchema = triageResultSchema.extend({ ticketId: z.string().min(1) });
export type FeasibilityResult = z.infer<typeof feasibilityResultSchema>;

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
  /** Review tickets only: after posting, delegate fixing the findings to the pr-fixer sub-agent, then push fixes to the PR branch. */
  fixComments: z.boolean(),
  prdEnabled: z.boolean(),
  /** Open the PR as a draft (default true). Forced off when autoMerge is on. */
  prDraft: z.boolean(),
  /** Auto-merge the PR into the base branch once the done() gate passes. */
  autoMerge: z.boolean(),
  /** Attach Playwright screenshots of the feature to the PR (frontend changes). Unavailable when autoMerge is on. */
  addScreenshots: z.boolean(),
  /** Before opening the PR, mandatorily run the app to verify the feature works, and visually compare to any provided mockups (in addition to argus). */
  verifyFeature: z.boolean(),
  /** Allow up to 2 fixing loops (argus + anti-regression); default false = a single argus pass. */
  argusMultiLoop: z.boolean(),
  /** During the planning/conception phase, run a paris-research-style parallel-research deliberation (2 independent research subagents + a judged verdict) to decide the solution before writing the PRD / delegating implementation. */
  researchPlan: z.boolean(),
  /** Branch the worktree forks from and the PR targets (null = project default). */
  baseBranch: z.string().nullable(),
  /** Parent ticket this one stacks on: its worktree forks from the parent's branch and its PR targets it (null = none). */
  dependsOn: z.string().nullable(),
  prdMarkdown: z.string().nullable(),
  /** Markdown summary of what the agent did (captured from the PR description on done); null until finished. */
  agentSummary: z.string().nullable(),
  column: columnSchema,
  stage: stageSchema.nullable(),
  /** Orchestrator agent overrides (null = fall back to the server config defaults). */
  model: agentModelSchema.nullable(),
  effort: agentEffortSchema.nullable(),
  /** Implementer sub-agent overrides (null = fall back to the server config defaults). */
  implementerModel: agentModelSchema.nullable(),
  implementerEffort: agentEffortSchema.nullable(),
  implementer: implementerSchema,
  reviewRounds: z.number().int(),
  sessionId: z.string().nullable(),
  slotId: z.number().int().nullable(),
  branch: z.string().nullable(),
  prUrl: z.string().nullable(),
  /** An opus-low session is resolving merge conflicts on the existing PR branch (auto-merge retry). */
  resolvingConflicts: z.boolean(),
  /** An interactive test session occupies a slot on this card's existing feature branch (no pipeline/gate/PR). */
  testing: z.boolean(),
  error: z.string().nullable(),
  archived: z.boolean(),
  watchdogFlagged: z.boolean(),
  pendingQuestions: z.number().int(),
  triageStatus: triageStatusSchema,
  triageVerdict: triageVerdictSchema.nullable(),
  triageReport: z.string().nullable(),
  /** Inject the feasibility-triage findings as a dedicated section of the implementation contract. */
  feasibilityContext: z.boolean(),
  /** Epoch ms when the ticket reached a terminal state (done/failed/stalled/interrupted/abandoned); null otherwise. */
  finishedAt: z.number().int().nullable(),
  /** Epoch ms when the ticket last entered the "À implémenter" column; null until it first does. */
  implementingStartedAt: z.number().int().nullable(),
  /** Epoch ms when the agent first entered the `implementing` stage (real work start, excludes queue wait); null until then. */
  implementationStartedAt: z.number().int().nullable(),
  /** Token usage per session (sessionId → usage by model); empty until a Stop hook reports it. */
  sessionUsage: sessionUsageSchema,
  createdAt: z.number().int(),
  updatedAt: z.number().int(),
});
export type Ticket = z.infer<typeof ticketSchema>;

/** Lightweight per-ticket record powering the stats dashboard (no prdMarkdown/error/etc.). */
export const statRecordSchema = z.object({
  id: z.string(),
  project: projectKeySchema,
  kind: kindSchema,
  column: columnSchema,
  stage: stageSchema.nullable(),
  model: agentModelSchema.nullable(),
  effort: agentEffortSchema.nullable(),
  implementer: implementerSchema,
  createdAt: z.number().int(),
  implementingStartedAt: z.number().int().nullable(),
  implementationStartedAt: z.number().int().nullable(),
  finishedAt: z.number().int().nullable(),
  /** Derived total cost in USD across all sessions; null when no usage recorded. */
  costUsd: z.number().nullable(),
  /** Derived total token count across all sessions; null when no usage recorded. */
  totalTokens: z.number().nullable(),
});
export type StatRecord = z.infer<typeof statRecordSchema>;

export const profileSchema = z.object({
  id: z.string(),
  name: z.string(),
  model: agentModelSchema,
  effort: agentEffortSchema,
  implementerModel: agentModelSchema,
  implementerEffort: agentEffortSchema,
  implementer: implementerSchema,
  /** Display order in the picker (ascending). */
  sortOrder: z.number().int(),
  createdAt: z.number().int(),
  updatedAt: z.number().int(),
});
export type Profile = z.infer<typeof profileSchema>;

export const createProfileSchema = z.object({
  name: z.string().min(1),
  model: agentModelSchema,
  effort: agentEffortSchema,
  implementerModel: agentModelSchema.default("opus"),
  implementerEffort: agentEffortSchema.default("low"),
  implementer: implementerSchema.default("claude"),
});
export type CreateProfileInput = z.infer<typeof createProfileSchema>;

export const updateProfileSchema = z.object({
  name: z.string().min(1).optional(),
  model: agentModelSchema.optional(),
  effort: agentEffortSchema.optional(),
  implementerModel: agentModelSchema.optional(),
  implementerEffort: agentEffortSchema.optional(),
  implementer: implementerSchema.optional(),
  sortOrder: z.number().int().optional(),
});
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

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

/**
 * A standalone, ticket-less runnable worktree session: a fresh branch forked off a selected base,
 * set up exactly like a "Tester la fonctionnalité" session but tied to no card (pure infrastructure).
 * Persisted so the sessions survive a restart, can be listed/stopped, and are recovered cleanly.
 */
export const worktreeSessionSchema = z.object({
  slotId: z.number().int(),
  project: projectKeySchema,
  branch: z.string(),
  baseBranch: z.string(),
  sessionName: z.string(),
  createdAt: z.number().int(),
});
export type WorktreeSession = z.infer<typeof worktreeSessionSchema>;

/** browser → backend: launch a standalone worktree session on a fresh branch off the selected base. */
export const startWorktreeSessionBodySchema = z.object({
  project: projectKeySchema,
  baseBranch: z.string().min(1),
});
export type StartWorktreeSessionBody = z.infer<typeof startWorktreeSessionBodySchema>;

export const projectInfoSchema = z.object({
  key: projectKeySchema,
  label: z.string(),
  baseBranch: z.string(),
  /** Default state of the "auto-merge PR" toggle for new tickets in this project. */
  defaultAutoMerge: z.boolean(),
  /** Default state of the "add screenshots to PR" toggle for new tickets in this project. */
  defaultAddScreenshots: z.boolean(),
  /** Optional CSS color value used as the background of the project badge on ticket cards. */
  color: z.string().optional(),
});
export type ProjectInfo = z.infer<typeof projectInfoSchema>;

// ---- API input schemas ----

/** Max length of a title auto-derived from the description. */
const DERIVED_TITLE_MAX_LENGTH = 80;

/**
 * Derive a non-empty title from a ticket's description: first meaningful line,
 * stripped of leading markdown markers and truncated. Used when the user leaves
 * the title blank (the description is always provided).
 */
export function deriveTitleFromDescription(description: string): string {
  const firstLine =
    description
      .split("\n")
      .map((line) => line.replace(/^[#>\-*\s]+/, "").trim())
      .find((line) => line.length > 0) ?? "";
  if (firstLine.length <= DERIVED_TITLE_MAX_LENGTH) return firstLine;
  return `${firstLine.slice(0, DERIVED_TITLE_MAX_LENGTH - 1).trimEnd()}…`;
}

/**
 * Per-ticket options shared by single creation and CSV import: the target project plus the
 * pipeline toggles and agent knobs picked at creation (null = fall back to server config).
 */
const ticketBatchOptionsSchema = z.object({
  project: projectKeySchema,
  prdEnabled: z.boolean().default(false),
  prDraft: z.boolean().default(true),
  autoMerge: z.boolean().default(false),
  addScreenshots: z.boolean().default(false),
  verifyFeature: z.boolean().default(false),
  argusMultiLoop: z.boolean().default(false),
  // Branch the worktree forks from and the PR targets (null = project default).
  baseBranch: baseBranchSchema.nullable().default(null),
  // Implementation agent knobs picked at creation (null = fall back to server config).
  model: agentModelSchema.nullable().default(null),
  effort: agentEffortSchema.nullable().default(null),
  implementerModel: agentModelSchema.nullable().default(null),
  implementerEffort: agentEffortSchema.nullable().default(null),
  implementer: implementerSchema.default("claude"),
});

export const createTicketSchema = ticketBatchOptionsSchema
  .extend({
    title: z.string().default(""),
    description: z.string().default(""),
    /** Parent ticket this one stacks on (null = none). The PR forks from and targets the parent's branch. */
    dependsOn: z.string().nullable().default(null),
    /** Launch the ticket straight into implementation instead of parking it in "todo". */
    start: z.boolean().default(false),
  })
  .refine(
    (data) => data.title.trim().length > 0 || data.description.trim().length > 0,
    { message: "Titre ou description requis", path: ["title"] },
  );
export type CreateTicketInput = z.infer<typeof createTicketSchema>;

/** One imported CSV row: a ticket title (required, validated server-side) and its description. */
export const importTicketRowSchema = z.object({
  title: z.string(),
  description: z.string().default(""),
});
export type ImportTicketRow = z.infer<typeof importTicketRowSchema>;

/**
 * Bulk-create tickets from a parsed CSV. The batch options mirror createTicketSchema (minus
 * title/description/start, picked once for the whole batch); runFeasibility kicks off the batch
 * feasibility analysis after creation.
 */
export const importTicketsSchema = ticketBatchOptionsSchema.extend({
  rows: z.array(importTicketRowSchema).min(1).max(IMPORT_MAX_ROWS),
  runFeasibility: z.boolean().default(false),
});
export type ImportTicketsInput = z.infer<typeof importTicketsSchema>;

export const updateTicketSchema = z.object({
  // Optional and may be blank: a blank title is derived from the description
  // server-side, mirroring creation (see deriveTitleFromDescription).
  title: z.string().optional(),
  description: z.string().optional(),
  prdEnabled: z.boolean().optional(),
  prDraft: z.boolean().optional(),
  autoMerge: z.boolean().optional(),
  addScreenshots: z.boolean().optional(),
  verifyFeature: z.boolean().optional(),
  argusMultiLoop: z.boolean().optional(),
  project: projectKeySchema.optional(),
  baseBranch: baseBranchSchema.nullable().optional(),
  dependsOn: z.string().nullable().optional(),
  model: agentModelSchema.nullable().optional(),
  effort: agentEffortSchema.nullable().optional(),
  implementerModel: agentModelSchema.nullable().optional(),
  implementerEffort: agentEffortSchema.nullable().optional(),
  implementer: implementerSchema.optional(),
  feasibilityContext: z.boolean().optional(),
});
export type UpdateTicketInput = z.infer<typeof updateTicketSchema>;

export const moveTicketSchema = z.object({
  column: columnSchema,
  confirmed: z.boolean().default(false),
});
export type MoveTicketInput = z.infer<typeof moveTicketSchema>;

/** Start the batch feasibility analysis on a set of already-existing tickets (e.g. all of TODO). */
export const analyzeTicketsSchema = z.object({
  ids: z.array(z.string().min(1)).min(1),
});
export type AnalyzeTicketsInput = z.infer<typeof analyzeTicketsSchema>;

/** One open GitHub PR surfaced by `gh pr list` (and the unit the user picks to review). */
export const openPrSchema = z.object({
  number: z.number().int(),
  title: z.string(),
  url: z.string().url(),
  headBranch: z.string(),
  /** The PR's real target branch, detected via `gh` (`baseRefName`) — argus reviews against it.
   * Validated like any base branch since it ends up interpolated into the argus `--base` command. */
  baseBranch: baseBranchSchema,
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
  fixComments: z.boolean().default(false),
  /** Optional override for the argus review base; null means "use each PR's own detected target". */
  baseBranch: baseBranchSchema.nullable().default(null),
  prs: z.array(openPrSchema).min(1),
});
export type CreateReviewInput = z.infer<typeof createReviewSchema>;

/** Process a PR's reviewer feedback, applying only the pertinent fixes (minos-pr-feedback). */
export const createCleanSchema = z.object({
  project: projectKeySchema,
  /** Optional free-text context of the PR; the cleaner only applies feedback that respects it. */
  context: z.string().default(""),
  prs: z.array(openPrSchema).min(1),
});
export type CreateCleanInput = z.infer<typeof createCleanSchema>;

/** Ask a read-only question about a project; the agent answers (chosen model/effort), no PR. */
export const createAskSchema = z
  .object({
    title: z.string().default(""),
    description: z.string().default(""),
    project: projectKeySchema,
    // Agent model + reasoning effort picked at creation (null = fall back to server config).
    model: agentModelSchema.nullable().default(null),
    effort: agentEffortSchema.nullable().default(null),
  })
  .refine((data) => data.description.trim().length > 0, {
    message: "Question requise",
    path: ["description"],
  });
export type CreateAskInput = z.infer<typeof createAskSchema>;

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

export const uploadResultSchema = z.object({ path: z.string(), url: z.string() });
export type UploadResult = z.infer<typeof uploadResultSchema>;

/** Backend-provided client config: capability flags + orchestrator defaults (UI gating/labels). */
export const capabilitiesSchema = z.object({
  /** The Cursor headless CLI (Composer driver) is installed and authenticated. */
  composerAvailable: z.boolean(),
  /** Orchestrator model used when a ticket leaves it unset (raw config value, e.g. "opus"). */
  defaultModel: z.string(),
  /** Orchestrator reasoning effort used when a ticket leaves it unset (e.g. "medium"). */
  defaultEffort: z.string(),
  /** Implementer sub-agent model used when a ticket leaves it unset (e.g. "opus"). */
  defaultImplementerModel: z.string(),
  /** Implementer sub-agent reasoning effort used when a ticket leaves it unset (e.g. "low"). */
  defaultImplementerEffort: z.string(),
  /** Dev desktop only: the in-app self-update (git pull + rebuild + relaunch) is wired. */
  canUpdate: z.boolean(),
  /** Desktop app: quit via ⌘W×2 is wired (POST /api/internal/quit). */
  canQuit: z.boolean(),
});
export type Capabilities = z.infer<typeof capabilitiesSchema>;

// ---- WebSocket (backend → client) ----

export const wsClientEventSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("snapshot"),
    tickets: z.array(ticketSchema),
    slots: z.array(slotSchema),
    worktreeSessions: z.array(worktreeSessionSchema),
  }),
  z.object({ type: z.literal("ticket"), ticket: ticketSchema }),
  z.object({ type: z.literal("ticket_removed"), ticketId: z.string() }),
  z.object({ type: z.literal("comment"), comment: commentSchema }),
  z.object({ type: z.literal("slots"), slots: z.array(slotSchema) }),
  z.object({ type: z.literal("worktree_sessions"), worktreeSessions: z.array(worktreeSessionSchema) }),
  z.object({
    type: z.literal("notification"),
    title: z.string(),
    body: z.string(),
    ticketId: z.string().optional(),
    sound: z.boolean().optional(),
  }),
]);
export type WsClientEvent = z.infer<typeof wsClientEventSchema>;

// ---- Worker channel ----
// The wire protocol's single source of truth lives in ./protocol.ts (kept dependency-light so
// the standalone worker bundle can import it). Re-exported here so existing importers are
// unaffected. The two STRICT coordinator-facing arg schemas below stay in this module because
// they reference the full stageSchema / triageResultSchema (which carry server-shared semantics).

export {
  workerToolNameSchema,
  askUserArgsSchema,
  submitPrdArgsSchema,
  submitAnswerArgsSchema,
  doneArgsSchema,
  failArgsSchema,
  workerHelloSchema,
  workerToolCallSchema,
  workerStopSchema,
  workerInboundSchema,
  channelEventSchema,
  workerOutboundSchema,
} from "./protocol.ts";
export type { WorkerToolName, WorkerInbound, ChannelEvent, WorkerOutbound } from "./protocol.ts";

/**
 * Strict coordinator-facing `update_stage` args: accepts the FULL stage set (the worker only
 * advertises the agent-settable subset via protocol.ts, but the coordinator never tightens
 * this — see protocol.ts AGENT_SETTABLE_STAGES).
 */
export const updateStageArgsSchema = z.object({
  stage: stageSchema,
});
/** Feasibility verdict the triage session submits via the worker channel (same shape as the report). */
export const submitTriageArgsSchema = triageResultSchema;
/** Batch feasibility verdicts the orchestrator session submits once (one entry per imported ticket). */
export const submitFeasibilityArgsSchema = z.object({ results: z.array(feasibilityResultSchema) });

// ---- Interactive terminal channel: browser ↔ backend (xterm.js ↔ tmux pane) ----

/** Hex-encoded byte string (pairs of hex digits), as produced from xterm.js raw key bytes. */
const HEX_BYTES_RE = /^([0-9a-fA-F]{2})*$/;
/** Sanity ceiling on a requested pane size so a bad client can't ask for an absurd geometry. */
const TERMINAL_MAX_DIMENSION = 1000;

const terminalDimensionSchema = z.number().int().positive().max(TERMINAL_MAX_DIMENSION);

/**
 * Viewer's initial xterm geometry, carried as `/ws/terminal` query params (strings) so the
 * pane can be reflowed to match before its first frame is captured. Coerces "120" → 120.
 */
export const terminalViewportSchema = z.object({
  cols: z.coerce.number().pipe(terminalDimensionSchema),
  rows: z.coerce.number().pipe(terminalDimensionSchema),
});
export type TerminalViewport = z.infer<typeof terminalViewportSchema>;

/** browser → backend: a keystroke (raw bytes, hex) or a viewport resize. */
export const terminalClientMessageSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("input"), hex: z.string().regex(HEX_BYTES_RE) }),
  z.object({
    type: z.literal("resize"),
    cols: terminalDimensionSchema,
    rows: terminalDimensionSchema,
  }),
]);
export type TerminalClientMessage = z.infer<typeof terminalClientMessageSchema>;

/** backend → browser: a base64 chunk of pane output, or the pane process exit. */
export const terminalServerMessageSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("data"), chunk: z.string() }),
  z.object({ type: z.literal("exit") }),
]);
export type TerminalServerMessage = z.infer<typeof terminalServerMessageSchema>;

/**
 * A user-owned interactive terminal session (CMUX view): a detached zsh tmux session rooted at the
 * project's repoPath. `sessionName` and `cwd` are server-only knowledge surfaced for display; the
 * client only ever addresses the opaque `id` (the WS stream resolves it back to a session name).
 */
export const terminalDescriptorSchema = z.object({
  id: z.string(),
  projectKey: projectKeySchema,
  sessionName: z.string(),
  cwd: z.string(),
  createdAt: z.number(),
});
export type TerminalDescriptor = z.infer<typeof terminalDescriptorSchema>;

/** browser → backend: open a new user terminal in the given project (cwd resolved server-side). */
export const createTerminalBodySchema = z.object({ projectKey: projectKeySchema });
export type CreateTerminalBody = z.infer<typeof createTerminalBodySchema>;

/** In-app self-update outcome: reload the webview in place (frontend-only diff) or relaunch the process. */
export const updateModeSchema = z.enum(["reload", "relaunch"]);
export type UpdateMode = z.infer<typeof updateModeSchema>;
