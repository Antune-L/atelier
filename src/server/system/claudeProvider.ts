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
import type {
  HookCallback,
  McpHttpServerConfig,
  McpServerToolPolicy,
  Options,
  Query,
  SDKMessage,
  SDKUserMessage,
} from "@anthropic-ai/claude-agent-sdk";
import { nanoid } from "nanoid";
import { z } from "zod";

import { getErrorMessage, getErrorStack } from "../../shared/errors.ts";
import { WORKER_TOOLS } from "../../shared/protocol.ts";

import { createLogger } from "../logger.ts";

import type {
  AgentProvider,
  AgentSessionEvent,
  AgentSessionHandle,
  AgentSessionOptions,
  AgentSubagentDefinition,
  AgentTurnUsage,
} from "./agentSession.ts";
import { ensureClaudeBinary } from "./claudeBinary.ts";
import { envWithProjectNode } from "./nvmNode.ts";
import { isReviewPublishingCommand, REVIEW_PUBLISHING_DENIAL_REASON } from "./reviewPublishingGuard.ts";
import { settingSourcesForRole, workerToolsForRole } from "./sessionRolePolicy.ts";
import { launchesTypecheck, typecheckScriptNames, TYPECHECK_DENIAL_REASON } from "./typecheckGuard.ts";

const log = createLogger("claude-provider");

const MCP_SERVER_NAME = "kanban";
/** Graceful close lets the in-flight turn flush its result; force teardown if it never ends. */
const GRACEFUL_CLOSE_TIMEOUT_MS = 60_000;
const SDK_EFFORTS = ["low", "medium", "high", "xhigh", "max"] as const;
const NO_VERIFY_PATTERN = /--no-verify\b/;
const bashCommandSchema = z.object({ command: z.string() });

/** In-process PreToolUse hook denying every Bash command matched by `isDenied`; `{}` allows it. */
function denyBashHook(isDenied: (command: string) => boolean, reason: string): HookCallback {
  return async (input) => {
    if (input.hook_event_name !== "PreToolUse" || input.tool_name !== "Bash") return {};
    const parsed = bashCommandSchema.safeParse(input.tool_input);
    if (!parsed.success || !isDenied(parsed.data.command)) return {};
    return {
      hookSpecificOutput: {
        hookEventName: "PreToolUse",
        permissionDecision: "deny",
        permissionDecisionReason: reason,
      },
    };
  };
}

/** `git commit/push --no-verify` bypasses git hooks — the old `templates/preToolUse.ts` deny guard. */
const denyNoVerifyHook = denyBashHook(
  (command) => NO_VERIFY_PATTERN.test(command),
  "L'option --no-verify est interdite (elle contourne les hooks git).",
);

const denyReviewPublishingHook = denyBashHook(isReviewPublishingCommand, REVIEW_PUBLISHING_DENIAL_REASON);

function denyTypecheckHook(cwd: string): HookCallback {
  const scriptNames = new Set(typecheckScriptNames(cwd));
  return denyBashHook((command) => launchesTypecheck(command, scriptNames), TYPECHECK_DENIAL_REASON);
}

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

/** The fully-qualified MCP tool names this role may invoke. */
function workerToolNames(names: readonly string[]): string[] {
  return names.map((name) => `mcp__${MCP_SERVER_NAME}__${name}`);
}

export function createSdkAgentSession(opts: AgentSessionOptions): AgentSessionHandle {
  // ---- streaming input: a queue feeding a never-returning generator keeps the session alive ----
  const inbox: Array<{ id: string; prompt: SDKUserMessage }> = [];
  let notify: (() => void) | null = null;
  let closed = false;

  function wake(): void {
    const resume = notify;
    notify = null;
    resume?.();
  }

  function enqueue(content: string, messageId?: string): string {
    const id = messageId ?? nanoid(16);
    if (closed) {
      opts.onEvent({ type: "message_status", messageId: id, status: "rejected", turnId: null });
      return id;
    }
    inbox.push({ id, prompt: { type: "user", parent_tool_use_id: null, message: { role: "user", content } } });
    opts.onEvent({ type: "message_status", messageId: id, status: "received", turnId: null });
    wake();
    return id;
  }

  async function* prompts(): AsyncGenerator<SDKUserMessage> {
    for (;;) {
      while (inbox.length > 0) {
        const next = inbox.shift();
        if (next) {
          opts.onEvent({ type: "message_status", messageId: next.id, status: "accepted", turnId: null });
          yield next.prompt;
        }
      }
      if (closed) return;
      await new Promise<void>((resolve) => (notify = resolve));
    }
  }

  // ---- in-process MCP tools from the worker registry; each call routes back to the backend ----
  const workerTools = opts.disableWorkerTools ? [] : workerToolsForRole(opts.role);
  const allowedWorkerTools = new Set(workerTools);
  const tools = WORKER_TOOLS.filter((entry) => allowedWorkerTools.has(entry.name)).map((entry) =>
    tool(entry.name, entry.description, entry.argsSchema.shape, async (args) => {
      const outcome = await opts.onToolCall(entry.name, args);
      return {
        content: [{ type: "text", text: outcome.result || (outcome.ok ? "ok" : "échec") }],
        isError: !outcome.ok,
      };
    }),
  );
  const mcpServer = createSdkMcpServer({ name: MCP_SERVER_NAME, version: "0.0.0", tools });

  const extraMcpServers: NonNullable<Options["mcpServers"]> = {};
  for (const [name, def] of Object.entries(opts.extraMcpServers ?? {})) {
    if (def.type === "http") {
      const headers: Record<string, string> = {};
      if (def.bearerTokenEnvVar) {
        const token = process.env[def.bearerTokenEnvVar];
        if (token) headers.Authorization = `Bearer ${token}`;
      }
      for (const [header, envName] of Object.entries(def.envHttpHeaders ?? {})) {
        const value = process.env[envName];
        if (value) headers[header] = value;
      }
      const tools: NonNullable<McpHttpServerConfig["tools"]> = [
        ...(def.enabledTools ?? []).map(
          (toolName): McpServerToolPolicy => ({ name: toolName, permission_policy: "always_allow" }),
        ),
        ...(def.disabledTools ?? []).map(
          (toolName): McpServerToolPolicy => ({ name: toolName, permission_policy: "always_deny" }),
        ),
      ];
      extraMcpServers[name] = {
        type: "http",
        url: def.url,
        ...(Object.keys(headers).length > 0 ? { headers } : {}),
        ...(tools.length > 0 ? { tools } : {}),
      };
    } else {
      extraMcpServers[name] = {
        type: "stdio",
        command: def.command,
        ...(def.args ? { args: def.args } : {}),
        ...(def.env ? { env: def.env } : {}),
      };
    }
  }

  let disposed = false;
  const abortController = new AbortController();
  const sdkEffort = toSdkEffort(opts.effort);
  const preToolUseHooks: HookCallback[] = [denyNoVerifyHook];
  if (opts.blockReviewPublishing) preToolUseHooks.push(denyReviewPublishingHook);
  if (opts.blockTypecheck) preToolUseHooks.push(denyTypecheckHook(opts.cwd));
  const queryOptions: Options = {
    abortController,
    cwd: opts.cwd,
    model: opts.model,
    systemPrompt: { type: "preset", preset: "claude_code" },
    // NOTE: "user" is required so host-installed skills (`~/.claude/skills`, e.g. argus-review) are
    // discovered — `skills` below is only a filter over what `settingSources` finds, not a source. It
    // also merges the user's `~/.claude/settings.json` (permissions/hooks/plugins) AND
    // `~/.claude/CLAUDE.md` into the session, hence the reviewer carve-out in settingSourcesForRole.
    settingSources: settingSourcesForRole(opts.role),
    permissionMode: opts.permissionMode,
    mcpServers: { ...(workerTools.length > 0 ? { [MCP_SERVER_NAME]: mcpServer } : {}), ...extraMcpServers },
    allowedTools: [...workerToolNames(workerTools), ...(opts.allowedTools ?? [])],
    includePartialMessages: false,
    // Sessions run tools (lefthook, oxlint…) under the project's `.nvmrc` Node, not the nvm default.
    env: envWithProjectNode(opts.cwd),
    stderr: () => {},
    hooks: { PreToolUse: [{ matcher: "Bash", hooks: preToolUseHooks }] },
    ...(sdkEffort ? { effort: sdkEffort } : {}),
    ...buildSettings(opts.permissionAllow, opts.permissionDeny),
    ...(opts.disallowedTools ? { disallowedTools: opts.disallowedTools } : {}),
    ...(opts.skills ? { skills: opts.skills } : {}),
    ...(opts.agents ? { agents: toSdkAgents(opts.agents) } : {}),
    ...(opts.permissionMode === "bypassPermissions" ? { allowDangerouslySkipPermissions: true } : {}),
  };

  // The query starts only once a runnable binary exists (instant when resolved; on a cold packaged
  // install this downloads it, streaming progress lines into the session transcript). The inbox
  // generator above already buffers any turns sent in the meantime, so callers stay synchronous.
  const sessionPromise: Promise<Query> = ensureClaudeBinary((message) =>
    opts.onEvent({ type: "assistant_text", text: message }),
  ).then((binary) => {
    if (disposed) throw new Error("Session fermée avant démarrage");
    return query({ prompt: prompts(), options: { ...queryOptions, pathToClaudeCodeExecutable: binary } });
  });

  // ---- consume the stream in the background; parse each message into an AgentSessionEvent ----
  const pumping = pumpStream(sessionPromise, opts.onEvent);

  return {
    ticketId: opts.ticketId,
    send: enqueue,
    interrupt: async () => {
      try {
        const session = await sessionPromise;
        await session.interrupt();
      } catch {
        // interrupt() can reject if the turn already ended; the turn_end event is the source of truth.
      }
    },
    dispose: () => {
      disposed = true;
      closed = true;
      wake();
      abortController.abort();
      void sessionPromise.then((session) => session.close()).catch(() => undefined);
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
        void sessionPromise
          .then((session) => session.close())
          .catch(() => {
            // Already torn down (or never started); nothing to release.
          });
      }, GRACEFUL_CLOSE_TIMEOUT_MS);
      timer.unref();
      try {
        await pumping;
      } finally {
        clearTimeout(timer);
      }
    },
  };
}

async function pumpStream(sessionPromise: Promise<Query>, onEvent: (event: AgentSessionEvent) => void): Promise<void> {
  try {
    const session = await sessionPromise;
    for await (const message of session) safeDispatchClaudeMessage(message, onEvent);
  } catch (error) {
    onEvent({ type: "error", message: getErrorMessage(error) });
  }
}

/**
 * A consumer throwing on one message must not be mistaken for a stream failure: reporting it as a
 * fatal `error` event stalls the ticket and kills every delegated child.
 */
function safeDispatchClaudeMessage(message: SDKMessage, onEvent: (event: AgentSessionEvent) => void): void {
  try {
    dispatchClaudeMessage(message, onEvent);
  } catch (error) {
    log.error("traitement d'un message du flux impossible", { type: message.type, stack: getErrorStack(error) });
  }
}

export function dispatchClaudeMessage(message: SDKMessage, onEvent: (event: AgentSessionEvent) => void): void {
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
