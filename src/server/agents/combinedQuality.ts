import { readdir, stat } from "node:fs/promises";
import { join } from "node:path";

import { QUALITY_DEFAULT_TIMEOUT_MS } from "../../shared/quality.ts";
import type { QualityActionInput, QualityCriteriaSnapshot, QualityEnvironment, QualityEvidence, QualityValidationRun, QualityVerificationComponent, QualityVerificationReport } from "../../shared/quality.ts";
import type { Ticket } from "../../shared/schemas.ts";
import type { ProjectConfig } from "../config.ts";
import type { Store } from "../db/store.ts";
import type { KeyedMutex } from "../mutex.ts";
import { redactSecrets } from "../system/secretRedaction.ts";
import { presentPackageManagerFiles, resolvePackageManager, scriptRunner } from "../system/packageManager.ts";
import { parsePackageManifest } from "../system/repoInspection.ts";
import type { SystemAdapter, ValidationServiceHandle } from "../system/types.ts";

import { createAutonomousSessionGuard } from "./autonomousSessionGuard.ts";
import type { QualityJournal } from "./qualityJournal.ts";
import type { ResolvedExecution } from "./executionConfig.ts";
import { prepareFunctionalScenarios } from "./qualityCriteriaPreparation.ts";
import { QUALITY_NATIVE_CLEANUP_DIRECTORY, qualityErrorMessage } from "./qualitySession.ts";
import { runTestRelevance } from "./qualityTestRelevance.ts";
import { QUALITY_BROWSER_CLEANUP_MARKER, runQualityValidator } from "./qualityValidator.ts";

export function pendingVerification(sourceFingerprint: string, acceptanceSnapshotId: string | null = null): QualityVerificationReport {
  return { sourceFingerprint, acceptanceSnapshotId, technical: { status: "pending", tested: [], improvements: [] }, relevance: { status: "pending", tested: [], improvements: [] }, browser: { status: "pending", tested: [], improvements: [] } };
}

export function verificationProblem(summary: string, details: string) {
  return { summary, details: qualityErrorMessage(details), evidenceId: null, provider: null, sessionId: null, artifactPath: null };
}

function assertDatabaseIsolation(project: ProjectConfig): void {
  const databaseUrl = project.validation?.environment?.DATABASE_URL;
  if (databaseUrl && !["${VALIDATION_DATABASE_NAMESPACE}", "${VALIDATION_DATABASE_PATH}", "${VALIDATION_RUN_DIRECTORY}", "${VALIDATION_PORT}"].some((placeholder) => databaseUrl.includes(placeholder))) throw new Error("Validation DATABASE_URL must contain a run-specific database namespace, path, directory, or port placeholder.");
}
export async function combinedCheckCommands(project: ProjectConfig, directory: string, simulated: boolean): Promise<Array<{ name: string; command: string }>> {
  const configured = Object.entries(project.scripts ?? {}).filter(([name]) => ["typecheck", "lint", "test"].includes(name));
  if (simulated) return configured.flatMap(([name, command]) => command ? [{ name, command }] : []);
  const file = Bun.file(join(directory, "package.json"));
  const manifest = await file.exists() ? parsePackageManifest(await file.text()) : null;
  const runner = scriptRunner(resolvePackageManager(manifest?.packageManager, await presentPackageManagerFiles(directory)));
  const names = new Set(["typecheck", "lint", "test", ...Object.keys(manifest?.scripts ?? {}).filter((name) => /^(?:test|tests|e2e|unit|integration|playwright|cypress)(?:$|[:_-])/i.test(name) && !/(?:watch|ui|debug|update|install|report|codegen|serve)(?:$|[:_-])/i.test(name))]);
  return [...names].flatMap((name) => {
    const override = configured.find(([key]) => key === name)?.[1];
    return override ? [{ name, command: override }] : manifest?.scripts?.[name] ? [{ name, command: `${runner} ${name}` }] : [];
  });
}

interface CombinedQualityOptions {
  journal?: QualityJournal;
  deadlineAt?: number;
  run: QualityValidationRun;
  ticket: Ticket;
  project: ProjectConfig;
  acceptance?: QualityCriteriaSnapshot;
  system: SystemAdapter;
  store: Store;
  repoMutex: KeyedMutex;
  execution: ResolvedExecution;
  signal: AbortSignal;
  artifactDirectory: string;
  browserValidator?: typeof runQualityValidator;
  environmentVariables(environment: QualityEnvironment): Record<string, string>;
  waitForHealth(environment: QualityEnvironment, service: ValidationServiceHandle): Promise<void>;
  assertCurrent(): Promise<void>;
  update(patch: Parameters<Store["updateQualityRun"]>[1]): void;
}

function fromEvidence(evidence: QualityEvidence) {
  return { summary: evidence.summary, details: [evidence.output, evidence.scenario ? JSON.stringify(evidence.scenario, null, 2) : ""].join("\n"), evidenceId: evidence.id, provider: evidence.provider, sessionId: evidence.sessionId, artifactPath: evidence.artifactPath, model: evidence.model, status: evidence.status };
}

export async function executeCombinedQuality(options: CombinedQualityOptions): Promise<void> {
  const { run, ticket, project, system, signal, store } = options;
  const workspace = { ticketId: ticket.id, runId: run.id, repoPath: project.repoPath, commitSha: run.revision };
  const report = run.verification ?? pendingVerification("unknown");
  let environment: QualityEnvironment | null = null;
  const resources: { service: ValidationServiceHandle | null } = { service: null };
  let baseline: string | null = null;
  let valid = true;
  let cleanupError: string | null = null;
  let evidenceError: string | null = null;
  let closureUnknown = false;
  let setupSucceeded = !project.validation?.setupCommand;
  const redact = (value: string): string => options.journal?.redact(value) ?? redactSecrets(value);
  const redactReport = (): void => {
    for (const component of [report.technical, report.relevance, report.browser]) {
      for (const bullet of [...component.tested, ...component.improvements]) {
        bullet.summary = redact(bullet.summary);
        bullet.details = redact(bullet.details);
      }
    }
  };
  const persist = (): void => {
    redactReport();
    options.update({ verification: report });
  };
  const remainingTimeout = (timeoutMs: number): number => {
    if (options.deadlineAt === undefined) return timeoutMs;
    const remaining = options.deadlineAt - Date.now();
    if (remaining <= 0) throw new Error("Quality run deadline expired.");
    return Math.min(timeoutMs, remaining);
  };
  const bounded = async <T>(operation: Promise<T>): Promise<T> => {
    const deadlineAt = options.deadlineAt;
    if (deadlineAt === undefined) return operation;
    if (Date.now() >= deadlineAt) {
      closureUnknown = true;
      throw new Error("Quality run deadline expired before operation acknowledgement.");
    }
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      return await Promise.race([
        operation,
        new Promise<never>((_, reject) => {
          timer = setTimeout(() => {
            closureUnknown = true;
            reject(new Error("Quality run deadline expired before operation acknowledgement."));
          }, Math.max(0, deadlineAt - Date.now()));
        }),
      ]);
    } finally {
      if (timer) clearTimeout(timer);
    }
  };
  const assertActive = (): void => {
    options.journal?.assertHealthy();
    if (closureUnknown) throw new Error("Validation session closure is unconfirmed; no further operation may start.");
    if (signal.aborted) throw new Error("Quality run cancelled.");
    remainingTimeout(QUALITY_DEFAULT_TIMEOUT_MS);
  };
  const effect = async <T>(kind: QualityActionInput["kind"], phase: string, summary: string, action: () => Promise<T>, compensating = false): Promise<T> => {
    if (!compensating) assertActive();
    let actionId: string | null = null;
    try { actionId = options.journal?.start({ kind, phase, summary }) ?? null; }
    catch (error) { if (!compensating) throw error; }
    if (!compensating) assertActive();
    let result: T;
    try { result = await bounded(action()); }
    catch (error) {
      try { if (actionId) options.journal?.finish(actionId, { status: closureUnknown ? "unknown" : "failed", summary: closureUnknown ? `${summary}: completion unconfirmed` : `${summary}: operation failed` }); }
      catch { if (!compensating) options.journal?.assertHealthy(); }
      throw error;
    }
    try {
      const commandResult = typeof result === "object" && result !== null && "result" in result ? result.result : result;
      const failed = typeof commandResult === "object" && commandResult !== null && "exitCode" in commandResult && (commandResult.exitCode !== 0 || "timedOut" in commandResult && commandResult.timedOut === true || "cancelled" in commandResult && commandResult.cancelled === true);
      const outcome = failed ? "failed" : "succeeded";
      if (actionId) options.journal?.finish(actionId, { status: outcome, summary: `${summary}: operation completed` });
      if (!compensating) options.journal?.assertHealthy();
    } catch (error) { if (!compensating) throw error; }
    return result;
  };
  const markClosureUnknown = (): void => {
    closureUnknown = true;
    const state = store.getTicket(ticket.id)?.autonomousState;
    if (!state?.execution) return;
    store.updateTicket(ticket.id, { autonomousState: { ...state, execution: { ...state.execution, closure: { ...state.execution.closure, status: "unknown", confirmedAt: null, retention: "retained" } } } });
  };
  const assertSource = async (): Promise<void> => {
    assertActive();
    if (!environment || baseline !== await bounded(system.codeFingerprint(environment.directory))) { valid = false; throw new Error("Validated source changed; evidence cannot be accepted."); }
    await bounded(options.assertCurrent());
  };
  const attempt = async (dimension: "technical" | "relevance" | "browser", action: () => Promise<QualityVerificationComponent>): Promise<void> => {
    try { report[dimension] = await action(); }
    catch (error) { report[dimension] = { status: "blocked", tested: report[dimension].tested, improvements: [...report[dimension].improvements, verificationProblem("Vérification bloquée", qualityErrorMessage(error instanceof Error ? error.message : String(error)))] }; }
    persist();
  };
  try {
    options.update({ status: "running", phase: "preparing" });
    if (signal.aborted) throw new Error("Quality run cancelled.");
    const prepared = await bounded(options.repoMutex.run(project.repoPath, () => effect("git", "preparing", "Prepare isolated validation workspace", () => system.prepareValidationWorkspace({ ...workspace, signal, deadlineAt: options.deadlineAt }))));
    environment = { directory: prepared.cwd, dataDirectory: prepared.dataDirectory, port: prepared.port, databaseNamespace: prepared.databaseNamespace, timeoutMs: project.validation?.timeoutMs ?? QUALITY_DEFAULT_TIMEOUT_MS, addresses: [] };
    options.update({ environment });
    const currentEnvironment = environment;
    const variables = options.environmentVariables(currentEnvironment);
    const timeoutMs = project.validation?.timeoutMs ?? QUALITY_DEFAULT_TIMEOUT_MS;
    const common = { artifactDirectory: options.artifactDirectory, journal: options.journal, deadlineAt: options.deadlineAt, onClosureUnknown: markClosureUnknown, ticketId: ticket.id, runId: run.id, cwd: prepared.cwd, execution: options.execution, environment: variables, signal, timeoutMs, startSession: (sessionOptions: Parameters<SystemAdapter["startAgentSession"]>[0]) => {
      const executionGuard = sessionOptions.executionGuard ?? createAutonomousSessionGuard(store, ticket.id, "other");
      executionGuard?.beforeStart();
      return system.startAgentSession({ ...sessionOptions, executionGuard: executionGuard ?? undefined });
    } };
    baseline = await bounded(system.codeFingerprint(prepared.cwd));
    await attempt("technical", async () => {
      const component: QualityVerificationComponent = { status: "inconclusive", tested: [], improvements: [] };
      assertDatabaseIsolation(project);
      if (project.validation?.setupCommand) {
        if (!project.validation.isolated) throw new Error("Validation setup requires an isolated environment.");
        environment = { ...currentEnvironment, ...(project.validation.teardownCommand ? { teardownCommand: project.validation.teardownCommand } : {}) };
        options.update({ environment });
        const setupCommand = project.validation.setupCommand;
        const setup = await effect("command", "setup", "Environment setup", () => system.runValidationCommand({ cwd: prepared.cwd, command: setupCommand, environment: variables, timeoutMs: remainingTimeout(timeoutMs), signal, deadlineAt: options.deadlineAt }));
        setupSucceeded = setup.exitCode === 0 && !setup.timedOut && !setup.cancelled;
        const evidence = store.appendQualityEvidence({ runId: run.id, criterionId: null, kind: "command", authority: "server", author: "system", status: setupSucceeded ? "passed" : "failed", summary: "Environment setup", output: redact(`exitCode=${setup.exitCode}; timedOut=${setup.timedOut}; cancelled=${setup.cancelled}\n${setup.stdout}\n${setup.stderr}`).slice(-32_768), command: redact(project.validation.setupCommand), exitCode: setup.exitCode, timedOut: setup.timedOut, durationMs: setup.durationMs, artifactPath: null, provider: null, sessionId: null, model: null });
        if (!setupSucceeded) {
          report.technical.improvements.push({ ...fromEvidence(evidence), summary: "Préparation de l’environnement en échec" });
          throw new Error("Validation environment setup failed.");
        }
        await assertSource();
      }
      const installation = await effect("command", "install", "Dependency installation", () => system.installValidationDeps({ cwd: prepared.cwd, environment: variables, timeoutMs: remainingTimeout(Math.max(timeoutMs, project.commitTimeoutMs)), signal, deadlineAt: options.deadlineAt }));
      if (installation) {
        const result = installation.result;
        const passed = result.exitCode === 0 && !result.timedOut && !result.cancelled;
        const evidence = store.appendQualityEvidence({ runId: run.id, criterionId: null, kind: "command", authority: "server", author: "system", status: passed ? "passed" : "failed", summary: "Dependency installation", output: redact(`exitCode=${result.exitCode}; timedOut=${result.timedOut}; cancelled=${result.cancelled}\n${result.stdout}\n${result.stderr}`).slice(-32_768), command: redact(installation.command), exitCode: result.exitCode, timedOut: result.timedOut, durationMs: result.durationMs, artifactPath: null, provider: null, sessionId: null, model: null });
        if (!passed) {
          report.technical.improvements.push({ ...fromEvidence(evidence), summary: "Installation des dépendances en échec" });
          throw new Error("Dependency installation failed.");
        }
      }
      await assertSource();
      options.update({ phase: "checks" });
      const commands = await bounded(combinedCheckCommands(project, prepared.cwd, system.dryRun));
      for (const command of commands) {
        if (signal.aborted) throw new Error("Quality run cancelled.");
        try {
          const result = await effect("command", "checks", `Technical check: ${command.name}`, () => system.runValidationCommand({ cwd: prepared.cwd, command: command.command, environment: variables, timeoutMs: remainingTimeout(timeoutMs), signal, deadlineAt: options.deadlineAt }));
          const passed = result.exitCode === 0 && !result.timedOut && !result.cancelled;
          const evidence = store.appendQualityEvidence({ runId: run.id, criterionId: null, kind: "command", authority: "server", author: "system", status: passed ? "passed" : "failed", summary: command.name, output: redact(`exitCode=${result.exitCode}; timedOut=${result.timedOut}; cancelled=${result.cancelled}\n${result.stdout}\n${result.stderr}`).slice(-32_768), command: redact(command.command), exitCode: result.exitCode, timedOut: result.timedOut, durationMs: result.durationMs, artifactPath: null, provider: null, sessionId: null, model: null });
          const bullet = { ...fromEvidence(evidence), summary: `${command.name} · ${system.dryRun ? "simulé" : passed ? "réussi" : "échec"}`, details: redact(`${command.command}\n${evidence.output}`) };
          component.tested.push(bullet);
          if (!passed) component.improvements.push(bullet);
        } catch (error) { component.improvements.push(verificationProblem(`${command.name} · bloqué`, String(error))); }
        report.technical = component;
        persist();
      }
      if (!commands.some((command) => /test|e2e|unit|integration|playwright|cypress/i.test(command.name))) component.improvements.push(verificationProblem("Aucune commande de tests découverte", "No configured/discovered unit or E2E test command is available."));
      if (commands.length === 0) component.improvements.push(verificationProblem("Aucun contrôle technique découvert", "No existing configured or discovered technical command is available."));
      component.status = system.dryRun ? "inconclusive" : component.improvements.length > 0 ? component.tested.some((bullet) => bullet.summary.endsWith("échec")) ? "failed" : "inconclusive" : "passed";
      if (system.dryRun) component.improvements.push(verificationProblem("Contrôles simulés", "No real unit/E2E test or technical gate command was executed."));
      await assertSource();
      return component;
    });
    options.update({ phase: "validating" });
    await attempt("relevance", async () => {
      await assertSource();
      if (system.dryRun) return { status: "inconclusive", tested: [], improvements: [verificationProblem("Analyse simulée", "Simulation has not read implementation or existing test assertions.")] };
      const result = await bounded(runTestRelevance({ ...common, title: ticket.title, description: ticket.description, prd: ticket.prdMarkdown ?? "", acceptanceCriteria: options.acceptance?.criteria ?? [], artifactDirectory: join(options.artifactDirectory, "relevance") }));
      await assertSource();
      return result;
    });
    await attempt("browser", async () => {
      await assertSource();
      if (system.dryRun) return { status: "inconclusive", tested: [], improvements: [verificationProblem("Navigateur simulé", "No real Playwright browser interaction was performed.")] };
      if (!project.validation?.isolated || !project.validation.startCommand) throw new Error("Configure isolated services and an application start command before browser validation.");
      if (!setupSucceeded) throw new Error("Validation environment setup failed; browser validation cannot start.");
      assertDatabaseIsolation(project);
      const plan = await bounded(prepareFunctionalScenarios({ ...common, title: ticket.title, description: ticket.description, prd: ticket.prdMarkdown ?? "", acceptanceCriteria: options.acceptance?.criteria ?? [], previousScenarios: [] }));
      await assertSource();
      const executionGuard = createAutonomousSessionGuard(store, ticket.id, "other");
      executionGuard?.beforeStart();
      environment = { ...currentEnvironment, ...(project.validation.teardownCommand ? { teardownCommand: project.validation.teardownCommand } : {}), addresses: [{ label: "Validation application", url: `http://127.0.0.1:${prepared.port}` }] };
      options.update({ environment });
      await assertSource();
      const startCommand = project.validation.startCommand;
      await effect("service", "startup", "Start isolated validation service", async () => {
        resources.service = system.startValidationService({ cwd: prepared.cwd, command: startCommand, environment: variables, timeoutMs: remainingTimeout(timeoutMs), signal, deadlineAt: options.deadlineAt });
      });
      const service = resources.service;
      if (!service) throw new Error("Validation service did not start.");
      const serviceEnvironment = environment;
      await effect("service", "health", "Wait for validation application health", () => options.waitForHealth(serviceEnvironment, service));
      const result = await bounded((options.browserValidator ?? runQualityValidator)({ ...common, executionGuard: executionGuard ?? undefined, criteria: plan.scenarios, revisionSha: run.revision, checks: [], addresses: environment.addresses ?? [], mode: "browser", functional: true, artifactDirectory: join(options.artifactDirectory, "browser") }));
      await assertSource();
      const component: QualityVerificationComponent = { status: "inconclusive", tested: [], improvements: [] };
      for (const evidence of result.evidence) {
        const bullet = fromEvidence(evidence);
        if (evidence.status !== "inconclusive") component.tested.push(bullet);
        if (evidence.status !== "passed") component.improvements.push(bullet);
      }
      for (const gap of plan.uncovered) component.improvements.push(verificationProblem("Règle non exercée dans le navigateur", `${gap.criterionId}: ${gap.reason}`));
      for (const criterion of options.acceptance?.criteria ?? []) {
        if (!plan.scenarios.some((scenario) => scenario.covers?.includes(criterion.id)) && !plan.uncovered.some((gap) => gap.criterionId === criterion.id)) component.improvements.push(verificationProblem("Critère absent des scénarios", `${criterion.id}: ${criterion.text}`));
      }
      if (options.acceptance && options.acceptance.sourceFingerprint !== report.sourceFingerprint) component.improvements.push(verificationProblem("Critères d’acceptation périmés", "Acceptance criteria must be reconfirmed after ticket or PRD changes."));
      component.status = result.evidence.some((evidence) => evidence.status === "failed") ? "failed" : plan.scenarios.length > 0 && component.improvements.length === 0 ? "passed" : "inconclusive";
      return component;
    });
  } catch (error) {
    valid = false;
    for (const dimension of ["technical", "relevance", "browser"] satisfies Array<"technical" | "relevance" | "browser">) {
      if (report[dimension].status === "pending") report[dimension] = { status: "blocked", tested: [], improvements: [verificationProblem("Vérification non exécutée", String(error))] };
    }
  } finally {
    try { options.update({ phase: "cleanup" }); } catch { valid = false; }
    try {
      const service = resources.service;
      if (service) await effect("cleanup", "cleanup", "Stop validation service", () => service.stop(), true);
    } catch (error) { valid = false; cleanupError = qualityErrorMessage(String(error)); }
    try {
      if (environment?.teardownCommand) {
        const teardownEnvironment = environment;
        const teardownCommand = environment.teardownCommand;
        const result = await effect("cleanup", "cleanup", "Teardown validation environment", () => system.runValidationCommand({ cwd: teardownEnvironment.directory, command: teardownCommand, environment: options.environmentVariables(teardownEnvironment), timeoutMs: remainingTimeout(teardownEnvironment.timeoutMs ?? QUALITY_DEFAULT_TIMEOUT_MS), deadlineAt: options.deadlineAt }), true);
        if (result.exitCode !== 0 || result.timedOut || result.cancelled) { valid = false; cleanupError = "Validation service teardown failed."; }
      }
    } catch (error) { valid = false; cleanupError = qualityErrorMessage(String(error)); }
    try {
      if (environment && baseline !== await bounded(system.codeFingerprint(environment.directory))) { valid = false; evidenceError = "Validated source changed; evidence cannot be accepted."; }
      if (!signal.aborted) await bounded(options.assertCurrent());
    } catch (error) { valid = false; evidenceError = qualityErrorMessage(String(error)); }
    try {
      await bounded(stat(join(options.artifactDirectory, "browser", QUALITY_BROWSER_CLEANUP_MARKER)));
      closureUnknown = true;
    } catch (error) {
      if (!(error instanceof Error && "code" in error && error.code === "ENOENT")) closureUnknown = true;
    }
    for (const directory of [options.artifactDirectory, join(options.artifactDirectory, "relevance"), join(options.artifactDirectory, "browser")]) {
      try {
        if ((await bounded(readdir(join(directory, QUALITY_NATIVE_CLEANUP_DIRECTORY)))).length > 0) closureUnknown = true;
      } catch (error) {
        if (!(error instanceof Error && "code" in error && error.code === "ENOENT")) closureUnknown = true;
      }
    }
    try {
      if (cleanupError === null && !closureUnknown) await bounded(options.repoMutex.run(project.repoPath, () => {
        remainingTimeout(QUALITY_DEFAULT_TIMEOUT_MS);
        if (closureUnknown) throw new Error("Validation closure is unconfirmed; workspace retained.");
        return effect("cleanup", "cleanup", "Remove isolated validation workspace", () => system.cleanupValidationWorkspace({ ...workspace, deadlineAt: options.deadlineAt }), true);
      }));
    }
    catch (error) { cleanupError = qualityErrorMessage(String(error)); }
    if (closureUnknown && cleanupError === null) cleanupError = "Validation closure could not be confirmed before the deadline; workspace retained.";
    if (cleanupError) {
      try { markClosureUnknown(); } catch { valid = false; }
    }
    if (!valid || cleanupError || signal.aborted) report.browser.improvements.push(verificationProblem("Preuves incomplètes ou non acceptables", cleanupError ?? evidenceError ?? "Revision changed or validation cancelled before final acceptance."));
    const components = [report.technical, report.relevance, report.browser];
    const passed = valid && !closureUnknown && !options.journal?.failed && !cleanupError && !system.dryRun && components.every((component) => component.status === "passed");
    redactReport();
    let error = passed ? null : "Combined verification is incomplete or unsuccessful.";
    if (cleanupError || evidenceError) error = redact(cleanupError ?? evidenceError ?? "");
    options.update({ verification: report, status: signal.aborted ? "cancelled" : components.some((component) => component.status === "failed") ? "failed" : passed ? "passed" : "inconclusive", completedAt: Date.now(), cleanupStatus: cleanupError ? "failed" : "complete", evidenceAccepted: passed, technicalEvidenceAccepted: valid && !closureUnknown && !options.journal?.failed && !system.dryRun && report.technical.status === "passed", error });
  }
}
