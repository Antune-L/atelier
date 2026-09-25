import { nanoid } from "nanoid";
import { z } from "zod";

import { getErrorMessage } from "../../shared/errors.ts";
import { compileFeedback } from "../../shared/prdFeedback.ts";
import type { Conversation, ConversationMessage, PrdDocument } from "../../shared/schemas.ts";
import type { ProjectConfig } from "../config.ts";
import { MODELS, getProject, isProjectKey } from "../config.ts";
import type { ConversationPatch, Store } from "../db/store.ts";
import type { ClientHub } from "../hub.ts";
import { createLogger } from "../logger.ts";
import type { AgentSessionEvent } from "../system/agentSession.ts";
import type { SystemAdapter } from "../system/types.ts";

import { buildAtelierConsolidateTurn, buildAtelierPrompt, buildAtelierRegenerationTurn } from "./atelier.ts";
import { assertExecutionAvailable, resolveExecution } from "./executionConfig.ts";
import type { ExecutionDefaults } from "./executionConfig.ts";
import { atelierSessionKey, buildAtelierSessionConfig } from "./sessionConfig.ts";
import type { SessionHub } from "./sessionHub.ts";

const log = createLogger("atelier");

export const ATELIER_IDLE_TIMEOUT_MS = 30 * 60 * 1000;
const ASSISTANT_FLUSH_INTERVAL_MS = 150;
const ACTIVITY_MAX_LENGTH = 160;
const ELLIPSIS = "…";
const PART_SEPARATOR = "\n\n";
const TOOL_DETAIL_KEYS = ["file_path", "path", "pattern", "query", "url", "command", "description"] as const;
// NOTE(ali): Codex also reports command/file/mcp items as tool_use, so only plan/subagent progress adds information.
const ACTIVITY_PROGRESS_KINDS: ReadonlySet<string> = new Set(["plan", "subagent"]);
const CONSOLIDATE_LABEL = "Consolider en PRD";
const SESSION_UNAVAILABLE_MESSAGE = "Session de l'Atelier indisponible : renvoie ton message.";

const toolInputSchema = z.record(z.string(), z.unknown());

interface AssistantPart {
  key: string | null;
  text: string;
}

interface TurnState {
  turnId: string | null;
  messageId: string | null;
  parts: AssistantPart[];
  dirty: boolean;
}

interface ConversationRuntime {
  turn: TurnState;
  lastUserTurnId: string | null;
  flushTimer: ReturnType<typeof setTimeout> | null;
  idleTimer: ReturnType<typeof setTimeout> | null;
  resumed: boolean;
}

export interface AtelierManagerDeps {
  store: Store;
  hub: ClientHub;
  sessionHub: SessionHub;
  system: Pick<SystemAdapter, "checkCodexRuntime">;
  getProject?: (key: string) => ProjectConfig | null;
  defaults?: () => ExecutionDefaults;
  idleTimeoutMs?: number;
  flushIntervalMs?: number;
}

export interface SubmittedTurn {
  message: ConversationMessage;
  delivered: Promise<void>;
}

function emptyTurn(): TurnState {
  return { turnId: null, messageId: null, parts: [], dirty: false };
}

function truncate(text: string): string {
  const oneLine = text.replace(/\s+/g, " ").trim();
  return oneLine.length > ACTIVITY_MAX_LENGTH ? `${oneLine.slice(0, ACTIVITY_MAX_LENGTH - ELLIPSIS.length)}${ELLIPSIS}` : oneLine;
}

export function describeToolUse(name: string, input: unknown): string {
  const parsed = toolInputSchema.safeParse(input);
  if (!parsed.success) return truncate(name);
  for (const key of TOOL_DETAIL_KEYS) {
    const value = parsed.data[key];
    if (typeof value === "string" && value.trim()) return truncate(`${name} ${value}`);
  }
  return truncate(name);
}

function labelWithNote(label: string, note: string | undefined): string {
  return note ? `${label}${PART_SEPARATOR}${note}` : label;
}

function defaultProjectLookup(key: string): ProjectConfig | null {
  return isProjectKey(key) ? getProject(key) : null;
}

function defaultExecutionDefaults(): ExecutionDefaults {
  return { model: MODELS.implement, effort: MODELS.implementEffort };
}

export class AtelierManager {
  private readonly runtimes = new Map<string, ConversationRuntime>();
  private readonly starting = new Map<string, Promise<boolean>>();
  private readonly store: Store;
  private readonly hub: ClientHub;
  private readonly sessionHub: SessionHub;
  private readonly system: Pick<SystemAdapter, "checkCodexRuntime">;
  private readonly lookupProject: (key: string) => ProjectConfig | null;
  private readonly defaults: () => ExecutionDefaults;
  private readonly idleTimeoutMs: number;
  private readonly flushIntervalMs: number;

  constructor(deps: AtelierManagerDeps) {
    this.store = deps.store;
    this.hub = deps.hub;
    this.sessionHub = deps.sessionHub;
    this.system = deps.system;
    this.lookupProject = deps.getProject ?? defaultProjectLookup;
    this.defaults = deps.defaults ?? defaultExecutionDefaults;
    this.idleTimeoutMs = deps.idleTimeoutMs ?? ATELIER_IDLE_TIMEOUT_MS;
    this.flushIntervalMs = deps.flushIntervalMs ?? ASSISTANT_FLUSH_INTERVAL_MS;
  }

  recoverStale(): void {
    for (const conversation of this.store.listConversations()) {
      if (conversation.sessionStatus === "running") this.store.updateConversation(conversation.id, { sessionStatus: "idle" });
    }
  }

  postMessage(conversationId: string, content: string): SubmittedTurn {
    return this.submitTurn(conversationId, content, content);
  }

  consolidate(conversationId: string, feedback?: string): SubmittedTurn {
    const note = feedback?.trim();
    return this.submitTurn(conversationId, labelWithNote(CONSOLIDATE_LABEL, note), buildAtelierConsolidateTurn(note));
  }

  regenerate(prdId: string): SubmittedTurn {
    const prd = this.store.getPrdDocument(prdId);
    if (!prd) throw new Error("PRD introuvable");
    const feedback = compileFeedback(prd.annotations, prd.generalNote);
    const visible = labelWithNote(`Régénérer le PRD (révision ${prd.revision})`, feedback);
    return this.submitTurn(prd.conversationId, visible, buildAtelierRegenerationTurn(feedback));
  }

  async interrupt(conversationId: string): Promise<void> {
    await this.sessionHub.interrupt(atelierSessionKey(conversationId));
    this.flush(conversationId);
    this.patchConversation(conversationId, { sessionStatus: "idle" });
  }

  settingsChanged(conversationId: string): void {
    this.closeSession(conversationId);
    const conversation = this.store.getConversation(conversationId);
    if (!conversation) return;
    const patch: ConversationPatch = { sessionId: null };
    if (conversation.sessionStatus === "running") patch.sessionStatus = "idle";
    this.patchConversation(conversationId, patch);
  }

  close(conversationId: string): void {
    this.closeSession(conversationId);
    this.runtimes.delete(conversationId);
  }

  stop(): void {
    for (const runtime of this.runtimes.values()) {
      if (runtime.flushTimer) clearTimeout(runtime.flushTimer);
      if (runtime.idleTimer) clearTimeout(runtime.idleTimer);
      runtime.flushTimer = null;
      runtime.idleTimer = null;
    }
  }

  handleSubmitPrd(conversationId: string, document: PrdDocument): string {
    const record = this.store.createPrdDocument({ conversationId, document });
    this.hub.pushPrdDocument(record);
    this.patchConversation(conversationId, { status: "prd_draft" });
    log.info("PRD enregistré", { conversationId, revision: record.revision });
    return `PRD révision ${record.revision} enregistré. L'utilisateur va le relire et l'annoter dans l'Atelier ; résume-lui brièvement son contenu. Une éventuelle demande de régénération t'arrivera avec ses retours.`;
  }

  handleFail(conversationId: string, reason: string): string {
    this.markError(conversationId, reason);
    return "Échec enregistré : l'utilisateur en est informé.";
  }

  private submitTurn(conversationId: string, visible: string, agentContent: string): SubmittedTurn {
    if (!this.store.getConversation(conversationId)) throw new Error("conversation introuvable");
    const turnId = nanoid(10);
    const message = this.store.addConversationMessage({ conversationId, role: "user", content: visible, turnId });
    this.hub.pushConversationMessage(message);
    const runtime = this.runtime(conversationId);
    runtime.lastUserTurnId = turnId;
    this.clearIdleTimer(runtime);
    this.patchConversation(conversationId, { sessionStatus: "running", error: null });
    return { message, delivered: this.deliver(conversationId, agentContent, message.id) };
  }

  private async deliver(conversationId: string, content: string, messageId: string): Promise<void> {
    try {
      const sentAsFirstTurn = await this.ensureSession(conversationId, content, messageId);
      if (sentAsFirstTurn) return;
      if (!this.sessionHub.sendEvent(atelierSessionKey(conversationId), { type: "chat", content })) {
        throw new Error(SESSION_UNAVAILABLE_MESSAGE);
      }
    } catch (error) {
      this.markError(conversationId, getErrorMessage(error));
    }
  }

  private async ensureSession(conversationId: string, content: string, messageId: string): Promise<boolean> {
    const pending = this.starting.get(conversationId);
    if (pending) await pending.catch(() => false);
    if (this.sessionHub.isConnected(atelierSessionKey(conversationId))) return false;
    const start = this.startSession(conversationId, content, messageId);
    this.starting.set(conversationId, start);
    try {
      return await start;
    } finally {
      if (this.starting.get(conversationId) === start) this.starting.delete(conversationId);
    }
  }

  private async startSession(conversationId: string, content: string, messageId: string): Promise<boolean> {
    const conversation = this.requireConversation(conversationId);
    const project = this.lookupProject(conversation.project);
    if (!project) throw new Error(`Projet inconnu : ${conversation.project}`);
    const execution = resolveExecution(
      "atelier",
      {
        orchestrator: conversation.orchestrator,
        model: conversation.model,
        effort: conversation.effort,
        codexModel: conversation.codexModel,
        codexEffort: conversation.codexEffort,
        codexFast: conversation.codexFast,
      },
      this.defaults(),
    );
    await assertExecutionAvailable(this.system, execution);
    const resumeSessionId = execution.provider === "codex" ? conversation.sessionId : null;
    const key = atelierSessionKey(conversationId);
    this.runtime(conversationId).resumed = resumeSessionId !== null;
    this.sessionHub.start(
      buildAtelierSessionConfig({
        conversationId,
        cwd: project.repoPath,
        model: execution.model,
        effort: execution.effort,
        serviceTier: execution.serviceTier,
        driver: execution.provider,
        researchOptions: conversation.researchOptions,
        resumeSessionId,
      }),
      {
        onEvent: (event) => this.onEvent(conversationId, event),
        onFailure: (reason) => this.onFailure(conversationId, reason),
      },
    );
    log.info("session atelier démarrée", { conversationId, provider: execution.provider, resumed: resumeSessionId !== null });
    if (resumeSessionId) return this.sessionHub.sendEvent(key, { type: "chat", content });
    const history = this.historyBefore(conversationId, messageId);
    const payload = `${buildAtelierPrompt({ conversation, project, history })}${PART_SEPARATOR}${content}`;
    if (!this.sessionHub.sendEvent(key, { type: "ticket", payload })) throw new Error(SESSION_UNAVAILABLE_MESSAGE);
    return true;
  }

  private historyBefore(conversationId: string, messageId: string): ConversationMessage[] {
    const messages = this.store.listConversationMessages(conversationId);
    const index = messages.findIndex((message) => message.id === messageId);
    return index === -1 ? messages : messages.slice(0, index);
  }

  private onEvent(conversationId: string, event: AgentSessionEvent): void {
    switch (event.type) {
      case "init":
        this.onInit(conversationId, event.sessionId);
        return;
      case "assistant_text":
        if (event.sourceId) return;
        this.appendAssistant(conversationId, event.text, event.stream?.itemId ?? null, event.stream?.mode === "delta");
        return;
      case "tool_use":
        this.addActivity(conversationId, describeToolUse(event.name, event.input));
        return;
      case "progress":
        if (event.stream || !ACTIVITY_PROGRESS_KINDS.has(event.kind)) return;
        this.addActivity(conversationId, truncate(event.message));
        return;
      case "turn_end":
        this.onTurnEnd(conversationId);
        return;
      default:
        return;
    }
  }

  private onInit(conversationId: string, sessionId: string): void {
    const conversation = this.store.getConversation(conversationId);
    if (!conversation || conversation.sessionId === sessionId) return;
    this.patchConversation(conversationId, { sessionId });
  }

  private openTurn(conversationId: string): TurnState {
    const runtime = this.runtime(conversationId);
    if (runtime.turn.turnId === null) {
      runtime.turn.turnId = runtime.lastUserTurnId;
      this.markRunning(conversationId);
    }
    return runtime.turn;
  }

  private appendAssistant(conversationId: string, text: string, key: string | null, delta: boolean): void {
    const turn = this.openTurn(conversationId);
    const existing = key === null ? undefined : turn.parts.find((part) => part.key === key);
    if (existing) existing.text = delta ? existing.text + text : text;
    else turn.parts.push({ key, text });
    turn.dirty = true;
    this.scheduleFlush(conversationId);
  }

  private addActivity(conversationId: string, content: string): void {
    if (!content) return;
    const turn = this.openTurn(conversationId);
    this.flush(conversationId);
    const message = this.store.addConversationMessage({ conversationId, role: "activity", content, turnId: turn.turnId });
    this.hub.pushConversationMessage(message);
  }

  private onTurnEnd(conversationId: string): void {
    this.flush(conversationId);
    const runtime = this.runtime(conversationId);
    runtime.turn = emptyTurn();
    this.patchConversation(conversationId, { sessionStatus: "idle" });
    this.clearIdleTimer(runtime);
    runtime.idleTimer = setTimeout(() => {
      runtime.idleTimer = null;
      log.info("session atelier fermée après inactivité", { conversationId });
      this.sessionHub.disconnect(atelierSessionKey(conversationId), "completed");
    }, this.idleTimeoutMs);
    runtime.idleTimer.unref?.();
  }

  private onFailure(conversationId: string, reason: string): void {
    const runtime = this.runtime(conversationId);
    this.flush(conversationId);
    runtime.turn = emptyTurn();
    const patch: ConversationPatch = { sessionStatus: "error", error: reason };
    if (runtime.resumed) patch.sessionId = null;
    runtime.resumed = false;
    log.warn("session atelier en échec", { conversationId, reason });
    this.sessionHub.disconnect(atelierSessionKey(conversationId), "failed");
    this.patchConversation(conversationId, patch);
  }

  private markError(conversationId: string, reason: string): void {
    this.flush(conversationId);
    this.patchConversation(conversationId, { sessionStatus: "error", error: reason });
  }

  // NOTE(ali): a queued Claude turn keeps streaming after the previous turn_end marked the conversation idle.
  private markRunning(conversationId: string): void {
    const conversation = this.store.getConversation(conversationId);
    if (conversation && conversation.sessionStatus === "idle") this.patchConversation(conversationId, { sessionStatus: "running" });
  }

  private scheduleFlush(conversationId: string): void {
    const runtime = this.runtime(conversationId);
    if (runtime.flushTimer) return;
    runtime.flushTimer = setTimeout(() => {
      runtime.flushTimer = null;
      this.flush(conversationId);
    }, this.flushIntervalMs);
  }

  private flush(conversationId: string): void {
    const runtime = this.runtimes.get(conversationId);
    if (!runtime) return;
    if (runtime.flushTimer) {
      clearTimeout(runtime.flushTimer);
      runtime.flushTimer = null;
    }
    const turn = runtime.turn;
    if (!turn.dirty) return;
    const content = turn.parts.map((part) => part.text.trim()).filter((text) => text.length > 0).join(PART_SEPARATOR);
    if (!content || !this.store.getConversation(conversationId)) return;
    turn.dirty = false;
    try {
      const message = turn.messageId === null
        ? this.store.addConversationMessage({ conversationId, role: "assistant", content, turnId: turn.turnId })
        : this.store.updateConversationMessage(turn.messageId, { content });
      turn.messageId = message.id;
      this.hub.pushConversationMessage(message);
    } catch (error) {
      log.warn("message assistant non persisté", { conversationId, reason: getErrorMessage(error) });
    }
  }

  private closeSession(conversationId: string): void {
    this.flush(conversationId);
    const runtime = this.runtimes.get(conversationId);
    if (runtime) {
      this.clearIdleTimer(runtime);
      runtime.turn = emptyTurn();
      runtime.resumed = false;
    }
    this.sessionHub.disconnect(atelierSessionKey(conversationId), "cancelled");
  }

  private clearIdleTimer(runtime: ConversationRuntime): void {
    if (runtime.idleTimer) clearTimeout(runtime.idleTimer);
    runtime.idleTimer = null;
  }

  private runtime(conversationId: string): ConversationRuntime {
    let runtime = this.runtimes.get(conversationId);
    if (!runtime) {
      runtime = { turn: emptyTurn(), lastUserTurnId: null, flushTimer: null, idleTimer: null, resumed: false };
      this.runtimes.set(conversationId, runtime);
    }
    return runtime;
  }

  private requireConversation(conversationId: string): Conversation {
    const conversation = this.store.getConversation(conversationId);
    if (!conversation) throw new Error("conversation introuvable");
    return conversation;
  }

  private patchConversation(conversationId: string, patch: ConversationPatch): void {
    if (!this.store.getConversation(conversationId)) return;
    this.hub.pushConversation(this.store.updateConversation(conversationId, patch));
  }
}
