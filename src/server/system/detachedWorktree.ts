/**
 * Detached git worktree primitive shared by the validation and analysis workspaces: add a worktree
 * pinned to a revision without touching the main checkout, and remove it (plus its registration).
 */

import { lstat, mkdir, realpath, rm } from "node:fs/promises";
import { basename, dirname, isAbsolute, join, relative, resolve, sep } from "node:path";

import { assertOperationActive, boundedCommandDetail, runBoundedCommand } from "./boundedCommand.ts";
import type { BoundedCommandResult } from "./boundedCommand.ts";
import type { OperationDeadlineOptions } from "./types.ts";

export const ATELIER_WORKTREE_LOCK_REASON = "Managed by Atelier";
const WORKTREE_PATH_PREFIX = "worktree ";
const LOCKED_FIELD = "locked";

export type DetachedWorktreeStep = "add" | "remove" | "prune" | "list";

interface WorktreeRegistration {
  path: string;
  main: boolean;
  lockReason: string | null;
}

/** A failed git step, carrying its raw result so callers can keep their own error wording. */
export class DetachedWorktreeError extends Error {
  constructor(readonly step: DetachedWorktreeStep, readonly result: BoundedCommandResult) {
    super(`git worktree ${step} a échoué : ${boundedCommandDetail(result) || `code ${result.exitCode}`}`);
  }
}

function isMissingPath(error: unknown): boolean {
  return error instanceof Error && "code" in error && error.code === "ENOENT";
}

async function canonicalWorktreePath(path: string): Promise<string> {
  const absolute = resolve(path);
  try {
    return await realpath(absolute);
  } catch (error) {
    if (!isMissingPath(error)) throw error;
    return join(await canonicalWorktreePath(dirname(absolute)), basename(absolute));
  }
}

async function worktreePathInfo(path: string): Promise<Awaited<ReturnType<typeof lstat>> | null> {
  try {
    return await lstat(path);
  } catch (error) {
    if (isMissingPath(error)) return null;
    throw error;
  }
}

async function listWorktreeRegistrations(repoPath: string, options: OperationDeadlineOptions): Promise<WorktreeRegistration[]> {
  const result = await runBoundedCommand(["git", "-C", repoPath, "worktree", "list", "--porcelain", "-z"], repoPath, options);
  if (result.exitCode !== 0 || result.timedOut) throw new DetachedWorktreeError("list", result);
  const registrations: WorktreeRegistration[] = [];
  for (const record of result.stdout.split("\0\0")) {
    const fields = record.split("\0");
    const path = fields.find((field) => field.startsWith(WORKTREE_PATH_PREFIX))?.slice(WORKTREE_PATH_PREFIX.length);
    if (!path) continue;
    const locked = fields.find((field) => field === LOCKED_FIELD || field.startsWith(`${LOCKED_FIELD} `));
    registrations.push({ path, main: registrations.length === 0, lockReason: locked?.slice(LOCKED_FIELD.length).trimStart() ?? null });
  }
  return registrations;
}

export async function removeRegisteredWorktreesUnderRoot(repoPath: string, root: string, options: OperationDeadlineOptions = {}): Promise<void> {
  const canonicalRoot = await canonicalWorktreePath(root);
  for (const registration of await listWorktreeRegistrations(repoPath, options)) {
    const offset = relative(canonicalRoot, resolve(registration.path));
    if (isAbsolute(offset) || offset === ".." || offset.startsWith(`..${sep}`)) continue;
    await removeDetachedWorktree(repoPath, registration.path, options);
  }
}

export async function addDetachedWorktree(repoPath: string, path: string, revision: string, options: OperationDeadlineOptions = {}): Promise<void> {
  assertOperationActive(options);
  await mkdir(dirname(path), { recursive: true });
  const result = await runBoundedCommand(["git", "-C", repoPath, "worktree", "add", "--lock", "--reason", ATELIER_WORKTREE_LOCK_REASON, "--detach", path, revision], repoPath, options);
  if (result.exitCode !== 0 || result.timedOut) throw new DetachedWorktreeError("add", result);
}

export async function removeDetachedWorktree(repoPath: string, path: string, options: OperationDeadlineOptions = {}): Promise<void> {
  assertOperationActive(options);
  const info = await worktreePathInfo(path);
  if (info?.isSymbolicLink()) throw new Error(`Nettoyage du lien symbolique ${path} refusé.`);
  const canonicalPath = await canonicalWorktreePath(path);
  const registrations = await listWorktreeRegistrations(repoPath, options);
  const registration = registrations.find((entry) => resolve(entry.path) === canonicalPath || resolve(entry.path) === resolve(path));
  if (registration?.main) throw new Error(`Nettoyage du dépôt principal ${path} refusé.`);
  if (registration && registration.lockReason !== null && registration.lockReason !== ATELIER_WORKTREE_LOCK_REASON) {
    throw new Error(`Le worktree ${path} est verrouillé en dehors d'Atelier ; nettoyage refusé.`);
  }
  if (!registration) {
    if (await worktreePathInfo(join(path, ".git"))) throw new Error(`Le chemin ${path} appartient à un dépôt Git non enregistré ici ; nettoyage refusé.`);
    assertOperationActive(options);
    await rm(path, { recursive: true, force: true });
    return;
  }
  const args = ["git", "-C", repoPath, "worktree", "remove", "--force", "--force", registration.path];
  const removed = await runBoundedCommand(args, repoPath, options);
  if (removed.timedOut) throw new DetachedWorktreeError("remove", removed);
  if (removed.exitCode === 0) return;
  if (await worktreePathInfo(join(path, ".git"))) throw new DetachedWorktreeError("remove", removed);
  assertOperationActive(options);
  await rm(path, { recursive: true, force: true });
  const retried = await runBoundedCommand(args, repoPath, options);
  if (retried.exitCode !== 0 || retried.timedOut) throw new DetachedWorktreeError("remove", retried);
}
