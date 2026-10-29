import type { ReactNode } from "react";

import type { UsageSummary } from "@shared/providerUsage";

import { ShareRows, UsageDetails } from "@/components/usage/UsageBreakdown";
import { UsageSummaryPanel } from "@/components/usage/UsageSummaryPanel";
import { filteredProviders, formatCompactTokens, mergeDaily } from "@/lib/usageDisplay";
import type { UsageProviderFilter } from "@/lib/usageDisplay";

export function TokensTab({ summary, filter }: {
  summary: UsageSummary;
  filter: UsageProviderFilter;
}): ReactNode {
  const usages = filteredProviders(filter).map((provider) => summary.providers[provider]);
  const sum = (pick: (usage: (typeof usages)[number]) => number) => usages.reduce((total, usage) => total + pick(usage), 0);
  return (<div className="space-y-5">
    <UsageSummaryPanel summary={summary} filter={filter} metric="tokens" />
    <section className="rounded-xl border bg-card p-5">
      <h3 className="mb-4 text-sm font-medium">Répartition des tokens</h3>
      <ShareRows rows={[{ key: "inputCached", label: "Entrée en cache", value: sum((usage) => usage.totals.inputCached) }, { key: "inputUncached", label: "Entrée hors cache", value: sum((usage) => usage.totals.inputUncached) }, { key: "cacheCreate", label: "Écriture du cache", value: sum((usage) => usage.totals.cacheCreate) }, { key: "output", label: "Sortie", value: sum((usage) => usage.totals.output) }]} format={formatCompactTokens} />
    </section>
    <UsageDetails models={usages.flatMap((usage) => usage.models)} days={mergeDaily(usages)} metric="tokens" />
  </div>);
}
