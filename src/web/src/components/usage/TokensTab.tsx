import type { ReactNode } from "react";

import type { UsageSummary } from "@shared/providerUsage";

import { StatCard } from "@/components/stats/StatCard";
import { DailyBars, DayTable, EMPTY_USAGE_MESSAGE, ModelTable, ShareRows } from "@/components/usage/UsageBreakdown";
import { formatTokens, formatUsd } from "@/lib/display";
import { filteredProviders, mergeDaily, QUOTA_PROVIDER_LABELS, sessionCountText } from "@/lib/usageDisplay";
import type { UsageProviderFilter } from "@/lib/usageDisplay";

/** "Tokens" tab: processed tokens of the selected providers, per type, day and model. */
export function TokensTab({ summary, filter }: { summary: UsageSummary; filter: UsageProviderFilter }): ReactNode {
  const providers = filteredProviders(filter);
  const usages = providers.map((provider) => summary.providers[provider]);
  if (!usages.some((usage) => usage.hasUsage)) return <p className="text-sm text-muted-foreground">{EMPTY_USAGE_MESSAGE}</p>;
  const sum = (pick: (usage: (typeof usages)[number]) => number): number => usages.reduce((total, usage) => total + pick(usage), 0);
  const days = mergeDaily(usages);
  const models = usages.flatMap((usage) => usage.models).sort((a, b) => b.totalTokens - a.totalTokens);

  return (
    <div className="flex flex-col gap-4">
      <StatCard title="Tokens traités">
        <span className="text-2xl font-semibold tabular-nums">{formatTokens(sum((usage) => usage.totals.processed))}</span>
        <ul className="flex flex-col gap-1 text-sm">
          {providers.map((provider) => (
            <li key={provider} className="flex justify-between gap-2">
              <span>{QUOTA_PROVIDER_LABELS[provider]}</span>
              <span className="tabular-nums text-muted-foreground">
                {formatTokens(summary.providers[provider].totals.processed)} · {sessionCountText(summary.providers[provider].sessionCount)}
              </span>
            </li>
          ))}
        </ul>
        <p className="text-xs text-muted-foreground">Économie de cache : {formatUsd(sum((usage) => usage.cacheSavingsUsd))}</p>
      </StatCard>
      <StatCard title="Tokens par jour">
        <DailyBars days={days} value={(day) => day.totalTokens} format={formatTokens} label="Tokens par jour" />
      </StatCard>
      <StatCard title="Totaux">
        <ShareRows
          rows={[
            { key: "inputCached", label: "Input en cache", value: sum((usage) => usage.totals.inputCached) },
            { key: "inputUncached", label: "Input hors cache", value: sum((usage) => usage.totals.inputUncached) },
            { key: "cacheCreate", label: "Écriture du cache", value: sum((usage) => usage.totals.cacheCreate) },
            { key: "output", label: "Output", value: sum((usage) => usage.totals.output) },
          ]}
          format={formatTokens}
        />
      </StatCard>
      <StatCard title="Détail par modèle">
        <ModelTable models={models} />
      </StatCard>
      <StatCard title="Détail par jour">
        <DayTable days={days} />
      </StatCard>
    </div>
  );
}
