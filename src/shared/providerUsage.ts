import { z } from "zod";

import { isCodexFastServiceTier } from "./codexCapabilities.ts";
import type { Orchestrator } from "./constants.ts";
import { costBreakdownOfModel, costOf, costOfExecutionUsage, exclusiveTokenBuckets, providerOfModel } from "./pricing.ts";
import type { TokenBreakdown } from "./pricing.ts";
import type { ExecutionRun, SessionUsage } from "./schemas.ts";

/** Wire contract and pure aggregation behind the Cost / Tokens tabs of the usage page. */

export const USAGE_PERIODS = ["24h", "7d", "30d", "90d"] as const;
export const usagePeriodSchema = z.enum(USAGE_PERIODS);
export type UsagePeriod = z.infer<typeof usagePeriodSchema>;
export const DEFAULT_USAGE_PERIOD: UsagePeriod = "30d";

const DAY_MS = 86_400_000;
export const USAGE_HISTORY_RETENTION_MS = 90 * DAY_MS;

/** Inclusive lower bound (epoch ms) of a period. */
export function usagePeriodStart(period: UsagePeriod, now: number): number {
  switch (period) {
    case "24h":
      return now - DAY_MS;
    case "7d":
      return now - 7 * DAY_MS;
    case "30d":
      return now - 30 * DAY_MS;
    case "90d":
      return now - 90 * DAY_MS;
  }
}

export const tokenBreakdownSchema = z.object({
  input: z.number().nonnegative(),
  output: z.number().nonnegative(),
  cacheRead: z.number().nonnegative(),
  cacheCreate: z.number().nonnegative(),
});

export const dailyUsageSchema = z.object({
  /** UTC day, `YYYY-MM-DD`. */
  date: z.string(),
  costUsd: z.number().nonnegative(),
  unpricedTokens: z.number().nonnegative(),
  totalTokens: z.number().nonnegative(),
});
export type DailyUsage = z.infer<typeof dailyUsageSchema>;

export const modelUsageRowSchema = z.object({
  model: z.string(),
  fast: z.boolean(),
  /** Raw speed / service tier ("standard", "fast", "priority"…), kept visible. */
  speed: z.string(),
  totalTokens: z.number().nonnegative(),
  tokens: tokenBreakdownSchema,
  /** Known cost in USD; null when no entry of the row is priced ("non tarifé"). */
  costUsd: z.number().nonnegative().nullable(),
  daily: z.array(dailyUsageSchema),
});
export type ModelUsageRow = z.infer<typeof modelUsageRowSchema>;

export const speedUsageSchema = z.object({
  costUsd: z.number().nonnegative(),
  totalTokens: z.number().nonnegative(),
  unpricedTokens: z.number().nonnegative(),
});

export const usageTotalsSchema = z.object({
  /** Every processed token (exclusive buckets summed). */
  processed: z.number().nonnegative(),
  inputCached: z.number().nonnegative(),
  inputUncached: z.number().nonnegative(),
  cacheCreate: z.number().nonnegative(),
  output: z.number().nonnegative(),
});

export const providerUsageSchema = z.object({
  hasUsage: z.boolean(),
  totalTokens: z.number().nonnegative(),
  tokens: tokenBreakdownSchema,
  totals: usageTotalsSchema,
  /** Known subtotal in USD. */
  costUsd: z.number().nonnegative(),
  /** True when any usage with tokens is unpriced. */
  partial: z.boolean(),
  unpricedTokens: z.number().nonnegative(),
  /** Cache-read tokens priced at the input rate minus the cache-read rate (priced models only). */
  cacheSavingsUsd: z.number().nonnegative(),
  /** USD per token type. */
  costByType: tokenBreakdownSchema,
  costBySpeed: z.object({ standard: speedUsageSchema, fast: speedUsageSchema }),
  /** Distinct sessions with usage in the period. */
  sessionCount: z.number().int().nonnegative(),
  daily: z.array(dailyUsageSchema),
  models: z.array(modelUsageRowSchema),
});
export type ProviderUsage = z.infer<typeof providerUsageSchema>;

export const usageSummarySchema = z.object({
  period: usagePeriodSchema,
  since: z.number(),
  generatedAt: z.number(),
  providers: z.object({ claude: providerUsageSchema, codex: providerUsageSchema }),
  historyCoverage: z.object({
    files: z.number().int().nonnegative(),
    failedFiles: z.number().int().nonnegative(),
    failedRoots: z.number().int().nonnegative(),
  }).optional(),
});
export type UsageSummary = z.infer<typeof usageSummarySchema>;

/** One ticket's usage; `legacy` must be `residualLegacyUsage` so executions are never counted twice. */
export interface UsageSource {
  createdAt: number;
  legacy: SessionUsage;
  executions: ExecutionRun[];
}

/**
 * One model call read from a local provider history. Tokens follow the execution convention of the
 * provider: Codex `input` includes cached and written tokens, Claude buckets are disjoint.
 */
export interface HistoryUsageEntry {
  provider: Orchestrator;
  sessionId: string;
  /** Epoch ms. */
  timestamp: number;
  model: string;
  /** "standard", "fast" or the raw provider value. */
  speed: string;
  fast: boolean;
  tokens: TokenBreakdown;
  /** Stable key of the provider call (Claude `message.id` + `requestId`); null when none. */
  dedupKey: string | null;
}

/** Local histories plus the session ids the DB aggregation already counts. */
export interface UsageHistoryInput {
  entries: HistoryUsageEntry[];
  countedSessionIds: ReadonlySet<string>;
}

interface UsageEntry {
  provider: Orchestrator;
  sessionId: string;
  timestamp: number;
  model: string;
  fast: boolean;
  speed: string;
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

function utcDay(timestamp: number): string {
  return new Date(timestamp).toISOString().slice(0, 10);
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
          sessionId: run.sessionId ?? `run:${run.id}`,
          timestamp: run.startedAt,
          model,
          fast,
          speed: fast ? run.configuredServiceTier ?? "fast" : "standard",
          tokens: { input: usage.inputTokens, output: usage.outputTokens, cacheRead: usage.cacheReadTokens, cacheCreate: usage.cacheCreationTokens },
          costUsd: costOfExecutionUsage(model, usage, fast),
        });
      }
    }
    if (since !== null && source.createdAt < since) continue;
    for (const [sessionId, session] of Object.entries(source.legacy)) {
      for (const [model, usage] of Object.entries(session)) {
        entries.push({
          provider: providerOfModel(model),
          sessionId,
          timestamp: source.createdAt,
          model,
          fast: false,
          speed: "standard",
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

function collectHistoryEntries(history: UsageHistoryInput, since: number | null): UsageEntry[] {
  const entries: UsageEntry[] = [];
  const keyedEntries = new Map<string, UsageEntry>();
  for (const entry of history.entries) {
    if (since !== null && entry.timestamp < since) continue;
    if (history.countedSessionIds.has(entry.sessionId)) continue;
    // No Claude fast grid exists: such tokens stay counted but unpriced.
    const costUsd = entry.provider === "claude" && entry.fast
      ? null
      : costOfExecutionUsage(entry.model, {
        inputTokens: entry.tokens.input,
        outputTokens: entry.tokens.output,
        cacheReadTokens: entry.tokens.cacheRead,
        cacheCreationTokens: entry.tokens.cacheCreate,
        costUsd: null,
      }, entry.fast);
    const normalized: UsageEntry = {
      provider: entry.provider,
      sessionId: entry.sessionId,
      timestamp: entry.timestamp,
      model: entry.model,
      fast: entry.fast,
      speed: entry.speed,
      tokens: { ...entry.tokens },
      costUsd,
    };
    if (entry.dedupKey === null) {
      entries.push(normalized);
      continue;
    }
    const key = `${entry.provider}\u0000${entry.dedupKey}`;
    const previous = keyedEntries.get(key);
    if (!previous || sumOf(normalized.tokens) > sumOf(previous.tokens)) keyedEntries.set(key, normalized);
  }
  return [...entries, ...keyedEntries.values()];
}

function addDaily(days: Map<string, DailyUsage>, timestamp: number, totalTokens: number, costUsd: number | null): void {
  const date = utcDay(timestamp);
  const day = days.get(date) ?? { date, costUsd: 0, unpricedTokens: 0, totalTokens: 0 };
  days.set(date, day);
  day.totalTokens += totalTokens;
  if (costUsd === null) day.unpricedTokens += totalTokens;
  else day.costUsd += costUsd;
}

function sortedDays(days: Map<string, DailyUsage>): DailyUsage[] {
  return [...days.values()].sort((a, b) => a.date.localeCompare(b.date));
}

/** Savings of cache reads versus the uncached input rate; 0 when unpriced. */
function cacheSavingsOf(entry: UsageEntry): number {
  if (entry.costUsd === null || entry.tokens.cacheRead === 0) return 0;
  const atInput = costBreakdownOfModel(entry.model, { input: entry.tokens.cacheRead, output: 0, cacheRead: 0, cacheCreate: 0 }, entry.fast);
  const atCache = costBreakdownOfModel(entry.model, { input: 0, output: 0, cacheRead: entry.tokens.cacheRead, cacheCreate: 0 }, entry.fast);
  if (atInput === null || atCache === null) return 0;
  return Math.max(0, atInput.input - atCache.cacheRead);
}

interface RowAccumulator {
  row: Omit<ModelUsageRow, "daily">;
  days: Map<string, DailyUsage>;
}

function summarizeProvider(entries: UsageEntry[]): ProviderUsage {
  const tokens = emptyBreakdown();
  const costByType = emptyBreakdown();
  const costBySpeed = {
    standard: { costUsd: 0, totalTokens: 0, unpricedTokens: 0 },
    fast: { costUsd: 0, totalTokens: 0, unpricedTokens: 0 },
  };
  let costUsd = 0;
  let partial = false;
  let unpricedTokens = 0;
  let cacheSavingsUsd = 0;
  const sessions = new Set<string>();
  const days = new Map<string, DailyUsage>();
  const rows = new Map<string, RowAccumulator>();
  for (const entry of entries) {
    const displayTokens = exclusiveTokenBuckets(entry.model, entry.tokens);
    const entryTokens = sumOf(displayTokens);
    sessions.add(entry.sessionId);
    addBreakdown(tokens, displayTokens);
    addDaily(days, entry.timestamp, entryTokens, entry.costUsd);
    const speedTotals = entry.fast ? costBySpeed.fast : costBySpeed.standard;
    speedTotals.totalTokens += entryTokens;
    const key = `${entry.model}\u0000${entry.speed}`;
    const accumulator = rows.get(key) ?? {
      row: { model: entry.model, fast: entry.fast, speed: entry.speed, totalTokens: 0, tokens: emptyBreakdown(), costUsd: null },
      days: new Map<string, DailyUsage>(),
    };
    rows.set(key, accumulator);
    accumulator.row.totalTokens += entryTokens;
    addBreakdown(accumulator.row.tokens, displayTokens);
    addDaily(accumulator.days, entry.timestamp, entryTokens, entry.costUsd);
    if (entry.costUsd === null) {
      if (entryTokens > 0) {
        partial = true;
        unpricedTokens += entryTokens;
        speedTotals.unpricedTokens += entryTokens;
      }
      continue;
    }
    costUsd += entry.costUsd;
    speedTotals.costUsd += entry.costUsd;
    cacheSavingsUsd += cacheSavingsOf(entry);
    accumulator.row.costUsd = (accumulator.row.costUsd ?? 0) + entry.costUsd;
    const breakdown = costBreakdownOfModel(entry.model, entry.tokens, entry.fast);
    if (breakdown === null) continue;
    const recomputed = sumOf(breakdown);
    if (recomputed > 0) addBreakdown(costByType, breakdown, entry.costUsd / recomputed);
  }
  const models = [...rows.values()].map(({ row, days: rowDays }) => ({ ...row, daily: sortedDays(rowDays) })).sort((a, b) => {
    if (a.costUsd !== b.costUsd) {
      if (a.costUsd === null) return 1;
      if (b.costUsd === null) return -1;
      return b.costUsd - a.costUsd;
    }
    return b.totalTokens - a.totalTokens;
  });
  const totalTokens = sumOf(tokens);
  return {
    hasUsage: models.length > 0,
    totalTokens,
    tokens,
    totals: { processed: totalTokens, inputCached: tokens.cacheRead, inputUncached: tokens.input, cacheCreate: tokens.cacheCreate, output: tokens.output },
    costUsd,
    partial,
    unpricedTokens,
    cacheSavingsUsd,
    costByType,
    costBySpeed,
    sessionCount: sessions.size,
    daily: sortedDays(days),
    models,
  };
}

/**
 * Aggregate tokens and indicative cost per provider over a period: DB sources plus local histories,
 * excluding history sessions the DB already counts.
 */
export function summarizeProviderUsage(
  sources: UsageSource[],
  since: number,
  period: UsagePeriod,
  now: number,
  history: UsageHistoryInput = { entries: [], countedSessionIds: new Set() },
): UsageSummary {
  const entries = [...collectEntries(sources, since), ...collectHistoryEntries(history, since)];
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
