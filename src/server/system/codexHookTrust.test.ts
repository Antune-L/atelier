import { expect, test } from "bun:test";

import {
  CODEX_HOOK_TRUST_VERSION,
  CODEX_SESSION_PRE_TOOL_USE_HOOK_KEY,
  codexSessionPreToolUseHookHash,
} from "./codexHookTrust.ts";

test("Codex 0.153.4 session hook trust matches the normalized upstream identity", () => {
  expect(CODEX_HOOK_TRUST_VERSION).toBe("0.153.4");
  expect(CODEX_SESSION_PRE_TOOL_USE_HOOK_KEY).toBe("/<session-flags>/config.toml:pre_tool_use:0:0");
  expect(
    codexSessionPreToolUseHookHash({
      type: "command",
      command: "'/tmp/deny-no-verify.sh'",
      timeout: 5,
      statusMessage: "Checking git policy",
    }),
  ).toBe("sha256:fe7f6e31b2858a535e5a5de5419ec8c88220a11a4412753aeaa5929f59a7be7f");
});

test("hook trust changes when the exact injected command changes", () => {
  const first = codexSessionPreToolUseHookHash({
    type: "command",
    command: "'/tmp/first.sh'",
    timeout: 5,
    statusMessage: "Checking git policy",
  });
  const second = codexSessionPreToolUseHookHash({
    type: "command",
    command: "'/tmp/second.sh'",
    timeout: 5,
    statusMessage: "Checking git policy",
  });
  expect(first).not.toBe(second);
});
