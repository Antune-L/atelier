/**
 * Bounded argv command execution shared by the real adapter and the VCS clients: a hard timeout so a
 * wedged `git`/`gh`/`az` can never block a gate forever, and a non-throwing JSON parse so a malformed
 * payload fails the caller's zod guard instead of the process.
 */

import { randomUUID } from "node:crypto";
import { rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

export const BOUNDED_COMMAND_TIMEOUT_MS = 30_000;
/** French wording reused wherever a bounded command's timeout is surfaced to the user. */
const BOUNDED_COMMAND_TIMEOUT_REASON = "délai de 30 s dépassé";

export interface BoundedCommandResult {
  exitCode: number;
  stdout: string;
  stderr: string;
  timedOut: boolean;
}

export async function runBoundedCommand(args: string[], cwd: string): Promise<BoundedCommandResult> {
  const proc = Bun.spawn(args, { cwd, stdin: "ignore", stdout: "pipe", stderr: "pipe" });
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    proc.kill(9);
  }, BOUNDED_COMMAND_TIMEOUT_MS);
  try {
    const [exitCode, stdout, stderr] = await Promise.all([
      proc.exited,
      new Response(proc.stdout).text(),
      new Response(proc.stderr).text(),
    ]);
    return { exitCode, stdout, stderr, timedOut };
  } finally {
    clearTimeout(timer);
  }
}

/** Timeout wording when the command expired, else its stderr (stdout as a fallback). */
export function boundedCommandDetail(res: BoundedCommandResult): string {
  return res.timedOut ? BOUNDED_COMMAND_TIMEOUT_REASON : (res.stderr.trim() || res.stdout.trim());
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
