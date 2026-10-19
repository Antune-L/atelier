import { createHash, randomUUID } from "node:crypto";
import { join } from "node:path";

import { z } from "zod";

import { AUTONOMOUS_DEFAULT_MAX_CORRECTIONS, AUTONOMOUS_DEFAULT_TIMEOUT_MINUTES, AUTONOMOUS_MAX_ENVIRONMENT_RETRIES, autonomousPlanInputSchema } from "../../shared/autonomous.ts";
import type { AutonomousPlanInput, AutonomousState } from "../../shared/autonomous.ts";
import type { Stage } from "../../shared/constants.ts";
import { getErrorMessage } from "../../shared/errors.ts";
import { latestAcceptanceSnapshot, latestFunctionalSnapshot } from "../../shared/quality.ts";
import type { QualityEvidence, QualityFunctionalBlockerCode, QualityRunDiagnostic, QualityValidationRun } from "../../shared/quality.ts";
import type { Ticket } from "../../shared/schemas.ts";
import { getProject, isQualityOwner, NOT_QUALITY_OWNER_MESSAGE, SLOTS_ROOT } from "../config.ts";
import type { Store } from "../db/store.ts";
import { KeyedMutex } from "../mutex.ts";
import type { PreviewManager } from "../previewManager.ts";
import type { SystemAdapter } from "../system/types.ts";

import type { QualityManager } from "./qualityManager.ts";

const MINUTE_MS = 60_000;
const POLL_MS = 250;
const DELIVERY_CLEANUP_TIMEOUT_MS = 120_000;
const TIMEOUT_MESSAGE = "The autonomous execution deadline has expired. The implementation worktree is retained.";
const AUTONOMOUS_RETRYABLE_DIAGNOSTICS: Array<QualityRunDiagnostic["category"]> = ["environment_blocker", "timeout", "validation_incomplete", "permission_denial"];
const AUTONOMOUS_PERMANENT_BLOCKERS: QualityFunctionalBlockerCode[] = ["authentication_required", "test_data_missing"];
const DEFECT_SOURCE_LOCATION = /(?:[\w.-]+\/)*[\w.-]+\.(?:[cm]?[jt]sx?|py|go|rs|java|php|rb):\d+(?::\d+)?/;
const UNKNOWN_DEFECT_OBSERVATION = /^(?:failed|fail|false|error|unknown|inconclusive|(?:test|tests|criterion|check|checks)(?:\s+\S+)?\s+failed)[.!]?$/i;
const DEFECT_ASSERTION_DETAIL = /(?:Expected:\s*\S|Received:\s*\S|AssertionError:\s*\S|TS\d+:\s*\S|expected\s+.+?\s+(?:to|but)\s+\S)/i;
const failureArtifactSchema = z.object({
  runId: z.string(), provider: z.string(), sessionId: z.string().nullable(),
  observations: z.array(z.object({ tool: z.string(), output: z.string(), ok: z.boolean() })),
  serverCheckObservations: z.array(z.object({ id: z.string(), output: z.string() })).default([]),
  response: z.object({ results: z.array(z.object({ criterionId: z.string(), status: z.string(), summary: z.string(), output: z.string(), observedText: z.string(), tools: z.array(z.string()), checkEvidenceIds: z.array(z.string()).default([]) })) }).nullable(),
});
const AUTONOMOUS_RESUMED_STAGE: Stage = "testing";
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
  finalizePartial?: (ticketId: string, reason: string) => Promise<void>;
  closeWriters?: (ticketId: string) => Promise<boolean>;
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
  private readonly subscriptions = new Map<string, () => void>();
  private readonly finalizations = new Map<string, Promise<void>>();
  private readonly explicitStops = new Set<string>();
  private readonly executionGenerations = new Map<string, number>();

  startExecution(ticketId: string): void {
    const state = this.deps.store.ensureAutonomousExecution(ticketId);
    if (!state?.execution) return;
    if (state.execution.userStopRequestedAt !== null) {
      this.explicitStops.add(ticketId);
      return;
    }
    if (this.executionGenerations.get(ticketId) !== state.execution.generation) {
      this.explicitStops.delete(ticketId);
      this.finalizations.delete(ticketId);
      this.executionGenerations.set(ticketId, state.execution.generation);
    }
    this.armDeadline(ticketId, state);
    if (!this.subscriptions.has(ticketId)) {
      this.subscriptions.set(ticketId, this.deps.store.subscribeAutonomousExecution(ticketId, () => {
        const current = this.deps.store.getTicket(ticketId)?.autonomousState;
        if (!current?.execution || current.execution.userStopRequestedAt !== null || this.explicitStops.has(ticketId) || current.deliveryConfirmation || ["completed", "published_partial", "publication_failed"].includes(current.phase)) return;
        if (current.execution.workRevokedAt !== null) {
          void this.finalizePartial(ticketId, current.execution.revocationReason ?? TIMEOUT_MESSAGE);
        }
      }));
    }
    if (state.execution.workRevokedAt !== null && !["published_partial", "publication_failed"].includes(state.phase)) void this.finalizePartial(ticketId, state.execution.revocationReason ?? TIMEOUT_MESSAGE);
  }

  assertResumeConfiguration(ticketId: string): void {
    const ticket = this.ticket(ticketId);
    if (ticket.autonomousState?.plan) this.requireFrozen(ticket);
  }

  async prepareResume(ticketId: string): Promise<"planning" | "validation" | "delivery"> {
    const ticket = this.ticket(ticketId);
    const state = this.state(ticket);
    this.deps.store.assertAutonomousWork(ticketId);
    if (state.execution?.closure.status === "unknown") throw new Error("Reconcile the uncertain writer closure before resuming autonomous work.");
    this.startExecution(ticketId);
    if (!state.plan) {
      await this.deps.preview.autonomousPreflight(ticketId);
      this.patch(ticketId, { phase: "planning", error: null });
      return "planning";
    }
    this.requireFrozen(ticket);
    if (state.deliveryConfirmation || state.hostMutation) return "delivery";
    this.patch(ticketId, { phase: "checks", error: null });
    return "validation";
  }

  private finalizePartial(ticketId: string, reason: string): Promise<void> {
    const previous = this.finalizations.get(ticketId);
    if (previous) return previous;
    const completion = Promise.resolve().then(async () => {
      const ticket = this.deps.store.getTicket(ticketId);
      if (!ticket?.autonomousState?.execution || ticket.autonomousState.execution.userStopRequestedAt !== null || ticket.autonomousState.deliveryConfirmation || this.explicitStops.has(ticketId)) return;
      this.deps.store.beginAutonomousFinalization(ticketId, reason);
      if (this.deps.finalizePartial) await this.deps.finalizePartial(ticketId, reason);
      else await this.deps.quality.cancel(ticketId);
      try { await this.stopOwnedPreviews(ticketId); } catch (error) {
        this.patch(ticketId, { error: this.deps.preview.redactError(getErrorMessage(error)) });
      }
    }).catch((error: unknown) => {
      const state = this.deps.store.getTicket(ticketId)?.autonomousState;
      if (state) this.patch(ticketId, { phase: "publication_failed", error: this.deps.preview.redactError(getErrorMessage(error)) });
    });
    this.finalizations.set(ticketId, completion);
    return completion;
  }

  constructor(private readonly deps: AutonomousWorkflowDependencies) {}

  async submitPlan(ticketId: string, input: AutonomousPlanInput): Promise<void> {
    await this.starts.run(ticketId, async () => {
      const ticket = this.ticket(ticketId);
      if (ticket.autonomousState?.execution) this.deps.store.assertAutonomousWork(ticketId);
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
          ...(ticket.autonomousState?.execution ? { execution: ticket.autonomousState.execution } : {}),
          startedAt, deadlineAt, corrections: ticket.autonomousState?.corrections ?? 0, environmentRetries: ticket.autonomousState?.environmentRetries ?? 0, error: this.deps.preview.redactError(getErrorMessage(error)),
        });
        this.deps.store.updateTicket(ticketId, { stage: "stalled" });
        this.deps.onChange?.(ticketId);
        if (ticket.autonomousState?.execution) await this.pause(ticketId, getErrorMessage(error));
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
        ...(ticket.autonomousState?.execution ? { execution: ticket.autonomousState.execution } : {}),
        startedAt, deadlineAt: ticket.autonomousState?.deadlineAt ?? startedAt + (ticket.autonomousTimeoutMinutes ?? AUTONOMOUS_DEFAULT_TIMEOUT_MINUTES) * MINUTE_MS, corrections: ticket.autonomousState?.corrections ?? 0, environmentRetries: ticket.autonomousState?.environmentRetries ?? 0, error: null,
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
      if (Date.now() >= this.workDeadline(state)) {
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
    if (!reconciling && !state.deliveryConfirmation && Date.now() >= this.workDeadline(state)) throw new Error(TIMEOUT_MESSAGE);
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
      if (confirmation.outcome === "merge" && (await this.deps.system.readPr(project.repoPath, confirmation.prUrl, project.vcsProvider)).state !== "merged") throw new Error("The confirmed merge is no longer verified.");
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
      this.deps.store.updateTicket(ticketId, { stage: AUTONOMOUS_RESUMED_STAGE });
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
    this.deps.store.admitAutonomousStart(ticketId, randomUUID(), "preview");
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
    const deferred = !functional && this.deferredToPreview(run);
    if (run.simulated || (run.status !== "passed" && !deferred) || !run.evidenceAccepted || run.cleanupStatus !== "complete" || run.revision !== state.revision || run.provider !== ticket.orchestrator) return false;
    if (functional ? run.kind !== "functional" || !run.preview || run.criteriaSnapshotId !== state.functionalSnapshotId : run.kind !== "full" || !run.technicalEvidenceAccepted || run.criteriaSnapshotId !== state.acceptanceSnapshotId) return false;
    const project = getProject(ticket.project);
    if (run.configFingerprint !== fingerprint([project.scripts ?? null, project.validation ?? null])) return false;
    const quality = this.deps.quality.get(ticket.id);
    return state.plan?.criteria.every((criterion) => {
      const evidence = quality.evidence.filter((entry) => entry.runId === run.id && entry.criterionId === criterion.id && entry.authority === "agent").at(-1);
      if (!evidence) return false;
      const statusAccepted = evidence.status === "passed" || (deferred && evidence.status === "inconclusive");
      return statusAccepted && !evidence.timedOut && evidence.provider === run.provider && !!evidence.sessionId && (!functional || !!evidence.scenario);
    }) === true;
  }

  private deferredToPreview(run: QualityValidationRun): boolean {
    return run.status === "inconclusive" && run.technicalEvidenceAccepted && (!run.diagnostic || run.diagnostic.category === "validation_incomplete");
  }

  private environmentRetryable(run: QualityValidationRun, bounded = false): boolean {
    if (run.simulated || run.status !== "inconclusive" || run.cleanupStatus !== "complete" || !run.diagnostic) return false;
    if (!bounded && !["environment_blocker", "timeout"].includes(run.diagnostic.category)) return false;
    if (!AUTONOMOUS_RETRYABLE_DIAGNOSTICS.includes(run.diagnostic.category)) return false;
    return run.diagnostic.blockers.every((blocker) => !AUTONOMOUS_PERMANENT_BLOCKERS.includes(blocker.code));
  }

  private async defectFingerprints(state: AutonomousState, run: QualityValidationRun, evidence: QualityEvidence[]): Promise<string[]> {
    const defects: Array<unknown[]> = [];
    for (const entry of evidence) {
      const criterion = state.plan?.criteria.find((candidate) => candidate.id === entry.criterionId);
      if (!criterion || !entry.provider || !entry.sessionId) continue;
      const scenario = entry.scenario;
      if (scenario) {
        const observed = scenario.observed.trim();
        const expected = scenario.expected.trim();
        if (scenario.expected !== criterion.expected || scenario.interaction !== criterion.interaction || !observed || UNKNOWN_DEFECT_OBSERVATION.test(observed) || observed === expected || scenario.actions.length === 0 || !scenario.actions.every((action) => action.ok)) continue;
        defects.push([entry.provider, criterion.text, scenario.interaction, expected, observed, scenario.actions.map((action) => action.tool), entry.output]);
        continue;
      }
      if (!entry.artifactPath) continue;
      try {
        const parsed = failureArtifactSchema.safeParse(await Bun.file(entry.artifactPath).json());
        if (!parsed.success || parsed.data.runId !== run.id || parsed.data.provider !== entry.provider || parsed.data.sessionId !== entry.sessionId) continue;
        const matching = parsed.data.response?.results.filter((result) => result.criterionId === criterion.id && result.status === "failed");
        if (matching?.length !== 1) continue;
        const result = matching[0];
        if (!result || result.output !== entry.output || result.summary !== entry.summary) continue;
        const observed = result.observedText.trim();
        if (!observed) continue;
        const reads = parsed.data.observations.filter((observation) => observation.ok && result.tools.includes(observation.tool) && observation.output.includes(observed));
        const checks = parsed.data.serverCheckObservations.filter((check) => result.checkEvidenceIds.includes(check.id) && check.output.includes(observed));
        const attributedDetails = [...reads.map((read) => read.output), ...checks.map((check) => check.output)].filter((detail) => DEFECT_SOURCE_LOCATION.test(detail) && DEFECT_ASSERTION_DETAIL.test(detail));
        if (attributedDetails.length === 0) continue;
        defects.push([entry.provider, criterion.text, criterion.expected, criterion.interaction, observed, attributedDetails]);
      } catch {
        continue;
      }
    }
    return [...new Set(defects.map((defect) => fingerprint(defect)))];
  }

  private async failedRun(ticketId: string, run: QualityValidationRun): Promise<void> {
    const ticket = this.ticket(ticketId);
    const state = this.state(ticket);
    const maxCorrections = state.execution?.maxCorrections ?? ticket.autonomousMaxCorrections ?? AUTONOMOUS_DEFAULT_MAX_CORRECTIONS;
    const evidence = this.deps.quality.get(ticketId).evidence.filter((entry) => entry.runId === run.id);
    const failedCriteria = evidence.filter((entry) => entry.authority === "agent" && entry.status === "failed" && entry.criterionId && entry.sessionId && entry.provider === run.provider && entry.output.trim().length > 0 && !entry.timedOut);
    const technicalFailure = run.technicalEvidenceAccepted && evidence.some((entry) => entry.status === "failed" && entry.authority === "server" && entry.kind === "command" && entry.exitCode !== null && entry.exitCode !== 0 && !entry.timedOut);
    const acceptedFailure = state.execution ? run.evidenceAccepted || technicalFailure || failedCriteria.length > 0 : run.evidenceAccepted;
    const failureCategories = state.execution ? ["code_nonconformance", "backend_checks_failed", "validation_incomplete"] : ["code_nonconformance", "backend_checks_failed"];
    const failedStatus = run.status === "failed" || state.execution !== undefined && run.status === "inconclusive" && (technicalFailure || failedCriteria.length > 0);
    const correctable = !run.simulated && failedStatus && run.cleanupStatus === "complete" && acceptedFailure && (!run.diagnostic || failureCategories.includes(run.diagnostic.category));
    const failureFingerprints = state.execution ? await this.defectFingerprints(state, run, failedCriteria) : [];
    const repeatedFailure = state.execution?.failureRepairs.find((entry) => failureFingerprints.includes(entry.fingerprint) && entry.count >= (state.execution?.maxSameFailureRepairs ?? 0));
    if (repeatedFailure) {
      await this.pause(ticketId, "The same independently observed criterion failure exhausted its repair allowance.");
      return;
    }
    if (correctable && state.corrections < maxCorrections && Date.now() < this.workDeadline(state)) {
      this.deps.store.admitAutonomousStart(ticketId, `repair:${run.id}`, "repair");
      const current = this.state(this.ticket(ticketId));
      if (current.execution && failureFingerprints.length > 0) {
        const history = current.execution.failureRepairs.filter((entry) => !failureFingerprints.includes(entry.fingerprint));
        const repairs = failureFingerprints.map((failureFingerprint) => ({ fingerprint: failureFingerprint, count: (current.execution?.failureRepairs.find((entry) => entry.fingerprint === failureFingerprint)?.count ?? 0) + 1, lastRunId: run.id }));
        this.deps.store.updateTicket(ticketId, { autonomousState: { ...current, execution: { ...current.execution, failureRepairs: [...history, ...repairs] } } });
      }
      this.patch(ticketId, { phase: "correcting", corrections: state.corrections + 1, fullRunId: null, previewRunId: null, error: run.error ? this.deps.preview.redactError(run.error) : null });
      const observations = this.deps.quality.get(ticketId).evidence.filter((entry) => entry.runId === run.id && entry.status !== "passed").map((entry) => entry.criterionId ?? entry.summary);
      await this.deps.inject(ticketId, this.deps.preview.redactError(`La validation indépendante ${run.id} a constaté un échec attribué. Distingue ses preuves des vérifications encore inconclusives, diagnostique la cause et corrige dans le même worktree, conserve le plan initial, relance la review indépendante, commit et push puis appelle validate_autonomous. N’ouvre pas de PR. Consulte les preuves du run pour le diagnostic. Cas concernés : ${observations.join("; ")}. Correction ${state.corrections + 1}/${maxCorrections}.`));
      return;
    }
    if (this.environmentRetryable(run, state.execution !== undefined) && state.environmentRetries < (state.execution?.maxEnvironmentRetries ?? AUTONOMOUS_MAX_ENVIRONMENT_RETRIES) && Date.now() < this.workDeadline(state)) {
      this.deps.store.admitAutonomousStart(ticketId, `retry:${run.id}`, "retry");
      const runReset = run.kind === "functional" ? { previewRunId: null } : { fullRunId: null, previewRunId: null };
      this.patch(ticketId, { ...runReset, environmentRetries: state.environmentRetries + 1, error: run.error ? this.deps.preview.redactError(run.error) : null });
      return this.execute(ticketId);
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
    if (!state.deliveryConfirmation) this.deps.store.assertAutonomousWork(ticketId);
    if (state.phase === "paused" || ["abandoned", "failed"].includes(ticket.column)) throw new Error(state.error ?? "Autonomous execution was stopped.");
    if (!state.deliveryConfirmation && Date.now() >= this.workDeadline(state)) throw new Error(TIMEOUT_MESSAGE);
  }

  private waitForAdmission(ticketId: string): Promise<void> {
    return this.waitFor(ticketId, () => {
      if (!isQualityOwner()) throw new Error(NOT_QUALITY_OWNER_MESSAGE);
      return this.deps.store.listActiveQualityRuns().length === 0 && this.deps.store.listActiveQualityIterations().length === 0;
    });
  }

  private workDeadline(state: AutonomousState): number {
    return state.execution?.deadlineAt ?? state.deadlineAt;
  }

  private armDeadline(ticketId: string, state: AutonomousState): void {
    const previous = this.deadlines.get(ticketId);
    if (previous) clearTimeout(previous);
    const timer = setTimeout(() => {
      const current = this.deps.store.getTicket(ticketId)?.autonomousState;
      if (!current || ["completed", "published_partial", "publication_failed"].includes(current.phase) || current.phase === "delivering" && current.deliveryConfirmation !== null) return;
      void this.cancelAtDeadline(ticketId);
    }, Math.max(0, this.workDeadline(state) - Date.now()));
    this.deadlines.set(ticketId, timer);
  }

  private async pause(ticketId: string, error: string): Promise<void> {
    const ticket = this.deps.store.getTicket(ticketId);
    if (!ticket?.autonomousState || ticket.autonomousState.phase === "completed" || ticket.autonomousState.phase === "delivering" && ticket.autonomousState.deliveryConfirmation !== null) return;
    if (ticket.autonomousState.execution && (this.explicitStops.has(ticketId) || ticket.autonomousState.execution.userStopRequestedAt !== null)) return;
    if (this.shuttingDown && ticket.autonomousState.execution) {
      this.patch(ticketId, { error: this.deps.preview.redactError(error) });
      return;
    }
    if (ticket.autonomousState.execution && !ticket.autonomousState.deliveryConfirmation) {
      this.deps.store.beginAutonomousFinalization(ticketId, error);
      await this.finalizePartial(ticketId, error);
      return;
    }
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
    const execution = this.deps.store.getTicket(ticketId)?.autonomousState?.execution;
    this.deps.store.updateTicket(ticketId, { autonomousState: execution ? { ...state, execution } : state });
    this.deps.onChange?.(ticketId);
  }

  async recover(): Promise<void> {
    this.shuttingDown = false;
    for (const ticket of this.deps.store.listTickets(false)) {
      const state = ticket.autonomousState;
      if (!ticket.autonomous || !state || state.phase === "completed") continue;
      if (state.execution?.userStopRequestedAt !== null && state.execution?.userStopRequestedAt !== undefined) {
        this.explicitStops.add(ticket.id);
        continue;
      }
      if (state.execution) {
        this.startExecution(ticket.id);
        if (state.execution.workRevokedAt !== null) {
          if (["published_partial", "publication_failed"].includes(state.phase)) continue;
          await this.finalizePartial(ticket.id, state.execution.revocationReason ?? TIMEOUT_MESSAGE);
          continue;
        }
      }
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
    for (const unsubscribe of this.subscriptions.values()) unsubscribe();
    this.subscriptions.clear();
    await Promise.allSettled([...this.active.keys()].map((ticketId) => this.deps.quality.cancel(ticketId)));
    await Promise.allSettled([...this.active.values()]);
  }

  async cancel(ticketId: string): Promise<void> {
    this.explicitStops.add(ticketId);
    if (!this.deps.store.getTicket(ticketId)?.autonomousState) return;
    const initial = this.deps.store.getTicket(ticketId)?.autonomousState;
    if (initial?.execution) {
      await this.cancelBounded(ticketId);
      return;
    }
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

  private async cancelBounded(ticketId: string): Promise<void> {
    const state = this.deps.store.cancelAutonomousExecution(ticketId);
    if (!state) return;
    const timer = this.deadlines.get(ticketId);
    if (timer) clearTimeout(timer);
    this.deadlines.delete(ticketId);
    if (state.phase === "completed") {
      this.deps.acknowledgeDeliveryStop(ticketId);
      return;
    }
    if (state.deliveryConfirmation) {
      this.patch(ticketId, { phase: "delivering", error: "The host outcome is already confirmed. Preview cleanup remains recoverable; no new delivery effect is needed." });
    } else {
      this.patch(ticketId, { phase: "paused", error: "Autonomous execution was cancelled. The implementation worktree is retained." });
      this.deps.acknowledgeDeliveryStop(ticketId);
    }
    const closures = await Promise.allSettled([this.deps.quality.cancel(ticketId), this.deps.closeWriters?.(ticketId) ?? Promise.resolve(false)]);
    const closureFailed = closures.some((result) => result.status === "rejected" || result.value === false);
    if (closureFailed) {
      const current = this.state(this.ticket(ticketId));
      if (current.execution) this.deps.store.updateTicket(ticketId, { autonomousState: { ...current, execution: { ...current.execution, closure: { ...current.execution.closure, status: "unknown", confirmedAt: null, retention: "retained" } } } });
      this.patch(ticketId, { error: "Autonomous execution was cancelled, but writer closure remains unconfirmed. Retain all workspaces and reconcile closure." });
    }
    let deliveryError: unknown;
    try { await this.drainDelivery(ticketId); } catch (error) { deliveryError = error; }
    const current = this.deps.store.getTicket(ticketId)?.autonomousState;
    let cleanupError: unknown;
    try {
      if (current?.deliveryConfirmation) await this.stopConfirmedPreview(ticketId);
      else await this.stopOwnedPreviews(ticketId);
    } catch (error) { cleanupError = error; }
    if (deliveryError !== undefined) {
      this.patch(ticketId, { error: this.deps.preview.redactError(getErrorMessage(deliveryError)) });
      throw deliveryError;
    }
    if (cleanupError !== undefined) {
      this.patch(ticketId, { error: this.deps.preview.redactError(getErrorMessage(cleanupError)) });
      throw cleanupError;
    }
    if (closureFailed) throw new Error("Cancelled autonomous writer closure remains unconfirmed.");
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
    const state = this.deps.store.getTicket(ticketId)?.autonomousState;
    if (state?.execution?.userStopRequestedAt !== null && state?.execution?.userStopRequestedAt !== undefined) return;
    if (state?.execution && !state.deliveryConfirmation) {
      this.deps.store.beginAutonomousFinalization(ticketId, TIMEOUT_MESSAGE);
      await this.finalizePartial(ticketId, TIMEOUT_MESSAGE);
      return;
    }
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
