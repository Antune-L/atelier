import { createHash } from "node:crypto";

import type { CODEX_SDK_VERSION } from "./codexBinary.ts";

export const CODEX_HOOK_TRUST_VERSION: typeof CODEX_SDK_VERSION = "0.153.4";
export const CODEX_SESSION_PRE_TOOL_USE_HOOK_KEY = "/<session-flags>/config.toml:pre_tool_use:0:0";

export type CodexCommandHook = {
  type: "command";
  command: string;
  timeout: number;
  statusMessage: string;
};

type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

function canonicalJson(value: JsonValue): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  const entries = Object.entries(value).sort(([left], [right]) => left.localeCompare(right));
  return `{${entries.map(([key, entry]) => `${JSON.stringify(key)}:${canonicalJson(entry)}`).join(",")}}`;
}

/** Mirrors hook_hash() + version_for_toml() from codex-rs 0.153.4. */
export function codexSessionPreToolUseHookHash(handler: CodexCommandHook): string {
  const normalizedIdentity: JsonValue = {
    event_name: "pre_tool_use",
    hooks: [
      {
        type: handler.type,
        command: handler.command,
        timeout: handler.timeout,
        async: false,
        statusMessage: handler.statusMessage,
      },
    ],
    matcher: "^Bash$",
  };
  const digest = createHash("sha256").update(canonicalJson(normalizedIdentity)).digest("hex");
  return `sha256:${digest}`;
}
