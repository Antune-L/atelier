import { useState, type ReactNode } from "react";

import { ORCHESTRATOR_LABELS } from "@shared/constants";
import type { QualityEvidence, QualityRunStatus, QualityValidationRun, TicketQuality } from "@shared/quality";

import { Dialog } from "@/components/ui/dialog";
import { qualityEvidenceArtifactUrl } from "@/lib/api";
import { formatDateTime, formatDuration } from "@/lib/display";
import { formatQualityEnvironmentLabel, formatQualityEvidenceSummary, formatQualityMessage } from "@/lib/qualityMessages";
import { cn } from "@/lib/utils";

type ResultStatus = QualityRunStatus | "unverified" | "stale" | "unaccepted" | "simulated";

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
};
const CLEANUP_LABELS: Record<QualityValidationRun["cleanupStatus"], string> = { complete: "terminé", pending: "en attente", failed: "échec" };
const IMAGE_ARTIFACT_EXTENSION = /\.(png|jpe?g|webp|gif)$/i;

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
  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }} size="lg" title={evidence.kind === "command" ? "Journal du contrôle" : "Preuve du parcours"} description={evidenceProvenance(evidence, run)}>
      <div className="flex items-center justify-between gap-3"><p className="text-sm">{formatQualityEvidenceSummary(evidence)}</p><QualityResult status={qualityEvidenceResult(evidence.status, current, run?.evidenceAccepted === true, run?.simulated === true)} /></div>
      <p className={cn("text-xs", current ? "text-muted-foreground" : "text-warning")}>{current ? "Cette preuve correspond au code, aux critères et à la configuration actuels." : "Cette preuve est obsolète pour le code, les critères ou la configuration actuels."}</p>
      {current && run?.evidenceAccepted !== true && <p className="text-xs text-warning">Les observations de cette exécution ne sont pas acceptées comme preuves de livraison. Consultez le résultat de l’exécution dans l’historique.</p>}
      <dl className="flex flex-col gap-2 text-xs">
        <div className="flex gap-3"><dt className="w-28 shrink-0 text-muted-foreground">Version du code</dt><dd className="break-all font-mono">{run?.revision ?? "Non renseignée"}</dd></div>
        {snapshot && <div className="flex gap-3"><dt className="w-28 shrink-0 text-muted-foreground">Critères</dt><dd>Version {snapshot.version}</dd></div>}
        {evidence.model !== null && <div className="flex gap-3"><dt className="w-28 shrink-0 text-muted-foreground">Modèle</dt><dd>{evidence.model}</dd></div>}
        {evidence.sessionId !== null && <div className="flex gap-3"><dt className="w-28 shrink-0 text-muted-foreground">Session distincte</dt><dd className="break-all font-mono">{evidence.sessionId}</dd></div>}
        {evidence.command !== null && <div className="flex gap-3"><dt className="w-28 shrink-0 text-muted-foreground">Commande</dt><dd className="break-all font-mono">{evidence.command}</dd></div>}
        {evidence.kind === "command" && <div className="flex gap-3"><dt className="w-28 shrink-0 text-muted-foreground">Résultat serveur</dt><dd>Code de sortie {evidence.exitCode ?? "inconnu"} · {formatDuration(evidence.durationMs)}{evidence.timedOut && " · délai dépassé"}</dd></div>}
      </dl>
      <pre className="max-h-96 overflow-auto whitespace-pre-wrap break-words rounded border border-border bg-muted/30 p-3 font-mono text-xs">{evidence.output || "Aucune sortie observée."}</pre>
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
              <div className="flex flex-wrap items-center justify-between gap-2"><span>{run.kind === "checks" ? "Contrôles serveur" : "Parcours indépendants"}{run.provider !== null && ` · ${ORCHESTRATOR_LABELS[run.provider]}`}</span><QualityResult status={qualityEvidenceResult(run.status, current, run.evidenceAccepted, run.simulated)} /></div>
              <p className={current ? "text-muted-foreground" : "text-warning"}>{current ? "Version actuelle" : "Résultats obsolètes pour la version actuelle"}</p>
              <p className="text-muted-foreground">{run.simulated ? "Simulation" : "Exécution réelle"} · {formatDateTime(run.startedAt)}{snapshot && ` · critères v${snapshot.version}`}</p>
              <p className="break-all font-mono text-2xs">{run.revision}</p>
              {run.environment && <p className="break-all text-muted-foreground">Copie séparée : {run.environment.directory} · port {run.environment.port}</p>}
              {run.environment?.addresses?.map((address) => <p key={address.url} className="break-all text-muted-foreground">{formatQualityEnvironmentLabel(address.label)} : {address.url}</p>)}
              <p className="text-muted-foreground">Nettoyage : {CLEANUP_LABELS[run.cleanupStatus]}</p>
              {run.error !== null && <p className="text-danger">{formatQualityMessage(run.error)}</p>}
              {quality.evidence.filter((evidence) => evidence.runId === run.id).map((evidence) => <button key={evidence.id} type="button" className="block text-left text-muted-foreground hover:text-foreground" onClick={() => onOpenEvidence(evidence)}>Voir la preuve : {formatQualityEvidenceSummary(evidence)}</button>)}
            </div>
          );
        })}
        {quality.runs.length === 0 && <p className="px-3 py-3 text-xs text-muted-foreground">Aucune exécution enregistrée.</p>}
      </div>
    </details>
  );
}
