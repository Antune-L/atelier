/**
 * protocol.ts — the single source of truth for the agent↔backend Channel wire format.
 *
 * Declares once, derived everywhere:
 * - the tool registry (name → MCP description → args schema) the worker advertises and the
 *   coordinator dispatches on,
 * - the channel-event union (backend → worker → session),
 * - the WS frames worker.ts ↔ backend exchange.
 *
 * Dependency-light ON PURPOSE: imports only `zod` and `./constants.ts`, never anything
 * server-only. `worker/worker.ts` is bundled standalone (`bun build worker/worker.ts`), so
 * pulling a server dep in here would break that bundle. Keep it that way.
 *
 * Naming convention: the strict arg schemas (re-exported via schemas.ts) are the canonical
 * validation surface the coordinator uses. Two tools (submit_triage / submit_feasibility)
 * additionally expose a deliberately TOLERANT mirror that the worker advertises via MCP — the
 * backend always re-validates strictly, so the worker errs toward forwarding (see TOLERANT note).
 */

import { z } from "zod";

import { TRIAGE_VERDICTS } from "./constants.ts";
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

export const doneArgsSchema = z.object({ pr_url: z.string().url() });

export const readyForReviewArgsSchema = z.object({});

export const failArgsSchema = z.object({
  reason: z.string().min(1),
  findings: z.string().default(""),
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
  solutions: z.array(z.string()).default([]),
});

/** TOLERANT mirror of the batch feasibility args; one entry per imported ticket, keyed by ticketId. */
const submitFeasibilityMcpArgsSchema = z.object({
  results: z.array(submitTriageMcpArgsSchema.extend({ ticketId: z.string().min(1) })),
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
      "Signale qu'un ticket stealth est prêt à être testé (branche commitée et poussée, AUCUNE PR). Le backend vérifie l'arbre propre + branche poussée, arrête la session et conserve le worktree pour test.",
    argsSchema: readyForReviewArgsSchema,
  },
  {
    name: "fail",
    description: "Signale un échec avec une raison et des findings.",
    argsSchema: failArgsSchema,
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
  "submit_triage",
  "submit_feasibility",
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

// ---- Channel events: backend → worker.ts → injected into the session ----

export const channelEventSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("ticket"), payload: z.string() }),
  z.object({ type: z.literal("answer"), questionId: z.string(), answer: z.string() }),
  z.object({ type: z.literal("prd_validated"), note: z.string().default("") }),
  z.object({ type: z.literal("nudge"), message: z.string() }),
  z.object({ type: z.literal("user_comment"), body: z.string() }),
]);
export type ChannelEvent = z.infer<typeof channelEventSchema>;

// ---- WS frames: worker.ts → backend ----

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

// ---- WS frames: backend → worker.ts ----

/** Either a channel event, or a tool result for a pending tool_call. */
export const workerOutboundSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("event"), event: channelEventSchema }),
  z.object({ type: z.literal("tool_result"), id: z.string(), ok: z.boolean(), result: z.string() }),
]);
export type WorkerOutbound = z.infer<typeof workerOutboundSchema>;
