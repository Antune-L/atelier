import { afterAll, afterEach, beforeAll, describe, expect, test } from "bun:test";
import { chmodSync, existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { runBoundedCommand } from "./boundedCommand.ts";
import type { BoundedCommandOptions } from "./boundedCommand.ts";
import { FakeSystemAdapter } from "./fake.ts";
import { clearGithubIdentityCache, configureGithubAccountsRoot, scrubAmbientGithubTokens, setGithubCommandRunners, setGithubProjectSource } from "./github/accountEnv.ts";
import { isGhAuthCommand } from "./github/ghAuthGuard.ts";
import { CloneSourceError } from "./github/clone.ts";
import { GithubVcsClient } from "./vcs/github.ts";

let root: string;
let previousCloneRoot: string | undefined;

function git(args: string[], cwd: string): void {
  const result = Bun.spawnSync(["git", ...args], { cwd, stdout: "ignore", stderr: "pipe" });
  if (result.exitCode !== 0) throw new Error(result.stderr.toString());
}

function makeRepo(name: string, origin: string): string {
  const path = join(root, name);
  mkdirSync(path, { recursive: true });
  git(["init", "-q"], path);
  git(["remote", "add", "origin", origin], path);
  return path;
}

function makeAccount(login: string): void {
  const dir = join(root, "data", "gh-accounts", login);
  mkdirSync(dir, { recursive: true });
  chmodSync(dir, 0o700);
  writeFileSync(join(dir, "hosts.yml"), "github.com: {}\n", { mode: 0o600 });
}

beforeAll(() => {
  root = mkdtempSync(join(tmpdir(), "kanban-gh-integration-"));
  previousCloneRoot = process.env.KANBAN_CLONE_ROOT;
  process.env.KANBAN_CLONE_ROOT = join(root, "clones");
  configureGithubAccountsRoot(join(root, "data"));
});

afterAll(() => {
  if (previousCloneRoot === undefined) delete process.env.KANBAN_CLONE_ROOT;
  else process.env.KANBAN_CLONE_ROOT = previousCloneRoot;
  rmSync(root, { recursive: true, force: true });
});

afterEach(() => {
  setGithubProjectSource(() => []);
  setGithubCommandRunners();
  clearGithubIdentityCache();
});

describe("gh auth denial (shared by the Claude hook and the Codex hook script)", () => {
  test.each([
    "gh auth token",
    "gh auth login --with-token",
    "cd repo && gh auth status",
    "echo $(gh auth token)",
    "/usr/local/bin/gh auth switch",
    "gh --hostname github.com auth logout",
    "true; gh auth setup-git",
    "bash -c \"gh auth token\"",
    "echo \"$(gh auth token)\"",
    "env GH_HOST=x gh auth status",
  ])("denies %s", (command) => {
    expect(isGhAuthCommand(command)).toBe(true);
  });

  test.each([
    "gh pr create --draft --base main",
    "gh api user",
    "git push origin HEAD",
    "echo 'oauth'",
    "ghauth",
    "git commit -m \"feat(agents): deny gh auth in sessions\"",
    "rg \"gh auth\" src",
    "grep -rn 'gh auth login' docs",
  ])("allows %s", (command) => {
    expect(isGhAuthCommand(command)).toBe(false);
  });
});

describe("dry-run GitHub surface", () => {
  test("lists a fixed repository set and simulates the clone without touching the disk", async () => {
    const system = new FakeSystemAdapter();
    expect((await system.listGithubRepos("alice")).map((repo) => repo.fullName)).toEqual(["Antune-L/atelier", "acme-org/api", "acme-org/web"]);
    const clone = await system.cloneGithubRepo({ source: "git@github.com:Antune-L/atelier.git", account: "alice" });
    expect(clone).toEqual({ repoPath: join(root, "clones", "alice", "antune-l", "atelier"), cloneUrl: "https://github.com/Antune-L/atelier.git", reused: false });
    expect(existsSync(join(root, "clones"))).toBe(false);
    await expect(system.cloneGithubRepo({ source: "ext::sh", account: null })).rejects.toBeInstanceOf(CloneSourceError);
  });

  test("simulates accounts without creating gh-accounts", async () => {
    const system = new FakeSystemAdapter();
    const { login } = await system.githubAccounts().add("ghp_whatever");
    expect(await system.githubAccounts().logins()).toEqual([login]);
    expect(existsSync(join(root, "data", "gh-accounts", login))).toBe(false);
    expect(await system.checkGithubAvailable()).toBe(true);
  });
});

describe("provider environment scrub", () => {
  test("drops ambient tokens only for an attached-account environment", () => {
    const attached = scrubAmbientGithubTokens({ PATH: "/bin", GH_TOKEN: "x", GH_CONFIG_DIR: join(root, "data", "gh-accounts", "alice") });
    expect(attached.GH_TOKEN).toBeUndefined();
    const machine = scrubAmbientGithubTokens({ PATH: "/bin", GH_TOKEN: "x" });
    expect(machine.GH_TOKEN).toBe("x");
  });
});

describe("listReviewCounts", () => {
  test("makes one call per account and merges the counts", async () => {
    makeAccount("alice");
    makeAccount("bob");
    const front = makeRepo("front", "https://github.com/acme/front.git");
    const back = makeRepo("back", "https://github.com/acme/back.git");
    const plain = makeRepo("plain", "https://github.com/acme/plain.git");
    setGithubProjectSource(() => [
      { key: "f", label: "Front", repoPath: front, vcsProvider: "github", githubAccount: "alice" },
      { key: "b", label: "Back", repoPath: back, vcsProvider: "github", githubAccount: "bob" },
      { key: "p", label: "Plain", repoPath: plain, vcsProvider: "github", githubAccount: null },
    ]);
    const graphqlAccounts: (string | null)[] = [];
    setGithubCommandRunners({
      async: async (args: string[], cwd: string, options?: BoundedCommandOptions) => {
        if (args[0] !== "gh") return runBoundedCommand(args, cwd, options);
        graphqlAccounts.push(options?.env?.GH_CONFIG_DIR?.split("/").at(-1) ?? null);
        const inputPath = args[args.indexOf("--input") + 1] ?? "";
        const query = String((await Bun.file(inputPath).json()).query);
        const count = (query.match(/r\d+: repository/g) ?? []).length;
        const data = Object.fromEntries(Array.from({ length: count }, (_, index) => [`r${index}`, {
          pullRequests: { nodes: [], pageInfo: { hasNextPage: false, endCursor: null } },
        }]));
        return { exitCode: 0, stdout: JSON.stringify({ data }), stderr: "", timedOut: false };
      },
    });
    const counts = await new GithubVcsClient().listReviewCounts([front, back, plain]);
    expect(counts).toEqual({ [front]: 0, [back]: 0, [plain]: 0 });
    expect(graphqlAccounts.sort()).toEqual(["alice", "bob", null].sort());
  });
});
