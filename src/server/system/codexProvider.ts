/**
 * The Codex provider: drives a live `codex` run via `@openai/codex-sdk`'s `Thread.runStreamed()`.
 *
 * Differs from claudeProvider.ts in three structural ways:
 * - Turn-blocking, not true streaming-input: `runStreamed()` only resolves a full turn at a time (no
 *   documented way to inject input mid-turn). A `send()` arriving mid-turn just enqueues; it's joined
 *   into the next `runStreamed()` call instead of landing live.
 * - No in-process MCP: the worker tools are exposed by a spawned bridge subprocess
 *   (codexWorkerMcpServer.ts) that Codex itself launches per `mcp_servers.kanban`, forwarding each
 *   call back to this backend over one WS connection (see workerBridgeManager.ts).
 * - `interrupt()` IS real here (unlike the draft's original assumption): `runStreamed(input, {
 *   signal })` wires straight into the spawned `codex exec` subprocess's `child_process.spawn`, so
 *   aborting the turn's AbortController actually kills it.
 */

import { Codex } from "@openai/codex-sdk";
import type { Thread, ThreadEvent, ThreadOptions } from "@openai/codex-sdk";
import { fileURLToPath } from "node:url";
import { nanoid } from "nanoid";

import { CODEX_EFFORTS, DEFAULT_PORT, WS_PATH_WORKER_BRIDGE } from "../../shared/constants.ts";
import type { CodexEffort } from "../../shared/constants.ts";
import { isWorkerToolName } from "../../shared/protocol.ts";
import type { WorkerBridgeManager } from "../workerBridgeManager.ts";

import type { AgentProvider, AgentSessionEvent, AgentSessionHandle, AgentSessionOptions, AgentTurnUsage } from "./agentSession.ts";
import { resolveCodexBinaryOverride } from "./codexBinary.ts";

/** Graceful close lets the in-flight turn finish (so a done()/fail() tool call isn't dropped); force-abort past this. */
const GRACEFUL_CLOSE_TIMEOUT_MS = 60_000;

const BRIDGE_SCRIPT_PATH = fileURLToPath(new URL("./codexWorkerMcpServer.ts", import.meta.url));

function resolveBackendPort(): number {
  const parsed = Number(process.env.PORT ?? DEFAULT_PORT);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_PORT;
}

/** Narrow our free-form effort string to the Codex effort enum; null/unknown → model default (undefined). */
function toCodexEffort(effort: string | null): CodexEffort | undefined {
  if (effort === null) return undefined;
  return CODEX_EFFORTS.find((value) => value === effort);
}

/**
 * Prefix well-known Codex run failures with an actionable hint. A raw 401 or model-rejection lands
 * on the card verbatim otherwise, and neither says what the user must actually do (log in / change
 * the model in the settings). Conservative matching to avoid mislabeling unrelated errors.
 */
function describeCodexError(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes("401") || lower.includes("unauthorized") || lower.includes("not logged in") || lower.includes("token expired")) {
    return `Authentification Codex refusée — connecte-toi (\`codex login\`, abonnement ChatGPT actif requis) ou exporte CODEX_API_KEY. Détail : ${message}`;
  }
  if (lower.includes("model_not_found") || lower.includes("unsupported model") || lower.includes("model is deprecated") || (lower.includes("model") && lower.includes("does not exist"))) {
    return `Modèle Codex indisponible — choisis un autre modèle dans les réglages ou sur le ticket. Détail : ${message}`;
  }
  return message;
}

function createCodexAgentSession(opts: AgentSessionOptions, bridgeManager: WorkerBridgeManager): AgentSessionHandle {
  // A bare session (delegated implementation child) gets NO kanban MCP server at all: the worker
  // tools structurally don't exist for it, so no coordinator-side gating is ever needed.
  const bare = opts.disableWorkerTools === true;
  const token = nanoid(21);
  if (!bare) {
    bridgeManager.register(token, {
      onToolCall: async (name, args) => {
        if (!isWorkerToolName(name)) return { ok: false, result: `outil inconnu : ${name}` };
        return opts.onToolCall(name, args);
      },
    });
  }

  const bridgeUrl = `ws://127.0.0.1:${resolveBackendPort()}${WS_PATH_WORKER_BRIDGE}?token=${token}`;
  // Reasoning effort travels as a raw `-c model_reasoning_effort=…` override, NOT the SDK's typed
  // `modelReasoningEffort` thread option: the SDK type caps at "xhigh" while the CLI accepts the
  // 5.6 models' "max"/"ultra".
  const codexEffort = toCodexEffort(opts.effort);
  const codex = new Codex({
    codexPathOverride: resolveCodexBinaryOverride(),
    config: {
      ...(codexEffort ? { model_reasoning_effort: codexEffort } : {}),
      ...(bare
        ? {}
        : {
            mcp_servers: {
              kanban: {
                command: Bun.which("bun") ?? "bun",
                args: [BRIDGE_SCRIPT_PATH],
                env: { KANBAN_BRIDGE_TOKEN: token, KANBAN_BRIDGE_WS_URL: bridgeUrl },
                // `codex exec` runs headless: without auto-approval every worker-tool call is rejected
                // with "user cancelled MCP tool call" (there is no human to answer the prompt).
                default_tools_approval_mode: "approve",
              },
            },
          }),
    },
  });

  const threadOptions: ThreadOptions = {
    model: opts.model,
    sandboxMode: opts.readOnly ? "read-only" : "workspace-write",
    approvalPolicy: "never",
    networkAccessEnabled: true,
    // NOTE: web_search is rejected by the API under reasoning effort "minimal" — if "minimal" ever
    // returns to CODEX_EFFORTS, this must become conditional again.
    webSearchEnabled: true,
    workingDirectory: opts.cwd,
    // The backend fully controls cwd (a slot worktree it just created); without this, `codex exec`
    // refuses to start in a directory the user never marked trusted in ~/.codex and the run dies
    // with "Not inside a trusted directory".
    skipGitRepoCheck: true,
  };
  // Auto-reclaim resumes the persisted thread (~/.codex/sessions) so the relaunched session keeps
  // the dead run's context instead of rediscovering the worktree from scratch.
  const thread: Thread = opts.resumeSessionId
    ? codex.resumeThread(opts.resumeSessionId, threadOptions)
    : codex.startThread(threadOptions);

  // ---- queueing: a turn-blocking SDK reproduces send() by joining queued turns into the next call ----
  const inbox: string[] = [];
  let notify: (() => void) | null = null;
  let closed = false;
  let turnController: AbortController | null = null;
  let sessionId: string | null = null;

  function wake(): void {
    const resume = notify;
    notify = null;
    resume?.();
  }

  function enqueue(content: string): void {
    inbox.push(content);
    wake();
  }

  async function nextInput(): Promise<string | null> {
    for (;;) {
      if (inbox.length > 0) {
        const joined = inbox.join("\n\n");
        inbox.length = 0;
        return joined;
      }
      if (closed) return null;
      await new Promise<void>((resolve) => (notify = resolve));
    }
  }

  function dispatch(event: ThreadEvent, onEvent: (event: AgentSessionEvent) => void): void {
    switch (event.type) {
      case "thread.started":
        sessionId = event.thread_id;
        onEvent({ type: "init", sessionId: event.thread_id });
        return;
      case "item.completed": {
        const item = event.item;
        if (item.type === "agent_message") onEvent({ type: "assistant_text", text: item.text });
        else if (item.type === "reasoning") onEvent({ type: "thinking", text: item.text });
        else if (item.type === "command_execution") {
          onEvent({ type: "tool_use", name: "command_execution", input: { command: item.command, exitCode: item.exit_code ?? null } });
        } else if (item.type === "file_change") {
          onEvent({ type: "tool_use", name: "file_change", input: { changes: item.changes } });
        } else if (item.type === "mcp_tool_call") {
          onEvent({ type: "tool_use", name: `${item.server}__${item.tool}`, input: item.arguments });
        }
        return;
      }
      case "turn.completed": {
        const usage = event.usage;
        const usageByModel: Record<string, AgentTurnUsage> = {
          [opts.model]: {
            inputTokens: usage.input_tokens,
            outputTokens: usage.output_tokens,
            cacheReadTokens: usage.cached_input_tokens,
            // Codex reports no cache-write count and no per-turn cost; only cacheReadTokens has a real source.
            cacheCreationTokens: 0,
            costUsd: 0,
          },
        };
        onEvent({ type: "turn_end", ok: true, subtype: "success", sessionId: sessionId ?? "", usageByModel });
        return;
      }
      case "turn.failed":
        onEvent({ type: "turn_end", ok: false, subtype: "error", sessionId: sessionId ?? "", usageByModel: {} });
        onEvent({ type: "error", message: describeCodexError(event.error.message) });
        return;
      case "error":
        onEvent({ type: "error", message: describeCodexError(event.message) });
        return;
      default:
        return;
    }
  }

  async function pump(): Promise<void> {
    try {
      for (;;) {
        const input = await nextInput();
        if (input === null) return;
        turnController = new AbortController();
        try {
          const { events } = await thread.runStreamed(input, { signal: turnController.signal });
          for await (const event of events) dispatch(event, opts.onEvent);
        } catch (error) {
          if (turnController.signal.aborted) {
            // Expected: interrupt() (or close()'s backstop) killed the in-flight `codex exec` subprocess.
            opts.onEvent({ type: "turn_end", ok: false, subtype: "interrupted", sessionId: sessionId ?? "", usageByModel: {} });
          } else {
            opts.onEvent({ type: "error", message: describeCodexError(error instanceof Error ? error.message : String(error)) });
            // A failed spawn/turn must still close the turn: without a turn_end the coordinator's
            // Stop logic never fires and the card sits inert until the 45-min watchdog.
            opts.onEvent({ type: "turn_end", ok: false, subtype: "error", sessionId: sessionId ?? "", usageByModel: {} });
          }
        } finally {
          turnController = null;
        }
      }
    } finally {
      if (!bare) bridgeManager.unregister(token);
    }
  }

  void pump();

  return {
    ticketId: opts.ticketId,
    send: (content) => enqueue(content),
    interrupt: async () => {
      turnController?.abort();
    },
    close: async () => {
      // Graceful teardown: let an in-flight turn (e.g. the one running done()/fail()) finish so its
      // tool calls and final usage aren't dropped — only the backstop timer force-aborts a stuck turn.
      closed = true;
      wake();
      const timer = setTimeout(() => {
        turnController?.abort();
      }, GRACEFUL_CLOSE_TIMEOUT_MS);
      timer.unref();
    },
  };
}

/** Build the Codex provider, bound to the backend's worker-bridge registry. */
export function createCodexProvider(bridgeManager: WorkerBridgeManager): AgentProvider {
  return {
    name: "codex",
    createSession: (opts) => createCodexAgentSession(opts, bridgeManager),
  };
}
