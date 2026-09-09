import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { z } from "zod";

import { CODEX_MAX_CONCURRENT_SUBAGENT_THREADS } from "../../shared/constants.ts";
import { TranscriptBuffer } from "../agents/transcriptBuffer.ts";
import { WorkerMcpManager } from "../workerMcp.ts";
import type { AgentSessionEvent, AgentSessionOptions } from "./agentSession.ts";
import {
  CodexAppServerRpcError,
  JSONRPC_INVALID_REQUEST,
  type CodexAppServerConnection,
  type CodexAppServerNotification,
  type CodexAppServerOptions,
} from "./codexAppServer.ts";
import { codexSessionPreToolUseHookHash } from "./codexHookTrust.ts";
import { createCodexProvider } from "./codexProvider.ts";
import { runOneShotSession } from "./oneShotSession.ts";
import { REVIEW_PUBLISHING_DENIAL_REASON } from "./reviewPublishingGuard.ts";
import { TYPECHECK_DENIAL_REASON } from "./typecheckGuard.ts";

interface RecordedRequest {
  method: string;
  params: unknown;
}

interface AppServerFixture {
  connection: CodexAppServerConnection;
  connect(options: CodexAppServerOptions): Promise<CodexAppServerConnection>;
  connectOptions(): CodexAppServerOptions | undefined;
  requests: RecordedRequest[];
  closeCount(): number;
  notify(notification: CodexAppServerNotification): void;
  exit(code: number): void;
}

const RECONCILIATION_PAGE_LIMIT = 100;
const PROBE_INTERVAL_MS = 5;

interface AppServerFixtureOptions {
  steerResponseLost?: boolean;
  steerTimesOut?: boolean;
  steerRejectsNoActiveTurn?: boolean;
  steerGate?: Promise<void>;
  interruptRejectsNoActiveTurn?: boolean;
  latestTurnInProgressId?: string;
  historicalMessageId?: string;
  historicalMessageOnSecondPage?: boolean;
  turnsListFails?: boolean;
  inheritedMcpServers?: Record<string, unknown>;
  malformedConfigRead?: boolean;
  connectDelay?: Promise<void>;
}

function appServerFixture(options: AppServerFixtureOptions = {}): AppServerFixture {
  const requests: RecordedRequest[] = [];
  let onNotification: ((notification: CodexAppServerNotification) => void) | undefined;
  let capturedOptions: CodexAppServerOptions | undefined;
  let closes = 0;
  let lostSteerMessageId: string | null = null;
  let resolveExit: ((code: number) => void) | undefined;
  const exited = new Promise<number>((resolve) => {
    resolveExit = resolve;
  });
  const connection: CodexAppServerConnection = {
    request: async <T>(method: string, params: unknown, schema: z.ZodType<T>): Promise<T> => {
      requests.push({ method, params });
      if (method === "config/read") {
        if (options.malformedConfigRead) return schema.parse({ config: { mcp_servers: "invalid" } });
        return schema.parse({ config: { mcp_servers: options.inheritedMcpServers ?? {} } });
      }
      if (method === "thread/start") return schema.parse({ thread: { id: "thread-1" } });
      if (method === "thread/resume") return schema.parse({ thread: { id: "thread-resumed" } });
      if (method === "turn/start") return schema.parse({ turn: { id: "turn-1" } });
      if (method === "turn/steer") {
        await options.steerGate;
        if (options.steerRejectsNoActiveTurn) {
          throw new CodexAppServerRpcError(JSONRPC_INVALID_REQUEST, "no active turn to steer");
        }
        if (options.steerTimesOut) throw new Error("Délai dépassé pour turn/steer");
        if (options.steerResponseLost) {
          lostSteerMessageId = z.object({ clientUserMessageId: z.string() }).parse(params).clientUserMessageId;
          throw new Error("Délai dépassé pour turn/steer");
        }
        return schema.parse({ turnId: "turn-1" });
      }
      if (method === "turn/interrupt" && options.interruptRejectsNoActiveTurn) {
        throw new CodexAppServerRpcError(JSONRPC_INVALID_REQUEST, "no active turn to interrupt");
      }
      if (method === "thread/turns/list") {
        if (options.turnsListFails) throw new Error("historique indisponible");
        const listed = z
          .object({ cursor: z.string().nullable().optional(), limit: z.number() })
          .parse(params);
        if (listed.limit < RECONCILIATION_PAGE_LIMIT) {
          const latest = options.latestTurnInProgressId
            ? { id: options.latestTurnInProgressId, status: "inProgress", items: [] }
            : { id: "turn-1", status: "completed", items: [] };
          return schema.parse({ data: [latest], nextCursor: null });
        }
        const cursor = listed.cursor;
        const historicalVisible = !options.historicalMessageOnSecondPage || cursor === "older-page";
        const acceptedMessageId = lostSteerMessageId ?? (historicalVisible ? options.historicalMessageId : undefined);
        return schema.parse({
          data: acceptedMessageId
            ? [
                {
                  id: lostSteerMessageId ? "turn-1" : "turn-historical",
                  status: lostSteerMessageId ? "inProgress" : "completed",
                  items: [{ type: "userMessage", clientId: acceptedMessageId }],
                },
              ]
            : [],
          nextCursor: options.historicalMessageOnSecondPage && cursor !== "older-page" ? "older-page" : null,
        });
      }
      return schema.parse({});
    },
    notify: () => {},
    close: async () => {
      closes += 1;
      resolveExit?.(0);
    },
    exited,
  };
  return {
    connection,
    connect: async (connectionOptions) => {
      capturedOptions = connectionOptions;
      onNotification = connectionOptions.onNotification;
      await options.connectDelay;
      return connection;
    },
    connectOptions: () => capturedOptions,
    requests,
    closeCount: () => closes,
    notify: (notification) => onNotification?.(notification),
    exit: (code) => resolveExit?.(code),
  };
}

function reconciliationRequests(fixture: AppServerFixture): RecordedRequest[] {
  return fixture.requests.filter(
    (request) =>
      request.method === "thread/turns/list" &&
      z.object({ limit: z.number() }).parse(request.params).limit === RECONCILIATION_PAGE_LIMIT,
  );
}

async function waitFor(check: () => boolean): Promise<void> {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    if (check()) return;
    await Bun.sleep(1);
  }
  throw new Error("fixture timeout");
}

function options(events: AgentSessionEvent[]): AgentSessionOptions {
  return {
    ticketId: "ticket-1",
    slotId: 1,
    cwd: "/tmp",
    provider: "codex",
    role: "one-shot",
    model: "gpt-5.6-terra",
    effort: "medium",
    permissionMode: "dontAsk",
    readOnly: true,
    disableWorkerTools: true,
    onToolCall: async () => ({ ok: true, result: "ok" }),
    onEvent: (event) => events.push(event),
  };
}

test("Codex session starts, steers, interrupts and drains before closing", async () => {
  const fixture = appServerFixture();
  const events: AgentSessionEvent[] = [];
  const provider = createCodexProvider(new WorkerMcpManager(), {
    connect: fixture.connect,
    resolveBinary: () => "/fixture/codex",
    projectEnvironment: () => ({ PATH: "/project/node/bin" }),
  });
  const session = provider.createSession(options(events));

  const firstMessageId = session.send("first");
  await waitFor(() => fixture.requests.some((request) => request.method === "turn/start"));
  expect(fixture.connectOptions()?.env?.PATH).toBe("/project/node/bin");
  const steerMessageId = session.send("steer");
  await waitFor(() => fixture.requests.some((request) => request.method === "turn/steer"));
  await session.interrupt();
  expect(fixture.requests.some((request) => request.method === "turn/interrupt")).toBe(true);

  const closed = session.close();
  await Bun.sleep(1);
  expect(fixture.closeCount()).toBe(0);
  fixture.notify({
    method: "thread/tokenUsage/updated",
    params: {
      threadId: "thread-1",
      turnId: "turn-1",
      tokenUsage: {
        last: {
          inputTokens: 11,
          cachedInputTokens: 3,
          cacheWriteInputTokens: 2,
          outputTokens: 5,
        },
      },
    },
  });
  fixture.notify({
    method: "turn/completed",
    params: { threadId: "thread-1", turn: { id: "turn-1", status: "completed", error: null } },
  });
  await closed;

  expect(fixture.closeCount()).toBe(1);
  expect(events).toContainEqual({ type: "init", sessionId: "thread-1" });
  expect(events).toContainEqual({
    type: "message_status",
    messageId: firstMessageId,
    status: "accepted",
    turnId: "turn-1",
  });
  expect(events).toContainEqual({
    type: "message_status",
    messageId: steerMessageId,
    status: "accepted",
    turnId: "turn-1",
  });
  expect(events).toContainEqual({
    type: "turn_end",
    ok: true,
    subtype: "completed",
    sessionId: "thread-1",
    turnId: "turn-1",
    usageByModel: {
      "gpt-5.6-terra": {
        inputTokens: 11,
        outputTokens: 5,
        cacheReadTokens: 3,
        cacheCreationTokens: 2,
        costUsd: null,
      },
    },
  });
});

test("an interrupted Codex session accepts a new turn after the active turn ends", async () => {
  const fixture = appServerFixture();
  const events: AgentSessionEvent[] = [];
  const provider = createCodexProvider(new WorkerMcpManager(), {
    connect: fixture.connect,
    resolveBinary: () => "/fixture/codex",
    projectEnvironment: () => ({}),
  });
  const session = provider.createSession(options(events));

  session.send("first");
  await waitFor(() => fixture.requests.some((request) => request.method === "turn/start"));
  await session.interrupt();

  const resumedMessageId = session.send("after interrupt");
  await Bun.sleep(5);
  expect(fixture.requests.filter((request) => request.method === "turn/start")).toHaveLength(1);
  expect(fixture.requests.some((request) => request.method === "turn/steer")).toBe(false);
  fixture.notify({
    method: "turn/completed",
    params: { threadId: "thread-1", turn: { id: "turn-1", status: "interrupted", error: null } },
  });

  await waitFor(() => fixture.requests.filter((request) => request.method === "turn/start").length === 2);
  expect(events).toContainEqual({
    type: "message_status",
    messageId: resumedMessageId,
    status: "accepted",
    turnId: "turn-1",
  });

  const closed = session.close();
  fixture.notify({
    method: "turn/completed",
    params: { threadId: "thread-1", turn: { id: "turn-1", status: "completed", error: null } },
  });
  await closed;
});

test("one-shot timeout before App Server initialization rejects its prompt and never starts a turn", async () => {
  const connectGate = Promise.withResolvers<void>();
  const fixture = appServerFixture({ connectDelay: connectGate.promise });
  const events: AgentSessionEvent[] = [];
  const provider = createCodexProvider(new WorkerMcpManager(), {
    connect: fixture.connect,
    resolveBinary: () => "/fixture/codex",
    projectEnvironment: () => ({}),
  });
  const run = runOneShotSession(
    provider,
    {
      cwd: "/tmp",
      provider: "codex",
      model: "gpt-5.6-terra",
      effort: "medium",
      permissionMode: "dontAsk",
    },
    "must never start",
    5,
    (event) => events.push(event),
  );

  await expect(
    Promise.race([
      run,
      Bun.sleep(250).then(() => { throw new Error("close did not remain bounded"); }),
    ]),
  ).rejects.toThrow("Timeout");
  const statuses = events.filter((event) => event.type === "message_status");
  expect(statuses.map((event) => event.status)).toEqual(["received", "rejected"]);
  expect(statuses[0]?.messageId).toBe(statuses[1]?.messageId);
  expect(fixture.requests.some((request) => request.method === "turn/start")).toBe(false);
  expect(fixture.requests.some((request) => request.method === "turn/steer")).toBe(false);

  connectGate.resolve();
  await waitFor(() => fixture.closeCount() === 1);
  await Bun.sleep(5);
  expect(fixture.requests.some((request) => request.method === "turn/start")).toBe(false);
  expect(fixture.requests.some((request) => request.method === "turn/steer")).toBe(false);
});

test("a lost steering acknowledgement is reconciled by client message id without replay", async () => {
  const fixture = appServerFixture({ steerResponseLost: true });
  const events: AgentSessionEvent[] = [];
  const provider = createCodexProvider(new WorkerMcpManager(), {
    connect: fixture.connect,
    resolveBinary: () => "/fixture/codex",
    projectEnvironment: () => ({}),
  });
  const session = provider.createSession(options(events));
  session.send("first");
  await waitFor(() => fixture.requests.some((request) => request.method === "turn/start"));
  const messageId = session.send("steer once");
  await waitFor(() =>
    events.some(
      (event) => event.type === "message_status" && event.messageId === messageId && event.status === "accepted",
    ),
  );

  expect(fixture.requests.filter((request) => request.method === "turn/steer")).toHaveLength(1);
  expect(fixture.requests.some((request) => request.method === "thread/turns/list")).toBe(true);
  fixture.notify({
    method: "turn/completed",
    params: { threadId: "thread-1", turn: { id: "turn-1", status: "completed", error: null } },
  });
  await session.close();
});

test("a durable message id is reconciled before replaying a resumed Codex thread", async () => {
  const messageId = "persisted-message-id";
  const fixture = appServerFixture({ historicalMessageId: messageId, historicalMessageOnSecondPage: true });
  const events: AgentSessionEvent[] = [];
  const config = options(events);
  config.resumeSessionId = "thread-existing";
  const provider = createCodexProvider(new WorkerMcpManager(), {
    connect: fixture.connect,
    resolveBinary: () => "/fixture/codex",
    projectEnvironment: () => ({}),
  });
  const session = provider.createSession(config);
  expect(session.send("replayed", messageId)).toBe(messageId);
  await waitFor(() =>
    events.some(
      (event) => event.type === "message_status" && event.messageId === messageId && event.status === "accepted",
    ),
  );

  expect(fixture.requests.filter((request) => request.method === "turn/start")).toHaveLength(0);
  expect(fixture.requests.filter((request) => request.method === "turn/steer")).toHaveLength(0);
  expect(reconciliationRequests(fixture)).toHaveLength(2);
  expect(events).toContainEqual({
    type: "message_status",
    messageId,
    status: "accepted",
    turnId: "turn-historical",
  });
  await session.close();
});

test("a resumed Codex message is rejected rather than replayed when history is unavailable", async () => {
  const messageId = "uncertain-message-id";
  const fixture = appServerFixture({ turnsListFails: true });
  const events: AgentSessionEvent[] = [];
  const config = options(events);
  config.resumeSessionId = "thread-existing";
  const provider = createCodexProvider(new WorkerMcpManager(), {
    connect: fixture.connect,
    resolveBinary: () => "/fixture/codex",
    projectEnvironment: () => ({}),
  });
  const session = provider.createSession(config);
  session.send("uncertain replay", messageId);
  await waitFor(() => events.some((event) => event.type === "error"));

  expect(fixture.requests.filter((request) => request.method === "turn/start")).toHaveLength(0);
  expect(fixture.requests.filter((request) => request.method === "turn/steer")).toHaveLength(0);
  const rejection = events.find((event) => event.type === "message_status" && event.status === "rejected");
  expect(rejection).toMatchObject({ messageId, status: "rejected", turnId: null });
  await session.close();
});

test("Codex session resumes an existing thread before accepting work", async () => {
  const fixture = appServerFixture({
    inheritedMcpServers: { hostile: { command: "steal-secrets", enabled: true } },
  });
  const config = options([]);
  config.resumeSessionId = "thread-existing";
  const provider = createCodexProvider(new WorkerMcpManager(), {
    connect: fixture.connect,
    resolveBinary: () => "/fixture/codex",
    projectEnvironment: () => ({}),
  });
  const session = provider.createSession(config);
  await waitFor(() => fixture.requests.some((request) => request.method === "thread/resume"));

  const resume = fixture.requests.find((request) => request.method === "thread/resume");
  const resumeParams = z
    .object({
      threadId: z.string(),
      config: z.object({
        features: z.object({ plugins: z.literal(false) }),
        mcp_servers: z.object({ hostile: z.object({ enabled: z.literal(false) }) }),
      }),
    })
    .parse(resume?.params);
  expect(resumeParams.threadId).toBe("thread-existing");
  await session.close();
});

test("Codex disables inherited MCP servers and enables only the explicit allowlist", async () => {
  const fixture = appServerFixture({
    inheritedMcpServers: {
      hostile: { command: "steal-secrets", enabled: true },
      notion: { command: "shadow-explicit-server", enabled: true },
    },
  });
  const config = options([]);
  config.extraMcpServers = {
    notion: {
      type: "http",
      url: "https://mcp.example.test",
      enabledTools: ["notion-fetch", "notion-search"],
    },
  };
  const provider = createCodexProvider(new WorkerMcpManager(), {
    connect: fixture.connect,
    resolveBinary: () => "/fixture/codex",
    projectEnvironment: () => ({}),
  });
  const session = provider.createSession(config);
  await waitFor(() => fixture.requests.some((request) => request.method === "thread/start"));

  const read = fixture.requests.find((request) => request.method === "config/read");
  expect(z.object({ cwd: z.literal("/tmp"), includeLayers: z.literal(false) }).parse(read?.params)).toEqual({
    cwd: "/tmp",
    includeLayers: false,
  });
  const started = fixture.requests.find((request) => request.method === "thread/start");
  const startConfig = z
    .object({
      config: z.object({
        features: z.object({ plugins: z.literal(false) }),
        mcp_servers: z.object({
          hostile: z.object({ enabled: z.literal(false) }),
          notion: z.object({
            enabled: z.literal(true),
            url: z.literal("https://mcp.example.test"),
            enabled_tools: z.tuple([z.literal("notion-fetch"), z.literal("notion-search")]),
          }),
        }),
      }),
    })
    .parse(started?.params).config;
  expect(startConfig.mcp_servers.hostile.enabled).toBe(false);
  expect(startConfig.mcp_servers.notion.enabled).toBe(true);
  await session.close();
});

test("Codex fails closed before starting a thread when effective MCP config is invalid", async () => {
  const fixture = appServerFixture({ malformedConfigRead: true });
  const events: AgentSessionEvent[] = [];
  const provider = createCodexProvider(new WorkerMcpManager(), {
    connect: fixture.connect,
    resolveBinary: () => "/fixture/codex",
    projectEnvironment: () => ({}),
  });
  const session = provider.createSession(options(events));
  await waitFor(() => events.some((event) => event.type === "error"));

  expect(fixture.requests.map((request) => request.method)).toEqual(["config/read"]);
  expect(events.some((event) => event.type === "init")).toBe(false);
  await session.close();
});

test("worker MCP credentials stay in the process environment and out of argv", async () => {
  const fixture = appServerFixture();
  const config = options([]);
  config.role = "orchestrator";
  config.disableWorkerTools = false;
  const provider = createCodexProvider(new WorkerMcpManager(), {
    connect: fixture.connect,
    resolveBinary: () => "/fixture/codex",
    projectEnvironment: () => ({ PATH: "/project/node/bin" }),
  });
  const session = provider.createSession(config);
  await waitFor(() => fixture.requests.some((request) => request.method === "thread/start"));

  const connectOptions = fixture.connectOptions();
  expect(connectOptions?.commandArgs).toBeUndefined();
  expect(connectOptions?.env?.KANBAN_WORKER_MCP_TOKEN).toHaveLength(32);
  const started = fixture.requests.find((request) => request.method === "thread/start");
  const startParams = z
    .object({
      config: z.object({
        mcp_servers: z.object({
          kanban: z.object({ bearer_token_env_var: z.string(), enabled_tools: z.array(z.string()) }),
        }),
      }),
    })
    .parse(started?.params);
  expect(startParams.config.mcp_servers.kanban.bearer_token_env_var).toBe("KANBAN_WORKER_MCP_TOKEN");
  expect(JSON.stringify(started?.params)).not.toContain(connectOptions?.env?.KANBAN_WORKER_MCP_TOKEN ?? "missing");
  await session.close();
});

test("an explicit CODEX_API_KEY selects a thread-scoped provider without persisting auth", async () => {
  const fixture = appServerFixture();
  const provider = createCodexProvider(new WorkerMcpManager(), {
    connect: fixture.connect,
    resolveBinary: () => "/fixture/codex",
    projectEnvironment: () => ({ CODEX_API_KEY: "fixture-secret" }),
  });
  const session = provider.createSession(options([]));
  await waitFor(() => fixture.requests.some((request) => request.method === "thread/start"));

  const started = fixture.requests.find((request) => request.method === "thread/start");
  const auth = z
    .object({
      modelProvider: z.literal("kanban_openai_api_key"),
      config: z.object({
        model_providers: z.object({
          kanban_openai_api_key: z.object({ env_key: z.literal("CODEX_API_KEY") }),
        }),
      }),
    })
    .parse(started?.params);
  expect(auth.config.model_providers.kanban_openai_api_key.env_key).toBe("CODEX_API_KEY");
  expect(fixture.requests.some((request) => request.method === "account/login/start")).toBe(false);
  expect(fixture.connectOptions()?.commandArgs).toBeUndefined();
  expect(fixture.connectOptions()?.binaryPath).not.toContain("fixture-secret");
  expect(JSON.stringify(started?.params)).not.toContain("fixture-secret");
  await session.close();
});

test("reviewer sessions receive only their result tool", async () => {
  const fixture = appServerFixture();
  const config = options([]);
  config.role = "reviewer";
  config.disableWorkerTools = false;
  const provider = createCodexProvider(new WorkerMcpManager(), {
    connect: fixture.connect,
    resolveBinary: () => "/fixture/codex",
    projectEnvironment: () => ({}),
  });
  const session = provider.createSession(config);
  await waitFor(() => fixture.requests.some((request) => request.method === "thread/start"));

  const started = fixture.requests.find((request) => request.method === "thread/start");
  const enabledTools = z
    .object({
      config: z.object({
        mcp_servers: z.object({ kanban: z.object({ enabled_tools: z.array(z.string()) }) }),
      }),
    })
    .parse(started?.params).config.mcp_servers.kanban.enabled_tools;
  expect(enabledTools).toEqual(["submit_review"]);
  await session.close();
});

test("workspace sessions install a PreToolUse guard that denies no-verify", async () => {
  const fixture = appServerFixture();
  const provider = createCodexProvider(new WorkerMcpManager(), {
    connect: fixture.connect,
    resolveBinary: () => "/fixture/codex",
    projectEnvironment: () => ({}),
  });
  const config = options([]);
  config.readOnly = false;
  const session = provider.createSession(config);
  await waitFor(() => fixture.requests.some((request) => request.method === "thread/start"));

  const started = fixture.requests.find((request) => request.method === "thread/start");
  const hookConfig = z
    .object({
      config: z.object({
        hooks: z.object({
          PreToolUse: z.array(
            z.object({
              hooks: z.array(
                z.object({
                  type: z.literal("command"),
                  command: z.string(),
                  timeout: z.number(),
                  statusMessage: z.string(),
                }),
              ),
            }),
          ),
          state: z.record(
            z.string(),
            z.object({ enabled: z.literal(true), trusted_hash: z.string().regex(/^sha256:[a-f0-9]{64}$/) }),
          ),
        }),
      }),
    })
    .parse(started?.params).config.hooks;
  const hookCommand = hookConfig.PreToolUse[0]?.hooks[0]?.command;
  expect(hookCommand).toBeDefined();
  expect(Object.keys(hookConfig.state)).toEqual(["/<session-flags>/config.toml:pre_tool_use:0:0"]);
  const hookHandler = hookConfig.PreToolUse[0]?.hooks[0];
  expect(hookConfig.state["/<session-flags>/config.toml:pre_tool_use:0:0"]?.trusted_hash).toBe(
    hookHandler ? codexSessionPreToolUseHookHash(hookHandler) : "missing-handler",
  );
  const hookPath = hookCommand?.slice(1, -1) ?? "";
  const process = Bun.spawn([hookPath], { stdin: "pipe", stdout: "pipe", stderr: "pipe" });
  process.stdin.write(JSON.stringify({ tool_name: "Bash", tool_input: { command: "git commit --no-verify" } }));
  process.stdin.end();
  const result = z
    .object({
      hookSpecificOutput: z.object({ permissionDecision: z.literal("deny") }),
    })
    .parse(JSON.parse(await new Response(process.stdout).text()));
  expect(result.hookSpecificOutput.permissionDecision).toBe("deny");
  expect(await process.exited).toBe(0);

  const subagent = Bun.spawn([hookPath], { stdin: "pipe", stdout: "pipe", stderr: "pipe" });
  subagent.stdin.write(
    JSON.stringify({ agent_id: "child-1", tool_name: "Bash", tool_input: { command: "git push origin branch" } }),
  );
  subagent.stdin.end();
  const subagentResult = z
    .object({ hookSpecificOutput: z.object({ permissionDecision: z.literal("deny") }) })
    .parse(JSON.parse(await new Response(subagent.stdout).text()));
  expect(subagentResult.hookSpecificOutput.permissionDecision).toBe("deny");
  expect(await subagent.exited).toBe(0);
  await session.close();
});

/** How the generated hook embeds a denial reason: JSON-encoded, then POSIX single-quoted. */
function shellQuotedJson(reason: string): string {
  return `'${JSON.stringify(reason).replaceAll("'", `'"'"'`)}'`;
}

async function hookPathForSession(config: AgentSessionOptions): Promise<{ path: string; close: () => Promise<void> }> {
  const fixture = appServerFixture();
  const provider = createCodexProvider(new WorkerMcpManager(), {
    connect: fixture.connect,
    resolveBinary: () => "/fixture/codex",
    projectEnvironment: () => ({}),
  });
  const session = provider.createSession(config);
  await waitFor(() => fixture.requests.some((request) => request.method === "thread/start"));
  const started = fixture.requests.find((request) => request.method === "thread/start");
  const command = z
    .object({
      config: z.object({
        hooks: z.object({ PreToolUse: z.array(z.object({ hooks: z.array(z.object({ command: z.string() })) })) }),
      }),
    })
    .parse(started?.params).config.hooks.PreToolUse[0]?.hooks[0]?.command;
  return { path: (command ?? "").slice(1, -1), close: () => session.close() };
}

async function hookDecision(path: string, command: string): Promise<{ reason: string | null; exitCode: number }> {
  const child = Bun.spawn([path], { stdin: "pipe", stdout: "pipe", stderr: "pipe" });
  child.stdin.write(JSON.stringify({ tool_name: "Bash", tool_input: { command } }));
  child.stdin.end();
  const output = await new Response(child.stdout).text();
  const exitCode = await child.exited;
  if (output.trim() === "") return { reason: null, exitCode };
  const parsed = z
    .object({ hookSpecificOutput: z.object({ permissionDecisionReason: z.string() }) })
    .parse(JSON.parse(output));
  return { reason: parsed.hookSpecificOutput.permissionDecisionReason, exitCode };
}

test("the review guard hook denies typecheck and gh publishing with the shared reasons", async () => {
  const config = options([]);
  config.readOnly = false;
  config.blockTypecheck = true;
  config.blockReviewPublishing = true;
  const hook = await hookPathForSession(config);
  const script = readFileSync(hook.path, "utf8");
  expect(script).toContain(shellQuotedJson(TYPECHECK_DENIAL_REASON));
  expect(script).toContain(shellQuotedJson(REVIEW_PUBLISHING_DENIAL_REASON));

  for (const command of ["bun run typecheck", "npx tsc --noEmit", "pnpm -C apps/web typecheck", "yarn run check:types"]) {
    expect(await hookDecision(hook.path, command)).toEqual({ reason: TYPECHECK_DENIAL_REASON, exitCode: 0 });
  }
  expect(await hookDecision(hook.path, "gh pr comment 12 --body x")).toEqual({
    reason: REVIEW_PUBLISHING_DENIAL_REASON,
    exitCode: 0,
  });
  expect(await hookDecision(hook.path, "gh pr view 12")).toEqual({ reason: null, exitCode: 0 });
  expect(await hookDecision(hook.path, "bun run test")).toEqual({ reason: null, exitCode: 0 });
  await hook.close();
});

test("the review guard hook allows typecheck when the gate is off", async () => {
  const config = options([]);
  config.readOnly = false;
  const hook = await hookPathForSession(config);
  expect(readFileSync(hook.path, "utf8")).not.toContain(shellQuotedJson(TYPECHECK_DENIAL_REASON));
  expect(await hookDecision(hook.path, "bun run typecheck")).toEqual({ reason: null, exitCode: 0 });
  await hook.close();
});

test("native subagents cannot inherit the parent pipeline MCP", async () => {
  const fixture = appServerFixture();
  const config = options([]);
  config.role = "orchestrator";
  config.disableWorkerTools = false;
  config.agents = {
    implementer: {
      description: "writes code",
      prompt: "Implement the requested change.",
      role: "implementer",
      model: "gpt-5.6-sol",
      effort: "high",
      serviceTier: "fast",
    },
  };
  const provider = createCodexProvider(new WorkerMcpManager(), {
    connect: fixture.connect,
    resolveBinary: () => "/fixture/codex",
    projectEnvironment: () => ({}),
  });
  const session = provider.createSession(config);
  await waitFor(() => fixture.requests.some((request) => request.method === "thread/start"));

  const started = fixture.requests.find((request) => request.method === "thread/start");
  const configFile = z
    .object({
      config: z.object({ agents: z.object({ implementer: z.object({ config_file: z.string() }) }) }),
    })
    .parse(started?.params).config.agents.implementer.config_file;
  const childConfig = readFileSync(configFile, "utf8");
  expect(childConfig).toContain("[mcp_servers.kanban]\nenabled = false");
  expect(childConfig).toContain('model = "gpt-5.6-sol"');
  expect(childConfig).toContain('model_reasoning_effort = "high"');
  expect(childConfig).toContain('service_tier = "fast"');
  expect(childConfig).toContain("[features]\nfast_mode = true");
  await session.close();
});

test("Codex feasibility fan-out is bounded to four shallow native agents", async () => {
  const fixture = appServerFixture();
  const config = options([]);
  config.role = "feasibility";
  config.agents = {
    scout: {
      description: "reads one ticket",
      prompt: "Assess feasibility.",
      role: "scout",
      readOnly: true,
    },
  };
  const provider = createCodexProvider(new WorkerMcpManager(), {
    connect: fixture.connect,
    resolveBinary: () => "/fixture/codex",
    projectEnvironment: () => ({}),
  });
  const session = provider.createSession(config);
  await waitFor(() => fixture.requests.some((request) => request.method === "thread/start"));

  const started = fixture.requests.find((request) => request.method === "thread/start");
  const agents = z
    .object({
      config: z.object({
        agents: z.object({
          max_concurrent_threads_per_session: z.literal(4),
          max_depth: z.literal(1),
        }),
      }),
    })
    .parse(started?.params).config.agents;
  expect(agents).toEqual({ max_concurrent_threads_per_session: 4, max_depth: 1 });
  await session.close();
});

test("only orchestrator sessions cap their native subagent threads", async () => {
  const agentsSchema = z.object({
    config: z.object({
      agents: z.object({ max_concurrent_threads_per_session: z.number().optional() }),
    }),
  });
  const startWithRole = async (role: AgentSessionOptions["role"]): Promise<number | undefined> => {
    const fixture = appServerFixture();
    const provider = createCodexProvider(new WorkerMcpManager(), {
      connect: fixture.connect,
      resolveBinary: () => "/fixture/codex",
      projectEnvironment: () => ({}),
    });
    const config = options([]);
    config.role = role;
    config.agents = { helper: { description: "helps", prompt: "Help." } };
    const session = provider.createSession(config);
    await waitFor(() => fixture.requests.some((request) => request.method === "thread/start"));
    const started = fixture.requests.find((request) => request.method === "thread/start");
    await session.close();
    return agentsSchema.parse(started?.params).config.agents.max_concurrent_threads_per_session;
  };

  expect(await startWithRole("orchestrator")).toBe(CODEX_MAX_CONCURRENT_SUBAGENT_THREADS);
  expect(await startWithRole("triage")).toBeUndefined();
});

test("read-only sessions retain local commands and explicitly scoped HTTP MCP tools", async () => {
  const fixture = appServerFixture();
  const config = options([]);
  config.allowedTools = ["Bash", "Read"];
  config.extraMcpServers = {
    notion: {
      type: "http",
      url: "https://mcp.example.test",
      enabledTools: ["notion-fetch", "notion-search"],
    },
  };
  const provider = createCodexProvider(new WorkerMcpManager(), {
    connect: fixture.connect,
    resolveBinary: () => "/fixture/codex",
    projectEnvironment: () => ({}),
  });
  const session = provider.createSession(config);
  await waitFor(() => fixture.requests.some((request) => request.method === "thread/start"));

  const started = fixture.requests.find((request) => request.method === "thread/start");
  const startParams = z
    .object({
      sandbox: z.literal("read-only"),
      approvalPolicy: z.literal("never"),
      config: z.object({
        allow_login_shell: z.literal(false),
        mcp_servers: z.object({
          notion: z.object({
            url: z.string(),
            enabled_tools: z.array(z.string()),
          }),
        }),
      }),
    })
    .parse(started?.params);
  expect(startParams.config.mcp_servers.notion.enabled_tools).toEqual(["notion-fetch", "notion-search"]);
  const serverNames = Object.keys(
    z.object({ config: z.object({ mcp_servers: z.record(z.string(), z.unknown()) }) }).parse(started?.params).config
      .mcp_servers,
  );
  expect(serverNames).toEqual(["notion"]);
  await session.close();
});

test("unexpected App Server exit surfaces a typed error and releases close", async () => {
  const fixture = appServerFixture();
  const events: AgentSessionEvent[] = [];
  const provider = createCodexProvider(new WorkerMcpManager(), {
    connect: fixture.connect,
    resolveBinary: () => "/fixture/codex",
    projectEnvironment: () => ({}),
  });
  const session = provider.createSession(options(events));
  await waitFor(() => events.some((event) => event.type === "init"));

  fixture.exit(23);
  await waitFor(() => events.some((event) => event.type === "error"));
  await session.close();

  const error = events.find((event) => event.type === "error");
  expect(error).toEqual({ type: "error", message: "Codex App Server arrêté de façon inattendue (code 23)" });
});


test("Codex reconciles reasoning, assistant and tool streams without duplicate final text", async () => {
  const fixture = appServerFixture();
  const events: AgentSessionEvent[] = [];
  const provider = createCodexProvider(new WorkerMcpManager(), {
    connect: fixture.connect, resolveBinary: () => "/fixture/codex", projectEnvironment: () => ({}),
  });
  const session = provider.createSession(options(events));
  await waitFor(() => events.some((event) => event.type === "init"));
  const params = { threadId: "thread-1", turnId: "turn-1", itemId: "reasoning-1", summaryIndex: 0 };
  for (const delta of ["Préparation", " ", "en cours"]) fixture.notify({ method: "item/reasoning/summaryTextDelta", params: { ...params, delta } });
  fixture.notify({ method: "item/completed", params: { ...params, item: { id: "reasoning-1", type: "reasoning", summary: ["Préparation en cours…"], content: [] } } });
  fixture.notify({ method: "item/agentMessage/delta", params: { ...params, itemId: "message-1", delta: "Hello " } });
  fixture.notify({ method: "item/completed", params: { ...params, item: { id: "message-1", type: "agentMessage", text: "Hello world" } } });
  fixture.notify({ method: "item/commandExecution/outputDelta", params: { ...params, itemId: "command-1", delta: "test " } });
  fixture.notify({ method: "item/completed", params: { ...params, item: { id: "command-1", type: "commandExecution", command: "bun test", status: "completed", aggregatedOutput: "test passed" } } });
  const transcript = new TranscriptBuffer();
  for (const event of events) {
    if ((event.type === "assistant_text" || event.type === "thinking" || event.type === "progress") && event.stream) {
      transcript.append(event.type === "progress" ? event.message : event.text, "", event.stream);
    }
  }
  expect(transcript.text()).toBe("Préparation en cours…\nHello world\ntest passed\n");
  await session.close();
});


for (const serviceTier of ["default", "fast"] as const) {
  for (const resume of [false, true]) {
    test(`Codex explicitly selects ${serviceTier} on ${resume ? "resume" : "start"} and subsequent turns`, async () => {
      const fixture = appServerFixture();
      const events: AgentSessionEvent[] = [];
      const provider = createCodexProvider(new WorkerMcpManager(), {
        connect: fixture.connect, resolveBinary: () => "/fixture/codex", projectEnvironment: () => ({}),
      });
      const session = provider.createSession({ ...options(events), serviceTier, ...(resume ? { resumeSessionId: "old-fast-thread" } : {}) });
      session.send("hello");
      await waitFor(() => fixture.requests.some((request) => request.method === "turn/start"));
      const request = fixture.requests.find((entry) => entry.method === (resume ? "thread/resume" : "thread/start"));
      const parsed = z.object({ serviceTier: z.string(), config: z.object({ service_tier: z.string(), features: z.object({ fast_mode: z.boolean() }) }) }).parse(request?.params);
      expect(parsed.serviceTier).toBe(serviceTier);
      expect(parsed.config.service_tier).toBe(serviceTier);
      expect(parsed.config.features.fast_mode).toBe(serviceTier === "fast");
      const turn = fixture.requests.find((entry) => entry.method === "turn/start");
      expect(z.object({ serviceTier: z.string() }).parse(turn?.params).serviceTier).toBe(serviceTier);
      fixture.notify({ method: "turn/completed", params: { threadId: resume ? "thread-resumed" : "thread-1", turn: { id: "turn-1", status: "completed", error: null } } });
      await session.close();
    });
  }
}

test("native child streams stay isolated and cannot end the parent turn", async () => {
  const fixture = appServerFixture();
  const events: AgentSessionEvent[] = [];
  const provider = createCodexProvider(new WorkerMcpManager(), {
    connect: fixture.connect, resolveBinary: () => "/fixture/codex", projectEnvironment: () => ({}),
  });
  const session = provider.createSession(options(events));
  session.send("review");
  await waitFor(() => fixture.requests.some((request) => request.method === "turn/start"));
  fixture.notify({ method: "thread/started", params: { thread: { id: "child", parentThreadId: "thread-1" } } });
  fixture.notify({ method: "thread/started", params: { thread: { id: "unrelated", parentThreadId: "another-parent" } } });
  for (const threadId of ["thread-1", "child", "unrelated"]) {
    fixture.notify({ method: "item/agentMessage/delta", params: { threadId, turnId: "turn-1", itemId: "same-id", delta: threadId } });
  }
  fixture.notify({ method: "turn/completed", params: { threadId: "child", turn: { id: "turn-1", status: "completed", error: null } } });
  const messages = events.filter((event) => event.type === "assistant_text");
  expect(messages).toHaveLength(2);
  expect(messages[0]?.sourceId).toBeUndefined();
  expect(messages[1]?.sourceId).toBe("child");
  expect(events.some((event) => event.type === "turn_end")).toBe(false);
  fixture.notify({ method: "turn/completed", params: { threadId: "thread-1", turn: { id: "turn-1", status: "completed", error: null } } });
  await session.close();
});

test("forced disposal reaches a connection whose graceful close is stuck", async () => {
  const fixture = appServerFixture();
  let disposed = false;
  fixture.connection.close = () => new Promise<void>(() => undefined);
  fixture.connection.dispose = () => { disposed = true; fixture.exit(137); };
  const events: AgentSessionEvent[] = [];
  const provider = createCodexProvider(new WorkerMcpManager(), {
    connect: fixture.connect, resolveBinary: () => "/fixture/codex", projectEnvironment: () => ({}),
  });
  const session = provider.createSession(options(events));
  await waitFor(() => events.some((event) => event.type === "init"));
  void session.close();
  await Bun.sleep(1);
  session.dispose?.();
  expect(disposed).toBe(true);
  const count = events.length;
  fixture.notify({ method: "item/agentMessage/delta", params: { threadId: "thread-1", turnId: "turn-1", itemId: "late", delta: "late" } });
  expect(events).toHaveLength(count);
});

test("a completed turn releases the session even when the event consumer throws", async () => {
  const fixture = appServerFixture();
  const events: AgentSessionEvent[] = [];
  const config = options(events);
  config.onEvent = (event) => {
    events.push(event);
    if (event.type === "turn_end") throw new Error("consommateur cassé");
  };
  const provider = createCodexProvider(new WorkerMcpManager(), {
    connect: fixture.connect,
    resolveBinary: () => "/fixture/codex",
    projectEnvironment: () => ({}),
  });
  const session = provider.createSession(config);
  session.send("first");
  await waitFor(() => fixture.requests.some((request) => request.method === "turn/start"));
  fixture.notify({
    method: "turn/completed",
    params: { threadId: "thread-1", turn: { id: "turn-1", status: "completed", error: null } },
  });

  session.send("second");
  await waitFor(() => fixture.requests.filter((request) => request.method === "turn/start").length === 2);
  expect(fixture.requests.some((request) => request.method === "turn/steer")).toBe(false);

  const closed = session.close();
  fixture.notify({
    method: "turn/completed",
    params: { threadId: "thread-1", turn: { id: "turn-1", status: "completed", error: null } },
  });
  await closed;
});

test("a steering refusal replays the message through turn/start without a fatal error", async () => {
  const fixture = appServerFixture({ steerRejectsNoActiveTurn: true });
  const events: AgentSessionEvent[] = [];
  const provider = createCodexProvider(new WorkerMcpManager(), {
    connect: fixture.connect,
    resolveBinary: () => "/fixture/codex",
    projectEnvironment: () => ({}),
  });
  const session = provider.createSession(options(events));
  session.send("first");
  await waitFor(() => fixture.requests.some((request) => request.method === "turn/start"));
  const messageId = session.send("steer");
  await waitFor(() => fixture.requests.filter((request) => request.method === "turn/start").length === 2);

  expect(events).toContainEqual({ type: "message_status", messageId, status: "accepted", turnId: "turn-1" });
  expect(events.some((event) => event.type === "error")).toBe(false);

  const closed = session.close();
  fixture.notify({
    method: "turn/completed",
    params: { threadId: "thread-1", turn: { id: "turn-1", status: "completed", error: null } },
  });
  await closed;
});

test("a blocked steering queue is unblocked by the watchdog once the turn is over", async () => {
  const fixture = appServerFixture({ steerTimesOut: true });
  const events: AgentSessionEvent[] = [];
  const provider = createCodexProvider(new WorkerMcpManager(), {
    connect: fixture.connect,
    resolveBinary: () => "/fixture/codex",
    projectEnvironment: () => ({}),
    blockedSteerProbeMs: PROBE_INTERVAL_MS,
  });
  const session = provider.createSession(options(events));
  session.send("first");
  await waitFor(() => fixture.requests.some((request) => request.method === "turn/start"));
  const messageId = session.send("steer");
  await waitFor(() => fixture.requests.filter((request) => request.method === "turn/start").length === 2);

  expect(fixture.requests.filter((request) => request.method === "turn/steer")).toHaveLength(1);
  expect(events).toContainEqual({ type: "message_status", messageId, status: "accepted", turnId: "turn-1" });
  expect(events.some((event) => event.type === "error")).toBe(false);

  const closed = session.close();
  fixture.notify({
    method: "turn/completed",
    params: { threadId: "thread-1", turn: { id: "turn-1", status: "completed", error: null } },
  });
  await closed;
});

test("interrupting an already finished turn neither throws nor blocks the next send", async () => {
  const fixture = appServerFixture({ interruptRejectsNoActiveTurn: true });
  const events: AgentSessionEvent[] = [];
  const provider = createCodexProvider(new WorkerMcpManager(), {
    connect: fixture.connect,
    resolveBinary: () => "/fixture/codex",
    projectEnvironment: () => ({}),
  });
  const session = provider.createSession(options(events));
  session.send("first");
  await waitFor(() => fixture.requests.some((request) => request.method === "turn/start"));
  await session.interrupt();

  session.send("after interrupt");
  await waitFor(() => fixture.requests.filter((request) => request.method === "turn/start").length === 2);
  expect(fixture.requests.some((request) => request.method === "turn/steer")).toBe(false);

  const closed = session.close();
  fixture.notify({
    method: "turn/completed",
    params: { threadId: "thread-1", turn: { id: "turn-1", status: "completed", error: null } },
  });
  await closed;
});

test("a resumed thread still running its turn steers instead of starting a new turn", async () => {
  const fixture = appServerFixture({ latestTurnInProgressId: "turn-resumed" });
  const events: AgentSessionEvent[] = [];
  const config = options(events);
  config.resumeSessionId = "thread-existing";
  const provider = createCodexProvider(new WorkerMcpManager(), {
    connect: fixture.connect,
    resolveBinary: () => "/fixture/codex",
    projectEnvironment: () => ({}),
  });
  const session = provider.createSession(config);
  session.send("hello");
  await waitFor(() => fixture.requests.some((request) => request.method === "turn/steer"));

  expect(fixture.requests.some((request) => request.method === "turn/start")).toBe(false);
  const steer = fixture.requests.find((request) => request.method === "turn/steer");
  expect(z.object({ expectedTurnId: z.string() }).parse(steer?.params).expectedTurnId).toBe("turn-resumed");

  const closed = session.close();
  fixture.notify({
    method: "turn/completed",
    params: { threadId: "thread-resumed", turn: { id: "turn-resumed", status: "completed", error: null } },
  });
  await closed;
});

test("a delivery failure during close rejects the message instead of stalling the shutdown", async () => {
  const gate = Promise.withResolvers<void>();
  const fixture = appServerFixture({ steerRejectsNoActiveTurn: true, steerGate: gate.promise });
  const events: AgentSessionEvent[] = [];
  const provider = createCodexProvider(new WorkerMcpManager(), {
    connect: fixture.connect,
    resolveBinary: () => "/fixture/codex",
    projectEnvironment: () => ({}),
  });
  const session = provider.createSession(options(events));
  session.send("first");
  await waitFor(() => fixture.requests.some((request) => request.method === "turn/start"));
  const messageId = session.send("steer while closing");
  await waitFor(() => fixture.requests.some((request) => request.method === "turn/steer"));

  const closed = session.close();
  gate.resolve();
  await Promise.race([
    closed,
    Bun.sleep(1_000).then(() => {
      throw new Error("close ne s'est pas terminé");
    }),
  ]);

  expect(fixture.requests.filter((request) => request.method === "turn/start")).toHaveLength(1);
  const rejection = events.find(
    (event) => event.type === "message_status" && event.messageId === messageId && event.status === "rejected",
  );
  expect(rejection).toBeDefined();
});
