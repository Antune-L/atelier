import { RefreshCw } from "lucide-react";
import { useState, type ReactNode } from "react";

import { DEFAULT_USAGE_PERIOD, DEFAULT_USAGE_SCOPE, USAGE_PERIODS, USAGE_SCOPES, usagePeriodSchema, usageScopeSchema } from "@shared/providerUsage";
import type { UsagePeriod, UsageScope } from "@shared/providerUsage";

import { CostTab } from "@/components/usage/CostTab";
import { LimitsTab } from "@/components/usage/LimitsTab";
import type { ProviderQuotaView } from "@/components/usage/LimitsTab";
import { TokensTab } from "@/components/usage/TokensTab";
import { UsageSources } from "@/components/usage/UsageSources";
import { Button } from "@/components/ui/button";
import { Tabs } from "@/components/ui/tabs";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useClaudeLogin } from "@/hooks/useClaudeLogin";
import { useProviderQuota } from "@/hooks/useProviderQuota";
import { useUsageSummary } from "@/hooks/useUsageSummary";
import { formatClock, latestObservedAt, LOCAL_AND_MAC_HISTORY_NOTE, LOCAL_HISTORY_NOTE, USAGE_PERIOD_LABELS, USAGE_PROVIDER_FILTER_OPTIONS, USAGE_SCOPE_LABELS, USAGE_TAB_OPTIONS, usageMachineSplit } from "@/lib/usageDisplay";
import type { UsageProviderFilter, UsageTab } from "@/lib/usageDisplay";
import { cn } from "@/lib/utils";

const INITIAL_QUOTA_NONCE = 0;

function toggleItems<T extends string>(values: readonly T[], labels: Record<T, string>): ReactNode {
  return values.map((value) => (
    <ToggleGroupItem key={value} value={value}>
      {labels[value]}
    </ToggleGroupItem>
  ));
}

export function UsageView(): ReactNode {
  const [tab, setTab] = useState<UsageTab>("limits");
  const [period, setPeriod] = useState<UsagePeriod>(DEFAULT_USAGE_PERIOD);
  const [filter, setFilter] = useState<UsageProviderFilter>("all");
  const [scope, setScope] = useState<UsageScope>(DEFAULT_USAGE_SCOPE);
  const [quotaNonce, setQuotaNonce] = useState(INITIAL_QUOTA_NONCE);
  const [cloudHost, setCloudHost] = useState(false);

  const claude = useProviderQuota("claude", quotaNonce);
  const codex = useProviderQuota("codex", quotaNonce);
  const usage = useUsageSummary(period, scope, tab !== "limits");
  const claudeLogin = useClaudeLogin((status) => {
    if (!status.restartRequired) setQuotaNonce((n) => n + 1);
  });
  const quotaViews = ([
    { provider: "codex", ...codex },
    { provider: "claude", ...claude },
  ] satisfies ProviderQuotaView[]).filter((view) => filter === "all" || view.provider === filter);
  const lastUpdated = tab === "limits" ? latestObservedAt(quotaViews.map((view) => view.quota)) : (usage.summary?.generatedAt ?? null);
  const refreshing = claude.loading || codex.loading || usage.loading;

  const refresh = (): void => {
    setQuotaNonce((n) => n + 1);
    if (tab !== "limits") usage.refresh();
  };

  const onPeriodChange = (value: string): void => {
    const parsed = usagePeriodSchema.safeParse(value);
    if (parsed.success) setPeriod(parsed.data);
  };

  const onScopeChange = (value: string): void => {
    const parsed = usageScopeSchema.safeParse(value);
    if (parsed.success) setScope(parsed.data);
  };
  if (!cloudHost && usage.summary?.machines !== undefined) setCloudHost(true);

  const renderSummaryTab = (): ReactNode => {
    const errorAlert = usage.error !== null && <p role="alert" className="text-sm text-danger">{usage.error}</p>;
    if (usage.summary === null) return errorAlert || <p className="text-sm text-muted-foreground">Chargement…</p>;
    const coverage = usage.summary.historyCoverage;
    const partialHistory = coverage !== undefined && coverage.failedFiles + coverage.failedRoots > 0;
    const { machines } = usage.summary;
    const historyNote = usageMachineSplit(usage.summary) === null ? LOCAL_HISTORY_NOTE : LOCAL_AND_MAC_HISTORY_NOTE;
    return (
      <div className="flex flex-col gap-3">
        {errorAlert}
        {machines !== undefined && <UsageSources machines={machines} now={usage.summary.generatedAt} />}
        {tab === "cost" ? <CostTab summary={usage.summary} filter={filter} /> : <TokensTab summary={usage.summary} filter={filter} />}
        {partialHistory && <p role="status" className="text-sm text-warning">Historique local partiel : certains fichiers ou dossiers n’ont pas pu être lus, ou dépassent les limites de lecture. Les totaux affichés sont incomplets.</p>}
        <p className="text-xs text-muted-foreground">{historyNote}</p>
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
        <Button variant="ghost" size="icon" aria-label="Actualiser la consommation" title="Actualiser la consommation" disabled={refreshing} onClick={refresh}>
          <RefreshCw aria-hidden="true" className={cn("size-4", refreshing && "motion-safe:animate-spin")} />
        </Button>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <Tabs options={USAGE_PROVIDER_FILTER_OPTIONS} value={filter} onChange={setFilter} aria-label="Fournisseur" />
          <Tabs options={USAGE_TAB_OPTIONS} value={tab} onChange={setTab} aria-label="Vue de la consommation" />
        </div>
        <div className="ml-auto flex shrink-0 flex-wrap items-center gap-3">
          {cloudHost && tab !== "limits" && (
            <ToggleGroup type="single" value={scope} onValueChange={onScopeChange} aria-label="Machines" variant="outline" size="sm">
              {toggleItems(USAGE_SCOPES, USAGE_SCOPE_LABELS)}
            </ToggleGroup>
          )}
          <ToggleGroup
            type="single"
            value={period}
            onValueChange={onPeriodChange}
            aria-label="Période"
            aria-hidden={tab === "limits"}
            disabled={tab === "limits"}
            variant="outline"
            size="sm"
            className={cn(tab === "limits" && "invisible")}
          >
            {toggleItems(USAGE_PERIODS, USAGE_PERIOD_LABELS)}
          </ToggleGroup>
        </div>
      </div>
      {tab === "limits" ? (
        <LimitsTab providers={quotaViews} claudeLogin={claudeLogin} />
      ) : (
        renderSummaryTab()
      )}
    </div>
  );
}
