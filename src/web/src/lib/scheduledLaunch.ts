import { SCHEDULED_START_MIN_LEAD_MS } from "@shared/constants";
import type { Ticket } from "@shared/schemas";
import { startBlocker, type StartBlocker } from "@shared/startBlocker";

import { MINUTE_MS } from "@/lib/display";

const DEFAULT_LEAD_MINUTES = 60;
const DEFAULT_ROUNDING_MINUTES = 15;
const TIME_PATTERN = /^(\d{2}):(\d{2})$/;

const TIME_FORMAT = new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit" });
const SHORT_DATE_FORMAT = new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "2-digit" });
const DAY_LABEL_FORMAT = new Intl.DateTimeFormat("fr-FR", { weekday: "short", day: "numeric", month: "short" });

export const SCHEDULE_HINT =
  "Part à l'heure si l'app est ouverte et le Mac éveillé. Sinon la carte n'est pas lancée et un message s'affiche dessus.";
export const SCHEDULE_TOO_SOON_ERROR = "L'heure de lancement doit être au moins une minute dans le futur.";

const WAITING_REASONS: Record<StartBlocker, string> = {
  triage: "analyse en cours",
  approval: "approbation requise",
  dependency: "PR parente",
};
const SLOT_WAITING_REASON = "slot occupé";

export type ScheduledLaunchState =
  | { kind: "planned"; at: number }
  | { kind: "due"; at: number; reason: string }
  | { kind: "missed"; at: number };

export function formatScheduleTime(ms: number): string {
  return TIME_FORMAT.format(ms);
}

export function formatScheduleDate(ms: number): string {
  return SHORT_DATE_FORMAT.format(ms);
}

export function formatScheduleDay(ms: number): string {
  return DAY_LABEL_FORMAT.format(ms);
}

function isSameDay(a: number, b: number): boolean {
  return new Date(a).toDateString() === new Date(b).toDateString();
}

/** "23:00" when the launch is today, "25/10 07:30" otherwise. */
export function formatScheduleShort(ms: number, now: number): string {
  if (isSameDay(ms, now)) return formatScheduleTime(ms);
  return `${formatScheduleDate(ms)} ${formatScheduleTime(ms)}`;
}

export function missedLaunchMessage(ms: number): string {
  return `Lancement du ${formatScheduleDate(ms)} à ${formatScheduleTime(ms)} non effectué : l'application n'était pas active à l'heure prévue.`;
}

/** One hour ahead, rounded up to the next quarter hour. */
export function defaultScheduleValue(now: number): number {
  const date = new Date(now + DEFAULT_LEAD_MINUTES * MINUTE_MS);
  const roundedMinutes = Math.ceil(date.getMinutes() / DEFAULT_ROUNDING_MINUTES) * DEFAULT_ROUNDING_MINUTES;
  date.setMinutes(roundedMinutes, 0, 0);
  return date.getTime();
}

export function isScheduleTooSoon(value: number, now: number): boolean {
  return value < now + SCHEDULED_START_MIN_LEAD_MS;
}

/** Value of an `<input type="time">` ("HH:mm") for the given instant. */
export function timeInputValue(ms: number): string {
  const date = new Date(ms);
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

/** Same instant moved to another day, keeping its time of day. */
export function withDay(ms: number, day: Date): number {
  const date = new Date(ms);
  date.setFullYear(day.getFullYear(), day.getMonth(), day.getDate());
  return date.getTime();
}

/** Same day with the time of an `<input type="time">`; null while the input is empty or partial. */
export function withTime(ms: number, time: string): number | null {
  const match = TIME_PATTERN.exec(time);
  if (match === null) return null;
  const date = new Date(ms);
  date.setHours(Number(match[1]), Number(match[2]), 0, 0);
  return date.getTime();
}

/** What the card shows about its programmed launch, or null when there is none. */
export function scheduledLaunchState(ticket: Ticket, parent: Ticket | null, now: number): ScheduledLaunchState | null {
  if (ticket.scheduledStartMissedAt !== null) return { kind: "missed", at: ticket.scheduledStartMissedAt };
  if (ticket.scheduledStartAt === null) return null;
  if (ticket.scheduledStartAt > now) return { kind: "planned", at: ticket.scheduledStartAt };
  const blocker = startBlocker(ticket, parent);
  const reason = blocker === null ? SLOT_WAITING_REASON : WAITING_REASONS[blocker];
  return { kind: "due", at: ticket.scheduledStartAt, reason };
}
