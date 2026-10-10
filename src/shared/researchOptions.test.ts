import { describe, expect, test } from "bun:test";

import { DEFAULT_RESEARCH_OPTIONS, researchOptionsFromKeys, researchOptionsSchema } from "./schemas.ts";

describe("researchOptionsSchema", () => {
  test("legacy JSON without adversarialReview keeps its four choices", () => {
    const legacy = JSON.parse('{"feasibility":false,"howTo":true,"externalDocs":false,"duplicates":true}');
    expect(researchOptionsSchema.parse(legacy)).toEqual({
      feasibility: false,
      howTo: true,
      externalDocs: false,
      duplicates: true,
      adversarialReview: false,
    });
  });

  test("the adversarial review is opt-in and round-trips through keys", () => {
    expect(DEFAULT_RESEARCH_OPTIONS.adversarialReview).toBe(false);
    expect(researchOptionsFromKeys(["adversarialReview"]).adversarialReview).toBe(true);
  });
});
