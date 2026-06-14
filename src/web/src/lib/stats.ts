import {
  AGENT_EFFORTS,
  AGENT_EFFORT_LABELS,
  AGENT_MODELS,
  AGENT_MODEL_LABELS,
  FAILURE_COLUMNS,
  KINDS,
  SUCCESS_COLUMNS,
  type AgentEffort,
  type AgentModel,
  type Kind,
} from "@shared/constants";
import type { StatRecord } from "@shared/schemas";

export type Outcome = "success" | "failure" | "abandoned";

const ABANDONED_COLUMN = "abandoned";

/** Map a record's column to a terminal outcome, or null when still in progress. */
export function recordOutcome(record: StatRecord): Outcome | null {
  if (SUCCESS_COLUMNS.includes(record.column)) return "success";
  if (FAILURE_COLUMNS.includes(record.column)) return "failure";
  if (record.column === ABANDONED_COLUMN) return "abandoned";
  return null;
}

/** Effective work duration of a successful ticket, in ms; null when not computable. */
export function successDurationMs(record: StatRecord): number | null {
  if (recordOutcome(record) !== "success") return null;
  if (record.implementingStartedAt === null || record.finishedAt === null) return null;
  const duration = record.finishedAt - record.implementingStartedAt;
  return duration > 0 ? duration : null;
}

export const DEFAULT_GROUP_LABEL = "Défaut";

export function modelLabel(model: AgentModel | null): string {
  return model === null ? DEFAULT_GROUP_LABEL : AGENT_MODEL_LABELS[model];
}

export function effortLabel(effort: AgentEffort | null): string {
  return effort === null ? DEFAULT_GROUP_LABEL : AGENT_EFFORT_LABELS[effort];
}

export const OUTCOME_LABELS: Record<Outcome, string> = {
  success: "Réussi",
  failure: "Échec",
  abandoned: "Abandonné",
};

export const KIND_LABELS: Record<Kind, string> = {
  feature: "Feature",
  review: "Review",
  ask: "Question",
};

interface DurationGroup {
  key: string;
  label: string;
  /** Mean duration in ms over the sampled successful tickets. */
  meanMs: number;
  /** Number of successful tickets contributing to the mean. */
  count: number;
}

function meanDurationByKey<K extends string>(
  records: StatRecord[],
  order: readonly (K | null)[],
  keyOf: (r: StatRecord) => K | null,
  serialize: (k: K | null) => string,
  labelOf: (k: K | null) => string,
): DurationGroup[] {
  const totals = new Map<string, { sum: number; count: number; label: string }>();
  for (const record of records) {
    const duration = successDurationMs(record);
    if (duration === null) continue;
    const raw = keyOf(record);
    const key = serialize(raw);
    const entry = totals.get(key) ?? { sum: 0, count: 0, label: labelOf(raw) };
    entry.sum += duration;
    entry.count += 1;
    totals.set(key, entry);
  }
  const groups: DurationGroup[] = [];
  for (const raw of order) {
    const key = serialize(raw);
    const entry = totals.get(key);
    if (!entry) continue;
    groups.push({ key, label: entry.label, meanMs: Math.round(entry.sum / entry.count), count: entry.count });
  }
  return groups;
}

const NULL_KEY = "__default__";

export function meanDurationByModel(records: StatRecord[]): DurationGroup[] {
  return meanDurationByKey<AgentModel>(
    records,
    [...AGENT_MODELS, null],
    (r) => r.model,
    (k) => k ?? NULL_KEY,
    modelLabel,
  );
}

export function meanDurationByEffort(records: StatRecord[]): DurationGroup[] {
  return meanDurationByKey<AgentEffort>(
    records,
    [...AGENT_EFFORTS, null],
    (r) => r.effort,
    (k) => k ?? NULL_KEY,
    effortLabel,
  );
}

export interface OutcomeCount {
  outcome: Outcome;
  label: string;
  count: number;
}

const OUTCOME_ORDER: Outcome[] = ["success", "failure", "abandoned"];

export function outcomeCounts(records: StatRecord[]): OutcomeCount[] {
  const counts: Record<Outcome, number> = { success: 0, failure: 0, abandoned: 0 };
  for (const record of records) {
    const outcome = recordOutcome(record);
    if (outcome) counts[outcome] += 1;
  }
  return OUTCOME_ORDER.map((outcome) => ({ outcome, label: OUTCOME_LABELS[outcome], count: counts[outcome] }));
}

export interface KindCount {
  kind: Kind;
  label: string;
  count: number;
}

export function kindCounts(records: StatRecord[]): KindCount[] {
  const counts = new Map<Kind, number>();
  for (const record of records) counts.set(record.kind, (counts.get(record.kind) ?? 0) + 1);
  return KINDS.map((kind) => ({ kind, label: KIND_LABELS[kind], count: counts.get(kind) ?? 0 })).filter(
    (c) => c.count > 0,
  );
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const DAYS_PER_WEEK = 7;
const WEEK_MS = DAYS_PER_WEEK * MS_PER_DAY;

export interface WeeklyThroughput {
  /** Epoch ms of the week's start (Monday 00:00 local). */
  weekStart: number;
  label: string;
  count: number;
}

/** Snap an epoch ms to the start of its ISO week (Monday) in local time. */
function startOfWeek(ms: number): number {
  const date = new Date(ms);
  date.setHours(0, 0, 0, 0);
  const dayOfWeek = (date.getDay() + 6) % DAYS_PER_WEEK; // 0 = Monday
  return date.getTime() - dayOfWeek * MS_PER_DAY;
}

/** Step from one Monday-midnight key to the next, re-snapping so DST-length weeks stay aligned. */
function nextWeek(weekStart: number): number {
  // Advance ~8 days then snap back: clears a 23h short week without skipping a 25h long one.
  return startOfWeek(weekStart + WEEK_MS + MS_PER_DAY);
}

const WEEK_LABEL_FORMATTER = new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "2-digit" });

/** Successfully delivered tickets per week (bucketed on finishedAt), with empty weeks filled in. */
export function weeklyThroughput(records: StatRecord[]): WeeklyThroughput[] {
  const counts = new Map<number, number>();
  for (const record of records) {
    if (recordOutcome(record) !== "success" || record.finishedAt === null) continue;
    const week = startOfWeek(record.finishedAt);
    counts.set(week, (counts.get(week) ?? 0) + 1);
  }
  if (counts.size === 0) return [];
  const weeks = [...counts.keys()].sort((a, b) => a - b);
  const first = weeks[0];
  const last = weeks[weeks.length - 1];
  if (first === undefined || last === undefined) return [];
  const series: WeeklyThroughput[] = [];
  for (let week = first; week <= last; week = nextWeek(week)) {
    series.push({ weekStart: week, label: WEEK_LABEL_FORMATTER.format(week), count: counts.get(week) ?? 0 });
  }
  return series;
}
