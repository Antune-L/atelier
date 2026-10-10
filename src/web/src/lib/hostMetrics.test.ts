import { describe, expect, test } from "bun:test";

import { USAGE_LEVEL_LABELS, formatGib, memoryPercent, usageLevel } from "./hostMetrics";

const GIB = 1024 ** 3;

describe("usageLevel", () => {
  test("returns unknown for missing or invalid values", () => {
    expect(usageLevel(null)).toBe("unknown");
    expect(usageLevel(Number.NaN)).toBe("unknown");
  });

  test("returns normal below 60%", () => {
    expect(usageLevel(0)).toBe("normal");
    expect(usageLevel(59.9)).toBe("normal");
  });

  test("returns elevated from 60% to below 85%", () => {
    expect(usageLevel(60)).toBe("elevated");
    expect(usageLevel(84.9)).toBe("elevated");
  });

  test("returns critical from 85% upward", () => {
    expect(usageLevel(85)).toBe("critical");
    expect(usageLevel(100)).toBe("critical");
    expect(usageLevel(150)).toBe("critical");
  });
});

describe("memoryPercent", () => {
  test("returns 0 when the total is not positive", () => {
    expect(memoryPercent(GIB, 0)).toBe(0);
    expect(memoryPercent(GIB, -GIB)).toBe(0);
  });

  test("computes the used share of the total", () => {
    expect(memoryPercent(4 * GIB, 8 * GIB)).toBe(50);
  });

  test("clamps the result between 0 and 100", () => {
    expect(memoryPercent(16 * GIB, 8 * GIB)).toBe(100);
    expect(memoryPercent(-GIB, 8 * GIB)).toBe(0);
  });
});

describe("formatGib", () => {
  test("trims the decimal on whole values only when requested", () => {
    expect(formatGib(8 * GIB, true)).toBe("8");
    expect(formatGib(8 * GIB, false)).toBe("8.0");
  });

  test("keeps one decimal on fractional values", () => {
    expect(formatGib(3.46 * GIB, true)).toBe("3.5");
    expect(formatGib(3.46 * GIB, false)).toBe("3.5");
  });
});

describe("USAGE_LEVEL_LABELS", () => {
  test("maps each level to its French label", () => {
    expect(USAGE_LEVEL_LABELS).toEqual({
      unknown: "Indisponible",
      normal: "Normal",
      elevated: "Élevé",
      critical: "Critique",
    });
  });
});
