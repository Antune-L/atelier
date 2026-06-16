import type { Stage } from "../shared/constants.ts";
import type { Ticket } from "../shared/schemas.ts";

import type { Store } from "./db/store.ts";
import type { ClientHub } from "./hub.ts";
import type { Notifier } from "./notifier.ts";

/**
 * Owns the ticket lifecycle transitions as named domain verbs. Each verb concentrates the coupling
 * a single transition carries — ticket fields + slot status + finishedAt stamping — together with
 * the broadcast/log/notify ritual that must accompany it. Sits ABOVE `store`: it calls
 * store.updateTicket / updateSlot / logEvent / addComment, never touches SQL.
 *
 * Does NOT depend on WorkerHub: channel sends (nudge/answer/prd_validated/user_comment) are not
 * lifecycle transitions and stay in the coordinator.
 */
export class TicketLifecycle {
  constructor(
    private readonly store: Store,
    private readonly hub: ClientHub,
    private readonly notifier: Notifier,
  ) {}

  /**
   * Move a queued ticket into implementation (todo → implementing, stage queued). The slot launch
   * is kicked off separately by the caller; this only flips the board state.
   */
  enqueue(ticketId: string): Ticket {
    const ticket = this.store.updateTicket(ticketId, { column: "implementing", stage: "queued" });
    this.hub.pushTicket(ticket);
    return ticket;
  }

  /**
   * Begin/resume implementation: column implementing, stage implementing. Used after PRD validation
   * (the channel `prd_validated` event is sent separately by the coordinator) and pushes the ticket.
   * Logs `event` when provided (validatePrd logs "prd_validated").
   */
  beginImplementing(ticketId: string, event?: string): Ticket {
    const ticket = this.store.updateTicket(ticketId, { column: "implementing", stage: "implementing" });
    this.hub.pushTicket(ticket);
    if (event) this.store.logEvent(ticketId, event, {});
    return ticket;
  }

  /** Resume to the implementing stage only (column untouched). Used when the last question is answered. */
  resumeImplementing(ticketId: string): Ticket {
    const ticket = this.store.updateTicket(ticketId, { stage: "implementing" });
    this.hub.pushTicket(ticket);
    return ticket;
  }

  /** Single-field stage update carrying the log + push ritual (agent's update_stage tool). */
  setStage(ticketId: string, stage: Stage): Ticket {
    const ticket = this.store.updateTicket(ticketId, { stage });
    this.hub.pushTicket(ticket);
    this.store.logEvent(ticketId, "update_stage", { stage });
    return ticket;
  }

  /** PRD submitted: column prd, stage awaiting_answers, store markdown, push, log, notify. */
  submitPrd(ticketId: string, markdown: string): Ticket {
    const ticket = this.store.updateTicket(ticketId, {
      column: "prd",
      stage: "awaiting_answers",
      prdMarkdown: markdown,
    });
    this.hub.pushTicket(ticket);
    this.store.logEvent(ticketId, "submit_prd", {});
    void this.notifier.notify("PRD prêt", `${ticket.title}: PRD à valider`);
    return ticket;
  }

  /** Agent reached done() and is opening the PR: stage opening_pr. Push only. */
  beginOpeningPr(ticketId: string): Ticket {
    const ticket = this.store.updateTicket(ticketId, { stage: "opening_pr" });
    this.hub.pushTicket(ticket);
    return ticket;
  }

  /** Manual board move (drag): set the target column, push. */
  moveColumn(ticketId: string, column: Ticket["column"]): Ticket {
    const ticket = this.store.updateTicket(ticketId, { column });
    this.hub.pushTicket(ticket);
    return ticket;
  }

  /** Mark a feature's PR as merged: column merged, stamp finishedAt, push, log "merged". */
  markMerged(ticketId: string): Ticket {
    const ticket = this.store.updateTicket(ticketId, { column: "merged", finishedAt: Date.now() });
    this.hub.pushTicket(ticket);
    this.store.logEvent(ticketId, "merged", {});
    return ticket;
  }

  /**
   * Agent-driven terminal failure (fail() tool): post the failure comment, then drive the card to
   * failed/failed, clear resolvingConflicts, stamp finishedAt, sync the held slot to "failed",
   * broadcast ticket+comment+slots, notify, log "fail". `reason` is the error; `findings` the body.
   */
  async fail(ticketId: string, reason: string, findings: string): Promise<Ticket> {
    const body = `**Échec**: ${reason}\n\n${findings}`;
    const comment = this.store.addComment(ticketId, "agent", body, null);
    const ticket = this.store.updateTicket(ticketId, {
      column: "failed",
      stage: "failed",
      error: reason,
      // A conflict-resolution session that fails ends the run; clear the flag so a later launch
      // uses the normal contract.
      resolvingConflicts: false,
      finishedAt: Date.now(),
    });
    if (ticket.slotId !== null) this.store.updateSlot(ticket.slotId, { status: "failed" });
    this.hub.pushComment(comment);
    this.hub.pushTicket(ticket);
    this.hub.pushSlots(this.store.listSlots());
    await this.notifier.notify("Ticket en échec", `${ticket.title}: ${reason}`);
    this.store.logEvent(ticketId, "fail", { reason });
    return ticket;
  }

  /**
   * Setup/launch failure (no agent, no comment): column failed, stage failed, error, clear
   * resolvingConflicts, stamp finishedAt; force the given slot to "failed", push the ticket+slots,
   * log "failed", notify (fire-and-forget). Distinct from `fail`: no comment, log name "failed",
   * un-awaited notify, slot always written.
   */
  markLaunchFailed(ticketId: string, slotId: number, reason: string): Ticket {
    const ticket = this.store.updateTicket(ticketId, {
      column: "failed",
      stage: "failed",
      error: reason,
      resolvingConflicts: false,
      finishedAt: Date.now(),
    });
    this.store.updateSlot(slotId, { status: "failed" });
    this.hub.pushTicket(ticket);
    this.hub.pushSlots(this.store.listSlots());
    this.store.logEvent(ticketId, "failed", { reason });
    void this.notifier.notify("Ticket en échec", `${reason}`);
    return ticket;
  }

  /**
   * Stall a stuck turn: stage stalled, optional error, stamp finishedAt, sync the held slot to
   * "stalled", broadcast ticket+slots, notify. Used by the Stop-hook escalation (no error,
   * "Ticket bloqué", logs "stalled") and the done-gate exhaustion path (carries the gate reason as
   * error, "Gate done échouée", no extra event — it already logged DONE_GATE_FAILED_EVENT). The
   * callers differ only in the notify title/body, the recorded error, and whether a "stalled" event
   * is emitted — the transition itself is identical.
   */
  async stall(
    ticketId: string,
    notify: { title: string; body: string },
    opts: { error?: string | null; logEvent?: boolean } = {},
  ): Promise<Ticket> {
    const { error = null, logEvent = false } = opts;
    const ticket = this.store.updateTicket(ticketId, {
      stage: "stalled",
      ...(error !== null ? { error } : {}),
      finishedAt: Date.now(),
    });
    if (ticket.slotId !== null) this.store.updateSlot(ticket.slotId, { status: "stalled" });
    this.hub.pushTicket(ticket);
    this.hub.pushSlots(this.store.listSlots());
    await this.notifier.notify(notify.title, notify.body);
    if (logEvent) this.store.logEvent(ticketId, "stalled", {});
    return ticket;
  }
}
