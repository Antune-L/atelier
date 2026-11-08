import { expect, test } from "bun:test";

import { detectQuotaRefusal } from "./quotaRefusal.ts";

test("a rejected Claude rate-limit window is a quota refusal with its reset time", () => {
  expect(detectQuotaRefusal({ type: "rate_limit", status: "rejected", resetsAt: 1_900_000_000, rateLimitType: "five_hour", utilization: 1 }, "claude"))
    .toEqual({ provider: "claude", resetsAt: 1_900_000_000_000, reason: "Claude rate limit rejected (five_hour)." });
  expect(detectQuotaRefusal({ type: "rate_limit", status: "allowed_warning", resetsAt: null, rateLimitType: "five_hour", utilization: 0.9 }, "claude")).toBeNull();
});

test("a Codex usage-limit error is a quota refusal for the session provider only", () => {
  expect(detectQuotaRefusal({ type: "error", message: "You've hit your usage limit. Try again later." }, "codex")?.provider).toBe("codex");
  expect(detectQuotaRefusal({ type: "error", message: "model_not_found" }, "codex")).toBeNull();
  expect(detectQuotaRefusal({ type: "error", message: "usage limit" }, null)).toBeNull();
});
