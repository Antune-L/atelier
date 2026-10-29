import type { ReactNode } from "react";

import { quotaWindowPace } from "@shared/providerQuota";
import type { QuotaProvider, QuotaWindow } from "@shared/providerQuota";

import { Badge } from "@/components/ui/badge";
import { formatPercent, formatResetDate, paceText, quotaWindowLabel, resetCountdownText, usageBarClass } from "@/lib/usageDisplay";
import { cn } from "@/lib/utils";

const FULL_PERCENT = 100;
const EMPTY_PERCENT = 0;
const WARNING_PERCENT = 75;
const EMPTY_BAR_PATTERN = "repeating-linear-gradient(125deg, transparent, transparent 3px, hsl(var(--muted-foreground) / 0.12) 3px, hsl(var(--muted-foreground) / 0.12) 4px)";

interface QuotaWindowBarProps {
  window: QuotaWindow;
  now: number;
  provider: QuotaProvider;
}

export function QuotaWindowBar({ window, now, provider }: QuotaWindowBarProps): ReactNode {
  const pace = quotaWindowPace(window, now);
  const used = Math.min(FULL_PERCENT, Math.max(EMPTY_PERCENT, window.usedPercent));
  const remaining = FULL_PERCENT - used;
  return (
    <div className="flex flex-col gap-5 rounded-xl border bg-card px-5 py-5 sm:flex-row sm:items-center sm:gap-8 sm:px-6 sm:py-6">
      <div className="flex shrink-0 items-baseline justify-between gap-3 sm:w-[24%] sm:flex-col sm:gap-2">
        <span className="text-sm font-medium">{quotaWindowLabel(window)}</span>
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-semibold tracking-tight tabular-nums">{formatPercent(remaining)}</span>
          <span className="text-xs text-muted-foreground">restant</span>
        </div>
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-3">
        <div className="relative h-10 rounded-md bg-muted" style={{ backgroundImage: EMPTY_BAR_PATTERN }} role="progressbar" aria-valuenow={Math.round(remaining)} aria-valuemin={EMPTY_PERCENT} aria-valuemax={FULL_PERCENT} aria-label={`${quotaWindowLabel(window)} : quota restant`}>
          <div className={cn("h-full rounded-md", usageBarClass(used), used < WARNING_PERCENT && (provider === "codex" ? "bg-foreground/45" : "bg-[#d98a68]/55"))} style={{ width: `${remaining}%` }} />
          {pace !== null && (
            <div
              className="absolute -top-1 h-12 w-0.5 -translate-x-1/2 bg-foreground"
              style={{ left: `${FULL_PERCENT - pace.elapsedPercent}%` }}
              title={`Temps écoulé : ${formatPercent(pace.elapsedPercent)}`}
            />
          )}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
          {pace !== null ? <span className={cn(pace.ahead && "text-warning")}>{paceText(pace)}</span> : <span />}
          {window.resetsAt !== null && <Badge variant="outline" className="font-normal" title={formatResetDate(window.resetsAt)}>{resetCountdownText(window.resetsAt, now)}</Badge>}
        </div>
      </div>
    </div>
  );
}
