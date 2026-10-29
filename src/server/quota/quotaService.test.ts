import { expect, test } from "bun:test";

import type { ProviderQuota, QuotaProvider, QuotaWindow } from "../../shared/providerQuota.ts";
import { createDatabase } from "../db/schema.ts";
import { Store } from "../db/store.ts";
import { ProviderQuotaService } from "./quotaService.ts";
import type { ProviderQuotaPersistence } from "./quotaService.ts";

const NOW = 1_800_000_000_000;

function quota(provider: QuotaProvider, state: ProviderQuota["state"], windows: ProviderQuota["windows"] = []): ProviderQuota {
  return { provider, state, source: state === "ok" ? "live" : null, observedAt: NOW, planType: null, windows, message: null };
}

function memoryPersistence(): ProviderQuotaPersistence & { stored: Map<QuotaProvider, ProviderQuota> } {
  const stored = new Map<QuotaProvider, ProviderQuota>();
  return { stored, load: (provider) => stored.get(provider) ?? null, save: (provider, value) => stored.set(provider, value) };
}

function service(claude: () => Promise<ProviderQuota>, persistence = memoryPersistence(), timeoutMs = 1000) {
  return new ProviderQuotaService({
    system: { readClaudeUsage: claude, readCodexQuota: async () => quota("codex", "ok", []) },
    persistence,
    now: () => NOW,
    timeoutMs,
  });
}

const SESSION_EVENT = { rateLimitType: "five_hour", utilization: 0.42, resetsAt: 1_800_003_600 };

test("without live data nor session event the result is no_data", async () => {
  const result = await service(async () => quota("claude", "no_data")).read("claude");
  expect(result).toMatchObject({ state: "no_data", message: "Aucune donnée de quota reçue", windows: [] });
});

test("a session rate-limit event is the fallback when the live read has no data", async () => {
  const persistence = memoryPersistence();
  const quotaService = service(async () => quota("claude", "no_data"), persistence);
  quotaService.recordClaudeRateLimit(SESSION_EVENT, NOW - 1000);
  const result = await quotaService.read("claude");
  expect(result).toMatchObject({ state: "no_data", message: "Aucune donnée de quota reçue", source: "session", observedAt: NOW - 1000 });
  expect(result.windows).toEqual([{ id: "claude:five_hour", kind: "session", model: null, usedPercent: 42, windowDurationMins: 300, resetsAt: 1_800_003_600_000 }]);
  expect(persistence.stored.get("claude")?.source).toBe("session");
});

test("a slow read times out within the timeout and keeps the last known windows", async () => {
  const quotaService = service(() => new Promise(() => {}), memoryPersistence(), 20);
  quotaService.recordClaudeRateLimit(SESSION_EVENT, NOW - 1000);
  const started = performance.now();
  const result = await quotaService.read("claude");
  expect(performance.now() - started).toBeLessThan(500);
  expect(result).toMatchObject({ state: "timeout", message: "Délai dépassé", source: "session" });
  expect(result.windows).toHaveLength(1);
});

test("a thrown error is an error state; persisted live data is shown as cache", async () => {
  const persistence = memoryPersistence();
  const window: QuotaWindow = { id: "claude:seven_day", kind: "weekly", model: null, usedPercent: 50, windowDurationMins: 10_080, resetsAt: null };
  persistence.stored.set("claude", quota("claude", "ok", [window]));
  const result = await service(async () => {
    throw new Error("boom");
  }, persistence).read("claude");
  expect(result).toMatchObject({ state: "error", message: "boom", source: "cache", windows: [window] });
});

test("a session event after a live read keeps the other live windows and stays the freshest fallback", async () => {
  const persistence = memoryPersistence();
  const weekly: QuotaWindow = { id: "claude:seven_day", kind: "weekly", model: null, usedPercent: 63, windowDurationMins: 10_080, resetsAt: null };
  const session: QuotaWindow = { id: "claude:five_hour", kind: "session", model: null, usedPercent: 10, windowDurationMins: 300, resetsAt: null };
  let live: () => Promise<ProviderQuota> = async () => quota("claude", "ok", [session, weekly]);
  const quotaService = service(() => live(), persistence);
  await quotaService.read("claude");
  quotaService.recordClaudeRateLimit(SESSION_EVENT, NOW + 1000);
  expect(persistence.stored.get("claude")?.windows.map((window) => window.id).sort()).toEqual(["claude:five_hour", "claude:seven_day"]);
  live = async () => {
    throw new Error("boom");
  };
  const result = await quotaService.read("claude", { force: true });
  expect(result).toMatchObject({ state: "error", source: "session", observedAt: NOW + 1000 });
  expect(result.windows.find((window) => window.id === "claude:five_hour")?.usedPercent).toBe(42);
  expect(result.windows.find((window) => window.id === "claude:seven_day")?.usedPercent).toBe(63);
});

test("merging a session event drops carried windows that already reset", async () => {
  const persistence = memoryPersistence();
  const expired: QuotaWindow = { id: "claude:seven_day", kind: "weekly", model: null, usedPercent: 80, windowDurationMins: 10_080, resetsAt: NOW };
  const quotaService = service(async () => quota("claude", "ok", [expired]), persistence);
  await quotaService.read("claude");
  quotaService.recordClaudeRateLimit(SESSION_EVENT, NOW + 1000);
  expect(persistence.stored.get("claude")?.windows.map((window) => window.id)).toEqual(["claude:five_hour"]);
});

test("token_without_limits keeps the last known windows with their source, age and the live message", async () => {
  const message = "Jeton d'abonnement (CLAUDE_CODE_OAUTH_TOKEN) sans accès aux limites : reconnecte Claude";
  const quotaService = service(async () => ({ ...quota("claude", "token_without_limits"), message }));
  quotaService.recordClaudeRateLimit(SESSION_EVENT, NOW - 5000);
  const result = await quotaService.read("claude");
  expect(result).toMatchObject({ state: "token_without_limits", source: "session", observedAt: NOW - 5000, message });
  expect(result.windows).toHaveLength(1);
});

test("token_without_limits without known windows is an empty quota with the live message", async () => {
  const result = await service(async () => ({ ...quota("claude", "token_without_limits"), message: "jeton" })).read("claude");
  expect(result).toMatchObject({ state: "token_without_limits", source: null, windows: [], message: "jeton" });
});

test("a persisted snapshot is shown as cache on no_data", async () => {
  const persistence = memoryPersistence();
  const window: QuotaWindow = { id: "claude:seven_day", kind: "weekly", model: null, usedPercent: 50, windowDurationMins: 10_080, resetsAt: null };
  persistence.stored.set("claude", { ...quota("claude", "ok", [window]), observedAt: NOW - 60_000 });
  const result = await service(async () => quota("claude", "no_data"), persistence).read("claude");
  expect(result).toMatchObject({ state: "no_data", source: "cache", observedAt: NOW - 60_000, windows: [window] });
});

test("not_applicable passes through without windows", async () => {
  const quotaService = service(async () => quota("claude", "not_applicable"));
  quotaService.recordClaudeRateLimit(SESSION_EVENT, NOW);
  expect(await quotaService.read("claude")).toMatchObject({ state: "not_applicable", windows: [], source: null });
});

const PROVIDERS: QuotaProvider[] = ["claude", "codex"];

function liveWindow(provider: QuotaProvider): QuotaWindow {
  return { id: `${provider}:weekly`, kind: "weekly", model: null, usedPercent: 30, windowDurationMins: 10_080, resetsAt: null };
}

/** Service whose both providers go through `read`, counting adapter calls, with a controllable clock. */
function countingService(provider: QuotaProvider, initial: () => Promise<ProviderQuota>, timeoutMs = 1000) {
  const clock = { now: NOW };
  const calls = { count: 0 };
  let next = initial;
  const adapter = () => {
    calls.count += 1;
    return next();
  };
  const fallback = async () => quota(provider === "claude" ? "codex" : "claude", "ok");
  const quotaService = new ProviderQuotaService({
    system: provider === "claude" ? { readClaudeUsage: adapter, readCodexQuota: fallback } : { readClaudeUsage: fallback, readCodexQuota: adapter },
    persistence: memoryPersistence(),
    now: () => clock.now,
    timeoutMs,
  });
  return {
    quotaService,
    clock,
    calls,
    setLive: (live: () => Promise<ProviderQuota>) => {
      next = live;
    },
  };
}

for (const provider of PROVIDERS) {
  test(`${provider}: concurrent reads share one adapter call`, async () => {
    let resolve: (value: ProviderQuota) => void = () => {};
    const { quotaService, calls } = countingService(provider, () => new Promise((settle) => (resolve = settle)));
    const first = quotaService.read(provider);
    const second = quotaService.read(provider, { force: true });
    resolve(quota(provider, "ok", [liveWindow(provider)]));
    const results = await Promise.all([first, second]);
    expect(calls.count).toBe(1);
    expect(results.map((result) => result.source)).toEqual(["live", "live"]);
  });

  test(`${provider}: a read after a timeout reuses the still running adapter call`, async () => {
    let resolve: (value: ProviderQuota) => void = () => {};
    const { quotaService, calls } = countingService(provider, () => new Promise((settle) => (resolve = settle)), 20);
    expect(await quotaService.read(provider)).toMatchObject({ state: "timeout" });
    const second = quotaService.read(provider);
    resolve(quota(provider, "ok", [liveWindow(provider)]));
    expect(await second).toMatchObject({ state: "ok", source: "live" });
    expect(calls.count).toBe(1);
  });

  test(`${provider}: a recent ok live read is reused unless forced or older than 60 s`, async () => {
    const { quotaService, calls, clock } = countingService(provider, async () => quota(provider, "ok", [liveWindow(provider)]));
    await quotaService.read(provider);
    expect(calls.count).toBe(1);
    clock.now = NOW + 59_000;
    expect(await quotaService.read(provider)).toMatchObject({ state: "ok", source: "cache", windows: [liveWindow(provider)] });
    expect(calls.count).toBe(1);
    expect(await quotaService.read(provider, { force: true })).toMatchObject({ source: "live" });
    expect(calls.count).toBe(2);
    clock.now = NOW + 59_000 + 60_000;
    expect(await quotaService.read(provider)).toMatchObject({ source: "live" });
    expect(calls.count).toBe(3);
  });

  test(`${provider}: last() only returns a usable known quota`, async () => {
    const { quotaService, setLive } = countingService(provider, async () => quota(provider, "ok", [liveWindow(provider)]));
    expect(quotaService.last(provider)).toBeNull();
    await quotaService.read(provider);
    expect(quotaService.last(provider)).toMatchObject({ state: "ok", source: "cache", windows: [liveWindow(provider)] });
    setLive(async () => quota(provider, "unauthenticated"));
    await quotaService.read(provider, { force: true });
    expect(quotaService.last(provider)).toBeNull();
  });

  test(`${provider}: an account change on a shared read empties the quota and last()`, async () => {
    let resolve: (value: ProviderQuota) => void = () => {};
    const { quotaService, setLive } = countingService(provider, async () => ({
      ...quota(provider, "ok", [liveWindow(provider)]),
      accountEmail: "a@example.com",
    }));
    await quotaService.read(provider);
    setLive(() => new Promise((settle) => (resolve = settle)));
    const first = quotaService.read(provider, { force: true });
    const second = quotaService.read(provider, { force: true });
    resolve({ ...quota(provider, "error"), message: "boom", accountEmail: "b@example.com" });
    for (const result of await Promise.all([first, second])) {
      expect(result).toMatchObject({ state: "error", source: null, windows: [] });
    }
    expect(quotaService.last(provider)).toBeNull();
  });
}

test("last() returns a session-sourced quota after a Claude rate-limit event", () => {
  const quotaService = service(async () => quota("claude", "no_data"));
  quotaService.recordClaudeRateLimit(SESSION_EVENT, NOW);
  expect(quotaService.last("claude")).toMatchObject({ source: "session", state: "ok" });
});

test("store persistence round-trips a snapshot and rejects invalid JSON", () => {
  const db = createDatabase(":memory:");
  try {
    const store = new Store(db);
    const value = quota("codex", "ok", [{ id: "codex:primary", kind: "session", model: null, usedPercent: 35, windowDurationMins: 300, resetsAt: NOW }]);
    store.saveProviderQuotaSnapshot("codex", value);
    expect(store.getProviderQuotaSnapshot("codex")).toEqual(value);
    expect(store.getProviderQuotaSnapshot("claude")).toBeNull();
    store.setMeta("provider_quota:claude", "{not json");
    expect(store.getProviderQuotaSnapshot("claude")).toBeNull();
  } finally {
    db.close();
  }
});
