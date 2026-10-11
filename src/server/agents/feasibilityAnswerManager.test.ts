import { afterEach, expect, test } from "bun:test";
import type { Orchestrator } from "../../shared/constants.ts";
import { feasibilityAnswerInputSchema, triageResultSchema } from "../../shared/schemas.ts";
import type { Ticket } from "../../shared/schemas.ts";
import type { CodexRuntimeStatus } from "../../shared/codexCapabilities.ts";
import { initProjectRegistry } from "../config.ts";
import { createDatabase } from "../db/schema.ts";
import { Store } from "../db/store.ts";
import { ClientHub } from "../hub.ts";
import { FakeSystemAdapter } from "../system/fake.ts";
import type { ReformulateOptions } from "../system/types.ts";
import { FeasibilityAnswerManager, buildFeasibilityAnswerPrompt } from "./feasibilityAnswerManager.ts";

const report = JSON.stringify(triageResultSchema.parse({ verdict: "needs_info", summary: "Context", reasons: [], questions: ["Which colour?", "Which size?"], files: [] }));
const closers: Array<() => void> = [];
afterEach(() => { for (const close of closers.splice(0)) close(); });

class ControlledSystem extends FakeSystemAdapter {
  calls: ReformulateOptions[] = [];
  complete: (value: string) => void = () => { throw new Error("No pending call"); };
  reject: (error: Error) => void = () => { throw new Error("No pending call"); };
  unavailable = false;
  override async checkCodexRuntime(): Promise<CodexRuntimeStatus> {
    if (this.unavailable) return { ...(await super.checkCodexRuntime()), status: "unavailable", message: "Unavailable" };
    return super.checkCodexRuntime();
  }
  override reformulate(options: ReformulateOptions): Promise<string> {
    this.calls.push(options);
    return new Promise((resolve, reject) => { this.complete = resolve; this.reject = reject; });
  }
}

class RecordingHub extends ClientHub {
  tickets: Ticket[] = [];
  override pushTicket(ticket: Ticket): void { this.tickets.push(ticket); }
}

function setup(orchestrator: Orchestrator = "claude", engine: Orchestrator | null = null) {
  const db = createDatabase(":memory:");
  closers.push(() => db.close());
  const store = new Store(db);
  store.createProject("answer-project", { label: "Test", repoPath: "/tmp/answer-project", baseBranch: "main", commitTimeoutMs: 60000, defaultAutoMerge: false, defaultAddScreenshots: false });
  initProjectRegistry(store);
  db.query("INSERT INTO tickets (id, title, description, project, orchestrator, feasibility_engine, created_at, updated_at) VALUES ('answer-ticket', 'Test', 'Existing requirements /tmp/image.png', 'answer-project', ?, ?, 1, 1)").run(orchestrator, engine);
  store.updateTicket("answer-ticket", { triageStatus: "done", triageReport: report });
  const system = new ControlledSystem();
  const hub = new RecordingHub(store);
  const manager = new FeasibilityAnswerManager(store, system, hub);
  const ticket = (): Ticket => {
    const current = store.getTicket("answer-ticket");
    if (!current) throw new Error("Missing ticket");
    return current;
  };
  const input = (questionIndex = 0) => ({ revision: ticket().feasibilityRevision, reportVersion: ticket().feasibilityReportVersion, questionIndex, answer: " Blue " });
  return { db, store, system, hub, manager, ticket, input };
}

for (const [orchestrator, engine, expected] of [
  ["claude", "codex", "codex"], ["codex", "claude", "claude"],
  ["codex", null, "codex"], ["claude", null, "claude"],
] satisfies Array<[Orchestrator, Orchestrator | null, Orchestrator]>) {
  test(`answers capture pinned ${expected} execution with orchestrator=${orchestrator}, engine=${engine}`, async () => {
    const { store, system, hub, manager, ticket, input } = setup(orchestrator, engine);
    manager.start(ticket().id, input());
    expect(ticket().feasibilityAnswers[0]?.status).toBe("running");
    expect(() => manager.start(ticket().id, input(1))).toThrow("already running");
    await Bun.sleep(0);
    const call = system.calls[0];
    expect(call).toMatchObject({ provider: expected, model: expected === "codex" ? "gpt-6.1-sol" : "sonnet", effort: expected === "codex" ? "medium" : "low", serviceTier: "default" });
    store.updateTicket(ticket().id, { orchestrator: expected === "claude" ? "codex" : "claude" });
    call?.onEvent?.({ type: "init", sessionId: "answer-session" });
    call?.onEvent?.({ type: "turn_end", sessionId: "answer-session", ok: true, subtype: "success", usageByModel: {
      "test-model": { inputTokens: 11, outputTokens: 5, cacheReadTokens: 0, cacheCreationTokens: 0, costUsd: null },
    } });
    system.complete("Existing requirements /tmp/image.png\nColour: Blue\nUnresolved: Which size?");
    await Bun.sleep(0);
    expect(ticket().description).toContain("Colour: Blue");
    expect(ticket().feasibilityAnswers[0]).toMatchObject({ question: "Which colour?", answer: "Blue", status: "done" });
    expect(hub.tickets.map((value) => value.feasibilityAnswers[0]?.status)).toEqual(["running", "done"]);
    expect(store.listExecutionRuns("ticket", ticket().id)[0]).toMatchObject({ orchestrator: expected, status: "completed", sessionId: "answer-session" });
    expect(store.listExecutionRuns("ticket", ticket().id)[0]?.usageByModel["test-model"]?.inputTokens).toBe(11);
    expect(() => manager.start(ticket().id, input())).toThrow("already been answered");
    const prompt = buildFeasibilityAnswerPrompt(ticket(), { ...input(1), id: "next", question: "Which size?", status: "running", error: null });
    expect(prompt).toContain('"answer":"Blue"');
  });
}

test("bounded input, current question/version and TODO lifecycle are required", () => {
  const { store, manager, ticket, input } = setup();
  for (const answer of ["", "  ", "x".repeat(10001)]) expect(feasibilityAnswerInputSchema.safeParse({ ...input(), answer }).success).toBe(false);
  for (const questionIndex of [-1, 0.5]) expect(feasibilityAnswerInputSchema.safeParse({ ...input(), questionIndex }).success).toBe(false);
  expect(() => manager.start("missing", input())).toThrow("Ticket not found");
  expect(() => manager.start(ticket().id, input(100))).toThrow("current report");
  const old = input();
  store.updateTicket(ticket().id, { description: ticket().description });
  expect(() => manager.start(ticket().id, old)).toThrow("changed");
  store.updateTicket(ticket().id, { column: "implementing" });
  expect(() => manager.start(ticket().id, input())).toThrow("not eligible");
  store.updateTicket(ticket().id, { column: "todo", archived: true });
  expect(() => manager.start(ticket().id, input())).toThrow("not eligible");
  store.updateTicket(ticket().id, { archived: false, stage: "queued" });
  expect(() => manager.start(ticket().id, input())).toThrow("not eligible");
});

for (const change of ["description", "report", "lifecycle"] as const) {
  test(`rejects stale results after ${change} replacement/reversion`, async () => {
    const { store, manager, system, ticket, input } = setup();
    const before = ticket();
    manager.start(before.id, input());
    await Bun.sleep(0);
    if (change === "description") {
      store.updateTicket(before.id, { description: "User edit" });
      store.updateTicket(before.id, { description: before.description });
    } else if (change === "report") {
      store.updateTicket(before.id, { triageReport: report });
    } else {
      store.updateTicket(before.id, { column: "implementing" });
      store.updateTicket(before.id, { column: "todo" });
    }
    system.complete("Unexpected overwrite /tmp/image.png");
    await Bun.sleep(0);
    expect(ticket().description).toBe(before.description);
    expect(ticket().feasibilityAnswers[0]?.status).toBe("failed");
  });
}

for (const failure of ["provider", "empty", "image"] as const) {
  test(`persists ${failure} failure and supports retry`, async () => {
    const { manager, system, ticket, input } = setup();
    manager.start(ticket().id, input());
    await Bun.sleep(0);
    if (failure === "provider") system.reject(new Error("Provider failed"));
    else system.complete(failure === "empty" ? " \n " : "Removed image");
    await Bun.sleep(0);
    expect(ticket().feasibilityAnswers[0]?.status).toBe("failed");
    expect(ticket().feasibilityAnswers[0]?.answer).toBe("Blue");
    manager.start(ticket().id, input());
    await Bun.sleep(0);
    system.complete("Existing requirements /tmp/image.png Blue");
    await Bun.sleep(0);
    expect(ticket().feasibilityAnswers).toHaveLength(1);
    expect(ticket().feasibilityAnswers[0]?.status).toBe("done");
  });
}

test("unavailable Codex is persisted without calling the provider", async () => {
  const { manager, system, store, ticket, input } = setup("claude", "codex");
  system.unavailable = true;
  manager.start(ticket().id, input());
  await Bun.sleep(0);
  expect(system.calls).toHaveLength(0);
  expect(ticket().feasibilityAnswers[0]).toMatchObject({ status: "failed", error: "Unavailable" });
  expect(store.listExecutionRuns("ticket", ticket().id)[0]?.status).toBe("failed");
});

test("restart recovery keeps the answer retryable and discards old completion", async () => {
  const { store, manager, system, hub, ticket, input } = setup();
  manager.start(ticket().id, input());
  await Bun.sleep(0);
  const oldComplete = system.complete;
  const recovered = new FeasibilityAnswerManager(store, system, hub);
  recovered.recoverStale();
  expect(ticket().feasibilityAnswers[0]?.status).toBe("failed");
  recovered.start(ticket().id, input());
  await Bun.sleep(0);
  oldComplete("Old completion /tmp/image.png");
  await Bun.sleep(0);
  expect(ticket().description).not.toContain("Old completion");
  expect(ticket().feasibilityAnswers[0]?.status).toBe("running");
  system.complete("Fresh completion /tmp/image.png");
  await Bun.sleep(0);
  expect(ticket().description).toContain("Fresh completion");
});

test("deleted ticket completion is ignored", async () => {
  const { store, manager, system, hub, ticket, input } = setup();
  const id = ticket().id;
  manager.start(id, input());
  await Bun.sleep(0);
  store.deleteTicket(id);
  system.complete("Deleted /tmp/image.png");
  await Bun.sleep(0);
  expect(store.getTicket(id)).toBeNull();
  expect(hub.tickets).toHaveLength(1);
});

test("missing project is rejected", () => {
  const { db, manager, ticket, input } = setup();
  const request = input();
  const id = ticket().id;
  db.query("UPDATE tickets SET project = 'missing-project' WHERE id = ?").run(id);
  expect(() => manager.start(id, request)).toThrow("Project not found");
});

test("Azure project answers use the same integration path and reject changed project configuration", async () => {
  const { store, manager, system, ticket, input } = setup("claude", "codex");
  store.updateProject("answer-project", { vcsProvider: "azureDevops" });
  expect(store.getProjectRow("answer-project")?.vcsProvider).toBe("azureDevops");
  manager.start(ticket().id, input());
  await Bun.sleep(0);
  system.complete("Existing requirements /tmp/image.png Blue");
  await Bun.sleep(0);
  expect(ticket().feasibilityAnswers[0]?.status).toBe("done");
  manager.start(ticket().id, input(1));
  await Bun.sleep(0);
  store.updateProject("answer-project", { repoPath: "/tmp/replaced-project" });
  system.complete("Wrong project /tmp/image.png");
  await Bun.sleep(0);
  expect(ticket().description).not.toContain("Wrong project");
  expect(ticket().feasibilityAnswers[1]?.status).toBe("failed");
});
