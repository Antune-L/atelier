import { z } from "zod";

import { isCodexFastServiceTier } from "./codexCapabilities.ts";
import type { Orchestrator } from "./constants.ts";
import { costBreakdownOfModel, costOf, costOfExecutionUsage, exclusiveTokenBuckets, providerOfModel } from "./pricing.ts";
import type { TokenBreakdown } from "./pricing.ts";
import type { ExecutionRun, SessionUsage } from "./schemas.ts";

/** Wire contract and pure aggregation behind the Cost / Tokens tabs of the usage page. */

export const USAGE_PERIODS = ["7d", "30d", "all"] as const;
export const usagePeriodSchema = z.enum(USAGE_PERIODS);
export type UsagePeriod = z.infer<typeof usagePeriodSchema>;
export const DEFAULT_USAGE_PERIOD: UsagePeriod = "30d";

const DAY_MS = 86_400_000;

/** Inclusive lower bound (epoch ms) of a period; null means no bound. */
export function usagePeriodStart(period: UsagePeriod, now: number): number | null {
  switch (period) {
    case "7d":
      return now - 7 * DAY_MS;
    case "30d":
      return now - 30 * DAY_MS;
    case "all":
      return null;
  }
}

export const tokenBreakdownSchema = z.object({
  input: z.number().nonnegative(),
  output: z.number().nonnegative(),
  cacheRead: z.number().nonnegative(),
  cacheCreate: z.number().nonnegative(),
});

export const modelUsageRowSchema = z.object({
  model: z.string(),
  fast: z.boolean(),
  totalTokens: z.number().nonnegative(),
  tokens: tokenBreakdownSchema,
  /** Known cost in USD; null when no entry of the row is priced ("non tarifé"). */
  costUsd: z.number().nonnegative().nullable(),
});
export type ModelUsageRow = z.infer<typeof modelUsageRowSchema>;

export const providerUsageSchema = z.object({
  hasUsage: z.boolean(),
  totalTokens: z.number().nonnegative(),
  tokens: tokenBreakdownSchema,
  /** Known subtotal in USD. */
  costUsd: z.number().nonnegative(),
  /** True when any usage with tokens is unpriced. */
  partial: z.boolean(),
  unpricedTokens: z.number().nonnegative(),
  /** USD per token type. */
  costByType: tokenBreakdownSchema,
  models: z.array(modelUsageRowSchema),
});
export type ProviderUsage = z.infer<typeof providerUsageSchema>;

export const usageSummarySchema = z.object({
  period: usagePeriodSchema,
  since: z.number().nullable(),
  generatedAt: z.number(),
  providers: z.object({ claude: providerUsageSchema, codex: providerUsageSchema }),
});
export type UsageSummary = z.infer<typeof usageSummarySchema>;

/** One ticket's usage; `legacy` must be `residualLegacyUsage` so executions are never counted twice. */
export interface UsageSource {
  createdAt: number;
  legacy: SessionUsage;
  executions: ExecutionRun[];
}

interface UsageEntry {
  provider: Orchestrator;
  model: string;
  fast: boolean;
  tokens: TokenBreakdown;
  costUsd: number | null;
}

function emptyBreakdown(): TokenBreakdown {
  return { input: 0, output: 0, cacheRead: 0, cacheCreate: 0 };
}

function addBreakdown(target: TokenBreakdown, source: TokenBreakdown, scale = 1): void {
  target.input += source.input * scale;
  target.output += source.output * scale;
  target.cacheRead += source.cacheRead * scale;
  target.cacheCreate += source.cacheCreate * scale;
}

function sumOf(tokens: TokenBreakdown): number {
  return tokens.input + tokens.output + tokens.cacheRead + tokens.cacheCreate;
}

function collectEntries(sources: UsageSource[], since: number | null): UsageEntry[] {
  const entries: UsageEntry[] = [];
  for (const source of sources) {
    for (const run of source.executions) {
      if (since !== null && run.startedAt < since) continue;
      const fast = run.codexFast || isCodexFastServiceTier(run.configuredServiceTier);
      for (const [model, usage] of Object.entries(run.usageByModel)) {
        entries.push({
          provider: providerOfModel(model, run.orchestrator),
          model,
          fast,
          tokens: { input: usage.inputTokens, output: usage.outputTokens, cacheRead: usage.cacheReadTokens, cacheCreate: usage.cacheCreationTokens },
          costUsd: costOfExecutionUsage(model, usage, fast),
        });
      }
    }
    if (since !== null && source.createdAt < since) continue;
    for (const session of Object.values(source.legacy)) {
      for (const [model, usage] of Object.entries(session)) {
        entries.push({
          provider: providerOfModel(model),
          model,
          fast: false,
          tokens: {
            input: usage.input_tokens,
            output: usage.output_tokens,
            cacheRead: usage.cache_read_input_tokens,
            cacheCreate: usage.cache_creation_input_tokens,
          },
          costUsd: costOf({ [model]: usage }),
        });
      }
    }
  }
  return entries;
}

function summarizeProvider(entries: UsageEntry[]): ProviderUsage {
  const tokens = emptyBreakdown();
  const costByType = emptyBreakdown();
  let costUsd = 0;
  let partial = false;
  let unpricedTokens = 0;
  const rows = new Map<string, ModelUsageRow>();
  for (const entry of entries) {
    const displayTokens = exclusiveTokenBuckets(entry.model, entry.tokens);
    const entryTokens = sumOf(displayTokens);
    addBreakdown(tokens, displayTokens);
    const key = `${entry.model}\u0000${entry.fast ? "fast" : "standard"}`;
    const row = rows.get(key) ?? { model: entry.model, fast: entry.fast, totalTokens: 0, tokens: emptyBreakdown(), costUsd: null };
    rows.set(key, row);
    row.totalTokens += entryTokens;
    addBreakdown(row.tokens, displayTokens);
    if (entry.costUsd === null) {
      if (entryTokens > 0) {
        partial = true;
        unpricedTokens += entryTokens;
      }
      continue;
    }
    costUsd += entry.costUsd;
    row.costUsd = (row.costUsd ?? 0) + entry.costUsd;
    const breakdown = costBreakdownOfModel(entry.model, entry.tokens, entry.fast);
    if (breakdown === null) continue;
    const recomputed = sumOf(breakdown);
    if (recomputed > 0) addBreakdown(costByType, breakdown, entry.costUsd / recomputed);
  }
  const models = [...rows.values()].sort((a, b) => {
    if (a.costUsd !== b.costUsd) {
      if (a.costUsd === null) return 1;
      if (b.costUsd === null) return -1;
      return b.costUsd - a.costUsd;
    }
    return b.totalTokens - a.totalTokens;
  });
  return { hasUsage: models.length > 0, totalTokens: sumOf(tokens), tokens, costUsd, partial, unpricedTokens, costByType, models };
}

/** Aggregate tokens and indicative cost per provider over a period (same scope as /stats). */
export function summarizeProviderUsage(sources: UsageSource[], since: number | null, period: UsagePeriod, now: number): UsageSummary {
  const entries = collectEntries(sources, since);
  return {
    period,
    since,
    generatedAt: now,
    providers: {
      claude: summarizeProvider(entries.filter((entry) => entry.provider === "claude")),
      codex: summarizeProvider(entries.filter((entry) => entry.provider === "codex")),
    },
  };
}
