/**
 * Selection of the findings a review pass actually publishes. Shared by the publication path and by
 * the done gate so both derive the same GitHub review event from the same set.
 */

import { MAX_REVIEW_ROUNDS, type ReviewDepth } from "../../shared/constants.ts";
import type { ReviewFinding, ReviewKind } from "../../shared/protocol.ts";
import type { Ticket } from "../../shared/schemas.ts";
import type { ReviewPass } from "../db/store.ts";

import {
  DEFAULT_FINDING_RENDER_STYLE,
  keptFindings,
  type DimensionFinding,
  type FindingRenderStyle,
} from "./reviewFindings.ts";

const LIGHT_REVIEW_KINDS: readonly ReviewKind[] = ["quality", "conventions", "regression", "logic"];
const FULL_REVIEW_KINDS: readonly ReviewKind[] = [...LIGHT_REVIEW_KINDS, "architecture", "security"];

export function requiredReviewKinds(depth: ReviewDepth): readonly ReviewKind[] {
  return depth === "full" ? FULL_REVIEW_KINDS : LIGHT_REVIEW_KINDS;
}

/**
 * Every required dimension of the pass, flattened with the dimension that reported it. `null` when
 * one of them is missing or not completed: extra dimensions the pass happens to hold are ignored,
 * exactly like the publication path.
 */
export function passDimensionFindings(reviewPass: ReviewPass | null): DimensionFinding[] | null {
  if (reviewPass === null) return null;
  const entries: DimensionFinding[] = [];
  for (const kind of requiredReviewKinds(reviewPass.reviewDepth)) {
    const result = reviewPass.results[kind];
    if (result?.status !== "completed") return null;
    entries.push(...result.findings.map((finding) => ({ kind, finding })));
  }
  return entries;
}

/** The findings `publish_review` posts for this pass, or `null` while the pass is incomplete. */
export function publishedReviewFindings(
  reviewPass: ReviewPass | null,
  style: FindingRenderStyle = DEFAULT_FINDING_RENDER_STYLE,
): ReviewFinding[] | null {
  const entries = passDimensionFindings(reviewPass);
  return entries === null ? null : keptFindings(entries, style);
}

/**
 * How many review passes a ticket may consume before the done gate accepts open `revise` findings.
 * `argusMultiLoop` buys exactly one extra pass on top of the default budget.
 */
export function allowedReviewPasses(ticket: Pick<Ticket, "argusMultiLoop"> | null): number {
  return ticket?.argusMultiLoop === true ? MAX_REVIEW_ROUNDS + 1 : MAX_REVIEW_ROUNDS;
}

export interface UnreviewedChanges {
  paths: string[];
  count: number | null;
}

const UNREVIEWED_SECTION_START = "<!-- kanban-unreviewed-changes:start -->";
const UNREVIEWED_SECTION_END = "<!-- kanban-unreviewed-changes:end -->";
const UNREVIEWED_SECTION_HEADING = "## Fichiers modifiés après la dernière review (non relus)";
const UNREVIEWED_SECTION_INTRO = "Le budget de passes de review était épuisé : ces fichiers ont changé après la dernière passe et n'ont pas été relus par les reviewers indépendants.";
const UNREVIEWED_SECTION_UNKNOWN = "Liste indisponible : la dernière passe n'a pas conservé l'empreinte de chaque fichier.";

function unreviewedPathLines(changes: UnreviewedChanges): string[] {
  if (changes.paths.length === 0) return [UNREVIEWED_SECTION_UNKNOWN];
  const lines = changes.paths.map((path) => `- \`${path}\``);
  const hidden = (changes.count ?? changes.paths.length) - changes.paths.length;
  if (hidden > 0) lines.push(`- … et ${hidden} autre(s) fichier(s)`);
  return lines;
}

export function unreviewedChangesReport(changes: UnreviewedChanges): string {
  return [UNREVIEWED_SECTION_HEADING, "", UNREVIEWED_SECTION_INTRO, "", ...unreviewedPathLines(changes)].join("\n");
}

export function withUnreviewedChangesSection(body: string, changes: UnreviewedChanges): string {
  const section = [UNREVIEWED_SECTION_START, unreviewedChangesReport(changes), UNREVIEWED_SECTION_END].join("\n");
  const start = body.indexOf(UNREVIEWED_SECTION_START);
  const end = start === -1 ? -1 : body.indexOf(UNREVIEWED_SECTION_END, start);
  if (end !== -1) return `${body.slice(0, start)}${section}${body.slice(end + UNREVIEWED_SECTION_END.length)}`;
  const trimmed = body.trimEnd();
  return trimmed.length === 0 ? section : `${trimmed}\n\n${section}`;
}
