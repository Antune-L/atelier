import {
  AGENT_EFFORTS,
  AGENT_EFFORT_LABELS,
  AGENT_MODELS,
  AGENT_MODEL_LABELS,
  STAGE_LABELS,
  type AgentEffort,
  type AgentModel,
  type Stage,
} from "@shared/constants";
import type { Ticket, TriageVerdict } from "@shared/schemas";

import type { TabOption } from "@/components/ui/tabs";

type BadgeVariant = "default" | "secondary" | "destructive" | "outline" | "warning" | "success" | "info";

/** Ready-made segmented-control options for the agent model picker. */
export const AGENT_MODEL_OPTIONS: TabOption<AgentModel>[] = AGENT_MODELS.map((m) => ({
  value: m,
  label: AGENT_MODEL_LABELS[m],
}));

/** Ready-made segmented-control options for the agent reasoning-effort picker. */
export const AGENT_EFFORT_OPTIONS: TabOption<AgentEffort>[] = AGENT_EFFORTS.map((e) => ({
  value: e,
  label: AGENT_EFFORT_LABELS[e],
}));

const TRIAGE_VERDICT_VARIANTS: Record<TriageVerdict, BadgeVariant> = {
  implementable: "success",
  needs_info: "warning",
  needs_rework: "destructive",
};

const TRIAGE_VERDICT_DOTS: Record<TriageVerdict, { glyph: string; className: string; title: string }> = {
  implementable: { glyph: "✓", className: "text-success", title: "Implémentable" },
  needs_info: { glyph: "?", className: "text-warning", title: "Questions à répondre" },
  needs_rework: { glyph: "✗", className: "text-destructive", title: "À retravailler" },
};

export function triageVerdictVariant(verdict: TriageVerdict): BadgeVariant {
  return TRIAGE_VERDICT_VARIANTS[verdict];
}

export function triageVerdictDot(verdict: TriageVerdict): { glyph: string; className: string; title: string } {
  return TRIAGE_VERDICT_DOTS[verdict];
}

const STAGE_VARIANTS: Record<Stage, BadgeVariant> = {
  queued: "secondary",
  planning: "info",
  awaiting_answers: "warning",
  implementing: "info",
  reviewing: "info",
  fixing: "warning",
  testing: "info",
  opening_pr: "info",
  done: "success",
  failed: "destructive",
  interrupted: "destructive",
  stalled: "destructive",
};

const ANIMATED_STAGES: Stage[] = [
  "planning",
  "implementing",
  "reviewing",
  "fixing",
  "testing",
  "opening_pr",
];

export function stageLabel(stage: Stage): string {
  return STAGE_LABELS[stage];
}

export function stageVariant(stage: Stage): BadgeVariant {
  return STAGE_VARIANTS[stage];
}

export function isStageAnimated(stage: Stage): boolean {
  return ANIMATED_STAGES.includes(stage);
}

const PROGRESS_STAGES: Stage[] = [
  "queued",
  "planning",
  "implementing",
  "reviewing",
  "fixing",
  "testing",
  "opening_pr",
  "done",
];

export type ProgressColor = "info" | "success" | "destructive" | "warning";

export type StageProgress = { percent: number; color: ProgressColor };

export function stageProgress(stage: Stage): StageProgress {
  if (stage === "failed" || stage === "interrupted" || stage === "stalled") {
    return { percent: 0, color: "destructive" };
  }
  if (stage === "awaiting_answers") {
    const planningIdx = PROGRESS_STAGES.indexOf("planning");
    return { percent: (planningIdx / (PROGRESS_STAGES.length - 1)) * 100, color: "warning" };
  }
  const idx = PROGRESS_STAGES.indexOf(stage);
  const percent = idx < 0 ? 0 : (idx / (PROGRESS_STAGES.length - 1)) * 100;
  const color: ProgressColor = stage === "done" ? "success" : "info";
  return { percent, color };
}

const TOKEN_FORMATTER = new Intl.NumberFormat("fr-FR");

/** Thousands-grouped token count (e.g. "1 234 567"). Shared by the ticket detail and stats charts. */
export function formatTokens(n: number): string {
  return TOKEN_FORMATTER.format(n);
}

const DATETIME_FORMAT: Intl.DateTimeFormatOptions = { dateStyle: "medium", timeStyle: "short" };

export function formatDateTime(ms: number): string {
  return new Date(ms).toLocaleString("fr-FR", DATETIME_FORMAT);
}

const SECOND_MS = 1_000;
const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;
const LABEL_INSTANT = "à l'instant";

/** Returns a short human-readable duration since `startMs` (e.g. "2h", "3j", "à l'instant"). */
export function formatRelativeDuration(startMs: number, nowMs: number): string {
  const delta = nowMs - startMs;
  if (delta <= 0) return LABEL_INSTANT;
  if (delta < MINUTE_MS) return LABEL_INSTANT;
  if (delta < HOUR_MS) return `${Math.floor(delta / MINUTE_MS)}m`;
  if (delta < DAY_MS) return `${Math.floor(delta / HOUR_MS)}h`;
  return `${Math.floor(delta / DAY_MS)}j`;
}

/**
 * Epoch ms the card's elapsed timer should count from. In "À implémenter" it's when the
 * ticket entered that column (when work started); elsewhere it falls back to creation.
 */
export function ticketElapsedStart(ticket: Pick<Ticket, "column" | "implementingStartedAt" | "createdAt">): number {
  if (ticket.column === "implementing" && ticket.implementingStartedAt !== null) {
    return ticket.implementingStartedAt;
  }
  return ticket.createdAt;
}

/** Compact two-unit duration for a finished span (e.g. "45s", "12m", "2h 15m", "3j 4h"). */
export function formatDuration(ms: number): string {
  if (ms < MINUTE_MS) return `${Math.floor(ms / SECOND_MS)}s`;
  if (ms < HOUR_MS) return `${Math.floor(ms / MINUTE_MS)}m`;
  if (ms < DAY_MS) {
    const hours = Math.floor(ms / HOUR_MS);
    const minutes = Math.floor((ms % HOUR_MS) / MINUTE_MS);
    return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
  }
  const days = Math.floor(ms / DAY_MS);
  const hours = Math.floor((ms % DAY_MS) / HOUR_MS);
  return hours > 0 ? `${days}j ${hours}h` : `${days}j`;
}

/**
 * Wall-clock work duration in ms: from when the agent actually started (entering the
 * `implementing` stage, `implementationStartedAt`) to `finishedAt`. Falls back to
 * `implementingStartedAt` (column entry, queue-inclusive) for tickets created before the precise
 * stamp existed. Null when either bound is missing or the span is non-positive. Shared by the card
 * badge and the stats charts so both stay in sync.
 */
export function effectiveWorkDurationMs(span: {
  implementationStartedAt: number | null;
  implementingStartedAt: number | null;
  finishedAt: number | null;
}): number | null {
  const start = span.implementationStartedAt ?? span.implementingStartedAt;
  if (start === null || span.finishedAt === null) return null;
  const duration = span.finishedAt - start;
  return duration > 0 ? duration : null;
}

/** Card-badge duration: the agent's effective work time on a ticket. */
export function ticketImplementationDuration(
  ticket: Pick<Ticket, "implementationStartedAt" | "implementingStartedAt" | "finishedAt">,
): number | null {
  return effectiveWorkDurationMs(ticket);
}

const PR_URL_NUMBER_REGEX = /\/pull\/(\d+)/;

/** Extracts the PR number from a GitHub PR URL (e.g. ".../pull/123" → 123), or null. */
export function prNumberFromUrl(prUrl: string | null): number | null {
  if (prUrl === null) return null;
  const match = PR_URL_NUMBER_REGEX.exec(prUrl);
  if (match === null || match[1] === undefined) return null;
  return Number.parseInt(match[1], 10);
}

/** PR number to display on a card: stored `prNumber`, else parsed from `prUrl`. */
export function ticketPrNumber(ticket: Pick<Ticket, "prNumber" | "prUrl">): number | null {
  return ticket.prNumber ?? prNumberFromUrl(ticket.prUrl);
}

/** Columns a ticket can't serve as a dependency: only todo/implementing/prd are eligible. */
const NON_DEPENDABLE_COLUMNS: Ticket["column"][] = ["to_review", "done", "merged", "reviewed", "answered", "failed", "abandoned"];

/**
 * Tickets eligible to be picked as a dependency (PR-stack parent): same project, not the ticket
 * itself, and able to reach a PR. Shared by the creation dialog and the ticket detail editor.
 */
export function dependencyCandidates(
  tickets: Ticket[],
  project: string,
  selfId: string | null,
  currentDependsOn: string | null = null,
): Ticket[] {
  return tickets.filter(
    (t) =>
      t.project === project &&
      t.id !== selfId &&
      // The current dependsOn parent stays selectable even from a normally non-dependable column
      // (e.g. a split mother in "done"), so the select renders the real current value.
      (t.id === currentDependsOn || !NON_DEPENDABLE_COLUMNS.includes(t.column)),
  );
}

/** Verb describing how a ticket ended, for the finished-at line. */
export function finishedKindLabel(ticket: Pick<Ticket, "column" | "stage">): string {
  if (ticket.column === "merged") return "PR mergée";
  if (ticket.column === "reviewed") return "PR reviewed";
  if (ticket.column === "answered") return "Répondu";
  if (ticket.column === "done") return "Terminé";
  if (ticket.column === "abandoned") return "Abandonné";
  if (ticket.stage === "failed") return "Échec";
  if (ticket.stage === "stalled") return "Bloqué";
  if (ticket.stage === "interrupted") return "Interrompu";
  return "Terminé";
}
