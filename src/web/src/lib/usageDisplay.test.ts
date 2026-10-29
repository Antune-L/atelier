import { describe, expect, test } from "bun:test";

import type { ProviderQuota, QuotaWindow } from "@shared/providerQuota";

import {
  filteredProviders,
  formatAgo,
  formatCostOrUnpriced,
  formatDayLabel,
  formatRemaining,
  paceText,
  quotaAgeText,
  quotaStateMessage,
  quotaWindowLabel,
  resetCountdownText,
  sessionCountText,
  sharePercent,
  showsLastKnownWindows,
  usageBarClass,
  USAGE_PERIOD_LABELS,
} from "./usageDisplay";

const MIN = 60_000;

function window(overrides: Partial<QuotaWindow>): QuotaWindow {
  return { id: "w", kind: "session", model: null, usedPercent: 10, windowDurationMins: null, resetsAt: null, ...overrides };
}

function quota(overrides: Partial<ProviderQuota>): ProviderQuota {
  return { provider: "claude", state: "ok", source: "live", observedAt: 0, planType: null, windows: [], message: null, ...overrides };
}

describe("formatRemaining", () => {
  test("minutes, hours and days", () => {
    expect(formatRemaining(5 * MIN)).toBe("5 min");
    expect(formatRemaining(134 * MIN)).toBe("2 h 14 min");
    expect(formatRemaining(120 * MIN)).toBe("2 h");
    expect(formatRemaining((3 * 24 + 4) * 60 * MIN)).toBe("3 j 4 h");
    expect(formatRemaining(-10)).toBe("1 min");
  });

  test("countdown text", () => {
    expect(resetCountdownText(134 * MIN, 0)).toBe("Réinitialisation dans 2 h 14 min");
  });
});

describe("formatAgo", () => {
  test("relative ages", () => {
    expect(formatAgo(0, 30_000)).toBe("à l'instant");
    expect(formatAgo(0, 12 * MIN)).toBe("il y a 12 min");
    expect(formatAgo(0, 3 * 60 * MIN)).toBe("il y a 3 h");
    expect(formatAgo(0, 2 * 24 * 60 * MIN)).toBe("il y a 2 j");
  });
});

describe("quotaWindowLabel", () => {
  test("labels each kind", () => {
    expect(quotaWindowLabel(window({ kind: "session" }))).toBe("Session");
    expect(quotaWindowLabel(window({ kind: "weekly" }))).toBe("Hebdomadaire");
    expect(quotaWindowLabel(window({ kind: "weekly_model", model: "Opus" }))).toBe("Hebdomadaire · Opus");
    expect(quotaWindowLabel(window({ kind: "monthly" }))).toBe("Mensuel");
    expect(quotaWindowLabel(window({ kind: "credit" }))).toBe("Crédit mensuel");
  });
});

describe("paceText", () => {
  test("ahead or on pace", () => {
    expect(paceText({ elapsedPercent: 40, ahead: true })).toBe("en avance");
    expect(paceText({ elapsedPercent: 40, ahead: false })).toBe("dans le rythme");
  });
});

describe("quotaStateMessage", () => {
  test("per state and provider", () => {
    expect(quotaStateMessage(quota({}))).toBeNull();
    expect(quotaStateMessage(quota({ state: "not_applicable" }))).toContain("clé API");
    expect(quotaStateMessage(quota({ state: "not_applicable", provider: "codex" }))).toBe("Non disponible pour ce type de compte.");
    expect(quotaStateMessage(quota({ state: "timeout" }))).toBe("Délai dépassé.");
    expect(quotaStateMessage(quota({ state: "error", message: "boom" }))).toBe("boom");
  });
});

describe("token_without_limits and last known windows", () => {
  test("reconnect message", () => {
    expect(quotaStateMessage(quota({ state: "token_without_limits" }))).toContain("reconnecte Claude");
  });

  test("states keeping the last windows", () => {
    for (const state of ["token_without_limits", "error", "timeout", "no_data"] as const) {
      expect(showsLastKnownWindows(quota({ state }))).toBe(true);
    }
    expect(showsLastKnownWindows(quota({ state: "ok" }))).toBe(false);
    expect(showsLastKnownWindows(quota({ state: "not_applicable" }))).toBe(false);
  });

  test("age with source", () => {
    expect(quotaAgeText(quota({ source: "session", observedAt: 0 }), 12 * MIN)).toBe("il y a 12 min · session");
    expect(quotaAgeText(quota({ source: "cache", observedAt: 0 }), 3 * 60 * MIN)).toBe("il y a 3 h · cache");
    expect(quotaAgeText(quota({ source: "live", observedAt: 0 }), MIN)).toBeNull();
    expect(quotaAgeText(quota({ source: null, observedAt: null }), MIN)).toBeNull();
  });
});

describe("periods and formatting", () => {
  test("period labels", () => {
    expect(USAGE_PERIOD_LABELS).toEqual({ "24h": "24 h", "7d": "7 j", "30d": "30 j", "90d": "90 j" });
  });

  test("provider filter, unpriced cost, day label and session count", () => {
    expect(filteredProviders("all")).toEqual(["claude", "codex"]);
    expect(filteredProviders("codex")).toEqual(["codex"]);
    expect(formatCostOrUnpriced(null, String)).toBe("non tarifé");
    expect(formatCostOrUnpriced(0, String)).toBe("0");
    expect(formatDayLabel("2026-10-12")).toBe("12 oct.");
    expect(sessionCountText(1)).toBe("1 session");
    expect(sessionCountText(3)).toBe("3 sessions");
  });
});

describe("helpers", () => {
  test("bar color and share", () => {
    expect(usageBarClass(95)).toBe("bg-danger");
    expect(usageBarClass(80)).toBe("bg-warning");
    expect(usageBarClass(10)).toBe("bg-info");
    expect(sharePercent(1, 4)).toBe(25);
    expect(sharePercent(1, 0)).toBe(0);
  });
});
