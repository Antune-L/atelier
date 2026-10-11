import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, test } from "bun:test";

import type { Orchestrator, VcsProvider } from "../../shared/constants.ts";
import { qualityEvidenceSchema, qualityValidationRunSchema } from "../../shared/quality.ts";
import type { QualityVerificationReport } from "../../shared/quality.ts";
import { initProjectRegistry } from "../config.ts";
import { createDatabase } from "../db/schema.ts";
import { Store } from "../db/store.ts";
import { KeyedMutex } from "../mutex.ts";
import type { AgentSessionHandle, AgentSessionOptions } from "../system/agentSession.ts";
import { FakeSystemAdapter } from "../system/fake.ts";
import type { ValidationCommandOptions, ValidationCommandResult, ValidationRevisionOptions } from "../system/types.ts";
import { makeTicket } from "../testing/fixtures.ts";

import { combinedCheckCommands, executeCombinedQuality, pendingVerification } from "./combinedQuality.ts";
import { resolveExecution } from "./executionConfig.ts";
import { QualityManager } from "./qualityManager.ts";

const REVISION = "0123456789012345678901234567890123456789";
class CombinedFixtureSystem extends FakeSystemAdapter {
  sessions: AgentSessionOptions[] = [];
  commands: string[] = [];
  hosts: VcsProvider[] = [];
  failTests = false;
  failSetup = false;
  absentTests = false;
  mutated = false;
  browserCompleted: () => void = () => undefined;
  cleanupFails = false;
  headRevision = REVISION;
  constructor(readonly directory: string) { super(); }
  override async captureValidationRevision(_options: ValidationRevisionOptions) { return { commitSha: REVISION, fingerprint: REVISION, clean: true }; }
  override async readPullRequestHead(_repo: string, _pr: string, provider: VcsProvider) { this.hosts.push(provider); return { ok: true, reason: "", commitSha: this.headRevision }; }
  override async prepareValidationWorkspace() { return { cwd: this.directory, dataDirectory: this.directory, port: 52999, databaseNamespace: "test-isolated" }; }
  override async codeFingerprint() { return this.mutated ? "modified" : REVISION; }
  override async installValidationDeps() { return null; }
  override async cleanupValidationWorkspace() { if (this.cleanupFails) throw new Error("Fixture cleanup failed"); }
  override async runValidationCommand(options: ValidationCommandOptions): Promise<ValidationCommandResult> {
    this.commands.push(options.command);
    return { exitCode: this.failTests && options.command.includes("test") || this.failSetup && options.command === "setup-fixture" ? 1 : 0, timedOut: false, cancelled: false, stdout: "Fixture command output", stderr: "", durationMs: 1 };
  }
  override startAgentSession(options: AgentSessionOptions): AgentSessionHandle {
    this.sessions.push(options);
    return { ticketId: options.ticketId, interrupt: async () => undefined, close: async () => undefined, send: (prompt, messageId = "fixture-turn") => {
      queueMicrotask(() => {
        options.onEvent({ type: "init", sessionId: `independent-${this.sessions.length}` });
        const tool = options.provider === "codex" ? "command_execution" : "Read";
        const read = (id: string, path: string, output: string): void => {
          options.onEvent({ type: "tool_use", name: tool, input: options.provider === "codex" ? { command: `cat ${path}` } : { file_path: path }, toolCallId: id });
          options.onEvent({ type: "tool_result", toolCallId: id, ok: true, output });
        };
        read("feature-read", "src/cart.ts", "return price * quantity");
        if (!this.absentTests) read("test-read", "cart.test.ts", "expect(total(10, 2)).toBe(20)");
        const structuredOutput = prompt.startsWith("Prepare browser")
          ? { scenarios: [{ id: "F01", text: "Click add to update cart", source: "ticket", required: true, independent: true, interaction: "interactive", expected: "Total is 20", covers: [] }], uncovered: [] }
          : { complete: !this.absentTests, rules: [{ rule: "Quantity updates total", assessment: this.absentTests ? "uncertain" : "relevant", explanation: "Arithmetic is asserted", feature: { path: "src/cart.ts", toolCallId: "feature-read", excerpt: "return price * quantity" }, tests: this.absentTests ? [] : [{ path: "cart.test.ts", toolCallId: "test-read", excerpt: "expect(total(10, 2)).toBe(20)" }] }] };
        options.onEvent({ type: "turn_end", ok: true, subtype: "success", sessionId: `independent-${this.sessions.length}`, usageByModel: {}, structuredOutput });
      });
      return messageId;
    } };
  }
}

async function fixture(provider: Orchestrator = "claude", vcsProvider: VcsProvider = "github") {
  const directory = await mkdtemp(join(tmpdir(), "combined-quality-test-"));
  await writeFile(join(directory, "package.json"), JSON.stringify({ scripts: { typecheck: "tsc", lint: "eslint .", test: "bun test", "test:e2e": "playwright test", "test:watch": "bun test --watch" } }));
  await writeFile(join(directory, "bun.lock"), "");
  const db = createDatabase(join(directory, "fixture.db"));
  const store = new Store(db);
  const project = store.createProject("test-proj", { label: "Test", repoPath: directory, vcsProvider, baseBranch: "main", commitTimeoutMs: 60_000, defaultAutoMerge: false, defaultAddScreenshots: false, validation: { enabled: true, requireBehavioral: true, isolated: true, startCommand: "start-fixture", healthPath: "/", timeoutMs: 5_000 } });
  store.updateAppSettings({ qualityOwner: true });
  initProjectRegistry(store);
  const ticket = store.createTicket({ ...makeTicket({ orchestrator: provider, column: "done", prUrl: vcsProvider === "github" ? "https://github.com/test/repo/pull/1" : "https://dev.azure.com/org/project/_git/repo/pullrequest/1" }), childOrder: null });
  store.updateTicket(ticket.id, { column: "done", prUrl: vcsProvider === "github" ? "https://github.com/test/repo/pull/1" : "https://dev.azure.com/org/project/_git/repo/pullrequest/1" });
  const system = new CombinedFixtureSystem(directory);
  const controller = new AbortController();
  const run = store.createQualityRun({ ticketId: ticket.id, criteriaSnapshotId: null, kind: "combined", mode: "browser", revision: REVISION, fingerprint: REVISION, configFingerprint: "config", status: "queued", provider, simulated: false, startedAt: 1, completedAt: null, environment: null, cleanupStatus: "pending", error: null, verification: pendingVerification("ticket-source") });
  const execute = async (browserConfigured = true, setupConfigured = false): Promise<void> => {
    Object.defineProperty(system, "dryRun", { value: false });
    if (!project.validation) throw new Error("Fixture validation configuration is missing");
    const validation = setupConfigured ? { ...project.validation, isolated: true, setupCommand: "setup-fixture", teardownCommand: "teardown-fixture", startCommand: browserConfigured ? "start-fixture" : undefined } : browserConfigured ? project.validation : undefined;
    await executeCombinedQuality({ run, ticket, project: { ...project, validation }, system, store, repoMutex: new KeyedMutex(), execution: resolveExecution("quality-validator", { orchestrator: provider }, { model: "sonnet", effort: "medium" }), signal: controller.signal, artifactDirectory: join(directory, "artifacts"), environmentVariables: () => ({}), waitForHealth: async () => undefined, assertCurrent: async () => undefined, update: (patch) => { store.updateQualityRun(run.id, patch); }, browserValidator: async (options) => {
      expect(system.sessions.length).toBe(2);
      expect(options.functional).toBe(true);
      expect(options.mode).toBe("browser");
      expect(options.checks).toEqual([]);
      expect(options.execution.provider).toBe(provider);
      system.browserCompleted();
      return { sessionId: "browser-session", model: options.execution.model, provider, evidence: [qualityEvidenceSchema.parse({ id: "browser-evidence", runId: run.id, criterionId: "F01", kind: "behavior", authority: "agent", author: "agent", status: "passed", summary: "Cart total updated after click", output: "Observed total 20", command: null, exitCode: null, timedOut: false, durationMs: 1, artifactPath: null, provider, sessionId: "browser-session", model: options.execution.model, createdAt: 1, scenario: { interaction: "interactive", expected: "Total 20", actions: [{ tool: "browser_click", ok: true }], observed: "Total 20" } })] };
    } });
  };
  return { directory, db, store, system, run, ticket, project, controller, execute, close: async () => { db.close(); await rm(directory, { recursive: true, force: true }); } };
}

describe("combined quality orchestration", () => {
  for (const browserConfigured of [true, false]) {
    test(`setup precedes technical tests and runs once with browser configured=${browserConfigured}`, async () => {
      const f = await fixture();
      try {
        await f.execute(browserConfigured, true);
        expect(f.system.commands).toEqual(["setup-fixture", "bun run typecheck", "bun run lint", "bun run test", "bun run test:e2e", ...(browserConfigured ? ["start-fixture"] : []), "teardown-fixture"]);
        expect(f.store.getQualityRun(f.run.id)?.verification?.technical.status).toBe("passed");
        expect(f.store.getTicketQuality(f.ticket.id).evidence.some((entry) => entry.summary === "Environment setup" && entry.status === "passed")).toBe(true);
      } finally { await f.close(); }
    });
  }
  test("failed setup blocks execution but preserves relevance analysis and teardown", async () => {
    const f = await fixture();
    try {
      f.system.failSetup = true;
      await f.execute(true, true);
      expect(f.system.commands).toEqual(["setup-fixture", "teardown-fixture"]);
      expect(f.system.sessions).toHaveLength(1);
      expect(f.store.getQualityRun(f.run.id)).toMatchObject({ status: "inconclusive", evidenceAccepted: false, verification: { technical: { status: "blocked" }, relevance: { status: "passed" }, browser: { status: "blocked" } } });
    } finally { await f.close(); }
  });
  for (const provider of ["claude", "codex"] satisfies Orchestrator[]) {
    test(`${provider}: technical failure still assesses test relevance and browser interaction`, async () => {
      const f = await fixture(provider);
      try {
        f.system.failTests = true;
        await f.execute();
        expect(f.system.commands).toEqual(["bun run typecheck", "bun run lint", "bun run test", "bun run test:e2e", "start-fixture"]);
        const result = f.store.getQualityRun(f.run.id);
        expect(result).toMatchObject({ status: "failed", cleanupStatus: "complete", verification: { technical: { status: "failed" }, relevance: { status: "passed" }, browser: { status: "passed" } } });
        for (const session of f.system.sessions) {
          expect(session.provider).toBe(provider);
          expect(session.readOnly).toBe(true);
          expect(session.disableWorkerTools).toBe(true);
          expect(session.disallowedTools).toContain("Bash");
          expect(session.extraMcpServers ?? {}).toEqual({});
          expect(session.outputSchema?.$schema).toBe("http://json-schema.org/draft-07/schema#");
        }
        expect(f.store.getTicketQuality(f.ticket.id).criteriaSnapshots).toEqual([]);
        const reloaded = new Store(f.db).getQualityRun(f.run.id);
        expect(reloaded?.verification).toEqual(result?.verification);
        expect(() => f.store.updateQualityRun(f.run.id, { verification: pendingVerification("changed") })).toThrow("immutable");
      } finally { await f.close(); }
    });
  }
  test("no tests and no browser configuration report all dimensions truthfully", async () => {
    const f = await fixture();
    try {
      await writeFile(join(f.directory, "package.json"), JSON.stringify({ scripts: { lint: "eslint ." } }));
      f.system.absentTests = true;
      await f.execute(false);
      expect(f.store.getQualityRun(f.run.id)).toMatchObject({ status: "inconclusive", evidenceAccepted: false, verification: { technical: { status: "inconclusive" }, relevance: { status: "inconclusive" }, browser: { status: "blocked" } } });
      expect(f.system.sessions).toHaveLength(1);
    } finally { await f.close(); }
  });
  test("all three successful dimensions persist without changing acceptance criteria", async () => {
    const f = await fixture();
    try { await f.execute(); expect(f.store.getQualityRun(f.run.id)).toMatchObject({ status: "passed", evidenceAccepted: true, verification: { relevance: { tested: [{ sessionId: "independent-1" }] }, browser: { tested: [{ sessionId: "browser-session" }] } } }); }
    finally { await f.close(); }
  });
  test("cancellation accounts for unexecuted dimensions and still cleans the workspace", async () => {
    const f = await fixture();
    try {
      f.controller.abort();
      await f.execute();
      expect(f.system.sessions).toHaveLength(0);
      expect(f.store.getQualityRun(f.run.id)).toMatchObject({ status: "cancelled", cleanupStatus: "complete", evidenceAccepted: false, verification: { technical: { status: "blocked" }, relevance: { status: "blocked" }, browser: { status: "blocked" } } });
    } finally { await f.close(); }
  });
  test("source mutation prevents accepting otherwise successful dimensions", async () => {
    const f = await fixture();
    try {
      f.system.browserCompleted = () => { f.system.mutated = true; };
      await f.execute();
      expect(f.store.getQualityRun(f.run.id)).toMatchObject({ status: "inconclusive", cleanupStatus: "complete", evidenceAccepted: false, technicalEvidenceAccepted: false, verification: { technical: { status: "passed" }, relevance: { status: "passed" }, browser: { status: "blocked" } } });
    } finally { await f.close(); }
  });
  test("failed cleanup retains a persisted reservation and unaccepted report", async () => {
    const f = await fixture();
    try { f.system.cleanupFails = true; await f.execute(); expect(f.store.getQualityRun(f.run.id)).toMatchObject({ status: "inconclusive", cleanupStatus: "failed", evidenceAccepted: false }); }
    finally { await f.close(); }
  });
  for (const vcs of ["github", "azureDevops"] satisfies VcsProvider[]) {
    test(`${vcs}: manager uses PR head seam and single admission; simulation survives restart`, async () => {
      const f = await fixture("codex", vcs);
      try {
        f.store.updateQualityRun(f.run.id, { status: "cancelled", completedAt: 2, cleanupStatus: "complete" });
        const manager = new QualityManager({ store: f.store, system: f.system });
        const run = await manager.verifyCombined(f.ticket.id, "codex");
        await expect(manager.verifyCombined(f.ticket.id, "claude")).rejects.toThrow();
        const result = await manager.awaitRun(run.id);
        expect(result).toMatchObject({ kind: "combined", simulated: true, status: "inconclusive", evidenceAccepted: false, verification: { technical: { status: "inconclusive" }, relevance: { status: "inconclusive" }, browser: { status: "inconclusive" } } });
        expect(result.revision).toBe(REVISION);
        expect(f.system.hosts.every((host) => host === vcs)).toBe(true);
        expect((await manager.gate(f.ticket.id, "reservations")).currentRunIds).toContain(run.id);
        f.system.headRevision = "new-pr-head";
        expect((await manager.gate(f.ticket.id, "reservations")).currentRunIds).not.toContain(run.id);
        f.system.headRevision = REVISION;
        manager.setCriteria(f.ticket.id, [{ id: "C01", text: "Quantity changes total", source: "user", required: true, independent: true }], "user", "browser");
        const gate = await manager.gate(f.ticket.id, "reservations");
        expect(gate.currentRunIds).not.toContain(run.id);
        expect(gate.verifiedCriteria).toEqual([]);
        expect(gate.complete).toBe(false);
        const interrupted = f.store.createQualityRun({ ...run, status: "running", completedAt: null, cleanupStatus: "pending", verification: pendingVerification("ticket-source") });
        await manager.recover();
        expect(f.store.getQualityRun(interrupted.id)).toMatchObject({ status: "interrupted", cleanupStatus: "complete", verification: { technical: { status: "pending" } } });
        await manager.shutdown();
      } finally { await f.close(); }
    });
  }
  test("report schema preserves old runs and validates new component statuses", () => {
    const report: QualityVerificationReport = pendingVerification("source");
    expect(report.technical.status).toBe("pending");
    const old = { id: "old", ticketId: "ticket", criteriaSnapshotId: null, kind: "checks", revision: "rev", fingerprint: "fp", configFingerprint: "cfg", status: "passed", provider: null, simulated: false, startedAt: 1, completedAt: 2, environment: null, cleanupStatus: "complete", error: null };
    expect(qualityValidationRunSchema.parse(old).verification).toBeNull();
    expect(qualityValidationRunSchema.safeParse({ ...old, kind: "combined", verification: { ...report, technical: { status: "success", tested: [], improvements: [] } } }).success).toBe(false);
  });
  test("discovery respects configured overrides and excludes interactive watch scripts", async () => {
    const f = await fixture();
    try { expect(await combinedCheckCommands({ ...f.project, scripts: { test: "custom-tests" } }, f.directory, false)).toEqual([{ name: "typecheck", command: "bun run typecheck" }, { name: "lint", command: "bun run lint" }, { name: "test", command: "custom-tests" }, { name: "test:e2e", command: "bun run test:e2e" }]); }
    finally { await f.close(); }
  });
});
