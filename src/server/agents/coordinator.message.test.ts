import { expect, test } from "bun:test";

import { FEASIBILITY_AUTO_RELAUNCH_MAX } from "../../shared/constants.ts";
import { initProjectRegistry } from "../config.ts";
import { createDatabase } from "../db/schema.ts";
import { Store } from "../db/store.ts";
import { ClientHub } from "../hub.ts";
import { TicketLifecycle } from "../lifecycle.ts";
import { Notifier } from "../notifier.ts";
import type { AgentSessionHandle, AgentSessionOptions } from "../system/agentSession.ts";
import { FakeSystemAdapter } from "../system/fake.ts";

import { AgentCoordinator } from "./coordinator.ts";
import { DelegationManager } from "./delegationManager.ts";
import { FeasibilityBatchManager } from "./feasibilityManager.ts";
import { SessionHub } from "./sessionHub.ts";
import { SlotManager } from "./slotManager.ts";
import { SplitManager } from "./splitManager.ts";
import { TriageManager } from "./triageManager.ts";

class AckSystem extends FakeSystemAdapter {
  readonly sessions: AgentSessionOptions[] = [];

  override startAgentSession(opts: AgentSessionOptions): AgentSessionHandle {
    this.sessions.push(opts);
    return {
      ticketId: opts.ticketId,
      send: (_content, messageId = crypto.randomUUID()) => {
        opts.onEvent({ type: "message_status", messageId, status: "received", turnId: null });
        opts.onEvent({ type: "message_status", messageId, status: "accepted", turnId: "turn-1" });
        return messageId;
      },
      interrupt: async () => undefined,
      close: async () => undefined,
    };
  }
}

function setup(): {
  store: Store;
  system: AckSystem;
  sessionHub: SessionHub;
  feasibility: FeasibilityBatchManager;
  close(): Promise<void>;
} {
  const db = createDatabase(":memory:");
  const store = new Store(db);
  store.createProject("coordinator-project", {
    label: "Coordinator Project",
    repoPath: "/tmp/coordinator-project",
    baseBranch: "main",
    commitTimeoutMs: 60_000,
    defaultAutoMerge: false,
    defaultAddScreenshots: false,
  });
  initProjectRegistry(store);
  const system = new AckSystem();
  const hub = new ClientHub(store);
  const sessionHub = new SessionHub(system);
  const notifier = new Notifier(hub);
  const lifecycle = new TicketLifecycle(store, hub, notifier);
  const triage = new TriageManager(store, system, sessionHub, hub, notifier);
  const feasibility = new FeasibilityBatchManager(store, system, sessionHub, hub, notifier);
  const split = new SplitManager(store, system, sessionHub);
  const slots = new SlotManager(store, system, hub, sessionHub, notifier, lifecycle, { projectRoot: "/tmp" });
  const delegation = new DelegationManager(store, system, sessionHub, hub);
  new AgentCoordinator(
    store,
    hub,
    sessionHub,
    notifier,
    lifecycle,
    slots,
    triage,
    feasibility,
    split,
    delegation,
  );
  return {
    store,
    system,
    sessionHub,
    feasibility,
    close: async () => {
      sessionHub.disconnectAll();
      await sessionHub.drainClosingSessions();
      db.close();
    },
  };
}

async function startFeasibilityTicket(
  store: Store,
  system: AckSystem,
  feasibility: FeasibilityBatchManager,
  ticketId: string,
): Promise<string> {
  Object.defineProperty(system, "dryRun", { value: false });
  const ticket = store.createTicket({
    title: ticketId,
    description: "Analyse de faisabilité",
    externalUrl: null,
    project: "coordinator-project",
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
  await feasibility.start([ticket.id], "coordinator-project");
  await Bun.sleep(0);
  return ticket.id;
}

const ACTION_SESSION = {
  ticketId: "action-session",
  slotId: -1,
  cwd: "/tmp",
  provider: "codex",
  model: "gpt-5.6-terra",
  effort: "medium",
  role: "orchestrator",
  ownerType: "action",
  ownerId: "action-1",
  permissionMode: "dontAsk",
} satisfies Parameters<SessionHub["start"]>[0];

test("coordinator persists queued, received and accepted without conflating semantic application", async () => {
  const { store, system, sessionHub, close } = setup();
  try {
    sessionHub.start(ACTION_SESSION);
    expect(sessionHub.sendEvent(ACTION_SESSION.ticketId, { type: "user_comment", body: "Nouveau contexte" })).toBe(true);

    const messages = store.listAgentMessages("action", ACTION_SESSION.ownerId);
    expect(messages).toHaveLength(1);
    expect(messages[0]).toMatchObject({
      generationId: store.listExecutionRuns("action", ACTION_SESSION.ownerId)[0]?.generationId,
      channel: "user_comment",
      status: "accepted",
      turnId: "turn-1",
    });
    expect(sessionHub.getTranscript(ACTION_SESSION.ticketId)).toContain("application sémantique non garantie");

    const running = system.sessions[0];
    if (!running) throw new Error("session missing");
    running.onEvent({
      type: "turn_end",
      ok: true,
      subtype: "success",
      sessionId: "thread-1",
      usageByModel: {
        "gpt-5.6-terra": {
          inputTokens: 12,
          outputTokens: 4,
          cacheReadTokens: 2,
          cacheCreationTokens: 0,
          costUsd: null,
        },
      },
    });
    expect(store.listExecutionRuns("action", ACTION_SESSION.ownerId)[0]?.usageByModel).toMatchObject({
      "gpt-5.6-terra": { inputTokens: 12, outputTokens: 4 },
    });
  } finally {
    await close();
  }
});

test("a restarted owner replays queued or received messages with their stable id", async () => {
  const { store, sessionHub, close } = setup();
  try {
    store.startExecution({
      id: "old-generation",
      ownerType: "action",
      ownerId: ACTION_SESSION.ownerId,
      generationId: "old-generation",
      sessionId: "old-thread",
      role: "orchestrator",
      orchestrator: "codex",
      effectiveModel: "gpt-5.6-terra",
      effectiveEffort: "medium",
    });
    store.enqueueAgentMessage({
      id: "stable-message-id",
      ownerType: "action",
      ownerId: ACTION_SESSION.ownerId,
      generationId: "old-generation",
      sessionId: "old-thread",
      channel: "answer",
      content: "Réponse durable",
    });
    store.markAgentMessageReceived({ id: "stable-message-id", sessionId: "old-thread" });

    sessionHub.start(ACTION_SESSION);

    expect(store.listPendingAgentMessages("action", ACTION_SESSION.ownerId)).toEqual([]);
    expect(store.listAgentMessages("action", ACTION_SESSION.ownerId)[0]).toMatchObject({
      id: "stable-message-id",
      status: "accepted",
      turnId: "turn-1",
    });
  } finally {
    await close();
  }
});

test("a feasibility fail tool settles the batch after the bounded retry", async () => {
  const { store, system, feasibility, close } = setup();
  try {
    const ticketId = await startFeasibilityTicket(store, system, feasibility, "feasibility-tool-failure");

    for (let attempt = 0; attempt <= FEASIBILITY_AUTO_RELAUNCH_MAX; attempt += 1) {
      const session = system.sessions[attempt];
      if (!session) throw new Error(`feasibility session ${attempt} missing`);
      const result = await session.onToolCall("fail", { reason: "scout indisponible", findings: "" });
      expect(result.ok).toBe(true);
      await Bun.sleep(0);
    }

    expect(feasibility.batchKeyForTicket(ticketId)).toBeNull();
    expect(store.getTicket(ticketId)).toMatchObject({
      triageStatus: "failed",
      triageReport: "scout indisponible",
    });
  } finally {
    await feasibility.teardownAll();
    await close();
  }
});

test("a feasibility turn ending without a verdict settles after the bounded retry", async () => {
  const { store, system, feasibility, close } = setup();
  try {
    const ticketId = await startFeasibilityTicket(store, system, feasibility, "feasibility-empty-turn");

    for (let attempt = 0; attempt <= FEASIBILITY_AUTO_RELAUNCH_MAX; attempt += 1) {
      const session = system.sessions[attempt];
      if (!session) throw new Error(`feasibility session ${attempt} missing`);
      session.onEvent({
        type: "turn_end",
        ok: true,
        subtype: "success",
        sessionId: `feasibility-thread-${attempt}`,
        usageByModel: {},
      });
      await Bun.sleep(0);
    }

    expect(feasibility.batchKeyForTicket(ticketId)).toBeNull();
    expect(store.getTicket(ticketId)?.triageStatus).toBe("failed");
  } finally {
    await feasibility.teardownAll();
    await close();
  }
});

test("an obsolete batch failure preserves a newer direct triage verdict", async () => {
  const { store, system, feasibility, close } = setup();
  try {
    const ticketId = await startFeasibilityTicket(store, system, feasibility, "feasibility-fresh-verdict");
    const session = system.sessions[0];
    if (!session) throw new Error("feasibility session missing");
    store.updateTicket(ticketId, {
      triageStatus: "done",
      triageVerdict: "implementable",
      triageReport: "verdict direct plus récent",
    });

    const result = await session.onToolCall("fail", { reason: "ancien batch en erreur", findings: "" });
    expect(result.ok).toBe(true);
    await Bun.sleep(0);

    expect(system.sessions).toHaveLength(1);
    expect(feasibility.batchKeyForTicket(ticketId)).toBeNull();
    expect(store.getTicket(ticketId)).toMatchObject({
      triageStatus: "done",
      triageVerdict: "implementable",
      triageReport: "verdict direct plus récent",
    });
  } finally {
    await feasibility.teardownAll();
    await close();
  }
});

test("an obsolete batch result preserves a newer direct triage verdict", async () => {
  const { store, system, feasibility, close } = setup();
  try {
    const ticketId = await startFeasibilityTicket(store, system, feasibility, "feasibility-stale-result");
    const session = system.sessions[0];
    if (!session) throw new Error("feasibility session missing");
    store.updateTicket(ticketId, {
      triageStatus: "done",
      triageVerdict: "implementable",
      triageReport: "verdict direct plus récent",
    });

    await feasibility.complete(session.ticketId, [{
      ticketId,
      verdict: "needs_rework",
      summary: "ancien résultat",
      reasons: ["périmé"],
      questions: [],
      files: [],
      suggestedModel: null,
      suggestedEffort: null,
      solutions: [],
    }]);

    expect(store.getTicket(ticketId)).toMatchObject({
      triageStatus: "done",
      triageVerdict: "implementable",
      triageReport: "verdict direct plus récent",
    });
  } finally {
    await feasibility.teardownAll();
    await close();
  }
});
