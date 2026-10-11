import { nanoid } from "nanoid";
import { join } from "node:path";

import { getErrorMessage } from "../../shared/errors.ts";
import { SLOTS_ROOT } from "../config.ts";
import { createLogger } from "../logger.ts";
import type { KeyedMutex } from "../mutex.ts";
import type { SystemAdapter } from "../system/index.ts";

const log = createLogger("analysis-workspace");
const RUN_SUFFIX_LENGTH = 6;
const KEY_PATTERN = /^[a-zA-Z0-9_-]+$/;

export const ANALYSIS_WORKSPACES_ROOT = join(SLOTS_ROOT, "analysis");

export interface AnalysisWorkspace {
  repoPath: string;
  cwd: string;
}

export type AnalysisSystem = Pick<SystemAdapter, "prepareAnalysisWorkspace" | "removeAnalysisWorkspace">;

/**
 * Read-only analyses run on a detached origin/<baseBranch> worktree, so a stale main checkout never
 * hides merged work. Throws when the worktree cannot be created: there is no fallback to the main
 * checkout. Git ops go through the shared repo mutex so they never race slot creation.
 */
export async function prepareAnalysisWorkspace(system: AnalysisSystem, mutex: KeyedMutex, repoPath: string, baseBranch: string, key: string): Promise<AnalysisWorkspace> {
  if (!KEY_PATTERN.test(key)) throw new Error(`clé de worktree d'analyse invalide : ${key}`);
  const path = join(ANALYSIS_WORKSPACES_ROOT, `${key}-${nanoid(RUN_SUFFIX_LENGTH)}`);
  try {
    await mutex.run(repoPath, () => system.prepareAnalysisWorkspace(repoPath, path, baseBranch));
    return { repoPath, cwd: path };
  } catch (error) {
    await mutex.run(repoPath, () => system.removeAnalysisWorkspace(repoPath, path)).catch((cleanupError: unknown) => {
      log.warn("nettoyage du worktree d'analyse partiel échoué", { path, error: getErrorMessage(cleanupError) });
    });
    throw new Error(`worktree d'analyse sur origin/${baseBranch} indisponible : ${getErrorMessage(error)}`);
  }
}

/** Fire-and-forget removal; returns the settled promise so tests can await it. */
export function releaseAnalysisWorkspace(system: AnalysisSystem, mutex: KeyedMutex, workspace: AnalysisWorkspace): Promise<void> {
  return mutex.run(workspace.repoPath, () => system.removeAnalysisWorkspace(workspace.repoPath, workspace.cwd)).catch((error: unknown) => {
    log.warn("suppression du worktree d'analyse échouée", { cwd: workspace.cwd, error: getErrorMessage(error) });
  });
}
