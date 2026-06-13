import { nanoid } from "nanoid";

import { ACTIVE_STAGES, AUTO_NUDGE_MAX } from "../../shared/constants.ts";
import {
  askUserArgsSchema,
  doneArgsSchema,
  failArgsSchema,
  submitPrdArgsSchema,
  updateStageArgsSchema,
} from "../../shared/schemas.ts";

import type { Store, TicketPatch } from "../db/store.ts";
import type { ClientHub } from "../hub.ts";
import { createLogger } from "../logger.ts";
import type { Notifier } from "../notifier.ts";
import type { ToolCallContext, WorkerHub } from "../workerHub.ts";

import type { SlotManager } from "./slotManager.ts";

const log = createLogger("coordinator");

const NUDGE_MESSAGE =
  "Ton tour s'est terminé sans appeler done(), fail() ou ask_user(). Termine le protocole : appelle le tool approprié maintenant.";

interface ToolResult {
  ok: boolean;
  result: string;
}

/**
 * Routes worker tool calls and Stop-hook events to state mutations.
 * Implements the auto-nudge ×1 → stalled escalation.
 */
export class AgentCoordinator {
  constructor(
    private readonly store: Store,
    private readonly hub: ClientHub,
    private readonly workerHub: WorkerHub,
    private readonly notifier: Notifier,
    private readonly slots: SlotManager,
  ) {
    this.workerHub.setHandlers({
      onHello: (ticketId, slotId) => this.onHello(ticketId, slotId),
      onToolCall: (ctx) => this.onToolCall(ctx),
      onStop: (ticketId, sessionId) => void this.onStop(ticketId, sessionId),
    });
  }

  private onHello(ticketId: string, slotId: number): void {
    this.store.logEvent(ticketId, "worker_connected", { slotId });
    // A late or reconnecting worker still gets its contract (once per spawn).
    this.slots.deliverContractIfPending(ticketId);
  }

  private async onToolCall(ctx: ToolCallContext): Promise<ToolResult> {
    this.markProgress(ctx.ticketId);
    log.info("tool call", { ticketId: ctx.ticketId, tool: ctx.name });
    switch (ctx.name) {
      case "update_stage":
        return this.handleUpdateStage(ctx);
      case "ask_user":
        return this.handleAskUser(ctx);
      case "submit_prd":
        return this.handleSubmitPrd(ctx);
      case "done":
        return this.handleDone(ctx);
      case "fail":
        return this.handleFail(ctx);
      default:
        return { ok: false, result: `tool inconnu: ${ctx.name}` };
    }
  }

  private handleUpdateStage(ctx: ToolCallContext): ToolResult {
    const parsed = updateStageArgsSchema.safeParse(ctx.args);
    if (!parsed.success) return { ok: false, result: parsed.error.message };
    const ticket = this.store.updateTicket(ctx.ticketId, { stage: parsed.data.stage });
    this.hub.pushTicket(ticket);
    this.store.logEvent(ctx.ticketId, "update_stage", { stage: parsed.data.stage });
    return { ok: true, result: `stage=${parsed.data.stage}` };
  }

  private handleAskUser(ctx: ToolCallContext): ToolResult {
    const parsed = askUserArgsSchema.safeParse(ctx.args);
    if (!parsed.success) return { ok: false, result: parsed.error.message };
    const questionId = nanoid(8);
    const comment = this.store.addComment(ctx.ticketId, "agent", parsed.data.question, questionId);
    const ticket = this.store.updateTicket(ctx.ticketId, { stage: "awaiting_answers" });
    this.hub.pushComment(comment);
    this.hub.pushTicket(ticket);
    void this.notifier.notify("Question de l'agent", `${ticket.title}: ${parsed.data.question}`);
    this.store.logEvent(ctx.ticketId, "ask_user", { questionId });
    // Non-blocking: the answer returns later via the `answer` channel event.
    return { ok: true, result: `Question enregistrée (id=${questionId}). La réponse arrivera via un événement answer.` };
  }

  private handleSubmitPrd(ctx: ToolCallContext): ToolResult {
    const parsed = submitPrdArgsSchema.safeParse(ctx.args);
    if (!parsed.success) return { ok: false, result: parsed.error.message };
    const ticket = this.store.updateTicket(ctx.ticketId, {
      column: "prd",
      stage: "awaiting_answers",
      prdMarkdown: parsed.data.markdown,
    });
    this.hub.pushTicket(ticket);
    this.store.logEvent(ctx.ticketId, "submit_prd", {});
    void this.notifier.notify("PRD prêt", `${ticket.title}: PRD à valider`);
    return { ok: true, result: "PRD enregistré. Attends l'événement prd_validated avant d'implémenter." };
  }

  private async handleDone(ctx: ToolCallContext): Promise<ToolResult> {
    const parsed = doneArgsSchema.safeParse(ctx.args);
    if (!parsed.success) return { ok: false, result: parsed.error.message };
    const ticket = this.store.updateTicket(ctx.ticketId, { stage: "opening_pr" });
    this.hub.pushTicket(ticket);
    const outcome = await this.slots.finishTicket(ctx.ticketId, ctx.slotId, parsed.data.pr_url);
    if (!outcome.ok) {
      return { ok: false, result: `Gate échouée: ${outcome.reason}. Corrige et rappelle done().` };
    }
    return { ok: true, result: "Ticket clôturé, slot libéré." };
  }

  private async handleFail(ctx: ToolCallContext): Promise<ToolResult> {
    const parsed = failArgsSchema.safeParse(ctx.args);
    if (!parsed.success) return { ok: false, result: parsed.error.message };
    const body = `**Échec**: ${parsed.data.reason}\n\n${parsed.data.findings}`;
    const comment = this.store.addComment(ctx.ticketId, "agent", body, null);
    const ticket = this.store.updateTicket(ctx.ticketId, {
      stage: "failed",
      error: parsed.data.reason,
      finishedAt: Date.now(),
    });
    if (ticket.slotId !== null) this.store.updateSlot(ticket.slotId, { status: "failed" });
    this.hub.pushComment(comment);
    this.hub.pushTicket(ticket);
    this.hub.pushSlots(this.store.listSlots());
    await this.notifier.notify("Ticket en échec", `${ticket.title}: ${parsed.data.reason}`);
    this.store.logEvent(ctx.ticketId, "fail", { reason: parsed.data.reason });
    return { ok: true, result: "Échec enregistré. Slot conservé." };
  }

  /** Public entry for the Stop hook HTTP endpoint (mirrors the WS stop frame). */
  handleStopHook(ticketId: string, sessionId: string | null): void {
    void this.onStop(ticketId, sessionId);
  }

  /** Stop hook: turn ended. If no protocol tool resolved the turn → auto-nudge ×1 → stalled. */
  private async onStop(ticketId: string, sessionId: string | null): Promise<void> {
    if (sessionId) {
      const ticket = this.store.updateTicket(ticketId, { sessionId });
      this.hub.pushTicket(ticket);
    }
    const ticket = this.store.getTicket(ticketId);
    if (!ticket || ticket.stage === null) return;

    // A turn that legitimately parks on an unanswered question is not stalled.
    const waitingOnUser = ticket.stage === "awaiting_answers" && ticket.pendingQuestions > 0;
    if (waitingOnUser) return;

    // Otherwise the turn must have ended in an active/awaiting stage to warrant escalation.
    const needsResolution = ACTIVE_STAGES.includes(ticket.stage) || ticket.stage === "awaiting_answers";
    if (!needsResolution) return;

    const nudges = this.store.getNudgeCount(ticketId);
    if (nudges < AUTO_NUDGE_MAX) {
      this.store.updateTicket(ticketId, { nudgeCount: nudges + 1 });
      this.workerHub.sendEvent(ticketId, { type: "nudge", message: NUDGE_MESSAGE });
      this.store.logEvent(ticketId, "auto_nudge", { attempt: nudges + 1 });
      log.warn("auto-nudge (tour fini sans protocole)", { ticketId, attempt: nudges + 1 });
      return;
    }

    const stalled = this.store.updateTicket(ticketId, { stage: "stalled", finishedAt: Date.now() });
    if (stalled.slotId !== null) this.store.updateSlot(stalled.slotId, { status: "stalled" });
    this.hub.pushTicket(stalled);
    this.hub.pushSlots(this.store.listSlots());
    await this.notifier.notify("Ticket bloqué", `${stalled.title}: tour terminé sans protocole`);
    this.store.logEvent(ticketId, "stalled", {});
    log.warn("ticket bloqué (stalled)", { ticketId });
  }

  /** User answered a question (comment with questionId). Forward as channel event. */
  answerQuestion(ticketId: string, questionId: string, answer: string): void {
    this.store.markQuestionAnswered(questionId);
    this.workerHub.sendEvent(ticketId, { type: "answer", questionId, answer });
    const ticket = this.store.getTicket(ticketId);
    if (ticket && ticket.pendingQuestions === 0 && ticket.stage === "awaiting_answers") {
      const updated = this.store.updateTicket(ticketId, { stage: "implementing" });
      this.hub.pushTicket(updated);
    }
    this.markProgress(ticketId);
  }

  /** User validated the PRD → resume implementation in the same session. */
  validatePrd(ticketId: string): void {
    this.workerHub.sendEvent(ticketId, { type: "prd_validated", note: "" });
    const ticket = this.store.updateTicket(ticketId, { column: "implementing", stage: "implementing" });
    this.hub.pushTicket(ticket);
    this.store.logEvent(ticketId, "prd_validated", {});
    this.markProgress(ticketId);
  }

  /** Free-form user comment (no questionId) → steer the live session. Not agent progress. */
  forwardComment(ticketId: string, body: string): void {
    const delivered = this.workerHub.sendEvent(ticketId, { type: "user_comment", body });
    if (delivered) this.store.logEvent(ticketId, "user_comment_forwarded", {});
  }

  private markProgress(ticketId: string): void {
    const ticket = this.store.getTicket(ticketId);
    if (!ticket) return;
    const patch: TicketPatch = { lastProgressAt: Date.now() };
    if (ticket.watchdogFlagged) patch.watchdogFlagged = false;
    const updated = this.store.updateTicket(ticketId, patch);
    if (ticket.watchdogFlagged) this.hub.pushTicket(updated);
  }
}
