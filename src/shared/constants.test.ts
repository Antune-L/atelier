import { describe, expect, test } from "bun:test";

import { CODEX_EFFORTS, CODEX_MODELS, CODEX_MODEL_EFFORTS, pairedCodexEffort } from "./constants.ts";

describe("CODEX_MODEL_EFFORTS", () => {
  test("exposes exactly Astra, Sol, Luna and Terra, each with a prefix of the effort ladder", () => {
    expect(CODEX_MODELS).toEqual(["gpt-6-astra", "gpt-5.6-sol", "gpt-5.6-luna", "gpt-5.6-terra"]);
    for (const model of CODEX_MODELS) {
      const supported = CODEX_MODEL_EFFORTS[model];
      expect(supported).toEqual(CODEX_EFFORTS.slice(0, supported.length));
    }
  });

  test("caps Luna at max (no ultra)", () => {
    expect(CODEX_MODEL_EFFORTS["gpt-5.6-luna"]).toEqual(["low", "medium", "high", "xhigh", "max"]);
  });
});

describe("pairedCodexEffort", () => {
  test("keeps a supported effort as-is", () => {
    expect(pairedCodexEffort("gpt-5.6-terra", "ultra")).toBe("ultra");
    expect(pairedCodexEffort("gpt-6-astra", "medium")).toBe("medium");
    expect(pairedCodexEffort("gpt-5.6-sol", "max")).toBe("max");
  });

  test("clamps an unsupported effort to the model's strongest one", () => {
    expect(pairedCodexEffort("gpt-5.6-luna", "ultra")).toBe("max");
  });
});
