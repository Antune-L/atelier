import type { ProviderQuota, QuotaProvider, QuotaWindow, QuotaWindowPace } from "@shared/providerQuota";
import type { UsagePeriod } from "@shared/providerUsage";

import type { TabOption } from "@/components/ui/tabs";

const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;

export const QUOTA_PROVIDER_LABELS: Record<QuotaProvider, string> = { claude: "Claude", codex: "Codex" };

export const USAGE_PERIOD_LABELS: Record<UsagePeriod, string> = { "7d": "7 j", "30d": "30 j", all: "Tout" };

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
