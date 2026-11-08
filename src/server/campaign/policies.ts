import type { SessionUsage } from "../../shared/schemas.ts";

/** Tokens a session consumed against its budget: input, output and cache writes (cache reads are not new work). */
export function consumedTokens(usage: SessionUsage | null): number {
  if (usage === null) return 0;
  let total = 0;
  for (const byModel of Object.values(usage)) {
    for (const model of Object.values(byModel)) {
      total += model.input_tokens + model.output_tokens + model.cache_creation_input_tokens;
    }
  }
  return total;
}

const ENVIRONMENT_PATTERNS = [
  /ECONN(RESET|REFUSED|ABORTED)/i,
  /ETIMEDOUT|EAI_AGAIN|ENOTFOUND/i,
  /ENOSPC|no space left/i,
  /socket hang up|network|connection (reset|closed|refused)/i,
  /\b5\d\d\b.*(github|api)|(github|api).*\b5\d\d\b/i,
  /rate.?limit|usage limit|quota|overloaded|429/i,
  /timed? ?out|timeout/i,
  /redémarrage|restart|interrompu/i,
];

/** An environment failure is an incident, never counted as a repair of the code (FR5). */
export function isEnvironmentIncident(reason: string): boolean {
  return ENVIRONMENT_PATTERNS.some((pattern) => pattern.test(reason));
}

/** Stable fingerprint of a failure so repeated repairs of the same defect are counted together. */
export function defectFingerprint(reason: string): string {
  return reason
    .toLowerCase()
    .replace(/[0-9a-f]{7,40}/g, "<sha>")
    .replace(/\d+/g, "<n>")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 200);
}
