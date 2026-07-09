import type { Database } from "bun:sqlite";

import { afterAll, beforeAll, describe, expect, test } from "bun:test";

import { DELEGATION_SLOT_ID } from "../../shared/constants.ts";
import type { Ticket } from "../../shared/schemas.ts";
import { initProjectRegistry } from "../config.ts";
import { createDatabase } from "../db/schema.ts";
import { Store } from "../db/store.ts";
import { ClientHub } from "../hub.ts";
import type { AgentSessionHandle, AgentSessionOptions, AgentTurnUsage } from "../system/agentSession.ts";
import { FakeSystemAdapter } from "../system/fake.ts";
import { FIXTURE_PROJECT_KEY } from "../testing/fixtures.ts";
import { removeDbFiles, tmpDbPath } from "../testing/tmpDb.ts";

import { DelegationManager } from "./delegationManager.ts";
import { SessionHub } from "./sessionHub.ts";

interface RecordedSession {
  opts: AgentSessionOptions;
  sent: string[];
  closed: boolean;
  interrupted: boolean;
}

/** Fake adapter that records every spawned session and exposes its onEvent for test-driven streams. */
class RecordingSystemAdapter extends FakeSystemAdapter {
  readonly sessions: RecordedSession[] = [];

  override startAgentSession(opts: AgentSessionOptions): AgentSessionHandle {
    const record: RecordedSession = { opts, sent: [], closed: false, interrupted: false };
    this.sessions.push(record);
    return {
      ticketId: opts.ticketId,
      send: (content) => record.sent.push(content),
      interrupt: async () => {
        record.interrupted = true;
      },
      close: async () => {
        record.closed = true;
      },
    };
  }
}

const CHILD_USAGE: Record<string, AgentTurnUsage> = {
  "gpt-5.4": { inputTokens: 100, outputTokens: 50, cacheReadTokens: 10, cacheCreationTokens: 0, costUsd: 0 },
};

/** The settle path defers one tick to capture trailing error details; wait past it. */
const SETTLE_WAIT_MS = 120;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

let dbPath = "";
let db: Database;
let store: Store;

beforeAll(() => {
  dbPath = tmpDbPath();
  db = createDatabase(dbPath);
  store = new Store(db);
  store.createProject(FIXTURE_PROJECT_KEY, {
    label: "Test Project",
    repoPath: "/tmp/repo",
    baseBranch: "main",
    commitTimeoutMs: 60_000,
    defaultAutoMerge: false,
    defaultAddScreenshots: false,
  });
  initProjectRegistry(store);
});

afterAll(() => {
  db.close();
  removeDbFiles(dbPath);
});

function setup(): { system: RecordingSystemAdapter; sessionHub: SessionHub; delegation: DelegationManager } {
  const system = new RecordingSystemAdapter();
  const sessionHub = new SessionHub(system);
  const delegation = new DelegationManager(store, system, sessionHub, new ClientHub(store));
  // Mirrors the index.ts wiring: any parent-session teardown kills its delegated child.
  sessionHub.onDisconnect((ticketId) => delegation.stop(ticketId));
  return { system, sessionHub, delegation };
}

function newDelegatedTicket(): Ticket {
  return store.createTicket({
    title: "Ticket délégué",
    description: "Une feature implémentée par Codex sous orchestrateur Claude.",
    externalUrl: null,
    project: FIXTURE_PROJECT_KEY,
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
    implementer: "codex",
    orchestrator: "claude",
    codexModel: "gpt-5.4",
    codexEffort: "high",
  });
}

/** Start a parent Claude session for the ticket so implementation_done has a live target. */
function startParentSession(sessionHub: SessionHub, ticketId: string): void {
  sessionHub.start({
    ticketId,
    slotId: 3,
    cwd: "/tmp/slot-3",
    provider: "claude",
    model: "opus",
    effort: null,
    permissionMode: "dontAsk",
  });
}

describe("DelegationManager.start", () => {
  test("spawns a bare Codex child in the slot worktree with the ticket's codex knobs and the plan", () => {
    const { system, delegation } = setup();
    const ticket = newDelegatedTicket();

    const outcome = delegation.start(ticket, 3, "PLAN: implémenter la feature X");

    expect(outcome.ok).toBe(true);
    expect(delegation.isActive(ticket.id)).toBe(true);
    expect(system.sessions).toHaveLength(1);
    const child = system.sessions[0];
    if (!child) throw new Error("child session missing");
    expect(child.opts.provider).toBe("codex");
    expect(child.opts.slotId).toBe(DELEGATION_SLOT_ID);
    expect(child.opts.disableWorkerTools).toBe(true);
    expect(child.opts.cwd.endsWith("slot-3")).toBe(true);
    expect(child.opts.model).toBe("gpt-5.4");
    expect(child.opts.effort).toBe("high");
    expect(child.sent).toHaveLength(1);
    expect(child.sent[0]).toContain("PLAN: implémenter la feature X");
    expect(child.sent[0]).toContain("Ne commit JAMAIS");
  });

  test("refuses a second delegation while one is active", () => {
    const { delegation } = setup();
    const ticket = newDelegatedTicket();

    expect(delegation.start(ticket, 3, "plan").ok).toBe(true);
    const second = delegation.start(ticket, 3, "plan bis");
    expect(second.ok).toBe(false);
    expect(second.result).toContain("déjà en cours");
  });
});

describe("DelegationManager — settlement", () => {
  test("child turn_end ok → implementation_done (with summary) sent to the parent, usage summed on the ticket", async () => {
    const { system, sessionHub, delegation } = setup();
    const ticket = newDelegatedTicket();
    startParentSession(sessionHub, ticket.id);
    delegation.start(ticket, 3, "plan");
    const [parent, child] = system.sessions;
    if (!parent || !child) throw new Error("sessions missing");

    child.opts.onEvent({ type: "init", sessionId: "codex-thread-1" });
    child.opts.onEvent({ type: "assistant_text", text: "Résumé final : feature X implémentée." });
    child.opts.onEvent({ type: "turn_end", ok: true, subtype: "success", sessionId: "codex-thread-1", usageByModel: CHILD_USAGE });
    await sleep(SETTLE_WAIT_MS);

    expect(delegation.isActive(ticket.id)).toBe(false);
    expect(child.closed).toBe(true);
    const doneEvent = parent.sent.find((m) => m.includes("Implémentation déléguée terminée"));
    expect(doneEvent).toBeDefined();
    expect(doneEvent).toContain("Résumé final : feature X implémentée.");
    const usage = store.getTicket(ticket.id)?.sessionUsage["codex-thread-1"]?.["gpt-5.4"];
    expect(usage?.input_tokens).toBe(100);
    expect(usage?.output_tokens).toBe(50);
    expect(usage?.cache_read_input_tokens).toBe(10);
  });

  test("child turn_end error → failure event carrying the trailing error detail", async () => {
    const { system, sessionHub, delegation } = setup();
    const ticket = newDelegatedTicket();
    startParentSession(sessionHub, ticket.id);
    delegation.start(ticket, 3, "plan");
    const [parent, child] = system.sessions;
    if (!parent || !child) throw new Error("sessions missing");

    // codexProvider order on turn.failed: turn_end first, THEN the error detail.
    child.opts.onEvent({ type: "turn_end", ok: false, subtype: "error", sessionId: "", usageByModel: {} });
    child.opts.onEvent({ type: "error", message: "Authentification Codex refusée" });
    await sleep(SETTLE_WAIT_MS);

    expect(delegation.isActive(ticket.id)).toBe(false);
    const failEvent = parent.sent.find((m) => m.includes("Implémentation déléguée ÉCHOUÉE"));
    expect(failEvent).toBeDefined();
    expect(failEvent).toContain("Authentification Codex refusée");
  });
});

describe("DelegationManager — cascade kill", () => {
  test("parent disconnect kills the child and drops its stale events", async () => {
    const { system, sessionHub, delegation } = setup();
    const ticket = newDelegatedTicket();
    startParentSession(sessionHub, ticket.id);
    delegation.start(ticket, 3, "plan");
    const child = system.sessions[1];
    if (!child) throw new Error("child session missing");

    sessionHub.disconnect(ticket.id);

    expect(delegation.isActive(ticket.id)).toBe(false);
    expect(child.interrupted).toBe(true);
    expect(child.closed).toBe(true);
    // A stale turn_end after the kill must not settle (no throw, no event, no resurrection).
    child.opts.onEvent({ type: "turn_end", ok: true, subtype: "success", sessionId: "s", usageByModel: {} });
    await sleep(SETTLE_WAIT_MS);
    expect(delegation.isActive(ticket.id)).toBe(false);
  });
});
