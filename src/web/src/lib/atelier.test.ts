import { describe, expect, test } from "bun:test";

import { contextUsageSummary, formatTokenCount } from "./atelier";

describe("formatTokenCount", () => {
  test("formats with French decimals", () => {
    expect(formatTokenCount(850)).toBe("850");
    expect(formatTokenCount(45_210)).toBe("45,2k");
    expect(formatTokenCount(200_000)).toBe("200k");
    expect(formatTokenCount(1_250_000)).toBe("1,3M");
  });
});

describe("contextUsageSummary", () => {
  test("null without a live session", () => {
    expect(contextUsageSummary(null, 200_000)).toBeNull();
  });

  test("used / limit with percentage", () => {
    expect(contextUsageSummary(45_200, 200_000)).toEqual({
      label: "Contexte : 45,2k / 200k tokens (23 %)",
      percent: 23,
      warn: false,
    });
  });

  test("warns from 80 %", () => {
    expect(contextUsageSummary(160_000, 200_000)?.warn).toBe(true);
  });

  test("used only when the limit is unknown", () => {
    expect(contextUsageSummary(45_200, null)).toEqual({ label: "Contexte : 45,2k tokens", percent: null, warn: false });
  });
});
