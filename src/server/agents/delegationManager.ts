/**
 * DelegationManager — runs the delegated Codex implementation child sessions.
 *
 * When a Claude-orchestrated ticket has a Codex implementer, the parent session calls the
 * non-blocking `delegate_implementation` worker tool and ends its turn. This manager spawns a BARE
 * codexProvider session (no worker tools, workspace-write sandbox) in the SAME slot worktree, feeds
 * it the plan as its single user turn, and when that turn ends pushes an `implementation_done`
 * channel event back into the parent session (same shape as `prd_validated`).
 *
 * The child is attached to the parent ticket: its stream events heartbeat the ticket's
 * lastProgressAt (the parent is idle while waiting, so the watchdog would otherwise flag it), its
 * transcript lines are appended to the parent's live viewer, its token usage is summed into the
 * ticket's sessionUsage (keyed by the child thread id), and any parent-session teardown
 * (release/relaunch/shutdown) cascades into a kill via SessionHub's disconnect listener.
 */

import { DELEGATION_SLOT_ID } from "../../shared/constants.ts";
import type { Ticket } from "../../shared/schemas.ts";

import type { Store } from "../db/store.ts";
import type { ClientHub } from "../hub.ts";
import { createLogger } from "../logger.ts";
import type { AgentSessionEvent, AgentSessionHandle, AgentTurnUsage } from "../system/agentSession.ts";
import type { SystemAdapter } from "../system/types.ts";

import { codexKnobs } from "./sessionConfig.ts";
import { renderSessionEvent } from "./sessionHub.ts";
import type { SessionHub } from "./sessionHub.ts";
import { slotPath } from "./slotManager.ts";
import { addUsageByModel, toUsageByModel } from "./usage.ts";

const log = createLogger("delegation");

/** Min interval between two lastProgressAt refreshes driven by child stream events. */
const HEARTBEAT_MIN_INTERVAL_MS = 30_000;

/** Transcript prefix marking lines produced by the delegated child (vs the parent session). */
const CHILD_TRANSCRIPT_PREFIX = "⟨codex⟩ ";

const CHILD_FRAMING = `Tu es la session d'implémentation déléguée (Codex). Ton unique rôle est d'écrire le code décrit dans le plan ci-dessous, intégralement, dans le répertoire de travail courant (le worktree).

Consignes :
- Travaille uniquement dans le worktree courant. Ne touche à aucun fichier en dehors.
- Respecte les conventions de code du projet.
- Ne commit JAMAIS, ne push JAMAIS, n'ouvre JAMAIS de PR : la session orchestratrice garde la main sur git, la review, les tests et la PR.
- Termine en résumant ce que tu as implémenté et les fichiers touchés (ce résumé est transmis à l'orchestrateur).

## Plan à implémenter
`;

/**
 * codexProvider emits `turn.failed` as turn_end THEN the error detail (the pump catch path emits
 * them in the opposite order) — defer settlement one tick so the trailing error message is
 * captured into the failure summary either way.
 */
const SETTLE_DELAY_MS = 50;

interface ActiveDelegation {
  handle: AgentSessionHandle;
  sessionId: string | null;
  lastAssistantText: string;
  lastError: string;
  lastHeartbeatAt: number;
  settled: boolean;
}

export class DelegationManager {
  private readonly active = new Map<string, ActiveDelegation>();

  constructor(
    private readonly store: Store,
    private readonly system: SystemAdapter,
    private readonly sessionHub: SessionHub,
    private readonly hub: ClientHub,
  ) {}

  /** True while a child implementation session runs for this ticket (parent is parked, not stalled). */
  isActive(ticketId: string): boolean {
    return this.active.has(ticketId);
  }

  /** Spawn the bare Codex child in the ticket's slot worktree and hand it the plan. Non-blocking. */
  start(ticket: Ticket, slotId: number, plan: string): { ok: boolean; result: string } {
    if (this.active.has(ticket.id)) {
      return { ok: false, result: "Une délégation est déjà en cours pour ce ticket : attends l'événement implementation_done." };
    }
    const knobs = codexKnobs(ticket);
    const state: ActiveDelegation = {
      handle: this.system.startAgentSession({
        ticketId: ticket.id,
        slotId: DELEGATION_SLOT_ID,
        cwd: slotPath(slotId),
        provider: "codex",
        model: knobs.model,
        effort: knobs.effort,
        permissionMode: "dontAsk",
        disableWorkerTools: true,
        onToolCall: async () => ({ ok: false, result: "Session d'implémentation déléguée : aucun tool de pipeline n'est disponible." }),
        onEvent: (event) => this.handleEvent(ticket.id, event),
      }),
      sessionId: null,
      lastAssistantText: "",
      lastError: "",
      lastHeartbeatAt: Date.now(),
      settled: false,
    };
    this.active.set(ticket.id, state);
    state.handle.send(`${CHILD_FRAMING}${plan}`);
    this.store.logEvent(ticket.id, "delegation_started", { model: knobs.model, effort: knobs.effort });
    this.sessionHub.appendExternalLine(ticket.id, `${CHILD_TRANSCRIPT_PREFIX}—— délégation Codex lancée (${knobs.model}) ——`);
    log.info("délégation lancée", { ticketId: ticket.id, slotId, model: knobs.model });
    return {
      ok: true,
      result:
        "Délégation lancée : une session Codex implémente le plan en arrière-plan dans le worktree courant. Termine ton tour MAINTENANT ; tu recevras l'événement implementation_done quand elle aura fini.",
    };
  }

  /** Kill an active child (parent released/relaunched/shutdown). Idempotent; stale events are dropped. */
  stop(ticketId: string): void {
    const state = this.active.get(ticketId);
    if (!state) return;
    this.active.delete(ticketId);
    void state.handle.interrupt();
    void state.handle.close();
    this.store.logEvent(ticketId, "delegation_killed", {});
    log.info("délégation tuée (cascade parent)", { ticketId });
  }

  private handleEvent(ticketId: string, event: AgentSessionEvent): void {
    const state = this.active.get(ticketId);
    if (!state) return;
    if (event.type === "init") state.sessionId = event.sessionId;
    if (event.type === "assistant_text" && event.text.trim()) state.lastAssistantText = event.text.trim();
    if (event.type === "error") state.lastError = event.message;
    const line = renderSessionEvent(event);
    if (line !== null) this.sessionHub.appendExternalLine(ticketId, `${CHILD_TRANSCRIPT_PREFIX}${line}`);
    this.heartbeat(ticketId, state);
    if (event.type === "turn_end" && !state.settled) {
      state.settled = true;
      this.recordUsage(ticketId, state, event.sessionId, event.usageByModel);
      const ok = event.ok;
      setTimeout(() => this.settle(ticketId, state, ok), SETTLE_DELAY_MS);
    }
  }

  /** The child's single turn ended: tear it down and resume the parent via implementation_done. */
  private settle(ticketId: string, state: ActiveDelegation, ok: boolean): void {
    if (this.active.get(ticketId) !== state) return;
    this.active.delete(ticketId);
    void state.handle.close();
    const summary = ok
      ? state.lastAssistantText
      : state.lastError || state.lastAssistantText || "la session Codex s'est terminée en erreur sans détail";
    const delivered = this.sessionHub.sendEvent(ticketId, { type: "implementation_done", ok, summary });
    this.store.logEvent(ticketId, "delegation_done", { ok, delivered });
    log.info("délégation terminée", { ticketId, ok, delivered });
    if (!delivered) log.warn("implementation_done non délivré : session parente absente", { ticketId });
  }

  /** Sum the child turn's usage into the parent ticket (keyed by the child thread id). */
  private recordUsage(
    ticketId: string,
    state: ActiveDelegation,
    turnSessionId: string,
    usageByModel: Record<string, AgentTurnUsage>,
  ): void {
    if (Object.keys(usageByModel).length === 0) return;
    const ticket = this.store.getTicket(ticketId);
    if (!ticket) return;
    const key = turnSessionId || state.sessionId || `delegation-${ticketId}`;
    const sessionUsage = {
      ...ticket.sessionUsage,
      [key]: addUsageByModel(ticket.sessionUsage[key], toUsageByModel(usageByModel)),
    };
    this.hub.pushTicket(this.store.updateTicket(ticketId, { sessionUsage }));
  }

  /** Refresh the parent ticket's lastProgressAt (throttled) so watchdog/reclaim see live work. */
  private heartbeat(ticketId: string, state: ActiveDelegation): void {
    const now = Date.now();
    if (now - state.lastHeartbeatAt < HEARTBEAT_MIN_INTERVAL_MS) return;
    state.lastHeartbeatAt = now;
    if (!this.store.getTicket(ticketId)) return;
    this.store.updateTicket(ticketId, { lastProgressAt: now });
  }
}
