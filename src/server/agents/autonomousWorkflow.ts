import { createHash } from "node:crypto";
import { join } from "node:path";

import { AUTONOMOUS_DEFAULT_MAX_CORRECTIONS, AUTONOMOUS_DEFAULT_TIMEOUT_MINUTES, autonomousPlanInputSchema } from "../../shared/autonomous.ts";
import type { AutonomousPlanInput, AutonomousState } from "../../shared/autonomous.ts";
import { getErrorMessage } from "../../shared/errors.ts";
import { latestAcceptanceSnapshot, latestFunctionalSnapshot } from "../../shared/quality.ts";
import type { QualityValidationRun } from "../../shared/quality.ts";
import type { Ticket } from "../../shared/schemas.ts";
import { getProject, SLOTS_ROOT } from "../config.ts";
import type { Store } from "../db/store.ts";
import { KeyedMutex } from "../mutex.ts";
import type { PreviewManager } from "../previewManager.ts";
import type { SystemAdapter } from "../system/types.ts";

import type { QualityManager } from "./qualityManager.ts";

const MINUTE_MS = 60_000;
const POLL_MS = 250;
const DELIVERY_CLEANUP_TIMEOUT_MS = 120_000;
const TIMEOUT_MESSAGE = "The autonomous execution deadline has expired. The implementation worktree is retained.";
const READY_MESSAGE = "Les vérifications locales et tous les cas E2E de la preview Coolify ont accepté le même commit. Appelle deliver_autonomous avec le titre et le corps de la PR. Le serveur appliquera le choix de livraison enregistré. Ne crée ni ne fusionne de PR avec une commande externe.";

export interface AutonomousWorkflowDependencies {
  store: Store;
  system: SystemAdapter;
  quality: QualityManager;
  preview: PreviewManager;
  waitForDelivery: (ticketId: string) => Promise<void>;
  acknowledgeDeliveryStop: (ticketId: string) => void;
  inject: (ticketId: string, prompt: string) => Promise<void>;
  onChange?: (ticketId: string) => void;
}

function fingerprint(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function sourceFingerprint(ticket: Ticket): string {
  return fingerprint([ticket.title, ticket.description, ticket.prdMarkdown]);
}

export class AutonomousWorkflow {
  private readonly starts = new KeyedMutex();
  private readonly active = new Map<string, Promise<void>>();
  private readonly deadlines = new Map<string, ReturnType<typeof setTimeout>>();
  private shuttingDown = false;

  constructor(private readonly deps: AutonomousWorkflowDependencies) {}

  async submitPlan(ticketId: string, input: AutonomousPlanInput): Promise<void> {
    await this.starts.run(ticketId, async () => {
      const ticket = this.ticket(ticketId);
      const plan = autonomousPlanInputSchema.parse(input);
      if (ticket.autonomousState?.plan) {
        if (ticket.autonomousState.planFingerprint !== fingerprint(plan)) throw new Error("The initial autonomous plan is frozen and cannot be replaced.");
        this.requireFrozen(ticket);
        return;
      }
      if (ticket.prUrl || ticket.directPush || ticket.stealth || ticket.childOrder !== null || !ticket.autonomousDelivery) throw new Error("Autonomous execution requires an explicit delivery choice and an unsplit feature without direct push, stealth or an existing PR.");
      try {
        await this.deps.preview.autonomousPreflight(ticketId);
      } catch (error) {
        const startedAt = ticket.autonomousState?.startedAt ?? Date.now();
        const deadlineAt = ticket.autonomousState?.deadlineAt ?? startedAt + (ticket.autonomousTimeoutMinutes ?? AUTONOMOUS_DEFAULT_TIMEOUT_MINUTES) * MINUTE_MS;
        this.persist(ticketId, {
          phase: "paused", plan: null, sourceFingerprint: null, configFingerprint: null, planFingerprint: null, deliveryConfirmation: null, hostMutation: null,
          acceptanceSnapshotId: null, functionalSnapshotId: null, revision: null, fullRunId: null, previewRunId: null, previewId: null,
          startedAt, deadlineAt, corrections: ticket.autonomousState?.corrections ?? 0, error: this.deps.preview.redactError(getErrorMessage(error)),
        });
        this.deps.store.updateTicket(ticketId, { stage: "stalled" });
        this.deps.onChange?.(ticketId);
        throw error;
      }
      const quality = this.deps.quality.get(ticketId);
      if (quality.runs.length > 0) throw new Error("Freeze the initial plan before running validation or implementing the feature.");
      const source = sourceFingerprint(ticket);
      const acceptance = this.deps.store.createQualityCriteriaSnapshot(ticketId, { criteria: plan.criteria, mode: "repository", sourceFingerprint: source, createdBy: "agent" });
      const functional = this.deps.store.createQualityCriteriaSnapshot(ticketId, { criteria: plan.criteria.map((criterion) => ({ ...criterion, covers: [criterion.id] })), mode: "browser", purpose: "functional", baseSnapshotId: acceptance.id, sourceFingerprint: source, createdBy: "agent" });
      const startedAt = ticket.autonomousState?.startedAt ?? Date.now();
      const state: AutonomousState = {
        phase: "planning", plan, sourceFingerprint: source, configFingerprint: this.configFingerprint(ticket), planFingerprint: fingerprint(plan), deliveryConfirmation: null, hostMutation: null,
        acceptanceSnapshotId: acceptance.id, functionalSnapshotId: functional.id, revision: null, fullRunId: null, previewRunId: null, previewId: null,
        startedAt, deadlineAt: ticket.autonomousState?.deadlineAt ?? startedAt + (ticket.autonomousTimeoutMinutes ?? AUTONOMOUS_DEFAULT_TIMEOUT_MINUTES) * MINUTE_MS, corrections: ticket.autonomousState?.corrections ?? 0, error: null,
      };
      this.persist(ticketId, state);
      this.armDeadline(ticketId, state);
    });
  }

  async validate(ticketId: string): Promise<{ status: "pending" | "ready" | "paused" }> {
    return this.starts.run(ticketId, async () => {
      const ticket = this.ticket(ticketId);
      this.requireFrozen(ticket);
      if (this.shuttingDown) throw new Error("Autonomous validation is shutting down.");
      if (this.active.has(ticketId)) return { status: "pending" };
      let state = this.state(ticket);
      if (state.phase === "ready" || state.phase === "delivering") {
        if (!state.revision) throw new Error("The autonomous revision is missing.");
        if (state.deliveryConfirmation) {
          await this.assertDelivery(ticketId, state.revision);
          return { status: "ready" };
        }
        const currentRevision = await this.requireRevision(ticket);
        if (currentRevision === state.revision) {
          await this.assertDelivery(ticketId, state.revision);
          return { status: "ready" };
        }
        if (state.phase === "delivering") throw new Error("Reconcile the existing delivery before validating another revision.");
        state = { ...state, phase: "checks", revision: currentRevision, fullRunId: null, previewRunId: null };
        this.persist(ticketId, state);
      }
      if (state.phase === "completed") throw new Error("The autonomous execution is already completed.");
      if (Date.now() >= state.deadlineAt) {
        await this.pause(ticketId, TIMEOUT_MESSAGE);
        return { status: "paused" };
      }
      const completion = this.execute(ticketId).catch(async (error: unknown) => {
        await this.pause(ticketId, getErrorMessage(error));
      }).finally(() => this.active.delete(ticketId));
      this.active.set(ticketId, completion);
      this.armDeadline(ticketId, state);
      return { status: "pending" };
    });
  }

  async assertDelivery(ticketId: string, revision: string): Promise<void> {
    const ticket = this.ticket(ticketId);
    this.requireFrozen(ticket);
    const state = this.state(ticket);
    const reconciling = state.hostMutation?.revision === revision;
    if ((!reconciling && !["ready", "delivering"].includes(state.phase)) || state.revision !== revision) throw new Error("Autonomous delivery requires completed verification of this exact revision.");
    if (!reconciling && !state.deliveryConfirmation && Date.now() >= state.deadlineAt) throw new Error(TIMEOUT_MESSAGE);
    const full = state.fullRunId ? this.deps.store.getQualityRun(state.fullRunId) : null;
    const functional = state.previewRunId ? this.deps.store.getQualityRun(state.previewRunId) : null;
    if (!full || !functional || !this.accepted(ticket, full, false) || !this.accepted(ticket, functional, true)) throw new Error("Both independent local and preview proofs must accept every frozen case at the current revision.");
    if (!state.previewId) throw new Error("The autonomous preview binding is missing.");
    const preview = this.deps.preview.get(state.previewId);
    if (!preview.autonomous || preview.ticketId !== ticketId || preview.revision !== revision || preview.deployedRevision !== revision || preview.qualityRunId !== functional.id || functional.preview?.previewId !== preview.id) throw new Error("The tested autonomous preview binding changed.");
    if (reconciling) {
      const project = getProject(ticket.project);
      const slot = ticket.slotId === null ? null : this.deps.store.getSlot(ticket.slotId);
      if (!slot || slot.ticketId !== ticket.id) throw new Error("Host reconciliation requires the retained implementation worktree.");
      const local = await this.deps.system.captureValidationRevision({ repoPath: project.repoPath, sourcePath: join(SLOTS_ROOT, `slot-${slot.id}`) });
      const current = this.state(this.ticket(ticketId));
      if (!local.clean || local.commitSha !== revision || current.revision !== revision || current.hostMutation?.kind !== state.hostMutation?.kind || current.hostMutation?.startedAt !== state.hostMutation?.startedAt) throw new Error("The issued host operation changed during read-only reconciliation.");
      return;
    }
    if (state.deliveryConfirmation) {
      const confirmation = state.deliveryConfirmation;
      if (state.phase !== "delivering" || confirmation.prUrl !== ticket.prUrl || confirmation.revision !== revision || confirmation.outcome !== ticket.autonomousDelivery) throw new Error("The confirmed delivery does not match the frozen policy and revision.");
      const project = getProject(ticket.project);
      const head = await this.deps.system.readPullRequestHead(project.repoPath, confirmation.prUrl, project.vcsProvider);
      if (!head.ok || head.commitSha !== revision) throw new Error("The confirmed delivery source revision changed.");
      if (confirmation.outcome === "merge" && !(await this.deps.system.checkPrMerged(project.repoPath, confirmation.prUrl, project.vcsProvider)).merged) throw new Error("The confirmed merge is no longer verified.");
      const slot = ticket.slotId === null ? null : this.deps.store.getSlot(ticket.slotId);
      if (!slot || slot.ticketId !== ticket.id) throw new Error("The confirmed delivery no longer owns its retained implementation worktree.");
      const local = await this.deps.system.captureValidationRevision({ repoPath: project.repoPath, sourcePath: join(SLOTS_ROOT, `slot-${slot.id}`) });
      if (!local.clean || local.commitSha !== revision) throw new Error("The confirmed delivery worktree changed before cleanup reconciliation.");
      const current = this.state(this.ticket(ticketId));
      if (current.phase !== "delivering" || current.deliveryConfirmation?.prUrl !== confirmation.prUrl || current.revision !== revision) throw new Error("The confirmed delivery changed during cleanup reconciliation.");
      return;
    }
    if (preview.status !== "ready" || preview.desiredState !== "running") throw new Error("The tested autonomous preview is no longer current.");
    await this.requireRevision(ticket, revision);
    const current = this.state(this.ticket(ticketId));
    if (!["ready", "delivering"].includes(current.phase) || current.revision !== revision) throw new Error("Autonomous delivery was stopped while its revision was being verified.");
  }

  async finishDelivery(ticketId: string): Promise<void> {
    const ticket = this.ticket(ticketId);
    const state = this.state(ticket);
    if (state.phase !== "delivering" || !state.previewId || !state.deliveryConfirmation) throw new Error("Confirm autonomous delivery before cleaning its owned preview.");
    await this.stopConfirmedPreview(ticketId);
    await this.waitFor(ticketId, () => {
      const preview = this.deps.preview.get(state.previewId ?? "");
      if (preview.cleanupStatus === "failed") throw new Error(preview.error ?? "Autonomous preview cleanup failed after delivery.");
      return preview.cleanupStatus === "complete" && !preview.cleanupWatch;
    }, Date.now() + DELIVERY_CLEANUP_TIMEOUT_MS);
    const timer = this.deadlines.get(ticketId);
    if (timer) clearTimeout(timer);
    this.deadlines.delete(ticketId);
  }

  private async execute(ticketId: string): Promise<void> {
    let ticket = this.ticket(ticketId);
    this.requireFrozen(ticket);
    const revision = await this.requireRevision(ticket);
    this.requireRunning(ticketId);
    let state = this.state(ticket);
    if (state.revision !== revision) state = { ...state, revision, fullRunId: null, previewRunId: null };
    if (state.phase === "paused") {
      const full = state.fullRunId ? this.deps.store.getQualityRun(state.fullRunId) : null;
      const functional = state.previewRunId ? this.deps.store.getQualityRun(state.previewRunId) : null;
      if (full && ["inconclusive", "interrupted", "cancelled"].includes(full.status) && full.cleanupStatus === "complete") state = { ...state, fullRunId: null, previewRunId: null };
      if (functional && ["inconclusive", "interrupted", "cancelled"].includes(functional.status) && functional.cleanupStatus === "complete") state = { ...state, previewRunId: null };
    }
    this.persist(ticketId, { ...state, phase: "checks", error: null });
    let full = state.fullRunId ? this.deps.store.getQualityRun(state.fullRunId) : null;
    if (!full) {
      await this.waitForAdmission(ticketId);
      full = await this.deps.quality.verifyAutonomous(ticketId, ticket.orchestrator, revision);
      this.patch(ticketId, { fullRunId: full.id });
      if (this.state(this.ticket(ticketId)).phase === "paused") await this.deps.quality.cancel(ticketId);
    }
    full = await this.deps.quality.awaitRun(full.id);
    this.requireRunning(ticketId);
    ticket = this.ticket(ticketId);
    if (!this.accepted(ticket, full, false)) return this.failedRun(ticketId, full);
    await this.requireRevision(ticket, revision);
    this.requireRunning(ticketId);
    this.patch(ticketId, { phase: "preview" });
    const oldPreviewId = this.state(ticket).previewId;
    if (oldPreviewId) {
      const old = this.deps.preview.get(oldPreviewId);
      if (old.cleanupStatus === "failed") throw new Error(old.error ?? "The previous autonomous preview cleanup requires explicit reconciliation.");
      if (old.revision !== revision || old.desiredState === "stopped" || ["failed", "interrupted"].includes(old.status)) {
        await this.deps.preview.stop(old.id);
        await this.waitFor(ticketId, () => {
          const current = this.deps.preview.get(old.id);
          if (current.cleanupStatus === "failed") throw new Error(current.error ?? "Autonomous preview cleanup failed.");
          return current.cleanupStatus === "complete" && !current.cleanupWatch;
        });
      }
    }
    this.requireRunning(ticketId);
    const preview = await this.deps.preview.createAutonomous(ticketId, ticket.branch ?? "", revision);
    this.patch(ticketId, { previewId: preview.id });
    try { this.requireRunning(ticketId); } catch (error) {
      await this.deps.preview.stop(preview.id);
      throw error;
    }
    await this.waitFor(ticketId, () => {
      const current = this.deps.preview.get(preview.id);
      if (["failed", "interrupted", "stopped", "stopping"].includes(current.status) || current.desiredState !== "running") throw new Error(current.error ?? "The autonomous preview is unavailable.");
      return current.status === "ready" && current.deployedRevision === revision;
    });
    this.patch(ticketId, { phase: "validating" });
    state = this.state(this.ticket(ticketId));
    let functional = state.previewRunId ? this.deps.store.getQualityRun(state.previewRunId) : null;
    if (!functional) {
      await this.waitForAdmission(ticketId);
      functional = await this.deps.preview.validate(preview.id, ticket.orchestrator);
      this.patch(ticketId, { previewRunId: functional.id });
      if (this.state(this.ticket(ticketId)).phase === "paused") await this.deps.quality.cancel(ticketId);
    }
    functional = await this.deps.quality.awaitRun(functional.id);
    this.requireRunning(ticketId);
    ticket = this.ticket(ticketId);
    if (!this.accepted(ticket, functional, true)) return this.failedRun(ticketId, functional);
    this.patch(ticketId, { phase: "ready", error: null });
    await this.assertDelivery(ticketId, revision);
    this.requireRunning(ticketId);
    await this.deps.inject(ticketId, READY_MESSAGE);
  }

  private accepted(ticket: Ticket, run: QualityValidationRun, functional: boolean): boolean {
    this.requireFrozen(ticket);
    const state = this.state(ticket);
    if (run.simulated || run.status !== "passed" || !run.evidenceAccepted || run.cleanupStatus !== "complete" || run.revision !== state.revision || run.provider !== ticket.orchestrator) return false;
    if (functional ? run.kind !== "functional" || !run.preview || run.criteriaSnapshotId !== state.functionalSnapshotId : run.kind !== "full" || !run.technicalEvidenceAccepted || run.criteriaSnapshotId !== state.acceptanceSnapshotId) return false;
    const project = getProject(ticket.project);
    if (run.configFingerprint !== fingerprint([project.scripts ?? null, project.validation ?? null])) return false;
    const quality = this.deps.quality.get(ticket.id);
    return state.plan?.criteria.every((criterion) => {
      const evidence = quality.evidence.filter((entry) => entry.runId === run.id && entry.criterionId === criterion.id && entry.authority === "agent").at(-1);
      return evidence?.status === "passed" && !evidence.timedOut && evidence.provider === run.provider && !!evidence.sessionId && (!functional || !!evidence.scenario);
    }) === true;
  }

  private async failedRun(ticketId: string, run: QualityValidationRun): Promise<void> {
    const ticket = this.ticket(ticketId);
    const state = this.state(ticket);
    const maxCorrections = ticket.autonomousMaxCorrections ?? AUTONOMOUS_DEFAULT_MAX_CORRECTIONS;
    const correctable = !run.simulated && run.status === "failed" && run.evidenceAccepted && run.cleanupStatus === "complete" && (!run.diagnostic || ["code_nonconformance", "backend_checks_failed"].includes(run.diagnostic.category));
    if (correctable && state.corrections < maxCorrections && Date.now() < state.deadlineAt) {
      this.patch(ticketId, { phase: "correcting", corrections: state.corrections + 1, fullRunId: null, previewRunId: null, error: run.error ? this.deps.preview.redactError(run.error) : null });
      const observations = this.deps.quality.get(ticketId).evidence.filter((entry) => entry.runId === run.id && entry.status !== "passed").map((entry) => entry.criterionId ?? entry.summary);
      await this.deps.inject(ticketId, this.deps.preview.redactError(`La validation indépendante ${run.id} a constaté une non-conformité. Corrige dans le même worktree, conserve le plan initial, relance la review indépendante, commit et push puis appelle validate_autonomous. N’ouvre pas de PR. Consulte les preuves du run pour le diagnostic. Cas concernés : ${observations.join("; ")}. Correction ${state.corrections + 1}/${maxCorrections}.`));
      return;
    }
    await this.pause(ticketId, run.error ?? "Autonomous verification is incomplete or its correction budget is exhausted.");
  }

  private async requireRevision(ticket: Ticket, expected?: string): Promise<string> {
    this.requireFrozen(ticket);
    const project = getProject(ticket.project);
    const slot = ticket.slotId === null ? null : this.deps.store.getSlot(ticket.slotId);
    if (!slot || slot.ticketId !== ticket.id || !ticket.branch || !this.deps.system.readPreviewBranchSource) throw new Error("Autonomous validation requires the retained implementation worktree and a pushed branch.");
    const local = await this.deps.system.captureValidationRevision({ repoPath: project.repoPath, sourcePath: join(SLOTS_ROOT, `slot-${slot.id}`), branch: ticket.branch });
    const settings = this.deps.store.getPreviewProjectSettings(ticket.project);
    const remote = await this.deps.system.readPreviewBranchSource(project.repoPath, ticket.branch, settings.recipePath);
    if (!local.clean || remote.branch !== ticket.branch || local.commitSha !== remote.revision || expected && local.commitSha !== expected) throw new Error("The clean implementation worktree and pushed preview branch must match the exact validated commit.");
    return local.commitSha;
  }

  private requireFrozen(ticket: Ticket): void {
    const state = this.state(ticket);
    if (!state.plan || state.sourceFingerprint !== sourceFingerprint(ticket) || state.configFingerprint !== this.configFingerprint(ticket) || state.planFingerprint !== fingerprint(state.plan)) throw new Error("The autonomous plan, ticket or environment changed; its verification cannot be accepted.");
    const quality = this.deps.quality.get(ticket.id);
    const acceptance = latestAcceptanceSnapshot(quality);
    const functional = latestFunctionalSnapshot(quality);
    if (acceptance?.id !== state.acceptanceSnapshotId || functional?.id !== state.functionalSnapshotId || functional?.baseSnapshotId !== acceptance?.id || acceptance.sourceFingerprint !== state.sourceFingerprint || functional.sourceFingerprint !== state.sourceFingerprint || fingerprint(acceptance.criteria) !== fingerprint(state.plan.criteria) || fingerprint(functional.criteria) !== fingerprint(state.plan.criteria.map((criterion) => ({ ...criterion, covers: [criterion.id] })))) throw new Error("The frozen autonomous acceptance or functional criteria changed.");
  }

  private configFingerprint(ticket: Ticket): string {
    const project = getProject(ticket.project);
    return fingerprint([project.scripts ?? null, project.validation ?? null, ticket.baseBranch ?? project.baseBranch, ticket.autonomousDelivery, ticket.autonomousMaxCorrections, ticket.autonomousTimeoutMinutes, this.deps.preview.projectSettings(ticket.project), this.deps.preview.settings]);
  }

  private async waitFor(ticketId: string, predicate: () => boolean, deadline?: number): Promise<void> {
    this.requireRunning(ticketId);
    while (!predicate()) {
      if (deadline !== undefined && Date.now() >= deadline) throw new Error("Autonomous delivery cleanup is still unresolved. Reconcile the owned preview before completion.");
      await new Promise<void>((resolve) => setTimeout(resolve, POLL_MS));
      this.requireRunning(ticketId);
    }
  }

  private requireRunning(ticketId: string): void {
    if (this.shuttingDown) throw new Error("Autonomous validation interrupted by backend shutdown.");
    const ticket = this.ticket(ticketId);
    const state = this.state(ticket);
    if (state.phase === "paused" || ["abandoned", "failed"].includes(ticket.column)) throw new Error(state.error ?? "Autonomous execution was stopped.");
    if (!state.deliveryConfirmation && Date.now() >= state.deadlineAt) throw new Error(TIMEOUT_MESSAGE);
  }

  private waitForAdmission(ticketId: string): Promise<void> {
    return this.waitFor(ticketId, () => this.deps.store.listActiveQualityRuns().length === 0 && this.deps.store.listActiveQualityIterations().length === 0);
  }

  private armDeadline(ticketId: string, state: AutonomousState): void {
    const previous = this.deadlines.get(ticketId);
    if (previous) clearTimeout(previous);
    const timer = setTimeout(() => {
      const current = this.deps.store.getTicket(ticketId)?.autonomousState;
      if (!current || current.phase === "completed" || current.phase === "delivering" && current.deliveryConfirmation !== null) return;
      void this.cancelAtDeadline(ticketId);
    }, Math.max(0, state.deadlineAt - Date.now()));
    this.deadlines.set(ticketId, timer);
  }

  private async pause(ticketId: string, error: string): Promise<void> {
    const ticket = this.deps.store.getTicket(ticketId);
    if (!ticket?.autonomousState || ticket.autonomousState.phase === "completed" || ticket.autonomousState.phase === "delivering" && ticket.autonomousState.deliveryConfirmation !== null) return;
    if (ticket.autonomousState.hostMutation) {
      this.patch(ticketId, { error: "An issued host operation has an unresolved outcome. Preserve its proofs and owned resources until read-only reconciliation completes." });
      return;
    }
    if (ticket.autonomousState.phase === "paused") {
      await this.stopOwnedPreviews(ticketId);
      return;
    }
    this.patch(ticketId, { phase: "paused", error: this.deps.preview.redactError(error) });
    this.deps.store.updateTicket(ticketId, { stage: "stalled" });
    this.deps.onChange?.(ticketId);
    await this.stopOwnedPreviews(ticketId);
    if (!this.shuttingDown) {
      try { await this.deps.inject(ticketId, "Le parcours autonome est suspendu. Conserve le worktree et n’ouvre ni ne fusionne de PR. Le diagnostic est conservé sur la carte ; attends une reprise explicite."); } catch { return; }
    }
  }

  private ticket(ticketId: string): Ticket {
    const ticket = this.deps.store.getTicket(ticketId);
    if (!ticket?.autonomous || ticket.kind !== "feature") throw new Error("An autonomous feature ticket is required.");
    return ticket;
  }

  private state(ticket: Ticket): AutonomousState {
    if (!ticket.autonomousState) throw new Error("Freeze the initial autonomous plan before implementation.");
    return ticket.autonomousState;
  }

  private patch(ticketId: string, patch: Partial<AutonomousState>): void {
    this.persist(ticketId, { ...this.state(this.ticket(ticketId)), ...patch });
  }

  private persist(ticketId: string, state: AutonomousState): void {
    this.deps.store.updateTicket(ticketId, { autonomousState: state });
    this.deps.onChange?.(ticketId);
  }

  async recover(): Promise<void> {
    this.shuttingDown = false;
    for (const ticket of this.deps.store.listTickets(false)) {
      const state = ticket.autonomousState;
      if (!ticket.autonomous || !state || state.phase === "completed") continue;
      if (state.hostMutation) {
        this.patch(ticket.id, { phase: "delivering", error: "An issued host operation needs read-only reconciliation before any new effect or cleanup." });
        try { await this.deps.inject(ticket.id, "Une opération de livraison déjà émise a un résultat incertain. Appelle deliver_autonomous pour réconcilier la PR existante en lecture seule. N’émets aucune nouvelle création ni fusion et conserve les preuves, la preview et le worktree tant que le résultat reste incertain."); } catch { continue; }
        continue;
      }
      if (state.deliveryConfirmation) {
        const slot = ticket.slotId === null ? null : this.deps.store.getSlot(ticket.slotId);
        const retained = slot?.ticketId === ticket.id && !["abandoned", "failed"].includes(ticket.column);
        if (retained && state.phase !== "delivering") this.patch(ticket.id, { phase: "delivering", error: "Confirmed delivery cleanup is awaiting reconciliation." });
        try {
          await this.stopConfirmedPreview(ticket.id);
          if (retained) await this.deps.inject(ticket.id, "La livraison choisie est déjà confirmée. Le nettoyage de sa preview doit être réconcilié. Appelle deliver_autonomous pour vérifier le résultat existant et achever le nettoyage ; ne recommence ni l’implémentation ni la création de PR.");
        } catch (error) {
          this.patch(ticket.id, { error: this.deps.preview.redactError(getErrorMessage(error)) });
        }
        continue;
      }
      if (state.phase === "paused") continue;
      this.armDeadline(ticket.id, state);
      if (["checks", "preview", "validating"].includes(state.phase)) {
        void this.validate(ticket.id).catch((error: unknown) => this.pause(ticket.id, getErrorMessage(error)));
      }
    }
  }

  async shutdown(): Promise<void> {
    this.shuttingDown = true;
    for (const timer of this.deadlines.values()) clearTimeout(timer);
    this.deadlines.clear();
    await Promise.allSettled([...this.active.keys()].map((ticketId) => this.deps.quality.cancel(ticketId)));
    await Promise.allSettled([...this.active.values()]);
  }

  async cancel(ticketId: string): Promise<void> {
    if (!this.deps.store.getTicket(ticketId)?.autonomousState) return;
    await this.drainDelivery(ticketId);
    const ticket = this.deps.store.getTicket(ticketId);
    if (!ticket?.autonomousState) return;
    if (ticket.autonomousState.phase === "completed") { this.deps.acknowledgeDeliveryStop(ticketId); return; }
    const timer = this.deadlines.get(ticketId);
    if (timer) clearTimeout(timer);
    this.deadlines.delete(ticketId);
    if (ticket.autonomousState.deliveryConfirmation) {
      this.patch(ticketId, { phase: "delivering", error: "The host outcome is already confirmed. Preview cleanup remains recoverable; no new delivery effect is needed." });
    } else {
      this.patch(ticketId, { phase: "paused", error: "Autonomous execution was cancelled. The implementation worktree is retained." });
      this.deps.acknowledgeDeliveryStop(ticketId);
    }
    await this.deps.quality.cancel(ticketId);
    if (ticket.autonomousState.deliveryConfirmation) await this.stopConfirmedPreview(ticketId);
    else await this.stopOwnedPreviews(ticketId);
    await this.active.get(ticketId);
    await this.stopOwnedPreviews(ticketId);
  }

  private async drainDelivery(ticketId: string): Promise<void> {
    try { await this.deps.waitForDelivery(ticketId); } catch (error) {
      const ticket = this.deps.store.getTicket(ticketId);
      if (ticket?.autonomousState) {
        this.patch(ticketId, { error: this.deps.preview.redactError(getErrorMessage(error)) });
        this.deps.store.updateTicket(ticketId, { stage: "stalled" });
        this.deps.onChange?.(ticketId);
      }
      throw error;
    }
  }

  private async cancelAtDeadline(ticketId: string): Promise<void> {
    try {
      await this.drainDelivery(ticketId);
      const state = this.deps.store.getTicket(ticketId)?.autonomousState;
      if (!state) return;
      if (state.phase === "completed") { this.deps.acknowledgeDeliveryStop(ticketId); return; }
      if (state.deliveryConfirmation) { await this.stopConfirmedPreview(ticketId); return; }
      await this.deps.quality.cancel(ticketId);
      await this.pause(ticketId, TIMEOUT_MESSAGE);
      const stopped = this.deps.store.getTicket(ticketId)?.autonomousState;
      if (stopped?.phase === "paused" && !stopped.hostMutation) this.deps.acknowledgeDeliveryStop(ticketId);
    } catch (error) {
      const ticket = this.deps.store.getTicket(ticketId);
      if (ticket?.autonomousState && ticket.autonomousState.phase !== "completed") this.patch(ticketId, { error: this.deps.preview.redactError(getErrorMessage(error)) });
    }
  }

  private async stopOwnedPreviews(ticketId: string): Promise<void> {
    const owned = this.deps.preview.list().filter((preview) => preview.autonomous && preview.ticketId === ticketId && preview.cleanupStatus !== "complete" && preview.cleanupStatus !== "failed");
    const results = await Promise.allSettled(owned.map((preview) => this.deps.preview.stop(preview.id)));
    if (results.some((result) => result.status === "rejected")) this.patch(ticketId, { error: "Autonomous preview cleanup could not be started. Reconcile the recorded owned resources before completion." });
  }

  private async stopConfirmedPreview(ticketId: string): Promise<void> {
    const ticket = this.ticket(ticketId);
    const state = this.state(ticket);
    const confirmation = state.deliveryConfirmation;
    if (!confirmation || confirmation.prUrl !== ticket.prUrl || confirmation.revision !== state.revision || confirmation.outcome !== ticket.autonomousDelivery || !state.previewId) throw new Error("The confirmed delivery cleanup binding is incomplete.");
    const preview = this.deps.preview.get(state.previewId);
    if (!preview.autonomous || preview.ticketId !== ticketId || preview.revision !== confirmation.revision) throw new Error("The confirmed delivery does not own this preview cleanup.");
    if (preview.cleanupStatus === "failed") throw new Error(preview.error ?? "The confirmed delivery cleanup failed. Explicitly reconcile the owned preview before completing the card.");
    await this.deps.preview.stop(preview.id);
  }
}
