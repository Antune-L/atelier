import { afterEach, describe, expect, test } from "bun:test";

import { initProjectRegistry } from "../config.ts";
import { makeTicket } from "../testing/fixtures.ts";
import { removeDbFiles, tmpDbPath } from "../testing/tmpDb.ts";

import { createDatabase } from "./schema.ts";
import { Store } from "./store.ts";

const paths: string[] = [];

afterEach(() => {
  for (const path of paths.splice(0)) removeDbFiles(path);
});

describe("Store execution lifecycle", () => {
  test("persists nullable Codex implementer overrides including explicit FAST off", () => {
    const path = tmpDbPath();
    paths.push(path);
    const db = createDatabase(path);
    const store = new Store(db);
    store.createProject("test-proj", { label: "Test", repoPath: "/tmp/repo", baseBranch: "main", commitTimeoutMs: 60_000, defaultAutoMerge: false, defaultAddScreenshots: false });
    initProjectRegistry(store);
    const source = makeTicket({
      codexModel: "gpt-6-astra",
      codexEffort: "ultra",
      codexFast: true,
      codexImplementerModel: "gpt-5.6-sol",
      codexImplementerEffort: "high",
      codexImplementerFast: false,
    });
    const ticket = store.createTicket({ ...source, childOrder: null });
    expect(ticket.codexImplementerModel).toBe("gpt-5.6-sol");
    expect(ticket.codexImplementerEffort).toBe("high");
    expect(ticket.codexImplementerFast).toBe(false);
    const inherited = store.updateTicket(ticket.id, {
      codexImplementerModel: null,
      codexImplementerEffort: null,
      codexImplementerFast: null,
    });
    expect(inherited.codexImplementerModel).toBeNull();
    expect(inherited.codexImplementerEffort).toBeNull();
    expect(inherited.codexImplementerFast).toBeNull();
    db.close();
  });

  test("attaches a session and finalizes one generation exactly once", () => {
    const path = tmpDbPath();
    paths.push(path);
    const db = createDatabase(path);
    const store = new Store(db);
    store.startExecution({
      id: "run-1",
      ownerType: "action",
      ownerId: "prd-1",
      generationId: "generation-1",
      sessionId: null,
      role: "prd",
      orchestrator: "codex",
      effectiveModel: "gpt-5.6-sol",
      effectiveEffort: "low",
      delegateProvider: "codex",
      delegateEffectiveModel: "gpt-6-astra",
      delegateEffectiveEffort: "high",
      delegateCodexFast: false,
      codexFast: true,
      startedAt: 10,
    });
    store.attachExecutionSession({ generationId: "generation-1", sessionId: "session-1", configuredServiceTier: "fast" });
    const completed = store.finalizeExecution({
      generationId: "generation-1",
      status: "completed",
      usageByModel: {
        "gpt-5.6-sol": {
          inputTokens: 100,
          outputTokens: 20,
          cacheReadTokens: 5,
          cacheCreationTokens: 0,
          costUsd: null,
        },
      },
      finishedAt: 20,
    });
    expect(completed.sessionId).toBe("session-1");
    expect(completed.status).toBe("completed");
    expect(completed.codexFast).toBe(true);
    expect(completed.delegateProvider).toBe("codex");
    expect(completed.delegateEffectiveModel).toBe("gpt-6-astra");
    expect(completed.delegateEffectiveEffort).toBe("high");
    expect(completed.delegateCodexFast).toBe(false);
    expect(completed.configuredServiceTier).toBe("fast");
    expect(completed.usageByModel["gpt-5.6-sol"]?.costUsd).toBeNull();

    const duplicate = store.finalizeExecution({
      generationId: "generation-1",
      status: "failed",
      usageByModel: {},
      error: "late callback",
      finishedAt: 30,
    });
    expect(duplicate.status).toBe("completed");
    expect(duplicate.finishedAt).toBe(20);
    db.close();
  });

  test("replays queued and received messages with stable ids after reopening", () => {
    const path = tmpDbPath();
    paths.push(path);
    const db = createDatabase(path);
    const store = new Store(db);
    store.enqueueAgentMessage({
      id: "message-b",
      ownerType: "ticket",
      ownerId: "ticket-1",
      generationId: "generation-1",
      sessionId: null,
      channel: "user_comment",
      content: "Commentaire exact",
      createdAt: 10,
    });
    store.enqueueAgentMessage({
      id: "message-a",
      ownerType: "ticket",
      ownerId: "ticket-1",
      generationId: "generation-1",
      sessionId: null,
      channel: "answer",
      content: "Réponse exacte",
      createdAt: 10,
    });
    expect(
      store.enqueueAgentMessage({
        id: "message-a",
        ownerType: "ticket",
        ownerId: "ticket-1",
        generationId: "generation-1",
        sessionId: "session-replay",
        channel: "answer",
        content: "Réponse exacte",
        createdAt: 99,
      }).createdAt,
    ).toBe(10);
    expect(() =>
      store.enqueueAgentMessage({
        id: "message-a",
        ownerType: "ticket",
        ownerId: "ticket-1",
        generationId: "generation-1",
        sessionId: null,
        channel: "answer",
        content: "Contenu divergent",
      }),
    ).toThrow("déjà utilisé");
    store.markAgentMessageReceived({ id: "message-b", sessionId: "session-1", turnId: null, receivedAt: 11 });
    db.close();

    const reopenedDb = createDatabase(path);
    const reopened = new Store(reopenedDb);
    expect(reopened.listPendingAgentMessages("ticket", "ticket-1").map((message) => message.id)).toEqual([
      "message-a",
      "message-b",
    ]);
    const received = reopened.listPendingAgentMessages("ticket", "ticket-1")[1];
    expect(received?.content).toBe("Commentaire exact");
    expect(received?.status).toBe("received");

    reopened.markAgentMessageAccepted({ id: "message-b", sessionId: "session-1", turnId: "turn-1", acceptedAt: 12 });
    reopened.markAgentMessageRejected({ id: "message-b", error: "late rejection", rejectedAt: 13 });
    reopened.markAgentMessageRejected({ id: "message-a", error: "provider rejected", rejectedAt: 14 });
    expect(reopened.listPendingAgentMessages("ticket", "ticket-1")).toEqual([]);
    const terminal = reopened.listAgentMessages("ticket", "ticket-1");
    expect(terminal.find((message) => message.id === "message-b")?.status).toBe("accepted");
    expect(terminal.find((message) => message.id === "message-b")?.error).toBeNull();
    expect(terminal.find((message) => message.id === "message-a")?.status).toBe("rejected");
    reopenedDb.close();
  });

  test("fails orphaned runs without dropping usage or pending messages", () => {
    const path = tmpDbPath();
    paths.push(path);
    const db = createDatabase(path);
    const store = new Store(db);
    store.startExecution({
      id: "run-orphan",
      ownerType: "action",
      ownerId: "prd-1",
      generationId: "generation-orphan",
      sessionId: "session-orphan",
      role: "one-shot",
      orchestrator: "codex",
      effectiveModel: "gpt-6-astra",
      effectiveEffort: "high",
    });
    store.updateExecutionUsage("generation-orphan", {
      "gpt-6-astra": {
        inputTokens: 8,
        outputTokens: 3,
        cacheReadTokens: 0,
        cacheCreationTokens: 0,
        costUsd: null,
      },
    });
    store.startExecution({
      id: "run-current",
      ownerType: "action",
      ownerId: "prd-2",
      generationId: "generation-current",
      sessionId: null,
      role: "one-shot",
      orchestrator: "codex",
      effectiveModel: "gpt-5.6-terra",
      effectiveEffort: "medium",
    });
    store.enqueueAgentMessage({
      id: "message-orphan",
      ownerType: "action",
      ownerId: "prd-1",
      generationId: "generation-orphan",
      sessionId: "session-orphan",
      channel: "user_comment",
      content: "Ne pas perdre",
    });

    expect(store.failStaleExecutionRuns("redémarrage du serveur", [])).toBe(0);
    expect(store.failStaleExecutionRuns("redémarrage du serveur", ["generation-orphan"])).toBe(1);
    const run = store.listExecutionRuns("action", "prd-1")[0];
    expect(run?.status).toBe("failed");
    expect(run?.usageByModel["gpt-6-astra"]?.inputTokens).toBe(8);
    expect(store.listPendingAgentMessages("action", "prd-1")[0]?.content).toBe("Ne pas perdre");
    expect(store.listExecutionRuns("action", "prd-2")[0]?.status).toBe("running");
    db.close();
  });

  test("preserves checkpointed usage when final usage is empty", () => {
    const path = tmpDbPath();
    paths.push(path);
    const db = createDatabase(path);
    const store = new Store(db);
    store.startExecution({
      id: "run-checkpoint",
      ownerType: "ticket",
      ownerId: "ticket-1",
      generationId: "generation-checkpoint",
      sessionId: "session-checkpoint",
      role: "implementation",
      orchestrator: "codex",
      effectiveModel: "gpt-5.6-terra",
      effectiveEffort: "high",
    });
    store.updateExecutionUsage("generation-checkpoint", {
      "gpt-5.6-terra": {
        inputTokens: 21,
        outputTokens: 5,
        cacheReadTokens: 4,
        cacheCreationTokens: 1,
        costUsd: null,
      },
    });

    const completed = store.finalizeExecution({
      generationId: "generation-checkpoint",
      status: "completed",
      usageByModel: {},
    });
    expect(completed.usageByModel["gpt-5.6-terra"]?.inputTokens).toBe(21);
    expect(completed.status).toBe("completed");
    db.close();
  });
});


test("restart preserves known terminal outcomes without claiming unfinished reviewers succeeded", () => {
  const path = tmpDbPath(); paths.push(path);
  const db = createDatabase(path); const store = new Store(db);
  store.createProject("test-proj", { label: "Test", repoPath: "/tmp/repo", baseBranch: "main", commitTimeoutMs: 60000, defaultAutoMerge: false, defaultAddScreenshots: false });
  initProjectRegistry(store);
  const ticket = store.createTicket(makeTicket());
  store.updateTicket(ticket.id, { column: "reviewed", stage: "done", finishedAt: 100 });
  for (const role of ["orchestrator", "reviewer"]) {
    store.startExecution({ id: role, generationId: role, ownerType: "ticket", ownerId: ticket.id, sessionId: null, role, orchestrator: "codex", effectiveModel: "gpt-5.6-sol", effectiveEffort: "medium", codexFast: false });
  }
  expect(store.failStaleExecutionRuns("restart")).toBe(2);
  const runs = store.listExecutionRuns("ticket", ticket.id);
  expect(runs.find((run) => run.role === "orchestrator")).toMatchObject({ status: "completed", error: null, finishedAt: 100 });
  expect(runs.find((run) => run.role === "reviewer")).toMatchObject({ status: "failed", error: "restart" });
  expect(store.failStaleExecutionRuns("restart")).toBe(0);
  db.close();
});
