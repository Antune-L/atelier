import type { ReactNode } from "react";

import type { DailyUsage, ModelUsageRow, ProviderUsage } from "@shared/providerUsage";

import { formatTokens, formatUsd } from "@/lib/display";
import { effectiveModelLabel } from "@/lib/stats";
import { formatCostOrUnpriced, formatDayLabel, formatPercent, sharePercent } from "@/lib/usageDisplay";

type TokenBreakdown = ProviderUsage["tokens"];

const TOKEN_TYPES: { key: keyof TokenBreakdown; label: string }[] = [
  { key: "input", label: "Entrée" },
  { key: "output", label: "Sortie" },
  { key: "cacheRead", label: "Lecture du cache" },
  { key: "cacheCreate", label: "Écriture du cache" },
];

export const EMPTY_USAGE_MESSAGE = "Aucune exécution sur la période.";

export function usageModelLabel(row: ModelUsageRow): string {
  const speed = row.fast || row.speed !== "standard" ? ` · ${row.speed.toUpperCase()}` : "";
  return `${effectiveModelLabel(row.model)}${speed}`;
}

/** Labelled rows with amount, share % and a share bar. */
export function ShareRows({ rows, format }: { rows: { key: string; label: string; value: number; note?: string }[]; format: (value: number) => string }): ReactNode {
  const total = rows.reduce((sum, row) => sum + row.value, 0);
  return (
    <ul className="flex flex-col gap-2">
      {rows.map((row) => {
        const share = sharePercent(row.value, total);
        return (
          <li key={row.key} className="flex flex-col gap-1 text-sm">
            <div className="flex justify-between gap-2">
              <span>{row.label}</span>
              <span className="tabular-nums text-muted-foreground">
                {format(row.value)} · {formatPercent(share)}
                {row.note !== undefined && ` · ${row.note}`}
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

/** Per-type rows (Entrée / Sortie / cache). */
export function TypeBreakdown({ values, format }: { values: TokenBreakdown; format: (value: number) => string }): ReactNode {
  return <ShareRows rows={TOKEN_TYPES.map(({ key, label }) => ({ key, label, value: values[key] }))} format={format} />;
}

/** Simple vertical bars, one per day; no chart dependency. */
export function DailyBars({ days, value, format, label }: { days: DailyUsage[]; value: (day: DailyUsage) => number; format: (value: number) => string; label: string }): ReactNode {
  const first = days.at(0);
  const last = days.at(-1);
  if (first === undefined || last === undefined) return <p className="text-sm text-muted-foreground">{EMPTY_USAGE_MESSAGE}</p>;
  const max = Math.max(...days.map(value), 0);
  return (
    <div className="flex flex-col gap-1">
      <div className="flex h-32 items-end gap-0.5" role="img" aria-label={label}>
        {days.map((day) => {
          const height = max > 0 ? Math.max(2, (value(day) / max) * 100) : 2;
          return (
            <div
              key={day.date}
              className="min-w-1 flex-1 rounded-t bg-info"
              style={{ height: `${height}%` }}
              title={`${formatDayLabel(day.date)} : ${format(value(day))}`}
            />
          );
        })}
      </div>
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>{formatDayLabel(first.date)}</span>
        <span>{formatDayLabel(last.date)}</span>
      </div>
    </div>
  );
}

/** Per-model detail: tokens per type and cost, « non tarifé » for unpriced rows. */
export function ModelTable({ models }: { models: ModelUsageRow[] }): ReactNode {
  if (models.length === 0) return <p className="text-sm text-muted-foreground">{EMPTY_USAGE_MESSAGE}</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="text-left text-xs text-muted-foreground">
          <tr>
            <th className="py-1 pr-2 font-normal">Modèle</th>
            <th className="py-1 pr-2 text-right font-normal">Entrée</th>
            <th className="py-1 pr-2 text-right font-normal">Cache</th>
            <th className="py-1 pr-2 text-right font-normal">Sortie</th>
            <th className="py-1 pr-2 text-right font-normal">Total</th>
            <th className="py-1 text-right font-normal">Coût</th>
          </tr>
        </thead>
        <tbody>
          {models.map((row) => (
            <tr key={`${row.model}-${row.speed}`} className="border-t">
              <td className="max-w-48 truncate py-1 pr-2">{usageModelLabel(row)}</td>
              <td className="py-1 pr-2 text-right tabular-nums">{formatTokens(row.tokens.input)}</td>
              <td className="py-1 pr-2 text-right tabular-nums">{formatTokens(row.tokens.cacheRead + row.tokens.cacheCreate)}</td>
              <td className="py-1 pr-2 text-right tabular-nums">{formatTokens(row.tokens.output)}</td>
              <td className="py-1 pr-2 text-right tabular-nums">{formatTokens(row.totalTokens)}</td>
              <td className="py-1 text-right tabular-nums text-muted-foreground">{formatCostOrUnpriced(row.costUsd, formatUsd)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Per-day detail, most recent first; unpriced tokens flagged next to the known cost. */
export function DayTable({ days }: { days: DailyUsage[] }): ReactNode {
  if (days.length === 0) return <p className="text-sm text-muted-foreground">{EMPTY_USAGE_MESSAGE}</p>;
  return (
    <div className="max-h-72 overflow-y-auto">
      <table className="w-full text-sm">
        <thead className="text-left text-xs text-muted-foreground">
          <tr>
            <th className="py-1 pr-2 font-normal">Jour</th>
            <th className="py-1 pr-2 text-right font-normal">Tokens</th>
            <th className="py-1 text-right font-normal">Coût</th>
          </tr>
        </thead>
        <tbody>
          {[...days].reverse().map((day) => (
            <tr key={day.date} className="border-t">
              <td className="py-1 pr-2">{formatDayLabel(day.date)}</td>
              <td className="py-1 pr-2 text-right tabular-nums">{formatTokens(day.totalTokens)}</td>
              <td className="py-1 text-right tabular-nums text-muted-foreground">
                {day.costUsd === 0 && day.unpricedTokens > 0 ? "non tarifé" : formatUsd(day.costUsd)}
                {day.costUsd > 0 && day.unpricedTokens > 0 && ` + ${formatTokens(day.unpricedTokens)} non tarifés`}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
