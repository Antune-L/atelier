import type { LucideIcon } from "lucide-react";
import { Cpu, MemoryStick } from "lucide-react";
import { useHostMetrics } from "@/hooks/useHostMetrics";
import type { UsageLevel } from "@/lib/hostMetrics";
import { USAGE_LEVEL_STYLES, formatGib, memPercent, usageLevel, usageValueText } from "@/lib/hostMetrics";
import { cn } from "@/lib/utils";

interface MetricChipProps {
  icon: LucideIcon;
  iconLabel: string;
  label: string;
  value: string;
  percent: number | null;
  level: UsageLevel;
  tooltip: string;
  testId: string;
}

function MetricChip({ icon: Icon, iconLabel, label, value, percent, level, tooltip, testId }: MetricChipProps) {
  const style = USAGE_LEVEL_STYLES[level];
  const width = percent === null || Number.isNaN(percent) ? 0 : Math.min(100, Math.max(0, percent));
  return (
    <span role="group" data-testid={testId} data-level={level} title={tooltip} aria-label={tooltip} className="inline-flex items-center gap-1.5">
      <Icon className={cn("h-3.5 w-3.5 shrink-0", style.text)} role="img" aria-label={iconLabel} />
      <span className="flex flex-col gap-0.5 leading-none">
        <span>
          <span className="text-muted-foreground">{label}</span>{" "}
          <span className={cn("font-medium", style.text)}>{value}</span>
        </span>
        <span
          role="progressbar"
          aria-label={`Utilisation ${label}`}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={level === "unknown" ? undefined : Math.round(width)}
          aria-valuetext={usageValueText(percent, level)}
          data-level={level}
          className="h-1 w-12 overflow-hidden rounded-full bg-muted"
        >
          <span className={cn("block h-full rounded-full transition-[width] duration-500", style.bar)} style={{ width: `${width}%` }} />
        </span>
      </span>
    </span>
  );
}

export function HostMetricsBadge() {
  const metrics = useHostMetrics();
  if (!metrics) return null;

  const { cpuPercent, memUsedBytes, memTotalBytes, loadAvg1 } = metrics;

  const cpuValue = cpuPercent === null ? "–" : `${Math.round(cpuPercent)}%`;
  const cpuLevel = usageLevel(cpuPercent);
  const cpuTooltip = `CPU : ${cpuPercent === null ? "–" : `${Math.round(cpuPercent)} %`} — ${USAGE_LEVEL_STYLES[cpuLevel].label}`;

  const hasMemTotal = memTotalBytes > 0;
  const memPct = memPercent(memUsedBytes, memTotalBytes);
  const memLevel = hasMemTotal ? usageLevel(memPct) : "unknown";
  const memAmount = `${formatGib(memUsedBytes, false)}/${formatGib(memTotalBytes, true)} Go`;
  const memValue = `${memAmount} (${Math.round(memPct)}%)`;
  const memTooltip = `RAM : ${memAmount} (${Math.round(memPct)} %) — ${USAGE_LEVEL_STYLES[memLevel].label}`;

  return (
    <div className="flex items-center gap-3 text-xs tabular-nums" title={`Charge 1 min : ${loadAvg1.toFixed(2)}`}>
      <MetricChip icon={Cpu} iconLabel="Processeur" label="CPU" value={cpuValue} percent={cpuPercent} level={cpuLevel} tooltip={cpuTooltip} testId="host-metrics-cpu" />
      <MetricChip icon={MemoryStick} iconLabel="Mémoire" label="RAM" value={memValue} percent={hasMemTotal ? memPct : null} level={memLevel} tooltip={memTooltip} testId="host-metrics-ram" />
    </div>
  );
}
