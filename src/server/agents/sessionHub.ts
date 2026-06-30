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

import type { Implementer } from "../../shared/constants.ts";
import type { ChannelEvent, WorkerToolName } from "../../shared/protocol.ts";
import { createLogger } from "../logger.ts";
import type {
  AgentPermissionMode,
  AgentSessionEvent,
  AgentSessionHandle,
  AgentSubagentDefinition,
  AgentTurnUsage,
} from "../system/agentSession.ts";
import type { SystemAdapter } from "../system/types.ts";

const log = createLogger("session-hub");

/** Everything the hub needs to start one agent session; built per ticket kind by the slot manager. */
export interface SessionStartConfig {
  ticketId: string;
  slotId: number;
  cwd: string;
  /** Which provider drives this session. Triage/split/feasibility builders always pass "claude". */
  provider: Extract<Implementer, "claude" | "codex">;
  model: string;
  effort: string | null;
  permissionMode: AgentPermissionMode;
  /** Pre-approved permission rules (SDK `settings.permissions.allow`) — the bash allowlist under `dontAsk`. */
  permissionAllow?: string[];
  /** Denied permission rules (SDK `settings.permissions.deny`) — e.g. `Agent(general-purpose)` for read-only scouts. */
  permissionDeny?: string[];
  /** Extra built-in tools the agent may auto-use (Read/Edit/Bash/Agent…). Worker tools are always allowed. */
  allowedTools?: string[];
  /** Tools removed entirely (read-only triage/feasibility bar Edit/Write/Bash). */
  disallowedTools?: string[];
  /** Programmatic subagents (feasibility scout, implementer…) forwarded to the SDK `agents` option. */
  agents?: Record<string, AgentSubagentDefinition>;
  /** Skills enabled for the session (SDK `skills` filter): `[]` loads none, a list scopes context to those. */
  skills?: string[];
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
  /**
   * A turn ended (the SDK `result` message): drives the auto-nudge → stalled escalation and persists
   * the turn's per-model usage (keyed by sessionId, summed across auto-reclaim relaunches).
   */
  onStop(ticketId: string, sessionId: string | null, usageByModel: Record<string, AgentTurnUsage>): void;
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

/** Cap on the per-session live transcript (oldest lines trimmed past this so memory stays bounded). */
const TRANSCRIPT_MAX_CHARS = 200_000;
/** How much of a tool-call input to inline in the transcript before truncating. */
const TOOL_INPUT_PREVIEW = 200;

function previewToolInput(input: unknown): string {
  if (input === undefined || input === null) return "";
  let text: string;
  try {
    text = typeof input === "string" ? input : JSON.stringify(input);
  } catch {
    return "";
  }
  const oneLine = text.replace(/\s+/g, " ").trim();
  return oneLine.length > TOOL_INPUT_PREVIEW ? `${oneLine.slice(0, TOOL_INPUT_PREVIEW)}…` : oneLine;
}

/**
 * Render one parsed stream event as a transcript line for the read-only live viewer. Returns null for
 * events that add no readable line (the `init` boundary). This is the structured replacement for the
 * tmux TUI pane: assistant prose, thinking, tool calls, turn boundaries, rate limits and errors.
 */
export function renderSessionEvent(event: AgentSessionEvent): string | null {
  switch (event.type) {
    case "init":
      return null;
    case "assistant_text":
      return event.text.trim() ? event.text.trimEnd() : null;
    case "thinking":
      return event.text.trim() ? `💭 ${event.text.trim()}` : null;
    case "tool_use": {
      const preview = previewToolInput(event.input);
      return preview ? `🔧 ${event.name}(${preview})` : `🔧 ${event.name}`;
    }
    case "turn_end":
      return event.ok ? "—— fin du tour ——" : `—— tour interrompu (${event.subtype}) ——`;
    case "rate_limit":
      return `⏳ rate limit : ${event.status}`;
    case "error":
      return `⚠️ ${event.message}`;
  }
}

export class SessionHub {
  private readonly sessions = new Map<string, LiveSession>();
  /** Per-session live transcript (rendered stream events), read by the polled agent viewer. */
  private readonly transcripts = new Map<string, string>();
  private handlers: SessionHubHandlers | null = null;

  constructor(private readonly system: SystemAdapter) {}

  setHandlers(handlers: SessionHubHandlers): void {
    this.handlers = handlers;
  }

  isConnected(ticketId: string): boolean {
    return this.sessions.has(ticketId);
  }

  /** The rendered live transcript for a session id (ticket id, triage ticket id, or feasibility batch id). */
  getTranscript(id: string): string {
    return this.transcripts.get(id) ?? "";
  }

  /** Start an agent session for a ticket. Replaces any prior session for the same ticket (reclaim). */
  start(config: SessionStartConfig): void {
    this.disconnect(config.ticketId);
    // A fresh session starts a fresh transcript (a relaunch must not stack on the dead run's output).
    this.transcripts.delete(config.ticketId);
    const handle = this.system.startAgentSession({
      ticketId: config.ticketId,
      slotId: config.slotId,
      cwd: config.cwd,
      provider: config.provider,
      model: config.model,
      effort: config.effort,
      permissionMode: config.permissionMode,
      ...(config.permissionAllow ? { permissionAllow: config.permissionAllow } : {}),
      ...(config.permissionDeny ? { permissionDeny: config.permissionDeny } : {}),
      ...(config.allowedTools ? { allowedTools: config.allowedTools } : {}),
      ...(config.disallowedTools ? { disallowedTools: config.disallowedTools } : {}),
      ...(config.skills ? { skills: config.skills } : {}),
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

  /** Stop and evict every live session (desktop shutdown). */
  disconnectAll(): void {
    for (const ticketId of [...this.sessions.keys()]) this.disconnect(ticketId);
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

  private handleEvent(ticketId: string, _slotId: number, event: AgentSessionEvent): void {
    const live = this.sessions.get(ticketId);
    if (event.type === "init") {
      if (live) live.sessionId = event.sessionId;
      log.info("session init", { ticketId, sessionId: event.sessionId });
    }
    const line = renderSessionEvent(event);
    if (line !== null) this.appendTranscript(ticketId, line);
    if (event.type === "turn_end") {
      // The turn_end carries its own sessionId (from the SDK result), so a turn that flushes AFTER
      // disconnect (graceful close on done/fail) still persists its usage even though the session
      // entry is already evicted from the map.
      this.handlers?.onStop(ticketId, event.sessionId, event.usageByModel);
    }
  }

  /** Append a rendered line to a session's transcript, trimming the oldest lines past the cap. */
  private appendTranscript(id: string, line: string): void {
    const next = `${this.transcripts.get(id) ?? ""}${line}\n`;
    this.transcripts.set(id, next.length > TRANSCRIPT_MAX_CHARS ? next.slice(-TRANSCRIPT_MAX_CHARS) : next);
  }
}
