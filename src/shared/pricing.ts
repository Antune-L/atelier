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
  opus: familyPricing(5, 25),
  sonnet: familyPricing(3, 15),
  haiku: familyPricing(1, 5),
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

/** Cost in USD of one model's usage; null means no explicit price is known. */
function costOfModel(modelId: string, usage: ModelUsage): number | null {
  const family = normalizeModel(modelId);
  if (family === null) return null;
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
export function costOf(usageByModel: UsageByModel): number | null {
  let total = 0;
  for (const [modelId, usage] of Object.entries(usageByModel)) {
    const cost = costOfModel(modelId, usage);
    if (cost === null) return null;
    total += cost;
  }
  return total;
}

/** Total cost in USD across every session of a ticket. */
export function costOfSessions(sessionUsage: SessionUsage): number | null {
  let total = 0;
  for (const usage of Object.values(sessionUsage)) {
    const cost = costOf(usage);
    if (cost === null) return null;
    total += cost;
  }
  return total;
}

export interface CostSummary {
  costUsd: number | null;
  knownCostUsd: number;
  partial: boolean;
}

/** Preserve the known subtotal while marking a mixed known/unknown total as partial. */
export function summarizeSessionCosts(sessionUsage: SessionUsage): CostSummary {
  let knownCostUsd = 0;
  let hasKnown = false;
  let hasUnknown = false;
  for (const usage of Object.values(sessionUsage)) {
    for (const [modelId, modelUsage] of Object.entries(usage)) {
      const cost = costOfModel(modelId, modelUsage);
      if (cost === null) {
        hasUnknown = true;
      } else {
        hasKnown = true;
        knownCostUsd += cost;
      }
    }
  }
  return {
    costUsd: hasUnknown || (!hasKnown && Object.keys(sessionUsage).length === 0) ? null : knownCostUsd,
    knownCostUsd,
    partial: hasKnown && hasUnknown,
  };
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
      const cost = costOfModel(modelId, model);
      if (cost !== null) byFamily[family] = (byFamily[family] ?? 0) + cost;
    }
  }
  return byFamily;
}
