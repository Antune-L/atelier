/** Shared plumbing for the read-only "test connection" probe of every VCS client. */

import type { VcsConnectionResult } from "../../../shared/schemas.ts";
import type { BoundedCommandResult } from "../boundedCommand.ts";

/** Cheapest possible read for the connection test: a single PR. */
export const CONNECTION_TEST_PR_LIMIT = "1";
/** Keep the surfaced CLI error short enough for a one-line status in the settings panel. */
const CONNECTION_ERROR_TAIL = 400;

export function connectionFailure(message: string, checkedAt: number): VcsConnectionResult {
  return { ok: false, message, checkedAt };
}

/** Map a finished probe command onto the never-throwing connection result. */
export function connectionResult(
  res: BoundedCommandResult,
  command: string,
  successMessage: string,
  checkedAt: number,
): VcsConnectionResult {
  if (res.timedOut) return connectionFailure(`${command} : délai dépassé`, checkedAt);
  if (res.exitCode !== 0) {
    const detail = (res.stderr.trim() || res.stdout.trim()).slice(-CONNECTION_ERROR_TAIL);
    return connectionFailure(`${command} a échoué (code ${res.exitCode}) : ${detail}`, checkedAt);
  }
  return { ok: true, message: successMessage, checkedAt };
}
