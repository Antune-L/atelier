/**
 * The Real agent session: drives a live `claude` run via the Agent SDK `query()` in streaming-input
 * mode. Replaces the tmux + MCP-channel transport.
 *
 * - Streaming input: a queue-fed async generator keeps the session alive across turns; `send()`
 *   enqueues a user turn (contract / answer / nudge / user_comment).
 * - Tools: the worker registry (WORKER_TOOLS) is exposed as an in-process MCP server; each handler
 *   forwards to the backend via `onToolCall` and returns the {ok,result} text to the agent.
 * - Events: the SDK message stream is parsed into AgentSessionEvent (assistant text, tool uses,
 *   turn boundaries with per-model usage, rate limits, errors).
 */

import { createSdkMcpServer, query, tool } from "@anthropic-ai/claude-agent-sdk";
import type { Options, Query, SDKMessage, SDKUserMessage } from "@anthropic-ai/claude-agent-sdk";

import { WORKER_TOOLS } from "../../shared/protocol.ts";

import type {
  AgentSessionEvent,
  AgentSessionHandle,
  AgentSessionOptions,
  AgentSubagentDefinition,
  AgentTurnUsage,
} from "./agentSession.ts";
import { resolveClaudeBinary } from "./claudeBinary.ts";

const MCP_SERVER_NAME = "kanban";
const SDK_EFFORTS = ["low", "medium", "high", "xhigh", "max"] as const;

type SdkEffort = NonNullable<Options["effort"]>;
type SdkAgents = NonNullable<Options["agents"]>;

/** Narrow our free-form effort string to the SDK's enum; null/unknown → model default (undefined). */
function toSdkEffort(effort: string | null): SdkEffort | undefined {
  if (effort === null) return undefined;
  return SDK_EFFORTS.find((value) => value === effort);
}

function toSdkAgents(agents: Record<string, AgentSubagentDefinition>): SdkAgents {
  const out: SdkAgents = {};
  for (const [name, def] of Object.entries(agents)) {
    out[name] = {
      description: def.description,
      prompt: def.prompt,
      ...(def.tools ? { tools: def.tools } : {}),
      ...(def.model ? { model: def.model } : {}),
    };
  }
  return out;
}

/** The fully-qualified MCP tool names the in-process worker server advertises. */
function workerToolNames(): string[] {
  return WORKER_TOOLS.map((t) => `mcp__${MCP_SERVER_NAME}__${t.name}`);
}

export function createSdkAgentSession(opts: AgentSessionOptions): AgentSessionHandle {
  // ---- streaming input: a queue feeding a never-returning generator keeps the session alive ----
  const inbox: SDKUserMessage[] = [];
  let notify: (() => void) | null = null;
  let closed = false;

  function enqueue(content: string): void {
    inbox.push({ type: "user", parent_tool_use_id: null, message: { role: "user", content } });
    const resume = notify;
    notify = null;
    resume?.();
  }

  async function* prompts(): AsyncGenerator<SDKUserMessage> {
    for (;;) {
      while (inbox.length > 0) {
        const next = inbox.shift();
        if (next) yield next;
      }
      if (closed) return;
      await new Promise<void>((resolve) => (notify = resolve));
    }
  }

  // ---- in-process MCP tools from the worker registry; each call routes back to the backend ----
  const tools = WORKER_TOOLS.map((entry) =>
    tool(entry.name, entry.description, entry.argsSchema.shape, async (args) => {
      const outcome = await opts.onToolCall(entry.name, args);
      return {
        content: [{ type: "text", text: outcome.result || (outcome.ok ? "ok" : "échec") }],
        isError: !outcome.ok,
      };
    }),
  );
  const mcpServer = createSdkMcpServer({ name: MCP_SERVER_NAME, version: "0.0.0", tools });

  const sdkEffort = toSdkEffort(opts.effort);
  const queryOptions: Options = {
    cwd: opts.cwd,
    model: opts.model,
    pathToClaudeCodeExecutable: resolveClaudeBinary(),
    systemPrompt: { type: "preset", preset: "claude_code" },
    settingSources: ["project"],
    permissionMode: opts.permissionMode,
    mcpServers: { [MCP_SERVER_NAME]: mcpServer },
    allowedTools: [...workerToolNames(), ...(opts.allowedTools ?? [])],
    includePartialMessages: false,
    env: { ...process.env },
    stderr: () => {},
    ...(sdkEffort ? { effort: sdkEffort } : {}),
    ...(opts.disallowedTools ? { disallowedTools: opts.disallowedTools } : {}),
    ...(opts.agents ? { agents: toSdkAgents(opts.agents) } : {}),
    ...(opts.permissionMode === "bypassPermissions" ? { allowDangerouslySkipPermissions: true } : {}),
  };

  const session: Query = query({ prompt: prompts(), options: queryOptions });

  // ---- consume the stream in the background; parse each message into an AgentSessionEvent ----
  void pumpStream(session, opts.onEvent);

  return {
    ticketId: opts.ticketId,
    send: (content) => enqueue(content),
    interrupt: async () => {
      try {
        await session.interrupt();
      } catch {
        // interrupt() can reject if the turn already ended; the turn_end event is the source of truth.
      }
    },
    close: async () => {
      closed = true;
      enqueue(""); // wake the parked generator so it can observe `closed` and return (EOF → CLI exits)
      try {
        session.close();
      } catch {
        // Already torn down; nothing to release.
      }
    },
  };
}

async function pumpStream(session: Query, onEvent: (event: AgentSessionEvent) => void): Promise<void> {
  try {
    for await (const message of session) {
      dispatch(message, onEvent);
    }
  } catch (error) {
    onEvent({ type: "error", message: error instanceof Error ? error.message : String(error) });
  }
}

function dispatch(message: SDKMessage, onEvent: (event: AgentSessionEvent) => void): void {
  switch (message.type) {
    case "system":
      if (message.subtype === "init") onEvent({ type: "init", sessionId: message.session_id });
      return;
    case "assistant":
      for (const block of message.message.content) {
        if (block.type === "text") onEvent({ type: "assistant_text", text: block.text });
        else if (block.type === "thinking") onEvent({ type: "thinking", text: block.thinking });
        else if (block.type === "tool_use") onEvent({ type: "tool_use", name: block.name, input: block.input });
      }
      return;
    case "result": {
      const ok = message.subtype === "success";
      const usageByModel: Record<string, AgentTurnUsage> = {};
      if (message.subtype === "success") {
        for (const [model, usage] of Object.entries(message.modelUsage)) {
          usageByModel[model] = {
            inputTokens: usage.inputTokens,
            outputTokens: usage.outputTokens,
            cacheReadTokens: usage.cacheReadInputTokens,
            cacheCreationTokens: usage.cacheCreationInputTokens,
            costUsd: usage.costUSD,
          };
        }
      }
      onEvent({ type: "turn_end", ok, subtype: message.subtype, usageByModel });
      return;
    }
    case "rate_limit_event":
      onEvent({
        type: "rate_limit",
        status: message.rate_limit_info.status,
        resetsAt: message.rate_limit_info.resetsAt ?? null,
      });
      return;
    default:
      return;
  }
}
