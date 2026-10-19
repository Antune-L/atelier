import { nanoid } from "nanoid";
import { z } from "zod";

import { getErrorMessage } from "../../shared/errors.ts";
import { compileFeedback } from "../../shared/prdFeedback.ts";
import type { WorkerToolName } from "../../shared/protocol.ts";
import type { Conversation, ConversationMessage, PrdDocument } from "../../shared/schemas.ts";
import type { ProjectConfig } from "../config.ts";
import { MODELS, getProject, isProjectKey } from "../config.ts";
import type { ConversationPatch, Store } from "../db/store.ts";
import type { ClientHub } from "../hub.ts";
import { createLogger } from "../logger.ts";
import type { AgentSessionEvent } from "../system/agentSession.ts";
import type { SystemAdapter } from "../system/types.ts";
import type { TicketOperations } from "../ticketOperations.ts";

import { prepareAtelierAttachments } from "./atelierAttachments.ts";
import type { PreparedAtelierAttachments } from "./atelierAttachments.ts";
import { AtelierTicketTools } from "./atelierTicketTools.ts";
import type { BoardRouteHandler } from "./atelierTicketTools.ts";
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
const COMPACT_LABEL = "Compacter le contexte";
export const COMPACT_NO_SESSION_MESSAGE = "Aucune session active à compacter : le contexte sera reconstruit au prochain message.";
export const COMPACT_RUNNING_MESSAGE = "L'agent est en cours de réponse.";
const COMPACT_FAILED_MESSAGE = "Échec du compactage du contexte.";
const tokenFormatter = new Intl.NumberFormat("fr-FR");

/** `85 000`, with a plain space instead of the narrow no-break space Intl emits. */
function formatTokens(tokens: number): string {
  return tokenFormatter.format(tokens).replace(/\s/g, " ");
}

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
  /** Set while a compaction turn runs: context occupancy before, and after once reported. */
  compaction: { before: number | null; after: number | null } | null;
  /** Live background tasks (sub-agents) of the root session, as last reported. */
  backgroundTasks: ReadonlySet<string>;
  /** A turn ended while background tasks were still running: the final notification is deferred. */
  awaitingBackground: boolean;
}

export type CompactOutcome =
  | { ok: true; conversation: Conversation }
  | { ok: false; reason: "not_found" | "conflict" | "failed"; message: string };

export interface AtelierManagerDeps {
  store: Store;
  hub: ClientHub;
  sessionHub: SessionHub;
  system: Pick<SystemAdapter, "checkCodexRuntime">;
  getProject?: (key: string) => ProjectConfig | null;
  defaults?: () => ExecutionDefaults;
  ticketOperations?: TicketOperations;
  uploadsRoot?: string;
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
  private readonly uploadsRoot: string | undefined;
  private readonly ticketTools: AtelierTicketTools | null;
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
    this.uploadsRoot = deps.uploadsRoot;
    this.ticketTools = deps.ticketOperations ? new AtelierTicketTools({ store: deps.store, hub: deps.hub, operations: deps.ticketOperations }) : null;
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
      const patch: ConversationPatch = {};
      if (conversation.sessionStatus === "running") patch.sessionStatus = "idle";
      // No session survives a restart: the context figures described the previous process.
      if (conversation.contextTokens !== null || conversation.contextWindow !== null) {
        patch.contextTokens = null;
        patch.contextWindow = null;
      }
      if (Object.keys(patch).length > 0) this.store.updateConversation(conversation.id, patch);
    }
  }

  async compact(conversationId: string): Promise<CompactOutcome> {
    const conversation = this.store.getConversation(conversationId);
    if (!conversation) return { ok: false, reason: "not_found", message: "conversation introuvable" };
    if (conversation.sessionStatus === "running") return { ok: false, reason: "conflict", message: COMPACT_RUNNING_MESSAGE };
    const key = atelierSessionKey(conversationId);
    if (!this.sessionHub.isConnected(key) || this.starting.has(conversationId)) {
      return { ok: false, reason: "conflict", message: COMPACT_NO_SESSION_MESSAGE };
    }
    const turnId = nanoid(10);
    const message = this.store.addConversationMessage({ conversationId, role: "user", content: COMPACT_LABEL, turnId });
    this.hub.pushConversationMessage(message);
    const runtime = this.runtime(conversationId);
    runtime.lastUserTurnId = turnId;
    runtime.turn = emptyTurn();
    runtime.compaction = { before: conversation.contextTokens, after: null };
    this.clearIdleTimer(runtime);
    this.patchConversation(conversationId, { sessionStatus: "running", error: null });
    try {
      if (!(await this.sessionHub.compact(key))) throw new Error(COMPACT_NO_SESSION_MESSAGE);
    } catch (error) {
      runtime.compaction = null;
      const reason = getErrorMessage(error);
      log.warn("compactage atelier impossible", { conversationId, reason });
      this.patchConversation(conversationId, { sessionStatus: "idle", error: reason });
      // No compaction turn will end to re-arm the idle close cleared above.
      this.armIdleTimer(conversationId, runtime);
      return { ok: false, reason: "failed", message: reason };
    }
    log.info("compactage atelier démarré", { conversationId });
    return { ok: true, conversation: this.requireConversation(conversationId) };
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
    const runtime = this.runtimes.get(conversationId);
    if (runtime?.awaitingBackground) {
      runtime.awaitingBackground = false;
      // The deferred turn_end left no idle close, and no relaunch turn may come to arm one.
      this.armIdleTimer(conversationId, runtime);
    }
    this.patchConversation(conversationId, { sessionStatus: "idle" });
  }

  settingsChanged(conversationId: string): void {
    this.closeSession(conversationId);
    const conversation = this.store.getConversation(conversationId);
    if (!conversation) return;
    const patch: ConversationPatch = { sessionId: null, contextTokens: null, contextWindow: null };
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

  setBoardRoutes(routes: BoardRouteHandler): void {
    this.ticketTools?.setRoutes(routes);
  }

  async handleBoardTool(conversationId: string, name: WorkerToolName, args: unknown, callId: string): Promise<{ ok: boolean; result: string }> {
    if (!this.ticketTools) return { ok: false, result: "Atelier board operations are unavailable." };
    this.flush(conversationId);
    return this.ticketTools.handle(conversationId, name, args, callId);
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
      const history = this.historyBefore(conversationId, messageId).filter((message) => message.role === "user").map((message) => message.content).join(PART_SEPARATOR);
      const prepared = await this.prepareAttachments(content, history);
      if (!this.sessionHub.sendEvent(atelierSessionKey(conversationId), { type: "chat", content: prepared.content }, prepared.images)) {
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
    const history = this.historyBefore(conversationId, messageId);
    const payload = `${buildAtelierPrompt({ conversation, project, history })}${PART_SEPARATOR}${content}`;
    const prepared = await this.prepareAttachments(payload);
    const runtime = this.runtime(conversationId);
    runtime.resumed = resumeSessionId !== null;
    // The SDK emits nothing at startup: a fresh CLI process starts with no background task.
    this.resetBackground(runtime);
    this.sessionHub.start(
      buildAtelierSessionConfig({
        conversationId,
        cwd: project.repoPath,
        model: execution.model,
        effort: execution.effort,
        serviceTier: execution.serviceTier,
        driver: execution.provider,
        researchEnabled: conversation.researchEnabled,
        researchOptions: conversation.researchOptions,
        resumeSessionId,
      }),
      {
        onEvent: (event) => this.onEvent(conversationId, event),
        onFailure: (reason) => this.onFailure(conversationId, reason),
      },
    );
    log.info("session atelier démarrée", { conversationId, provider: execution.provider, resumed: resumeSessionId !== null });
    if (resumeSessionId) return this.sessionHub.sendEvent(key, { type: "chat", content: prepared.content }, prepared.images);
    if (!this.sessionHub.sendEvent(key, { type: "ticket", payload: prepared.content }, prepared.images)) throw new Error(SESSION_UNAVAILABLE_MESSAGE);
    return true;
  }

  private async prepareAttachments(content: string, previousContent = ""): Promise<PreparedAtelierAttachments> {
    if (!this.uploadsRoot) return { content, images: [] };
    return prepareAtelierAttachments(content, this.uploadsRoot, previousContent);
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
        // A compaction turn gets a backend-written summary instead of the provider's own output.
        if (this.runtimes.get(conversationId)?.compaction) return;
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
        this.onTurnEnd(conversationId, event.ok);
        return;
      case "context_usage":
        if (event.sourceId) return;
        this.onContextUsage(conversationId, event.usedTokens, event.maxTokens);
        return;
      case "background_tasks":
        if (event.sourceId) return;
        this.onBackgroundTasks(conversationId, event.activeTaskIds);
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

  private onContextUsage(conversationId: string, rawUsed: number, rawMax: number | null): void {
    // Provider figures are not schema-checked as integers; the conversation row requires them.
    const usedTokens = Math.max(0, Math.round(rawUsed));
    const maxTokens = rawMax !== null && rawMax >= 1 ? Math.round(rawMax) : null;
    const compaction = this.runtimes.get(conversationId)?.compaction;
    if (compaction) compaction.after = usedTokens;
    const conversation = this.store.getConversation(conversationId);
    if (!conversation || (conversation.contextTokens === usedTokens && conversation.contextWindow === maxTokens)) return;
    this.patchConversation(conversationId, { contextTokens: usedTokens, contextWindow: maxTokens });
  }

  private onTurnEnd(conversationId: string, ok: boolean): void {
    this.flush(conversationId);
    const runtime = this.runtime(conversationId);
    const compaction = runtime.compaction;
    const turnId = runtime.turn.turnId ?? runtime.lastUserTurnId;
    runtime.turn = emptyTurn();
    runtime.compaction = null;
    if (compaction) this.addCompactionSummary(conversationId, turnId, ok, compaction);
    if (ok && runtime.backgroundTasks.size > 0) {
      // Sub-agents will relaunch the orchestrator: notify only once it has truly finished.
      runtime.awaitingBackground = true;
      this.clearIdleTimer(runtime);
      if (this.store.getConversation(conversationId)?.sessionStatus !== "running") {
        this.patchConversation(conversationId, { sessionStatus: "running" });
      }
      return;
    }
    runtime.awaitingBackground = false;
    this.patchConversation(conversationId, { sessionStatus: "idle", unread: true });
    this.armIdleTimer(conversationId, runtime);
  }

  private onBackgroundTasks(conversationId: string, activeTaskIds: string[]): void {
    const runtime = this.runtime(conversationId);
    runtime.backgroundTasks = new Set(activeTaskIds);
    // No relaunch turn may follow: the idle close then settles the conversation.
    if (runtime.backgroundTasks.size === 0 && runtime.awaitingBackground) this.armIdleTimer(conversationId, runtime);
  }

  private resetBackground(runtime: ConversationRuntime): void {
    runtime.backgroundTasks = new Set();
    runtime.awaitingBackground = false;
  }

  /** Close the live session after `idleTimeoutMs` without a new turn. */
  private armIdleTimer(conversationId: string, runtime: ConversationRuntime): void {
    this.clearIdleTimer(runtime);
    runtime.idleTimer = setTimeout(() => {
      runtime.idleTimer = null;
      log.info("session atelier fermée après inactivité", { conversationId });
      const awaiting = runtime.awaitingBackground;
      this.resetBackground(runtime);
      this.sessionHub.disconnect(atelierSessionKey(conversationId), "completed");
      if (awaiting) this.patchConversation(conversationId, { sessionStatus: "idle", unread: true });
      this.clearContext(conversationId);
    }, this.idleTimeoutMs);
    runtime.idleTimer.unref?.();
  }

  private addCompactionSummary(
    conversationId: string,
    turnId: string | null,
    ok: boolean,
    compaction: { before: number | null; after: number | null },
  ): void {
    if (!this.store.getConversation(conversationId)) return;
    const { before, after } = compaction;
    const content = !ok
      ? COMPACT_FAILED_MESSAGE
      : before !== null && after !== null
        ? `Contexte compacté : ${formatTokens(before)} → ${formatTokens(after)} tokens.`
        : "Contexte compacté.";
    const message = this.store.addConversationMessage({ conversationId, role: "assistant", content, turnId });
    this.hub.pushConversationMessage(message);
  }

  private clearContext(conversationId: string): void {
    const conversation = this.store.getConversation(conversationId);
    if (!conversation || (conversation.contextTokens === null && conversation.contextWindow === null)) return;
    this.patchConversation(conversationId, { contextTokens: null, contextWindow: null });
  }

  private onFailure(conversationId: string, reason: string): void {
    const runtime = this.runtime(conversationId);
    this.flush(conversationId);
    runtime.turn = emptyTurn();
    runtime.compaction = null;
    this.resetBackground(runtime);
    const patch: ConversationPatch = { sessionStatus: "error", error: reason, unread: true, contextTokens: null, contextWindow: null };
    if (runtime.resumed) patch.sessionId = null;
    runtime.resumed = false;
    log.warn("session atelier en échec", { conversationId, reason });
    this.sessionHub.disconnect(atelierSessionKey(conversationId), "failed");
    this.patchConversation(conversationId, patch);
  }

  private markError(conversationId: string, reason: string): void {
    this.flush(conversationId);
    this.patchConversation(conversationId, { sessionStatus: "error", error: reason, unread: true });
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
      runtime.compaction = null;
      this.resetBackground(runtime);
    }
    this.sessionHub.disconnect(atelierSessionKey(conversationId), "cancelled");
    this.clearContext(conversationId);
  }

  private clearIdleTimer(runtime: ConversationRuntime): void {
    if (runtime.idleTimer) clearTimeout(runtime.idleTimer);
    runtime.idleTimer = null;
  }

  private runtime(conversationId: string): ConversationRuntime {
    let runtime = this.runtimes.get(conversationId);
    if (!runtime) {
      runtime = {
        turn: emptyTurn(),
        lastUserTurnId: null,
        flushTimer: null,
        idleTimer: null,
        resumed: false,
        compaction: null,
        backgroundTasks: new Set(),
        awaitingBackground: false,
      };
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
