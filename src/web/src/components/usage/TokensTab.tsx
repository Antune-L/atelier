import type { ReactNode } from "react";

import type { QuotaProvider } from "@shared/providerQuota";
import type { ProviderUsage, UsageSummary } from "@shared/providerUsage";

import { StatCard } from "@/components/stats/StatCard";
import { EMPTY_USAGE_MESSAGE, TypeBreakdown, usageModelLabel } from "@/components/usage/UsageBreakdown";
import { formatTokens } from "@/lib/display";
import { QUOTA_PROVIDER_LABELS } from "@/lib/usageDisplay";

const PROVIDERS: QuotaProvider[] = ["claude", "codex"];

function ProviderTokensCard({ provider, usage }: { provider: QuotaProvider; usage: ProviderUsage }): ReactNode {
  const models = [...usage.models].sort((a, b) => b.totalTokens - a.totalTokens);
  return (
    <StatCard title={QUOTA_PROVIDER_LABELS[provider]}>
      <span className="text-2xl font-semibold tabular-nums">{formatTokens(usage.totalTokens)}</span>
      <TypeBreakdown values={usage.tokens} format={formatTokens} />
      <ul className="flex flex-col gap-1 border-t pt-3 text-sm">
        {models.map((row) => (
          <li key={`${row.model}-${row.fast ? "fast" : "std"}`} className="flex justify-between gap-2">
            <span className="truncate">{usageModelLabel(row)}</span>
            <span className="tabular-nums text-muted-foreground">{formatTokens(row.totalTokens)}</span>
          </li>
        ))}
      </ul>
    </StatCard>
  );
}

/** "Tokens" tab: token totals per provider, type and model. */
export function TokensTab({ summary }: { summary: UsageSummary }): ReactNode {
  const used = PROVIDERS.filter((provider) => summary.providers[provider].hasUsage);
  if (used.length === 0) return <p className="text-sm text-muted-foreground">{EMPTY_USAGE_MESSAGE}</p>;
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {PROVIDERS.map((provider) =>
        summary.providers[provider].hasUsage ? (
          <ProviderTokensCard key={provider} provider={provider} usage={summary.providers[provider]} />
        ) : (
          <StatCard key={provider} title={QUOTA_PROVIDER_LABELS[provider]}>
            <p className="text-sm text-muted-foreground">{EMPTY_USAGE_MESSAGE}</p>
          </StatCard>
        ),
      )}
    </div>
  );
}
