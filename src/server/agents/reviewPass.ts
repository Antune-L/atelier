/**
 * Selection of the findings a review pass actually publishes. Shared by the publication path and by
 * the done gate so both derive the same GitHub review event from the same set.
 */

import { MAX_REVIEW_ROUNDS, type ReviewDepth, type UserReviewVerdict } from "../../shared/constants.ts";
import type { ReviewFinding, ReviewKind } from "../../shared/protocol.ts";
import type { Ticket } from "../../shared/schemas.ts";
import type { UserDismissal } from "../db/reviewDecisions.ts";
import type { ReviewPass } from "../db/store.ts";
import type { ReviewPublicationEvent } from "../system/types.ts";

import {
  DEFAULT_FINDING_RENDER_STYLE,
  dedupeFindings,
  qualifiedFindingId,
  retainedFindings,
  reviewPublicationEvent,
  type DimensionFinding,
  type FindingRenderStyle,
} from "./reviewFindings.ts";

const LIGHT_REVIEW_KINDS: readonly ReviewKind[] = ["quality", "conventions", "regression", "logic"];
const FULL_REVIEW_KINDS: readonly ReviewKind[] = [...LIGHT_REVIEW_KINDS, "architecture", "security"];

export function requiredReviewKinds(depth: ReviewDepth): readonly ReviewKind[] {
  return depth === "full" ? FULL_REVIEW_KINDS : LIGHT_REVIEW_KINDS;
}

export function reviewPassMarker(passId: string): string {
  return `<!-- kanban-review-pass:${passId} -->`;
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

export interface DismissedFinding {
  id: string;
  finding: ReviewFinding;
  dismissal: UserDismissal;
}

export interface EffectiveReviewResult {
  findings: ReviewFinding[];
  dismissed: DismissedFinding[];
  event: ReviewPublicationEvent;
  note: string | null;
  skipPublicationReason: string | null;
}

function activeDismissal(reviewPass: ReviewPass, entry: DimensionFinding): UserDismissal | undefined {
  if (entry.kind === null) return undefined;
  const revision = reviewPass.results[entry.kind]?.revision;
  return reviewPass.decisions.dismissals.find((dismissal) =>
    dismissal.kind === entry.kind && dismissal.findingId === entry.finding.id && dismissal.resultRevision === revision);
}

export function completedDimensionFindings(reviewPass: ReviewPass, kinds: readonly ReviewKind[]): DimensionFinding[] {
  return kinds.flatMap((kind) => {
    const result = reviewPass.results[kind];
    return result?.status === "completed" ? result.findings.map((finding) => ({ kind, finding })) : [];
  });
}

export function applyUserDismissals(
  reviewPass: ReviewPass,
  entries: DimensionFinding[],
): { published: DimensionFinding[]; dismissed: DismissedFinding[] } {
  const dismissed: DismissedFinding[] = [];
  const published: DimensionFinding[] = [];
  for (const entry of retainedFindings(entries)) {
    const dismissal = activeDismissal(reviewPass, entry);
    if (dismissal === undefined) published.push(entry);
    else dismissed.push({ id: qualifiedFindingId(entry), finding: entry.finding, dismissal });
  }
  return { published, dismissed };
}

export function userReviewEvent(findings: ReviewFinding[], hasDismissals: boolean, verdict: UserReviewVerdict | null): ReviewPublicationEvent {
  if (verdict === "comment") return "COMMENT";
  const event = reviewPublicationEvent(findings);
  if (event === "APPROVE" && hasDismissals && verdict !== "approve") return "COMMENT";
  return event;
}

export function effectiveReviewResult(
  reviewPass: ReviewPass | null,
  style: FindingRenderStyle = DEFAULT_FINDING_RENDER_STYLE,
): EffectiveReviewResult | null {
  if (reviewPass === null || reviewPass.userStateCorrupt) return null;
  const entries = passDimensionFindings(reviewPass);
  if (entries === null) return null;
  const { published, dismissed } = applyUserDismissals(reviewPass, entries);
  const findings = dedupeFindings(published, style);
  const { verdict, note, skipPublication } = reviewPass.decisions;
  return {
    findings,
    dismissed,
    event: userReviewEvent(findings, dismissed.length > 0, verdict?.value ?? null),
    note: note?.text ?? null,
    skipPublicationReason: skipPublication?.reason ?? null,
  };
}

export interface ReviewFindingCounts {
  critical: number;
  major: number;
  minor: number;
  blocking: number;
}

export interface ReviewVerdictSummary {
  passId: string;
  verdict: ReviewPublicationEvent;
  findings: ReviewFindingCounts;
  dismissed: number;
}

function countFindingsBySeverity(findings: readonly ReviewFinding[]): ReviewFindingCounts {
  const counts: ReviewFindingCounts = { critical: 0, major: 0, minor: 0, blocking: 0 };
  for (const finding of findings) {
    counts[finding.severity] += 1;
    if (finding.severity !== "minor") counts.blocking += 1;
  }
  return counts;
}

export function reviewVerdictSummary(reviewPass: ReviewPass | null): ReviewVerdictSummary | null {
  const effective = effectiveReviewResult(reviewPass);
  if (reviewPass === null || effective === null) return null;
  return {
    passId: reviewPass.passId,
    verdict: effective.event,
    findings: countFindingsBySeverity(effective.findings),
    dismissed: effective.dismissed.length,
  };
}

/**
 * How many review passes a ticket may consume before the done gate accepts open `revise` findings.
 * `argusMultiLoop` buys exactly one extra pass on top of the default budget.
 */
export function allowedReviewPasses(ticket: Pick<Ticket, "argusMultiLoop"> | null): number {
  return ticket?.argusMultiLoop === true ? MAX_REVIEW_ROUNDS + 1 : MAX_REVIEW_ROUNDS;
}

/**
 * Whether delivery may proceed once the review budget is spent, with the remaining findings fixed
 * without a new pass. Only tickets that end in a pull request a human still merges qualify.
 */
export function acceptsReviewLimit(ticket: Pick<Ticket, "kind" | "stealth" | "directPush" | "autonomous" | "autonomousDelivery"> | null): boolean {
  if (ticket?.kind !== "feature" || ticket.stealth || ticket.directPush) return false;
  return !ticket.autonomous || ticket.autonomousDelivery === "pr_only";
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
