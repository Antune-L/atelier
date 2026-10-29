import { useId, useMemo, type ReactNode } from "react";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";

import type { UsageSummary } from "@shared/providerUsage";

import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { formatTokens } from "@/lib/display";
import { filteredProviders, formatCompactTokens, formatDayLabel, formatUsageUsd, QUOTA_PROVIDER_LABELS } from "@/lib/usageDisplay";
import type { UsageProviderFilter } from "@/lib/usageDisplay";

const DAY_MS = 86_400_000;
const CHART_COLORS = { claude: "#d98a68", codex: "hsl(var(--foreground))" };
const CHART_CONFIG = {
  claude: { label: QUOTA_PROVIDER_LABELS.claude, color: CHART_COLORS.claude },
  codex: { label: QUOTA_PROVIDER_LABELS.codex, color: CHART_COLORS.codex },
};
const CHART_MARGIN = { top: 12, right: 12, left: 0, bottom: 0 };
const AXIS_PROPS = { tickLine: false, axisLine: false, tick: { fill: "hsl(var(--muted-foreground))", fontSize: 11 }, tickMargin: 12 };
const DATE_FORMATTER = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
const FILL_OPACITY = 0.09;
const LINE_WIDTH = 2;
const AXIS_WIDTH = 64;
const MIDPOINT_DIVISOR = 2;

interface DailyUsageChartProps {
  summary: UsageSummary;
  provider: UsageProviderFilter;
  metric: "cost" | "tokens";
}

export function DailyUsageChart({ summary, provider, metric }: DailyUsageChartProps): ReactNode {
  const descriptionId = useId();
  const providers = filteredProviders(provider);
  const data = useMemo(() => {
    const field = metric === "cost" ? "costUsd" : "totalTokens";
    const claude = new Map(summary.providers.claude.daily.map((day) => [day.date, day[field]]));
    const codex = new Map(summary.providers.codex.daily.map((day) => [day.date, day[field]]));
    const firstDay = Math.floor(summary.since / DAY_MS) * DAY_MS;
    const lastDay = Math.floor(summary.generatedAt / DAY_MS) * DAY_MS;
    const days: { date: string; claude: number; codex: number }[] = [];
    for (let time = firstDay; time <= lastDay; time += DAY_MS) {
      const date = new Date(time).toISOString().slice(0, 10);
      days.push({ date, claude: claude.get(date) ?? 0, codex: codex.get(date) ?? 0 });
    }
    return days;
  }, [summary, metric]);
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
      <p id={descriptionId} className="sr-only">{label}, pour {providers.map((key) => QUOTA_PROVIDER_LABELS[key]).join(" et ")}. Les jours sans usage enregistré valent zéro. Les dates sont en UTC.</p>
      <ChartContainer config={CHART_CONFIG} className="h-64" aria-label={label} aria-describedby={descriptionId}>
        <AreaChart data={data} margin={CHART_MARGIN} accessibilityLayer>
          <CartesianGrid vertical={false} strokeDasharray="3 5" />
          <XAxis dataKey="date" ticks={ticks} tickFormatter={formatDayLabel} {...AXIS_PROPS} />
          <YAxis width={AXIS_WIDTH} domain={[0, "auto"]} tickFormatter={metric === "cost" ? formatUsageUsd : formatCompactTokens} {...AXIS_PROPS} />
          <ChartTooltip
            cursor={{ stroke: "hsl(var(--muted-foreground))", strokeOpacity: 0.3 }}
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
          {providers.map((key) => (
            <Area key={key} dataKey={key} name={QUOTA_PROVIDER_LABELS[key]} type="monotone" stroke={CHART_COLORS[key]} fill={CHART_COLORS[key]} fillOpacity={FILL_OPACITY} strokeWidth={LINE_WIDTH} dot={false} isAnimationActive={false} />
          ))}
        </AreaChart>
      </ChartContainer>
    </div>
  );
}
