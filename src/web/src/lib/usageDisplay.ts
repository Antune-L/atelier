import type { ProviderQuota, QuotaProvider, QuotaWindow, QuotaWindowPace } from "@shared/providerQuota";
import type { DailyUsage, ProviderUsage, UsagePeriod } from "@shared/providerUsage";

import type { TabOption } from "@/components/ui/tabs";

const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;
const USAGE_USD_FORMATTER = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const COMPACT_TOKEN_FORMATTER = new Intl.NumberFormat("fr-FR", {
  notation: "compact",
  maximumFractionDigits: 2,
});

export function formatUsageUsd(value: number): string {
  return USAGE_USD_FORMATTER.format(value);
}

export function formatCompactTokens(value: number): string {
  return COMPACT_TOKEN_FORMATTER.format(value);
}

export const QUOTA_PROVIDER_LABELS: Record<QuotaProvider, string> = { claude: "Claude", codex: "Codex" };

export const USAGE_PERIOD_LABELS: Record<UsagePeriod, string> = { "24h": "24 h", "7d": "7 j", "30d": "30 j", "90d": "90 j" };

export type UsageProviderFilter = "all" | QuotaProvider;

export const USAGE_PROVIDER_FILTER_OPTIONS: TabOption<UsageProviderFilter>[] = [
  { value: "all", label: "Tous" },
  { value: "claude", label: "Claude" },
  { value: "codex", label: "Codex" },
];

/** Providers shown for a filter, in display order. */
export function filteredProviders(filter: UsageProviderFilter): QuotaProvider[] {
  return filter === "all" ? ["claude", "codex"] : [filter];
}

export const LOCAL_HISTORY_NOTE = "Sessions Atelier et historiques disponibles sur ce serveur, y compris hors Atelier. Les autres machines, le web et le mobile ne sont pas inclus. Les coûts estimés aux tarifs API ne représentent pas la facture de l’abonnement.";

export const QUOTA_ACCOUNT_NOTE = "Quotas des comptes connectés : ils incluent l’usage hors Atelier et sur les autres appareils pour les limites partagées par le fournisseur. Chaque fenêtre correspond à une période de l’abonnement, pas à un ticket Atelier.";

export const OAUTH_TOKEN_ENV_WARNING =
  "CLAUDE_CODE_OAUTH_TOKEN est défini : il passe probablement avant la session et masque les limites ; commente-le dans /etc/kanban/kanban.env puis redémarre le service.";

/** Cost of a row, never "$0" for unpriced usage. */
export function formatCostOrUnpriced(costUsd: number | null, format: (value: number) => string): string {
  return costUsd === null ? "non tarifé" : format(costUsd);
}

/** States in which the last known windows (session event or cache) are still worth showing. */
export function showsLastKnownWindows(quota: ProviderQuota): boolean {
  return quota.state === "token_without_limits" || quota.state === "error" || quota.state === "timeout" || quota.state === "no_data";
}

/** "il y a 12 min · session" for windows that are not a fresh live read; null otherwise. */
export function quotaAgeText(quota: ProviderQuota, now: number): string | null {
  if (quota.observedAt === null || quota.source === null || quota.source === "live") return null;
  return `${formatAgo(quota.observedAt, now)} · ${quota.source === "session" ? "session" : "cache"}`;
}

const DAY_FORMATTER = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", timeZone: "UTC" });

/** UTC `YYYY-MM-DD` as a short French day label ("12 oct."). */
export function formatDayLabel(date: string): string {
  const ms = Date.parse(`${date}T00:00:00Z`);
  return Number.isFinite(ms) ? DAY_FORMATTER.format(new Date(ms)) : date;
}

/** Per-day totals summed across providers, sorted by date. */
export function mergeDaily(usages: ProviderUsage[]): DailyUsage[] {
  const days = new Map<string, DailyUsage>();
  for (const usage of usages) {
    for (const day of usage.daily) {
      const merged = days.get(day.date) ?? { date: day.date, costUsd: 0, unpricedTokens: 0, totalTokens: 0 };
      merged.costUsd += day.costUsd;
      merged.unpricedTokens += day.unpricedTokens;
      merged.totalTokens += day.totalTokens;
      days.set(day.date, merged);
    }
  }
  return [...days.values()].sort((a, b) => a.date.localeCompare(b.date));
}

export function sessionCountText(count: number): string {
  return `${count} session${count > 1 ? "s" : ""}`;
}

export type UsageTab = "limits" | "cost" | "tokens";

export const USAGE_TAB_OPTIONS: TabOption<UsageTab>[] = [
  { value: "limits", label: "Limites" },
  { value: "cost", label: "Coût" },
  { value: "tokens", label: "Tokens" },
];

/** Neutral (non-error) messages shown instead of windows, per state. */
export function quotaStateMessage(quota: ProviderQuota): string | null {
  switch (quota.state) {
    case "ok":
      return null;
    case "not_applicable":
      return quota.provider === "claude"
        ? "Les limites d'abonnement ne s'appliquent pas (authentification par clé API)."
        : "Non disponible pour ce type de compte.";
    case "no_data":
      return "Aucune donnée de quota reçue.";
    case "unauthenticated":
      return "Connexion requise.";
    case "token_without_limits":
      return "Le jeton configuré lance les agents mais ne permet pas de lire les limites d'abonnement : reconnecte Claude.";
    case "timeout":
      return "Délai dépassé.";
    case "error":
      return quota.message ?? "Échec de la lecture du quota.";
  }
}

export function quotaWindowLabel(window: QuotaWindow): string {
  switch (window.kind) {
    case "session":
      return "Session";
    case "weekly":
      return "Hebdomadaire";
    case "weekly_model":
      return window.model === null ? "Hebdomadaire" : `Hebdomadaire · ${window.model}`;
    case "monthly":
      return "Mensuel";
    case "credit":
      return "Crédit mensuel";
  }
}

export function formatPercent(value: number): string {
  return `${Math.round(value)} %`;
}

export function paceText(pace: QuotaWindowPace): string {
  return pace.ahead ? "en avance" : "dans le rythme";
}

/** Two-unit remaining time: "2 h 14 min", "3 j 4 h", "5 min". */
export function formatRemaining(ms: number): string {
  const safe = Math.max(0, ms);
  if (safe < HOUR_MS) return `${Math.max(1, Math.ceil(safe / MINUTE_MS))} min`;
  if (safe < DAY_MS) {
    const hours = Math.floor(safe / HOUR_MS);
    const minutes = Math.floor((safe % HOUR_MS) / MINUTE_MS);
    return minutes > 0 ? `${hours} h ${minutes} min` : `${hours} h`;
  }
  const days = Math.floor(safe / DAY_MS);
  const hours = Math.floor((safe % DAY_MS) / HOUR_MS);
  return hours > 0 ? `${days} j ${hours} h` : `${days} j`;
}

export function resetCountdownText(resetsAt: number, now: number): string {
  return `Réinitialisation dans ${formatRemaining(resetsAt - now)}`;
}

const RESET_FORMATTER = new Intl.DateTimeFormat("fr-FR", { dateStyle: "full", timeStyle: "short" });

export function formatResetDate(resetsAt: number): string {
  return RESET_FORMATTER.format(new Date(resetsAt));
}

/** "à l'instant", "il y a 12 min", "il y a 3 h", "il y a 2 j". */
export function formatAgo(timestamp: number, now: number): string {
  const delta = now - timestamp;
  if (delta < MINUTE_MS) return "à l'instant";
  if (delta < HOUR_MS) return `il y a ${Math.floor(delta / MINUTE_MS)} min`;
  if (delta < DAY_MS) return `il y a ${Math.floor(delta / HOUR_MS)} h`;
  return `il y a ${Math.floor(delta / DAY_MS)} j`;
}

/** Bar color escalating as usage nears the limit. */
export function usageBarClass(usedPercent: number): string {
  if (usedPercent >= 90) return "bg-danger";
  if (usedPercent >= 75) return "bg-warning";
  return "bg-info";
}

/** Share of `part` in `total` as a percentage, 0 when total is 0. */
export function sharePercent(part: number, total: number): number {
  return total > 0 ? (part / total) * 100 : 0;
}

export function timeoutQuota(provider: QuotaProvider): ProviderQuota {
  return { provider, state: "timeout", source: null, observedAt: null, planType: null, windows: [], message: null };
}

const CLOCK_FORMATTER = new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });

export function formatClock(ms: number): string {
  return CLOCK_FORMATTER.format(new Date(ms));
}
