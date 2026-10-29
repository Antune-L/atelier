import type { ReactNode } from "react";

import type { UsageSummary } from "@shared/providerUsage";

import { ShareRows, TypeBreakdown, UsageDetails } from "@/components/usage/UsageBreakdown";
import { UsageSummaryPanel } from "@/components/usage/UsageSummaryPanel";
import { filteredProviders, formatCompactTokens, formatUsageUsd, mergeDaily } from "@/lib/usageDisplay";
import type { UsageProviderFilter } from "@/lib/usageDisplay";

export function CostTab({ summary, filter }: {
  summary: UsageSummary;
  filter: UsageProviderFilter;
}): ReactNode {
  const usages = filteredProviders(filter).map((provider) => summary.providers[provider]);
  const costByType = usages.reduce((sum, usage) => ({ input: sum.input + usage.costByType.input, output: sum.output + usage.costByType.output, cacheRead: sum.cacheRead + usage.costByType.cacheRead, cacheCreate: sum.cacheCreate + usage.costByType.cacheCreate }), { input: 0, output: 0, cacheRead: 0, cacheCreate: 0 });
  const speeds = ["standard", "fast"] satisfies ("standard" | "fast")[];
  const rows = speeds.map((key) => {
    const unpriced = usages.reduce((sum, usage) => sum + usage.costBySpeed[key].unpricedTokens, 0);
    return { key, label: key === "standard" ? "Standard" : "Rapide", value: usages.reduce((sum, usage) => sum + usage.costBySpeed[key].costUsd, 0), note: unpriced > 0 ? `${formatCompactTokens(unpriced)} tokens non tarifés` : undefined };
  });
  return (<div className="space-y-5">
    <UsageSummaryPanel summary={summary} filter={filter} metric="cost" />
    <div className="grid gap-5 md:grid-cols-2">
      <section className="rounded-xl border bg-card p-5">
        <h3 className="mb-4 text-sm font-medium">Coût par type</h3>
        <TypeBreakdown values={costByType} format={formatUsageUsd} />
      </section>
      <section className="rounded-xl border bg-card p-5">
        <h3 className="mb-4 text-sm font-medium">Coût par vitesse</h3>
        <ShareRows rows={rows} format={formatUsageUsd} />
      </section>
    </div>
    <UsageDetails models={usages.flatMap((usage) => usage.models)} days={mergeDaily(usages)} metric="cost" />
  </div>);
}
