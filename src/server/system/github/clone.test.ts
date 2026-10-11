import { afterAll, afterEach, beforeAll, describe, expect, test } from "bun:test";
import { existsSync, mkdirSync, mkdtempSync, readdirSync, realpathSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { cloneGithubRepository, CloneConflictError, CloneSourceError, CloneTimeoutError, plannedClonePath, setCloneProcessRunner } from "./clone.ts";

let root: string;
let previousCloneRoot: string | undefined;

function git(args: string[], cwd: string): void {
  const result = Bun.spawnSync(["git", ...args], { cwd, stdout: "ignore", stderr: "pipe" });
  if (result.exitCode !== 0) throw new Error(result.stderr.toString());
}

/** A clone double creating a git repo whose origin is the requested URL. */
function succeedingClone(calls: string[][]) {
  return async (args: string[]) => {
    calls.push(args);
    const target = args.at(-1) ?? "";
    mkdirSync(target, { recursive: true });
    git(["init", "-q"], target);
    git(["remote", "add", "origin", args.at(-2) ?? ""], target);
    return { exitCode: 0, stderr: "", timedOut: false };
  };
}

beforeAll(() => {
  root = mkdtempSync(join(tmpdir(), "kanban-gh-clone-"));
  previousCloneRoot = process.env.KANBAN_CLONE_ROOT;
  process.env.KANBAN_CLONE_ROOT = root;
});

afterAll(() => {
  if (previousCloneRoot === undefined) delete process.env.KANBAN_CLONE_ROOT;
  else process.env.KANBAN_CLONE_ROOT = previousCloneRoot;
  rmSync(root, { recursive: true, force: true });
});

afterEach(() => {
  setCloneProcessRunner();
});

function partials(directory: string): string[] {
  return existsSync(directory) ? readdirSync(directory).filter((name) => name.includes(".partial-")) : [];
}

describe("cloneGithubRepository", () => {
  test("clones the rebuilt HTTPS URL into the machine folder and then reuses it", async () => {
    const calls: string[][] = [];
    setCloneProcessRunner(succeedingClone(calls));
    const first = await cloneGithubRepository({ source: "git@github.com:Org/Repo.git", account: null });
    expect(first).toEqual({ repoPath: join(realpathSync(root), "_machine", "org", "repo"), cloneUrl: "https://github.com/Org/Repo.git", reused: false });
    expect(calls[0]?.slice(0, 4)).toEqual(["git", "clone", "--", "https://github.com/Org/Repo.git"]);
    const second = await cloneGithubRepository({ source: "Org/Repo", account: null });
    expect(second.reused).toBe(true);
    expect(calls).toHaveLength(1);
  });

  test("a folder with another origin is a conflict and stays untouched", async () => {
    const target = join(root, "_machine", "acme", "web");
    mkdirSync(target, { recursive: true });
    git(["init", "-q"], target);
    git(["remote", "add", "origin", "https://github.com/someone/else.git"], target);
    setCloneProcessRunner(succeedingClone([]));
    await expect(cloneGithubRepository({ source: "acme/web", account: null })).rejects.toBeInstanceOf(CloneConflictError);
    expect(readdirSync(target)).toEqual([".git"]);
  });

  test("a failed clone leaves no partial folder", async () => {
    setCloneProcessRunner(async (args) => {
      mkdirSync(args.at(-1) ?? "", { recursive: true });
      return { exitCode: 128, stderr: "fatal: https://x:ghp_abcdefghijklmnopqrstuvwxyz0123@github.com denied", timedOut: false };
    });
    const error = await cloneGithubRepository({ source: "acme/fail", account: null }).catch((caught: unknown) => caught);
    expect(String(error)).not.toContain("ghp_");
    expect(partials(join(root, "_machine", "acme"))).toEqual([]);
    expect(existsSync(join(root, "_machine", "acme", "fail"))).toBe(false);
  });

  test("a timed-out clone is reported as such and cleaned", async () => {
    setCloneProcessRunner(async (args) => {
      mkdirSync(args.at(-1) ?? "", { recursive: true });
      return { exitCode: 137, stderr: "", timedOut: true };
    });
    await expect(cloneGithubRepository({ source: "acme/slow", account: null })).rejects.toBeInstanceOf(CloneTimeoutError);
    expect(partials(join(root, "_machine", "acme"))).toEqual([]);
  });

  test("refused sources never start a process", async () => {
    const calls: string[][] = [];
    setCloneProcessRunner(succeedingClone(calls));
    await expect(cloneGithubRepository({ source: "ext::sh -c x", account: null })).rejects.toBeInstanceOf(CloneSourceError);
    expect(calls).toHaveLength(0);
  });

  test("dry-run planning computes the target without touching the disk", () => {
    const planned = plannedClonePath("https://github.com/Org/Planned", "alice");
    expect(planned.repoPath).toBe(join(root, "alice", "org", "planned"));
    expect(existsSync(join(root, "alice"))).toBe(false);
  });
});
