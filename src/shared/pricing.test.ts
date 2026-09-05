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
