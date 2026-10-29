import { describe, expect, test } from "bun:test";

import { isQuotaStale, normalizeEpochMs, QUOTA_STALE_AFTER_MS, quotaWindowPace } from "./providerQuota.ts";
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

test("normalizeEpochMs converts seconds", () => {
  expect(normalizeEpochMs(1_800_000_000)).toBe(NOW);
  expect(normalizeEpochMs(NOW)).toBe(NOW);
});
