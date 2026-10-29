import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { existsSync } from "node:fs";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { KeyedMutex } from "../mutex.ts";
import type { OperationDeadlineOptions } from "../system/types.ts";

import { RepoSnapshots } from "./repoSnapshots.ts";
import type { RepoSnapshotSystem } from "./repoSnapshots.ts";

const SHA_A = "a".repeat(40);
const SHA_B = "b".repeat(40);

/** Records every git call; snapshot add/remove create/delete the directory to mimic git. */
class StubSystem implements RepoSnapshotSystem {
  readonly dryRun = false;
  readonly calls: { op: string; args: unknown[] }[] = [];
  originSha = SHA_A;
  fetchError: Error | null = null;
  fetchDeadlines: (number | undefined)[] = [];
  /** Number of operations currently running, to detect unserialized git calls. */
  active = 0;
  maxActive = 0;

  private async track<T>(op: string, args: unknown[], task: () => Promise<T>): Promise<T> {
    this.calls.push({ op, args });
    this.active += 1;
    this.maxActive = Math.max(this.maxActive, this.active);
    try {
      await new Promise((resolve) => setTimeout(resolve, 1));
      return await task();
    } finally {
      this.active -= 1;
    }
  }

  fetch(repoPath: string, baseBranch: string, options: OperationDeadlineOptions = {}): Promise<void> {
    this.fetchDeadlines.push(options.deadlineAt);
    return this.track("fetch", [repoPath, baseBranch], async () => {
      if (this.fetchError) throw this.fetchError;
    });
  }

  readGitRef(repoPath: string, ref: string): Promise<string> {
    return this.track("readGitRef", [repoPath, ref], async () => this.originSha);
  }

  readCommitTimestamp(repoPath: string, ref: string): Promise<number> {
    return this.track("readCommitTimestamp", [repoPath, ref], async () => 1_000);
  }

  addSnapshotWorktree(repoPath: string, path: string, sha: string): Promise<void> {
    return this.track("addSnapshotWorktree", [repoPath, path, sha], async () => {
      await mkdir(path, { recursive: true });
      await writeFile(join(path, ".git"), `gitdir: ${repoPath}/.git/worktrees/${sha}`);
    });
  }

  removeSnapshotWorktree(repoPath: string, path: string): Promise<void> {
    return this.track("removeSnapshotWorktree", [repoPath, path], async () => {
      await rm(path, { recursive: true, force: true });
    });
  }

  count(op: string): number {
    return this.calls.filter((call) => call.op === op).length;
  }
}

let root: string;
let system: StubSystem;
let snapshots: RepoSnapshots;

const input = { projectKey: "demo", repoPath: "/repo/demo", baseBranch: "main", fetch: true, requireFetch: false };

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), "repo-snapshots-"));
  system = new StubSystem();
  snapshots = new RepoSnapshots({ system, repoMutex: new KeyedMutex(), root, fetchTimeoutMs: 5_000 });
});

afterEach(async () => {
  snapshots.stop();
  await rm(root, { recursive: true, force: true });
});

describe("RepoSnapshots.acquire", () => {
  test("two sessions on the same SHA share one directory", async () => {
    const first = await snapshots.acquire(input);
    const second = await snapshots.acquire(input);
    expect(first.cwd).toBe(join(root, "demo", SHA_A));
    expect(second.cwd).toBe(first.cwd);
    expect(first).toMatchObject({ sha: SHA_A, committedAt: 1_000, baseBranch: "main", fetchError: null });
    expect(system.count("addSnapshotWorktree")).toBe(1);
    expect(existsSync(`${first.cwd}.json`)).toBe(true);
  });

  test("distinct SHAs get distinct directories", async () => {
    const first = await snapshots.acquire(input);
    const second = await snapshots.acquire({ ...input, sha: SHA_B, fetch: false });
    expect(second.cwd).toBe(join(root, "demo", SHA_B));
    expect(second.cwd).not.toBe(first.cwd);
    expect(system.count("addSnapshotWorktree")).toBe(2);
  });

  test("fetch failure falls back to the last known ref unless the fetch is required", async () => {
    system.fetchError = new Error("réseau coupé");
    const lease = await snapshots.acquire(input);
    expect(lease.fetchError).toBe("réseau coupé");
    expect(lease.sha).toBe(SHA_A);
    await expect(snapshots.acquire({ ...input, requireFetch: true })).rejects.toThrow("git fetch origin/main impossible : réseau coupé");
  });

  test("the fetch carries a deadline derived from the fetch timeout", async () => {
    const before = Date.now();
    await snapshots.acquire(input);
    const deadline = system.fetchDeadlines[0] ?? 0;
    expect(deadline).toBeGreaterThanOrEqual(before + 5_000);
    expect(deadline).toBeLessThanOrEqual(Date.now() + 5_000);
  });

  test("rejects unsafe project keys and SHAs", async () => {
    await expect(snapshots.acquire({ ...input, projectKey: "../x" })).rejects.toThrow();
    await expect(snapshots.acquire({ ...input, sha: "../../etc" })).rejects.toThrow();
  });

  test("a failed worktree add removes the partial snapshot and its sidecar", async () => {
    system.addSnapshotWorktree = () => Promise.reject(new Error("disque plein"));
    await expect(snapshots.acquire(input)).rejects.toThrow("disque plein");
    expect(system.count("removeSnapshotWorktree")).toBe(1);
    expect(existsSync(join(root, "demo", `${SHA_A}.json`))).toBe(false);
  });

  test("all git operations are serialized through the shared mutex", async () => {
    await Promise.all([snapshots.acquire(input), snapshots.acquire(input), snapshots.acquire({ ...input, sha: SHA_B })]);
    expect(system.maxActive).toBe(1);
  });
});

describe("RepoSnapshots.gc", () => {
  test("keeps leased snapshots and removes released ones", async () => {
    const lease = await snapshots.acquire(input);
    await snapshots.gc();
    expect(existsSync(lease.cwd)).toBe(true);
    lease.release();
    lease.release();
    await snapshots.gc();
    expect(existsSync(lease.cwd)).toBe(false);
    expect(existsSync(`${lease.cwd}.json`)).toBe(false);
  });

  test("a snapshot stays while another lease on it is alive", async () => {
    const first = await snapshots.acquire(input);
    const second = await snapshots.acquire(input);
    first.release();
    await snapshots.gc();
    expect(existsSync(second.cwd)).toBe(true);
  });

  test("removes orphans using the repo recorded in the sidecar", async () => {
    const orphan = join(root, "gone", SHA_B);
    await mkdir(orphan, { recursive: true });
    await writeFile(`${orphan}.json`, JSON.stringify({ repoPath: "/old/repo", projectKey: "gone", sha: SHA_B, createdAt: 1 }));
    const stray = join(root, "gone", SHA_A);
    await mkdir(stray, { recursive: true });
    await snapshots.gc();
    expect(system.calls).toContainEqual({ op: "removeSnapshotWorktree", args: ["/old/repo", orphan] });
    expect(existsSync(`${orphan}.json`)).toBe(false);
    expect(existsSync(stray)).toBe(false);
  });

  test("a crash between sidecar and worktree add is recovered", async () => {
    const partial = join(root, "demo", SHA_B);
    await mkdir(join(root, "demo"), { recursive: true });
    await writeFile(`${partial}.json`, JSON.stringify({ repoPath: "/repo/demo", projectKey: "demo", sha: SHA_B, createdAt: 1 }));
    await snapshots.gc();
    expect(system.calls).toContainEqual({ op: "removeSnapshotWorktree", args: ["/repo/demo", partial] });
    expect(existsSync(`${partial}.json`)).toBe(false);
  });

  test("a truncated sidecar is treated as invalid and its snapshot removed", async () => {
    const truncated = join(root, "demo", SHA_B);
    await mkdir(truncated, { recursive: true });
    await writeFile(`${truncated}.json`, '{"repoPath": "/repo/de');
    await snapshots.gc();
    expect(existsSync(truncated)).toBe(false);
    expect(existsSync(`${truncated}.json`)).toBe(false);
  });
});
