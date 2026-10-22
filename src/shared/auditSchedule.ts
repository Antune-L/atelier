import { AUDIT_DAY_MS, AUDIT_DEFAULT_TIME_ZONE, AUDIT_HOURS_PER_DAY } from "./audit.ts";
import type { AuditProjectSettings, AuditProjectState } from "./audit.ts";

export type AuditCadenceSettings = Pick<AuditProjectSettings, "dailyTime" | "timeZone" | "intervalHours" | "anchorDate" | "skipWeekends">;

const DATE_KEY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const DAILY_TIME_PATTERN = /^(\d{2}):(\d{2})$/;
const DATE_PART_TYPES = ["year", "month", "day", "hour", "minute", "second"] as const;
const WEEKEND_DAYS: readonly number[] = [0, 6];
const MS_PER_SECOND = 1_000;
const MS_PER_HOUR = 60 * 60 * MS_PER_SECOND;
const DATE_PAD = 2;
const MAX_SLOT_SCAN = 64;
const DEFAULT_ANCHOR_DATE = "2026-01-05";

type DatePart = (typeof DATE_PART_TYPES)[number];

function isDatePart(value: string): value is DatePart {
  return DATE_PART_TYPES.some((part) => part === value);
}

export function isValidTimeZone(timeZone: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone });
    return true;
  } catch {
    return false;
  }
}

function safeTimeZone(timeZone: string): string {
  return isValidTimeZone(timeZone) ? timeZone : AUDIT_DEFAULT_TIME_ZONE;
}

function zonedParts(epochMs: number, timeZone: string): Record<DatePart, number> {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const parts: Record<DatePart, number> = { year: 0, month: 0, day: 0, hour: 0, minute: 0, second: 0 };
  for (const part of formatter.formatToParts(new Date(epochMs))) {
    if (isDatePart(part.type)) parts[part.type] = Number(part.value);
  }
  return parts;
}

function zonedOffsetMs(epochMs: number, timeZone: string): number {
  const parts = zonedParts(epochMs, timeZone);
  const asUtc = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);
  return asUtc - (epochMs - (epochMs % MS_PER_SECOND));
}

function pad(value: number): string {
  return String(value).padStart(DATE_PAD, "0");
}

function formatDateKey(year: number, month: number, day: number): string {
  return `${year}-${pad(month)}-${pad(day)}`;
}

function parseNumbers(value: string, pattern: RegExp): number[] {
  const match = pattern.exec(value);
  if (!match) throw new Error(`valeur de date invalide : ${value}`);
  return match.slice(1).map(Number);
}

function dateKeyUtc(dateKey: string): number {
  const [year = 0, month = 1, day = 1] = parseNumbers(dateKey, DATE_KEY_PATTERN);
  return Date.UTC(year, month - 1, day);
}

export function zonedDateKey(epochMs: number, timeZone: string): string {
  const parts = zonedParts(epochMs, safeTimeZone(timeZone));
  return formatDateKey(parts.year, parts.month, parts.day);
}

export function addDays(dateKey: string, days: number): string {
  const shifted = new Date(dateKeyUtc(dateKey) + days * AUDIT_DAY_MS);
  return formatDateKey(shifted.getUTCFullYear(), shifted.getUTCMonth() + 1, shifted.getUTCDate());
}

export function isWeekendDateKey(dateKey: string): boolean {
  return WEEKEND_DAYS.includes(new Date(dateKeyUtc(dateKey)).getUTCDay());
}

function daysBetween(from: string, to: string): number {
  return Math.round((dateKeyUtc(to) - dateKeyUtc(from)) / AUDIT_DAY_MS);
}

function zonedWallTime(dateKey: string, dailyTime: string, timeZone: string): number {
  const [hour = 0, minute = 0] = parseNumbers(dailyTime, DAILY_TIME_PATTERN);
  const guess = dateKeyUtc(dateKey) + hour * MS_PER_HOUR + minute * 60 * MS_PER_SECOND;
  const first = guess - zonedOffsetMs(guess, timeZone);
  return guess - zonedOffsetMs(first, timeZone);
}

interface SlotSeries {
  at: (index: number) => number;
  indexAtOrBefore: (epochMs: number) => number;
  skipped: (at: number) => boolean;
}

// NOTE(ali): calendar cadences (multiples of 24 h) keep the local wall time across DST; others are fixed durations.
function slotSeries(settings: AuditCadenceSettings): SlotSeries {
  const timeZone = safeTimeZone(settings.timeZone);
  const anchorDate = settings.anchorDate ?? DEFAULT_ANCHOR_DATE;
  const skipped = (at: number): boolean => settings.skipWeekends && isWeekendDateKey(zonedDateKey(at, timeZone));
  if (settings.intervalHours % AUDIT_HOURS_PER_DAY === 0) {
    const stepDays = settings.intervalHours / AUDIT_HOURS_PER_DAY;
    const at = (index: number): number => zonedWallTime(addDays(anchorDate, index * stepDays), settings.dailyTime, timeZone);
    const indexAtOrBefore = (epochMs: number): number => {
      const index = Math.floor(daysBetween(anchorDate, zonedDateKey(epochMs, timeZone)) / stepDays);
      return at(index) > epochMs ? index - 1 : index;
    };
    return { at, indexAtOrBefore, skipped };
  }
  const anchorAt = zonedWallTime(anchorDate, settings.dailyTime, timeZone);
  const stepMs = settings.intervalHours * MS_PER_HOUR;
  return { at: (index) => anchorAt + index * stepMs, indexAtOrBefore: (epochMs) => Math.floor((epochMs - anchorAt) / stepMs), skipped };
}

export function latestDueAuditSlot(settings: AuditCadenceSettings, now: number): number | null {
  const series = slotSeries(settings);
  const latest = series.indexAtOrBefore(now);
  for (let index = latest; index >= 0 && index > latest - MAX_SLOT_SCAN; index -= 1) {
    const at = series.at(index);
    if (!series.skipped(at)) return at;
  }
  return null;
}

export function upcomingAuditSlots(settings: AuditCadenceSettings, after: number, count: number): number[] {
  const series = slotSeries(settings);
  const slots: number[] = [];
  const first = Math.max(0, series.indexAtOrBefore(after) + 1);
  for (let index = first; slots.length < count && index < first + count * MAX_SLOT_SCAN; index += 1) {
    const at = series.at(index);
    if (at > after && !series.skipped(at)) slots.push(at);
  }
  return slots;
}

export function hasAuditSlots(settings: AuditCadenceSettings, now: number): boolean {
  return upcomingAuditSlots(settings, now, 1).length > 0;
}

// NOTE(ali): rows written before the cadence setting only carry the consumed local date.
export function consumedAuditSlot(settings: AuditCadenceSettings, state: Pick<AuditProjectState, "lastScheduledAt" | "lastScheduledDate">): number | null {
  if (state.lastScheduledAt !== null) return state.lastScheduledAt;
  if (state.lastScheduledDate === null) return null;
  return zonedWallTime(state.lastScheduledDate, settings.dailyTime, safeTimeZone(settings.timeZone));
}

export function pendingAuditSlot(settings: AuditCadenceSettings, state: Pick<AuditProjectState, "lastScheduledAt" | "lastScheduledDate">, now: number): number | null {
  const due = latestDueAuditSlot(settings, now);
  if (due === null) return null;
  const consumed = consumedAuditSlot(settings, state);
  return consumed !== null && consumed >= due ? null : due;
}

export function nextAuditRunAt(settings: AuditProjectSettings, state: AuditProjectState, now: number): number | null {
  if (!settings.enabled) return null;
  return pendingAuditSlot(settings, state, now) ?? upcomingAuditSlots(settings, now, 1)[0] ?? null;
}
