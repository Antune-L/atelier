import type { ReactNode } from "react";

import type { MacUsageSource, UsageMachines } from "@shared/providerUsage";

import { formatAgo, formatShortClock, formatWeekdayClock, machineFillStyle, NEUTRAL_MACHINE_COLOR, USAGE_MACHINE_LABELS } from "@/lib/usageDisplay";
import type { UsageMachine } from "@/lib/usageDisplay";

const UP_TO_DATE_LABEL = "à jour";
const MAC_UNLINKED_MESSAGE = "Mac non relié : configurez le lien Mac ↔ VPS pour l’inclure.";

export function MachineSwatch({ machine, color = NEUTRAL_MACHINE_COLOR }: { machine: UsageMachine; color?: string }): ReactNode {
  return <span aria-hidden="true" className="inline-block h-2.5 w-2.5 shrink-0 rounded-[2px]" style={machineFillStyle(machine, color)} />;
}

function UpToDate(): ReactNode {
  return <span className="text-success">{UP_TO_DATE_LABEL}</span>;
}

function MacSource({ mac, now }: { mac: MacUsageSource | null; now: number }): ReactNode {
  if (mac === null) {
    return (
      <span className="flex items-center gap-2 text-muted-foreground">
        <MachineSwatch machine="mac" />{MAC_UNLINKED_MESSAGE}
      </span>
    );
  }
  if (mac.stale) return null;
  return (
    <span className="flex items-center gap-2">
      <MachineSwatch machine="mac" />
      <span>{USAGE_MACHINE_LABELS.mac} · données de {formatShortClock(mac.publishedAt)} ({formatAgo(mac.publishedAt, now)}) · <UpToDate /></span>
    </span>
  );
}

export function UsageSources({ machines, now }: { machines: UsageMachines; now: number }): ReactNode {
  const { mac } = machines;
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 rounded-lg border px-3 py-2.5 text-xs" aria-label="Sources">
        <span className="flex items-center gap-2">
          <MachineSwatch machine="server" />
          <span>{USAGE_MACHINE_LABELS.server} (ce serveur) · <UpToDate /></span>
        </span>
        <MacSource mac={mac} now={now} />
      </div>
      {mac?.stale === true && (
        <p role="status" className="rounded-lg border border-warning/45 px-3 py-2.5 text-xs text-warning">
          Données du Mac de {formatWeekdayClock(mac.publishedAt)} ({formatAgo(mac.publishedAt, now)}) : Atelier n’a pas tourné sur le Mac depuis. Elles s’actualiseront à sa prochaine ouverture.
        </p>
      )}
    </div>
  );
}
