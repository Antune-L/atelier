import type { LucideIcon } from "lucide-react";
import { Cpu, MemoryStick } from "lucide-react";

import { useHostMetrics } from "@/hooks/useHostMetrics";
import type { UsageLevel } from "@/lib/hostMetrics";
import { USAGE_LEVEL_LABELS, formatGib, memoryPercent, usageLevel } from "@/lib/hostMetrics";
import { cn } from "@/lib/utils";

interface LevelStyle {
  pill: string;
  fill: string;
}

const LEVEL_STYLES: Record<UsageLevel, LevelStyle> = {
  normal: {
    pill: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
    fill: "bg-emerald-500",
  },
  elevated: {
    pill: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400",
    fill: "bg-amber-500",
  },
  critical: {
    pill: "border-destructive/40 bg-destructive/10 text-destructive",
    fill: "bg-destructive",
  },
  unknown: {
    pill: "border-border bg-muted/40 text-muted-foreground",
    fill: "bg-muted-foreground/40",
  },
};

interface MetricPillProps {
  icon: LucideIcon;
  label: string;
  value: string;
  /** Accessible value, e.g. "42 %" or "3.5/8 Go (44 %)". */
  spokenValue: string;
  percent: number | null;
  level: UsageLevel;
  /** Extra tooltip line shared by every pill (load average). */
  hint: string;
}

function MetricPill({ icon: Icon, label, value, spokenValue, percent, level, hint }: MetricPillProps) {
  const style = LEVEL_STYLES[level];
  const clamped = percent === null || !Number.isFinite(percent) ? 0 : Math.min(100, Math.max(0, percent));
  const description = `${label} : ${spokenValue} — ${USAGE_LEVEL_LABELS[level]}`;

  return (
    <span
      className={cn("inline-flex items-center gap-1.5 rounded-md border px-1.5 py-0.5", style.pill)}
      data-level={level}
      title={`${description}\n${hint}`}
    >
      <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      <span>{label}</span>
      <span>{value}</span>
      <span className="sr-only">{` — ${USAGE_LEVEL_LABELS[level]}`}</span>
      <span className="relative h-1.5 w-8 overflow-hidden rounded-full bg-muted" aria-hidden="true">
        <span
          className={cn("absolute inset-y-0 left-0 rounded-full transition-[width] duration-500", style.fill)}
          style={{ width: `${clamped}%` }}
        />
      </span>
    </span>
  );
}

export function HostMetricsBadge() {
  const metrics = useHostMetrics();
  if (!metrics) return null;

  const { cpuPercent, memUsedBytes, memTotalBytes, loadAvg1 } = metrics;
  const memPercent = memoryPercent(memUsedBytes, memTotalBytes);
  const memValue = `${formatGib(memUsedBytes, false)}/${formatGib(memTotalBytes, true)} Go`;
  // Levels are derived from the rounded values so the colour matches the displayed percentage.
  const cpuRounded = cpuPercent === null ? null : Math.round(cpuPercent);
  const memRounded = Math.round(memPercent);
  const loadText = `Charge 1 min : ${loadAvg1.toFixed(2)}`;

  return (
    <div className="flex items-center gap-1.5 text-xs tabular-nums" title={loadText}>
      <MetricPill
        icon={Cpu}
        label="CPU"
        value={cpuRounded === null ? "–" : `${cpuRounded}%`}
        spokenValue={cpuRounded === null ? "–" : `${cpuRounded} %`}
        percent={cpuPercent}
        level={usageLevel(cpuRounded)}
        hint={loadText}
      />
      <MetricPill
        icon={MemoryStick}
        label="RAM"
        value={memValue}
        spokenValue={`${memValue} (${memRounded} %)`}
        percent={memPercent}
        level={usageLevel(memRounded)}
        hint={loadText}
      />
    </div>
  );
}
