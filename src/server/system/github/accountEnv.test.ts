import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, test } from "bun:test";
import { chmodSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { runBoundedCommand } from "../boundedCommand.ts";
import type { BoundedCommandOptions } from "../boundedCommand.ts";

import {
  clearGithubIdentityCache,
  configureGithubAccountsRoot,
  githubAccountEnv,
  githubEnvForCwdSync,
  GithubAccountError,
  resolveGithubAccount,
  resolveGithubAccountSync,
  runGithubCommand,
  setGithubCommandRunners,
  setGithubProjectSource,
  verifyGithubIdentity,
} from "./accountEnv.ts";
import type { GithubProjectBinding } from "./accountEnv.ts";

let root: string;
let previousCloneRoot: string | undefined;

function git(args: string[], cwd: string): void {
  const result = Bun.spawnSync(["git", ...args], { cwd, stdout: "ignore", stderr: "pipe" });
  if (result.exitCode !== 0) throw new Error(result.stderr.toString());
}

function makeRepo(name: string, origin: string): string {
  const path = join(root, name);
  mkdirSync(path, { recursive: true });
  git(["init", "-q", "-b", "main"], path);
  git(["-c", "user.email=t@t", "-c", "user.name=t", "commit", "-q", "--allow-empty", "-m", "init"], path);
  git(["remote", "add", "origin", origin], path);
  return path;
}

function makeAccount(login: string): void {
  const dir = join(root, "data", "gh-accounts", login);
  mkdirSync(dir, { recursive: true, mode: 0o700 });
  chmodSync(dir, 0o700);
  writeFileSync(join(dir, "hosts.yml"), "github.com: {}\n", { mode: 0o600 });
}

function project(overrides: Partial<GithubProjectBinding> & Pick<GithubProjectBinding, "repoPath">): GithubProjectBinding {
  return { key: "k", label: "Projet", vcsProvider: "github", githubAccount: null, ...overrides };
}

/** Real git for local commands; `gh api user` answers the login of the GH_CONFIG_DIR folder. */
function fakeIdentityRunner(loginFor: (configDir: string) => string | null) {
  return {
    async: async (args: string[], cwd: string, options?: BoundedCommandOptions) => {
      if (args[0] === "gh") {
        const login = loginFor(options?.env?.GH_CONFIG_DIR ?? "");
        return login === null
          ? { exitCode: 1, stdout: "", stderr: "HTTP 401: Bad credentials ghp_abcdefghijklmnopqrstuvwxyz0123", timedOut: false }
          : { exitCode: 0, stdout: `${login}\n`, stderr: "", timedOut: false };
      }
      return runBoundedCommand(args, cwd, options);
    },
    sync: (args: string[], cwd: string, env?: Record<string, string>) => {
      if (args[0] === "gh") {
        const login = loginFor(env?.GH_CONFIG_DIR ?? "");
        return login === null ? { exitCode: 1, stdout: "", stderr: "401" } : { exitCode: 0, stdout: `${login}\n`, stderr: "" };
      }
      const result = Bun.spawnSync(args, { cwd, stdout: "pipe", stderr: "pipe" });
      return { exitCode: result.exitCode ?? 1, stdout: result.stdout.toString(), stderr: result.stderr.toString() };
    },
  };
}

beforeAll(() => {
  root = mkdtempSync(join(tmpdir(), "kanban-gh-env-"));
  previousCloneRoot = process.env.KANBAN_CLONE_ROOT;
  process.env.KANBAN_CLONE_ROOT = join(root, "clones");
  configureGithubAccountsRoot(join(root, "data"));
});

afterAll(() => {
  if (previousCloneRoot === undefined) delete process.env.KANBAN_CLONE_ROOT;
  else process.env.KANBAN_CLONE_ROOT = previousCloneRoot;
  rmSync(root, { recursive: true, force: true });
});

beforeEach(() => {
  setGithubCommandRunners(fakeIdentityRunner((dir) => dir.split("/").at(-1) ?? null));
  clearGithubIdentityCache();
});

afterEach(() => {
  setGithubProjectSource(() => []);
  setGithubCommandRunners();
});

describe("resolveGithubAccount", () => {
  test("projects without an account keep the machine default", async () => {
    const repo = makeRepo("machine", "git@github.com:o/r.git");
    setGithubProjectSource(() => [project({ repoPath: repo })]);
    const resolution = await resolveGithubAccount(repo);
    expect(resolution.account).toBeNull();
    expect(resolution.project?.repoPath).toBe(repo);
  });

  test("a worktree of an attached project resolves to its account", async () => {
    makeAccount("alice");
    const repo = makeRepo("attached", "https://github.com/o/r.git");
    const worktree = join(root, "attached-wt");
    git(["worktree", "add", "-q", "-b", "feature", worktree], repo);
    setGithubProjectSource(() => [project({ repoPath: repo, githubAccount: "Alice" })]);
    expect((await resolveGithubAccount(worktree)).account).toBe("alice");
    expect(resolveGithubAccountSync(worktree).account).toBe("alice");
    const env = githubEnvForCwdSync(worktree);
    expect(env?.GH_CONFIG_DIR).toBe(join(root, "data", "gh-accounts", "alice"));
    expect(env?.GIT_CONFIG_GLOBAL).toBe(join(root, "data", "gh-accounts", "alice", "gitconfig"));
  });

  test("two projects with different accounts on one repo are refused, naming both", async () => {
    makeAccount("alice");
    makeAccount("bob");
    const repo = makeRepo("shared", "https://github.com/o/r.git");
    setGithubProjectSource(() => [
      project({ key: "a", label: "Front", repoPath: repo, githubAccount: "alice" }),
      project({ key: "b", label: "Back", repoPath: repo, githubAccount: "bob" }),
    ]);
    const error = await resolveGithubAccount(repo).catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(GithubAccountError);
    expect(String(error)).toContain("Front");
    expect(String(error)).toContain("Back");
  });

  test("an SSH origin on an attached project is refused before any network call", async () => {
    makeAccount("alice");
    const repo = makeRepo("ssh", "git@github.com:o/r.git");
    setGithubProjectSource(() => [project({ label: "Ssh", repoPath: repo, githubAccount: "alice" })]);
    await expect(resolveGithubAccount(repo)).rejects.toThrow(/SSH.*Ssh|Ssh.*SSH/);
  });

  test("a missing account folder fails instead of falling back", async () => {
    const repo = makeRepo("ghost", "https://github.com/o/r.git");
    setGithubProjectSource(() => [project({ repoPath: repo, githubAccount: "ghost" })]);
    await expect(resolveGithubAccount(repo)).rejects.toThrow(/ghost/);
  });

  test("an account folder with wide permissions is refused", async () => {
    makeAccount("wide");
    chmodSync(join(root, "data", "gh-accounts", "wide", "hosts.yml"), 0o644);
    const repo = makeRepo("wide-repo", "https://github.com/o/r.git");
    setGithubProjectSource(() => [project({ repoPath: repo, githubAccount: "wide" })]);
    await expect(resolveGithubAccount(repo)).rejects.toThrow(/permissions trop larges/);
  });

  test("an unresolved clone under an unknown account segment is an error", async () => {
    const clone = join(root, "clones", "carol", "o", "r");
    mkdirSync(clone, { recursive: true });
    setGithubProjectSource(() => [project({ repoPath: makeRepo("other", "https://github.com/x/y.git") })]);
    await expect(resolveGithubAccount(clone)).rejects.toThrow(/carol/);
  });

  test("a clone of a registered account that is not a project yet runs under that account", async () => {
    makeAccount("grace");
    mkdirSync(join(root, "clones", "grace", "o"), { recursive: true });
    const clone = join(root, "clones", "grace", "o", "r");
    mkdirSync(clone);
    git(["init", "-q"], clone);
    git(["remote", "add", "origin", "https://github.com/o/r.git"], clone);
    setGithubProjectSource(() => [project({ repoPath: makeRepo("unrelated", "https://github.com/x/y.git") })]);
    expect((await resolveGithubAccount(clone)).account).toBe("grace");
  });

  test("an Azure DevOps project gets no GitHub environment", async () => {
    const repo = makeRepo("azure", "https://dev.azure.com/org/p/_git/r");
    setGithubProjectSource(() => [project({ repoPath: repo, vcsProvider: "azureDevops" })]);
    expect(githubEnvForCwdSync(repo)).toBeNull();
  });
});

describe("identity and command wrapper", () => {
  test("identity is compared case-insensitively and mismatches name the account", async () => {
    makeAccount("dave");
    setGithubCommandRunners(fakeIdentityRunner(() => "DAVE"));
    await verifyGithubIdentity("dave");
    clearGithubIdentityCache();
    setGithubCommandRunners(fakeIdentityRunner(() => "mallory"));
    await expect(verifyGithubIdentity("dave")).rejects.toThrow(/dave.*mallory/);
  });

  test("an invalid token names the account and never echoes the token", async () => {
    makeAccount("erin");
    setGithubCommandRunners(fakeIdentityRunner(() => null));
    const error = await verifyGithubIdentity("erin").catch((caught: unknown) => caught);
    expect(String(error)).toContain("erin");
    expect(String(error)).not.toContain("ghp_");
  });

  test("runGithubCommand applies the account environment without ambient tokens", async () => {
    makeAccount("frank");
    const repo = makeRepo("frank-repo", "https://github.com/o/r.git");
    setGithubProjectSource(() => [project({ repoPath: repo, githubAccount: "frank" })]);
    const seen: (Record<string, string> | undefined)[] = [];
    const base = fakeIdentityRunner(() => "frank");
    setGithubCommandRunners({
      sync: base.sync,
      async: async (args, cwd, options) => {
        if (args[1] === "pr") {
          seen.push(options?.env);
          return { exitCode: 0, stdout: "ghp_abcdefghijklmnopqrstuvwxyz0123", stderr: "", timedOut: false };
        }
        return base.async(args, cwd, options);
      },
    });
    const previous = process.env.GH_TOKEN;
    process.env.GH_TOKEN = "ambient";
    try {
      const result = await runGithubCommand(["gh", "pr", "list"], repo, { verifyIdentity: true });
      expect(result.stdout).toBe("[redacted]");
    } finally {
      if (previous === undefined) delete process.env.GH_TOKEN;
      else process.env.GH_TOKEN = previous;
    }
    expect(seen[0]?.GH_CONFIG_DIR).toBe(join(root, "data", "gh-accounts", "frank"));
    expect(seen[0]?.GH_TOKEN).toBeUndefined();
  });

  test("githubAccountEnv strips token variables and undefined values", () => {
    const env = githubAccountEnv("alice", { PATH: "/bin", GITHUB_TOKEN: "x", EMPTY: undefined });
    expect(env.PATH).toBe("/bin");
    expect(env.GITHUB_TOKEN).toBeUndefined();
    expect("EMPTY" in env).toBe(false);
    expect(env.GIT_TERMINAL_PROMPT).toBe("0");
  });
});
