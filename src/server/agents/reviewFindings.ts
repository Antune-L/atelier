/**
 * Pure helpers shared by the review report and the GitHub publication: language gate on what a
 * reviewer emits, self-refuting finding filter, cross-dimension deduplication and the GitHub review
 * event derived from the retained severities.
 */

import type { ReviewFinding, ReviewKind } from "../../shared/protocol.ts";
import type { ReviewPublicationEvent } from "../system/types.ts";

/** Whole words that, past FRENCH_STOP_WORD_THRESHOLD hits, mark prose as French. */
const FRENCH_STOP_WORDS = [
  "le", "la", "les", "des", "une", "un", "du", "dans", "est", "sont", "pas", "pour", "avec", "sur",
  "mais", "donc", "aussi", "deja", "cette", "ces", "doit", "peut", "sinon", "apres", "avant",
  "alors", "lors", "selon", "afin", "encore", "toujours", "jamais", "aucun", "aucune", "ligne",
  "fichier",
] as const;
const FRENCH_STOP_WORD_THRESHOLD = 3;
const FRENCH_DIACRITICS = /[àâçéèêëîïôùûœ]/i;
/** Backticked, guillemet-quoted or double-quoted spans, in one pass. */
const QUOTED_SPAN = /`[^`]*`|«[^»]*»|"[^"]*"/g;
const FRENCH_STOP_WORD_PATTERN = new RegExp(`\\b(?:${FRENCH_STOP_WORDS.join("|")})\\b`, "gi");

/** Quoted repository strings stay verbatim, so they must not count towards the French verdict. */
function withoutQuotedSpans(value: string): string {
  return value.replaceAll(QUOTED_SPAN, " ");
}

/**
 * Mechanical French detector: diacritics outside quoted spans, or enough French stop words.
 * `déjà`/`après` are also matched without their accents, so an unaccented French text still trips.
 */
export function looksFrench(value: string): boolean {
  const prose = withoutQuotedSpans(value);
  if (FRENCH_DIACRITICS.test(prose)) return true;
  const normalized = prose.normalize("NFD").replaceAll(/\p{Diacritic}/gu, "");
  return (normalized.match(FRENCH_STOP_WORD_PATTERN)?.length ?? 0) >= FRENCH_STOP_WORD_THRESHOLD;
}

/** Every prose string a reviewer emits, gated together. */
export function reviewProseIsFrench(result: { summary: string; findings: ReviewFinding[] }): boolean {
  if (looksFrench(result.summary)) return true;
  return result.findings.some((finding) =>
    looksFrench(finding.summary) || looksFrench(finding.evidence) || looksFrench(finding.ruleSource ?? ""));
}

/**
 * Concession phrases whose presence means the reviewer itself downgraded the finding to a non-defect.
 * Whole phrases only: a bare word like `optional` or `latent` also occurs in legitimate evidence
 * ("the `timeout` argument is optional"), so matching it would silently discard real defects.
 */
const SELF_REFUTING_MARKERS = [
  "not a defect",
  "not a bug",
  "not an actual bug",
  "pas un bug",
  "pas un defaut",
  "low priority",
  "optional improvement",
  "nice to have",
  "may be unreachable",
  "not reachable in practice",
  "non atteignable",
  "pre-existing and untouched",
  "preexisting and untouched",
  "preexiste",
  "herite de",
  "question rather than a finding",
  "accepted operational risk",
  "latent issue",
  "latent bug",
  "cosmetic only",
  "impact cosmetique",
] as const;

const REGEX_METACHARACTERS = /[.*+?^${}()|[\]\\]/g;
const WHITESPACE_RUN = /\s+/g;

function markerPattern(marker: string): string {
  return marker.replaceAll(REGEX_METACHARACTERS, String.raw`\$&`).replaceAll(WHITESPACE_RUN, String.raw`\s+`);
}

/** Trailing letters tolerated after a marker, so `préexiste` also matches `préexistent`. */
const MARKER_INFLECTION = String.raw`\p{L}*`;
const SELF_REFUTING_PATTERN = new RegExp(
  String.raw`\b(?:${SELF_REFUTING_MARKERS.map(markerPattern).join("|")})${MARKER_INFLECTION}\b`,
  "iu",
);

/** Accents are stripped so `préexiste`/`hérité de` match whichever way the reviewer spelled them. */
function withoutDiacritics(value: string): string {
  return value.normalize("NFD").replaceAll(/\p{Diacritic}/gu, "");
}

/**
 * True when the finding's own wording concedes it is not an actionable defect. A `critical` finding
 * is never refuted this way: dropping it silently would hide a real defect, and rejecting it is the
 * verifier's job.
 */
export function isSelfRefuting(finding: ReviewFinding): boolean {
  if (finding.severity === "critical") return false;
  return SELF_REFUTING_PATTERN.test(withoutDiacritics(`${finding.summary}\n${finding.evidence}`));
}

/** Max distance between two lines of one file still considered the same defect. */
const DUPLICATE_LINE_DISTANCE = 25;
/** Min Jaccard similarity of the normalized summary tokens for two findings to be duplicates. */
const DUPLICATE_SIMILARITY = 0.5;
/** Tokens shorter than this carry no signal (articles, operators). */
const MIN_TOKEN_LENGTH = 3;
const SEVERITY_RANK: Record<ReviewFinding["severity"], number> = { critical: 3, major: 2, minor: 1 };
const ALSO_FLAGGED_PREFIX = "Also flagged by: ";

export interface DimensionFinding {
  kind: ReviewKind | null;
  finding: ReviewFinding;
}

function summaryTokens(summary: string): Set<string> {
  const words = summary
    .toLocaleLowerCase()
    .replaceAll(/[^\p{Letter}\p{Number}]+/gu, " ")
    .split(" ")
    .filter((token) => token.length >= MIN_TOKEN_LENGTH);
  return new Set(words);
}

function jaccard(left: Set<string>, right: Set<string>): number {
  if (left.size === 0 || right.size === 0) return 0;
  let shared = 0;
  for (const token of left) {
    if (right.has(token)) shared += 1;
  }
  return shared / (left.size + right.size - shared);
}

function hasSimilarSummary(left: ReviewFinding, right: ReviewFinding): boolean {
  return jaccard(summaryTokens(left.summary), summaryTokens(right.summary)) >= DUPLICATE_SIMILARITY;
}

function isSameDefect(left: ReviewFinding, right: ReviewFinding): boolean {
  if (left.summary === right.summary && left.evidence === right.evidence && left.path === right.path
    && left.line === right.line) {
    return true;
  }
  if (left.path === null || left.path !== right.path) return false;
  if (left.line === null || right.line === null) return left.line === right.line && hasSimilarSummary(left, right);
  if (left.line === right.line) return true;
  if (Math.abs(left.line - right.line) > DUPLICATE_LINE_DISTANCE) return false;
  return hasSimilarSummary(left, right);
}

function mergeCluster(cluster: DimensionFinding[]): ReviewFinding {
  const winner = cluster.reduce((best, entry) =>
    SEVERITY_RANK[entry.finding.severity] > SEVERITY_RANK[best.finding.severity] ? entry : best);
  const evidence = cluster.reduce((longest, entry) =>
    entry.finding.evidence.length > longest.length ? entry.finding.evidence : longest, "");
  const otherKinds = [...new Set(cluster
    .filter((entry) => entry !== winner && entry.kind !== null && entry.kind !== winner.kind)
    .map((entry) => entry.kind))];
  const alsoFlagged = otherKinds.length === 0 ? "" : `\n\n${ALSO_FLAGGED_PREFIX}${otherKinds.join(", ")}.`;
  return { ...winner.finding, evidence: `${evidence}${alsoFlagged}` };
}

/** `path:line` identity of a finding, or null when it cannot be anchored in the diff. */
function findingAnchor(finding: ReviewFinding): string | null {
  if (finding.path === null || finding.line === null) return null;
  return `${finding.path}:${finding.line}`;
}

/**
 * Cluster duplicate findings across reviewer dimensions. Indexing the clusters by anchor also
 * guarantees that no two survivors share one `path:line` (GitHub would stack several comments on
 * the same diff line).
 */
export function dedupeFindings(entries: DimensionFinding[]): ReviewFinding[] {
  const clusters: DimensionFinding[][] = [];
  const byAnchor = new Map<string, DimensionFinding[]>();
  for (const entry of entries) {
    const anchor = findingAnchor(entry.finding);
    let cluster = anchor === null ? undefined : byAnchor.get(anchor);
    if (cluster === undefined) {
      cluster = clusters.find((candidate) =>
        candidate.some((member) => isSameDefect(member.finding, entry.finding)));
    }
    if (cluster === undefined) {
      cluster = [];
      clusters.push(cluster);
    }
    cluster.push(entry);
    if (anchor !== null) byAnchor.set(anchor, cluster);
  }
  return clusters.map(mergeCluster);
}

/** GitHub review event carried by the same review as the comments. */
export function reviewPublicationEvent(findings: ReviewFinding[]): ReviewPublicationEvent {
  if (findings.length === 0) return "APPROVE";
  return findings.some((finding) => finding.severity !== "minor") ? "REQUEST_CHANGES" : "COMMENT";
}

/** Findings actually published: verified, not self-refuting, deduplicated across dimensions. */
export function keptFindings(entries: DimensionFinding[]): ReviewFinding[] {
  const retained = entries.filter((entry) =>
    entry.finding.verificationStatus !== "rejected" && !isSelfRefuting(entry.finding));
  return dedupeFindings(retained);
}

/**
 * Exact-duplicate filter used when persisting one dimension: unlike `dedupeFindings`, it never
 * merges across dimensions, so every severity and verification status survives untouched.
 */
export function dedupeIdenticalFindings(findings: ReviewFinding[]): ReviewFinding[] {
  const seen = new Set<string>();
  return findings.filter((finding) => {
    const key = JSON.stringify([
      finding.severity,
      finding.summary.trim().toLocaleLowerCase(),
      finding.evidence.trim().toLocaleLowerCase(),
      finding.ruleSource?.trim().toLocaleLowerCase() ?? null,
      finding.path,
      finding.line,
    ]);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
