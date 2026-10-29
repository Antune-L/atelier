import { useMemo, type ReactNode } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from "recharts";

import type { ProjectInfo, StatRecord } from "@shared/schemas";

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { formatDuration } from "@/lib/display";
import {
  kindCounts,
  meanDurationByEffort,
  meanDurationByModel,
  outcomeCounts,
  projectCounts,
  recordOutcome,
  weeklyThroughput,
  type Outcome,
} from "@/lib/stats";

import { StatEmpty } from "./StatCard";

const OUTCOME_COLORS: Record<Outcome, string> = {
  success: "hsl(var(--success))",
  failure: "hsl(var(--danger))",
  abandoned: "hsl(var(--muted-foreground))",
};

const CHART_PALETTE = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
];

const PIE_INNER_RADIUS = 55;
const PIE_OUTER_RADIUS = 85;

function colorAt(index: number): string {
  return CHART_PALETTE[index % CHART_PALETTE.length] ?? CHART_PALETTE[0] ?? "hsl(var(--primary))";
}

const AXIS_PROPS = {
  tickLine: false,
  axisLine: false,
  stroke: "hsl(var(--muted-foreground))",
  fontSize: 11,
} as const;

/** Soft theme-aware hover cursor behind a hovered bar (avoids a harsh white box). */
const BAR_CURSOR = { fill: "hsl(var(--muted))", fillOpacity: 0.4 } as const;
/** Soft theme-aware hover cursor for the area chart. */
const AREA_CURSOR = { stroke: "hsl(var(--muted-foreground))", strokeOpacity: 0.4 } as const;
/** Hovered-bar emphasis (keeps the per-Cell fill). */
const ACTIVE_BAR = { fillOpacity: 0.8 } as const;

// --- Card 1: tickets handled by outcome ---

export function OutcomeChart({ records }: { records: StatRecord[] }): ReactNode {
  const data = useMemo(() => outcomeCounts(records).filter((d) => d.count > 0), [records]);
  const total = records.length;
  if (data.length === 0) return <StatEmpty />;
  const config: ChartConfig = { count: { label: "Tickets" } };
  return (
    <div className="flex flex-col gap-2">
      <div className="text-2xl font-bold tabular-nums">{total}</div>
      <ChartContainer config={config}>
        <BarChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
          <CartesianGrid vertical={false} />
          <XAxis dataKey="label" {...AXIS_PROPS} />
          <YAxis allowDecimals={false} {...AXIS_PROPS} />
          <ChartTooltip cursor={BAR_CURSOR} content={<ChartTooltipContent />} />
          <Bar dataKey="count" radius={[4, 4, 0, 0]} activeBar={ACTIVE_BAR}>
            {data.map((d) => (
              <Cell key={d.outcome} fill={OUTCOME_COLORS[d.outcome]} />
            ))}
          </Bar>
        </BarChart>
      </ChartContainer>
    </div>
  );
}

// --- Card 2: mean completion duration by model / effort ---

interface DurationDatum {
  key: string;
  label: string;
  meanMs: number;
  count: number;
}

function DurationBars({ data }: { data: DurationDatum[] }): ReactNode {
  const config: ChartConfig = { meanMs: { label: "Durée moyenne" } };
  return (
    <ChartContainer config={config} className="h-48">
      <BarChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="label" {...AXIS_PROPS} />
        <YAxis tickFormatter={(v: number) => formatDuration(v)} width={48} {...AXIS_PROPS} />
        <ChartTooltip
          cursor={BAR_CURSOR}
          content={
            <ChartTooltipContent
              valueFormatter={(value) => formatDuration(typeof value === "number" ? value : 0)}
              extraFormatter={(item) => {
                const datum = item.payload;
                const count = datum && typeof datum.count === "number" ? datum.count : 0;
                return `n = ${count}`;
              }}
            />
          }
        />
        <Bar dataKey="meanMs" radius={[4, 4, 0, 0]} fill="hsl(var(--chart-1))" activeBar={ACTIVE_BAR} />
      </BarChart>
    </ChartContainer>
  );
}

export function DurationChart({ records }: { records: StatRecord[] }): ReactNode {
  const byModel = useMemo(() => meanDurationByModel(records), [records]);
  const byEffort = useMemo(() => meanDurationByEffort(records), [records]);
  if (byModel.length === 0 && byEffort.length === 0) return <StatEmpty />;
  return (
    <div className="grid gap-4">
      <div>
        <h3 className="mb-1 text-xs font-medium text-muted-foreground">Par modèle</h3>
        {byModel.length > 0 ? <DurationBars data={byModel} /> : <StatEmpty />}
      </div>
      <div>
        <h3 className="mb-1 text-xs font-medium text-muted-foreground">Par effort</h3>
        {byEffort.length > 0 ? <DurationBars data={byEffort} /> : <StatEmpty />}
      </div>
    </div>
  );
}

// --- Card 3: weekly throughput ---

export function ThroughputChart({ records }: { records: StatRecord[] }): ReactNode {
  const data = useMemo(() => weeklyThroughput(records), [records]);
  if (data.length === 0) return <StatEmpty />;
  const config: ChartConfig = { count: { label: "Réussis" } };
  return (
    <ChartContainer config={config}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="label" {...AXIS_PROPS} />
        <YAxis allowDecimals={false} {...AXIS_PROPS} />
        <ChartTooltip cursor={AREA_CURSOR} content={<ChartTooltipContent />} />
        <Area
          dataKey="count"
          type="monotone"
          stroke="hsl(var(--chart-1))"
          fill="hsl(var(--chart-1))"
          fillOpacity={0.2}
          strokeWidth={2}
          activeDot={{ r: 5, strokeWidth: 2 }}
        />
      </AreaChart>
    </ChartContainer>
  );
}

// --- Card 4: success rate donut ---

export function SuccessRateChart({ records }: { records: StatRecord[] }): ReactNode {
  const data = useMemo(() => outcomeCounts(records).filter((d) => d.count > 0), [records]);
  const terminalTotal = useMemo(() => records.filter((r) => recordOutcome(r) !== null).length, [records]);
  if (terminalTotal === 0) return <StatEmpty />;
  const successCount = data.find((d) => d.outcome === "success")?.count ?? 0;
  const successPercent = Math.round((successCount / terminalTotal) * 100);
  const config: ChartConfig = { count: { label: "Tickets" } };
  return (
    <div className="relative">
      <ChartContainer config={config}>
        <PieChart>
          <ChartTooltip content={<ChartTooltipContent hideLabel />} />
          <Pie
            data={data}
            dataKey="count"
            nameKey="label"
            innerRadius={PIE_INNER_RADIUS}
            outerRadius={PIE_OUTER_RADIUS}
            strokeWidth={2}
          >
            {data.map((d) => (
              <Cell key={d.outcome} fill={OUTCOME_COLORS[d.outcome]} stroke="hsl(var(--card))" />
            ))}
          </Pie>
        </PieChart>
      </ChartContainer>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold tabular-nums">{successPercent}%</span>
        <span className="text-xs text-muted-foreground">réussite</span>
      </div>
    </div>
  );
}

// --- Card 5: distribution by kind ---

export function KindChart({ records }: { records: StatRecord[] }): ReactNode {
  const data = useMemo(() => kindCounts(records), [records]);
  if (data.length === 0) return <StatEmpty />;
  const config: ChartConfig = { count: { label: "Tickets" } };
  return (
    <ChartContainer config={config}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="label" {...AXIS_PROPS} />
        <YAxis allowDecimals={false} {...AXIS_PROPS} />
        <ChartTooltip cursor={BAR_CURSOR} content={<ChartTooltipContent />} />
        <Bar dataKey="count" radius={[4, 4, 0, 0]} activeBar={ACTIVE_BAR}>
          {data.map((d, index) => (
            <Cell key={d.kind} fill={colorAt(index)} />
          ))}
        </Bar>
      </BarChart>
    </ChartContainer>
  );
}

// --- Card 6: tickets handled by project ---

export function ProjectChart({
  records,
  projects,
}: {
  records: StatRecord[];
  projects: ProjectInfo[];
}): ReactNode {
  const data = useMemo(() => projectCounts(records, projects), [records, projects]);
  if (data.length === 0) return <StatEmpty />;
  const config: ChartConfig = { count: { label: "Tickets" } };
  return (
    <ChartContainer config={config}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="label" {...AXIS_PROPS} />
        <YAxis allowDecimals={false} {...AXIS_PROPS} />
        <ChartTooltip cursor={BAR_CURSOR} content={<ChartTooltipContent />} />
        <Bar dataKey="count" radius={[4, 4, 0, 0]} activeBar={ACTIVE_BAR}>
          {data.map((d, index) => (
            <Cell key={d.key} fill={colorAt(index)} />
          ))}
        </Bar>
      </BarChart>
    </ChartContainer>
  );
}
