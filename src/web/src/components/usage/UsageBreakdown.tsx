import { useState } from "react";
import type { ReactNode } from "react";

import { providerOfModel } from "@shared/pricing";
import type { DailyUsage, ModelUsageRow, ProviderUsage } from "@shared/providerUsage";

import { Tabs } from "@/components/ui/tabs";
import { ProviderLogo } from "@/components/usage/ProviderLogo";
import { effectiveModelLabel } from "@/lib/stats";
import { formatCompactTokens, formatCostOrUnpriced, formatDayLabel, formatPercent, formatUsageUsd, sharePercent } from "@/lib/usageDisplay";
type TokenBreakdown = ProviderUsage["tokens"];
const TOKEN_TYPES: {
  key: keyof TokenBreakdown;
  label: string;
}[] = [
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
const SEGMENT_COLORS = ["bg-foreground", "bg-foreground/60", "bg-foreground/35", "bg-foreground/20"];
export function ShareRows({ rows, format }: {
  rows: {
    key: string;
    label: string;
    value: number;
    note?: string;
  }[];
  format: (value: number) => string;
}): ReactNode {
  const total = rows.reduce((sum, row) => sum + row.value, 0);
  return (<div className="space-y-4">
    <div className="flex h-2 gap-0.5 overflow-hidden rounded-full bg-muted" aria-hidden="true">{rows.map((row, index) => <div key={row.key} className={SEGMENT_COLORS[index % SEGMENT_COLORS.length]} style={{ width: `${sharePercent(row.value, total)}%` }} />)}</div>
    <ul className="grid gap-x-6 gap-y-3 sm:grid-cols-2">{rows.map((row, index) => <li key={row.key} className="text-xs">
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-2 text-muted-foreground">
          <span className={`h-1.5 w-1.5 rounded-full ${SEGMENT_COLORS[index % SEGMENT_COLORS.length]}`} />{row.label}</span>
        <span className="tabular-nums">{format(row.value)}</span>
      </div>
      <p className="mt-1 pl-3.5 text-muted-foreground">{formatPercent(sharePercent(row.value, total))}{row.note !== undefined && ` · ${row.note}`}</p>
    </li>)}</ul>
  </div>);
}
/** Per-type rows (Entrée / Sortie / cache). */
export function TypeBreakdown({ values, format }: {
  values: TokenBreakdown;
  format: (value: number) => string;
}): ReactNode {
  return <ShareRows rows={TOKEN_TYPES.map(({ key, label }) => ({ key, label, value: values[key] }))} format={format} />;
}
/** Per-model detail: tokens per type and cost, « non tarifé » for unpriced rows. */
export function ModelTable({ models, metric = "cost" }: {
  models: ModelUsageRow[];
  metric?: "cost" | "tokens";
}): ReactNode {
  if (models.length === 0)
    return <p className="text-sm text-muted-foreground">{EMPTY_USAGE_MESSAGE}</p>;
  const valueOf = (row: ModelUsageRow) => metric === "cost" ? row.costUsd ?? 0 : row.totalTokens;
  const ranked = [...models].sort((a, b) => valueOf(b) - valueOf(a));
  const total = ranked.reduce((sum, row) => sum + valueOf(row), 0);
  return (<div className="overflow-x-auto">
    <table className="w-full text-sm">
      <thead className="text-left text-xs text-muted-foreground">
        <tr>
          <th className="py-3 pr-4 font-normal">Modèle</th>
          <th className="py-3 pr-4 text-right font-normal">Coût</th>
          <th className="py-3 pr-4 text-right font-normal">Part</th>
          <th className="py-3 text-right font-normal">Tokens</th>
        </tr>
      </thead>
      <tbody>
        {ranked.map((row, index) => (<tr key={`${row.model}-${row.speed}-${index}`} className="border-t">
          <td className="min-w-48 py-3 pr-6">
            <div className="mb-2 flex gap-3">
              <span className="w-3 text-xs text-muted-foreground">{index + 1}</span>
              <span className="flex items-center gap-2"><ProviderLogo provider={providerOfModel(row.model)} />{usageModelLabel(row)}</span>
            </div>
            <div className="ml-6 h-0.5 bg-muted">
              <div className={`h-full ${providerOfModel(row.model) === "claude" ? "bg-orange-400" : "bg-foreground"}`} style={{ width: `${sharePercent(valueOf(row), total)}%` }} />
            </div>
          </td>
          <td className="py-3 pr-4 text-right tabular-nums">{formatCostOrUnpriced(row.costUsd, formatUsageUsd)}</td>
          <td className="py-3 pr-4 text-right tabular-nums text-muted-foreground">{formatPercent(sharePercent(valueOf(row), total))}</td>
          <td title={`${row.totalTokens} tokens · Entrée : ${row.tokens.input} · Cache : ${row.tokens.cacheRead + row.tokens.cacheCreate} · Sortie : ${row.tokens.output}`} className="py-3 text-right tabular-nums text-muted-foreground">{formatCompactTokens(row.totalTokens)}</td>
        </tr>))}
      </tbody>
    </table>
  </div>);
}
/** Per-day detail, most recent first; unpriced tokens flagged next to the known cost. */
export function DayTable({ days }: {
  days: DailyUsage[];
}): ReactNode {
  if (days.length === 0)
    return <p className="text-sm text-muted-foreground">{EMPTY_USAGE_MESSAGE}</p>;
  return (<div className="max-h-96 overflow-auto">
    <table className="w-full text-sm">
      <thead className="text-left text-xs text-muted-foreground">
        <tr>
          <th className="py-3 pr-4 font-normal">Jour</th>
          <th className="py-3 pr-4 text-right font-normal">Tokens</th>
          <th className="py-3 text-right font-normal">Coût</th>
        </tr>
      </thead>
      <tbody>
        {[...days].reverse().map((day) => (<tr key={day.date} className="border-t">
          <td className="py-3 pr-4">{formatDayLabel(day.date)}</td>
          <td title={String(day.totalTokens)} className="py-3 pr-4 text-right tabular-nums">{formatCompactTokens(day.totalTokens)}</td>
          <td className="py-3 text-right tabular-nums text-muted-foreground">
            {day.costUsd === 0 && day.unpricedTokens > 0 ? "non tarifé" : formatUsageUsd(day.costUsd)}
            {day.costUsd > 0 && day.unpricedTokens > 0 && ` + ${formatCompactTokens(day.unpricedTokens)} non tarifés`}
          </td>
        </tr>))}
      </tbody>
    </table>
  </div>);
}
type DetailMode = "model" | "day";
const DETAIL_OPTIONS = [{ value: "model", label: "Par modèle" }, { value: "day", label: "Par jour" }] satisfies {
  value: DetailMode;
  label: string;
}[];
export function UsageDetails({ models, days, metric }: {
  models: ModelUsageRow[];
  days: DailyUsage[];
  metric: "cost" | "tokens";
}): ReactNode {
  const [mode, setMode] = useState<DetailMode>("model");
  return (<section className="overflow-hidden rounded-xl border bg-card">
    <div className="flex flex-wrap items-center justify-between gap-3 border-b px-5 py-4">
      <h3 className="text-sm font-medium">Détail de la consommation</h3>
      <Tabs options={DETAIL_OPTIONS} value={mode} onChange={setMode} aria-label="Regroupement du détail" />
    </div>
    <div className="p-5">{mode === "model" ? <ModelTable models={models} metric={metric} /> : <DayTable days={days} />}</div>
  </section>);
}
