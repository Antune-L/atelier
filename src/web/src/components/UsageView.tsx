import { RefreshCw } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";

import { DEFAULT_USAGE_PERIOD, USAGE_PERIODS, usagePeriodSchema } from "@shared/providerUsage";
import type { UsagePeriod } from "@shared/providerUsage";

import { CostTab } from "@/components/usage/CostTab";
import { LimitsTab } from "@/components/usage/LimitsTab";
import { TokensTab } from "@/components/usage/TokensTab";
import { Button } from "@/components/ui/button";
import { Tabs } from "@/components/ui/tabs";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useProviderQuota } from "@/hooks/useProviderQuota";
import { useUsageSummary } from "@/hooks/useUsageSummary";
import { formatClock, USAGE_PERIOD_LABELS, USAGE_TAB_OPTIONS } from "@/lib/usageDisplay";
import type { UsageTab } from "@/lib/usageDisplay";
import { cn } from "@/lib/utils";

/** "Consommation" page: subscription limits plus indicative cost and tokens per provider. */
export function UsageView(): ReactNode {
  const [tab, setTab] = useState<UsageTab>("limits");
  const [period, setPeriod] = useState<UsagePeriod>(DEFAULT_USAGE_PERIOD);
  const [nonce, setNonce] = useState(0);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);

  const claude = useProviderQuota("claude", nonce);
  const codex = useProviderQuota("codex", nonce);
  const usage = useUsageSummary(period, nonce);
  const loading = claude.loading || codex.loading || usage.loading;

  useEffect(() => {
    if (!loading) setLastUpdated(Date.now());
  }, [loading]);

  const onPeriodChange = (value: string): void => {
    const parsed = usagePeriodSchema.safeParse(value);
    if (parsed.success) setPeriod(parsed.data);
  };

  const renderSummaryTab = (): ReactNode => {
    if (usage.error !== null) return <p role="alert" className="text-sm text-danger">{usage.error}</p>;
    if (usage.summary === null) return <p className="text-sm text-muted-foreground">Chargement…</p>;
    return tab === "cost" ? <CostTab summary={usage.summary} /> : <TokensTab summary={usage.summary} />;
  };

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-card p-4">
        <div>
          <h2 className="text-lg font-semibold">Consommation</h2>
          <p className="text-xs text-muted-foreground">
            Dernière mise à jour : {lastUpdated === null ? "—" : formatClock(lastUpdated)}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => setNonce((n) => n + 1)} disabled={loading} aria-label="Recharger la consommation">
          <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
          Recharger
        </Button>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Tabs options={USAGE_TAB_OPTIONS} value={tab} onChange={setTab} aria-label="Vue de la consommation" />
        {tab !== "limits" && (
          <ToggleGroup type="single" value={period} onValueChange={onPeriodChange} aria-label="Période" variant="outline" size="sm">
            {USAGE_PERIODS.map((value) => (
              <ToggleGroupItem key={value} value={value}>
                {USAGE_PERIOD_LABELS[value]}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        )}
      </div>
      {tab === "limits" ? (
        <LimitsTab
          providers={[
            { provider: "claude", ...claude },
            { provider: "codex", ...codex },
          ]}
        />
      ) : (
        renderSummaryTab()
      )}
    </div>
  );
}
