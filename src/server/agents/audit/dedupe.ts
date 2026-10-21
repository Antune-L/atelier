import type { AuditAgentFinding, AuditSeverity } from "../../../shared/audit.ts";

import { normalizeAuditPath, normalizeAuditText } from "./fingerprint.ts";

import type { AuditKnownFinding } from "./engine.ts";

const DUPLICATE_LINE_DISTANCE = 25;
const DUPLICATE_SIMILARITY = 0.5;
const MIN_TOKEN_LENGTH = 3;
const AUDIT_SEVERITY_RANK: Record<AuditSeverity, number> = { critical: 2, warning: 1 };

export interface DedupeCandidate {
  finding: AuditAgentFinding;
  fingerprint: string;
  citationPassed: boolean;
}

export function lowerSeverity(current: AuditSeverity, proposed: AuditSeverity): AuditSeverity {
  return AUDIT_SEVERITY_RANK[proposed] < AUDIT_SEVERITY_RANK[current] ? proposed : current;
}

function titleTokens(title: string): Set<string> {
  return new Set(normalizeAuditText(title).split(" ").filter((token) => token.length >= MIN_TOKEN_LENGTH));
}

function similarTitles(left: string, right: string): boolean {
  const leftTokens = titleTokens(left);
  const rightTokens = titleTokens(right);
  if (leftTokens.size === 0 || rightTokens.size === 0) return false;
  let shared = 0;
  for (const token of leftTokens) {
    if (rightTokens.has(token)) shared += 1;
  }
  return shared / (leftTokens.size + rightTokens.size - shared) >= DUPLICATE_SIMILARITY;
}

function sameDefect(left: DedupeCandidate, right: DedupeCandidate): boolean {
  if (left.fingerprint === right.fingerprint) return true;
  if (normalizeAuditPath(left.finding.file) !== normalizeAuditPath(right.finding.file)) return false;
  if (left.finding.line === right.finding.line && left.finding.class === right.finding.class) return true;
  if (Math.abs(left.finding.line - right.finding.line) > DUPLICATE_LINE_DISTANCE) return false;
  return similarTitles(left.finding.title, right.finding.title);
}

function compareCandidates(left: DedupeCandidate, right: DedupeCandidate): number {
  if (left.citationPassed !== right.citationPassed) return left.citationPassed ? -1 : 1;
  return AUDIT_SEVERITY_RANK[right.finding.severity] - AUDIT_SEVERITY_RANK[left.finding.severity];
}

export function dedupeAuditCandidates<T extends DedupeCandidate>(candidates: readonly T[]): T[] {
  const ranked = [...candidates].sort(compareCandidates);
  const kept = new Set<T>();
  for (const candidate of ranked) {
    if ([...kept].some((existing) => sameDefect(existing, candidate))) continue;
    kept.add(candidate);
  }
  return candidates.filter((candidate) => kept.has(candidate));
}

function matchKnownFinding(candidate: Pick<DedupeCandidate, "finding" | "fingerprint">, known: readonly AuditKnownFinding[]): AuditKnownFinding | null {
  const exact = known.find((entry) => entry.fingerprint === candidate.fingerprint);
  if (exact) return exact;
  const file = normalizeAuditPath(candidate.finding.file);
  const symbol = candidate.finding.symbol.trim().toLocaleLowerCase();
  return known.find((entry) =>
    normalizeAuditPath(entry.file) === file
    && entry.symbol.trim().toLocaleLowerCase() === symbol
    && similarTitles(entry.title, candidate.finding.title)) ?? null;
}

export function screenKnownFindings<T extends Pick<DedupeCandidate, "finding" | "fingerprint"> & { duplicateOf: string | null }>(candidates: readonly T[], known: readonly AuditKnownFinding[], includeWarnings: boolean): T[] {
  return candidates.flatMap((candidate) => {
    if (!includeWarnings && candidate.finding.severity === "warning") return [];
    return [{ ...candidate, duplicateOf: matchKnownFinding(candidate, known)?.id ?? null }];
  });
}
