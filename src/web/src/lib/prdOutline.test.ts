import { describe, expect, test } from "bun:test";

import type { PrdOutlineEntry } from "@shared/prdMarkdown";

import { matchHeadingAnchors } from "./prdOutline";

const ENTRIES: PrdOutlineEntry[] = [
  { anchor: "prd-decisions", label: "Décisions attendues", heading: "Décisions attendues", level: 2, depth: 0 },
  { anchor: "prd-axis-A1", label: "A1 · Titre", heading: "A1 · Titre `code`", level: 2, depth: 0, prefix: "A1 · " },
  { anchor: "prd-task-T1", label: "T1 — Faire", heading: "T1 — Faire", level: 4, depth: 1, prefix: "T1 — " },
];

describe("matchHeadingAnchors", () => {
  test("assigns anchors in order by level and normalized text", () => {
    const headings = [
      { level: 1, text: "Titre du PRD" },
      { level: 2, text: "  Décisions\n attendues " },
      { level: 2, text: "A1 · Titre code" },
      { level: 3, text: "Tâches" },
      { level: 4, text: "T1 — Faire" },
    ];
    expect(matchHeadingAnchors(headings, ENTRIES)).toEqual([null, "prd-decisions", "prd-axis-A1", null, "prd-task-T1"]);
  });

  test("ignores headings at another level and leaves unmatched entries out", () => {
    const headings = [
      { level: 3, text: "Décisions attendues" },
      { level: 4, text: "T1 — Faire" },
    ];
    expect(matchHeadingAnchors(headings, ENTRIES)).toEqual([null, "prd-task-T1"]);
  });

  test("never assigns two anchors to the same heading", () => {
    const duplicate: PrdOutlineEntry[] = [ENTRIES[0], ENTRIES[0]].filter((entry) => entry !== undefined);
    const headings = [{ level: 2, text: "Décisions attendues" }];
    expect(matchHeadingAnchors(headings, duplicate)).toEqual(["prd-decisions"]);
  });
});
