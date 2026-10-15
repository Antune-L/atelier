import { createHash, randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { z } from "zod";

import { QUALITY_DEFAULT_TIMEOUT_MS } from "../../shared/quality.ts";
import type { QualityPermissionBlockReason, QualityValidationMode } from "../../shared/quality.ts";
import type { AgentExecutionGuard, AgentSessionEvent, AgentSessionHandle, AgentSessionOptions } from "../system/agentSession.ts";
import { CODEX_VALIDATOR_READ_ALLOW } from "../system/codexCommandPolicy.ts";
import { redactSecrets } from "../system/secretRedaction.ts";

import type { QualityJournal } from "./qualityJournal.ts";
import type { ResolvedExecution } from "./executionConfig.ts";

const QUALITY_SLOT_ID = -1;
const QUALITY_PRIVATE_FILE_MODE = 0o600;
const QUALITY_PRIVATE_DIRECTORY_MODE = 0o700;
export const QUALITY_NATIVE_CLEANUP_DIRECTORY = "native-cleanup-obligations";
const QUALITY_CLEANUP_TIMEOUT_MS = 5_000;
const QUALITY_OBSERVATION_LIMIT = 120_000;
const QUALITY_ERROR_LIMIT = 2_000;
const QUALITY_DIAGNOSTIC_TOOL_LIMIT = 64;
const QUALITY_DIAGNOSTIC_PATH_LIMIT = 500;
const QUALITY_DIAGNOSTIC_DENIAL_LIMIT = 16;
const QUALITY_DIAGNOSTIC_TOOL_NAME_LIMIT = 80;
const QUALITY_DENIAL_SIGNATURE_LENGTH = 16;
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
  blockReason: QualityPermissionBlockReason | null;
  signature: string;
  workspaceAvailable: boolean;
  reportedMs: number;
}

export interface QualityObservation {
  toolCallId: string;
  actionId?: string | null;
  truncated?: boolean;
  redactedOutput?: string;
  tool: string;
  input: unknown;
  output: string;
  ok: boolean;
}

export interface QualitySessionOptions {
  ticketId: string;
  runId: string;
  cwd: string;
  startSession(options: AgentSessionOptions): AgentSessionHandle;
  executionGuard?: AgentExecutionGuard;
  onClosureUnknown?(): void;
  execution: Pick<ResolvedExecution, "provider" | "model" | "effort" | "serviceTier">;
  environment: Record<string, string | undefined>;
  signal: AbortSignal;
  onEvent?(event: AgentSessionEvent): void;
  timeoutMs?: number;
  deadlineAt?: number;
  journal?: QualityJournal;
  artifactDirectory?: string;
  phase?: string;
  mode: QualityValidationMode;
  prompt: string;
  outputSchema: Record<string, unknown>;
  allowedTools?: string[];
  disallowedTools?: string[];
  extraMcpServers?: AgentSessionOptions["extraMcpServers"];
}

export function qualityErrorMessage(message: string): string {
  return redactSecrets(message).slice(0, QUALITY_ERROR_LIMIT);
}

function toolOutputText(output: unknown): string {
  if (typeof output === "string") return output;
  const response = toolResponseSchema.safeParse(output);
  const blocks = response.success ? response.data.content : toolTextSchema.safeParse(output).data;
  return (blocks ?? []).flatMap((block) => block.text ? [block.text] : []).join("\n");
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
  options.journal?.assertHealthy();
  if (options.deadlineAt !== undefined && Date.now() >= options.deadlineAt) throw new Error("Validation deadline expired");
  if (options.signal.aborted) throw new Error("Validation cancelled before session startup");
  options.executionGuard?.beforeStart();
  const startedAt = Date.now();
  const obligationId = randomUUID();
  const artifactDirectory = options.artifactDirectory ?? join(tmpdir(), "kanban-quality-artifacts", options.runId);
  const obligationDirectory = join(artifactDirectory, QUALITY_NATIVE_CLEANUP_DIRECTORY);
  await mkdir(obligationDirectory, { recursive: true, mode: QUALITY_PRIVATE_DIRECTORY_MODE });
  const obligationPath = join(obligationDirectory, `${obligationId}.json`);
  await writeFile(obligationPath, JSON.stringify({ version: 1, obligationId, requestId: options.journal?.requestId ?? null, ticketId: options.ticketId, runId: options.runId, provider: options.execution.provider, source: options.phase ?? "validating", closure: "unconfirmed" }), { mode: QUALITY_PRIVATE_FILE_MODE });
  const observations: QualityObservation[] = [];
  const pendingTools = new Map<string, Pick<QualityObservation, "tool" | "input" | "actionId">>();
  const nativeActions = new Map<string, string | null>();
  const completedNativeActions = new Set<string>();
  const observedDenials = new Set<string>();
  const phase = options.phase ?? "validating";
  const secrets = Object.entries(options.environment).flatMap(([key, value]) => /secret|password|token|authorization|api.?key/i.test(key) && value ? [value] : []);
  const mask = (value: string): string => options.journal?.redact(redactSecrets(value, secrets)) ?? redactSecrets(value, secrets);
  let journalFailure: Error | null = null;
  const toolDiagnostics: QualityToolDiagnostic[] = [];
  const permissionDenials: QualityPermissionDiagnostic[] = [];
  let permissionDenialCount = 0;
  const eventCounts: Partial<Record<AgentSessionEvent["type"], number>> = {};
  let lastEventType: AgentSessionEvent["type"] | null = null;
  let lastEventMs = 0;
  let sessionId: string | null = null;
  let handle: AgentSessionHandle | null = null;
  const dispose = (): void => {
    try { handle?.dispose?.(); } catch { return; }
  };
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
    dispose();
    settle({ type: "error", message: "Validation cancelled" });
  };
  options.signal.addEventListener("abort", onAbort, { once: true });
  const timer = setTimeout(() => {
    timedOut = true;
    dispose();
    settle({ type: "error", message: "Behavioral validation timed out" });
  }, options.deadlineAt === undefined ? options.timeoutMs ?? QUALITY_DEFAULT_TIMEOUT_MS : Math.max(0, Math.min(options.timeoutMs ?? QUALITY_DEFAULT_TIMEOUT_MS, options.deadlineAt - Date.now())));
  let completed: AgentSessionEvent;
  let cleanupFailed = false;
  let sessionActionId: string | null = null;
  let startupAttempted = false;
  let closureConfirmed = false;
  try {
    sessionActionId = options.journal?.start({ kind: "service", phase, provider: options.execution.provider, summary: "Start validation provider session" }) ?? null;
    options.journal?.assertHealthy();
    if (options.signal.aborted || options.deadlineAt !== undefined && Date.now() >= options.deadlineAt) throw new Error("Validation stopped before provider startup");
    startupAttempted = true;
    handle = options.startSession({
      ticketId: `${options.ticketId}-quality-${options.runId}`,
      executionGuard: options.executionGuard,
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
        if (settled) return;
        try {
          options.journal?.assertHealthy();
          eventCounts[event.type] = (eventCounts[event.type] ?? 0) + 1;
          lastEventType = event.type;
          lastEventMs = Date.now() - startedAt;
          if (event.type === "progress" && event.permissionDenial) {
            permissionDenialCount += 1;
            if (permissionDenials.length < QUALITY_DIAGNOSTIC_DENIAL_LIMIT) {
              const denial = event.permissionDenial;
              const toolName = denial.toolName.slice(0, QUALITY_DIAGNOSTIC_TOOL_NAME_LIMIT);
              const commandShape = deniedCommandShape(denial.command);
              permissionDenials.push({
                provider: options.execution.provider, source: "provider_permission_denial",
                toolName,
                commandShape,
                reason: qualityErrorMessage(mask(denial.reason)).slice(0, QUALITY_DIAGNOSTIC_PATH_LIMIT), reportedMs: lastEventMs,
                blockReason: denial.blockReason,
                signature: createHash("sha256").update(JSON.stringify([options.execution.provider, toolName, denial.blockReason, commandShape])).digest("hex").slice(0, QUALITY_DENIAL_SIGNATURE_LENGTH),
                workspaceAvailable: existsSync(options.cwd),
              });
            }
          }
          if (event.type === "progress" && event.permissionDenial) {
            const denial = event.permissionDenial;
            const key = denial.nativeId ? `${event.sourceId ?? "main"}:${denial.nativeId}` : null;
            if (key === null || !observedDenials.has(key)) {
              const actionId = key === null ? null : nativeActions.get(key);
              options.journal?.observe({ kind: "denial", status: "denied", phase, sessionId, provider: options.execution.provider, nativeId: denial.nativeId ?? null, sourceId: event.sourceId ?? null, toolName: denial.toolName, actionIds: actionId ? [actionId] : [], summary: `Observed permission denial: ${denial.blockReason ?? "unknown"}` });
              if (key !== null) observedDenials.add(key);
            }
          }
          if (event.type === "tool_use" && /browser_(?:type|fill_form|select_option)$/.test(event.name)) {
            const input = z.object({ text: z.string().optional(), value: z.string().optional(), fields: z.array(z.object({ value: z.string() })).optional() }).safeParse(event.input);
            if (input.success) for (const value of [input.data.text, input.data.value, ...(input.data.fields ?? []).map((field) => field.value)]) if (value) secrets.push(value);
          }
          options.journal?.assertHealthy();
          options.onEvent?.(event);
          if (event.type === "init") sessionId = event.sessionId;
          if (event.type === "tool_use" && !event.toolCallId) options.journal?.observe({ kind: "tool", status: "unknown", phase, sessionId, provider: options.execution.provider, toolName: event.name, sourceId: event.sourceId ?? null, summary: "Native tool observed without a correlation identifier" });
          if (event.type === "tool_use" && event.toolCallId) {
            const key = `${event.sourceId ?? "main"}:${event.toolCallId}`;
            if (nativeActions.has(key)) return;
            const actionId = options.journal?.start({ kind: "tool", phase, nativeId: event.toolCallId, sourceId: event.sourceId ?? null, sessionId, provider: options.execution.provider, toolName: event.name, summary: "Native tool call observed; provider event timing does not guarantee capture before execution" }) ?? null;
            options.journal?.assertHealthy();
            nativeActions.set(key, actionId);
            pendingTools.set(key, { tool: event.name, input: event.input, actionId });
            if (toolDiagnostics.length < QUALITY_DIAGNOSTIC_TOOL_LIMIT) {
              const input = toolDiagnosticInputSchema.safeParse(event.input);
              const path = input.success ? input.data.file_path ?? input.data.path : undefined;
              const glob = input.success ? input.data.glob : undefined;
              const pattern = input.success ? input.data.pattern : undefined;
              toolDiagnostics.push({
                toolCallId: event.toolCallId, tool: event.name, startedMs: lastEventMs, completedMs: null,
                path: typeof path === "string" ? qualityErrorMessage(mask(path)).slice(0, QUALITY_DIAGNOSTIC_PATH_LIMIT) : null,
                glob: typeof glob === "string" ? qualityErrorMessage(mask(glob)).slice(0, QUALITY_DIAGNOSTIC_PATH_LIMIT) : null,
                patternLength: typeof pattern === "string" ? pattern.length : null, ok: null, outputLength: null,
              });
            }
          }
          if (event.type === "tool_result") {
            const key = `${event.sourceId ?? "main"}:${event.toolCallId}`;
            if (completedNativeActions.has(key)) return;
            completedNativeActions.add(key);
            const pending = pendingTools.get(key);
            const rawOutput = pending ? toolOutputText(event.output) : "";
            if (pending?.actionId) options.journal?.finish(pending.actionId, { status: event.ok ? "succeeded" : "failed", sessionId, truncated: rawOutput.length > QUALITY_OBSERVATION_LIMIT, summary: "Native tool result observed" });
            else if (!nativeActions.has(key)) options.journal?.observe({ kind: "observation", phase, nativeId: event.toolCallId, sourceId: event.sourceId ?? null, sessionId, provider: options.execution.provider, status: "unknown", summary: "Native result observed without a matching start" });
            if (pending) {
              let output = rawOutput.slice(0, QUALITY_OBSERVATION_LIMIT);
              if (rawOutput.length > QUALITY_OBSERVATION_LIMIT) output = output.slice(0, Math.max(0, output.lastIndexOf("\n")));
              const redactedOutput = mask(rawOutput).slice(0, QUALITY_OBSERVATION_LIMIT);
              observations.push({ toolCallId: event.toolCallId, ...pending, output, redactedOutput, truncated: rawOutput.length > QUALITY_OBSERVATION_LIMIT, ok: event.ok });
              const diagnostic = toolDiagnostics.find((entry) => entry.toolCallId === event.toolCallId);
              if (diagnostic) {
                diagnostic.completedMs = lastEventMs;
                diagnostic.ok = event.ok;
                diagnostic.outputLength = output.length;
              }
              pendingTools.delete(key);
            }
          }
          options.journal?.assertHealthy();
          if (event.type === "turn_end" || event.type === "error") settle(event);
        } catch (error) {
          journalFailure = error instanceof Error ? error : new Error("Quality history capture failed");
          dispose();
          settle({ type: "error", message: "Quality history capture failed; validation interrupted" });
        }
      },
    });
    if (options.signal.aborted) onAbort();
    if (settled) dispose();
    else handle.send(options.prompt);
    completed = await completion;
  } finally {
    clearTimeout(timer);
    options.signal.removeEventListener("abort", onAbort);
    let cleanupTimer: ReturnType<typeof setTimeout> | undefined;
    try {
      await Promise.race([
        handle?.close(),
        new Promise<never>((_, reject) => {
          cleanupTimer = setTimeout(() => reject(new Error("Validator session cleanup timed out")), options.deadlineAt === undefined ? QUALITY_CLEANUP_TIMEOUT_MS : Math.max(0, Math.min(QUALITY_CLEANUP_TIMEOUT_MS, options.deadlineAt - Date.now())));
        }),
      ]);
      closureConfirmed = handle !== null || !startupAttempted;
      if (!closureConfirmed) {
        cleanupFailed = true;
        try { options.onClosureUnknown?.(); } catch { cleanupFailed = true; }
      }
    } catch {
      cleanupFailed = true;
      dispose();
      try { options.onClosureUnknown?.(); } catch { cleanupFailed = true; }
    } finally {
      if (cleanupTimer) clearTimeout(cleanupTimer);
      if (closureConfirmed) await rm(obligationPath, { force: true });
      if (sessionActionId) {
        let status: "failed" | "unknown" | "succeeded" = "succeeded";
        let summary = "Provider session closed";
        if (handle === null) {
          status = "failed";
          summary = "Provider session startup failed";
        } else if (cleanupFailed) {
          status = "unknown";
          summary = "Provider session closure unconfirmed";
        }
        options.journal?.finish(sessionActionId, { status, sessionId, summary });
      }
    }
  }
  if (journalFailure) throw journalFailure;
  options.journal?.assertHealthy();
  for (const pending of pendingTools.values()) {
    if (pending.actionId) options.journal?.finish(pending.actionId, { status: "unknown", sessionId, summary: "Session ended without an observed tool result" });
  }
  options.journal?.assertHealthy();
  if (!sessionId) {
    if (completed.type === "error") throw new Error(qualityErrorMessage(completed.message));
    throw new Error("Validator session did not initialize");
  }
  for (const diagnostic of toolDiagnostics) {
    if (diagnostic.path) diagnostic.path = mask(diagnostic.path);
    if (diagnostic.glob) diagnostic.glob = mask(diagnostic.glob);
  }
  for (const denial of permissionDenials) denial.reason = mask(denial.reason);
  return { completed, sessionId, observations, redact: mask, timedOut, cancelled, cleanupFailed, durationMs: Date.now() - startedAt,
    diagnostics: { eventCounts, lastEventType, lastEventMs, tools: toolDiagnostics, permissionDenialCount, permissionDenials },
  };
}
