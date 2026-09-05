/** Interactive Codex provider backed by the stable `codex app-server` protocol. */

import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { nanoid } from "nanoid";
import { z } from "zod";

import { DEFAULT_PORT, HTTP_PATH_WORKER_MCP } from "../../shared/constants.ts";
import type { WorkerToolName } from "../../shared/protocol.ts";
import type { WorkerMcpManager } from "../workerMcp.ts";

import type {
  AgentMcpServerDefinition,
  AgentProvider,
  AgentSessionEvent,
  AgentSessionHandle,
  AgentSessionOptions,
  AgentSubagentDefinition,
  AgentTurnUsage,
} from "./agentSession.ts";
import {
  connectCodexAppServer,
  type CodexAppServerConnection,
  type CodexAppServerNotification,
  type CodexAppServerOptions,
} from "./codexAppServer.ts";
import { resolveCodexBinary } from "./codexBinary.ts";
import {
  CODEX_SESSION_PRE_TOOL_USE_HOOK_KEY,
  codexSessionPreToolUseHookHash,
  type CodexCommandHook,
} from "./codexHookTrust.ts";
import { hasExplicitCodexApiKey } from "./codexRuntime.ts";
import { envWithProjectNode } from "./nvmNode.ts";
import { workerToolsForRole } from "./sessionRolePolicy.ts";

const GRACEFUL_CLOSE_TIMEOUT_MS = 60_000;
const FORCE_CLOSE_GRACE_MS = 2_000;
const WORKER_TOKEN_ENV = "KANBAN_WORKER_MCP_TOKEN";
const API_KEY_PROVIDER_ID = "kanban_openai_api_key";

type ConfigValue = string | number | boolean | ConfigValue[] | ConfigObject;
interface ConfigObject {
  [key: string]: ConfigValue;
}

const emptyResponseSchema = z.object({});
const threadResponseSchema = z.object({ thread: z.object({ id: z.string() }), serviceTier: z.string().nullable().optional() });
const turnStartResponseSchema = z.object({ turn: z.object({ id: z.string() }) });
const turnSteerResponseSchema = z.object({ turnId: z.string() });
const turnsResponseSchema = z.object({
  data: z.array(
    z.object({
      id: z.string(),
      status: z.enum(["completed", "interrupted", "failed", "inProgress"]),
      items: z.array(z.object({ type: z.string(), clientId: z.string().nullable().optional() })),
    }),
  ),
  nextCursor: z.string().nullable().optional(),
});
type TurnsResponse = z.infer<typeof turnsResponseSchema>;
const configReadResponseSchema = z.object({
  config: z
    .object({
      mcp_servers: z.record(z.string(), z.unknown()).optional(),
    })
    .passthrough(),
});
const skillsResponseSchema = z.object({
  data: z.array(
    z.object({
      skills: z.array(z.object({ name: z.string(), path: z.string(), enabled: z.boolean() })),
    }),
  ),
});
const textDeltaSchema = z.object({ threadId: z.string(), turnId: z.string(), itemId: z.string(), delta: z.string(), summaryIndex: z.number().optional(), contentIndex: z.number().optional() });
const agentMessageDeltaSchema = textDeltaSchema.extend({ itemId: z.string() });
const tokenUsageSchema = z.object({
  threadId: z.string(),
  turnId: z.string(),
  tokenUsage: z.object({
    last: z.object({
      inputTokens: z.number(),
      cachedInputTokens: z.number(),
      cacheWriteInputTokens: z.number(),
      outputTokens: z.number(),
    }),
  }),
});
const turnStartedSchema = z.object({ threadId: z.string(), turn: z.object({ id: z.string() }) });
const turnCompletedSchema = z.object({
  threadId: z.string(),
  turn: z.object({
    id: z.string(),
    status: z.enum(["completed", "interrupted", "failed", "inProgress"]),
    error: z.object({ message: z.string() }).nullable(),
  }),
});
const errorNotificationSchema = z.object({
  error: z.object({ message: z.string() }),
  willRetry: z.boolean(),
  threadId: z.string(),
  turnId: z.string(),
});
const itemLifecycleSchema = z.object({
  threadId: z.string(),
  turnId: z.string(),
  item: z.discriminatedUnion("type", [
    z.object({ type: z.literal("agentMessage"), id: z.string(), text: z.string() }),
    z.object({ type: z.literal("reasoning"), id: z.string(), summary: z.array(z.string()), content: z.array(z.string()) }),
    z.object({ type: z.literal("plan"), id: z.string(), text: z.string() }),
    z.object({ type: z.literal("commandExecution"), id: z.string(), command: z.string(), status: z.string(), aggregatedOutput: z.string().nullable().optional() }),
    z.object({ type: z.literal("fileChange"), id: z.string(), changes: z.array(z.unknown()), status: z.string() }),
    z.object({
      type: z.literal("mcpToolCall"),
      id: z.string(),
      server: z.string(),
      tool: z.string(),
      arguments: z.unknown(),
      status: z.string(),
    }),
    z.object({
      type: z.literal("collabAgentToolCall"),
      id: z.string(),
      tool: z.string(),
      status: z.string(),
      receiverThreadIds: z.array(z.string()),
    }),
  ]),
});
const mcpProgressSchema = z.object({ threadId: z.string(), message: z.string() });

interface SkillInput {
  type: "skill";
  name: string;
  path: string;
}

interface QueuedMessage {
  id: string;
  content: string;
  reconcileBeforeSend: boolean;
}

interface PreparedAgents {
  config: ConfigObject | null;
  cleanup(): void;
}

interface PreparedHook {
  config: ConfigObject;
  cleanup(): void;
}

export interface CodexProviderDependencies {
  connect?(options: CodexAppServerOptions): Promise<CodexAppServerConnection>;
  resolveBinary?(): string;
  projectEnvironment?(cwd: string): Record<string, string | undefined>;
}

function resolveBackendPort(): number {
  const parsed = Number(process.env.PORT ?? DEFAULT_PORT);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_PORT;
}

function describeCodexError(message: string): string {
  const lower = message.toLowerCase();
  if (
    lower.includes("401") ||
    lower.includes("unauthorized") ||
    lower.includes("not logged in") ||
    lower.includes("token expired")
  ) {
    return `Authentification Codex refusée — reconnecte Codex puis relance la vérification. Détail : ${message}`;
  }
  if (
    lower.includes("model_not_found") ||
    lower.includes("unsupported model") ||
    lower.includes("model is deprecated") ||
    (lower.includes("model") && lower.includes("does not exist"))
  ) {
    return `Modèle Codex indisponible — choisis un autre modèle ou effort. Détail : ${message}`;
  }
  return message;
}

function mcpConfig(definition: AgentMcpServerDefinition): ConfigObject {
  const common: ConfigObject = { default_tools_approval_mode: "approve", enabled: true };
  if (definition.enabledTools) common.enabled_tools = definition.enabledTools;
  if (definition.disabledTools) common.disabled_tools = definition.disabledTools;
  if (definition.type === "http") {
    common.url = definition.url;
    if (definition.bearerTokenEnvVar) common.bearer_token_env_var = definition.bearerTokenEnvVar;
    if (definition.envHttpHeaders) common.env_http_headers = definition.envHttpHeaders;
    return common;
  }
  common.command = definition.command;
  if (definition.args) common.args = definition.args;
  if (definition.env) common.env = definition.env;
  return common;
}

function setConfigEntry(config: ConfigObject, key: string, value: ConfigValue): void {
  Object.defineProperty(config, key, {
    configurable: true,
    enumerable: true,
    value,
    writable: true,
  });
}

function buildMcpServers(
  options: AgentSessionOptions,
  workerToken: string | null,
  workerTools: WorkerToolName[],
  inheritedServerNames: string[],
): ConfigObject {
  const servers: ConfigObject = {};
  for (const name of inheritedServerNames) {
    setConfigEntry(servers, name, { enabled: false });
  }
  if (workerToken) {
    setConfigEntry(servers, "kanban", {
      url: `http://127.0.0.1:${resolveBackendPort()}${HTTP_PATH_WORKER_MCP}`,
      bearer_token_env_var: WORKER_TOKEN_ENV,
      default_tools_approval_mode: "approve",
      enabled_tools: workerTools,
      enabled: true,
      required: true,
    });
  }
  for (const [name, definition] of Object.entries(options.extraMcpServers ?? {})) {
    setConfigEntry(servers, name, mcpConfig(definition));
  }
  return servers;
}

async function inheritedMcpServerNames(
  connection: CodexAppServerConnection,
  cwd: string,
): Promise<string[]> {
  const response = await connection.request(
    "config/read",
    { cwd, includeLayers: false },
    configReadResponseSchema,
  );
  return Object.keys(response.config.mcp_servers ?? {});
}

function tomlString(value: string): string {
  return JSON.stringify(value);
}

function agentToml(name: string, definition: AgentSubagentDefinition, parentServiceTier: "default" | "fast"): string {
  const serviceTier = definition.serviceTier ?? parentServiceTier;
  const toolInstruction = [
    definition.tools?.length ? `Use only these tools when available: ${definition.tools.join(", ")}.` : "",
    definition.disallowedTools?.length ? `Do not use these tools: ${definition.disallowedTools.join(", ")}.` : "",
  ]
    .filter(Boolean)
    .join("\n");
  const instructions = toolInstruction ? `${definition.prompt}\n\n${toolInstruction}` : definition.prompt;
  const lines = [
    `name = ${tomlString(name)}`,
    `service_tier = ${tomlString(serviceTier)}`,
    `description = ${tomlString(definition.description)}`,
    `developer_instructions = ${tomlString(instructions)}`,
  ];
  if (definition.model) lines.push(`model = ${tomlString(definition.model)}`);
  if (definition.effort) lines.push(`model_reasoning_effort = ${tomlString(definition.effort)}`);
  if (definition.readOnly || definition.role === "triage" || definition.role === "feasibility" || definition.role === "split" || definition.role === "scout" || definition.role === "reviewer") {
    lines.push('sandbox_mode = "read-only"');
  }
  lines.push("", "[features]", `fast_mode = ${serviceTier === "fast"}`);
  if (definition.role && definition.role !== "orchestrator") {
    lines.push("", "[mcp_servers.kanban]", "enabled = false");
  }
  return `${lines.join("\n")}\n`;
}

function prepareAgents(
  agents: Record<string, AgentSubagentDefinition> | undefined,
  role: AgentSessionOptions["role"],
  serviceTier: "default" | "fast",
): PreparedAgents {
  if (!agents || Object.keys(agents).length === 0) return { config: null, cleanup: () => {} };
  const directory = mkdtempSync(join(tmpdir(), "kanban-codex-agents-"));
  const declarations: ConfigObject = role === "feasibility"
    ? { enabled: true, max_concurrent_threads_per_session: 4, max_depth: 1 }
    : { enabled: true };
  for (const [name, definition] of Object.entries(agents)) {
    const fileName = `${name.replaceAll(/[^a-zA-Z0-9_-]/g, "_")}.toml`;
    const path = join(directory, fileName);
    writeFileSync(path, agentToml(name, definition, serviceTier), { encoding: "utf8", mode: 0o600 });
    declarations[name] = { description: definition.description, config_file: path };
  }
  return {
    config: declarations,
    cleanup: () => rmSync(directory, { recursive: true, force: true }),
  };
}

function shellQuote(value: string): string {
  return `'${value.replaceAll("'", `'"'"'`)}'`;
}

function prepareNoVerifyHook(): PreparedHook {
  const directory = mkdtempSync(join(tmpdir(), "kanban-codex-hooks-"));
  const path = join(directory, "deny-no-verify.sh");
  writeFileSync(
    path,
    `#!/bin/sh
input=$(cat)
case "$input" in
  *--no-verify*)
    printf '%s\\n' '{"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"deny","permissionDecisionReason":"L option --no-verify est interdite."}}'
    exit 0
    ;;
esac
if printf '%s' "$input" | grep -q '"agent_id"' && printf '%s' "$input" | grep -Eq 'git[[:space:]]+(commit|push)'; then
  printf '%s\\n' '{"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"deny","permissionDecisionReason":"Les sous-agents ne peuvent ni commit ni push."}}'
fi
`,
    { encoding: "utf8", mode: 0o700 },
  );
  const handler: CodexCommandHook = {
    type: "command",
    command: shellQuote(path),
    timeout: 5,
    statusMessage: "Checking git policy",
  };
  return {
    config: {
      PreToolUse: [
        {
          matcher: "^Bash$",
          hooks: [handler],
        },
      ],
      state: {
        [CODEX_SESSION_PRE_TOOL_USE_HOOK_KEY]: {
          enabled: true,
          trusted_hash: codexSessionPreToolUseHookHash(handler),
        },
      },
    },
    cleanup: () => rmSync(directory, { recursive: true, force: true }),
  };
}

async function prepareSkills(
  connection: CodexAppServerConnection,
  options: AgentSessionOptions,
): Promise<{ config: ConfigValue[]; inputs: SkillInput[] } | null> {
  if (options.skills === undefined) return null;
  const response = await connection.request(
    "skills/list",
    { cwds: [options.cwd], forceReload: false },
    skillsResponseSchema,
  );
  const skills = response.data.flatMap((entry) => entry.skills);
  const selected = new Set(options.skills);
  const available = new Set(skills.map((skill) => skill.name));
  const missing = options.skills.filter((name) => !available.has(name));
  if (missing.length > 0) throw new Error(`Skills Codex introuvables : ${missing.join(", ")}`);
  return {
    config: skills.map((skill) => ({ path: skill.path, enabled: selected.has(skill.name) })),
    inputs: skills
      .filter((skill) => selected.has(skill.name))
      .map((skill) => ({ type: "skill", name: skill.name, path: skill.path })),
  };
}

function threadConfig(
  options: AgentSessionOptions,
  environment: Record<string, string | undefined>,
  servers: ConfigObject,
  agents: ConfigObject | null,
  skills: ConfigValue[] | null,
  hooks: ConfigObject,
): ConfigObject {
  const config: ConfigObject = {
    allow_login_shell: false,
    web_search: "live",
    sandbox_workspace_write: { network_access: options.readOnly !== true },
    shell_environment_policy: { inherit: "all", ignore_default_excludes: false },
    features: { hooks: true, plugins: false, skill_mcp_dependency_install: false, fast_mode: options.serviceTier === "fast" },
    service_tier: options.serviceTier ?? "default",
    hooks,
  };
  if (hasExplicitCodexApiKey(environment)) {
    config.model_providers = {
      [API_KEY_PROVIDER_ID]: {
        name: "OpenAI API key",
        base_url: "https://api.openai.com/v1",
        env_key: "CODEX_API_KEY",
        wire_api: "responses",
      },
    };
  }
  if (options.effort) config.model_reasoning_effort = options.effort;
  if (Object.keys(servers).length > 0) config.mcp_servers = servers;
  if (agents) config.agents = agents;
  if (skills) config.skills = { config: skills };
  return config;
}

function usageForModel(options: AgentSessionOptions, usage: AgentTurnUsage | undefined): Record<string, AgentTurnUsage> {
  return usage ? { [options.model]: usage } : {};
}

function createCodexAgentSession(
  options: AgentSessionOptions,
  mcpManager: WorkerMcpManager,
  dependencies: CodexProviderDependencies,
): AgentSessionHandle {
  const inbox: QueuedMessage[] = [];
  const usageByTurn = new Map<string, AgentTurnUsage>();
  const childThreads = new Set<string>();
  const workerTools = workerToolsForRole(options.role);
  const hasWorkerServer = options.disableWorkerTools !== true && workerTools.length > 0;
  const workerToken = hasWorkerServer ? nanoid(32) : null;
  let preparedAgents: PreparedAgents = { config: null, cleanup: () => {} };
  let preparedHook: PreparedHook = { config: {}, cleanup: () => {} };
  let connection: CodexAppServerConnection | null = null;
  let threadId: string | null = null;
  let activeTurnId: string | null = null;
  let blockedSteerTurnId: string | null = null;
  let skillInputs: SkillInput[] = [];
  let firstTurn = true;
  let dispatching = false;
  let closing = false;
  let cleaned = false;
  let fatalReported = false;
  let closeTimer: ReturnType<typeof setTimeout> | null = null;
  let forceTimer: ReturnType<typeof setTimeout> | null = null;
  const dispatchIdleWaiters: Array<() => void> = [];
  let resolveClosed: (() => void) | null = null;
  const closedPromise = new Promise<void>((resolve) => {
    resolveClosed = resolve;
  });

  function emit(event: AgentSessionEvent): void {
    options.onEvent(event);
  }

  function emitMessageStatus(
    message: QueuedMessage,
    status: "received" | "accepted" | "rejected",
    turnId: string | null,
  ): void {
    emit({ type: "message_status", messageId: message.id, status, turnId });
  }

  function rejectQueuedMessages(): void {
    for (;;) {
      const message = inbox.shift();
      if (!message) return;
      emitMessageStatus(message, "rejected", null);
    }
  }

  function waitForDispatchIdle(): Promise<void> {
    if (!dispatching) return Promise.resolve();
    return new Promise((resolve) => dispatchIdleWaiters.push(resolve));
  }

  function resolveDispatchIdle(): void {
    for (;;) {
      const resolve = dispatchIdleWaiters.shift();
      if (!resolve) return;
      resolve();
    }
  }

  function cleanup(): void {
    if (cleaned) return;
    cleaned = true;
    if (workerToken) mcpManager.unregister(workerToken);
    preparedAgents.cleanup();
    preparedHook.cleanup();
    if (closeTimer) clearTimeout(closeTimer);
    if (forceTimer) clearTimeout(forceTimer);
    resolveClosed?.();
    resolveClosed = null;
  }

  function emitTurnEnd(ok: boolean, subtype: string, turnId: string | null): void {
    emit({
      type: "turn_end",
      ok,
      subtype,
      sessionId: threadId ?? "",
      turnId,
      usageByModel: usageForModel(options, turnId ? usageByTurn.get(turnId) : undefined),
    });
    if (turnId) usageByTurn.delete(turnId);
  }

  function reportFatal(error: unknown): void {
    if (fatalReported) return;
    fatalReported = true;
    const message = describeCodexError(error instanceof Error ? error.message : String(error));
    emit({ type: "error", message });
    if (activeTurnId !== null || inbox.length > 0) emitTurnEnd(false, "error", activeTurnId);
  }

  function observedThread(id: string): boolean {
    return id === threadId || childThreads.has(id);
  }

  function emitFrom(sourceThreadId: string, event: AgentSessionEvent): void {
    emit(sourceThreadId === threadId ? event : { ...event, sourceId: sourceThreadId });
  }

  function parseItem(notification: CodexAppServerNotification, completed: boolean): void {
    const parsed = itemLifecycleSchema.safeParse(notification.params);
    if (!parsed.success || !observedThread(parsed.data.threadId)) return;
    const emit = (event: AgentSessionEvent): void => emitFrom(parsed.data.threadId, event);
    const item = parsed.data.item;
    if (item.type === "agentMessage") {
      if (completed) emit({ type: "assistant_text", text: item.text, stream: { itemId: `${parsed.data.turnId}:${item.id}`, mode: "snapshot" } });
      return;
    }
    if (item.type === "reasoning") {
      if (completed) {
        for (const [section, texts] of [["summary", item.summary], ["content", item.content]] as const) {
          texts.forEach((text, index) => emit({ type: "thinking", text, stream: {
            itemId: `${parsed.data.turnId}:${item.id}:${section}:${index}`, mode: "snapshot",
          } }));
        }
      }
      return;
    }
    if (item.type === "commandExecution") {
      if (!completed) emit({ type: "tool_use", name: "command_execution", input: { command: item.command } });
      if (completed && item.aggregatedOutput != null) emit({ type: "progress", kind: "command", message: item.aggregatedOutput,
        stream: { itemId: `${parsed.data.turnId}:${item.id}:output`, mode: "snapshot" } });
      emit({ type: "progress", kind: "command", message: `${item.status}: ${item.command}` });
      return;
    }
    if (item.type === "fileChange") {
      if (!completed) emit({ type: "tool_use", name: "file_change", input: { changes: item.changes } });
      emit({ type: "progress", kind: "file_change", message: `Modification de fichiers : ${item.status}` });
      return;
    }
    if (item.type === "mcpToolCall") {
      if (!completed) emit({ type: "tool_use", name: `${item.server}__${item.tool}`, input: item.arguments });
      emit({ type: "progress", kind: "mcp", message: `${item.server}/${item.tool} : ${item.status}` });
      return;
    }
    if (item.type === "collabAgentToolCall") {
      for (const receiver of item.receiverThreadIds) {
        if (childThreads.size < 64 && receiver !== threadId) childThreads.add(receiver);
      }
      if (!completed) emit({ type: "tool_use", name: `collaboration__${item.tool}`, input: { receivers: item.receiverThreadIds } });
      emit({ type: "progress", kind: "subagent", message: `${item.tool} : ${item.status}` });
      return;
    }
    emit({ type: "progress", kind: "plan", message: item.text });
  }

  function handleNotification(notification: CodexAppServerNotification): void {
    if (cleaned) return;
    if (notification.method === "thread/started") {
      const parsed = z.object({ thread: z.object({ id: z.string(), parentThreadId: z.string().nullable() }) }).safeParse(notification.params);
      if (parsed.success && parsed.data.thread.parentThreadId && observedThread(parsed.data.thread.parentThreadId) && childThreads.size < 64) {
        childThreads.add(parsed.data.thread.id);
      }
      return;
    }
    if (notification.method === "item/agentMessage/delta") {
      const parsed = agentMessageDeltaSchema.safeParse(notification.params);
      if (parsed.success && observedThread(parsed.data.threadId)) {
        emitFrom(parsed.data.threadId, { type: "assistant_text", text: parsed.data.delta, stream: {
          itemId: `${parsed.data.turnId}:${parsed.data.itemId}`, mode: "delta",
        } });
      }
      return;
    }
    if (notification.method === "item/reasoning/summaryTextDelta" || notification.method === "item/reasoning/textDelta") {
      const parsed = textDeltaSchema.safeParse(notification.params);
      if (parsed.success && observedThread(parsed.data.threadId)) {
        const summary = notification.method === "item/reasoning/summaryTextDelta";
        emitFrom(parsed.data.threadId, { type: "thinking", text: parsed.data.delta, stream: {
          itemId: `${parsed.data.turnId}:${parsed.data.itemId}:${summary ? "summary" : "content"}:${(summary ? parsed.data.summaryIndex : parsed.data.contentIndex) ?? 0}`, mode: "delta",
        } });
      }
      return;
    }
    if (notification.method === "item/started" || notification.method === "item/completed") {
      parseItem(notification, notification.method === "item/completed");
      return;
    }
    if (notification.method === "item/mcpToolCall/progress") {
      const parsed = mcpProgressSchema.safeParse(notification.params);
      if (parsed.success && observedThread(parsed.data.threadId)) {
        emitFrom(parsed.data.threadId, { type: "progress", kind: "mcp", message: parsed.data.message });
      }
      return;
    }
    if (notification.method === "item/commandExecution/outputDelta") {
      const parsed = textDeltaSchema.safeParse(notification.params);
      if (parsed.success && observedThread(parsed.data.threadId)) {
        emitFrom(parsed.data.threadId, { type: "progress", kind: "command", message: parsed.data.delta, stream: { itemId: `${parsed.data.turnId}:${parsed.data.itemId}:output`, mode: "delta" } });
      }
      return;
    }
    if (notification.method === "thread/tokenUsage/updated") {
      const parsed = tokenUsageSchema.safeParse(notification.params);
      if (parsed.success && parsed.data.threadId === threadId) {
        const usage = parsed.data.tokenUsage.last;
        usageByTurn.set(parsed.data.turnId, {
          inputTokens: usage.inputTokens,
          outputTokens: usage.outputTokens,
          cacheReadTokens: usage.cachedInputTokens,
          cacheCreationTokens: usage.cacheWriteInputTokens,
          costUsd: null,
        });
      }
      return;
    }
    if (notification.method === "turn/started") {
      const parsed = turnStartedSchema.safeParse(notification.params);
      if (parsed.success && parsed.data.threadId === threadId) activeTurnId = parsed.data.turn.id;
      return;
    }
    if (notification.method === "turn/completed") {
      const parsed = turnCompletedSchema.safeParse(notification.params);
      if (!parsed.success || parsed.data.threadId !== threadId) return;
      const turn = parsed.data.turn;
      if (turn.error) emit({ type: "error", message: describeCodexError(turn.error.message) });
      emitTurnEnd(turn.status === "completed", turn.status, turn.id);
      if (activeTurnId === turn.id) activeTurnId = null;
      blockedSteerTurnId = null;
      scheduleDispatch();
      void finishIfDrained();
      return;
    }
    if (notification.method === "error") {
      const parsed = errorNotificationSchema.safeParse(notification.params);
      if (parsed.success && parsed.data.threadId === threadId && !parsed.data.willRetry) {
        emit({ type: "error", message: describeCodexError(parsed.data.error.message) });
      }
    }
  }

  function turnInput(content: string): unknown[] {
    const input: unknown[] = [{ type: "text", text: content, text_elements: [] }];
    if (firstTurn) {
      input.push(...skillInputs);
      firstTurn = false;
    }
    return input;
  }

  async function acceptedTurnForMessage(
    messageId: string,
  ): Promise<{ id: string; active: boolean } | null> {
    if (!connection || !threadId) return null;
    for (let attempt = 0; attempt < 3; attempt += 1) {
      let cursor: string | null = null;
      const seenCursors = new Set<string>();
      do {
        const turns: TurnsResponse = await connection.request(
          "thread/turns/list",
          { threadId, cursor, limit: 100, sortDirection: "desc", itemsView: "full" },
          turnsResponseSchema,
        );
        const accepted = turns.data.find((turn) =>
          turn.items.some((item) => item.type === "userMessage" && item.clientId === messageId),
        );
        if (accepted) return { id: accepted.id, active: accepted.status === "inProgress" };
        cursor = turns.nextCursor ?? null;
        if (cursor && seenCursors.has(cursor)) throw new Error("Pagination Codex cyclique pendant la réconciliation");
        if (cursor) seenCursors.add(cursor);
      } while (cursor);
      await Bun.sleep(25);
    }
    return null;
  }

  async function dispatch(): Promise<void> {
    if (closing || dispatching || !connection || !threadId || inbox.length === 0) return;
    if (activeTurnId && blockedSteerTurnId === activeTurnId) return;
    dispatching = true;
    const currentTurnId = activeTurnId;
    const message = inbox.shift();
    if (!message) {
      dispatching = false;
      return;
    }
    try {
      if (message.reconcileBeforeSend) {
        const acceptedTurn = await acceptedTurnForMessage(message.id);
        message.reconcileBeforeSend = false;
        if (acceptedTurn) {
          activeTurnId = acceptedTurn.active ? acceptedTurn.id : activeTurnId;
          emitMessageStatus(message, "accepted", acceptedTurn.id);
          return;
        }
      }
      if (currentTurnId) {
        const steered = await connection.request(
          "turn/steer",
          {
            threadId,
            expectedTurnId: currentTurnId,
            clientUserMessageId: message.id,
            input: turnInput(message.content),
          },
          turnSteerResponseSchema,
        );
        emitMessageStatus(message, "accepted", steered.turnId);
      } else {
        const started = await connection.request(
          "turn/start",
          {
            threadId,
            clientUserMessageId: message.id,
            input: turnInput(message.content),
            model: options.model,
            effort: options.effort,
            serviceTier: options.serviceTier ?? "default",
          },
          turnStartResponseSchema,
        );
        activeTurnId = started.turn.id;
        emitMessageStatus(message, "accepted", started.turn.id);
      }
    } catch (error) {
      try {
        const acceptedTurn = await acceptedTurnForMessage(message.id);
        if (acceptedTurn) {
          activeTurnId = acceptedTurn.active ? acceptedTurn.id : null;
          emitMessageStatus(message, "accepted", acceptedTurn.id);
        } else if (currentTurnId) {
          inbox.unshift(message);
          blockedSteerTurnId = currentTurnId;
        } else {
          emitMessageStatus(message, "rejected", null);
          if (!closing) reportFatal(error);
        }
      } catch (reconciliationError) {
        emitMessageStatus(message, "rejected", null);
        const detail = reconciliationError instanceof Error ? reconciliationError.message : String(reconciliationError);
        const uncertainMessage = describeCodexError(`Envoi Codex incertain, message non rejoué : ${detail}`);
        if (currentTurnId && !closing) {
          emit({ type: "error", message: uncertainMessage });
          blockedSteerTurnId = currentTurnId;
        } else if (!closing) {
          reportFatal(new Error(uncertainMessage));
        }
      }
    } finally {
      dispatching = false;
      resolveDispatchIdle();
      if (!fatalReported && !closing) scheduleDispatch();
      void finishIfDrained();
    }
  }

  function scheduleDispatch(): void {
    if (closing) return;
    queueMicrotask(() => void dispatch());
  }

  async function finishConnection(): Promise<void> {
    const current = connection;
    try {
      if (current) await current.close();
    } finally {
      if (connection === current) connection = null;
      cleanup();
    }
  }

  async function finishIfDrained(): Promise<void> {
    if (!closing || dispatching || activeTurnId || inbox.length > 0) return;
    await finishConnection();
  }

  async function forceClose(): Promise<void> {
    if (activeTurnId && connection && threadId) {
      try {
        await connection.request("turn/interrupt", { threadId, turnId: activeTurnId }, emptyResponseSchema);
      } catch {
        // Process teardown below is the final backstop.
      }
      forceTimer = setTimeout(() => {
        if (activeTurnId) emitTurnEnd(false, "interrupted", activeTurnId);
        void finishConnection();
      }, FORCE_CLOSE_GRACE_MS);
      return;
    }
    await finishConnection();
  }

  async function bootstrap(): Promise<void> {
    let lastStderr = "";
    try {
      preparedAgents = prepareAgents(options.agents, options.role, options.serviceTier ?? "default");
      preparedHook = prepareNoVerifyHook();
      const environment = (dependencies.projectEnvironment ?? envWithProjectNode)(options.cwd);
      if (workerToken) environment[WORKER_TOKEN_ENV] = workerToken;
      const liveConnection = await (dependencies.connect ?? connectCodexAppServer)({
        binaryPath: (dependencies.resolveBinary ?? resolveCodexBinary)(),
        cwd: options.cwd,
        env: environment,
        onNotification: handleNotification,
        onStderr: (line) => {
          lastStderr = line;
        },
      });
      if (closing || cleaned) {
        await liveConnection.close();
        cleanup();
        return;
      }
      connection = liveConnection;
      void liveConnection.exited.then((exitCode) => {
        if (connection !== liveConnection || closing || cleaned) return;
        connection = null;
        reportFatal(new Error(`Codex App Server arrêté de façon inattendue (code ${exitCode})`));
        cleanup();
      });
      const inheritedServerNames = await inheritedMcpServerNames(connection, options.cwd);
      if (closing) {
        await finishConnection();
        return;
      }
      const preparedSkills = await prepareSkills(connection, options);
      if (closing) {
        await finishConnection();
        return;
      }
      skillInputs = preparedSkills?.inputs ?? [];
      const servers = buildMcpServers(options, workerToken, workerTools, inheritedServerNames);
      const config = threadConfig(
        options,
        environment,
        servers,
        preparedAgents.config,
        preparedSkills?.config ?? null,
        preparedHook.config,
      );
      const modelProvider = hasExplicitCodexApiKey(environment) ? API_KEY_PROVIDER_ID : undefined;
      const response = options.resumeSessionId
        ? await connection.request(
            "thread/resume",
            {
              threadId: options.resumeSessionId,
              model: options.model,
              modelProvider,
              serviceTier: options.serviceTier ?? "default",
              cwd: options.cwd,
              approvalPolicy: "never",
              sandbox: options.readOnly ? "read-only" : "workspace-write",
              config,
              excludeTurns: true,
            },
            threadResponseSchema,
          )
        : await connection.request(
            "thread/start",
            {
              model: options.model,
              modelProvider,
              serviceTier: options.serviceTier ?? "default",
              cwd: options.cwd,
              approvalPolicy: "never",
              sandbox: options.readOnly ? "read-only" : "workspace-write",
              config,
              threadSource: "appServer",
            },
            threadResponseSchema,
          );
      if (closing) {
        await finishConnection();
        return;
      }
      threadId = response.thread.id;
      emit({ type: "init", sessionId: threadId, ...(response.serviceTier !== undefined ? { configuredServiceTier: response.serviceTier } : {}) });
      scheduleDispatch();
      await finishIfDrained();
    } catch (error) {
      if (closing || cleaned) {
        await finishConnection();
        return;
      }
      const message = error instanceof Error ? error.message : String(error);
      reportFatal(new Error(lastStderr ? `${message} — ${lastStderr}` : message));
      await finishConnection();
    }
  }

  if (workerToken) {
    mcpManager.register(workerToken, {
      allowedTools: workerTools,
      isActive: () => !cleaned,
      onToolCall: options.onToolCall,
    });
  }
  void bootstrap();

  return {
    ticketId: options.ticketId,
    send: (content, messageId) => {
      const message = {
        id: messageId ?? nanoid(16),
        content,
        reconcileBeforeSend: messageId !== undefined && options.resumeSessionId !== undefined,
      };
      if (closing || cleaned) {
        emitMessageStatus(message, "rejected", null);
        return message.id;
      }
      inbox.push(message);
      emitMessageStatus(message, "received", activeTurnId);
      scheduleDispatch();
      return message.id;
    },
    interrupt: async () => {
      rejectQueuedMessages();
      await waitForDispatchIdle();
      if (!connection || !threadId || !activeTurnId) return;
      blockedSteerTurnId = activeTurnId;
      await connection.request("turn/interrupt", { threadId, turnId: activeTurnId }, emptyResponseSchema);
    },
    dispose: () => {
      closing = true;
      rejectQueuedMessages();
      if (activeTurnId) emitTurnEnd(false, "interrupted", activeTurnId);
      if (connection?.dispose) connection.dispose();
      else void connection?.close().catch(() => undefined);
      connection = null;
      cleanup();
    },
    close: async () => {
      if (!closing) {
        closing = true;
        rejectQueuedMessages();
        await waitForDispatchIdle();
        if (activeTurnId) {
          closeTimer = setTimeout(() => void forceClose(), GRACEFUL_CLOSE_TIMEOUT_MS);
          await finishIfDrained();
        } else {
          await finishConnection();
        }
      }
      await closedPromise;
    },
  };
}

export function createCodexProvider(
  mcpManager: WorkerMcpManager,
  dependencies: CodexProviderDependencies = {},
): AgentProvider {
  return {
    name: "codex",
    createSession: (options) => createCodexAgentSession(options, mcpManager, dependencies),
  };
}
