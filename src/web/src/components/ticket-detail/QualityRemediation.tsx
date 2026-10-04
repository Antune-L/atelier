import { FilePlus2, LoaderCircle, Stethoscope, TriangleAlert, Wrench } from "lucide-react";
import { useState } from "react";
import type { ReactNode } from "react";

import type { CreateQualityFollowUpInput, QualityBlockerCategory, QualityCriteriaSnapshot, QualityEvidence, QualityFollowUpIssue, QualityIterationActions, QualityProblem, StartQualityIterationInput, TicketQuality } from "@shared/quality";

import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { useProjects } from "@/hooks/useProjects";
import { formatQualityCriterionText, formatQualityMessage, qualityFunctionalBlockerLabel, qualityPermissionBlockMessage } from "@/lib/qualityMessages";
import { cn } from "@/lib/utils";

type IterationRequest = Omit<StartQualityIterationInput, "provider">;

const BLOCKER_CATEGORY_LABELS: Record<QualityBlockerCategory, { label: string; nextStep: string }> = {
  unsupported_operation: { label: "Opération non prise en charge", nextStep: "Une forme de lecture prise en charge peut être réessayée." },
  path_or_directory: { label: "Chemin ou répertoire de travail incorrect", nextStep: "Une lecture depuis la copie de validation, avec un chemin existant, peut être réessayée." },
  workspace_unavailable: { label: "Copie de validation indisponible", nextStep: "Vérifiez le cycle de vie de la copie de validation avant de relancer." },
  filesystem_error: { label: "Erreur du système de fichiers", nextStep: "Vérifiez l’état des fichiers de la copie de validation avant de relancer." },
  access_restriction: { label: "Accès hors périmètre refusé", nextStep: "Ce refus protège le périmètre ; il ne sera pas contourné." },
  unknown: { label: "Cause non établie", nextStep: "La cause doit être établie avant toute correction." },
};
const AUTHORITY_LABELS: Record<QualityProblem["authority"], string> = { server: "Fait serveur", agent: "Observation de l’agent" };
const RETRY_HINT = "Le cycle précédent s’est arrêté. Cette action lance une seule nouvelle tentative.";
const CHECKS_NOTE = "Diagnostique l’échec à partir des résultats du serveur, modifie la PR seulement si la cause vient du code, puis relance une vérification indépendante complète. Un échec n’est pas toujours corrigeable automatiquement.";
const BLOCKER_NOTE = "Analyse le refus en lecture seule et relance une vérification complète sur le même code, sans élargir les permissions. Ne modifie pas le code ; les critères restent à vérifier.";
const CRITERIA_CORRECTION_NOTE = "Corrige les écarts démontrés dans cette PR, puis lance une nouvelle vérification complète indépendante sur les mêmes critères.";
const CRITERIA_RECOVERY_NOTE = "Relance une vérification complète avec le diagnostic du blocage, sur le même code et avec les mêmes permissions.";
const FOLLOW_UP_NOTE = "Crée une carte passive en « À faire » avec le contexte nécessaire. Elle ne lance aucune implémentation et ne prouve pas que la validation a réussi.";
const BLOCKER_PROJECT_HINT = "Choisissez le dépôt propriétaire du défaut ; la carte ne sera pas affectée implicitement.";
const FUNCTIONAL_NOTE = "Corrige la PR à partir des scénarios en échec, puis relance le test dans le navigateur. Les contrôles techniques restent à vérifier séparément.";
const PANEL_CLASS = "space-y-2 rounded border border-warning/30 bg-warning/5 p-3";
const FUNCTIONAL_PROBLEM_KINDS: Array<QualityProblem["kind"]> = ["scenario_failed", "scenario_unverified", "functional_blocker"];
const FOLLOW_UP_TITLES: Record<QualityFollowUpIssue, string> = {
  checks: "Carte de correction des contrôles",
  blocker: "Carte de correction du blocage",
  functional: "Carte de correction du test fonctionnel",
};
const FOLLOW_UP_DIRECT_AVAILABLE: Record<QualityFollowUpIssue, (actions: QualityIterationActions) => boolean> = {
  checks: (actions) => actions.checksCorrection.available,
  blocker: (actions) => actions.recovery.available,
  functional: (actions) => actions.functional.available,
};

interface RemediationProps {
  quality: TicketQuality;
  actions: QualityIterationActions;
  ticketProject: string;
  busy: boolean;
  starting: boolean;
  onOpenEvidence: (evidence: QualityEvidence) => void;
  onStartIteration: (request: IterationRequest) => void;
  onCreateFollowUp: (input: CreateQualityFollowUpInput) => void;
}

function ProblemHeader({ problem, children }: { problem: QualityProblem; children: ReactNode }) {
  return <div className="flex flex-wrap items-center gap-2 text-xs"><span className="min-w-0 flex-1 break-words">{children}</span>{problem.occurrences > 1 && <span className="text-2xs text-muted-foreground">×{problem.occurrences}</span>}<span className="rounded border border-border px-1.5 py-0.5 text-2xs text-muted-foreground">{AUTHORITY_LABELS[problem.authority]}</span></div>;
}

function ActionButton({ label, icon, disabled, starting, onClick }: { label: string; icon: ReactNode; disabled: boolean; starting: boolean; onClick: () => void }) {
  return <Button size="sm" disabled={disabled} onClick={onClick}>{starting ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : icon}{starting ? "Lancement en cours…" : label}</Button>;
}

function UnavailableReason({ available, reason }: { available: boolean; reason: string | null }) {
  if (available || reason === null) return null;
  return <p className="text-xs text-warning">{formatQualityMessage(reason)}</p>;
}

function FollowUpCard({ issue, actions, ticketProject, busy, onCreate }: { issue: QualityFollowUpIssue; actions: QualityIterationActions; ticketProject: string; busy: boolean; onCreate: (input: CreateQualityFollowUpInput) => void }) {
  const projects = useProjects();
  const [project, setProject] = useState(issue === "blocker" ? "" : ticketProject);
  const availability = actions.followUp[issue];
  const existing = actions.followUps.find((followUp) => followUp.issue === issue && followUp.sourceRunId === availability.sourceRunId);
  if (existing !== undefined) return <p className="text-xs text-success">Carte de correction créée : {existing.title} ({existing.ticketId})</p>;
  const sourceRunId = availability.sourceRunId;
  if (!availability.available || sourceRunId === null) return null;
  return (
    <div className="space-y-2 rounded border border-border p-3">
      <div className="flex flex-wrap items-center gap-2">
        <Select aria-label="Dépôt cible de la carte de correction" value={project} disabled={busy} className="w-auto" onChange={(event) => setProject(event.target.value)}>
          {issue === "blocker" && <option value="" disabled>Choisir un dépôt</option>}
          {projects.map((item) => <option key={item.key} value={item.key}>{item.label}</option>)}
        </Select>
        <Button size="sm" variant="outline" disabled={busy || project === ""} onClick={() => onCreate({ sourceRunId, issue, project })}><FilePlus2 className="h-3.5 w-3.5" />Créer une carte de correction</Button>
      </div>
      {issue === "blocker" && project === "" && <p className="text-2xs text-muted-foreground">{BLOCKER_PROJECT_HINT}</p>}
      <p className="text-2xs text-muted-foreground">{FOLLOW_UP_NOTE}</p>
    </div>
  );
}

function ChecksGroup({ problems, quality, actions, busy, starting, onOpenEvidence, onStartIteration }: RemediationProps & { problems: QualityProblem[] }) {
  const action = actions.checksCorrection;
  const sourceRunId = action.sourceRunId;
  return (
    <div className={PANEL_CLASS}>
      <p className="text-xs font-medium">Contrôles techniques en échec</p>
      {problems.map((problem) => {
        const evidence = quality.evidence.find((item) => item.id === problem.evidenceId);
        return <ProblemHeader key={problem.id} problem={problem}>{evidence === undefined ? problem.summary : <button type="button" className="text-left underline underline-offset-2" onClick={() => onOpenEvidence(evidence)}>{problem.summary}</button>}</ProblemHeader>;
      })}
      {sourceRunId !== null && <ActionButton label="Analyser et corriger les contrôles échoués" icon={<Wrench className="h-3.5 w-3.5" />} disabled={busy || !action.available} starting={starting} onClick={() => onStartIteration({ mode: "correction", trigger: "checks", sourceRunId, retryOfIterationId: action.retryOfIterationId ?? undefined })} />}
      <p className="text-xs text-muted-foreground">{CHECKS_NOTE}</p>
      {action.retryOfIterationId !== null && <p className="text-2xs text-muted-foreground">{RETRY_HINT}</p>}
      <UnavailableReason available={action.available} reason={action.reason} />
    </div>
  );
}

function BlockersGroup({ problems, actions, busy, starting, onStartIteration }: RemediationProps & { problems: QualityProblem[] }) {
  const sourceRunId = actions.sourceRunId;
  const canRecover = actions.recommendedMode === "recovery" && sourceRunId !== null;
  return (
    <div className={PANEL_CLASS}>
      <p className="text-xs font-medium">Blocages de lecture</p>
      {problems.map((problem) => {
        const category = BLOCKER_CATEGORY_LABELS[problem.category ?? "unknown"];
        return (
          <div key={problem.id} className="space-y-1 border-t border-warning/20 pt-2 first-of-type:border-t-0 first-of-type:pt-0">
            <ProblemHeader problem={problem}>{problem.toolName ?? problem.summary}</ProblemHeader>
            {problem.commandShape !== null && <p className="break-all font-mono text-2xs text-muted-foreground">{problem.commandShape}</p>}
            <p className="text-xs">{qualityPermissionBlockMessage(problem.blockReason).reason}</p>
            <p className="text-2xs"><span className="font-medium">{category.label}</span> · <span className="text-muted-foreground">{category.nextStep}</span></p>
            {problem.repeated && <p className="flex items-center gap-1 text-2xs text-warning"><TriangleAlert className="h-3 w-3" />Ce blocage persiste après une reprise sur le même code.</p>}
          </div>
        );
      })}
      {canRecover && <ActionButton label="Diagnostiquer le blocage" icon={<Stethoscope className="h-3.5 w-3.5" />} disabled={busy || !actions.recovery.available} starting={starting} onClick={() => onStartIteration({ mode: "recovery", trigger: "incomplete", sourceRunId, retryOfIterationId: actions.retryOfIterationId ?? undefined })} />}
      <p className="text-xs text-muted-foreground">{BLOCKER_NOTE}</p>
      {canRecover && actions.retryOfIterationId !== null && <p className="text-2xs text-muted-foreground">{RETRY_HINT}</p>}
      {canRecover && <UnavailableReason available={actions.recovery.available} reason={actions.recovery.reason} />}
    </div>
  );
}

function problemSnapshot(problem: QualityProblem, quality: TicketQuality): QualityCriteriaSnapshot | undefined {
  const snapshotId = quality.runs.find((run) => run.id === problem.runId)?.criteriaSnapshotId;
  return quality.criteriaSnapshots.find((snapshot) => snapshot.id === snapshotId);
}

function criterionLabel(problem: QualityProblem, quality: TicketQuality): string {
  const snapshot = problemSnapshot(problem, quality);
  const criterion = snapshot?.criteria.find((item) => item.id === problem.criterionId);
  if (snapshot === undefined || criterion === undefined) return problem.summary;
  return formatQualityCriterionText(criterion, snapshot.createdBy);
}

function FunctionalGroup({ problems, quality, actions, busy, starting, onStartIteration }: RemediationProps & { problems: QualityProblem[] }) {
  const action = actions.functional;
  const sourceRunId = action.sourceRunId;
  return (
    <div className={PANEL_CLASS}>
      <p className="text-xs font-medium">Test fonctionnel</p>
      {problems.map((problem) => {
        if (problem.kind === "functional_blocker") {
          const blocker = problem.blockerCode === null ? null : qualityFunctionalBlockerLabel(problem.blockerCode);
          return <div key={problem.id} className="flex items-center gap-2"><div className="min-w-0 flex-1"><ProblemHeader problem={problem}>{formatQualityMessage(problem.summary)}</ProblemHeader></div><span className="shrink-0 rounded border border-current/20 px-1.5 py-0.5 text-2xs text-warning">{blocker ?? "Blocage d’environnement"}</span></div>;
        }
        const failed = problem.kind === "scenario_failed";
        return <div key={problem.id} className="flex items-center gap-2"><div className="min-w-0 flex-1"><ProblemHeader problem={problem}>{criterionLabel(problem, quality)}</ProblemHeader></div><span className={cn("shrink-0 rounded border border-current/20 px-1.5 py-0.5 text-2xs", failed ? "text-danger" : "text-warning")}>{failed ? "Scénario en échec" : "Scénario non vérifié"}</span></div>;
      })}
      {sourceRunId !== null && <ActionButton label="Corriger et retester" icon={<Wrench className="h-3.5 w-3.5" />} disabled={busy || !action.available} starting={starting} onClick={() => onStartIteration({ mode: "correction", trigger: "functional", sourceRunId, retryOfIterationId: action.retryOfIterationId ?? undefined })} />}
      <p className="text-xs text-muted-foreground">{FUNCTIONAL_NOTE}</p>
      {action.retryOfIterationId !== null && <p className="text-2xs text-muted-foreground">{RETRY_HINT}</p>}
      <UnavailableReason available={action.available} reason={action.reason} />
    </div>
  );
}

function CriteriaGroup({ problems, hasBlockers, quality, actions, busy, starting, onStartIteration }: RemediationProps & { problems: QualityProblem[]; hasBlockers: boolean }) {
  const mode = actions.recommendedMode;
  const sourceRunId = actions.sourceRunId;
  const showAction = sourceRunId !== null && (mode === "correction" || (mode === "recovery" && !hasBlockers));
  const action = mode === null ? null : actions[mode];
  return (
    <div className={PANEL_CLASS}>
      <p className="text-xs font-medium">Critères</p>
      {problems.map((problem) => {
        const failed = problem.kind === "criterion_failed";
        return <div key={problem.id} className="flex items-center gap-2"><div className="min-w-0 flex-1"><ProblemHeader problem={problem}>{criterionLabel(problem, quality)}</ProblemHeader></div><span className={cn("shrink-0 rounded border border-current/20 px-1.5 py-0.5 text-2xs", failed ? "text-danger" : "text-warning")}>{failed ? "Non conforme" : "Non vérifié"}</span></div>;
      })}
      {showAction && action !== null && mode !== null && (
        <>
          <ActionButton label={mode === "correction" ? "Corriger et revérifier" : "Relancer la vérification"} icon={<Wrench className="h-3.5 w-3.5" />} disabled={busy || !action.available} starting={starting} onClick={() => onStartIteration({ mode, trigger: mode === "correction" ? "criteria" : "incomplete", sourceRunId, retryOfIterationId: actions.retryOfIterationId ?? undefined })} />
          <p className="text-xs text-muted-foreground">{mode === "correction" ? CRITERIA_CORRECTION_NOTE : CRITERIA_RECOVERY_NOTE}</p>
          {actions.retryOfIterationId !== null && <p className="text-2xs text-muted-foreground">{RETRY_HINT}</p>}
          <UnavailableReason available={action.available} reason={action.reason} />
        </>
      )}
    </div>
  );
}

export function QualityRemediation(props: RemediationProps) {
  const { actions, ticketProject, busy, onCreateFollowUp } = props;
  const checks = actions.problems.filter((problem) => problem.kind === "technical_check");
  const blockers = actions.problems.filter((problem) => problem.kind === "read_blocker");
  const criteria = actions.problems.filter((problem) => problem.kind === "criterion_failed" || problem.kind === "criterion_unverified");
  const functional = actions.problems.filter((problem) => FUNCTIONAL_PROBLEM_KINDS.includes(problem.kind));
  const followUpIssues = (["checks", "blocker", "functional"] satisfies QualityFollowUpIssue[]).filter((issue) => actions.followUp[issue].available || actions.followUps.some((followUp) => followUp.issue === issue));
  const anyAction = actions.checksCorrection.available || actions.recovery.available || actions.correction.available || actions.functional.available;
  if (actions.problems.length === 0 && !anyAction && followUpIssues.length === 0) return null;
  return (
    <div className="space-y-3">
      <p className="text-xs font-medium">Problèmes à résoudre</p>
      {checks.length > 0 && <ChecksGroup {...props} problems={checks} />}
      {blockers.length > 0 && <BlockersGroup {...props} problems={blockers} />}
      {criteria.length > 0 && <CriteriaGroup {...props} problems={criteria} hasBlockers={blockers.length > 0} />}
      {functional.length > 0 && <FunctionalGroup {...props} problems={functional} />}
      {followUpIssues.map((issue) => {
        const directAvailable = FOLLOW_UP_DIRECT_AVAILABLE[issue](actions);
        return (
          <div key={issue} className={cn("space-y-2", !directAvailable && "rounded border border-warning/30 bg-warning/5 p-3")}>
            <p className="text-xs font-medium">{FOLLOW_UP_TITLES[issue]}</p>
            <FollowUpCard issue={issue} actions={actions} ticketProject={ticketProject} busy={busy} onCreate={onCreateFollowUp} />
          </div>
        );
      })}
    </div>
  );
}
