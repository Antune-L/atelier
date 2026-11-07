import { isQuotaStale } from "../../shared/providerQuota.ts";
import type { ProviderQuota } from "../../shared/providerQuota.ts";

const EXHAUSTED_PERCENT = 100;

export type QuotaAvailability =
  | { available: true }
  | { available: false; reason: string; resetsAt: number | null };

/** Unknown, failed or stale quota counts as unavailable (FR9); a renewal date alone is never an authorisation. */
export function quotaAvailability(quota: ProviderQuota | null, now: number): QuotaAvailability {
  if (quota === null) return { available: false, reason: "Quota is unknown.", resetsAt: null };
  if (quota.state === "not_applicable") return { available: true };
  if (quota.state !== "ok") return { available: false, reason: `Quota is unavailable (${quota.state}).`, resetsAt: null };
  if (isQuotaStale(quota, now)) return { available: false, reason: "Quota observation is stale.", resetsAt: null };
  const exhausted = quota.windows.filter((window) => window.usedPercent >= EXHAUSTED_PERCENT && (window.resetsAt === null || window.resetsAt > now));
  if (exhausted.length === 0) return { available: true };
  const resets = exhausted.map((window) => window.resetsAt);
  const resetsAt = resets.includes(null) ? null : Math.max(...resets.filter((value) => value !== null));
  return { available: false, reason: `Quota exhausted (${exhausted.map((window) => window.id).join(", ")}).`, resetsAt };
}
