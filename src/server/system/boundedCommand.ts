/**
 * Bounded argv command execution shared by the real adapter and the VCS clients: a hard timeout so a
 * wedged `git`/`gh`/`az` can never block a gate forever, and a non-throwing JSON parse so a malformed
 * payload fails the caller's zod guard instead of the process.
 */

import { randomUUID } from "node:crypto";
import { rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import type { OperationDeadlineOptions } from "./types.ts";

export const BOUNDED_COMMAND_TIMEOUT_MS = 30_000;
const MS_PER_SECOND = 1000;
const FORCE_KILL_SIGNAL = 9;

export interface BoundedCommandResult {
  exitCode: number;
  stdout: string;
  stderr: string;
  timedOut: boolean;
  /** Budget the command ran under; absent means the default {@link BOUNDED_COMMAND_TIMEOUT_MS}. */
  timeoutMs?: number;
}

export interface BoundedCommandOptions extends OperationDeadlineOptions {
  /** FULL child environment; omitted inherits the server's. */
  env?: Record<string, string>;
  timeoutMs?: number;
}

export function assertOperationActive(options: OperationDeadlineOptions): void {
  options.signal?.throwIfAborted();
  if (options.deadlineAt !== undefined && (!Number.isFinite(options.deadlineAt) || Date.now() >= options.deadlineAt)) {
    throw new Error("The operation deadline expired before command execution.");
  }
}

export async function runBoundedCommand(args: string[], cwd: string, options: BoundedCommandOptions = {}): Promise<BoundedCommandResult> {
  assertOperationActive(options);
  const commandTimeoutMs = options.timeoutMs ?? BOUNDED_COMMAND_TIMEOUT_MS;
  const timeoutMs = options.deadlineAt === undefined ? commandTimeoutMs : Math.min(commandTimeoutMs, options.deadlineAt - Date.now());
  const proc = Bun.spawn(args, {
    cwd,
    stdin: "ignore",
    stdout: "pipe",
    stderr: "pipe",
    ...(options.env ? { env: options.env } : {}),
  });
  let timedOut = false;
  const onAbort = (): void => { proc.kill(FORCE_KILL_SIGNAL); };
  options.signal?.addEventListener("abort", onAbort, { once: true });
  if (options.signal?.aborted) onAbort();
  const timer = setTimeout(() => {
    timedOut = true;
    proc.kill(FORCE_KILL_SIGNAL);
  }, timeoutMs);
  try {
    const [exitCode, stdout, stderr] = await Promise.all([
      proc.exited,
      new Response(proc.stdout).text(),
      new Response(proc.stderr).text(),
    ]);
    options.signal?.throwIfAborted();
    if (options.deadlineAt !== undefined && Date.now() >= options.deadlineAt) timedOut = true;
    return { exitCode, stdout, stderr, timedOut, ...(options.timeoutMs !== undefined || options.deadlineAt !== undefined ? { timeoutMs } : {}) };
  } finally {
    clearTimeout(timer);
    options.signal?.removeEventListener("abort", onAbort);
  }
}

/** French wording reused wherever a bounded command's timeout is surfaced to the user. */
function boundedCommandTimeoutReason(timeoutMs: number): string {
  return `délai de ${Math.round(timeoutMs / MS_PER_SECOND)} s dépassé`;
}

/** Timeout wording when the command expired, else its stderr (stdout as a fallback). */
export function boundedCommandDetail(res: BoundedCommandResult): string {
  return res.timedOut
    ? boundedCommandTimeoutReason(res.timeoutMs ?? BOUNDED_COMMAND_TIMEOUT_MS)
    : (res.stderr.trim() || res.stdout.trim());
}

/** Parse JSON, returning null instead of throwing so a malformed payload fails the zod guard. */
export function safeJsonParse(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

/**
 * Write a JSON request body to a private temp file, hand its path to `run`, and always remove it.
 * Both PR hosts take a request body as a file (`gh api --input`, `az devops invoke --in-file`) rather
 * than inline arguments, so the payload never reaches an argv or a shell history.
 */
export async function withJsonRequestFile<T>(payload: unknown, run: (path: string) => Promise<T>): Promise<T> {
  const inputPath = join(tmpdir(), `kanban-review-${randomUUID()}.json`);
  try {
    await Bun.write(inputPath, JSON.stringify(payload));
    return await run(inputPath);
  } finally {
    await rm(inputPath, { force: true });
  }
}
