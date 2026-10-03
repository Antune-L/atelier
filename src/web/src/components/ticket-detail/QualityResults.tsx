import { useState, type ReactNode } from "react";

import { ORCHESTRATOR_LABELS } from "@shared/constants";
import { QUALITY_ACTIVE_STATUSES } from "@shared/quality";
import type { QualityEvidence, QualityPermissionBlockReason, QualityRunStatus, QualityValidationRun, TicketQuality } from "@shared/quality";

import { Dialog } from "@/components/ui/dialog";
import { qualityEvidenceArtifactUrl } from "@/lib/api";
import { formatDateTime, formatDuration } from "@/lib/display";
import { formatQualityCriterionText, formatQualityEnvironmentLabel, formatQualityEvidenceOutput, formatQualityEvidenceSummary, formatQualityMessage, qualityFailureLabel, qualityModeLabel, qualityPermissionBlockMessage, qualityPhaseLabel, qualityRunTitle } from "@/lib/qualityMessages";
import { cn } from "@/lib/utils";

type ResultStatus = QualityRunStatus | "unverified" | "stale" | "unaccepted" | "simulated" | "preparation";

const RESULT_LABELS: Record<ResultStatus, string> = {
  queued: "En attente",
  running: "En cours",
  passed: "Vérifié",
  failed: "Échec",
  cancelled: "Annulé",
  interrupted: "Interrompu",
  inconclusive: "Non concluant",
  unverified: "À vérifier",
  stale: "Obsolète",
  unaccepted: "Preuve non acceptée",
  simulated: "Simulé",
  preparation: "À préparer",
};
const CLEANUP_LABELS: Record<QualityValidationRun["cleanupStatus"], string> = { complete: "terminé", pending: "en attente", failed: "échec" };
const IMAGE_ARTIFACT_EXTENSION = /\.(png|jpe?g|webp|gif)$/i;
const EXPLANATION_TEXT_LIMIT = 2_000;
const EXPLANATION_CRITERIA_LIMIT = 3;
const CRITERION_EXCERPT_LIMIT = 160;
const PREPARATION_COMMAND_SUMMARIES = ["Environment setup", "Dependency installation"];
const GENERIC_CRITERIA_FAILURE = "Some required acceptance criteria were not independently verified.";

function QualityArtifact({ ticketId, evidence }: { ticketId: string; evidence: QualityEvidence }) {
  const [previewFailed, setPreviewFailed] = useState(false);
  if (evidence.artifactPath === null) return null;
  const url = qualityEvidenceArtifactUrl(ticketId, evidence.id);
  const image = IMAGE_ARTIFACT_EXTENSION.test(evidence.artifactPath);
  return (
    <div className="space-y-2">
      <a href={url} target="_blank" rel="noopener noreferrer" className="text-xs text-info underline underline-offset-2">{image ? "Ouvrir la capture" : "Ouvrir la pièce jointe"}</a>
      {image && !previewFailed && <img src={url} alt={`Capture associée à la preuve : ${formatQualityEvidenceSummary(evidence)}`} loading="lazy" className="max-h-96 w-full rounded border border-border object-contain" onError={() => setPreviewFailed(true)} />}
      {previewFailed && <p role="status" className="text-xs text-muted-foreground">L’aperçu de la capture n’est pas disponible.</p>}
    </div>
  );
}

export function QualityResult({ status }: { status: ResultStatus }) {
  let tone = "text-muted-foreground";
  if (status === "passed") tone = "text-success";
  if (status === "failed") tone = "text-danger";
  if (status === "running" || status === "queued") tone = "text-info";
  if (status === "inconclusive" || status === "interrupted" || status === "stale" || status === "unaccepted") tone = "text-warning";
  return <span className={cn("shrink-0 rounded border border-current/20 px-1.5 py-0.5 text-2xs", tone)}>{RESULT_LABELS[status]}</span>;
}

export function qualityEvidenceResult(status: QualityRunStatus, current: boolean, accepted: boolean, simulated: boolean): ResultStatus {
  if (status !== "passed") return status;
  if (!current) return "stale";
  if (simulated) return "simulated";
  if (!accepted) return "unaccepted";
  return status;
}

export function qualityChecksStatus(run: QualityValidationRun, checks: QualityEvidence[]): QualityRunStatus {
  if (run.kind !== "full" || (run.phase === "checks" && QUALITY_ACTIVE_STATUSES.includes(run.status))) return run.status;
  if (checks.some((evidence) => evidence.status === "failed")) return "failed";
  if (checks.some((evidence) => evidence.status === "inconclusive")) return "inconclusive";
  if (checks.length > 0 && checks.every((evidence) => evidence.status === "passed")) return "passed";
  return run.status;
}

function qualityRunCriterionResults(quality: TicketQuality, run: QualityValidationRun) {
  const snapshot = quality.criteriaSnapshots.find((item) => item.id === run.criteriaSnapshotId);
  return snapshot?.criteria.map((criterion) => ({ criterion, creator: snapshot.createdBy, evidence: quality.evidence.filter((item) => item.runId === run.id && item.criterionId === criterion.id && item.kind === "behavior").at(-1) })) ?? [];
}

function QualityPermissionDiagnostics({ run }: { run: QualityValidationRun }) {
  if (run.status === "passed" || QUALITY_ACTIVE_STATUSES.includes(run.status)) return null;
  const diagnostic = run.diagnostic;
  if (diagnostic === null) return null;
  const counts = new Map<QualityPermissionBlockReason | null, number>();
  for (const denial of diagnostic.permissionDenials) {
    const reason = denial.blockReason ?? null;
    counts.set(reason, (counts.get(reason) ?? 0) + 1);
  }
  if (counts.size === 0) {
    if (diagnostic.category !== "permission_denial") return null;
    return <div className="min-w-0 max-w-full break-words rounded border border-warning/25 bg-warning/5 p-3 text-xs"><p>L’agent rapporte un refus. Aucun refus confirmé n’est enregistré pour cette exécution.</p><p className="mt-1 text-2xs text-muted-foreground">Le motif précis reste inconnu. Une nouvelle tentative conserve les mêmes autorisations.</p></div>;
  }
  return (
    <div className="min-w-0 max-w-full space-y-2 break-words rounded border border-warning/25 bg-warning/5 p-3">
      <p className="text-xs font-medium">Refus confirmés pendant cette vérification</p>
      {[...counts].map(([reason, count]) => {
        const message = qualityPermissionBlockMessage(reason);
        return <div key={reason ?? "unknown"} className="space-y-1 text-xs"><p>{message.reason} <span className="text-2xs text-muted-foreground">{count} {count === 1 ? "appel refusé" : "appels refusés"}</span></p><p className="text-2xs text-muted-foreground">{message.nextStep}</p></div>;
      })}
      <p className="text-2xs text-muted-foreground">Ces refus concernent des appels d’outils. Ils ne déterminent pas le résultat de chaque critère.</p>
    </div>
  );
}

export function QualityRunStatus({ run, current, quality, children }: { run: QualityValidationRun; current: boolean; quality: TicketQuality; children?: ReactNode }) {
  const accepted = run.evidenceAccepted || (run.kind === "checks" && run.technicalEvidenceAccepted);
  const requiredResults = qualityRunCriterionResults(quality, run).filter(({ criterion }) => criterion.required);
  const incomplete = run.status === "inconclusive" || (run.status === "failed" && run.failurePhase === "validating" && requiredResults.some(({ evidence }) => evidence?.status === "inconclusive") && !requiredResults.some(({ evidence }) => evidence?.status === "failed"));
  let status = run.status;
  let title = qualityRunTitle(run);
  if (run.status === "failed" && run.failurePhase !== null) title = qualityFailureLabel(run.failurePhase);
  if (incomplete) {
    title = "Vérification incomplète";
    status = "inconclusive";
  }
  const phase = run.failurePhase ?? run.phase;
  const detailedExplanation = children !== undefined && requiredResults.some(({ evidence }) => evidence !== undefined && evidence.status !== "passed");
  const showError = run.error !== null && !(detailedExplanation && run.error === GENERIC_CRITERIA_FAILURE);
  let phasePrefix = "Dernière étape";
  if (run.status === "queued") phasePrefix = "Prochaine étape";
  if (run.status === "running") phasePrefix = "Étape en cours";
  if (run.failurePhase !== null) phasePrefix = "Étape concernée";
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs"><span>{title}{run.provider !== null && ` · ${ORCHESTRATOR_LABELS[run.provider]}`}</span><QualityResult status={qualityEvidenceResult(status, current, accepted, run.simulated)} /></div>
      <QualityPermissionDiagnostics run={run} />
      {children}
      <p className="text-2xs text-muted-foreground">{run.simulated ? "Simulation" : "Exécution réelle"} · {qualityModeLabel(run.mode)}</p>
      {phase !== null && <p className="text-xs text-muted-foreground">{phasePrefix} : {qualityPhaseLabel(phase)}</p>}
      {showError && run.error !== null && <p role="alert" className={cn("text-xs", incomplete ? "text-warning" : "text-danger")}>{formatQualityMessage(run.error)}</p>}
    </div>
  );
}

export function QualityRunExplanation({ run, quality, current, onOpenEvidence }: { run: QualityValidationRun; quality: TicketQuality; current: boolean; onOpenEvidence: (evidence: QualityEvidence) => void }) {
  if (QUALITY_ACTIVE_STATUSES.includes(run.status)) return null;
  const unresolved = qualityRunCriterionResults(quality, run).filter(({ criterion, evidence }) => criterion.required && evidence?.status !== "passed");
  if (unresolved.length === 0) return null;
  const checks = quality.evidence.filter((evidence) => evidence.runId === run.id && evidence.kind === "command" && !PREPARATION_COMMAND_SUMMARIES.includes(evidence.summary));
  const checksPassed = !run.simulated && run.technicalEvidenceAccepted && checks.length > 0 && checks.every((evidence) => evidence.status === "passed");
  let explanation = "Des critères requis restent à vérifier avant la livraison.";
  if (checksPassed) explanation = "Contrôles techniques réussis. La validation indépendante de ces critères reste incomplète.";
  if (checksPassed && unresolved.length === 1) explanation = "Contrôles techniques réussis. Ce critère n’a pas pu être vérifié.";
  if (unresolved.some(({ evidence }) => evidence?.status === "failed")) {
    explanation = "Un critère requis est signalé en échec dans le compte rendu.";
    if (checksPassed) explanation = "Contrôles techniques réussis. Un critère requis est signalé en échec dans le compte rendu.";
  }
  return (
    <div className="space-y-3 border-t border-border pt-3">
      <p className="text-xs font-medium">{explanation}</p>
      {!current && <p className="text-xs text-warning">Ce résultat appartient à une version antérieure du code, des critères ou de la configuration.</p>}
      {unresolved.slice(0, EXPLANATION_CRITERIA_LIMIT).map(({ criterion, creator, evidence }) => (
        <div key={criterion.id} className="space-y-2 rounded border border-warning/25 bg-warning/5 p-3">
          <div className="flex flex-wrap items-center justify-between gap-2"><p className="text-xs font-medium">Critère {criterion.id} · requis</p><QualityResult status={evidence?.status ?? "unverified"} /></div>
          <p className="text-xs text-muted-foreground">{formatQualityCriterionText(criterion, creator).slice(0, CRITERION_EXCERPT_LIMIT)}{criterion.text.length > CRITERION_EXCERPT_LIMIT && "…"}</p>
          {evidence === undefined ? <p className="text-xs text-muted-foreground">Aucun résultat enregistré pour ce critère dans cette exécution.</p> : <>
            <p className="text-2xs text-muted-foreground">Compte rendu de {run.provider === null ? "l’agent de validation" : ORCHESTRATOR_LABELS[run.provider]}</p>
            <pre className="max-h-36 overflow-auto whitespace-pre-wrap break-words font-sans text-xs">{(evidence.output.trim() === "" ? formatQualityEvidenceSummary(evidence, run.simulated) : formatQualityEvidenceOutput(evidence, run.simulated)).slice(0, EXPLANATION_TEXT_LIMIT)}</pre>
            {evidence.output.length > EXPLANATION_TEXT_LIMIT && <p className="text-2xs text-muted-foreground">Extrait du compte rendu ; la preuve conserve le texte complet.</p>}
            <button type="button" className="text-xs text-info underline underline-offset-2" onClick={() => onOpenEvidence(evidence)}>Voir la preuve du critère {criterion.id}</button>
          </>}
        </div>
      ))}
      {unresolved.length > EXPLANATION_CRITERIA_LIMIT && <p className="text-xs text-muted-foreground">Les autres critères non vérifiés sont détaillés ci-dessous.</p>}
    </div>
  );
}

export function QualitySection({ number, title, action, children }: { number: number; title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="space-y-2.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 text-sm font-medium"><span className="flex h-5 w-5 items-center justify-center rounded border border-border font-mono text-2xs text-muted-foreground">{number}</span>{title}</h3>
        {action}
      </div>
      {children}
    </section>
  );
}

export function evidenceProvenance(evidence: QualityEvidence, run: QualityValidationRun | undefined): string {
  const parts: string[] = [];
  if (evidence.authority === "human") parts.push("Observation humaine");
  if (evidence.authority === "server") parts.push("Exécuté par le serveur");
  if (evidence.authority === "agent" && evidence.provider !== null) parts.push(ORCHESTRATOR_LABELS[evidence.provider]);
  if (run !== undefined) parts.push(run.simulated ? "Simulation" : "Exécution réelle");
  parts.push(formatDateTime(evidence.createdAt));
  return parts.join(" · ");
}

export function QualityEvidenceDialog({ evidence, quality, currentRunIds, onClose }: { evidence: QualityEvidence | null; quality: TicketQuality; currentRunIds: string[]; onClose: () => void }) {
  if (evidence === null) return null;
  const run = quality.runs.find((item) => item.id === evidence.runId);
  const snapshot = quality.criteriaSnapshots.find((item) => item.id === run?.criteriaSnapshotId);
  const current = run !== undefined && currentRunIds.includes(run.id);
  let accepted = run?.evidenceAccepted === true;
  if (evidence.kind === "command") accepted = run?.technicalEvidenceAccepted === true || (run?.kind === "checks" && run.evidenceAccepted);
  let title = "Preuve du critère";
  if (evidence.kind === "command") title = "Journal du contrôle";
  else if ((run?.mode ?? snapshot?.mode) === "browser") title = "Preuve du parcours";
  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }} size="lg" title={title} description={evidenceProvenance(evidence, run)}>
      <div className="flex items-center justify-between gap-3"><p className="text-sm">{formatQualityEvidenceSummary(evidence, run?.simulated === true)}</p><QualityResult status={qualityEvidenceResult(evidence.status, current, accepted, run?.simulated === true)} /></div>
      <p className={cn("text-xs", current ? "text-muted-foreground" : "text-warning")}>{current ? "Cette preuve correspond au code, aux critères et à la configuration actuels." : "Cette preuve est obsolète pour le code, les critères ou la configuration actuels."}</p>
      {current && !accepted && <p className="text-xs text-warning">Les observations de cette exécution ne sont pas acceptées comme preuves de livraison. Consultez le résultat de l’exécution dans l’historique.</p>}
      <dl className="flex flex-col gap-2 text-xs">
        <div className="flex gap-3"><dt className="w-28 shrink-0 text-muted-foreground">Version du code</dt><dd className="break-all font-mono">{run?.revision ?? "Non renseignée"}</dd></div>
        {snapshot && <div className="flex gap-3"><dt className="w-28 shrink-0 text-muted-foreground">Critères</dt><dd>Version {snapshot.version}</dd></div>}
        {evidence.model !== null && <div className="flex gap-3"><dt className="w-28 shrink-0 text-muted-foreground">Modèle</dt><dd>{evidence.model}</dd></div>}
        {evidence.sessionId !== null && <div className="flex gap-3"><dt className="w-28 shrink-0 text-muted-foreground">Session distincte</dt><dd className="break-all font-mono">{evidence.sessionId}</dd></div>}
        {evidence.command !== null && <div className="flex gap-3"><dt className="w-28 shrink-0 text-muted-foreground">Commande</dt><dd className="break-all font-mono">{evidence.command}</dd></div>}
        {evidence.kind === "command" && <div className="flex gap-3"><dt className="w-28 shrink-0 text-muted-foreground">Résultat serveur</dt><dd>Code de sortie {evidence.exitCode ?? "inconnu"} · {formatDuration(evidence.durationMs)}{evidence.timedOut && " · délai dépassé"}</dd></div>}
      </dl>
      <pre className="max-h-96 overflow-auto whitespace-pre-wrap break-words rounded border border-border bg-muted/30 p-3 font-mono text-xs">{formatQualityEvidenceOutput(evidence, run?.simulated === true) || "Aucune sortie observée."}</pre>
      <QualityArtifact key={evidence.id} ticketId={quality.ticketId} evidence={evidence} />
      <p className="text-xs text-muted-foreground">Cette preuve conserve sa version et sa provenance. Les réserves de livraison déterminent si elle valide le code actuel.</p>
    </Dialog>
  );
}

export function QualityRunHistory({ quality, currentRunIds, onOpenEvidence }: { quality: TicketQuality; currentRunIds: string[]; onOpenEvidence: (evidence: QualityEvidence) => void }) {
  return (
    <details className="rounded border border-border">
      <summary className="cursor-pointer px-3 py-2 text-xs">Historique des validations ({quality.runs.length})</summary>
      <div className="divide-y divide-border border-t border-border">
        {[...quality.runs].reverse().map((run) => {
          const snapshot = quality.criteriaSnapshots.find((item) => item.id === run.criteriaSnapshotId);
          const current = currentRunIds.includes(run.id);
          return (
            <div key={run.id} className="space-y-2 px-3 py-3 text-xs">
              <QualityRunStatus run={run} current={current} quality={quality} />
              <p className={current ? "text-muted-foreground" : "text-warning"}>{current ? "Version actuelle" : "Résultats obsolètes pour la version actuelle"}</p>
              <p className="text-muted-foreground">{run.simulated ? "Simulation" : "Exécution réelle"} · {formatDateTime(run.startedAt)}{snapshot && ` · critères v${snapshot.version}`}</p>
              <p className="break-all font-mono text-2xs">{run.revision}</p>
              {run.environment && <p className="break-all text-muted-foreground">Copie séparée : {run.environment.directory} · port {run.environment.port}</p>}
              {run.environment?.addresses?.map((address) => <p key={address.url} className="break-all text-muted-foreground">{formatQualityEnvironmentLabel(address.label)} : {address.url}</p>)}
              <p className="text-muted-foreground">Nettoyage : {CLEANUP_LABELS[run.cleanupStatus]}</p>
              {quality.evidence.filter((evidence) => evidence.runId === run.id).map((evidence) => <button key={evidence.id} type="button" className="block text-left text-muted-foreground hover:text-foreground" onClick={() => onOpenEvidence(evidence)}>Voir la preuve : {formatQualityEvidenceSummary(evidence, run.simulated)}</button>)}
            </div>
          );
        })}
        {quality.runs.length === 0 && <p className="px-3 py-3 text-xs text-muted-foreground">Aucune exécution enregistrée.</p>}
      </div>
    </details>
  );
}
