/**
 * Detached git worktree primitive shared by the validation and analysis workspaces: add a worktree
 * pinned to a revision without touching the main checkout, and remove it (plus its registration).
 */

import { mkdir, rm } from "node:fs/promises";
import { dirname } from "node:path";

import { assertOperationActive, boundedCommandDetail, runBoundedCommand } from "./boundedCommand.ts";
import type { BoundedCommandResult } from "./boundedCommand.ts";
import type { OperationDeadlineOptions } from "./types.ts";

export type DetachedWorktreeStep = "add" | "remove" | "prune";

/** A failed git step, carrying its raw result so callers can keep their own error wording. */
export class DetachedWorktreeError extends Error {
  constructor(readonly step: DetachedWorktreeStep, readonly result: BoundedCommandResult) {
    super(`git worktree ${step} a échoué : ${boundedCommandDetail(result) || `code ${result.exitCode}`}`);
  }
}

export async function addDetachedWorktree(repoPath: string, path: string, revision: string, options: OperationDeadlineOptions = {}): Promise<void> {
  assertOperationActive(options);
  await mkdir(dirname(path), { recursive: true });
  const result = await runBoundedCommand(["git", "-C", repoPath, "worktree", "add", "--detach", path, revision], repoPath, options);
  if (result.exitCode !== 0 || result.timedOut) throw new DetachedWorktreeError("add", result);
}

export async function removeDetachedWorktree(repoPath: string, path: string, options: OperationDeadlineOptions = {}): Promise<void> {
  assertOperationActive(options);
  // A non-zero exit is expected when the directory was never registered (partial add); only a timeout is fatal.
  const removed = await runBoundedCommand(["git", "-C", repoPath, "worktree", "remove", "--force", path], repoPath, options);
  if (removed.timedOut) throw new DetachedWorktreeError("remove", removed);
  assertOperationActive(options);
  await rm(path, { recursive: true, force: true });
  const pruned = await runBoundedCommand(["git", "-C", repoPath, "worktree", "prune"], repoPath, options);
  if (pruned.exitCode !== 0 || pruned.timedOut) throw new DetachedWorktreeError("prune", pruned);
}
