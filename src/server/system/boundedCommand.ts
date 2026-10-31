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
  /** True when stdout reached `maxStdoutChars` and the command was stopped. */
  truncated?: boolean;
}

export interface BoundedCommandOptions extends OperationDeadlineOptions {
  /** FULL child environment; omitted inherits the server's. */
  env?: Record<string, string>;
  timeoutMs?: number;
  /** Stop the command once stdout exceeds this many characters and return what was read. */
  maxStdoutChars?: number;
  maxStderrChars?: number;
  stdin?: string;
}

async function readBounded(stream: ReadableStream<Uint8Array>, maxChars: number | undefined, onLimit: () => void): Promise<{ text: string; truncated: boolean }> {
  if (maxChars === undefined) return { text: await new Response(stream).text(), truncated: false };
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let text = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    text += decoder.decode(value, { stream: true });
    if (text.length > maxChars) {
      onLimit();
      await reader.cancel().catch(() => undefined);
      return { text: text.slice(0, maxChars), truncated: true };
    }
  }
  return { text: text + decoder.decode(), truncated: false };
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
    stdin: options.stdin === undefined ? "ignore" : new Blob([options.stdin]),
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
      readBounded(proc.stdout, options.maxStdoutChars, () => proc.kill(FORCE_KILL_SIGNAL)),
      readBounded(proc.stderr, options.maxStderrChars, () => proc.kill(FORCE_KILL_SIGNAL)),
    ]);
    options.signal?.throwIfAborted();
    if (options.deadlineAt !== undefined && Date.now() >= options.deadlineAt) timedOut = true;
    return {
      exitCode,
      stdout: stdout.text,
      stderr: stderr.text,
      timedOut,
      ...(options.timeoutMs !== undefined || options.deadlineAt !== undefined ? { timeoutMs } : {}),
      ...(stdout.truncated ? { truncated: true } : {}),
    };
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
