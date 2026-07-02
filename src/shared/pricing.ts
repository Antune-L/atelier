import type { AgentModel } from "./constants.ts";

import type { ModelUsage, SessionUsage, UsageByModel } from "./schemas.ts";

/**
 * Token-cost model. The SDK turn-end event ships only token counts (never prices); prices live here
 * so they stay editable and cost is recomputable retroactively from the stored token totals
 * (tokens = source of truth).
 *
 * Prices are Anthropic public list prices, expressed in USD per million tokens (MTok). Cache reads
 * bill at 0.1x the base input rate; cache writes (creation) bill at 1.25x. Maintain manually.
 */

/**
 * Model families we price; a full transcript model id is normalized to one of these. Aliased to
 * `AgentModel` so the two unions can't drift: `PRICING` (a `Record<ModelFamily, …>`) then forces an
 * entry per family, and the UI can index `AGENT_MODEL_LABELS` by a family.
 */
export type ModelFamily = AgentModel;

const MTOK = 1_000_000;

/** Cache-read tokens bill at this fraction of the base input rate. */
const CACHE_READ_MULTIPLIER = 0.1;
/** Cache-creation (write) tokens bill at this fraction of the base input rate. */
const CACHE_CREATE_MULTIPLIER = 1.25;

/** USD per MTok for the four billable buckets of a family. */
interface FamilyPricing {
  /** Input (non-cached) USD / MTok. */
  input: number;
  /** Output USD / MTok. */
  output: number;
  /** Cache-read USD / MTok. */
  cacheRead: number;
  /** Cache-creation (write) USD / MTok. */
  cacheCreate: number;
}

function familyPricing(input: number, output: number): FamilyPricing {
  return {
    input,
    output,
    cacheRead: input * CACHE_READ_MULTIPLIER,
    cacheCreate: input * CACHE_CREATE_MULTIPLIER,
  };
}

/** USD per MTok base rates (input / output) per family. */
export const PRICING: Record<ModelFamily, FamilyPricing> = {
  opus: familyPricing(15, 75),
  sonnet: familyPricing(3, 15),
  haiku: familyPricing(0.8, 4),
  fable: familyPricing(10, 50),
};

/**
 * Map a full transcript model id (e.g. "claude-opus-4-7-20250930") to a known family by substring.
 * Returns null when no family matches (caller treats that as unpriced).
 */
export function normalizeModel(modelId: string): ModelFamily | null {
  const lower = modelId.toLowerCase();
  if (lower.includes("opus")) return "opus";
  if (lower.includes("sonnet")) return "sonnet";
  if (lower.includes("haiku")) return "haiku";
  if (lower.includes("fable")) return "fable";
  return null;
}

/** Unknown model ids already warned about, so the hot `/stats` path logs each at most once. */
const warnedUnknownModels = new Set<string>();

/** Cost in USD of one model's usage; unknown model → 0 (warned once per process per model id). */
function costOfModel(modelId: string, usage: ModelUsage): number {
  const family = normalizeModel(modelId);
  if (family === null) {
    if (!warnedUnknownModels.has(modelId)) {
      warnedUnknownModels.add(modelId);
      console.warn(`pricing: unknown model "${modelId}", cost counted as 0`);
    }
    return 0;
  }
  const p = PRICING[family];
  return (
    (usage.input_tokens * p.input +
      usage.output_tokens * p.output +
      usage.cache_read_input_tokens * p.cacheRead +
      usage.cache_creation_input_tokens * p.cacheCreate) /
    MTOK
  );
}

/** Total cost in USD across every model in a single session's usage. */
export function costOf(usageByModel: UsageByModel): number {
  let total = 0;
  for (const [modelId, usage] of Object.entries(usageByModel)) {
    total += costOfModel(modelId, usage);
  }
  return total;
}

/** Total cost in USD across every session of a ticket. */
export function costOfSessions(sessionUsage: SessionUsage): number {
  let total = 0;
  for (const usage of Object.values(sessionUsage)) {
    total += costOf(usage);
  }
  return total;
}

/** Sum of the four token buckets across every model in a single session's usage. */
export function totalTokensOf(usageByModel: UsageByModel): number {
  let total = 0;
  for (const usage of Object.values(usageByModel)) {
    total += usage.input_tokens + usage.output_tokens + usage.cache_read_input_tokens + usage.cache_creation_input_tokens;
  }
  return total;
}

/** Sum of the four token buckets across every session of a ticket. */
export function totalTokensOfSessions(sessionUsage: SessionUsage): number {
  let total = 0;
  for (const usage of Object.values(sessionUsage)) {
    total += totalTokensOf(usage);
  }
  return total;
}

export interface TokenBreakdown {
  input: number;
  output: number;
  cacheRead: number;
  cacheCreate: number;
}

/** Aggregate the four token buckets across every session of a ticket (for the detail breakdown). */
export function tokenBreakdownOf(sessionUsage: SessionUsage): TokenBreakdown {
  const breakdown: TokenBreakdown = { input: 0, output: 0, cacheRead: 0, cacheCreate: 0 };
  for (const usage of Object.values(sessionUsage)) {
    for (const model of Object.values(usage)) {
      breakdown.input += model.input_tokens;
      breakdown.output += model.output_tokens;
      breakdown.cacheRead += model.cache_read_input_tokens;
      breakdown.cacheCreate += model.cache_creation_input_tokens;
    }
  }
  return breakdown;
}

/** Per-family cost across every session of a ticket; families with no usage are omitted. */
export function costByFamily(sessionUsage: SessionUsage): Partial<Record<ModelFamily, number>> {
  const byFamily: Partial<Record<ModelFamily, number>> = {};
  for (const usage of Object.values(sessionUsage)) {
    for (const [modelId, model] of Object.entries(usage)) {
      const family = normalizeModel(modelId);
      if (family === null) continue;
      byFamily[family] = (byFamily[family] ?? 0) + costOf({ [modelId]: model });
    }
  }
  return byFamily;
}
