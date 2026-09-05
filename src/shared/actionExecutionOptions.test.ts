import { describe, expect, test } from "bun:test";

import { generatePrdSchema, importNotionSchema } from "./schemas.ts";

describe("standalone action execution options", () => {
  test("keeps legacy clients valid and accepts Codex choices", () => {
    expect(generatePrdSchema.safeParse({ description: "Besoin" }).success).toBe(true);
    expect(
      generatePrdSchema.safeParse({
        description: "Besoin",
        orchestrator: "codex",
        codexModel: "gpt-5.6-sol",
        codexEffort: "low",
      }).success,
    ).toBe(true);
  });

  test("rejects options from the other engine", () => {
    expect(
      importNotionSchema.safeParse({
        url: "https://notion.so/example",
        orchestrator: "codex",
        model: "opus",
      }).success,
    ).toBe(false);
  });
});
