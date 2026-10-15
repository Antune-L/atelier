import { createHash } from "node:crypto";
import { lstat, readdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { nanoid } from "nanoid";

import type { Orchestrator } from "../../shared/constants.ts";
import { getErrorMessage } from "../../shared/errors.ts";
import { QUALITY_DEFAULT_TIMEOUT_MS, latestAcceptanceSnapshot, latestFunctionalSnapshot, qualityBlockerCategory, qualityFollowUpIssueSchema, qualityPreviewBindingSchema } from "../../shared/quality.ts";
import type { CreateQualityFollowUpInput, QualityCriteriaPlan, QualityCriteriaSnapshot, QualityCriterion, QualityEnvironment, QualityEvidence, QualityFollowUp, QualityFollowUpIssue, QualityGate, QualityIteration, QualityIterationActions, QualityIterationTrigger, QualityPermissionDenial, QualityPreflight, QualityPreviewTarget, QualityProblem, QualityRunPhase, StartQualityIterationInput, QualityValidationMode, QualityValidationRun, TicketQuality } from "../../shared/quality.ts";
import type { Ticket } from "../../shared/schemas.ts";
import { getProject, isProjectKey, isQualityOwner, MODELS, NOT_QUALITY_OWNER_MESSAGE, SLOTS_ROOT } from "../config.ts";
import type { ProjectConfig } from "../config.ts";
import type { Store } from "../db/store.ts";
import { createLogger } from "../logger.ts";
import { KeyedMutex } from "../mutex.ts";
import type { AgentExecutionGuard, AgentSessionOptions } from "../system/agentSession.ts";
import { isSuccessStatus, previewStatus } from "../system/previewNetwork.ts";
import { presentPackageManagerFiles, resolvePackageManager, scriptRunner } from "../system/packageManager.ts";
import { parsePackageManifest } from "../system/repoInspection.ts";
import type { SystemAdapter, ValidationCommandResult, ValidationRevision, ValidationServiceHandle, ValidationWorkspaceOptions } from "../system/types.ts";
import { validationDatabasePath } from "../system/validationWorkspace.ts";

import { createAutonomousSessionGuard } from "./autonomousSessionGuard.ts";
import { resolveExecution } from "./executionConfig.ts";
import { executeCombinedQuality, pendingVerification } from "./combinedQuality.ts";
import { QualityJournal } from "./qualityJournal.ts";
import { QualityBlockerError } from "./qualityBlocker.ts";
import { prepareFunctionalScenarios, prepareQualityCriteria } from "./qualityCriteriaPreparation.ts";
import type { FunctionalScenarioPlan } from "./qualityCriteriaPreparation.ts";
import { QUALITY_NATIVE_CLEANUP_DIRECTORY, qualityErrorMessage } from "./qualitySession.ts";
import { QUALITY_BROWSER_CLEANUP_MARKER, runQualityValidator } from "./qualityValidator.ts";

const log = createLogger("quality");
const CHECK_NAMES = ["typecheck", "lint", "test"] satisfies Array<"typecheck" | "lint" | "test">;
const HEALTH_POLL_MS = 250;
const HEALTH_REQUEST_TIMEOUT_MS = 2_000;
const OUTPUT_LIMIT = 32_768;
const PREVIOUS_OBSERVATION_LIMIT = 2_000;
const REVISION_CACHE_MS = 3_000;
const DATABASE_ISOLATION_PLACEHOLDERS = ["${VALIDATION_DATABASE_NAMESPACE}", "${VALIDATION_DATABASE_PATH}", "${VALIDATION_RUN_DIRECTORY}", "${VALIDATION_PORT}"];
const SIMULATED_CRITERION_ID = "SIMULATED";
const SIMULATED_CRITERION_TEXT = "Simulation uniquement : l’acceptation indépendante n’a pas été vérifiée.";
const SIMULATED_VALIDATION_MESSAGE = "Une simulation ne produit pas de preuve de validation indépendante.";
const SIMULATED_VALIDATION_OUTPUT = "Cette simulation n’a pas inspecté le code commité ni exécuté de validation indépendante.";
const SIMULATED_CHECKS_MESSAGE = "Une simulation ne peut pas détecter les commandes de vérification du dépôt.";
const FULL_KINDS: Array<QualityValidationRun["kind"]> = ["full"];
const TECHNICAL_KINDS: Array<QualityValidationRun["kind"]> = ["checks", "full"];
const FUNCTIONAL_KINDS: Array<QualityValidationRun["kind"]> = ["functional"];
const BROWSER_CONFIGURATION_MESSAGE = "Configure isolated services and an application start command before browser validation.";
const FUNCTIONAL_STALLED_MESSAGE = "The same browser scenarios still fail after a functional correction; inspect the evidence or create a correction card.";
const FUNCTIONAL_SOURCE_MISSING = "No completed real functional test with a failed required scenario is available for correction.";
const FOLLOW_UP_FUNCTIONAL_MISSING = "The source run has no failed or unverified functional scenario nor environment blocker.";
const INCOMPLETE_RUN_STATUSES: Array<QualityValidationRun["status"]> = ["queued", "running", "cancelled", "interrupted"];
const ACTIVE_ITERATION_MESSAGE = "A quality run or iteration is already active for this ticket.";
const ITERATION_MISMATCH_MESSAGE = "The requested iteration does not match the source validation diagnostic.";
const CHECKS_STALLED_MESSAGE = "The same technical checks still fail after a correction attempt; inspect the evidence or create a correction card.";
const RECOVERY_STALLED_MESSAGE = "The same read blocker persisted after a recovery attempt with the same code and permissions; inspect the evidence or create a correction card.";
const FOLLOW_UP_CHECKS_MISSING = "The source run has no recorded technical check failure.";
const FOLLOW_UP_BLOCKER_MISSING = "The source run has no recorded read blocker.";
const FOLLOW_UP_STALE_SOURCE = "The source run is no longer the latest run for this issue; refresh the validation before creating a correction card.";
const CORRECTION_KINDS = { checks: TECHNICAL_KINDS, functional: FUNCTIONAL_KINDS } satisfies Record<CorrectionTarget, Array<QualityValidationRun["kind"]>>;
const CORRECTION_STALLED_MESSAGES = { checks: CHECKS_STALLED_MESSAGE, functional: FUNCTIONAL_STALLED_MESSAGE } satisfies Record<CorrectionTarget, string>;
const CORRECTION_SOURCE_MISSING_MESSAGES = { checks: "No completed real technical check failure is available for correction.", functional: FUNCTIONAL_SOURCE_MISSING } satisfies Record<CorrectionTarget, string>;
const FOLLOW_UP_TITLE_LIMIT = 160;
const FOLLOW_UP_OUTPUT_LIMIT = 2_000;
const FOLLOW_UP_INLINE_LIMIT = 300;
const FOLLOW_UP_DESCRIPTION_LIMIT = 20_000;
const PREVIEW_STALE_MESSAGE = "The preview no longer matches the current pull request head; its validation cannot be accepted.";
const PREVIEW_PROTOCOLS = new Set(["http:", "https:"]);
const QUALITY_ADMISSION_KEY = "global-quality";

export interface QualityManagerDependencies {
  store: Store;
  system: SystemAdapter;
  repoMutex?: KeyedMutex;
  onChange?: (ticketId: string) => void;
  artifactDirectory?: string;
  closeAutonomousWork?: (ticketId: string) => Promise<boolean>;
}

type CorrectionTarget = Extract<QualityIterationTrigger, "checks" | "functional">;

interface ActiveQualityRun {
  runId: string;
  controller: AbortController;
  completion: Promise<void>;
  previewId?: string;
}

interface ManualQualityContext {
  requestId: string;
  deadlineAt: number;
  controller: AbortController;
  generation: number | null;
  journal: QualityJournal;
  sourceFingerprint: string;
  configFingerprint: string;
  acceptanceSnapshotId: string | null;
  timer?: ReturnType<typeof setTimeout>;
}

interface CheckCommand {
  name: string;
  command: string;
}

function fingerprint(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function sourceFingerprint(ticket: Ticket): string {
  return fingerprint([ticket.title, ticket.description, ticket.prdMarkdown]);
}

function configFingerprint(project: ProjectConfig): string {
  return fingerprint([project.scripts ?? null, project.validation ?? null]);
}

function commandSucceeded(result: ValidationCommandResult): boolean {
  return result.exitCode === 0 && !result.timedOut && !result.cancelled;
}

function technicalRunAccepted(run: QualityValidationRun): boolean {
  return run.technicalEvidenceAccepted || (run.kind === "checks" && run.evidenceAccepted);
}

function latestRun(quality: TicketQuality, kinds: Array<QualityValidationRun["kind"]>): QualityValidationRun | undefined {
  return quality.runs.filter((run) => !run.preview && kinds.includes(run.kind)).at(-1);
}

function defaultTrigger(mode: QualityIteration["mode"]): QualityIterationTrigger {
  return mode === "correction" ? "criteria" : "incomplete";
}

function followUpPrefix(ticketId: string): string {
  return `quality-follow-up:${ticketId}:`;
}

function groupDenials(denials: QualityPermissionDenial[]): Map<string, QualityPermissionDenial[]> {
  const groups = new Map<string, QualityPermissionDenial[]>();
  for (const denial of denials) {
    const key = denial.signature ?? JSON.stringify([denial.toolName, denial.blockReason, denial.commandShape]);
    groups.set(key, [...groups.get(key) ?? [], denial]);
  }
  return groups;
}

function sanitizeInline(value: string): string {
  return value.replace(/[\r\n`]+/g, " ").slice(0, FOLLOW_UP_INLINE_LIMIT);
}

function databaseIsolationProblem(project: ProjectConfig): string | null {
  const databaseUrl = project.validation?.environment?.DATABASE_URL;
  if (databaseUrl && !DATABASE_ISOLATION_PLACEHOLDERS.some((placeholder) => databaseUrl.includes(placeholder))) return "Validation DATABASE_URL must contain a run-specific database namespace, path, directory, or port placeholder.";
  return null;
}

function outputFor(result: ValidationCommandResult): string {
  return [`exitCode=${result.exitCode ?? "signal"}; timedOut=${result.timedOut}; cancelled=${result.cancelled}; durationMs=${result.durationMs}`, result.stdout, result.stderr].join("\n").slice(-OUTPUT_LIMIT);
}

function environmentFor(environment: QualityEnvironment, project: ProjectConfig): Record<string, string> {
  const dataDirectory = environment.dataDirectory ?? `${environment.directory}-data`;
  const values: Record<string, string> = {
    VALIDATION_RUN_DIRECTORY: dataDirectory,
    VALIDATION_PORT: String(environment.port),
    VALIDATION_DATABASE_NAMESPACE: environment.databaseNamespace,
    VALIDATION_DATABASE_PATH: validationDatabasePath(dataDirectory, environment.databaseNamespace),
    VALIDATION_BASE_URL: `http://127.0.0.1:${environment.port}`,
  };
  const configured: Record<string, string> = {};
  for (const [key, value] of Object.entries(project.validation?.environment ?? {})) {
    let expanded = value;
    for (const [name, replacement] of Object.entries(values)) expanded = expanded.replaceAll(`\${${name}}`, replacement);
    configured[key] = expanded;
  }
  return {
    ...configured,
    ...values,
    PORT: values.VALIDATION_PORT ?? "",
    HOST: "127.0.0.1",
    DATABASE_PATH: values.VALIDATION_DATABASE_PATH ?? "",
    DB_PATH: values.VALIDATION_DATABASE_PATH ?? "",
    DATABASE_URL: configured.DATABASE_URL ?? `file:${values.VALIDATION_DATABASE_PATH}`,
    COMPOSE_PROJECT_NAME: environment.databaseNamespace,
    WORKTREE_PATH: environment.directory,
  };
}

export class QualityManager {
  private readonly active = new Map<string, ActiveQualityRun>();
  private readonly pendingManual = new Map<string, { ticketId: string; previewId?: string; context: ManualQualityContext }>();
  private readonly journals = new Map<string, QualityJournal>();
  private readonly manualRuns = new Map<string, ManualQualityContext>();
  private readonly starts = new KeyedMutex();
  private readonly repoMutex: KeyedMutex;
  private readonly revisions = new Map<string, { key: string; at: number; revision: ValidationRevision }>();
  private shuttingDown = false;
  private correctionStarter?: (ticketId: string, iterationId: string) => Promise<void>;
  private iterationSettled?: (ticketId: string, iterationId: string, runId: string, verdict: QualityValidationRun["status"]) => Promise<void>;
  private iterationCancellation?: (ticketId: string, iterationId: string) => Promise<void>;

  setQualityIterationCorrectionStarter(starter: (ticketId: string, iterationId: string) => Promise<void>): void {
    this.correctionStarter = starter;
  }

  setQualityIterationSettled(settled: (ticketId: string, iterationId: string, runId: string, verdict: QualityValidationRun["status"]) => Promise<void>): void {
    this.iterationSettled = settled;
  }

  setQualityIterationCancellation(cancel: (ticketId: string, iterationId: string) => Promise<void>): void {
    this.iterationCancellation = cancel;
  }

  constructor(private readonly dependencies: QualityManagerDependencies) {
    this.repoMutex = dependencies.repoMutex ?? new KeyedMutex();
  }

  get(ticketId: string): TicketQuality {
    this.ticket(ticketId);
    return this.dependencies.store.getTicketQuality(ticketId);
  }

  setCriteria(ticketId: string, criteria: QualityCriterion[], createdBy: "user" | "agent" | "system" = "user", mode?: QualityValidationMode): QualityCriteriaSnapshot {
    const ticket = this.ticket(ticketId);
    this.requireNoIteration(ticketId);
    const selectedMode = mode ?? latestAcceptanceSnapshot(this.get(ticketId))?.mode ?? "repository";
    const snapshot = this.dependencies.store.createQualityCriteriaSnapshot(ticketId, { criteria, mode: selectedMode, sourceFingerprint: sourceFingerprint(ticket), createdBy });
    this.changed(ticketId);
    return snapshot;
  }

  async preflight(ticketId: string): Promise<QualityPreflight> {
    const ticket = this.ticket(ticketId);
    const project = getProject(ticket.project);
    const blockers: string[] = [];
    const reservations: string[] = [];
    const databaseProblem = databaseIsolationProblem(project);
    if (databaseProblem) blockers.push(databaseProblem);
    if (project.validation?.setupCommand && !project.validation.isolated) blockers.push("Validation setup requires an isolated environment.");
    let revision: string | null = null;
    try { revision = (await this.revision(ticket)).commitSha; } catch (error) { blockers.push(getErrorMessage(error)); }
    const criteria = latestAcceptanceSnapshot(this.get(ticketId));
    if (!criteria) reservations.push("Acceptance criteria will be prepared automatically during verification.");
    else if (criteria.sourceFingerprint !== sourceFingerprint(ticket)) reservations.push("The ticket or PRD changed after the acceptance criteria were recorded.");
    if (criteria?.mode === "browser") {
      if (!project.validation?.isolated) reservations.push("An isolated browser validation environment is not configured.");
      if (!project.validation?.startCommand) reservations.push("No isolated application start command is configured.");
    }
    if (this.active.has(ticketId)) blockers.push("A quality run is already active for this ticket.");
    return { ok: blockers.length === 0, blockers, reservations, revision, configFingerprint: configFingerprint(project) };
  }

  setManualClosureVerifier(verifier: (ticketId: string) => Promise<boolean>): void {
    this.dependencies.closeAutonomousWork = verifier;
  }

  async manualStart(ticketId: string, kind: QualityValidationRun["kind"], provider: Orchestrator | null, requestId: string, preview?: QualityPreviewTarget): Promise<QualityValidationRun> {
    const ticket = this.ticket(ticketId);
    const deadlineAt = Date.now() + (getProject(ticket.project).validation?.timeoutMs ?? QUALITY_DEFAULT_TIMEOUT_MS);
    const reservation = this.dependencies.store.reserveQualityRequest({ requestId, ticketId, origin: "manual", provider, kind, deadlineAt, previewId: preview?.previewId ?? null, revision: preview?.revision ?? null, parameterHash: fingerprint([ticketId, kind, provider, preview?.previewId ?? null, preview?.revision ?? null]) });
    if (reservation.reused) {
      const run = reservation.request.runId ? this.dependencies.store.getQualityRun(reservation.request.runId) : null;
      if (run) return run;
      throw new Error(reservation.request.reason ?? "This request has already been received. Use a new explicit request to try again.");
    }
    const controller = new AbortController();
    const journal = new QualityJournal(this.dependencies.store, requestId, { secrets: [...Object.values(getProject(ticket.project).validation?.environment ?? {}), ...(preview?.auth ? [preview.auth.username, preview.auth.password] : [])], onFailure: () => controller.abort() });
    const context: ManualQualityContext = { requestId, deadlineAt, controller, journal, sourceFingerprint: sourceFingerprint(ticket), configFingerprint: configFingerprint(getProject(ticket.project)), acceptanceSnapshotId: latestAcceptanceSnapshot(this.get(ticketId))?.id ?? null, generation: ticket.autonomousState?.execution?.generation ?? null };
    const timer = setTimeout(() => context.controller.abort(), Math.max(0, deadlineAt - Date.now()));
    context.timer = timer;
    this.pendingManual.set(requestId, { ticketId, previewId: preview?.previewId, context });
    try {
      return await this.bounded(context, this.starts.run(QUALITY_ADMISSION_KEY, async () => {
        this.assertManualTime(context);
        this.requireNoIteration(ticketId);
        if (this.dependencies.store.listQualityRunsPendingCleanup().length > 0 || this.hasAutonomousWriters(ticketId)) throw new Error("Quality cleanup or an active writer prevents a new manual validation.");
        let frozen: QualityCriteriaSnapshot | undefined;
        if (ticket.autonomous) {
          this.assertManualDelivery(ticketId, context, false);
          if (!await this.bounded(context, this.dependencies.closeAutonomousWork?.(ticketId) ?? Promise.resolve(false))) throw new Error("Current autonomous writer closure could not be confirmed.");
          this.assertManualDelivery(ticketId, context);
          const state = this.ticket(ticketId).autonomousState;
          const quality = this.get(ticketId);
          const delivered = quality.runs.find((run) => run.id === state?.fullRunId);
          const acceptance = quality.criteriaSnapshots.find((entry) => entry.id === state?.acceptanceSnapshotId);
          frozen = quality.criteriaSnapshots.find((entry) => entry.id === (kind === "functional" ? state?.functionalSnapshotId : state?.acceptanceSnapshotId));
          const browserProof = quality.runs.find((run) => run.id === state?.previewRunId);
          const deliveredProof = delivered?.status === "passed" && !delivered.simulated && delivered.evidenceAccepted && delivered.technicalEvidenceAccepted && delivered.cleanupStatus === "complete" && delivered.revision === state?.deliveryConfirmation?.revision;
          const functionalProof = browserProof?.status === "passed" && !browserProof.simulated && browserProof.evidenceAccepted && browserProof.cleanupStatus === "complete" && browserProof.revision === delivered?.revision && browserProof.criteriaSnapshotId === state?.functionalSnapshotId;
          if (!deliveredProof || !functionalProof || !acceptance || !frozen) throw new Error("The delivered validation proofs or their frozen criteria are unavailable.");
          const compatible = delivered.configFingerprint === configFingerprint(getProject(ticket.project)) && acceptance.sourceFingerprint === sourceFingerprint(ticket) && latestAcceptanceSnapshot(quality)?.id === acceptance.id;
          if (!compatible || kind === "combined" || kind === "functional" && frozen.baseSnapshotId !== acceptance.id) throw new Error("Delivered acceptance criteria or validation configuration changed; frozen retesting is unavailable.");
          if (preview?.autonomous) throw new Error("Create a new manual preview before retesting a completed autonomous delivery.");
        }
        if (preview) {
          const binding = qualityPreviewBindingSchema.parse(preview);
          const url = new URL(binding.url);
          if (!PREVIEW_PROTOCOLS.has(url.protocol) || url.username || url.password) throw new Error("Preview validation requires an HTTP(S) address without embedded credentials.");
          await this.bounded(context, this.requirePreviewHead(ticket, preview));
        }
        return this.launch(ticketId, kind, provider, undefined, undefined, preview, frozen, undefined, context);
      }));
    } catch (error) {
      this.dependencies.store.settleQualityRequest(requestId, context.controller.signal.aborted ? "interrupted" : "refused", journal.redact(getErrorMessage(error)));
      throw error;
    } finally {
      this.pendingManual.delete(requestId);
      if (!this.dependencies.store.getQualityRequest(requestId)?.runId) clearTimeout(timer);
    }
  }

  private assertManualTime(context: ManualQualityContext): void {
    if (context.controller.signal.aborted || Date.now() >= context.deadlineAt) throw new Error("Manual validation total deadline expired or the request was cancelled.");
  }

  private assertManualDelivery(ticketId: string, context: ManualQualityContext, requireClosure = true): void {
    this.assertManualTime(context);
    const ticket = this.ticket(ticketId);
    const state = ticket.autonomousState;
    const execution = state?.execution;
    if (sourceFingerprint(ticket) !== context.sourceFingerprint || configFingerprint(getProject(ticket.project)) !== context.configFingerprint || (latestAcceptanceSnapshot(this.get(ticketId))?.id ?? null) !== context.acceptanceSnapshotId) throw new Error("The ticket, acceptance criteria or validation configuration changed during manual retesting.");
    if (!ticket.autonomous || ticket.column !== "done" || ticket.stage !== "done" || ticket.slotId !== null || ticket.testing || !ticket.prUrl || state?.phase !== "completed" || !state.deliveryConfirmation || state.deliveryConfirmation.prUrl !== ticket.prUrl || state.deliveryConfirmation.revision !== state.revision || !state.fullRunId || !state.previewRunId || !execution || execution.generation !== context.generation || execution.userStopRequestedAt !== null || state.hostMutation || execution.closure.status === "unknown" || requireClosure && execution.closure.status !== "confirmed") throw new Error("A completed delivered ticket with current confirmed writer closure is required for manual retesting.");
  }

  private manualGuard(ticketId: string, context: ManualQualityContext): AgentExecutionGuard {
    const assertAllowed = () => { this.assertManualTime(context); if (this.ticket(ticketId).autonomous) this.assertManualDelivery(ticketId, context); };
    return { beforeStart: assertAllowed, assertAllowed, snapshot: () => { try { assertAllowed(); return { allowed: true, deadlineAt: context.deadlineAt }; } catch { return { allowed: false, deadlineAt: context.deadlineAt }; } }, subscribe: (listener) => this.dependencies.store.subscribeAutonomousExecution(ticketId, listener) };
  }

  private async bounded<T>(context: ManualQualityContext | undefined, operation: Promise<T>): Promise<T> {
    if (!context) return operation;
    this.assertManualTime(context);
    return new Promise<T>((resolve, reject) => {
      const aborted = () => reject(new Error("Manual validation total deadline expired or the request was cancelled."));
      context.controller.signal.addEventListener("abort", aborted, { once: true });
      operation.then(resolve, reject).finally(() => context.controller.signal.removeEventListener("abort", aborted)).catch(() => undefined);
    });
  }

  runChecks(ticketId: string): Promise<QualityValidationRun> {
    return this.start(ticketId, "checks", null);
  }

  validate(ticketId: string, provider: Orchestrator): Promise<QualityValidationRun> {
    return this.start(ticketId, "behavior", provider);
  }

  verify(ticketId: string, provider: Orchestrator): Promise<QualityValidationRun> {
    return this.start(ticketId, "full", provider);
  }

  testFeature(ticketId: string, provider: Orchestrator): Promise<QualityValidationRun> {
    return this.start(ticketId, "functional", provider);
  }

  verifyCombined(ticketId: string, provider: Orchestrator): Promise<QualityValidationRun> {
    return this.start(ticketId, "combined", provider);
  }

  verifyAutonomous(ticketId: string, provider: Orchestrator, expectedRevision: string): Promise<QualityValidationRun> {
    return this.starts.run(QUALITY_ADMISSION_KEY, async () => {
      this.requireNoIteration(ticketId);
      const ticket = this.ticket(ticketId);
      if (!ticket.autonomous || !ticket.autonomousState?.acceptanceSnapshotId) throw new Error("Freeze the autonomous plan before independent verification.");
      const snapshot = this.get(ticketId).criteriaSnapshots.find((entry) => entry.id === ticket.autonomousState?.acceptanceSnapshotId);
      if (!snapshot) throw new Error("The frozen autonomous acceptance snapshot is missing.");
      return this.launch(ticketId, "full", provider, undefined, undefined, undefined, snapshot, expectedRevision);
    });
  }

  async awaitRun(runId: string): Promise<QualityValidationRun> {
    const run = this.dependencies.store.getQualityRun(runId);
    if (!run) throw new Error("Quality run not found.");
    const active = this.active.get(run.ticketId);
    if (active?.runId === runId) await active.completion;
    return this.dependencies.store.getQualityRun(runId) ?? run;
  }

  testPreview(ticketId: string, provider: Orchestrator, target: QualityPreviewTarget): Promise<QualityValidationRun> {
    return this.starts.run(QUALITY_ADMISSION_KEY, async () => {
      this.requireNoIteration(ticketId);
      const binding = qualityPreviewBindingSchema.parse(target);
      const url = new URL(binding.url);
      if (!PREVIEW_PROTOCOLS.has(url.protocol) || url.username || url.password) throw new Error("Preview validation requires an HTTP(S) address without embedded credentials.");
      const ticket = this.ticket(ticketId);
      if (!target.autonomous && (ticket.column !== "done" || !ticket.prUrl || ticket.testing || ticket.slotId !== null)) throw new Error("Preview validation requires a completed ticket with a pull request and no active worktree session.");
      await this.requirePreviewHead(ticket, target);
      const frozen = target.autonomous ? this.get(ticketId).criteriaSnapshots.find((entry) => entry.id === ticket.autonomousState?.functionalSnapshotId) : undefined;
      if (target.autonomous && !frozen) throw new Error("The frozen autonomous functional snapshot is missing.");
      return this.launch(ticketId, "functional", provider, undefined, undefined, target, frozen);
    });
  }

  private async requirePreviewHead(ticket: Ticket, target: QualityPreviewTarget): Promise<void> {
    const current = this.ticket(ticket.id);
    if (target.autonomous) {
      if (!current.autonomous || !current.autonomousState?.plan || current.branch !== ticket.branch || current.autonomousState.revision !== target.revision || sourceFingerprint(current) !== sourceFingerprint(ticket)) throw new Error(PREVIEW_STALE_MESSAGE);
      await target.assertCurrent?.();
      const project = getProject(ticket.project);
      const settings = this.dependencies.store.getPreviewProjectSettings(ticket.project);
      if (project.vcsProvider !== "github" || !current.branch || !this.dependencies.system.readPreviewBranchSource) throw new Error(PREVIEW_STALE_MESSAGE);
      const head = await this.dependencies.system.readPreviewBranchSource(project.repoPath, current.branch, settings.recipePath);
      if (head.revision !== target.revision) throw new Error(PREVIEW_STALE_MESSAGE);
      return;
    }
    if (current.project !== ticket.project || current.prUrl !== ticket.prUrl || current.column !== "done" || current.testing || current.slotId !== null || sourceFingerprint(current) !== sourceFingerprint(ticket)) throw new Error(PREVIEW_STALE_MESSAGE);
    const project = getProject(ticket.project);
    if (project.vcsProvider !== "github" || !ticket.prUrl) throw new Error("Preview validation requires a GitHub pull request.");
    await target.assertCurrent?.();
    const head = await this.dependencies.system.readPullRequestHead(project.repoPath, ticket.prUrl, project.vcsProvider);
    if (!head.ok || head.commitSha !== target.revision) throw new Error(PREVIEW_STALE_MESSAGE);
  }

  private async requirePreviewRun(run: QualityValidationRun, ticket: Ticket, target: QualityPreviewTarget): Promise<void> {
    if (run.configFingerprint !== configFingerprint(getProject(ticket.project))) throw new Error(PREVIEW_STALE_MESSAGE);
    const quality = this.get(ticket.id);
    const currentRun = quality.runs.find((entry) => entry.id === run.id);
    const snapshot = quality.criteriaSnapshots.find((entry) => entry.id === currentRun?.criteriaSnapshotId);
    if (snapshot && snapshot.baseSnapshotId !== (latestAcceptanceSnapshot(quality)?.id ?? null)) throw new Error(PREVIEW_STALE_MESSAGE);
    await this.requirePreviewHead(ticket, target);
  }

  private requireNoIteration(ticketId: string): void {
    if (this.dependencies.store.getActiveQualityIteration(ticketId)) throw new Error("A quality iteration is already active for this ticket.");
  }

  private iterationMode(run: QualityValidationRun | undefined, quality: TicketQuality): QualityIteration["mode"] | null {
    if (!run || run.simulated || run.status === "queued" || run.status === "running") return null;
    const snapshot = quality.criteriaSnapshots.find((entry) => entry.id === run.criteriaSnapshotId);
    const contradicted = run.evidenceAccepted && snapshot?.criteria.some((criterion) => criterion.required && quality.evidence.some((entry) => entry.runId === run.id && entry.criterionId === criterion.id && entry.authority === "agent" && entry.status === "failed"));
    if (contradicted) return "correction";
    if (run.status === "passed" && run.evidenceAccepted && run.technicalEvidenceAccepted && run.cleanupStatus === "complete") return null;
    return "recovery";
  }

  private parkedCorrection(ticket: Ticket, sourceRunId: string, quality: TicketQuality): QualityIteration | undefined {
    if (ticket.testing) return undefined;
    const slot = ticket.slotId === null ? null : this.dependencies.store.getSlot(ticket.slotId);
    if (slot?.ticketId !== ticket.id) return undefined;
    let runId = sourceRunId;
    for (let remaining = quality.iterations.length; remaining > 0; remaining -= 1) {
      const parent = quality.iterations.find((entry) => entry.resultRunId === runId);
      if (!parent || parent.prUrl !== ticket.prUrl || parent.headBranch !== ticket.branch || parent.status === "completed" || parent.status === "queued" || parent.status === "correcting" || parent.status === "verifying") return undefined;
      if (parent.mode === "correction") return parent;
      runId = parent.sourceRunId;
    }
    return undefined;
  }

  private failingChecks(run: QualityValidationRun, quality: TicketQuality): QualityEvidence[] {
    return quality.evidence.filter((entry) => entry.runId === run.id && entry.kind === "command" && entry.authority === "server" && entry.status === "failed" && CHECK_NAMES.some((name) => name === entry.summary));
  }

  private correctionFailures(target: CorrectionTarget, run: QualityValidationRun, quality: TicketQuality): string[] {
    if (target === "checks") return this.failingChecks(run, quality).map((entry) => entry.summary);
    return this.failingScenarios(run, quality).map((entry) => entry.criterionId ?? entry.id);
  }

  private correctionCandidate(target: CorrectionTarget, quality: TicketQuality): QualityValidationRun | undefined {
    const run = latestRun(quality, CORRECTION_KINDS[target]);
    if (!run || run.simulated || INCOMPLETE_RUN_STATUSES.includes(run.status) || run.cleanupStatus !== "complete") return undefined;
    const accepted = target === "checks" ? technicalRunAccepted(run) : run.evidenceAccepted;
    return accepted && this.correctionFailures(target, run, quality).length > 0 ? run : undefined;
  }

  private correctionStalled(target: CorrectionTarget, source: QualityValidationRun, quality: TicketQuality): boolean {
    const failures = new Set(this.correctionFailures(target, source, quality));
    return quality.iterations.some((iteration) => {
      if (iteration.resultRunId !== source.id || iteration.mode !== "correction" || iteration.trigger !== target) return false;
      const previous = quality.runs.find((run) => run.id === iteration.sourceRunId);
      if (!previous) return false;
      const previousFailures = new Set(this.correctionFailures(target, previous, quality));
      return [...failures].every((failure) => previousFailures.has(failure));
    });
  }

  private repeatedBlockers(latestFull: QualityValidationRun | undefined, quality: TicketQuality): Set<string> {
    if (!latestFull) return new Set();
    const iteration = quality.iterations.find((entry) => entry.resultRunId === latestFull.id && entry.mode === "recovery");
    const signatures = (latestFull.diagnostic?.permissionDenials ?? []).flatMap((denial) => denial.signature === null ? [] : [denial.signature]);
    if (!iteration || signatures.length === 0) return new Set();
    const previous = quality.runs.find((run) => run.id === iteration.sourceRunId);
    const previousSignatures = new Set((previous?.diagnostic?.permissionDenials ?? []).flatMap((denial) => denial.signature === null ? [] : [denial.signature]));
    return signatures.every((signature) => previousSignatures.has(signature)) ? new Set(signatures) : new Set();
  }

  private async targetedCorrectionPullRequest(target: CorrectionTarget, ticket: Ticket, source: QualityValidationRun, quality: TicketQuality, retryOfIterationId?: string): Promise<{ prUrl: string; headBranch: string }> {
    await this.requireFreshSource(ticket, source, quality, retryOfIterationId, CORRECTION_KINDS[target]);
    const linked = await this.correctionPullRequest(ticket, source);
    if (!this.correctionStarter) throw new Error("Quality correction is unavailable.");
    if (this.correctionStalled(target, source, quality)) throw new Error(CORRECTION_STALLED_MESSAGES[target]);
    return linked;
  }

  private async targetedCorrectionAction(target: CorrectionTarget, ticket: Ticket, quality: TicketQuality, busy: boolean): Promise<QualityIterationActions["checksCorrection"]> {
    const source = this.correctionCandidate(target, quality);
    const retryOfIterationId = source ? quality.iterations.filter((entry) => entry.sourceRunId === source.id && entry.mode === "correction" && entry.trigger === target && entry.status !== "completed").at(-1)?.id ?? null : null;
    let reason: string | null = null;
    if (!source) reason = CORRECTION_SOURCE_MISSING_MESSAGES[target];
    else if (busy) reason = ACTIVE_ITERATION_MESSAGE;
    else {
      try { await this.targetedCorrectionPullRequest(target, ticket, source, quality, retryOfIterationId ?? undefined); } catch (error) { reason = getErrorMessage(error); }
    }
    return { available: reason === null, reason, sourceRunId: source?.id ?? null, retryOfIterationId };
  }

  private freshFunctionalSnapshot(ticket: Ticket): QualityCriteriaSnapshot | undefined {
    const quality = this.get(ticket.id);
    const snapshot = latestFunctionalSnapshot(quality);
    if (!snapshot || snapshot.sourceFingerprint !== sourceFingerprint(ticket)) return undefined;
    return snapshot.baseSnapshotId === (latestAcceptanceSnapshot(quality)?.id ?? null) ? snapshot : undefined;
  }

  private requiredScenarios(run: QualityValidationRun, quality: TicketQuality): QualityCriterion[] {
    return quality.criteriaSnapshots.find((entry) => entry.id === run.criteriaSnapshotId)?.criteria.filter((criterion) => criterion.required) ?? [];
  }

  private scenarioEvidence(run: QualityValidationRun, quality: TicketQuality, criterionId: string): QualityEvidence | undefined {
    return quality.evidence.filter((entry) => entry.runId === run.id && entry.criterionId === criterionId && entry.authority === "agent").at(-1);
  }

  private failingScenarios(run: QualityValidationRun, quality: TicketQuality): QualityEvidence[] {
    return this.requiredScenarios(run, quality).flatMap((criterion) => {
      const evidence = this.scenarioEvidence(run, quality, criterion.id);
      return evidence?.status === "failed" ? [evidence] : [];
    });
  }

  private functionalProblems(quality: TicketQuality): QualityProblem[] {
    const run = latestRun(quality, FUNCTIONAL_KINDS);
    if (!run || run.simulated || INCOMPLETE_RUN_STATUSES.includes(run.status)) return [];
    const problems: QualityProblem[] = [];
    for (const criterion of this.requiredScenarios(run, quality)) {
      const evidence = this.scenarioEvidence(run, quality, criterion.id);
      if (evidence?.status === "passed") continue;
      problems.push({ id: `scenario:${run.id}:${criterion.id}`, kind: evidence?.status === "failed" ? "scenario_failed" : "scenario_unverified", authority: "agent", runId: run.id, summary: criterion.text, evidenceId: evidence?.id ?? null, criterionId: criterion.id, blockReason: null, category: null, toolName: null, commandShape: null, occurrences: 1, repeated: false, blockerCode: null });
    }
    (run.diagnostic?.blockers ?? []).forEach((blocker, index) => {
      problems.push({ id: `functional-blocker:${run.id}:${index}`, kind: "functional_blocker", authority: "server", runId: run.id, summary: blocker.summary.trim() || blocker.code, evidenceId: null, criterionId: blocker.scenarioId, blockReason: null, category: null, toolName: null, commandShape: null, occurrences: 1, repeated: false, blockerCode: blocker.code });
    });
    return problems;
  }

  private functionalFollowUpAvailable(run: QualityValidationRun, quality: TicketQuality): boolean {
    if (run.simulated || INCOMPLETE_RUN_STATUSES.includes(run.status)) return false;
    if ((run.diagnostic?.blockers.length ?? 0) > 0) return true;
    return this.requiredScenarios(run, quality).some((criterion) => this.scenarioEvidence(run, quality, criterion.id)?.status !== "passed");
  }

  private problems(quality: TicketQuality, repeated: Set<string>): QualityProblem[] {
    const problems: QualityProblem[] = this.functionalProblems(quality);
    const technical = latestRun(quality, TECHNICAL_KINDS);
    if (technical && !technical.simulated && !INCOMPLETE_RUN_STATUSES.includes(technical.status)) {
      for (const entry of this.failingChecks(technical, quality)) {
        problems.push({ id: `check:${entry.id}`, kind: "technical_check", authority: "server", runId: technical.id, summary: entry.summary, evidenceId: entry.id, criterionId: null, blockReason: null, category: null, toolName: null, commandShape: null, occurrences: 1, repeated: false, blockerCode: null });
      }
    }
    const full = latestRun(quality, FULL_KINDS);
    if (!full || full.simulated || INCOMPLETE_RUN_STATUSES.includes(full.status)) return problems;
    for (const [key, group] of groupDenials(full.diagnostic?.permissionDenials ?? [])) {
      const [denial] = group;
      if (!denial) continue;
      problems.push({ id: `blocker:${full.id}:${key}`, kind: "read_blocker", authority: "server", runId: full.id, summary: denial.toolName, evidenceId: null, criterionId: null, blockReason: denial.blockReason, category: qualityBlockerCategory(denial.blockReason), toolName: denial.toolName, commandShape: denial.commandShape, occurrences: group.length, repeated: denial.signature !== null && repeated.has(denial.signature), blockerCode: null });
    }
    const snapshot = quality.criteriaSnapshots.find((entry) => entry.id === full.criteriaSnapshotId);
    for (const criterion of snapshot?.criteria ?? []) {
      if (!criterion.required) continue;
      const evidence = quality.evidence.filter((entry) => entry.runId === full.id && entry.criterionId === criterion.id && entry.authority === "agent").at(-1);
      if (evidence?.status === "passed") continue;
      problems.push({ id: `criterion:${full.id}:${criterion.id}`, kind: evidence?.status === "failed" ? "criterion_failed" : "criterion_unverified", authority: "agent", runId: full.id, summary: criterion.text, evidenceId: evidence?.id ?? null, criterionId: criterion.id, blockReason: null, category: null, toolName: null, commandShape: null, occurrences: 1, repeated: false, blockerCode: null });
    }
    return problems;
  }

  private followUpSource(quality: TicketQuality, issue: QualityFollowUpIssue): { run: QualityValidationRun | undefined; reason: string | null } {
    if (issue === "functional") {
      const run = latestRun(quality, FUNCTIONAL_KINDS);
      return { run, reason: run && this.functionalFollowUpAvailable(run, quality) ? null : FOLLOW_UP_FUNCTIONAL_MISSING };
    }
    if (issue === "checks") {
      const run = latestRun(quality, TECHNICAL_KINDS);
      const available = run && !run.simulated && !INCOMPLETE_RUN_STATUSES.includes(run.status) && this.failingChecks(run, quality).length > 0;
      return { run, reason: available ? null : FOLLOW_UP_CHECKS_MISSING };
    }
    const run = latestRun(quality, FULL_KINDS);
    const available = run && !run.simulated && !INCOMPLETE_RUN_STATUSES.includes(run.status) && (run.diagnostic?.permissionDenials.length ?? 0) > 0;
    return { run, reason: available ? null : FOLLOW_UP_BLOCKER_MISSING };
  }

  private followUps(ticketId: string): QualityFollowUp[] {
    const prefix = followUpPrefix(ticketId);
    return this.dependencies.store.listTicketCreationRequestsByPrefix(prefix).flatMap((request) => {
      const rest = request.requestId.slice(prefix.length);
      const separator = rest.lastIndexOf(":");
      const issue = qualityFollowUpIssueSchema.safeParse(rest.slice(separator + 1));
      const sourceRunId = rest.slice(0, Math.max(separator, 0));
      const ticket = this.dependencies.store.getTicket(request.ticketId);
      if (separator <= 0 || !issue.success || !ticket) return [];
      return [{ issue: issue.data, sourceRunId, ticketId: ticket.id, title: ticket.title, project: ticket.project }];
    });
  }

  followUpDraft(ticketId: string, input: CreateQualityFollowUpInput): { requestId: string; title: string; description: string; project: string; existing: { ticketId: string; title: string; project: string } | null } {
    const ticket = this.ticket(ticketId);
    if (!isProjectKey(input.project)) throw new Error("Unknown target project for the correction card.");
    const quality = this.get(ticketId);
    const run = quality.runs.find((entry) => entry.id === input.sourceRunId);
    if (!run || INCOMPLETE_RUN_STATUSES.includes(run.status)) throw new Error("The source run is still running or does not belong to this ticket.");
    if (run.simulated) throw new Error("Simulated runs cannot create correction cards.");
    if (this.followUpSource(quality, input.issue).run?.id !== run.id) throw new Error(FOLLOW_UP_STALE_SOURCE);
    const failing = this.failingChecks(run, quality);
    const denials = run.diagnostic?.permissionDenials ?? [];
    if (input.issue === "checks" && failing.length === 0) throw new Error(FOLLOW_UP_CHECKS_MISSING);
    if (input.issue === "blocker" && denials.length === 0) throw new Error(FOLLOW_UP_BLOCKER_MISSING);
    if (input.issue === "functional" && !this.functionalFollowUpAvailable(run, quality)) throw new Error(FOLLOW_UP_FUNCTIONAL_MISSING);
    const requestId = `${followUpPrefix(ticketId)}${run.id}:${input.issue}`;
    const request = this.dependencies.store.listTicketCreationRequestsByPrefix(requestId).find((entry) => entry.requestId === requestId);
    const existingTicket = request ? this.dependencies.store.getTicket(request.ticketId) : null;
    let prefix = "Diagnostiquer le blocage de validation";
    if (input.issue === "checks") prefix = "Corriger les contrôles en échec";
    else if (input.issue === "functional") prefix = "Corriger le test fonctionnel en échec";
    const title = `${prefix} — ${ticket.title}`.slice(0, FOLLOW_UP_TITLE_LIMIT).trim();
    const lines = [
      "## Origine",
      "",
      `- Ticket source : ${ticket.id} — ${ticket.title}`,
      `- Projet source : ${ticket.project}`,
      `- Exécution source : ${run.id} (${run.kind})`,
      `- Révision : ${run.revision}`,
      `- Fournisseur du validateur : ${run.provider ?? "aucun"}`,
      ...(ticket.prUrl ? [`- PR : ${ticket.prUrl}`] : []),
      "",
    ];
    if (input.issue === "checks") {
      lines.push("## Contrôles en échec", "");
      for (const entry of failing) {
        lines.push(`### ${entry.summary}`, "", `- Commande : \`${sanitizeInline(entry.command ?? "")}\``, `- Code de sortie : ${entry.exitCode ?? "signal"}`, `- Délai dépassé : ${entry.timedOut ? "oui" : "non"}`, "", "```text", entry.output.slice(-FOLLOW_UP_OUTPUT_LIMIT).replaceAll("```", "'''"), "```", "");
      }
    } else if (input.issue === "functional") {
      const snapshot = quality.criteriaSnapshots.find((entry) => entry.id === run.criteriaSnapshotId);
      lines.push("## Scénarios du test fonctionnel", "");
      for (const criterion of snapshot?.criteria ?? []) {
        const evidence = this.scenarioEvidence(run, quality, criterion.id);
        const actions = evidence?.scenario?.actions.map((action) => `${sanitizeInline(action.tool)}${action.ok ? "" : " (non observé)"}`).join(", ");
        lines.push(
          `### ${sanitizeInline(criterion.id)} — ${sanitizeInline(criterion.text)}`, "",
          `- Requis : ${criterion.required ? "oui" : "non"}`,
          `- Attendu : ${sanitizeInline(criterion.expected ?? criterion.text)}`,
          `- Statut : ${evidence?.status ?? "non vérifié"}`,
          `- Observé : ${sanitizeInline(evidence?.scenario?.observed || evidence?.summary || "aucune observation")}`,
          `- Actions : ${actions || "aucune"}`,
          "",
        );
      }
      const blockers = run.diagnostic?.blockers ?? [];
      if (blockers.length > 0) {
        lines.push("## Blocages d’environnement", "");
        for (const blocker of blockers) lines.push(`- ${blocker.code}${blocker.scenarioId ? ` (scénario ${sanitizeInline(blocker.scenarioId)})` : ""} : ${sanitizeInline(blocker.summary)}`);
        lines.push("");
      }
      if ((snapshot?.uncovered.length ?? 0) > 0) {
        lines.push("## Critères non vérifiables dans le navigateur", "");
        for (const entry of snapshot?.uncovered ?? []) lines.push(`- ${sanitizeInline(entry.criterionId)} : ${sanitizeInline(entry.reason)}`);
        lines.push("");
      }
    } else {
      lines.push("## Blocages de lecture", "");
      for (const [, group] of groupDenials(denials)) {
        const [denial] = group;
        if (!denial) continue;
        let workspace = "inconnu";
        if (denial.workspaceAvailable !== null) workspace = denial.workspaceAvailable ? "oui" : "non";
        lines.push(`- Outil : ${sanitizeInline(denial.toolName)} ; forme de commande : \`${sanitizeInline(denial.commandShape ?? "inconnue")}\` ; raison : ${denial.blockReason ?? "inconnue"} ; catégorie : ${qualityBlockerCategory(denial.blockReason)} ; occurrences : ${group.length} ; espace de travail disponible : ${workspace}`);
      }
      lines.push("");
    }
    lines.push(
      "## Prérequis non résolus",
      "",
      "- Cause non établie : diagnostiquer avant de corriger.",
      ...(input.issue === "blocker" ? ["- Pour un blocage, ne pas élargir les permissions."] : []),
      "- Vérifier que le dépôt cible est le bon.",
      "",
      "Cette carte est passive : elle ne prouve pas que la validation d’origine a réussi.",
    );
    return {
      requestId, title, description: lines.join("\n").slice(0, FOLLOW_UP_DESCRIPTION_LIMIT), project: input.project,
      existing: existingTicket ? { ticketId: existingTicket.id, title: existingTicket.title, project: existingTicket.project } : null,
    };
  }

  async iterationActions(ticketId: string): Promise<QualityIterationActions> {
    const ticket = this.ticket(ticketId);
    const quality = this.get(ticketId);
    const source = latestRun(quality, FULL_KINDS);
    const recommendedMode = this.iterationMode(source, quality);
    const latest = recommendedMode ? quality.iterations.filter((entry) => entry.sourceRunId === source?.id && entry.mode === recommendedMode && (entry.trigger ?? defaultTrigger(entry.mode)) === defaultTrigger(recommendedMode)).at(-1) : undefined;
    const retryOfIterationId = latest && latest.status !== "completed" ? latest.id : null;
    const busy = this.active.has(ticketId) || this.dependencies.store.getActiveQualityIteration(ticketId) !== null;
    let reason: string | null = null;
    if (!source || !recommendedMode) reason = "No incomplete or contradicted full validation is available for iteration.";
    else if (busy) reason = ACTIVE_ITERATION_MESSAGE;
    else {
      try { await this.requireFreshSource(ticket, source, quality, retryOfIterationId ?? undefined, FULL_KINDS); } catch (error) { reason = getErrorMessage(error); }
    }
    let correctionReason = reason;
    if (!correctionReason && recommendedMode === "correction" && source) {
      try { await this.correctionPullRequest(ticket, source); } catch (error) { correctionReason = getErrorMessage(error); }
      if (!this.correctionStarter) correctionReason = "Quality correction is unavailable.";
    }
    const repeated = this.repeatedBlockers(source, quality);
    let recoveryReason = reason;
    if (!recoveryReason && recommendedMode === "recovery" && repeated.size > 0) recoveryReason = RECOVERY_STALLED_MESSAGE;
    const checksCorrection = await this.targetedCorrectionAction("checks", ticket, quality, busy);
    const functional = await this.targetedCorrectionAction("functional", ticket, quality, busy);
    const checksFollowUp = this.followUpSource(quality, "checks");
    const blockerFollowUp = this.followUpSource(quality, "blocker");
    const functionalFollowUp = this.followUpSource(quality, "functional");
    return {
      sourceRunId: source?.id ?? null, recommendedMode, retryOfIterationId,
      recovery: { available: recoveryReason === null && recommendedMode === "recovery", reason: recoveryReason ?? (recommendedMode === "recovery" ? null : "Observed code nonconformance requires correction before full verification.") },
      correction: { available: correctionReason === null && recommendedMode === "correction", reason: correctionReason ?? (recommendedMode === "correction" ? null : "No required criterion has an attributed code nonconformance.") },
      checksCorrection,
      functional,
      followUp: {
        checks: { available: checksFollowUp.reason === null, reason: checksFollowUp.reason, sourceRunId: checksFollowUp.run?.id ?? null },
        blocker: { available: blockerFollowUp.reason === null, reason: blockerFollowUp.reason, sourceRunId: blockerFollowUp.run?.id ?? null },
        functional: { available: functionalFollowUp.reason === null, reason: functionalFollowUp.reason, sourceRunId: functionalFollowUp.run?.id ?? null },
      },
      problems: this.problems(quality, repeated),
      followUps: this.followUps(ticketId),
    };
  }

  private async requireFreshSource(ticket: Ticket, source: QualityValidationRun, quality: TicketQuality, retryOfIterationId: string | undefined, kinds: Array<QualityValidationRun["kind"]>): Promise<void> {
    if (ticket.testing) throw new Error("Finish the interactive test session before starting a quality iteration.");
    const latest = latestRun(quality, kinds);
    const functional = kinds.includes("functional");
    let staleMessage = "The source validation is no longer the latest full run.";
    if (kinds.includes("checks")) staleMessage = "The source technical run is no longer the latest technical run.";
    else if (functional) staleMessage = "The source functional test is no longer the latest functional test.";
    if (latest?.id !== source.id) throw new Error(staleMessage);
    const snapshot = functional ? latestFunctionalSnapshot(quality) : latestAcceptanceSnapshot(quality);
    const baseChanged = functional && snapshot?.baseSnapshotId !== (latestAcceptanceSnapshot(quality)?.id ?? null);
    if ((snapshot?.id ?? null) !== source.criteriaSnapshotId || snapshot && snapshot.sourceFingerprint !== sourceFingerprint(ticket) || baseChanged) throw new Error("The ticket or acceptance criteria changed after the source validation.");
    if (source.configFingerprint !== configFingerprint(getProject(ticket.project))) throw new Error("Validation configuration changed after the source validation.");
    const revision = await this.revision(ticket, true);
    const predecessor = quality.iterations.find((entry) => entry.id === retryOfIterationId);
    const slot = ticket.slotId === null ? null : this.dependencies.store.getSlot(ticket.slotId);
    const retainedCorrection = predecessor?.mode === "correction" && predecessor.sourceRunId === source.id && predecessor.headBranch === ticket.branch && (predecessor.status === "failed" || predecessor.status === "interrupted" || predecessor.status === "cancelled") && slot?.ticketId === ticket.id;
    if (ticket.slotId !== null && !retainedCorrection && !this.parkedCorrection(ticket, source.id, quality)) throw new Error("Another implementation session owns this ticket worktree; quality iteration is unavailable.");
    if (!retainedCorrection && (revision.commitSha !== source.revision || !revision.clean || revision.fingerprint !== source.fingerprint)) throw new Error("The current source revision no longer matches the validation to iterate.");
  }

  private async correctionPullRequest(ticket: Ticket, source: QualityValidationRun): Promise<{ prUrl: string; headBranch: string }> {
    if (!ticket.prUrl || !ticket.branch) throw new Error("Correction requires the existing open pull request and its branch.");
    const project = getProject(ticket.project);
    const prs = await this.dependencies.system.listOpenPrs(project.repoPath, project.vcsProvider);
    const pr = prs.find((entry) => entry.url === ticket.prUrl && entry.headBranch === ticket.branch);
    if (!pr) throw new Error("The existing pull request is closed, merged, unavailable, or no longer targets the ticket branch.");
    const head = await this.dependencies.system.readReviewHead(project.repoPath, pr.url, project.vcsProvider);
    if (!head.ok || !head.commitSha || head.commitSha !== source.revision) throw new Error("The open pull request head no longer matches the source validation.");
    return { prUrl: pr.url, headBranch: pr.headBranch };
  }

  startQualityIteration(ticketId: string, input: StartQualityIterationInput): Promise<QualityIteration> {
    return this.starts.run(QUALITY_ADMISSION_KEY, async () => {
      if (this.shuttingDown) throw new Error("Quality validation is shutting down.");
      if (!isQualityOwner()) throw new Error(NOT_QUALITY_OWNER_MESSAGE);
      const ticket = this.ticket(ticketId);
      const quality = this.get(ticketId);
      const trigger = input.trigger ?? defaultTrigger(input.mode);
      const duplicate = quality.iterations.find((entry) => entry.sourceRunId === input.sourceRunId && entry.mode === input.mode && entry.retryOfIterationId === (input.retryOfIterationId ?? null) && (entry.trigger ?? defaultTrigger(entry.mode)) === trigger);
      if (duplicate) return duplicate;
      if (input.mode === "correction" && ticket.slotId !== null && this.dependencies.store.getImplementationPlan(ticketId)?.recovery) throw new Error("Resume the held implementation recovery before starting another quality correction.");
      this.requireNoIteration(ticketId);
      if (this.active.has(ticketId)) throw new Error("A quality run is already active for this ticket.");
      const source = quality.runs.find((run) => run.id === input.sourceRunId);
      if (!source || source.simulated) throw new Error(ITERATION_MISMATCH_MESSAGE);
      let linked = { prUrl: ticket.prUrl, headBranch: ticket.branch };
      let evidenceIds: string[] = [];
      if (input.mode === "correction" && trigger === "checks") {
        if (this.correctionCandidate("checks", quality)?.id !== source.id) throw new Error(ITERATION_MISMATCH_MESSAGE);
        linked = await this.targetedCorrectionPullRequest("checks", ticket, source, quality, input.retryOfIterationId);
        evidenceIds = this.failingChecks(source, quality).map((entry) => entry.id);
      } else if (input.mode === "correction" && trigger === "functional") {
        if (this.correctionCandidate("functional", quality)?.id !== source.id) throw new Error(ITERATION_MISMATCH_MESSAGE);
        linked = await this.targetedCorrectionPullRequest("functional", ticket, source, quality, input.retryOfIterationId);
        evidenceIds = this.failingScenarios(source, quality).map((entry) => entry.id);
      } else if (input.mode === "correction" && trigger === "criteria") {
        if (this.iterationMode(source, quality) !== "correction") throw new Error(ITERATION_MISMATCH_MESSAGE);
        await this.requireFreshSource(ticket, source, quality, input.retryOfIterationId, FULL_KINDS);
        if (!this.correctionStarter) throw new Error("Quality correction is unavailable.");
        linked = await this.correctionPullRequest(ticket, source);
        const snapshot = quality.criteriaSnapshots.find((entry) => entry.id === source.criteriaSnapshotId);
        evidenceIds = quality.evidence.filter((entry) => entry.runId === source.id && entry.authority === "agent" && entry.status === "failed" && snapshot?.criteria.some((criterion) => criterion.required && criterion.id === entry.criterionId)).map((entry) => entry.id);
      } else if (input.mode === "recovery" && trigger === "incomplete") {
        if (this.iterationMode(source, quality) !== "recovery") throw new Error(ITERATION_MISMATCH_MESSAGE);
        await this.requireFreshSource(ticket, source, quality, input.retryOfIterationId, FULL_KINDS);
        if (this.repeatedBlockers(source, quality).size > 0) throw new Error(RECOVERY_STALLED_MESSAGE);
      } else throw new Error(ITERATION_MISMATCH_MESSAGE);
      const iteration = this.dependencies.store.createQualityIteration({ ...input, ticketId, ...linked, trigger, evidenceIds });
      this.changed(ticketId);
      try {
        if (iteration.mode === "recovery") await this.launch(ticketId, "full", iteration.provider, iteration);
        else void this.correctionStarter?.(ticketId, iteration.id).catch((error: unknown) => {
          if (this.dependencies.store.getActiveQualityIteration(ticketId)?.id === iteration.id) this.dependencies.store.updateQualityIteration(iteration.id, { status: "failed", diagnostic: getErrorMessage(error), completedAt: Date.now() });
          this.changed(ticketId);
          log.warn("quality correction startup failed", { ticketId, iterationId: iteration.id, error: getErrorMessage(error) });
        });
      } catch (error) {
        if (this.dependencies.store.getActiveQualityIteration(ticketId)?.id === iteration.id) this.dependencies.store.updateQualityIteration(iteration.id, { status: "failed", diagnostic: getErrorMessage(error), completedAt: Date.now() });
        this.changed(ticketId);
        throw error;
      }
      return this.dependencies.store.getQualityIteration(iteration.id) ?? iteration;
    });
  }

  async verifyQualityIteration(ticketId: string, worktreePath: string, iterationId: string): Promise<void> {
    await this.starts.run(QUALITY_ADMISSION_KEY, async () => {
      const iteration = this.dependencies.store.getQualityIteration(iterationId);
      if (!iteration || iteration.ticketId !== ticketId || iteration.mode !== "correction") throw new Error("The correction iteration is not ready for independent verification.");
      if (iteration.resultRunId !== null) return;
      if (iteration.status !== "verifying") throw new Error("The correction iteration is not ready for independent verification.");
      const ticket = this.ticket(ticketId);
      const slot = ticket.slotId === null ? null : this.dependencies.store.getSlot(ticket.slotId);
      if (!slot || slot.ticketId !== ticketId || worktreePath !== join(SLOTS_ROOT, `slot-${slot.id}`)) throw new Error("Independent correction verification must use the ticket's assigned worktree.");
      await this.launch(ticketId, iteration.trigger === "functional" ? "functional" : "full", iteration.provider, iteration, worktreePath);
    });
  }

  private start(ticketId: string, kind: QualityValidationRun["kind"], provider: Orchestrator | null): Promise<QualityValidationRun> {
    return this.starts.run(QUALITY_ADMISSION_KEY, async () => {
      this.requireNoIteration(ticketId);
      return this.launch(ticketId, kind, provider);
    });
  }

  private async launch(ticketId: string, kind: QualityValidationRun["kind"], provider: Orchestrator | null, iteration?: QualityIteration, sourcePath?: string, preview?: QualityPreviewTarget, frozenCriteria?: QualityCriteriaSnapshot, expectedRevision?: string, manual?: ManualQualityContext): Promise<QualityValidationRun> {
    if (this.shuttingDown) throw new Error("Quality validation is shutting down.");
    if (provider !== null && !isQualityOwner()) throw new Error(NOT_QUALITY_OWNER_MESSAGE);
    if (this.active.has(ticketId)) throw new Error("A quality run is already active for this ticket.");
    if (this.dependencies.store.listActiveQualityRuns().length > 0 || this.dependencies.store.listActiveQualityIterations().some((entry) => entry.id !== iteration?.id)) throw new Error("A quality validation or correction is already active. Wait for it to finish.");
    const ticket = this.ticket(ticketId);
    const project = getProject(ticket.project);
    for (const existing of this.get(ticketId).runs) {
      if (await this.bounded(manual, this.hasNativeCleanupObligation(existing.id))) throw new Error("Native session closure is unconfirmed. Existing workspaces and proofs are retained.");
    }
    const databaseProblem = preview || kind === "combined" ? null : databaseIsolationProblem(project);
    if (databaseProblem) throw new Error(databaseProblem);
    let criteria = iteration ? iteration.criteriaSnapshot ?? undefined : latestAcceptanceSnapshot(this.get(ticketId));
    if (kind === "functional" && !iteration) criteria = preview ? undefined : this.freshFunctionalSnapshot(ticket);
    if (frozenCriteria) criteria = frozenCriteria;
    if (kind === "combined") criteria = undefined;
    const source = iteration ? this.dependencies.store.getQualityRun(iteration.sourceRunId) : null;
    if (iteration && (!source || source.configFingerprint !== configFingerprint(project) || sourceFingerprint(ticket) !== fingerprint([iteration.originalTicket.title, iteration.originalTicket.description, iteration.originalTicket.prdMarkdown]))) throw new Error("The ticket or validation configuration changed during the quality iteration.");
    if (kind === "behavior" && !criteria) throw new Error("Define acceptance criteria before starting behavioral validation.");
    if (manual) this.assertManualTime(manual);
    const requestId = manual?.requestId ?? nanoid();
    if (!manual) this.dependencies.store.reserveQualityRequest({ requestId, ticketId, origin: ticket.autonomous ? "autonomous" : "system", provider, kind, parameterHash: fingerprint([ticketId, kind, provider, requestId]) });
    const journal = manual?.journal ?? new QualityJournal(this.dependencies.store, requestId, { secrets: [...Object.values(project.validation?.environment ?? {}), ...(preview?.auth ? [preview.auth.username, preview.auth.password] : [])], onFailure: () => this.active.get(ticketId)?.controller.abort() });
    let startupRunId: string | null = null;
    try {
      const operationOptions = manual ? { deadlineAt: manual.deadlineAt, signal: manual.controller.signal } : {};
      if (!manual && ticket.autonomous && ticket.autonomousState?.execution) {
        try { this.dependencies.store.admitAutonomousStart(ticketId, nanoid(), "check"); } catch (error) {
          journal.observe({ kind: "denial", phase: "admission", status: "denied", summary: "Autonomous quality admission refused" });
          this.dependencies.store.settleQualityRequest(requestId, "refused", journal.redact(getErrorMessage(error)));
          throw error;
        }
      }
      const revisionAction = journal.start({ kind: "git", phase: "preparing", summary: "Capture validation candidate revision" });
      journal.assertHealthy();
      let revision: ValidationRevision;
      try {
        if (preview) {
          revision = await this.bounded(manual, this.repoMutex.run(project.repoPath, async () => {
            if (manual) this.assertManualTime(manual);
            await this.dependencies.system.fetch(project.repoPath, preview.revision, operationOptions);
            return this.dependencies.system.captureValidationRevision({ repoPath: project.repoPath, revision: preview.revision, ...operationOptions });
          }));
          if (!this.dependencies.system.dryRun && revision.commitSha !== preview.revision) throw new Error(PREVIEW_STALE_MESSAGE);
          revision = { ...revision, commitSha: preview.revision, fingerprint: preview.revision };
        }
        else if (kind === "combined") {
          if (ticket.column !== "done" || !ticket.prUrl || ticket.slotId !== null || ticket.testing) throw new Error("Combined verification requires a completed feature with a pull request and no active workspace.");
          const prUrl = ticket.prUrl;
          revision = await this.bounded(manual, this.repoMutex.run(project.repoPath, async () => {
            if (manual) this.assertManualTime(manual);
            const head = await this.dependencies.system.readPullRequestHead(project.repoPath, prUrl, project.vcsProvider);
            if (manual) this.assertManualTime(manual);
            if (!head.ok || !head.commitSha) throw new Error("The pull request head could not be resolved.");
            await this.dependencies.system.fetch(project.repoPath, head.commitSha, operationOptions);
            const captured = await this.dependencies.system.captureValidationRevision({ repoPath: project.repoPath, revision: head.commitSha, ...operationOptions });
            if (!this.dependencies.system.dryRun && (!captured.clean || captured.commitSha !== head.commitSha)) throw new Error("The captured revision does not match the pull request head.");
            return this.dependencies.system.dryRun ? { ...captured, commitSha: head.commitSha, fingerprint: head.commitSha } : captured;
          }));
        }
        else if (sourcePath) revision = await this.repoMutex.run(project.repoPath, () => this.dependencies.system.captureValidationRevision({ repoPath: project.repoPath, sourcePath, ...(iteration?.headBranch ? { branch: iteration.headBranch } : {}) }));
        else if (manual && ticket.prUrl) {
          revision = await this.bounded(manual, this.repoMutex.run(project.repoPath, async () => {
            this.assertManualTime(manual);
            const head = await this.dependencies.system.readPullRequestHead(project.repoPath, ticket.prUrl ?? "", project.vcsProvider);
            this.assertManualTime(manual);
            if (!head.ok || !head.commitSha) throw new Error("The current pull request head is unavailable.");
            await this.dependencies.system.fetch(project.repoPath, head.commitSha, operationOptions);
            return this.dependencies.system.captureValidationRevision({ repoPath: project.repoPath, revision: head.commitSha, ...operationOptions });
          }));
        }
        else revision = await this.revision(ticket, true, manual);
        if (manual) this.assertManualTime(manual);
        if (revisionAction) journal.finish(revisionAction, { status: "succeeded", summary: "Validation candidate revision captured" });
        journal.assertHealthy();
      } catch (error) {
        if (revisionAction) journal.finish(revisionAction, { status: "failed", summary: "Validation candidate revision capture failed" });
        this.dependencies.store.settleQualityRequest(requestId, "refused", journal.redact(getErrorMessage(error)));
        throw error;
      }
      if (expectedRevision && (!revision.clean || revision.commitSha !== expectedRevision)) throw new Error("The autonomous revision changed before independent verification.");
      if (iteration?.mode === "recovery") {
        if (!source || revision.commitSha !== source.revision || revision.fingerprint !== source.fingerprint || !revision.clean) throw new Error("The validated revision changed before recovery started.");
      }
      if (iteration?.mode === "correction" && (!revision.clean || revision.commitSha !== iteration.resultRevision)) throw new Error("The corrected revision changed before independent verification started.");
      if (manual) this.assertManualTime(manual);
      if (this.shuttingDown) throw new Error("Quality validation is shutting down.");
      let selectedMode = criteria?.mode ?? (kind === "checks" ? "repository" : null);
      if (kind === "functional" || kind === "combined") selectedMode = "browser";
      const run = this.dependencies.store.createQualityRun({ ticketId, criteriaSnapshotId: criteria?.id ?? null, mode: selectedMode, phase: null, failurePhase: null, kind, revision: revision.commitSha, fingerprint: revision.fingerprint, configFingerprint: configFingerprint(project), status: "queued", provider, simulated: this.dependencies.system.dryRun, evidenceAccepted: false, startedAt: Date.now(), completedAt: null, environment: null, cleanupStatus: "pending", error: null, ...(preview ? { preview: qualityPreviewBindingSchema.parse(preview) } : {}) }, iteration?.id);
      startupRunId = run.id;
      journal.bindRun(run.id);
      if (manual && ticket.autonomousState?.deliveryConfirmation && revision.commitSha !== ticket.autonomousState.deliveryConfirmation.revision) journal.observe({ kind: "observation", phase: "preparing", status: "succeeded", summary: "This manual validation evaluates a new candidate revision against frozen delivered requirements." });
      this.journals.set(run.id, journal);
      if (manual) this.manualRuns.set(run.id, manual);
      const controller = manual?.controller ?? new AbortController();
      if (kind === "combined") {
        run.verification = pendingVerification(sourceFingerprint(ticket), latestAcceptanceSnapshot(this.get(ticket.id))?.id ?? null);
        this.update(run.id, { verification: run.verification });
      }
      if (iteration) this.dependencies.store.updateQualityIteration(iteration.id, { status: "verifying", resultRunId: run.id, resultRevision: run.revision });
      const settleRetainedSlot = iteration?.mode === "recovery" && this.parkedCorrection(ticket, iteration.sourceRunId, this.get(ticketId)) !== undefined;
      const completion = this.execute(run, ticket, project, criteria, controller.signal, iteration, preview, manual).finally(async () => {
        if (manual?.timer) clearTimeout(manual.timer);
        if (this.active.get(ticketId)?.controller === controller) this.active.delete(ticketId);
        if (iteration && this.dependencies.store.getActiveQualityIteration(ticketId)?.id === iteration.id) {
          const result = this.dependencies.store.getQualityRun(run.id);
          if (result) {
            let status: QualityIteration["status"] = "failed";
            const functionalTrigger = iteration.trigger === "functional";
            const accepted = result.status === "passed" && !result.simulated && result.evidenceAccepted && (functionalTrigger || result.technicalEvidenceAccepted) && result.cleanupStatus === "complete";
            const gate = accepted && !functionalTrigger ? await this.gate(ticketId, "strict") : null;
            if (functionalTrigger ? accepted : gate?.complete) status = "completed";
            else if (result.status === "cancelled") status = "cancelled";
            if (iteration.mode === "correction" || settleRetainedSlot) await this.iterationSettled?.(ticketId, iteration.id, run.id, result.status);
            else this.dependencies.store.updateQualityIteration(iteration.id, { status, diagnostic: result.error ?? gate?.reservations.join("; ") ?? null, completedAt: Date.now() });
          }
        }
        this.journals.delete(run.id);
        this.manualRuns.delete(run.id);
        const settledRun = this.dependencies.store.getQualityRun(run.id);
        const interrupted = controller.signal.aborted || settledRun?.status === "cancelled" || settledRun?.status === "interrupted";
        this.dependencies.store.settleQualityRequest(requestId, interrupted ? "interrupted" : "completed", interrupted ? settledRun?.error ?? "Quality validation was interrupted." : undefined);
        this.changed(ticketId);
      }).catch((error: unknown) => { log.warn("quality iteration settlement failed", { ticketId, runId: run.id, error: getErrorMessage(error) }); });
      this.active.set(ticketId, { runId: run.id, controller, completion, ...(preview ? { previewId: preview.previewId } : {}) });
      this.changed(ticketId);
      return run;
    } catch (error) {
      if (startupRunId && !this.active.has(ticketId)) {
        this.journals.delete(startupRunId);
        this.manualRuns.delete(startupRunId);
        try { this.update(startupRunId, { status: "interrupted", cleanupStatus: "complete", completedAt: Date.now(), error: "Quality startup failed before workspace preparation." }); } catch (persistenceError) { log.warn("quality startup failure persistence failed", { error: getErrorMessage(persistenceError) }); }
      }
      this.dependencies.store.settleQualityRequest(requestId, manual?.controller.signal.aborted ? "interrupted" : "refused", journal.redact(getErrorMessage(error)));
      throw error;
    }
  }

  hasAutonomousWriters(ticketId: string): boolean {
    return this.active.has(ticketId) || this.dependencies.store.getTicket(ticketId)?.autonomousState?.execution?.closure.status === "unknown"
      || this.get(ticketId).runs.some((run) => run.status === "queued" || run.status === "running" || run.cleanupStatus !== "complete");
  }

  private markClosureUnknown(ticketId: string): void {
    const state = this.dependencies.store.getTicket(ticketId)?.autonomousState;
    if (!state?.execution) return;
    this.dependencies.store.updateTicket(ticketId, { autonomousState: { ...state, execution: {
      ...state.execution, closure: { ...state.execution.closure, status: "unknown", confirmedAt: null, retention: "retained" },
    } } });
  }

  private startSession(ticketId: string, options: AgentSessionOptions, manual?: ManualQualityContext) {
    const executionGuard = manual ? this.manualGuard(ticketId, manual) : options.executionGuard ?? createAutonomousSessionGuard(this.dependencies.store, ticketId, "other");
    executionGuard?.beforeStart();
    return this.dependencies.system.startAgentSession({ ...options, executionGuard: executionGuard ?? undefined });
  }

  private async requireManualRun(run: QualityValidationRun, original: Ticket, context: ManualQualityContext): Promise<void> {
    this.assertManualTime(context);
    const current = this.ticket(original.id);
    if (sourceFingerprint(current) !== context.sourceFingerprint || configFingerprint(getProject(current.project)) !== context.configFingerprint || current.project !== original.project || current.prUrl !== original.prUrl || current.column !== original.column || current.slotId !== original.slotId || current.testing !== original.testing) throw new Error("The manual validation candidate or configuration changed; its evidence cannot be accepted.");
    if (current.autonomous) this.assertManualDelivery(current.id, context);
    if (!current.prUrl) return;
    const project = getProject(current.project);
    const head = await this.bounded(context, this.dependencies.system.readPullRequestHead(project.repoPath, current.prUrl, project.vcsProvider));
    this.assertManualTime(context);
    if (!head.ok || !this.dependencies.system.dryRun && head.commitSha !== run.revision) throw new Error("The pull request head changed during manual validation; its evidence cannot be accepted.");
  }

  private async hasNativeCleanupObligation(runId: string): Promise<boolean> {
    const directory = join(this.dependencies.artifactDirectory ?? join(tmpdir(), "kanban-quality-artifacts"), runId);
    for (const path of [join(directory, QUALITY_BROWSER_CLEANUP_MARKER), join(directory, "browser", QUALITY_BROWSER_CLEANUP_MARKER)]) {
      try { await lstat(path); return true; } catch (error) {
        if (error instanceof Error && "code" in error && error.code === "ENOENT") continue;
        return true;
      }
    }
    for (const scope of [directory, join(directory, "browser"), join(directory, "relevance")]) {
      try { if ((await readdir(join(scope, QUALITY_NATIVE_CLEANUP_DIRECTORY))).length > 0) return true; } catch (error) {
        if (error instanceof Error && "code" in error && error.code === "ENOENT") continue;
        return true;
      }
    }
    return false;
  }

  private async execute(run: QualityValidationRun, ticket: Ticket, project: ProjectConfig, criteria: QualityCriteriaSnapshot | undefined, signal: AbortSignal, iteration?: QualityIteration, preview?: QualityPreviewTarget, manual?: ManualQualityContext): Promise<void> {
    const journal = this.journals.get(run.id);
    const artifactDirectory = join(this.dependencies.artifactDirectory ?? join(tmpdir(), "kanban-quality-artifacts"), run.id);
    let nativeClosureUnknown = false;
    const onClosureUnknown = () => { nativeClosureUnknown = true; this.markClosureUnknown(ticket.id); };
    if (run.kind === "combined") {
      const execution = resolveExecution("quality-validator", { orchestrator: run.provider ?? ticket.orchestrator, model: ticket.model, effort: ticket.effort, codexModel: ticket.codexModel, codexEffort: ticket.codexEffort, codexFast: ticket.codexFast }, { model: MODELS.triage, effort: MODELS.triageEffort });
      const acceptance = this.get(ticket.id).criteriaSnapshots.find((snapshot) => snapshot.id === run.verification?.acceptanceSnapshotId);
      await executeCombinedQuality({ journal, deadlineAt: manual?.deadlineAt, run, ticket, project, acceptance, system: this.dependencies.system, store: this.dependencies.store, repoMutex: this.repoMutex, execution, signal, artifactDirectory: join(this.dependencies.artifactDirectory ?? join(tmpdir(), "kanban-quality-artifacts"), run.id), environmentVariables: (environment) => environmentFor(environment, project), waitForHealth: (environment, service) => this.waitForHealth(environment, project, service, signal), update: (patch) => this.update(run.id, patch), assertCurrent: async () => {
        const current = this.ticket(ticket.id);
        const currentProject = getProject(ticket.project);
        if (current.project !== ticket.project || current.prUrl !== ticket.prUrl || current.column !== "done" || current.testing || current.slotId !== null || sourceFingerprint(current) !== sourceFingerprint(ticket) || configFingerprint(currentProject) !== run.configFingerprint || currentProject.repoPath !== project.repoPath || currentProject.vcsProvider !== project.vcsProvider || (latestAcceptanceSnapshot(this.get(ticket.id))?.id ?? null) !== (run.verification?.acceptanceSnapshotId ?? null)) throw new Error("The ticket, acceptance criteria or validation configuration changed during combined verification.");
        if (!ticket.prUrl) throw new Error("Pull request is missing.");
        const head = await this.dependencies.system.readPullRequestHead(project.repoPath, ticket.prUrl, project.vcsProvider);
        if (!head.ok || !this.dependencies.system.dryRun && head.commitSha !== run.revision) throw new Error("The pull request head changed during combined verification.");
      } });
      return;
    }
    const options: ValidationWorkspaceOptions = { ticketId: ticket.id, runId: run.id, repoPath: project.repoPath, commitSha: run.revision, ...(manual ? { deadlineAt: manual.deadlineAt, signal } : {}) };
    let environment: QualityEnvironment | null = null;
    let service: ValidationServiceHandle | null = null;
    let phase: QualityRunPhase = "preparing";
    let activeCriteria = criteria;
    let preparedFingerprint: string | null = null;
    let technicalEvidenceAccepted = false;
    let outcome: Parameters<Store["updateQualityRun"]>[1] | null = null;
    try {
      this.update(run.id, { status: "running", phase });
      if (signal.aborted) throw new Error("Quality run cancelled.");
      if (!preview && run.kind === "functional" && !this.dependencies.system.dryRun && (!project.validation?.isolated || !project.validation.startCommand)) throw new QualityBlockerError("start_configuration_missing", BROWSER_CONFIGURATION_MESSAGE);
      if (manual) await this.requireManualRun(run, ticket, manual);
      const prepared = await this.effect(run, "git", "Prepare validation workspace", () => this.repoMutex.run(project.repoPath, () => { if (manual) this.assertManualTime(manual); journal?.assertHealthy(); return this.dependencies.system.prepareValidationWorkspace(options); }));
      environment = { directory: prepared.cwd, dataDirectory: prepared.dataDirectory, port: prepared.port, databaseNamespace: prepared.databaseNamespace, addresses: [], timeoutMs: project.validation?.timeoutMs ?? QUALITY_DEFAULT_TIMEOUT_MS };
      this.update(run.id, { environment });
      const variables = preview ? { VALIDATION_BASE_URL: preview.url } : environmentFor(environment, project);
      const timeoutMs = manual ? Math.max(1, manual.deadlineAt - Date.now()) : project.validation?.timeoutMs ?? QUALITY_DEFAULT_TIMEOUT_MS;
      const originalFingerprint = await this.bounded(manual, this.dependencies.system.codeFingerprint(environment.directory));
      const execution = resolveExecution("quality-validator", { orchestrator: run.provider ?? ticket.orchestrator, model: ticket.model, effort: ticket.effort, codexModel: ticket.codexModel, codexEffort: ticket.codexEffort, codexFast: ticket.codexFast }, { model: MODELS.triage, effort: MODELS.triageEffort });
      if (run.kind === "full" && !activeCriteria) {
        phase = "planning";
        this.update(run.id, { phase });
        const plan = this.dependencies.system.dryRun
          ? { mode: "repository", criteria: [{ id: SIMULATED_CRITERION_ID, text: SIMULATED_CRITERION_TEXT, source: "ticket", required: true, independent: true }] } satisfies QualityCriteriaPlan
          : await prepareQualityCriteria({ artifactDirectory, journal, deadlineAt: manual?.deadlineAt, ticketId: ticket.id, onClosureUnknown, cwd: environment.directory, execution, title: ticket.title, description: ticket.description, prd: ticket.prdMarkdown ?? "", environment: variables, signal, timeoutMs, startSession: (sessionOptions) => this.startSession(ticket.id, sessionOptions, manual) });
        if (nativeClosureUnknown || await this.bounded(manual, this.hasNativeCleanupObligation(run.id))) throw new Error("Native planning session closure is unconfirmed.");
        if (signal.aborted) throw new Error("Quality run cancelled.");
        if (originalFingerprint !== await this.bounded(manual, this.dependencies.system.codeFingerprint(environment.directory))) throw new Error("Criteria preparation modified the committed validation source.");
        const currentTicket = this.ticket(ticket.id);
        if (sourceFingerprint(currentTicket) !== sourceFingerprint(ticket)) throw new Error("Ticket changed while acceptance criteria were being prepared.");
        activeCriteria = latestAcceptanceSnapshot(this.get(ticket.id)) ?? this.dependencies.store.createQualityCriteriaSnapshot(ticket.id, { criteria: plan.criteria, mode: plan.mode, sourceFingerprint: sourceFingerprint(currentTicket), createdBy: this.dependencies.system.dryRun ? "system" : "agent" });
        this.update(run.id, { criteriaSnapshotId: activeCriteria.id, mode: activeCriteria.mode });
      }
      if (run.kind === "functional" && !activeCriteria) {
        phase = "planning";
        this.update(run.id, { phase });
        const planningQuality = this.get(ticket.id);
        const acceptance = latestAcceptanceSnapshot(planningQuality);
        const previous = preview ? planningQuality.criteriaSnapshots.filter((snapshot) => snapshot.purpose === "functional" && snapshot.previewId === preview.previewId).at(-1) : latestFunctionalSnapshot(planningQuality);
        const plan: FunctionalScenarioPlan = this.dependencies.system.dryRun
          ? { scenarios: [{ id: SIMULATED_CRITERION_ID, text: SIMULATED_CRITERION_TEXT, source: "ticket", required: true, independent: true, interaction: "display", expected: SIMULATED_CRITERION_TEXT, covers: [] }], uncovered: [] }
          : await prepareFunctionalScenarios({ artifactDirectory, journal, deadlineAt: manual?.deadlineAt, ticketId: ticket.id, onClosureUnknown, cwd: environment.directory, execution, title: ticket.title, description: ticket.description, prd: ticket.prdMarkdown ?? "", acceptanceCriteria: acceptance?.criteria ?? [], previousScenarios: previous?.criteria ?? [], environment: variables, signal, timeoutMs, startSession: (sessionOptions) => this.startSession(ticket.id, sessionOptions, manual) });
        if (nativeClosureUnknown || await this.bounded(manual, this.hasNativeCleanupObligation(run.id))) throw new Error("Native planning session closure is unconfirmed.");
        if (signal.aborted) throw new Error("Quality run cancelled.");
        if (originalFingerprint !== await this.bounded(manual, this.dependencies.system.codeFingerprint(environment.directory))) throw new Error("Scenario preparation modified the committed validation source.");
        const currentTicket = this.ticket(ticket.id);
        if (sourceFingerprint(currentTicket) !== sourceFingerprint(ticket)) throw new Error("Ticket changed while functional scenarios were being prepared.");
        if ((latestAcceptanceSnapshot(this.get(ticket.id))?.id ?? null) !== (acceptance?.id ?? null)) throw new Error("Acceptance criteria changed while functional scenarios were being prepared.");
        const userScenarios = previous?.criteria.filter((criterion) => criterion.source === "user") ?? [];
        const scenarios = [
          ...plan.scenarios.map((scenario) => userScenarios.find((criterion) => criterion.id === scenario.id) ?? scenario),
          ...userScenarios.filter((criterion) => !plan.scenarios.some((scenario) => scenario.id === criterion.id)),
        ];
        activeCriteria = this.dependencies.store.createQualityCriteriaSnapshot(ticket.id, { criteria: scenarios, mode: "browser", sourceFingerprint: sourceFingerprint(currentTicket), createdBy: this.dependencies.system.dryRun ? "system" : "agent", purpose: "functional", baseSnapshotId: acceptance?.id ?? null, uncovered: plan.uncovered, ...(preview ? { previewId: preview.previewId } : {}) });
        this.update(run.id, { criteriaSnapshotId: activeCriteria.id, mode: activeCriteria.mode });
      }
      phase = "preparing";
      this.update(run.id, { phase });
      if (!preview && !this.dependencies.system.dryRun && activeCriteria?.mode === "browser" && run.kind !== "checks" && (!project.validation?.isolated || !project.validation.startCommand)) throw new QualityBlockerError("start_configuration_missing", BROWSER_CONFIGURATION_MESSAGE);
      if (!preview && project.validation?.setupCommand) {
        if (!project.validation.isolated) throw new QualityBlockerError("start_configuration_missing", "Validation setup requires an isolated environment.");
        environment = { ...environment, ...(project.validation.teardownCommand ? { teardownCommand: project.validation.teardownCommand } : {}) };
        this.update(run.id, { environment });
        const setup = await this.command(run, "Environment setup", project.validation.setupCommand, environment, variables, timeoutMs, signal);
        if (!commandSucceeded(setup)) throw new QualityBlockerError("environment_setup_failed", "Validation environment setup failed.");
      }
      const preparedEnvironment = environment;
      const installation = preview ? null : await this.effect(run, "command", "Install validation dependencies", () => this.dependencies.system.installValidationDeps({ cwd: preparedEnvironment.directory, environment: variables, timeoutMs: manual ? Math.max(1, manual.deadlineAt - Date.now()) : Math.max(timeoutMs, project.commitTimeoutMs), signal, deadlineAt: manual?.deadlineAt }), (installed) => installed === null || commandSucceeded(installed.result));
      if (installation) {
        this.recordCommand(run, "Dependency installation", installation.command, installation.result);
        if (!commandSucceeded(installation.result)) throw new QualityBlockerError("dependency_installation_failed", `Dependency installation failed. ${outputFor(installation.result)}`);
      }
      const baseline = await this.bounded(manual, this.dependencies.system.codeFingerprint(environment.directory));
      if (baseline !== originalFingerprint) throw new Error("Environment preparation modified the committed validation source.");
      preparedFingerprint = baseline;
      let technicalPassed = true;
      if (run.kind === "checks" || run.kind === "full") {
        phase = "checks";
        this.update(run.id, { phase });
        const commands = await this.bounded(manual, this.checkCommands(project, environment.directory));
        if (commands.length === 0) {
          if (this.dependencies.system.dryRun) {
            outcome = { status: "inconclusive", evidenceAccepted: false, failurePhase: "checks", error: SIMULATED_CHECKS_MESSAGE };
            return;
          }
          throw new Error("No existing typecheck, lint, or test commands are configured.");
        }
        for (const command of commands) {
          if (signal.aborted) throw new Error("Quality run cancelled.");
          const result = await this.command(run, command.name, command.command, environment, variables, timeoutMs, signal);
          if (!commandSucceeded(result)) technicalPassed = false;
        }
        if (baseline !== await this.bounded(manual, this.dependencies.system.codeFingerprint(environment.directory))) throw new Error("Checks modified the validated source; their evidence cannot be accepted.");
        if (signal.aborted) throw new Error("Quality run cancelled.");
        technicalEvidenceAccepted = true;
        this.update(run.id, { technicalEvidenceAccepted });
      }
      if (run.kind === "checks") {
        outcome = { status: technicalPassed ? "passed" : "failed", evidenceAccepted: true, failurePhase: technicalPassed ? null : "checks", error: technicalPassed ? null : "One or more technical checks failed." };
      } else {
        phase = "validating";
        this.update(run.id, { phase });
        if (!activeCriteria || !run.provider) throw new Error("Independent validation has no criteria or provider.");
        if (this.dependencies.system.dryRun) {
          for (const criterion of activeCriteria.criteria) {
            this.dependencies.store.appendQualityEvidence({ runId: run.id, criterionId: criterion.id, kind: "behavior", authority: "agent", author: "agent", status: "inconclusive", summary: SIMULATED_VALIDATION_MESSAGE, output: SIMULATED_VALIDATION_OUTPUT, command: null, exitCode: null, timedOut: false, durationMs: 0, artifactPath: null, provider: run.provider, sessionId: `simulation:${run.id}`, model: execution.model });
          }
          outcome = { status: "inconclusive", evidenceAccepted: false, failurePhase: "validating", error: SIMULATED_VALIDATION_MESSAGE };
          return;
        }
        const executionGuard = manual ? this.manualGuard(ticket.id, manual) : createAutonomousSessionGuard(this.dependencies.store, ticket.id, "other");
        executionGuard?.beforeStart();
        if (preview) {
          await this.bounded(manual, this.requirePreviewHead(ticket, preview));
          environment = { ...environment, addresses: [{ label: "Remote preview application", url: preview.url }] };
          this.update(run.id, { environment });
          await this.effect(run, "service", "Preview health check", () => this.waitForPreviewHealth(preview, timeoutMs, signal));
        } else if (activeCriteria.mode === "browser") {
          if (!project.validation?.isolated || !project.validation.startCommand) throw new QualityBlockerError("start_configuration_missing", BROWSER_CONFIGURATION_MESSAGE);
          environment = { ...environment, addresses: [{ label: "Validation application", url: `http://127.0.0.1:${environment.port}` }], ...(project.validation.teardownCommand ? { teardownCommand: project.validation.teardownCommand } : {}) };
          this.update(run.id, { environment });
          const serviceAction = journal?.start({ kind: "service", phase: "starting", summary: "Start isolated validation application" });
          journal?.assertHealthy();
          if (manual) this.assertManualTime(manual);
          service = this.dependencies.system.startValidationService({ cwd: environment.directory, command: project.validation.startCommand, environment: variables, timeoutMs, signal, deadlineAt: manual?.deadlineAt });
          if (serviceAction) journal?.finish(serviceAction, { status: "succeeded", summary: "Validation application process started" });
          journal?.assertHealthy();
          const runningEnvironment = environment;
          const runningService = service;
          await this.effect(run, "service", "Application health check", () => this.waitForHealth(runningEnvironment, project, runningService, signal));
        }
        const quality = this.get(ticket.id);
        const criteriaSnapshotId = activeCriteria.id;
        const acceptedChecks = quality.runs.filter((candidate) => !candidate.preview && (candidate.kind === "checks" || candidate.kind === "full") && !candidate.simulated && candidate.revision === run.revision && candidate.fingerprint === run.fingerprint && candidate.configFingerprint === run.configFingerprint && candidate.criteriaSnapshotId === criteriaSnapshotId && technicalRunAccepted(candidate) && (candidate.id === run.id || !iteration && candidate.cleanupStatus === "complete")).at(-1);
        const functional = run.kind === "functional";
        const checks = functional ? [] : quality.evidence.filter((entry) => entry.runId === acceptedChecks?.id && entry.kind === "command" && entry.authority === "server" && entry.status !== "inconclusive" && CHECK_NAMES.some((name) => name === entry.summary));
        const sourceRun = iteration ? this.dependencies.store.getQualityRun(iteration.sourceRunId) : null;
        const previousValidation = sourceRun ? {
          revision: sourceRun.revision, error: sourceRun.error, diagnostic: sourceRun.diagnostic,
          observations: quality.evidence.filter((entry) => entry.runId === sourceRun.id).map(({ criterionId, status, summary, output, timedOut }) => ({ criterionId, status, summary, output: output.slice(-PREVIOUS_OBSERVATION_LIMIT), timedOut })),
        } : undefined;
        const result = await runQualityValidator({ journal, deadlineAt: manual?.deadlineAt, executionGuard: executionGuard ?? undefined, onClosureUnknown, previousValidation, ticketId: ticket.id, runId: run.id, cwd: environment.directory, execution, criteria: activeCriteria.criteria, mode: functional ? "browser" : activeCriteria.mode, functional, revisionSha: run.revision, environment: variables, checks, addresses: environment.addresses ?? [], signal, timeoutMs, artifactDirectory, ...(preview?.auth ? { browserAuth: preview.auth } : {}), ...(preview?.testData ? { testData: preview.testData } : {}), startSession: (sessionOptions) => this.startSession(ticket.id, sessionOptions, manual) });
        if (nativeClosureUnknown || await this.bounded(manual, this.hasNativeCleanupObligation(run.id))) throw new Error("Native validator session closure is unconfirmed.");
        if (!result.sessionId) throw new Error("Validator returned no independently attributable session identity.");
        if (signal.aborted) throw new Error("Quality run cancelled.");
        const criterionIds = result.evidence.map((evidence) => evidence.criterionId);
        if (new Set(criterionIds).size !== criterionIds.length) throw new Error("Validator returned duplicate acceptance criteria.");
        const knownCriteria = activeCriteria.criteria;
        if (result.evidence.some((evidence) => !knownCriteria.some((criterion) => criterion.id === evidence.criterionId))) throw new Error("Validator returned an unknown acceptance criterion.");
        if (result.evidence.some((evidence) => evidence.sessionId !== result.sessionId || evidence.provider !== run.provider || evidence.authority !== "agent")) throw new Error("Validator evidence has inconsistent session provenance.");
        if (baseline !== await this.bounded(manual, this.dependencies.system.codeFingerprint(environment.directory))) throw new Error("Validator modified the validated source; its evidence cannot be accepted.");
        if (signal.aborted) throw new Error("Quality run cancelled.");
        if (preview) await this.bounded(manual, this.requirePreviewRun(run, ticket, preview));
        for (const evidence of result.evidence) {
          this.dependencies.store.appendQualityEvidence({ runId: run.id, criterionId: evidence.criterionId, kind: "behavior", authority: "agent", author: "agent", status: evidence.status, summary: evidence.summary, output: evidence.output, command: null, exitCode: null, timedOut: evidence.timedOut, durationMs: evidence.durationMs, artifactPath: evidence.artifactPath, provider: run.provider, sessionId: result.sessionId, model: execution.model, ...(evidence.scenario ? { scenario: evidence.scenario } : {}) });
        }
        const behavioralPassed = knownCriteria.filter((criterion) => criterion.required).every((criterion) => result.evidence.some((evidence) => evidence.criterionId === criterion.id && evidence.status === "passed"));
        const behavioralFailed = knownCriteria.some((criterion) => criterion.required && result.evidence.some((evidence) => evidence.criterionId === criterion.id && evidence.status === "failed"));
        let status: "passed" | "failed" | "inconclusive" = "inconclusive";
        if (technicalPassed && behavioralPassed) status = "passed";
        else if (!technicalPassed || behavioralFailed) status = "failed";
        let error: string | null = null;
        if (!technicalPassed) error = "One or more technical checks failed.";
        else if (!behavioralPassed) error = functional ? "Some required functional scenarios were not verified in the browser." : "Some required acceptance criteria were not independently verified.";
        let failurePhase: QualityRunPhase | null = null;
        if (!technicalPassed) failurePhase = "checks";
        else if (!behavioralPassed) failurePhase = "validating";
        let diagnostic = result.diagnostic ?? null;
        if (!diagnostic && !technicalPassed) diagnostic = { category: "backend_checks_failed", summary: "One or more server-run checks failed; source-code nonconformance is unconfirmed.", permissionDenials: [], blockers: [] };
        outcome = { status, evidenceAccepted: true, failurePhase, error, diagnostic };
      }
    } catch (error) {
      let reason = journal?.redact(getErrorMessage(error)) ?? getErrorMessage(error);
      if (phase === "preparing" && !signal.aborted) reason = `Validation environment preparation failed: ${reason}`;
      const blocker = error instanceof QualityBlockerError && run.kind === "functional" && !signal.aborted ? error : null;
      if (blocker) {
        const summary = qualityErrorMessage(journal?.redact(reason) ?? reason);
        outcome = { status: "inconclusive", evidenceAccepted: false, failurePhase: phase, error: summary, diagnostic: { category: "environment_blocker", summary, permissionDenials: [], blockers: [{ code: blocker.code, scenarioId: null, summary }] } };
      } else {
        let status: QualityValidationRun["status"] = signal.aborted ? "cancelled" : "failed";
        if (preview && !signal.aborted) status = "inconclusive";
        outcome = { status, evidenceAccepted: false, failurePhase: phase, error: reason, diagnostic: { category: "validation_incomplete", summary: reason, permissionDenials: [], blockers: [] } };
      }
      log.warn("quality run ended without acceptance", { ticketId: ticket.id, runId: run.id, phase, error: reason });
    } finally {
      const cleanupAction = journal?.start({ kind: "cleanup", phase: "cleanup", summary: "Close validation services and remove isolated workspace" });
      let cleanupError: string | null = null;
      try { this.update(run.id, { phase: "cleanup" }); } catch (error) { log.warn("quality cleanup progress persistence failed", { error: getErrorMessage(error) }); }
      try { await this.bounded(manual, service?.stop() ?? Promise.resolve()); } catch (error) { cleanupError = getErrorMessage(error); }
      if (environment?.teardownCommand) {
        try {
          const result = await this.bounded(manual, this.dependencies.system.runValidationCommand({ cwd: environment.directory, command: environment.teardownCommand, environment: environmentFor(environment, project), timeoutMs: manual ? Math.max(1, manual.deadlineAt - Date.now()) : environment.timeoutMs ?? QUALITY_DEFAULT_TIMEOUT_MS, deadlineAt: manual?.deadlineAt }));
          if (!commandSucceeded(result)) cleanupError = "Validation service teardown failed.";
        } catch (error) { cleanupError = getErrorMessage(error); }
      }
      try {
        if (nativeClosureUnknown || await this.bounded(manual, this.hasNativeCleanupObligation(run.id))) cleanupError = "Native session closure is unconfirmed. Its private artifacts and validation workspace are retained.";
      } catch (error) { cleanupError = getErrorMessage(error); }
      if (cleanupError === null && environment && preparedFingerprint && (technicalEvidenceAccepted || outcome?.evidenceAccepted)) {
        try {
          if (preparedFingerprint !== await this.bounded(manual, this.dependencies.system.codeFingerprint(environment.directory))) {
            technicalEvidenceAccepted = false;
            outcome = { ...outcome, status: "failed", evidenceAccepted: false, failurePhase: outcome?.failurePhase ?? "cleanup", error: "Validated source changed before final acceptance; its evidence cannot be accepted." };
          }
        } catch (error) {
          technicalEvidenceAccepted = false;
          outcome = { ...outcome, status: "failed", evidenceAccepted: false, failurePhase: outcome?.failurePhase ?? "cleanup", error: getErrorMessage(error) };
        }
      }
      if (cleanupError !== null) {
        technicalEvidenceAccepted = false;
        outcome = { ...outcome, status: signal.aborted ? "cancelled" : "inconclusive", evidenceAccepted: false, error: cleanupError };
      }
      if (cleanupError === null) {
        try { await this.bounded(manual, this.repoMutex.run(project.repoPath, () => { if (manual) this.assertManualTime(manual); return this.dependencies.system.cleanupValidationWorkspace({ ...options, signal: undefined }); })); } catch (error) { cleanupError = getErrorMessage(error); }
      }
      if (signal.aborted) {
        technicalEvidenceAccepted = false;
        outcome = { ...outcome, status: "cancelled", evidenceAccepted: false, error: "Quality run cancelled." };
      }
      if (manual && !signal.aborted && (outcome?.evidenceAccepted || technicalEvidenceAccepted)) {
        try { await this.requireManualRun(run, ticket, manual); } catch (error) { technicalEvidenceAccepted = false; outcome = { ...outcome, status: "inconclusive", evidenceAccepted: false, error: getErrorMessage(error) }; }
      }
      if (preview && !signal.aborted && outcome?.evidenceAccepted) {
        try {
          await this.bounded(manual, this.requirePreviewRun(run, ticket, preview));
        } catch (error) {
          outcome = { ...outcome, status: "inconclusive", evidenceAccepted: false, error: getErrorMessage(error) };
        }
      }
      if (cleanupAction) journal?.finish(cleanupAction, { status: cleanupError ? "unknown" : "succeeded", summary: cleanupError ? "Validation cleanup could not be confirmed" : "Validation cleanup completed" });
      if (cleanupError) this.markClosureUnknown(ticket.id);
      this.update(run.id, { ...outcome, technicalEvidenceAccepted, completedAt: Date.now(), cleanupStatus: cleanupError ? "failed" : "complete", ...(cleanupError ? { error: journal?.redact(cleanupError) ?? cleanupError } : {}) });
    }
  }

  private async effect<T>(run: QualityValidationRun, kind: "git" | "command" | "service" | "cleanup", summary: string, operation: () => Promise<T>, succeeded: (result: T) => boolean = () => true): Promise<T> {
    const journal = this.journals.get(run.id);
    const manual = this.manualRuns.get(run.id);
    if (manual) {
      this.assertManualTime(manual);
      if (this.ticket(run.ticketId).autonomous) this.assertManualDelivery(run.ticketId, manual);
    }
    const actionId = journal?.start({ kind, phase: "validation", summary });
    journal?.assertHealthy();
    try {
      const result = await this.bounded(manual, operation());
      if (actionId) journal?.finish(actionId, { status: succeeded(result) ? "succeeded" : "failed", summary });
      journal?.assertHealthy();
      return result;
    } catch (error) {
      if (actionId) journal?.finish(actionId, { status: manual?.controller.signal.aborted ? "interrupted" : "failed", summary });
      throw error;
    }
  }

  private async command(run: QualityValidationRun, name: string, command: string, environment: QualityEnvironment, variables: Record<string, string>, timeoutMs: number, signal: AbortSignal): Promise<ValidationCommandResult> {
    const manual = this.manualRuns.get(run.id);
    const result = await this.effect(run, "command", name, () => this.dependencies.system.runValidationCommand({ cwd: environment.directory, command, environment: variables, timeoutMs: manual ? Math.max(1, manual.deadlineAt - Date.now()) : timeoutMs, signal, deadlineAt: manual?.deadlineAt }), commandSucceeded);
    this.recordCommand(run, name, command, result);
    return result;
  }

  private recordCommand(run: QualityValidationRun, name: string, command: string, result: ValidationCommandResult): void {
    this.dependencies.store.appendQualityEvidence({ runId: run.id, criterionId: null, kind: "command", authority: "server", author: "system", status: commandSucceeded(result) ? "passed" : "failed", summary: name, output: this.journals.get(run.id)?.redact(outputFor(result)) ?? outputFor(result), command: this.journals.get(run.id)?.redact(command) ?? command, exitCode: result.exitCode, timedOut: result.timedOut, durationMs: result.durationMs, artifactPath: null, provider: null, sessionId: null, model: null });
    this.changed(run.ticketId);
  }

  private async checkCommands(project: ProjectConfig, directory: string): Promise<CheckCommand[]> {
    if (this.dependencies.system.dryRun) {
      return CHECK_NAMES.flatMap((name) => {
        const command = project.scripts?.[name];
        return command ? [{ name, command }] : [];
      });
    }
    const manifestFile = Bun.file(join(directory, "package.json"));
    const manifest = await manifestFile.exists() ? parsePackageManifest(await manifestFile.text()) : null;
    const runner = scriptRunner(resolvePackageManager(manifest?.packageManager, await presentPackageManagerFiles(directory)));
    const commands: CheckCommand[] = [];
    for (const name of CHECK_NAMES) {
      const configured = project.scripts?.[name];
      if (configured) commands.push({ name, command: configured });
      else if (typeof manifest?.scripts?.[name] === "string") commands.push({ name, command: `${runner} ${name}` });
    }
    return commands;
  }

  private async waitForHealth(environment: QualityEnvironment, project: ProjectConfig, service: ValidationServiceHandle, signal: AbortSignal): Promise<void> {
    const deadline = Date.now() + (project.validation?.timeoutMs ?? QUALITY_DEFAULT_TIMEOUT_MS);
    let exited = false;
    void service.result.then(() => { exited = true; });
    const url = `http://127.0.0.1:${environment.port}${project.validation?.healthPath ?? "/"}`;
    while (Date.now() < deadline && !signal.aborted && !exited) {
      try {
        const response = await fetch(url, { signal: AbortSignal.any([signal, AbortSignal.timeout(HEALTH_REQUEST_TIMEOUT_MS)]), redirect: "error" });
        if (response.ok) { await response.body?.cancel(); return; }
        await response.body?.cancel();
      } catch { /* NOTE(ali): the application may still be starting. */ }
      await new Promise<void>((resolveWait) => setTimeout(resolveWait, HEALTH_POLL_MS));
    }
    if (signal.aborted) throw new Error("Quality run cancelled.");
    throw new QualityBlockerError("application_unavailable", `Isolated application did not become healthy. ${service.output()}`);
  }

  private async waitForPreviewHealth(target: QualityPreviewTarget, timeoutMs: number, signal: AbortSignal): Promise<void> {
    const address = new URL(target.url);
    const url = new URL(target.healthPath ?? "/", address);
    if (url.origin !== address.origin) throw new Error("Preview health checks must use the preview origin.");
    const headers: Record<string, string> = {};
    if (target.auth) headers.Authorization = `Basic ${Buffer.from(`${target.auth.username}:${target.auth.password}`).toString("base64")}`;
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline && !signal.aborted) {
      try {
        if (isSuccessStatus(await previewStatus(url, headers, AbortSignal.any([signal, AbortSignal.timeout(HEALTH_REQUEST_TIMEOUT_MS)])))) return;
      } catch { /* NOTE(ali): the remote preview may still be becoming available. */ }
      await new Promise<void>((resolveWait) => setTimeout(resolveWait, HEALTH_POLL_MS));
    }
    if (signal.aborted) throw new Error("Quality run cancelled.");
    throw new QualityBlockerError("application_unavailable", "The remote preview did not become healthy.");
  }

  async cancelPreview(ticketId: string, previewId: string): Promise<void> {
    for (const pending of this.pendingManual.values()) if (pending.ticketId === ticketId && pending.previewId === previewId) pending.context.controller.abort();
    await this.starts.run(ticketId, async () => {
      const active = this.active.get(ticketId);
      if (active?.previewId !== previewId) return;
      active.controller.abort();
      await active.completion;
    });
  }

  async cancel(ticketId: string, options: { pendingManual?: boolean } = {}): Promise<void> {
    if (options.pendingManual !== false) for (const pending of this.pendingManual.values()) if (pending.ticketId === ticketId) pending.context.controller.abort();
    await this.starts.run(ticketId, async () => {
      const iteration = this.dependencies.store.getActiveQualityIteration(ticketId);
      const active = this.active.get(ticketId);
      active?.controller.abort();
      if (iteration) { try { this.dependencies.store.updateQualityIteration(iteration.id, { status: "cancelled", completedAt: Date.now(), diagnostic: "Quality iteration cancelled." }); } catch (error) { log.warn("quality cancellation persistence failed", { error: getErrorMessage(error) }); } }
      if (iteration?.mode === "correction") await this.iterationCancellation?.(ticketId, iteration.id);
      await active?.completion;
      if (iteration) this.changed(ticketId);
    });
  }

  async gate(ticketId: string, mode: "strict" | "reservations"): Promise<QualityGate> {
    const ticket = this.ticket(ticketId);
    const project = getProject(ticket.project);
    const quality = this.get(ticketId);
    const snapshot = latestAcceptanceSnapshot(quality);
    const localRuns = quality.runs.filter((run) => !run.preview && run.kind !== "combined");
    const enabled = ticket.kind === "feature" && (project.validation?.enabled === true || localRuns.length > 0 || !!snapshot);
    const reservations: string[] = [];
    const requiredCriteria = snapshot?.criteria.filter((criterion) => criterion.required).map((criterion) => criterion.id) ?? [];
    const verifiedCriteria: string[] = [];
    const currentRunIds: string[] = [];
    if (ticket.prUrl) {
      const combined = quality.runs.filter((run) => run.kind === "combined");
      if (combined.length > 0) {
        try {
          const head = await this.dependencies.system.readPullRequestHead(project.repoPath, ticket.prUrl, project.vcsProvider);
          if (head.ok) currentRunIds.push(...combined.filter((run) => run.revision === head.commitSha && run.configFingerprint === configFingerprint(project) && run.verification?.sourceFingerprint === sourceFingerprint(ticket) && (run.verification.acceptanceSnapshotId ?? null) === (snapshot?.id ?? null)).map((run) => run.id));
        } catch { /* A failed head lookup cannot establish current evidence. */ }
      }
    }
    let stale = false;
    if (enabled) {
      let current: ValidationRevision | null = null;
      try { current = await this.revision(ticket, mode === "strict"); } catch (error) { reservations.push(getErrorMessage(error)); }
      const currentRuns = localRuns.filter((run) => run.revision === current?.commitSha && run.fingerprint === current?.fingerprint && run.configFingerprint === configFingerprint(project) && run.criteriaSnapshotId === (snapshot?.id ?? null));
      currentRunIds.push(...currentRuns.map((run) => run.id));
      const functionalSnapshot = this.freshFunctionalSnapshot(ticket);
      currentRunIds.push(...localRuns.filter((run) => run.kind === "functional" && functionalSnapshot !== undefined && run.criteriaSnapshotId === functionalSnapshot.id && run.revision === current?.commitSha && run.fingerprint === current?.fingerprint && run.configFingerprint === configFingerprint(project)).map((run) => run.id));
      const relevant = currentRuns.filter((run) => !run.simulated && run.cleanupStatus === "complete");
      const technical = relevant.filter((run) => run.kind === "checks" || run.kind === "full").at(-1);
      const technicalEvidence = quality.evidence.filter((evidence) => evidence.runId === technical?.id && evidence.kind === "command" && CHECK_NAMES.some((name) => name === evidence.summary));
      const acceptedTechnical = technical && technicalRunAccepted(technical);
      if (!acceptedTechnical || technicalEvidence.length === 0 || technicalEvidence.some((evidence) => evidence.authority !== "server" || evidence.status !== "passed" || evidence.exitCode !== 0 || evidence.timedOut)) reservations.push("Current server-run technical checks are missing or unsuccessful.");
      const requireBehavioral = project.validation?.requireBehavioral ?? !!snapshot;
      const latestChecks = localRuns.filter((run) => run.kind === "checks" || run.kind === "full").at(-1);
      const latestBehavior = localRuns.filter((run) => (run.kind === "behavior" || run.kind === "full") && (!requireBehavioral || run.provider !== null)).at(-1);
      stale = !!latestChecks && !currentRunIds.includes(latestChecks.id);
      if ((requireBehavioral || snapshot) && latestBehavior && !currentRunIds.includes(latestBehavior.id)) stale = true;
      if (snapshot && snapshot.sourceFingerprint !== sourceFingerprint(ticket)) stale = true;
      if (requireBehavioral || snapshot) {
        if (!snapshot) reservations.push("Versioned acceptance criteria are required.");
        else if (snapshot.sourceFingerprint !== sourceFingerprint(ticket)) reservations.push("Acceptance criteria must be reconfirmed after ticket or PRD changes.");
        const behavioral = relevant.filter((run) => (run.kind === "behavior" || run.kind === "full") && run.mode === snapshot?.mode);
        const independent = behavioral.filter((run) => run.provider !== null).at(-1);
        const independentlyVerified = independent?.evidenceAccepted === true && requiredCriteria.length > 0 && requiredCriteria.every((criterionId) => quality.evidence.some((evidence) => evidence.runId === independent.id && evidence.criterionId === criterionId && evidence.kind === "behavior" && evidence.authority === "agent" && evidence.status === "passed"));
        if (requireBehavioral && !independentlyVerified) reservations.push("Current independent behavioral validation is missing or unsuccessful.");
        for (const criterion of snapshot?.criteria ?? []) {
          const latest = quality.evidence.filter((evidence) => evidence.criterionId === criterion.id && behavioral.some((run) => run.id === evidence.runId)).at(-1);
          const run = behavioral.find((candidate) => candidate.id === latest?.runId);
          const completed = run?.status === "passed" || run?.status === "failed" || run?.status === "inconclusive";
          const passed = latest?.status === "passed" && completed && run?.evidenceAccepted === true && (!criterion.independent || latest.authority === "agent");
          if (passed) verifiedCriteria.push(criterion.id);
          else if (criterion.required) reservations.push(`Acceptance criterion is unverified: ${criterion.text}`);
        }
      }
      if (this.active.has(ticketId) && !this.active.get(ticketId)?.previewId) reservations.push("Quality validation is still running.");
      const activeIteration = this.dependencies.store.getActiveQualityIteration(ticketId);
      if (activeIteration?.status === "queued" || activeIteration?.status === "correcting") reservations.push("Quality correction is still running.");
      if (quality.iterations.some((iteration) => iteration.trigger !== "functional")) {
        const latestFull = localRuns.filter((run) => run.kind === "full").at(-1);
        const fullAccepted = latestFull && currentRunIds.includes(latestFull.id) && !latestFull.simulated && latestFull.status === "passed" && latestFull.evidenceAccepted && latestFull.technicalEvidenceAccepted && latestFull.cleanupStatus === "complete";
        verifiedCriteria.splice(0, verifiedCriteria.length);
        if (fullAccepted) {
          for (const criterion of snapshot?.criteria ?? []) {
            if (quality.evidence.some((entry) => entry.runId === latestFull.id && entry.criterionId === criterion.id && entry.authority === "agent" && entry.status === "passed")) verifiedCriteria.push(criterion.id);
          }
        }
        if (!fullAccepted || requiredCriteria.some((criterionId) => !verifiedCriteria.includes(criterionId))) reservations.push("The latest full independent verification has not accepted every required criterion.");
      }
      if (localRuns.some((run) => run.cleanupStatus === "failed")) reservations.push("A validation environment still requires cleanup.");
    }
    const complete = reservations.length === 0;
    return { enabled, complete, reservations, allowed: !enabled || complete || mode === "reservations", stale, reasons: reservations, requiredCriteria, verifiedCriteria, currentRunIds };
  }

  async recordManualEvidence(ticketId: string, input: { criterionId: string; observation: string; status: "passed" | "failed" | "inconclusive" }): Promise<QualityEvidence> {
    const ticket = this.ticket(ticketId);
    this.requireNoIteration(ticketId);
    const project = getProject(ticket.project);
    const snapshot = latestAcceptanceSnapshot(this.get(ticketId));
    if (!snapshot?.criteria.some((criterion) => criterion.id === input.criterionId)) throw new Error("Acceptance criterion does not exist in the current version.");
    const revision = await this.revision(ticket, true);
    const run = this.dependencies.store.createQualityRun({ ticketId, criteriaSnapshotId: snapshot.id, kind: "behavior", revision: revision.commitSha, fingerprint: revision.fingerprint, configFingerprint: configFingerprint(project), status: "running", provider: null, simulated: false, evidenceAccepted: false, startedAt: Date.now(), completedAt: null, environment: null, cleanupStatus: "complete", error: null });
    const evidence = this.dependencies.store.appendQualityEvidence({ runId: run.id, criterionId: input.criterionId, kind: "behavior", authority: "human", author: "user", status: input.status, summary: "User observation", output: input.observation, command: null, exitCode: null, timedOut: false, durationMs: 0, artifactPath: null, provider: null, sessionId: null, model: null });
    this.update(run.id, { status: input.status === "passed" ? "passed" : "inconclusive", evidenceAccepted: true, completedAt: Date.now() });
    this.changed(ticketId);
    return evidence;
  }

  async recover(): Promise<void> {
    this.dependencies.store.interruptQualityRequests();
    const interrupted = this.dependencies.store.listActiveQualityRuns();
    const pending = this.dependencies.store.listQualityRunsPendingCleanup();
    const runs = new Map([...interrupted, ...pending].map((run) => [run.id, run]));
    for (const run of runs.values()) {
      const ticket = this.dependencies.store.getTicket(run.ticketId);
      if (!ticket) continue;
      const project = getProject(ticket.project);
      if (run.status === "queued" || run.status === "running") this.update(run.id, { status: "interrupted", completedAt: Date.now(), error: "Backend restarted before quality validation completed." });
      try {
        if (await this.hasNativeCleanupObligation(run.id)) {
          this.markClosureUnknown(ticket.id);
          throw new Error("Native session closure is unconfirmed. Its private artifacts and validation workspace are retained.");
        }
        if (run.environment?.teardownCommand && run.configFingerprint !== configFingerprint(project)) throw new Error("Validation configuration changed; restore it before retrying environment cleanup.");
        if (run.environment?.teardownCommand) {
          const result = await this.dependencies.system.runValidationCommand({ cwd: run.environment.directory, command: run.environment.teardownCommand, environment: environmentFor(run.environment, project), timeoutMs: run.environment.timeoutMs ?? QUALITY_DEFAULT_TIMEOUT_MS });
          if (!commandSucceeded(result)) throw new Error("Recovered validation service teardown failed.");
        }
        await this.repoMutex.run(project.repoPath, () => this.dependencies.system.cleanupValidationWorkspace({ ticketId: ticket.id, runId: run.id, repoPath: project.repoPath, commitSha: run.revision }));
        this.update(run.id, { cleanupStatus: "complete" });
      } catch (error) { this.update(run.id, { cleanupStatus: "failed", error: getErrorMessage(error) }); }
    }
    for (const iteration of this.dependencies.store.listActiveQualityIterations()) {
      if (iteration.mode !== "recovery") continue;
      this.dependencies.store.updateQualityIteration(iteration.id, { status: "interrupted", diagnostic: "Backend restarted before quality iteration completed.", completedAt: Date.now() });
      this.changed(iteration.ticketId);
    }
  }

  async shutdown(): Promise<void> {
    this.shuttingDown = true;
    for (const pending of this.pendingManual.values()) pending.context.controller.abort();
    await Promise.all([...this.active.keys()].map((ticketId) => this.cancel(ticketId)));
  }

  private async revision(ticket: Ticket, refresh = false, manual?: ManualQualityContext): Promise<ValidationRevision> {
    const project = getProject(ticket.project);
    const slot = ticket.slotId === null ? null : this.dependencies.store.getSlot(ticket.slotId);
    const sourcePath = slot?.ticketId === ticket.id ? join(SLOTS_ROOT, `slot-${slot.id}`) : undefined;
    const recorded = this.get(ticket.id).runs.filter((run) => !run.preview && run.kind !== "combined").at(-1)?.revision;
    const key = fingerprint([project.repoPath, ticket.branch, recorded]);
    const cached = this.revisions.get(ticket.id);
    if (!sourcePath && !refresh && cached?.key === key && Date.now() - cached.at < REVISION_CACHE_MS) return cached.revision;
    const revision = await this.bounded(manual, this.repoMutex.run(project.repoPath, () => {
      if (manual) this.assertManualTime(manual);
      return this.dependencies.system.captureValidationRevision({ repoPath: project.repoPath, ...(sourcePath ? { sourcePath } : {}), ...(ticket.branch ? { branch: ticket.branch } : {}), ...(recorded && !this.dependencies.system.dryRun ? { revision: recorded } : {}), ...(manual ? { deadlineAt: manual.deadlineAt, signal: manual.controller.signal } : {}) });
    }));
    if (!sourcePath) this.revisions.set(ticket.id, { key, at: Date.now(), revision });
    return revision;
  }

  private ticket(ticketId: string): Ticket {
    const ticket = this.dependencies.store.getTicket(ticketId);
    if (!ticket) throw new Error("Ticket not found.");
    if (ticket.kind !== "feature") throw new Error("Quality validation is available for feature tickets only.");
    return ticket;
  }

  private update(runId: string, patch: Parameters<Store["updateQualityRun"]>[1]): void {
    const updated = this.dependencies.store.updateQualityRun(runId, patch);
    if (updated) this.changed(updated.ticketId);
  }

  private changed(ticketId: string): void {
    this.dependencies.onChange?.(ticketId);
  }
}
