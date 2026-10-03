import { createHash } from "node:crypto";
import { tmpdir } from "node:os";
import { join } from "node:path";

import type { Orchestrator } from "../../shared/constants.ts";
import { getErrorMessage } from "../../shared/errors.ts";
import { QUALITY_DEFAULT_TIMEOUT_MS, qualityBlockerCategory, qualityFollowUpIssueSchema } from "../../shared/quality.ts";
import type { CreateQualityFollowUpInput, QualityCriteriaPlan, QualityCriteriaSnapshot, QualityCriterion, QualityEnvironment, QualityEvidence, QualityFollowUp, QualityFollowUpIssue, QualityGate, QualityIteration, QualityIterationActions, QualityIterationTrigger, QualityPermissionDenial, QualityPreflight, QualityProblem, QualityRunPhase, StartQualityIterationInput, QualityValidationMode, QualityValidationRun, TicketQuality } from "../../shared/quality.ts";
import type { Ticket } from "../../shared/schemas.ts";
import { getProject, isProjectKey, MODELS, SLOTS_ROOT } from "../config.ts";
import type { ProjectConfig } from "../config.ts";
import type { Store } from "../db/store.ts";
import { createLogger } from "../logger.ts";
import { KeyedMutex } from "../mutex.ts";
import { parsePackageManifest, LOCKFILE_NAMES } from "../system/repoInspection.ts";
import type { SystemAdapter, ValidationCommandResult, ValidationRevision, ValidationServiceHandle, ValidationWorkspaceOptions } from "../system/types.ts";
import { validationDatabasePath } from "../system/validationWorkspace.ts";

import { resolveExecution } from "./executionConfig.ts";
import { prepareQualityCriteria } from "./qualityCriteriaPreparation.ts";
import { runQualityValidator } from "./qualityValidator.ts";

const log = createLogger("quality");
const CHECK_NAMES = ["typecheck", "lint", "test"] satisfies Array<"typecheck" | "lint" | "test">;
const HEALTH_POLL_MS = 250;
const HEALTH_REQUEST_TIMEOUT_MS = 2_000;
const OUTPUT_LIMIT = 32_768;
const PREVIOUS_OBSERVATION_LIMIT = 2_000;
const REVISION_CACHE_MS = 3_000;
const DEFAULT_CHECK_RUNNER = "npm run";
const CHECK_RUNNERS: Record<string, string> = { "bun.lock": "bun run", "bun.lockb": "bun run", "pnpm-lock.yaml": "pnpm", "yarn.lock": "yarn", "package-lock.json": "npm run" };
const DATABASE_ISOLATION_PLACEHOLDERS = ["${VALIDATION_DATABASE_NAMESPACE}", "${VALIDATION_DATABASE_PATH}", "${VALIDATION_RUN_DIRECTORY}", "${VALIDATION_PORT}"];
const SIMULATED_CRITERION_ID = "SIMULATED";
const SIMULATED_CRITERION_TEXT = "Simulation uniquement : l’acceptation indépendante n’a pas été vérifiée.";
const SIMULATED_VALIDATION_MESSAGE = "Une simulation ne produit pas de preuve de validation indépendante.";
const SIMULATED_VALIDATION_OUTPUT = "Cette simulation n’a pas inspecté le code commité ni exécuté de validation indépendante.";
const SIMULATED_CHECKS_MESSAGE = "Une simulation ne peut pas détecter les commandes de vérification du dépôt.";
const FULL_KINDS: Array<QualityValidationRun["kind"]> = ["full"];
const TECHNICAL_KINDS: Array<QualityValidationRun["kind"]> = ["checks", "full"];
const INCOMPLETE_RUN_STATUSES: Array<QualityValidationRun["status"]> = ["queued", "running", "cancelled", "interrupted"];
const ACTIVE_ITERATION_MESSAGE = "A quality run or iteration is already active for this ticket.";
const ITERATION_MISMATCH_MESSAGE = "The requested iteration does not match the source validation diagnostic.";
const CHECKS_STALLED_MESSAGE = "The same technical checks still fail after a correction attempt; inspect the evidence or create a correction card.";
const RECOVERY_STALLED_MESSAGE = "The same read blocker persisted after a recovery attempt with the same code and permissions; inspect the evidence or create a correction card.";
const FOLLOW_UP_CHECKS_MISSING = "The source run has no recorded technical check failure.";
const FOLLOW_UP_BLOCKER_MISSING = "The source run has no recorded read blocker.";
const FOLLOW_UP_STALE_SOURCE = "The source run is no longer the latest run for this issue; refresh the validation before creating a correction card.";
const FOLLOW_UP_TITLE_LIMIT = 160;
const FOLLOW_UP_OUTPUT_LIMIT = 2_000;
const FOLLOW_UP_INLINE_LIMIT = 300;
const FOLLOW_UP_DESCRIPTION_LIMIT = 20_000;

export interface QualityManagerDependencies {
  store: Store;
  system: SystemAdapter;
  repoMutex?: KeyedMutex;
  onChange?: (ticketId: string) => void;
  artifactDirectory?: string;
}

interface ActiveQualityRun {
  controller: AbortController;
  completion: Promise<void>;
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
  return quality.runs.filter((run) => kinds.includes(run.kind)).at(-1);
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
    const selectedMode = mode ?? this.get(ticketId).criteriaSnapshots.at(-1)?.mode ?? "repository";
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
    const criteria = this.get(ticketId).criteriaSnapshots.at(-1);
    if (!criteria) reservations.push("Acceptance criteria will be prepared automatically during verification.");
    else if (criteria.sourceFingerprint !== sourceFingerprint(ticket)) reservations.push("The ticket or PRD changed after the acceptance criteria were recorded.");
    if (criteria?.mode === "browser") {
      if (!project.validation?.isolated) reservations.push("An isolated browser validation environment is not configured.");
      if (!project.validation?.startCommand) reservations.push("No isolated application start command is configured.");
    }
    if (this.active.has(ticketId)) blockers.push("A quality run is already active for this ticket.");
    return { ok: blockers.length === 0, blockers, reservations, revision, configFingerprint: configFingerprint(project) };
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

  private checksCandidate(quality: TicketQuality): QualityValidationRun | undefined {
    const run = latestRun(quality, TECHNICAL_KINDS);
    if (!run || run.simulated || INCOMPLETE_RUN_STATUSES.includes(run.status) || !technicalRunAccepted(run) || run.cleanupStatus !== "complete") return undefined;
    return this.failingChecks(run, quality).length > 0 ? run : undefined;
  }

  private checksStalled(source: QualityValidationRun, quality: TicketQuality): boolean {
    const names = new Set(this.failingChecks(source, quality).map((entry) => entry.summary));
    return quality.iterations.some((iteration) => {
      if (iteration.resultRunId !== source.id || iteration.mode !== "correction" || iteration.trigger !== "checks") return false;
      const previous = quality.runs.find((run) => run.id === iteration.sourceRunId);
      if (!previous) return false;
      const previousNames = new Set(this.failingChecks(previous, quality).map((entry) => entry.summary));
      return [...names].every((name) => previousNames.has(name));
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

  private async checksCorrectionPullRequest(ticket: Ticket, source: QualityValidationRun, quality: TicketQuality, retryOfIterationId?: string): Promise<{ prUrl: string; headBranch: string }> {
    await this.requireFreshSource(ticket, source, quality, retryOfIterationId, TECHNICAL_KINDS);
    const linked = await this.correctionPullRequest(ticket, source);
    if (!this.correctionStarter) throw new Error("Quality correction is unavailable.");
    if (this.checksStalled(source, quality)) throw new Error(CHECKS_STALLED_MESSAGE);
    return linked;
  }

  private problems(quality: TicketQuality, repeated: Set<string>): QualityProblem[] {
    const problems: QualityProblem[] = [];
    const technical = latestRun(quality, TECHNICAL_KINDS);
    if (technical && !technical.simulated && !INCOMPLETE_RUN_STATUSES.includes(technical.status)) {
      for (const entry of this.failingChecks(technical, quality)) {
        problems.push({ id: `check:${entry.id}`, kind: "technical_check", authority: "server", runId: technical.id, summary: entry.summary, evidenceId: entry.id, criterionId: null, blockReason: null, category: null, toolName: null, commandShape: null, occurrences: 1, repeated: false });
      }
    }
    const full = latestRun(quality, FULL_KINDS);
    if (!full || full.simulated || INCOMPLETE_RUN_STATUSES.includes(full.status)) return problems;
    for (const [key, group] of groupDenials(full.diagnostic?.permissionDenials ?? [])) {
      const [denial] = group;
      if (!denial) continue;
      problems.push({ id: `blocker:${full.id}:${key}`, kind: "read_blocker", authority: "server", runId: full.id, summary: denial.toolName, evidenceId: null, criterionId: null, blockReason: denial.blockReason, category: qualityBlockerCategory(denial.blockReason), toolName: denial.toolName, commandShape: denial.commandShape, occurrences: group.length, repeated: denial.signature !== null && repeated.has(denial.signature) });
    }
    const snapshot = quality.criteriaSnapshots.find((entry) => entry.id === full.criteriaSnapshotId);
    for (const criterion of snapshot?.criteria ?? []) {
      if (!criterion.required) continue;
      const evidence = quality.evidence.filter((entry) => entry.runId === full.id && entry.criterionId === criterion.id && entry.authority === "agent").at(-1);
      if (evidence?.status === "passed") continue;
      problems.push({ id: `criterion:${full.id}:${criterion.id}`, kind: evidence?.status === "failed" ? "criterion_failed" : "criterion_unverified", authority: "agent", runId: full.id, summary: criterion.text, evidenceId: evidence?.id ?? null, criterionId: criterion.id, blockReason: null, category: null, toolName: null, commandShape: null, occurrences: 1, repeated: false });
    }
    return problems;
  }

  private followUpSource(quality: TicketQuality, issue: QualityFollowUpIssue): { run: QualityValidationRun | undefined; reason: string | null } {
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
    const requestId = `${followUpPrefix(ticketId)}${run.id}:${input.issue}`;
    const request = this.dependencies.store.listTicketCreationRequestsByPrefix(requestId).find((entry) => entry.requestId === requestId);
    const existingTicket = request ? this.dependencies.store.getTicket(request.ticketId) : null;
    const prefix = input.issue === "checks" ? "Corriger les contrôles en échec" : "Diagnostiquer le blocage de validation";
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
    const checksSource = this.checksCandidate(quality);
    const checksRetry = checksSource ? quality.iterations.filter((entry) => entry.sourceRunId === checksSource.id && entry.mode === "correction" && entry.trigger === "checks" && entry.status !== "completed").at(-1)?.id ?? null : null;
    let checksReason: string | null = null;
    if (!checksSource) checksReason = "No completed real technical check failure is available for correction.";
    else if (busy) checksReason = ACTIVE_ITERATION_MESSAGE;
    else {
      try { await this.checksCorrectionPullRequest(ticket, checksSource, quality, checksRetry ?? undefined); } catch (error) { checksReason = getErrorMessage(error); }
    }
    const checksFollowUp = this.followUpSource(quality, "checks");
    const blockerFollowUp = this.followUpSource(quality, "blocker");
    return {
      sourceRunId: source?.id ?? null, recommendedMode, retryOfIterationId,
      recovery: { available: recoveryReason === null && recommendedMode === "recovery", reason: recoveryReason ?? (recommendedMode === "recovery" ? null : "Observed code nonconformance requires correction before full verification.") },
      correction: { available: correctionReason === null && recommendedMode === "correction", reason: correctionReason ?? (recommendedMode === "correction" ? null : "No required criterion has an attributed code nonconformance.") },
      checksCorrection: { available: checksReason === null, reason: checksReason, sourceRunId: checksSource?.id ?? null, retryOfIterationId: checksRetry },
      followUp: {
        checks: { available: checksFollowUp.reason === null, reason: checksFollowUp.reason, sourceRunId: checksFollowUp.run?.id ?? null },
        blocker: { available: blockerFollowUp.reason === null, reason: blockerFollowUp.reason, sourceRunId: blockerFollowUp.run?.id ?? null },
      },
      problems: this.problems(quality, repeated),
      followUps: this.followUps(ticketId),
    };
  }

  private async requireFreshSource(ticket: Ticket, source: QualityValidationRun, quality: TicketQuality, retryOfIterationId: string | undefined, kinds: Array<QualityValidationRun["kind"]>): Promise<void> {
    if (ticket.testing) throw new Error("Finish the interactive test session before starting a quality iteration.");
    const latest = latestRun(quality, kinds);
    if (latest?.id !== source.id) throw new Error(kinds.includes("checks") ? "The source technical run is no longer the latest technical run." : "The source validation is no longer the latest full run.");
    const snapshot = quality.criteriaSnapshots.at(-1);
    if ((snapshot?.id ?? null) !== source.criteriaSnapshotId || snapshot && snapshot.sourceFingerprint !== sourceFingerprint(ticket)) throw new Error("The ticket or acceptance criteria changed after the source validation.");
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
    return this.starts.run(ticketId, async () => {
      if (this.shuttingDown) throw new Error("Quality validation is shutting down.");
      const ticket = this.ticket(ticketId);
      const quality = this.get(ticketId);
      const trigger = input.trigger ?? defaultTrigger(input.mode);
      const duplicate = quality.iterations.find((entry) => entry.sourceRunId === input.sourceRunId && entry.mode === input.mode && entry.retryOfIterationId === (input.retryOfIterationId ?? null) && (entry.trigger ?? defaultTrigger(entry.mode)) === trigger);
      if (duplicate) return duplicate;
      this.requireNoIteration(ticketId);
      if (this.active.has(ticketId)) throw new Error("A quality run is already active for this ticket.");
      const source = quality.runs.find((run) => run.id === input.sourceRunId);
      if (!source || source.simulated) throw new Error(ITERATION_MISMATCH_MESSAGE);
      let linked = { prUrl: ticket.prUrl, headBranch: ticket.branch };
      let evidenceIds: string[] = [];
      if (input.mode === "correction" && trigger === "checks") {
        if (this.checksCandidate(quality)?.id !== source.id) throw new Error(ITERATION_MISMATCH_MESSAGE);
        linked = await this.checksCorrectionPullRequest(ticket, source, quality, input.retryOfIterationId);
        evidenceIds = this.failingChecks(source, quality).map((entry) => entry.id);
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
    await this.starts.run(ticketId, async () => {
      const iteration = this.dependencies.store.getQualityIteration(iterationId);
      if (!iteration || iteration.ticketId !== ticketId || iteration.mode !== "correction") throw new Error("The correction iteration is not ready for independent verification.");
      if (iteration.resultRunId !== null) return;
      if (iteration.status !== "verifying") throw new Error("The correction iteration is not ready for independent verification.");
      const ticket = this.ticket(ticketId);
      const slot = ticket.slotId === null ? null : this.dependencies.store.getSlot(ticket.slotId);
      if (!slot || slot.ticketId !== ticketId || worktreePath !== join(SLOTS_ROOT, `slot-${slot.id}`)) throw new Error("Independent correction verification must use the ticket's assigned worktree.");
      await this.launch(ticketId, "full", iteration.provider, iteration, worktreePath);
    });
  }

  private start(ticketId: string, kind: QualityValidationRun["kind"], provider: Orchestrator | null): Promise<QualityValidationRun> {
    return this.starts.run(ticketId, async () => {
      this.requireNoIteration(ticketId);
      return this.launch(ticketId, kind, provider);
    });
  }

  private async launch(ticketId: string, kind: QualityValidationRun["kind"], provider: Orchestrator | null, iteration?: QualityIteration, sourcePath?: string): Promise<QualityValidationRun> {
    if (this.shuttingDown) throw new Error("Quality validation is shutting down.");
    if (this.active.has(ticketId)) throw new Error("A quality run is already active for this ticket.");
    const ticket = this.ticket(ticketId);
    const project = getProject(ticket.project);
    const databaseProblem = databaseIsolationProblem(project);
    if (databaseProblem) throw new Error(databaseProblem);
    const criteria = iteration ? iteration.criteriaSnapshot ?? undefined : this.get(ticketId).criteriaSnapshots.at(-1);
    const source = iteration ? this.dependencies.store.getQualityRun(iteration.sourceRunId) : null;
    if (iteration && (!source || source.configFingerprint !== configFingerprint(project) || sourceFingerprint(ticket) !== fingerprint([iteration.originalTicket.title, iteration.originalTicket.description, iteration.originalTicket.prdMarkdown]))) throw new Error("The ticket or validation configuration changed during the quality iteration.");
    if (kind === "behavior" && !criteria) throw new Error("Define acceptance criteria before starting behavioral validation.");
    const revision = sourcePath
      ? await this.repoMutex.run(project.repoPath, () => this.dependencies.system.captureValidationRevision({ repoPath: project.repoPath, sourcePath, ...(iteration?.headBranch ? { branch: iteration.headBranch } : {}) }))
      : await this.revision(ticket, true);
    if (iteration?.mode === "recovery") {
      if (!source || revision.commitSha !== source.revision || revision.fingerprint !== source.fingerprint || !revision.clean) throw new Error("The validated revision changed before recovery started.");
    }
    if (iteration?.mode === "correction" && (!revision.clean || revision.commitSha !== iteration.resultRevision)) throw new Error("The corrected revision changed before independent verification started.");
    if (this.shuttingDown) throw new Error("Quality validation is shutting down.");
    const selectedMode = criteria?.mode ?? (kind === "checks" ? "repository" : null);
    const run = this.dependencies.store.createQualityRun({ ticketId, criteriaSnapshotId: criteria?.id ?? null, mode: selectedMode, phase: null, failurePhase: null, kind, revision: revision.commitSha, fingerprint: revision.fingerprint, configFingerprint: configFingerprint(project), status: "queued", provider, simulated: this.dependencies.system.dryRun, evidenceAccepted: false, startedAt: Date.now(), completedAt: null, environment: null, cleanupStatus: "pending", error: null });
    const controller = new AbortController();
    if (iteration) this.dependencies.store.updateQualityIteration(iteration.id, { status: "verifying", resultRunId: run.id, resultRevision: run.revision });
    const settleRetainedSlot = iteration?.mode === "recovery" && this.parkedCorrection(ticket, iteration.sourceRunId, this.get(ticketId)) !== undefined;
    const completion = this.execute(run, ticket, project, criteria, controller.signal, iteration).finally(async () => {
      if (this.active.get(ticketId)?.controller === controller) this.active.delete(ticketId);
      if (iteration && this.dependencies.store.getActiveQualityIteration(ticketId)?.id === iteration.id) {
        const result = this.dependencies.store.getQualityRun(run.id);
        if (result) {
          let status: QualityIteration["status"] = "failed";
          const accepted = result.status === "passed" && !result.simulated && result.evidenceAccepted && result.technicalEvidenceAccepted && result.cleanupStatus === "complete";
          const gate = accepted ? await this.gate(ticketId, "strict") : null;
          if (gate?.complete) status = "completed";
          else if (result.status === "cancelled") status = "cancelled";
          if (iteration.mode === "correction" || settleRetainedSlot) await this.iterationSettled?.(ticketId, iteration.id, run.id, result.status);
          else this.dependencies.store.updateQualityIteration(iteration.id, { status, diagnostic: result.error ?? gate?.reservations.join("; ") ?? null, completedAt: Date.now() });
        }
      }
      this.changed(ticketId);
    }).catch((error: unknown) => { log.warn("quality iteration settlement failed", { ticketId, runId: run.id, error: getErrorMessage(error) }); });
    this.active.set(ticketId, { controller, completion });
    this.changed(ticketId);
    return run;
  }

  private async execute(run: QualityValidationRun, ticket: Ticket, project: ProjectConfig, criteria: QualityCriteriaSnapshot | undefined, signal: AbortSignal, iteration?: QualityIteration): Promise<void> {
    const options: ValidationWorkspaceOptions = { ticketId: ticket.id, runId: run.id, repoPath: project.repoPath, commitSha: run.revision };
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
      const prepared = await this.repoMutex.run(project.repoPath, () => this.dependencies.system.prepareValidationWorkspace(options));
      environment = { directory: prepared.cwd, dataDirectory: prepared.dataDirectory, port: prepared.port, databaseNamespace: prepared.databaseNamespace, addresses: [], timeoutMs: project.validation?.timeoutMs ?? QUALITY_DEFAULT_TIMEOUT_MS };
      this.update(run.id, { environment });
      const variables = environmentFor(environment, project);
      const timeoutMs = project.validation?.timeoutMs ?? QUALITY_DEFAULT_TIMEOUT_MS;
      const originalFingerprint = await this.dependencies.system.codeFingerprint(environment.directory);
      const execution = resolveExecution("quality-validator", { orchestrator: run.provider ?? ticket.orchestrator, model: ticket.model, effort: ticket.effort, codexModel: ticket.codexModel, codexEffort: ticket.codexEffort, codexFast: ticket.codexFast }, { model: MODELS.triage, effort: MODELS.triageEffort });
      if (run.kind === "full" && !activeCriteria) {
        phase = "planning";
        this.update(run.id, { phase });
        const plan = this.dependencies.system.dryRun
          ? { mode: "repository", criteria: [{ id: SIMULATED_CRITERION_ID, text: SIMULATED_CRITERION_TEXT, source: "ticket", required: true, independent: true }] } satisfies QualityCriteriaPlan
          : await prepareQualityCriteria({ ticketId: ticket.id, cwd: environment.directory, execution, title: ticket.title, description: ticket.description, prd: ticket.prdMarkdown ?? "", environment: variables, signal, timeoutMs, startSession: (sessionOptions) => this.dependencies.system.startAgentSession(sessionOptions) });
        if (signal.aborted) throw new Error("Quality run cancelled.");
        if (originalFingerprint !== await this.dependencies.system.codeFingerprint(environment.directory)) throw new Error("Criteria preparation modified the committed validation source.");
        const currentTicket = this.ticket(ticket.id);
        if (sourceFingerprint(currentTicket) !== sourceFingerprint(ticket)) throw new Error("Ticket changed while acceptance criteria were being prepared.");
        activeCriteria = this.get(ticket.id).criteriaSnapshots.at(-1) ?? this.dependencies.store.createQualityCriteriaSnapshot(ticket.id, { criteria: plan.criteria, mode: plan.mode, sourceFingerprint: sourceFingerprint(currentTicket), createdBy: this.dependencies.system.dryRun ? "system" : "agent" });
        this.update(run.id, { criteriaSnapshotId: activeCriteria.id, mode: activeCriteria.mode });
      }
      phase = "preparing";
      this.update(run.id, { phase });
      if (!this.dependencies.system.dryRun && activeCriteria?.mode === "browser" && run.kind !== "checks" && (!project.validation?.isolated || !project.validation.startCommand)) throw new Error("Configure isolated services and an application start command before browser validation.");
      if (project.validation?.setupCommand) {
        if (!project.validation.isolated) throw new Error("Validation setup requires an isolated environment.");
        environment = { ...environment, ...(project.validation.teardownCommand ? { teardownCommand: project.validation.teardownCommand } : {}) };
        this.update(run.id, { environment });
        const setup = await this.command(run, "Environment setup", project.validation.setupCommand, environment, variables, timeoutMs, signal);
        if (!commandSucceeded(setup)) throw new Error("Validation environment setup failed.");
      }
      const installation = await this.dependencies.system.installValidationDeps({ cwd: environment.directory, environment: variables, timeoutMs: Math.max(timeoutMs, project.commitTimeoutMs), signal });
      if (installation) {
        this.recordCommand(run, "Dependency installation", installation.command, installation.result);
        if (!commandSucceeded(installation.result)) throw new Error(`Dependency installation failed. ${outputFor(installation.result)}`);
      }
      const baseline = await this.dependencies.system.codeFingerprint(environment.directory);
      if (baseline !== originalFingerprint) throw new Error("Environment preparation modified the committed validation source.");
      preparedFingerprint = baseline;
      let technicalPassed = true;
      if (run.kind === "checks" || run.kind === "full") {
        phase = "checks";
        this.update(run.id, { phase });
        const commands = await this.checkCommands(project, environment.directory);
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
        if (baseline !== await this.dependencies.system.codeFingerprint(environment.directory)) throw new Error("Checks modified the validated source; their evidence cannot be accepted.");
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
        if (activeCriteria.mode === "browser") {
          if (!project.validation?.isolated || !project.validation.startCommand) throw new Error("Configure isolated services and an application start command before browser validation.");
          environment = { ...environment, addresses: [{ label: "Validation application", url: `http://127.0.0.1:${environment.port}` }], ...(project.validation.teardownCommand ? { teardownCommand: project.validation.teardownCommand } : {}) };
          this.update(run.id, { environment });
          service = this.dependencies.system.startValidationService({ cwd: environment.directory, command: project.validation.startCommand, environment: variables, timeoutMs, signal });
          await this.waitForHealth(environment, project, service, signal);
        }
        const artifactDirectory = join(this.dependencies.artifactDirectory ?? join(tmpdir(), "kanban-quality-artifacts"), run.id);
        const quality = this.get(ticket.id);
        const criteriaSnapshotId = activeCriteria.id;
        const acceptedChecks = quality.runs.filter((candidate) => (candidate.kind === "checks" || candidate.kind === "full") && !candidate.simulated && candidate.revision === run.revision && candidate.fingerprint === run.fingerprint && candidate.configFingerprint === run.configFingerprint && candidate.criteriaSnapshotId === criteriaSnapshotId && technicalRunAccepted(candidate) && (candidate.id === run.id || !iteration && candidate.cleanupStatus === "complete")).at(-1);
        const checks = quality.evidence.filter((entry) => entry.runId === acceptedChecks?.id && entry.kind === "command" && entry.authority === "server" && entry.status !== "inconclusive" && CHECK_NAMES.some((name) => name === entry.summary));
        const sourceRun = iteration ? this.dependencies.store.getQualityRun(iteration.sourceRunId) : null;
        const previousValidation = sourceRun ? {
          revision: sourceRun.revision, error: sourceRun.error, diagnostic: sourceRun.diagnostic,
          observations: quality.evidence.filter((entry) => entry.runId === sourceRun.id).map(({ criterionId, status, summary, output, timedOut }) => ({ criterionId, status, summary, output: output.slice(-PREVIOUS_OBSERVATION_LIMIT), timedOut })),
        } : undefined;
        const result = await runQualityValidator({ previousValidation, ticketId: ticket.id, runId: run.id, cwd: environment.directory, execution, criteria: activeCriteria.criteria, mode: activeCriteria.mode, revisionSha: run.revision, environment: variables, checks, addresses: environment.addresses ?? [], signal, timeoutMs, artifactDirectory, startSession: (sessionOptions) => this.dependencies.system.startAgentSession(sessionOptions) });
        if (!result.sessionId) throw new Error("Validator returned no independently attributable session identity.");
        if (signal.aborted) throw new Error("Quality run cancelled.");
        const criterionIds = result.evidence.map((evidence) => evidence.criterionId);
        if (new Set(criterionIds).size !== criterionIds.length) throw new Error("Validator returned duplicate acceptance criteria.");
        const knownCriteria = activeCriteria.criteria;
        if (result.evidence.some((evidence) => !knownCriteria.some((criterion) => criterion.id === evidence.criterionId))) throw new Error("Validator returned an unknown acceptance criterion.");
        if (result.evidence.some((evidence) => evidence.sessionId !== result.sessionId || evidence.provider !== run.provider || evidence.authority !== "agent")) throw new Error("Validator evidence has inconsistent session provenance.");
        if (baseline !== await this.dependencies.system.codeFingerprint(environment.directory)) throw new Error("Validator modified the validated source; its evidence cannot be accepted.");
        if (signal.aborted) throw new Error("Quality run cancelled.");
        for (const evidence of result.evidence) {
          this.dependencies.store.appendQualityEvidence({ runId: run.id, criterionId: evidence.criterionId, kind: "behavior", authority: "agent", author: "agent", status: evidence.status, summary: evidence.summary, output: evidence.output, command: null, exitCode: null, timedOut: evidence.timedOut, durationMs: evidence.durationMs, artifactPath: evidence.artifactPath, provider: run.provider, sessionId: result.sessionId, model: execution.model });
        }
        const behavioralPassed = knownCriteria.filter((criterion) => criterion.required).every((criterion) => result.evidence.some((evidence) => evidence.criterionId === criterion.id && evidence.status === "passed"));
        const behavioralFailed = knownCriteria.some((criterion) => criterion.required && result.evidence.some((evidence) => evidence.criterionId === criterion.id && evidence.status === "failed"));
        let status: "passed" | "failed" | "inconclusive" = "inconclusive";
        if (technicalPassed && behavioralPassed) status = "passed";
        else if (!technicalPassed || behavioralFailed) status = "failed";
        let error: string | null = null;
        if (!technicalPassed) error = "One or more technical checks failed.";
        else if (!behavioralPassed) error = "Some required acceptance criteria were not independently verified.";
        let failurePhase: QualityRunPhase | null = null;
        if (!technicalPassed) failurePhase = "checks";
        else if (!behavioralPassed) failurePhase = "validating";
        let diagnostic = result.diagnostic ?? null;
        if (!diagnostic && !technicalPassed) diagnostic = { category: "backend_checks_failed", summary: "One or more server-run checks failed; source-code nonconformance is unconfirmed.", permissionDenials: [] };
        outcome = { status, evidenceAccepted: true, failurePhase, error, diagnostic };
      }
    } catch (error) {
      let reason = getErrorMessage(error);
      if (phase === "preparing" && !signal.aborted) reason = `Validation environment preparation failed: ${reason}`;
      outcome = { status: signal.aborted ? "cancelled" : "failed", evidenceAccepted: false, failurePhase: phase, error: reason, diagnostic: { category: "validation_incomplete", summary: reason, permissionDenials: [] } };
      log.warn("quality run ended without acceptance", { ticketId: ticket.id, runId: run.id, phase, error: reason });
    } finally {
      this.update(run.id, { phase: "cleanup" });
      let cleanupError: string | null = null;
      try { await service?.stop(); } catch (error) { cleanupError = getErrorMessage(error); }
      if (environment?.teardownCommand) {
        try {
          const result = await this.dependencies.system.runValidationCommand({ cwd: environment.directory, command: environment.teardownCommand, environment: environmentFor(environment, project), timeoutMs: environment.timeoutMs ?? QUALITY_DEFAULT_TIMEOUT_MS });
          if (!commandSucceeded(result)) cleanupError = "Validation service teardown failed.";
        } catch (error) { cleanupError = getErrorMessage(error); }
      }
      if (environment && preparedFingerprint && (technicalEvidenceAccepted || outcome?.evidenceAccepted)) {
        try {
          if (preparedFingerprint !== await this.dependencies.system.codeFingerprint(environment.directory)) {
            technicalEvidenceAccepted = false;
            outcome = { ...outcome, status: "failed", evidenceAccepted: false, failurePhase: outcome?.failurePhase ?? "cleanup", error: "Validated source changed before final acceptance; its evidence cannot be accepted." };
          }
        } catch (error) {
          technicalEvidenceAccepted = false;
          outcome = { ...outcome, status: "failed", evidenceAccepted: false, failurePhase: outcome?.failurePhase ?? "cleanup", error: getErrorMessage(error) };
        }
      }
      if (cleanupError === null) {
        try { await this.repoMutex.run(project.repoPath, () => this.dependencies.system.cleanupValidationWorkspace(options)); } catch (error) { cleanupError = getErrorMessage(error); }
      }
      if (signal.aborted) {
        technicalEvidenceAccepted = false;
        outcome = { ...outcome, status: "cancelled", evidenceAccepted: false, error: "Quality run cancelled." };
      }
      this.update(run.id, { ...outcome, technicalEvidenceAccepted, completedAt: Date.now(), cleanupStatus: cleanupError ? "failed" : "complete", ...(cleanupError ? { error: cleanupError } : {}) });
    }
  }

  private async command(run: QualityValidationRun, name: string, command: string, environment: QualityEnvironment, variables: Record<string, string>, timeoutMs: number, signal: AbortSignal): Promise<ValidationCommandResult> {
    const result = await this.dependencies.system.runValidationCommand({ cwd: environment.directory, command, environment: variables, timeoutMs, signal });
    this.recordCommand(run, name, command, result);
    return result;
  }

  private recordCommand(run: QualityValidationRun, name: string, command: string, result: ValidationCommandResult): void {
    this.dependencies.store.appendQualityEvidence({ runId: run.id, criterionId: null, kind: "command", authority: "server", author: "system", status: commandSucceeded(result) ? "passed" : "failed", summary: name, output: outputFor(result), command, exitCode: result.exitCode, timedOut: result.timedOut, durationMs: result.durationMs, artifactPath: null, provider: null, sessionId: null, model: null });
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
    let runner = DEFAULT_CHECK_RUNNER;
    for (const name of LOCKFILE_NAMES) {
      if (await Bun.file(join(directory, name)).exists()) { runner = CHECK_RUNNERS[name] ?? DEFAULT_CHECK_RUNNER; break; }
    }
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
    throw new Error(signal.aborted ? "Quality run cancelled." : `Isolated application did not become healthy. ${service.output()}`);
  }

  async cancel(ticketId: string): Promise<void> {
    await this.starts.run(ticketId, async () => {
      const iteration = this.dependencies.store.getActiveQualityIteration(ticketId);
      if (iteration) this.dependencies.store.updateQualityIteration(iteration.id, { status: "cancelled", completedAt: Date.now(), diagnostic: "Quality iteration cancelled." });
      if (iteration?.mode === "correction") await this.iterationCancellation?.(ticketId, iteration.id);
      const active = this.active.get(ticketId);
      active?.controller.abort();
      await active?.completion;
      if (iteration) this.changed(ticketId);
    });
  }

  async gate(ticketId: string, mode: "strict" | "reservations"): Promise<QualityGate> {
    const ticket = this.ticket(ticketId);
    const project = getProject(ticket.project);
    const quality = this.get(ticketId);
    const snapshot = quality.criteriaSnapshots.at(-1);
    const enabled = ticket.kind === "feature" && (project.validation?.enabled === true || quality.runs.length > 0 || !!snapshot);
    const reservations: string[] = [];
    const requiredCriteria = snapshot?.criteria.filter((criterion) => criterion.required).map((criterion) => criterion.id) ?? [];
    const verifiedCriteria: string[] = [];
    const currentRunIds: string[] = [];
    let stale = false;
    if (enabled) {
      let current: ValidationRevision | null = null;
      try { current = await this.revision(ticket, mode === "strict"); } catch (error) { reservations.push(getErrorMessage(error)); }
      const currentRuns = quality.runs.filter((run) => run.revision === current?.commitSha && run.fingerprint === current?.fingerprint && run.configFingerprint === configFingerprint(project) && run.criteriaSnapshotId === (snapshot?.id ?? null));
      currentRunIds.push(...currentRuns.map((run) => run.id));
      const relevant = currentRuns.filter((run) => !run.simulated && run.cleanupStatus === "complete");
      const technical = relevant.filter((run) => run.kind === "checks" || run.kind === "full").at(-1);
      const technicalEvidence = quality.evidence.filter((evidence) => evidence.runId === technical?.id && evidence.kind === "command" && CHECK_NAMES.some((name) => name === evidence.summary));
      const acceptedTechnical = technical && technicalRunAccepted(technical);
      if (!acceptedTechnical || technicalEvidence.length === 0 || technicalEvidence.some((evidence) => evidence.authority !== "server" || evidence.status !== "passed" || evidence.exitCode !== 0 || evidence.timedOut)) reservations.push("Current server-run technical checks are missing or unsuccessful.");
      const requireBehavioral = project.validation?.requireBehavioral ?? !!snapshot;
      const latestChecks = quality.runs.filter((run) => run.kind === "checks" || run.kind === "full").at(-1);
      const latestBehavior = quality.runs.filter((run) => (run.kind === "behavior" || run.kind === "full") && (!requireBehavioral || run.provider !== null)).at(-1);
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
      if (this.active.has(ticketId)) reservations.push("Quality validation is still running.");
      const activeIteration = this.dependencies.store.getActiveQualityIteration(ticketId);
      if (activeIteration?.status === "queued" || activeIteration?.status === "correcting") reservations.push("Quality correction is still running.");
      if (quality.iterations.length > 0) {
        const latestFull = quality.runs.filter((run) => run.kind === "full").at(-1);
        const fullAccepted = latestFull && currentRunIds.includes(latestFull.id) && !latestFull.simulated && latestFull.status === "passed" && latestFull.evidenceAccepted && latestFull.technicalEvidenceAccepted && latestFull.cleanupStatus === "complete";
        verifiedCriteria.splice(0, verifiedCriteria.length);
        if (fullAccepted) {
          for (const criterion of snapshot?.criteria ?? []) {
            if (quality.evidence.some((entry) => entry.runId === latestFull.id && entry.criterionId === criterion.id && entry.authority === "agent" && entry.status === "passed")) verifiedCriteria.push(criterion.id);
          }
        }
        if (!fullAccepted || requiredCriteria.some((criterionId) => !verifiedCriteria.includes(criterionId))) reservations.push("The latest full independent verification has not accepted every required criterion.");
      }
      if (quality.runs.some((run) => run.cleanupStatus === "failed")) reservations.push("A validation environment still requires cleanup.");
    }
    const complete = reservations.length === 0;
    return { enabled, complete, reservations, allowed: !enabled || complete || mode === "reservations", stale, reasons: reservations, requiredCriteria, verifiedCriteria, currentRunIds };
  }

  async recordManualEvidence(ticketId: string, input: { criterionId: string; observation: string; status: "passed" | "failed" | "inconclusive" }): Promise<QualityEvidence> {
    const ticket = this.ticket(ticketId);
    this.requireNoIteration(ticketId);
    const project = getProject(ticket.project);
    const snapshot = this.get(ticketId).criteriaSnapshots.at(-1);
    if (!snapshot?.criteria.some((criterion) => criterion.id === input.criterionId)) throw new Error("Acceptance criterion does not exist in the current version.");
    const revision = await this.revision(ticket, true);
    const run = this.dependencies.store.createQualityRun({ ticketId, criteriaSnapshotId: snapshot.id, kind: "behavior", revision: revision.commitSha, fingerprint: revision.fingerprint, configFingerprint: configFingerprint(project), status: "running", provider: null, simulated: false, evidenceAccepted: false, startedAt: Date.now(), completedAt: null, environment: null, cleanupStatus: "complete", error: null });
    const evidence = this.dependencies.store.appendQualityEvidence({ runId: run.id, criterionId: input.criterionId, kind: "behavior", authority: "human", author: "user", status: input.status, summary: "User observation", output: input.observation, command: null, exitCode: null, timedOut: false, durationMs: 0, artifactPath: null, provider: null, sessionId: null, model: null });
    this.update(run.id, { status: input.status === "passed" ? "passed" : "inconclusive", evidenceAccepted: true, completedAt: Date.now() });
    this.changed(ticketId);
    return evidence;
  }

  async recover(): Promise<void> {
    const interrupted = this.dependencies.store.listActiveQualityRuns();
    const pending = this.dependencies.store.listQualityRunsPendingCleanup();
    const runs = new Map([...interrupted, ...pending].map((run) => [run.id, run]));
    for (const run of runs.values()) {
      const ticket = this.dependencies.store.getTicket(run.ticketId);
      if (!ticket) continue;
      const project = getProject(ticket.project);
      if (run.status === "queued" || run.status === "running") this.update(run.id, { status: "interrupted", completedAt: Date.now(), error: "Backend restarted before quality validation completed." });
      try {
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
    await Promise.all([...this.active.keys()].map((ticketId) => this.cancel(ticketId)));
  }

  private async revision(ticket: Ticket, refresh = false): Promise<ValidationRevision> {
    const project = getProject(ticket.project);
    const slot = ticket.slotId === null ? null : this.dependencies.store.getSlot(ticket.slotId);
    const sourcePath = slot?.ticketId === ticket.id ? join(SLOTS_ROOT, `slot-${slot.id}`) : undefined;
    const recorded = this.get(ticket.id).runs.at(-1)?.revision;
    const key = fingerprint([project.repoPath, ticket.branch, recorded]);
    const cached = this.revisions.get(ticket.id);
    if (!sourcePath && !refresh && cached?.key === key && Date.now() - cached.at < REVISION_CACHE_MS) return cached.revision;
    const revision = await this.repoMutex.run(project.repoPath, () => this.dependencies.system.captureValidationRevision({ repoPath: project.repoPath, ...(sourcePath ? { sourcePath } : {}), ...(ticket.branch ? { branch: ticket.branch } : {}), ...(recorded && !this.dependencies.system.dryRun ? { revision: recorded } : {}) }));
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
