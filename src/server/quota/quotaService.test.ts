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
  expect(result).toMatchObject({ state: "ok", source: "session", observedAt: NOW - 1000 });
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
  const result = await quotaService.read("claude");
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

test("not_applicable passes through without windows", async () => {
  const quotaService = service(async () => quota("claude", "not_applicable"));
  quotaService.recordClaudeRateLimit(SESSION_EVENT, NOW);
  expect(await quotaService.read("claude")).toMatchObject({ state: "not_applicable", windows: [], source: null });
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
