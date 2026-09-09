import { expect, test } from "bun:test";

import { settingSourcesForRole, workerToolsForRole } from "./sessionRolePolicy.ts";

test("worker tool catalogs are bounded by session role", () => {
  expect(workerToolsForRole("reviewer")).toEqual(["submit_review"]);
  expect(workerToolsForRole("triage")).toEqual(["ask_user", "submit_triage", "fail"]);
  expect(workerToolsForRole("feasibility")).toEqual(["submit_feasibility", "fail"]);
  expect(workerToolsForRole("split")).toEqual(["submit_split", "fail"]);
  expect(workerToolsForRole("implementer")).toEqual([]);
  expect(workerToolsForRole("scout")).toEqual([]);
  expect(workerToolsForRole("one-shot")).toEqual([]);
  expect(workerToolsForRole("orchestrator").length).toBeGreaterThan(0);
});

test("delegated review sessions never load the operator's global settings", () => {
  expect(settingSourcesForRole("reviewer")).toEqual(["project"]);
  expect(settingSourcesForRole("orchestrator")).toEqual(["user", "project"]);
  expect(settingSourcesForRole(undefined)).toEqual(["user", "project"]);
});
