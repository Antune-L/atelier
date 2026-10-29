import { afterAll, afterEach, beforeAll, beforeEach, expect, test } from "bun:test";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { capabilitiesSchema } from "../shared/schemas.ts";
import { AtelierManager } from "./agents/atelierManager.ts";
import { AgentCoordinator } from "./agents/coordinator.ts";
import { AutomationManager } from "./agents/automationManager.ts";
import { DelegationManager } from "./agents/delegationManager.ts";
import { FeasibilityBatchManager } from "./agents/feasibilityManager.ts";
import { FeasibilityAnswerManager } from "./agents/feasibilityAnswerManager.ts";
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

let root: string;
let previousCloneRoot: string | undefined;
let db: ReturnType<typeof createDatabase>;
let store: Store;
let app: ReturnType<typeof createApiRoutes>;
let system: FakeSystemAdapter;

beforeAll(() => {
  root = mkdtempSync(join(tmpdir(), "kanban-routes-github-"));
  previousCloneRoot = process.env.KANBAN_CLONE_ROOT;
  process.env.KANBAN_CLONE_ROOT = join(root, "clones");
});

afterAll(() => {
  if (previousCloneRoot === undefined) delete process.env.KANBAN_CLONE_ROOT;
  else process.env.KANBAN_CLONE_ROOT = previousCloneRoot;
  rmSync(root, { recursive: true, force: true });
});

beforeEach(() => {
  db = createDatabase(":memory:");
  store = new Store(db);
  initProjectRegistry(store);
  system = new FakeSystemAdapter();
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
  app = createApiRoutes({
    store, system, hub, sessionHub, lifecycle, triage, feasibility, split, slots, coordinator, atelier,
    feasibilityAnswers: new FeasibilityAnswerManager(store, system, hub),
    reformulate: new ReformulateManager(store, system, hub, notifier, snapshots),
    automations: new AutomationManager(store, system, hub),
    projectRoot: "/tmp", composerAvailable: false,
  });
});

afterEach(() => {
  db.close();
});

function request(method: string, path: string, body?: unknown): Promise<Response> {
  return app.handle(new Request(`http://localhost/api${path}`, {
    method,
    headers: { "content-type": "application/json" },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  }));
}

const PROJECT = { label: "Atelier", repoPath: "/tmp/atelier", baseBranch: "main", commitTimeoutMs: 60_000 };

async function addAccount(): Promise<string> {
  const response = await request("POST", "/github/accounts", { token: "ghp_abcdefghijklmnopqrstuvwxyz0123" });
  expect(response.status).toBe(201);
  const body = await response.json();
  expect(JSON.stringify(body)).not.toContain("ghp_");
  return String(body.login);
}

test("existing projects load without an account and the column is nullable", async () => {
  const created = await request("POST", "/projects", PROJECT);
  expect(created.status).toBe(201);
  expect((await created.json()).githubAccount).toBeNull();
  const listed = await (await request("GET", "/projects/manage")).json();
  expect(listed[0].githubAccount).toBeNull();
});

test("a project records a registered account, refuses unknown ones and Azure DevOps", async () => {
  const login = await addAccount();
  const created = await request("POST", "/projects", { ...PROJECT, githubAccount: login.toUpperCase() });
  expect(created.status).toBe(201);
  expect((await created.json()).githubAccount).toBe(login);
  expect((await request("POST", "/projects", { ...PROJECT, githubAccount: "stranger" })).status).toBe(400);
  const azure = await request("POST", "/projects", { ...PROJECT, vcsProvider: "azureDevops", githubAccount: login });
  expect(azure.status).toBe(400);
});

test("changing the account is refused while the project has an active ticket", async () => {
  const login = await addAccount();
  const created = await (await request("POST", "/projects", PROJECT)).json();
  const ticket = store.createTicket({
    title: "En cours", description: "x", externalUrl: null, project: created.key, prdEnabled: false, prDraft: true,
    autoMerge: false, addScreenshots: false, verifyFeature: false, argusMultiLoop: false, stealth: false, directPush: false,
    baseBranch: null, dependsOn: null, model: null, effort: null, implementerModel: null, implementerEffort: null,
    implementer: "claude", orchestrator: "claude", codexModel: null, codexEffort: null,
  });
  store.updateTicket(ticket.id, { stage: "implementing" });
  const refused = await request("PATCH", `/projects/${created.key}`, { githubAccount: login });
  expect(refused.status).toBe(409);
  expect((await refused.json()).error).toContain("tickets en cours");
  store.updateTicket(ticket.id, { stage: "done" });
  const accepted = await request("PATCH", `/projects/${created.key}`, { githubAccount: login });
  expect(accepted.status).toBe(200);
  expect((await accepted.json()).githubAccount).toBe(login);
  const unchanged = await request("PATCH", `/projects/${created.key}`, { label: "Renommé" });
  expect((await unchanged.json()).githubAccount).toBe(login);
});

test("dry-run clone returns the planned path with the inspection and creates nothing", async () => {
  const login = await addAccount();
  const response = await request("POST", "/projects/clone", { source: "git@github.com:Org/Repo.git", account: login });
  expect(response.status).toBe(200);
  const body = await response.json();
  expect(body.repoPath).toBe(join(root, "clones", login, "org", "repo"));
  expect(body.cloneUrl).toBe("https://github.com/Org/Repo.git");
  expect(body.inspection.repoPath).toBe(body.repoPath);
  expect(body.existingProjectKey).toBeNull();
  expect(existsSync(join(root, "clones"))).toBe(false);
  expect((await request("POST", "/projects/clone", { source: "ext::sh -c x", account: null })).status).toBe(400);
  expect((await request("POST", "/projects/clone", { source: "https://dev.azure.com/o/p/_git/r", account: null })).status).toBe(400);
  expect((await request("POST", "/projects/clone", { source: "o/r", account: "stranger" })).status).toBe(400);
});

test("accounts are listed with their projects, and an attached account cannot be removed", async () => {
  const login = await addAccount();
  await request("POST", "/projects", { ...PROJECT, githubAccount: login });
  const accounts = await (await request("GET", "/github/accounts")).json();
  expect(accounts).toEqual([{ login, status: "valid", reason: null, projects: ["Atelier"] }]);
  const refused = await request("DELETE", `/github/accounts/${login}`);
  expect(refused.status).toBe(409);
  expect((await refused.json()).error).toContain("Atelier");
  expect((await request("POST", "/github/accounts", { token: "invalid-token" })).status).toBe(400);
});

test("repository listing and capabilities expose no credential", async () => {
  const repos = await (await request("GET", "/github/repos")).json();
  expect(repos.length).toBeGreaterThan(0);
  expect((await request("GET", "/github/repos?account=stranger")).status).toBe(400);
  const raw = await (await request("GET", "/capabilities")).json();
  const caps = capabilitiesSchema.parse(raw);
  expect(caps.githubAvailable).toBe(true);
  const serialized = JSON.stringify(raw);
  expect(serialized).not.toMatch(/login|token|ghp_/i);
});
