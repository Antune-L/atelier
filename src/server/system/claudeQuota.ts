/** Claude subscription quota: normalization of the SDK `get_usage` response and of rate-limit events. */

import { z } from "zod";

import { getErrorMessage } from "../../shared/errors.ts";
import { normalizeEpochMs, providerQuotaSchema, QUOTA_READ_TIMEOUT_MS } from "../../shared/providerQuota.ts";
import type { ProviderQuota, ProviderQuotaState, QuotaWindow } from "../../shared/providerQuota.ts";

const SESSION_WINDOW_MINS = 300;
const WEEKLY_WINDOW_MINS = 10_080;

const usageLimitSchema = z
  .object({ utilization: z.number().nullish(), resets_at: z.string().nullish() })
  .nullish();

/** Only the rate-limit fields are kept; session cost, behaviors and anything account-related are stripped. */
const getUsageResponseSchema = z.object({
  subscription_type: z.string().nullish(),
  rate_limits_available: z.boolean(),
  rate_limits: z
    .object({
      five_hour: usageLimitSchema,
      seven_day: usageLimitSchema,
      seven_day_opus: usageLimitSchema,
      seven_day_sonnet: usageLimitSchema,
      model_scoped: z
        .array(z.object({ display_name: z.string(), utilization: z.number().nullish(), resets_at: z.string().nullish() }))
        .nullish(),
      extra_usage: z
        .object({ is_enabled: z.boolean(), utilization: z.number().nullish() })
        .nullish(),
    })
    .nullish(),
});

function clampPercent(value: number): number {
  return Math.min(100, Math.max(0, value));
}

function isoToMs(value: string | null | undefined): number | null {
  if (!value) return null;
  const ms = Date.parse(value);
  return Number.isNaN(ms) ? null : ms;
}

function quota(
  state: ProviderQuotaState,
  observedAt: number,
  fields: { planType?: string | null; windows?: QuotaWindow[]; message?: string | null } = {},
): ProviderQuota {
  return providerQuotaSchema.parse({
    provider: "claude",
    state,
    source: state === "ok" ? "live" : null,
    observedAt,
    planType: fields.planType ?? null,
    windows: fields.windows ?? [],
    message: fields.message ?? null,
  });
}

/** Build a Claude quota result for a non-live state (shared with the real adapter). */
export function claudeQuotaState(state: ProviderQuotaState, now: number, message: string | null): ProviderQuota {
  return quota(state, now, { message });
}

/** Normalize the `get_usage` control response into a provider quota; never throws. */
export function normalizeClaudeUsage(raw: unknown, now: number): ProviderQuota {
  const parsed = getUsageResponseSchema.safeParse(raw);
  if (!parsed.success) return quota("error", now, { message: "Réponse get_usage invalide" });
  const usage = parsed.data;
  const planType = usage.subscription_type ?? null;
  if (!usage.rate_limits_available) {
    if (planType === null) {
      return quota("not_applicable", now, { message: "Clé API ou fournisseur tiers : pas de quota d'abonnement" });
    }
    return quota("no_data", now, { planType, message: "Aucune donnée de quota reçue" });
  }
  const limits = usage.rate_limits;
  const windows: QuotaWindow[] = [];
  const push = (
    id: string,
    kind: QuotaWindow["kind"],
    model: string | null,
    duration: number | null,
    limit: { utilization?: number | null; resets_at?: string | null } | null | undefined,
  ): void => {
    if (!limit || limit.utilization === null || limit.utilization === undefined) return;
    windows.push({ id, kind, model, usedPercent: clampPercent(limit.utilization), windowDurationMins: duration, resetsAt: isoToMs(limit.resets_at) });
  };
  push("claude:five_hour", "session", null, SESSION_WINDOW_MINS, limits?.five_hour);
  push("claude:seven_day", "weekly", null, WEEKLY_WINDOW_MINS, limits?.seven_day);
  push("claude:seven_day_opus", "weekly_model", "Opus", WEEKLY_WINDOW_MINS, limits?.seven_day_opus);
  push("claude:seven_day_sonnet", "weekly_model", "Sonnet", WEEKLY_WINDOW_MINS, limits?.seven_day_sonnet);
  for (const scoped of limits?.model_scoped ?? []) {
    push(`claude:model:${scoped.display_name}`, "weekly_model", scoped.display_name, WEEKLY_WINDOW_MINS, scoped);
  }
  const extra = limits?.extra_usage;
  if (extra?.is_enabled) push("claude:extra_usage", "monthly", null, null, { utilization: extra.utilization });
  if (windows.length === 0) return quota("no_data", now, { planType, message: "Aucune donnée de quota reçue" });
  return quota("ok", now, { planType, windows });
}

export interface ClaudeRateLimitInfo {
  rateLimitType: string | null;
  /** Ratio 0-1. */
  utilization: number | null;
  /** Unix seconds or epoch ms. */
  resetsAt: number | null;
}

const RATE_LIMIT_WINDOWS: Record<string, { id: string; kind: QuotaWindow["kind"]; model: string | null; duration: number | null }> = {
  five_hour: { id: "claude:five_hour", kind: "session", model: null, duration: SESSION_WINDOW_MINS },
  seven_day: { id: "claude:seven_day", kind: "weekly", model: null, duration: WEEKLY_WINDOW_MINS },
  seven_day_overage_included: { id: "claude:seven_day", kind: "weekly", model: null, duration: WEEKLY_WINDOW_MINS },
  seven_day_opus: { id: "claude:seven_day_opus", kind: "weekly_model", model: "Opus", duration: WEEKLY_WINDOW_MINS },
  seven_day_sonnet: { id: "claude:seven_day_sonnet", kind: "weekly_model", model: "Sonnet", duration: WEEKLY_WINDOW_MINS },
  overage: { id: "claude:extra_usage", kind: "monthly", model: null, duration: null },
};

/** Quota window carried by a session rate-limit event; null when type or utilization is missing/unknown. */
export function quotaWindowFromRateLimitEvent(info: ClaudeRateLimitInfo): QuotaWindow | null {
  if (info.rateLimitType === null || info.utilization === null) return null;
  const target = RATE_LIMIT_WINDOWS[info.rateLimitType];
  if (!target) return null;
  return {
    id: target.id,
    kind: target.kind,
    model: target.model,
    usedPercent: clampPercent(info.utilization * 100),
    windowDurationMins: target.duration,
    resetsAt: info.resetsAt === null ? null : Math.round(normalizeEpochMs(info.resetsAt)),
  };
}

/** Minimal surface of an SDK `Query` needed for the usage read. */
export interface ClaudeUsageQuery {
  usage_EXPERIMENTAL_MAY_CHANGE_DO_NOT_RELY_ON_THIS_API_YET?: (opts?: { skipBehaviors?: boolean }) => Promise<unknown>;
  close(): void;
}

export interface ClaudeUsageDependencies {
  environment: Record<string, string | undefined>;
  /** Resolved `claude` executable, without provisioning; throws or returns null when absent. */
  resolveBinary(): string | null;
  /** Start an idle SDK query whose prompt stream ends when `idle` resolves. */
  startQuery(binaryPath: string, prompt: AsyncIterable<never>): ClaudeUsageQuery;
  now?: () => number;
  timeoutMs?: number;
}

/** Read Claude subscription usage through an idle SDK query (no user message, no model turn); never throws. */
export async function readClaudeUsageLive(dependencies: ClaudeUsageDependencies): Promise<ProviderQuota> {
  const now = dependencies.now ?? Date.now;
  if (dependencies.environment.ANTHROPIC_API_KEY) {
    return quota("not_applicable", now(), { message: "Clé API Anthropic : pas de quota d'abonnement" });
  }
  let binaryPath: string | null;
  try {
    binaryPath = dependencies.resolveBinary();
  } catch (error) {
    return quota("error", now(), { message: getErrorMessage(error) });
  }
  if (!binaryPath) return quota("error", now(), { message: "Binaire claude introuvable" });

  let release: () => void = () => {};
  const idle = new Promise<void>((resolve) => {
    release = resolve;
  });
  /** Streaming input that never yields a user message and ends once the read is over. */
  const prompt: AsyncIterable<never> = {
    [Symbol.asyncIterator]: () => ({
      next: async (): Promise<IteratorResult<never>> => {
        await idle;
        return { done: true, value: undefined };
      },
    }),
  };
  let session: ClaudeUsageQuery | null = null;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeoutMs = dependencies.timeoutMs ?? QUOTA_READ_TIMEOUT_MS;
  try {
    session = dependencies.startQuery(binaryPath, prompt);
    const readUsage = session.usage_EXPERIMENTAL_MAY_CHANGE_DO_NOT_RELY_ON_THIS_API_YET;
    if (typeof readUsage !== "function") return quota("no_data", now(), { message: "get_usage indisponible" });
    // Bound the read itself so the query is closed even when the service deadline already answered.
    const deadline = new Promise<"timeout">((resolve) => {
      timer = setTimeout(() => resolve("timeout"), timeoutMs);
    });
    const raw = await Promise.race([readUsage.call(session, { skipBehaviors: true }), deadline]);
    if (raw === "timeout") return quota("timeout", now(), { message: "Délai dépassé" });
    return normalizeClaudeUsage(raw, now());
  } catch (error) {
    return quota("error", now(), { message: getErrorMessage(error) });
  } finally {
    clearTimeout(timer);
    release();
    try {
      session?.close();
    } catch {
      // Closing an already-ended query is harmless.
    }
  }
}
