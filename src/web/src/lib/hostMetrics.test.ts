import { describe, expect, test } from "bun:test";
import {
  CRITICAL_THRESHOLD_PERCENT,
  ELEVATED_THRESHOLD_PERCENT,
  formatGib,
  memPercent,
  usageLevel,
} from "./hostMetrics";

const GIB = 1024 ** 3;

describe("thresholds", () => {
  test("expose elevated and critical percentages", () => {
    expect(ELEVATED_THRESHOLD_PERCENT).toBe(60);
    expect(CRITICAL_THRESHOLD_PERCENT).toBe(85);
  });
});

describe("usageLevel", () => {
  test("returns unknown for missing values", () => {
    expect(usageLevel(null)).toBe("unknown");
    expect(usageLevel(Number.NaN)).toBe("unknown");
  });

  test("returns normal below the elevated threshold", () => {
    expect(usageLevel(0)).toBe("normal");
    expect(usageLevel(59.9)).toBe("normal");
  });

  test("returns elevated between the thresholds", () => {
    expect(usageLevel(60)).toBe("elevated");
    expect(usageLevel(84.9)).toBe("elevated");
  });

  test("returns critical from the critical threshold", () => {
    expect(usageLevel(85)).toBe("critical");
    expect(usageLevel(100)).toBe("critical");
  });
});

describe("memPercent", () => {
  test("returns 0 when total is not positive", () => {
    expect(memPercent(1, 0)).toBe(0);
  });

  test("computes the used ratio as a percentage", () => {
    expect(memPercent(2 * GIB, 8 * GIB)).toBe(25);
  });

  test("clamps to the 0-100 range", () => {
    expect(memPercent(9, 8)).toBe(100);
    expect(memPercent(-1, 8)).toBe(0);
  });
});

describe("formatGib", () => {
  test("rounds to one decimal", () => {
    expect(formatGib(3.14 * GIB, false)).toBe("3.1");
  });

  test("trims whole values only when requested", () => {
    expect(formatGib(8 * GIB, true)).toBe("8");
    expect(formatGib(8 * GIB, false)).toBe("8.0");
    expect(formatGib(7.96 * GIB, true)).toBe("8");
  });
});
