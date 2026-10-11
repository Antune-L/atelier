import { afterEach, describe, expect, test } from "bun:test";

import { initProjectRegistry } from "./config.ts";
import { createDatabase } from "./db/schema.ts";
import { Store } from "./db/store.ts";
import { ClientHub } from "./hub.ts";
import { TicketLifecycle } from "./lifecycle.ts";
import { Notifier } from "./notifier.ts";
import { makeTicket } from "./testing/fixtures.ts";
import { removeDbFiles, tmpDbPath } from "./testing/tmpDb.ts";

const paths: string[] = [];

afterEach(() => {
  for (const path of paths.splice(0)) removeDbFiles(path);
});

function setup(): { store: Store; lifecycle: TicketLifecycle; ticketId: string; close(): void } {
  const path = tmpDbPath();
  paths.push(path);
  const db = createDatabase(path);
  const store = new Store(db);
  store.createProject("test-proj", { label: "Test", repoPath: "/tmp/repo", baseBranch: "main", commitTimeoutMs: 60_000, defaultAutoMerge: false, defaultAddScreenshots: false });
  initProjectRegistry(store);
  const hub = new ClientHub(store);
  const lifecycle = new TicketLifecycle(store, hub, new Notifier(hub));
  const ticket = store.createTicket({ ...makeTicket(), childOrder: null });
  return { store, lifecycle, ticketId: ticket.id, close: () => db.close() };
}

describe("TicketLifecycle.markMerged implementation duration", () => {
  test("keeps implementationFinishedAt at the end of the agent run", () => {
    const { store, lifecycle, ticketId, close } = setup();
    const t1 = 1_000_000;
    store.updateTicket(ticketId, { column: "to_review", finishedAt: t1 });
    const before = Date.now();
    const merged = lifecycle.markMerged(ticketId);
    expect(merged.column).toBe("merged");
    expect(merged.finishedAt).not.toBeNull();
    expect(merged.finishedAt ?? 0).toBeGreaterThanOrEqual(before);
    expect(merged.implementationFinishedAt).toBe(t1);
    expect(store.getTicket(ticketId)?.implementationFinishedAt).toBe(t1);
    close();
  });

  test("legacy ticket without implementationFinishedAt adopts the previous finishedAt", () => {
    const { store, lifecycle, ticketId, close } = setup();
    const t0 = 2_000_000;
    store.updateTicket(ticketId, { column: "to_review", finishedAt: t0, implementationFinishedAt: null });
    const merged = lifecycle.markMerged(ticketId);
    expect(merged.column).toBe("merged");
    expect(merged.implementationFinishedAt).toBe(t0);
    close();
  });

  test("already-merged legacy ticket keeps a null implementationFinishedAt", () => {
    const { store, lifecycle, ticketId, close } = setup();
    const m = 3_000_000;
    store.updateTicket(ticketId, { column: "merged", finishedAt: m, implementationFinishedAt: null });
    const merged = lifecycle.markMerged(ticketId);
    expect(merged.column).toBe("merged");
    expect(merged.implementationFinishedAt).toBeNull();
    close();
  });
});
