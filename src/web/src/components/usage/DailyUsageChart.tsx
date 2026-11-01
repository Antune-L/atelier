import { useId, useMemo, type ReactNode } from "react";
import { Area, Bar, CartesianGrid, ComposedChart, XAxis, YAxis } from "recharts";

import type { UsageSummary } from "@shared/providerUsage";

import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { MachineSwatch } from "@/components/usage/UsageSources";
import { formatTokens } from "@/lib/display";
import { filteredProviders, formatCompactTokens, formatDayLabel, formatUsageUsd, mergeDaily, QUOTA_PROVIDER_LABELS, USAGE_MACHINE_CHART_COLORS, USAGE_MACHINE_LABELS, USAGE_MACHINES, usageMachineSplit } from "@/lib/usageDisplay";
import type { UsageProviderFilter } from "@/lib/usageDisplay";

const DAY_MS = 86_400_000;
const CHART_COLORS = { claude: "#d98a68", codex: "hsl(var(--foreground))" };
const CHART_CONFIG = {
  claude: { label: QUOTA_PROVIDER_LABELS.claude, color: CHART_COLORS.claude },
  codex: { label: QUOTA_PROVIDER_LABELS.codex, color: CHART_COLORS.codex },
};
const MACHINE_CHART_CONFIG = {
  server: { label: USAGE_MACHINE_LABELS.server, color: USAGE_MACHINE_CHART_COLORS.server },
  mac: { label: USAGE_MACHINE_LABELS.mac, color: USAGE_MACHINE_CHART_COLORS.mac },
};
const MACHINE_STACK_ID = "machine";
const TOP_BAR_RADIUS: [number, number, number, number] = [2, 2, 0, 0];
const LINE_CURSOR = { stroke: "hsl(var(--muted-foreground))", strokeOpacity: 0.3 };
const BAR_CURSOR = { fill: "hsl(var(--muted))", fillOpacity: 0.5 };
const SPLIT_DESCRIPTION = `, empilé entre ${USAGE_MACHINE_LABELS.server} et ${USAGE_MACHINE_LABELS.mac}`;
const CHART_MARGIN = { top: 12, right: 12, left: 0, bottom: 0 };
const AXIS_PROPS = { tickLine: false, axisLine: false, tick: { fill: "hsl(var(--muted-foreground))", fontSize: 11 }, tickMargin: 12 };
const DATE_FORMATTER = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
const FILL_OPACITY = 0.09;
const LINE_WIDTH = 2;
const AXIS_WIDTH = 64;
const MIDPOINT_DIVISOR = 2;

interface ChartDay {
  date: string;
  [series: string]: string | number;
}

interface DailyUsageChartProps {
  summary: UsageSummary;
  provider: UsageProviderFilter;
  metric: "cost" | "tokens";
}

export function DailyUsageChart({ summary, provider, metric }: DailyUsageChartProps): ReactNode {
  const descriptionId = useId();
  const providers = filteredProviders(provider);
  const split = usageMachineSplit(summary);
  const data = useMemo(() => {
    const field = metric === "cost" ? "costUsd" : "totalTokens";
    const machineSplit = usageMachineSplit(summary);
    const shown = filteredProviders(provider);
    const series = machineSplit === null
      ? shown.map((key) => ({ key, daily: summary.providers[key].daily }))
      : USAGE_MACHINES.map((key) => ({ key, daily: mergeDaily(shown.map((name) => machineSplit[key][name])) }));
    const values = series.map(({ key, daily }) => ({ key, byDate: new Map(daily.map((day) => [day.date, day[field]])) }));
    const firstDay = Math.floor(summary.since / DAY_MS) * DAY_MS;
    const lastDay = Math.floor(summary.generatedAt / DAY_MS) * DAY_MS;
    const days: ChartDay[] = [];
    for (let time = firstDay; time <= lastDay; time += DAY_MS) {
      const date = new Date(time).toISOString().slice(0, 10);
      const day: ChartDay = { date };
      for (const { key, byDate } of values) day[key] = byDate.get(date) ?? 0;
      days.push(day);
    }
    return days;
  }, [summary, metric, provider]);
  const tickIndexes = [0, Math.floor((data.length - 1) / MIDPOINT_DIVISOR), data.length - 1];
  const ticks = [...new Set(tickIndexes.flatMap((index) => {
    const day = data[index];
    return day ? [day.date] : [];
  }))];
  const hasUsage = providers.some((key) => summary.providers[key].hasUsage);
  const label = metric === "cost" ? "Coût estimé par jour en dollars" : "Tokens par jour";
  const formatValue = (value: number): string => metric === "cost" ? formatUsageUsd(value) : `${formatTokens(value)} tokens`;

  if (!hasUsage) {
    return <div className="flex h-64 items-center justify-center text-sm text-muted-foreground" role="status">Aucun usage sur cette période.</div>;
  }

  return (
    <div className="min-w-0">
      <p id={descriptionId} className="sr-only">{label}, pour {providers.map((key) => QUOTA_PROVIDER_LABELS[key]).join(" et ")}{split !== null && SPLIT_DESCRIPTION}. Les jours sans usage enregistré valent zéro. Les dates sont en UTC.</p>
      {split !== null && (
        <ul className="mb-2 flex gap-4 text-xs text-muted-foreground" aria-hidden="true">
          {USAGE_MACHINES.map((machine) => <li key={machine} className="flex items-center gap-1.5"><MachineSwatch machine={machine} />{USAGE_MACHINE_LABELS[machine]}</li>)}
        </ul>
      )}
      <ChartContainer config={split === null ? CHART_CONFIG : MACHINE_CHART_CONFIG} className="h-64" aria-label={label} aria-describedby={descriptionId}>
        <ComposedChart data={data} margin={CHART_MARGIN} accessibilityLayer>
          <CartesianGrid vertical={false} strokeDasharray="3 5" />
          <XAxis dataKey="date" ticks={ticks} tickFormatter={formatDayLabel} {...AXIS_PROPS} />
          <YAxis width={AXIS_WIDTH} domain={[0, "auto"]} tickFormatter={metric === "cost" ? formatUsageUsd : formatCompactTokens} {...AXIS_PROPS} />
          <ChartTooltip
            cursor={split === null ? LINE_CURSOR : BAR_CURSOR}
            content={({ active, payload, label: date }) => (
              <ChartTooltipContent
                active={active}
                payload={payload.map((item) => ({
                  dataKey: typeof item.dataKey === "string" ? item.dataKey : undefined,
                  value: typeof item.value === "number" ? item.value : undefined,
                  color: item.color,
                }))}
                label={typeof date === "string" ? DATE_FORMATTER.format(new Date(`${date}T00:00:00Z`)) : date}
                valueFormatter={(value) => formatValue(typeof value === "number" ? value : 0)}
              />
            )}
          />
          {split === null && providers.map((key) => (
            <Area key={key} dataKey={key} name={QUOTA_PROVIDER_LABELS[key]} type="monotone" stroke={CHART_COLORS[key]} fill={CHART_COLORS[key]} fillOpacity={FILL_OPACITY} strokeWidth={LINE_WIDTH} dot={false} isAnimationActive={false} />
          ))}
          {split !== null && USAGE_MACHINES.map((key) => (
            <Bar key={key} dataKey={key} name={USAGE_MACHINE_LABELS[key]} stackId={MACHINE_STACK_ID} fill={USAGE_MACHINE_CHART_COLORS[key]} radius={key === "mac" ? TOP_BAR_RADIUS : 0} isAnimationActive={false} />
          ))}
        </ComposedChart>
      </ChartContainer>
    </div>
  );
}
