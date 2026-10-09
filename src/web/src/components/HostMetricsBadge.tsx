import { useHostMetrics } from "@/hooks/useHostMetrics";
import { cn } from "@/lib/utils";

const ALERT_THRESHOLD_PERCENT = 85;
const BYTES_PER_GIB = 1024 ** 3;

function formatGib(bytes: number, trimWhole: boolean): string {
  const rounded = Math.round((bytes / BYTES_PER_GIB) * 10) / 10;
  return trimWhole && Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

export function HostMetricsBadge() {
  const metrics = useHostMetrics();
  if (!metrics) return null;

  const { cpuPercent, memUsedBytes, memTotalBytes, loadAvg1 } = metrics;
  const memPercent = memTotalBytes > 0 ? (memUsedBytes / memTotalBytes) * 100 : 0;
  const cpuAlert = cpuPercent !== null && cpuPercent >= ALERT_THRESHOLD_PERCENT;
  const memAlert = memPercent >= ALERT_THRESHOLD_PERCENT;

  return (
    <span className="text-xs text-muted-foreground tabular-nums" title={`Charge 1 min : ${loadAvg1.toFixed(2)}`}>
      <span className={cn(cpuAlert && "text-destructive")}>
        CPU {cpuPercent === null ? "–" : `${Math.round(cpuPercent)}%`}
      </span>
      {" · "}
      <span className={cn(memAlert && "text-destructive")}>
        RAM {formatGib(memUsedBytes, false)}/{formatGib(memTotalBytes, true)} Go
      </span>
    </span>
  );
}
