import { afterEach, describe, expect, test } from "bun:test";

import { initProjectRegistry } from "../config.ts";
import { makeTicket } from "../testing/fixtures.ts";
import { removeDbFiles, tmpDbPath } from "../testing/tmpDb.ts";

import { createDatabase } from "./schema.ts";
import { Store } from "./store.ts";

const paths: string[] = [];

afterEach(() => {
  for (const path of paths.splice(0)) removeDbFiles(path);
});

function setup(): { store: Store; ticketId: string; close(): void } {
  const path = tmpDbPath();
  paths.push(path);
  const db = createDatabase(path);
  const store = new Store(db);
  store.createProject("test-proj", { label: "Test", repoPath: "/tmp/repo", baseBranch: "main", commitTimeoutMs: 60_000, defaultAutoMerge: false, defaultAddScreenshots: false });
  initProjectRegistry(store);
  const ticket = store.createTicket({ ...makeTicket(), childOrder: null });
  return { store, ticketId: ticket.id, close: () => db.close() };
}

describe("Store implementationFinishedAt", () => {
  test("mirrors a numeric finishedAt into implementationFinishedAt", () => {
    const { store, ticketId, close } = setup();
    expect(store.getTicket(ticketId)?.implementationFinishedAt).toBeNull();
    const updated = store.updateTicket(ticketId, { finishedAt: 42_000 });
    expect(updated.finishedAt).toBe(42_000);
    expect(updated.implementationFinishedAt).toBe(42_000);
    close();
  });

  test("resets implementationFinishedAt when finishedAt is cleared (relaunch)", () => {
    const { store, ticketId, close } = setup();
    store.updateTicket(ticketId, { finishedAt: 42_000 });
    const relaunched = store.updateTicket(ticketId, { finishedAt: null });
    expect(relaunched.finishedAt).toBeNull();
    expect(relaunched.implementationFinishedAt).toBeNull();
    close();
  });

  test("an explicit implementationFinishedAt wins over the mirror", () => {
    const { store, ticketId, close } = setup();
    const updated = store.updateTicket(ticketId, { finishedAt: 90_000, implementationFinishedAt: 50_000 });
    expect(updated.finishedAt).toBe(90_000);
    expect(updated.implementationFinishedAt).toBe(50_000);
    const legacy = store.updateTicket(ticketId, { finishedAt: 95_000, implementationFinishedAt: null });
    expect(legacy.finishedAt).toBe(95_000);
    expect(legacy.implementationFinishedAt).toBeNull();
    close();
  });

  test("patches without finishedAt leave implementationFinishedAt unchanged", () => {
    const { store, ticketId, close } = setup();
    store.updateTicket(ticketId, { finishedAt: 42_000 });
    const updated = store.updateTicket(ticketId, { title: "renamed" });
    expect(updated.finishedAt).toBe(42_000);
    expect(updated.implementationFinishedAt).toBe(42_000);
    close();
  });

  test("a later agent run on an open PR restamps the last agent end", () => {
    const { store, ticketId, close } = setup();
    store.updateTicket(ticketId, { prUrl: "https://github.com/o/r/pull/1" });
    expect(store.updateTicket(ticketId, { finishedAt: 42_000 }).implementationFinishedAt).toBe(42_000);
    const rerun = store.updateTicket(ticketId, { finishedAt: null });
    expect(rerun.finishedAt).toBeNull();
    expect(rerun.implementationFinishedAt).toBeNull();
    const redelivered = store.updateTicket(ticketId, { finishedAt: 80_000 });
    expect(redelivered.finishedAt).toBe(80_000);
    expect(redelivered.implementationFinishedAt).toBe(80_000);
    close();
  });

  test("a relaunch before any PR clears and re-stamps the agent end", () => {
    const { store, ticketId, close } = setup();
    store.updateTicket(ticketId, { finishedAt: 42_000 });
    expect(store.updateTicket(ticketId, { finishedAt: null }).implementationFinishedAt).toBeNull();
    expect(store.updateTicket(ticketId, { finishedAt: 80_000 }).implementationFinishedAt).toBe(80_000);
    close();
  });

  test("implementationStartedAt keeps the first implementing stamp across a relaunch", () => {
    const { store, ticketId, close } = setup();
    const first = store.updateTicket(ticketId, { column: "implementing", stage: "implementing" });
    const startedAt = first.implementationStartedAt;
    expect(startedAt).not.toBeNull();
    store.updateTicket(ticketId, { finishedAt: Date.now() + 1_000 });
    store.updateTicket(ticketId, { finishedAt: null, stage: "queued" });
    const relaunched = store.updateTicket(ticketId, { stage: "implementing" });
    expect(relaunched.implementationStartedAt).toBe(startedAt);
    expect(relaunched.implementationFinishedAt).toBeNull();
    close();
  });
});
