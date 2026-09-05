import { MINUTE_MS, SECOND_MS } from "@/lib/display";

const HOME_PREFIX_PATTERN = /^\/Users\/[^/]+/;
const HOME_ALIAS = "~";

export type TimeoutUnit = "min" | "s";

/** Display-only shortening: `/Users/alice/dev/x` → `~/dev/x`. Never used for the stored value. */
export function shortenHomePath(path: string): string {
  return path.replace(HOME_PREFIX_PATTERN, HOME_ALIAS);
}

export function timeoutUnitOf(ms: number): TimeoutUnit {
  return ms % MINUTE_MS === 0 ? "min" : "s";
}

export function timeoutUnitMs(unit: TimeoutUnit): number {
  return unit === "min" ? MINUTE_MS : SECOND_MS;
}

/** Compact commit-timeout label for the list pill: `10 min` or `90 s`. */
export function formatCommitTimeout(ms: number): string {
  const unit = timeoutUnitOf(ms);
  return `${ms / timeoutUnitMs(unit)} ${unit}`;
}

/** Most frequent value of a list, ties broken by first occurrence. Null on an empty list. */
export function mostCommonValue(values: number[]): number | null {
  const counts = new Map<number, number>();
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
  let best: number | null = null;
  let bestCount = 0;
  for (const value of values) {
    const count = counts.get(value) ?? 0;
    if (count > bestCount) {
      best = value;
      bestCount = count;
    }
  }
  return best;
}
