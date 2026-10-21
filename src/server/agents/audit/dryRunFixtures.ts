import type { AuditAgentFinding, AuditFinding, AuditLens, AuditReviewState, AuditVerdict, AuditVerdictRecord } from "../../../shared/audit.ts";
import type { AuditRange, AuditRangeChunk } from "../../system/auditRange.ts";

import { auditFingerprint } from "./fingerprint.ts";

import type { AuditExecution, AuditPipelineCandidate, AuditPipelineResult } from "./engine.ts";

const SIMULATED_REASON = "Verdict simulé (mode simulation) : aucun agent n'a été lancé.";
const PASSED_CITATION = { fileExists: true, lineInRange: true, excerptFound: true };

interface CannedFinding {
  finding: Omit<AuditAgentFinding, "introducedBy">;
  lens: AuditLens;
  reviewState: AuditReviewState;
  verdicts: Array<{ role: AuditVerdictRecord["role"]; verdict: AuditVerdict }>;
}

const CANNED_FINDINGS: CannedFinding[] = [
  {
    lens: "security",
    reviewState: "confirmed",
    verdicts: [{ role: "verifier", verdict: "confirmed" }, { role: "second_verifier", verdict: "confirmed" }],
    finding: {
      class: "security",
      severity: "critical",
      title: "Facture lisible par un autre client (simulation)",
      file: "src/example.ts",
      line: 1,
      symbol: "getInvoice",
      scenario: "Un utilisateur de l'organisation A demande l'identifiant d'une facture de l'organisation B.",
      expected: "La route filtre les factures par organisation, comme la route de liste voisine.",
      expectedSource: "src/example.ts:1",
      impact: "Fuite de factures entre clients.",
      evidence: "export const example = 2;",
      suggestedFix: null,
    },
  },
  {
    lens: "regression",
    reviewState: "confirmed",
    verdicts: [{ role: "verifier", verdict: "confirmed" }],
    finding: {
      class: "regression",
      severity: "warning",
      title: "Consommateur non mis à jour après le renommage (simulation)",
      file: "src/example.ts",
      line: 1,
      symbol: "example",
      scenario: "L'écran de synthèse lit encore l'ancien champ renvoyé par l'API.",
      expected: "Chaque consommateur suit le nouveau contrat.",
      expectedSource: "src/example.ts:1",
      impact: "Le total affiché reste vide pour tous les utilisateurs de l'écran.",
      evidence: "export const example = 2;",
      suggestedFix: null,
    },
  },
  {
    lens: "logic",
    reviewState: "contested",
    verdicts: [{ role: "verifier", verdict: "confirmed" }, { role: "second_verifier", verdict: "refuted" }],
    finding: {
      class: "business_logic",
      severity: "critical",
      title: "Arrondi appliqué à chaque ligne au lieu du total (simulation)",
      file: "src/example.ts",
      line: 1,
      symbol: "computeTotal",
      scenario: "Une commande de trois lignes à 0,333 € chacune.",
      expected: "Le total est arrondi une seule fois, à la fin.",
      expectedSource: "Description de la PR #1 (simulation)",
      impact: "Écart d'un centime sur les totaux facturés.",
      evidence: "export const example = 2;",
      suggestedFix: null,
    },
  },
  {
    lens: "integrity",
    reviewState: "rejected",
    verdicts: [{ role: "verifier", verdict: "refuted" }],
    finding: {
      class: "data_integrity",
      severity: "warning",
      title: "Suppression en masse hors transaction (simulation)",
      file: "src/example.ts",
      line: 1,
      symbol: "purgeDrafts",
      scenario: "Une erreur réseau survient au milieu de la boucle de suppression.",
      expected: "La purge est atomique.",
      expectedSource: "src/example.ts:1",
      impact: "Brouillons partiellement supprimés.",
      evidence: "export const example = 2;",
      suggestedFix: null,
    },
  },
];

function verdictRecord(execution: AuditExecution, role: AuditVerdictRecord["role"], verdict: AuditVerdict, finding: Pick<AuditAgentFinding, "severity">, revision: string, at: number): AuditVerdictRecord {
  return { role, provider: execution.provider, model: execution.model, verdict, severity: finding.severity, reason: SIMULATED_REASON, revision, at };
}

export function dryRunPipelineResult(range: AuditRange, chunk: AuditRangeChunk, execution: AuditExecution, now: number): AuditPipelineResult {
  const introducedBy = chunk.commits.at(-1)?.sha ?? chunk.headSha;
  const candidates: AuditPipelineCandidate[] = CANNED_FINDINGS.map((canned) => {
    const finding: AuditAgentFinding = { ...canned.finding, introducedBy };
    return {
      finding,
      lens: canned.lens,
      chunkIndex: chunk.index,
      fingerprint: auditFingerprint(finding),
      citation: PASSED_CITATION,
      reviewState: canned.reviewState,
      verdicts: canned.verdicts.map(({ role, verdict }) => verdictRecord(execution, role, verdict, finding, range.tipSha, now)),
      duplicateOf: null,
    };
  });
  return {
    status: "completed",
    baseSha: range.baseSha,
    tipSha: range.tipSha,
    coveredSha: chunk.headSha,
    commitCount: chunk.commits.length,
    deferredCommitCount: 0,
    coverage: [{ index: chunk.index, baseSha: chunk.baseSha, headSha: chunk.headSha, commitCount: chunk.commits.length, status: "complete", filesRead: chunk.files.length, skipped: [] }],
    candidates,
    analystSessions: 0,
    verifierSessions: 0,
    usageByModel: {},
    costUsd: null,
    error: null,
  };
}

export function dryRunReviewVerdict(finding: AuditFinding, execution: AuditExecution, mode: "recheck" | "arbiter", revision: string, now: number): AuditVerdictRecord {
  return verdictRecord(execution, mode, "confirmed", finding, revision, now);
}
