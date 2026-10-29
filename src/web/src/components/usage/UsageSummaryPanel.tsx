import type { ReactNode } from "react";

import type { UsageSummary } from "@shared/providerUsage";

import { Badge } from "@/components/ui/badge";
import { DailyUsageChart } from "@/components/usage/DailyUsageChart";
import { ProviderLogo } from "@/components/usage/ProviderLogo";
import { formatCompactTokens, formatPercent, formatUsageUsd, filteredProviders, QUOTA_PROVIDER_LABELS, sessionCountText, sharePercent } from "@/lib/usageDisplay";
import type { UsageProviderFilter } from "@/lib/usageDisplay";

export type UsageMetric = "cost" | "tokens";
export function UsageSummaryPanel({ summary, filter, metric }: {
  summary: UsageSummary;
  filter: UsageProviderFilter;
  metric: UsageMetric;
}): ReactNode {
  const providers = filteredProviders(filter);
  const usages = providers.map((provider) => summary.providers[provider]);
  const valueOf = (provider: (typeof providers)[number]) => metric === "cost" ? summary.providers[provider].costUsd : summary.providers[provider].totals.processed;
  const total = providers.reduce((sum, provider) => sum + valueOf(provider), 0);
  const format = metric === "cost" ? formatUsageUsd : formatCompactTokens;
  const savings = usages.reduce((sum, usage) => sum + usage.cacheSavingsUsd, 0);
  const unpriced = usages.reduce((sum, usage) => sum + usage.unpricedTokens, 0);
  return (<section className="overflow-hidden" aria-label={metric === "cost" ? "Coût estimé" : "Tokens traités"}>
    <div className="flex flex-col lg:flex-row">
      <div className="flex flex-col gap-6 p-6 lg:w-72 lg:shrink-0">
        <div>
          <div className="mb-2 flex items-center gap-2 text-xs text-muted-foreground">
            <span>{metric === "cost" ? "Coût estimé · prix API" : "Tokens traités"}</span>
            {metric === "cost" && usages.some((usage) => usage.partial) && <Badge variant="warning" title="Certains tokens ne sont pas tarifés : le total est un minimum.">partiel</Badge>}
          </div>
          <p className="text-4xl font-semibold tracking-tight tabular-nums" title={metric === "cost" ? formatUsageUsd(total) : String(total)}>{format(total)}</p>
        </div>
        <ul className="space-y-4">
          {providers.map((provider) => (<li key={provider} className="space-y-1 text-sm">
            <div className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-2">
                <ProviderLogo provider={provider} />{QUOTA_PROVIDER_LABELS[provider]}</span>
              <span className="font-medium tabular-nums">{format(valueOf(provider))}</span>
            </div>
            <div className="flex justify-between pl-6 text-xs text-muted-foreground">
              <span>{sessionCountText(summary.providers[provider].sessionCount)}</span>
              <span>{formatPercent(sharePercent(valueOf(provider), total))}</span>
            </div>
          </li>))}
        </ul>
      </div>
      <div className="min-w-0 flex-1 p-4 sm:p-6">
        <DailyUsageChart summary={summary} provider={filter} metric={metric} />
      </div>
    </div>
    <div className="flex flex-wrap gap-x-8 gap-y-3 border-y py-3">
      {[{ label: "Tokens traités", value: formatCompactTokens(usages.reduce((sum, usage) => sum + usage.totals.processed, 0)) }, { label: "Entrée en cache", value: formatCompactTokens(usages.reduce((sum, usage) => sum + usage.totals.inputCached, 0)) }, { label: "Entrée hors cache", value: formatCompactTokens(usages.reduce((sum, usage) => sum + usage.totals.inputUncached, 0)) }, { label: "Sortie", value: formatCompactTokens(usages.reduce((sum, usage) => sum + usage.totals.output, 0)) }, { label: "Économie de cache", value: formatUsageUsd(savings) }].map((item) => <div key={item.label} className="px-4">
        <p className="text-xs text-muted-foreground">{item.label}</p>
        <p className="mt-1 text-sm font-medium tabular-nums">{item.value}</p>
      </div>)}
    </div>
    {unpriced > 0 && <p className="px-4 pt-2 text-xs text-muted-foreground">{formatCompactTokens(unpriced)} tokens non tarifés ; le coût affiché est un minimum.</p>}
  </section>);
}
