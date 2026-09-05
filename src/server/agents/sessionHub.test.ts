import { describe, expect, test } from "bun:test";

import type { WorkerToolName } from "../../shared/protocol.ts";
import type { AgentSessionHandle, AgentSessionOptions, AgentTurnUsage } from "../system/agentSession.ts";
import { FakeSystemAdapter } from "../system/fake.ts";

import type {
  SessionExecutionFinish,
  SessionExecutionUsage,
  SessionMessageContext,
  SessionMessageStatus,
  SessionStartConfig,
} from "./sessionHub.ts";
import { SessionHub } from "./sessionHub.ts";

interface RecordedSession {
  opts: AgentSessionOptions;
  sent: string[];
  messageIds: string[];
  resolveClose(): void;
  disposed: boolean;
}

class RecordingSystem extends FakeSystemAdapter {
  readonly sessions: RecordedSession[] = [];

  override startAgentSession(opts: AgentSessionOptions): AgentSessionHandle {
    let resolveClose = (): void => undefined;
    const closePromise = new Promise<void>((resolve) => {
      resolveClose = resolve;
    });
    const record: RecordedSession = { opts, sent: [], messageIds: [], resolveClose, disposed: false };
    this.sessions.push(record);
    return {
      ticketId: opts.ticketId,
      send: (content, messageId) => {
        const resolvedMessageId = messageId ?? "fixture-message";
        record.sent.push(content);
        record.messageIds.push(resolvedMessageId);
        return resolvedMessageId;
      },
      interrupt: async () => undefined,
      close: async () => closePromise,
      dispose: () => { record.disposed = true; resolveClose(); },
    };
  }
}

const USAGE: Record<string, AgentTurnUsage> = {
  "gpt-5.6-terra": {
    inputTokens: 10,
    outputTokens: 5,
    cacheReadTokens: 1,
    cacheCreationTokens: 0,
    costUsd: null,
  },
};

function sessionConfig(): SessionStartConfig {
  return {
    ticketId: "ticket-1",
    slotId: 1,
    cwd: "/tmp/worktree",
    provider: "codex",
    model: "gpt-5.6-terra",
    effort: "medium",
    role: "orchestrator",
    permissionMode: "dontAsk",
  };
}

describe("SessionHub generations", () => {
  test("tracks received and accepted separately without claiming semantic application", () => {
    const system = new RecordingSystem();
    const hub = new SessionHub(system);
    const queued: SessionMessageContext[] = [];
    const statuses: SessionMessageStatus[] = [];
    hub.setHandlers({
      onToolCall: async () => ({ ok: true, result: "ok" }),
      onStop: () => undefined,
      onActivity: () => undefined,
      onMessageQueued: (context) => queued.push(context),
      onMessageStatus: (context) => statuses.push(context),
    });
    hub.start(sessionConfig());
    const session = system.sessions[0];
    if (!session) throw new Error("session missing");

    expect(hub.sendEvent("ticket-1", { type: "user_comment", body: "Prends aussi ce cas en compte" })).toBe(true);
    const messageId = session.messageIds[0];
    if (!messageId) throw new Error("message id missing");
    expect(queued[0]).toMatchObject({ messageId, generation: 1, channel: "user_comment" });

    session.opts.onEvent({ type: "message_status", messageId, status: "received", turnId: null });
    session.opts.onEvent({ type: "message_status", messageId, status: "accepted", turnId: "turn-7" });

    expect(statuses.map(({ status }) => status)).toEqual(["received", "accepted"]);
    expect(statuses[1]).toMatchObject({ generationId: queued[0]?.generationId, turnId: "turn-7" });
    expect(hub.getTranscript("ticket-1")).toContain("message user_comment");
    expect(hub.getTranscript("ticket-1")).toContain("application sémantique non garantie");
    hub.disconnect("ticket-1");
    session.resolveClose();
  });

  test("replays only supplied pending messages with their original client id", () => {
    const system = new RecordingSystem();
    const hub = new SessionHub(system);
    const queued: SessionMessageContext[] = [];
    hub.setHandlers({
      onToolCall: async () => ({ ok: true, result: "ok" }),
      onStop: () => undefined,
      onActivity: () => undefined,
      onMessageQueued: (context) => queued.push(context),
      getPendingMessages: () => [
        {
          messageId: "persisted-contract",
          generationId: "old-generation",
          channel: "ticket",
          content: "Contrat durable",
        },
        {
          messageId: "persisted-message",
          generationId: "old-generation",
          channel: "answer",
          content: "Réponse persistée",
        },
      ],
    });

    hub.start(sessionConfig());
    const session = system.sessions[0];
    if (!session) throw new Error("session missing");
    expect(session.sent).toEqual(["Contrat durable", "Réponse persistée"]);
    expect(session.messageIds).toEqual(["persisted-contract", "persisted-message"]);
    expect(hub.sendEvent("ticket-1", { type: "ticket", payload: "Contrat durable" })).toBe(true);
    expect(session.sent).toHaveLength(2);
    expect(queued).toEqual([]);
    hub.disconnect("ticket-1");
    session.resolveClose();
  });

  test("does not create a provider when immutable run persistence fails", () => {
    const system = new RecordingSystem();
    const hub = new SessionHub(system);
    hub.setHandlers({
      onToolCall: async () => ({ ok: true, result: "ok" }),
      onStop: () => undefined,
      onActivity: () => undefined,
      onExecutionStart: () => {
        throw new Error("persistence unavailable");
      },
    });

    expect(() => hub.start(sessionConfig())).toThrow("persistence unavailable");
    expect(system.sessions).toHaveLength(0);
    expect(hub.isConnected("ticket-1")).toBe(false);
  });

  test("rejects stale tools and callbacks while retaining usage flushed during close", async () => {
    const system = new RecordingSystem();
    const hub = new SessionHub(system);
    const finished: SessionExecutionFinish[] = [];
    const checkpoints: SessionExecutionUsage[] = [];
    const startedGenerations: string[] = [];
    const toolCalls: WorkerToolName[] = [];
    hub.setHandlers({
      onToolCall: async (call) => {
        toolCalls.push(call.name);
        return { ok: true, result: "ok" };
      },
      onStop: () => undefined,
      onActivity: () => undefined,
      onExecutionStart: (context) => startedGenerations.push(context.generationId),
      onExecutionUsage: (context) => checkpoints.push(context),
      onExecutionFinish: (context) => finished.push(context),
    });

    hub.start(sessionConfig());
    const first = system.sessions[0];
    if (!first) throw new Error("first session missing");
    hub.start(sessionConfig());
    const second = system.sessions[1];
    if (!second) throw new Error("second session missing");

    expect(await first.opts.onToolCall("done", { pr_url: "https://example.com/pr/1" })).toEqual({
      ok: false,
      result: "génération de session périmée",
    });
    expect(toolCalls).toEqual([]);

    first.opts.onEvent({ type: "turn_end", ok: true, subtype: "success", sessionId: "old", usageByModel: USAGE });
    expect(checkpoints[0]?.generationId).toBe(startedGenerations[0]);
    expect(checkpoints[0]?.generationId).not.toBe(startedGenerations[1]);
    expect(checkpoints[0]?.usageByModel).toEqual(USAGE);
    first.resolveClose();
    await Bun.sleep(1);
    expect(finished[0]?.status).toBe("cancelled");
    expect(finished[0]?.usageByModel).toEqual(USAGE);

    second.resolveClose();
    hub.disconnect("ticket-1");
  });

  test("persists init immediately and refuses queued turns after close", () => {
    const system = new RecordingSystem();
    const hub = new SessionHub(system);
    const initialized: string[] = [];
    hub.setHandlers({
      onToolCall: async () => ({ ok: true, result: "ok" }),
      onStop: () => undefined,
      onActivity: () => undefined,
      onExecutionInit: (context) => {
        if (context.sessionId) initialized.push(context.sessionId);
      },
    });
    hub.start(sessionConfig());
    const session = system.sessions[0];
    if (!session) throw new Error("session missing");
    session.opts.onEvent({ type: "init", sessionId: "thread-1" });
    expect(initialized).toEqual(["thread-1"]);

    hub.disconnect("ticket-1");
    expect(hub.sendEvent("ticket-1", { type: "nudge", message: "late" })).toBe(false);
    expect(session.sent).toEqual([]);
    session.resolveClose();
  });
});


test("terminal session closure is bounded and records rejected close without an orphan", async () => {
  const system = new RecordingSystem();
  const hub = new SessionHub(system, 5);
  const finished: SessionExecutionFinish[] = [];
  hub.setHandlers({ onToolCall: async () => ({ ok: true, result: "ok" }), onStop: () => {}, onActivity: () => {}, onExecutionFinish: (event) => finished.push(event) });
  hub.start(sessionConfig());
  hub.disconnect("ticket-1", "failed");
  hub.disconnect("ticket-1", "failed");
  await Bun.sleep(15);
  expect(finished).toHaveLength(1);
  expect(finished[0]).toMatchObject({ status: "failed", error: "Délai de fermeture de session dépassé" });
  expect(system.sessions[0]?.disposed).toBe(true);
  await Bun.sleep(1);
  expect(finished).toHaveLength(1);
});

test("startup replay failure joins bounded cleanup before execution finalization", async () => {
  const system = new RecordingSystem();
  const hub = new SessionHub(system, 5);
  const finished: SessionExecutionFinish[] = [];
  hub.setHandlers({
    onToolCall: async () => ({ ok: true, result: "ok" }),
    onStop: () => undefined,
    onActivity: () => undefined,
    getPendingMessages: () => { throw new Error("replay unavailable"); },
    onExecutionFinish: (event) => finished.push(event),
  });
  expect(() => hub.start(sessionConfig())).toThrow("replay unavailable");
  await hub.drainClosingSessions();
  expect(system.sessions[0]?.disposed).toBe(true);
  expect(finished).toHaveLength(1);
  expect(finished[0]).toMatchObject({ status: "failed", error: "replay unavailable" });
});
