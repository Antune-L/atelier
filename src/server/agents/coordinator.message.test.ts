import { expect, test } from "bun:test";

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

function setup(): { store: Store; system: AckSystem; sessionHub: SessionHub; close(): Promise<void> } {
  const db = createDatabase(":memory:");
  const store = new Store(db);
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
    close: async () => {
      sessionHub.disconnectAll();
      await sessionHub.drainClosingSessions();
      db.close();
    },
  };
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
