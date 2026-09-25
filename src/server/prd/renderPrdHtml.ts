import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import type { PrdDocument } from "../../shared/schemas.ts";
import { PROJECT_ROOT } from "../config.ts";
import { boundedCommandDetail, runBoundedCommand } from "../system/boundedCommand.ts";

export const PYTHON_BINARY = "python3";
const RENDERER_RELATIVE_PATH = join("vendor", "prd", "renderPrd.py");
const TEMP_DIR_PREFIX = "kanban-prd-";
const INPUT_FILE = "prd.json";
const PREVIOUS_FILE = "previous.json";
const OUTPUT_FILE = "prd.html";
const PREVIOUS_FLAG = "--previous";

export class PrdRenderError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PrdRenderError";
  }
}

export interface RenderPrdHtmlInput {
  document: PrdDocument;
  previous?: PrdDocument | null;
  resourcesRoot?: string;
}

export function resolvePrdRendererPath(resourcesRoot: string = PROJECT_ROOT): string {
  return join(resourcesRoot, RENDERER_RELATIVE_PATH);
}

export async function renderPrdHtml({ document, previous = null, resourcesRoot }: RenderPrdHtmlInput): Promise<string> {
  const python = Bun.which(PYTHON_BINARY);
  if (python === null) throw new PrdRenderError(`${PYTHON_BINARY} introuvable dans le PATH : l'export HTML du PRD est indisponible.`);
  const rendererPath = resolvePrdRendererPath(resourcesRoot);
  if (!(await Bun.file(rendererPath).exists())) throw new PrdRenderError(`Générateur HTML du PRD introuvable : ${rendererPath}`);
  const workDir = await mkdtemp(join(tmpdir(), TEMP_DIR_PREFIX));
  try {
    const inputPath = join(workDir, INPUT_FILE);
    const outputPath = join(workDir, OUTPUT_FILE);
    await Bun.write(inputPath, JSON.stringify(document));
    const args = [python, rendererPath, inputPath, outputPath];
    if (previous !== null) {
      const previousPath = join(workDir, PREVIOUS_FILE);
      await Bun.write(previousPath, JSON.stringify(previous));
      args.push(PREVIOUS_FLAG, previousPath);
    }
    const result = await runBoundedCommand(args, workDir);
    if (result.exitCode !== 0 || result.timedOut) {
      throw new PrdRenderError(`Échec du rendu HTML du PRD : ${boundedCommandDetail(result) || `code ${result.exitCode}`}`);
    }
    return await Bun.file(outputPath).text();
  } finally {
    await rm(workDir, { recursive: true, force: true });
  }
}
