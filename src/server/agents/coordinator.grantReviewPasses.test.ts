import { afterEach, beforeEach, describe, expect, test } from "bun:test";

import { initProjectRegistry } from "../config.ts";
import { createDatabase } from "../db/schema.ts";
import { Store } from "../db/store.ts";
import { ClientHub } from "../hub.ts";
import { TicketLifecycle } from "../lifecycle.ts";
import { KeyedMutex } from "../mutex.ts";
import { Notifier } from "../notifier.ts";
import type { AgentSessionHandle, AgentSessionOptions } from "../system/agentSession.ts";
import { FakeSystemAdapter } from "../system/fake.ts";

import { AtelierManager } from "./atelierManager.ts";
import { AgentCoordinator } from "./coordinator.ts";
import { DelegationManager } from "./delegationManager.ts";
import { FeasibilityBatchManager } from "./feasibilityManager.ts";
import { RepoSnapshots } from "./repoSnapshots.ts";
import { SessionHub } from "./sessionHub.ts";
import { SlotManager } from "./slotManager.ts";
import { SplitManager } from "./splitManager.ts";
import { TriageManager } from "./triageManager.ts";

const PROJECT = "grant-project";

class RecordingSystem extends FakeSystemAdapter {
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

let store: Store;
let system: RecordingSystem;
let sessionHub: SessionHub;
let close: () => Promise<void>;

beforeEach(() => {
  const db = createDatabase(":memory:");
  store = new Store(db);
  store.createProject(PROJECT, {
    label: "Grant Project",
    repoPath: "/tmp/grant-project",
    baseBranch: "main",
    commitTimeoutMs: 60_000,
    defaultAutoMerge: false,
    defaultAddScreenshots: false,
  });
  initProjectRegistry(store);
  system = new RecordingSystem();
  const hub = new ClientHub(store);
  sessionHub = new SessionHub(system);
  const notifier = new Notifier(hub);
  const lifecycle = new TicketLifecycle(store, hub, notifier);
  const snapshots = new RepoSnapshots({ system, repoMutex: new KeyedMutex() });
  new AgentCoordinator(
    store,
    hub,
    sessionHub,
    notifier,
    lifecycle,
    new SlotManager(store, system, hub, sessionHub, notifier, lifecycle, { projectRoot: "/tmp" }),
    new TriageManager(store, system, sessionHub, hub, notifier),
    new FeasibilityBatchManager(store, system, sessionHub, hub, notifier),
    new SplitManager(store, system, sessionHub, snapshots),
    new DelegationManager(store, system, sessionHub, hub),
    new AtelierManager({ store, hub, sessionHub, system, snapshots }),
  );
  close = async () => {
    sessionHub.disconnectAll();
    await sessionHub.drainClosingSessions();
    db.close();
  };
});

afterEach(async () => {
  await close();
});

function newFeatureTicket(reviewRounds: number): string {
  const ticket = store.createTicket({
    title: "Feature",
    description: "Une feature au budget de review épuisé.",
    externalUrl: null,
    project: PROJECT,
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
  store.updateTicket(ticket.id, { reviewRounds });
  return ticket.id;
}

/** Start the ticket's orchestrator session and return its tool-call entry point. */
function startSession(ticketId: string): AgentSessionOptions["onToolCall"] {
  sessionHub.start({
    ticketId,
    slotId: 3,
    cwd: "/tmp/slot-3",
    provider: "claude",
    model: "opus",
    effort: null,
    role: "orchestrator",
    permissionMode: "dontAsk",
  });
  const session = system.sessions.at(-1);
  if (!session) throw new Error("session missing");
  return session.onToolCall;
}

function askAnswered(ticketId: string, questionId: string): void {
  store.addComment(ticketId, "agent", "Puis-je relancer des passes de review ?", questionId);
  store.markQuestionAnswered(questionId);
}

describe("grant_review_passes", () => {
  test("decrements review_rounds by the granted count, bounded at 0, and logs the grant", async () => {
    const ticketId = newFeatureTicket(2);
    const call = startSession(ticketId);
    askAnswered(ticketId, "q-1");

    const result = await call("grant_review_passes", { questionId: "q-1", count: 2 });

    expect(result.ok).toBe(true);
    expect(result.result).toContain("0/2");
    expect(store.getTicket(ticketId)?.reviewRounds).toBe(0);

    const bounded = newFeatureTicket(1);
    const boundedCall = startSession(bounded);
    askAnswered(bounded, "q-2");
    expect((await boundedCall("grant_review_passes", { questionId: "q-2", count: 3 })).ok).toBe(true);
    expect(store.getTicket(bounded)?.reviewRounds).toBe(0);
  });

  test("refusals leave review_rounds unchanged", async () => {
    const ticketId = newFeatureTicket(2);
    const other = newFeatureTicket(2);
    const call = startSession(ticketId);
    askAnswered(other, "q-other");
    store.addComment(ticketId, "agent", "Question en attente", "q-pending");
    askAnswered(ticketId, "q-used");
    expect((await call("grant_review_passes", { questionId: "q-used", count: 1 })).ok).toBe(true);
    expect(store.getTicket(ticketId)?.reviewRounds).toBe(1);

    const refusals = [
      { questionId: "q-unknown", count: 1 },
      { questionId: "q-other", count: 1 },
      { questionId: "q-pending", count: 1 },
      { questionId: "q-used", count: 1 },
      { questionId: "q-used", count: 0 },
      { questionId: "q-used", count: 1.5 },
      { questionId: "q-used", count: 11 },
    ];
    for (const args of refusals) {
      const result = await call("grant_review_passes", args);
      expect(result.ok).toBe(false);
      expect(store.getTicket(ticketId)?.reviewRounds).toBe(1);
    }
  });

  test("a non-feature ticket is refused", async () => {
    const ask = store.createAsk({
      title: "Question",
      description: "Une question.",
      project: PROJECT,
      model: null,
      effort: null,
      orchestrator: "claude",
      codexModel: null,
      codexEffort: null,
    });
    store.updateTicket(ask.id, { reviewRounds: 2 });
    const call = startSession(ask.id);
    askAnswered(ask.id, "q-ask");

    const result = await call("grant_review_passes", { questionId: "q-ask", count: 1 });

    expect(result.ok).toBe(false);
    expect(store.getTicket(ask.id)?.reviewRounds).toBe(2);
  });
});
