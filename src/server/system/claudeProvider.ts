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
  SDKMessage,
  SDKPermissionDenial,
  SDKUserMessage,
} from "@anthropic-ai/claude-agent-sdk";
import { nanoid } from "nanoid";
import { z } from "zod";

import { getErrorMessage, getErrorStack } from "../../shared/errors.ts";
import { WORKER_TOOLS } from "../../shared/protocol.ts";
import type { QualityPermissionBlockReason } from "../../shared/quality.ts";

import { createLogger } from "../logger.ts";

import type {
  AgentImageInput,
  AgentProvider,
  AgentSendOptions,
  AgentSessionEvent,
  AgentSessionHandle,
  AgentSessionOptions,
  AgentSessionRole,
  AgentSubagentDefinition,
  AgentSubagentRef,
  AgentTurnUsage,
} from "./agentSession.ts";
import { SUBAGENT_DEFAULT_LABEL } from "./agentSession.ts";
import { ensureClaudeBinary } from "./claudeBinary.ts";
import { AUTONOMOUS_NATIVE_DELEGATION_DENIAL, watchAutonomousPermission } from "./autonomousPermission.ts";
import { scrubAmbientGithubTokens } from "./github/accountEnv.ts";
import { GH_AUTH_DENIAL_REASON, GH_AUTH_PERMISSION_DENY, isGhAuthCommand } from "./github/ghAuthGuard.ts";
import { envWithProjectNode } from "./nvmNode.ts";
import { PERMISSION_DENIAL_REASON, reportPermissionDenial } from "./permissionDiagnostics.ts";
import { qualityReadToolAllowed } from "./qualityReadPolicy.ts";
import { isReviewPublishingCommand, REVIEW_PUBLISHING_DENIAL_REASON } from "./reviewPublishingGuard.ts";
import { AUDITOR_INSTRUCTIONS, QUALITY_VALIDATOR_INSTRUCTIONS, settingSourcesForRole, workerToolsForRole } from "./sessionRolePolicy.ts";
import { launchesTypecheck, typecheckScriptNames, TYPECHECK_DENIAL_REASON } from "./typecheckGuard.ts";

const log = createLogger("claude-provider");

const MCP_SERVER_NAME = "kanban";
/** Graceful close lets the in-flight turn flush its result; force teardown if it never ends. */
const GRACEFUL_CLOSE_TIMEOUT_MS = 60_000;
const SDK_EFFORTS = ["low", "medium", "high", "xhigh", "max"] as const;
const NO_VERIFY_PATTERN = /--no-verify\b/;
const bashCommandSchema = z.object({ command: z.string() });

const SCOPED_READ_TOOLS = ["Read", "Glob", "Grep"];
const SCOPED_READ_ROLE_POLICIES: Partial<Record<AgentSessionRole, { readScopeDenial: string; instructions: string }>> = {
  "quality-validator": {
    readScopeDenial: "Quality inspection is restricted to repository files under the validation workspace.",
    instructions: QUALITY_VALIDATOR_INSTRUCTIONS,
  },
  auditor: {
    readScopeDenial: "Audit reads are restricted to repository files under the audited worktree.",
    instructions: AUDITOR_INSTRUCTIONS,
  },
};

function scopedReadHook(options: AgentSessionOptions, reportedDenials: Set<string>, reason: string): HookCallback {
  return async (input) => {
    if (input.hook_event_name !== "PreToolUse") return {};
    let blockReason: QualityPermissionBlockReason | null = null;
    if (qualityReadToolAllowed(options.cwd, input.tool_name, input.tool_input, (denied) => { blockReason ??= denied; })) return {};
    if (!reportedDenials.has(input.tool_use_id)) {
      reportedDenials.add(input.tool_use_id);
      reportPermissionDenial(options, { toolName: input.tool_name, command: null, reason, blockReason, nativeId: input.tool_use_id });
    }
    return { hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision: "deny",
      permissionDecisionReason: reason,
    } };
  };
}

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

/** `gh auth …` would let an agent read or switch the account chosen by the server. */
const denyGhAuthHook = denyBashHook(isGhAuthCommand, GH_AUTH_DENIAL_REASON);

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

const HIDDEN_ATTRIBUTION = { commit: "", pr: "" };

/** Build the `settings` partial: hide commit and PR attribution always, add allow/deny permissions when set. */
export function buildSettings(allow?: string[], deny?: string[]): Pick<Options, "settings"> {
  const settings: NonNullable<Options["settings"]> = { attribution: HIDDEN_ATTRIBUTION };
  const permissions: { allow?: string[]; deny?: string[] } = {};
  if (allow && allow.length > 0) permissions.allow = allow;
  if (deny && deny.length > 0) permissions.deny = deny;
  if (permissions.allow || permissions.deny) settings.permissions = permissions;
  return { settings };
}

export function toSdkAgents(agents: Record<string, AgentSubagentDefinition>): SdkAgents {
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

/** The slice of the SDK `Query` this provider drives. */
export interface ClaudeQuery extends AsyncIterable<SDKMessage> {
  interrupt(): Promise<unknown>;
  close(): void;
  getContextUsage(opts: { detail: "summary" }): Promise<{ totalTokens: number; rawMaxTokens: number }>;
}

/** Injectable SDK entry points (tests substitute a scripted query). */
export interface ClaudeSessionDependencies {
  query: (params: { prompt: AsyncIterable<SDKUserMessage>; options: Options }) => ClaudeQuery;
  ensureBinary: typeof ensureClaudeBinary;
}

const DEFAULT_DEPENDENCIES: ClaudeSessionDependencies = { query, ensureBinary: ensureClaudeBinary };

export function createSdkAgentSession(
  opts: AgentSessionOptions,
  dependencies: ClaudeSessionDependencies = DEFAULT_DEPENDENCIES,
): AgentSessionHandle {
  opts.executionGuard?.beforeStart();
  const reportedDenials = new Set<string>();
  // ---- streaming input: a queue feeding a never-returning generator keeps the session alive ----
  const inbox: Array<{ id: string; prompt: SDKUserMessage }> = [];
  let notify: (() => void) | null = null;
  let closed = false;

  function wake(): void {
    const resume = notify;
    notify = null;
    resume?.();
  }

  function enqueue(content: string, messageId?: string, images?: readonly AgentImageInput[], options?: AgentSendOptions): string {
    const id = messageId ?? nanoid(16);
    if (closed) {
      opts.onEvent({ type: "message_status", messageId: id, status: "rejected", turnId: null });
      return id;
    }
    const prompt: SDKUserMessage = { type: "user", parent_tool_use_id: null, message: { role: "user", content } };
    if (images?.length) {
      prompt.message.content = [{ type: "text", text: content }];
      for (const image of images) {
        prompt.message.content.push({
          type: "image",
          source: { type: "base64", media_type: image.mediaType, data: image.data },
        });
      }
    }
    // NOTE: unmeasured live (see probeClaudeSteering.ts). `next` asks the CLI to inject the message at
    // the next opportunity of the running turn; `now` would abort an in-flight tool call.
    if (options?.steer) prompt.priority = "next";
    inbox.push({ id, prompt });
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
        ...(def.alwaysLoad ? { alwaysLoad: true } : {}),
      };
    }
  }

  let disposed = false;
  const abortController = new AbortController();
  const sdkEffort = toSdkEffort(opts.effort);
  const preToolUseHooks: HookCallback[] = [denyNoVerifyHook, denyGhAuthHook];
  const autonomousHook: HookCallback = async (input) => {
    try {
      if (closed) throw new Error("Autonomous session closed");
      opts.executionGuard?.assertAllowed();
      if (input.hook_event_name === "PreToolUse" && (input.tool_name === "Agent" || input.tool_name === "Task")) {
        throw new Error(AUTONOMOUS_NATIVE_DELEGATION_DENIAL);
      }
      return {};
    } catch (error) {
      return { hookSpecificOutput: { hookEventName: "PreToolUse", permissionDecision: "deny", permissionDecisionReason: getErrorMessage(error) } };
    }
  };
  if (opts.blockReviewPublishing) preToolUseHooks.push(denyReviewPublishingHook);
  if (opts.blockTypecheck) preToolUseHooks.push(denyTypecheckHook(opts.cwd));
  const scopedReadPolicy = opts.role === undefined ? undefined : SCOPED_READ_ROLE_POLICIES[opts.role];
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
    // An attached project's GH_CONFIG_DIR must not be overridden by an ambient GH_TOKEN/GITHUB_TOKEN.
    env: scrubAmbientGithubTokens({ ...envWithProjectNode(opts.cwd), ...opts.environment }),
    stderr: () => {},
    hooks: { PreToolUse: [
      ...(opts.executionGuard ? [{ matcher: ".*", hooks: [autonomousHook] }] : []),
      { matcher: "Bash", hooks: preToolUseHooks },
      ...(scopedReadPolicy ? [{ matcher: SCOPED_READ_TOOLS.join("|"), hooks: [scopedReadHook(opts, reportedDenials, scopedReadPolicy.readScopeDenial)] }] : []),
    ] },
    ...(sdkEffort ? { effort: sdkEffort } : {}),
    // `gh auth` is denied to every Claude session (settings rule + the PreToolUse hook above).
    ...buildSettings(opts.permissionAllow, [...(opts.permissionDeny ?? []), GH_AUTH_PERMISSION_DENY]),
    ...(opts.disallowedTools ? { disallowedTools: opts.disallowedTools } : {}),
    ...(opts.skills ? { skills: opts.skills } : {}),
    ...(opts.agents ? { agents: toSdkAgents(opts.agents) } : {}),
    ...(opts.outputSchema ? { outputFormat: { type: "json_schema", schema: opts.outputSchema } } : {}),
    ...(scopedReadPolicy ? {
      tools: SCOPED_READ_TOOLS,
      strictMcpConfig: true,
      systemPrompt: { type: "preset", preset: "claude_code", excludeDynamicSections: true, append: scopedReadPolicy.instructions },
    } : {}),
    ...(opts.permissionMode === "bypassPermissions" ? { allowDangerouslySkipPermissions: true } : {}),
  };

  // The query starts only once a runnable binary exists (instant when resolved; on a cold packaged
  // install this downloads it, streaming progress lines into the session transcript). The inbox
  // generator above already buffers any turns sent in the meantime, so callers stay synchronous.
  const sessionPromise: Promise<ClaudeQuery> = dependencies.ensureBinary((message) =>
    opts.onEvent({ type: "assistant_text", text: message }),
  ).then((binary) => {
    if (disposed) throw new Error("Session fermée avant démarrage");
    opts.executionGuard?.assertAllowed();
    return dependencies.query({ prompt: prompts(), options: { ...queryOptions, pathToClaudeCodeExecutable: binary } });
  });

  // ---- consume the stream in the background; parse each message into an AgentSessionEvent ----
  const pumping = pumpStream(sessionPromise, opts, reportedDenials);
  const stopMonitoring = watchAutonomousPermission(opts.executionGuard, disposeSession);
  function disposeSession(): void {
    stopMonitoring();
    disposed = true;
    closed = true;
    wake();
    abortController.abort();
    void sessionPromise.then((session) => session.close()).catch(() => undefined);
  }
  void pumping.finally(stopMonitoring).catch(() => undefined);

  return {
    ticketId: opts.ticketId,
    send: enqueue,
    // `/compact` is a slash command: sent as a user turn, the CLI compacts and ends with a `result`.
    compact: async () => {
      if (closed) throw new Error("Session Claude fermée : compactage impossible.");
      enqueue("/compact");
    },
    interrupt: async () => {
      try {
        const session = await sessionPromise;
        await session.interrupt();
      } catch {
        // interrupt() can reject if the turn already ended; the turn_end event is the source of truth.
      }
    },
    dispose: disposeSession,
    close: async () => {
      stopMonitoring();
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

async function pumpStream(sessionPromise: Promise<ClaudeQuery>, options: AgentSessionOptions, reportedDenials: Set<string>): Promise<void> {
  const denialReasons = new Map<string, { reason: string; sourceId?: string }>();
  const subagents = createClaudeSubagentTracker();
  try {
    const session = await sessionPromise;
    for await (const message of session) {
      if (message.type === "system" && message.subtype === "permission_denied") {
        denialReasons.set(message.tool_use_id, {
          reason: message.decision_reason ?? message.message,
          ...(message.agent_id ? { sourceId: message.agent_id } : {}),
        });
      }
      safeDispatchClaudeMessage(message, options.onEvent, (denial) => {
        if (reportedDenials.has(denial.tool_use_id)) { denialReasons.delete(denial.tool_use_id); return; }
        reportedDenials.add(denial.tool_use_id);
        const details = denialReasons.get(denial.tool_use_id);
        const command = bashCommandSchema.safeParse(denial.tool_input);
        reportPermissionDenial(options, {
          nativeId: denial.tool_use_id,
          toolName: denial.tool_name,
          command: command.success ? command.data.command : null,
          reason: details?.reason ?? PERMISSION_DENIAL_REASON,
          ...(details?.sourceId ? { sourceId: details.sourceId } : {}),
        });
        denialReasons.delete(denial.tool_use_id);
      }, subagents);
      if (options.reportContextUsage && shouldReportContextUsage(message)) {
        await reportClaudeContextUsage(session, options.onEvent);
      }
    }
  } catch (error) {
    options.onEvent({ type: "error", message: getErrorMessage(error) });
  }
}

/** Context occupancy changes at turn boundaries and right after a compaction. */
function shouldReportContextUsage(message: SDKMessage): boolean {
  return message.type === "result" || (message.type === "system" && message.subtype === "compact_boundary");
}

/**
 * Reads the live context occupancy (`summary` skips the token-count API calls) and emits it. Never
 * throws: a closed or failing session must not break the stream.
 */
export async function reportClaudeContextUsage(
  session: Pick<ClaudeQuery, "getContextUsage">,
  onEvent: (event: AgentSessionEvent) => void,
): Promise<void> {
  try {
    const usage = await session.getContextUsage({ detail: "summary" });
    onEvent({ type: "context_usage", usedTokens: usage.totalTokens, maxTokens: usage.rawMaxTokens > 0 ? usage.rawMaxTokens : null });
  } catch (error) {
    log.warn("lecture de l'usage du contexte impossible", { reason: getErrorMessage(error) });
  }
}

/**
 * A consumer throwing on one message must not be mistaken for a stream failure: reporting it as a
 * fatal `error` event stalls the ticket and kills every delegated child.
 */
function safeDispatchClaudeMessage(
  message: SDKMessage,
  onEvent: (event: AgentSessionEvent) => void,
  onPermissionDenied: (denial: SDKPermissionDenial) => void,
  tracker: ClaudeSubagentTracker,
): void {
  try {
    dispatchClaudeMessage(message, onEvent, onPermissionDenied, tracker);
  } catch (error) {
    log.error("traitement d'un message du flux impossible", { type: message.type, stack: getErrorStack(error) });
  }
}

/** Per-session memory of the sub-agents announced by `task_started` (keyed by event id and task id). */
export interface ClaudeSubagentTracker {
  labels: Map<string, string>;
  taskKeys: Map<string, string>;
}

export function createClaudeSubagentTracker(): ClaudeSubagentTracker {
  return { labels: new Map(), taskKeys: new Map() };
}

/** Sub-agent attribution fields; parsed from the raw message since not every `user` variant types them. */
const subagentMessageFieldsSchema = z.object({
  task_description: z.string().optional(),
  subagent_type: z.string().optional(),
});

export function formatSubagentLabel(description: string | undefined, type: string | undefined): string | null {
  const parts = [description?.trim(), type?.trim()].filter((part): part is string => Boolean(part));
  return parts.length > 0 ? parts.join(" · ") : null;
}

function subagentRef(message: SDKMessage, parentToolUseId: string | null, tracker: ClaudeSubagentTracker): { subagent?: AgentSubagentRef } {
  if (parentToolUseId === null) return {};
  const fields = subagentMessageFieldsSchema.safeParse(message);
  const label = (fields.success ? formatSubagentLabel(fields.data.task_description, fields.data.subagent_type) : null)
    ?? tracker.labels.get(parentToolUseId)
    ?? SUBAGENT_DEFAULT_LABEL;
  return { subagent: { id: parentToolUseId, label } };
}

export function dispatchClaudeMessage(
  message: SDKMessage,
  onEvent: (event: AgentSessionEvent) => void,
  onPermissionDenied?: (denial: SDKPermissionDenial) => void,
  tracker: ClaudeSubagentTracker = createClaudeSubagentTracker(),
): void {
  switch (message.type) {
    case "system":
      if (message.subtype === "init") onEvent({ type: "init", sessionId: message.session_id });
      else if (message.subtype === "background_tasks_changed") {
        onEvent({
          type: "background_tasks",
          activeTaskIds: message.tasks.filter((task) => task.ambient !== true).map((task) => task.task_id),
        });
      } else if (message.subtype === "task_started") {
        if (message.task_type !== "local_agent" || message.ambient === true) return;
        const id = message.tool_use_id ?? message.task_id;
        const label = formatSubagentLabel(message.description, message.subagent_type) ?? SUBAGENT_DEFAULT_LABEL;
        tracker.labels.set(id, label);
        tracker.taskKeys.set(message.task_id, id);
        onEvent({ type: "subagent_lifecycle", phase: "started", id, label });
      } else if (message.subtype === "task_notification") {
        const id = tracker.taskKeys.get(message.task_id) ?? message.tool_use_id;
        const label = id === undefined ? undefined : tracker.labels.get(id);
        if (id === undefined || label === undefined) return;
        tracker.labels.delete(id);
        tracker.taskKeys.delete(message.task_id);
        onEvent({ type: "subagent_lifecycle", phase: "ended", id, label, status: message.status });
      }
      return;
    case "assistant": {
      const ref = subagentRef(message, message.parent_tool_use_id, tracker);
      for (const block of message.message.content) {
        if (block.type === "text") onEvent({ type: "assistant_text", text: block.text, ...ref });
        else if (block.type === "thinking") onEvent({ type: "thinking", text: block.thinking, ...ref });
        else if (block.type === "tool_use") onEvent({ type: "tool_use", name: block.name, input: block.input, toolCallId: block.id, ...ref });
      }
      return;
    }
    case "user": {
      if (typeof message.message.content === "string") return;
      const ref = subagentRef(message, message.parent_tool_use_id, tracker);
      for (const block of message.message.content) {
        if (block.type === "tool_result") {
          onEvent({ type: "tool_result", toolCallId: block.tool_use_id, output: block.content, ok: block.is_error !== true, ...ref });
        }
      }
      return;
    }
    case "result": {
      const ok = message.subtype === "success";
      for (const denial of message.permission_denials) onPermissionDenied?.(denial);
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
      onEvent({
        type: "turn_end",
        ok,
        subtype: message.subtype,
        sessionId: message.session_id,
        usageByModel,
        ...(message.subtype === "success" && message.structured_output !== undefined
          ? { structuredOutput: message.structured_output }
          : {}),
      });
      return;
    }
    case "rate_limit_event":
      onEvent({
        type: "rate_limit",
        status: message.rate_limit_info.status,
        resetsAt: message.rate_limit_info.resetsAt ?? null,
        rateLimitType: message.rate_limit_info.rateLimitType ?? null,
        utilization: message.rate_limit_info.utilization ?? null,
      });
      return;
    default:
      return;
  }
}

/** The Claude provider — the only `AgentProvider` implementation today. */
export const claudeProvider: AgentProvider = {
  name: "claude",
  createSession: (opts) => createSdkAgentSession(opts),
};
