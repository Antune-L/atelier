import { afterEach, expect, spyOn, test } from "bun:test";

import { AtelierManager } from "./agents/atelierManager.ts";
import { AutomationManager } from "./agents/automationManager.ts";
import { AgentCoordinator } from "./agents/coordinator.ts";
import { DelegationManager } from "./agents/delegationManager.ts";
import { FeasibilityAnswerManager } from "./agents/feasibilityAnswerManager.ts";
import { FeasibilityBatchManager } from "./agents/feasibilityManager.ts";
import { ReformulateManager } from "./agents/reformulateManager.ts";
import { RepoSnapshots } from "./agents/repoSnapshots.ts";
import { SessionHub } from "./agents/sessionHub.ts";
import { SlotManager } from "./agents/slotManager.ts";
import { SplitManager } from "./agents/splitManager.ts";
import { TriageManager } from "./agents/triageManager.ts";
import { initProjectRegistry } from "./config.ts";
import { createDatabase } from "./db/schema.ts";
import { Store } from "./db/store.ts";
import { ClientHub } from "./hub.ts";
import { TicketLifecycle } from "./lifecycle.ts";
import { KeyedMutex } from "./mutex.ts";
import { Notifier } from "./notifier.ts";
import { createApiRoutes } from "./routes.ts";
import { FakeSystemAdapter } from "./system/fake.ts";
import { FIXTURE_PROJECT_KEY, makeTicket } from "./testing/fixtures.ts";

const closers: Array<() => Promise<void>> = [];

afterEach(async () => {
  for (const close of closers.splice(0)) await close();
});

function setup() {
  const db = createDatabase(":memory:");
  const store = new Store(db);
  store.createProject(FIXTURE_PROJECT_KEY, { label: "Test", repoPath: "/tmp/repo", baseBranch: "main", commitTimeoutMs: 60_000, defaultAutoMerge: false, defaultAddScreenshots: false });
  initProjectRegistry(store);
  const system = new FakeSystemAdapter();
  const hub = new ClientHub(store);
  const sessionHub = new SessionHub(system);
  const notifier = new Notifier(hub);
  const lifecycle = new TicketLifecycle(store, hub, notifier);
  const triage = new TriageManager(store, system, sessionHub, hub, notifier);
  const feasibility = new FeasibilityBatchManager(store, system, sessionHub, hub, notifier);
  const snapshots = new RepoSnapshots({ system, repoMutex: new KeyedMutex() });
  const split = new SplitManager(store, system, sessionHub, snapshots);
  const slots = new SlotManager(store, system, hub, sessionHub, notifier, lifecycle, { projectRoot: "/tmp" });
  const delegation = new DelegationManager(store, system, sessionHub, hub);
  const atelier = new AtelierManager({ store, hub, sessionHub, system, snapshots });
  const coordinator = new AgentCoordinator(store, hub, sessionHub, notifier, lifecycle, slots, triage, feasibility, split, delegation, atelier);
  const app = createApiRoutes({
    store, system, hub, sessionHub, lifecycle, triage, feasibility, split, slots, coordinator, atelier,
    reformulate: new ReformulateManager(store, system, hub, notifier, snapshots),
    feasibilityAnswers: new FeasibilityAnswerManager(store, system, hub),
    automations: new AutomationManager(store, system, hub),
    projectRoot: "/tmp", composerAvailable: false,
  });
  closers.push(async () => {
    sessionHub.disconnectAll();
    await sessionHub.drainClosingSessions();
    db.close();
  });
  const forwardComment = spyOn(coordinator, "forwardComment").mockImplementation(() => undefined);
  const answerQuestion = spyOn(coordinator, "answerQuestion").mockImplementation(() => undefined);
  const pushComment = spyOn(hub, "pushComment");
  const postComment = (ticketId: string, body: unknown) => app.handle(new Request(`http://localhost/api/tickets/${ticketId}/comments`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  }));
  return { store, forwardComment, answerQuestion, pushComment, postComment };
}

test("a todo card stores and pushes the comment without reaching any session, even during triage", async () => {
  const { store, forwardComment, answerQuestion, pushComment, postComment } = setup();
  const created = store.createTicket(makeTicket({ column: "todo", stage: null }));
  store.updateTicket(created.id, { column: "todo", stage: null, triageStatus: "running" });

  const response = await postComment(created.id, { body: "Use the blue variant" });

  expect(response.status).toBe(200);
  expect((await response.json()).body).toBe("Use the blue variant");
  expect(store.listComments(created.id).map((comment) => comment.body)).toEqual(["Use the blue variant"]);
  expect(pushComment).toHaveBeenCalledTimes(1);
  expect(forwardComment).not.toHaveBeenCalled();
  expect(answerQuestion).not.toHaveBeenCalled();
});

test("a todo answer marks its question answered without forwarding it", async () => {
  const { store, answerQuestion, forwardComment, postComment } = setup();
  const created = store.createTicket(makeTicket({ column: "todo", stage: null }));
  store.updateTicket(created.id, { column: "todo", stage: null });
  store.addComment(created.id, "agent", "Modal or page?", "q1");

  const response = await postComment(created.id, { body: "Modal", questionId: "q1" });

  expect(response.status).toBe(200);
  expect(store.listComments(created.id).find((comment) => comment.author === "agent")?.answered).toBe(true);
  expect(answerQuestion).not.toHaveBeenCalled();
  expect(forwardComment).not.toHaveBeenCalled();
});

test("a started card still forwards comments and answers to its session", async () => {
  const { store, forwardComment, answerQuestion, postComment } = setup();
  const created = store.createTicket(makeTicket());
  store.updateTicket(created.id, { column: "implementing", stage: "implementing" });

  expect((await postComment(created.id, { body: "Keep the API" })).status).toBe(200);
  expect(forwardComment).toHaveBeenCalledWith(created.id, "Keep the API");

  expect((await postComment(created.id, { body: "Page", questionId: "q2" })).status).toBe(200);
  expect(answerQuestion).toHaveBeenCalledWith(created.id, "q2", "Page");
});
