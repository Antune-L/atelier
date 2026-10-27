import { afterEach, expect, test } from "bun:test";

import { initProjectRegistry } from "../config.ts";
import { createDatabase } from "../db/schema.ts";
import { Store } from "../db/store.ts";
import { FIXTURE_PROJECT_KEY, makeTicket } from "../testing/fixtures.ts";

import { buildRecoveryContext } from "./recoveryContext.ts";

const closers: Array<() => void> = [];

afterEach(() => {
  for (const close of closers.splice(0)) close();
});

function setup() {
  const db = createDatabase(":memory:");
  closers.push(() => db.close());
  const store = new Store(db);
  store.createProject(FIXTURE_PROJECT_KEY, { label: "Test", repoPath: "/tmp/repo", baseBranch: "main", commitTimeoutMs: 60_000, defaultAutoMerge: false, defaultAddScreenshots: false });
  initProjectRegistry(store);
  const ticket = store.createTicket(makeTicket());
  store.addComment(ticket.id, "user", "Keep the legacy endpoint", null);
  return { store, ticket };
}

test("lists the user comments when the contract does not carry them", () => {
  const { store, ticket } = setup();
  expect(buildRecoveryContext(ticket, store, "implementing")).toContain("Keep the legacy endpoint");
});

test("skips the comments already carried by the re-delivered contract", () => {
  const { store, ticket } = setup();
  const context = buildRecoveryContext(ticket, store, "implementing", { commentsInContract: true });
  expect(context).not.toContain("Keep the legacy endpoint");
  expect(context).toContain("Les commentaires utilisateur figurent dans le contrat.");
});
