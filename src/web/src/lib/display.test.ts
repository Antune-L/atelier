import { describe, expect, test } from "bun:test";

import type { CodexRuntimeStatus } from "@shared/codexCapabilities";

import { isCodexFastAvailable } from "./display";

const runtime: CodexRuntimeStatus = {
  status: "ready",
  models: [
    {
      model: "gpt-5.6-terra",
      efforts: ["medium"],
      defaultEffort: "medium",
      serviceTiers: [{ id: "priority", name: "Fast", description: "Faster responses" }],
      defaultServiceTier: "default",
    },
    {
      model: "gpt-5.6-sol",
      efforts: ["medium"],
      defaultEffort: "medium",
      serviceTiers: [{ id: "default", name: "Default", description: "Standard responses" }],
      defaultServiceTier: "default",
    },
  ],
  checkedAt: 1,
  message: null,
};

describe("isCodexFastAvailable", () => {
  test("uses the selected model service-tier catalog", () => {
    expect(isCodexFastAvailable(runtime, "gpt-5.6-terra")).toBe(true);
    expect(isCodexFastAvailable(runtime, "gpt-5.6-sol")).toBe(false);
    expect(isCodexFastAvailable(runtime, "gpt-6-astra")).toBe(false);
  });

  test("does not expose FAST while the catalog is unavailable", () => {
    expect(isCodexFastAvailable({ ...runtime, status: "temporarily_unavailable" }, "gpt-5.6-terra")).toBe(false);
  });
});
