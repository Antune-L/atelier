import { randomUUID } from "node:crypto";

import { z } from "zod";

import { AUDIT_SESSION_TIMEOUT_MS } from "../../../shared/audit.ts";
import { getErrorMessage } from "../../../shared/errors.ts";
import { createLogger } from "../../logger.ts";
import type { AgentSessionEvent, AgentSessionHandle, AgentTurnUsage } from "../../system/agentSession.ts";

import { mergeAgentUsageByModel } from "../sessionHub.ts";

import type { AuditEngineDeps, AuditExecution } from "./engine.ts";

const log = createLogger("audit-session");

const AUDIT_SLOT_ID = -6;
const AUDIT_CLOSE_TIMEOUT_MS = 60_000;
const AUDIT_ERROR_SETTLE_MS = 10_000;
const AUDIT_ALLOWED_TOOLS: Record<AuditExecution["provider"], string[]> = {
  claude: ["Read", "Glob", "Grep"],
  codex: ["exec_command"],
};
const AUDIT_DISALLOWED_TOOLS = ["Bash", "Edit", "Write", "NotebookEdit", "Task", "Agent", "WebFetch", "WebSearch"];
const NO_TOOL_RESULT = { ok: false, result: "Session d'audit : aucun outil de pipeline n'est disponible." };
const INTERRUPTED_ERROR = "audit interrompu";

export type AuditSessionRelease = () => void;

export class AuditSessionGate {
  private used = 0;
  private readonly waiters: Array<() => void> = [];

  constructor(private readonly capacity: number) {}

  tryAcquire(): AuditSessionRelease | null {
    if (this.used >= this.capacity) return null;
    this.used += 1;
    return this.releaser();
  }

  acquire(signal: AbortSignal): Promise<AuditSessionRelease | null> {
    const immediate = this.tryAcquire();
    if (immediate !== null) return Promise.resolve(immediate);
    if (signal.aborted) return Promise.resolve(null);
    return new Promise((resolve) => {
      const grant = (): void => {
        signal.removeEventListener("abort", cancel);
        resolve(this.releaser());
      };
      const cancel = (): void => {
        const index = this.waiters.indexOf(grant);
        if (index !== -1) this.waiters.splice(index, 1);
        resolve(null);
      };
      this.waiters.push(grant);
      signal.addEventListener("abort", cancel, { once: true });
    });
  }

  private releaser(): AuditSessionRelease {
    let released = false;
    return () => {
      if (released) return;
      released = true;
      const next = this.waiters.shift();
      if (next === undefined) this.used = Math.max(0, this.used - 1);
      else next();
    };
  }
}

export interface AuditSessionRequest<T> {
  runId: string;
  label: string;
  executionRole: string;
  cwd: string;
  execution: AuditExecution;
  prompt: string;
  schema: z.ZodType<T>;
  jsonSchema: Record<string, unknown>;
  signal: AbortSignal;
}

export interface AuditSessionResult<T> {
  output: T | null;
  error: string | null;
  usageByModel: Record<string, AgentTurnUsage>;
}

type FinalStatus = "completed" | "failed" | "cancelled";

interface PendingRelease<T> {
  status: FinalStatus;
  output: T | null;
  error: string | null;
  interrupt: boolean;
}

interface SessionState<T> {
  handle: AgentSessionHandle | null;
  pending: PendingRelease<T> | null;
}

async function closeAuditSession(handle: AgentSessionHandle, interrupt: boolean): Promise<boolean> {
  if (interrupt) await handle.interrupt().catch(() => undefined);
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    await Promise.race([
      handle.close(),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error("Délai de fermeture de la session d'audit dépassé")), AUDIT_CLOSE_TIMEOUT_MS);
        timer.unref();
      }),
    ]);
    return true;
  } catch (error) {
    handle.dispose?.();
    log.warn("fermeture de session d'audit incomplète", { reason: getErrorMessage(error) });
    return false;
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export async function runAuditSession<T>(deps: AuditEngineDeps, request: AuditSessionRequest<T>): Promise<AuditSessionResult<T>> {
  const release = await deps.acquireSession(request.signal);
  if (release === null) return { output: null, error: INTERRUPTED_ERROR, usageByModel: {} };
  try {
    return await runGatedSession(deps, request);
  } finally {
    release();
  }
}

function runGatedSession<T>(deps: AuditEngineDeps, request: AuditSessionRequest<T>): Promise<AuditSessionResult<T>> {
  const { runId, label, execution, signal } = request;
  const generationId = `audit-${runId}-${label}-${randomUUID()}`;
  return new Promise((resolve) => {
    const state: SessionState<T> = { handle: null, pending: null };
    let settled = false;
    let sessionId: string | null = null;
    let lastError: string | null = null;
    let usageByModel: Record<string, AgentTurnUsage> = {};
    let errorTimer: ReturnType<typeof setTimeout> | undefined;

    const finalize = (status: FinalStatus, output: T | null, error: string | null, closed: boolean): void => {
      const closureError = closed ? null : "fermeture de session non confirmée";
      const finalError = [error, closureError].filter((part) => part !== null).join(" ; ") || null;
      try {
        deps.store.finalizeExecution({ generationId, sessionId, status, usageByModel, error: finalError, finishedAt: deps.now() });
      } catch (finalizeError) {
        log.warn("finalisation d'exécution d'audit impossible", { generationId, reason: getErrorMessage(finalizeError) });
      }
      resolve({ output, error, usageByModel });
    };

    const release = (pending: PendingRelease<T>): void => {
      if (state.handle === null) {
        state.pending = pending;
        return;
      }
      void closeAuditSession(state.handle, pending.interrupt).then((closed) => finalize(pending.status, pending.output, pending.error, closed));
    };

    const finish = (status: FinalStatus, output: T | null, error: string | null, interrupt = false): void => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      if (errorTimer) clearTimeout(errorTimer);
      signal.removeEventListener("abort", onAbort);
      release({ status, output, error, interrupt });
    };

    const onEvent = (event: AgentSessionEvent): void => {
      if (event.sourceId !== undefined) return;
      if (event.type === "init") sessionId = event.sessionId;
      if (event.type === "error") {
        lastError = event.message;
        errorTimer ??= setTimeout(() => finish("failed", null, lastError), AUDIT_ERROR_SETTLE_MS);
      }
      if (event.type !== "turn_end") return;
      usageByModel = mergeAgentUsageByModel(usageByModel, event.usageByModel);
      if (!event.ok) {
        finish("failed", null, lastError ?? `tour terminé sans succès (${event.subtype})`);
        return;
      }
      const parsed = request.schema.safeParse(event.structuredOutput);
      if (parsed.success) finish("completed", parsed.data, null);
      else finish("failed", null, `réponse structurée invalide : ${z.prettifyError(parsed.error)}`);
    };

    const onAbort = (): void => finish("cancelled", null, INTERRUPTED_ERROR, true);
    const timeout = setTimeout(() => finish("failed", null, "délai de session d'audit dépassé", true), AUDIT_SESSION_TIMEOUT_MS);
    timeout.unref();
    signal.addEventListener("abort", onAbort, { once: true });

    try {
      deps.store.startExecution({
        id: generationId,
        ownerType: "audit",
        ownerId: runId,
        generationId,
        sessionId: null,
        role: request.executionRole,
        orchestrator: execution.provider,
        effectiveModel: execution.model,
        effectiveEffort: execution.effort,
        codexFast: execution.serviceTier === "fast",
        startedAt: deps.now(),
      });
    } catch (error) {
      settled = true;
      clearTimeout(timeout);
      signal.removeEventListener("abort", onAbort);
      resolve({ output: null, error: getErrorMessage(error), usageByModel });
      return;
    }
    if (signal.aborted) {
      finish("cancelled", null, INTERRUPTED_ERROR);
      return;
    }
    try {
      const started = deps.system.startAgentSession({
        ticketId: generationId,
        slotId: AUDIT_SLOT_ID,
        cwd: request.cwd,
        provider: execution.provider,
        model: execution.model,
        effort: execution.effort,
        serviceTier: execution.serviceTier ?? "default",
        role: "auditor",
        permissionMode: "dontAsk",
        readOnly: true,
        disableWorkerTools: true,
        allowedTools: AUDIT_ALLOWED_TOOLS[execution.provider],
        disallowedTools: AUDIT_DISALLOWED_TOOLS,
        skills: [],
        outputSchema: request.jsonSchema,
        onToolCall: async () => NO_TOOL_RESULT,
        onEvent,
      });
      state.handle = started;
      started.send(request.prompt);
    } catch (error) {
      finish("failed", null, getErrorMessage(error));
    }
    const deferred = state.pending;
    if (deferred === null) return;
    state.pending = null;
    if (state.handle === null) finalize(deferred.status, deferred.output, deferred.error, true);
    else release(deferred);
  });
}
