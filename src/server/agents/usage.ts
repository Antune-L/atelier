import type { UsageByModel } from "../../shared/schemas.ts";

import type { AgentTurnUsage } from "../system/agentSession.ts";

/** Map the SDK per-model turn usage (camelCase + cost) to the persisted `UsageByModel` (snake_case). */
export function toUsageByModel(usage: Record<string, AgentTurnUsage>): UsageByModel {
  const out: UsageByModel = {};
  for (const [model, u] of Object.entries(usage)) {
    out[model] = {
      input_tokens: u.inputTokens,
      output_tokens: u.outputTokens,
      cache_creation_input_tokens: u.cacheCreationTokens,
      cache_read_input_tokens: u.cacheReadTokens,
    };
  }
  return out;
}

/**
 * Sum a per-turn usage delta into a session's running total, bucket-by-bucket per model. The SDK
 * reports usage PER TURN (each `result` covers only that turn), so a session's total is the sum of
 * its turn_end deltas — not the last one.
 */
export function addUsageByModel(prior: UsageByModel | undefined, delta: UsageByModel): UsageByModel {
  const out: UsageByModel = { ...(prior ?? {}) };
  for (const [model, d] of Object.entries(delta)) {
    const base = out[model];
    out[model] = base
      ? {
          input_tokens: base.input_tokens + d.input_tokens,
          output_tokens: base.output_tokens + d.output_tokens,
          cache_creation_input_tokens: base.cache_creation_input_tokens + d.cache_creation_input_tokens,
          cache_read_input_tokens: base.cache_read_input_tokens + d.cache_read_input_tokens,
        }
      : d;
  }
  return out;
}
