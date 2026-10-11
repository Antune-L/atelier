import { describe, expect, test } from "bun:test";

import { formatTriageQuestion, parseTriageReport } from "./schemas.ts";

const base = { verdict: "needs_info", summary: "s", reasons: [], files: [] };

describe("triage questions", () => {
  test("legacy string questions parse to objects without a recommended answer", () => {
    const parsed = parseTriageReport(JSON.stringify({ ...base, questions: ["Quelle couleur ?"] }));
    expect(parsed?.questions).toEqual([{ question: "Quelle couleur ?", recommendedAnswer: null }]);
  });

  test("object questions round-trip with their recommended answer", () => {
    const questions = [
      { question: "Quelle couleur ?", recommendedAnswer: "Bleu" },
      { question: "Quel nom ?", recommendedAnswer: null },
    ];
    const parsed = parseTriageReport(JSON.stringify({ ...base, questions }));
    expect(parsed?.questions).toEqual(questions);
  });

  test("a blank recommended answer is normalized to null", () => {
    const parsed = parseTriageReport(
      JSON.stringify({ ...base, questions: [{ question: "Q ?", recommendedAnswer: "  " }, { question: "R ?" }] }),
    );
    expect(parsed?.questions).toEqual([
      { question: "Q ?", recommendedAnswer: null },
      { question: "R ?", recommendedAnswer: null },
    ]);
  });

  test("formatTriageQuestion appends the recommended answer when present", () => {
    expect(formatTriageQuestion({ question: "Q ?", recommendedAnswer: "R" })).toBe("Q ? (réponse conseillée : R)");
    expect(formatTriageQuestion({ question: "Q ?", recommendedAnswer: null })).toBe("Q ?");
  });
});
