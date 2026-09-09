import { describe, expect, test } from "bun:test";

import type { ReviewFinding, ReviewKind } from "../../shared/protocol.ts";

import type { DimensionFinding } from "./reviewFindings.ts";
import {
  dedupeFindings,
  isSelfRefuting,
  keptFindings,
  looksFrench,
  reviewProseIsFrench,
  reviewPublicationEvent,
} from "./reviewFindings.ts";

function finding(overrides: Partial<ReviewFinding> & { id: string }): ReviewFinding {
  return {
    severity: "minor",
    summary: "A finding",
    evidence: "src/example.ts:12 shows the problem",
    ruleSource: null,
    path: "src/example.ts",
    line: 12,
    verificationStatus: "not_needed",
    originalSeverity: null,
    ...overrides,
  };
}

describe("looksFrench", () => {
  test("flags a French sentence", () => {
    expect(looksFrench("Le fichier ne respecte pas la convention du dépôt sur cette ligne.")).toBe(true);
  });

  test("flags unaccented French prose on stop words alone", () => {
    expect(looksFrench("Le composant est monte dans un ordre non deterministe")).toBe(true);
  });

  test("accepts English prose quoting a French UI string in backticks", () => {
    expect(looksFrench("The header still renders `« Région, ligue et comité »` verbatim.")).toBe(false);
  });

  test("accepts English prose quoting a French UI string in double quotes", () => {
    expect(looksFrench('The header still renders "« Région, ligue et comité »" verbatim.')).toBe(false);
  });

  test("accepts plain English prose", () => {
    expect(looksFrench("The handler returns before the transaction commits, so the row is lost.")).toBe(false);
  });
});

describe("reviewProseIsFrench", () => {
  test("flags a French finding summary inside an English review", () => {
    const result = {
      summary: "Two issues found.",
      findings: [finding({ id: "f1", summary: "Le nommage n'est pas conforme" })],
    };
    expect(reviewProseIsFrench(result)).toBe(true);
  });

  test("accepts a fully English review", () => {
    const result = {
      summary: "Two issues found.",
      findings: [finding({ id: "f1", summary: "Naming does not match the module convention" })],
    };
    expect(reviewProseIsFrench(result)).toBe(false);
  });
});

describe("self-refuting findings", () => {
  test("detects a conceded finding in the evidence", () => {
    expect(isSelfRefuting(finding({ id: "f1", evidence: "This branch may be unreachable." }))).toBe(true);
    expect(isSelfRefuting(finding({ id: "f2", summary: "Cosmetic only naming drift" }))).toBe(true);
    expect(isSelfRefuting(finding({ id: "f3", evidence: "Pre-existing on main, not a defect here." }))).toBe(true);
    expect(isSelfRefuting(finding({ id: "f4", evidence: "Ce comportement préexiste au diff." }))).toBe(true);
    expect(isSelfRefuting(finding({ id: "f5", summary: "Nice to have: extract the constant" }))).toBe(true);
  });

  test("keeps an actionable finding", () => {
    expect(isSelfRefuting(finding({ id: "f1", summary: "The refund amount is doubled" }))).toBe(false);
  });

  test("does not refute a finding whose evidence merely describes an optional argument", () => {
    expect(isSelfRefuting(finding({
      id: "f1",
      summary: "The retry loop never terminates",
      evidence: "src/example.ts:12 — the `timeout` argument is optional, so the loop has no bound.",
    }))).toBe(false);
  });

  test("does not refute on a bare marker word used descriptively", () => {
    expect(isSelfRefuting(finding({ id: "f1", evidence: "The latent state is never flushed." }))).toBe(false);
    expect(isSelfRefuting(finding({ id: "f2", summary: "The suggestion list is rendered twice" }))).toBe(false);
  });

  test("never refutes a critical finding, even on a marker hit", () => {
    expect(isSelfRefuting(finding({
      id: "f1",
      severity: "critical",
      summary: "Secret token written to the log",
      evidence: "Pre-existing and untouched, but the token still leaks.",
    }))).toBe(false);
  });
});

describe("dedupeFindings", () => {
  test("merges the same defect reported at nearby lines with rephrased titles", () => {
    const entries: DimensionFinding[] = [
      {
        kind: "logic",
        finding: finding({
          id: "f1",
          severity: "minor",
          summary: "Missing await on the store write",
          evidence: "short",
          path: "src/a.ts",
          line: 61,
        }),
      },
      {
        kind: "regression",
        finding: finding({
          id: "f2",
          severity: "major",
          summary: "The store write is missing an await",
          evidence: "src/a.ts:73 drops the promise and the row is never persisted",
          path: "src/a.ts",
          line: 73,
        }),
      },
    ];

    const merged = dedupeFindings(entries);

    expect(merged).toHaveLength(1);
    expect(merged[0]?.severity).toBe("major");
    expect(merged[0]?.line).toBe(73);
    expect(merged[0]?.evidence).toContain("drops the promise");
    expect(merged[0]?.evidence).toContain("Also flagged by: logic.");
  });

  test("keeps a genuinely different defect far away in the same file", () => {
    const entries: DimensionFinding[] = [
      { kind: "logic", finding: finding({ id: "f1", summary: "Missing await on the store write", line: 12 }) },
      { kind: "security", finding: finding({ id: "f2", summary: "Token logged in cleartext", line: 400 }) },
    ];
    expect(dedupeFindings(entries)).toHaveLength(2);
  });

  test("collapses four dimensions flagging the same anchor into one comment", () => {
    const kinds: ReviewKind[] = ["quality", "conventions", "architecture", "regression"];
    const entries: DimensionFinding[] = kinds.map((kind, index) => ({
      kind,
      finding: finding({
        id: `f${index}`,
        severity: index === 1 ? "major" : "minor",
        summary: `Mapper concern number ${index}`,
        evidence: `stripe.mapper.ts:352 detail ${"x".repeat(index)}`,
        path: "src/stripe.mapper.ts",
        line: 352,
      }),
    }));

    const merged = dedupeFindings(entries);

    expect(merged).toHaveLength(1);
    expect(merged[0]?.severity).toBe("major");
    expect(merged[0]?.evidence).toContain("Also flagged by: quality, architecture, regression.");
  });

  test("never publishes two comments on the same path:line", () => {
    const entries: DimensionFinding[] = [
      { kind: "logic", finding: finding({ id: "f1", summary: "Wrong currency conversion", line: 352 }) },
      { kind: "security", finding: finding({ id: "f2", summary: "Unvalidated webhook signature", line: 352 }) },
    ];
    const anchors = dedupeFindings(entries).map((item) => `${item.path}:${item.line}`);
    expect(new Set(anchors).size).toBe(anchors.length);
    expect(anchors).toHaveLength(1);
  });
});

describe("reviewPublicationEvent", () => {
  test("approves when nothing is kept", () => {
    expect(reviewPublicationEvent([])).toBe("APPROVE");
  });

  test("comments when only minor findings remain", () => {
    expect(reviewPublicationEvent([finding({ id: "f1", severity: "minor" })])).toBe("COMMENT");
  });

  test("requests changes on a major finding", () => {
    expect(reviewPublicationEvent([
      finding({ id: "f1", severity: "minor" }),
      finding({ id: "f2", severity: "major", line: 999 }),
    ])).toBe("REQUEST_CHANGES");
  });
});

describe("keptFindings", () => {
  test("drops rejected and self-refuting findings before deduplicating", () => {
    const entries: DimensionFinding[] = [
      { kind: "logic", finding: finding({ id: "f1", verificationStatus: "rejected", line: 10 }) },
      { kind: "quality", finding: finding({ id: "f2", summary: "Cosmetic only spacing", line: 20 }) },
      { kind: "security", finding: finding({ id: "f3", summary: "Signature never validated", line: 30 }) },
    ];
    expect(keptFindings(entries).map((item) => item.id)).toEqual(["f3"]);
  });

  test("publishes a critical finding whose evidence contains a concession phrase", () => {
    const entries: DimensionFinding[] = [
      {
        kind: "security",
        finding: finding({
          id: "f1",
          severity: "critical",
          summary: "Auth check bypassed on the admin route",
          evidence: "Pre-existing and untouched, yet the route is reachable unauthenticated.",
          line: 40,
        }),
      },
    ];
    expect(keptFindings(entries).map((item) => item.id)).toEqual(["f1"]);
  });
});
