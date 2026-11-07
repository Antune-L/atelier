import { normalizeEpochMs } from "../../shared/providerQuota.ts";
import type { QuotaProvider } from "../../shared/providerQuota.ts";
import type { AgentSessionEvent } from "../system/agentSession.ts";

const CLAUDE_REJECTED_STATUS = "rejected";
const QUOTA_ERROR_PATTERN = /usage limit|rate[ _-]?limit|quota|too many requests|\b429\b|insufficient_quota/i;

export interface QuotaRefusal {
  provider: QuotaProvider;
  resetsAt: number | null;
  reason: string;
}

/** A provider refused work for quota: Claude reports a rejected rate-limit window, Codex a usage-limit error. */
export function detectQuotaRefusal(event: AgentSessionEvent, provider: QuotaProvider | null): QuotaRefusal | null {
  if (event.type === "rate_limit" && event.status === CLAUDE_REJECTED_STATUS) {
    return { provider: "claude", resetsAt: event.resetsAt === null ? null : normalizeEpochMs(event.resetsAt), reason: `Claude rate limit rejected (${event.rateLimitType ?? "unknown window"}).` };
  }
  if (event.type === "error" && provider !== null && QUOTA_ERROR_PATTERN.test(event.message)) {
    return { provider, resetsAt: null, reason: event.message };
  }
  return null;
}
