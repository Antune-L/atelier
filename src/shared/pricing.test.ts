import { describe, expect, test } from "bun:test";

import { costBreakdownOfModel, costOf, costOfExecutionUsage, isPricedModel, providerOfModel, summarizeSessionCosts } from "./pricing.ts";

const USAGE = {
  input_tokens: 1_000_000,
  output_tokens: 0,
  cache_creation_input_tokens: 0,
  cache_read_input_tokens: 0,
};

describe("nullable pricing", () => {
  test("does not invent a zero price for an unknown model", () => {
    expect(costOf({ "gpt-7-preview": USAGE })).toBeNull();
  });

  test("marks mixed known and unknown costs as partial", () => {
    expect(summarizeSessionCosts({ one: { "claude-opus": USAGE, "gpt-7-preview": USAGE } })).toEqual({
      costUsd: null,
      knownCostUsd: 5,
      partial: true,
    });
  });
});

describe("per-model pricing overrides", () => {
  test("prices dated Opus 5.5 ids at the Opus 5.5 input rate", () => {
    expect(costOf({ "claude-opus-5-5-20260915": USAGE })).toBe(4);
  });

  test("keeps Opus 5 on the opus family rate", () => {
    expect(costOf({ "claude-opus-5": USAGE })).toBe(5);
  });

  test("prices Opus 5.5 cache reads at 0.05x input", () => {
    expect(costOf({ "claude-opus-5-5": { ...USAGE, input_tokens: 0, cache_read_input_tokens: 1_000_000 } })).toBeCloseTo(0.2);
  });
});

describe("GPT pricing", () => {
  const RUN = { inputTokens: 1_000_000, outputTokens: 1_000_000, cacheReadTokens: 400_000, cacheCreationTokens: 100_000, costUsd: null };

  test("bills uncached input, cached input, 30m writes and output separately", () => {
    // 500k × 2 + 400k × 0.10 + 100k × 2.5 + 1M × 10, per MTok.
    expect(costOfExecutionUsage("gpt-6.1-sol", RUN, false)).toBeCloseTo(1 + 0.04 + 0.25 + 10, 10);
    expect(costOfExecutionUsage("gpt-6.1-sol", RUN, true)).toBeCloseTo(2 + 0.08 + 0.5 + 20, 10);
  });

  test("resolves dated ids and prices gpt-6-sol at the 6.1 Sol rates", () => {
    expect(isPricedModel("gpt-6.1-sol-2026-09-01")).toBe(true);
    expect(costOfExecutionUsage("gpt-6-sol", RUN, false)).toBe(costOfExecutionUsage("gpt-6.1-sol", RUN, false));
    expect(costOfExecutionUsage("gpt-6-sol", RUN, true)).toBe(costOfExecutionUsage("gpt-6.1-sol", RUN, true));
    expect(isPricedModel("gpt-6-solar")).toBe(false);
    expect(costOfExecutionUsage("gpt-7-preview", RUN, false)).toBeNull();
  });

  test("prefers the SDK-reported cost", () => {
    expect(costOfExecutionUsage("gpt-7-preview", { ...RUN, costUsd: 7 }, true)).toBe(7);
  });

  test("legacy session usage gets standard GPT prices", () => {
    expect(costOf({ "gpt-6-astra": USAGE })).toBe(10);
  });

  test("breakdown matches the total and ignores FAST for Claude", () => {
    const tokens = { input: 1_000_000, output: 1_000_000, cacheRead: 400_000, cacheCreate: 100_000 };
    const gpt = costBreakdownOfModel("gpt-6.1-sol", tokens, false);
    expect(gpt?.input).toBeCloseTo(1, 10);
    expect(costBreakdownOfModel("sonnet", tokens, true)).toEqual(costBreakdownOfModel("sonnet", tokens, false));
  });

  test("attributes providers", () => {
    expect(providerOfModel("GPT-6-luna")).toBe("codex");
    expect(providerOfModel("my-codex-mini")).toBe("codex");
    expect(providerOfModel("claude-opus-5-5")).toBe("claude");
    expect(providerOfModel("unknown", "codex")).toBe("codex");
  });
});
