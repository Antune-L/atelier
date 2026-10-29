import { z } from "zod";

import { ORCHESTRATORS } from "./constants.ts";

/** Wire contract for the provider quota cards of the usage page (Claude + Codex). */

export const QUOTA_PROVIDERS = ORCHESTRATORS;
export const quotaProviderSchema = z.enum(QUOTA_PROVIDERS);
export type QuotaProvider = z.infer<typeof quotaProviderSchema>;

export const quotaWindowKindSchema = z.enum(["session", "weekly", "weekly_model", "monthly", "credit"]);
export type QuotaWindowKind = z.infer<typeof quotaWindowKindSchema>;

export const quotaWindowSchema = z.object({
  id: z.string().min(1),
  kind: quotaWindowKindSchema,
  /** Display name of the model for `weekly_model` windows. */
  model: z.string().nullable(),
  usedPercent: z.number().min(0).max(100),
  windowDurationMins: z.number().positive().nullable(),
  /** Epoch ms. */
  resetsAt: z.number().int().nullable(),
});
export type QuotaWindow = z.infer<typeof quotaWindowSchema>;

export const providerQuotaStateSchema = z.enum(["ok", "not_applicable", "no_data", "unauthenticated", "error", "timeout", "token_without_limits"]);
export type ProviderQuotaState = z.infer<typeof providerQuotaStateSchema>;

/**
 * live = read directly now; session = last rate-limit event received during a session;
 * cache = persisted last known state shown after a failed read.
 */
export const quotaSourceSchema = z.enum(["live", "session", "cache"]);
export type QuotaSource = z.infer<typeof quotaSourceSchema>;

export const providerQuotaSchema = z.object({
  provider: quotaProviderSchema,
  state: providerQuotaStateSchema,
  source: quotaSourceSchema.nullable(),
  /** Freshness timestamp, epoch ms. */
  observedAt: z.number().int().nullable(),
  planType: z.string().nullable(),
  windows: z.array(quotaWindowSchema),
  message: z.string().nullable(),
});
export type ProviderQuota = z.infer<typeof providerQuotaSchema>;

export const QUOTA_READ_TIMEOUT_MS = 15_000;
export const QUOTA_STALE_AFTER_MS = 30 * 60_000;
/** Usage may exceed elapsed time by this many percentage points before it counts as ahead of pace. */
export const QUOTA_PACE_TOLERANCE_POINTS = 5;

export interface QuotaWindowPace {
  elapsedPercent: number;
  ahead: boolean;
}

/** Compare usage with the elapsed share of the window; null when duration or reset time is unknown. */
export function quotaWindowPace(window: QuotaWindow, now: number): QuotaWindowPace | null {
  if (window.windowDurationMins === null || window.resetsAt === null) return null;
  const durationMs = window.windowDurationMins * 60_000;
  const start = window.resetsAt - durationMs;
  const elapsedPercent = Math.min(100, Math.max(0, ((now - start) / durationMs) * 100));
  return { elapsedPercent, ahead: window.usedPercent > elapsedPercent + QUOTA_PACE_TOLERANCE_POINTS };
}

/** Whether the quota was observed longer ago than the staleness threshold (or never). */
export function isQuotaStale(quota: ProviderQuota, now: number): boolean {
  return quota.observedAt === null || now - quota.observedAt > QUOTA_STALE_AFTER_MS;
}

/** Normalize an epoch timestamp to ms: values below 1e12 are taken as seconds. */
export function normalizeEpochMs(value: number): number {
  return value < 1e12 ? value * 1000 : value;
}
