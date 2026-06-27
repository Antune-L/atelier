import { nanoid } from "nanoid";

import { ACTIVE_STAGES, AUTO_NUDGE_MAX, FEASIBILITY_SLOT_ID, RECLAIM_IDLE_MS, TRIAGE_SLOT_ID } from "../../shared/constants.ts";
import type { UsageByModel, WorkerToolName } from "../../shared/schemas.ts";
import {
  askUserArgsSchema,
  doneArgsSchema,
  readyForReviewArgsSchema,
  failArgsSchema,
  submitAnswerArgsSchema,
  submitFeasibilityArgsSchema,
  submitPrdArgsSchema,
  submitTriageArgsSchema,
  updateStageArgsSchema,
} from "../../shared/schemas.ts";

import type { Store, TicketPatch } from "../db/store.ts";
import type { ClientHub } from "../hub.ts";
import type { TicketLifecycle } from "../lifecycle.ts";
import { createLogger } from "../logger.ts";
import type { Notifier } from "../notifier.ts";
import type { AgentTurnUsage } from "../system/agentSession.ts";

import type { FeasibilityBatchManager } from "./feasibilityManager.ts";
import type { SessionHub, SessionToolCall } from "./sessionHub.ts";
import type { SlotManager } from "./slotManager.ts";
import type { TriageManager } from "./triageManager.ts";

const log = createLogger("coordinator");

/** Map the SDK per-model turn usage (camelCase + cost) to the persisted `UsageByModel` (snake_case). */
function toUsageByModel(usage: Record<string, AgentTurnUsage>): UsageByModel {
  const out: UsageByModel = {};
  for (const [model, u] of Object.entries(usage)) {
    out[model] = {
      input_tokens: u.inputTokens,
      output_tokens: u.outputTokens,
      cache_creation_input_tokens: u.cacheCreationTokens,
      cache_read_input_tokens: u.cacheReadTokens,
    };
  }
  return out;
}

/**
 * Sum a per-turn usage delta into a session's running total, bucket-by-bucket per model. The SDK
 * reports usage PER TURN (each `result` covers only that turn), so a session's total is the sum of
 * its turn_end deltas — not the last one.
 */
function addUsageByModel(prior: UsageByModel | undefined, delta: UsageByModel): UsageByModel {
  const out: UsageByModel = { ...(prior ?? {}) };
  for (const [model, d] of Object.entries(delta)) {
    const base = out[model];
    out[model] = base
      ? {
          input_tokens: base.input_tokens + d.input_tokens,
          output_tokens: base.output_tokens + d.output_tokens,
          cache_creation_input_tokens: base.cache_creation_input_tokens + d.cache_creation_input_tokens,
          cache_read_input_tokens: base.cache_read_input_tokens + d.cache_read_input_tokens,
        }
      : d;
  }
  return out;
}

const NUDGE_MESSAGE =
  "Ton tour s'est terminé sans appeler done(), fail() ou ask_user(). Termine le protocole : appelle le tool approprié maintenant.";

interface ToolResult {
  ok: boolean;
  result: string;
}

type ToolHandler = (ctx: SessionToolCall) => ToolResult | Promise<ToolResult>;

/**
 * Routes the agent session's worker-tool calls and turn-end events to state mutations.
 * Implements the auto-nudge ×1 → stalled escalation and persists per-session token usage.
 */
export class AgentCoordinator {
  constructor(
    private readonly store: Store,
    private readonly hub: ClientHub,
    private readonly sessionHub: SessionHub,
    private readonly notifier: Notifier,
    private readonly lifecycle: TicketLifecycle,
    private readonly slots: SlotManager,
    private readonly triage: TriageManager,
    private readonly feasibility: FeasibilityBatchManager,
  ) {
    this.sessionHub.setHandlers({
      onToolCall: (ctx) => this.onToolCall(ctx),
      onStop: (ticketId, sessionId, usageByModel) => void this.onStop(ticketId, sessionId, usageByModel),
    });
  }

  private async onToolCall(ctx: SessionToolCall): Promise<ToolResult> {
    // A triage worker identifies with TRIAGE_SLOT_ID: it runs on a stage-null "todo" card outside
    // the slot pipeline and may ONLY submit its verdict. The 5 pipeline tools would corrupt that
    // card (set column=failed, stamp a stage, run the done gate with slotId=-1…), and the read-only
    // tool surface can't bar MCP tools — so the gate lives here, before markProgress.
    if (ctx.slotId === TRIAGE_SLOT_ID) {
      log.info("tool call (triage)", { ticketId: ctx.ticketId, tool: ctx.name });
      if (ctx.name === "submit_triage") return this.handleSubmitTriage(ctx);
      return { ok: false, result: "Session de triage en lecture seule : seul submit_triage est autorisé." };
    }
    // A batch feasibility orchestrator identifies with FEASIBILITY_SLOT_ID on a synthetic batch id
    // (no real ticket). It may ONLY submit its aggregated verdicts; every pipeline tool is barred.
    if (ctx.slotId === FEASIBILITY_SLOT_ID) {
      log.info("tool call (faisabilité)", { batchId: ctx.ticketId, tool: ctx.name });
      if (ctx.name === "submit_feasibility") return this.handleSubmitFeasibility(ctx);
      return {
        ok: false,
        result: "Session de faisabilité en lecture seule : seul submit_feasibility est autorisé.",
      };
    }
    // An interactive test session runs on a "done" card; it has no pipeline. `--tools` can't bar MCP
    // tools, so bar every pipeline tool here (same rationale as the triage/feasibility guards above).
    const testingTicket = this.store.getTicket(ctx.ticketId);
    if (testingTicket?.testing) {
      return { ok: false, result: "Session de test interactive : aucun tool de pipeline n'est disponible." };
    }
    this.markProgress(ctx.ticketId);
    log.info("tool call", { ticketId: ctx.ticketId, tool: ctx.name });
    // Registry-derived dispatch: a tool name without an entry is a COMPILE error (Record over the
    // full WorkerToolName union), not a runtime fallthrough. submit_triage/submit_feasibility are
    // handled by their slot-gated early returns above; reaching them on a pipeline slot is illegal,
    // mirroring the previous switch's `default` ("tool inconnu").
    return this.pipelineHandlers[ctx.name](ctx);
  }

  private readonly pipelineHandlers: Record<WorkerToolName, ToolHandler> = {
    update_stage: (ctx) => this.handleUpdateStage(ctx),
    ask_user: (ctx) => this.handleAskUser(ctx),
    submit_prd: (ctx) => this.handleSubmitPrd(ctx),
    submit_answer: (ctx) => this.handleSubmitAnswer(ctx),
    done: (ctx) => this.handleDone(ctx),
    ready_for_review: (ctx) => this.handleReadyForReview(ctx),
    fail: (ctx) => this.handleFail(ctx),
    submit_triage: (ctx) => ({ ok: false, result: `tool inconnu: ${ctx.name}` }),
    submit_feasibility: (ctx) => ({ ok: false, result: `tool inconnu: ${ctx.name}` }),
  };

  private async handleSubmitTriage(ctx: SessionToolCall): Promise<ToolResult> {
    const parsed = submitTriageArgsSchema.safeParse(ctx.args);
    if (!parsed.success) return { ok: false, result: parsed.error.message };
    await this.triage.complete(ctx.ticketId, parsed.data);
    return { ok: true, result: "Verdict de faisabilité enregistré." };
  }

  private async handleSubmitFeasibility(ctx: SessionToolCall): Promise<ToolResult> {
    const parsed = submitFeasibilityArgsSchema.safeParse(ctx.args);
    if (!parsed.success) return { ok: false, result: parsed.error.message };
    // ctx.ticketId is the synthetic batch id, not a real ticket.
    await this.feasibility.complete(ctx.ticketId, parsed.data.results);
    return { ok: true, result: "Verdicts de faisabilité enregistrés." };
  }

  private handleUpdateStage(ctx: SessionToolCall): ToolResult {
    const parsed = updateStageArgsSchema.safeParse(ctx.args);
    if (!parsed.success) return { ok: false, result: parsed.error.message };
    this.lifecycle.setStage(ctx.ticketId, parsed.data.stage);
    return { ok: true, result: `stage=${parsed.data.stage}` };
  }

  private handleAskUser(ctx: SessionToolCall): ToolResult {
    const parsed = askUserArgsSchema.safeParse(ctx.args);
    if (!parsed.success) return { ok: false, result: parsed.error.message };
    const questionId = nanoid(8);
    const comment = this.store.addComment(ctx.ticketId, "agent", parsed.data.question, questionId);
    const ticket = this.store.updateTicket(ctx.ticketId, { stage: "awaiting_answers" });
    this.hub.pushComment(comment);
    this.hub.pushTicket(ticket);
    void this.notifier.notify("Question de l'agent", `${ticket.title}: ${parsed.data.question}`, ctx.ticketId);
    this.store.logEvent(ctx.ticketId, "ask_user", { questionId });
    // Non-blocking: the answer returns later via the `answer` channel event.
    return { ok: true, result: `Question enregistrée (id=${questionId}). La réponse arrivera via un événement answer.` };
  }

  private handleSubmitPrd(ctx: SessionToolCall): ToolResult {
    const parsed = submitPrdArgsSchema.safeParse(ctx.args);
    if (!parsed.success) return { ok: false, result: parsed.error.message };
    this.lifecycle.submitPrd(ctx.ticketId, parsed.data.markdown);
    return { ok: true, result: "PRD enregistré. Attends l'événement prd_validated avant d'implémenter." };
  }

  private async handleSubmitAnswer(ctx: SessionToolCall): Promise<ToolResult> {
    const parsed = submitAnswerArgsSchema.safeParse(ctx.args);
    if (!parsed.success) return { ok: false, result: parsed.error.message };
    const ticket = this.store.getTicket(ctx.ticketId);
    if (!ticket || ticket.kind !== "ask") {
      return { ok: false, result: "submit_answer réservé aux tickets de type « ask »." };
    }
    // Already closed (slot released): ignore a stale/duplicate call instead of posting a second answer.
    if (ticket.slotId === null) {
      return { ok: false, result: "Ticket déjà clôturé." };
    }
    const comment = this.store.addComment(ctx.ticketId, "agent", parsed.data.answer, null);
    this.hub.pushComment(comment);
    // completeAsk releases the slot and logs the "answered" outcome (mirrors handleDone → finishTicket).
    await this.slots.completeAsk(ctx.ticketId, ctx.slotId);
    return { ok: true, result: "Réponse enregistrée, ticket clôturé, slot libéré." };
  }

  private async handleDone(ctx: SessionToolCall): Promise<ToolResult> {
    const parsed = doneArgsSchema.safeParse(ctx.args);
    if (!parsed.success) return { ok: false, result: parsed.error.message };
    this.lifecycle.beginOpeningPr(ctx.ticketId);
    const outcome = await this.slots.finishTicket(ctx.ticketId, ctx.slotId, parsed.data.pr_url);
    if (!outcome.ok) {
      return { ok: false, result: `Gate échouée: ${outcome.reason}. Corrige et rappelle done().` };
    }
    return { ok: true, result: "Ticket clôturé, slot libéré." };
  }

  private async handleReadyForReview(ctx: SessionToolCall): Promise<ToolResult> {
    const parsed = readyForReviewArgsSchema.safeParse(ctx.args);
    if (!parsed.success) return { ok: false, result: parsed.error.message };
    const ticket = this.store.getTicket(ctx.ticketId);
    if (!ticket || ticket.kind !== "feature" || (!ticket.stealth && !ticket.directPush)) {
      return { ok: false, result: "ready_for_review réservé aux tickets stealth ou push direct." };
    }
    this.lifecycle.beginOpeningPr(ctx.ticketId);
    const outcome = ticket.directPush
      ? await this.slots.markDirectPushDone(ctx.ticketId, ctx.slotId)
      : await this.slots.markReadyForReview(ctx.ticketId, ctx.slotId);
    if (!outcome.ok) {
      return { ok: false, result: `Gate échouée: ${outcome.reason}: corrige et rappelle ready_for_review().` };
    }
    return {
      ok: true,
      result: ticket.directPush
        ? "Push direct effectué : commits poussés sur la branche cible, worktree fermé, ticket clôturé."
        : "Prêt pour review : session arrêtée, worktree conservé.",
    };
  }

  private async handleFail(ctx: SessionToolCall): Promise<ToolResult> {
    const parsed = failArgsSchema.safeParse(ctx.args);
    if (!parsed.success) return { ok: false, result: parsed.error.message };
    await this.lifecycle.fail(ctx.ticketId, parsed.data.reason, parsed.data.findings);
    return { ok: true, result: "Échec enregistré. Slot conservé." };
  }

  /** Turn ended (SDK `result`). If no protocol tool resolved the turn → auto-nudge ×1 → stalled. */
  private async onStop(
    ticketId: string,
    sessionId: string | null,
    usageByModel: Record<string, AgentTurnUsage>,
  ): Promise<void> {
    // Guard first: updateTicket throws on an unknown id, and a read-only (triage/feasibility)
    // session identifies with an id that is not a real pipeline ticket.
    if (!this.store.getTicket(ticketId)) return;
    if (sessionId) {
      // Usage is reported PER TURN, so accumulate every turn_end into this session's running total
      // (overwriting would keep only the last turn). Ticket total = sum across sessionIds, one per
      // auto-reclaim relaunch.
      const existing = this.store.getTicket(ticketId);
      const sessionUsage = existing
        ? { ...existing.sessionUsage, [sessionId]: addUsageByModel(existing.sessionUsage[sessionId], toUsageByModel(usageByModel)) }
        : undefined;
      const updated = this.store.updateTicket(ticketId, {
        sessionId,
        ...(sessionUsage ? { sessionUsage } : {}),
      });
      this.hub.pushTicket(updated);
    }
    const ticket = this.store.getTicket(ticketId);
    if (!ticket || ticket.stage === null) return;
    // Interactive test sessions run on a "done" card (stage stays "done", not active nor
    // awaiting_answers), so they exit just below at `needsResolution` and are never escalated/nudged.

    // A turn that legitimately parks on the user is not stalled: either an unanswered
    // question, or a submitted PRD awaiting validation/feedback (column "prd"). The
    // watchdog (lastProgressAt) still catches a genuinely dead session.
    const waitingOnUser =
      ticket.stage === "awaiting_answers" &&
      (ticket.pendingQuestions > 0 || ticket.column === "prd");
    if (waitingOnUser) return;

    // Otherwise the turn must have ended in an active/awaiting stage to warrant escalation.
    const needsResolution = ACTIVE_STAGES.includes(ticket.stage) || ticket.stage === "awaiting_answers";
    if (!needsResolution) return;

    const nudges = this.store.getNudgeCount(ticketId);
    if (nudges < AUTO_NUDGE_MAX) {
      this.store.updateTicket(ticketId, { nudgeCount: nudges + 1 });
      this.sessionHub.sendEvent(ticketId, { type: "nudge", message: NUDGE_MESSAGE });
      this.store.logEvent(ticketId, "auto_nudge", { attempt: nudges + 1 });
      log.warn("auto-nudge (tour fini sans protocole)", { ticketId, attempt: nudges + 1 });
      return;
    }

    // A bare Stop is a weak signal: the orchestrator ends its turn after every `implementer`
    // sub-agent hand-back (the sub-agent can't call a protocol tool), so "turn ended in an active
    // stage" alone does NOT mean stalled. Only kill+respawn once the turn has been genuinely idle —
    // recent progress means it's live work, not a hang. A truly dead turn keeps aging lastProgressAt
    // and is reclaimed on a later Stop (and the 45-min watchdog is the independent backstop).
    if (Date.now() - this.store.getLastProgressAt(ticketId) < RECLAIM_IDLE_MS) return;

    // Idle past the threshold without protocol: relaunch in place (keeps the worktree) up to
    // AUTO_RECLAIM_MAX times before giving up. The slot stays busy across the respawn. Only a hit cap
    // (escalate) falls through to stalled; a concurrent in-flight reclaim (ignore) must not clobber
    // the recovering session.
    if ((await this.slots.tryAutoReclaim(ticketId, "tour terminé sans protocole")) !== "escalate") return;

    await this.lifecycle.stall(
      ticketId,
      { title: "Ticket bloqué", body: `${ticket.title}: tour terminé sans protocole` },
      { logEvent: true },
    );
    log.warn("ticket bloqué (stalled)", { ticketId });
  }

  /** User answered a question (comment with questionId). Forward as channel event. */
  answerQuestion(ticketId: string, questionId: string, answer: string): void {
    this.store.markQuestionAnswered(questionId);
    this.sessionHub.sendEvent(ticketId, { type: "answer", questionId, answer });
    const ticket = this.store.getTicket(ticketId);
    if (ticket && ticket.pendingQuestions === 0 && ticket.stage === "awaiting_answers") {
      this.lifecycle.resumeImplementing(ticketId);
    }
    this.markProgress(ticketId);
  }

  /**
   * User validated the PRD. The session stays alive but, for a Claude implementer,
   * the contract has it delegate the implementation to a fresh-context sub-agent.
   * If the user provided a note (annotations), it takes priority; otherwise the
   * delegation instruction is used for Claude implementers.
   */
  validatePrd(ticketId: string, note = ""): void {
    const existing = this.store.getTicket(ticketId);
    const resolvedNote =
      note ||
      (existing?.implementer === "claude"
        ? "Délègue l'implémentation à un sous-agent à contexte frais (outil Agent) qui garde le PRD validé en tête comme contrat ; ne poursuis pas l'implémentation dans cette session de planification."
        : "");
    this.sessionHub.sendEvent(ticketId, { type: "prd_validated", note: resolvedNote });
    this.lifecycle.beginImplementing(ticketId, "prd_validated");
    this.markProgress(ticketId);
  }

  /** Free-form user comment (no questionId) → steer the live session. Not agent progress. */
  forwardComment(ticketId: string, body: string): void {
    const delivered = this.sessionHub.sendEvent(ticketId, { type: "user_comment", body });
    if (delivered) this.store.logEvent(ticketId, "user_comment_forwarded", {});
  }

  private markProgress(ticketId: string): void {
    const ticket = this.store.getTicket(ticketId);
    if (!ticket) return;
    // Reset the nudge budget on every real progress event (same UPDATE, no extra query): the counter
    // is otherwise a lifetime per-ticket value, which turns AUTO_NUDGE_MAX=1 into "one nudge ever" and
    // sends the next bare Stop straight to reclaim. Per-idle-period semantics, mirroring how the
    // done_gate_failed counter resets on an intervening event.
    const patch: TicketPatch = { lastProgressAt: Date.now(), nudgeCount: 0 };
    if (ticket.watchdogFlagged) patch.watchdogFlagged = false;
    const updated = this.store.updateTicket(ticketId, patch);
    if (ticket.watchdogFlagged) this.hub.pushTicket(updated);
  }
}
