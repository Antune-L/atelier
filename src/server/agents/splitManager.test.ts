import { expect, test } from "bun:test";

import { initProjectRegistry } from "../config.ts";
import { createDatabase } from "../db/schema.ts";
import { Store } from "../db/store.ts";
import { KeyedMutex } from "../mutex.ts";
import type { AgentSessionHandle, AgentSessionOptions } from "../system/agentSession.ts";
import { FakeSystemAdapter } from "../system/fake.ts";

import type { AcquireSnapshotInput, SnapshotLease } from "./repoSnapshots.ts";
import { SessionHub } from "./sessionHub.ts";
import { SplitManager } from "./splitManager.ts";

const SHA = "a".repeat(40);

class CapturingSystem extends FakeSystemAdapter {
  readonly sessions: AgentSessionOptions[] = [];

  override startAgentSession(opts: AgentSessionOptions): AgentSessionHandle {
    this.sessions.push(opts);
    return {
      ticketId: opts.ticketId,
      send: (_content, messageId = crypto.randomUUID()) => messageId,
      interrupt: async () => undefined,
      close: async () => undefined,
    };
  }
}

/** Holds every acquire until `open()`, like a slow fetch under the repo mutex. */
class GatedSnapshots {
  readonly calls: AcquireSnapshotInput[] = [];
  readonly repoMutex = new KeyedMutex();
  live = 0;
  private gate: Promise<void>;
  open: () => void = () => undefined;

  constructor() {
    this.gate = new Promise((resolve) => { this.open = resolve; });
  }

  async acquire(input: AcquireSnapshotInput): Promise<SnapshotLease> {
    this.calls.push(input);
    await this.gate;
    this.live += 1;
    let released = false;
    return {
      cwd: `/snapshots/${input.projectKey}/${SHA}`,
      sha: SHA,
      committedAt: 0,
      baseBranch: input.baseBranch,
      fetchError: null,
      release: () => {
        if (released) return;
        released = true;
        this.live -= 1;
      },
    };
  }
}

test("a second split during the snapshot fetch is refused and the first runs in the snapshot", async () => {
  const db = createDatabase(":memory:");
  const store = new Store(db);
  store.createProject("split-project", { label: "Split", repoPath: "/tmp/split-repo", baseBranch: "main", commitTimeoutMs: 60_000, defaultAutoMerge: false, defaultAddScreenshots: false });
  initProjectRegistry(store);
  const system = new CapturingSystem();
  Object.defineProperty(system, "dryRun", { value: false });
  const sessionHub = new SessionHub(system);
  const snapshots = new GatedSnapshots();
  const split = new SplitManager(store, system, sessionHub, snapshots);
  const ticket = store.createTicket({
    title: "Découper",
    description: "Une grosse carte",
    externalUrl: null,
    project: "split-project",
    prdEnabled: false,
    prDraft: true,
    autoMerge: false,
    addScreenshots: false,
    verifyFeature: false,
    argusMultiLoop: false,
    stealth: false,
    directPush: false,
    baseBranch: null,
    dependsOn: null,
    model: null,
    effort: null,
    implementerModel: null,
    implementerEffort: null,
    implementer: "claude",
    orchestrator: "claude",
    codexModel: null,
    codexEffort: null,
  });

  const first = split.run(ticket.id);
  first.catch(() => undefined);
  await Bun.sleep(0);
  await expect(split.run(ticket.id)).rejects.toThrow("découpage déjà en cours pour ce ticket");
  snapshots.open();
  await Bun.sleep(0);

  expect(snapshots.calls).toHaveLength(1);
  expect(snapshots.calls[0]).toMatchObject({ repoPath: "/tmp/split-repo", baseBranch: "main", fetch: true, requireFetch: true });
  expect(system.sessions).toHaveLength(1);
  expect(system.sessions[0]?.cwd).toBe(`/snapshots/split-project/${SHA}`);
  expect(snapshots.live).toBe(1);

  await split.complete(ticket.id, { summary: "ok", children: [] });
  await expect(first).resolves.toMatchObject({ summary: "ok" });
  expect(snapshots.live).toBe(0);

  sessionHub.disconnectAll();
  await sessionHub.drainClosingSessions();
  db.close();
});
