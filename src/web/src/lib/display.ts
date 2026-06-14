import { STAGE_LABELS, type Stage } from "@shared/constants";
import type { Ticket, TriageVerdict } from "@shared/schemas";

type BadgeVariant = "default" | "secondary" | "destructive" | "outline" | "warning" | "success" | "info";

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

const DATETIME_FORMAT: Intl.DateTimeFormatOptions = { dateStyle: "medium", timeStyle: "short" };

export function formatDateTime(ms: number): string {
  return new Date(ms).toLocaleString("fr-FR", DATETIME_FORMAT);
}

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

/** Verb describing how a ticket ended, for the finished-at line. */
export function finishedKindLabel(ticket: Pick<Ticket, "column" | "stage">): string {
  if (ticket.column === "merged") return "PR mergée";
  if (ticket.column === "reviewed") return "PR reviewed";
  if (ticket.column === "done") return "Terminé";
  if (ticket.column === "abandoned") return "Abandonné";
  if (ticket.stage === "failed") return "Échec";
  if (ticket.stage === "stalled") return "Bloqué";
  if (ticket.stage === "interrupted") return "Interrompu";
  return "Terminé";
}
