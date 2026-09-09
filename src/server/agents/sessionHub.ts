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
import { getErrorMessage, getErrorStack } from "../../shared/errors.ts";
import type { ChannelEvent, WorkerToolName } from "../../shared/protocol.ts";
import type { ExecutionOwnerType } from "../../shared/schemas.ts";
import type { TranscriptUpdate } from "../../shared/transcript.ts";
import { TranscriptBuffer } from "./transcriptBuffer.ts";
import { createLogger } from "../logger.ts";
import type {
  AgentPermissionMode,
  AgentSessionEvent,
  AgentSessionHandle,
  AgentSessionRole,
  AgentSubagentDefinition,
  AgentTurnUsage,
  StdioMcpServerDefinition,
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
  serviceTier?: "default" | "fast";
  delegateProvider?: Implementer;
  delegateModel?: string | null;
  delegateEffort?: string | null;
  delegateServiceTier?: "default" | "fast";
  /** Security/lifecycle role applied by both providers. */
  role: AgentSessionRole;
  ownerType?: ExecutionOwnerType;
  ownerId?: string;
  permissionMode: AgentPermissionMode;
  /** Structurally read-only session (Codex read-only sandbox; Claude enforces via tool gating). */
  readOnly?: boolean;
  blockReviewPublishing?: boolean;
  blockTypecheck?: boolean;
  /** Resume the provider-side conversation with this id (auto-reclaim; Codex only). */
  resumeSessionId?: string;
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
  /** Additional stdio MCP servers for the session (e.g. Playwright for verify tickets). Claude only. */
  extraMcpServers?: Record<string, StdioMcpServerDefinition>;
}

export interface SessionToolCall {
  ticketId: string;
  slotId: number;
  callId: string;
  generation: number;
  generationId: string;
  name: WorkerToolName;
  args: unknown;
}

export type ExecutionFinishStatus = "completed" | "failed" | "cancelled";

export interface SessionExecutionContext {
  ticketId: string;
  slotId: number;
  generation: number;
  generationId: string;
  sessionId: string | null;
  configuredServiceTier: string | null;
  role: AgentSessionRole;
  ownerType: ExecutionOwnerType;
  ownerId: string;
  provider: SessionStartConfig["provider"];
  model: string;
  effort: string | null;
  serviceTier: "default" | "fast";
  delegateProvider: Implementer | null;
  delegateModel: string | null;
  delegateEffort: string | null;
  delegateServiceTier: "default" | "fast" | null;
}

export interface SessionExecutionFinish extends SessionExecutionContext {
  status: ExecutionFinishStatus;
  usageByModel: Record<string, AgentTurnUsage>;
  error: string | null;
}

export interface SessionExecutionUsage extends SessionExecutionContext {
  usageByModel: Record<string, AgentTurnUsage>;
}

export interface PendingSessionMessage {
  messageId: string;
  generationId: string;
  channel: ChannelEvent["type"];
  content: string;
}

export interface SessionMessageContext extends SessionExecutionContext, PendingSessionMessage {}

export interface SessionMessageStatus extends SessionExecutionContext {
  messageId: string;
  messageGenerationId: string;
  channel: ChannelEvent["type"];
  status: "received" | "accepted" | "rejected";
  turnId: string | null;
  error: string | null;
}

export interface SessionStartCallbacks {
  onInit?(context: SessionExecutionContext): void;
  onFailure?(message: string, context: SessionExecutionContext): void;
}

export interface SessionHubHandlers {
  /** Route a worker tool call to the backend; the returned text is what the agent sees. */
  onToolCall(call: SessionToolCall): Promise<{ ok: boolean; result: string }>;
  /**
   * A turn ended (the SDK `result` message): drives the auto-nudge → stalled escalation and persists
   * the turn's per-model usage (keyed by sessionId, summed across auto-reclaim relaunches).
   */
  onStop(ticketId: string, sessionId: string | null, usageByModel: Record<string, AgentTurnUsage>): void;
  /**
   * Live stream activity (tool calls, prose, thinking) from the session, throttled. Heartbeats
   * lastProgressAt so reclaim/watchdog treat a busy session as alive: a parent legitimately waiting
   * on background sub-agents (argus reviewers) emits no protocol call for 10+ min and was otherwise
   * killed mid-review and relaunched from scratch (observed: PR review ran twice, ~11 min wasted).
   */
  onActivity(ticketId: string): void;
  /** Persist the immutable run identity before the provider is created. */
  onExecutionStart?(context: SessionExecutionContext): void;
  /** Persist the provider-side conversation id as soon as init arrives. */
  onExecutionInit?(context: SessionExecutionContext): void;
  /** Surface fatal transport/runtime failures to the manager that owns the current generation. */
  onExecutionFailure?(message: string, context: SessionExecutionContext): void;
  /** Persist one generation's final usage after its handle has closed. */
  onExecutionFinish?(context: SessionExecutionFinish): void;
  /** Checkpoint cumulative usage after each turn, including a stale generation finishing cleanly. */
  onExecutionUsage?(context: SessionExecutionUsage): void;
  /** Persist one outbound channel message before it is handed to the provider. */
  onMessageQueued?(context: SessionMessageContext): void;
  /** Persist transport acceptance separately from semantic application by the agent. */
  onMessageStatus?(context: SessionMessageStatus): void;
  /** Recover messages that were never accepted, preserving their original client id. */
  getPendingMessages?(context: SessionExecutionContext): PendingSessionMessage[];
  /** Persist a trace when one stream-event handler threw; the hub swallows the error either way. */
  onHandlerError?(context: SessionHandlerError): void;
}

export interface SessionHandlerError {
  ticketId: string;
  eventType: AgentSessionEvent["type"];
  handler: string;
  error: string;
}

interface LiveSession {
  handle: AgentSessionHandle | null;
  slotId: number;
  sessionId: string | null;
  configuredServiceTier: string | null;
  generation: number;
  generationId: string;
  config: SessionStartConfig;
  callbacks: SessionStartCallbacks;
  usageByModel: Record<string, AgentTurnUsage>;
  error: string | null;
  messageMetadata: Map<string, { channel: ChannelEvent["type"]; generationId: string }>;
  replayedTicket: boolean;
  /** Last time this session's stream activity heartbeated the ticket (throttle state). */
  lastActivityAt: number;
}

/** Render the end of one implementation lot: keep the parent parked while other lots still run. */
function renderImplementationDone(event: Extract<ChannelEvent, { type: "implementation_done" }>): string {
  const summary = event.summary || "(aucun résumé)";
  const remainingLots = `${event.remaining} ${event.remaining > 1 ? "lots" : "lot"}`;
  if (!event.ok) {
    const nextStep = event.remaining > 0
      ? `Il reste ${remainingLots} en cours : TERMINE ton tour et attends leurs événements implementation_done avant de décider si tu relances ce lot UNE seule fois (delegate_implementation avec le même label «${event.label}») ; sinon implémente-le toi-même ou appelle fail().`
      : `Relance delegate_implementation UNE seule fois avec le même label «${event.label}» si l'échec semble transitoire ; sinon implémente toi-même ou appelle fail().`;
    return `Implémentation déléguée ÉCHOUÉE (lot «${event.label}») : ${summary}\n${nextStep}`;
  }
  if (event.remaining > 0) {
    return `Lot «${event.label}» terminé : la session Codex a rendu la main. Résumé : ${summary}\nIl reste ${remainingLots} en cours : TERMINE ton tour et attends leurs événements implementation_done avant de relire le diff.`;
  }
  return `Lot «${event.label}» terminé : la session Codex a rendu la main. Résumé : ${summary}\nTous les lots sont terminés. Implémentation déléguée terminée : reprends la main — relis le diff produit (git diff), comble les manques toi-même si l'implémentation est partielle, puis poursuis le contrat (review).`;
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
    case "implementation_done":
      return renderImplementationDone(event);
    case "review_done": {
      const label = `review ${event.kind}`;
      if (!event.ok) return `${label} ÉCHOUÉE : ${event.summary}`;
      const findings = event.findings.length > 0 ? `\nFindings :\n${event.findings.map((finding) => `- ${finding.severity} — ${finding.path ?? "(contexte)"}${finding.line ? `:${finding.line}` : ""} : ${finding.summary} — ${finding.evidence}${finding.ruleSource ? ` (règle : ${finding.ruleSource})` : ""}`).join("\n")}` : "";
      return `${label} terminée (passe ${event.passId}) — verdict ${event.verdict ?? "inconnu"} : ${event.summary}${findings}`;
    }
    case "nudge":
      return event.message;
    case "user_comment":
      return `Commentaire de l'utilisateur (à prendre en compte dans le travail en cours) : ${event.body}`;
  }
}

/** Min interval between two lastProgressAt heartbeats driven by session stream activity (mirrors the delegation child heartbeat). */
const ACTIVITY_HEARTBEAT_MIN_INTERVAL_MS = 30_000;

/** Cap on the per-session live transcript (oldest lines trimmed past this so memory stays bounded). */
const TRANSCRIPT_SESSION_LIMIT = 100;
const SESSION_CLOSE_TIMEOUT_MS = 65_000;
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
export function renderSessionEvent(event: AgentSessionEvent, messageChannel?: ChannelEvent["type"]): string | null {
  switch (event.type) {
    case "init":
      return null;
    case "assistant_text":
      return event.text.trim() ? event.text.trimEnd() : null;
    case "thinking":
      return event.text.trim() ? `💭 ${event.text.trim()}` : null;
    case "progress":
      return event.message.trim() ? `… ${event.message.trim()}` : null;
    case "message_status":
      if (event.status === "received") {
        return `↪ message ${messageChannel ?? "channel"} ${event.messageId} mis en file par le runtime`;
      }
      if (event.status === "accepted") {
        const turn = event.turnId ? ` pour le tour ${event.turnId}` : "";
        return `✓ message ${messageChannel ?? "channel"} ${event.messageId} accepté par le fournisseur${turn} (application sémantique non garantie)`;
      }
      return `⚠️ message ${messageChannel ?? "channel"} ${event.messageId} rejeté avant acceptation${event.error ? ` : ${event.error}` : ""}`;
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
  private readonly closingSessions = new Set<Promise<void>>();
  private readonly generations = new Map<string, number>();
  /** Per-session live transcript (rendered stream events), read by the polled agent viewer. */
  private readonly transcripts = new Map<string, TranscriptBuffer>();
  private handlers: SessionHubHandlers | null = null;
  /** Fired on every disconnect(ticketId) — lets attached child work (delegation) die with the parent. */
  private readonly disconnectListeners: Array<(ticketId: string) => void> = [];

  constructor(private readonly system: SystemAdapter, private readonly closeTimeoutMs = SESSION_CLOSE_TIMEOUT_MS) {}

  setHandlers(handlers: SessionHubHandlers): void {
    this.handlers = handlers;
  }

  onDisconnect(listener: (ticketId: string) => void): void {
    this.disconnectListeners.push(listener);
  }

  isConnected(ticketId: string): boolean {
    return this.sessions.has(ticketId);
  }

  /** The rendered live transcript for a session id (ticket id, triage ticket id, or feasibility batch id). */
  getTranscript(id: string): string {
    return this.transcripts.get(id)?.text() ?? "";
  }

  getTranscriptUpdate(id: string, cursor?: string): TranscriptUpdate {
    return this.transcript(id).read(cursor);
  }

  private transcript(id: string): TranscriptBuffer {
    let buffer = this.transcripts.get(id);
    if (!buffer) {
      buffer = new TranscriptBuffer();
      this.transcripts.set(id, buffer);
      this.trimTranscripts(id);
    }
    return buffer;
  }

  private trimTranscripts(preserveId: string): void {
    for (const key of this.transcripts.keys()) {
      if (this.transcripts.size <= TRANSCRIPT_SESSION_LIMIT) break;
      if (key !== preserveId && !this.sessions.has(key)) this.transcripts.delete(key);
    }
  }

  /** Start an agent session for a ticket. Replaces any prior session for the same ticket (reclaim). */
  start(config: SessionStartConfig, callbacks: SessionStartCallbacks = {}): number {
    this.disconnect(config.ticketId);
    // A fresh session starts a fresh transcript (a relaunch must not stack on the dead run's output).
    this.transcripts.delete(config.ticketId);
    const generation = (this.generations.get(config.ticketId) ?? 0) + 1;
    const generationId = nanoid(16);
    this.generations.set(config.ticketId, generation);
    const live: LiveSession = {
      handle: null,
      slotId: config.slotId,
      sessionId: null,
      configuredServiceTier: null,
      generation,
      generationId,
      config,
      callbacks,
      usageByModel: {},
      error: null,
      messageMetadata: new Map(),
      replayedTicket: false,
      lastActivityAt: 0,
    };
    this.sessions.set(config.ticketId, live);
    let executionStarted = false;
    try {
      this.handlers?.onExecutionStart?.(this.executionContext(live));
      executionStarted = true;
      live.handle = this.system.startAgentSession({
        ticketId: config.ticketId,
        slotId: config.slotId,
        cwd: config.cwd,
        provider: config.provider,
        model: config.model,
        effort: config.effort,
        serviceTier: config.serviceTier ?? "default",
        role: config.role,
        generation,
        permissionMode: config.permissionMode,
        ...(config.readOnly !== undefined ? { readOnly: config.readOnly } : {}),
        ...(config.blockReviewPublishing ? { blockReviewPublishing: true } : {}),
        ...(config.blockTypecheck ? { blockTypecheck: true } : {}),
        ...(config.resumeSessionId ? { resumeSessionId: config.resumeSessionId } : {}),
        ...(config.permissionAllow ? { permissionAllow: config.permissionAllow } : {}),
        ...(config.permissionDeny ? { permissionDeny: config.permissionDeny } : {}),
        ...(config.allowedTools ? { allowedTools: config.allowedTools } : {}),
        ...(config.disallowedTools ? { disallowedTools: config.disallowedTools } : {}),
        ...(config.skills ? { skills: config.skills } : {}),
        ...(config.agents ? { agents: config.agents } : {}),
        ...(config.extraMcpServers ? { extraMcpServers: config.extraMcpServers } : {}),
        onToolCall: (name, args) => this.routeToolCall(config.ticketId, config.slotId, generation, name, args),
        onEvent: (event) => this.handleEvent(live, event),
      });
      this.replayPendingMessages(live);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      live.error = message;
      this.sessions.delete(config.ticketId);
      if (executionStarted) this.trackClose(live, "failed");
      callbacks.onFailure?.(message, this.executionContext(live));
      throw error;
    }
    return generation;
  }

  /** Inject a backend channel event as a user turn. False when no live session exists for the ticket. */
  sendEvent(ticketId: string, event: ChannelEvent): boolean {
    const live = this.sessions.get(ticketId);
    if (!live?.handle) return false;
    if (event.type === "ticket" && live.replayedTicket) {
      live.replayedTicket = false;
      return true;
    }
    const messageId = nanoid(16);
    const content = renderChannelEvent(event);
    const context = { ...this.executionContext(live), messageId, channel: event.type, content };
    try {
      this.handlers?.onMessageQueued?.(context);
      live.messageMetadata.set(messageId, { channel: event.type, generationId: live.generationId });
      const sentMessageId = live.handle.send(content, messageId);
      if (sentMessageId !== messageId) throw new Error("Le provider n'a pas conservé l'identifiant du message.");
      return true;
    } catch (error) {
      const message = getErrorMessage(error);
      log.warn("injection du message impossible", { ticketId, messageId, channel: event.type, reason: message });
      this.safeHandler("onMessageStatus", ticketId, "message_status", () => {
        this.handlers?.onMessageStatus?.({
          ...context,
          messageGenerationId: context.generationId,
          status: "rejected",
          turnId: null,
          error: message,
        });
      });
      return false;
    }
  }

  /** Preempt the current turn (urgent stop/nudge). No-op when the session is gone. */
  async interrupt(ticketId: string): Promise<void> {
    await this.sessions.get(ticketId)?.handle?.interrupt();
  }

  /** Stop and evict a ticket's session. Idempotent. */
  disconnect(ticketId: string, status: ExecutionFinishStatus = "cancelled"): void {
    // Listeners fire even without a live session: a slot release must cascade to attached child
    // sessions (delegation) even if the parent session already died on its own.
    for (const listener of this.disconnectListeners) {
      try {
        listener(ticketId);
      } catch (error) {
        log.warn("fermeture de session enfant impossible", { ticketId, reason: String(error) });
      }
    }
    const live = this.sessions.get(ticketId);
    if (!live) return;
    this.sessions.delete(ticketId);
    this.trimTranscripts(ticketId);
    this.trackClose(live, status);
  }

  private trackClose(live: LiveSession, status: ExecutionFinishStatus): void {
    const closing = this.closeSession(live, status);
    this.closingSessions.add(closing);
    void closing.finally(() => this.closingSessions.delete(closing)).catch((error: unknown) => {
      log.warn("finalisation de session impossible", { reason: String(error) });
    });
  }

  /** Stop and evict every live session (desktop shutdown). */
  disconnectAll(): void {
    for (const ticketId of [...this.sessions.keys()]) this.disconnect(ticketId);
  }

  async drainClosingSessions(): Promise<void> {
    while (this.closingSessions.size > 0) await Promise.allSettled([...this.closingSessions]);
  }

  getExecutionConfig(ticketId: string): Pick<SessionExecutionContext, "provider" | "model" | "effort" | "serviceTier" | "delegateProvider" | "delegateModel" | "delegateEffort" | "delegateServiceTier"> | null {
    const live = this.sessions.get(ticketId);
    if (!live) return null;
    const { provider, model, effort, serviceTier, delegateProvider, delegateModel, delegateEffort, delegateServiceTier } = this.executionContext(live);
    return { provider, model, effort, serviceTier, delegateProvider, delegateModel, delegateEffort, delegateServiceTier };
  }

  private async routeToolCall(
    ticketId: string,
    slotId: number,
    generation: number,
    name: WorkerToolName,
    args: unknown,
  ): Promise<{ ok: boolean; result: string }> {
    const current = this.sessions.get(ticketId);
    if (!current || current.generation !== generation) {
      return { ok: false, result: "génération de session périmée" };
    }
    if (!this.handlers) return { ok: false, result: "backend non prêt" };
    return this.handlers.onToolCall({
      ticketId,
      slotId,
      generation,
      generationId: current.generationId,
      callId: nanoid(8),
      name,
      args,
    });
  }

  /**
   * Run one stream-event handler in isolation: a throwing handler (a locked SQLite write, a failing
   * zod parse) must never propagate back into the provider's read loop and kill the session.
   */
  private safeHandler(name: string, ticketId: string, eventType: AgentSessionEvent["type"], run: () => void): void {
    try {
      run();
    } catch (error) {
      const message = getErrorMessage(error);
      log.error("gestionnaire d'événement de session en échec", {
        ticketId,
        event: eventType,
        handler: name,
        stack: getErrorStack(error),
      });
      try {
        this.handlers?.onHandlerError?.({ ticketId, eventType, handler: name, error: message });
      } catch (traceError) {
        log.warn("trace d'erreur de gestionnaire non persistée", { ticketId, reason: getErrorMessage(traceError) });
      }
    }
  }

  private handleEvent(live: LiveSession, event: AgentSessionEvent): void {
    const ticketId = live.config.ticketId;
    const current = this.sessions.get(ticketId) === live;
    if (event.type === "init") {
      live.sessionId = event.sessionId;
      live.configuredServiceTier = event.configuredServiceTier ?? null;
      const context = this.executionContext(live);
      if (current) this.safeHandler("onInit", ticketId, event.type, () => live.callbacks.onInit?.(context));
      this.safeHandler("onExecutionInit", ticketId, event.type, () => this.handlers?.onExecutionInit?.(context));
      log.info("session init", { ticketId, generation: live.generation, sessionId: event.sessionId });
    }
    if (event.type === "message_status") {
      const metadata = live.messageMetadata.get(event.messageId);
      if (metadata) {
        this.safeHandler("onMessageStatus", ticketId, event.type, () => {
          this.handlers?.onMessageStatus?.({
            ...this.executionContext(live),
            messageId: event.messageId,
            messageGenerationId: metadata.generationId,
            channel: metadata.channel,
            status: event.status,
            turnId: event.turnId,
            error: event.status === "rejected" ? "message rejeté par le provider" : null,
          });
        });
      }
    }
    const messageChannel = event.type === "message_status" ? live.messageMetadata.get(event.messageId)?.channel : undefined;
    if (current) {
      this.safeHandler("transcript", ticketId, event.type, () => {
        this.appendExternalEvent(ticketId, live.generationId, event, "", messageChannel);
      });
    }
    if (current && (event.type === "tool_use" || event.type === "assistant_text" || event.type === "thinking" || event.type === "progress")) {
      const now = Date.now();
      if (now - live.lastActivityAt >= ACTIVITY_HEARTBEAT_MIN_INTERVAL_MS) {
        live.lastActivityAt = now;
        this.safeHandler("onActivity", ticketId, event.type, () => this.handlers?.onActivity(ticketId));
      }
    }
    if (event.type === "turn_end") {
      live.usageByModel = mergeAgentUsageByModel(live.usageByModel, event.usageByModel);
      this.safeHandler("onExecutionUsage", ticketId, event.type, () => {
        this.handlers?.onExecutionUsage?.({
          ...this.executionContext(live),
          usageByModel: live.usageByModel,
        });
      });
      if (current) {
        this.safeHandler("onStop", ticketId, event.type, () => {
          this.handlers?.onStop(ticketId, event.sessionId, event.usageByModel);
        });
      }
    }
    if (event.type === "error") {
      live.error = event.message;
      if (current) {
        this.safeHandler("onFailure", ticketId, event.type, () => {
          live.callbacks.onFailure?.(event.message, this.executionContext(live));
        });
        this.safeHandler("onExecutionFailure", ticketId, event.type, () => {
          this.handlers?.onExecutionFailure?.(event.message, this.executionContext(live));
        });
      }
    }
  }

  private executionContext(live: LiveSession): SessionExecutionContext {
    return {
      ticketId: live.config.ticketId,
      slotId: live.slotId,
      generation: live.generation,
      generationId: live.generationId,
      sessionId: live.sessionId,
      configuredServiceTier: live.configuredServiceTier,
      role: live.config.role,
      ownerType: live.config.ownerType ?? "ticket",
      ownerId: live.config.ownerId ?? live.config.ticketId,
      provider: live.config.provider,
      model: live.config.model,
      effort: live.config.effort,
      serviceTier: live.config.serviceTier ?? "default",
      delegateProvider: live.config.delegateProvider ?? null,
      delegateModel: live.config.delegateModel ?? null,
      delegateEffort: live.config.delegateEffort ?? null,
      delegateServiceTier: live.config.delegateServiceTier ?? null,
    };
  }

  private replayPendingMessages(live: LiveSession): void {
    if (!live.handle) return;
    const pending = this.handlers?.getPendingMessages?.(this.executionContext(live)) ?? [];
    for (const message of pending) {
      live.messageMetadata.set(message.messageId, {
        channel: message.channel,
        generationId: message.generationId,
      });
      if (message.channel === "ticket") live.replayedTicket = true;
      const sentMessageId = live.handle.send(message.content, message.messageId);
      if (sentMessageId !== message.messageId) {
        throw new Error("Le provider n'a pas conservé l'identifiant d'un message repris.");
      }
    }
  }

  private async closeSession(live: LiveSession, status: ExecutionFinishStatus): Promise<void> {
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      await Promise.race([
        live.handle?.close(),
        new Promise<never>((_, reject) => {
          timer = setTimeout(() => reject(new Error("Délai de fermeture de session dépassé")), this.closeTimeoutMs);
          timer.unref();
        }),
      ]);
    } catch (error) {
      live.error ??= error instanceof Error ? error.message : String(error);
      live.handle?.dispose?.();
      log.warn("fermeture de session incomplète", { ticketId: live.config.ticketId, reason: live.error });
    } finally {
      if (timer) clearTimeout(timer);
      this.handlers?.onExecutionFinish?.({
        ...this.executionContext(live),
        status: live.error ? "failed" : status,
        usageByModel: live.usageByModel,
        error: live.error,
      });
    }
  }

  appendExternalEvent(id: string, sourceId: string, event: AgentSessionEvent, prefix = "", messageChannel?: ChannelEvent["type"]): void {
    const label = prefix.trim().replace(/^⟨|⟩$/g, "");
    const sourcePrefix = label ? `⟨${label}⟩ ` : event.sourceId ? `⟨agent ${event.sourceId}⟩ ` : "";
    const blockSource = event.sourceId ? `${sourceId}:${event.sourceId}` : sourceId;
    if ((event.type === "assistant_text" || event.type === "thinking" || event.type === "progress") && event.stream) {
      const text = event.type === "progress" ? event.message : event.text;
      const marker = event.type === "thinking" ? "💭 " : event.type === "progress" ? "… " : "";
      this.transcript(id).append(text, sourcePrefix + marker, event.stream, blockSource);
      return;
    }
    const line = renderSessionEvent(event, messageChannel);
    if (line !== null) this.transcript(id).append(line, sourcePrefix);
  }

  /** Append a standalone status line, separate from streaming text blocks. */
  appendExternalLine(id: string, line: string): void {
    this.appendTranscript(id, line);
  }

  private appendTranscript(id: string, line: string): void {
    this.transcript(id).append(line);
  }
}

export function mergeAgentUsageByModel(
  current: Record<string, AgentTurnUsage>,
  incoming: Record<string, AgentTurnUsage>,
): Record<string, AgentTurnUsage> {
  const merged = { ...current };
  for (const [model, usage] of Object.entries(incoming)) {
    const previous = merged[model];
    merged[model] = previous
      ? {
          inputTokens: previous.inputTokens + usage.inputTokens,
          outputTokens: previous.outputTokens + usage.outputTokens,
          cacheReadTokens: previous.cacheReadTokens + usage.cacheReadTokens,
          cacheCreationTokens: previous.cacheCreationTokens + usage.cacheCreationTokens,
          costUsd: previous.costUsd === null || usage.costUsd === null ? null : previous.costUsd + usage.costUsd,
        }
      : usage;
  }
  return merged;
}
