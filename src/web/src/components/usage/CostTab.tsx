import type { ReactNode } from "react";

import type { QuotaProvider } from "@shared/providerQuota";
import type { ProviderUsage, UsageSummary } from "@shared/providerUsage";

import { StatCard } from "@/components/stats/StatCard";
import { Badge } from "@/components/ui/badge";
import { EMPTY_USAGE_MESSAGE, TypeBreakdown, usageModelLabel } from "@/components/usage/UsageBreakdown";
import { formatUsd } from "@/lib/display";
import { QUOTA_PROVIDER_LABELS } from "@/lib/usageDisplay";

const PROVIDERS: QuotaProvider[] = ["claude", "codex"];

function ProviderCostCard({ provider, usage }: { provider: QuotaProvider; usage: ProviderUsage }): ReactNode {
  return (
    <StatCard title={QUOTA_PROVIDER_LABELS[provider]} description="Estimation au prix de l'API">
      {!usage.hasUsage ? (
        <p className="text-sm text-muted-foreground">{EMPTY_USAGE_MESSAGE}</p>
      ) : (
        <>
          <div className="flex items-center gap-2">
            <span className="text-2xl font-semibold tabular-nums">{formatUsd(usage.costUsd)}</span>
            {usage.partial && (
              <Badge variant="warning" title="Certains modèles ne sont pas tarifés : le total est un minimum.">
                partiel
              </Badge>
            )}
          </div>
          <TypeBreakdown values={usage.costByType} format={formatUsd} />
          <ul className="flex flex-col gap-1 border-t pt-3 text-sm">
            {usage.models.map((row) => (
              <li key={`${row.model}-${row.fast ? "fast" : "std"}`} className="flex justify-between gap-2">
                <span className="truncate">{usageModelLabel(row)}</span>
                <span className="tabular-nums text-muted-foreground">{row.costUsd === null ? "non tarifé" : formatUsd(row.costUsd)}</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </StatCard>
  );
}

/** "Coût" tab: indicative API-price cost per provider, as computed by the server. */
export function CostTab({ summary }: { summary: UsageSummary }): ReactNode {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {PROVIDERS.map((provider) => (
        <ProviderCostCard key={provider} provider={provider} usage={summary.providers[provider]} />
      ))}
    </div>
  );
}
