import { expect, test } from "bun:test";

import { profileSchema } from "@shared/schemas";

import { matchesCodexImplementer } from "./profileMatching";

const inheritedProfile = profileSchema.parse({
  id: "profile-1",
  name: "Codex",
  orchestrator: "codex",
  model: "opus",
  effort: "medium",
  implementerModel: "opus",
  implementerEffort: "low",
  implementer: "codex",
  codexModel: "gpt-5.6-terra",
  codexEffort: "high",
  codexFast: false,
  codexImplementerModel: null,
  codexImplementerEffort: null,
  codexImplementerFast: null,
  sortOrder: 0,
  createdAt: 1,
  updatedAt: 1,
});

test("profile matching distinguishes inherited FAST from explicit false", () => {
  expect(matchesCodexImplementer(inheritedProfile, {
    codexImplementerModel: null,
    codexImplementerEffort: null,
    codexImplementerFast: null,
  })).toBe(true);
  expect(matchesCodexImplementer(inheritedProfile, {
    codexImplementerModel: null,
    codexImplementerEffort: null,
    codexImplementerFast: false,
  })).toBe(false);
});
