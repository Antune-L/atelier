/**
 * The Claude provider: drives a live `claude` run via the Agent SDK `query()` in streaming-input
 * mode (the only `AgentProvider` today). Replaces the tmux + MCP-channel transport.
 *
 * - Streaming input: a queue-fed async generator keeps the session alive across turns; `send()`
 *   enqueues a user turn (contract / answer / nudge / user_comment).
 * - Tools: the worker registry (WORKER_TOOLS) is exposed as an in-process MCP server; each handler
 *   forwards to the backend via `onToolCall` and returns the {ok,result} text to the agent.
 * - Events: the SDK message stream is parsed into AgentSessionEvent (assistant text, tool uses,
 *   turn boundaries with per-model usage, rate limits, errors).
 */

import { createSdkMcpServer, query, tool } from "@anthropic-ai/claude-agent-sdk";
import type { HookCallback, Options, Query, SDKMessage, SDKUserMessage } from "@anthropic-ai/claude-agent-sdk";
import { z } from "zod";

import { WORKER_TOOLS } from "../../shared/protocol.ts";

import type {
  AgentProvider,
  AgentSessionEvent,
  AgentSessionHandle,
  AgentSessionOptions,
  AgentSubagentDefinition,
  AgentTurnUsage,
} from "./agentSession.ts";
import { resolveClaudeBinary } from "./claudeBinary.ts";

const MCP_SERVER_NAME = "kanban";
/** Graceful close lets the in-flight turn flush its result; force teardown if it never ends. */
const GRACEFUL_CLOSE_TIMEOUT_MS = 60_000;
const SDK_EFFORTS = ["low", "medium", "high", "xhigh", "max"] as const;
const NO_VERIFY_PATTERN = /--no-verify\b/;
const bashCommandSchema = z.object({ command: z.string() });

/**
 * Block `git commit/push --no-verify` (it bypasses git hooks) — the old `templates/preToolUse.ts`
 * deny guard, now an in-process PreToolUse hook. Returning `{}` allows the call.
 */
const denyNoVerifyHook: HookCallback = async (input) => {
  if (input.hook_event_name !== "PreToolUse" || input.tool_name !== "Bash") return {};
  const parsed = bashCommandSchema.safeParse(input.tool_input);
  if (!parsed.success || !NO_VERIFY_PATTERN.test(parsed.data.command)) return {};
  return {
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision: "deny",
      permissionDecisionReason: "L'option --no-verify est interdite (elle contourne les hooks git).",
    },
  };
};

export type SdkEffort = NonNullable<Options["effort"]>;
type SdkAgents = NonNullable<Options["agents"]>;

/** Narrow our free-form effort string to the SDK's enum; null/unknown → model default (undefined). */
export function toSdkEffort(effort: string | null): SdkEffort | undefined {
  if (effort === null) return undefined;
  return SDK_EFFORTS.find((value) => value === effort);
}

const HIDDEN_COMMIT_ATTRIBUTION = { commit: "" };

/** Build the `settings` partial: hide commit attribution always, add allow/deny permissions when set. */
function buildSettings(allow?: string[], deny?: string[]): Pick<Options, "settings"> {
  const settings: NonNullable<Options["settings"]> = { attribution: HIDDEN_COMMIT_ATTRIBUTION };
  const permissions: { allow?: string[]; deny?: string[] } = {};
  if (allow && allow.length > 0) permissions.allow = allow;
  if (deny && deny.length > 0) permissions.deny = deny;
  if (permissions.allow || permissions.deny) settings.permissions = permissions;
  return { settings };
}

function toSdkAgents(agents: Record<string, AgentSubagentDefinition>): SdkAgents {
  const out: SdkAgents = {};
  for (const [name, def] of Object.entries(agents)) {
    const effort = toSdkEffort(def.effort ?? null);
    out[name] = {
      description: def.description,
      prompt: def.prompt,
      ...(def.tools ? { tools: def.tools } : {}),
      ...(def.disallowedTools ? { disallowedTools: def.disallowedTools } : {}),
      ...(def.model ? { model: def.model } : {}),
      ...(effort ? { effort } : {}),
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

  function wake(): void {
    const resume = notify;
    notify = null;
    resume?.();
  }

  function enqueue(content: string): void {
    inbox.push({ type: "user", parent_tool_use_id: null, message: { role: "user", content } });
    wake();
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
    hooks: { PreToolUse: [{ matcher: "Bash", hooks: [denyNoVerifyHook] }] },
    ...(sdkEffort ? { effort: sdkEffort } : {}),
    ...buildSettings(opts.permissionAllow, opts.permissionDeny),
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
      // Graceful teardown: flag EOF and wake the parked generator so it returns (no bogus user turn).
      // Crucially do NOT hard-abort the stream here — a turn still in flight (e.g. the one in which
      // done()/fail() ran) must be allowed to emit its final `result`, which carries that turn's
      // usage; hard-closing drops it. Input EOF makes the CLI exit once the turn completes.
      closed = true;
      wake();
      // Backstop: if the turn never ends (stuck agent), force teardown so the session can't leak.
      const timer = setTimeout(() => {
        try {
          session.close();
        } catch {
          // Already torn down; nothing to release.
        }
      }, GRACEFUL_CLOSE_TIMEOUT_MS);
      timer.unref();
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
      // Both SDKResultSuccess and SDKResultError carry modelUsage: an interrupted or errored turn
      // still burned tokens, so account it regardless of subtype.
      const usageByModel: Record<string, AgentTurnUsage> = {};
      for (const [model, usage] of Object.entries(message.modelUsage)) {
        usageByModel[model] = {
          inputTokens: usage.inputTokens,
          outputTokens: usage.outputTokens,
          cacheReadTokens: usage.cacheReadInputTokens,
          cacheCreationTokens: usage.cacheCreationInputTokens,
          costUsd: usage.costUSD,
        };
      }
      onEvent({ type: "turn_end", ok, subtype: message.subtype, sessionId: message.session_id, usageByModel });
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

/** The Claude provider — the only `AgentProvider` implementation today. */
export const claudeProvider: AgentProvider = {
  name: "claude",
  createSession: createSdkAgentSession,
};
