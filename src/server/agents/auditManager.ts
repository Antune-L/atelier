import { nanoid } from "nanoid";

import {
  AUDIT_ACTIVE_RUN_STATUSES,
  AUDIT_DAILY_SESSION_LIMIT,
  AUDIT_DAY_MS,
  AUDIT_MAX_PARALLEL_SESSIONS,
  AUDIT_MIN_RUN_SESSIONS,
  AUDIT_NOT_PRIORITY_MASK_DAYS,
  AUDIT_RUNS_LIMIT,
  AUDIT_SCHEDULER_TICK_MS,
  auditCreateCardInputSchema,
  auditDecisionInputSchema,
  auditSetStartInputSchema,
  updateAuditProjectSettingsSchema,
} from "../../shared/audit.ts";
import type {
  AuditDecision,
  AuditFinding,
  AuditOverview,
  AuditProjectSettings,
  AuditProjectView,
  AuditProvider,
  AuditRun,
  AuditRunCounts,
  AuditRunDetail,
  AuditReviewState,
  AuditRunProgress,
  AuditRunTrigger,
  AuditTicketOrigin,
  AuditVerdictRecord,
  AuditWaitingReason,
} from "../../shared/audit.ts";
import { hasAuditSlots, isValidTimeZone, latestDueAuditSlot, nextAuditRunAt, pendingAuditSlot } from "../../shared/auditSchedule.ts";
import type { AuditCadenceSettings } from "../../shared/auditSchedule.ts";
import { getErrorMessage } from "../../shared/errors.ts";
import type { AgentEffort, AgentModel, CodexEffort, CodexModel } from "../../shared/constants.ts";
import type { CodexRuntimeModel } from "../../shared/codexCapabilities.ts";
import { agentEffortSchema, agentModelSchema, codexEffortSchema } from "../../shared/schemas.ts";
import { MODELS, getProject, isProjectKey, listProjectKeys } from "../config.ts";
import type { ProjectConfig } from "../config.ts";
import type { Store } from "../db/store.ts";
import type { ClientHub } from "../hub.ts";
import { createLogger } from "../logger.ts";
import type { KeyedMutex } from "../mutex.ts";
import type { Notifier } from "../notifier.ts";
import type { SystemAdapter } from "../system/types.ts";
import { TicketOperationError } from "../ticketOperations.ts";
import type { TicketOperations } from "../ticketOperations.ts";
import { prepareAnalysisWorkspace, releaseAnalysisWorkspace } from "./analysisWorkspace.ts";
import type { AnalysisWorkspace } from "./analysisWorkspace.ts";
import { lowerSeverity } from "./audit/dedupe.ts";
import { auditReviewSessionCount, emptyAuditResult, reviewAuditFinding, runAuditPipeline } from "./audit/engine.ts";
import type { AuditEngineDeps, AuditExecution, AuditKnownFinding, AuditPipelineCandidate, AuditPipelineResult } from "./audit/engine.ts";
import { AuditSessionGate } from "./audit/session.ts";
import { applyAutoCards, createAuditCard } from "./auditCards.ts";
import type { AuditCardContext, AuditCardDeps } from "./auditCards.ts";
import { assertExecutionAvailable, resolveExecution } from "./executionConfig.ts";
import type { ExecutionOverrides } from "./executionConfig.ts";
import type { SlotManager } from "./slotManager.ts";

const log = createLogger("audit");

const DEFAULT_AUDIT_PROVIDER: AuditProvider = "claude";
const AUDIT_ROLE = "auditor";
const AUDIT_EXECUTION_OVERRIDES: Record<AuditProvider, ExecutionOverrides> = {
  claude: { orchestrator: "claude", model: "opus" satisfies AgentModel, effort: "high" satisfies AgentEffort },
  codex: { orchestrator: "codex", codexModel: "gpt-6.1-sol" satisfies CodexModel, codexEffort: "high" satisfies CodexEffort },
};
const AUDIT_YIELD_CHECK_MS = 15_000;
const RUN_ID_LENGTH = 12;
const FINDING_ID_LENGTH = 12;
const REVIEW_ID_LENGTH = 8;
const WORKSPACE_KEY_UNSAFE = /[^a-zA-Z0-9_-]/g;
const PROJECT_TODO_COLUMN = "todo";
const REVIEW_RUN_PREFIX = "review-";
const OPEN_REVIEW_STATES: readonly AuditReviewState[] = ["confirmed", "contested"];

const MESSAGES = {
  unsupported: "L'audit planifié est disponible pour les projets GitHub. Azure DevOps est prévu plus tard.",
  projectNotFound: "Projet introuvable.",
  runNotFound: "Audit introuvable.",
  findingNotFound: "Constat introuvable.",
  runActive: "Un audit est déjà en cours pour ce projet.",
  runNotActive: "Cet audit n'est pas en cours.",
  stoppedBeforeStart: "Audit arrêté avant son démarrage.",
  interrupted: "Audit interrompu par un redémarrage de l'application.",
  invalidSettings: "Réglages d'audit invalides.",
  invalidTimeZone: "Fuseau horaire inconnu.",
  noSlots: "Ce rythme ne tombe que le week-end : aucun audit ne serait lancé.",
  invalidStart: "Commit de reprise invalide.",
  unknownStart: "Commit de reprise introuvable dans le dépôt.",
  invalidDecision: "Décision invalide.",
  invalidCard: "Demande de carte invalide.",
  recheckRunning: "Une revérification est déjà en cours pour ce constat.",
  arbiterNeedsContested: "Seul un constat à arbitrer peut être soumis à un arbitre.",
  budgetReached: "Limite quotidienne de sessions d'audit atteinte sur ce poste.",
  tooManyAgents: "Trop d'agents d'audit en cours, réessayez dans un instant.",
  simulatedCard: "Un constat issu d'un audit simulé ne peut pas créer de carte.",
  unexpectedFailure: "Échec inattendu de l'audit.",
} as const;

type AbortReason = "yield" | "stop" | "shutdown";

export type AuditErrorCode = "invalid" | "not_found" | "conflict" | "unsupported";

export class AuditError extends Error {
  constructor(readonly code: AuditErrorCode, message: string) {
    super(message);
    this.name = "AuditError";
  }
}

export interface AuditManagerDeps {
  store: Store;
  system: SystemAdapter;
  hub: ClientHub;
  notifier: Notifier;
  repoMutex: KeyedMutex;
  ticketOperations: Pick<TicketOperations, "createTodoTicket">;
  slots: Pick<SlotManager, "abandonTicket">;
  now?: () => number;
}

interface ActiveAudit {
  runId: string;
  controller: AbortController;
  reason: AbortReason | null;
}

interface InFlightReview {
  ownerId: string;
  sessions: number;
  controller: AbortController;
}

interface UpsertOutcome {
  finding: AuditFinding;
  masked: boolean;
  newlyConfirmedCritical: boolean;
}

interface PersistedRun {
  run: AuditRun;
  actionable: AuditFinding[];
  newCritical: AuditFinding[];
}

const CADENCE_KEYS = ["dailyTime", "timeZone", "intervalHours", "anchorDate", "skipWeekends"] as const satisfies ReadonlyArray<keyof AuditCadenceSettings>;

function cadenceChanged(before: AuditCadenceSettings, after: AuditCadenceSettings): boolean {
  return CADENCE_KEYS.some((field) => before[field] !== after[field]);
}

function startOfLocalDay(now: number): number {
  const day = new Date(now);
  day.setHours(0, 0, 0, 0);
  return day.getTime();
}

function isDecisionActive(decision: AuditDecision, now: number): boolean {
  return decision.until === null || decision.until > now;
}

function normalizeRevision(value: string): string {
  return value.trim().toLowerCase();
}

function emptyCounts(): AuditRunCounts {
  return { critical: 0, warning: 0, contested: 0, rejected: 0, unverified: 0, masked: 0, deferred: 0 };
}

function countFinding(counts: AuditRunCounts, finding: AuditFinding): void {
  if (finding.reviewState === "confirmed") counts[finding.severity] += 1;
  else counts[finding.reviewState] += 1;
}

function reviewStateFromVerdicts(verdicts: readonly AuditVerdictRecord[], required: number): AuditReviewState {
  const confirmed = verdicts.filter((verdict) => verdict.verdict === "confirmed").length;
  if (confirmed === 0) return "rejected";
  if (confirmed < verdicts.length) return "contested";
  return verdicts.length >= required ? "confirmed" : "unverified";
}

function knownFinding(finding: AuditFinding): AuditKnownFinding {
  return { id: finding.id, fingerprint: finding.fingerprint, file: finding.file, symbol: finding.symbol, title: finding.title };
}

function isOpenFinding(finding: AuditFinding): boolean {
  return finding.decision === null && OPEN_REVIEW_STATES.includes(finding.reviewState);
}

function workspaceKey(prefix: string, projectKey: string): string {
  return `${prefix}-${projectKey}`.replace(WORKSPACE_KEY_UNSAFE, "-");
}

function auditBranch(settings: AuditProjectSettings, project: ProjectConfig): string {
  return settings.branch ?? project.baseBranch;
}

export class AuditManager {
  private readonly store: Store;
  private readonly system: SystemAdapter;
  private readonly hub: ClientHub;
  private readonly notifier: Notifier;
  private readonly repoMutex: KeyedMutex;
  private readonly cardDeps: AuditCardDeps;
  private readonly slots: Pick<SlotManager, "abandonTicket">;
  private readonly now: () => number;
  private readonly queue: string[] = [];
  private readonly reviews = new Map<string, InFlightReview>();
  private readonly sessionGate = new AuditSessionGate(AUDIT_MAX_PARALLEL_SESSIONS);
  private timer: ReturnType<typeof setInterval> | null = null;
  private active: ActiveAudit | null = null;
  private stopped = false;

  constructor(deps: AuditManagerDeps) {
    this.store = deps.store;
    this.system = deps.system;
    this.hub = deps.hub;
    this.notifier = deps.notifier;
    this.repoMutex = deps.repoMutex;
    this.slots = deps.slots;
    this.now = deps.now ?? Date.now;
    this.cardDeps = { store: deps.store, system: deps.system, ticketOperations: deps.ticketOperations, now: this.now };
    this.hub.setAuditOverviewSource(() => this.overview());
  }

  start(): void {
    const interrupted = this.store.interruptActiveAuditRuns(MESSAGES.interrupted, this.now());
    const cleared = this.store.clearAuditRecheckFlags();
    if (interrupted > 0 || cleared > 0) log.info("audits orphelins récupérés au démarrage", { interrupted, cleared });
    this.timer = setInterval(() => this.tick("scheduled"), AUDIT_SCHEDULER_TICK_MS);
    this.tick("catch_up");
    this.pushOverview();
  }

  stop(): void {
    this.stopped = true;
    if (this.timer !== null) clearInterval(this.timer);
    this.timer = null;
    this.abortActive("shutdown");
    for (const review of this.reviews.values()) review.controller.abort();
    this.reviews.clear();
  }

  overview(): AuditOverview {
    const now = this.now();
    const runs = this.store.listAuditRuns({ limit: AUDIT_RUNS_LIMIT });
    const projects = listProjectKeys().flatMap((key) => {
      try {
        if (getProject(key).hidden) return [];
        return [this.projectView(key, now)];
      } catch (error) {
        log.warn("vue d'audit du projet illisible", { project: key, error: getErrorMessage(error) });
        return [];
      }
    });
    const startedAt = new Map(runs.map((run) => [run.id, run.startedAt]));
    const ticketOrigins = this.store.listAuditFindingsWithTicket().flatMap((finding): AuditTicketOrigin[] => {
      if (finding.ticketId === null) return [];
      const runStartedAt = startedAt.get(finding.firstRunId) ?? this.store.getAuditRun(finding.firstRunId)?.startedAt ?? finding.createdAt;
      return [{ ticketId: finding.ticketId, findingId: finding.id, runId: finding.firstRunId, project: finding.project, runStartedAt }];
    });
    return { projects, runs, ticketOrigins, rechecking: [...this.reviews.keys()] };
  }

  private projectView(key: string, now = this.now()): AuditProjectView {
    const project = this.requireProject(key);
    const settings = this.store.getAuditProjectSettings(key);
    const state = this.store.getAuditProjectState(key);
    const supported = project.vcsProvider === "github";
    return {
      project: key,
      supported,
      unsupportedReason: supported ? null : MESSAGES.unsupported,
      settings,
      state,
      nextRunAt: supported && !project.hidden ? nextAuditRunAt(settings, state, now) : null,
      pendingTriage: this.store.countPendingAuditTriage(key),
    };
  }

  runDetail(runId: string): AuditRunDetail {
    const run = this.requireRun(runId);
    return { run, findings: this.store.listAuditFindingsForRun(runId) };
  }

  updateSettings(key: string, input: unknown): AuditProjectView {
    const project = this.requireProject(key);
    const parsed = updateAuditProjectSettingsSchema.safeParse(input);
    if (!parsed.success) throw new AuditError("invalid", MESSAGES.invalidSettings);
    if (parsed.data.timeZone !== undefined && !isValidTimeZone(parsed.data.timeZone)) throw new AuditError("invalid", MESSAGES.invalidTimeZone);
    if (parsed.data.enabled === true && project.vcsProvider !== "github") throw new AuditError("unsupported", MESSAGES.unsupported);
    const now = this.now();
    const before = this.store.getAuditProjectSettings(key);
    if (!hasAuditSlots({ ...before, ...parsed.data }, now)) throw new AuditError("invalid", MESSAGES.noSlots);
    const settings = this.store.updateAuditProjectSettings(key, parsed.data, now);
    if (settings.enabled && (!before.enabled || cadenceChanged(before, settings))) this.skipDueSlot(key, settings, now);
    this.pushOverview();
    return this.projectView(key, now);
  }

  private skipDueSlot(key: string, settings: AuditProjectSettings, now: number): void {
    const due = latestDueAuditSlot(settings, now);
    if (due !== null && pendingAuditSlot(settings, this.store.getAuditProjectState(key), now) !== null) this.store.updateAuditProjectState(key, { lastScheduledAt: due });
  }

  async setStart(key: string, input: unknown): Promise<AuditProjectView> {
    const project = this.requireProject(key);
    this.requireSupported(project);
    const parsed = auditSetStartInputSchema.safeParse(input);
    if (!parsed.success) throw new AuditError("invalid", MESSAGES.invalidStart);
    if (this.hasActiveRun(key)) throw new AuditError("conflict", MESSAGES.runActive);
    const sha = normalizeRevision(parsed.data.sha);
    try {
      await this.system.readGitRef(project.repoPath, sha);
    } catch {
      throw new AuditError("invalid", MESSAGES.unknownStart);
    }
    // TODO(ali): also require the commit to be on the first-parent chain of the audited branch; the adapter exposes no rev-list, so only a non-ancestor is caught, at run time (status "rewritten").
    if (this.hasActiveRun(key)) throw new AuditError("conflict", MESSAGES.runActive);
    const settings = this.store.getAuditProjectSettings(key);
    this.store.updateAuditProjectState(key, { lastSha: sha, lastBranch: auditBranch(settings, project) });
    this.pushOverview();
    return this.projectView(key);
  }

  runNow(key: string): AuditRun {
    const project = this.requireProject(key);
    this.requireSupported(project);
    if (this.hasActiveRun(key)) throw new AuditError("conflict", MESSAGES.runActive);
    const run = this.enqueueRun(key, "manual");
    this.drainQueue();
    return this.store.getAuditRun(run.id) ?? run;
  }

  stopRun(runId: string): AuditRun {
    const run = this.requireRun(runId);
    const isActive = this.active?.runId === runId;
    if (run.status === "waiting") {
      const index = this.queue.indexOf(runId);
      if (index !== -1) this.queue.splice(index, 1);
      const stopped = this.store.updateAuditRun(runId, { status: "failed", progress: null, waitingReason: null, error: MESSAGES.stoppedBeforeStart, finishedAt: this.now() });
      if (isActive) this.abortActive("stop");
      this.pushOverview();
      return stopped;
    }
    if (run.status === "running" && isActive) {
      this.abortActive("stop");
      return run;
    }
    throw new AuditError("conflict", MESSAGES.runNotActive);
  }

  async decide(findingId: string, input: unknown): Promise<AuditFinding> {
    const finding = this.requireFinding(findingId);
    const parsed = auditDecisionInputSchema.safeParse(input);
    if (!parsed.success) throw new AuditError("invalid", MESSAGES.invalidDecision);
    const now = this.now();
    const decision: AuditDecision = {
      kind: parsed.data.kind,
      note: parsed.data.note?.trim() || null,
      decidedAt: now,
      introducedBy: finding.introducedBy,
      until: parsed.data.kind === "not_priority" ? now + AUDIT_NOT_PRIORITY_MASK_DAYS * AUDIT_DAY_MS : null,
    };
    const updated = this.store.saveAuditFinding({ ...finding, decision, updatedAt: now });
    if (parsed.data.abandonTodoCard && updated.ticketId !== null) {
      const ticket = this.store.getTicket(updated.ticketId);
      if (ticket && ticket.column === PROJECT_TODO_COLUMN && ticket.triageStatus !== "running") await this.slots.abandonTicket(ticket.id);
    }
    this.pushOverview();
    return this.store.getAuditFinding(findingId) ?? updated;
  }

  clearDecision(findingId: string): AuditFinding {
    const finding = this.requireFinding(findingId);
    const updated = this.store.saveAuditFinding({ ...finding, decision: null, updatedAt: this.now() });
    this.pushOverview();
    return updated;
  }

  createCard(findingId: string, input: unknown): { finding: AuditFinding; ticketId: string } {
    const finding = this.requireFinding(findingId);
    const parsed = auditCreateCardInputSchema.safeParse(input ?? {});
    if (!parsed.success) throw new AuditError("invalid", MESSAGES.invalidCard);
    const project = this.requireProject(finding.project);
    this.requireSupported(project);
    const origin = this.store.getAuditRun(finding.firstRunId);
    if (origin?.simulated && !this.system.dryRun) throw new AuditError("conflict", MESSAGES.simulatedCard);
    const settings = this.store.getAuditProjectSettings(finding.project);
    const context = this.cardContext(finding, project, settings);
    try {
      const result = createAuditCard(this.cardDeps, finding, context, {
        start: parsed.data.start,
        provider: parsed.data.provider ?? this.cardProvider(settings),
        autoCreated: false,
      });
      this.pushOverview();
      return result;
    } catch (error) {
      if (error instanceof TicketOperationError) {
        if (error.code === "NOT_FOUND") throw new AuditError("not_found", error.message);
        if (error.code === "CONFLICT") throw new AuditError("conflict", error.message);
        throw new AuditError("invalid", error.message);
      }
      throw error;
    }
  }

  review(findingId: string, mode: "recheck" | "arbiter"): AuditFinding {
    const finding = this.requireFinding(findingId);
    const project = this.requireProject(finding.project);
    this.requireSupported(project);
    if (finding.recheckRunning || this.reviews.has(findingId)) throw new AuditError("conflict", MESSAGES.recheckRunning);
    if (mode === "arbiter" && finding.reviewState !== "contested") throw new AuditError("conflict", MESSAGES.arbiterNeedsContested);
    const sessions = auditReviewSessionCount(finding, mode);
    if (this.remainingSessionBudget() < sessions) throw new AuditError("conflict", MESSAGES.budgetReached);
    const release = this.sessionGate.tryAcquire();
    if (release === null) throw new AuditError("conflict", MESSAGES.tooManyAgents);
    let updated: AuditFinding;
    try {
      updated = this.store.saveAuditFinding({ ...finding, recheckRunning: true, updatedAt: this.now() });
    } catch (error) {
      release();
      throw error;
    }
    const review: InFlightReview = { ownerId: `${REVIEW_RUN_PREFIX}${nanoid(REVIEW_ID_LENGTH)}`, sessions, controller: new AbortController() };
    this.reviews.set(findingId, review);
    this.pushOverview();
    void this.runReview(updated, project, mode, review)
      .catch((error: unknown) => log.error("revérification du constat interrompue", { findingId, mode, error: getErrorMessage(error) }))
      .finally(() => {
        this.reviews.delete(findingId);
        release();
        this.pushOverview();
      });
    return updated;
  }

  private requireProject(key: string): ProjectConfig {
    if (!isProjectKey(key)) throw new AuditError("not_found", MESSAGES.projectNotFound);
    return getProject(key);
  }

  private requireSupported(project: ProjectConfig): void {
    if (project.vcsProvider !== "github") throw new AuditError("unsupported", MESSAGES.unsupported);
  }

  private requireRun(runId: string): AuditRun {
    const run = this.store.getAuditRun(runId);
    if (!run) throw new AuditError("not_found", MESSAGES.runNotFound);
    return run;
  }

  private requireFinding(findingId: string): AuditFinding {
    const finding = this.store.getAuditFinding(findingId);
    if (!finding) throw new AuditError("not_found", MESSAGES.findingNotFound);
    return finding;
  }

  private hasActiveRun(project: string): boolean {
    return this.store.listActiveAuditRuns().some((run) => run.project === project);
  }

  private isIdle(): boolean {
    return this.store.listSlots().every((slot) => slot.status !== "busy") && this.store.countRunningCardExecutions() === 0;
  }

  private remainingSessionBudget(): number {
    const reviews = [...this.reviews.values()];
    const reserved = reviews.reduce((sum, review) => sum + review.sessions, 0);
    const used = this.store.countAuditSessionsSince(startOfLocalDay(this.now()), reviews.map((review) => review.ownerId));
    return AUDIT_DAILY_SESSION_LIMIT - used - reserved;
  }

  private pushOverview(): void {
    if (this.stopped) return;
    this.hub.pushAudits();
  }

  private cardProvider(settings: AuditProjectSettings): AuditProvider {
    return settings.provider ?? DEFAULT_AUDIT_PROVIDER;
  }

  private cardContext(finding: AuditFinding, project: ProjectConfig, settings: AuditProjectSettings): AuditCardContext {
    const origin = this.store.getAuditRun(finding.firstRunId);
    const latest = this.store.getAuditRun(finding.lastRunId);
    return {
      projectKey: finding.project,
      project,
      branch: latest?.branch ?? origin?.branch ?? auditBranch(settings, project),
      auditStartedAt: origin?.startedAt ?? finding.createdAt,
      timeZone: settings.timeZone,
    };
  }

  private engineDeps(acquireSession: AuditEngineDeps["acquireSession"]): AuditEngineDeps {
    return { system: this.system, store: this.store, now: this.now, acquireSession };
  }

  private executionFor(settings: AuditProjectSettings, codexCatalog: readonly CodexRuntimeModel[] | null): AuditExecution {
    const base = resolveExecution(AUDIT_ROLE, AUDIT_EXECUTION_OVERRIDES[this.cardProvider(settings)], { model: MODELS.triage, effort: MODELS.triageEffort });
    if (base.provider === "claude") {
      const model = agentModelSchema.safeParse(settings.model);
      const effort = agentEffortSchema.safeParse(settings.effort);
      return { provider: "claude", model: model.success ? model.data : base.model, effort: effort.success ? effort.data : base.effort, serviceTier: "default" };
    }
    if (codexCatalog === null) return { provider: "codex", model: settings.model ?? base.model, effort: settings.effort ?? base.effort, serviceTier: "default" };
    const preferred = [settings.model, base.model, MODELS.codexModel];
    const capability = preferred.flatMap((model) => codexCatalog.filter((entry) => entry.model === model))[0] ?? codexCatalog[0];
    const effort = codexEffortSchema.safeParse(settings.effort ?? base.effort);
    let resolvedEffort = base.effort;
    if (capability) resolvedEffort = effort.success && capability.efforts.includes(effort.data) ? effort.data : capability.defaultEffort;
    return { provider: "codex", model: capability?.model ?? base.model, effort: resolvedEffort, serviceTier: "default" };
  }

  private async resolveExecution(settings: AuditProjectSettings): Promise<AuditExecution> {
    const catalog = this.cardProvider(settings) === "codex" ? (await this.system.checkCodexRuntime(true)).models : null;
    const execution = this.executionFor(settings, catalog);
    await assertExecutionAvailable(this.system, { provider: execution.provider, model: execution.model, effort: execution.effort, serviceTier: "default" });
    return execution;
  }

  private tick(trigger: "scheduled" | "catch_up"): void {
    if (this.stopped) return;
    const now = this.now();
    for (const key of listProjectKeys()) {
      try {
        this.scheduleProject(key, trigger, now);
      } catch (error) {
        log.error("planification de l'audit échouée", { project: key, error: getErrorMessage(error) });
      }
    }
    this.drainQueue();
  }

  private scheduleProject(key: string, trigger: "scheduled" | "catch_up", now: number): void {
    const project = getProject(key);
    const settings = this.store.getAuditProjectSettings(key);
    if (!settings.enabled || project.hidden || project.vcsProvider !== "github") return;
    if (this.hasActiveRun(key)) return;
    const state = this.store.getAuditProjectState(key);
    const latest = this.store.listAuditRuns({ project: key, limit: 1 })[0];
    if (latest?.status === "interrupted") {
      this.enqueueRun(key, latest.trigger);
      return;
    }
    const slot = pendingAuditSlot(settings, state, now);
    if (slot === null) return;
    this.store.updateAuditProjectState(key, { lastScheduledAt: slot });
    if (latest?.status === "rewritten" && latest.baseSha === state.lastSha) {
      log.info("audit planifié ignoré : historique réécrit, commit de reprise attendu", { project: key });
      return;
    }
    this.enqueueRun(key, trigger);
  }

  private enqueueRun(key: string, trigger: AuditRunTrigger): AuditRun {
    const project = getProject(key);
    const settings = this.store.getAuditProjectSettings(key);
    const state = this.store.getAuditProjectState(key);
    const branch = auditBranch(settings, project);
    const planned = this.executionFor(settings, null);
    const now = this.now();
    const run = this.store.saveAuditRun({
      id: nanoid(RUN_ID_LENGTH),
      project: key,
      trigger,
      status: "waiting",
      branch,
      baseSha: state.lastBranch === branch ? state.lastSha : null,
      tipSha: null,
      coveredSha: null,
      commitCount: 0,
      deferredCommitCount: 0,
      provider: planned.provider,
      model: planned.model,
      effort: planned.effort,
      analystSessions: 0,
      verifierSessions: 0,
      progress: null,
      coverage: [],
      counts: emptyCounts(),
      autoCreated: 0,
      autoLaunched: 0,
      observation: state.observationUntil !== null && now < state.observationUntil,
      simulated: this.system.dryRun,
      waitingReason: null,
      costUsd: null,
      error: null,
      startedAt: now,
      finishedAt: null,
    });
    this.queue.push(run.id);
    log.info("audit mis en file", { project: key, runId: run.id, trigger });
    this.pushOverview();
    return run;
  }

  private drainQueue(): void {
    if (this.stopped || this.active !== null) return;
    while (this.queue.length > 0) {
      const head = this.queue[0];
      if (head !== undefined && this.store.getAuditRun(head)?.status === "waiting") break;
      this.queue.shift();
    }
    const runId = this.queue[0];
    if (runId === undefined) return;
    const reason = this.waitingReason();
    if (reason !== null) {
      this.markWaiting(runId, reason);
      return;
    }
    this.queue.shift();
    void this.execute(runId);
  }

  private waitingReason(): AuditWaitingReason | null {
    if (!this.isIdle()) return "cards_running";
    if (this.remainingSessionBudget() < AUDIT_MIN_RUN_SESSIONS) return "budget";
    return null;
  }

  private markWaiting(runId: string, reason: AuditWaitingReason): void {
    if (this.store.getAuditRun(runId)?.waitingReason === reason) return;
    this.store.updateAuditRun(runId, { waitingReason: reason });
    this.pushOverview();
  }

  private abortActive(reason: AbortReason): void {
    const active = this.active;
    if (active === null || active.controller.signal.aborted) return;
    active.reason = reason;
    active.controller.abort();
    log.info("audit interrompu", { runId: active.runId, reason });
  }

  private failRun(runId: string, error: string): void {
    const run = this.store.getAuditRun(runId);
    if (!run || !AUDIT_ACTIVE_RUN_STATUSES.includes(run.status)) return;
    this.store.updateAuditRun(runId, { status: "failed", progress: null, waitingReason: null, error, finishedAt: this.now() });
    const label = isProjectKey(run.project) ? getProject(run.project).label : run.project;
    void this.notifier.notify("Audit planifié en échec", `${label} : ${error}`);
  }

  private async execute(runId: string): Promise<void> {
    const active: ActiveAudit = { runId, controller: new AbortController(), reason: null };
    this.active = active;
    const yieldTimer = setInterval(() => {
      if (!this.isIdle()) this.abortActive("yield");
    }, AUDIT_YIELD_CHECK_MS);
    try {
      await this.runAudit(active);
    } catch (error) {
      log.error("audit en échec", { runId, error: getErrorMessage(error) });
      if (!this.stopped) this.failRun(runId, getErrorMessage(error, MESSAGES.unexpectedFailure));
    } finally {
      clearInterval(yieldTimer);
      this.active = null;
      if (!this.stopped) {
        this.pushOverview();
        this.drainQueue();
      }
    }
  }

  private async runAudit(active: ActiveAudit): Promise<void> {
    const run = this.store.getAuditRun(active.runId);
    if (!run || run.status !== "waiting") return;
    const project = this.requireProject(run.project);
    this.requireSupported(project);
    const settings = this.store.getAuditProjectSettings(run.project);
    const execution = await this.resolveExecution(settings);
    if (this.stopped || this.store.getAuditRun(run.id)?.status !== "waiting") return;
    const state = this.store.getAuditProjectState(run.project);
    const baseSha = state.lastBranch === run.branch ? state.lastSha : null;
    this.store.updateAuditRun(run.id, {
      status: "running",
      waitingReason: null,
      provider: execution.provider,
      model: execution.model,
      effort: execution.effort,
      baseSha,
      startedAt: this.now(),
      progress: { phase: "preparing", done: 0, total: 0 },
    });
    this.pushOverview();
    let workspace: AnalysisWorkspace | null = null;
    let result: AuditPipelineResult;
    try {
      workspace = await prepareAnalysisWorkspace(this.system, this.repoMutex, project.repoPath, run.branch, workspaceKey("audit", run.project));
      const findings = this.store.listAuditFindings(run.project);
      result = await runAuditPipeline(this.engineDeps((signal) => this.sessionGate.acquire(signal)), {
        runId: run.id,
        project,
        branch: run.branch,
        cwd: workspace.cwd,
        baseSha,
        execution,
        knownFindings: findings.map(knownFinding),
        openFindings: findings.filter(isOpenFinding).map(knownFinding),
        includeWarnings: settings.includeWarnings,
        sessionBudget: Math.max(0, this.remainingSessionBudget()),
        onProgress: (progress) => this.recordProgress(run.id, progress),
        signal: active.controller.signal,
      });
    } catch (error) {
      result = emptyAuditResult("failed", baseSha, null, null, getErrorMessage(error, MESSAGES.unexpectedFailure));
    } finally {
      if (workspace !== null) await releaseAnalysisWorkspace(this.system, this.repoMutex, workspace);
    }
    if (this.stopped) return;
    const persisted = this.persistResult(run.id, result);
    log.info("audit terminé", { runId: run.id, project: run.project, status: persisted.run.status, reason: active.reason });
    if (active.reason === "yield" && persisted.run.status === "partial") this.enqueueRun(run.project, persisted.run.trigger);
    await this.afterRun(persisted, project, settings);
  }

  private recordProgress(runId: string, progress: AuditRunProgress): void {
    if (this.stopped) return;
    this.store.updateAuditRun(runId, { progress });
    this.pushOverview();
  }

  private findExisting(project: string, candidate: AuditPipelineCandidate): AuditFinding | null {
    if (candidate.duplicateOf !== null) {
      const duplicate = this.store.getAuditFinding(candidate.duplicateOf);
      if (duplicate && duplicate.project === project) return duplicate;
    }
    return this.store.getAuditFindingByFingerprint(project, candidate.fingerprint);
  }

  private resurfaces(existing: AuditFinding, decision: AuditDecision, candidate: AuditPipelineCandidate): boolean {
    if (decision.kind === "already_fixed") return true;
    const sameSymbol = existing.file === candidate.finding.file && (existing.symbol.trim() === "" || existing.symbol === candidate.finding.symbol);
    return sameSymbol && normalizeRevision(candidate.finding.introducedBy) !== normalizeRevision(decision.introducedBy);
  }

  private upsertFinding(run: AuditRun, candidate: AuditPipelineCandidate, now: number): UpsertOutcome {
    const existing = this.findExisting(run.project, candidate);
    const agent = candidate.finding;
    if (existing === null) {
      const finding = this.store.saveAuditFinding({
        ...agent,
        id: nanoid(FINDING_ID_LENGTH),
        project: run.project,
        fingerprint: candidate.fingerprint,
        firstRunId: run.id,
        lastRunId: run.id,
        seenCount: 1,
        lens: candidate.lens,
        reviewState: candidate.reviewState,
        verdicts: candidate.verdicts,
        citation: candidate.citation,
        decision: null,
        ticketId: null,
        autoCreated: false,
        recheckRunning: false,
        createdAt: now,
        updatedAt: now,
      }, 0);
      return { finding, masked: false, newlyConfirmedCritical: finding.reviewState === "confirmed" && finding.severity === "critical" };
    }
    const seen = {
      lastRunId: run.id,
      seenCount: existing.lastRunId === run.id ? existing.seenCount : existing.seenCount + 1,
      updatedAt: now,
    };
    const decision = existing.decision;
    if (decision !== null && isDecisionActive(decision, now) && !this.resurfaces(existing, decision, candidate)) {
      return { finding: this.store.saveAuditFinding({ ...existing, ...seen }), masked: true, newlyConfirmedCritical: false };
    }
    const refreshed = existing.ticketId === null
      ? {
        severity: agent.severity,
        line: agent.line,
        scenario: agent.scenario,
        expected: agent.expected,
        expectedSource: agent.expectedSource,
        impact: agent.impact,
        evidence: agent.evidence,
        introducedBy: agent.introducedBy,
        suggestedFix: agent.suggestedFix,
        lens: candidate.lens,
        citation: candidate.citation,
      }
      : {};
    const finding = this.store.saveAuditFinding({
      ...existing,
      ...refreshed,
      ...seen,
      reviewState: candidate.reviewState === "unverified" ? existing.reviewState : candidate.reviewState,
      verdicts: [...existing.verdicts, ...candidate.verdicts],
      decision: null,
    });
    const wasVisibleConfirmed = existing.reviewState === "confirmed" && decision === null;
    return { finding, masked: false, newlyConfirmedCritical: !wasVisibleConfirmed && finding.reviewState === "confirmed" && finding.severity === "critical" };
  }

  private persistResult(runId: string, result: AuditPipelineResult): PersistedRun {
    return this.store.transaction(() => {
      const now = this.now();
      const run = this.requireRun(runId);
      const counts = { ...emptyCounts(), deferred: result.deferredCommitCount };
      const actionable: AuditFinding[] = [];
      const newCritical: AuditFinding[] = [];
      for (const candidate of result.candidates) {
        const outcome = this.upsertFinding(run, candidate, now);
        if (outcome.masked) {
          counts.masked += 1;
          continue;
        }
        countFinding(counts, outcome.finding);
        if (outcome.newlyConfirmedCritical) newCritical.push(outcome.finding);
        if (outcome.finding.reviewState === "confirmed" && outcome.finding.decision === null && outcome.finding.ticketId === null) actionable.push(outcome.finding);
      }
      const advances = !run.simulated && (result.status === "completed" || result.status === "partial" || result.status === "no_changes") && result.coveredSha !== null;
      if (advances) this.store.updateAuditProjectState(run.project, { lastSha: result.coveredSha, lastBranch: run.branch });
      const updated = this.store.updateAuditRun(runId, {
        status: result.status,
        baseSha: result.baseSha,
        tipSha: result.tipSha,
        coveredSha: result.coveredSha,
        commitCount: result.commitCount,
        deferredCommitCount: result.deferredCommitCount,
        analystSessions: result.analystSessions,
        verifierSessions: result.verifierSessions,
        progress: null,
        coverage: result.coverage,
        counts,
        costUsd: result.costUsd,
        error: result.error,
        finishedAt: now,
      });
      this.store.pruneAuditRuns(run.project, AUDIT_RUNS_LIMIT);
      return { run: updated, actionable, newCritical };
    });
  }

  private async afterRun(persisted: PersistedRun, project: ProjectConfig, settings: AuditProjectSettings): Promise<void> {
    const { run, actionable, newCritical } = persisted;
    this.pushOverview();
    if (run.status === "failed") void this.notifier.notify("Audit planifié en échec", `${project.label} : ${run.error ?? MESSAGES.unexpectedFailure}`);
    const [first] = newCritical;
    if (first !== undefined) {
      const body = newCritical.length === 1 ? `${project.label} — ${first.title}` : `${project.label} — ${newCritical.length} constats critiques confirmés`;
      void this.notifier.notify("Audit planifié : constat critique", body);
    }
    if (actionable.length === 0 || settings.cardMode === "manual") return;
    const cards = await applyAutoCards(this.cardDeps, {
      context: { projectKey: run.project, project, branch: run.branch, auditStartedAt: run.startedAt, timeZone: settings.timeZone },
      cardMode: settings.cardMode,
      autoLaunchMax: settings.autoLaunchMax,
      provider: this.cardProvider(settings),
      simulated: run.simulated,
      observation: run.observation,
      findings: actionable,
    });
    if (this.stopped) return;
    if (cards.skippedReason !== null) log.info("cartes automatiques ignorées", { runId: run.id, reason: cards.skippedReason });
    if (cards.created > 0) this.store.updateAuditRun(run.id, { autoCreated: cards.created, autoLaunched: cards.launched });
    this.pushOverview();
  }

  private async runReview(finding: AuditFinding, project: ProjectConfig, mode: "recheck" | "arbiter", review: InFlightReview): Promise<void> {
    let workspace: AnalysisWorkspace | null = null;
    try {
      const settings = this.store.getAuditProjectSettings(finding.project);
      const branch = this.cardContext(finding, project, settings).branch;
      const execution = await this.resolveExecution(settings);
      workspace = await prepareAnalysisWorkspace(this.system, this.repoMutex, project.repoPath, branch, workspaceKey(`audit-${mode}`, finding.project));
      const revision = await this.system.readGitRef(workspace.cwd, "HEAD");
      const verdicts = await reviewAuditFinding(this.engineDeps(async () => () => undefined), {
        runId: review.ownerId,
        finding,
        project,
        cwd: workspace.cwd,
        revision,
        execution,
        mode,
        signal: review.controller.signal,
      });
      if (this.stopped) return;
      const current = this.store.getAuditFinding(finding.id);
      if (!current) return;
      this.store.saveAuditFinding({
        ...current,
        recheckRunning: false,
        verdicts: [...current.verdicts, ...verdicts],
        reviewState: mode === "arbiter" ? reviewStateFromVerdicts(verdicts, 1) : reviewStateFromVerdicts(verdicts, review.sessions),
        severity: verdicts
          .filter((verdict) => verdict.verdict === "confirmed")
          .reduce((severity, verdict) => lowerSeverity(severity, verdict.severity), current.severity),
        updatedAt: this.now(),
      });
    } catch (error) {
      log.error("revérification du constat échouée", { findingId: finding.id, mode, error: getErrorMessage(error) });
      this.clearRecheckFlag(finding.id);
    } finally {
      if (workspace !== null) await releaseAnalysisWorkspace(this.system, this.repoMutex, workspace).catch((error: unknown) => log.warn("libération de l'espace de revérification impossible", { findingId: finding.id, error: getErrorMessage(error) }));
    }
  }

  private clearRecheckFlag(findingId: string): void {
    if (this.stopped) return;
    try {
      const current = this.store.getAuditFinding(findingId);
      if (current?.recheckRunning) this.store.saveAuditFinding({ ...current, recheckRunning: false, updatedAt: this.now() });
    } catch (error) {
      log.warn("indicateur de revérification non effacé", { findingId, error: getErrorMessage(error) });
    }
  }
}
