/**
 * The agent-session boundary — the SDK-driven replacement for the tmux+MCP-channel transport.
 *
 * A session is a long-lived `claude` run (Agent SDK `query()` in streaming-input mode). The backend
 * injects user turns (contract / answer / nudge / user_comment) via `send()`, routes the agent's
 * worker-tool calls back through `onToolCall`, and observes the run through parsed `AgentSessionEvent`s.
 *
 * Kept transport-agnostic on purpose: the Real adapter implements it with the SDK, the Fake adapter
 * with a synthetic no-op handle, so the server still boots and runs end-to-end in dry-run.
 */

import type { Implementer } from "../../shared/constants.ts";
import type { WorkerToolName } from "../../shared/protocol.ts";

/** What a worker tool call resolves to — mirrors the coordinator's tool-call return shape. */
export interface AgentSessionToolResult {
  ok: boolean;
  result: string;
}

/** Per-model token usage for one turn, lifted from the SDK `result` message (`modelUsage`). */
export interface AgentTurnUsage {
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheCreationTokens: number;
  /** Provider-reported cost, or null when the provider does not expose one. */
  costUsd: number | null;
}

export type AgentSessionRole =
  | "orchestrator"
  | "implementer"
  | "triage"
  | "feasibility"
  | "split"
  | "scout"
  | "reviewer"
  | "one-shot";

export interface AgentStreamBlock {
  itemId: string;
  mode: "delta" | "snapshot";
}

/** Parsed events surfaced from the SDK message stream to the backend (UI streaming + lifecycle). */
export type AgentSessionEvent = (
  | { type: "init"; sessionId: string; configuredServiceTier?: string | null }
  | { type: "assistant_text"; text: string; stream?: AgentStreamBlock }
  | { type: "thinking"; text: string; stream?: AgentStreamBlock }
  | { type: "tool_use"; name: string; input: unknown }
  | { type: "progress"; kind: "command" | "file_change" | "mcp" | "plan" | "subagent"; message: string; stream?: AgentStreamBlock }
  | {
      type: "message_status";
      messageId: string;
      status: "received" | "accepted" | "rejected";
      turnId: string | null;
    }
  | {
      type: "turn_end";
      ok: boolean;
      subtype: string;
      sessionId: string;
      usageByModel: Record<string, AgentTurnUsage>;
      turnId?: string | null;
    }
  | { type: "rate_limit"; status: string; resetsAt: number | null }
  | { type: "error"; message: string }
) & { sourceId?: string };

/**
 * SDK permission modes the backend uses (subset of the SDK's full set). `dontAsk` mirrors the old
 * `--permission-mode auto`: auto-run pre-approved tools, silently deny everything else (no human to prompt).
 */
export type AgentPermissionMode = "default" | "acceptEdits" | "bypassPermissions" | "dontAsk";

/** A programmatic subagent definition forwarded to the SDK `agents` option (read-only scouts, etc.). */
export interface AgentSubagentDefinition {
  description: string;
  prompt: string;
  tools?: string[];
  disallowedTools?: string[];
  model?: string;
  effort?: string;
  serviceTier?: "default" | "fast";
  readOnly?: boolean;
  role?: AgentSessionRole;
}

/** Stdio-spawned MCP server attached to one session (e.g. the Playwright browser for verify tickets). */
export interface StdioMcpServerDefinition {
  type?: "stdio";
  command: string;
  args?: string[];
  env?: Record<string, string>;
  enabledTools?: string[];
  disabledTools?: string[];
}

/** Streamable-HTTP MCP server attached to one session. Secret values come from the process env. */
export interface HttpMcpServerDefinition {
  type: "http";
  url: string;
  bearerTokenEnvVar?: string;
  envHttpHeaders?: Record<string, string>;
  enabledTools?: string[];
  disabledTools?: string[];
}

export type AgentMcpServerDefinition = StdioMcpServerDefinition | HttpMcpServerDefinition;

export interface AgentSessionOptions {
  ticketId: string;
  slotId: number;
  cwd: string;
  /** Which provider drives this session. Triage/split/feasibility sessions are always "claude". */
  provider: Extract<Implementer, "claude" | "codex">;
  /** Runtime role used to scope tools and credentials. */
  role?: AgentSessionRole;
  /** Monotonic owner generation. SessionHub ignores callbacks from stale generations. */
  generation?: number;
  /** Model alias for the session (SDK `model`). */
  model: string;
  /** Reasoning effort, or null for the model default. */
  effort: string | null;
  /** Explicit Codex processing tier; `default` prevents inherited machine FAST settings. */
  serviceTier?: "default" | "fast";
  permissionMode: AgentPermissionMode;
  /**
   * Structurally read-only session. Codex maps it to its `read-only` sandbox (any write is blocked
   * by the sandbox itself); Claude sessions enforce read-only via allowed/disallowed tools instead.
   */
  readOnly?: boolean;
  /**
   * Resume the provider-side conversation with this id instead of starting fresh (auto-reclaim).
   * Codex maps it to `resumeThread` (threads persist under ~/.codex/sessions); Claude ignores it —
   * its relaunch semantics deliberately start a fresh transcript.
   */
  resumeSessionId?: string;
  /**
   * Bare session: expose NO kanban worker tools to the agent. Used by the delegated Codex
   * implementation child, which must only write code — the parent session keeps the protocol.
   * Honored by codexProvider (skips the MCP bridge entirely); Claude sessions always carry the
   * in-process worker tools today.
   */
  disableWorkerTools?: boolean;
  /**
   * Pre-approved permission rules (SDK `settings.permissions.allow`), e.g. `Bash(git commit:*)`. Under
   * `dontAsk` these auto-run and everything else is denied — the bash allowlist the old tmux sessions
   * enforced via `.claude/settings.json`.
   */
  permissionAllow?: string[];
  /**
   * Denied permission rules (SDK `settings.permissions.deny`), e.g. `Agent(general-purpose)`. Used by
   * the read-only feasibility/deep-triage sessions to forbid spawning a recursing built-in sub-agent
   * so the inline scouts are the only fan-out type — deny-first, enforced by Claude Code itself.
   */
  permissionDeny?: string[];
  /**
   * Extra tools the agent may auto-use without a prompt. The in-process worker tools
   * (`mcp__kanban__*`) are always allowed; pass the built-in surface (Read/Edit/Bash/Agent…) here.
   */
  allowedTools?: string[];
  /** Tools to remove from the agent entirely (read-only sessions bar Edit/Write/Bash). */
  disallowedTools?: string[];
  /** Programmatic subagents forwarded to the SDK `agents` option. */
  agents?: Record<string, AgentSubagentDefinition>;
  /**
   * Additional MCP servers merged into the session alongside the worker server.
   */
  extraMcpServers?: Record<string, AgentMcpServerDefinition>;
  /**
   * Skills to enable for the session (SDK `skills` filter). Restricts which discovered skills load into
   * context — `[]` loads none, omitted loads every discovered skill. Discovery itself is driven by the
   * provider's `settingSources` (the host `~/.claude/skills` via the `user` source).
   */
  skills?: string[];
  /** Routes a worker tool call to the backend; the returned text is what the agent sees. */
  onToolCall(name: WorkerToolName, args: unknown): Promise<AgentSessionToolResult>;
  /** Receives parsed stream events (assistant text, tool uses, turn boundaries, errors). */
  onEvent(event: AgentSessionEvent): void;
}

/** A live handle to a running agent session. */
export interface AgentSessionHandle {
  readonly ticketId: string;
  /** Inject a user turn into the live session (contract / answer / nudge / user_comment). */
  /** Queue one identified user message and return its client id. */
  send(content: string, messageId?: string): string;
  /** Preempt the current turn (best-effort; surfaces as a non-success turn_end). */
  interrupt(): Promise<void>;
  /** Stop the session and release the subprocess. Idempotent. */
  close(): Promise<void>;
  /** Immediately revoke tools and terminate the provider when graceful cleanup exceeds its deadline. */
  dispose?(): void;
}

/**
 * The provider seam: an LLM-agent backend that materializes an {@link AgentSessionHandle} from the
 * transport-agnostic {@link AgentSessionOptions}. The Real adapter holds a registry of these, keyed by
 * `AgentSessionOptions.provider`: `claudeProvider` (Agent SDK) and `codexProvider` (Codex SDK). Each
 * implements the same contract so the backend above this seam stays unchanged.
 */
export interface AgentProvider {
  readonly name: string;
  createSession(opts: AgentSessionOptions): AgentSessionHandle;
}
