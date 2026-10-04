import { ChevronRight, TriangleAlert } from "lucide-react";

import { ORCHESTRATOR_LABELS } from "@shared/constants";
import { QUALITY_ACTIVE_STATUSES } from "@shared/quality";
import type { QualityEvidence, QualityScenarioSnapshot, QualityValidationRun, TicketQuality } from "@shared/quality";

import { FUNCTIONAL_BLOCKER_LABELS, QualityResult, qualityEvidenceResult } from "@/components/ticket-detail/QualityResults";
import { formatDuration } from "@/lib/display";
import { formatQualityCriterionText, formatQualityEvidenceSummary, formatQualityMessage, qualityFailureLabel, qualityPhaseLabel, qualityRunTitle } from "@/lib/qualityMessages";
import { cn } from "@/lib/utils";

const REVISION_DISPLAY_LENGTH = 12;
const OBSERVED_TEXT_LIMIT = 400;
const INTERACTION_LABELS: Record<QualityScenarioSnapshot["scenarios"][number]["interaction"], string> = { required: "Interaction", none: "Affichage" };
const DELIVERY_NOTE = "Ce test ne lance ni la vérification des types, ni le lint, ni les tests techniques. Il ne remplace pas les contrôles techniques ni la vérification complète exigés pour la livraison.";

interface FunctionalRunProps {
  run: QualityValidationRun;
  quality: TicketQuality;
  current: boolean;
  onOpenEvidence: (evidence: QualityEvidence) => void;
}

function scenarioEvidence(quality: TicketQuality, run: QualityValidationRun, scenarioId: string): QualityEvidence | undefined {
  return quality.evidence.filter((evidence) => evidence.runId === run.id && evidence.kind === "behavior" && evidence.criterionId === scenarioId).at(-1);
}

export function QualityFunctionalRunDetails({ run, quality, current, onOpenEvidence }: FunctionalRunProps) {
  const snapshot = quality.scenarioSnapshots.find((item) => item.id === run.scenarioSnapshotId);
  const criteria = quality.criteriaSnapshots.find((item) => item.id === snapshot?.criteriaSnapshotId);
  const active = QUALITY_ACTIVE_STATUSES.includes(run.status);
  const blocker = run.diagnostic?.category === "environment_blocker" ? run.diagnostic : null;
  const preparation = quality.evidence.filter((evidence) => evidence.runId === run.id && evidence.kind === "command");
  let title = qualityRunTitle(run);
  if (blocker !== null) title = "Test fonctionnel bloqué";
  else if (run.status === "failed" && run.failurePhase !== null) title = qualityFailureLabel(run.failurePhase, run.kind);
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs"><span>{title}{run.provider !== null && ` · ${ORCHESTRATOR_LABELS[run.provider]}`}</span><QualityResult status={qualityEvidenceResult(run.status, current, run.evidenceAccepted, run.simulated)} /></div>
      <p className="text-2xs text-muted-foreground">{run.simulated ? "Simulation : aucun navigateur lancé, résultat non concluant" : "Exécution réelle dans une copie isolée"} · version <span className="font-mono" title={run.revision}>{run.revision.slice(0, REVISION_DISPLAY_LENGTH)}</span>{snapshot !== undefined && ` · scénarios v${snapshot.version}`}</p>
      {active && run.phase !== null && <p role="status" className="text-xs text-info">Étape en cours : {qualityPhaseLabel(run.phase, run.kind)}</p>}
      {!current && !active && <p className="text-xs text-warning">Ce résultat est obsolète : le code, le ticket, les critères, les scénarios ou la configuration ont changé depuis ce test.</p>}
      {blocker !== null && (
        <div className="space-y-1 rounded border border-warning/30 bg-warning/5 p-3 text-xs">
          <p className="flex items-center gap-1 font-medium"><TriangleAlert className="h-3 w-3 text-warning" />Blocage de l’environnement, pas un défaut observé</p>
          {blocker.blocker !== undefined && <p>{FUNCTIONAL_BLOCKER_LABELS[blocker.blocker]}</p>}
          <p className="whitespace-pre-wrap break-words text-2xs text-muted-foreground">{formatQualityMessage(blocker.summary)}</p>
        </div>
      )}
      {blocker === null && run.error !== null && !active && <p role="alert" className={cn("text-xs", run.status === "failed" ? "text-danger" : "text-warning")}>{formatQualityMessage(run.error)}</p>}
      {preparation.length > 0 && (
        <div className="space-y-1">
          <p className="text-2xs font-medium text-muted-foreground">Prérequis : installation et démarrage</p>
          <div className="divide-y divide-border rounded border border-border">
            {preparation.map((evidence) => <button key={evidence.id} type="button" className="flex w-full items-center gap-3 px-3 py-2 text-left text-xs hover:bg-muted/30" onClick={() => onOpenEvidence(evidence)}><span className="min-w-0 flex-1">{formatQualityEvidenceSummary(evidence)}</span><span className="text-2xs text-muted-foreground">{formatDuration(evidence.durationMs)}</span><QualityResult status={evidence.status} /><ChevronRight className="h-3.5 w-3.5 text-muted-foreground" /></button>)}
          </div>
        </div>
      )}
      {snapshot !== undefined && (
        <div className="space-y-1">
          <p className="text-2xs font-medium text-muted-foreground">Scénarios dans le navigateur</p>
          <div className="divide-y divide-border rounded border border-border">
            {snapshot.scenarios.map((scenario) => {
              const evidence = scenarioEvidence(quality, run, scenario.id);
              const observed = evidence?.functional?.observed.trim() || (evidence ? formatQualityMessage(evidence.summary) : "");
              let status: Parameters<typeof QualityResult>[0]["status"] = "unverified";
              if (evidence !== undefined) status = qualityEvidenceResult(evidence.status, current, run.evidenceAccepted, run.simulated);
              else if (active) status = run.status;
              return (
                <div key={scenario.id} className="space-y-1.5 px-3 py-3 text-xs">
                  <div className="flex flex-wrap items-center gap-2"><span className="font-mono text-2xs text-muted-foreground">{scenario.id}</span><span className="min-w-0 flex-1 font-medium">{scenario.title}</span><span className="rounded border border-border px-1.5 py-0.5 text-2xs text-muted-foreground">{INTERACTION_LABELS[scenario.interaction]}{scenario.required ? "" : " · facultatif"}</span><QualityResult status={status} /></div>
                  <p className="text-muted-foreground"><span className="font-medium text-foreground">Attendu : </span>{scenario.expected}</p>
                  {evidence?.functional !== null && evidence?.functional !== undefined && evidence.functional.actions.length > 0 && <p className="text-muted-foreground"><span className="font-medium text-foreground">Actions : </span>{evidence.functional.actions.map((action) => action.description || action.tool).join(" → ")}</p>}
                  {observed !== "" && <p className="text-muted-foreground"><span className="font-medium text-foreground">Observé : </span>{observed.slice(0, OBSERVED_TEXT_LIMIT)}{observed.length > OBSERVED_TEXT_LIMIT && "…"}</p>}
                  {evidence?.functional?.blocker !== null && evidence?.functional?.blocker !== undefined && <p className="text-warning">{FUNCTIONAL_BLOCKER_LABELS[evidence.functional.blocker]}</p>}
                  {evidence !== undefined && <button type="button" className="text-info underline underline-offset-2" onClick={() => onOpenEvidence(evidence)}>Voir la preuve{evidence.functional !== null && evidence.functional.screenshotPaths.length > 0 && ` et ${evidence.functional.screenshotPaths.length} capture(s)`}</button>}
                </div>
              );
            })}
          </div>
        </div>
      )}
      {snapshot !== undefined && snapshot.uncovered.length > 0 && (
        <div className="space-y-1 text-xs">
          <p className="text-2xs font-medium text-muted-foreground">Critères non vérifiables dans le navigateur</p>
          <ul className="space-y-1">
            {snapshot.uncovered.map((entry) => {
              const criterion = criteria?.criteria.find((item) => item.id === entry.criterionId);
              return <li key={entry.criterionId} className="flex gap-2"><QualityResult status="unverified" /><span className="min-w-0">{criterion !== undefined && criteria !== undefined ? formatQualityCriterionText(criterion, criteria.createdBy) : entry.criterionId} <span className="text-muted-foreground">— {entry.reason}</span></span></li>;
            })}
          </ul>
        </div>
      )}
      <p className="text-2xs text-muted-foreground">{DELIVERY_NOTE}</p>
    </div>
  );
}

export function QualityFunctionalRun({ quality, currentRunIds, hiddenRunId, onOpenEvidence }: { quality: TicketQuality; currentRunIds: string[]; hiddenRunId: string | null; onOpenEvidence: (evidence: QualityEvidence) => void }) {
  const run = quality.runs.filter((item) => item.kind === "functional").at(-1);
  if (run === undefined || run.id === hiddenRunId) return null;
  const current = currentRunIds.includes(run.id) && quality.scenarioSnapshots.at(-1)?.id === run.scenarioSnapshotId;
  return <div className="rounded border border-border px-3 py-3"><QualityFunctionalRunDetails run={run} quality={quality} current={current} onOpenEvidence={onOpenEvidence} /></div>;
}
