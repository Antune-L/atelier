import type { AgentModel, Orchestrator } from "./constants.ts";

import type { ExecutionModelUsage, ModelUsage, SessionUsage, UsageByModel } from "./schemas.ts";

/**
 * Token-cost model. The SDK turn-end event ships only token counts (never prices); prices live here
 * so they stay editable and cost is recomputable retroactively from the stored token totals
 * (tokens = source of truth).
 *
 * Claude prices are Anthropic public list prices, expressed in USD per million tokens (MTok). Cache reads
 * bill at 0.1x the base input rate by default (Opus 5.5: 0.05x); cache writes (creation) bill at
 * 1.25x. `MODEL_PRICING` overrides a family rate for specific model ids (matched by prefix so
 * dated ids like "claude-opus-5-5-20260915" resolve); anything else falls back to `PRICING`.
 *
 * GPT (Codex) prices are OpenAI public list prices in `GPT_PRICING` / `GPT_FAST_PRICING`, with
 * explicit per-bucket rates and their own formula (see `gptBreakdown`). Maintain manually following
 * docs/pricing.md on every SDK bump and every new model.
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
/** Opus 5.5 cache reads bill at a lower fraction of its base input rate. */
const OPUS_5_5_CACHE_READ_MULTIPLIER = 0.05;
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

function familyPricing(input: number, output: number, cacheReadMultiplier = CACHE_READ_MULTIPLIER): FamilyPricing {
  return {
    input,
    output,
    cacheRead: input * cacheReadMultiplier,
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

/** Per-model-id overrides, keyed by id prefix; checked before the family table. */
const MODEL_PRICING: Record<string, FamilyPricing> = {
  "claude-opus-5-5": familyPricing(4, 20, OPUS_5_5_CACHE_READ_MULTIPLIER),
};

function pricingOf(modelId: string): FamilyPricing | null {
  const lower = modelId.toLowerCase();
  for (const [prefix, pricing] of Object.entries(MODEL_PRICING)) {
    if (lower.startsWith(prefix)) return pricing;
  }
  const family = normalizeModel(modelId);
  return family === null ? null : PRICING[family];
}

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

/** Explicit USD / MTok rates of a GPT model; `write12h` is kept for reference but never billed. */
interface GptPricing {
  input: number;
  output: number;
  cachedInput: number;
  write30m: number;
  write12h: number;
}

function gptPricing(input: number, output: number, cachedInput: number, write30m: number, write12h: number): GptPricing {
  return { input, output, cachedInput, write30m, write12h };
}

/** Standard-tier GPT rates keyed by model-id prefix. `gpt-6-sol` is billed at the 6.1 Sol rates. */
const GPT_PRICING: Record<string, GptPricing> = {
  "gpt-6-astra": gptPricing(10, 50, 1, 12.5, 25),
  "gpt-6.1-sol": gptPricing(2, 10, 0.1, 2.5, 5),
  "gpt-6-sol": gptPricing(2, 10, 0.1, 2.5, 5),
  "gpt-6.1-terra": gptPricing(1, 5, 0.05, 1.25, 2.5),
  "gpt-6-luna": gptPricing(0.1, 0.5, 0.01, 0.125, 0.25),
};

/** FAST (priority service tier) GPT rates. */
const GPT_FAST_PRICING: Record<string, GptPricing> = {
  "gpt-6-astra": gptPricing(20, 100, 2, 25, 50),
  "gpt-6.1-sol": gptPricing(4, 20, 0.2, 5, 10),
  "gpt-6-sol": gptPricing(4, 20, 0.2, 5, 10),
  "gpt-6.1-terra": gptPricing(2, 10, 0.1, 2.5, 5),
  "gpt-6-luna": gptPricing(0.2, 1, 0.02, 0.25, 0.5),
};

function isGptModel(modelId: string): boolean {
  return modelId.toLowerCase().startsWith("gpt-");
}

function uncachedGptInput(t: TokenBreakdown): number {
  return Math.max(0, t.input - t.cacheRead - t.cacheCreate);
}

/**
 * Raw token buckets split into non-overlapping ones for display: GPT `input` already includes the
 * cached and written tokens, so only its uncached share stays in `input`. Claude buckets are disjoint.
 */
export function exclusiveTokenBuckets(modelId: string, tokens: TokenBreakdown): TokenBreakdown {
  return isGptModel(modelId) ? { ...tokens, input: uncachedGptInput(tokens) } : tokens;
}

function gptPricingOf(modelId: string, fast: boolean): GptPricing | null {
  const lower = modelId.toLowerCase();
  for (const [prefix, pricing] of Object.entries(fast ? GPT_FAST_PRICING : GPT_PRICING)) {
    // Exact id or a dated variant ("gpt-6.1-sol-2026-…"), so "gpt-6-sol" never matches "gpt-6.1-sol".
    if (lower === prefix || lower.startsWith(`${prefix}-`)) return pricing;
  }
  return null;
}

/**
 * USD per bucket for GPT. Codex `inputTokens` include cached tokens (OpenAI convention), so the
 * billable uncached input is input − cacheRead − cacheCreate. Cache creation bills at the 30-minute
 * write rate (the 12h rate is not distinguishable from the reported tokens).
 */
function gptBreakdown(p: GptPricing, t: TokenBreakdown): TokenBreakdown {
  return {
    input: (uncachedGptInput(t) * p.input) / MTOK,
    output: (t.output * p.output) / MTOK,
    cacheRead: (t.cacheRead * p.cachedInput) / MTOK,
    cacheCreate: (t.cacheCreate * p.write30m) / MTOK,
  };
}

function costOfGpt(p: GptPricing, t: TokenBreakdown): number {
  const buckets = gptBreakdown(p, t);
  return buckets.input + buckets.output + buckets.cacheRead + buckets.cacheCreate;
}

/** Cost in USD of raw token buckets; FAST only affects GPT models. Null when unpriced. */
function costOfTokens(modelId: string, t: TokenBreakdown, options: { fast?: boolean } = {}): number | null {
  if (isGptModel(modelId)) {
    const gpt = gptPricingOf(modelId, options.fast ?? false);
    return gpt === null ? null : costOfGpt(gpt, t);
  }
  const p = pricingOf(modelId);
  if (p === null) return null;
  return (t.input * p.input + t.output * p.output + t.cacheRead * p.cacheRead + t.cacheCreate * p.cacheCreate) / MTOK;
}

/** Cost in USD of one model's usage; null means no explicit price is known. */
function costOfModel(modelId: string, usage: ModelUsage, options: { fast?: boolean } = {}): number | null {
  return costOfTokens(modelId, {
    input: usage.input_tokens,
    output: usage.output_tokens,
    cacheRead: usage.cache_read_input_tokens,
    cacheCreate: usage.cache_creation_input_tokens,
  }, options);
}

/** Provider of a model id: Codex for GPT/codex ids, else `fallback`. */
export function providerOfModel(modelId: string, fallback: Orchestrator = "claude"): Orchestrator {
  const lower = modelId.toLowerCase();
  if (lower.startsWith("gpt-") || lower.includes("codex")) return "codex";
  return fallback;
}

/** Whether the local grid knows a (standard-tier) price for this model id. */
export function isPricedModel(modelId: string): boolean {
  return isGptModel(modelId) ? gptPricingOf(modelId, false) !== null : pricingOf(modelId) !== null;
}

/** Execution usage cost: the SDK-reported cost wins, else recomputed from tokens (null when unpriced). */
export function costOfExecutionUsage(modelId: string, usage: ExecutionModelUsage, fast: boolean): number | null {
  if (usage.costUsd !== null) return usage.costUsd;
  return costOfTokens(modelId, {
    input: usage.inputTokens,
    output: usage.outputTokens,
    cacheRead: usage.cacheReadTokens,
    cacheCreate: usage.cacheCreationTokens,
  }, { fast });
}

/** USD per bucket at the local grid rates (GPT `input` = uncached input cost); null when unpriced. */
export function costBreakdownOfModel(modelId: string, tokens: TokenBreakdown, fast: boolean): TokenBreakdown | null {
  if (isGptModel(modelId)) {
    const gpt = gptPricingOf(modelId, fast);
    return gpt === null ? null : gptBreakdown(gpt, tokens);
  }
  const p = pricingOf(modelId);
  if (p === null) return null;
  return {
    input: (tokens.input * p.input) / MTOK,
    output: (tokens.output * p.output) / MTOK,
    cacheRead: (tokens.cacheRead * p.cacheRead) / MTOK,
    cacheCreate: (tokens.cacheCreate * p.cacheCreate) / MTOK,
  };
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
