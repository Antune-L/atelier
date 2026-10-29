import type { ReactNode } from "react";

import { quotaWindowPace } from "@shared/providerQuota";
import type { QuotaWindow } from "@shared/providerQuota";

import { formatPercent, formatResetDate, paceText, quotaWindowLabel, resetCountdownText, usageBarClass } from "@/lib/usageDisplay";
import { cn } from "@/lib/utils";

interface QuotaWindowBarProps {
  window: QuotaWindow;
  now: number;
}

/** One quota window: usage bar, elapsed-time marker, pace and reset countdown. */
export function QuotaWindowBar({ window, now }: QuotaWindowBarProps): ReactNode {
  const pace = quotaWindowPace(window, now);
  const used = Math.min(100, Math.max(0, window.usedPercent));
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-baseline justify-between gap-2 text-sm">
        <span className="font-medium">{quotaWindowLabel(window)}</span>
        <span className="tabular-nums text-muted-foreground">
          {formatPercent(window.usedPercent)} consommé
          {window.kind === "credit" && ` · ${formatPercent(100 - window.usedPercent)} restant`}
        </span>
      </div>
      <div className="relative h-2 rounded-full bg-muted" role="progressbar" aria-valuenow={Math.round(used)} aria-valuemin={0} aria-valuemax={100} aria-label={quotaWindowLabel(window)}>
        <div className={cn("h-full rounded-full", usageBarClass(used))} style={{ width: `${used}%` }} />
        {pace !== null && (
          <div
            className="absolute -top-1 h-4 w-0.5 bg-foreground"
            style={{ left: `${pace.elapsedPercent}%` }}
            title={`Temps écoulé : ${formatPercent(pace.elapsedPercent)}`}
          />
        )}
      </div>
      <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
        {pace !== null ? <span className={cn(pace.ahead && "text-warning")}>{paceText(pace)}</span> : <span />}
        {window.resetsAt !== null && <span title={formatResetDate(window.resetsAt)}>{resetCountdownText(window.resetsAt, now)}</span>}
      </div>
    </div>
  );
}
