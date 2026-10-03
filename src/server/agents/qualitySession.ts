import { z } from "zod";

import { QUALITY_DEFAULT_TIMEOUT_MS } from "../../shared/quality.ts";
import type { QualityValidationMode } from "../../shared/quality.ts";
import type { AgentSessionEvent, AgentSessionHandle, AgentSessionOptions } from "../system/agentSession.ts";
import { CODEX_VALIDATOR_READ_ALLOW } from "../system/codexCommandPolicy.ts";

import type { ResolvedExecution } from "./executionConfig.ts";

const QUALITY_SLOT_ID = -1;
const QUALITY_CLEANUP_TIMEOUT_MS = 5_000;
const QUALITY_OBSERVATION_LIMIT = 120_000;
const QUALITY_ERROR_LIMIT = 2_000;
const QUALITY_DIAGNOSTIC_TOOL_LIMIT = 64;
const QUALITY_DIAGNOSTIC_PATH_LIMIT = 500;
const QUALITY_DIAGNOSTIC_DENIAL_LIMIT = 16;
const QUALITY_DIAGNOSTIC_TOOL_NAME_LIMIT = 80;
const QUALITY_NATIVE_DENIED_TOOLS = ["Bash", "Edit", "Write", "NotebookEdit", "Agent", "Task", "WebFetch", "WebSearch"];
const toolTextSchema = z.array(z.object({ type: z.string(), text: z.string().optional() }));
const toolResponseSchema = z.object({ content: toolTextSchema });
const toolDiagnosticInputSchema = z.object({ path: z.string().optional(), file_path: z.string().optional(), glob: z.string().optional(), pattern: z.string().optional() });

interface QualityToolDiagnostic {
  toolCallId: string;
  tool: string;
  startedMs: number;
  completedMs: number | null;
  path: string | null;
  glob: string | null;
  patternLength: number | null;
  ok: boolean | null;
  outputLength: number | null;
}

interface QualityPermissionDiagnostic {
  provider: QualitySessionOptions["execution"]["provider"];
  source: "provider_permission_denial";
  toolName: string;
  commandShape: string | null;
  reason: string;
  reportedMs: number;
}

export interface QualityObservation {
  toolCallId: string;
  tool: string;
  output: string;
  ok: boolean;
}

export interface QualitySessionOptions {
  ticketId: string;
  runId: string;
  cwd: string;
  startSession(options: AgentSessionOptions): AgentSessionHandle;
  execution: Pick<ResolvedExecution, "provider" | "model" | "effort" | "serviceTier">;
  environment: Record<string, string | undefined>;
  signal: AbortSignal;
  onEvent?(event: AgentSessionEvent): void;
  timeoutMs?: number;
  mode: QualityValidationMode;
  prompt: string;
  outputSchema: Record<string, unknown>;
  allowedTools?: string[];
  disallowedTools?: string[];
  extraMcpServers?: AgentSessionOptions["extraMcpServers"];
}

export function qualityErrorMessage(message: string): string {
  return message
    .replace(/Bearer\s+[A-Za-z0-9._~+/-]+=*/gi, "Bearer [redacted]")
    .replace(/\bsk-[A-Za-z0-9_-]+\b/g, "[redacted]")
    .replace(/((?:api[_-]?key|access[_-]?token|refresh[_-]?token|client[_-]?secret|password|authorization)["']?\s*[:=]\s*["']?)[^"',\s}]+/gi, "$1[redacted]")
    .replace(/(https?:\/\/)[^/\s:@]+:[^/\s@]+@/gi, "$1[redacted]@")
    .slice(0, QUALITY_ERROR_LIMIT);
}

function toolOutputText(output: unknown): string {
  if (typeof output === "string") return output.slice(0, QUALITY_OBSERVATION_LIMIT);
  const response = toolResponseSchema.safeParse(output);
  const blocks = response.success ? response.data.content : toolTextSchema.safeParse(output).data;
  return (blocks ?? []).flatMap((block) => block.text ? [block.text] : []).join("\n").slice(0, QUALITY_OBSERVATION_LIMIT);
}

function deniedCommandShape(command: string | null): string | null {
  if (command === null) return null;
  const knownCommands = new Set(["rg", "grep", "sed", "find", "cat", "ls", "pwd", "head", "tail", "wc", "git", "bun", "node", "python", "python3", "sh", "bash", "zsh", "npx", "npm", "curl", "wget", "echo", "printf", "cp", "mv", "rm", "chmod", "touch", "awk", "sort", "uniq", "cut", "tee"]);
  const firstWord = command.trim().split(/\s+/, 1)[0] ?? "";
  const executable = firstWord.split("/").at(-1) ?? "";
  if (!knownCommands.has(executable)) return "[unrecognized command; arguments omitted]";
  const knownOptions = new Set(["--files", "--glob", "--hidden", "--no-ignore", "--follow", "--pre", "--file", "--files0-from", "--line-number", "--ignore-case", "-n", "-i", "-g", "-f", "-F", "-L", "-c"]);
  const options = [...new Set(command.match(/--?[A-Za-z]+(?:-[A-Za-z]+)*/g) ?? [])].filter((option) => knownOptions.has(option));
  return [executable, ...options, "[arguments omitted]"].join(" ");
}

export async function runQualitySession(options: QualitySessionOptions) {
  if (options.signal.aborted) throw new Error("Validation cancelled before session startup");
  const startedAt = Date.now();
  const observations: QualityObservation[] = [];
  const pendingTools = new Map<string, string>();
  const toolDiagnostics: QualityToolDiagnostic[] = [];
  const permissionDenials: QualityPermissionDiagnostic[] = [];
  let permissionDenialCount = 0;
  const eventCounts: Partial<Record<AgentSessionEvent["type"], number>> = {};
  let lastEventType: AgentSessionEvent["type"] | null = null;
  let lastEventMs = 0;
  let sessionId: string | null = null;
  let handle: AgentSessionHandle | null = null;
  let finish: ((value: AgentSessionEvent) => void) | null = null;
  const completion = new Promise<AgentSessionEvent>((resolve) => { finish = resolve; });
  let settled = false;
  let timedOut = false;
  let cancelled = false;
  const settle = (event: AgentSessionEvent): void => {
    if (settled) return;
    settled = true;
    finish?.(event);
  };
  const onAbort = (): void => {
    cancelled = true;
    handle?.dispose?.();
    settle({ type: "error", message: "Validation cancelled" });
  };
  options.signal.addEventListener("abort", onAbort, { once: true });
  const timer = setTimeout(() => {
    timedOut = true;
    handle?.dispose?.();
    settle({ type: "error", message: "Behavioral validation timed out" });
  }, options.timeoutMs ?? QUALITY_DEFAULT_TIMEOUT_MS);
  let completed: AgentSessionEvent;
  let cleanupFailed = false;
  try {
    handle = options.startSession({
      ticketId: `${options.ticketId}-quality-${options.runId}`,
      slotId: QUALITY_SLOT_ID,
      cwd: options.cwd,
      environment: { ...options.environment, RIPGREP_CONFIG_PATH: undefined },
      provider: options.execution.provider,
      model: options.execution.model,
      effort: options.execution.effort,
      serviceTier: options.execution.serviceTier,
      role: "quality-validator",
      permissionMode: "dontAsk",
      readOnly: true,
      permissionAllow: options.mode === "repository" ? CODEX_VALIDATOR_READ_ALLOW : [],
      allowedTools: ["Read", "Glob", "Grep", ...(options.allowedTools ?? [])],
      disallowedTools: [...QUALITY_NATIVE_DENIED_TOOLS, ...(options.disallowedTools ?? [])],
      skills: [],
      disableWorkerTools: true,
      extraMcpServers: options.extraMcpServers,
      outputSchema: options.outputSchema,
      onToolCall: async () => ({ ok: false, result: "Pipeline tools are unavailable during behavioral validation" }),
      onEvent: (event) => {
        eventCounts[event.type] = (eventCounts[event.type] ?? 0) + 1;
        lastEventType = event.type;
        lastEventMs = Date.now() - startedAt;
        if (event.type === "progress" && event.permissionDenial) {
          permissionDenialCount += 1;
          if (permissionDenials.length < QUALITY_DIAGNOSTIC_DENIAL_LIMIT) {
            const denial = event.permissionDenial;
            permissionDenials.push({
              provider: options.execution.provider, source: "provider_permission_denial",
              toolName: qualityErrorMessage(denial.toolName).slice(0, QUALITY_DIAGNOSTIC_TOOL_NAME_LIMIT),
              commandShape: deniedCommandShape(denial.command),
              reason: qualityErrorMessage(denial.reason).slice(0, QUALITY_DIAGNOSTIC_PATH_LIMIT), reportedMs: lastEventMs,
            });
          }
        }
        options.onEvent?.(event);
        if (event.type === "init") sessionId = event.sessionId;
        if (event.type === "tool_use" && event.toolCallId) {
          pendingTools.set(event.toolCallId, event.name);
          if (toolDiagnostics.length < QUALITY_DIAGNOSTIC_TOOL_LIMIT) {
            const input = toolDiagnosticInputSchema.safeParse(event.input);
            const path = input.success ? input.data.file_path ?? input.data.path : undefined;
            const glob = input.success ? input.data.glob : undefined;
            const pattern = input.success ? input.data.pattern : undefined;
            toolDiagnostics.push({
              toolCallId: event.toolCallId, tool: event.name, startedMs: lastEventMs, completedMs: null,
              path: typeof path === "string" ? qualityErrorMessage(path).slice(0, QUALITY_DIAGNOSTIC_PATH_LIMIT) : null,
              glob: typeof glob === "string" ? qualityErrorMessage(glob).slice(0, QUALITY_DIAGNOSTIC_PATH_LIMIT) : null,
              patternLength: typeof pattern === "string" ? pattern.length : null, ok: null, outputLength: null,
            });
          }
        }
        if (event.type === "tool_result") {
          const tool = pendingTools.get(event.toolCallId);
          if (tool) {
            const output = toolOutputText(event.output);
            observations.push({ toolCallId: event.toolCallId, tool, output, ok: event.ok });
            const diagnostic = toolDiagnostics.find((entry) => entry.toolCallId === event.toolCallId);
            if (diagnostic) {
              diagnostic.completedMs = lastEventMs;
              diagnostic.ok = event.ok;
              diagnostic.outputLength = output.length;
            }
            pendingTools.delete(event.toolCallId);
          }
        }
        if (event.type === "turn_end" || event.type === "error") settle(event);
      },
    });
    if (options.signal.aborted) onAbort();
    if (!settled) handle.send(options.prompt);
    completed = await completion;
  } finally {
    clearTimeout(timer);
    options.signal.removeEventListener("abort", onAbort);
    let cleanupTimer: ReturnType<typeof setTimeout> | undefined;
    try {
      await Promise.race([
        handle?.close(),
        new Promise<never>((_, reject) => {
          cleanupTimer = setTimeout(() => reject(new Error("Validator session cleanup timed out")), QUALITY_CLEANUP_TIMEOUT_MS);
        }),
      ]);
    } catch {
      cleanupFailed = true;
      handle?.dispose?.();
    } finally {
      if (cleanupTimer) clearTimeout(cleanupTimer);
    }
  }
  if (!sessionId) {
    if (completed.type === "error") throw new Error(qualityErrorMessage(completed.message));
    throw new Error("Validator session did not initialize");
  }
  return { completed, sessionId, observations, timedOut, cancelled, cleanupFailed, durationMs: Date.now() - startedAt,
    diagnostics: { eventCounts, lastEventType, lastEventMs, tools: toolDiagnostics, permissionDenialCount, permissionDenials },
  };
}
