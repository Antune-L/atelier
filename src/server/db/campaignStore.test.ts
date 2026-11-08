import { Database } from "bun:sqlite";
import { afterEach, describe, expect, test } from "bun:test";

import { campaignPlanSchema } from "../../shared/campaign.ts";
import { makeCampaignPlan } from "../testing/campaignFixtures.ts";
import { initProjectRegistry } from "../config.ts";
import { FIXTURE_PROJECT_KEY, makeTicket } from "../testing/fixtures.ts";
import { removeDbFiles, tmpDbPath } from "../testing/tmpDb.ts";

import { createDatabase } from "./schema.ts";
import { Store } from "./store.ts";

const paths: string[] = [];

function openStore(path: string): { store: Store; db: Database } {
  const db = createDatabase(path);
  return { store: new Store(db), db };
}

function reservePath(): string {
  const path = tmpDbPath();
  paths.push(path);
  return path;
}

afterEach(() => {
  for (const path of paths.splice(0)) removeDbFiles(path);
});

describe("CampaignStore", () => {
  test("a campaign keeps its approved version, cards and operations across a restart", () => {
    const path = reservePath();
    const first = openStore(path);
    const plan = campaignPlanSchema.parse(makeCampaignPlan());
    const campaign = first.store.campaigns.create(plan.project, plan.title);
    first.store.campaigns.addVersion(campaign.id, plan, "initial");
    first.store.campaigns.update(campaign.id, { status: "running", approvedVersion: 1, approvedAt: 42, motherBranch: "campaign/x", baseBranch: "main" });
    first.store.campaigns.upsertCard(campaign.id, "A", 1);
    first.store.campaigns.updateCard(campaign.id, "A", { state: "running", ticketId: "t-1" });
    first.store.campaigns.beginOperation(campaign.id, "op-1", "create_branch", { branch: "campaign/x" });
    first.store.campaigns.completeOperation("op-1", "done", { ok: true });
    first.db.close();

    const second = openStore(path);
    const reloaded = second.store.campaigns.require(campaign.id);
    expect(reloaded.status).toBe("running");
    expect(reloaded.approvedVersion).toBe(1);
    expect(second.store.campaigns.requireVersion(campaign.id, 1).plan.cards.map((card) => card.id)).toEqual(["A", "B", "C", "D"]);
    expect(second.store.campaigns.getCardByTicket("t-1")?.state).toBe("running");
    expect(second.store.campaigns.getOperation("op-1")?.status).toBe("done");
    second.db.close();
  });

  test("recording an operation twice with the same id keeps a single entry", () => {
    const { store, db } = openStore(reservePath());
    const campaign = store.campaigns.create("test-proj", "c");
    const first = store.campaigns.beginOperation(campaign.id, "merge:A", "merge", { pr: 1 });
    const second = store.campaigns.beginOperation(campaign.id, "merge:A", "merge", { pr: 2 });
    expect(first.created).toBe(true);
    expect(second.created).toBe(false);
    expect(second.operation.payload).toEqual({ pr: 1 });
    expect(store.campaigns.listOperations(campaign.id)).toHaveLength(1);
    db.close();
  });

  test("the migration leaves existing tickets and their events intact", () => {
    const path = reservePath();
    const legacy = new Database(path, { create: true });
    legacy.exec("CREATE TABLE events (id INTEGER PRIMARY KEY AUTOINCREMENT, ticket_id TEXT, type TEXT NOT NULL, payload TEXT, created_at INTEGER NOT NULL)");
    legacy.query("INSERT INTO events (ticket_id, type, payload, created_at) VALUES ('t-old', 'created', '{}', 1)").run();
    legacy.close();
    const { store, db } = openStore(path);
    store.createProject(FIXTURE_PROJECT_KEY, { label: "Test", repoPath: "/tmp/repo", baseBranch: "main", commitTimeoutMs: 60_000, defaultAutoMerge: false, defaultAddScreenshots: false });
    initProjectRegistry(store);
    const ticket = store.createTicket({ ...makeTicket({ id: "t-new" }) });
    expect(store.getTicket(ticket.id)?.title).toBe(ticket.title);
    const events = db.query("SELECT ticket_id, type FROM events WHERE ticket_id = 't-old'").all();
    expect(events).toEqual([{ ticket_id: "t-old", type: "created" }]);
    db.close();
  });

  test("the schema can be applied twice, as when an older build restarts on a migrated database", () => {
    const path = reservePath();
    const first = openStore(path);
    const campaign = first.store.campaigns.create("test-proj", "c");
    first.db.close();
    const second = openStore(path);
    expect(second.store.campaigns.get(campaign.id)?.title).toBe("c");
    second.db.close();
  });

  test("events are read after a cursor and commands are stored once", () => {
    const { store, db } = openStore(reservePath());
    const campaign = store.campaigns.create("test-proj", "c");
    const first = store.campaigns.appendEvent(campaign.id, "a");
    store.campaigns.appendEvent(campaign.id, "b");
    expect(store.campaigns.listEvents(campaign.id, first.seq).map((event) => event.type)).toEqual(["b"]);
    store.campaigns.saveCommand("req-1", "approve", campaign.id, { ok: 1 });
    store.campaigns.saveCommand("req-1", "approve", campaign.id, { ok: 2 });
    expect(store.campaigns.getCommand("req-1")?.result).toEqual({ ok: 1 });
    db.close();
  });
});
