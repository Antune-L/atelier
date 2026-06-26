/**
 * SessionHub — manages live SDK agent sessions, one per ticket. The SDK replacement for WorkerHub.
 *
 * Where WorkerHub waited for an outbound WS from a tmux-spawned worker, SessionHub OWNS each session:
 * it starts the `claude` run via the SystemAdapter, routes the agent's worker-tool calls to the
 * coordinator, injects backend channel events as user turns, and surfaces parsed stream events
 * (turn boundaries drive the Stop logic; assistant/tool events feed the live UI viewer).
 *
 * The contract-delivery race is gone: a session is started, then the contract is `send()`-injected as
 * its first user turn — no connect poll, no ack, no re-push.
 */

import { nanoid } from "nanoid";

import type { ChannelEvent, WorkerToolName } from "../../shared/protocol.ts";
import { createLogger } from "../logger.ts";
import type {
  AgentPermissionMode,
  AgentSessionEvent,
  AgentSessionHandle,
  AgentSubagentDefinition,
} from "../system/agentSession.ts";
import type { SystemAdapter } from "../system/types.ts";

const log = createLogger("session-hub");

/** Everything the hub needs to start one agent session; built per ticket kind by the slot manager. */
export interface SessionStartConfig {
  ticketId: string;
  slotId: number;
  cwd: string;
  model: string;
  effort: string | null;
  permissionMode: AgentPermissionMode;
  /** Extra built-in tools the agent may auto-use (Read/Edit/Bash/Agent…). Worker tools are always allowed. */
  allowedTools?: string[];
  /** Tools removed entirely (read-only triage/feasibility bar Edit/Write/Bash). */
  disallowedTools?: string[];
  /** Programmatic subagents (feasibility scout, implementer…) forwarded to the SDK `agents` option. */
  agents?: Record<string, AgentSubagentDefinition>;
}

export interface SessionToolCall {
  ticketId: string;
  slotId: number;
  callId: string;
  name: WorkerToolName;
  args: unknown;
}

export interface SessionHubHandlers {
  /** Route a worker tool call to the backend; the returned text is what the agent sees. */
  onToolCall(call: SessionToolCall): Promise<{ ok: boolean; result: string }>;
  /** A turn ended (the SDK `result` message): drives the auto-nudge → stalled escalation. */
  onStop(ticketId: string, sessionId: string | null): void;
  /** Every parsed stream event (UI viewer + usage recording). */
  onSessionEvent(ticketId: string, slotId: number, event: AgentSessionEvent): void;
}

interface LiveSession {
  handle: AgentSessionHandle;
  slotId: number;
  sessionId: string | null;
}

/** Render a backend channel event as the user-turn text injected into the live session. */
export function renderChannelEvent(event: ChannelEvent): string {
  switch (event.type) {
    case "ticket":
      return event.payload;
    case "answer":
      return `Réponse de l'utilisateur (question ${event.questionId}) : ${event.answer}`;
    case "prd_validated":
      return `PRD validé par l'utilisateur. ${event.note}`;
    case "nudge":
      return event.message;
    case "user_comment":
      return `Commentaire de l'utilisateur (à prendre en compte dans le travail en cours) : ${event.body}`;
  }
}

export class SessionHub {
  private readonly sessions = new Map<string, LiveSession>();
  private handlers: SessionHubHandlers | null = null;

  constructor(private readonly system: SystemAdapter) {}

  setHandlers(handlers: SessionHubHandlers): void {
    this.handlers = handlers;
  }

  isConnected(ticketId: string): boolean {
    return this.sessions.has(ticketId);
  }

  /** Start an agent session for a ticket. Replaces any prior session for the same ticket (reclaim). */
  start(config: SessionStartConfig): void {
    this.disconnect(config.ticketId);
    const handle = this.system.startAgentSession({
      ticketId: config.ticketId,
      slotId: config.slotId,
      cwd: config.cwd,
      model: config.model,
      effort: config.effort,
      permissionMode: config.permissionMode,
      ...(config.allowedTools ? { allowedTools: config.allowedTools } : {}),
      ...(config.disallowedTools ? { disallowedTools: config.disallowedTools } : {}),
      ...(config.agents ? { agents: config.agents } : {}),
      onToolCall: (name, args) => this.routeToolCall(config.ticketId, config.slotId, name, args),
      onEvent: (event) => this.handleEvent(config.ticketId, config.slotId, event),
    });
    this.sessions.set(config.ticketId, { handle, slotId: config.slotId, sessionId: null });
  }

  /** Inject a backend channel event as a user turn. False when no live session exists for the ticket. */
  sendEvent(ticketId: string, event: ChannelEvent): boolean {
    const live = this.sessions.get(ticketId);
    if (!live) return false;
    live.handle.send(renderChannelEvent(event));
    return true;
  }

  /** Preempt the current turn (urgent stop/nudge). No-op when the session is gone. */
  async interrupt(ticketId: string): Promise<void> {
    await this.sessions.get(ticketId)?.handle.interrupt();
  }

  /** Stop and evict a ticket's session. Idempotent. */
  disconnect(ticketId: string): void {
    const live = this.sessions.get(ticketId);
    if (!live) return;
    this.sessions.delete(ticketId);
    void live.handle.close();
  }

  private async routeToolCall(
    ticketId: string,
    slotId: number,
    name: WorkerToolName,
    args: unknown,
  ): Promise<{ ok: boolean; result: string }> {
    if (!this.handlers) return { ok: false, result: "backend non prêt" };
    return this.handlers.onToolCall({ ticketId, slotId, callId: nanoid(8), name, args });
  }

  private handleEvent(ticketId: string, slotId: number, event: AgentSessionEvent): void {
    const live = this.sessions.get(ticketId);
    if (event.type === "init") {
      if (live) live.sessionId = event.sessionId;
      log.info("session init", { ticketId, sessionId: event.sessionId });
    }
    this.handlers?.onSessionEvent(ticketId, slotId, event);
    if (event.type === "turn_end") {
      this.handlers?.onStop(ticketId, live?.sessionId ?? null);
    }
  }
}
