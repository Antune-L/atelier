import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { prdDocumentSchema } from "../../shared/schemas.ts";
import type { PrdDocument } from "../../shared/schemas.ts";
import { PROJECT_ROOT } from "../config.ts";

import { PYTHON_BINARY, PrdRenderError, renderPrdHtml } from "./renderPrdHtml.ts";

const TEMPLATE_PATH = join(PROJECT_ROOT, "vendor", "prd", "prd-template.json");
const hasPython = Bun.which(PYTHON_BINARY) !== null;

function loadTemplate(): PrdDocument {
  return prdDocumentSchema.parse(JSON.parse(readFileSync(TEMPLATE_PATH, "utf8")));
}

describe("renderPrdHtml", () => {
  test.skipIf(!hasPython)("renders the template to a standalone HTML page", async () => {
    const html = await renderPrdHtml({ document: loadTemplate() });
    expect(html).toContain("<html");
    expect(html).toContain("Saved catalogue searches");
  });

  test.skipIf(!hasPython)("renders against a previous revision", async () => {
    const previous = loadTemplate();
    const html = await renderPrdHtml({ document: { ...previous, revision: "2", title: "Saved searches v2" }, previous });
    expect(html).toContain("Saved searches v2");
  });

  test.skipIf(!hasPython)("exports optional roadmap scope and task associations with escaped content", async () => {
    const previous = loadTemplate();
    const document = prdDocumentSchema.parse({
      ...previous,
      roadmap: {
        milestones: [{ id: "capture", title: "Capture <searches>", summary: "Persist searches.", scope: ["Save filters"], acceptance: ["A search survives reload."] }],
        selectedMilestoneId: "capture",
      },
      tasks: previous.tasks.map((task) => ({ ...task, milestoneId: "capture" })),
    });
    const html = await renderPrdHtml({ document, previous });
    expect(html).toContain('id="roadmap"');
    expect(html).toContain('href="#roadmap"');
    expect(html).toContain("Capture &lt;searches&gt;");
    expect(html).toContain("Selected milestone");
    expect(html).toContain("Save filters");
    expect(html).toContain("A search survives reload.");
    expect(html).toContain("Milestone capture");
  });

  test.skipIf(!hasPython)("rejects invalid roadmap references at the standalone export boundary", async () => {
    const document = loadTemplate();
    const milestone = { id: "capture", title: "Capture", summary: "Save searches.", scope: ["Save filters"], acceptance: ["A search survives reload."] };
    await expect(renderPrdHtml({ document: { ...document, roadmap: { milestones: [milestone], selectedMilestoneId: "unknown" } } })).rejects.toThrow("unknown milestone 'unknown'");
    await expect(renderPrdHtml({ document: { ...document, roadmap: { milestones: [milestone, milestone] } } })).rejects.toThrow("milestone IDs must be unique");
    await expect(renderPrdHtml({ document: { ...document, tasks: document.tasks.map((task) => ({ ...task, milestoneId: "unknown" })) } })).rejects.toThrow("unknown milestone 'unknown'");
  });

  test("fails with a French error when the renderer is missing", async () => {
    await expect(renderPrdHtml({ document: loadTemplate(), resourcesRoot: "/nonexistent-root" })).rejects.toBeInstanceOf(PrdRenderError);
  });
});
