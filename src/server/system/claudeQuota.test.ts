import { expect, test } from "bun:test";

import { normalizeClaudeUsage, quotaWindowFromRateLimitEvent, readClaudeUsageLive } from "./claudeQuota.ts";

const NOW = 1_800_000_000_000;
const RESET_ISO = "2027-01-15T08:00:00.000Z";

const USAGE_FIXTURE = {
  session: { total_cost_usd: 1.2 },
  subscription_type: "max",
  rate_limits_available: true,
  rate_limits: {
    five_hour: { utilization: 42, resets_at: RESET_ISO },
    seven_day: { utilization: 63, resets_at: RESET_ISO },
    seven_day_opus: { utilization: null, resets_at: null },
    seven_day_sonnet: { utilization: 10, resets_at: null },
    model_scoped: [{ display_name: "Fable", utilization: 20, resets_at: RESET_ISO }],
    extra_usage: { is_enabled: false, monthly_limit: 50, used_credits: 0, utilization: 0 },
  },
};

test("get_usage maps rate limits to session, weekly and per-model windows in 0-100", () => {
  const quota = normalizeClaudeUsage(USAGE_FIXTURE, NOW);
  expect(quota).toMatchObject({ provider: "claude", state: "ok", source: "live", observedAt: NOW, planType: "max" });
  expect(quota.windows).toEqual([
    { id: "claude:five_hour", kind: "session", model: null, usedPercent: 42, windowDurationMins: 300, resetsAt: Date.parse(RESET_ISO) },
    { id: "claude:seven_day", kind: "weekly", model: null, usedPercent: 63, windowDurationMins: 10_080, resetsAt: Date.parse(RESET_ISO) },
    { id: "claude:seven_day_sonnet", kind: "weekly_model", model: "Sonnet", usedPercent: 10, windowDurationMins: 10_080, resetsAt: null },
    { id: "claude:model:Fable", kind: "weekly_model", model: "Fable", usedPercent: 20, windowDurationMins: 10_080, resetsAt: Date.parse(RESET_ISO) },
  ]);
});

test("an enabled extra usage becomes a monthly window", () => {
  const quota = normalizeClaudeUsage({ ...USAGE_FIXTURE, rate_limits: { extra_usage: { is_enabled: true, utilization: 30 } } }, NOW);
  expect(quota.windows).toEqual([{ id: "claude:extra_usage", kind: "monthly", model: null, usedPercent: 30, windowDurationMins: null, resetsAt: null }]);
});

test("an API key account (no rate limits, no subscription) is not applicable", () => {
  const quota = normalizeClaudeUsage({ subscription_type: null, rate_limits_available: false, rate_limits: null }, NOW);
  expect(quota.state).toBe("not_applicable");
  expect(quota.windows).toEqual([]);
});

test("a subscription without available rate limits is no_data", () => {
  expect(normalizeClaudeUsage({ subscription_type: "pro", rate_limits_available: false }, NOW).state).toBe("no_data");
  expect(normalizeClaudeUsage({ nope: true }, NOW).state).toBe("error");
});

test("a rate-limit event converts utilization 0-1 to a percentage with a ms reset", () => {
  const window = quotaWindowFromRateLimitEvent({ rateLimitType: "five_hour", utilization: 0.42, resetsAt: 1_800_003_600 });
  expect(window).toEqual({ id: "claude:five_hour", kind: "session", model: null, usedPercent: 42, windowDurationMins: 300, resetsAt: 1_800_003_600_000 });
  expect(quotaWindowFromRateLimitEvent({ rateLimitType: "seven_day_overage_included", utilization: 0.5, resetsAt: null })?.kind).toBe("weekly");
  expect(quotaWindowFromRateLimitEvent({ rateLimitType: "overage", utilization: 0.1, resetsAt: null })?.kind).toBe("monthly");
  expect(quotaWindowFromRateLimitEvent({ rateLimitType: null, utilization: 0.4, resetsAt: null })).toBeNull();
  expect(quotaWindowFromRateLimitEvent({ rateLimitType: "five_hour", utilization: null, resetsAt: null })).toBeNull();
});

test("the live read short-circuits on ANTHROPIC_API_KEY and closes the query", async () => {
  let started = false;
  const apiKey = await readClaudeUsageLive({
    environment: { ANTHROPIC_API_KEY: "sk-test" },
    resolveBinary: () => "/bin/claude",
    startQuery: () => {
      started = true;
      return { close: () => {} };
    },
  });
  expect(apiKey.state).toBe("not_applicable");
  expect(started).toBe(false);

  let closed = false;
  let options: unknown = null;
  const live = await readClaudeUsageLive({
    environment: {},
    resolveBinary: () => "/bin/claude",
    now: () => NOW,
    startQuery: () => ({
      usage_EXPERIMENTAL_MAY_CHANGE_DO_NOT_RELY_ON_THIS_API_YET: async (opts) => {
        options = opts;
        return USAGE_FIXTURE;
      },
      close: () => {
        closed = true;
      },
    }),
  });
  expect(live.state).toBe("ok");
  expect(options).toEqual({ skipBehaviors: true });
  expect(closed).toBe(true);

  const missing = await readClaudeUsageLive({ environment: {}, resolveBinary: () => "/bin/claude", startQuery: () => ({ close: () => {} }) });
  expect(missing).toMatchObject({ state: "no_data", message: "get_usage indisponible" });
  expect((await readClaudeUsageLive({ environment: {}, resolveBinary: () => null, startQuery: () => ({ close: () => {} }) })).state).toBe("error");
});

test("closes a hung get_usage query at the deadline", async () => {
  let closed = false;
  const result = await readClaudeUsageLive({
    environment: {},
    resolveBinary: () => "/bin/claude",
    timeoutMs: 10,
    startQuery: () => ({
      usage_EXPERIMENTAL_MAY_CHANGE_DO_NOT_RELY_ON_THIS_API_YET: () => new Promise<unknown>(() => {}),
      close: () => {
        closed = true;
      },
    }),
  });
  expect(result).toMatchObject({ state: "timeout", message: "Délai dépassé" });
  expect(closed).toBe(true);
});
