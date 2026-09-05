import { describe, expect, test } from "bun:test";

import { codexRuntimeStatusSchema, isCodexFastServiceTier, pairedRuntimeCodexEffort } from "./codexCapabilities.ts";

describe("codexRuntimeStatusSchema", () => {
  test("accepts only product models and a default included in runtime efforts", () => {
    const valid = codexRuntimeStatusSchema.safeParse({
      status: "ready",
      models: [{
        model: "gpt-6-astra",
        efforts: ["low", "ultra"],
        defaultEffort: "low",
        serviceTiers: [{ id: "fast", name: "Fast", description: "Mode rapide" }],
        defaultServiceTier: null,
      }],
      checkedAt: 1,
      message: null,
    });
    expect(valid.success).toBe(true);

    const invalid = codexRuntimeStatusSchema.safeParse({
      status: "ready",
      models: [{ model: "gpt-5.5", efforts: ["low"], defaultEffort: "medium", serviceTiers: [], defaultServiceTier: null }],
      checkedAt: 1,
      message: null,
    });
    expect(invalid.success).toBe(false);
  });

  test("repairs an effort against the refreshed runtime model", () => {
    const runtime = codexRuntimeStatusSchema.parse({
      status: "ready",
      models: [{ model: "gpt-5.6-sol", efforts: ["low", "medium"], defaultEffort: "low", serviceTiers: [], defaultServiceTier: null }],
      checkedAt: 1,
      message: null,
    });
    expect(pairedRuntimeCodexEffort(runtime, "gpt-5.6-sol", "ultra")).toBe("low");
  });

  test("represents checking, missing models and temporary outages distinctly", () => {
    for (const status of ["checking", "model_unavailable", "temporarily_unavailable"]) {
      expect(
        codexRuntimeStatusSchema.safeParse({ status, models: [], checkedAt: 1, message: "état explicite" }).success,
      ).toBe(true);
    }
  });
});


test("FAST recognizes runtime priority and fast but never arbitrary labels or missing tiers", () => {
  expect(isCodexFastServiceTier("priority")).toBe(true);
  expect(isCodexFastServiceTier("fast")).toBe(true);
  for (const tier of [null, "default", "flex", "Fast", "unknown"]) {
    expect(isCodexFastServiceTier(tier)).toBe(false);
  }
});
