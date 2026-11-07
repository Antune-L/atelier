import { expect, test } from "bun:test";

import { getProject, initProjectRegistry } from "../config.ts";
import { createDatabase } from "../db/schema.ts";
import { Store } from "../db/store.ts";
import { ClientHub } from "../hub.ts";
import { TicketLifecycle } from "../lifecycle.ts";
import { Notifier } from "../notifier.ts";
import type { AgentSessionHandle, AgentSessionOptions } from "../system/agentSession.ts";
import { FakeSystemAdapter } from "../system/fake.ts";
import type { GitWorktreeAddOptions } from "../system/types.ts";
import { makeTicket } from "../testing/fixtures.ts";

import { resolvePrTargetBaseBranch } from "./baseBranch.ts";
import { SessionHub } from "./sessionHub.ts";
import { SlotManager } from "./slotManager.ts";

const MOTHER = "campaign/c1-night";

class CheckoutSystem extends FakeSystemAdapter {
  readonly checkouts: { kind: "new" | "existing"; branch: string; start: string }[] = [];

  override async worktreeAdd(opts: GitWorktreeAddOptions): Promise<void> {
    this.checkouts.push({ kind: "new", branch: opts.branch, start: opts.baseBranch });
    await super.worktreeAdd(opts);
  }

  override async worktreeAddExisting(repoPath: string, slotPath: string, localBranch: string, startBranch?: string): Promise<void> {
    this.checkouts.push({ kind: "existing", branch: localBranch, start: startBranch ?? localBranch });
    await super.worktreeAddExisting(repoPath, slotPath, localBranch, startBranch);
  }

  override startAgentSession(options: AgentSessionOptions): AgentSessionHandle {
    return { ticketId: options.ticketId, send: (_content, messageId = crypto.randomUUID()) => messageId, interrupt: async () => undefined, close: async () => undefined };
  }
}

function setup() {
  const db = createDatabase(":memory:");
  const store = new Store(db);
  store.createProject("test-proj", { label: "Test", repoPath: "/tmp/repo", baseBranch: "main", commitTimeoutMs: 60_000, defaultAutoMerge: false, defaultAddScreenshots: false });
  initProjectRegistry(store);
  const system = new CheckoutSystem();
  const hub = new ClientHub(store);
  const sessionHub = new SessionHub(system);
  const notifier = new Notifier(hub);
  const lifecycle = new TicketLifecycle(store, hub, notifier);
  const slots = new SlotManager(store, system, hub, sessionHub, notifier, lifecycle, { projectRoot: "/tmp" });
  return { db, store, system, sessionHub, lifecycle, slots };
}

async function launched(store: Store, ticketId: string): Promise<void> {
  for (let attempt = 0; attempt < 200; attempt += 1) {
    if (store.getTicket(ticketId)?.stage !== "queued" && store.getTicket(ticketId)?.slotId !== null) return;
    await Bun.sleep(5);
  }
}

test("a campaign's final card checks out the existing mother branch and still targets main", async () => {
  const { db, store, system, sessionHub, lifecycle, slots } = setup();
  try {
    const ticket = store.createTicket({ ...makeTicket(), baseBranch: "main" });
    const campaign = store.campaigns.create("test-proj", "night");
    store.campaigns.update(campaign.id, { motherBranch: MOTHER, baseBranch: "main", finalTicketId: ticket.id });
    lifecycle.enqueue(ticket.id);
    await slots.startTicket(ticket.id);
    await launched(store, ticket.id);
    expect(system.checkouts).toEqual([{ kind: "existing", branch: MOTHER, start: MOTHER }]);
    const started = store.getTicket(ticket.id);
    expect(started?.branch).toBe(MOTHER);
    if (!started) throw new Error("ticket missing");
    expect(resolvePrTargetBaseBranch(started, getProject("test-proj"), store)).toBe("main");
  } finally {
    sessionHub.disconnectAll();
    await sessionHub.drainClosingSessions();
    db.close();
  }
});

test("an ordinary card keeps forking its own feature branch from its base", async () => {
  const { db, store, system, sessionHub, lifecycle, slots } = setup();
  try {
    const ticket = store.createTicket(makeTicket());
    lifecycle.enqueue(ticket.id);
    await slots.startTicket(ticket.id);
    await launched(store, ticket.id);
    expect(system.checkouts).toHaveLength(1);
    expect(system.checkouts[0]).toMatchObject({ kind: "new", start: "main" });
    expect(system.checkouts[0]?.branch.startsWith("feat/")).toBe(true);
  } finally {
    sessionHub.disconnectAll();
    await sessionHub.drainClosingSessions();
    db.close();
  }
});
