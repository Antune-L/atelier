import { afterAll, describe, expect, test } from "bun:test";
import { existsSync } from "node:fs";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { addDetachedWorktree, DetachedWorktreeError, removeDetachedWorktree } from "./detachedWorktree.ts";
import { cleanupValidationWorkspace, prepareValidationWorkspace } from "./validationWorkspace.ts";

const GIT_IDENTITY = ["-c", "user.name=Test", "-c", "user.email=test@example.com", "-c", "init.defaultBranch=main"];

async function git(cwd: string, ...args: string[]): Promise<string> {
  const proc = Bun.spawn(["git", ...GIT_IDENTITY, ...args], { cwd, stdout: "pipe", stderr: "pipe" });
  const [exitCode, stdout, stderr] = await Promise.all([proc.exited, new Response(proc.stdout).text(), new Response(proc.stderr).text()]);
  if (exitCode !== 0) throw new Error(`git ${args.join(" ")} failed: ${stderr}`);
  return stdout.trim();
}

const roots: string[] = [];

afterAll(async () => {
  for (const root of roots) await rm(root, { recursive: true, force: true });
});

describe("detached worktree", () => {
  test("checks out the fetched origin revision without touching a stale main checkout", async () => {
    const root = await mkdtemp(join(tmpdir(), "detached-worktree-"));
    roots.push(root);
    const origin = join(root, "origin.git");
    const repo = join(root, "repo");
    const other = join(root, "other");
    await git(root, "init", "--bare", "--initial-branch=main", origin);
    await git(root, "clone", origin, repo);
    await git(repo, "checkout", "-B", "main");
    await writeFile(join(repo, "a.txt"), "A\n");
    await git(repo, "add", "a.txt");
    await git(repo, "commit", "-m", "A");
    await git(repo, "push", "origin", "main");
    const commitA = await git(repo, "rev-parse", "HEAD");

    await git(root, "clone", "--branch", "main", origin, other);
    await writeFile(join(other, "b.txt"), "B\n");
    await git(other, "add", "b.txt");
    await git(other, "commit", "-m", "B");
    await git(other, "push", "origin", "main");

    const statusBefore = await git(repo, "status", "--porcelain");
    await git(repo, "fetch", "origin", "main");
    const commitB = await git(repo, "rev-parse", "origin/main");
    expect(commitB).not.toBe(commitA);

    const dir = join(root, "analysis", "ticket-abc123");
    await addDetachedWorktree(repo, dir, "origin/main");
    const head = await git(dir, "rev-parse", "HEAD");
    expect(head).toBe(commitB);
    expect(head).not.toBe(await git(repo, "rev-parse", "main"));
    expect(await git(repo, "rev-parse", "HEAD")).toBe(commitA);
    expect(await git(repo, "status", "--porcelain")).toBe(statusBefore);

    await removeDetachedWorktree(repo, dir);
    const worktrees = (await git(repo, "worktree", "list", "--porcelain")).split("\n").filter((line) => line.startsWith("worktree "));
    expect(worktrees).toHaveLength(1);
    expect(existsSync(dir)).toBe(false);
  });

  test("add rejects an unknown revision", async () => {
    const root = await mkdtemp(join(tmpdir(), "detached-worktree-"));
    roots.push(root);
    await git(root, "init", "repo");
    await expect(addDetachedWorktree(join(root, "repo"), join(root, "wt"), "origin/nope")).rejects.toThrow("git worktree add");
  });

  test("validation workspace keeps its own git error wording", async () => {
    const root = await mkdtemp(join(tmpdir(), "detached-worktree-"));
    roots.push(root);
    await git(root, "init", "repo");
    const options = { ticketId: "ticket", runId: `run-${Date.now()}`, repoPath: join(root, "repo"), commitSha: "0".repeat(40) };
    const error = await prepareValidationWorkspace(options).then(() => null, (reason: unknown) => reason);
    expect(error).toBeInstanceOf(Error);
    expect(error).not.toBeInstanceOf(DetachedWorktreeError);
    await cleanupValidationWorkspace(options);
  });
});
