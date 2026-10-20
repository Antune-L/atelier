import { COMMIT_LANGUAGES, REVIEW_LEVEL_LABELS, REVIEW_LEVELS } from "../../../shared/constants.ts";
import type { CommitLanguage, ReviewLevel } from "../../../shared/constants.ts";

interface PrDescriptionTemplate {
  reviewPrefix: string;
  context: string;
  changes: string;
  vigilance: string;
  levels: Record<ReviewLevel, string>;
}

export const PR_DESCRIPTION_TEMPLATES: Record<CommitLanguage, PrDescriptionTemplate> = {
  fr: {
    reviewPrefix: "Relecture humaine :",
    context: "## Contexte",
    changes: "## Ce qui a été fait",
    vigilance: "## Points de vigilance",
    levels: REVIEW_LEVEL_LABELS.fr,
  },
  en: {
    reviewPrefix: "Human review:",
    context: "## Context",
    changes: "## What changed",
    vigilance: "## Points to review",
    levels: REVIEW_LEVEL_LABELS.en,
  },
};

export interface PrDescriptionInput {
  language: CommitLanguage;
  level: ReviewLevel;
  reason: string;
  context: string;
  changes: string;
  vigilance?: string | null;
}

export function renderReviewLevelLine(language: CommitLanguage, level: ReviewLevel, reason: string): string {
  const template = PR_DESCRIPTION_TEMPLATES[language];
  return `**${template.reviewPrefix} ${template.levels[level]}** — ${reason}`;
}

export function renderPrDescription(input: PrDescriptionInput): string {
  const template = PR_DESCRIPTION_TEMPLATES[input.language];
  const sections = [
    renderReviewLevelLine(input.language, input.level, input.reason),
    `${template.context}\n\n${input.context}`,
    `${template.changes}\n\n${input.changes}`,
  ];
  if (input.vigilance) sections.push(`${template.vigilance}\n\n${input.vigilance}`);
  return sections.join("\n\n");
}

function headingLines(body: string): Set<string> {
  return new Set(body.split(/\r?\n/).map((line) => line.trim().toLowerCase()));
}

export function hasStructuredPrDescription(body: string): boolean {
  const lines = headingLines(body);
  return COMMIT_LANGUAGES.some((language) => {
    const template = PR_DESCRIPTION_TEMPLATES[language];
    return lines.has(template.context.toLowerCase()) && lines.has(template.changes.toLowerCase());
  });
}

export function maxReviewLevel(previous: ReviewLevel | null, next: ReviewLevel): ReviewLevel {
  if (previous === null) return next;
  return REVIEW_LEVELS.indexOf(previous) >= REVIEW_LEVELS.indexOf(next) ? previous : next;
}
