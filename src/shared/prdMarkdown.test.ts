import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { prdDocumentSchema } from "./prdDocument.ts";
import type { PrdDocument } from "./prdDocument.ts";
import { orderSelectedPrdTasks, renderPrdAxisBrief, prdOutline, renderPrdMarkdown, renderPrdSingleBrief, renderPrdTaskBrief } from "./prdMarkdown.ts";

const TEMPLATE_PATH = join(import.meta.dir, "..", "..", "vendor", "prd", "prd-template.json");

function loadTemplate(): PrdDocument {
  return prdDocumentSchema.parse(JSON.parse(readFileSync(TEMPLATE_PATH, "utf8")));
}

function loadRoadmap(): PrdDocument {
  const document = loadTemplate();
  return prdDocumentSchema.parse({
    ...document,
    roadmap: {
      milestones: [
        { id: "capture", title: "Capture searches", summary: "Persist the current search.", scope: ["Save searches"], acceptance: ["A saved search survives reload."] },
        { id: "restore", title: "Restore searches", summary: "Restore a persisted search.", scope: ["Restore searches"], acceptance: ["A saved search restores its filters."] },
      ],
      selectedMilestoneId: "restore",
    },
    tasks: document.tasks.map((task) => ({ ...task, milestoneId: task.id === "T1" ? "capture" : "restore", dependsOn: [] })),
  });
}

describe("prdDocumentSchema", () => {
  test("accepts the vendored template", () => {
    expect(prdDocumentSchema.safeParse(JSON.parse(readFileSync(TEMPLATE_PATH, "utf8"))).success).toBe(true);
  });

  test("rejects unknown fields", () => {
    expect(prdDocumentSchema.safeParse({ ...loadTemplate(), extra: true }).success).toBe(false);
  });

  test("rejects a requirement on an unknown axis and an axis without requirement", () => {
    const doc = loadTemplate();
    const requirements = doc.requirements.map((requirement) => ({ ...requirement, axis: "A1" }));
    const result = prdDocumentSchema.safeParse({ ...doc, requirements });
    expect(result.success).toBe(false);
    expect(result.error?.issues.some((issue) => issue.message.includes("A2"))).toBe(true);
  });

  test("rejects unknown, self and cyclic task dependencies", () => {
    const doc = loadTemplate();
    const withTasks = (dependencies: [string[], string[]]) => ({
      ...doc,
      tasks: doc.tasks.map((task, index) => ({ ...task, dependsOn: dependencies[index] ?? [] })),
    });
    expect(prdDocumentSchema.safeParse(withTasks([["T9"], []])).success).toBe(false);
    expect(prdDocumentSchema.safeParse(withTasks([["T1"], []])).success).toBe(false);
    expect(prdDocumentSchema.safeParse(withTasks([["T2"], ["T1"]])).success).toBe(false);
  });

  test("rejects duplicate task ids and blank text", () => {
    const doc = loadTemplate();
    const duplicated = { ...doc, tasks: doc.tasks.map((task) => ({ ...task, id: "T1", dependsOn: [] })) };
    expect(prdDocumentSchema.safeParse(duplicated).success).toBe(false);
    expect(prdDocumentSchema.safeParse({ ...doc, title: "   " }).success).toBe(false);
  });

  test("accepts optional roadmap milestones without adding branch dependencies", () => {
    const document = loadRoadmap();
    expect(document.roadmap?.selectedMilestoneId).toBe("restore");
    expect(document.tasks.every((task) => task.dependsOn.length === 0)).toBe(true);
    expect(orderSelectedPrdTasks(document, new Set(["T2"])).map((task) => task.id)).toEqual(["T2"]);
    expect(loadTemplate().roadmap).toBeUndefined();
    expect(loadTemplate().tasks.every((task) => task.milestoneId === undefined)).toBe(true);
  });

  test("rejects duplicate, absent and unknown roadmap references", () => {
    const document = loadRoadmap();
    const milestones = document.roadmap?.milestones ?? [];
    expect(prdDocumentSchema.safeParse({ ...document, roadmap: { milestones: [...milestones, ...milestones] } }).success).toBe(false);
    expect(prdDocumentSchema.safeParse({ ...document, roadmap: { milestones, selectedMilestoneId: "unknown" } }).success).toBe(false);
    expect(prdDocumentSchema.safeParse({ ...document, roadmap: { milestones: [] } }).success).toBe(false);
    expect(prdDocumentSchema.safeParse({ ...document, roadmap: undefined }).success).toBe(false);
    expect(prdDocumentSchema.safeParse({ ...document, tasks: document.tasks.map((task) => ({ ...task, milestoneId: "unknown" })) }).success).toBe(false);
  });
});

describe("renderPrdMarkdown", () => {
  test("renders decisions first, then the need, axes and per-axis details", () => {
    const markdown = renderPrdMarkdown(loadTemplate());
    expect(markdown.startsWith("# Saved catalogue searches\n\nsaved-searches · révision 1 · en\n")).toBe(true);
    const order = ["## Décisions attendues", "## Le besoin", "## Hors périmètre", "## Axes", "## A1 · Capture and persist a search", "## A2 · Restore a search accessibly", "## Contexte"];
    const positions = order.map((marker) => markdown.indexOf(marker));
    expect(positions.every((position) => position >= 0)).toBe(true);
    expect([...positions].sort((left, right) => left - right)).toEqual(positions);
    expect(markdown).toContain("#### FR1 — Save the current search (must)");
    expect(markdown).toContain("#### T2 — Restore a saved search");
    expect(markdown).toContain("**Dépend de :** T1");
    expect(markdown).toContain("- Should accounts have a maximum number of saved searches?");
  });

  test("is deterministic and says when nothing is expected", () => {
    const doc = { ...loadTemplate(), openQuestions: [], users: [] };
    const markdown = renderPrdMarkdown(doc);
    expect(markdown).toBe(renderPrdMarkdown(doc));
    expect(markdown).toContain("## Décisions attendues\n\nAucune");
    expect(markdown).not.toContain("### Utilisateurs");
  });

  test("renders the full roadmap, selected milestone, scope and acceptance", () => {
    const markdown = renderPrdMarkdown(loadRoadmap());
    expect(markdown).toContain("## Feuille de route");
    expect(markdown).toContain("**Jalon ciblé :** restore");
    expect(markdown).toContain("### Jalon capture — Capture searches");
    expect(markdown).toContain("### Jalon restore — Restore searches");
    expect(markdown).toContain("A saved search restores its filters.");
    expect(markdown).toContain("**Jalon :** capture");
  });
});

describe("prdOutline", () => {
  function headingLines(markdown: string): string[] {
    return markdown.split("\n").filter((line) => /^#{1,6} /.test(line));
  }

  function expectOutlineMatchesHeadings(doc: PrdDocument): void {
    const lines = headingLines(renderPrdMarkdown(doc));
    let cursor = 0;
    for (const entry of prdOutline(doc)) {
      const expected = `${"#".repeat(entry.level)} ${entry.heading}`;
      const index = lines.indexOf(expected, cursor);
      expect(index).toBeGreaterThanOrEqual(cursor);
      cursor = index + 1;
    }
  }

  test("lists every navigable heading in document order with stable anchors", () => {
    const doc = loadTemplate();
    expectOutlineMatchesHeadings(doc);
    const anchors = prdOutline(doc).map((entry) => entry.anchor);
    expect(anchors[0]).toBe("prd-decisions");
    expect(anchors[1]).toBe("prd-need");
    expect(anchors).toContain("prd-axis-A1");
    expect(anchors).toContain("prd-req-FR1");
    expect(anchors).toContain("prd-task-T2");
    expect(anchors[anchors.length - 1]).toBe("prd-context");
    expect(anchors).not.toContain("prd-roadmap");
    expect(new Set(anchors).size).toBe(anchors.length);
  });

  test("includes the roadmap and skips empty optional sections", () => {
    expectOutlineMatchesHeadings(loadRoadmap());
    expect(prdOutline(loadRoadmap()).map((entry) => entry.anchor)).toContain("prd-roadmap");
    const bare = { ...loadTemplate(), goals: [], users: [], userStories: [], designConsiderations: [], successMetrics: [], sources: [], preDraft: { reuse: [], sharedSurfaces: [], sourcePriority: [] } };
    expectOutlineMatchesHeadings(bare);
    const anchors = prdOutline(bare).map((entry) => entry.anchor);
    expect(anchors).not.toContain("prd-goals");
    expect(anchors).not.toContain("prd-context");
  });
});

describe("PRD briefs", () => {
  test("renders a task brief pointing at the PRD tab", () => {
    const brief = renderPrdTaskBrief(loadTemplate(), "T2");
    expect(brief).not.toBeNull();
    expect(brief).toContain("# T2 — Restore a saved search");
    expect(brief).toContain("onglet PRD");
    expect(brief).toContain("NFR1 — Keyboard access (must)");
    expect(renderPrdTaskBrief(loadTemplate(), "T9")).toBeNull();
  });

  test("renders an axis brief with its requirements and tasks", () => {
    const brief = renderPrdAxisBrief(loadTemplate(), "A1");
    expect(brief).toContain("# A1 — Capture and persist a search");
    expect(brief).toContain("### FR1 — Save the current search (must)");
    expect(brief).toContain("### T1 — Persist saved searches");
    expect(brief).not.toContain("T2 —");
    expect(renderPrdAxisBrief(loadTemplate(), "A9")).toBeNull();
  });

  test("limits milestone briefs to the selected tasks while retaining their acceptance", () => {
    const document = loadRoadmap();
    const single = renderPrdSingleBrief(document, "restore");
    expect(single).toContain("Jalon restore — Restore searches");
    expect(single).toContain("T2 — Restore a saved search");
    expect(single).not.toContain("T1 — Persist saved searches");
    expect(single).toContain("A saved search restores its filters.");
    const axis = renderPrdAxisBrief(document, "A2", "restore");
    expect(axis).toContain("Seul le jalon restore est à implémenter.");
    expect(axis).toContain("T2 — Restore a saved search");
    expect(renderPrdAxisBrief(document, "A2", "capture")).not.toContain("T2 — Restore a saved search");
    expect(renderPrdTaskBrief(document, "T2")).toContain("Jalon restore — Restore searches");
    expect(renderPrdTaskBrief(document, "T2")).not.toContain("Jalon capture");
  });
});
