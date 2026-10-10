export type UsageLevel = "unknown" | "normal" | "elevated" | "critical";

export const ELEVATED_THRESHOLD_PERCENT = 60;
export const CRITICAL_THRESHOLD_PERCENT = 85;

const BYTES_PER_GIB = 1024 ** 3;

export const USAGE_LEVEL_LABELS: Record<UsageLevel, string> = {
  unknown: "Indisponible",
  normal: "Normal",
  elevated: "Élevé",
  critical: "Critique",
};

export function usageLevel(percent: number | null): UsageLevel {
  if (percent === null || !Number.isFinite(percent)) return "unknown";
  if (percent < ELEVATED_THRESHOLD_PERCENT) return "normal";
  if (percent < CRITICAL_THRESHOLD_PERCENT) return "elevated";
  return "critical";
}

export function memoryPercent(usedBytes: number, totalBytes: number): number {
  if (totalBytes <= 0) return 0;
  return Math.min(100, Math.max(0, (usedBytes / totalBytes) * 100));
}

export function formatGib(bytes: number, trimWhole: boolean): string {
  const rounded = Math.round((bytes / BYTES_PER_GIB) * 10) / 10;
  return trimWhole && Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}
