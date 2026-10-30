const UTC_DAY_LENGTH = 10;
const TIME_PART_LENGTH = 2;

/** Counter key of the remote MCP daily quotas: UTC `YYYY-MM-DD`. */
export function remoteMcpQuotaDay(now: number): string {
  return new Date(now).toISOString().slice(0, UTC_DAY_LENGTH);
}

/** Epoch milliseconds of the next UTC midnight, when the daily quotas reset. */
export function remoteMcpQuotaResetAt(now: number): number {
  const date = new Date(now);
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + 1);
}

/** `HH:MM UTC` of the next daily quota reset. */
export function remoteMcpQuotaResetTimeUtc(now: number): string {
  const reset = new Date(remoteMcpQuotaResetAt(now));
  const hours = String(reset.getUTCHours()).padStart(TIME_PART_LENGTH, "0");
  const minutes = String(reset.getUTCMinutes()).padStart(TIME_PART_LENGTH, "0");
  return `${hours}:${minutes} UTC`;
}
