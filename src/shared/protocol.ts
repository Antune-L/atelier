/**
 * protocol.ts — the single source of truth for the agent↔backend tool/event contract.
 *
 * Declares once, derived everywhere:
 * - the tool registry (name → MCP description → args schema) the in-process MCP server exposes and
 *   the coordinator dispatches on (see system/claudeProvider.ts),
 * - the channel-event union the backend injects as user turns into a live SDK session.
 *
 * Dependency-light ON PURPOSE: imports only `zod` and `./constants.ts`, never anything server-only,
 * so it can be shared by the server and the web bundle alike. Keep it that way.
 *
 * Naming convention: the strict arg schemas (re-exported via schemas.ts) are the canonical
 * validation surface the coordinator uses. Two tools (submit_triage / submit_feasibility)
 * additionally expose a deliberately TOLERANT mirror advertised via MCP — the backend always
 * re-validates strictly, so the agent errs toward forwarding (see TOLERANT note).
 */

import { z } from "zod";

import { DEFAULT_IMPLEMENTATION_LOT, LOT_LABEL_MAX_LENGTH, MAX_PARALLEL_IMPLEMENTERS, TRIAGE_VERDICTS } from "./constants.ts";
import type { Stage } from "./constants.ts";

// ---- Stage subset (agent-settable vs full) ----

/**
 * Stages an agent may set via `update_stage`. A strict SUBSET of the full `STAGES`: the
 * backend-only terminal stages `interrupted`/`stalled` are excluded (the backend sets those,
 * never the agent). The worker advertises this subset to its session via MCP. The coordinator
 * deliberately validates against the FULL stage set (see schemas.ts `updateStageArgsSchema`) —
 * do not tighten it here without a behavior review.
 */
export const AGENT_SETTABLE_STAGES = [
  "queued",
  "planning",
  "awaiting_answers",
  "implementing",
  "reviewing",
  "fixing",
  "testing",
  "opening_pr",
  "done",
  "failed",
] as const satisfies readonly Stage[];
export type AgentSettableStage = (typeof AGENT_SETTABLE_STAGES)[number];

const agentSettableStageSchema = z.enum(AGENT_SETTABLE_STAGES);

// ---- Tool arg schemas (worker-advertised / coordinator-validated) ----

/**
 * What the worker advertises for `update_stage` (the agent-settable subset). The coordinator
 * re-validates with the full-stage schema in schemas.ts; both accept every value an agent can
 * legitimately set, so this subset never rejects a valid agent call.
 */
const updateStageMcpArgsSchema = z.object({ stage: agentSettableStageSchema });

export const askUserArgsSchema = z.object({ question: z.string().min(1) });
export const submitPrdArgsSchema = z.object({ markdown: z.string().min(1) });

/** Final answer an ask ticket submits (markdown); surfaced as an agent comment, closes the ticket. */
export const submitAnswerArgsSchema = z.object({ answer: z.string().min(1) });

export const doneArgsSchema = z.object({ pr_url: z.url() });

export const readyForReviewArgsSchema = z.object({});

export const failArgsSchema = z.object({
  reason: z.string().min(1),
  findings: z.string().default(""),
});

/**
 * Plan handed to one delegated Codex implementation child (the validated PRD verbatim, or a concise
 * plan written from the ticket description). The child receives it as its single user turn. `label`
 * names the lot so several children can run in parallel on disjoint file scopes.
 */
export const delegateImplementationArgsSchema = z.object({
  plan: z.string().min(1),
  label: z.string().trim().min(1).max(LOT_LABEL_MAX_LENGTH).default(DEFAULT_IMPLEMENTATION_LOT),
});

export const reviewKindSchema = z.enum([
  "quality",
  "conventions",
  "regression",
  "logic",
  "architecture",
  "security",
]);
export type ReviewKind = z.infer<typeof reviewKindSchema>;

export const delegateReviewArgsSchema = z.object({
  kind: reviewKindSchema,
  context: z.string().min(1),
});

export const readReviewResultsArgsSchema = z.object({
  passId: z.string().min(1).nullish(),
});

export const publishReviewArgsSchema = z.object({
  passId: z.string().min(1),
});

export const reviewFindingSeveritySchema = z.enum(["critical", "major", "minor"]);
export const reviewFindingVerificationSchema = z.enum(["not_needed", "pending", "confirmed", "demoted", "rejected"]);
export const reviewFindingSchema = z.object({
  id: z.string().min(1),
  severity: reviewFindingSeveritySchema,
  summary: z.string().min(1),
  evidence: z.string().min(1),
  ruleSource: z.string().min(1).nullable().default(null),
  path: z.string().min(1).nullable().default(null),
  line: z.number().int().positive().nullable().default(null),
  verificationStatus: reviewFindingVerificationSchema.default("not_needed"),
  originalSeverity: reviewFindingSeveritySchema.nullable().default(null),
});
export type ReviewFinding = z.infer<typeof reviewFindingSchema>;

export const submitReviewArgsSchema = z
  .object({
    verdict: z.enum(["approve", "revise"]),
    summary: z.string().min(1),
    findings: z.array(reviewFindingSchema).default([]),
  })
  .superRefine((value, context) => {
    if (value.verdict === "approve" && value.findings.length > 0) {
      context.addIssue({ code: "custom", message: "approve exige une liste de findings vide", path: ["findings"] });
    }
    if (value.verdict === "revise" && value.findings.length === 0) {
      context.addIssue({ code: "custom", message: "revise exige au moins un finding", path: ["findings"] });
    }
  });

const triageVerdictSchema = z.enum(TRIAGE_VERDICTS);

/**
 * TOLERANT mirror of the strict triage report (schemas.ts `triageResultSchema`), advertised to
 * the worker's session via MCP. Kept loose on purpose: `reasons`/`questions`/`files` default to
 * empty and `suggested*` accept any string, so the worker forwards a slightly-off report rather
 * than rejecting it locally. The backend re-validates strictly with `submitTriageArgsSchema`
 * before persisting, so tolerance here never weakens what gets stored.
 */
const submitTriageMcpArgsSchema = z.object({
  verdict: triageVerdictSchema,
  summary: z.string(),
  reasons: z.array(z.string()).default([]),
  questions: z.array(z.string()).default([]),
  files: z.array(z.string()).default([]),
  suggestedModel: z.string().nullable().default(null),
  suggestedEffort: z.string().nullable().default(null),
  suggestedOrchestrator: z.enum(["claude", "codex"]).nullable().default(null),
  suggestedCodexModel: z.string().nullable().default(null),
  suggestedCodexEffort: z.string().nullable().default(null),
  solutions: z.array(z.string()).default([]),
});

/** TOLERANT mirror of the batch feasibility args; one entry per imported ticket, keyed by ticketId. */
const submitFeasibilityMcpArgsSchema = z.object({
  results: z.array(submitTriageMcpArgsSchema.extend({ ticketId: z.string().min(1) })),
});

/**
 * TOLERANT mirror of the strict split result (schemas.ts `submitSplitArgsSchema`), advertised to the
 * split worker's session via MCP. Kept loose on purpose (summary/children default to empty) so the
 * worker forwards a slightly-off decomposition rather than rejecting it locally; the backend
 * re-validates strictly before creating any ticket.
 */
interface SplitChildMcpInput {
  title: string;
  summary: string;
  children: SplitChildMcpInput[];
}
const splitChildMcpSchema: z.ZodType<SplitChildMcpInput> = z.lazy(() =>
  z.object({
    title: z.string().default(""),
    summary: z.string().default(""),
    children: z.array(splitChildMcpSchema).default([]),
  }),
);
const submitSplitMcpArgsSchema = z.object({
  summary: z.string().default(""),
  children: z.array(splitChildMcpSchema).default([]),
});

// ---- Tool registry ----

/**
 * One entry per Channel tool: the name the worker advertises and the coordinator dispatches on,
 * the French MCP-facing description, and the args schema the worker validates against locally.
 *
 * For submit_triage / submit_feasibility the registry holds the TOLERANT worker-facing schema;
 * the coordinator re-validates strictly via the schemas.ts exports.
 */
export const WORKER_TOOLS = [
  {
    name: "update_stage",
    description: "Met à jour le badge d'étape de la carte du ticket.",
    argsSchema: updateStageMcpArgsSchema,
  },
  {
    name: "ask_user",
    description:
      "Pose une question à l'utilisateur. La session reste en vie ; la réponse arrive via un événement de channel.",
    argsSchema: askUserArgsSchema,
  },
  {
    name: "submit_prd",
    description: "Soumet le PRD (markdown). Déplace la carte en colonne PRD à implémenter.",
    argsSchema: submitPrdArgsSchema,
  },
  {
    name: "submit_answer",
    description:
      "Soumet la réponse finale (markdown) d'un ticket « ask ». Le backend la publie en commentaire et clôt le ticket.",
    argsSchema: submitAnswerArgsSchema,
  },
  {
    name: "done",
    description: "Signale la fin du ticket avec l'URL de la PR draft. Le backend vérifie avant de clôturer.",
    argsSchema: doneArgsSchema,
  },
  {
    name: "ready_for_review",
    description:
      "Signale qu'un ticket sans PR (stealth ou push direct) a sa branche commitée et poussée. Le backend vérifie l'arbre propre + branche poussée, puis selon le mode conserve le worktree pour test (stealth) ou ferme le worktree et clôture la carte en « Fini » (push direct).",
    argsSchema: readyForReviewArgsSchema,
  },
  {
    name: "fail",
    description: "Signale un échec avec une raison et des findings.",
    argsSchema: failArgsSchema,
  },
  {
    name: "delegate_implementation",
    description:
      `Réservé aux tickets dont l'implémenteur est Codex. Délègue l'implémentation à une session Codex lancée en arrière-plan par le backend dans le worktree courant (elle écrit le code, ne commit jamais). Retourne immédiatement : termine ton tour et attends l'événement implementation_done. Appelable une fois par lot indépendant dans le même tour (max ${MAX_PARALLEL_IMPLEMENTERS} lots, un \`label\` distinct par lot, périmètres de fichiers disjoints) : tu recevras un événement implementation_done par lot.`,
    argsSchema: delegateImplementationArgsSchema,
  },
  {
    name: "delegate_review",
    description:
      "Lance un reviewer indépendant en lecture seule pour une dimension de review. Retourne immédiatement : termine le tour et attends review_done.",
    argsSchema: delegateReviewArgsSchema,
  },
  {
    name: "read_review_results",
    description:
      "Relit les verdicts de review déjà persistés pour la passe courante du ticket (ou la passe `passId` si fournie). À utiliser quand un événement review_done n'est pas arrivé, plutôt que de relancer les reviewers.",
    argsSchema: readReviewResultsArgsSchema,
  },
  {
    name: "publish_review",
    description:
      "Publie via le backend les résultats persistés de la passe de review sur le commit exact vérifié : REQUEST_CHANGES si un finding critical ou major est retenu, COMMENT s'il ne reste que des minor, APPROVE si aucun finding n'est retenu. Réservé aux tickets review avec postage GitHub activé.",
    argsSchema: publishReviewArgsSchema,
  },
  {
    name: "submit_review",
    description:
      "Réservé à une session reviewer : soumet son verdict, sa synthèse et ses findings au parent. Chaque chaîne (summary, evidence, ruleSource) doit être rédigée en anglais.",
    argsSchema: submitReviewArgsSchema,
  },
  {
    name: "submit_triage",
    description:
      "Soumet le verdict de faisabilité (triage en lecture seule). Le backend le persiste puis détruit la session.",
    argsSchema: submitTriageMcpArgsSchema,
  },
  {
    name: "submit_feasibility",
    description:
      "Soumet en UN SEUL appel les verdicts de faisabilité d'un lot (un par ticket importé, keyé par ticketId). Le backend les persiste puis détruit la session.",
    argsSchema: submitFeasibilityMcpArgsSchema,
  },
  {
    name: "submit_split",
    description: "Soumet le découpage du ticket en sous-tickets (titre + synthèse par fille).",
    argsSchema: submitSplitMcpArgsSchema,
  },
] as const;

export type WorkerTool = (typeof WORKER_TOOLS)[number];

/** Tool names as a literal union, derived from the registry so they can't drift. */
export type WorkerToolName = WorkerTool["name"];

/**
 * The tool-name tuple feeding the zod enum. Listed explicitly (z.enum needs a literal tuple),
 * but `satisfies` ties it to the registry: a name added to WORKER_TOOLS but missing here — or a
 * stray name here — is a compile error.
 */
const WORKER_TOOL_NAMES = [
  "update_stage",
  "ask_user",
  "submit_prd",
  "submit_answer",
  "done",
  "ready_for_review",
  "fail",
  "delegate_implementation",
  "delegate_review",
  "read_review_results",
  "publish_review",
  "submit_review",
  "submit_triage",
  "submit_feasibility",
  "submit_split",
] as const satisfies readonly WorkerToolName[];

// Guard the other direction at type level: every registry name must appear in the tuple above.
type AssertNamesCovered = Exclude<WorkerToolName, (typeof WORKER_TOOL_NAMES)[number]> extends never
  ? true
  : never;
const _namesCovered: AssertNamesCovered = true;
void _namesCovered;

export const workerToolNameSchema = z.enum(WORKER_TOOL_NAMES);

export function isWorkerToolName(value: string): value is WorkerToolName {
  return workerToolNameSchema.safeParse(value).success;
}

// ---- Channel events: backend → injected as a user turn into the live SDK session ----

export const channelEventSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("ticket"), payload: z.string() }),
  z.object({ type: z.literal("answer"), questionId: z.string(), answer: z.string() }),
  z.object({ type: z.literal("prd_validated"), note: z.string().default("") }),
  z.object({
    type: z.literal("implementation_done"),
    ok: z.boolean(),
    summary: z.string().default(""),
    label: z.string().default(DEFAULT_IMPLEMENTATION_LOT),
    remaining: z.number().int().nonnegative().default(0),
  }),
  z.object({
    type: z.literal("review_done"),
    kind: reviewKindSchema,
    passId: z.string().min(1),
    ok: z.boolean(),
    verdict: z.enum(["approve", "revise"]).nullable(),
    summary: z.string().default(""),
    findings: z.array(reviewFindingSchema).default([]),
  }),
  z.object({ type: z.literal("nudge"), message: z.string() }),
  z.object({ type: z.literal("user_comment"), body: z.string() }),
]);
export type ChannelEvent = z.infer<typeof channelEventSchema>;
