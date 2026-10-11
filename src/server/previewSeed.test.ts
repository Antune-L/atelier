import { afterEach, describe, expect, test } from "bun:test";

import { initProjectRegistry } from "./config.ts";
import { createDatabase } from "./db/schema.ts";
import { Store } from "./db/store.ts";
import { PREVIEW_SEED_ENV, seedPreviewDemoData } from "./previewSeed.ts";
import { removeDbFiles, tmpDbPath } from "./testing/tmpDb.ts";

const paths: string[] = [];
const previousSeed = process.env[PREVIEW_SEED_ENV];
const previousDryRun = process.env.KANBAN_DRY_RUN;

function restoreEnv(key: string, value: string | undefined): void {
  if (value === undefined) delete process.env[key];
  else process.env[key] = value;
}

afterEach(() => {
  restoreEnv(PREVIEW_SEED_ENV, previousSeed);
  restoreEnv("KANBAN_DRY_RUN", previousDryRun);
  for (const path of paths.splice(0)) removeDbFiles(path);
});

function setup(): { store: Store; close(): void } {
  const path = tmpDbPath();
  paths.push(path);
  const db = createDatabase(path);
  const store = new Store(db);
  store.createProject("test-proj", { label: "Test", repoPath: "/tmp/repo", baseBranch: "main", commitTimeoutMs: 60_000, defaultAutoMerge: false, defaultAddScreenshots: false });
  initProjectRegistry(store);
  return { store, close: () => db.close() };
}

describe("seedPreviewDemoData Devin tickets", () => {
  test("seeds the autonomous demo tickets once and keeps the others non-autonomous", () => {
    process.env[PREVIEW_SEED_ENV] = "1";
    process.env.KANBAN_DRY_RUN = "1";
    const { store, close } = setup();
    seedPreviewDemoData(store);
    const tickets = store.listTickets(true);
    const byTitle = (title: string) => tickets.find((ticket) => ticket.title === title);

    const todo = byTitle("[seed] Ticket Devin à faire");
    expect(todo?.column).toBe("todo");
    expect(todo?.autonomous).toBe(true);
    expect(todo?.autonomousState ?? null).toBeNull();

    const correcting = byTitle("[seed] Ticket Devin en correction");
    expect(correcting?.column).toBe("implementing");
    expect(correcting?.stage).toBe("fixing");
    expect(correcting?.autonomous).toBe(true);
    expect(correcting?.autonomousState?.phase).toBe("correcting");
    expect(correcting?.autonomousState?.corrections).toBe(1);
    expect(correcting?.autonomousState?.error).toBe("La vérification E2E du panier a échoué.");

    const paused = byTitle("[seed] Ticket Devin en pause");
    expect(paused?.column).toBe("failed");
    expect(paused?.stage).toBe("failed");
    expect(paused?.autonomous).toBe(true);
    expect(paused?.autonomousState?.phase).toBe("paused");
    expect(paused?.autonomousState?.corrections).toBe(1);
    expect(paused?.autonomousState?.error).toBe("Le délai autonome est dépassé.");

    const delivered = byTitle("[seed] Ticket Devin livré");
    expect(delivered?.column).toBe("merged");
    expect(delivered?.stage).toBe("done");
    expect(delivered?.prUrl ?? null).not.toBeNull();
    expect(delivered?.autonomous).toBe(true);
    expect(delivered?.autonomousState?.phase).toBe("completed");
    expect(delivered?.autonomousState?.corrections).toBe(0);
    expect(delivered?.autonomousState?.error).toBeNull();

    const claudeMerged = byTitle("[seed] Ticket mergé (Claude)");
    expect(claudeMerged).toBeDefined();
    expect(claudeMerged?.autonomous ?? false).toBe(false);

    const count = tickets.length;
    seedPreviewDemoData(store);
    expect(store.listTickets(true)).toHaveLength(count);
    close();
  });
});
