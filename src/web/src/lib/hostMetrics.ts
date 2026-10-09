export type UsageLevel = "unknown" | "normal" | "elevated" | "critical";

export const ELEVATED_THRESHOLD_PERCENT = 60;
export const CRITICAL_THRESHOLD_PERCENT = 85;

const BYTES_PER_GIB = 1024 ** 3;

export const USAGE_LEVEL_STYLES: Record<UsageLevel, { label: string; text: string; bar: string }> = {
  unknown: { label: "Inconnu", text: "text-muted-foreground", bar: "bg-muted-foreground/40" },
  normal: { label: "Normal", text: "text-success", bar: "bg-success" },
  elevated: { label: "Élevé", text: "text-warning", bar: "bg-warning" },
  critical: { label: "Critique", text: "text-destructive", bar: "bg-destructive" },
};

export function usageLevel(percent: number | null): UsageLevel {
  if (percent === null || Number.isNaN(percent)) return "unknown";
  if (percent >= CRITICAL_THRESHOLD_PERCENT) return "critical";
  if (percent >= ELEVATED_THRESHOLD_PERCENT) return "elevated";
  return "normal";
}

export function usageValueText(percent: number | null, level: UsageLevel): string {
  if (level === "unknown" || percent === null || Number.isNaN(percent)) return USAGE_LEVEL_STYLES.unknown.label;
  return `${Math.round(percent)} % — ${USAGE_LEVEL_STYLES[level].label}`;
}

export function memPercent(usedBytes: number, totalBytes: number): number {
  if (totalBytes <= 0) return 0;
  return Math.min(100, Math.max(0, (usedBytes / totalBytes) * 100));
}

export function formatGib(bytes: number, trimWhole: boolean): string {
  const rounded = Math.round((bytes / BYTES_PER_GIB) * 10) / 10;
  return trimWhole && Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}
