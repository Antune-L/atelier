import { afterEach, beforeEach, expect, test } from "bun:test";

import { SCHEDULED_START_MAX_DELAY_MS } from "../../shared/constants.ts";
import type { Ticket } from "../../shared/schemas.ts";
import { initProjectRegistry } from "../config.ts";
import { createDatabase } from "../db/schema.ts";
import { Store } from "../db/store.ts";
import type { StartTicketResult } from "../ticketOperations.ts";
import { makeTicket } from "../testing/fixtures.ts";

import { LaunchScheduler } from "./launchScheduler.ts";

const STARTED_AT = 1_000_000;
const MINUTE_MS = 60_000;

let db: ReturnType<typeof createDatabase>;
let store: Store;
let started: string[];
let notifications: string[];
let engaged: Set<string>;
let clock: number;

function scheduler(): LaunchScheduler {
  return new LaunchScheduler({
    store,
    ticketOperations: {
      startTicket: async (ticketId: string): Promise<StartTicketResult> => {
        started.push(ticketId);
        const ticket = store.updateTicket(ticketId, { column: "implementing", stage: "queued" });
        return { status: "queued", ticket };
      },
    },
    slots: { isTicketEngaged: (ticketId: string) => engaged.has(ticketId) },
    hub: { pushTicket: (_ticket: Ticket) => undefined },
    notifier: { notify: async (title: string) => { notifications.push(title); } },
    startedAt: STARTED_AT,
    now: () => clock,
  });
}

function scheduledTicket(scheduledStartAt: number, overrides: Partial<Ticket> = {}): Ticket {
  return store.createTicket(makeTicket({ scheduledStartAt, ...overrides }));
}

beforeEach(() => {
  db = createDatabase(":memory:");
  store = new Store(db);
  store.createProject("test-proj", {
    label: "Test",
    repoPath: "/tmp/repo",
    baseBranch: "main",
    commitTimeoutMs: 60_000,
    defaultAutoMerge: false,
    defaultAddScreenshots: false,
  });
  initProjectRegistry(store);
  started = [];
  notifications = [];
  engaged = new Set();
  clock = STARTED_AT;
});

afterEach(() => {
  db.close();
});

test("a plan that passed while the backend was down is marked missed, not launched", async () => {
  const ticket = scheduledTicket(STARTED_AT - MINUTE_MS);
  await scheduler().tick();
  expect(started).toEqual([]);
  expect(store.getTicket(ticket.id)).toMatchObject({ column: "todo", scheduledStartAt: null, scheduledStartMissedAt: STARTED_AT - MINUTE_MS });
  expect(notifications).toHaveLength(1);
});

test("a due plan claims the card and starts it once", async () => {
  const ticket = scheduledTicket(STARTED_AT + MINUTE_MS);
  const instance = scheduler();
  await instance.tick();
  expect(started).toEqual([]);
  clock = STARTED_AT + MINUTE_MS + 1_000;
  await instance.tick();
  await instance.tick();
  expect(started).toEqual([ticket.id]);
  expect(store.getTicket(ticket.id)).toMatchObject({ column: "implementing", scheduledStartAt: null, scheduledStartMissedAt: null });
});

test("a due card blocked by triage or a live session keeps its plan and fires once unblocked, even late", async () => {
  const plannedAt = STARTED_AT + MINUTE_MS;
  const ticket = scheduledTicket(plannedAt);
  store.updateTicket(ticket.id, { triageStatus: "running" });
  const instance = scheduler();
  clock = plannedAt + 1_000;
  await instance.tick();
  expect(started).toEqual([]);
  expect(store.getTicket(ticket.id)?.scheduledStartAt).toBe(plannedAt);
  store.updateTicket(ticket.id, { triageStatus: "done" });
  engaged.add(ticket.id);
  clock = plannedAt + SCHEDULED_START_MAX_DELAY_MS + MINUTE_MS;
  await instance.tick();
  expect(started).toEqual([]);
  engaged.delete(ticket.id);
  await instance.tick();
  expect(started).toEqual([ticket.id]);
});

test("a plan already due and blocked when the backend restarts keeps waiting and fires once unblocked", async () => {
  const plannedAt = STARTED_AT - MINUTE_MS;
  const ticket = scheduledTicket(plannedAt);
  store.updateTicket(ticket.id, { triageStatus: "running" });
  const instance = scheduler();
  await instance.tick();
  expect(started).toEqual([]);
  expect(store.getTicket(ticket.id)).toMatchObject({ scheduledStartAt: plannedAt, scheduledStartMissedAt: null });
  store.updateTicket(ticket.id, { triageStatus: "done" });
  clock = STARTED_AT + SCHEDULED_START_MAX_DELAY_MS + MINUTE_MS;
  await instance.tick();
  expect(started).toEqual([ticket.id]);
  expect(notifications).toEqual([]);
});

test("a plan first seen more than five minutes late while running (machine asleep) is marked missed", async () => {
  const plannedAt = STARTED_AT + MINUTE_MS;
  const ticket = scheduledTicket(plannedAt);
  const instance = scheduler();
  await instance.tick();
  clock = plannedAt + SCHEDULED_START_MAX_DELAY_MS + 1;
  await instance.tick();
  expect(started).toEqual([]);
  expect(store.getTicket(ticket.id)).toMatchObject({ scheduledStartAt: null, scheduledStartMissedAt: plannedAt });
});

test("leaving todo or archiving clears the plan and the missed marker", () => {
  const moved = scheduledTicket(STARTED_AT + MINUTE_MS);
  store.updateTicket(moved.id, { scheduledStartMissedAt: STARTED_AT });
  expect(store.updateTicket(moved.id, { column: "implementing" })).toMatchObject({ scheduledStartAt: null, scheduledStartMissedAt: null });
  const archived = scheduledTicket(STARTED_AT + MINUTE_MS);
  expect(store.updateTicket(archived.id, { archived: true })).toMatchObject({ scheduledStartAt: null, scheduledStartMissedAt: null });
});
