import { RefreshCw } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";

import { DEFAULT_USAGE_PERIOD, USAGE_PERIODS, usagePeriodSchema } from "@shared/providerUsage";
import type { UsagePeriod } from "@shared/providerUsage";

import { CostTab } from "@/components/usage/CostTab";
import { LimitsTab } from "@/components/usage/LimitsTab";
import type { ProviderQuotaView } from "@/components/usage/LimitsTab";
import { TokensTab } from "@/components/usage/TokensTab";
import { Button } from "@/components/ui/button";
import { Tabs } from "@/components/ui/tabs";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useClaudeLogin } from "@/hooks/useClaudeLogin";
import { useProviderQuota } from "@/hooks/useProviderQuota";
import { useUsageSummary } from "@/hooks/useUsageSummary";
import { formatClock, LOCAL_HISTORY_NOTE, USAGE_PERIOD_LABELS, USAGE_PROVIDER_FILTER_OPTIONS, USAGE_TAB_OPTIONS } from "@/lib/usageDisplay";
import type { UsageProviderFilter, UsageTab } from "@/lib/usageDisplay";
import { cn } from "@/lib/utils";

export function UsageView(): ReactNode {
  const [tab, setTab] = useState<UsageTab>("limits");
  const [period, setPeriod] = useState<UsagePeriod>(DEFAULT_USAGE_PERIOD);
  const [filter, setFilter] = useState<UsageProviderFilter>("all");
  const [nonce, setNonce] = useState(0);
  const [claudeNonce, setClaudeNonce] = useState(0);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);

  const claude = useProviderQuota("claude", nonce + claudeNonce);
  const codex = useProviderQuota("codex", nonce);
  const usage = useUsageSummary(period, nonce);
  const claudeLogin = useClaudeLogin((status) => {
    if (!status.restartRequired) setClaudeNonce((n) => n + 1);
  });
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
    const coverage = usage.summary.historyCoverage;
    const partialHistory = coverage !== undefined && coverage.failedFiles + coverage.failedRoots > 0;
    return (
      <div className="flex flex-col gap-3">
        {tab === "cost" ? <CostTab summary={usage.summary} filter={filter} /> : <TokensTab summary={usage.summary} filter={filter} />}
        {partialHistory && <p role="status" className="text-sm text-warning">Historique local partiel : certains fichiers ou dossiers n’ont pas pu être lus, ou dépassent les limites de lecture. Les totaux affichés sont incomplets.</p>}
        <p className="text-xs text-muted-foreground">{LOCAL_HISTORY_NOTE}</p>
      </div>
    );
  };

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-7 px-4 py-5 sm:px-8 sm:py-7">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">Consommation</h2>
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
        <div className="flex flex-wrap items-center gap-3">
          <Tabs options={USAGE_PROVIDER_FILTER_OPTIONS} value={filter} onChange={setFilter} aria-label="Fournisseur" />
          <Tabs options={USAGE_TAB_OPTIONS} value={tab} onChange={setTab} aria-label="Vue de la consommation" />
        </div>
        <ToggleGroup
          type="single"
          value={period}
          onValueChange={onPeriodChange}
          aria-label="Période"
          aria-hidden={tab === "limits"}
          disabled={tab === "limits"}
          variant="outline"
          size="sm"
          className={cn("ml-auto shrink-0", tab === "limits" && "invisible")}
        >
          {USAGE_PERIODS.map((value) => (
            <ToggleGroupItem key={value} value={value}>
              {USAGE_PERIOD_LABELS[value]}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>
      {tab === "limits" ? (
        <LimitsTab
          providers={([
            { provider: "codex", ...codex },
            { provider: "claude", ...claude },
          ] satisfies ProviderQuotaView[]).filter((view) => filter === "all" || view.provider === filter)}
          claudeLogin={claudeLogin}
        />
      ) : (
        renderSummaryTab()
      )}
    </div>
  );
}
