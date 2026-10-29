import { expect, test } from "bun:test";

import { claudeLoginStatusSchema } from "../../shared/claudeLogin.ts";
import { ClaudeLoginManager, claudeLoginEnvironment, parseClaudeLoginUrl } from "./claudeLogin.ts";
import type { ClaudeLoginDependencies, ClaudeLoginSpawnHandlers } from "./claudeLogin.ts";

const NOW = 1_800_000_000_000;
const URL = "https://claude.ai/oauth/authorize?code=true&client_id=abc&state=xyz";
const CODE = "secret-code-123#state";

interface FakeChild {
  handlers: ClaudeLoginSpawnHandlers;
  env: Record<string, string>;
  args: string[];
  stdin: string[];
  killed: boolean;
  exit(code: number): void;
}

function harness(environment: Record<string, string | undefined> = {}) {
  const children: FakeChild[] = [];
  const timers: Array<{ callback: () => void; ms: number; cancelled: boolean }> = [];
  const dependencies: ClaudeLoginDependencies = {
    environment,
    resolveBinary: () => "/bin/claude",
    now: () => NOW,
    setTimer: (callback, ms) => {
      const timer = { callback, ms, cancelled: false };
      timers.push(timer);
      return () => {
        timer.cancelled = true;
      };
    },
    spawn: (_binary, args, env, handlers) => {
      let resolveExit: (code: number) => void = () => {};
      const exited = new Promise<number>((resolve) => {
        resolveExit = resolve;
      });
      const child: FakeChild = { handlers, env, args, stdin: [], killed: false, exit: (code) => resolveExit(code) };
      children.push(child);
      return {
        writeStdin: (text) => child.stdin.push(text),
        kill: () => {
          child.killed = true;
          resolveExit(143);
        },
        exited,
      };
    },
  };
  return { manager: new ClaudeLoginManager(dependencies), children, timers };
}

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

test("parses the first complete https URL, tolerating ANSI codes and split chunks", () => {
  expect(parseClaudeLoginUrl(`Browser didn't open? Use:\n\u001b[1m${URL}\u001b[0m\n\nPaste code here: `)).toBe(URL);
  expect(parseClaudeLoginUrl("https://claude.ai/oauth/auth")).toBeNull();
  expect(parseClaudeLoginUrl("no link")).toBeNull();
});

test("the child environment drops CLAUDE_CODE_OAUTH_TOKEN only", () => {
  expect(claudeLoginEnvironment({ CLAUDE_CODE_OAUTH_TOKEN: "oat", HOME: "/home/k", ANTHROPIC_API_KEY: "sk", EMPTY: undefined })).toEqual({
    HOME: "/home/k",
    ANTHROPIC_API_KEY: "sk",
  });
});

test("start, URL, code submission and success without restart", async () => {
  const { manager, children } = harness({ HOME: "/home/k" });
  expect(manager.status().state).toBe("idle");
  expect(manager.start()).toMatchObject({ state: "starting", url: null, expiresAt: NOW + 600_000 });
  const child = children[0];
  expect(child?.args).toEqual(["auth", "login"]);
  child?.handlers.onOutput("Open: https://claude.ai/oauth/auth");
  expect(manager.status().state).toBe("starting");
  child?.handlers.onOutput(`orize?code=true&client_id=abc&state=xyz\nPaste code: `);
  expect(manager.status()).toMatchObject({ state: "awaiting_code", url: URL });
  expect(manager.start().state).toBe("awaiting_code");
  expect(children).toHaveLength(1);

  expect(manager.submitCode(`  ${CODE} `).state).toBe("submitting");
  expect(child?.stdin).toEqual([`${CODE}\n`]);
  expect(JSON.stringify(manager.status())).not.toContain(CODE);
  child?.exit(0);
  await flush();
  const status = manager.status();
  expect(status).toMatchObject({ state: "success", url: null, expiresAt: null, oauthTokenEnvSet: false, restartRequired: false });
  expect(claudeLoginStatusSchema.parse(status)).toEqual(status);
  expect(JSON.stringify(status)).not.toContain(CODE);
});

test("success with the env token still set requires a restart and the child never sees the token", async () => {
  const { manager, children } = harness({ CLAUDE_CODE_OAUTH_TOKEN: "oat-secret" });
  expect(manager.start().oauthTokenEnvSet).toBe(true);
  const child = children[0];
  expect(child?.env.CLAUDE_CODE_OAUTH_TOKEN).toBeUndefined();
  child?.handlers.onOutput(`${URL}\n`);
  manager.submitCode(CODE);
  child?.exit(0);
  await flush();
  expect(manager.status()).toMatchObject({ state: "success", restartRequired: true, oauthTokenEnvSet: true });
  expect(JSON.stringify(manager.status())).not.toContain("oat-secret");
});

test("a rejected code fails with a fixed message that echoes nothing", async () => {
  const { manager, children } = harness();
  manager.start();
  const child = children[0];
  child?.handlers.onOutput(`${URL}\n`);
  manager.submitCode(CODE);
  child?.handlers.onOutput(`Invalid code ${CODE}\n`);
  child?.exit(1);
  await flush();
  const status = manager.status();
  expect(status.state).toBe("failed");
  expect(status.message).toBe("La connexion Claude a échoué : réessaie");
  expect(JSON.stringify(status)).not.toContain(CODE);
});

test("an exit before any URL fails, then a new start replaces the terminal state", async () => {
  const { manager, children } = harness();
  manager.start();
  children[0]?.exit(1);
  await flush();
  expect(manager.status()).toMatchObject({ state: "failed", message: "La commande claude auth login s'est arrêtée sans fournir de lien" });
  expect(manager.start().state).toBe("starting");
  expect(children).toHaveLength(2);
});

test("a code is ignored unless a URL awaits it", () => {
  const { manager, children } = harness();
  manager.start();
  expect(manager.submitCode(CODE).state).toBe("starting");
  expect(children[0]?.stdin).toEqual([]);
});

test("cancel kills the child and a late exit does not override cancelled", async () => {
  const { manager, children, timers } = harness();
  manager.start();
  children[0]?.handlers.onOutput(`${URL}\n`);
  expect(manager.cancel()).toMatchObject({ state: "cancelled", url: null, message: "Connexion annulée" });
  expect(children[0]?.killed).toBe(true);
  expect(timers[0]?.cancelled).toBe(true);
  await flush();
  expect(manager.status().state).toBe("cancelled");
});

test("the expiry timer kills a pending flow", async () => {
  const { manager, children, timers } = harness();
  manager.start();
  children[0]?.handlers.onOutput(`${URL}\n`);
  expect(timers[0]?.ms).toBe(600_000);
  timers[0]?.callback();
  expect(children[0]?.killed).toBe(true);
  await flush();
  expect(manager.status()).toMatchObject({ state: "expired", url: null, expiresAt: null });
});

test("a missing binary or a spawn failure fails without throwing", () => {
  const missing = new ClaudeLoginManager({ environment: {}, resolveBinary: () => null, spawn: () => {
    throw new Error("unreachable");
  } });
  expect(missing.start()).toMatchObject({ state: "failed", message: "Binaire claude introuvable" });
  const broken = new ClaudeLoginManager({ environment: {}, resolveBinary: () => "/bin/claude", spawn: () => {
    throw new Error("EACCES");
  } });
  expect(broken.start()).toMatchObject({ state: "failed", message: "Impossible de lancer claude auth login" });
});
