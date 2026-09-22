import { describe, expect, test } from "bun:test";

import { costOf, summarizeSessionCosts } from "./pricing.ts";

const USAGE = {
  input_tokens: 1_000_000,
  output_tokens: 0,
  cache_creation_input_tokens: 0,
  cache_read_input_tokens: 0,
};

describe("nullable pricing", () => {
  test("does not invent a zero price for an unknown model", () => {
    expect(costOf({ "gpt-6-astra": USAGE })).toBeNull();
  });

  test("marks mixed known and unknown costs as partial", () => {
    expect(summarizeSessionCosts({ one: { "claude-opus": USAGE, "gpt-5.6-sol": USAGE } })).toEqual({
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
