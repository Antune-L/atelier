import { describe, expect, test } from "bun:test";

import { branchMatchesFilters, workflowRunsOnPullRequestsTo } from "./repositoryProbe.ts";

describe("workflowRunsOnPullRequestsTo", () => {
  test("a bare pull_request trigger covers every target branch", () => {
    expect(workflowRunsOnPullRequestsTo({ on: "pull_request" }, "campaign/x")).toBe(true);
    expect(workflowRunsOnPullRequestsTo({ on: ["push", "pull_request"] }, "campaign/x")).toBe(true);
    expect(workflowRunsOnPullRequestsTo({ on: { pull_request: null } }, "campaign/x")).toBe(true);
  });

  test("branch filters decide whether pull requests to the mother branch run CI", () => {
    expect(workflowRunsOnPullRequestsTo({ on: { pull_request: { branches: ["main"] } } }, "campaign/x")).toBe(false);
    expect(workflowRunsOnPullRequestsTo({ on: { pull_request: { branches: ["main", "campaign/**"] } } }, "campaign/abc-night")).toBe(true);
    expect(workflowRunsOnPullRequestsTo({ on: { pull_request: { "branches-ignore": ["campaign/*"] } } }, "campaign/x")).toBe(false);
    expect(workflowRunsOnPullRequestsTo({ on: { push: { branches: ["campaign/**"] } } }, "campaign/x")).toBe(false);
  });

  test("negated patterns exclude previously matched branches", () => {
    expect(branchMatchesFilters("campaign/x", ["**", "!campaign/*"])).toBe(false);
    expect(branchMatchesFilters("feat/x", ["*"])).toBe(false);
  });
});
