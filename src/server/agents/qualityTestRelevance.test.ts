import { describe, expect, test } from "bun:test";

import { assessTestRelevance } from "./qualityTestRelevance.ts";

const observations = [
  { toolCallId: "feature-read", tool: "Read", input: { file_path: "src/cart.ts" }, ok: true, output: "return price * quantity" },
  { toolCallId: "test-read", tool: "Read", input: { file_path: "cart.test.ts" }, ok: true, output: "expect(total(10, 2)).toBe(20); expect(button.className).toBe('green')" },
];
const provenance = { provider: "claude", sessionId: "reviewer", artifactPath: "/repo/report.json" } satisfies Parameters<typeof assessTestRelevance>[3];
function response(assessment: "relevant" | "cosmetic" | "missing") {
  return { complete: true, rules: [{ rule: "Quantity changes the total", assessment, explanation: "Inspect the actual arithmetic assertions", feature: { toolCallId: "feature-read", path: "src/cart.ts", excerpt: "return price * quantity" }, tests: [{ toolCallId: "test-read", path: "cart.test.ts", excerpt: assessment === "relevant" ? "expect(total(10, 2)).toBe(20)" : "expect(button.className).toBe('green')" }] }] };
}

describe("independent test relevance attribution", () => {
  test("meaningful business assertion is reported separately from cosmetic assertions", () => {
    expect(assessTestRelevance(response("relevant"), observations, "/repo", provenance)).toMatchObject({ status: "passed", tested: [{ evidenceId: "feature-read", sessionId: "reviewer" }], improvements: [] });
    expect(assessTestRelevance(response("cosmetic"), observations, "/repo", provenance)).toMatchObject({ status: "failed", tested: [], improvements: [{ evidenceId: "feature-read" }] });
    expect(assessTestRelevance(response("missing"), observations, "/repo", provenance).status).toBe("failed");
  });
  test("invented excerpts, wrong paths and failed/discovery reads cannot certify relevance", () => {
    expect(assessTestRelevance(response("relevant"), [], "/repo", provenance).status).toBe("inconclusive");
    expect(assessTestRelevance(response("relevant"), observations.map((observation) => ({ ...observation, ok: false })), "/repo", provenance).status).toBe("inconclusive");
    expect(assessTestRelevance(response("relevant"), observations.map((observation) => ({ ...observation, tool: "Glob" })), "/repo", provenance).status).toBe("inconclusive");
    expect(assessTestRelevance(response("relevant"), observations.map((observation) => ({ ...observation, output: "unrelated assertion" })), "/repo", provenance).status).toBe("inconclusive");
    expect(assessTestRelevance(response("relevant"), observations.map((observation) => ({ ...observation, input: { file_path: "other.ts" } })), "/repo", provenance).status).toBe("inconclusive");
  });
  test("Codex command observations share the same contract; incomplete discovery stays incomplete", () => {
    const codex = observations.map((observation) => ({ ...observation, tool: "command_execution", input: { command: `cat ${observation.input.file_path}` } }));
    expect(assessTestRelevance(response("relevant"), codex, "/repo", { ...provenance, provider: "codex" }).status).toBe("passed");
    expect(assessTestRelevance({ ...response("relevant"), complete: false }, codex, "/repo", provenance).status).toBe("inconclusive");
    const absent = response("relevant");
    for (const rule of absent.rules) rule.tests = [];
    expect(assessTestRelevance(absent, observations, "/repo", provenance).status).toBe("inconclusive");
  });
  test("server attributes citations without provider-internal IDs and rejects ambiguous multi-file reads", () => {
    const output = { complete: true, rules: [{ rule: "Quantity updates total", assessment: "relevant", explanation: "Total assertion", covers: ["C01"], feature: { path: "src/cart.ts", excerpt: "return price * quantity" }, tests: [{ path: "cart.test.ts", excerpt: "expect(total(10, 2)).toBe(20)" }] }] };
    expect(assessTestRelevance(output, observations, "/repo", provenance, ["C01"]).status).toBe("passed");
    expect(assessTestRelevance(output, observations, "/repo", provenance, ["C01", "C02"]).status).toBe("inconclusive");
    const ambiguous = observations.map((observation) => ({ ...observation, tool: "command_execution", input: { command: `cat ${observation.input.file_path} unrelated.ts` } }));
    expect(assessTestRelevance(output, ambiguous, "/repo", provenance).status).toBe("inconclusive");
    const wrong = observations.map((observation) => ({ ...observation, input: { file_path: `${observation.input.file_path}.bak` } }));
    expect(assessTestRelevance(output, wrong, "/repo", provenance).status).toBe("inconclusive");
  });
});
