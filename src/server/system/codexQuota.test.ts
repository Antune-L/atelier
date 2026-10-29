import { expect, test } from "bun:test";
import type { z } from "zod";

import { CodexAppServerRpcError } from "./codexAppServer.ts";
import type { CodexAppServerConnection } from "./codexAppServer.ts";
import { readCodexQuota } from "./codexQuota.ts";

const NOW = 1_800_000_000_000;
const RESET_SECONDS = 1_800_003_600;

function fakeConnection(responses: Record<string, unknown>): { connection: CodexAppServerConnection; methods: string[]; closed: () => boolean } {
  const methods: string[] = [];
  let closed = false;
  const connection: CodexAppServerConnection = {
    request: async <T>(method: string, _params: unknown, schema: z.ZodType<T>): Promise<T> => {
      methods.push(method);
      const response = responses[method];
      if (response instanceof Error) throw response;
      if (response === undefined) throw new Error(`unexpected request: ${method}`);
      return schema.parse(response);
    },
    notify: () => {},
    close: async () => {
      closed = true;
    },
    exited: Promise.resolve(0),
  };
  return { connection, methods, closed: () => closed };
}

const CHATGPT_ACCOUNT = { account: { type: "chatgpt", email: "someone@example.com", planType: "plus" }, requiresOpenaiAuth: true };

function read(responses: Record<string, unknown>, environment: Record<string, string | undefined> = {}) {
  const fake = fakeConnection(responses);
  const result = readCodexQuota({ connect: async () => fake.connection, resolveBinary: () => "/bin/codex", environment, now: () => NOW });
  return { result, ...fake };
}

test("a ChatGPT account maps primary and secondary windows to session and weekly", async () => {
  const { result, closed } = read({
    "account/read": CHATGPT_ACCOUNT,
    "account/rateLimits/read": {
      rateLimits: {
        limitId: "codex",
        primary: { usedPercent: 35, windowDurationMins: 300, resetsAt: RESET_SECONDS },
        secondary: { usedPercent: 71, windowDurationMins: 10_080, resetsAt: RESET_SECONDS },
        planType: "pro",
      },
      rateLimitsByLimitId: {
        codex: { limitId: "codex", primary: { usedPercent: 35 } },
        "codex-luna": { limitId: "codex-luna", limitName: "GPT Luna", secondary: { usedPercent: 12, windowDurationMins: 10_080 } },
      },
    },
  });
  const quota = await result;
  expect(quota).toMatchObject({ provider: "codex", state: "ok", source: "live", observedAt: NOW, planType: "pro" });
  expect(quota.windows).toEqual([
    { id: "codex:primary", kind: "session", model: null, usedPercent: 35, windowDurationMins: 300, resetsAt: RESET_SECONDS * 1000 },
    { id: "codex:secondary", kind: "weekly", model: null, usedPercent: 71, windowDurationMins: 10_080, resetsAt: RESET_SECONDS * 1000 },
    { id: "codex:model:codex-luna", kind: "weekly_model", model: "GPT Luna", usedPercent: 12, windowDurationMins: 10_080, resetsAt: null },
  ]);
  expect(quota.accountEmail).toBe(CHATGPT_ACCOUNT.account.email);
  expect(closed()).toBe(true);
});

test("an API-key account is not applicable and never reads rate limits", async () => {
  const { result, methods } = read({ "account/read": { account: { type: "apiKey" }, requiresOpenaiAuth: false } });
  expect((await result).state).toBe("not_applicable");
  expect(methods).toEqual(["account/read"]);
});

test("CODEX_API_KEY is not applicable without connecting", async () => {
  let connected = false;
  const quota = await readCodexQuota({
    connect: async () => {
      connected = true;
      throw new Error("should not connect");
    },
    resolveBinary: () => "/bin/codex",
    environment: { CODEX_API_KEY: "sk-test" },
  });
  expect(quota.state).toBe("not_applicable");
  expect(connected).toBe(false);
});

test("a missing account requiring auth is unauthenticated", async () => {
  const { result } = read({ "account/read": { account: null, requiresOpenaiAuth: true } });
  expect(await result).toMatchObject({ state: "unauthenticated", message: "Connexion Codex requise" });
});

test("an unknown RPC method yields an error state without throwing", async () => {
  const { result, closed } = read({
    "account/read": CHATGPT_ACCOUNT,
    "account/rateLimits/read": new CodexAppServerRpcError(-32601, "Method not found"),
  });
  const quota = await result;
  expect(quota.state).toBe("error");
  expect(quota.message).toContain("0.160.0");
  expect(closed()).toBe(true);
});

test("an individual limit alone becomes a credit window", async () => {
  const { result } = read({
    "account/read": CHATGPT_ACCOUNT,
    "account/rateLimits/read": { rateLimits: { limitId: "codex", primary: null, secondary: null, individualLimit: { usedPercent: 18, resetsAt: RESET_SECONDS } } },
  });
  const quota = await result;
  expect(quota.planType).toBe("plus");
  expect(quota.windows).toEqual([{ id: "codex:credit", kind: "credit", model: null, usedPercent: 18, windowDurationMins: null, resetsAt: RESET_SECONDS * 1000 }]);
});

test("a malformed response is an error state", async () => {
  const { result } = read({ "account/read": CHATGPT_ACCOUNT, "account/rateLimits/read": { rateLimits: "nope" } });
  expect((await result).state).toBe("error");
});
