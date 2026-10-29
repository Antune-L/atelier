import { afterEach, expect, test } from "bun:test";

import { providerQuotaSchema } from "../shared/providerQuota.ts";
import { usageSummarySchema } from "../shared/providerUsage.ts";
import { AgentCoordinator } from "./agents/coordinator.ts";
import { AtelierManager } from "./agents/atelierManager.ts";
import { AutomationManager } from "./agents/automationManager.ts";
import { DelegationManager } from "./agents/delegationManager.ts";
import { FeasibilityAnswerManager } from "./agents/feasibilityAnswerManager.ts";
import { FeasibilityBatchManager } from "./agents/feasibilityManager.ts";
import { ReformulateManager } from "./agents/reformulateManager.ts";
import { SessionHub } from "./agents/sessionHub.ts";
import { SlotManager } from "./agents/slotManager.ts";
import { SplitManager } from "./agents/splitManager.ts";
import { TriageManager } from "./agents/triageManager.ts";
import { initProjectRegistry } from "./config.ts";
import { createDatabase } from "./db/schema.ts";
import { Store } from "./db/store.ts";
import { ClientHub } from "./hub.ts";
import { TicketLifecycle } from "./lifecycle.ts";
import { Notifier } from "./notifier.ts";
import { createApiRoutes } from "./routes.ts";
import { FakeSystemAdapter } from "./system/fake.ts";
import { FIXTURE_PROJECT_KEY } from "./testing/fixtures.ts";
import { createTicketOperations } from "./ticketOperations.ts";

const HTTP_OK = 200;
const HTTP_BAD_REQUEST = 400;

const closers: Array<() => Promise<void>> = [];

afterEach(async () => {
  for (const close of closers.splice(0)) await close();
});

function setup() {
  const system = new FakeSystemAdapter();
  const db = createDatabase(":memory:");
  const store = new Store(db);
  store.createProject(FIXTURE_PROJECT_KEY, { label: "Test", repoPath: "/tmp/repo", baseBranch: "main", commitTimeoutMs: 60_000, defaultAutoMerge: false, defaultAddScreenshots: false });
  initProjectRegistry(store);
  const hub = new ClientHub(store);
  const sessionHub = new SessionHub(system);
  const notifier = new Notifier(hub);
  const lifecycle = new TicketLifecycle(store, hub, notifier);
  const triage = new TriageManager(store, system, sessionHub, hub, notifier);
  const feasibility = new FeasibilityBatchManager(store, system, sessionHub, hub, notifier);
  const split = new SplitManager(store, system, sessionHub);
  const slots = new SlotManager(store, system, hub, sessionHub, notifier, lifecycle, { projectRoot: "/tmp" });
  const delegation = new DelegationManager(store, system, sessionHub, hub);
  const ticketOperations = createTicketOperations({ store, hub, lifecycle, slots, feasibility });
  const atelier = new AtelierManager({ store, hub, sessionHub, system, ticketOperations, flushIntervalMs: 0 });
  const coordinator = new AgentCoordinator(store, hub, sessionHub, notifier, lifecycle, slots, triage, feasibility, split, delegation, atelier);
  const app = createApiRoutes({
    store, system, hub, sessionHub, lifecycle, triage, feasibility, split, slots, coordinator, atelier,
    reformulate: new ReformulateManager(store, system, hub, notifier),
    feasibilityAnswers: new FeasibilityAnswerManager(store, system, hub),
    automations: new AutomationManager(store, system, hub),
    projectRoot: "/tmp", composerAvailable: true,
  });
  closers.push(async () => {
    atelier.stop();
    sessionHub.disconnectAll();
    await sessionHub.drainClosingSessions();
    db.close();
  });
  const get = (path: string) => app.handle(new Request(`http://localhost/api${path}`));
  return { store, get };
}

test("usage limits return the dry-run quotas of both providers and persist them", async () => {
  const { store, get } = setup();
  const claudeResponse = await get("/usage/limits/claude");
  expect(claudeResponse.status).toBe(HTTP_OK);
  const claude = providerQuotaSchema.parse(await claudeResponse.json());
  expect(claude).toMatchObject({ provider: "claude", state: "ok", source: "live", planType: "max" });
  expect(claude.windows.map((window) => [window.kind, window.usedPercent])).toEqual([["session", 42], ["weekly", 63], ["weekly_model", 20]]);

  const codex = providerQuotaSchema.parse(await (await get("/usage/limits/codex")).json());
  expect(codex).toMatchObject({ provider: "codex", state: "ok", source: "live", planType: "pro" });
  expect(codex.windows.map((window) => [window.kind, window.usedPercent])).toEqual([["session", 35], ["weekly", 71]]);
  expect(store.getProviderQuotaSnapshot("codex")?.windows).toHaveLength(2);
});

test("usage limits reject an unknown provider", async () => {
  const { get } = setup();
  expect((await get("/usage/limits/cursor")).status).toBe(HTTP_BAD_REQUEST);
});

test("usage summary returns both providers for a valid period and rejects an invalid one", async () => {
  const { get } = setup();
  const summary = usageSummarySchema.parse(await (await get("/usage/summary")).json());
  expect(summary.period).toBe("30d");
  expect(Object.keys(summary.providers).sort()).toEqual(["claude", "codex"]);
  const all = usageSummarySchema.parse(await (await get("/usage/summary?period=all")).json());
  expect(all.since).toBeNull();
  expect((await get("/usage/summary?period=1y")).status).toBe(HTTP_BAD_REQUEST);
});
