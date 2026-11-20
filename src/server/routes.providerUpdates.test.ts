import { afterEach, beforeEach, describe, expect, mock, test } from "bun:test";

import { applicationUpdateVerdict, availableApplicationVersion } from "../shared/applicationUpdate.ts";
import type { DesktopUpdateController, DesktopUpdateStatus } from "../shared/desktopUpdate.ts";
import type { AdoptionStatus } from "../shared/providerAdoption.ts";
import { providerUpdatesSchema } from "../shared/providerUpdates.ts";
import { AgentCoordinator } from "./agents/coordinator.ts";
import { AtelierManager } from "./agents/atelierManager.ts";
import { AutomationManager } from "./agents/automationManager.ts";
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
import { FIXTURE_PROJECT_KEY } from "./testing/fixtures.ts";
import { createTicketOperations } from "./ticketOperations.ts";

const HOST_ROLE_ENV = "KANBAN_HOST_ROLE";
const CLOUD_HOST_ROLE = "cloud";
const INSTALLED_REVISION = "0123456789abcdef0123456789abcdef01234567";
const INSTALLED_DESKTOP_VERSION = "1.4.2";
const AVAILABLE_DESKTOP_VERSION = "1.5.0";
const PROVIDERS = { claude: "1.0.0", codex: "1.0.0" };
const MANUAL_URL = "https://github.com/Antune-L/atelier/releases/latest";

const closers: Array<() => Promise<void> | void> = [];
let savedHostRole: string | undefined;

beforeEach(() => {
  savedHostRole = process.env[HOST_ROLE_ENV];
  delete process.env[HOST_ROLE_ENV];
});

afterEach(async () => {
  for (const close of closers.splice(0)) await close();
  if (savedHostRole === undefined) delete process.env[HOST_ROLE_ENV];
  else process.env[HOST_ROLE_ENV] = savedHostRole;
});

function desktopStatus(version: string): DesktopUpdateStatus {
  return {
    phase: "available",
    target: {
      protocol: 1,
      platform: "macos-arm64",
      identifier: "com.antune.atelier",
      version,
      revision: INSTALLED_REVISION,
      providers: PROVIDERS,
      codexNative: PROVIDERS.codex,
      bundle: `https://github.com/Antune-L/atelier/releases/download/v${version}/Atelier-v${version}-arm64.app.zip`,
      bytes: 1,
      sha256: "0".repeat(64),
    },
    message: null,
    manualUrl: MANUAL_URL,
    checkedAt: 0,
  };
}

function spyDesktopUpdates() {
  const status = desktopStatus(AVAILABLE_DESKTOP_VERSION);
  const check = mock((_refresh?: boolean) => Promise.resolve(status));
  const prepare = mock((_target: string) => Promise.resolve(status));
  const install = mock((_target: string) => Promise.resolve(status));
  const controller: DesktopUpdateController = { check, prepare, install };
  return { controller, check, prepare, install };
}

// NOTE(ali): FakeSystemAdapter types dryRun as the literal true; a proxy reports false at runtime so the non-dry-run branch runs without casting.
function liveFakeSystem(): FakeSystemAdapter {
  return new Proxy(new FakeSystemAdapter(), {
    get(target, property, receiver) {
      if (property === "dryRun") return false;
      return Reflect.get(target, property, receiver);
    },
  });
}

interface SetupOptions {
  dryRun: boolean;
  desktopUpdates?: DesktopUpdateController;
  installedRevision?: string | null;
  installedDesktopVersion?: string | null;
  sourceHost?: { onRequestUpdate: () => void };
  readyCandidateVersion?: string;
}

const ADOPTION_META_KEY = "provider-adoption-v1";
const HASH = "0".repeat(64);

function readyAdoption(version: string): AdoptionStatus {
  const requestId = crypto.randomUUID();
  const evidence = { evidenceSha256: HASH, nativeHashes: { claude: HASH, codex: HASH } };
  return {
    requestId, providers: PROVIDERS, base: INSTALLED_REVISION, runId: 1, phase: "ready", reason: null, updatedAt: 0,
    receipt: {
      protocol: 1, requestId, runId: 1, base: INSTALLED_REVISION, revision: INSTALLED_REVISION, version, providers: PROVIDERS, lockSha256: HASH,
      qualifications: { linux: evidence, mac: evidence },
      gates: { linux: "passed", mac: "passed", static: "passed" },
      artifacts: [{ name: `Atelier-v${version}-arm64.app.zip`, sha256: HASH }],
    },
  };
}

function setup(options: SetupOptions) {
  const system = new FakeSystemAdapter();
  const routeSystem = options.dryRun ? system : liveFakeSystem();
  if (!options.dryRun) {
    // NOTE(ali): Holding the update admission makes the route reuse the provider row snapshot, so no registry or native binary is probed.
    const release = routeSystem.sourceUpdateAdmission.tryAcquireUpdate();
    if (release) closers.push(release);
  }
  const db = createDatabase(":memory:");
  const store = new Store(db);
  store.createProject(FIXTURE_PROJECT_KEY, { label: "Test", repoPath: "/tmp/repo", baseBranch: "main", commitTimeoutMs: 60_000, defaultAutoMerge: false, defaultAddScreenshots: false });
  initProjectRegistry(store);
  if (options.readyCandidateVersion !== undefined) store.setMeta(ADOPTION_META_KEY, JSON.stringify(readyAdoption(options.readyCandidateVersion)));
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
  const ticketOperations = createTicketOperations({ store, hub, lifecycle, slots, feasibility });
  const atelier = new AtelierManager({ store, hub, sessionHub, system, snapshots, ticketOperations, flushIntervalMs: 0 });
  const coordinator = new AgentCoordinator(store, hub, sessionHub, notifier, lifecycle, slots, triage, feasibility, split, delegation, atelier);
  const app = createApiRoutes({
    store, system: routeSystem, hub, sessionHub, lifecycle, triage, feasibility, split, slots, coordinator, atelier,
    reformulate: new ReformulateManager(store, system, hub, notifier, snapshots),
    feasibilityAnswers: new FeasibilityAnswerManager(store, system, hub),
    automations: new AutomationManager(store, system, hub),
    projectRoot: "/tmp", composerAvailable: true,
    ...(options.desktopUpdates ? { desktopUpdates: options.desktopUpdates } : {}),
    ...(options.sourceHost ? { repoRoot: "/tmp/repo", onRequestUpdate: options.sourceHost.onRequestUpdate } : {}),
    ...(options.installedRevision !== undefined ? { installedRevision: options.installedRevision } : {}),
    ...(options.installedDesktopVersion !== undefined ? { installedDesktopVersion: options.installedDesktopVersion } : {}),
  });
  closers.push(async () => {
    atelier.stop();
    sessionHub.disconnectAll();
    await sessionHub.drainClosingSessions();
    db.close();
  });
  return async (query = "") => {
    const response = await app.handle(new Request(`http://localhost/api/provider-updates${query}`));
    expect(response.status).toBe(200);
    return providerUpdatesSchema.parse(await response.json());
  };
}

describe("F3-AC1 — /api/provider-updates reports the installed application version", () => {
  test("F3-AC1 — the Mac desktop reports its packaged semver as installed", async () => {
    const { controller } = spyDesktopUpdates();
    const read = setup({ dryRun: true, desktopUpdates: controller, installedRevision: INSTALLED_REVISION, installedDesktopVersion: INSTALLED_DESKTOP_VERSION });
    const body = await read();
    expect(body.host).toBe("mac");
    expect(body.installed).toBe(INSTALLED_DESKTOP_VERSION);
  });

  test("F3-AC1 — the Mac desktop reports both installed and available outside the sandbox", async () => {
    const { controller } = spyDesktopUpdates();
    const read = setup({ dryRun: false, desktopUpdates: controller, installedRevision: INSTALLED_REVISION, installedDesktopVersion: INSTALLED_DESKTOP_VERSION });
    const body = await read();
    expect(body.host).toBe("mac");
    expect(body.installed).toBe(INSTALLED_DESKTOP_VERSION);
    expect(availableApplicationVersion(body)).toBe(AVAILABLE_DESKTOP_VERSION);
  });

  test("F3-AC1 — a source checkout reports its boot revision as installed", async () => {
    const read = setup({ dryRun: true, sourceHost: { onRequestUpdate: () => undefined }, installedRevision: INSTALLED_REVISION, installedDesktopVersion: INSTALLED_DESKTOP_VERSION });
    const body = await read();
    expect(body.host).toBe("source");
    expect(body.installed).toBe(INSTALLED_REVISION);
  });

  test("F3-AC1 — the VPS reports its release revision as installed", async () => {
    process.env[HOST_ROLE_ENV] = CLOUD_HOST_ROLE;
    const read = setup({ dryRun: true, installedRevision: INSTALLED_REVISION });
    const body = await read();
    expect(body.host).toBe("vps");
    expect(body.installed).toBe(INSTALLED_REVISION);
  });

  test("F3-AC1 — the installed field is present and null when no installed version is known", async () => {
    const { controller } = spyDesktopUpdates();
    const readDesktop = setup({ dryRun: true, desktopUpdates: controller, installedRevision: INSTALLED_REVISION, installedDesktopVersion: null });
    expect(await readDesktop()).toHaveProperty("installed", null);
    const readBrowser = setup({ dryRun: true });
    const body = await readBrowser();
    expect(body.host).toBe("browser");
    expect(body).toHaveProperty("installed", null);
  });
});

describe("F3-AC4 — the dry-run sandbox cannot confirm the application version", () => {
  test("F3-AC4 — the sandbox response yields « Vérification impossible », never « À jour »", async () => {
    const { controller } = spyDesktopUpdates();
    const read = setup({ dryRun: true, desktopUpdates: controller, installedDesktopVersion: INSTALLED_DESKTOP_VERSION });
    const body = await read();
    expect(body.simulated).toBe(true);
    expect(body.target).toBeNull();
    expect(applicationUpdateVerdict({ host: body.host, simulated: body.simulated, installed: body.installed, available: availableApplicationVersion(body) })).toEqual({ state: "unknown", reason: "simulated" });
  });
});

describe("F3-AC6 — showing the versions never installs, restarts or bypasses the check cache", () => {
  test("F3-AC6 — a plain read uses the cached desktop check and never prepares or installs", async () => {
    const { controller, check, prepare, install } = spyDesktopUpdates();
    const read = setup({ dryRun: false, desktopUpdates: controller, installedDesktopVersion: INSTALLED_DESKTOP_VERSION });
    const first = await read();
    const second = await read();
    expect(first.installed).toBe(INSTALLED_DESKTOP_VERSION);
    expect(second.installed).toBe(INSTALLED_DESKTOP_VERSION);
    expect(check).toHaveBeenCalledTimes(2);
    for (const [refresh] of check.mock.calls) expect(refresh === true).toBe(false);
    expect(prepare).not.toHaveBeenCalled();
    expect(install).not.toHaveBeenCalled();
  });

  test("F3-AC6 — only an explicit refresh bypasses the desktop check cache", async () => {
    const { controller, check, prepare, install } = spyDesktopUpdates();
    const read = setup({ dryRun: false, desktopUpdates: controller, installedDesktopVersion: INSTALLED_DESKTOP_VERSION });
    const body = await read("?refresh=1");
    expect(body.installed).toBe(INSTALLED_DESKTOP_VERSION);
    expect(check.mock.calls.map(([refresh]) => refresh)).toEqual([true]);
    expect(prepare).not.toHaveBeenCalled();
    expect(install).not.toHaveBeenCalled();
  });

  test("F3-AC6 — the sandbox read never contacts the desktop updater", async () => {
    const { controller, check, prepare, install } = spyDesktopUpdates();
    const read = setup({ dryRun: true, desktopUpdates: controller, installedDesktopVersion: INSTALLED_DESKTOP_VERSION });
    expect((await read()).installed).toBe(INSTALLED_DESKTOP_VERSION);
    expect(check).not.toHaveBeenCalled();
    expect(prepare).not.toHaveBeenCalled();
    expect(install).not.toHaveBeenCalled();
  });

  test("F3-AC6 — a source checkout read never requests the update restart", async () => {
    const onRequestUpdate = mock(() => undefined);
    const read = setup({ dryRun: true, sourceHost: { onRequestUpdate }, installedRevision: INSTALLED_REVISION });
    expect((await read()).installed).toBe(INSTALLED_REVISION);
    expect(onRequestUpdate).not.toHaveBeenCalled();
  });
});

describe("F3-AC3 — a provider-adoption candidate never masks a newer available version", () => {
  const INSTALLED_CANDIDATE_VERSION = "0.1.5";

  test("F3-AC3 — an already installed ready candidate leaves the host target in place", async () => {
    const { controller } = spyDesktopUpdates();
    const read = setup({ dryRun: false, desktopUpdates: controller, installedDesktopVersion: INSTALLED_CANDIDATE_VERSION, readyCandidateVersion: INSTALLED_CANDIDATE_VERSION });
    const body = await read();
    expect(availableApplicationVersion(body)).toBe(AVAILABLE_DESKTOP_VERSION);
    expect(applicationUpdateVerdict({ host: body.host, simulated: body.simulated, installed: body.installed, available: availableApplicationVersion(body) }).state).toBe("update_available");
  });

  test("F3-AC3 — a ready candidate not yet installed is still the proposed target", async () => {
    const { controller } = spyDesktopUpdates();
    const read = setup({ dryRun: false, desktopUpdates: controller, installedDesktopVersion: INSTALLED_DESKTOP_VERSION, readyCandidateVersion: INSTALLED_CANDIDATE_VERSION });
    const body = await read();
    expect(availableApplicationVersion(body)).toBe(INSTALLED_CANDIDATE_VERSION);
  });
});
