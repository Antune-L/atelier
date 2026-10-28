import { expect, test } from "bun:test";
import type {
  SDKBackgroundTasksChangedMessage,
  SDKCompactBoundaryMessage,
  SDKMessage,
  SDKResultSuccess,
  SDKTaskNotificationMessage,
  SDKTaskStartedMessage,
  SDKUserMessage,
} from "@anthropic-ai/claude-agent-sdk";

import type { AgentImageInput, AgentSessionEvent, AgentSessionOptions } from "./agentSession.ts";
import { createClaudeSubagentTracker, createSdkAgentSession, dispatchClaudeMessage, type ClaudeQuery, type ClaudeSessionDependencies } from "./claudeProvider.ts";

const RESULT = {
  type: "result",
  subtype: "success",
  duration_ms: 1,
  duration_api_ms: 1,
  is_error: false,
  num_turns: 1,
  result: "",
  stop_reason: null,
  total_cost_usd: 0,
  usage: {
    cache_creation: { ephemeral_1h_input_tokens: 0, ephemeral_5m_input_tokens: 0 },
    cache_creation_input_tokens: 0,
    cache_read_input_tokens: 0,
    inference_geo: "",
    input_tokens: 0,
    iterations: [],
    output_tokens: 0,
    output_tokens_details: { thinking_tokens: 0 },
    server_tool_use: { web_fetch_requests: 0, web_search_requests: 0 },
    service_tier: "standard",
    speed: "standard",
  },
  modelUsage: {},
  permission_denials: [],
  uuid: "00000000-0000-4000-8000-000000000001",
  session_id: "s1",
} satisfies SDKResultSuccess;
const COMPACT_BOUNDARY = {
  type: "system",
  subtype: "compact_boundary",
  compact_metadata: { trigger: "manual", pre_tokens: 80_000, post_tokens: 6_000 },
  uuid: "00000000-0000-4000-8000-000000000002",
  session_id: "s1",
} satisfies SDKCompactBoundaryMessage;

interface ScriptedQuery {
  dependencies: ClaudeSessionDependencies;
  prompts: string[];
  messages: SDKUserMessage[];
  contextReads(): number;
}

function scriptedQuery(): ScriptedQuery {
  const prompts: string[] = [];
  const messages: SDKUserMessage[] = [];
  let reads = 0;
  let used = 50_000;
  const query = ({ prompt }: { prompt: AsyncIterable<SDKUserMessage> }): ClaudeQuery => {
    async function* stream(): AsyncGenerator<SDKMessage> {
      for await (const message of prompt) {
        messages.push(message);
        const content = typeof message.message.content === "string" ? message.message.content : "";
        prompts.push(content);
        if (content === "/compact") {
          used = 6_000;
          yield COMPACT_BOUNDARY;
        }
        yield RESULT;
      }
    }
    const iterator = stream();
    return {
      [Symbol.asyncIterator]: () => iterator,
      interrupt: async () => undefined,
      close: () => undefined,
      getContextUsage: async () => {
        reads += 1;
        return { totalTokens: used, rawMaxTokens: 200_000 };
      },
    };
  };
  return { dependencies: { query, ensureBinary: async () => "/fixture/claude" }, prompts, messages, contextReads: () => reads };
}

function options(events: AgentSessionEvent[], reportContextUsage: boolean): AgentSessionOptions {
  return {
    ticketId: "atelier-1",
    slotId: 0,
    cwd: "/tmp",
    provider: "claude",
    role: "atelier",
    model: "opus",
    effort: null,
    permissionMode: "dontAsk",
    disableWorkerTools: true,
    reportContextUsage,
    onToolCall: async () => ({ ok: true, result: "ok" }),
    onEvent: (event) => events.push(event),
  };
}

async function waitFor(check: () => boolean): Promise<void> {
  for (let attempt = 0; attempt < 200; attempt += 1) {
    if (check()) return;
    await Bun.sleep(1);
  }
  throw new Error("fixture timeout");
}

const turnEnds = (events: AgentSessionEvent[]): number => events.filter((event) => event.type === "turn_end").length;

test("Claude delivers uploaded images as native vision blocks and keeps plain turns unchanged", async () => {
  const fixture = scriptedQuery();
  const events: AgentSessionEvent[] = [];
  const image: AgentImageInput = { path: "/uploads/fixture.png", mediaType: "image/png", data: "cG5n" };
  const session = createSdkAgentSession(options(events, false), fixture.dependencies);

  session.send("Describe the attachment", "image-turn", [image]);
  session.send("Follow-up", "text-turn");
  await waitFor(() => turnEnds(events) === 2);

  expect(fixture.messages[0]?.message.content).toEqual([
    { type: "text", text: "Describe the attachment" },
    { type: "image", source: { type: "base64", media_type: image.mediaType, data: image.data } },
  ]);
  expect(fixture.messages[1]?.message.content).toBe("Follow-up");
  expect(events).toContainEqual({ type: "message_status", messageId: "image-turn", status: "accepted", turnId: null });
  await session.close();
});

test("Claude yields a steering message with priority next and leaves regular turns unprioritized", async () => {
  const fixture = scriptedQuery();
  const events: AgentSessionEvent[] = [];
  const session = createSdkAgentSession(options(events, false), fixture.dependencies);

  session.send("Bonjour", "plain-turn");
  session.send("Plutôt X", "steer-turn", undefined, { steer: true });
  await waitFor(() => turnEnds(events) === 2);

  expect(fixture.messages[0]?.priority).toBeUndefined();
  expect(fixture.messages[1]?.priority).toBe("next");
  await session.close();
});

test("Claude reports the context usage after each turn and compacts through /compact", async () => {
  const fixture = scriptedQuery();
  const events: AgentSessionEvent[] = [];
  const session = createSdkAgentSession(options(events, true), fixture.dependencies);

  session.send("bonjour");
  await waitFor(() => events.some((event) => event.type === "context_usage"));
  expect(events.filter((event) => event.type === "context_usage")).toEqual([
    { type: "context_usage", usedTokens: 50_000, maxTokens: 200_000 },
  ]);

  if (!session.compact) throw new Error("compact manquant");
  await session.compact();
  await waitFor(() => turnEnds(events) === 2);
  expect(fixture.prompts).toEqual(["bonjour", "/compact"]);
  // The compact boundary reports the reduced context before the compaction turn ends.
  const compactTurnEnd = events.findLastIndex((event) => event.type === "turn_end");
  const reduced = events.findIndex((event) => event.type === "context_usage" && event.usedTokens === 6_000);
  expect(reduced).toBeGreaterThan(-1);
  expect(reduced).toBeLessThan(compactTurnEnd);
  await session.close();
  await expect(session.compact()).rejects.toThrow("compactage impossible");
});

test("Claude never reads the context usage when the option is off", async () => {
  const fixture = scriptedQuery();
  const events: AgentSessionEvent[] = [];
  const session = createSdkAgentSession(options(events, false), fixture.dependencies);

  session.send("bonjour");
  await waitFor(() => turnEnds(events) === 1);
  await session.close();
  expect(fixture.contextReads()).toBe(0);
  expect(events.some((event) => event.type === "context_usage")).toBe(false);
});

test("a failing context read never breaks the Claude stream", async () => {
  const fixture = scriptedQuery();
  const events: AgentSessionEvent[] = [];
  const query = fixture.dependencies.query;
  const session = createSdkAgentSession(options(events, true), {
    ...fixture.dependencies,
    query: (params) => ({ ...query(params), getContextUsage: async () => { throw new Error("session fermée"); } }),
  });

  session.send("un");
  session.send("deux");
  await waitFor(() => turnEnds(events) === 2);
  await session.close();
  expect(events.some((event) => event.type === "error" || event.type === "context_usage")).toBe(false);
});

function toolResultMessage(parentToolUseId: string | null, extra: Partial<SDKUserMessage> = {}): SDKUserMessage {
  return {
    type: "user",
    parent_tool_use_id: parentToolUseId,
    message: { role: "user", content: [{ type: "tool_result", tool_use_id: "call-1", content: "ok" }] },
    ...extra,
  };
}

function taskStarted(extra: Partial<SDKTaskStartedMessage>): SDKTaskStartedMessage {
  return {
    type: "system",
    subtype: "task_started",
    task_id: "task-1",
    tool_use_id: "agent-call-1",
    description: "Explorer le code",
    subagent_type: "Explore",
    task_type: "local_agent",
    uuid: "00000000-0000-4000-8000-000000000004",
    session_id: "s1",
    ...extra,
  };
}

function taskNotification(taskId: string, status: SDKTaskNotificationMessage["status"]): SDKTaskNotificationMessage {
  return {
    type: "system",
    subtype: "task_notification",
    task_id: taskId,
    status,
    output_file: "/tmp/out",
    summary: "",
    uuid: "00000000-0000-4000-8000-000000000005",
    session_id: "s1",
  };
}

test("Claude attributes sub-agent events from parent_tool_use_id without touching sourceId", () => {
  const events: AgentSessionEvent[] = [];
  const tracker = createClaudeSubagentTracker();
  const push = (event: AgentSessionEvent): void => { events.push(event); };

  dispatchClaudeMessage(toolResultMessage(null), push, undefined, tracker);
  dispatchClaudeMessage(toolResultMessage("p1", { task_description: "Lire", subagent_type: "Explore" }), push, undefined, tracker);
  dispatchClaudeMessage(toolResultMessage("p2", { subagent_type: "Explore" }), push, undefined, tracker);
  dispatchClaudeMessage(toolResultMessage("p3"), push, undefined, tracker);
  dispatchClaudeMessage(taskStarted({ tool_use_id: "p4", description: "Chercher", subagent_type: undefined }), push, undefined, tracker);
  dispatchClaudeMessage(toolResultMessage("p4"), push, undefined, tracker);

  const results = events.filter((event) => event.type === "tool_result");
  expect(results[0]).toEqual({ type: "tool_result", toolCallId: "call-1", output: "ok", ok: true });
  expect(results.map((event) => event.subagent)).toEqual([
    undefined,
    { id: "p1", label: "Lire · Explore" },
    { id: "p2", label: "Explore" },
    { id: "p3", label: "Sous-agent" },
    { id: "p4", label: "Chercher" },
  ]);
  expect(results.some((event) => event.sourceId !== undefined)).toBe(false);
});

test("Claude reports the lifecycle of local agents only", () => {
  const events: AgentSessionEvent[] = [];
  const tracker = createClaudeSubagentTracker();
  const push = (event: AgentSessionEvent): void => { events.push(event); };

  dispatchClaudeMessage(taskStarted({}), push, undefined, tracker);
  dispatchClaudeMessage(taskStarted({ task_id: "bash", tool_use_id: "b", task_type: "local_bash" }), push, undefined, tracker);
  dispatchClaudeMessage(taskStarted({ task_id: "amb", tool_use_id: "a", ambient: true }), push, undefined, tracker);
  dispatchClaudeMessage(taskStarted({ task_id: "task-2", tool_use_id: undefined, description: "", subagent_type: undefined }), push, undefined, tracker);
  dispatchClaudeMessage(taskNotification("bash", "completed"), push, undefined, tracker);
  dispatchClaudeMessage(taskNotification("task-1", "completed"), push, undefined, tracker);
  dispatchClaudeMessage(taskNotification("task-1", "completed"), push, undefined, tracker);
  dispatchClaudeMessage(taskNotification("task-2", "failed"), push, undefined, tracker);

  expect(events).toEqual([
    { type: "subagent_lifecycle", phase: "started", id: "agent-call-1", label: "Explorer le code · Explore" },
    { type: "subagent_lifecycle", phase: "started", id: "task-2", label: "Sous-agent" },
    { type: "subagent_lifecycle", phase: "ended", id: "agent-call-1", label: "Explorer le code · Explore", status: "completed" },
    { type: "subagent_lifecycle", phase: "ended", id: "task-2", label: "Sous-agent", status: "failed" },
  ]);
});

test("Claude reports live non-ambient background tasks, including an empty set", () => {
  const events: AgentSessionEvent[] = [];
  const changed = (tasks: SDKBackgroundTasksChangedMessage["tasks"]): SDKBackgroundTasksChangedMessage => ({
    type: "system",
    subtype: "background_tasks_changed",
    tasks,
    uuid: "00000000-0000-4000-8000-000000000003",
    session_id: "s1",
  });

  dispatchClaudeMessage(changed([
    { task_id: "t1", task_type: "local_agent", description: "revue" },
    { task_id: "w1", task_type: "monitor", description: "watcher", ambient: true },
    { task_id: "t2", task_type: "local_agent", description: "revue 2", ambient: false },
  ]), (event) => events.push(event));
  dispatchClaudeMessage(changed([]), (event) => events.push(event));

  expect(events).toEqual([
    { type: "background_tasks", activeTaskIds: ["t1", "t2"] },
    { type: "background_tasks", activeTaskIds: [] },
  ]);
});
