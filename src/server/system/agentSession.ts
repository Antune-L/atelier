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
  costUsd: number;
}

/** Parsed events surfaced from the SDK message stream to the backend (UI streaming + lifecycle). */
export type AgentSessionEvent =
  | { type: "init"; sessionId: string }
  | { type: "assistant_text"; text: string }
  | { type: "thinking"; text: string }
  | { type: "tool_use"; name: string; input: unknown }
  | { type: "turn_end"; ok: boolean; subtype: string; usageByModel: Record<string, AgentTurnUsage> }
  | { type: "rate_limit"; status: string; resetsAt: number | null }
  | { type: "error"; message: string };

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
  model?: string;
}

export interface AgentSessionOptions {
  ticketId: string;
  slotId: number;
  cwd: string;
  /** Model alias for the session (SDK `model`). */
  model: string;
  /** Reasoning effort, or null for the model default. */
  effort: string | null;
  permissionMode: AgentPermissionMode;
  /**
   * Pre-approved permission rules (SDK `settings.permissions.allow`), e.g. `Bash(git commit:*)`. Under
   * `dontAsk` these auto-run and everything else is denied — the bash allowlist the old tmux sessions
   * enforced via `.claude/settings.json`.
   */
  permissionAllow?: string[];
  /**
   * Extra tools the agent may auto-use without a prompt. The in-process worker tools
   * (`mcp__kanban__*`) are always allowed; pass the built-in surface (Read/Edit/Bash/Agent…) here.
   */
  allowedTools?: string[];
  /** Tools to remove from the agent entirely (read-only sessions bar Edit/Write/Bash). */
  disallowedTools?: string[];
  /** Programmatic subagents forwarded to the SDK `agents` option. */
  agents?: Record<string, AgentSubagentDefinition>;
  /** Routes a worker tool call to the backend; the returned text is what the agent sees. */
  onToolCall(name: WorkerToolName, args: unknown): Promise<AgentSessionToolResult>;
  /** Receives parsed stream events (assistant text, tool uses, turn boundaries, errors). */
  onEvent(event: AgentSessionEvent): void;
}

/** A live handle to a running agent session. */
export interface AgentSessionHandle {
  readonly ticketId: string;
  /** Inject a user turn into the live session (contract / answer / nudge / user_comment). */
  send(content: string): void;
  /** Preempt the current turn (best-effort; surfaces as a non-success turn_end). */
  interrupt(): Promise<void>;
  /** Stop the session and release the subprocess. Idempotent. */
  close(): Promise<void>;
}
