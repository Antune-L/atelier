import { afterEach, beforeEach, expect, test } from "bun:test";

import { capabilitiesSchema } from "../shared/schemas.ts";
import type { VcsProvider } from "../shared/constants.ts";
import { AtelierManager } from "./agents/atelierManager.ts";
import { AutomationManager } from "./agents/automationManager.ts";
import { AgentCoordinator } from "./agents/coordinator.ts";
import { DelegationManager } from "./agents/delegationManager.ts";
import { FeasibilityBatchManager } from "./agents/feasibilityManager.ts";
import { ReformulateManager } from "./agents/reformulateManager.ts";
import { SessionHub } from "./agents/sessionHub.ts";
import { SlotManager } from "./agents/slotManager.ts";
import { SplitManager } from "./agents/splitManager.ts";
import { TriageManager } from "./agents/triageManager.ts";
import { initProjectRegistry } from "./config.ts";
import { createDatabase } from "./db/schema.ts";
import { Store } from "./db/store.ts";
import { PR_ONLY_MESSAGE } from "./hostRole.ts";
import { ClientHub } from "./hub.ts";
import { TicketLifecycle } from "./lifecycle.ts";
import { Notifier } from "./notifier.ts";
import { createApiRoutes } from "./routes.ts";
import { FakeSystemAdapter } from "./system/fake.ts";
import { RealSystemAdapter } from "./system/real.ts";
import type { DoneGateResult } from "./system/types.ts";
import { WorkerMcpManager } from "./workerMcp.ts";
import { FIXTURE_PROJECT_KEY, makeTicket } from "./testing/fixtures.ts";

class MergeTrackingSystem extends FakeSystemAdapter {
  readonly automaticMerges: string[] = [];
  readonly manualMerges: string[] = [];

  override async mergePr(slotPath: string, branch: string, prUrl: string, provider: VcsProvider): Promise<DoneGateResult> {
    this.automaticMerges.push(prUrl);
    return super.mergePr(slotPath, branch, prUrl, provider);
  }

  override async mergePrOnUserRequest(slotPath: string, branch: string, prUrl: string, provider: VcsProvider): Promise<DoneGateResult> {
    this.manualMerges.push(prUrl);
    return super.mergePrOnUserRequest(slotPath, branch, prUrl, provider);
  }
}

const previousRole = process.env.KANBAN_HOST_ROLE;
const closers: Array<() => Promise<void>> = [];

beforeEach(() => {
  process.env.KANBAN_HOST_ROLE = "cloud";
});

afterEach(async () => {
  for (const close of closers.splice(0)) await close();
  if (previousRole === undefined) delete process.env.KANBAN_HOST_ROLE;
  else process.env.KANBAN_HOST_ROLE = previousRole;
});

function setup() {
  const db = createDatabase(":memory:");
  const store = new Store(db);
  store.createProject(FIXTURE_PROJECT_KEY, { label: "Test", repoPath: "/tmp/repo", baseBranch: "main", commitTimeoutMs: 60_000, defaultAutoMerge: false, defaultAddScreenshots: false });
  initProjectRegistry(store);
  const system = new MergeTrackingSystem();
  const hub = new ClientHub(store);
  const sessionHub = new SessionHub(system);
  const notifier = new Notifier(hub);
  const lifecycle = new TicketLifecycle(store, hub, notifier);
  const triage = new TriageManager(store, system, sessionHub, hub, notifier);
  const feasibility = new FeasibilityBatchManager(store, system, sessionHub, hub, notifier);
  const split = new SplitManager(store, system, sessionHub);
  const slots = new SlotManager(store, system, hub, sessionHub, notifier, lifecycle, { projectRoot: "/tmp" });
  const delegation = new DelegationManager(store, system, sessionHub, hub);
  const atelier = new AtelierManager({ store, hub, sessionHub, system });
  const coordinator = new AgentCoordinator(store, hub, sessionHub, notifier, lifecycle, slots, triage, feasibility, split, delegation, atelier);
  const app = createApiRoutes({
    store, system, hub, sessionHub, lifecycle, triage, feasibility, split, slots, coordinator, atelier,
    reformulate: new ReformulateManager(store, system, hub, notifier),
    automations: new AutomationManager(store, system, hub),
    projectRoot: "/tmp", composerAvailable: true,
  });
  closers.push(async () => {
    sessionHub.disconnectAll();
    await sessionHub.drainClosingSessions();
    db.close();
  });
  const post = (path: string) => app.handle(new Request(`http://localhost/api${path}`, { method: "POST" }));
  return { app, store, system, post };
}

test("the manual merge route merges a finished feature PR on a cloud host", async () => {
  const { store, system, post } = setup();
  const prUrl = "https://github.com/acme/repo/pull/7";
  const created = store.createTicket(makeTicket());
  const ticket = store.updateTicket(created.id, { column: "done", stage: "done", slotId: null, prUrl, branch: "feat/manual-merge" });

  const response = await post(`/tickets/${ticket.id}/merge`);

  expect(response.status).toBe(200);
  expect(await response.json()).toMatchObject({ merged: true, conflicts: false });
  expect(system.manualMerges).toEqual([prUrl]);
  expect(system.automaticMerges).toEqual([]);
  expect(store.getTicket(ticket.id)?.column).toBe("merged");
});

test("the automatic merge path stays refused on a cloud host", async () => {
  const system = new RealSystemAdapter(new WorkerMcpManager());

  const merge = await system.mergePr("/nonexistent", "feat/x", "https://github.com/acme/repo/pull/7", "github");

  expect(merge).toEqual({ ok: false, reason: PR_ONLY_MESSAGE });
});

test("split children created on a cloud host start without auto-merge or direct push", async () => {
  const { store, post } = setup();
  const ticket = store.createTicket(makeTicket({ column: "todo", stage: null }));

  const response = await post(`/tickets/${ticket.id}/split`);

  expect(response.status).toBe(200);
  const children = store.listTickets(false).filter((child) => child.dependsOn === ticket.id);
  expect(children.length).toBeGreaterThan(0);
  for (const child of children) {
    expect(child.autoMerge).toBe(false);
    expect(child.directPush).toBe(false);
  }
});

test("capabilities expose prOnly only on a cloud host", async () => {
  const { app } = setup();
  const read = async () => capabilitiesSchema.parse(await (await app.handle(new Request("http://localhost/api/capabilities"))).json());

  expect((await read()).prOnly).toBe(true);
  delete process.env.KANBAN_HOST_ROLE;
  expect((await read()).prOnly).toBe(false);
});
