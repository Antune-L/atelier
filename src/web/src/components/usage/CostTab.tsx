import type { ReactNode } from "react";

import type { UsageSummary } from "@shared/providerUsage";

import { StatCard } from "@/components/stats/StatCard";
import { Badge } from "@/components/ui/badge";
import { DailyBars, DayTable, ModelTable, ShareRows, TypeBreakdown } from "@/components/usage/UsageBreakdown";
import { formatTokens, formatUsd } from "@/lib/display";
import { filteredProviders, mergeDaily, QUOTA_PROVIDER_LABELS, sessionCountText } from "@/lib/usageDisplay";
import type { UsageProviderFilter } from "@/lib/usageDisplay";

/** "Coût" tab: indicative API-price cost of the selected providers, as computed by the server. */
export function CostTab({ summary, filter }: { summary: UsageSummary; filter: UsageProviderFilter }): ReactNode {
  const providers = filteredProviders(filter);
  const usages = providers.map((provider) => summary.providers[provider]);
  const total = usages.reduce((sum, usage) => sum + usage.costUsd, 0);
  const partial = usages.some((usage) => usage.partial);
  const days = mergeDaily(usages);
  const costByType = usages.reduce(
    (sum, usage) => ({
      input: sum.input + usage.costByType.input,
      output: sum.output + usage.costByType.output,
      cacheRead: sum.cacheRead + usage.costByType.cacheRead,
      cacheCreate: sum.cacheCreate + usage.costByType.cacheCreate,
    }),
    { input: 0, output: 0, cacheRead: 0, cacheCreate: 0 },
  );
  const speed = (key: "standard" | "fast") => ({
    costUsd: usages.reduce((sum, usage) => sum + usage.costBySpeed[key].costUsd, 0),
    unpricedTokens: usages.reduce((sum, usage) => sum + usage.costBySpeed[key].unpricedTokens, 0),
  });
  const standard = speed("standard");
  const fast = speed("fast");
  const unpricedNote = (tokens: number): string | undefined => (tokens > 0 ? `${formatTokens(tokens)} tokens non tarifés` : undefined);
  const models = usages.flatMap((usage) => usage.models);
  const savings = usages.reduce((sum, usage) => sum + usage.cacheSavingsUsd, 0);

  return (
    <div className="flex flex-col gap-4">
      <StatCard title="Coût estimé" description="Estimation au prix de l'API">
        <div className="flex items-center gap-2">
          <span className="text-2xl font-semibold tabular-nums">{formatUsd(total)}</span>
          {partial && (
            <Badge variant="warning" title="Certains modèles ne sont pas tarifés : le total est un minimum.">
              partiel
            </Badge>
          )}
        </div>
        <ul className="flex flex-col gap-1 text-sm">
          {providers.map((provider) => (
            <li key={provider} className="flex justify-between gap-2">
              <span>{QUOTA_PROVIDER_LABELS[provider]}</span>
              <span className="tabular-nums text-muted-foreground">
                {formatUsd(summary.providers[provider].costUsd)} · {sessionCountText(summary.providers[provider].sessionCount)}
              </span>
            </li>
          ))}
        </ul>
        <p className="text-xs text-muted-foreground">Économie de cache : {formatUsd(savings)}</p>
      </StatCard>
      <StatCard title="Coût par jour">
        <DailyBars days={days} value={(day) => day.costUsd} format={formatUsd} label="Coût par jour" />
      </StatCard>
      <div className="grid gap-4 md:grid-cols-2">
        <StatCard title="Coût par type">
          <TypeBreakdown values={costByType} format={formatUsd} />
        </StatCard>
        <StatCard title="Coût par vitesse">
          <ShareRows
            rows={[
              { key: "standard", label: "Standard", value: standard.costUsd, note: unpricedNote(standard.unpricedTokens) },
              { key: "fast", label: "Rapide", value: fast.costUsd, note: unpricedNote(fast.unpricedTokens) },
            ]}
            format={formatUsd}
          />
        </StatCard>
      </div>
      <StatCard title="Détail par modèle">
        <ModelTable models={models} />
      </StatCard>
      <StatCard title="Détail par jour">
        <DayTable days={days} />
      </StatCard>
    </div>
  );
}
