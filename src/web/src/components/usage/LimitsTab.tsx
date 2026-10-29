import { Loader2 } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";

import { isQuotaStale } from "@shared/providerQuota";
import type { ProviderQuota, QuotaProvider } from "@shared/providerQuota";

import { StatCard } from "@/components/stats/StatCard";
import { Badge } from "@/components/ui/badge";
import { QuotaWindowBar } from "@/components/usage/QuotaWindowBar";
import { formatAgo, QUOTA_PROVIDER_LABELS, quotaStateMessage } from "@/lib/usageDisplay";
import { cn } from "@/lib/utils";

const NOW_TICK_MS = 30_000;

export interface ProviderQuotaView {
  provider: QuotaProvider;
  quota: ProviderQuota | null;
  loading: boolean;
  error: string | null;
}

function useNow(): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), NOW_TICK_MS);
    return () => clearInterval(id);
  }, []);
  return now;
}

function QuotaBody({ quota, now }: { quota: ProviderQuota; now: number }): ReactNode {
  const message = quotaStateMessage(quota);
  const failed = quota.state === "error" || quota.state === "timeout";
  return (
    <div className="flex flex-col gap-3">
      {message !== null && (
        <p role={failed ? "alert" : undefined} className={cn("text-sm", failed ? "text-danger" : "text-muted-foreground")}>
          {message}
        </p>
      )}
      {(quota.state === "ok" || failed) && quota.windows.map((window) => <QuotaWindowBar key={window.id} window={window} now={now} />)}
    </div>
  );
}

function ProviderQuotaCard({ view, now }: { view: ProviderQuotaView; now: number }): ReactNode {
  const { quota, loading, error } = view;
  const showAge = quota !== null && quota.observedAt !== null && (quota.source === "session" || quota.source === "cache");
  return (
    <StatCard title={QUOTA_PROVIDER_LABELS[view.provider]}>
      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        {loading && (
          <span className="inline-flex items-center gap-1">
            <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
            Chargement…
          </span>
        )}
        {quota?.planType && <Badge variant="secondary">{quota.planType}</Badge>}
        {showAge && quota.observedAt !== null && <span>{formatAgo(quota.observedAt, now)}</span>}
        {quota !== null && quota.state !== "not_applicable" && isQuotaStale(quota, now) && <Badge variant="warning">Donnée périmée</Badge>}
      </div>
      {error !== null ? (
        <p role="alert" className="text-sm text-danger">{error}</p>
      ) : (
        quota !== null && <QuotaBody quota={quota} now={now} />
      )}
    </StatCard>
  );
}

/** "Limites" tab: one subscription-quota card per provider, each loading independently. */
export function LimitsTab({ providers }: { providers: ProviderQuotaView[] }): ReactNode {
  const now = useNow();
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {providers.map((view) => (
        <ProviderQuotaCard key={view.provider} view={view} now={now} />
      ))}
    </div>
  );
}
