import type { Database } from "bun:sqlite";

import { afterAll, beforeAll, describe, expect, test } from "bun:test";

import { initProjectRegistry } from "../config.ts";
import { createDatabase } from "../db/schema.ts";
import { Store } from "../db/store.ts";
import { ClientHub } from "../hub.ts";
import { Notifier } from "../notifier.ts";
import type { AgentSessionHandle, AgentSessionOptions } from "../system/agentSession.ts";
import { FakeSystemAdapter } from "../system/fake.ts";
import { makeTicket } from "../testing/fixtures.ts";
import { removeDbFiles, tmpDbPath } from "../testing/tmpDb.ts";

import { FeasibilityBatchManager, groupFeasibilityTickets } from "./feasibilityManager.ts";
import { SessionHub } from "./sessionHub.ts";

class RecordingSystem extends FakeSystemAdapter {
  readonly sessions: AgentSessionOptions[] = [];

  override startAgentSession(options: AgentSessionOptions): AgentSessionHandle {
    this.sessions.push(options);
    return {
      ticketId: options.ticketId,
      send: (_content, messageId = crypto.randomUUID()) => messageId,
      interrupt: async () => undefined,
      close: async () => undefined,
    };
  }
}

let dbPath = "";
let db: Database;

beforeAll(() => {
  dbPath = tmpDbPath();
  db = createDatabase(dbPath);
  const store = new Store(db);
  for (const key of ["project-a", "project-b"]) {
    store.createProject(key, {
      label: key,
      repoPath: `/tmp/${key}`,
      baseBranch: "main",
      commitTimeoutMs: 60_000,
      defaultAutoMerge: false,
      defaultAddScreenshots: false,
    });
  }
  initProjectRegistry(store);
});

afterAll(() => {
  db.close();
  removeDbFiles(dbPath);
});

describe("groupFeasibilityTickets", () => {
  test("batches only tickets sharing project, provider, model and effort", () => {
    const tickets = [
      makeTicket({ id: "a-1", project: "project-a" }),
      makeTicket({ id: "a-2", project: "project-a" }),
      makeTicket({
        id: "a-codex",
        project: "project-a",
        orchestrator: "codex",
        codexModel: "gpt-6-astra",
        codexEffort: "high",
      }),
      makeTicket({ id: "b-1", project: "project-b" }),
    ];

    const result = groupFeasibilityTickets(tickets);

    expect(result.invalidTicketIds).toEqual([]);
    expect(result.groups).toHaveLength(3);
    expect(result.groups.find((group) => group.ticketIds.includes("a-1"))?.ticketIds).toEqual(["a-1", "a-2"]);
    expect(result.groups.find((group) => group.ticketIds.includes("a-codex"))?.execution).toMatchObject({
      provider: "codex",
      model: "gpt-6-astra",
      effort: "high",
    });
    expect(result.groups.find((group) => group.ticketIds.includes("b-1"))?.project.label).toBe("project-b");
  });

  test("bounds live batches, splits large groups and drains only after completion", async () => {
    const store = new Store(db);
    initProjectRegistry(store);
    const system = new RecordingSystem();
    // Exercise the real orchestration branch with a provider that never performs side effects.
    Object.defineProperty(system, "dryRun", { value: false });
    const hub = new ClientHub(store);
    const sessionHub = new SessionHub(system);
    const manager = new FeasibilityBatchManager(store, system, sessionHub, hub, new Notifier(hub));
    const ids = Array.from({ length: 13 }, (_, index) => `bounded-${index}`);
    for (const id of ids) {
      db.query("INSERT INTO tickets (id, title, project, created_at, updated_at) VALUES (?, ?, 'project-a', 1, 1)").run(id, id);
    }
    try {
      await manager.start(ids, "project-a");
      await Bun.sleep(0);
      expect(system.sessions).toHaveLength(2);
      expect(manager.batchKeyForTicket(ids[8] ?? "")).toBeNull();
      await manager.start(ids, "project-a");
      expect(system.sessions).toHaveLength(2);
      const first = system.sessions[0];
      if (!first) throw new Error("missing first batch");
      await manager.complete(first.ticketId, []);
      await Bun.sleep(0);
      expect(system.sessions).toHaveLength(3);
      expect(manager.batchKeyForTicket(ids[8] ?? "")).not.toBeNull();
      expect(manager.batchKeyForTicket(ids[12] ?? "")).toBeNull();
      await manager.teardownAll();
      await Bun.sleep(0);
      expect(system.sessions).toHaveLength(3);
    } finally {
      await manager.teardownAll();
      sessionHub.disconnectAll();
    }
  });
});
