import { expect, test } from "bun:test";

import type { CodexRuntimeStatus } from "../../shared/codexCapabilities.ts";
import { CapabilityCache } from "./capabilityCache.ts";

test("authentication changes refresh without restarting and concurrent reads share one probe", async () => {
  let calls = 0;
  let time = 100;
  const cache = new CapabilityCache(async (): Promise<CodexRuntimeStatus> => {
    calls += 1;
    return { status: calls === 1 ? "unauthenticated" : "ready", checkedAt: time, models: [], message: null };
  }, () => time);
  const [first, second] = await Promise.all([cache.read(), cache.read(true)]);
  expect(calls).toBe(1);
  expect(first).toEqual(second);
  expect((await cache.read()).status).toBe("unauthenticated");
  expect((await cache.read(true)).status).toBe("ready");
  expect(calls).toBe(2);
  time += 30_001;
  await cache.read();
  expect(calls).toBe(3);
});

test("probe failures become temporarily unavailable instead of breaking capabilities", async () => {
  const cache = new CapabilityCache(async () => { throw new Error("service unavailable"); });
  expect((await cache.read()).status).toBe("temporarily_unavailable");
});
