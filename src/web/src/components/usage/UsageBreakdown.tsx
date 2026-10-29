import type { ReactNode } from "react";

import type { ModelUsageRow, ProviderUsage } from "@shared/providerUsage";

import { effectiveModelLabel } from "@/lib/stats";
import { formatPercent, sharePercent } from "@/lib/usageDisplay";

type TokenBreakdown = ProviderUsage["tokens"];

const TOKEN_TYPES: { key: keyof TokenBreakdown; label: string }[] = [
  { key: "input", label: "Entrée" },
  { key: "output", label: "Sortie" },
  { key: "cacheRead", label: "Lecture du cache" },
  { key: "cacheCreate", label: "Écriture du cache" },
];

export const EMPTY_USAGE_MESSAGE = "Aucune exécution sur la période.";

export function usageModelLabel(row: ModelUsageRow): string {
  return `${effectiveModelLabel(row.model)}${row.fast ? " · FAST" : ""}`;
}

/** Per-type rows (Entrée / Sortie / cache) with amount, share % and a share bar. */
export function TypeBreakdown({ values, format }: { values: TokenBreakdown; format: (value: number) => string }): ReactNode {
  const total = values.input + values.output + values.cacheRead + values.cacheCreate;
  return (
    <ul className="flex flex-col gap-2">
      {TOKEN_TYPES.map(({ key, label }) => {
        const share = sharePercent(values[key], total);
        return (
          <li key={key} className="flex flex-col gap-1 text-sm">
            <div className="flex justify-between gap-2">
              <span>{label}</span>
              <span className="tabular-nums text-muted-foreground">
                {format(values[key])} · {formatPercent(share)}
              </span>
            </div>
            <div className="h-1.5 rounded-full bg-muted">
              <div className="h-full rounded-full bg-info" style={{ width: `${share}%` }} />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
