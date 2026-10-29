import { nanoid } from "nanoid";
import { z } from "zod";

import { getErrorMessage } from "../../shared/errors.ts";
import { compileFeedback } from "../../shared/prdFeedback.ts";
import type { ChannelEvent, WorkerToolName } from "../../shared/protocol.ts";
import type { ActiveSubagent, Conversation, ConversationMessage, ConversationSteering, FinishedSubagent, PrdDocument, SubagentStatus } from "../../shared/schemas.ts";
import type { ProjectConfig } from "../config.ts";
import { MODELS, getProject, isProjectKey } from "../config.ts";
import type { ConversationPatch, Store } from "../db/store.ts";
import type { ClientHub } from "../hub.ts";
import { createLogger } from "../logger.ts";
import type { AgentSessionEvent, AgentSubagentRef } from "../system/agentSession.ts";
import type { SystemAdapter } from "../system/types.ts";
import type { TicketOperations } from "../ticketOperations.ts";

import { prepareAtelierAttachments } from "./atelierAttachments.ts";
import type { PreparedAtelierAttachments } from "./atelierAttachments.ts";
import { AtelierTicketTools } from "./atelierTicketTools.ts";
import type { BoardRouteHandler } from "./atelierTicketTools.ts";
import { buildAtelierConsolidateTurn, buildAtelierPrompt, buildAtelierRegenerationTurn, formatSnapshotDate } from "./atelier.ts";
import type { AtelierWorkspace } from "./atelier.ts";
import { assertExecutionAvailable, resolveExecution } from "./executionConfig.ts";
import type { ExecutionDefaults, ResolvedExecution } from "./executionConfig.ts";
import type { RepoSnapshots, SnapshotLease } from "./repoSnapshots.ts";
import { atelierSessionKey, buildAtelierSessionConfig } from "./sessionConfig.ts";
import type { SessionHub } from "./sessionHub.ts";

const log = createLogger("atelier");

/** Bounds the `finished_subagents` JSON column: only the most recent entries are kept. */
export const ATELIER_SUBAGENT_HISTORY_LIMIT = 200;

type SubagentLifecycle = Extract<AgentSessionEvent, { type: "subagent_lifecycle" }>;

function appendFinished(history: readonly FinishedSubagent[], ended: readonly FinishedSubagent[]): FinishedSubagent[] {
  return [...history, ...ended].slice(-ATELIER_SUBAGENT_HISTORY_LIMIT);
}

function finishedStatus(status: SubagentLifecycle["status"]): SubagentStatus {
  if (status === "failed") return "failed";
  if (status === "stopped") return "interrupted";
  return "done";
}

/** Moves every active sub-agent to the history as interrupted; empty patch when none is active. */
function interruptSubagentsPatch(conversation: Conversation): ConversationPatch {
  if (conversation.activeSubagents.length === 0) return {};
  const endedAt = Date.now();
  return {
    activeSubagents: [],
    finishedSubagents: appendFinished(
      conversation.finishedSubagents,
      conversation.activeSubagents.map((entry) => ({ ...entry, endedAt, status: "interrupted" })),
    ),
  };
}

export const ATELIER_IDLE_TIMEOUT_MS = 30 * 60 * 1000;
/** Longest an active sub-agent keeps the Atelier session open. */
export const ATELIER_SUBAGENT_CEILING_MS = 60 * 60 * 1000;
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
/** How long after a turn_end a pending steer may still start a follow-up turn before it counts as absorbed. */
export const ATELIER_STEER_GRACE_MS = 10_000;
export const CONSOLIDATE_BUSY_MESSAGE = "L'agent est en cours de réponse : attends la fin du tour ou interromps-le avant de consolider.";
export const REGENERATE_BUSY_MESSAGE = "L'agent est en cours de réponse : attends la fin du tour ou interromps-le avant de régénérer le PRD.";
export const REFRESH_BUSY_MESSAGE = "L'agent est en cours de réponse : attends la fin du tour ou interromps-le avant de rafraîchir l'instantané.";
export const REFRESH_LOCAL_MESSAGE = "Cette conversation lit le checkout local : il n'y a pas d'instantané à rafraîchir.";
const SHORT_SHA_LENGTH = 7;

/** A PRD action refused because the agent is running a turn. */
export class AtelierBusyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AtelierBusyError";
  }
}

/** A snapshot refresh refused because the conversation reads the local checkout. */
export class AtelierLocalCheckoutError extends Error {
  constructor() {
    super(REFRESH_LOCAL_MESSAGE);
    this.name = "AtelierLocalCheckoutError";
  }
}

function shortSha(sha: string): string {
  return sha.slice(0, SHORT_SHA_LENGTH);
}

function fetchWarning(lease: SnapshotLease): string {
  return `⚠️ Récupération d'origin/${lease.baseBranch} impossible (${lease.fetchError ?? "erreur inconnue"}) : l'Atelier lit le dernier origin/${lease.baseBranch} connu (${shortSha(lease.sha)}).`;
}

function workspaceNote(workspace: AtelierWorkspace): string {
  if (workspace.source === "local") return `Checkout local : ${workspace.cwd} (modifications non commitées incluses)`;
  return `Instantané : origin/${workspace.baseBranch} @ ${shortSha(workspace.sha)} (${formatSnapshotDate(workspace.committedAt)}) — dossier ${workspace.cwd}`;
}
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
  /** Closes the session once the oldest active sub-agent reaches the ceiling. */
  ceilingTimer: ReturnType<typeof setTimeout> | null;
  resumed: boolean;
  /** Set while a compaction turn runs: context occupancy before, and after once reported. */
  compaction: { before: number | null; after: number | null } | null;
  /** Live background tasks (sub-agents) of the root session, as last reported. */
  backgroundTasks: ReadonlySet<string>;
  /** A turn ended while background tasks were still running: the final notification is deferred. */
  awaitingBackground: boolean;
  /** Ids of the user messages sent mid-turn and not yet resolved, in send order. */
  pendingSteers: string[];
  /** Turn of the latest steer whose reply bubble is not opened yet. */
  splitTurnId: string | null;
  /** Armed after a turn_end with pending steers: output before it fires means a follow-up turn took them. */
  steerGraceTimer: ReturnType<typeof setTimeout> | null;
  /** Tail of the conversation's deliveries: sends stay in submission order. */
  delivery: Promise<void>;
  /** Snapshot held by the live session; released whenever the session ends. */
  lease: SnapshotLease | null;
}

interface SessionLaunch {
  conversation: Conversation;
  project: ProjectConfig;
  execution: ResolvedExecution;
  workspace: AtelierWorkspace;
  content: string;
  messageId: string;
  runtime: ConversationRuntime;
}

export type CompactOutcome =
  | { ok: true; conversation: Conversation }
  | { ok: false; reason: "not_found" | "conflict" | "failed"; message: string };

export interface AtelierManagerDeps {
  store: Store;
  hub: ClientHub;
  sessionHub: SessionHub;
  system: Pick<SystemAdapter, "checkCodexRuntime">;
  snapshots: Pick<RepoSnapshots, "acquire">;
  getProject?:(key: string) => ProjectConfig | null;
  defaults?: () => ExecutionDefaults;
  ticketOperations?: TicketOperations;
  uploadsRoot?: string;
  idleTimeoutMs?: number;
  subagentCeilingMs?: number;
  flushIntervalMs?: number;
  steerGraceMs?: number;
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

/** Output of the main agent itself, as opposed to sub-agents or side sources. */
function isMainOutput(event: AgentSessionEvent): boolean {
  switch (event.type) {
    case "assistant_text":
    case "thinking":
      return !event.sourceId && !event.subagent;
    case "tool_use":
    case "progress":
      return !event.subagent;
    default:
      return false;
  }
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
  private readonly snapshots: Pick<RepoSnapshots, "acquire">;
  private readonly lookupProject: (key: string) => ProjectConfig | null;
  private readonly defaults: () => ExecutionDefaults;
  private readonly idleTimeoutMs: number;
  private readonly subagentCeilingMs: number;
  private readonly flushIntervalMs: number;
  private readonly steerGraceMs: number;

  constructor(deps: AtelierManagerDeps) {
    this.uploadsRoot = deps.uploadsRoot;
    this.ticketTools = deps.ticketOperations ? new AtelierTicketTools({ store: deps.store, hub: deps.hub, operations: deps.ticketOperations }) : null;
    this.store = deps.store;
    this.hub = deps.hub;
    this.sessionHub = deps.sessionHub;
    this.system = deps.system;
    this.snapshots = deps.snapshots;
    this.lookupProject = deps.getProject ?? defaultProjectLookup;
    this.defaults = deps.defaults ?? defaultExecutionDefaults;
    this.idleTimeoutMs = deps.idleTimeoutMs ?? ATELIER_IDLE_TIMEOUT_MS;
    this.subagentCeilingMs = deps.subagentCeilingMs ?? ATELIER_SUBAGENT_CEILING_MS;
    this.flushIntervalMs = deps.flushIntervalMs ?? ASSISTANT_FLUSH_INTERVAL_MS;
    this.steerGraceMs = deps.steerGraceMs ?? ATELIER_STEER_GRACE_MS;
  }

  recoverStale(): void {
    for (const conversation of this.store.listConversations()) {
      const patch: ConversationPatch = {};
      if (conversation.sessionStatus === "running") {
        patch.sessionStatus = "idle";
        const pending = this.store.listConversationMessages(conversation.id).filter((message) => message.steering === "pending").map((message) => message.id);
        this.resolveSteers(conversation.id, pending, "abandoned", "redémarrage du backend");
      }
      // No session survives a restart: the context figures described the previous process.
      if (conversation.contextTokens !== null || conversation.contextWindow !== null) {
        patch.contextTokens = null;
        patch.contextWindow = null;
      }
      // Whatever their status, no sub-agent outlives the previous process.
      Object.assign(patch, interruptSubagentsPatch(conversation));
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
    if (this.store.getConversation(conversationId)?.sessionStatus === "running") return this.submitSteer(conversationId, content);
    return this.submitTurn(conversationId, content, content);
  }

  consolidate(conversationId: string, feedback?: string): SubmittedTurn {
    if (this.store.getConversation(conversationId)?.sessionStatus === "running") throw new AtelierBusyError(CONSOLIDATE_BUSY_MESSAGE);
    const note = feedback?.trim();
    return this.submitTurn(conversationId, labelWithNote(CONSOLIDATE_LABEL, note), buildAtelierConsolidateTurn(note));
  }

  regenerate(prdId: string): SubmittedTurn {
    const prd = this.store.getPrdDocument(prdId);
    if (!prd) throw new Error("PRD introuvable");
    if (this.store.getConversation(prd.conversationId)?.sessionStatus === "running") throw new AtelierBusyError(REGENERATE_BUSY_MESSAGE);
    const feedback = compileFeedback(prd.annotations, prd.generalNote);
    const visible = labelWithNote(`Régénérer le PRD (révision ${prd.revision})`, feedback);
    return this.submitTurn(prd.conversationId, visible, buildAtelierRegenerationTurn(feedback));
  }

  async interrupt(conversationId: string): Promise<void> {
    await this.sessionHub.interrupt(atelierSessionKey(conversationId));
    this.flush(conversationId);
    const runtime = this.runtimes.get(conversationId);
    this.abandonSteers(conversationId, runtime, "interrompu");
    this.clearSubagents(conversationId, runtime);
    if (runtime?.awaitingBackground) {
      runtime.awaitingBackground = false;
      // The deferred turn_end left no idle close, and no relaunch turn may come to arm one.
      this.armIdleTimer(conversationId, runtime);
    }
    this.patchConversation(conversationId, { sessionStatus: "idle" });
  }

  settingsChanged(conversationId: string): void {
    this.flush(conversationId);
    this.abandonSteers(conversationId, this.runtimes.get(conversationId), "réglages modifiés");
    this.closeSession(conversationId);
    const conversation = this.store.getConversation(conversationId);
    if (!conversation) return;
    const patch: ConversationPatch = { sessionId: null, contextTokens: null, contextWindow: null };
    if (conversation.sessionStatus === "running") patch.sessionStatus = "idle";
    this.patchConversation(conversationId, patch);
  }

  /** Re-pins the conversation on the current origin/<base>; the next message opens a fresh session on it. */
  async refresh(conversationId: string): Promise<Conversation> {
    const conversation = this.requireConversation(conversationId);
    if (conversation.readLocalCheckout) throw new AtelierLocalCheckoutError();
    if (conversation.sessionStatus === "running" || this.starting.has(conversationId)) throw new AtelierBusyError(REFRESH_BUSY_MESSAGE);
    const project = this.lookupProject(conversation.project);
    if (!project) throw new Error(`Projet inconnu : ${conversation.project}`);
    // Registered as a start: a message sent during the fetch waits, then opens its session on the new SHA.
    const repin = this.repin(conversation, project);
    const blocking = repin.then(() => false, () => false);
    this.starting.set(conversationId, blocking);
    try {
      await repin;
    } finally {
      if (this.starting.get(conversationId) === blocking) this.starting.delete(conversationId);
    }
    return this.requireConversation(conversationId);
  }

  private async repin(conversation: Conversation, project: ProjectConfig): Promise<void> {
    const conversationId = conversation.id;
    this.flush(conversationId);
    this.closeSession(conversationId);
    const baseBranch = conversation.snapshotBaseBranch ?? project.baseBranch;
    const lease = await this.snapshots.acquire({ projectKey: conversation.project, repoPath: project.repoPath, baseBranch, sha: null, fetch: true, requireFetch: false });
    try {
      if (lease.fetchError) this.addNote(conversationId, fetchWarning(lease));
      const previous = conversation.snapshotSha;
      this.patchConversation(conversationId, { snapshotSha: lease.sha, snapshotCommittedAt: lease.committedAt, snapshotBaseBranch: lease.baseBranch, sessionId: null });
      this.addNote(conversationId, previous === lease.sha
        ? `Instantané déjà à jour (${shortSha(lease.sha)})`
        : `Instantané rafraîchi : ${previous ? shortSha(previous) : "aucun"} → ${shortSha(lease.sha)}`);
      log.info("instantané atelier rafraîchi", { conversationId, sha: lease.sha });
    } finally {
      lease.release();
    }
  }

  close(conversationId: string): void {
    this.closeSession(conversationId);
    this.runtimes.delete(conversationId);
  }

  stop(): void {
    for (const runtime of this.runtimes.values()) {
      if (runtime.flushTimer) clearTimeout(runtime.flushTimer);
      if (runtime.idleTimer) clearTimeout(runtime.idleTimer);
      if (runtime.ceilingTimer) clearTimeout(runtime.ceilingTimer);
      runtime.flushTimer = null;
      runtime.idleTimer = null;
      runtime.ceilingTimer = null;
      this.clearSteerGrace(runtime);
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
    // A user-resumed conversation returns to the active list.
    this.patchConversation(conversationId, { sessionStatus: "running", error: null, settled: false });
    return { message, delivered: this.enqueueDelivery(conversationId, runtime, agentContent, message.id, false) };
  }

  /** A message sent while a turn runs: it redirects that turn instead of opening a new one. */
  private submitSteer(conversationId: string, content: string): SubmittedTurn {
    // The text written so far stays above the steer; its later fragments keep updating the same bubble.
    this.flush(conversationId);
    const turnId = nanoid(10);
    const message = this.store.addConversationMessage({ conversationId, role: "user", content, turnId, steering: "pending" });
    this.hub.pushConversationMessage(message);
    const runtime = this.runtime(conversationId);
    const afterTurnEnd = runtime.steerGraceTimer !== null;
    if (afterTurnEnd) {
      // No follow-up turn started for the earlier steers: the ended turn absorbed them, whatever this one starts.
      this.resolveSteers(conversationId, runtime.pendingSteers, "steered");
      runtime.pendingSteers = [];
    }
    runtime.pendingSteers.push(message.id);
    runtime.splitTurnId = turnId;
    runtime.lastUserTurnId = turnId;
    this.clearIdleTimer(runtime);
    // Already past a turn_end: give this steer its own window to start the follow-up turn.
    if (afterTurnEnd) this.armSteerGrace(conversationId, runtime);
    return { message, delivered: this.enqueueDelivery(conversationId, runtime, content, message.id, true) };
  }

  private enqueueDelivery(conversationId: string, runtime: ConversationRuntime, content: string, messageId: string, steer: boolean): Promise<void> {
    const delivered = runtime.delivery.then(() => this.deliver(conversationId, content, messageId, steer));
    runtime.delivery = delivered;
    return delivered;
  }

  private async deliver(conversationId: string, content: string, messageId: string, steer: boolean): Promise<void> {
    try {
      const sentAsFirstTurn = await this.ensureSession(conversationId, content, messageId);
      if (sentAsFirstTurn) return;
      const history = this.historyBefore(conversationId, messageId).filter((message) => message.role === "user").map((message) => message.content).join(PART_SEPARATOR);
      const prepared = await this.prepareAttachments(content, history);
      const event: ChannelEvent = steer ? { type: "chat", content: prepared.content, steer: true } : { type: "chat", content: prepared.content };
      if (!this.sessionHub.sendEvent(atelierSessionKey(conversationId), event, prepared.images)) {
        throw new Error(SESSION_UNAVAILABLE_MESSAGE);
      }
    } catch (error) {
      const reason = getErrorMessage(error);
      if (steer) this.steerFailed(conversationId, messageId, reason);
      if (!steer || this.store.getConversation(conversationId)?.sessionStatus !== "running") this.markError(conversationId, reason);
    }
  }

  /** A steer that never reached the agent leaves the running turn untouched. */
  private steerFailed(conversationId: string, messageId: string, reason: string): void {
    const runtime = this.runtime(conversationId);
    if (!runtime.pendingSteers.includes(messageId)) return;
    runtime.pendingSteers = runtime.pendingSteers.filter((id) => id !== messageId);
    const turnId = this.resolveSteers(conversationId, [messageId], "failed");
    if (turnId !== null && runtime.splitTurnId === turnId) runtime.splitTurnId = null;
    if (this.store.getConversation(conversationId)?.sessionStatus !== "running") return;
    const line = this.store.addConversationMessage({ conversationId, role: "activity", content: `Message non transmis : ${reason}`, turnId });
    this.hub.pushConversationMessage(line);
  }

  /** Settles steer messages; an abandonment leaves one activity line under the last of them. */
  private resolveSteers(conversationId: string, ids: readonly string[], steering: ConversationSteering, abandonReason?: string): string | null {
    let lastTurnId: string | null = null;
    for (const id of ids) {
      try {
        const message = this.store.updateConversationMessage(id, { steering });
        this.hub.pushConversationMessage(message);
        lastTurnId = message.turnId;
      } catch (error) {
        log.warn("état d'aiguillage non persisté", { conversationId, reason: getErrorMessage(error) });
      }
    }
    if (abandonReason && ids.length > 0 && this.store.getConversation(conversationId)) {
      const line = this.store.addConversationMessage({ conversationId, role: "activity", content: `Aiguillage non traité : ${abandonReason}`, turnId: lastTurnId });
      this.hub.pushConversationMessage(line);
    }
    return lastTurnId;
  }

  private abandonSteers(conversationId: string, runtime: ConversationRuntime | undefined, reason: string): void {
    if (!runtime) return;
    this.clearSteerGrace(runtime);
    runtime.splitTurnId = null;
    const ids = runtime.pendingSteers;
    runtime.pendingSteers = [];
    this.resolveSteers(conversationId, ids, "abandoned", reason);
  }

  private armSteerGrace(conversationId: string, runtime: ConversationRuntime): void {
    this.clearSteerGrace(runtime);
    runtime.steerGraceTimer = setTimeout(() => {
      runtime.steerGraceTimer = null;
      // No follow-up turn started: the ended turn absorbed the steers.
      const ids = runtime.pendingSteers;
      runtime.pendingSteers = [];
      runtime.splitTurnId = null;
      this.resolveSteers(conversationId, ids, "steered");
      this.patchConversation(conversationId, { sessionStatus: "idle", unread: true });
      this.armIdleTimer(conversationId, runtime);
    }, this.steerGraceMs);
    runtime.steerGraceTimer.unref?.();
  }

  private clearSteerGrace(runtime: ConversationRuntime): void {
    if (runtime.steerGraceTimer) clearTimeout(runtime.steerGraceTimer);
    runtime.steerGraceTimer = null;
  }

  /** Main-agent output after a turn_end with pending steers: a follow-up turn is handling them. */
  private onSteerFollowUp(conversationId: string): void {
    const runtime = this.runtimes.get(conversationId);
    if (!runtime?.steerGraceTimer) return;
    this.clearSteerGrace(runtime);
    const ids = runtime.pendingSteers;
    runtime.pendingSteers = [];
    runtime.splitTurnId = null;
    const turnId = this.resolveSteers(conversationId, ids, "queued");
    if (turnId !== null) runtime.lastUserTurnId = turnId;
  }

  /** Close the bubble written before the latest steer so the next item opens one under it. */
  private splitForSteer(conversationId: string, runtime: ConversationRuntime): void {
    const turnId = runtime.splitTurnId;
    if (turnId === null) return;
    runtime.splitTurnId = null;
    this.flush(conversationId);
    runtime.turn = emptyTurn();
    runtime.turn.turnId = turnId;
    this.markRunning(conversationId);
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
    const runtime = this.runtime(conversationId);
    this.releaseLease(runtime);
    const workspace = await this.openWorkspace(conversation, project, runtime);
    try {
      return await this.launchSession({ conversation, project, execution, workspace, content, messageId, runtime });
    } catch (error) {
      this.releaseLease(runtime);
      throw error;
    }
  }

  /** Pins the conversation on its snapshot (or the local checkout) and keeps the lease on the runtime. */
  private async openWorkspace(conversation: Conversation, project: ProjectConfig, runtime: ConversationRuntime): Promise<AtelierWorkspace> {
    if (conversation.readLocalCheckout) return { source: "local", cwd: project.repoPath };
    const pinned = conversation.snapshotSha;
    const baseBranch = conversation.snapshotBaseBranch ?? project.baseBranch;
    let lease: SnapshotLease;
    try {
      lease = await this.snapshots.acquire({ projectKey: conversation.project, repoPath: project.repoPath, baseBranch, sha: pinned, fetch: pinned === null, requireFetch: false });
    } catch (error) {
      if (pinned === null) throw error;
      throw new Error(`Instantané ${shortSha(pinned)} indisponible (${getErrorMessage(error)}) : clique sur « Rafraîchir » pour lire le dernier origin/${baseBranch}.`);
    }
    runtime.lease = lease;
    if (lease.fetchError) this.addNote(conversation.id, fetchWarning(lease));
    if (pinned === null) {
      this.patchConversation(conversation.id, { snapshotSha: lease.sha, snapshotCommittedAt: lease.committedAt, snapshotBaseBranch: lease.baseBranch });
    }
    return { source: "origin", cwd: lease.cwd, sha: lease.sha, committedAt: lease.committedAt, baseBranch: lease.baseBranch };
  }

  private async launchSession({ conversation, project, execution, workspace, content, messageId, runtime }: SessionLaunch): Promise<boolean> {
    const conversationId = conversation.id;
    const resumeSessionId = execution.provider === "codex" ? conversation.sessionId : null;
    const key = atelierSessionKey(conversationId);
    const history = this.historyBefore(conversationId, messageId);
    const prompt = `${buildAtelierPrompt({ conversation, project, workspace, history })}${PART_SEPARATOR}${content}`;
    // A resumed thread keeps its older framing in context: lead with the code it reads now.
    const payload = resumeSessionId ? `[${workspaceNote(workspace)}]${PART_SEPARATOR}${prompt}` : prompt;
    const prepared = await this.prepareAttachments(payload);
    runtime.resumed = resumeSessionId !== null;
    // The SDK emits nothing at startup: a fresh CLI process starts with no background task.
    this.resetBackground(runtime);
    this.sessionHub.start(
      buildAtelierSessionConfig({
        conversationId,
        cwd: workspace.cwd,
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
    if (isMainOutput(event)) this.onSteerFollowUp(conversationId);
    switch (event.type) {
      case "init":
        this.onInit(conversationId, event.sessionId);
        return;
      case "assistant_text":
        if (event.sourceId || event.subagent) return;
        // A compaction turn gets a backend-written summary instead of the provider's own output.
        if (this.runtimes.get(conversationId)?.compaction) return;
        this.appendAssistant(conversationId, event.text, event.stream?.itemId ?? null, event.stream?.mode === "delta");
        return;
      case "tool_use":
        if (event.subagent) this.addSubagentActivity(conversationId, describeToolUse(event.name, event.input), event.subagent);
        else this.addActivity(conversationId, describeToolUse(event.name, event.input));
        return;
      case "progress":
        if (event.stream || !ACTIVITY_PROGRESS_KINDS.has(event.kind)) return;
        if (event.subagent) this.addSubagentActivity(conversationId, truncate(event.message), event.subagent);
        else this.addActivity(conversationId, truncate(event.message));
        return;
      case "subagent_lifecycle":
        this.onSubagentLifecycle(conversationId, event);
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
    const runtime = this.runtime(conversationId);
    const known = key === null ? undefined : runtime.turn.parts.find((part) => part.key === key);
    // Fragments of an item already being written never move: only a new item opens the steer's bubble.
    if (!known) this.splitForSteer(conversationId, runtime);
    const turn = this.openTurn(conversationId);
    const existing = key === null ? undefined : turn.parts.find((part) => part.key === key);
    if (existing) existing.text = delta ? existing.text + text : text;
    else turn.parts.push({ key, text });
    turn.dirty = true;
    this.scheduleFlush(conversationId);
  }

  private addActivity(conversationId: string, content: string): void {
    if (!content) return;
    this.splitForSteer(conversationId, this.runtime(conversationId));
    const turn = this.openTurn(conversationId);
    this.flush(conversationId);
    // A main-agent activity seals the current text segment: the next text opens a new assistant message.
    // An unsaved segment is kept so a later flush can persist it.
    if (!turn.dirty) {
      turn.parts = [];
      turn.messageId = null;
    }
    const message = this.store.addConversationMessage({ conversationId, role: "activity", content, turnId: turn.turnId });
    this.hub.pushConversationMessage(message);
  }

  /** A sub-agent line never opens a turn, changes the status or freezes the main reply. */
  private addSubagentActivity(conversationId: string, content: string, subagent: AgentSubagentRef): void {
    if (!content || !this.store.getConversation(conversationId)) return;
    const runtime = this.runtime(conversationId);
    const message = this.store.addConversationMessage({
      conversationId,
      role: "activity",
      content,
      turnId: runtime.turn.turnId ?? runtime.lastUserTurnId,
      agentId: subagent.id,
      agentLabel: subagent.label,
    });
    this.hub.pushConversationMessage(message);
  }

  private onSubagentLifecycle(conversationId: string, event: SubagentLifecycle): void {
    const conversation = this.store.getConversation(conversationId);
    if (!conversation) return;
    const { phase } = event;
    const runtime = this.runtime(conversationId);
    const current = conversation.activeSubagents;
    let next: ActiveSubagent[];
    if (phase === "started") {
      const identity = { label: event.label, name: event.name || event.label, type: event.subagentType ?? null };
      // A repeated start refreshes the identity only: provider and startedAt stay those of the first start.
      next = current.some((entry) => entry.id === event.id)
        ? current.map((entry) => (entry.id === event.id ? { ...entry, ...identity } : entry))
        : [...current, { id: event.id, ...identity, provider: conversation.orchestrator, startedAt: Date.now() }];
      this.patchConversation(conversationId, { activeSubagents: next });
    } else {
      const ended = current.find((entry) => entry.id === event.id);
      if (!ended) return;
      next = current.filter((entry) => entry.id !== event.id);
      this.patchConversation(conversationId, {
        activeSubagents: next,
        finishedSubagents: appendFinished(conversation.finishedSubagents, [{ ...ended, endedAt: Date.now(), status: finishedStatus(event.status) }]),
      });
    }
    this.scheduleCeiling(conversationId, runtime, next);
    if (phase === "started") {
      this.clearIdleTimer(runtime);
      return;
    }
    if (next.length > 0 || runtime.compaction) return;
    // The deferred background notification leaves the status running while nothing is left to wait for.
    const settledBackground = runtime.awaitingBackground && runtime.backgroundTasks.size === 0;
    if (conversation.sessionStatus !== "running" || settledBackground) this.armIdleTimer(conversationId, runtime);
  }

  private clearSubagents(conversationId: string, runtime: ConversationRuntime | undefined): void {
    if (runtime) this.clearCeilingTimer(runtime);
    const conversation = this.store.getConversation(conversationId);
    if (conversation && conversation.activeSubagents.length > 0) this.patchConversation(conversationId, interruptSubagentsPatch(conversation));
  }

  /** One timer per runtime, due when the oldest active sub-agent reaches the ceiling. */
  private scheduleCeiling(conversationId: string, runtime: ConversationRuntime, active: readonly ActiveSubagent[]): void {
    this.clearCeilingTimer(runtime);
    if (active.length === 0) return;
    const oldest = Math.min(...active.map((entry) => entry.startedAt));
    const delay = Math.max(0, oldest + this.subagentCeilingMs - Date.now());
    runtime.ceilingTimer = setTimeout(() => {
      runtime.ceilingTimer = null;
      log.warn("session atelier fermée : plafond des sous-agents atteint", { conversationId });
      this.clearIdleTimer(runtime);
      this.flush(conversationId);
      this.abandonSteers(conversationId, runtime, "session fermée");
      const awaiting = runtime.awaitingBackground;
      this.resetBackground(runtime);
      this.sessionHub.disconnect(atelierSessionKey(conversationId), "completed");
      this.releaseLease(runtime);
      this.clearSubagents(conversationId, runtime);
      this.patchConversation(conversationId, awaiting ?{ sessionStatus: "idle", unread: true } : { sessionStatus: "idle" });
      this.clearContext(conversationId);
    }, delay);
    runtime.ceilingTimer.unref?.();
  }

  private clearCeilingTimer(runtime: ConversationRuntime): void {
    if (runtime.ceilingTimer) clearTimeout(runtime.ceilingTimer);
    runtime.ceilingTimer = null;
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
    if (runtime.pendingSteers.length > 0) {
      // A steer may still start a follow-up turn: stay running until the grace window decides.
      this.clearIdleTimer(runtime);
      this.armSteerGrace(conversationId, runtime);
      return;
    }
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
    // An active sub-agent keeps the session open: its end, or the ceiling, closes it.
    if ((this.store.getConversation(conversationId)?.activeSubagents.length ?? 0) > 0) return;
    runtime.idleTimer = setTimeout(() => {
      runtime.idleTimer = null;
      log.info("session atelier fermée après inactivité", { conversationId });
      const awaiting = runtime.awaitingBackground;
      this.resetBackground(runtime);
      this.sessionHub.disconnect(atelierSessionKey(conversationId), "completed");
      this.releaseLease(runtime);
      this.clearSubagents(conversationId, runtime);
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
    this.abandonSteers(conversationId, runtime, "session en échec");
    runtime.turn = emptyTurn();
    runtime.compaction = null;
    this.resetBackground(runtime);
    const patch: ConversationPatch = { sessionStatus: "error", error: reason, unread: true, contextTokens: null, contextWindow: null };
    if (runtime.resumed) patch.sessionId = null;
    runtime.resumed = false;
    log.warn("session atelier en échec", { conversationId, reason });
    this.sessionHub.disconnect(atelierSessionKey(conversationId), "failed");
    this.releaseLease(runtime);
    this.clearSubagents(conversationId, runtime);
    this.patchConversation(conversationId, patch);
  }

  private markError(conversationId: string, reason: string): void {
    this.flush(conversationId);
    this.patchConversation(conversationId, { sessionStatus: "error", error: reason, unread: true });
  }

  // NOTE(ali): a queued Claude turn keeps streaming after the previous turn_end marked the conversation idle.
  private markRunning(conversationId: string): void {
    const conversation = this.store.getConversation(conversationId);
    if (!conversation || conversation.sessionStatus !== "idle") return;
    const runtime = this.runtimes.get(conversationId);
    if (runtime) this.clearIdleTimer(runtime);
    this.patchConversation(conversationId, { sessionStatus: "running" });
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
    try {
      const message = turn.messageId === null
        ? this.store.addConversationMessage({ conversationId, role: "assistant", content, turnId: turn.turnId })
        : this.store.updateConversationMessage(turn.messageId, { content });
      turn.messageId = message.id;
      turn.dirty = false;
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
      this.clearSteerGrace(runtime);
      runtime.pendingSteers = [];
      runtime.splitTurnId = null;
      runtime.turn = emptyTurn();
      runtime.resumed = false;
      runtime.compaction = null;
      this.resetBackground(runtime);
      this.releaseLease(runtime);
    }
    this.sessionHub.disconnect(atelierSessionKey(conversationId), "cancelled");
    this.clearSubagents(conversationId, runtime);
    this.clearContext(conversationId);
  }

  private releaseLease(runtime: ConversationRuntime): void {
    runtime.lease?.release();
    runtime.lease = null;
  }

  /** A backend line outside any agent turn (snapshot pin, fetch warning). */
  private addNote(conversationId: string, content: string): void {
    if (!this.store.getConversation(conversationId)) return;
    const message = this.store.addConversationMessage({ conversationId, role: "activity", content, turnId: this.runtimes.get(conversationId)?.lastUserTurnId ?? null });
    this.hub.pushConversationMessage(message);
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
        ceilingTimer: null,
        resumed: false,
        compaction: null,
        backgroundTasks: new Set(),
        awaitingBackground: false,
        pendingSteers: [],
        splitTurnId: null,
        steerGraceTimer: null,
        delivery: Promise.resolve(),
        lease: null,
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
