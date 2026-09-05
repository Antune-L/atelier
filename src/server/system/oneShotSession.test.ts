import { describe, expect, test } from "bun:test";

import type { AgentProvider, AgentSessionEvent, AgentSessionOptions } from "./agentSession.ts";
import { runOneShotSession } from "./oneShotSession.ts";

const options = { provider: "codex", cwd: "/tmp", model: "gpt-5.6-terra", effort: "medium", permissionMode: "dontAsk" } satisfies
  Omit<AgentSessionOptions, "onEvent" | "onToolCall" | "ticketId" | "slotId">;

function fixture(events: AgentSessionEvent[]) {
  let closed = 0;
  let captured: AgentSessionOptions | undefined;
  const provider: AgentProvider = {
    name: "test",
    createSession(config) {
      captured = config;
      return {
        ticketId: config.ticketId,
        send: () => {
          for (const event of events) config.onEvent(event);
          return "test-message";
        },
        interrupt: async () => {},
        close: async () => { closed += 1; },
      };
    },
  };
  return { provider, closed: () => closed, captured: () => captured };
}

describe("one-shot provider sessions", () => {
  test("collects streamed text and closes an isolated read-only session", async () => {
    const run = fixture([
      { type: "assistant_text", text: "Hello " },
      { type: "assistant_text", text: "world" },
      { type: "turn_end", ok: true, subtype: "success", sessionId: "s", usageByModel: {} },
    ]);
    expect(await runOneShotSession(run.provider, options, "prompt", 100)).toBe("Hello world");
    expect(run.captured()?.readOnly).toBe(true);
    expect(run.captured()?.disableWorkerTools).toBe(true);
    expect(run.closed()).toBe(1);
  });

  test("provider errors preserve failure and release the session", async () => {
    const run = fixture([{ type: "error", message: "Connexion nécessaire" }]);
    await expect(runOneShotSession(run.provider, options, "prompt", 100)).rejects.toThrow("Connexion nécessaire");
    expect(run.closed()).toBe(1);
  });

  test("a silent provider times out and closes", async () => {
    const run = fixture([]);
    await expect(runOneShotSession(run.provider, options, "prompt", 5)).rejects.toThrow("Timeout");
    expect(run.closed()).toBe(1);
  });

  test("timeout interrupts an active turn before waiting for its final usage", async () => {
    const stopped = Promise.withResolvers<void>();
    let interrupted = false;
    let drained = false;
    const provider: AgentProvider = {
      name: "waiting-turn",
      createSession: (config) => ({
        ticketId: config.ticketId,
        send: () => "message",
        interrupt: async () => { interrupted = true; stopped.resolve(); },
        close: async () => { await stopped.promise; drained = true; },
      }),
    };
    await expect(runOneShotSession(provider, options, "prompt", 5)).rejects.toThrow("Timeout");
    expect(interrupted).toBe(true);
    expect(drained).toBe(true);
  }, 1_000);
});

test("one-shot results reconcile final snapshots instead of repeating the streamed prefix", async () => {
  const run = fixture([
    { type: "assistant_text", text: "Hello ", stream: { itemId: "one", mode: "delta" } },
    { type: "assistant_text", text: "Hello world", stream: { itemId: "one", mode: "snapshot" } },
    { type: "assistant_text", text: "!", stream: { itemId: "two", mode: "snapshot" } },
    { type: "turn_end", ok: true, subtype: "success", sessionId: "s", usageByModel: {} },
  ]);
  expect(await runOneShotSession(run.provider, options, "prompt", 100)).toBe("Hello world!");
});


test("one-shot timeout disposes even when interrupt and graceful close never resolve", async () => {
  let disposed = false;
  const provider: AgentProvider = { name: "hung", createSession: (config) => ({
    ticketId: config.ticketId, send: () => "id", interrupt: () => new Promise(() => {}), close: () => new Promise(() => {}), dispose: () => { disposed = true; },
  }) };
  await expect(runOneShotSession(provider, options, "prompt", 5, undefined, 5)).rejects.toThrow("Timeout");
  expect(disposed).toBe(true);
});
