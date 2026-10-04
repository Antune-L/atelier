import { Check, LoaderCircle } from "lucide-react";

import { ORCHESTRATOR_LABELS } from "@shared/constants";
import { QUALITY_ITERATION_ACTIVE_STATUSES } from "@shared/quality";
import type { QualityEvidence, QualityIteration, TicketQuality } from "@shared/quality";

import { QualityFunctionalRunDetails } from "@/components/ticket-detail/QualityFunctionalRun";
import { QualityRunExplanation, QualityRunStatus } from "@/components/ticket-detail/QualityResults";
import { formatDateTime } from "@/lib/display";
import { formatQualityMessage } from "@/lib/qualityMessages";
import { cn } from "@/lib/utils";

const REVISION_DISPLAY_LENGTH = 12;
const ITERATION_STATUS_LABELS: Record<QualityIteration["status"], string> = {
  queued: "En attente",
  correcting: "Correction en cours",
  verifying: "Vérification indépendante en cours",
  completed: "Nouvelle vérification terminée",
  failed: "Cycle bloqué",
  cancelled: "Cycle annulé",
  interrupted: "Cycle interrompu",
};

function iterationTitle(iteration: QualityIteration): string {
  if (iteration.trigger === "checks") return "Correction des contrôles techniques";
  if (iteration.trigger === "functional") return "Correction du parcours et nouveau test fonctionnel";
  return iteration.mode === "correction" ? "Correction et nouvelle vérification" : "Déblocage et nouvelle vérification";
}

function QualityIterationSummary({ iteration, quality, currentRunIds, onOpenEvidence }: { iteration: QualityIteration; quality: TicketQuality; currentRunIds: string[]; onOpenEvidence: (evidence: QualityEvidence) => void }) {
  const resultRun = quality.runs.find((run) => run.id === iteration.resultRunId);
  const current = resultRun !== undefined && currentRunIds.includes(resultRun.id);
  const active = QUALITY_ITERATION_ACTIVE_STATUSES.includes(iteration.status);
  const preparing = iteration.status === "queued" || iteration.status === "correcting";
  const verified = iteration.status === "completed";
  const functional = iteration.trigger === "functional";
  const steps = [
    { label: "Diagnostic conservé", complete: true, current: false },
    { label: iteration.mode === "correction" ? "Correction de la PR" : "Reprise de la validation", complete: iteration.status === "verifying" || verified, current: preparing },
    { label: functional ? "Nouveau test dans le navigateur" : "Vérification complète indépendante", complete: verified, current: iteration.status === "verifying" },
  ];
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="text-xs font-medium">{iterationTitle(iteration)}</h3><span role={active ? "status" : undefined} className={cn("rounded border px-2 py-0.5 text-2xs", active ? "border-info/30 text-info" : "border-border text-muted-foreground")}>{ITERATION_STATUS_LABELS[iteration.status]}</span></div>
      <ol className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:gap-4">
        {steps.map((step) => <li key={step.label} className={cn("flex items-center gap-1.5 text-2xs", step.current ? "text-info" : "text-muted-foreground")}>{step.complete && <Check className="h-3 w-3 shrink-0" />}{step.current && <LoaderCircle className="h-3 w-3 shrink-0 animate-spin" />}{!step.complete && !step.current && <span className="h-2 w-2 shrink-0 rounded-full border border-border" />}{step.label}</li>)}
      </ol>
      <p className="text-2xs text-muted-foreground">Même ticket{iteration.prUrl !== null && " et même PR"} · {ORCHESTRATOR_LABELS[iteration.provider]} · {iteration.criteriaSnapshot === null ? "critères à préparer" : `critères v${iteration.criteriaSnapshot.version}`} · {formatDateTime(iteration.createdAt)}</p>
      <p className="text-2xs text-muted-foreground">Version de départ : <span className="font-mono" title={iteration.sourceRevision}>{iteration.sourceRevision.slice(0, REVISION_DISPLAY_LENGTH)}</span>{iteration.mode === "recovery" && " · code conservé"}</p>
      {active && <p className="text-xs text-muted-foreground">{functional ? "Les critères et les scénarios sont verrouillés pendant ce cycle. Le nouveau test rejoue tous les scénarios dans le navigateur ; les contrôles techniques et la vérification complète restent à relancer." : "Les critères sont verrouillés pendant ce cycle. La nouvelle vérification porte sur tous les critères."}</p>}
      {iteration.diagnostic !== null && <p className="whitespace-pre-wrap break-words text-xs text-warning">{formatQualityMessage(iteration.diagnostic)}</p>}
      {resultRun !== undefined && resultRun.kind === "functional" && <div className="border-t border-border pt-3"><QualityFunctionalRunDetails run={resultRun} quality={quality} current={current} onOpenEvidence={onOpenEvidence} /></div>}
      {resultRun !== undefined && resultRun.kind !== "functional" && <div className="space-y-3 border-t border-border pt-3"><QualityRunStatus run={resultRun} current={current} quality={quality}><QualityRunExplanation run={resultRun} quality={quality} current={current} onOpenEvidence={onOpenEvidence} /></QualityRunStatus></div>}
    </div>
  );
}

export function QualityIterations({ quality, currentRunIds, onOpenEvidence }: { quality: TicketQuality; currentRunIds: string[]; onOpenEvidence: (evidence: QualityEvidence) => void }) {
  const latest = quality.latestIteration;
  if (latest === null) return null;
  const previous = [...quality.iterations].reverse().filter((iteration) => iteration.id !== latest.id);
  return (
    <div className="space-y-3">
      <div className="rounded border border-info/25 bg-info/5 p-3"><QualityIterationSummary iteration={latest} quality={quality} currentRunIds={currentRunIds} onOpenEvidence={onOpenEvidence} /></div>
      {previous.length > 0 && <details className="rounded border border-border"><summary className="cursor-pointer px-3 py-2 text-xs">Historique des corrections et reprises ({previous.length})</summary><div className="divide-y divide-border border-t border-border">{previous.map((iteration) => <div key={iteration.id} className="p-3"><QualityIterationSummary iteration={iteration} quality={quality} currentRunIds={currentRunIds} onOpenEvidence={onOpenEvidence} /></div>)}</div></details>}
    </div>
  );
}
