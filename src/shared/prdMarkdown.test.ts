import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { prdDocumentSchema } from "./prdDocument.ts";
import type { PrdDocument } from "./prdDocument.ts";
import { renderPrdAxisBrief, renderPrdMarkdown, renderPrdTaskBrief } from "./prdMarkdown.ts";

const TEMPLATE_PATH = join(import.meta.dir, "..", "..", "vendor", "prd", "prd-template.json");

function loadTemplate(): PrdDocument {
  return prdDocumentSchema.parse(JSON.parse(readFileSync(TEMPLATE_PATH, "utf8")));
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
});
