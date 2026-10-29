import { describe, expect, test } from "bun:test";

import { LocalUsageHistory, localHistoryRoots, parseClaudeHistory, parseCodexHistory } from "./localHistory.ts";
import type { LocalHistoryFs } from "./localHistory.ts";

const TS = "2026-10-20T10:00:00.000Z";

function claudeLine(overrides: Record<string, unknown> = {}, usage: Record<string, unknown> = {}): string {
  return JSON.stringify({
    type: "assistant", sessionId: "s1", timestamp: TS, requestId: "req1",
    message: { id: "msg1", model: "claude-opus-5-5", content: [{ type: "text", text: "secret" }], usage: {
      input_tokens: 10, output_tokens: 20, cache_read_input_tokens: 30, cache_creation_input_tokens: 40, ...usage,
    } },
    ...overrides,
  });
}

describe("parseClaudeHistory", () => {
  test("keeps assistant usage lines and ignores malformed or unrelated ones", () => {
    const text = [
      claudeLine(),
      "{not json",
      JSON.stringify({ type: "user", sessionId: "s1", timestamp: TS, message: { content: "hi" } }),
      claudeLine({ message: { model: "<synthetic>", usage: { input_tokens: 1 } } }),
      claudeLine({ requestId: "req2" }, { speed: "fast" }),
    ].join("\n");
    const entries = parseClaudeHistory(text);
    expect(entries).toHaveLength(2);
    expect(entries[0]).toEqual({
      provider: "claude", sessionId: "s1", timestamp: Date.parse(TS), model: "claude-opus-5-5", speed: "standard", fast: false,
      tokens: { input: 10, output: 20, cacheRead: 30, cacheCreate: 40 }, dedupKey: "msg1\u0000req1",
    });
    expect(entries[1]).toMatchObject({ speed: "fast", fast: true });
  });
});

describe("parseCodexHistory", () => {
  test("attaches last_token_usage to the current turn context and never sums totals", () => {
    const lines = [
      { timestamp: TS, type: "session_meta", payload: { session_id: "codex-1", cwd: "/x" } },
      { timestamp: TS, type: "event_msg", payload: { type: "token_count", info: null } },
      { timestamp: TS, type: "turn_context", payload: { model: "gpt-6-astra", service_tier: "default" } },
      { timestamp: TS, type: "event_msg", payload: { type: "token_count", info: {
        last_token_usage: { input_tokens: 100, cached_input_tokens: 60, output_tokens: 7, reasoning_output_tokens: 3 },
        total_token_usage: { input_tokens: 9_999 },
      } } },
      { timestamp: TS, type: "turn_context", payload: { model: "gpt-6-astra", service_tier: "priority" } },
      { timestamp: TS, type: "event_msg", payload: { type: "token_count", info: { last_token_usage: { input_tokens: 5, output_tokens: 1 } } } },
      { timestamp: TS, type: "response_item", payload: { type: "message", content: "secret" } },
    ].map((line) => JSON.stringify(line)).join("\n");
    const entries = parseCodexHistory(lines, "/s/2026/10/20/rollout-2026-10-20T10-00-00-abc.jsonl");
    expect(entries).toHaveLength(2);
    expect(entries[0]).toMatchObject({
      sessionId: "codex-1", model: "gpt-6-astra", speed: "standard", fast: false,
      tokens: { input: 100, output: 7, cacheRead: 60, cacheCreate: 0 },
    });
    expect(entries[1]).toMatchObject({ speed: "priority", fast: true, tokens: { input: 5, output: 1, cacheRead: 0, cacheCreate: 0 } });
  });

  test("keeps a non-fast tier visible without FAST pricing", () => {
    const text = [
      { timestamp: TS, type: "turn_context", payload: { model: "gpt-6-astra", service_tier: "flex" } },
      { timestamp: TS, type: "event_msg", payload: { type: "token_count", info: { last_token_usage: { input_tokens: 5 } } } },
    ].map((line) => JSON.stringify(line)).join("\n");
    expect(parseCodexHistory(text, "/s/rollout-x.jsonl")[0]).toMatchObject({ speed: "flex", fast: false });
  });

  test("skips a re-emitted token_count whose cumulative total did not change", () => {
    const count = (total: number) => ({ timestamp: TS, type: "event_msg", payload: { type: "token_count", info: {
      last_token_usage: { input_tokens: 10, output_tokens: 2 },
      total_token_usage: { total_tokens: total },
    } } });
    const text = [
      { timestamp: TS, type: "turn_context", payload: { model: "gpt-6-astra" } },
      count(12), count(12), count(24),
    ].map((line) => JSON.stringify(line)).join("\n");
    expect(parseCodexHistory(text, "/s/rollout-x.jsonl")).toHaveLength(2);
  });

  test("falls back to the file name id and an unknown model", () => {
    const path = "/s/rollout-2026-10-20T10-00-00-0199a1b2-c3d4-7e5f-8a9b-0c1d2e3f4a5b.jsonl";
    const text = JSON.stringify({ timestamp: TS, type: "event_msg", payload: { type: "token_count", info: { last_token_usage: { input_tokens: 1 } } } });
    expect(parseCodexHistory(text, path)[0]).toMatchObject({ sessionId: "0199a1b2-c3d4-7e5f-8a9b-0c1d2e3f4a5b", model: "unknown" });
  });
});

describe("LocalUsageHistory", () => {
  function fakeFs(files: Map<string, { text: string; mtimeMs: number }>, broken = new Set<string>()) {
    const reads: string[] = [];
    const fs: LocalHistoryFs = {
      async listFiles(root) {
        return [...files.keys()].filter((path) => path.startsWith(`${root}/`));
      },
      async stat(path) {
        const file = files.get(path);
        if (!file) throw new Error("missing");
        return { size: file.text.length, mtimeMs: file.mtimeMs };
      },
      async readText(path) {
        reads.push(path);
        if (broken.has(path)) throw new Error("unreadable");
        const file = files.get(path);
        if (!file) throw new Error("missing");
        return file.text;
      },
    };
    return { fs, reads };
  }

  const roots = { claudeProjects: "/c/projects", codexSessions: "/x/sessions" };

  test("caches unchanged files, rereads changed ones and drops removed ones", async () => {
    const files = new Map([
      ["/c/projects/p/a.jsonl", { text: claudeLine(), mtimeMs: 1 }],
      ["/c/projects/p/a/subagents/b.jsonl", { text: claudeLine({ requestId: "r2" }), mtimeMs: 1 }],
      ["/x/sessions/2026/10/20/rollout-1.jsonl", { text: "", mtimeMs: 1 }],
      ["/x/sessions/2026/10/20/notes.txt", { text: "", mtimeMs: 1 }],
    ]);
    const { fs, reads } = fakeFs(files);
    const history = new LocalUsageHistory(fs, roots);
    expect((await history.read()).entries).toHaveLength(2);
    expect(reads).toHaveLength(3);
    await history.read();
    expect(reads).toHaveLength(3);
    files.set("/c/projects/p/a.jsonl", { text: claudeLine(), mtimeMs: 2 });
    files.delete("/c/projects/p/a/subagents/b.jsonl");
    const third = await history.read();
    expect(reads).toHaveLength(4);
    expect(third.entries).toHaveLength(1);
    expect(third.files).toBe(2);
  });

  test("skips a failing file without dropping the others", async () => {
    const files = new Map([
      ["/c/projects/a.jsonl", { text: claudeLine(), mtimeMs: 1 }],
      ["/c/projects/b.jsonl", { text: claudeLine(), mtimeMs: 1 }],
    ]);
    const { fs } = fakeFs(files, new Set(["/c/projects/b.jsonl"]));
    const result = await new LocalUsageHistory(fs, roots).read();
    expect(result.entries).toHaveLength(1);
    expect(result.failedFiles).toBe(1);
  });

  test("roots follow CLAUDE_CONFIG_DIR and CODEX_HOME", () => {
    expect(localHistoryRoots({}, "/h")).toEqual({ claudeProjects: "/h/.claude/projects", codexSessions: "/h/.codex/sessions" });
    expect(localHistoryRoots({ CLAUDE_CONFIG_DIR: "/cc", CODEX_HOME: "/cx" }, "/h"))
      .toEqual({ claudeProjects: "/cc/projects", codexSessions: "/cx/sessions" });
  });
});
