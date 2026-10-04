import { ChevronRight, TriangleAlert } from "lucide-react";

import { QUALITY_ACTIVE_STATUSES } from "@shared/quality";
import type { QualityCriteriaSnapshot, QualityCriterion, QualityEvidence, QualityScenarioInteraction, QualityValidationRun, TicketQuality } from "@shared/quality";

import { PREPARATION_COMMAND_SUMMARIES, QualityResult, QualityRunStatus, qualityEvidenceResult } from "@/components/ticket-detail/QualityResults";
import { formatDuration } from "@/lib/display";
import { formatQualityCriterionText, formatQualityEvidenceSummary, formatQualityMessage, qualityFunctionalBlockerLabel } from "@/lib/qualityMessages";

const INTERACTION_LABELS: Record<QualityScenarioInteraction, string> = { interactive: "Interaction", display: "Affichage" };
const SCOPE_NOTE = "Un test réussi dans le navigateur ne remplace ni les contrôles techniques ni la validation avant livraison.";
const PREREQUISITES_NOTE = "Les contrôles techniques (types, qualité du code, tests) n’ont pas été exécutés pendant ce test.";

interface FunctionalTestPanelProps {
  run: QualityValidationRun;
  quality: TicketQuality;
  current: boolean;
  onOpenEvidence: (evidence: QualityEvidence) => void;
}

function ScenarioRow({ scenario, creator, evidence, run, current, onOpenEvidence }: { scenario: QualityCriterion; creator: QualityCriteriaSnapshot["createdBy"]; evidence: QualityEvidence | undefined; run: QualityValidationRun; current: boolean; onOpenEvidence: (evidence: QualityEvidence) => void }) {
  const interaction = evidence?.scenario?.interaction ?? scenario.interaction;
  const expected = evidence?.scenario?.expected ?? scenario.expected;
  const actions = evidence?.scenario?.actions ?? [];
  const observed = evidence?.scenario?.observed;
  const content = (
    <>
      <div className="min-w-0 flex-1 space-y-1">
        <p className="text-xs">{formatQualityCriterionText(scenario, creator)}</p>
        <p className="text-2xs text-muted-foreground">{interaction !== undefined && `${INTERACTION_LABELS[interaction]} · `}Scénario {scenario.id}{!scenario.required && " · facultatif"}</p>
        {expected !== undefined && <p className="text-2xs text-muted-foreground">Résultat attendu : {expected}</p>}
        {actions.length > 0 && <p className="break-words font-mono text-2xs text-muted-foreground">Actions enregistrées : {actions.map((action) => `${action.tool}${action.ok ? "" : " (échec)"}`).join(", ")}</p>}
        {observed !== undefined && observed !== "" && <p className="text-2xs">Observé : {observed}</p>}
      </div>
      {evidence === undefined ? <QualityResult status="unverified" /> : <QualityResult status={qualityEvidenceResult(evidence.status, current, run.evidenceAccepted, run.simulated)} />}
    </>
  );
  if (evidence === undefined) return <div className="flex flex-wrap items-start gap-3 px-3 py-3">{content}</div>;
  return <button type="button" className="flex w-full flex-wrap items-start gap-3 px-3 py-3 text-left hover:bg-muted/30" onClick={() => onOpenEvidence(evidence)}>{content}<ChevronRight className="mt-0.5 h-3.5 w-3.5 text-muted-foreground" /></button>;
}

export function FunctionalTestPanel({ run, quality, current, onOpenEvidence }: FunctionalTestPanelProps) {
  const active = QUALITY_ACTIVE_STATUSES.includes(run.status);
  const snapshot = quality.criteriaSnapshots.find((item) => item.id === run.criteriaSnapshotId);
  const baseSnapshot = quality.criteriaSnapshots.find((item) => item.id === snapshot?.baseSnapshotId);
  const runEvidence = quality.evidence.filter((evidence) => evidence.runId === run.id);
  const prerequisites = runEvidence.filter((evidence) => evidence.kind === "command" && evidence.authority === "server" && PREPARATION_COMMAND_SUMMARIES.includes(evidence.summary));
  const blockers = run.diagnostic?.blockers ?? [];
  return (
    <div className="space-y-3 rounded border border-border px-3 py-3">
      <QualityRunStatus run={run} current={current} quality={quality} />
      {run.simulated && <p className="text-xs text-warning">Simulation, non concluant : aucun parcours réel n’a été exécuté dans le navigateur.</p>}
      {!current && !active && <p className="text-xs text-warning">Ce test appartient à une version antérieure du code, des scénarios ou de la configuration.</p>}

      <div className="space-y-2">
        <p className="text-xs font-medium">Prérequis</p>
        {prerequisites.length > 0 && <div className="divide-y divide-border rounded border border-border">{prerequisites.map((evidence) => <button key={evidence.id} type="button" className="flex w-full flex-wrap items-center gap-3 px-3 py-2 text-left hover:bg-muted/30" onClick={() => onOpenEvidence(evidence)}><span className="min-w-0 flex-1 text-xs">{formatQualityEvidenceSummary(evidence)}</span><span className="text-2xs text-muted-foreground">{formatDuration(evidence.durationMs)}</span><QualityResult status={qualityEvidenceResult(evidence.status, current, true, run.simulated)} /><ChevronRight className="h-3.5 w-3.5 text-muted-foreground" /></button>)}</div>}
        {prerequisites.length === 0 && <p className="text-xs text-muted-foreground">Aucune préparation enregistrée pour ce test.</p>}
        <p className="text-2xs text-muted-foreground">{PREREQUISITES_NOTE}</p>
      </div>

      {blockers.length > 0 && (
        <div className="space-y-2 rounded border border-warning/30 bg-warning/5 p-3">
          <p className="text-xs font-medium">Blocages d’environnement</p>
          {blockers.map((blocker, index) => <div key={`${blocker.code}-${index}`} className="flex gap-2 text-xs"><TriangleAlert className="mt-0.5 h-3 w-3 shrink-0 text-warning" /><div className="min-w-0 space-y-0.5"><p className="font-medium">{qualityFunctionalBlockerLabel(blocker.code)}{blocker.scenarioId !== null && ` · scénario ${blocker.scenarioId}`}</p>{blocker.summary.trim() !== "" && <p className="break-words text-muted-foreground">{formatQualityMessage(blocker.summary)}</p>}</div></div>)}
          <p className="text-2xs text-muted-foreground">Ces blocages empêchent le test ; ils ne démontrent pas un défaut du produit.</p>
        </div>
      )}

      {snapshot !== undefined && (
        <div className="space-y-2">
          <p className="text-xs font-medium">Scénarios</p>
          <div className="divide-y divide-border rounded border border-border">
            {snapshot.criteria.map((scenario) => <ScenarioRow key={scenario.id} scenario={scenario} creator={snapshot.createdBy} evidence={runEvidence.filter((evidence) => evidence.kind === "behavior" && evidence.criterionId === scenario.id).at(-1)} run={run} current={current} onOpenEvidence={onOpenEvidence} />)}
          </div>
        </div>
      )}
      {snapshot === undefined && !active && <p className="text-xs text-muted-foreground">Aucun scénario préparé pour ce test.</p>}

      {snapshot !== undefined && snapshot.uncovered.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium">Non couvert par le navigateur</p>
          <ul className="space-y-1.5">
            {snapshot.uncovered.map((item) => {
              const criterion = baseSnapshot?.criteria.find((entry) => entry.id === item.criterionId);
              return <li key={item.criterionId} className="text-xs"><span>{criterion === undefined || baseSnapshot === undefined ? `Critère ${item.criterionId}` : formatQualityCriterionText(criterion, baseSnapshot.createdBy)}</span><span className="block text-2xs text-muted-foreground">{item.reason}</span></li>;
            })}
          </ul>
        </div>
      )}

      <p className="text-2xs text-muted-foreground">{SCOPE_NOTE}</p>
    </div>
  );
}
