import { nanoid } from "nanoid";
import { join } from "node:path";

import { getErrorMessage } from "../../shared/errors.ts";
import { SLOTS_ROOT } from "../config.ts";
import { createLogger } from "../logger.ts";
import type { SystemAdapter } from "../system/index.ts";

const log = createLogger("analysis-workspace");
const RUN_SUFFIX_LENGTH = 6;

export const ANALYSIS_WORKSPACES_ROOT = join(SLOTS_ROOT, "analysis");

export interface AnalysisWorkspace {
  repoPath: string;
  cwd: string;
  owned: boolean;
}

type AnalysisSystem = Pick<SystemAdapter, "prepareAnalysisWorkspace" | "removeAnalysisWorkspace">;

/**
 * Read-only analyses run on a detached origin/<baseBranch> worktree, so a stale main checkout never
 * hides merged work. Falls back to the main checkout when the worktree cannot be created (no remote).
 */
export async function prepareAnalysisWorkspace(system: AnalysisSystem, repoPath: string, baseBranch: string, key: string): Promise<AnalysisWorkspace> {
  const path = join(ANALYSIS_WORKSPACES_ROOT, `${key}-${nanoid(RUN_SUFFIX_LENGTH)}`);
  try {
    await system.prepareAnalysisWorkspace(repoPath, path, baseBranch);
    return { repoPath, cwd: path, owned: true };
  } catch (error) {
    log.warn("worktree d'analyse indisponible : repli sur le checkout principal", { key, baseBranch, error: getErrorMessage(error) });
    await system.removeAnalysisWorkspace(repoPath, path).catch(() => undefined);
    return { repoPath, cwd: repoPath, owned: false };
  }
}

export function releaseAnalysisWorkspace(system: AnalysisSystem, workspace: AnalysisWorkspace): void {
  if (!workspace.owned) return;
  void system.removeAnalysisWorkspace(workspace.repoPath, workspace.cwd).catch((error: unknown) => {
    log.warn("suppression du worktree d'analyse échouée", { cwd: workspace.cwd, error: getErrorMessage(error) });
  });
}
