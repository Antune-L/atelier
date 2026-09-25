import { describe, expect, test } from "bun:test";

import { importNotionSchema } from "./schemas.ts";

describe("standalone action execution options", () => {
  test("keeps legacy clients valid and accepts Codex choices", () => {
    expect(importNotionSchema.safeParse({ url: "https://notion.so/example" }).success).toBe(true);
    expect(
      importNotionSchema.safeParse({
        url: "https://notion.so/example",
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
