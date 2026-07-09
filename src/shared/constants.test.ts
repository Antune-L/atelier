import { describe, expect, test } from "bun:test";

import { CODEX_EFFORTS, CODEX_MODELS, CODEX_MODEL_EFFORTS, pairedCodexEffort } from "./constants.ts";

describe("CODEX_MODEL_EFFORTS", () => {
  test("every model's supported efforts form a non-empty prefix of CODEX_EFFORTS", () => {
    for (const model of CODEX_MODELS) {
      const supported = CODEX_MODEL_EFFORTS[model];
      expect(supported.length).toBeGreaterThan(0);
      // Prefix invariant: pairedCodexEffort clamps by taking the LAST supported entry, which is only
      // "the strongest" if the list follows CODEX_EFFORTS order from the start.
      expect(supported).toEqual(CODEX_EFFORTS.slice(0, supported.length));
    }
  });

  test("catalog facts: ultra is Terra-only, max needs a 5.6 model", () => {
    expect(CODEX_MODEL_EFFORTS["gpt-5.6-terra"]).toContain("ultra");
    expect(CODEX_MODEL_EFFORTS["gpt-5.6-luna"]).not.toContain("ultra");
    expect(CODEX_MODEL_EFFORTS["gpt-5.6-luna"]).toContain("max");
    expect(CODEX_MODEL_EFFORTS["gpt-5.5"]).not.toContain("max");
  });
});

describe("pairedCodexEffort", () => {
  test("keeps a supported effort as-is", () => {
    expect(pairedCodexEffort("gpt-5.6-terra", "ultra")).toBe("ultra");
    expect(pairedCodexEffort("gpt-5.5", "medium")).toBe("medium");
  });

  test("clamps an unsupported effort to the model's strongest one", () => {
    expect(pairedCodexEffort("gpt-5.6-luna", "ultra")).toBe("max");
    expect(pairedCodexEffort("gpt-5.5", "ultra")).toBe("xhigh");
    expect(pairedCodexEffort("gpt-5.4-mini", "max")).toBe("xhigh");
  });
});
