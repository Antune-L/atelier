import { join } from "node:path";

import { isDependencyReady } from "../../shared/dependencies.ts";
import { startBlocker } from "../../shared/startBlocker.ts";
import { canUpdateDependencyBase } from "../../shared/ticketMerge.ts";
import type { UpdateDependencyBaseResult } from "../../shared/ticketMerge.ts";
import type { AutonomousWorkspaces } from "../../shared/autonomous.ts";
import {
  ACTIVE_STAGES,
  AUTO_MERGE_RESOLVE_EVENT,
  AUTO_MERGE_RESOLVE_MAX,
  AUTO_RECLAIM_EVENT,
  AUTO_RECLAIM_MAX,
  isAllowedAgentPair,
  CLEANER_BRANCH_SUFFIX,
  DONE_GATE_FAILED_EVENT,
  DONE_GATE_MAX_FAILURES,
  REVIEWER_BRANCH_SUFFIX,
  TERMINAL_STAGES,
  type Column,
  type PrState,
} from "../../shared/constants.ts";
import { getErrorMessage, getErrorStack } from "../../shared/errors.ts";
import { hasUnresolvedImplementation } from "../../shared/implementationPlan.ts";
import type { QualityGate, QualityIteration, QualityRunStatus } from "../../shared/quality.ts";
import { agentEffortSchema, agentModelSchema, codexEffortSchema, codexModelSchema, type ErrorDetailsSource, type Slot, type Ticket, type WorktreeSession } from "../../shared/schemas.ts";
import { MODELS, SLOTS_ROOT, getProject, isProjectKey, projectVcsProvider } from "../config.ts";
import type { ProjectConfig } from "../config.ts";

import type { ReviewPass, Store } from "../db/store.ts";
import { isCloudHost } from "../hostRole.ts";
import type { ClientHub } from "../hub.ts";
import type { TicketLifecycle } from "../lifecycle.ts";
import { createLogger } from "../logger.ts";
import { KeyedMutex } from "../mutex.ts";
import type { Notifier } from "../notifier.ts";
import { autonomousOptionsError } from "../ticketOperations.ts";
import type { SystemAdapter } from "../system/index.ts";
import type { AgentExecutionGuard } from "../system/agentSession.ts";
import type { DoneGateResult, ReviewPublicationState } from "../system/types.ts";
import { REVIEW_PUBLICATION_STATE_BY_EVENT } from "../system/types.ts";
import { hasStructuredPrDescription } from "../system/vcs/prDescription.ts";

import { requireForkBaseBranch, resolveExecutionBaseBranch, resolvePrTargetBaseBranch } from "./baseBranch.ts";
import { DependencyReconciliation, matchesTicketDelivery } from "./dependencyReconciliation.ts";
import { createAutonomousSessionGuard } from "./autonomousSessionGuard.ts";
import { AutonomousPartialDelivery } from "./autonomousPartialDelivery.ts";
import { isFirstFeatureDelivery } from "./prDescription.ts";
import { buildRecoveryContext, recoveryStage } from "./recoveryContext.ts";
import { reviewPublicationEvent } from "./reviewFindings.ts";
import { publishedReviewFindings } from "./reviewPass.ts";
import { assertExecutionAvailable, resolveTicketExecution, type ResolvedExecution } from "./executionConfig.ts";
import {
  buildAskContract,
  buildCleanContract,
  buildConflictResolutionContract,
  buildReviewContract,
  buildTicketContract,
} from "./contract.ts";
import { buildImplementSessionConfig, codexImplementerKnobs } from "./sessionConfig.ts";
import type { SessionHub } from "./sessionHub.ts";
import { resolveTemplatePaths } from "./slotTemplates.ts";
import { WorktreeAddressWatcher } from "./worktreeAddressWatcher.ts";

async function assertCodexImplementerAvailable(
  system: SystemAdapter,
  ticket: Ticket,
  parent: ResolvedExecution,
): Promise<void> {
  if (ticket.kind !== "feature" || ticket.implementer !== "codex" || ticket.resolvingConflicts) return;
  const delegate = codexImplementerKnobs(ticket);
  if (
    parent.provider === "codex"
    && parent.model === delegate.model
    && parent.effort === delegate.effort
    && parent.serviceTier === delegate.serviceTier
  ) return;
  await assertExecutionAvailable(system, {
    provider: "codex",
    model: delegate.model,
    effort: delegate.effort,
    serviceTier: delegate.serviceTier,
  });
}

const AUTONOMOUS_DELIVERY_CANCEL_WAIT_MS = 120_000;
const MIN_PREPARATION_TIMEOUT_MS = 1;
const QUALITY_TECHNICAL_CHECK_NAMES: string[] = ["typecheck", "lint", "test"];
const QUALITY_TECHNICAL_OUTPUT_LIMIT = 4_000;
const MAX_SLUG_WORDS = 6;
const SLUG_MAX_LENGTH = 40;
const UNRESOLVED_IMPLEMENTATION_DELIVERY_REASON = "Unresolved implementation obligations prevent delivery. Use implementation recovery and its normal pull request delivery checks before completing this ticket.";

/** tmux session-name prefix for a standalone (ticket-less) runnable worktree session. */
const WORKTREE_SESSION_PREFIX = "worktree";
const PR_DESCRIPTION_APPLY_FAILED_EVENT = "pr_description_apply_failed";
const QUEUED_RESUMED_EVENT = "queued_resumed";
const QUEUED_RESUME_MAX_AGE_DAYS = 7;
const QUEUED_RESUME_MAX_AGE_MS = QUEUED_RESUME_MAX_AGE_DAYS * 24 * 60 * 60 * 1000;
const MERGE_SKIPPED_AFTER_REVIEW_LIMIT_EVENT = "merge_skipped_after_review_limit";
const MERGE_SKIPPED_REVIEW_LEVEL_HIGH_EVENT = "merge_skipped_review_level_high";

/** Branch-name prefix of a standalone worktree session's fresh branch. */
const WORKTREE_BRANCH_PREFIX = "worktree";

/** Mirrors what publish_review actually posts: same kept findings, same event → same review state. */
export function reviewPublicationState(reviewPass: ReviewPass | null): ReviewPublicationState | null {
  const findings = publishedReviewFindings(reviewPass);
  if (findings === null) return null;
  return REVIEW_PUBLICATION_STATE_BY_EVENT[reviewPublicationEvent(findings)];
}

/**
 * Outcome of an auto-reclaim attempt:
 * - `reclaimed`: relaunched in place; caller does nothing.
 * - `escalate`: cap hit or relaunch failed; caller marks stalled/interrupted + notifies.
 * - `ignore`: no slot held or a launch is already in flight; caller does nothing (no escalation).
 */
export type ReclaimOutcome = "reclaimed" | "escalate" | "ignore";

const log = createLogger("slot");

/** Human-readable setup phases surfaced to the terminal view before the agent produces output. */
const SETUP_PHASES = {
  worktree: "Préparation du worktree…",
  setup: "Configuration du worktree (script projet)…",
  deps: "Installation des dépendances…",
  launching: "Lancement du projet…",
  spawning: "Démarrage de la session Claude…",
  waiting: "En attente de la première sortie de l'agent…",
} as const;

export interface FinishTicketOptions {
  skipMerge?: boolean;
  skipPrDescription?: boolean;
}

export interface SlotManagerConfig {
  /** Read-only resources root, used to resolve the vendored composer driver script path. */
  projectRoot: string;
}

interface AutonomousSlotWorkflow {
  assertDelivery(ticketId: string, revision: string): Promise<void>;
  finishDelivery(ticketId: string): Promise<void>;
  startExecution?(ticketId: string): void;
  assertResumeConfiguration?(ticketId: string): void;
}

export function slugify(title: string): string {
  return title
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .split("-")
    .slice(0, MAX_SLUG_WORDS)
    .join("-")
    .slice(0, SLUG_MAX_LENGTH);
}

export function slotPath(slotId: number): string {
  return join(SLOTS_ROOT, `slot-${slotId}`);
}

function featureBranch(ticket: Ticket): string {
  return `feat/${ticket.id}-${slugify(ticket.title)}`;
}

/**
 * Owns the full slot lifecycle: cleanup → fetch → worktree add → deposit config →
 * copy env → install → tmux spawn → done gate → release. Serializes git ops per repo.
 */
export class SlotManager {
  private autonomousWorkflow: AutonomousSlotWorkflow | null = null;
  private autonomousPartialDelivery: AutonomousPartialDelivery | null = null;
  private autonomousQuiesce: ((ticketId: string) => Promise<boolean>) | null = null;
  private autonomousHasWriters: ((ticketId: string) => boolean) | null = null;
  private autonomousRetainedWorkspaces: ((ticketId: string) => Promise<AutonomousWorkspaces["children"]>) | null = null;
  private readonly autonomousDeliveries = new Map<string, Promise<void>>();
  private readonly autonomousPartialPublications = new Map<string, Promise<void>>();
  private readonly autonomousDeliveryStops = new Set<string>();
  private readonly repoMutex: KeyedMutex;
  private readonly queue: string[] = [];
  private readonly claimedSlots = new Set<number>();
  private readonly deferredDependents = new Set<string>();
  private readonly updatingDependencyBases = new Set<string>();
  private readonly dependencyReconciliation: DependencyReconciliation;
  /** Live setup phase per ticket, shown in the terminal view until the agent outputs. */
  private readonly setupPhase = new Map<string, string>();
  private readonly phaseStartedAt = new Map<string, number>();
  private delegationDrain: ((ticketId: string) => Promise<void>) | null = null;
  private implementationPlanResume: ((ticket: Ticket, slotId: number) => Promise<void>) | null = null;
  private implementationRecoveryGuard: ((ticketId: string, slotId: number, prUrl: string) => Promise<{ ok: boolean; result: string }>) | null = null;
  private qualityGate: ((ticketId: string, mode: "strict" | "reservations") => Promise<QualityGate>) | null = null;
  private qualityCancel: ((ticketId: string) => Promise<void>) | null = null;
  private qualityIterationVerifier: ((ticketId: string, worktreePath: string, iterationId: string) => Promise<void>) | null = null;
  private readonly qualityCorrectionStarts = new Set<string>();
  /** Watches each active worktree session's `.wt-offset` to re-push addresses once the dev server writes it. */
  private readonly watcher = new WorktreeAddressWatcher(() =>
    this.hub.pushWorktreeSessions(this.store.listWorktreeSessions()),
  );

  /** Current pre-output setup phase for a ticket (null once the agent is producing output). */
  getSetupPhase(ticketId: string): string | null {
    return this.setupPhase.get(ticketId) ?? null;
  }

  private setPhase(ticketId: string, phase: string): void {
    this.recordPhaseEnd(ticketId);
    this.setupPhase.set(ticketId, phase);
    this.phaseStartedAt.set(ticketId, Date.now());
    if (this.store.getTicket(ticketId)) this.store.logEvent(ticketId, "setup_phase_started", { phase });
    log.info(phase, { ticketId });
  }

  private clearPhase(ticketId: string): void {
    this.recordPhaseEnd(ticketId);
    this.setupPhase.delete(ticketId);
    this.phaseStartedAt.delete(ticketId);
  }

  private recordPhaseEnd(ticketId: string): void {
    const phase = this.setupPhase.get(ticketId);
    const startedAt = this.phaseStartedAt.get(ticketId);
    if (phase && startedAt !== undefined && this.store.getTicket(ticketId)) {
      this.store.logEvent(ticketId, "setup_phase_finished", { phase, durationMs: Date.now() - startedAt });
    }
  }

  constructor(
    private readonly store: Store,
    private readonly system: SystemAdapter,
    private readonly hub: ClientHub,
    private readonly sessionHub: SessionHub,
    private readonly notifier: Notifier,
    private readonly lifecycle: TicketLifecycle,
    private readonly config: SlotManagerConfig,
    repoMutex = new KeyedMutex(),
  ) {
    this.repoMutex = repoMutex;
    this.dependencyReconciliation = new DependencyReconciliation(store, system, hub, notifier, (ticket) => this.markMerged(ticket.id, ticket));
  }

  setDelegationDrain(drain: (ticketId: string) => Promise<void>): void {
    this.delegationDrain = drain;
  }

  setImplementationPlanResume(resume: (ticket: Ticket, slotId: number) => Promise<void>): void {
    this.implementationPlanResume = resume;
  }

  setImplementationRecoveryGuard(guard: (ticketId: string, slotId: number, prUrl: string) => Promise<{ ok: boolean; result: string }>): void {
    this.implementationRecoveryGuard = guard;
  }

  setAutonomousWorkflow(workflow: AutonomousSlotWorkflow): void {
    this.autonomousWorkflow = workflow;
  }

  setAutonomousRecovery(callbacks: {
    quiesce(ticketId: string): Promise<boolean>;
    hasWriters(ticketId: string): boolean;
    workspaces(ticketId: string): Promise<AutonomousWorkspaces["children"]>;
  }): void {
    this.autonomousQuiesce = callbacks.quiesce;
    this.autonomousHasWriters = callbacks.hasWriters;
    this.autonomousRetainedWorkspaces = callbacks.workspaces;
    this.autonomousPartialDelivery = new AutonomousPartialDelivery({
      store: this.store,
      system: this.system,
      onChange: (ticketId) => { const ticket = this.store.getTicket(ticketId); if (ticket) this.touch(ticket); },
      quiesce: (ticketId) => this.closeAutonomousWork(ticketId),
      hasWriters: (ticketId) => callbacks.hasWriters(ticketId) || this.isLaunching(ticketId) || this.sessionHub.hasUnclosedSession(ticketId),
      worktreePath: slotPath,
      assertFrozen: (ticketId) => this.autonomousWorkflow?.assertResumeConfiguration?.(ticketId),
    });
  }

  publishAutonomousPartial(ticketId: string, reason: string): Promise<void> {
    const previous = this.autonomousPartialPublications.get(ticketId);
    if (previous) return previous;
    const completion = Promise.resolve().then(() => this.publishAutonomousPartialNow(ticketId, reason));
    this.autonomousPartialPublications.set(ticketId, completion);
    void completion.finally(() => this.autonomousPartialPublications.delete(ticketId)).catch(() => {});
    return completion;
  }

  private async publishAutonomousPartialNow(ticketId: string, reason: string): Promise<void> {
    this.store.beginAutonomousFinalization(ticketId, reason);
    const active = this.autonomousDeliveries.get(ticketId);
    if (active) {
      const remaining = (this.store.getTicket(ticketId)?.autonomousState?.execution?.finalizationDeadlineAt ?? Date.now()) - Date.now();
      let timer: ReturnType<typeof setTimeout> | undefined;
      try {
        if (remaining <= 0) throw new Error("The finalization reserve expired while delivery was in flight.");
        await Promise.race([active, new Promise<never>((_, reject) => {
          timer = setTimeout(() => reject(new Error("The host operation remains in flight; its candidate and journals are retained.")), remaining);
        })]);
      } catch (error) {
        const state = this.store.getTicket(ticketId)?.autonomousState;
        if (state) this.touch(this.store.updateTicket(ticketId, { autonomousState: { ...state, phase: "publication_failed", error: getErrorMessage(error) } }));
        return;
      } finally {
        if (timer) clearTimeout(timer);
      }
    }
    if (!this.autonomousPartialDelivery) throw new Error("Autonomous partial publication is unavailable.");
    await this.reserveAutonomousDelivery(ticketId, () => this.autonomousPartialDelivery?.publish(ticketId, reason) ?? Promise.resolve());
  }

  async reconcileAutonomousPartial(ticketId: string): Promise<void> {
    if (!this.autonomousPartialDelivery) throw new Error("Autonomous publication reconciliation is unavailable.");
    await this.reserveAutonomousDelivery(ticketId, () => this.autonomousPartialDelivery?.reconcile(ticketId) ?? Promise.resolve());
  }

  async drainAutonomousPublications(): Promise<void> {
    await Promise.allSettled([...this.autonomousPartialPublications.values()]);
  }

  async closeAutonomousWork(ticketId: string): Promise<boolean> {
    const ticket = this.store.getTicket(ticketId);
    const state = ticket?.autonomousState;
    if (!state?.execution || !this.autonomousQuiesce) return false;
    if (state.execution.closure.status === "unknown") return false;
    this.touch(this.store.updateTicket(ticketId, { autonomousState: {
      ...state,
      execution: { ...state.execution, closure: { ...state.execution.closure, status: "requested", requestedAt: state.execution.closure.requestedAt ?? Date.now() } },
    } }));
    let closed = false;
    try { closed = await this.autonomousQuiesce(ticketId); } catch { closed = false; }
    const current = this.store.getTicket(ticketId)?.autonomousState;
    if (!current?.execution) return false;
    const phase = this.setupPhase.get(ticketId);
    const preparing = phase === SETUP_PHASES.worktree || phase === SETUP_PHASES.setup || phase === SETUP_PHASES.deps;
    closed = closed && current.execution.closure.status !== "unknown" && !preparing && !this.autonomousHasWriters?.(ticketId) && !this.sessionHub.hasUnclosedSession(ticketId);
    this.touch(this.store.updateTicket(ticketId, { autonomousState: {
      ...current,
      execution: { ...current.execution, closure: { ...current.execution.closure, status: closed ? "confirmed" : "unknown", confirmedAt: closed ? Date.now() : null, retention: "retained" } },
    } }));
    return closed;
  }

  async autonomousWorkspaces(ticketId: string): Promise<AutonomousWorkspaces> {
    const ticket = this.store.getTicket(ticketId);
    if (!ticket?.autonomous) throw new Error("Autonomous workspaces are unavailable for this ticket.");
    let parent: AutonomousWorkspaces["parent"] = null;
    const children = await this.autonomousRetainedWorkspaces?.(ticketId) ?? [];
    if (ticket.slotId !== null && this.store.getSlot(ticket.slotId)?.ticketId === ticketId) {
      const path = slotPath(ticket.slotId);
      parent = { path, available: await this.system.worktreeExists(path), simulated: this.system.dryRun };
      if (isProjectKey(ticket.project)) {
        const retained = await this.system.listAutonomousWorkspaces({ repoPath: getProject(ticket.project).repoPath, slotPath: path, ticketId });
        for (const workspace of retained) {
          children.push({ ...workspace, label: workspace.label ?? "Espace sans identité confirmée" });
        }
        for (const lot of this.store.getImplementationQueue(ticketId)) {
          if (lot.files.length === 0 && !children.some((child) => child.label === lot.label && child.workspacePath === path)) {
            children.push({ label: lot.label, workspacePath: path, journalPath: null, archivePath: null, status: "retained", verified: parent.available && !this.system.dryRun });
          }
        }
      }
    }
    const unique = new Map<string, AutonomousWorkspaces["children"][number]>();
    for (const child of children) unique.set(JSON.stringify([child.label, child.workspacePath, child.archivePath, child.journalPath]), child);
    return {
      parent,
      children: [...unique.values()],
      diagnostic: ticket.autonomousState?.execution?.closure.status === "unknown" ? "La fermeture d’une session reste inconnue. Les emplacements sont conservés ; aucune nouvelle écriture ni publication n’est autorisée." : ticket.autonomousState?.error ?? null,
    };
  }

  async resumeAutonomousSession(ticketId: string): Promise<void> {
    const ticket = this.store.getTicket(ticketId);
    if (!ticket?.autonomous || ticket.slotId === null || this.store.getSlot(ticket.slotId)?.ticketId !== ticketId) throw new Error("The retained autonomous slot is unavailable.");
    if (ticket.autonomousState?.hostMutation || ticket.autonomousState?.execution?.closure.status === "unknown") throw new Error("Reconcile the retained host operation and writer closure before resuming.");
    this.store.assertAutonomousWork(ticketId);
    if (!this.sessionHub.isConnected(ticketId)) await this.relaunchInPlace(ticket.slotId, ticketId);
  }

  private async reserveAutonomousDelivery<T>(ticketId: string, action: () => Promise<T>): Promise<T> {
    if (this.autonomousDeliveries.has(ticketId)) throw new Error("Autonomous delivery is already being reconciled.");
    let release = () => {};
    const reservation = new Promise<void>((resolve) => { release = resolve; });
    this.autonomousDeliveries.set(ticketId, reservation);
    try {
      return await action();
    } finally {
      this.autonomousDeliveries.delete(ticketId);
      release();
    }
  }

  async waitForAutonomousDelivery(ticketId: string): Promise<void> {
    this.autonomousDeliveryStops.add(ticketId);
    const active = this.autonomousDeliveries.get(ticketId);
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      if (active) await Promise.race([
        active,
        new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error("Autonomous host operation is still in flight. Its worktree must be retained for reconciliation.")), AUTONOMOUS_DELIVERY_CANCEL_WAIT_MS); }),
      ]);
      if (this.store.getTicket(ticketId)?.autonomousState?.hostMutation) throw new Error("Autonomous host operation has an uncertain result. Reconcile the existing pull request before cancellation or abandonment.");
    } finally {
      if (timer) clearTimeout(timer);
    }
  }

  acknowledgeAutonomousDeliveryStop(ticketId: string): void {
    const ticket = this.store.getTicket(ticketId);
    const state = ticket?.autonomousState;
    if (!ticket || !state || state.hostMutation) return;
    if (state.phase !== "paused" && state.phase !== "completed" && ticket.column !== "abandoned" && ticket.column !== "failed") return;
    this.autonomousDeliveryStops.delete(ticketId);
  }

  private isAutonomousDeliveryReconciliation(ticket: Ticket): boolean {
    return Boolean(ticket.autonomous && (ticket.autonomousState?.hostMutation || ticket.autonomousState?.deliveryConfirmation));
  }

  private assertAutonomousMutation(ticket: Ticket, slotId: number, revision: string, kind: "create_pr" | "merge", operationId: string): void {
    const current = this.store.getTicket(ticket.id);
    const state = current?.autonomousState;
    if (current) {
      const qualification = autonomousOptionsError(current, projectVcsProvider(current.project));
      if (qualification) throw new Error(qualification);
    }
    if (!current?.autonomous || current.slotId !== slotId || this.store.getSlot(slotId)?.ticketId !== ticket.id || current.branch !== ticket.branch || current.project !== ticket.project || current.baseBranch !== ticket.baseBranch || current.autonomousDelivery !== ticket.autonomousDelivery || state?.planFingerprint !== ticket.autonomousState?.planFingerprint || state?.configFingerprint !== ticket.autonomousState?.configFingerprint || state?.sourceFingerprint !== ticket.autonomousState?.sourceFingerprint || current.column === "abandoned" || current.column === "failed" || state?.phase !== "delivering" || state.revision !== revision || this.autonomousDeliveryStops.has(ticket.id) || Date.now() >= (state.execution?.deadlineAt ?? state.deadlineAt)) throw new Error("Autonomous delivery was stopped, expired, changed, or still needs host reconciliation.");
    this.store.assertAutonomousWork(ticket.id);
    if (state.hostMutation) {
      if (state.hostMutation.operationId !== operationId || state.hostMutation.kind !== kind || state.hostMutation.revision !== revision) throw new Error("Another autonomous host operation requires reconciliation.");
      return;
    }
    this.touch(this.store.updateTicket(ticket.id, { autonomousState: { ...state, hostMutation: { kind, revision, operationId, startedAt: Date.now() } } }));
  }

  private implementationPlanBlocksDelivery(ticketId: string): boolean {
    const plan = this.store.getImplementationPlan(ticketId);
    if (!plan) return false;
    return plan.lots.some((lot) => lot.status !== "completed") || Boolean(plan.recovery && plan.recovery.status !== "resolved");
  }

  setQualityGate(gate: (ticketId: string, mode: "strict" | "reservations") => Promise<QualityGate>): void {
    this.qualityGate = gate;
  }

  setQualityCancel(cancel: (ticketId: string) => Promise<void>): void {
    this.qualityCancel = cancel;
  }

  setQualityIterationVerifier(verify: (ticketId: string, worktreePath: string, iterationId: string) => Promise<void>): void {
    this.qualityIterationVerifier = verify;
  }

  async startQualityCorrection(ticketId: string, iterationId: string): Promise<void> {
    if (this.qualityCorrectionStarts.has(ticketId)) return;
    this.qualityCorrectionStarts.add(ticketId);
    try {
      await this.launchQualityCorrection(ticketId, iterationId);
    } finally {
      this.qualityCorrectionStarts.delete(ticketId);
    }
  }

  private async launchQualityCorrection(ticketId: string, iterationId: string): Promise<void> {
    const iteration = this.store.getActiveQualityIteration(ticketId);
    const ticket = this.store.getTicket(ticketId);
    if (!ticket || iteration?.id !== iterationId || iteration.mode !== "correction") throw new Error("Correction qualité introuvable.");
    if (iteration.status !== "queued") return;
    if (ticket.slotId !== null && this.store.getImplementationPlan(ticketId)?.recovery) throw new Error("Reprends la récupération du plan conservé avant de lancer une autre correction qualité.");
    if (!this.qualityIterationVerifier) throw new Error("Vérification de correction qualité indisponible.");
    if (ticket.kind !== "feature" || ticket.directPush || ticket.stealth) throw new Error("La correction requiert une carte feature avec une PR ouverte.");
    await this.assertQualityIterationPr(ticket, iteration, iteration.sourceRevision);
    if (this.store.getActiveQualityIteration(ticketId)?.id !== iterationId) return;
    if (ticket.slotId !== null) {
      const previous = iteration.retryOfIterationId ? this.store.getQualityIteration(iteration.retryOfIterationId) : null;
      const slot = this.store.getSlot(ticket.slotId);
      if (!previous || previous.mode !== "correction" || previous.sourceRunId !== iteration.sourceRunId || previous.headBranch !== iteration.headBranch || slot?.ticketId !== ticketId || this.sessionHub.isConnected(ticketId)) throw new Error("Le slot de correction conservé ne peut être repris que par une relance explicite de la même passe.");
    }
    const executionTicket = this.qualityCorrectionTicket(ticket);
    await this.reconcileDependencies(ticketId);
    this.assertStartReady(this.store.getTicket(ticketId) ?? ticket);
    this.touch(this.store.updateTicket(ticketId, { orchestrator: executionTicket.orchestrator, implementer: executionTicket.implementer, autoMerge: false, resolvingConflicts: false, error: null, finishedAt: null }));
    this.lifecycle.enqueue(ticketId);
    if (ticket.slotId !== null) {
      this.store.resetReviewCycle(ticketId);
      this.store.updateQualityIteration(iteration.id, { status: "correcting" });
      try {
        await this.relaunchInPlace(ticket.slotId, ticketId);
      } catch (error) {
        if (this.store.getQualityIteration(iteration.id)?.status === "cancelled") return;
        this.markFailed(ticketId, ticket.slotId, getErrorMessage(error), error);
        throw error;
      }
      return;
    }
    await this.startTicket(ticketId);
  }

  private async assertQualityIterationPr(ticket: Ticket, iteration: QualityIteration, expectedRevision?: string): Promise<void> {
    if (!isProjectKey(ticket.project) || !iteration.prUrl || !iteration.headBranch || ticket.prUrl !== iteration.prUrl) throw new Error("La PR de correction a changé ou n'est plus disponible.");
    const project = getProject(ticket.project);
    const state = await this.system.readPr(project.repoPath, iteration.prUrl, project.vcsProvider);
    if (state.state !== "open") throw new Error("La correction requiert une PR ouverte et non fusionnée.");
    const open = (await this.system.listOpenPrs(project.repoPath, project.vcsProvider)).find((pr) => pr.url === iteration.prUrl);
    if (!open || open.headBranch !== iteration.headBranch) throw new Error("La branche de la PR a changé depuis la vérification source.");
    const competing = this.store.listTickets(true).find((candidate) => candidate.id !== ticket.id && candidate.project === ticket.project && candidate.prUrl === iteration.prUrl && (candidate.slotId !== null || candidate.column === "implementing"));
    const competingIteration = this.store.listActiveQualityIterations().find((candidate) => candidate.id !== iteration.id && candidate.project === iteration.project && candidate.prUrl === iteration.prUrl);
    if (competing || competingIteration) throw new Error("Une autre correction ou session occupe déjà cette PR.");
    if (expectedRevision) {
      const head = await this.system.readReviewHead(project.repoPath, iteration.prUrl, project.vcsProvider);
      if (!head.ok || head.commitSha !== expectedRevision) throw new Error("La révision de la PR a changé ; relance une vérification avant de corriger.");
    }
  }

  async settleQualityIteration(ticketId: string, iterationId: string, runId: string, verdict: QualityRunStatus): Promise<void> {
    const iteration = this.store.getActiveQualityIteration(ticketId);
    const ticket = this.store.getTicket(ticketId);
    if (!ticket || ticket.testing || iteration?.id !== iterationId || iteration.status !== "verifying" || ticket.slotId === null || iteration.resultRunId !== runId) return;
    const slotId = ticket.slotId;
    const run = this.store.getQualityRun(runId);
    let complete = false;
    const functional = iteration.trigger === "functional";
    let diagnostic = run?.error ?? (functional ? "Le nouveau test fonctionnel reste non concluant." : "La nouvelle vérification complète reste non concluante.");
    try {
      await this.assertQualityIterationPr(ticket, iteration, iteration.resultRevision ?? undefined);
      let criteriaMatch = run?.criteriaSnapshotId === iteration.criteriaSnapshot?.id;
      if (functional) {
        complete = verdict === "passed" && run?.kind === "functional" && run.revision === iteration.resultRevision && criteriaMatch && run.evidenceAccepted;
      } else {
        const gate = await this.qualityGate?.(ticketId, "strict");
        if (!iteration.criteriaSnapshot && iteration.trigger === "checks") criteriaMatch = Boolean(run?.criteriaSnapshotId);
        complete = verdict === "passed" && run?.kind === "full" && run.revision === iteration.resultRevision && criteriaMatch && Boolean(gate?.complete);
        if (!complete && gate?.reservations.length) diagnostic = gate.reservations.join(" ; ");
      }
    } catch (error) {
      diagnostic = getErrorMessage(error);
    }
    if (this.store.getActiveQualityIteration(ticketId)?.id !== iterationId || this.store.getTicket(ticketId)?.slotId !== slotId) return;
    if (this.store.getImplementationPlan(ticketId)?.recovery) {
      const recoveryGate = await this.implementationRecoveryGuard?.(ticketId, slotId, ticket.prUrl ?? "");
      if (this.store.getActiveQualityIteration(ticketId)?.id !== iterationId || this.store.getTicket(ticketId)?.slotId !== slotId || this.store.getSlot(slotId)?.ticketId !== ticketId) return;
      if (!recoveryGate?.ok) {
        diagnostic = recoveryGate?.result ?? "La livraison de la récupération n'a pas pu être vérifiée ; le worktree est conservé.";
        this.store.updateQualityIteration(iterationId, { status: "failed", diagnostic, completedAt: Date.now() });
        this.touch(this.store.updateTicket(ticketId, { column: "failed", stage: "failed", error: diagnostic, autoMerge: false, finishedAt: Date.now() }));
        return;
      }
    }
    this.store.updateQualityIteration(iterationId, { status: complete ? "completed" : "failed", diagnostic: complete ? null : diagnostic, completedAt: Date.now() });
    this.touch(this.store.updateTicket(ticketId, { column: "done", stage: "done", slotId: null, prUrl: ticket.prUrl, error: complete ? null : diagnostic, finishedAt: Date.now(), autoMerge: false }));
    const operation = iteration.mode === "correction" ? "Correction terminée" : "Vérification reprise";
    const verification = functional ? "nouveau test fonctionnel réussi dans le navigateur" : "nouvelle vérification indépendante complète réussie";
    const body = complete ? `${operation} et ${verification}.` :`${operation} avec réserves : ${diagnostic}. Aucune correction supplémentaire n'a été lancée.`;
    this.hub.pushComment(this.store.addComment(ticketId, "system", body, null));
    this.store.logEvent(ticketId, "quality_iteration_settled", { iterationId, runId, verdict, complete });
    await this.cleanupTerminalSlot(slotId, ticket, complete ? "completed" : "failed", false);
    await this.notifier.notify("Itération qualité terminée", body, ticketId, true);
    this.pumpQueue();
  }

  async cancelQualityCorrection(ticketId: string, iterationId: string): Promise<void> {
    const iteration = this.store.getQualityIteration(iterationId);
    const ticket = this.store.getTicket(ticketId);
    if (!ticket || iteration?.ticketId !== ticketId || iteration.mode !== "correction") return;
    const queued = this.queue.indexOf(ticketId);
    if (queued !== -1) this.queue.splice(queued, 1);
    this.sessionHub.disconnect(ticketId, "cancelled");
    await this.delegationDrain?.(ticketId);
    const retained = ticket.slotId !== null && this.store.getSlot(ticket.slotId)?.ticketId === ticketId;
    const unresolvedDelivery = ticket.slotId !== null && hasUnresolvedImplementation(this.store.getImplementationPlan(ticketId));
    if (retained && ticket.slotId !== null) this.store.updateSlot(ticket.slotId, { status: "interrupted" });
    this.touch(this.store.updateTicket(ticketId, { column: unresolvedDelivery ? "failed" : "done", stage: retained ? "interrupted" : "done", autoMerge: false, error: retained ? "Correction qualité annulée ; le worktree est conservé pour une relance explicite." : "Correction qualité annulée.", finishedAt: Date.now() }));
    this.pumpQueue();
  }

  private async recordDeliveryQuality(ticketId: string): Promise<QualityGate | null> {
    if (!this.qualityGate || this.store.getTicket(ticketId)?.kind !== "feature") return null;
    const gate = await this.qualityGate(ticketId, "strict");
    if (!gate.enabled) return gate;
    this.store.logEvent(ticketId, "quality_delivery", {
      complete: gate.complete,
      reservations: gate.reservations,
    });
    if (!gate.complete) {
      this.touch(this.store.updateTicket(ticketId, { autoMerge: false }));
      const body = ["Livraison avec réserves — fusion automatique désactivée.", ...gate.reservations.map((reason) => `- ${reason}`)].join("\n");
      this.hub.pushComment(this.store.addComment(ticketId, "system", body, null));
    }
    return gate;
  }

  /** Entry point when a ticket is dragged into "À implémenter". */
  async startTicket(ticketId: string): Promise<void> {
    try {
      await this.startReadyTicket(ticketId);
    } catch (error) {
      if (this.store.getTicket(ticketId)?.column === "implementing") this.markUnallocatedLaunchFailed(ticketId, error);
      throw error;
    }
  }

  private async startReadyTicket(ticketId: string): Promise<void> {
    await this.reconcileDependencies(ticketId);
    const ticket = this.store.getTicket(ticketId);
    if (!ticket) return;
    if (ticket.column === "abandoned" || ticket.column === "merged") return;
    if (startBlocker(ticket, this.store.getDependencyParent(ticket)) === "triage") throw new Error("Analyse en cours : attends le verdict avant de lancer l'implémentation.");
    this.assertStartReady(ticket);
    if (ticket.autonomous) {
      const autonomousError = autonomousOptionsError(ticket, projectVcsProvider(ticket.project));
      if (autonomousError) throw new Error(autonomousError);
      if (!this.autonomousWorkflow) throw new Error("Autonomous delivery is unavailable.");
    }
    const iteration = this.store.getActiveQualityIteration(ticketId);
    if (iteration && (iteration.mode !== "correction" || iteration.status !== "queued")) return;
    if (!iteration && this.store.getLatestQualityIteration(ticketId)?.mode === "correction") throw new Error("Utilise Corriger et revérifier pour relancer une correction qualité.");
    if (ticket.prUrl && (ticket.kind === "clean" || (ticket.kind === "review" && ticket.fixComments))) {
      const owner = this.store.listActiveQualityIterations().find((candidate) => candidate.project === ticket.project && candidate.prUrl === ticket.prUrl);
      if (owner) throw new Error("Cette PR est réservée par une correction qualité.");
    }
    let reusableSlotId: number | null;
    try {
      reusableSlotId = await this.findReusableFeatureSlot(ticket);
    } catch (error) {
      this.markWorktreeReuseFailed(ticket, getErrorMessage(error), error);
      return;
    }
    const current = this.store.getTicket(ticketId);
    if (iteration && this.store.getActiveQualityIteration(ticketId)?.id !== iteration.id) return;
    if (!current || current.column === "abandoned" || current.column === "merged" || current.slotId !== ticket.slotId || this.isLaunching(ticketId) || this.sessionHub.isConnected(ticketId)) {
      return;
    }
    this.assertStartReady(current);
    const free = reusableSlotId === null ? this.findFreeSlot() : this.store.getSlot(reusableSlotId);
    if (!free) {
      if (!this.queue.includes(ticketId)) {
        this.queue.push(ticketId);
        if (current.column === "implementing") this.touch(this.store.updateTicket(ticketId, { stage: "queued" }));
        else this.lifecycle.enqueue(ticketId);
        this.store.logEvent(ticketId, "queued", { reason: "no free slot" });
        log.info("ticket en file (aucun slot libre)", { ticketId, queueLength: this.queue.length });
      }
      return;
    }
    if (free.status !== "free" || free.ticketId !== null || this.claimedSlots.has(free.id) || this.store.getWorktreeSession(free.id) !== null) {
      this.markWorktreeReuseFailed(ticket, `le slot Atelier ${free.id} vient d'être réservé par une autre session`);
      return;
    }
    await this.launchInSlot(free.id, ticketId, reusableSlotId !== null);
  }

  private async findReusableFeatureSlot(ticket: Ticket): Promise<number | null> {
    if (this.store.getActiveQualityIteration(ticket.id)?.mode === "correction") return null;
    if (ticket.kind !== "feature" || ticket.resolvingConflicts || !isProjectKey(ticket.project)) return null;
    const project = getProject(ticket.project);
    const branch = featureBranch(ticket);
    const worktreePath = await this.system.findWorktreeByBranch(project.repoPath, branch);
    if (worktreePath === null) return null;
    const slot = this.store.listSlots().find((candidate) => slotPath(candidate.id) === worktreePath);
    if (!slot) throw new Error(`la branche ${branch} est déjà utilisée hors des slots Atelier : ${worktreePath}`);
    if (slot.id === ticket.slotId && slot.ticketId === ticket.id) return slot.id;
    const owner = this.store.listTickets(true).find((candidate) => candidate.id !== ticket.id && candidate.slotId === slot.id);
    const available =
      slot.status === "free" &&
      slot.ticketId === null &&
      (slot.repoPath === null || slot.repoPath === project.repoPath) &&
      this.store.getWorktreeSession(slot.id) === null &&
      !this.sessionHub.isConnected(ticket.id) &&
      owner === undefined;
    if (!available) throw new Error(`la branche ${branch} est déjà utilisée par le slot Atelier ${slot.id}`);
    return slot.id;
  }

  private markWorktreeReuseFailed(ticket: Ticket, reason: string, error: unknown = reason): void {
    const current = this.store.getTicket(ticket.id);
    if (!current || current.slotId !== ticket.slotId || this.isLaunching(ticket.id) || this.sessionHub.isConnected(ticket.id)) {
      return;
    }
    const ownedSlot = current.slotId === null ? null : this.store.getSlot(current.slotId);
    if (ownedSlot?.ticketId === ticket.id) {
      this.markFailed(ticket.id, ownedSlot.id, reason, error, "worktree_reuse");
      return;
    }
    const errorDetails = this.lifecycle.errorDetailsFor(ticket.id, error, "worktree_reuse");
    this.touch(
      this.store.updateTicket(ticket.id, {
        column: "failed",
        stage: "failed",
        error: reason,
        errorDetails,
        resolvingConflicts: false,
        finishedAt: Date.now(),
      }),
    );
    this.store.logEvent(ticket.id, "failed", { reason, details: errorDetails });
    log.error("reprise du worktree refusée", { ticketId: ticket.id, reason });
    void this.notifier.notify("Ticket en échec", reason, ticket.id);
  }

  private async resumeAttachedFeatureWorktree(ticket: Ticket): Promise<boolean> {
    const reusableSlotId = await this.findReusableFeatureSlot(ticket);
    if (reusableSlotId === null || reusableSlotId === ticket.slotId) return false;
    const current = this.store.getTicket(ticket.id);
    if (!current || current.slotId !== ticket.slotId || this.isLaunching(ticket.id) || this.sessionHub.isConnected(ticket.id)) {
      return true;
    }
    const reusableSlot = this.store.getSlot(reusableSlotId);
    if (
      !reusableSlot ||
      reusableSlot.status !== "free" ||
      reusableSlot.ticketId !== null ||
      this.claimedSlots.has(reusableSlotId) ||
      this.store.getWorktreeSession(reusableSlotId) !== null
    ) {
      throw new Error(`le slot Atelier ${reusableSlotId} vient d'être réservé par une autre session`);
    }
    if (ticket.slotId !== null) {
      const previousSlot = this.store.getSlot(ticket.slotId);
      const releasable =
        previousSlot?.ticketId === ticket.id &&
        (previousSlot.status === "failed" || previousSlot.status === "interrupted" || previousSlot.status === "stalled");
      if (!releasable) throw new Error(`le ticket ${ticket.id} possède encore le slot Atelier ${ticket.slotId}`);
      this.store.updateSlot(ticket.slotId, { ticketId: null, repoPath: null, tmuxSession: null, status: "free" });
    }
    await this.launchInSlot(reusableSlotId, ticket.id, true);
    return true;
  }

  private pumpQueue(): void {
    const next = this.queue.shift();
    if (!next) return;
    const ticket = this.store.getTicket(next);
    if (!ticket || ticket.column === "abandoned" || ticket.column === "merged") {
      this.pumpQueue();
      return;
    }
    void this.startTicket(next).catch((error: unknown) => {
      log.error("démarrage du ticket en file échoué", { ticketId: next, error: getErrorMessage(error) });
      this.markUnallocatedLaunchFailed(next, error);
      this.pumpQueue();
    });
  }

  private markUnallocatedLaunchFailed(ticketId: string, error: unknown): void {
    const current = this.store.getTicket(ticketId);
    if (!current || current.column === "abandoned" || current.column === "merged" || current.slotId !== null || this.isLaunching(ticketId) || this.sessionHub.isConnected(ticketId)) return;
    if (current.column === "failed" && current.error === getErrorMessage(error)) return;
    this.lifecycle.markLaunchFailed(ticketId, null, getErrorMessage(error), error);
  }

  private assertStartReady(ticket: Ticket): void {
    if (this.updatingDependencyBases.has(ticket.id)) throw new Error("Mise à jour de la base en cours. Attends la fin avant de relancer le ticket.");
    const parent = this.store.getDependencyParent(ticket);
    if (!isDependencyReady(ticket, parent)) throw new Error("En attente de la livraison du ticket parent.");
    if (isProjectKey(ticket.project)) requireForkBaseBranch(ticket, getProject(ticket.project), this.store);
  }

  resumeDeferredDependent(ticketId: string): void {
    if (!this.deferredDependents.has(ticketId)) return;
    const ticket = this.store.getTicket(ticketId);
    if (ticket?.triageStatus === "running") return;
    this.deferredDependents.delete(ticketId);
    if (ticket?.column !== "todo" || ticket.dependsOn === null) return;
    void this.startDependents(ticket.dependsOn).catch((error: unknown) => {
      log.error("reprise du ticket dépendant échouée", { ticketId, error: getErrorMessage(error) });
    });
  }

  /**
   * Parent reached done() (PR open, branch pushed): auto-start any todo child that depends on it.
   * Recursive by nature (each child's own done releases its children).
   */
  private async startDependents(parentId: string): Promise<void> {
    for (const child of this.store.listDependents(parentId)) {
      try {
        if (child.column !== "todo" || !isDependencyReady(child, this.store.getDependencyParent(child))) continue;
        if (child.scheduledStartAt !== null && child.scheduledStartAt > Date.now()) continue;
        if (child.triageStatus === "running") {
          this.deferredDependents.add(child.id);
          continue;
        }
        await this.reconcileDependencies(child.id);
        const reconciled = this.store.getTicket(child.id);
        if (reconciled?.column !== "todo") continue;
        this.assertStartReady(reconciled);
        this.deferredDependents.delete(child.id);
        this.lifecycle.enqueue(child.id);
        await this.startTicket(child.id);
      } catch (error) {
        log.error("démarrage du ticket dépendant échoué", { ticketId: child.id, parentId, error: getErrorMessage(error) });
      }
    }
  }

  /**
   * Merge failed or conflicts detected before a manual merge: spawn an opus-low session on the
   * EXISTING PR branch to rebase onto the base, resolve conflicts, force-push, then re-trigger the
   * merge via done(). Unlike startTicket it never queues — with no free slot it surfaces a hint and
   * bails, leaving the card in its current column so the user can retry once a slot frees up.
   */
  async resolveMergeConflicts(ticketId: string): Promise<boolean> {
    const ticket = this.store.getTicket(ticketId);
    if (!ticket || ticket.branch === null || ticket.prUrl === null) return false;
    await this.reconcileDependencies(ticketId);
    this.assertStartReady(this.store.getTicket(ticketId) ?? ticket);
    const free = this.findFreeSlot();
    if (!free) {
      this.touch(
        this.store.updateTicket(ticketId, {
          error: "Aucun slot libre pour résoudre les conflits — réessaie une fois un slot libéré.",
        }),
      );
      return false;
    }
    this.store.logEvent(ticketId, "resolve_conflicts_started", { prUrl: ticket.prUrl, previousReviewRounds: ticket.reviewRounds });
    // opus low per the feature spec; the flag routes the conflict-resolution contract at delivery.
    // NOTE(ali): the resolution diff is new code, so it gets its own review budget.
    this.touch(
      this.store.updateTicket(ticketId, {
        resolvingConflicts: true,
        reviewRounds: 0,
        model: "opus",
        effort: "low",
        column: "implementing",
        stage: "queued",
        error: null,
        finishedAt: null,
      }),
    );
    await this.launchInSlot(free.id, ticketId);
    return true;
  }

  /**
   * Spawn an interactive test session for a finished feature: reserve a free slot, recreate a
   * runnable worktree on the card's EXISTING feature branch (fetched from origin after the slot was
   * released), run the project setup + install deps, then spawn a PLAIN interactive shell that
   * auto-runs the launch command detected in the worktree and hands control to the user via the
   * terminal. No Claude, no contract, no pipeline, no gate, no PR, no queue. The card stays in "Fini"
   * (column/stage untouched) — the `testing` flag is the only marker. Eligibility is re-checked here
   * (the route also validates) so a double click can't double-spawn.
   */
  async startTestSession(ticketId: string): Promise<void> {
    const ticket = this.store.getTicket(ticketId);
    if (
      !ticket ||
      ticket.kind !== "feature" ||
      ticket.column !== "done" ||
      ticket.branch === null ||
      ticket.slotId !== null ||
      ticket.testing ||
      this.store.getActiveQualityIteration(ticketId) !== null ||
      !isProjectKey(ticket.project)
    ) {
      return;
    }
    const free = this.findFreeSlot();
    if (!free) {
      this.touch(
        this.store.updateTicket(ticketId, {
          error: "Aucun slot libre pour tester — réessaie une fois un slot libéré.",
        }),
      );
      return;
    }
    this.store.logEvent(ticketId, "test_session_started", {});

    const project = getProject(ticket.project);
    const baseBranch = ticket.baseBranch ?? project.baseBranch;
    const branch = ticket.branch;
    const path = slotPath(free.id);
    const sessionName = `ticket-${ticketId}`;

    this.store.updateSlot(free.id, {
      ticketId,
      repoPath: project.repoPath,
      tmuxSession: sessionName,
      status: "busy",
    });
    this.touch(this.store.updateTicket(ticketId, { testing: true, slotId: free.id, error: null }));
    this.hub.pushSlots(this.store.listSlots());
    log.info("démarrage session de test", { ticketId, slotId: free.id, branch });

    try {
      this.setPhase(ticketId, SETUP_PHASES.worktree);
      await this.repoMutex.run(project.repoPath, async () => {
        const previous = this.store.getSlot(free.id);
        await this.system.worktreeRemove(previous?.repoPath ?? project.repoPath, path);
        await this.system.deleteLocalBranch(project.repoPath, branch);
        await this.system.fetch(project.repoPath, baseBranch);
        // The feature branch lives only on origin after the original slot was released.
        await this.system.fetch(project.repoPath, branch);
        await this.system.worktreeAddExisting(project.repoPath, path, branch);
      });

      await this.system.copyEnvFiles(project.repoPath, path);

      // Testing demands a runnable worktree — never skip setup/install (unlike an ask ticket).
      this.setPhase(ticketId, SETUP_PHASES.setup);
      await this.system.runWorktreeSetupScript({
        repoPath: project.repoPath,
        slotPath: path,
        branch,
        baseBranch,
        script: project.worktreeScript ?? null,
        timeoutMs: project.commitTimeoutMs,
      });
      this.setPhase(ticketId, SETUP_PHASES.deps);
      await this.system.installDeps(path, project.commitTimeoutMs);

      // Plain interactive shell (no Claude, no contract, no worker) that auto-runs the project's
      // launch command detected in the worktree, then stays open for the user. A worktree without a
      // detectable command drops into a bare shell with no auto-launch.
      const runCmd = await this.system.detectRunCommand(path);
      this.setPhase(ticketId, SETUP_PHASES.launching);
      await this.system.spawnShellSession({ sessionName, cwd: path, initialCommand: runCmd ?? undefined });
      this.store.logEvent(ticketId, "test_session_launched", { slotId: free.id, sessionName, runCmd });
      this.clearPhase(ticketId);
      log.info("shell de test lancé", { ticketId, slotId: free.id, sessionName, runCmd });
    } catch (error) {
      this.clearPhase(ticketId);
      // Not markFailed: a test setup failure must not flip the card to "failed". Free the slot and
      // surface the error; the user can retry once a slot frees up.
      const message = error instanceof Error ? error.message : String(error);
      await this.releaseSlot(free.id, ticket);
      this.touch(this.store.updateTicket(ticketId, { testing: false, slotId: null, error: message }));
      log.error("échec setup session de test", { ticketId, slotId: free.id, error: message });
    }
  }

  /** Stop an interactive test session: kill it, drop the worktree + local branch, free the slot. */
  async stopTestSession(ticketId: string): Promise<void> {
    const ticket = this.store.getTicket(ticketId);
    if (!ticket || !ticket.testing || ticket.slotId === null) return;
    await this.releaseSlotIfOwned(ticket, ticket.slotId);
    this.touch(this.store.updateTicket(ticketId, { testing: false, slotId: null, error: null }));
    this.store.logEvent(ticketId, "test_session_stopped", {});
    log.info("session de test arrêtée", { ticketId });
    this.pumpQueue();
  }

  // ---- Standalone worktree sessions (no ticket, no card) ----

  listWorktreeSessions(): WorktreeSession[] {
    return this.store.listWorktreeSessions();
  }

  /**
   * Launch a standalone, ticket-less runnable worktree session: reserve a free slot, fork a fresh
   * branch off the selected base (fetched from origin), run the project setup + install deps, then
   * spawn a PLAIN interactive shell that auto-runs the launch command detected in the worktree and
   * hands control to the user. Same machinery as startTestSession but tied to no card. The eligibility
   * (valid project / free slot) is re-checked here so a race can't double-spawn; the slow setup runs
   * after the slot is reserved, and self-cleans on failure. The route fire-and-forgets this.
   */
  async startWorktreeSession(input: { project: string; baseBranch: string }): Promise<void> {
    if (!isProjectKey(input.project)) {
      log.error("session worktree refusée : projet inconnu", { project: input.project });
      return;
    }
    const free = this.findFreeSlot();
    if (!free) {
      log.warn("session worktree refusée : aucun slot libre", { project: input.project });
      this.hub.pushNotification("Worktree", "Aucun slot libre — réessaie une fois un slot libéré.");
      return;
    }
    const project = getProject(input.project);
    const createdAt = Date.now();
    const branch = `${WORKTREE_BRANCH_PREFIX}/${slugify(input.baseBranch)}-${free.id}-${createdAt}`;
    const sessionName = `${WORKTREE_SESSION_PREFIX}-${free.id}-${createdAt}`;
    const path = slotPath(free.id);
    // The slot path may hold a stale worktree from a previous occupant; prune it via that occupant's
    // repo so a cross-project leftover is removed correctly (a freed slot reports a null repoPath).
    const previousRepoPath = free.repoPath ?? project.repoPath;

    // Reserve the slot synchronously (single-threaded loop ⇒ no double-spawn). On a DB failure, roll
    // the slot back to free so it never leaks as "busy" with no backing session row.
    try {
      this.store.updateSlot(free.id, {
        ticketId: null,
        repoPath: project.repoPath,
        tmuxSession: sessionName,
        status: "busy",
      });
      this.store.insertWorktreeSession({
        slotId: free.id,
        project: input.project,
        branch,
        baseBranch: input.baseBranch,
        sessionName,
        createdAt,
      });
    } catch (error) {
      this.store.updateSlot(free.id, { ticketId: null, repoPath: null, tmuxSession: null, status: "free" });
      this.hub.pushSlots(this.store.listSlots());
      log.error("réservation slot worktree échouée", { slotId: free.id, error: getErrorMessage(error) });
      this.hub.pushNotification("Worktree", "Échec de la réservation du slot worktree.");
      return;
    }
    this.hub.pushSlots(this.store.listSlots());
    this.hub.pushWorktreeSessions(this.store.listWorktreeSessions());
    log.info("démarrage session worktree", { slotId: free.id, project: input.project, branch });

    try {
      await this.repoMutex.run(project.repoPath, async () => {
        await this.system.worktreeRemove(previousRepoPath, path);
        // The fresh branch forks from origin/<base>, so the base must be fetched first.
        await this.system.fetch(project.repoPath, input.baseBranch);
        await this.system.worktreeAdd({ repoPath: project.repoPath, slotPath: path, branch, baseBranch: input.baseBranch });
      });
      // Watch only AFTER worktreeAdd has (re)created the final slot dir — watching earlier would bind a
      // stale inode (later replaced by the add) or throw ENOENT. The dev server writes `.wt-offset`
      // only later, so this re-pushes the clickable addresses live without a client reconnect.
      this.watcher.start(free.id);

      await this.system.copyEnvFiles(project.repoPath, path);
      await this.system.runWorktreeSetupScript({
        repoPath: project.repoPath,
        slotPath: path,
        branch,
        baseBranch: input.baseBranch,
        script: project.worktreeScript ?? null,
        timeoutMs: project.commitTimeoutMs,
      });
      await this.system.installDeps(path, project.commitTimeoutMs);

      const runCmd = await this.system.detectRunCommand(path);
      await this.system.spawnShellSession({ sessionName, cwd: path, initialCommand: runCmd ?? undefined });
      log.info("shell worktree lancé", { slotId: free.id, sessionName, runCmd });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      log.error("échec setup session worktree", { slotId: free.id, error: message });
      await this.cleanupWorktreeSession(free.id);
      this.hub.pushNotification("Worktree", `Échec du lancement du worktree : ${message}`);
    }
  }

  /** Stop a standalone worktree session: kill it, tear down infra, drop the worktree + branch, free the slot. */
  async stopWorktreeSession(slotId: number): Promise<void> {
    const session = this.store.getWorktreeSession(slotId);
    if (!session) return;
    await this.cleanupWorktreeSession(slotId);
    log.info("session worktree arrêtée", { slotId });
    this.pumpQueue();
  }

  /**
   * Relaunch a standalone worktree session: kill its running shell/process and respawn it (re-running the
   * project launch command) in the SAME worktree, keeping the DB row, branch and slot. The previous run's
   * external infra (e.g. docker compose, port-bound dev server) is torn down first via the project teardown
   * script — otherwise re-running the launch command would collide with the still-running instance.
   */
  async relaunchWorktreeSession(slotId: number): Promise<void> {
    const session = this.store.getWorktreeSession(slotId);
    if (!session) return;
    if (!isProjectKey(session.project)) {
      log.warn("relance worktree : projet inconnu, relance annulée", { slotId, project: session.project });
      return;
    }
    const project = getProject(session.project);
    // Kill the running shell first, then tear down its infra — same order as cleanupWorktreeSession,
    // so the teardown script doesn't run against the still-live process.
    await this.system.killSession(session.sessionName);
    await this.runWorktreeTeardown(project, slotId, session.branch, session.baseBranch);
    const cwd = slotPath(slotId);
    const runCmd = await this.system.detectRunCommand(cwd);
    await this.system.spawnShellSession({
      sessionName: session.sessionName,
      cwd,
      initialCommand: runCmd ?? undefined,
    });
    log.info("session worktree relancée", { slotId, sessionName: session.sessionName, runCmd });
  }

  /** Best-effort teardown of any project infra (e.g. docker compose) a worktree session spun up. */
  private async runWorktreeTeardown(
    project: ProjectConfig,
    slotId: number,
    branch: string,
    baseBranch: string,
  ): Promise<void> {
    await this.system.runWorktreeTeardownScript({
      repoPath: project.repoPath,
      slotPath: slotPath(slotId),
      branch,
      baseBranch,
      script: project.worktreeTeardownScript ?? null,
      timeoutMs: project.commitTimeoutMs,
    });
  }

  /**
   * Tear down a standalone worktree session's resources and free its slot. Best-effort teardown of any
   * project infra (e.g. docker compose) the session spun up, then worktree + local branch removal.
   */
  private async cleanupWorktreeSession(slotId: number): Promise<void> {
    const session = this.store.getWorktreeSession(slotId);
    if (!session) return;
    // The DB row + slot are always released in the finally, even if git/tmux teardown throws — a
    // partial failure must never leave the slot stuck "busy" with a dangling row (slot leak).
    try {
      await this.system.killSession(session.sessionName);
      if (!isProjectKey(session.project)) {
        log.warn("nettoyage worktree : projet inconnu, worktree potentiellement orphelin", {
          slotId,
          project: session.project,
        });
      } else {
        const project = getProject(session.project);
        await this.runWorktreeTeardown(project, slotId, session.branch, session.baseBranch);
        await this.repoMutex.run(project.repoPath, async () => {
          await this.system.worktreeRemove(project.repoPath, slotPath(slotId));
          await this.system.deleteLocalBranch(project.repoPath, session.branch);
        });
      }
    } finally {
      this.watcher.stop(slotId);
      this.store.deleteWorktreeSession(slotId);
      this.store.updateSlot(slotId, { ticketId: null, repoPath: null, tmuxSession: null, status: "free" });
      this.hub.pushSlots(this.store.listSlots());
      this.hub.pushWorktreeSessions(this.store.listWorktreeSessions());
    }
  }

  private findFreeSlot(): Slot | null {
    return this.store.listSlots().find((slot) => slot.status === "free" && !this.claimedSlots.has(slot.id)) ?? null;
  }

  private async launchInSlot(slotId: number, ticketId: string, reuseWorktree = false): Promise<void> {
    // NOTE(ali): the slot is only marked busy after this await, so concurrent starts must see it as claimed.
    this.claimedSlots.add(slotId);
    try {
      await this.reconcileDependencies(ticketId);
      const current = this.store.getTicket(ticketId);
      if (current) this.assertStartReady(current);
    } catch (error) {
      this.markUnallocatedLaunchFailed(ticketId, error);
      throw error;
    } finally {
      this.claimedSlots.delete(slotId);
    }
    const ticket = this.store.getTicket(ticketId);
    if (!ticket) return;
    if (!isProjectKey(ticket.project)) {
      this.markFailed(ticketId, slotId, `Projet inconnu: ${ticket.project}`);
      return;
    }
    const project = getProject(ticket.project);
    const baseBranch = resolveExecutionBaseBranch(ticket, project, this.store);
    const path = slotPath(slotId);
    const iteration = this.store.getActiveQualityIteration(ticketId);
    const qualityCorrection = iteration?.mode === "correction";
    if (!reuseWorktree) this.store.resetReviewCycle(ticketId);
    // Resolving merge conflicts reuses the EXISTING PR branch (its commits); a fresh feature run
    // forks a new branch off the base.
    const resolving = ticket.resolvingConflicts && ticket.branch !== null;
    // A fixComments review reuses the EXISTING PR head branch (its commits) so fixes can be committed
    // and pushed straight to the PR — no new PR.
    const reviewFix = ticket.kind === "review" && ticket.fixComments && ticket.prHeadBranch !== null;
    // A clean ticket reuses the EXISTING PR head branch (its commits) so fixes can be committed and
    // pushed straight to the PR — no new PR (same as a fixComments review).
    const cleanFix = ticket.kind === "clean" && ticket.prHeadBranch !== null;
    // A read-only review checks out the PR head commit too (suffixed local branch, never pushed):
    // reviewers grep/read the worktree to verify findings, so it must reflect the PR state, not the
    // base — a fresh branch off base made argus reconstruct the PR via `git show origin/<branch>:...`.
    const reviewRead = ticket.kind === "review" && !ticket.fixComments && ticket.prHeadBranch !== null;
    // The repeated null checks are required: TS does not carry the narrowing across `resolving`/`reviewFix`/`cleanFix`.
    let branch = featureBranch(ticket);
    // For an existing-branch checkout (resolving/reviewFix/cleanFix), the origin ref to start from.
    // A clean ticket's local branch is suffixed to avoid colliding with the PR head branch when it is
    // already checked out in another worktree; it still starts from and pushes back to the PR head.
    let startBranch: string | null = null;
    if (qualityCorrection && iteration.headBranch !== null) {
      branch = iteration.headBranch;
      startBranch = iteration.headBranch;
    } else if (resolving && ticket.branch !== null) {
      branch = ticket.branch;
      startBranch = ticket.branch;
    } else if (reviewFix && ticket.prHeadBranch !== null) {
      branch = ticket.prHeadBranch;
      startBranch = ticket.prHeadBranch;
    } else if (cleanFix && ticket.prHeadBranch !== null) {
      branch = `${ticket.prHeadBranch}${CLEANER_BRANCH_SUFFIX}`;
      startBranch = ticket.prHeadBranch;
    } else if (reviewRead && ticket.prHeadBranch !== null) {
      branch = `${ticket.prHeadBranch}${REVIEWER_BRANCH_SUFFIX}`;
      startBranch = ticket.prHeadBranch;
    }
    // The agent runs in-process via the SDK (no tmux pane), so the slot carries no tmux session name.
    this.store.updateSlot(slotId, {
      ticketId,
      repoPath: project.repoPath,
      tmuxSession: null,
      status: "busy",
    });
    this.touch(
      this.store.updateTicket(ticketId, {
        slotId,
        branch,
        stage: "queued",
        finishedAt: null,
        lastProgressAt: Date.now(),
      }),
    );
    this.hub.pushSlots(this.store.listSlots());
    log.info("lancement du ticket", { ticketId, slotId, project: ticket.project, branch });

    try {
      if (ticket.autonomous && !ticket.autonomousState) this.store.ensureAutonomousExecution(ticketId);
      this.autonomousWorkflow?.startExecution?.(ticketId);
      const executionGuard = createAutonomousSessionGuard(this.store, ticketId, "orchestrator");
      executionGuard?.beforeStart();
      const assertWork = (): void => executionGuard?.assertAllowed();
      if (qualityCorrection) {
        await this.assertQualityIterationPr(ticket, iteration, iteration.sourceRevision);
        if (this.store.getActiveQualityIteration(ticketId)?.id !== iteration.id) throw new Error("Correction qualité annulée pendant le lancement.");
        this.store.updateQualityIteration(iteration.id, { status: "correcting" });
      }
      const executionTicket = this.qualityCorrectionTicket(ticket);
      const execution = resolveTicketExecution(executionTicket, "orchestrator", {
        model: MODELS.implement,
        effort: MODELS.implementEffort,
      });
      await assertExecutionAvailable(this.system, execution);
      await assertCodexImplementerAvailable(this.system, executionTicket, execution);
      assertWork();
      this.setPhase(ticketId, SETUP_PHASES.worktree);
      let forkSha: string | null = null;
      await this.repoMutex.run(project.repoPath, async () => {
        assertWork();
        if (reuseWorktree) {
          const attachedPath = await this.system.findWorktreeByBranch(project.repoPath, branch);
          if (attachedPath !== path) throw new Error(`la branche ${branch} n'est plus attachée au slot Atelier ${slotId}`);
        } else {
          const previous = this.store.getSlot(slotId);
          await this.system.worktreeRemove(previous?.repoPath ?? project.repoPath, path);
          assertWork();
          await this.system.fetch(project.repoPath, baseBranch);
          if (ticket.dependsOn !== null && !ticket.dependencyLaunch && !resolving && !qualityCorrection) {
            forkSha = await this.system.readGitRef(project.repoPath, `origin/${baseBranch}`);
          }
        }
        if (!reuseWorktree && (resolving || reviewFix || cleanFix || qualityCorrection)) {
          // The PR branch lives only on origin after the slot was released; fetch it, then check it
          // out so the session has the PR's commits. Conflict resolution rebases onto the (also
          // fetched) base; a review-fix or clean applies and pushes fixes onto this same PR head branch.
          const start = startBranch ?? branch;
          await this.system.fetch(project.repoPath, start);
          assertWork();
          await this.system.worktreeAddExisting(project.repoPath, path, branch, start);
        } else if (!reuseWorktree) {
          assertWork();
          await this.system.worktreeAdd({
            repoPath: project.repoPath,
            slotPath: path,
            branch,
            baseBranch,
          });
          if (reviewRead && ticket.prUrl !== null && ticket.prNumber !== null) {
            const prepared = await this.system.prepareReviewWorktree({
              repoPath: project.repoPath,
              slotPath: path,
              prUrl: ticket.prUrl,
              prNumber: ticket.prNumber,
              provider: project.vcsProvider,
            });
            if (!prepared.ok) throw new Error(prepared.reason);
          }
        }
      });
      assertWork();
      if (ticket.dependsOn !== null && !ticket.dependencyLaunch && forkSha !== null) {
        this.store.recordDependencyLaunch(ticketId, { version: 2, parentTicketId: ticket.dependsOn, baseBranch, branch, project: ticket.project, forkSha });
      }

      if (qualityCorrection) {
        await this.assertQualityIterationPr(ticket, iteration, iteration.sourceRevision);
        const revision = await this.system.captureValidationRevision({ repoPath: project.repoPath, sourcePath: path, branch });
        if (!revision.clean || revision.commitSha !== iteration.sourceRevision) throw new Error("Le worktree de correction ne correspond pas à la révision figée.");
      }

      if (!reuseWorktree) await this.system.copyEnvFiles(project.repoPath, path);
      assertWork();
      // An ask ticket is read-only (explore + answer); the project setup script and dep install are
      // pure overhead, so skip both to start answering faster. Feature/review tickets need a built
      // tree (typecheck/lint/argus) and the project's own setup (e.g. generated .env). The setup
      // script runs before install since it may produce the .env the install step relies on.
      if (ticket.kind !== "ask") {
        this.setPhase(ticketId, SETUP_PHASES.setup);
        await this.system.runWorktreeSetupScript({
          repoPath: project.repoPath,
          slotPath: path,
          branch,
          baseBranch,
          script: project.worktreeScript ?? null,
          timeoutMs: this.autonomousPreparationTimeout(ticketId, project.commitTimeoutMs),
        });
        assertWork();
        this.setPhase(ticketId, SETUP_PHASES.deps);
        await this.system.installDeps(path, this.autonomousPreparationTimeout(ticketId, project.commitTimeoutMs));
        assertWork();
      }

      this.setPhase(ticketId, SETUP_PHASES.spawning);
      if (qualityCorrection && this.store.getActiveQualityIteration(ticketId)?.id !== iteration.id) throw new Error("Correction qualité annulée pendant la préparation.");
      const launchingTicket = this.store.getTicket(ticketId) ?? ticket;
      if (launchingTicket.dependencyLaunch) resolvePrTargetBaseBranch(launchingTicket, project, this.store);
      this.startAgentSession(launchingTicket, slotId, path, { ...(executionGuard ? { executionGuard } : {}) });
      this.touch(this.store.updateTicket(ticketId, { stage: "implementing", lastProgressAt: Date.now() }));
      this.store.logEvent(ticketId, "session_spawned", { slotId });
      log.info("session spawnée", { ticketId, slotId });

      // The contract is the session's first user turn — no connect poll, no ack, no re-push race.
      this.deliverContract(this.store.getTicket(ticketId) ?? ticket);
    } catch (error) {
      this.clearPhase(ticketId);
      if (qualityCorrection && this.store.getQualityIteration(iteration.id)?.status === "cancelled") return;
      const current = this.store.getTicket(ticketId);
      if (current?.autonomousState?.execution && current.autonomousState.phase !== "completed") {
        this.store.beginAutonomousFinalization(ticketId, getErrorMessage(error));
        this.autonomousWorkflow?.startExecution?.(ticketId);
        return;
      }
      this.markFailed(ticketId, slotId, getErrorMessage(error), error);
    }
  }

  /** Start the implementation SDK session for a ticket in its slot worktree. */
  private startAgentSession(ticket: Ticket, slotId: number, path: string, opts?: { resume?: boolean; executionGuard?: AgentExecutionGuard }): void {
    const executionTicket = this.qualityCorrectionTicket(ticket);
    this.sessionHub.start(
      { ...buildImplementSessionConfig({
        ticket: executionTicket,
        slotId,
        cwd: path,
        composerScriptPath: resolveTemplatePaths(this.config.projectRoot).composerScriptPath,
        vcsProvider: projectVcsProvider(ticket.project),
        // A Codex relaunch resumes the persisted thread so the reclaimed session keeps its context.
        ...(opts?.resume && ticket.sessionId && executionTicket.orchestrator === ticket.orchestrator ? { resumeSessionId: ticket.sessionId } : {}),
      }), ...(opts?.executionGuard ? { executionGuard: opts.executionGuard } : {}) },
    );
  }

  private qualityCorrectionTicket(ticket: Ticket): Ticket {
    const iteration = this.store.getActiveQualityIteration(ticket.id);
    if (iteration?.mode !== "correction") return ticket;
    const implementer = isAllowedAgentPair(iteration.provider, ticket.implementer) ? ticket.implementer : iteration.provider;
    return { ...ticket, orchestrator: iteration.provider, implementer };
  }

  private autonomousPreparationTimeout(ticketId: string, timeoutMs: number): number {
    const execution = this.store.getTicket(ticketId)?.autonomousState?.execution;
    if (!execution) return timeoutMs;
    this.store.assertAutonomousWork(ticketId);
    return Math.max(MIN_PREPARATION_TIMEOUT_MS, Math.min(timeoutMs, execution.deadlineAt - Date.now()));
  }

  /** Inject the ticket contract as the session's first user turn; idempotent marker + phase clear. */
  private deliverContract(ticket: Ticket): void {
    const sent = this.sessionHub.sendEvent(ticket.id, { type: "ticket", payload: this.buildContractPayload(ticket) });
    if (!sent) return;
    this.store.logEvent(ticket.id, "contract_delivered", {});
    this.clearPhase(ticket.id);
    log.info("contrat délivré à l'agent", { ticketId: ticket.id });
  }

  /** Whether buildContractPayload renders the feature contract, which already lists the ticket's comments. */
  private contractCarriesComments(ticket: Ticket): boolean {
    return !ticket.resolvingConflicts && ticket.kind === "feature" && this.store.getActiveQualityIteration(ticket.id)?.mode !== "correction";
  }

  private buildContractPayload(ticket: Ticket): string {
    const { commitLanguage } = this.store.getAppSettings();
    if (ticket.resolvingConflicts) {
      const project = getProject(ticket.project);
      const baseBranch = resolveExecutionBaseBranch(ticket, project, this.store);
      return buildConflictResolutionContract(ticket, { commitLanguage, baseBranch });
    }
    if (ticket.kind === "review") return buildReviewContract(ticket, { commitLanguage });
    if (ticket.kind === "clean") return buildCleanContract(ticket, { commitLanguage });
    if (ticket.kind === "ask") return buildAskContract(ticket);
    // A child ticket stacks on its parent's branch: the PR target must match the worktree fork point
    // resolved in launchInSlot, so resolve it once here and pass it through.
    const baseBranch = isProjectKey(ticket.project)
      ? resolvePrTargetBaseBranch(ticket, getProject(ticket.project), this.store)
      : ticket.baseBranch ?? "";
    const iteration = this.store.getActiveQualityIteration(ticket.id);
    if (iteration?.mode === "correction") {
      const quality = this.store.getTicketQuality(ticket.id);
      const source = quality.runs.find((run) => run.id === iteration.sourceRunId);
      const requiredCriteria = new Set(iteration.criteriaSnapshot?.criteria.filter((criterion) => criterion.required).map((criterion) => criterion.id) ?? []);
      const technical = iteration.trigger === "checks";
      const qualityFaults = technical ? [] : quality.evidence.filter((evidence) => source?.evidenceAccepted && evidence.runId === iteration.sourceRunId && evidence.kind === "behavior" && evidence.authority === "agent" && evidence.status === "failed" && evidence.criterionId !== null && requiredCriteria.has(evidence.criterionId));
      const qualityTechnicalFaults = technical
        ? quality.evidence
          .filter((evidence) => evidence.runId === iteration.sourceRunId && evidence.kind === "command" && evidence.authority === "server" && evidence.status === "failed" && QUALITY_TECHNICAL_CHECK_NAMES.includes(evidence.summary))
          .map((evidence) => ({ ...evidence, output: evidence.output.slice(-QUALITY_TECHNICAL_OUTPUT_LIMIT) }))
        : [];
      return buildTicketContract({ ...this.qualityCorrectionTicket(ticket), ...iteration.originalTicket, prdEnabled: false, autoMerge: false, stealth: false, directPush: false }, {
        composerScriptPath: resolveTemplatePaths(this.config.projectRoot).composerScriptPath,
        commitLanguage,
        baseBranch,
        qualityIteration: iteration,
        qualityFaults,
        qualityTechnicalFaults,
      });
    }
    return buildTicketContract(ticket, {
      composerScriptPath: resolveTemplatePaths(this.config.projectRoot).composerScriptPath,
      commitLanguage,
      baseBranch,
      comments: this.store.listComments(ticket.id),
    });
  }

  async reconcileDependencies(ticketId: string): Promise<void> {
    await this.dependencyReconciliation.reconcile(ticketId);
  }

  async checkMergedPr(ticketId: string): Promise<{ merged: boolean; state: PrState; ticket?: Ticket }> {
    const ticket = this.store.getTicket(ticketId);
    if (!ticket || ticket.column !== "done" || !ticket.prUrl || !isProjectKey(ticket.project)) return { merged: false, state: "unknown" };
    const project = getProject(ticket.project);
    if (project.vcsProvider === "github") {
      const snapshot = await this.dependencyReconciliation.readAndApply(ticket, false);
      const current = this.store.getTicket(ticketId);
      return { merged: snapshot?.state === "merged" && current?.column === "merged", state: snapshot?.state ?? "unknown", ...(current ? { ticket: current } : {}) };
    }
    const snapshot = await this.system.readPr(project.repoPath, ticket.prUrl, project.vcsProvider);
    if (snapshot.state !== "merged") return { merged: false, state: snapshot.state };
    const current = this.store.getTicket(ticketId);
    if (!matchesTicketDelivery(current, ticket) || current.column !== "done") return { merged: false, state: "unknown" };
    this.store.recordDependencyPrObservation(ticketId, { version: 1, prUrl: ticket.prUrl, project: ticket.project, branch: ticket.branch, ...snapshot, state: "merged" });
    const merged = await this.markMerged(ticketId, ticket);
    return { merged: true, state: snapshot.state, ticket: merged };
  }

  async recordMergedDelivery(ticketId: string, path: string, prUrl: string): Promise<void> {
    if (this.store.listDependents(ticketId).length === 0) return;
    const ticket = this.store.getTicket(ticketId);
    if (!ticket || ticket.prUrl !== prUrl || !isProjectKey(ticket.project)) return;
    const project = getProject(ticket.project);
    try {
      const snapshot = await this.system.readPr(path, prUrl, project.vcsProvider);
      const current = this.store.getTicket(ticketId);
      if (snapshot.state !== "merged" || !matchesTicketDelivery(current, ticket) || current.column !== ticket.column || !isProjectKey(current.project) || getProject(current.project).repoPath !== project.repoPath || getProject(current.project).vcsProvider !== project.vcsProvider) return;
      this.store.recordDependencyPrObservation(ticketId, { version: 1, prUrl, project: ticket.project, branch: ticket.branch, ...snapshot, state: "merged" });
      this.touch(this.store.getTicket(ticketId) ?? current);
      this.dependencyReconciliation.refreshDependents(ticketId);
    } catch (error) {
      log.warn("lecture de la cible fusionnée indisponible", { ticketId, reason: getErrorMessage(error) });
    }
  }

  private dependencyPrBaseFailure(ticket: Ticket, baseBranch: string, actualBase: string | null): DoneGateResult {
    let manualCommand: string | null = null;
    if (ticket.prUrl && projectVcsProvider(ticket.project) === "github") {
      const quote = (value: string): string => `'${value.replaceAll("'", "'\\''")}'`;
      manualCommand = `gh pr edit ${quote(ticket.prUrl)} --base ${quote(baseBranch)}`;
    }
    let reason = "Impossible de vérifier la branche cible de la PR enfant. La fusion reste bloquée.";
    if (actualBase !== null) {
      let instruction = "Utilise « Mettre à jour la base » puis recible la PR manuellement si nécessaire.";
      if (ticket.dependencyLaunch?.baseBranch === baseBranch) {
        instruction = "Recible la PR manuellement, puis clique de nouveau sur « Mettre à jour la base » pour vérifier sa branche cible.";
        if (manualCommand) {
          instruction = "Exécute la commande ci-dessous, puis clique de nouveau sur « Mettre à jour la base » pour vérifier sa branche cible.";
        }
      }
      reason = `La PR enfant cible ${actualBase} au lieu de ${baseBranch}. ${instruction}`;
    }
    this.store.recordDependencyStatus(ticket.id, { stale: true, reason, newBaseBranch: baseBranch, manualCommand: actualBase === null ? null : manualCommand });
    this.touch(this.store.getTicket(ticket.id) ?? ticket);
    return { ok: false, reason: manualCommand && actualBase !== null ? `${reason} ${manualCommand}` : reason };
  }

  async verifyDependencyDelivery(ticket: Ticket, path: string, prUrl?: string): Promise<DoneGateResult> {
    if (this.updatingDependencyBases.has(ticket.id)) return { ok: false, reason: "Mise à jour de la base en cours. Attends sa fin avant de fusionner." };
    if (ticket.dependsOn === null && !ticket.dependencyLaunch) return { ok: true, reason: "" };
    try {
      await this.reconcileDependencies(ticket.id);
      const current = this.store.getTicket(ticket.id);
      if (!matchesTicketDelivery(current, ticket) || current.slotId !== ticket.slotId) return { ok: false, reason: "Le ticket a changé pendant la vérification de sa dépendance." };
      ticket = current;
      if (!isProjectKey(ticket.project)) return { ok: false, reason: "Projet introuvable pour vérifier la base de livraison." };
      const project = getProject(ticket.project);
      const baseBranch = resolvePrTargetBaseBranch(ticket, project, this.store);
      if (prUrl) {
        const snapshot = await this.system.readPr(path, prUrl, project.vcsProvider);
        const latest = this.store.getTicket(ticket.id);
        if (!matchesTicketDelivery(latest, ticket) || latest.slotId !== ticket.slotId) return { ok: false, reason: "Le ticket a changé pendant la lecture de sa PR." };
        if (snapshot.baseBranch !== baseBranch) return this.dependencyPrBaseFailure({ ...latest, prUrl }, baseBranch, snapshot.baseBranch);
        this.store.recordDependencyStatus(ticket.id, { stale: false, reason: null, newBaseBranch: baseBranch, manualCommand: null });
        this.touch(this.store.getTicket(ticket.id) ?? latest);
      }
      const latest = this.store.getTicket(ticket.id);
      if (!latest || resolvePrTargetBaseBranch(latest, project, this.store) !== baseBranch) return { ok: false, reason: "La base de livraison a changé pendant la vérification." };
      return { ok: true, reason: "" };
    } catch (error) {
      return { ok: false, reason: getErrorMessage(error) };
    }
  }

  async updateDependencyBase(ticketId: string): Promise<UpdateDependencyBaseResult> {
    if (this.updatingDependencyBases.has(ticketId)) return { ok: false, reason: "Mise à jour de la base déjà en cours." };
    this.updatingDependencyBases.add(ticketId);
    try {
      await this.reconcileDependencies(ticketId);
      const ticket = this.store.getTicket(ticketId);
      if (!ticket || !canUpdateDependencyBase(ticket) || !isProjectKey(ticket.project) || ticket.branch === null || ticket.dependsOn === null) return { ok: false, reason: "La mise à jour de base requiert un ticket dépendant sans session ni slot actif." };
      const launch = ticket.dependencyLaunch;
      if (!launch || launch.version !== 2) return { ok: false, reason: "Aucun commit de départ n'a été enregistré pour ce ticket. Rebase et reciblage manuels requis ; aucune réécriture automatique n'est possible." };
      if (launch.parentTicketId !== ticket.dependsOn || launch.branch !== ticket.branch || launch.project !== ticket.project) return { ok: false, reason: "L'identité du ticket a changé depuis son lancement. Reprise manuelle requise." };
      const project = getProject(ticket.project);
      const baseBranch = requireForkBaseBranch(ticket, project, this.store);
      const assertCurrent = (): void => {
        const current = this.store.getTicket(ticketId);
        if (!matchesTicketDelivery(current, ticket) || !canUpdateDependencyBase(current) || JSON.stringify(current.dependencyLaunch) !== JSON.stringify(launch) || this.sessionHub.isConnected(ticketId) || this.isLaunching(ticketId) || this.store.listSlots().some((slot) => slot.ticketId === ticketId) || this.queue.includes(ticketId)) throw new Error("Le ticket ou sa session a changé pendant la mise à jour de la base. Opération arrêtée.");
        if (!isProjectKey(current.project) || getProject(current.project).repoPath !== project.repoPath || getProject(current.project).vcsProvider !== project.vcsProvider || requireForkBaseBranch(current, getProject(current.project), this.store) !== baseBranch) throw new Error("La base ou le projet a changé pendant la mise à jour. Opération arrêtée.");
      };
      await this.repoMutex.run(project.repoPath, async () => {
        assertCurrent();
        this.store.recordDependencyStatus(ticketId, { stale: true, reason: "Mise à jour de la base en cours ; la cible de la PR doit encore être vérifiée.", newBaseBranch: baseBranch, manualCommand: null });
        this.touch(this.store.getTicket(ticketId) ?? ticket);
        const result = await this.system.updateDependencyBase({ repoPath: project.repoPath, branch: launch.branch, baseBranch, forkSha: launch.forkSha, assertCurrent });
        if (!result.ok || !result.forkSha) throw new Error(result.reason || "La mise à jour n'a pas retourné son commit de base.");
        const afterPush = this.store.getTicket(ticketId);
        if (!matchesTicketDelivery(afterPush, ticket)) throw new Error("La branche a été repoussée mais l’identité du ticket a changé. Vérification manuelle requise.");
        const nextForkSha = result.forkSha;
        this.store.transaction(() => {
          this.store.recordDependencyLaunch(ticketId, { version: 2, parentTicketId: launch.parentTicketId, baseBranch, branch: launch.branch, project: launch.project, forkSha: nextForkSha });
          this.store.recordDependencyStatus(ticketId, { stale: true, reason: "Branche rebasée ; la cible de la PR doit encore être vérifiée.", newBaseBranch: baseBranch, manualCommand: null });
        });
      });
      const current = this.store.getTicket(ticketId);
      if (!matchesTicketDelivery(current, ticket)) return { ok: false, reason: "Le ticket a changé après la mise à jour. Vérification manuelle requise." };
      if (current.prUrl) {
        const snapshot = await this.system.readPr(project.repoPath, current.prUrl, project.vcsProvider);
        const latest = this.store.getTicket(ticketId);
        if (!matchesTicketDelivery(latest, current)) return { ok: false, reason: "Le ticket a changé pendant la vérification finale de sa PR." };
        if (snapshot.baseBranch !== baseBranch) {
          const failure = this.dependencyPrBaseFailure(latest, baseBranch, snapshot.baseBranch);
          const status = this.store.getDependencyStatus(ticketId);
          return { ok: false, reason: failure.reason, ...(status?.manualCommand ? { manualCommand: status.manualCommand } : {}), ticket: this.store.getTicket(ticketId) ?? latest };
        }
      }
      const finalTicket = this.store.getTicket(ticketId);
      if (!finalTicket || !isProjectKey(finalTicket.project) || requireForkBaseBranch(finalTicket, getProject(finalTicket.project), this.store) !== baseBranch) throw new Error("La base a changé pendant la vérification finale. Relance « Mettre à jour la base ».");
      this.store.recordDependencyStatus(ticketId, { stale: false, reason: null, newBaseBranch: baseBranch, manualCommand: null });
      const updated = this.store.getTicket(ticketId) ?? current;
      this.touch(updated);
      return { ok: true, reason: "Base mise à jour. La PR reste ouverte et peut être fusionnée séparément.", ticket: updated };
    } catch (error) {
      const reason = getErrorMessage(error);
      const current = this.store.getTicket(ticketId);
      const status = this.store.getDependencyStatus(ticketId);
      if (current && status?.stale) {
        this.store.recordDependencyStatus(ticketId, { ...status, reason });
        this.touch(this.store.getTicket(ticketId) ?? current);
      }
      return { ok: false, reason };
    } finally {
      this.updatingDependencyBases.delete(ticketId);
    }
  }

  /**
   * Select the done gate by ticket kind. Review gates on optional posted/pushed proof; a clean gates
   * on a clean tree and a fully-pushed PR head branch — `requirePushedBranch` asserts both no
   * uncommitted changes AND zero commits ahead of origin, which also passes the legitimate "nothing
   * pertinent to apply" case (0 commits ahead) while preventing applied-but-unpushed fixes from being
   * lost when the slot is released; everything else gates on the standard feature done.
   */
  private async doneGate(ticket: Ticket, path: string, branch: string, prUrl: string): Promise<DoneGateResult> {
    const dependencyGate = await this.verifyDependencyDelivery(ticket, path, prUrl);
    if (!dependencyGate.ok) return dependencyGate;
    if (ticket.autonomous) return this.verifyAutonomousPr(ticket, path, prUrl);
    const provider = projectVcsProvider(ticket.project);
    if (ticket.kind === "review") {
      const reviewPass = this.store.getReviewPass(ticket.id);
      return this.system.verifyReviewDone(path, prUrl, {
        requirePostedSince: ticket.postComments ? ticket.createdAt : null,
        publicationMarker: ticket.postComments && reviewPass ? `<!-- kanban-review-pass:${reviewPass.passId} -->` : null,
        expectedCommitSha: reviewPass?.publishedCommitSha ?? reviewPass?.reviewedCommitSha ?? null,
        publishedReviewId: reviewPass?.publishedReviewId ?? null,
        expectedReviewState: reviewPublicationState(reviewPass),
        requirePushedBranch: reviewPass?.requiresApproval ? ticket.prHeadBranch : null,
      }, provider);
    }
    if (ticket.kind === "clean") {
      return this.system.verifyReviewDone(path, prUrl, {
        requirePostedSince: null,
        publicationMarker: null,
        expectedCommitSha: null,
        publishedReviewId: null,
        expectedReviewState: null,
        requirePushedBranch: ticket.prHeadBranch,
      }, provider);
    }
    return this.system.verifyDone(path, branch, prUrl, provider);
  }

  private async autonomousRevision(ticket: Ticket, path: string): Promise<string> {
    if (!this.autonomousWorkflow || !ticket.branch || !isProjectKey(ticket.project)) throw new Error("Autonomous delivery is unavailable.");
    const project = getProject(ticket.project);
    if (project.vcsProvider !== "github") throw new Error("Autonomous delivery is not qualified for this pull request host.");
    const revision = await this.system.captureValidationRevision({ repoPath: project.repoPath, sourcePath: path, branch: ticket.branch });
    if (!revision.clean) throw new Error("Autonomous delivery requires the unchanged, clean preview-tested commit.");
    await this.autonomousWorkflow.assertDelivery(ticket.id, revision.commitSha);
    return revision.commitSha;
  }

  private async verifyAutonomousPr(ticket: Ticket, path: string, prUrl: string): Promise<DoneGateResult> {
    try {
      const commitSha = await this.autonomousRevision(ticket, path);
      if (!ticket.branch || !isProjectKey(ticket.project)) return { ok: false, reason: "Autonomous branch is unavailable." };
      const project = getProject(ticket.project);
      return await this.system.verifyRecoveryCandidate({
        repoPath: project.repoPath,
        slotPath: path,
        branch: ticket.branch,
        baseBranch: resolvePrTargetBaseBranch(ticket, project, this.store),
        prUrl,
        commitSha,
        allowMerged: ticket.autonomousDelivery === "merge",
      }, project.vcsProvider);
    } catch (error) {
      return { ok: false, reason: getErrorMessage(error) };
    }
  }

  async prepareAutonomousPr(ticketId: string, slotId: number, input: { title: string; body: string }): Promise<{ ok: boolean; url: string; reason: string }> {
    return this.reserveAutonomousDelivery(ticketId, () => this.prepareAutonomousPrReserved(ticketId, slotId, input));
  }

  private async prepareAutonomousPrReserved(ticketId: string, slotId: number, input: { title: string; body: string }): Promise<{ ok: boolean; url: string; reason: string }> {
    await this.reconcileDependencies(ticketId);
    const ticket = this.store.getTicket(ticketId);
    if (!ticket?.autonomous || !ticket.branch || !ticket.autonomousState || ticket.slotId !== slotId || this.store.getSlot(slotId)?.ticketId !== ticketId || !isProjectKey(ticket.project)) return { ok: false, url: "", reason: "Autonomous delivery does not own this worktree." };
    const path = slotPath(slotId);
    try {
      const revision = await this.autonomousRevision(ticket, path);
      const project = getProject(ticket.project);
      const baseBranch = resolvePrTargetBaseBranch(ticket, project, this.store);
      let prUrl = ticket.prUrl;
      if (!prUrl) {
        const ready = await this.system.verifyStealthReady(path, ticket.branch);
        if (!ready.ok) return { ok: false, url: "", reason: ready.reason };
        const prs = await this.system.listOpenPrs(path, project.vcsProvider);
        const candidates = prs.filter((pr) => pr.headBranch === ticket.branch);
        if (candidates.length > 1 || candidates.some((pr) => pr.baseBranch !== baseBranch)) return { ok: false, url: "", reason: "Existing pull requests for this branch are ambiguous or target another branch." };
        prUrl = candidates[0]?.url ?? null;
      }
      const beforeCreate = this.store.getTicket(ticketId);
      if (beforeCreate?.slotId !== slotId || this.store.getSlot(slotId)?.ticketId !== ticketId || !beforeCreate.autonomousState || (beforeCreate.autonomousState.phase !== "ready" && beforeCreate.autonomousState.phase !== "delivering" && !beforeCreate.autonomousState.hostMutation)) return { ok: false, url: prUrl ?? "", reason: "Autonomous delivery was stopped before pull request creation." };
      this.touch(this.store.updateTicket(ticketId, { autonomousState: { ...beforeCreate.autonomousState, phase: "delivering", error: null }, stage: "opening_pr" }));
      if (!prUrl) {
        if (beforeCreate.autonomousState.hostMutation) return { ok: false, url: "", reason: "Previous pull request creation has an uncertain result; only reconciliation is allowed." };
        const operationId = crypto.randomUUID();
        const created = await this.system.createPr(path, baseBranch, { draft: ticket.autonomousDelivery === "pr_only" && ticket.prDraft, title: input.title, body: input.body, headBranch: ticket.branch, requireExistingBase: true, deadlineAt: beforeCreate.autonomousState.execution?.deadlineAt ?? beforeCreate.autonomousState.deadlineAt, assertCurrent: () => this.assertAutonomousMutation(ticket, slotId, revision, "create_pr", operationId) }, project.vcsProvider);
        if (!created.ok) return created;
        prUrl = created.url;
      }
      this.touch(this.store.updateTicket(ticketId, { prUrl }));
      const current = this.store.getTicket(ticketId);
      if (!current) return { ok: false, url: prUrl, reason: "Autonomous ticket disappeared during delivery." };
      const identity = await this.verifyAutonomousPr(current, path, prUrl);
      const reconciled = this.store.getTicket(ticketId)?.autonomousState;
      if (identity.ok && reconciled?.hostMutation?.kind === "create_pr") this.touch(this.store.updateTicket(ticketId, { autonomousState: { ...reconciled, hostMutation: null, ...(current.autonomousDelivery === "pr_only" ? { deliveryConfirmation: { prUrl, revision, outcome: "pr_only", confirmedAt: Date.now() } } : {}) } }));
      return { ok: identity.ok, url: prUrl, reason: identity.reason };
    } catch (error) {
      return { ok: false, url: this.store.getTicket(ticketId)?.prUrl ?? "", reason: getErrorMessage(error) };
    }
  }

  async isDeliveryDescriptionStructured(ticket: Ticket, slotId: number, prUrl: string): Promise<boolean | null> {
    const path = slotPath(slotId);
    const provider = projectVcsProvider(ticket.project);
    if (provider === "azureDevops") {
      const fileBody = await this.system.readWorktreePrBody(path);
      return fileBody !== null && hasStructuredPrDescription(fileBody);
    }
    const body = await this.system.readPrBody(path, prUrl, provider);
    return body === null ? null : hasStructuredPrDescription(body);
  }

  private async applyAzurePrDescription(ticket: Ticket, path: string, prUrl: string): Promise<void> {
    const provider = projectVcsProvider(ticket.project);
    if (provider !== "azureDevops" || !isFirstFeatureDelivery(ticket, this.store.getActiveQualityIteration(ticket.id) !== null)) return;
    try {
      const fileBody = (await this.system.readWorktreePrBody(path))?.trimEnd() ?? "";
      if (fileBody.trim().length === 0) return;
      const applied = await this.system.updatePrBody(path, prUrl, () => fileBody, provider);
      if (!applied.ok) this.store.logEvent(ticket.id, PR_DESCRIPTION_APPLY_FAILED_EVENT, { prUrl, reason: applied.reason });
    } catch (error) {
      this.store.logEvent(ticket.id, PR_DESCRIPTION_APPLY_FAILED_EVENT, { prUrl, reason: getErrorMessage(error) });
    }
  }

  /** Verify and release a slot on done(pr_url). */
  async finishTicket(
    ticketId: string,
    slotId: number,
    prUrl: string,
    options: FinishTicketOptions = {},
  ): Promise<{ ok: boolean; reason: string; slotReleased: boolean; pending?: boolean }> {
    if (this.store.getTicket(ticketId)?.autonomous) return this.reserveAutonomousDelivery(ticketId, () => this.finishTicketReserved(ticketId, slotId, prUrl, options));
    return this.finishTicketReserved(ticketId, slotId, prUrl, options);
  }

  private async finishTicketReserved(ticketId: string, slotId: number, prUrl: string, options: FinishTicketOptions): Promise<{ ok: boolean; reason: string; slotReleased: boolean; pending?: boolean }> {
    const ticket = this.store.getTicket(ticketId);
    const slot = this.store.getSlot(slotId);
    if (!ticket || !ticket.branch) {
      return { ok: false, reason: "ticket ou branche introuvable", slotReleased: false };
    }
    if (ticket.slotId !== slotId || slot?.ticketId !== ticketId) {
      return { ok: false, reason: "slot périmé ou détenu par un autre ticket", slotReleased: false };
    }
    const path = slotPath(slotId);
    const iteration = this.store.getActiveQualityIteration(ticketId);
    if (iteration?.mode === "correction") {
      if (iteration.status === "verifying") return { ok: true, reason: "Nouvelle vérification indépendante en cours.", slotReleased: false };
      if (iteration.status !== "correcting" || prUrl !== iteration.prUrl || ticket.branch !== iteration.headBranch) return { ok: false, reason: "La correction doit conserver la PR et sa branche initiales.", slotReleased: false };
      try {
        await this.assertQualityIterationPr(ticket, iteration);
      } catch (error) {
        return { ok: false, reason: getErrorMessage(error), slotReleased: false };
      }
    }

    const recoveryBeforeGate = await this.implementationRecoveryGuard?.(ticketId, slotId, prUrl);
    if (recoveryBeforeGate && !recoveryBeforeGate.ok) return { ok: false, reason: recoveryBeforeGate.result, slotReleased: false };

    log.info("vérification de la gate done", { ticketId, slotId, prUrl, kind: ticket.kind });
    const gate = await this.doneGate(ticket, path, ticket.branch, prUrl);
    if (!gate.ok) {
      this.store.logEvent(ticketId, DONE_GATE_FAILED_EVENT, { reason: gate.reason });
      const consecutiveFailures = this.store.countTrailingEvents(ticketId, DONE_GATE_FAILED_EVENT, DONE_GATE_MAX_FAILURES);
      // A failed gate is not, by itself, a stall: done() hands the actionable reason back to the
      // still-alive agent, which corrects and retries (e.g. commits a file it left uncommitted).
      // Marking the card "stalled" on the first failure produced false "Bloqué" badges while the
      // session kept working. Escalate to a real stall only once the agent is gone, or it loops on
      // the gate without ever passing it (no progress between attempts → consecutive failures).
      const retriable = this.sessionHub.isConnected(ticketId) && consecutiveFailures < DONE_GATE_MAX_FAILURES;
      if (retriable) {
        // Keep the card active (animated "opening_pr"), clear of any stale error box. The watchdog
        // and Stop-hook still guard a session that genuinely dies in this stage.
        this.touch(this.store.updateTicket(ticketId, { stage: "opening_pr", error: null }));
        log.info("gate done échouée — l'agent corrige et réessaie", { ticketId, reason: gate.reason, consecutiveFailures });
        return { ok: false, reason: gate.reason, slotReleased: false };
      }
      log.warn("gate done échouée (épuisée)", { ticketId, reason: gate.reason, consecutiveFailures });
      await this.lifecycle.stall(
        ticketId,
        { title: "Gate done échouée", body: `${ticket.title}: ${gate.reason}` },
        { error: gate.reason, errorDetails: this.lifecycle.errorDetailsFor(ticketId, gate.reason, "done_gate") },
      );
      return { ok: false, reason: gate.reason, slotReleased: false };
    }
    if (iteration?.mode === "correction") {
      if (!this.qualityIterationVerifier || !isProjectKey(ticket.project)) return { ok: false, reason: "Vérification de correction qualité indisponible.", slotReleased: false };
      try {
        const project = getProject(ticket.project);
        const revision = await this.system.captureValidationRevision({ repoPath: project.repoPath, sourcePath: path, branch: ticket.branch });
        await this.assertQualityIterationPr(ticket, iteration, revision.commitSha);
        if (!revision.clean || this.store.getActiveQualityIteration(ticketId)?.id !== iteration.id) throw new Error("Correction modifiée ou annulée avant vérification.");
        this.store.updateQualityIteration(iteration.id, { status: "verifying", resultRevision: revision.commitSha });
        setTimeout(() => this.sessionHub.disconnect(ticketId, "completed"), 0);
        await this.qualityIterationVerifier(ticketId, path, iteration.id);
        return { ok: true, reason: "Correction poussée sur la PR existante ; nouvelle vérification indépendante complète en cours.", slotReleased: false };
      } catch (error) {
        if (this.store.getQualityIteration(iteration.id)?.status === "cancelled") return { ok: false, reason: "Correction qualité annulée.", slotReleased: false };
        this.markFailed(ticketId, slotId, getErrorMessage(error), error);
        return { ok: false, reason: getErrorMessage(error), slotReleased: false };
      }
    }
    const quality = ticket.autonomous ? null : await this.recordDeliveryQuality(ticketId);
    const currentTicket = this.store.getTicket(ticketId);
    const currentSlot = this.store.getSlot(slotId);
    if (currentTicket?.slotId !== slotId || currentSlot?.ticketId !== ticketId) {
      log.warn("finalisation done ignorée après changement de propriétaire du slot", { ticketId, slotId, prUrl });
      return { ok: false, reason: "slot périmé ou détenu par un autre ticket", slotReleased: false };
    }
    const recoveryAfterQuality = await this.implementationRecoveryGuard?.(ticketId, slotId, prUrl);
    if (recoveryAfterQuality && !recoveryAfterQuality.ok) return { ok: false, reason: recoveryAfterQuality.result, slotReleased: false };
    const dependencyGate = await this.verifyDependencyDelivery(currentTicket, path);
    if (!dependencyGate.ok) {
      this.store.logEvent(ticketId, DONE_GATE_FAILED_EVENT, { reason: dependencyGate.reason });
      await this.lifecycle.stall(ticketId, { title: "Gate done échouée", body: `${ticket.title}: ${dependencyGate.reason}` }, { error: dependencyGate.reason, errorDetails: this.lifecycle.errorDetailsFor(ticketId, dependencyGate.reason, "done_gate") });
      return { ok: false, reason: dependencyGate.reason, slotReleased: false };
    }
    log.info("gate done validée", { ticketId, slotId, prUrl });
    if (!options.skipPrDescription) await this.applyAzurePrDescription(currentTicket, path, prUrl);

    // Opt-in auto-merge: merge before releasing the slot (worktree still present for gh cwd).
    // Review and clean tickets land in their own "PR reviewed" column instead of the generic "done".
    let column: Column = "done";
    if (ticket.kind === "review" || ticket.kind === "clean") column = "reviewed";
    let mergeError: string | null = null;
    if (currentTicket.autonomous) {
      const identity = await this.verifyAutonomousPr(currentTicket, path, prUrl);
      if (!identity.ok) return { ok: false, reason: identity.reason, slotReleased: false };
      if (currentTicket.autonomousDelivery === "merge" && !isCloudHost()) {
        if (!isProjectKey(currentTicket.project) || !currentTicket.autonomousState?.revision) return { ok: false, reason: "Autonomous merge revision is unavailable.", slotReleased: false };
        const project = getProject(currentTicket.project);
        const merged = await this.system.readPr(path, prUrl, project.vcsProvider);
        let merge: DoneGateResult = { ok: merged.state === "merged", reason: "" };
        if (merged.state !== "merged") {
          const finalGate = await this.verifyDependencyDelivery(currentTicket, path, prUrl);
          if (!finalGate.ok) return { ok: false, reason: finalGate.reason, slotReleased: false };
          const operationId = crypto.randomUUID();
          merge = await this.system.mergePr(path, ticket.branch, prUrl, project.vcsProvider, { commitSha: currentTicket.autonomousState.revision, baseBranch: resolvePrTargetBaseBranch(currentTicket, project, this.store), deadlineAt: currentTicket.autonomousState.execution?.deadlineAt ?? currentTicket.autonomousState.deadlineAt, assertCurrent: () => this.assertAutonomousMutation(currentTicket, slotId, currentTicket.autonomousState?.revision ?? "", "merge", operationId) });
        }
        if (!merge.ok) {
          const stopped = this.store.getTicket(ticketId)?.autonomousState;
          if (!stopped || stopped.phase !== "delivering") return { ok: false, reason: "Autonomous delivery was stopped during native host checks.", slotReleased: false };
          this.touch(this.store.updateTicket(ticketId, { stage: merge.pending ? "opening_pr" : "stalled", error: merge.reason, autonomousState: { ...stopped, error: merge.reason } }));
          this.store.logEvent(ticketId, merge.pending ? "autonomous_delivery_waiting" : "autonomous_delivery_paused", { reason: merge.reason, prUrl });
          return { ok: false, reason: merge.reason, slotReleased: false, pending: merge.pending };
        }
        const confirmed = await this.verifyAutonomousPr(currentTicket, path, prUrl);
        const state = await this.system.readPr(path, prUrl, project.vcsProvider);
        if (!confirmed.ok || state.state !== "merged") return { ok: false, reason: confirmed.reason || "Autonomous merge could not be confirmed.", slotReleased: false };
        const reconciled = this.store.getTicket(ticketId)?.autonomousState;
        if (!reconciled) return { ok: false, reason: "Autonomous merge state disappeared during reconciliation.", slotReleased: false };
        this.touch(this.store.updateTicket(ticketId, { autonomousState: { ...reconciled, hostMutation: null, deliveryConfirmation: { prUrl, revision: currentTicket.autonomousState.revision, outcome: "merge", confirmedAt: reconciled.deliveryConfirmation?.confirmedAt ?? Date.now() } } }));
        column = "merged";
        this.store.logEvent(ticketId, "auto_merged", { prUrl, commitSha: currentTicket.autonomousState.revision });
      }
    } else if (options.skipMerge && currentTicket.resolvingConflicts) {
      this.store.logEvent(ticketId, currentTicket.reviewLevel === "high" ? MERGE_SKIPPED_REVIEW_LEVEL_HIGH_EVENT : MERGE_SKIPPED_AFTER_REVIEW_LIMIT_EVENT, { prUrl });
    } else if (!options.skipMerge && (currentTicket.autoMerge || currentTicket.resolvingConflicts) && currentTicket.kind === "feature" && (!quality?.enabled || quality.complete) && !isCloudHost()) {
      const finalGate = await this.verifyDependencyDelivery(currentTicket, path, prUrl);
      if (!finalGate.ok) return { ok: false, reason: finalGate.reason, slotReleased: false };
      log.info("auto-merge de la PR", { ticketId, prUrl });
      const merge = await this.system.mergePr(path, ticket.branch, prUrl, projectVcsProvider(ticket.project));
      if (merge.ok) {
        column = "merged";
        this.store.logEvent(ticketId, "auto_merged", { prUrl });
      } else {
        mergeError = merge.reason;
        column = "failed";
        this.store.logEvent(ticketId, "auto_merge_failed", { reason: merge.reason });
        log.warn("auto-merge échoué", { ticketId, reason: merge.reason });
        // Auto-merge failures (branch behind base / conflicts) are the top terminal-failure cause.
        // Instead of parking the card in "failed" for a manual resolve, spawn a rebase/resolution
        // session automatically (bounded by AUTO_MERGE_RESOLVE_MAX to break the resolve→fail loop).
        if (await this.tryAutoResolveMerge(ticket, slotId, prUrl, merge.reason)) {
          return { ok: true, reason: "", slotReleased: true };
        }
      }
    }

    // Capture the agent's own work summary from the PR description (feature tickets that actually
    // landed in done/merged; a review/clean ticket's PR body is not the agent's work, and a
    // merge-failed ticket never surfaces it). Read before releasing the slot, while the worktree is
    // still present for gh's cwd.
    const agentSummary = ticket.kind === "feature" && !mergeError
      ? await this.system.fetchPrSummary(path, prUrl, projectVcsProvider(ticket.project))
      : null;

    if (currentTicket.autonomous) {
      try {
        if (!this.autonomousWorkflow) throw new Error("Autonomous cleanup is unavailable.");
        const beforeCleanup = this.store.getTicket(ticketId);
        if (beforeCleanup?.slotId !== slotId || this.store.getSlot(slotId)?.ticketId !== ticketId || beforeCleanup.column === "abandoned") return { ok: false, reason: "Autonomous delivery lost worktree ownership before cleanup.", slotReleased: false };
        const state = beforeCleanup.autonomousState;
        if (!state?.revision || !currentTicket.autonomousDelivery) throw new Error("Autonomous delivery confirmation is unavailable.");
        this.touch(this.store.updateTicket(ticketId, { autonomousState: { ...state, deliveryConfirmation: { prUrl, revision: state.revision, outcome: currentTicket.autonomousDelivery, confirmedAt: state.deliveryConfirmation?.confirmedAt ?? Date.now() } } }));
        await this.autonomousWorkflow.finishDelivery(ticketId);
      } catch (error) {
        const reason = getErrorMessage(error);
        this.touch(this.store.updateTicket(ticketId, { stage: "stalled", error: reason }));
        this.store.logEvent(ticketId, "autonomous_cleanup_paused", { prUrl, reason });
        return { ok: false, reason, slotReleased: false };
      }
    }

    if (column === "merged") await this.recordMergedDelivery(ticketId, path, prUrl);
    const deliveryAfterCleanup = this.store.getTicket(ticketId);
    if (currentTicket.autonomous && (deliveryAfterCleanup?.slotId !== slotId || this.store.getSlot(slotId)?.ticketId !== ticketId || deliveryAfterCleanup.column === "abandoned" || deliveryAfterCleanup.autonomousState?.phase !== "delivering")) return { ok: false, reason: "Autonomous delivery was stopped or its worktree ownership changed during cleanup.", slotReleased: false };
    const completedAutonomousState = this.store.getTicket(ticketId)?.autonomousState;
    this.touch(
      this.store.updateTicket(ticketId, {
        column,
        stage: mergeError ? "failed" : "done",
        prUrl,
        slotId: null,
        // The run reached done(): any conflict-resolution session is over (cleared on both outcomes).
        resolvingConflicts: false,
        error: mergeError,
        agentSummary,
        finishedAt: Date.now(),
        ...(currentTicket.autonomous && completedAutonomousState ? { autonomousState: { ...completedAutonomousState, phase: "completed", error: null } } : {}),
      }),
    );
    if (column === "merged") this.dependencyReconciliation.refreshDependents(ticketId);
    if (!mergeError) this.store.logEvent(ticketId, "done", { prUrl });
    const cleanupError = await this.cleanupTerminalSlot(
      slotId,
      ticket,
      mergeError ? "failed" : "completed",
      false,
    );
    await this.notifier.notify("Ticket terminé", this.doneNotifyBody(ticket, mergeError), ticket.id, true);
    // The PR is open and the branch pushed (gate passed): release any child stacked on this ticket.
    if (!mergeError) void this.startDependents(ticketId).catch((error: unknown) => {
      log.error("libération des tickets dépendants échouée", { ticketId, error: getErrorMessage(error) });
    });
    this.pumpQueue();
    return {
      ok: true,
      reason: cleanupError === null ? "" : `ticket clôturé, nettoyage du slot à reprendre : ${cleanupError}`,
      slotReleased: cleanupError === null,
    };
  }

  private async cleanupTerminalSlot(
    slotId: number,
    ticket: Ticket,
    executionStatus: "completed" | "failed",
    recovery: boolean,
  ): Promise<string | null> {
    try {
      await this.releaseSlot(slotId, ticket, executionStatus);
      if (recovery) this.store.logEvent(ticket.id, "slot_cleanup_recovered", { slotId });
      log.info(recovery ? "nettoyage différé du slot terminé" : "slot libéré après finalisation", {
        ticketId: ticket.id,
        slotId,
      });
      return null;
    } catch (error) {
      const reason = getErrorMessage(error);
      this.store.updateSlot(slotId, { status: "failed" });
      this.hub.pushSlots(this.store.listSlots());
      this.store.logEvent(ticket.id, "slot_cleanup_failed", { slotId, reason, recovery });
      log.error(recovery ? "nettoyage différé du slot toujours en échec" : "nettoyage du slot échoué après finalisation", {
        ticketId: ticket.id,
        slotId,
        stack: getErrorStack(error),
      });
      return reason;
    }
  }

  /**
   * On an auto-merge failure, automatically spawn a rebase/conflict-resolution session instead of
   * leaving the card in "failed" for a manual trigger. Bounded by AUTO_MERGE_RESOLVE_MAX (counted
   * from AUTO_MERGE_RESOLVE_EVENT) so a resolution session that itself reaches a failing merge can't
   * loop forever — past the budget the caller falls through to the normal failed landing.
   *
   * Returns true once it has taken over the card (slot released, resolution session launched); the
   * caller must then stop and NOT mark the ticket failed. Returns false to defer to the failed path —
   * either the budget is spent, or no slot could be claimed for the resolution session.
   */
  private async tryAutoResolveMerge(ticket: Ticket, slotId: number, prUrl: string, reason: string): Promise<boolean> {
    if (this.store.getAutoMergeResolveCount(ticket.id) >= AUTO_MERGE_RESOLVE_MAX) return false;
    // resolveMergeConflicts reads branch + prUrl from the store and grabs a free slot, so persist the
    // PR URL and free the current slot first (the just-freed slot is the one it reuses, when nothing
    // else stole it during releaseSlot's async cleanup).
    this.store.updateTicket(ticket.id, { prUrl });
    await this.releaseSlot(slotId, ticket);
    const launched = await this.resolveMergeConflicts(ticket.id);
    if (!launched) {
      // No slot was available for the resolution session: defer to the caller's failed landing. The
      // budget event is NOT logged, so a later retry (manual or once a slot frees) still has its turn.
      // pumpQueue is the caller's responsibility on the failed path.
      return false;
    }
    this.store.logEvent(ticket.id, AUTO_MERGE_RESOLVE_EVENT, { reason });
    log.info("auto-merge échoué — résolution de conflits automatique lancée", { ticketId: ticket.id, reason });
    await this.notifier.notify("Auto-merge en conflit", `${ticket.title} → rebase automatique en cours`, ticket.id);
    // The resolution session already holds its slot (claimed synchronously inside resolveMergeConflicts);
    // the caller skips its own pumpQueue on this early-return path, so wake any other queued ticket here.
    this.pumpQueue();
    return true;
  }

  /**
   * Stealth ready_for_review: verify the branch is committed + pushed (no PR), then kill the agent
   * session but KEEP the slot busy and the worktree on disk so the user can test locally. The card
   * lands in "À review" while still owning its slot (queued tickets won't grab it). No PR is created.
   */
  async markReadyForReview(ticketId: string, slotId: number): Promise<{ ok: boolean; reason: string }> {
    const ticket = this.store.getTicket(ticketId);
    if (!ticket || !ticket.branch) return { ok: false, reason: "ticket ou branche introuvable" };
    if (this.implementationPlanBlocksDelivery(ticketId)) return { ok: false, reason: UNRESOLVED_IMPLEMENTATION_DELIVERY_REASON };
    const path = slotPath(slotId);

    log.info("vérification de la gate ready_for_review", { ticketId, slotId, branch: ticket.branch });
    const dependencyGate = await this.verifyDependencyDelivery(ticket, path);
    const gate = dependencyGate.ok ? await this.system.verifyStealthReady(path, ticket.branch) : dependencyGate;
    if (!gate.ok) {
      // Mirror finishTicket's gate-failure handling exactly (uses the same done_gate event/counter).
      this.store.logEvent(ticketId, DONE_GATE_FAILED_EVENT, { reason: gate.reason });
      const consecutiveFailures = this.store.countTrailingEvents(ticketId, DONE_GATE_FAILED_EVENT, DONE_GATE_MAX_FAILURES);
      const retriable = this.sessionHub.isConnected(ticketId) && consecutiveFailures < DONE_GATE_MAX_FAILURES;
      if (retriable) {
        this.touch(this.store.updateTicket(ticketId, { stage: "opening_pr", error: null }));
        log.info("gate ready_for_review échouée — l'agent corrige et réessaie", { ticketId, reason: gate.reason, consecutiveFailures });
        return { ok: false, reason: gate.reason };
      }
      log.warn("gate ready_for_review échouée (épuisée)", { ticketId, reason: gate.reason, consecutiveFailures });
      await this.lifecycle.stall(
        ticketId,
        { title: "Gate ready_for_review échouée", body: `${ticket.title}: ${gate.reason}` },
        { error: gate.reason, errorDetails: this.lifecycle.errorDetailsFor(ticketId, gate.reason, "done_gate") },
      );
      return { ok: false, reason: gate.reason };
    }

    await this.recordDeliveryQuality(ticketId);
    if (this.implementationPlanBlocksDelivery(ticketId)) return { ok: false, reason: UNRESOLVED_IMPLEMENTATION_DELIVERY_REASON };
    // Stop the agent session but KEEP the slot busy and the worktree (do NOT releaseSlot): the card
    // still owns its slot so the user can test locally and queued tickets won't grab it.
    this.sessionHub.disconnect(ticketId, "completed");
    this.store.updateSlot(slotId, { tmuxSession: null, status: "busy" });
    this.touch(
      this.store.updateTicket(ticketId, {
        column: "to_review",
        stage: "done",
        error: null,
      }),
    );
    this.store.logEvent(ticketId, "ready_for_review", {});
    this.hub.pushSlots(this.store.listSlots());
    log.info("prêt pour review : session arrêtée, worktree conservé", { ticketId, slotId });
    await this.notifier.notify("Prêt pour review", `${ticket.title} → à tester localement`, ticket.id);
    // Slot stays occupied: no pumpQueue.
    return { ok: true, reason: "" };
  }

  /**
   * Direct-push done: verify the worktree's commits were pushed onto the base branch (no PR), then
   * release the slot and land the card in "Fini" (done). Unlike stealth (markReadyForReview) which
   * keeps the slot busy in "À review", this closes the worktree immediately. No PR is created.
   */
  async markDirectPushDone(ticketId: string, slotId: number): Promise<{ ok: boolean; reason: string }> {
    const ticket = this.store.getTicket(ticketId);
    if (!ticket || !ticket.branch || !isProjectKey(ticket.project)) {
      return { ok: false, reason: "ticket, branche ou projet introuvable" };
    }
    if (this.implementationPlanBlocksDelivery(ticketId)) return { ok: false, reason: UNRESOLVED_IMPLEMENTATION_DELIVERY_REASON };
    const path = slotPath(slotId);
    const quality = await this.recordDeliveryQuality(ticketId);
    if (quality?.enabled && !quality.complete) {
      return { ok: false, reason: `Validation qualité incomplète : ${quality.reservations.join(" ; ")}` };
    }
    const dependencyGate = await this.verifyDependencyDelivery(ticket, path);
    const baseBranch = dependencyGate.ok ? resolvePrTargetBaseBranch(ticket, getProject(ticket.project), this.store) : "";
    log.info("vérification de la gate push direct", { ticketId, slotId, baseBranch });
    const gate = dependencyGate.ok ? await this.system.verifyDirectPushed(path, baseBranch) : dependencyGate;
    if (!gate.ok) {
      // Mirror markReadyForReview's gate-failure handling exactly (same DONE_GATE_FAILED_EVENT counter).
      this.store.logEvent(ticketId, DONE_GATE_FAILED_EVENT, { reason: gate.reason });
      const consecutiveFailures = this.store.countTrailingEvents(ticketId, DONE_GATE_FAILED_EVENT, DONE_GATE_MAX_FAILURES);
      const retriable = this.sessionHub.isConnected(ticketId) && consecutiveFailures < DONE_GATE_MAX_FAILURES;
      if (retriable) {
        this.touch(this.store.updateTicket(ticketId, { stage: "opening_pr", error: null }));
        log.info("gate push direct échouée — l'agent corrige et réessaie", { ticketId, reason: gate.reason, consecutiveFailures });
        return { ok: false, reason: gate.reason };
      }
      log.warn("gate push direct échouée (épuisée)", { ticketId, reason: gate.reason, consecutiveFailures });
      await this.lifecycle.stall(
        ticketId,
        { title: "Gate push direct échouée", body: `${ticket.title}: ${gate.reason}` },
        { error: gate.reason, errorDetails: this.lifecycle.errorDetailsFor(ticketId, gate.reason, "done_gate") },
      );
      return { ok: false, reason: gate.reason };
    }
    if (this.implementationPlanBlocksDelivery(ticketId)) return { ok: false, reason: UNRESOLVED_IMPLEMENTATION_DELIVERY_REASON };
    await this.releaseSlot(slotId, ticket, "completed");
    this.touch(
      this.store.updateTicket(ticketId, {
        column: "done",
        stage: "done",
        slotId: null,
        error: null,
        finishedAt: Date.now(),
      }),
    );
    this.store.logEvent(ticketId, "done", {});
    this.store.logEvent(ticketId, "direct_pushed", { baseBranch });
    log.info("push direct terminé, slot libéré", { ticketId, slotId, baseBranch });
    await this.notifier.notify("Ticket terminé", `${ticket.title} → poussé sur ${baseBranch}`, ticket.id, true);
    void this.startDependents(ticketId).catch((error: unknown) => {
      log.error("libération des tickets dépendants échouée", { ticketId, error: getErrorMessage(error) });
    });
    this.pumpQueue();
    return { ok: true, reason: "" };
  }

  /**
   * User clicked "Créer la PR" on an "À review" stealth card: open the PR from the pushed branch,
   * release the slot, and land the card in "Fini" (done). On failure, surface the error on the card
   * and keep the slot so the user can retry.
   */
  async createStealthPr(ticketId: string): Promise<{ ok: boolean; reason: string; prUrl: string | null }> {
    const ticket = this.store.getTicket(ticketId);
    if (
      !ticket ||
      ticket.column !== "to_review" ||
      !ticket.stealth ||
      ticket.slotId === null ||
      ticket.branch === null ||
      !isProjectKey(ticket.project)
    ) {
      return { ok: false, reason: "création de PR réservée aux tickets stealth en colonne À review", prUrl: null };
    }
    if (this.implementationPlanBlocksDelivery(ticketId)) return { ok: false, reason: UNRESOLVED_IMPLEMENTATION_DELIVERY_REASON, prUrl: null };
    // Re-entrancy guard: two concurrent "Créer la PR" clicks would both pass the column check and open
    // two PRs (the column only flips to "done" AFTER createPr's awaits). Mark the in-flight stage
    // synchronously (before the first await) so a second call observes "opening_pr" and bails.
    if (ticket.stage === "opening_pr") {
      return { ok: false, reason: "création de PR déjà en cours", prUrl: null };
    }
    this.touch(this.store.updateTicket(ticketId, { stage: "opening_pr", error: null }));
    const dependencyGate = await this.verifyDependencyDelivery(ticket, slotPath(ticket.slotId));
    if (!dependencyGate.ok) {
      this.store.logEvent(ticketId, DONE_GATE_FAILED_EVENT, { reason: dependencyGate.reason });
      this.touch(this.store.updateTicket(ticketId, { stage: "done", error: dependencyGate.reason }));
      return { ...dependencyGate, prUrl: null };
    }
    const baseBranch = resolvePrTargetBaseBranch(ticket, getProject(ticket.project), this.store);
    const provider = getProject(ticket.project).vcsProvider;
    const quality = await this.recordDeliveryQuality(ticketId);
    const draft = ticket.prDraft || Boolean(quality?.enabled && !quality.complete);
    const content = ticket.stealthPrTitle && ticket.stealthPrBody ? { title: ticket.stealthPrTitle, body: ticket.stealthPrBody } : {};
    const result = await this.system.createPr(slotPath(ticket.slotId), baseBranch, { draft, headBranch: ticket.branch, requireExistingBase: ticket.dependsOn !== null, ...content }, provider);
    if (!result.ok) {
      this.store.logEvent(ticketId, DONE_GATE_FAILED_EVENT, { reason: result.reason });
      // Roll the stage back to the resting "done" so the card stays in "À review" and a retry is allowed.
      this.touch(this.store.updateTicket(ticketId, { stage: "done", error: result.reason }));
      log.warn("création de PR stealth échouée", { ticketId, reason: result.reason });
      return { ok: false, reason: result.reason, prUrl: null };
    }
    // Capture the agent's work summary from the PR description before releasing the slot (gh cwd).
    const agentSummary = await this.system.fetchPrSummary(slotPath(ticket.slotId), result.url, provider);
    if (this.implementationPlanBlocksDelivery(ticketId)) return { ok: false, reason: UNRESOLVED_IMPLEMENTATION_DELIVERY_REASON, prUrl: result.url };
    await this.releaseSlot(ticket.slotId, ticket);
    this.touch(
      this.store.updateTicket(ticketId, {
        column: "done",
        stage: "done",
        prUrl: result.url,
        slotId: null,
        error: null,
        agentSummary,
        finishedAt: Date.now(),
      }),
    );
    this.store.logEvent(ticketId, "done", { prUrl: result.url });
    this.store.logEvent(ticketId, "stealth_pr_created", { prUrl: result.url });
    log.info("PR stealth créée, slot libéré", { ticketId, prUrl: result.url });
    await this.notifier.notify("PR créée", `${ticket.title} → PR ouverte`, ticket.id, true);
    void this.startDependents(ticketId).catch((error: unknown) => {
      log.error("libération des tickets dépendants échouée", { ticketId, error: getErrorMessage(error) });
    });
    this.pumpQueue();
    return { ok: true, reason: "", prUrl: result.url };
  }

  /**
   * Close an ask ticket once the agent submitted its answer: no gate to verify (the answer is
   * already persisted as a comment by the coordinator), so just release the slot and land the card
   * in the "Répondu" column.
   */
  async completeAsk(ticketId: string, slotId: number): Promise<void> {
    const ticket = this.store.getTicket(ticketId);
    if (!ticket) return;
    // Ownership guard (the ask path has no done()-style gate): a stale/double submit_answer carries
    // the slotId baked at the worker hello. If that slot was already freed and handed to another
    // ticket by pumpQueue, releasing it here would tear down the victim's worktree — so only release
    // a slot we still own. This also makes the close idempotent (a second call finds slot.ticketId null).
    const slot = this.store.getSlot(slotId);
    if (slot?.ticketId !== ticketId) return;
    await this.releaseSlot(slotId, ticket, "completed");
    this.touch(
      this.store.updateTicket(ticketId, {
        column: "answered",
        stage: "done",
        slotId: null,
        finishedAt: Date.now(),
      }),
    );
    this.store.logEvent(ticketId, "answered", {});
    log.info("question répondue, slot libéré", { ticketId, slotId });
    await this.notifier.notify("Question répondue", ticket.title, ticket.id);
    this.pumpQueue();
  }

  /** Notification line summarizing how the PR ended (reviewed / cleaned / draft / open / merged / merge failed). */
  private doneNotifyBody(ticket: Ticket, mergeError: string | null): string {
    // Review and clean tickets never open a new PR — they act on an existing one.
    if (ticket.kind === "review") return `${ticket.title} → revue terminée`;
    if (ticket.kind === "clean") return `${ticket.title} → retours traités`;
    if (ticket.autoMerge) {
      return mergeError
        ? `${ticket.title} → PR ouverte mais auto-merge échoué`
        : `${ticket.title} → PR mergée automatiquement`;
    }
    return `${ticket.title} → PR ${ticket.prDraft ? "draft " : ""}ouverte`;
  }

  /**
   * Best-effort release used by abandon and test-session stop. `releaseSlot` throws when the ticket
   * no longer holds the slot, so the ownership check is mandatory here: pumpQueue may have freed the
   * slot and handed it to another ticket, and releasing it then would tear down the victim's worktree.
   */
  private async releaseSlotIfOwned(ticket: Ticket, slotId: number): Promise<void> {
    if (this.store.getSlot(slotId)?.ticketId === ticket.id) {
      await this.releaseSlot(slotId, ticket);
      return;
    }
    log.warn("slot déjà réattribué, libération ignorée", { ticketId: ticket.id, slotId });
  }

  /** Cleanup agent session + tmux shell + worktree + local branch. Called on done and on abandon. */
  async releaseSlot(
    slotId: number,
    ticket: Ticket,
    executionStatus: "completed" | "failed" | "cancelled" = "cancelled",
  ): Promise<void> {
    const slot = this.store.getSlot(slotId);
    if (slot?.ticketId !== ticket.id) {
      throw new Error(`releaseSlot: le slot ${slotId} n'appartient plus au ticket ${ticket.id}`);
    }
    const current = this.store.getTicket(ticket.id);
    if (current?.autonomous && (current.autonomousState?.hostMutation || this.autonomousDeliveries.has(ticket.id) && current.autonomousState?.phase !== "completed")) throw new Error("The autonomous worktree is reserved until its host operation is reconciled.");
    if (current?.autonomousState?.execution) {
      if (current.autonomousState.phase !== "completed") throw new Error("The partial autonomous worktree is retained for explicit recovery.");
      if (!await this.closeAutonomousWork(ticket.id)) throw new Error("Writer closure is unconfirmed. The autonomous worktree is retained.");
    }
    this.clearPhase(ticket.id);
    // Stop the in-process SDK session (no-op for a test/worktree shell slot); kill any tmux shell.
    this.sessionHub.disconnect(ticket.id, executionStatus);
    await this.delegationDrain?.(ticket.id);
    if (slot?.tmuxSession) await this.system.killSession(slot.tmuxSession);
    if (!isProjectKey(ticket.project)) return;
    const project = getProject(ticket.project);
    // A test session may have spun up project infrastructure (e.g. docker compose) in the worktree.
    // Tear it down before the worktree is removed; best-effort (never throws) so removal proceeds.
    if (ticket.testing) {
      await this.runWorktreeTeardown(project, slotId, ticket.branch ?? "", ticket.baseBranch ?? project.baseBranch);
    }
    await this.repoMutex.run(project.repoPath, async () => {
      await this.system.worktreeRemove(project.repoPath, slotPath(slotId));
      if (ticket.branch) await this.system.deleteLocalBranch(project.repoPath, ticket.branch);
    });
    this.store.updateSlot(slotId, { ticketId: null, repoPath: null, tmuxSession: null, status: "free" });
    this.hub.pushSlots(this.store.listSlots());
  }

  async abandonTicket(ticketId: string): Promise<void> {
    const queuedIndex = this.queue.indexOf(ticketId);
    if (queuedIndex !== -1) this.queue.splice(queuedIndex, 1);
    this.deferredDependents.delete(ticketId);
    const bounded = this.store.getTicket(ticketId)?.autonomousState?.execution;
    if (bounded) {
      this.store.cancelAutonomousExecution(ticketId);
      const results = await Promise.allSettled([this.qualityCancel?.(ticketId), this.closeAutonomousWork(ticketId)]);
      const current = this.store.getTicket(ticketId);
      if (!current) return;
      const diagnostic = results.find((result) => result.status === "rejected");
      this.touch(this.store.updateTicket(ticketId, { column: "abandoned", stage: null, autoMerge: false,
        error: diagnostic?.status === "rejected" ? getErrorMessage(diagnostic.reason) : "Exécution arrêtée par l’utilisateur ; les travaux sont conservés pour récupération.",
        finishedAt: Date.now(),
      }));
      if (current.slotId !== null && this.store.getSlot(current.slotId)?.ticketId === ticketId) this.store.updateSlot(current.slotId, { status: "interrupted" });
      this.store.logEvent(ticketId, "abandoned", { retained: true });
      this.hub.pushSlots(this.store.listSlots());
      return;
    }
    if (this.store.getTicket(ticketId)?.autonomous) await this.waitForAutonomousDelivery(ticketId);
    const ticket = this.store.getTicket(ticketId);
    if (!ticket) return;
    if (ticket.autonomous && ticket.autonomousState?.deliveryConfirmation && ticket.autonomousState.phase !== "completed") throw new Error("The chosen autonomous delivery is already confirmed. Finish its retained preview cleanup before abandoning the card.");
    await this.qualityCancel?.(ticketId);
    const iteration = this.store.getActiveQualityIteration(ticketId);
    if (iteration) this.store.updateQualityIteration(iteration.id, { status: "cancelled", diagnostic: "Itération annulée par abandon de la carte.", completedAt: Date.now() });
    if (ticket.slotId !== null) await this.releaseSlotIfOwned(ticket, ticket.slotId);
    this.touch(
      this.store.updateTicket(ticketId, {
        column: "abandoned",
        stage: null,
        slotId: null,
        resolvingConflicts: false,
        finishedAt: Date.now(),
      }),
    );
    this.store.logEvent(ticketId, "abandoned", {});
    log.info("ticket abandonné", { ticketId });
    this.pumpQueue();
  }

  async markMerged(ticketId: string, expected?: Ticket): Promise<Ticket> {
    const ticket = this.store.getTicket(ticketId);
    if (!ticket) throw new Error(`markMerged: ticket ${ticketId} introuvable`);
    const identity = expected ?? ticket;
    if (!matchesTicketDelivery(ticket, identity)) throw new Error("Le parent a changé pendant la vérification de sa PR.");
    if (ticket.column === "merged") return ticket;
    if (expected && ticket.column !== "done") throw new Error("Le parent a changé pendant la vérification de sa PR.");
    if (!expected && ticket.prUrl && isProjectKey(ticket.project)) await this.recordMergedDelivery(ticketId, getProject(ticket.project).repoPath, ticket.prUrl);
    if (ticket.slotId !== null) await this.releaseSlotIfOwned(ticket, ticket.slotId);
    const current = this.store.getTicket(ticketId);
    if (!matchesTicketDelivery(current, identity)) throw new Error("Le parent a changé pendant la vérification de sa PR.");
    if (current.column === "merged") return current;
    if (current.column !== ticket.column) throw new Error("Le parent a changé pendant la vérification de sa PR.");
    const merged = this.lifecycle.markMerged(ticketId);
    this.dependencyReconciliation.refreshDependents(ticketId);
    if (ticket.slotId !== null) this.pumpQueue();
    return this.store.getTicket(ticketId) ?? merged;
  }

  private markFailed(ticketId: string, slotId: number, reason: string, error: unknown = reason, source: ErrorDetailsSource = "launch"): void {
    this.clearPhase(ticketId);
    const iteration = this.store.getActiveQualityIteration(ticketId);
    if (iteration?.mode === "correction") this.store.updateQualityIteration(iteration.id, { status: "failed", diagnostic: reason, completedAt: Date.now() });
    this.lifecycle.markLaunchFailed(ticketId, slotId, reason, error, source);
    log.error("ticket en échec", { ticketId, slotId, reason });
  }

  private touch(ticket: Ticket): void {
    this.hub.pushTicket(ticket);
  }

  /**
   * Stop every live agent session and tmux shell backing an occupied slot. Called on desktop app
   * shutdown so neither the in-process `claude` subprocesses nor the detached tmux server leak past
   * the window close.
   */
  async teardownSessions(): Promise<void> {
    this.watcher.stopAll();
    this.sessionHub.disconnectAll();
    await this.sessionHub.drainClosingSessions();
    for (const slot of this.store.listSlots()) {
      if (slot.tmuxSession) await this.system.killSession(slot.tmuxSession);
    }
  }

  // ---- Recovery on boot ----

  async recover(): Promise<void> {
    // Standalone worktree sessions are ephemeral: a backend restart ends them. Clean up any whose
    // tmux session died, freeing the slot for queued tickets.
    for (const session of this.store.listWorktreeSessions()) {
      if (!(await this.system.hasSession(session.sessionName))) {
        log.info("session worktree terminée à la reprise", { slotId: session.slotId });
        await this.cleanupWorktreeSession(session.slotId);
        continue;
      }
      // A session whose tmux survived the backend restart keeps running: re-arm its `.wt-offset`
      // watcher so live address pushes resume (the in-memory watcher map was lost with the restart).
      this.watcher.start(session.slotId);
    }
    for (const slot of this.store.listSlots()) {
      if (!slot.ticketId) continue;
      const ticketId = slot.ticketId;
      const recovered = this.store.getTicket(ticketId);
      if (!recovered) continue;
      const execution = recovered.autonomousState?.execution;
      if (execution && execution.closure.status !== "confirmed" && (execution.closure.status === "requested" || this.store.listExecutionRuns("ticket", ticketId).some((run) => run.status === "running"))) {
        const state = this.store.beginAutonomousFinalization(ticketId, "startup_writer_closure_unknown");
        if (state?.execution) this.touch(this.store.updateTicket(ticketId, { autonomousState: {
          ...state, execution: { ...state.execution, closure: { ...state.execution.closure, status: "unknown", confirmedAt: null, retention: "retained" } },
        } }));
        this.store.updateSlot(slot.id, { status: "interrupted" });
        continue;
      }
      if (recovered.autonomousState?.execution && (recovered.autonomousState.execution.workRevokedAt !== null || recovered.autonomousState.execution.closure.status === "unknown")) {
        this.store.updateSlot(slot.id, { status: "interrupted" });
        continue;
      }
      if (recovered.autonomous && recovered.slotId !== null && recovered.autonomousState?.phase !== "completed") {
        const autonomousError = autonomousOptionsError(recovered, projectVcsProvider(recovered.project));
        if (autonomousError && !this.isAutonomousDeliveryReconciliation(recovered)) {
          this.touch(this.store.updateTicket(ticketId, { stage: "interrupted", error: autonomousError }));
          this.store.updateSlot(slot.id, { status: "interrupted" });
          this.store.logEvent(ticketId, "autonomous_activation_blocked", { reason: autonomousError });
          continue;
        }
      }
      if (recovered.autonomous && recovered.autonomousState?.phase === "paused" && !this.isAutonomousDeliveryReconciliation(recovered)) {
        this.store.updateSlot(slot.id, { status: "interrupted" });
        continue;
      }
      const iteration = this.store.getActiveQualityIteration(ticketId);
      if (iteration?.mode === "correction" && iteration.status === "verifying") {
        this.store.updateQualityIteration(iteration.id, { status: "interrupted", diagnostic: "Vérification interrompue au redémarrage ; reprends la vérification explicitement.", completedAt: Date.now() });
        if (this.store.getImplementationPlan(ticketId)?.recovery) {
          this.touch(this.store.updateTicket(ticketId, { column: "failed", stage: "interrupted", autoMerge: false, error: "Vérification interrompue au redémarrage ; le worktree de récupération est conservé.", finishedAt: Date.now() }));
          this.store.updateSlot(slot.id, { status: "interrupted" });
          continue;
        }
        this.touch(this.store.updateTicket(ticketId, { column: "done", stage: "done", slotId: null, prUrl: recovered.prUrl, autoMerge: false, error: "Vérification interrompue au redémarrage.", finishedAt: Date.now() }));
        await this.cleanupTerminalSlot(slot.id, recovered, "failed", true);
        continue;
      }

      if (
        recovered.slotId === null
        && recovered.stage !== null
        && TERMINAL_STAGES.includes(recovered.stage)
      ) {
        await this.cleanupTerminalSlot(slot.id, recovered, recovered.stage === "failed" ? "failed" : "completed", true);
        continue;
      }

      // A test session is an ephemeral tmux shell on a "done" card: end it cleanly on restart.
      if (recovered.testing) {
        await this.releaseSlot(slot.id, recovered);
        this.touch(this.store.updateTicket(ticketId, { testing: false, slotId: null }));
        this.store.logEvent(ticketId, "test_session_stopped", { reason: "backend restart" });
        log.info("session de test terminée à la reprise", { ticketId, slotId: slot.id });
        continue;
      }

      // The agent's in-process SDK session died with the backend. Only a slot whose ticket was in an
      // active stage held a live session — a parked slot (to_review/interrupted/done/failed) is left
      // untouched. Under the cap, relaunch in place (keeps the worktree); otherwise interrupt + notify.
      const wasActive = this.isAutonomousDeliveryReconciliation(recovered) || (
        recovered.stage !== null &&
        (ACTIVE_STAGES.includes(recovered.stage) || recovered.stage === "awaiting_answers")
      );
      if (!wasActive) continue;
      if ((await this.tryAutoReclaim(ticketId, "session perdue au redémarrage")) !== "escalate") continue;

      const ticket = this.store.getTicket(ticketId);
      if (ticket) {
        this.touch(
          this.store.updateTicket(ticket.id, {
            stage: "interrupted",
            error: "session perdue au redémarrage",
            finishedAt: Date.now(),
          }),
        );
      }
      this.store.updateSlot(slot.id, { status: "interrupted" });
      this.store.logEvent(ticketId, "interrupted", {});
      log.warn("session perdue à la reprise", { ticketId, slotId: slot.id });
      void this.notifier.notify("Ticket interrompu", `${ticket?.title ?? ticketId}: session perdue au redémarrage`, ticketId);
    }
    for (const iteration of this.store.listActiveQualityIterations()) {
      if (iteration.mode !== "correction" || iteration.status !== "queued") continue;
      const ticket = this.store.getTicket(iteration.ticketId);
      if (!ticket || ticket.slotId !== null) continue;
      try {
        await this.startQualityCorrection(ticket.id, iteration.id);
      } catch (error) {
        this.store.updateQualityIteration(iteration.id, { status: "failed", diagnostic: getErrorMessage(error), completedAt: Date.now() });
        const currentTicket = this.store.getTicket(ticket.id);
        const unresolvedDelivery = currentTicket?.slotId !== null && hasUnresolvedImplementation(this.store.getImplementationPlan(ticket.id));
        this.touch(this.store.updateTicket(ticket.id, { column: unresolvedDelivery ? "failed" : "done", stage: unresolvedDelivery ? "failed" : "done", error: getErrorMessage(error), autoMerge: false, finishedAt: Date.now() }));
      }
    }
    this.hub.pushSlots(this.store.listSlots());
  }

  resumeQueuedTickets(now: number = Date.now()): { resumed: string[]; skipped: string[] } {
    const cutoff = now - QUEUED_RESUME_MAX_AGE_MS;
    const candidates = this.store.listTickets(false)
      .filter((ticket) =>
        ticket.column === "implementing"
        && ticket.stage === "queued"
        && ticket.slotId === null
        && !this.isTicketEngaged(ticket.id)
        && this.store.getActiveQualityIteration(ticket.id) === null)
      .sort((left, right) => (left.implementingStartedAt ?? 0) - (right.implementingStartedAt ?? 0));
    const resumed: string[] = [];
    const skipped: string[] = [];
    for (const ticket of candidates) {
      if (ticket.implementingStartedAt === null || ticket.implementingStartedAt < cutoff) {
        skipped.push(ticket.id);
        continue;
      }
      resumed.push(ticket.id);
      this.store.logEvent(ticket.id, QUEUED_RESUMED_EVENT, {});
      void this.startTicket(ticket.id).catch((error: unknown) => {
        log.error("reprise du ticket en file échouée", { ticketId: ticket.id, error: getErrorMessage(error) });
      });
    }
    if (resumed.length === 0 && skipped.length === 0) return { resumed, skipped };
    log.info("reprise de la file d'attente au démarrage", { resumed: resumed.length, skipped: skipped.length, skippedIds: skipped });
    if (resumed.length === 0) return { resumed, skipped };
    const skippedText = skipped.length === 0 ? "" : `, ${skipped.length} ignorée(s) (en file depuis plus de ${QUEUED_RESUME_MAX_AGE_DAYS} jours)`;
    void this.notifier.notify("File d'attente reprise", `${resumed.length} carte(s) relancée(s)${skippedText}`);
    return { resumed, skipped };
  }

  isTicketEngaged(ticketId: string): boolean {
    return this.queue.includes(ticketId)
      || this.isLaunching(ticketId)
      || this.sessionHub.isConnected(ticketId)
      || this.store.listSlots().some((slot) => slot.ticketId === ticketId);
  }

  /** Re-spawn an interrupted ticket in its slot (retry endpoint). */
  async retry(ticketId: string): Promise<void> {
    await this.reconcileDependencies(ticketId);
    const ticket = this.store.getTicket(ticketId);
    if (!ticket || ticket.column === "abandoned" || ticket.column === "merged") return;
    this.assertStartReady(ticket);
    if (this.store.getActiveQualityIteration(ticketId) || this.store.getLatestQualityIteration(ticketId)?.mode === "correction") throw new Error("Utilise Corriger et revérifier ou Reprendre la vérification pour cette carte.");
    try {
      if (await this.resumeAttachedFeatureWorktree(ticket)) return;
    } catch (error) {
      this.markWorktreeReuseFailed(ticket, getErrorMessage(error), error);
      return;
    }
    const cleanupSlot = this.store.listSlots().find((slot) =>
      slot.ticketId === ticketId
      && ticket.slotId === null
      && ticket.stage !== null
      && TERMINAL_STAGES.includes(ticket.stage));
    if (cleanupSlot) {
      await this.cleanupTerminalSlot(
        cleanupSlot.id,
        ticket,
        ticket.stage === "failed" ? "failed" : "completed",
        true,
      );
      return;
    }
    if (ticket.slotId !== null) {
      const slot = this.store.getSlot(ticket.slotId);
      if (slot && (slot.status === "interrupted" || slot.status === "failed" || slot.status === "stalled")) {
        await this.relaunchInPlace(ticket.slotId, ticketId);
        return;
      }
    }
    await this.startTicket(ticketId);
  }

  /** True while a (re)launch is mid-setup, when a concurrent spawn would race the in-flight one. */
  private isLaunching(ticketId: string): boolean {
    const phase = this.setupPhase.get(ticketId);
    return (
      phase === SETUP_PHASES.worktree ||
      phase === SETUP_PHASES.setup ||
      phase === SETUP_PHASES.deps ||
      phase === SETUP_PHASES.spawning
    );
  }

  /**
   * Force a full re-spawn in the ticket's current slot, regardless of slot status.
   * UI escape hatch for a stuck "implementing" card whose session started but never
   * received the contract; falls back to a fresh launch if no slot is held.
   * No-ops (returns false) while a launch is still in setup, to avoid a double spawn.
   */
  async relaunch(ticketId: string): Promise<boolean> {
    const ticket = this.store.getTicket(ticketId);
    if (!ticket) return false;
    if (this.store.getActiveQualityIteration(ticketId) || this.store.getLatestQualityIteration(ticketId)?.mode === "correction") return false;
    if (this.isLaunching(ticketId)) {
      log.warn("relance ignorée : lancement déjà en cours", { ticketId });
      return false;
    }
    try {
      if (!this.isAutonomousDeliveryReconciliation(ticket) && await this.resumeAttachedFeatureWorktree(ticket)) return true;
    } catch (error) {
      this.markWorktreeReuseFailed(ticket, getErrorMessage(error), error);
      return false;
    }
    if (ticket.slotId !== null) {
      await this.relaunchInPlace(ticket.slotId, ticketId);
      return true;
    }
    await this.startTicket(ticketId);
    return true;
  }

  async resumeImplementationRecovery(ticketId: string): Promise<boolean> {
    const ticket = this.store.getTicket(ticketId);
    const recovery = this.store.getImplementationPlan(ticketId)?.recovery;
    if (!ticket || ticket.kind !== "feature" || ticket.slotId === null || ticket.testing || ticket.stealth || ticket.directPush || ticket.resolvingConflicts || !recovery || recovery.slotId !== ticket.slotId || this.store.getSlot(ticket.slotId)?.ticketId !== ticketId) return false;
    if (recovery.status === "freezing" || recovery.status === "assessing" || this.isLaunching(ticketId)) return false;
    let iteration = this.store.getActiveQualityIteration(ticketId);
    if (iteration && (iteration.mode !== "correction" || iteration.status !== "correcting")) return false;
    const previous = this.store.getLatestQualityIteration(ticketId);
    if (!iteration && previous?.mode !== "correction") return this.relaunch(ticketId);
    await this.reconcileDependencies(ticketId);
    this.assertStartReady(this.store.getTicket(ticketId) ?? ticket);
    if (!iteration && previous?.mode === "correction" && previous.status !== "completed") {
      const sourceRunId = previous.resultRunId ?? previous.sourceRunId;
      const source = this.store.getQualityRun(sourceRunId);
      if (!source || source.ticketId !== ticketId || source.criteriaSnapshotId !== (previous.criteriaSnapshot?.id ?? null)) throw new Error("The retained correction source no longer matches its frozen criteria. Resume quality verification before implementation recovery.");
      if (ticket.prUrl !== previous.prUrl || ticket.branch !== previous.headBranch || ticket.title !== previous.originalTicket.title || ticket.description !== previous.originalTicket.description || ticket.prdMarkdown !== previous.originalTicket.prdMarkdown) throw new Error("The retained correction no longer matches its original pull request, branch or requirements. Resume quality verification before implementation recovery.");
      iteration = this.store.createQualityIteration({
        ticketId,
        sourceRunId,
        provider: previous.provider,
        mode: "correction",
        prUrl: previous.prUrl,
        headBranch: previous.headBranch,
        evidenceIds: previous.evidenceIds,
        ...(previous.trigger ? { trigger: previous.trigger } : {}),
        ...(sourceRunId === previous.sourceRunId ? { retryOfIterationId: previous.id } : {}),
      });
      if (iteration.status !== "queued" || (iteration.criteriaSnapshot?.id ?? null) !== (previous.criteriaSnapshot?.id ?? null)) throw new Error("The correction continuation cannot reuse this source safely. Resume quality verification before implementation recovery.");
      this.store.updateQualityIteration(iteration.id, { status: "correcting" });
    }
    await this.relaunchInPlace(ticket.slotId, ticketId);
    const currentTicket = this.store.getTicket(ticketId);
    const currentRecovery = this.store.getImplementationPlan(ticketId)?.recovery;
    return currentTicket?.slotId === ticket.slotId && this.store.getSlot(ticket.slotId)?.ticketId === ticketId && currentRecovery?.generation === recovery.generation && currentRecovery.slotId === ticket.slotId && this.sessionHub.isConnected(ticketId);
  }

  /**
   * Auto-reclaim a dead/stalled turn: relaunch in the held slot (preserves the worktree — never
   * falls back to a fresh worktree, so uncommitted work is safe), bounded by AUTO_RECLAIM_MAX.
   *
   * The cap check, the launch claim (setPhase) and the AUTO_RECLAIM_EVENT log all run
   * synchronously before the first await. `onStop` is fire-and-forget and can be re-entered by a
   * concurrent stop frame (WS stop + HTTP stop-hook); claiming synchronously makes that second
   * entrant observe both `isLaunching` and the incremented count, so the cap can't be exceeded and
   * the session can't be double-spawned.
   */
  async tryAutoReclaim(ticketId: string, reason: string): Promise<ReclaimOutcome> {
    const ticket = this.store.getTicket(ticketId);
    if (!ticket || ticket.slotId === null) return "ignore";
    if (ticket.autonomousState?.execution?.workRevokedAt !== null && ticket.autonomousState?.execution) return "ignore";
    if (this.store.getActiveQualityIteration(ticketId)?.status === "verifying") return "ignore";
    // A test session is ephemeral and lives on a "done" card: never resurrect it as a pipeline run.
    if (ticket.testing) return "ignore";
    if (this.isLaunching(ticketId)) {
      log.warn("auto-reclaim ignoré : lancement déjà en cours", { ticketId });
      return "ignore";
    }
    const reclaims = this.store.getReclaimCount(ticketId);
    if (reclaims >= AUTO_RECLAIM_MAX) {
      if (ticket.autonomousState?.execution) {
        this.store.beginAutonomousFinalization(ticketId, reason);
        return "ignore";
      }
      this.interruptQualityCorrection(ticketId, reason);
      return "escalate";
    }

    this.setPhase(ticketId, SETUP_PHASES.spawning);
    this.store.logEvent(ticketId, AUTO_RECLAIM_EVENT, { attempt: reclaims + 1, reason });
    log.warn("auto-reclaim", { ticketId, slotId: ticket.slotId, attempt: reclaims + 1, reason });
    try {
      await this.relaunchInPlace(ticket.slotId, ticketId);
    } catch (error) {
      this.clearPhase(ticketId);
      if (this.store.getTicket(ticketId)?.autonomousState?.execution) {
        this.store.beginAutonomousFinalization(ticketId, getErrorMessage(error));
        return "ignore";
      }
      this.interruptQualityCorrection(ticketId, getErrorMessage(error));
      log.error("auto-reclaim échoué", { ticketId, error: getErrorMessage(error) });
      return "escalate";
    }
    return "reclaimed";
  }

  private interruptQualityCorrection(ticketId: string, reason: string): void {
    const iteration = this.store.getActiveQualityIteration(ticketId);
    if (iteration?.mode === "correction") this.store.updateQualityIteration(iteration.id, { status: "interrupted", diagnostic: reason, completedAt: Date.now() });
  }

  private async relaunchInPlace(slotId: number, ticketId: string): Promise<void> {
    await this.reconcileDependencies(ticketId);
    const storedTicket = this.store.getTicket(ticketId);
    if (!storedTicket || !isProjectKey(storedTicket.project) || storedTicket.column === "abandoned" || storedTicket.column === "merged") return;
    this.assertStartReady(storedTicket);
    if (storedTicket.dependencyLaunch) resolvePrTargetBaseBranch(storedTicket, getProject(storedTicket.project), this.store);
    const executionGuard = createAutonomousSessionGuard(this.store, ticketId, "retry");
    if (executionGuard) {
      this.store.assertAutonomousWork(ticketId);
      if (!await this.closeAutonomousWork(ticketId)) throw new Error("The previous autonomous sessions have not confirmed closure.");
      executionGuard.beforeStart();
      this.autonomousWorkflow?.startExecution?.(ticketId);
    }
    const autonomousError = autonomousOptionsError(storedTicket, projectVcsProvider(storedTicket.project));
    if (autonomousError && !this.isAutonomousDeliveryReconciliation(storedTicket)) throw new Error(autonomousError);
    // A test session must never be relaunched with a pipeline contract; the user stops it manually.
    if (storedTicket.testing) return;
    if (!(await this.system.worktreeExists(slotPath(slotId)))) throw new Error(`Le worktree du slot ${slotId} n'existe pas : abandonne la carte puis recrée-la pour repartir d'un lancement complet.`);
    const recoveryGeneration = this.store.getImplementationPlan(ticketId)?.recovery?.generation;
    const previous = this.store.listExecutionRuns("ticket", ticketId)
      .findLast((run) => run.role === "orchestrator");
    const previousModel = codexModelSchema.safeParse(previous?.effectiveModel);
    const previousEffort = codexEffortSchema.safeParse(previous?.effectiveEffort);
    const previousClaudeModel = agentModelSchema.safeParse(previous?.effectiveModel);
    const previousClaudeEffort = agentEffortSchema.safeParse(previous?.effectiveEffort);
    const previousDelegateModel = codexModelSchema.safeParse(previous?.delegateEffectiveModel);
    const previousDelegateEffort = codexEffortSchema.safeParse(previous?.delegateEffectiveEffort);
    const providerTicket = previous
      ? {
          ...storedTicket,
          orchestrator: previous.orchestrator,
          ...(previous.delegateProvider ? { implementer: previous.delegateProvider } : {}),
        }
      : storedTicket;
    const resumedTicket = previous?.delegateProvider === "codex" && previousDelegateModel.success && previousDelegateEffort.success
      ? {
          ...providerTicket,
          codexImplementerModel: previousDelegateModel.data,
          codexImplementerEffort: previousDelegateEffort.data,
          codexImplementerFast: previous.delegateCodexFast,
        }
      : providerTicket;
    const parentTicket = resumedTicket.orchestrator === "codex" && previous && previousModel.success && previousEffort.success
      ? {
          ...resumedTicket,
          codexModel: previousModel.data,
          codexEffort: previousEffort.data,
          codexFast: previous.codexFast,
        }
      : resumedTicket;
    const ticket = parentTicket.orchestrator === "claude" && previousClaudeModel.success && previousClaudeEffort.success
      ? { ...parentTicket, model: previousClaudeModel.data, effort: previousClaudeEffort.data }
      : parentTicket;
    const restoredStage = recoveryStage(ticket, this.store);
    const path = slotPath(slotId);
    const iteration = this.store.getActiveQualityIteration(ticketId);
    if (iteration?.mode === "correction") {
      await this.assertQualityIterationPr(ticket, iteration);
      const project = getProject(ticket.project);
      const revision = await this.system.captureValidationRevision({ repoPath: project.repoPath, sourcePath: path, ...(ticket.branch ? { branch: ticket.branch } : {}) });
      if (!iteration.prUrl) throw new Error("La PR de correction n'est plus disponible.");
      const head = await this.system.readReviewHead(project.repoPath, iteration.prUrl, project.vcsProvider);
      if (!head.ok || head.commitSha !== iteration.sourceRevision && head.commitSha !== revision.commitSha) throw new Error("La PR a changé indépendamment des corrections conservées ; reprends la vérification avant de continuer.");
    }
    log.info("relance en place", { ticketId, slotId });

    const executionTicket = this.qualityCorrectionTicket(ticket);
    const execution = resolveTicketExecution(executionTicket, "orchestrator", {
      model: MODELS.implement,
      effort: MODELS.implementEffort,
    });
    await assertExecutionAvailable(this.system, execution);
    await assertCodexImplementerAvailable(this.system, executionTicket, execution);

    // Drop any live/stale SDK session before starting the fresh one (the worktree is preserved).
    if (!executionGuard) {
      this.sessionHub.disconnect(ticketId);
      await this.delegationDrain?.(ticketId);
    }
    executionGuard?.assertAllowed();
    const recoveryContext = buildRecoveryContext(ticket, this.store, restoredStage, { commentsInContract: this.contractCarriesComments(ticket) });
    if (iteration?.mode === "correction" && this.store.getActiveQualityIteration(ticketId)?.id !== iteration.id) throw new Error("Correction qualité annulée pendant la reprise.");
    const currentTicket = this.store.getTicket(ticketId);
    if (!currentTicket || currentTicket.testing || currentTicket.archived || currentTicket.column === "abandoned" || currentTicket.slotId !== slotId || this.store.getSlot(slotId)?.ticketId !== ticketId
      || currentTicket.branch !== ticket.branch || currentTicket.project !== ticket.project || (recoveryGeneration && this.store.getImplementationPlan(ticketId)?.recovery?.generation !== recoveryGeneration)) throw new Error("Le propriétaire du worktree a changé pendant la reprise.");
    this.setPhase(ticketId, SETUP_PHASES.spawning);
    this.startAgentSession(ticket, slotId, path, { resume: true, ...(executionGuard ? { executionGuard } : {}) });
    this.setPhase(ticketId, SETUP_PHASES.waiting);
    this.store.updateSlot(slotId, { status: "busy", tmuxSession: null });
    this.store.logEvent(ticketId, "session_spawned", { slotId });
    this.touch(
      this.store.updateTicket(ticketId, {
        column: "implementing",
        stage: restoredStage,
        error: null,
        finishedAt: null,
        lastProgressAt: Date.now(),
      }),
    );
    this.hub.pushSlots(this.store.listSlots());
    this.deliverContract(ticket);
    const delivered = this.sessionHub.sendEvent(ticketId, { type: "nudge", message: recoveryContext });
    this.store.logEvent(ticketId, "recovery_context_delivered", { provider: execution.provider, stage: restoredStage, delivered, resumedThread: execution.provider === "codex" && ticket.sessionId !== null });
    const recoveredTicket = this.store.getTicket(ticketId);
    if (recoveredTicket !== null && !this.isAutonomousDeliveryReconciliation(recoveredTicket)) await this.implementationPlanResume?.(recoveredTicket, slotId);
  }
}
