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

const DATETIME_FORMAT: Intl.DateTimeFormatOptions = { dateStyle: "medium", timeStyle: "short" };

export function formatDateTime(ms: number): string {
  return new Date(ms).toLocaleString("fr-FR", DATETIME_FORMAT);
}

/** Verb describing how a ticket ended, for the finished-at line. */
export function finishedKindLabel(ticket: Pick<Ticket, "column" | "stage">): string {
  if (ticket.column === "merged") return "PR mergée";
  if (ticket.column === "done") return "Terminé";
  if (ticket.column === "abandoned") return "Abandonné";
  if (ticket.stage === "failed") return "Échec";
  if (ticket.stage === "stalled") return "Bloqué";
  if (ticket.stage === "interrupted") return "Interrompu";
  return "Terminé";
}
