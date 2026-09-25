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

  test("fails with a French error when the renderer is missing", async () => {
    await expect(renderPrdHtml({ document: loadTemplate(), resourcesRoot: "/nonexistent-root" })).rejects.toBeInstanceOf(PrdRenderError);
  });
});
