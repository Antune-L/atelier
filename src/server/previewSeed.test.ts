import { afterEach, describe, expect, test } from "bun:test";

import { parseTriageReport } from "../shared/schemas.ts";
import { initProjectRegistry } from "./config.ts";
import { createDatabase } from "./db/schema.ts";
import { Store } from "./db/store.ts";
import { seedPreviewDemoData } from "./previewSeed.ts";
import { removeDbFiles, tmpDbPath } from "./testing/tmpDb.ts";

const FEASIBILITY_TITLE = "[seed] Ticket avec questions de faisabilité";
const ENV_KEYS: readonly string[] = ["KANBAN_PREVIEW_SEED", "KANBAN_DRY_RUN"];
const savedEnv = new Map(ENV_KEYS.map((key) => [key, process.env[key]]));
const paths: string[] = [];
const closers: (() => void)[] = [];

afterEach(() => {
  for (const close of closers.splice(0)) close();
  for (const path of paths.splice(0)) removeDbFiles(path);
  for (const key of ENV_KEYS) {
    const value = savedEnv.get(key);
    if (value === undefined) Reflect.deleteProperty(process.env, key);
    else process.env[key] = value;
  }
});

function setup(dryRun: string | undefined): Store {
  process.env.KANBAN_PREVIEW_SEED = "1";
  if (dryRun === undefined) Reflect.deleteProperty(process.env, "KANBAN_DRY_RUN");
  else process.env.KANBAN_DRY_RUN = dryRun;
  const path = tmpDbPath();
  paths.push(path);
  const db = createDatabase(path);
  closers.push(() => db.close());
  const store = new Store(db);
  store.createProject("test-proj", { label: "Test", repoPath: "/tmp/repo", baseBranch: "main", commitTimeoutMs: 60_000, defaultAutoMerge: false, defaultAddScreenshots: false });
  initProjectRegistry(store);
  return store;
}

function titleCounts(store: Store): Map<string, number> {
  const counts = new Map<string, number>();
  for (const ticket of store.listTickets(true)) counts.set(ticket.title, (counts.get(ticket.title) ?? 0) + 1);
  return counts;
}

describe("seedPreviewDemoData feasibility ticket", () => {
  for (const dryRun of [undefined, "1"]) {
    test(`inserts a triaged todo ticket with feasibility questions (KANBAN_DRY_RUN=${dryRun ?? "unset"})`, () => {
      const store = setup(dryRun);
      seedPreviewDemoData(store);
      const tickets = store.listTickets(true).filter((ticket) => ticket.title === FEASIBILITY_TITLE);
      expect(tickets).toHaveLength(1);
      const ticket = tickets[0];
      if (!ticket) throw new Error("Seed ticket missing");
      expect(ticket.column).toBe("todo");
      expect(ticket.triageStatus).toBe("done");
      expect(parseTriageReport(ticket.triageReport)?.questions).toEqual([
        { question: "Quelle couleur pour le bouton ?", recommendedAnswer: "Bleu" },
        { question: "Quelle taille ?", recommendedAnswer: "Grande" },
        { question: "Un commentaire libre ?", recommendedAnswer: null },
      ]);
    });
  }

  test("seeding twice inserts the feasibility ticket only once", () => {
    const store = setup(undefined);
    seedPreviewDemoData(store);
    seedPreviewDemoData(store);
    expect(titleCounts(store).get(FEASIBILITY_TITLE)).toBe(1);
  });

  test("a store marked with seed version 1 still gets the feasibility ticket exactly once", () => {
    const store = setup("1");
    store.setMeta("preview_seed_version", "1");
    seedPreviewDemoData(store);
    seedPreviewDemoData(store);
    expect(titleCounts(store).get(FEASIBILITY_TITLE)).toBe(1);
  });

  test("upgrading an older seeded store does not duplicate other seed tickets", () => {
    const store = setup("1");
    seedPreviewDemoData(store);
    store.setMeta("preview_seed_version", "1");
    seedPreviewDemoData(store);
    const counts = titleCounts(store);
    expect(counts.get(FEASIBILITY_TITLE)).toBe(1);
    for (const [title, count] of counts) expect({ title, count }).toEqual({ title, count: 1 });
  });
});
