import { afterEach, expect, test } from "bun:test";

import { providerQuotaSchema } from "../shared/providerQuota.ts";
import { USAGE_PERIODS, usageSummarySchema } from "../shared/providerUsage.ts";
import { claudeLoginStatusSchema } from "../shared/claudeLogin.ts";
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
  const send = (method: string, path: string, body?: unknown) => app.handle(new Request(`http://localhost/api${path}`, {
    method,
    headers: body === undefined ? undefined : { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  }));
  return { store, get, send };
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

test("usage summary accepts the 24h/7d/30d/90d periods and rejects any other", async () => {
  const { get } = setup();
  const summary = usageSummarySchema.parse(await (await get("/usage/summary")).json());
  expect(summary.period).toBe("30d");
  expect(Object.keys(summary.providers).sort()).toEqual(["claude", "codex"]);
  for (const period of USAGE_PERIODS) {
    const response = await get(`/usage/summary?period=${period}`);
    expect(response.status).toBe(HTTP_OK);
    expect(usageSummarySchema.parse(await response.json()).period).toBe(period);
  }
  expect((await get("/usage/summary?period=all")).status).toBe(HTTP_BAD_REQUEST);
  expect((await get("/usage/summary?period=1y")).status).toBe(HTTP_BAD_REQUEST);
});

test("usage summary includes the local history of both providers, unknown and Claude fast rows unpriced", async () => {
  const { get } = setup();
  const week = usageSummarySchema.parse(await (await get("/usage/summary?period=7d")).json());
  expect(week.providers.claude.sessionCount).toBe(2);
  expect(week.providers.codex.sessionCount).toBe(1);
  expect(week.providers.claude.costUsd).toBeGreaterThan(0);
  const fastRow = week.providers.claude.models.find((row) => row.fast);
  expect(fastRow?.costUsd).toBeNull();
  expect(fastRow?.totalTokens).toBeGreaterThan(0);

  const quarter = usageSummarySchema.parse(await (await get("/usage/summary?period=90d")).json());
  expect(quarter.providers.claude.sessionCount).toBe(3);
  expect(quarter.providers.codex.sessionCount).toBe(3);
  const unknown = quarter.providers.claude.models.find((row) => row.model === "claude-experimental-x");
  expect(unknown?.costUsd).toBeNull();
  expect(quarter.providers.claude.partial).toBe(true);
});

test("usage summary skips history sessions already counted by the store", async () => {
  const { store, get } = setup();
  store.listUsageCountedSessionIds = () => new Set(["fake-history-claude-1", "fake-history-codex-1"]);
  const week = usageSummarySchema.parse(await (await get("/usage/summary?period=7d")).json());
  expect(week.providers.claude.sessionCount).toBe(1);
  expect(week.providers.codex.sessionCount).toBe(0);
});

test("claude login routes drive the dry-run flow and never echo the code", async () => {
  const { send, get } = setup();
  expect(claudeLoginStatusSchema.parse(await (await get("/usage/claude-login")).json()).state).toBe("idle");
  const started = claudeLoginStatusSchema.parse(await (await send("POST", "/usage/claude-login")).json());
  expect(started.state).toBe("awaiting_code");
  expect(started.url).toStartWith("https://");
  expect((await send("POST", "/usage/claude-login/code", { code: "" })).status).toBe(HTTP_BAD_REQUEST);
  expect((await send("POST", "/usage/claude-login/code", {})).status).toBe(HTTP_BAD_REQUEST);
  const response = await send("POST", "/usage/claude-login/code", { code: "secret-code-123" });
  const text = await response.text();
  expect(text).not.toContain("secret-code-123");
  expect(claudeLoginStatusSchema.parse(JSON.parse(text)).state).toBe("success");

  await send("POST", "/usage/claude-login");
  const cancelled = claudeLoginStatusSchema.parse(await (await send("DELETE", "/usage/claude-login")).json());
  expect(cancelled.state).toBe("cancelled");
  expect(cancelled.url).toBeNull();
});
