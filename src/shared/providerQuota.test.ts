import { describe, expect, test } from "bun:test";

import { isQuotaStale, normalizeEpochMs, providerQuotaSchema, QUOTA_STALE_AFTER_MS, quotaWindowPace } from "./providerQuota.ts";
import type { ProviderQuota, QuotaWindow } from "./providerQuota.ts";

const HOUR = 3_600_000;
const NOW = 1_800_000_000_000;

function window(usedPercent: number, overrides: Partial<QuotaWindow> = {}): QuotaWindow {
  // A 10h window halfway through.
  return { id: "w", kind: "session", model: null, usedPercent, windowDurationMins: 600, resetsAt: NOW + 5 * HOUR, ...overrides };
}

describe("quotaWindowPace", () => {
  test("flags usage ahead of elapsed time", () => {
    expect(quotaWindowPace(window(60), NOW)).toEqual({ elapsedPercent: 50, ahead: true });
  });

  test("stays in rhythm within the tolerance", () => {
    expect(quotaWindowPace(window(55), NOW)).toEqual({ elapsedPercent: 50, ahead: false });
  });

  test("is unknown without duration or reset time", () => {
    expect(quotaWindowPace(window(50, { windowDurationMins: null }), NOW)).toBeNull();
    expect(quotaWindowPace(window(50, { resetsAt: null }), NOW)).toBeNull();
  });

  test("clamps elapsed time", () => {
    expect(quotaWindowPace(window(10, { resetsAt: NOW - HOUR }), NOW)?.elapsedPercent).toBe(100);
  });
});

describe("isQuotaStale", () => {
  const quota: ProviderQuota = {
    provider: "claude", state: "ok", source: "live", observedAt: NOW, planType: null, windows: [], message: null,
  };

  test("fresh then stale past the threshold", () => {
    expect(isQuotaStale(quota, NOW + QUOTA_STALE_AFTER_MS)).toBe(false);
    expect(isQuotaStale(quota, NOW + QUOTA_STALE_AFTER_MS + 1)).toBe(true);
    expect(isQuotaStale({ ...quota, observedAt: null }, NOW)).toBe(true);
  });
});

test("the quota schema accepts token_without_limits and still parses older snapshots", () => {
  const snapshot = { provider: "claude", state: "no_data", source: "cache", observedAt: NOW, planType: "max", windows: [], message: null };
  expect(providerQuotaSchema.parse(snapshot).state).toBe("no_data");
  expect(providerQuotaSchema.parse({ ...snapshot, state: "token_without_limits" }).state).toBe("token_without_limits");
  expect(providerQuotaSchema.safeParse({ ...snapshot, state: "unknown" }).success).toBe(false);
});

test("normalizeEpochMs converts seconds", () => {
  expect(normalizeEpochMs(1_800_000_000)).toBe(NOW);
  expect(normalizeEpochMs(NOW)).toBe(NOW);
});
