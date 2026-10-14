import { afterEach, beforeEach, expect, test } from "bun:test";

import { parseTriageReport } from "../shared/schemas.ts";
import { initProjectRegistry } from "./config.ts";
import { createDatabase } from "./db/schema.ts";
import { Store } from "./db/store.ts";
import { seedPreviewDemoData } from "./previewSeed.ts";
import { FIXTURE_PROJECT_KEY } from "./testing/fixtures.ts";
import { removeDbFiles, tmpDbPath } from "./testing/tmpDb.ts";

const FEASIBILITY_SEED_TITLE = "[seed] Ticket avec questions de faisabilité";
const paths: string[] = [];
const savedEnv = { seed: process.env.KANBAN_PREVIEW_SEED, dryRun: process.env.KANBAN_DRY_RUN };

function restore(key: string, value: string | undefined): void {
  if (value === undefined) delete process.env[key];
  else process.env[key] = value;
}

beforeEach(() => {
  process.env.KANBAN_PREVIEW_SEED = "1";
  process.env.KANBAN_DRY_RUN = "1";
});

afterEach(() => {
  restore("KANBAN_PREVIEW_SEED", savedEnv.seed);
  restore("KANBAN_DRY_RUN", savedEnv.dryRun);
  for (const path of paths.splice(0)) removeDbFiles(path);
});

function openStore(): Store {
  const path = tmpDbPath();
  paths.push(path);
  const store = new Store(createDatabase(path));
  store.createProject(FIXTURE_PROJECT_KEY, { label: "Test", repoPath: "/tmp/repo", baseBranch: "main", commitTimeoutMs: 60_000, defaultAutoMerge: false, defaultAddScreenshots: false });
  initProjectRegistry(store);
  return store;
}

test("seeds a todo ticket with a finished feasibility study holding several questions", () => {
  const store = openStore();
  seedPreviewDemoData(store);
  const ticket = store.listTickets(true).find((candidate) => candidate.title === FEASIBILITY_SEED_TITLE);
  expect(ticket).toBeDefined();
  expect(ticket?.column).toBe("todo");
  expect(ticket?.triageStatus).toBe("done");
  const report = parseTriageReport(ticket?.triageReport ?? null);
  expect(report).not.toBeNull();
  expect(report?.questions.length ?? 0).toBeGreaterThanOrEqual(2);
});

test("seeding twice does not duplicate seed tickets", () => {
  const store = openStore();
  seedPreviewDemoData(store);
  seedPreviewDemoData(store);
  const titles = store.listTickets(true).map((ticket) => ticket.title).filter((title) => title.startsWith("[seed]"));
  expect(titles.length).toBeGreaterThan(0);
  expect(titles.length).toBe(new Set(titles).size);
});
