import { afterAll, beforeAll, beforeEach, describe, expect, test } from "bun:test";
import { existsSync, mkdtempSync, readdirSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { clearGithubIdentityCache, configureGithubAccountsRoot, setGithubCommandRunners } from "./accountEnv.ts";
import { FakeGithubAccountRegistry, RealGithubAccountRegistry } from "./accounts.ts";
import type { GhProcessRunner } from "./accounts.ts";

const TOKEN = "ghp_abcdefghijklmnopqrstuvwxyz0123456789";
let root: string;

interface Call {
  args: string[];
  env: Record<string, string>;
  stdin: string | null;
}

/** A gh double: `auth login` writes hosts.yml into GH_CONFIG_DIR, `api user` answers `login`. */
function fakeGh(login: string | null, calls: Call[]): GhProcessRunner {
  return async (args, env, stdin) => {
    calls.push({ args, env, stdin });
    if (args[1] === "auth") {
      if (login === null) return { exitCode: 1, stdout: "", stderr: `error validating token ${TOKEN}`, timedOut: false };
      await Bun.write(join(env.GH_CONFIG_DIR ?? "", "hosts.yml"), "github.com:\n  oauth_token: secret\n");
      return { exitCode: 0, stdout: "", stderr: "", timedOut: false };
    }
    return { exitCode: 0, stdout: `${login ?? ""}\n`, stderr: "", timedOut: false };
  };
}

beforeAll(() => {
  root = mkdtempSync(join(tmpdir(), "kanban-gh-accounts-"));
  configureGithubAccountsRoot(root);
});

afterAll(() => {
  rmSync(root, { recursive: true, force: true });
});

beforeEach(() => {
  clearGithubIdentityCache();
  setGithubCommandRunners();
});

describe("RealGithubAccountRegistry", () => {
  test("adds an account into a private GH_CONFIG_DIR and never passes the token in argv or env", async () => {
    const calls: Call[] = [];
    const registry = new RealGithubAccountRegistry(fakeGh("Alice", calls));
    expect(await registry.add(` ${TOKEN} `)).toEqual({ login: "alice" });
    const dir = join(root, "gh-accounts", "alice");
    expect(statSync(dir).mode & 0o777).toBe(0o700);
    for (const name of readdirSync(dir)) expect(statSync(join(dir, name)).mode & 0o777).toBe(0o600);
    expect(existsSync(join(dir, "gitconfig"))).toBe(true);
    for (const call of calls) {
      expect(call.env.GH_CONFIG_DIR).toBeTruthy();
      expect(call.args.join(" ")).not.toContain(TOKEN);
      expect(Object.values(call.env)).not.toContain(TOKEN);
    }
    expect(calls[0]?.stdin).toBe(`${TOKEN}\n`);
  });

  test("replacing an account keeps a single folder per login", async () => {
    const registry = new RealGithubAccountRegistry(fakeGh("alice", []));
    await registry.add(TOKEN);
    await registry.add(TOKEN);
    const entries = readdirSync(join(root, "gh-accounts")).filter((name) => !name.startsWith("."));
    expect(entries.filter((name) => name === "alice")).toHaveLength(1);
    expect(readdirSync(join(root, "gh-accounts")).some((name) => name.startsWith(".pending-"))).toBe(false);
  });

  test("a refused token removes the attempt folder and never echoes the token", async () => {
    const registry = new RealGithubAccountRegistry(fakeGh(null, []));
    const error = await registry.add(TOKEN).catch((caught: unknown) => caught);
    expect(String(error)).not.toContain(TOKEN);
    expect(readdirSync(join(root, "gh-accounts")).some((name) => name.startsWith(".pending-"))).toBe(false);
  });

  test("lists accounts with a read-only identity probe and removes them", async () => {
    const registry = new RealGithubAccountRegistry(fakeGh("bob", []));
    await registry.add(TOKEN);
    setGithubCommandRunners({
      async: async (args) => ({ exitCode: 0, stdout: args[0] === "gh" ? "bob\n" : "", stderr: "", timedOut: false }),
    });
    const statuses = await registry.list();
    expect(statuses.find((status) => status.login === "bob")).toEqual({ login: "bob", status: "valid", reason: null });
    await registry.remove("bob");
    expect(existsSync(join(root, "gh-accounts", "bob"))).toBe(false);
  });
});

describe("FakeGithubAccountRegistry", () => {
  test("simulates accounts without touching the disk", async () => {
    const registry = new FakeGithubAccountRegistry();
    expect(await registry.add("anything")).toEqual({ login: FakeGithubAccountRegistry.DEFAULT_LOGIN });
    expect(await registry.logins()).toEqual([FakeGithubAccountRegistry.DEFAULT_LOGIN]);
    await expect(registry.add(FakeGithubAccountRegistry.REJECTED_TOKEN)).rejects.toThrow();
    await registry.remove(FakeGithubAccountRegistry.DEFAULT_LOGIN);
    expect(await registry.list()).toEqual([]);
  });
});
