import { expect, test } from "bun:test";

import { initProjectRegistry } from "../config.ts";
import { createDatabase } from "../db/schema.ts";
import { Store } from "../db/store.ts";
import { ClientHub } from "../hub.ts";
import { TicketLifecycle } from "../lifecycle.ts";
import { Notifier } from "../notifier.ts";
import type { AgentSessionHandle, AgentSessionOptions } from "../system/agentSession.ts";
import { FakeSystemAdapter } from "../system/fake.ts";
import { makeTicket } from "../testing/fixtures.ts";

import { SessionHub } from "./sessionHub.ts";
import { SlotManager } from "./slotManager.ts";

class RelaunchSystem extends FakeSystemAdapter {
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

test("relaunch preserves requested default tier when runtime reported fast", async () => {
  const db = createDatabase(":memory:");
  const store = new Store(db);
  store.createProject("test-proj", {
    label: "Test",
    repoPath: "/tmp/repo",
    baseBranch: "main",
    commitTimeoutMs: 60_000,
    defaultAutoMerge: false,
    defaultAddScreenshots: false,
  });
  initProjectRegistry(store);
  const ticket = store.createTicket(makeTicket({
    orchestrator: "codex",
    codexModel: "gpt-5.6-sol",
    codexEffort: "medium",
    codexFast: false,
    codexImplementerModel: "gpt-5.6-terra",
    codexImplementerEffort: "low",
    codexImplementerFast: false,
  }));
  store.updateTicket(ticket.id, { slotId: 1 });
  store.updateSlot(1, { ticketId: ticket.id, status: "interrupted" });
  store.startExecution({
    id: "previous",
    generationId: "previous",
    ownerType: "ticket",
    ownerId: ticket.id,
    sessionId: null,
    role: "orchestrator",
    orchestrator: "codex",
    effectiveModel: "gpt-5.6-sol",
    effectiveEffort: "medium",
    codexFast: false,
    delegateProvider: "codex",
    delegateEffectiveModel: "gpt-5.6-sol",
    delegateEffectiveEffort: "high",
    delegateCodexFast: true,
  });
  store.attachExecutionSession({
    generationId: "previous",
    sessionId: "thread-1",
    configuredServiceTier: "fast",
  });

  const system = new RelaunchSystem();
  const hub = new ClientHub(store);
  const sessionHub = new SessionHub(system);
  const notifier = new Notifier(hub);
  const lifecycle = new TicketLifecycle(store, hub, notifier);
  const slots = new SlotManager(store, system, hub, sessionHub, notifier, lifecycle, { projectRoot: "/tmp" });

  try {
    expect(await slots.relaunch(ticket.id)).toBe(true);
    expect(system.sessions).toHaveLength(1);
    expect(system.sessions[0]?.serviceTier).toBe("default");
    expect(system.sessions[0]?.agents?.implementer).toMatchObject({
      model: "gpt-5.6-sol",
      effort: "high",
      serviceTier: "fast",
    });
  } finally {
    sessionHub.disconnectAll();
    await sessionHub.drainClosingSessions();
    db.close();
  }
});

test("relaunch restores a Claude parent's captured Codex delegate after ticket edits", async () => {
  const db = createDatabase(":memory:");
  const store = new Store(db);
  store.createProject("test-proj", {
    label: "Test",
    repoPath: "/tmp/repo",
    baseBranch: "main",
    commitTimeoutMs: 60_000,
    defaultAutoMerge: false,
    defaultAddScreenshots: false,
  });
  initProjectRegistry(store);
  const ticket = store.createTicket(makeTicket({
    orchestrator: "codex",
    implementer: "claude",
    codexImplementerModel: "gpt-5.6-terra",
    codexImplementerEffort: "low",
    codexImplementerFast: false,
  }));
  store.updateTicket(ticket.id, { slotId: 1 });
  store.updateSlot(1, { ticketId: ticket.id, status: "interrupted" });
  store.startExecution({
    id: "previous-claude",
    generationId: "previous-claude",
    ownerType: "ticket",
    ownerId: ticket.id,
    sessionId: null,
    role: "orchestrator",
    orchestrator: "claude",
    effectiveModel: "opus",
    effectiveEffort: "medium",
    codexFast: false,
    delegateProvider: "codex",
    delegateEffectiveModel: "gpt-5.6-sol",
    delegateEffectiveEffort: "high",
    delegateCodexFast: true,
  });
  store.attachExecutionSession({ generationId: "previous-claude", sessionId: "thread-claude" });

  const system = new RelaunchSystem();
  const hub = new ClientHub(store);
  const sessionHub = new SessionHub(system);
  const notifier = new Notifier(hub);
  const lifecycle = new TicketLifecycle(store, hub, notifier);
  const slots = new SlotManager(store, system, hub, sessionHub, notifier, lifecycle, { projectRoot: "/tmp" });

  try {
    expect(await slots.relaunch(ticket.id)).toBe(true);
    expect(system.sessions[0]).toMatchObject({ provider: "claude", model: "opus", effort: "medium" });
    expect(sessionHub.getExecutionConfig(ticket.id)).toMatchObject({
      delegateProvider: "codex",
      delegateModel: "gpt-5.6-sol",
      delegateEffort: "high",
      delegateServiceTier: "fast",
    });
  } finally {
    sessionHub.disconnectAll();
    await sessionHub.drainClosingSessions();
    db.close();
  }
});

test("abandon moves the card even when its slot was already handed to another ticket", async () => {
  const db = createDatabase(":memory:");
  const store = new Store(db);
  store.createProject("test-proj", {
    label: "Test",
    repoPath: "/tmp/repo",
    baseBranch: "main",
    commitTimeoutMs: 60_000,
    defaultAutoMerge: false,
    defaultAddScreenshots: false,
  });
  initProjectRegistry(store);
  const stale = store.createTicket(makeTicket({}));
  const owner = store.createTicket(makeTicket({}));
  store.updateTicket(stale.id, { slotId: 1 });
  store.updateSlot(1, { ticketId: owner.id, status: "busy" });

  const system = new RelaunchSystem();
  const hub = new ClientHub(store);
  const sessionHub = new SessionHub(system);
  const notifier = new Notifier(hub);
  const lifecycle = new TicketLifecycle(store, hub, notifier);
  const slots = new SlotManager(store, system, hub, sessionHub, notifier, lifecycle, { projectRoot: "/tmp" });

  try {
    await slots.abandonTicket(stale.id);
    expect(store.getTicket(stale.id)?.column).toBe("abandoned");
    expect(store.getTicket(stale.id)?.slotId).toBeNull();
    expect(store.getSlot(1)?.ticketId).toBe(owner.id);
  } finally {
    sessionHub.disconnectAll();
    await sessionHub.drainClosingSessions();
    db.close();
  }
});
