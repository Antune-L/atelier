import { Bot, Loader2, TerminalSquare } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";

import { isQuotaStale } from "@shared/providerQuota";
import type { ProviderQuota, QuotaProvider } from "@shared/providerQuota";

import { Badge } from "@/components/ui/badge";
import { ClaudeLoginPanel } from "@/components/usage/ClaudeLoginPanel";
import { QuotaWindowBar } from "@/components/usage/QuotaWindowBar";
import type { useClaudeLogin } from "@/hooks/useClaudeLogin";
import { formatAgo, QUOTA_PROVIDER_LABELS, quotaAgeText, quotaStateMessage, showsLastKnownWindows } from "@/lib/usageDisplay";
import { cn } from "@/lib/utils";

const NOW_TICK_MS = 30_000;

export interface ProviderQuotaView {
  provider: QuotaProvider;
  quota: ProviderQuota | null;
  loading: boolean;
  error: string | null;
}

export type ClaudeLoginView = ReturnType<typeof useClaudeLogin>;

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
  const lastKnown = showsLastKnownWindows(quota) && quota.windows.length > 0;
  const age = lastKnown ? quotaAgeText(quota, now) : null;
  return (
    <div className="flex flex-col gap-3">
      {message !== null && (
        <p role={failed ? "alert" : undefined} className={cn("text-sm", failed ? "text-danger" : "text-muted-foreground")}>
          {message}
        </p>
      )}
      {age !== null && <p className="text-xs text-muted-foreground">Dernières limites connues, {age}</p>}
      {(quota.state === "ok" || lastKnown) && quota.windows.map((window) => <QuotaWindowBar key={window.id} window={window} now={now} provider={quota.provider} />)}
    </div>
  );
}

function showsClaudeLogin(quota: ProviderQuota | null, login: ClaudeLoginView): boolean {
  if ((login.status?.state ?? "idle") !== "idle") return true;
  return quota !== null && (quota.state === "token_without_limits" || quota.state === "unauthenticated");
}

function ProviderQuotaCard({ view, now, login }: { view: ProviderQuotaView; now: number; login: ClaudeLoginView | null }): ReactNode {
  const { quota, loading, error } = view;
  const showAge = quota !== null && quota.observedAt !== null && (quota.source === "session" || quota.source === "cache") && !showsLastKnownWindows(quota);
  return (
    <section className="flex min-w-0 flex-col gap-4" aria-label={QUOTA_PROVIDER_LABELS[view.provider]}>
      <div className="flex flex-wrap items-center gap-3">
        <h3 className="flex items-center gap-2 text-lg font-semibold">
          {view.provider === "codex" ? <TerminalSquare className="h-5 w-5" aria-hidden /> : <Bot className="h-5 w-5" aria-hidden />}
          {QUOTA_PROVIDER_LABELS[view.provider]}
        </h3>
        {quota?.planType && <span className="text-sm text-muted-foreground">{quota.planType}</span>}
        <div className="ml-auto flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          {loading && (
            <span className="inline-flex items-center gap-1">
              <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
              Chargement…
            </span>
          )}
          {showAge && quota.observedAt !== null && <span>{formatAgo(quota.observedAt, now)}</span>}
          {quota !== null && quota.state !== "not_applicable" && isQuotaStale(quota, now) && <Badge variant="warning">Donnée périmée</Badge>}
        </div>
      </div>
      {error !== null ? (
        <p role="alert" className="text-sm text-danger">{error}</p>
      ) : (
        quota !== null && <QuotaBody quota={quota} now={now} />
      )}
      {login !== null && showsClaudeLogin(quota, login) && (
        <ClaudeLoginPanel
          status={login.status}
          pending={login.pending}
          error={login.error}
          onStart={login.start}
          onSubmit={login.submit}
          onCancel={login.cancel}
        />
      )}
    </section>
  );
}

export function LimitsTab({ providers, claudeLogin }: { providers: ProviderQuotaView[]; claudeLogin: ClaudeLoginView }): ReactNode {
  const now = useNow();
  return (
    <div className="flex flex-col gap-9">
      {providers.map((view) => (
        <ProviderQuotaCard key={view.provider} view={view} now={now} login={view.provider === "claude" ? claudeLogin : null} />
      ))}
    </div>
  );
}
