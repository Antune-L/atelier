import { createHash } from "node:crypto";
import { tmpdir } from "node:os";
import { join } from "node:path";

import type { Orchestrator } from "../../shared/constants.ts";
import { getErrorMessage } from "../../shared/errors.ts";
import { QUALITY_DEFAULT_TIMEOUT_MS } from "../../shared/quality.ts";
import type { QualityCriteriaSnapshot, QualityCriterion, QualityEnvironment, QualityEvidence, QualityGate, QualityPreflight, QualityValidationRun, TicketQuality } from "../../shared/quality.ts";
import type { Ticket } from "../../shared/schemas.ts";
import { getProject, MODELS, SLOTS_ROOT } from "../config.ts";
import type { ProjectConfig } from "../config.ts";
import type { Store } from "../db/store.ts";
import { createLogger } from "../logger.ts";
import { KeyedMutex } from "../mutex.ts";
import { parsePackageManifest, LOCKFILE_NAMES } from "../system/repoInspection.ts";
import type { SystemAdapter, ValidationCommandResult, ValidationRevision, ValidationServiceHandle, ValidationWorkspaceOptions } from "../system/types.ts";
import { validationDatabasePath } from "../system/validationWorkspace.ts";

import { resolveExecution } from "./executionConfig.ts";
import { runQualityValidator } from "./qualityValidator.ts";

const log = createLogger("quality");
const CHECK_NAMES = ["typecheck", "lint", "test"] satisfies Array<"typecheck" | "lint" | "test">;
const HEALTH_POLL_MS = 250;
const HEALTH_REQUEST_TIMEOUT_MS = 2_000;
const OUTPUT_LIMIT = 32_768;
const REVISION_CACHE_MS = 3_000;
const DEFAULT_CHECK_RUNNER = "npm run";
const CHECK_RUNNERS: Record<string, string> = { "bun.lock": "bun run", "bun.lockb": "bun run", "pnpm-lock.yaml": "pnpm", "yarn.lock": "yarn", "package-lock.json": "npm run" };
const DATABASE_ISOLATION_PLACEHOLDERS = ["${VALIDATION_DATABASE_NAMESPACE}", "${VALIDATION_DATABASE_PATH}", "${VALIDATION_RUN_DIRECTORY}", "${VALIDATION_PORT}"];

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

  constructor(private readonly dependencies: QualityManagerDependencies) {
    this.repoMutex = dependencies.repoMutex ?? new KeyedMutex();
  }

  get(ticketId: string): TicketQuality {
    this.ticket(ticketId);
    return this.dependencies.store.getTicketQuality(ticketId);
  }

  setCriteria(ticketId: string, criteria: QualityCriterion[], createdBy: "user" | "agent" | "system" = "user"): QualityCriteriaSnapshot {
    const ticket = this.ticket(ticketId);
    const snapshot = this.dependencies.store.createQualityCriteriaSnapshot(ticketId, { criteria, sourceFingerprint: sourceFingerprint(ticket), createdBy });
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
    let revision: string | null = null;
    try { revision = (await this.revision(ticket)).commitSha; } catch (error) { blockers.push(getErrorMessage(error)); }
    const criteria = this.get(ticketId).criteriaSnapshots.at(-1);
    if (!criteria) reservations.push("No versioned acceptance criteria are defined.");
    else if (criteria.sourceFingerprint !== sourceFingerprint(ticket)) reservations.push("The ticket or PRD changed after the acceptance criteria were recorded.");
    if (!project.validation?.isolated) reservations.push("An isolated behavioral validation environment is not configured.");
    if (!project.validation?.startCommand) reservations.push("No isolated application start command is configured.");
    if (this.active.has(ticketId)) blockers.push("A quality run is already active for this ticket.");
    return { ok: blockers.length === 0, blockers, reservations, revision, configFingerprint: configFingerprint(project) };
  }

  runChecks(ticketId: string): Promise<QualityValidationRun> {
    return this.start(ticketId, "checks", null);
  }

  validate(ticketId: string, provider: Orchestrator): Promise<QualityValidationRun> {
    return this.start(ticketId, "behavior", provider);
  }

  private start(ticketId: string, kind: "checks" | "behavior", provider: Orchestrator | null): Promise<QualityValidationRun> {
    return this.starts.run(ticketId, async () => {
      if (this.shuttingDown) throw new Error("Quality validation is shutting down.");
      if (this.active.has(ticketId)) throw new Error("A quality run is already active for this ticket.");
      const ticket = this.ticket(ticketId);
      const project = getProject(ticket.project);
      const databaseProblem = databaseIsolationProblem(project);
      if (databaseProblem) throw new Error(databaseProblem);
      const criteria = this.get(ticketId).criteriaSnapshots.at(-1);
      if (kind === "behavior" && !criteria) throw new Error("Define acceptance criteria before starting behavioral validation.");
      const revision = await this.revision(ticket, true);
      if (this.shuttingDown) throw new Error("Quality validation is shutting down.");
      const run = this.dependencies.store.createQualityRun({ ticketId, criteriaSnapshotId: criteria?.id ?? null, kind, revision: revision.commitSha, fingerprint: revision.fingerprint, configFingerprint: configFingerprint(project), status: "queued", provider, simulated: this.dependencies.system.dryRun, evidenceAccepted: false, startedAt: Date.now(), completedAt: null, environment: null, cleanupStatus: "pending", error: null });
      const controller = new AbortController();
      const completion = this.execute(run, ticket, project, criteria, controller.signal).finally(() => {
        if (this.active.get(ticketId)?.controller === controller) this.active.delete(ticketId);
        this.changed(ticketId);
      });
      this.active.set(ticketId, { controller, completion });
      this.changed(ticketId);
      return run;
    });
  }

  private async execute(run: QualityValidationRun, ticket: Ticket, project: ProjectConfig, criteria: QualityCriteriaSnapshot | undefined, signal: AbortSignal): Promise<void> {
    const options: ValidationWorkspaceOptions = { ticketId: ticket.id, runId: run.id, repoPath: project.repoPath, commitSha: run.revision };
    let environment: QualityEnvironment | null = null;
    let service: ValidationServiceHandle | null = null;
    try {
      this.update(run.id, { status: "running" });
      if (signal.aborted) throw new Error("Quality run cancelled.");
      if (run.kind === "behavior" && (!project.validation?.isolated || !project.validation.startCommand)) throw new Error("Configure isolated services and an application start command before behavioral validation.");
      const prepared = await this.repoMutex.run(project.repoPath, () => this.dependencies.system.prepareValidationWorkspace(options));
      environment = { directory: prepared.cwd, dataDirectory: prepared.dataDirectory, port: prepared.port, databaseNamespace: prepared.databaseNamespace, addresses: [{ label: "Validation application", url: `http://127.0.0.1:${prepared.port}` }], ...(project.validation?.teardownCommand ? { teardownCommand: project.validation.teardownCommand } : {}), timeoutMs: project.validation?.timeoutMs ?? QUALITY_DEFAULT_TIMEOUT_MS };
      this.update(run.id, { environment });
      const variables = environmentFor(environment, project);
      const timeoutMs = project.validation?.timeoutMs ?? QUALITY_DEFAULT_TIMEOUT_MS;
      const originalFingerprint = await this.dependencies.system.codeFingerprint(environment.directory);
      if (project.validation?.setupCommand) {
        const setup = await this.command(run, "Environment setup", project.validation.setupCommand, environment, variables, timeoutMs, signal);
        if (!commandSucceeded(setup)) throw new Error("Validation environment setup failed.");
      }
      const baseline = await this.dependencies.system.codeFingerprint(environment.directory);
      if (baseline !== originalFingerprint) throw new Error("Environment setup modified the committed validation source.");
      if (run.kind === "checks") {
        const commands = await this.checkCommands(project, environment.directory);
        if (commands.length === 0) throw new Error("No existing typecheck, lint, or test commands are configured.");
        let passed = true;
        for (const command of commands) {
          if (signal.aborted) throw new Error("Quality run cancelled.");
          const result = await this.command(run, command.name, command.command, environment, variables, timeoutMs, signal);
          if (!commandSucceeded(result)) passed = false;
        }
        if (baseline !== await this.dependencies.system.codeFingerprint(environment.directory)) throw new Error("Checks modified the validated source; their evidence cannot be accepted.");
        if (signal.aborted) throw new Error("Quality run cancelled.");
        this.update(run.id, { status: passed ? "passed" : "failed", evidenceAccepted: true, completedAt: Date.now(), error: passed ? null : "One or more technical checks failed." });
      } else {
        if (!criteria || !run.provider) throw new Error("Behavioral validation has no criteria or provider.");
        if (!project.validation?.isolated || !project.validation.startCommand) throw new Error("Configure isolated services and an application start command before behavioral validation.");
        if (this.dependencies.system.dryRun) throw new Error("Simulation does not produce independent behavioral evidence.");
        service = this.dependencies.system.startValidationService({ cwd: environment.directory, command: project.validation.startCommand, environment: variables, timeoutMs, signal });
        await this.waitForHealth(environment, project, service, signal);
        const execution = resolveExecution("quality-validator", { orchestrator: run.provider, model: ticket.model, effort: ticket.effort, codexModel: ticket.codexModel, codexEffort: ticket.codexEffort, codexFast: ticket.codexFast }, { model: MODELS.triage, effort: MODELS.triageEffort });
        const artifactDirectory = join(this.dependencies.artifactDirectory ?? join(tmpdir(), "kanban-quality-artifacts"), run.id);
        const result = await runQualityValidator({ ticketId: ticket.id, runId: run.id, cwd: environment.directory, execution, criteria: criteria.criteria, revisionSha: run.revision, environment: variables, checks: this.get(ticket.id).evidence.filter((entry) => entry.kind === "command"), addresses: environment.addresses ?? [], signal, timeoutMs, artifactDirectory, startSession: (sessionOptions) => this.dependencies.system.startAgentSession(sessionOptions) });
        if (!result.sessionId) throw new Error("Validator returned no independently attributable session identity.");
        if (signal.aborted) throw new Error("Quality run cancelled.");
        const criterionIds = result.evidence.map((evidence) => evidence.criterionId);
        if (new Set(criterionIds).size !== criterionIds.length) throw new Error("Validator returned duplicate acceptance criteria.");
        if (result.evidence.some((evidence) => !criteria.criteria.some((criterion) => criterion.id === evidence.criterionId))) throw new Error("Validator returned an unknown acceptance criterion.");
        if (result.evidence.some((evidence) => evidence.sessionId !== result.sessionId || evidence.provider !== run.provider || evidence.authority !== "agent")) throw new Error("Validator evidence has inconsistent session provenance.");
        if (baseline !== await this.dependencies.system.codeFingerprint(environment.directory)) throw new Error("Validator modified the validated source; its evidence cannot be accepted.");
        if (signal.aborted) throw new Error("Quality run cancelled.");
        for (const evidence of result.evidence) {
          this.dependencies.store.appendQualityEvidence({ runId: run.id, criterionId: evidence.criterionId, kind: "behavior", authority: "agent", author: "agent", status: evidence.status, summary: evidence.summary, output: evidence.output, command: null, exitCode: null, timedOut: false, durationMs: Date.now() - run.startedAt, artifactPath: evidence.artifactPath, provider: run.provider, sessionId: result.sessionId, model: execution.model });
        }
        const passed = criteria.criteria.filter((criterion) => criterion.required).every((criterion) => result.evidence.some((evidence) => evidence.criterionId === criterion.id && evidence.status === "passed"));
        const failed = criteria.criteria.some((criterion) => criterion.required && result.evidence.some((evidence) => evidence.criterionId === criterion.id && evidence.status === "failed"));
        let status: "passed" | "failed" | "inconclusive" = "inconclusive";
        if (passed) status = "passed";
        else if (failed) status = "failed";
        this.update(run.id, { status, evidenceAccepted: true, completedAt: Date.now(), error: passed ? null : "Some required acceptance criteria were not independently verified." });
      }
    } catch (error) {
      this.update(run.id, { status: signal.aborted ? "cancelled" : "failed", completedAt: Date.now(), error: getErrorMessage(error) });
      log.warn("quality run ended without acceptance", { ticketId: ticket.id, runId: run.id, error: getErrorMessage(error) });
    } finally {
      let cleanupError: string | null = null;
      try { await service?.stop(); } catch (error) { cleanupError = getErrorMessage(error); }
      if (environment?.teardownCommand) {
        try {
          const result = await this.dependencies.system.runValidationCommand({ cwd: environment.directory, command: environment.teardownCommand, environment: environmentFor(environment, project), timeoutMs: environment.timeoutMs ?? QUALITY_DEFAULT_TIMEOUT_MS });
          if (!commandSucceeded(result)) cleanupError = "Validation service teardown failed.";
        } catch (error) { cleanupError = getErrorMessage(error); }
      }
      if (cleanupError === null) {
        try { await this.repoMutex.run(project.repoPath, () => this.dependencies.system.cleanupValidationWorkspace(options)); } catch (error) { cleanupError = getErrorMessage(error); }
      }
      this.update(run.id, { cleanupStatus: cleanupError ? "failed" : "complete", ...(cleanupError ? { error: cleanupError } : {}) });
    }
  }

  private async command(run: QualityValidationRun, name: string, command: string, environment: QualityEnvironment, variables: Record<string, string>, timeoutMs: number, signal: AbortSignal): Promise<ValidationCommandResult> {
    const result = await this.dependencies.system.runValidationCommand({ cwd: environment.directory, command, environment: variables, timeoutMs, signal });
    this.dependencies.store.appendQualityEvidence({ runId: run.id, criterionId: null, kind: "command", authority: "server", author: "system", status: commandSucceeded(result) ? "passed" : "failed", summary: name, output: outputFor(result), command, exitCode: result.exitCode, timedOut: result.timedOut, durationMs: result.durationMs, artifactPath: null, provider: null, sessionId: null, model: null });
    this.changed(run.ticketId);
    return result;
  }

  private async checkCommands(project: ProjectConfig, directory: string): Promise<CheckCommand[]> {
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
    const active = this.active.get(ticketId);
    active?.controller.abort();
    await active?.completion;
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
      const technical = relevant.filter((run) => run.kind === "checks").at(-1);
      if (!technical || technical.status !== "passed" || !technical.evidenceAccepted) reservations.push("Current server-run technical checks are missing or unsuccessful.");
      const requireBehavioral = project.validation?.requireBehavioral ?? !!snapshot;
      const latestChecks = quality.runs.filter((run) => run.kind === "checks").at(-1);
      const latestBehavior = quality.runs.filter((run) => run.kind === "behavior" && (!requireBehavioral || run.provider !== null)).at(-1);
      stale = !!latestChecks && !currentRunIds.includes(latestChecks.id);
      if ((requireBehavioral || snapshot) && latestBehavior && !currentRunIds.includes(latestBehavior.id)) stale = true;
      if (snapshot && snapshot.sourceFingerprint !== sourceFingerprint(ticket)) stale = true;
      if (requireBehavioral || snapshot) {
        if (!snapshot) reservations.push("Versioned acceptance criteria are required.");
        else if (snapshot.sourceFingerprint !== sourceFingerprint(ticket)) reservations.push("Acceptance criteria must be reconfirmed after ticket or PRD changes.");
        const behavioral = relevant.filter((run) => run.kind === "behavior");
        const independent = behavioral.filter((run) => run.provider !== null).at(-1);
        if (requireBehavioral && (!independent || independent.status !== "passed" || !independent.evidenceAccepted)) reservations.push("Current independent behavioral validation is missing or unsuccessful.");
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
      if (quality.runs.some((run) => run.cleanupStatus === "failed")) reservations.push("A validation environment still requires cleanup.");
    }
    const complete = reservations.length === 0;
    return { enabled, complete, reservations, allowed: !enabled || complete || mode === "reservations", stale, reasons: reservations, requiredCriteria, verifiedCriteria, currentRunIds };
  }

  async recordManualEvidence(ticketId: string, input: { criterionId: string; observation: string; status: "passed" | "failed" | "inconclusive" }): Promise<QualityEvidence> {
    const ticket = this.ticket(ticketId);
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
