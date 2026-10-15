import { ChevronRight, FlaskConical, GitCommitHorizontal, MousePointerClick, Play, RefreshCw, ShieldCheck, Square, TriangleAlert } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { ORCHESTRATORS, ORCHESTRATOR_LABELS } from "@shared/constants";
import type { Orchestrator } from "@shared/constants";
import { QUALITY_ACTIVE_STATUSES, QUALITY_ITERATION_ACTIVE_STATUSES } from "@shared/quality";
import type { CreateQualityFollowUpInput, QualityEvidence, QualityPreflight, QualityResponse, StartQualityIterationInput } from "@shared/quality";
import type { PreviewRecord } from "@shared/preview";
import type { Ticket } from "@shared/schemas";

import { AutonomousRecoveryPanel } from "@/components/ticket-detail/AutonomousRecoveryPanel";
import { FunctionalTestPanel } from "@/components/ticket-detail/FunctionalTestPanel";
import { QualityRequestHistory } from "@/components/ticket-detail/QualityActionHistory";
import { QualityCriteriaPanel } from "@/components/ticket-detail/QualityCriteriaPanel";
import { QualityIterations } from "@/components/ticket-detail/QualityIterations";
import { QualityRemediation } from "@/components/ticket-detail/QualityRemediation";
import { PREPARATION_COMMAND_SUMMARIES, QualityEvidenceDialog, QualityResult, QualityRunHistory, QualityRunExplanation, QualityRunStatus, QualitySection, qualityChecksStatus, qualityEvidenceResult, qualityRunIsCurrent } from "@/components/ticket-detail/QualityResults";
import { ValidationSkeleton } from "@/components/ticket-detail/ValidationSkeleton";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { api } from "@/lib/api";
import { formatDateTime, formatDuration } from "@/lib/display";
import { formatQualityEvidenceSummary, formatQualityGateMessage, formatQualityMessage, qualityErrorMessage, qualityPhaseLabel, qualityRunTitle } from "@/lib/qualityMessages";
import { previewApi } from "@/lib/previewApi";
import { cn } from "@/lib/utils";

const QUALITY_RUNNING_POLL_MS = 3_000;
const QUALITY_IDLE_POLL_MS = 10_000;
const REVISION_DISPLAY_LENGTH = 12;

export function ValidationTab({ ticket, onOpenTerminal }: { ticket: Ticket; onOpenTerminal?: () => void }) {
  const [response, setResponse] = useState<QualityResponse | null>(null);
  const [preview, setPreview] = useState<PreviewRecord | null>(null);
  const [preflight, setPreflight] = useState<QualityPreflight | null>(null);
  const actionPending = useRef(false);
  const [pending, setPending] = useState(false);
  const [startingIteration, setStartingIteration] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [provider, setProvider] = useState<Orchestrator>(ticket.orchestrator === "claude" ? "codex" : "claude");
  const [selectedEvidence, setSelectedEvidence] = useState<QualityEvidence | null>(null);

  const refresh = useCallback(async (signal?: AbortSignal): Promise<QualityResponse> => {
    const [value, previewResponse] = await Promise.all([api.ticketQuality(ticket.id, signal), previewApi.ticketPreview(ticket.id).catch(() => null)]);
    setPreview(previewResponse?.preview ?? null);
    setResponse(value);
    setLoadError(null);
    return value;
  }, [ticket.id]);

  useEffect(() => {
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    const poll = async (): Promise<void> => {
      let delay = QUALITY_IDLE_POLL_MS;
      try {
        if (!document.hidden) {
          const value = await refresh(controller.signal);
          const iteration = value.quality.latestIteration;
          if (value.quality.runs.some((run) => QUALITY_ACTIVE_STATUSES.includes(run.status)) || (iteration !== null && QUALITY_ITERATION_ACTIVE_STATUSES.includes(iteration.status))) delay = QUALITY_RUNNING_POLL_MS;
        }
      } catch (failure) {
        if (!controller.signal.aborted) setLoadError(qualityErrorMessage(failure));
      }
      if (!controller.signal.aborted) timer = setTimeout(() => void poll(), delay);
    };
    void poll();
    return () => {
      controller.abort();
      if (timer !== undefined) clearTimeout(timer);
    };
  }, [refresh]);

  const act = async (action?: () => Promise<unknown>): Promise<void> => {
    if (actionPending.current) return;
    actionPending.current = true;
    setPending(true);
    setError(null);
    try {
      if (action !== undefined) await action();
      await refresh();
    } catch (failure) {
      setError(qualityErrorMessage(failure));
    } finally {
      actionPending.current = false;
      setPending(false);
    }
  };

  if (response === null) {
    if (loadError === null || pending) return <ValidationSkeleton />;
    return <div className="mx-auto max-w-4xl space-y-3"><p role="alert" className="text-xs text-danger">{error ?? loadError}</p><Button variant="outline" size="sm" onClick={() => void act()}>Réessayer</Button></div>;
  }

  const { quality, gate, iterationActions } = response;
  const autonomousState = ticket.autonomous ? ticket.autonomousState : null;
  const partialDelivery = autonomousState?.phase === "closing" || autonomousState?.phase === "publishing_partial" || autonomousState?.phase === "published_partial" || autonomousState?.phase === "publication_failed";
  const deliveryComplete = gate.enabled && gate.complete && !partialDelivery;
  const activeRun = quality.runs.find((run) => QUALITY_ACTIVE_STATUSES.includes(run.status));
  const latestIteration = quality.latestIteration;
  const iterationActive = latestIteration !== null && QUALITY_ITERATION_ACTIVE_STATUSES.includes(latestIteration.status);
  const technicalEvidence = quality.evidence.filter((evidence) => evidence.kind === "command" && !(evidence.authority === "server" && PREPARATION_COMMAND_SUMMARIES.includes(evidence.summary)));
  const checksRun = [...quality.runs].reverse().find((run) => run.kind === "checks" || (run.kind === "full" && technicalEvidence.some((evidence) => evidence.runId === run.id)));
  const checks = technicalEvidence.filter((evidence) => evidence.runId === checksRun?.id);
  const checksCurrent = checksRun !== undefined && gate.currentRunIds.includes(checksRun.id);
  const checksAccepted = checksRun?.technicalEvidenceAccepted === true || (checksRun?.kind === "checks" && checksRun.evidenceAccepted);
  const independentRuns = [...quality.runs].reverse().filter((run) => (run.kind === "behavior" || run.kind === "full") && run.provider !== null);
  const independentRun = independentRuns[0];
  const independentCurrent = independentRun !== undefined && gate.currentRunIds.includes(independentRun.id);
  const functionalRun = [...quality.runs].reverse().find((run) => run.kind === "functional");
  const functionalCurrent = functionalRun !== undefined && qualityRunIsCurrent(functionalRun, gate.currentRunIds, preview);
  let functionalVersionLabel = functionalCurrent ? "version actuelle" : "version non confirmée ou périmée";
  if (functionalRun?.preview) functionalVersionLabel = functionalCurrent ? "version déployée liée" : "résultat historique";
  const busy = pending || activeRun !== undefined || iterationActive;
  const startIteration = async (request: Omit<StartQualityIterationInput, "provider">): Promise<void> => {
    if (busy) return;
    setStartingIteration(true);
    try {
      await act(() => api.startQualityIteration(ticket.id, { ...request, provider }));
    } finally {
      setStartingIteration(false);
    }
  };
  const createFollowUp = (input: CreateQualityFollowUpInput): void => {
    if (busy) return;
    void act(async () => setResponse(await api.createQualityFollowUp(ticket.id, input)));
  };
  const latestRevision = quality.runs.at(-1)?.revision ?? preflight?.revision;
  const reservations = [...new Set([...gate.reservations, ...gate.reasons].map((message) => formatQualityGateMessage(message, quality)))];
  const simulated = quality.runs.some((run) => run.simulated);
  let deliveryLabel = "Validation à préparer";
  if (gate.enabled) deliveryLabel = deliveryComplete ? "Validation complète" : "Livraison avec réserves";
  let deliveryNote = "Les vérifications manquantes, périmées ou en échec restent des réserves. Une observation humaine garde sa provenance.";
  if (deliveryComplete) deliveryNote = "Toutes les preuves requises correspondent à la version livrée.";
  if (!gate.enabled) deliveryNote = "La validation de ce ticket reste à préparer.";
  if (partialDelivery) {
    deliveryLabel = "Livraison partielle avec réserves";
    deliveryNote = "Le travail conservé ne constitue pas une validation complète ; la reprise garde les réserves enregistrées.";
  }
  let preparationStatus: "passed" | "inconclusive" | "preparation" = "preparation";
  if (preflight?.ok === false) preparationStatus = "inconclusive";
  if (preflight?.ok === true && preflight.reservations.length === 0) preparationStatus = "passed";

  return (
    <div className="mx-auto max-w-4xl space-y-6 pb-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><p className="font-mono text-2xs tracking-wider text-muted-foreground">QUALITÉ DU TICKET</p><h2 className="mt-1 text-lg font-medium">Contrôles du ticket</h2><p className="mt-1 text-xs text-muted-foreground">Des résultats vérifiables, pour la version livrée.</p></div>
        <div className="flex items-center gap-2">
          {latestRevision && <span className="flex items-center gap-1 rounded border border-border px-2 py-1 font-mono text-2xs text-muted-foreground" title={`Dernière version exécutée : ${latestRevision}`}><GitCommitHorizontal className="h-3 w-3" />{latestRevision.slice(0, REVISION_DISPLAY_LENGTH)}</span>}
          <Button variant="ghost" size="sm" aria-label="Actualiser la validation" disabled={pending} onClick={() => void act()}><RefreshCw className="h-3.5 w-3.5" /></Button>
        </div>
      </div>

      {(error !== null || loadError !== null) && <div role="alert" className="rounded border border-danger/30 bg-danger/5 p-3 text-xs text-danger">{error ?? loadError}</div>}

      <section className="space-y-3">
        <div className="flex flex-wrap items-center gap-2"><label htmlFor="quality-validator" className="text-xs text-muted-foreground">Fournisseur indépendant</label><Select id="quality-validator" aria-label="Agent de validation indépendant" value={iterationActive && latestIteration !== null ? latestIteration.provider : provider} disabled={busy} className="w-auto" onChange={(event) => { if (event.target.value === "claude" || event.target.value === "codex") setProvider(event.target.value); }}>{ORCHESTRATORS.map((value) => <option key={value} value={value}>{ORCHESTRATOR_LABELS[value]}</option>)}</Select></div>
        <div className="divide-y divide-border rounded-lg border border-border">
          {[
            { label: "Contrôles techniques", versionLabel: checksCurrent ? "version actuelle" : "version non confirmée ou périmée", run: checksRun, current: checksCurrent, accepted: checksAccepted, status: checksRun === undefined ? undefined : qualityChecksStatus(checksRun, checks), action: () => api.startQualityChecks(ticket.id), actionLabel: "Lancer les contrôles techniques", Icon: Play },
            { label: "Critères d’acceptation", versionLabel: independentCurrent ? "version actuelle" : "version non confirmée ou périmée", run: independentRun, current: independentCurrent, accepted: independentRun?.evidenceAccepted === true, status: independentRun?.status, action: () => api.verifyTicketQuality(ticket.id, provider), actionLabel: "Valider les critères", Icon: FlaskConical },
            { label: "Parcours dans le navigateur", versionLabel: functionalVersionLabel, run: functionalRun, current: functionalCurrent, accepted: functionalRun?.evidenceAccepted === true, status: functionalRun?.status, action: () => api.testTicketFeature(ticket.id, provider), actionLabel: "Tester dans le navigateur", Icon: MousePointerClick },
          ].map((operation) => <div key={operation.label} className="flex flex-wrap items-center gap-3 px-4 py-3"><div className="min-w-0 flex-1"><p className="text-sm font-medium">{operation.label}</p><p className="mt-1 text-xs text-muted-foreground">{operation.run === undefined ? "Aucune exécution enregistrée" : `${formatDateTime(operation.run.startedAt)} · ${operation.run.provider === null ? "Serveur" : ORCHESTRATOR_LABELS[operation.run.provider]} · ${operation.versionLabel}${operation.run.simulated ? " · simulation" : ""}`}</p></div><QualityResult status={operation.status === undefined ? "unverified" : qualityEvidenceResult(operation.status, operation.current, operation.accepted, operation.run?.simulated === true, !!operation.run?.preview)} /><Button size="sm" variant="outline" disabled={busy} onClick={() => void act(operation.action)}><operation.Icon className="size-3.5" />{operation.actionLabel}</Button></div>)}
        </div>
        <p className="text-xs text-muted-foreground">Chaque opération garde son propre résultat. Les parcours navigateur ne remplacent pas les contrôles techniques.</p>
      </section>

      <details className="rounded-lg border border-border" open={activeRun !== undefined || iterationActive || (autonomousState !== null && autonomousState !== undefined) || (iterationActions !== undefined && iterationActions.problems.length > 0)}>
        <summary className="cursor-pointer px-4 py-3 text-sm font-medium">Rapports, blocages et suites</summary>
        <div className="space-y-3 border-t border-border p-4">
        {functionalRun !== undefined && latestIteration?.resultRunId !== functionalRun.id && <FunctionalTestPanel run={functionalRun} quality={quality} current={functionalCurrent} onOpenEvidence={setSelectedEvidence} />}
        {independentRun !== undefined && latestIteration?.resultRunId !== independentRun.id && <div className="space-y-3 rounded border border-border px-3 py-3"><QualityRunStatus run={independentRun} current={independentCurrent} quality={quality}><QualityRunExplanation run={independentRun} quality={quality} current={independentCurrent} onOpenEvidence={setSelectedEvidence} deferredToPreview={ticket.autonomous && independentRun.kind === "full"} /></QualityRunStatus></div>}
        <AutonomousRecoveryPanel ticket={ticket} pending={pending} act={act} onOpenTerminal={onOpenTerminal} />
        {iterationActions !== undefined && !iterationActive && !ticket.autonomous && <QualityRemediation quality={quality} actions={iterationActions} ticketProject={ticket.project} busy={busy} starting={startingIteration} onOpenEvidence={setSelectedEvidence} onStartIteration={(request) => void startIteration(request)} onCreateFollowUp={createFollowUp} />}
        {(activeRun !== undefined || iterationActive) && <div role="status" className="flex flex-wrap items-center justify-between gap-3 rounded border border-info/30 bg-info/5 px-3 py-2 text-xs"><span>{activeRun !== undefined ? `${activeRun.phase === null ? qualityRunTitle(activeRun) : qualityPhaseLabel(activeRun.phase)} · ${activeRun.simulated ? "simulation" : "exécution réelle"}` : "Le cycle prépare une nouvelle vérification indépendante."}</span><Button variant="ghost" size="sm" disabled={pending} onClick={() => void act(async () => setResponse(await api.cancelQualityValidation(ticket.id)))}><Square className="h-3 w-3" />{iterationActive ? "Annuler le cycle" : "Annuler la vérification"}</Button></div>}
        <QualityIterations quality={quality} currentRunIds={gate.currentRunIds} onOpenEvidence={setSelectedEvidence} />
        </div>
      </details>

      <div className={cn("flex gap-3 rounded border p-3", deliveryComplete ? "border-success/30 bg-success/5" : "border-border bg-muted/20")}>
        {deliveryComplete ? <ShieldCheck className="h-4 w-4 shrink-0 text-success" /> : <TriangleAlert className="h-4 w-4 shrink-0 text-warning" />}
        <div className="space-y-1"><p className="text-xs font-medium">{deliveryLabel}</p><p className="text-xs text-muted-foreground">{gate.enabled ? "Les preuves enregistrées déterminent les réserves de livraison." : "Lancez la vérification pour préparer et valider ce ticket."}</p>{gate.stale && <p className="text-xs text-warning">Le code, les critères ou la configuration ont changé. Renouvelez les preuves ; les anciennes restent dans l’historique.</p>}{simulated && <p className="text-xs text-warning">Des exécutions simulées sont présentes. Elles ne valident pas une livraison réelle.</p>}</div>
      </div>

      <QualitySection number={1} title="Prérequis de validation" action={<Button variant="ghost" size="sm" disabled={busy} onClick={() => void act(async () => setPreflight(await api.qualityPreflight(ticket.id)))}><RefreshCw className="h-3.5 w-3.5" />Vérifier les prérequis</Button>}>
        <div className="rounded border border-border p-3">
          {preflight === null ? <p className="text-xs text-muted-foreground">Vérifiez la version du code, les commandes et la configuration de l’environnement de test.</p> : (
            <div className="space-y-2"><div className="flex items-center justify-between gap-3"><p className="text-xs">Préparation de l’environnement</p><QualityResult status={preparationStatus} /></div>{preflight.revision !== null && <p className="break-all font-mono text-2xs text-muted-foreground">Version inspectée : {preflight.revision}</p>}{preflight.blockers.map((blocker) => <p key={blocker} className="text-xs text-danger">{formatQualityMessage(blocker)}</p>)}{preflight.reservations.map((reservation) => <p key={reservation} className="text-xs text-warning">{formatQualityMessage(reservation)}</p>)}<p className="text-2xs text-muted-foreground">Ce contrôle prépare l’exécution. Les résultats attendus et les commandes conservent leurs propres preuves.</p></div>
          )}
        </div>
      </QualitySection>

      <details className="rounded-lg border border-border"><summary className="cursor-pointer px-4 py-3 text-sm font-medium">Rapport des contrôles techniques</summary><div className="border-t border-border p-4">
        <div className="divide-y divide-border rounded border border-border">
          {checks.map((evidence) => <button key={evidence.id} type="button" className="flex w-full flex-wrap items-center gap-3 px-3 py-3 text-left hover:bg-muted/30" onClick={() => setSelectedEvidence(evidence)}><div className="min-w-0 flex-1"><p className="text-xs">{formatQualityEvidenceSummary(evidence)}</p><p className="mt-1 break-all font-mono text-2xs text-muted-foreground">{evidence.command}</p></div><span className="text-2xs text-muted-foreground">{checksRun?.simulated ? "Simulation" : "Serveur"} · {formatDuration(evidence.durationMs)}</span><QualityResult status={qualityEvidenceResult(evidence.status, checksCurrent, checksAccepted, checksRun?.simulated === true)} /><ChevronRight className="h-3.5 w-3.5 text-muted-foreground" /></button>)}
          {checks.length === 0 && <p className="px-3 py-3 text-xs text-muted-foreground">{checksRun === undefined ? "Aucune commande exécutée. Les contrôles utilisent les scripts du projet." : "Aucun journal disponible pour cette exécution."}</p>}
          {checksRun !== undefined && <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-2xs text-muted-foreground"><span>Dernière exécution · {checksRun.simulated ? "simulée" : "réelle"} · {checksCurrent ? "version actuelle" : "résultats obsolètes"}</span><QualityResult status={qualityEvidenceResult(qualityChecksStatus(checksRun, checks), checksCurrent, checksAccepted, checksRun.simulated)} />{checksRun.error !== null && (checksRun.kind === "checks" || checksRun.failurePhase === "checks") && <p className="w-full text-danger">{formatQualityMessage(checksRun.error)}</p>}</div>}
        </div>
      </div></details>

      <QualityCriteriaPanel quality={quality} gate={gate} busy={busy} onSave={async (criteria) => { setResponse(await api.setQualityCriteria(ticket.id, { criteria })); }} onEvidence={async (input) => { setResponse(await api.addQualityEvidence(ticket.id, input)); }} onOpenEvidence={setSelectedEvidence} />

      <QualityRequestHistory key={ticket.id} ticketId={ticket.id} />
      <QualityRunHistory preview={preview} quality={quality} currentRunIds={gate.currentRunIds} onOpenEvidence={setSelectedEvidence} />

      <QualitySection number={4} title="Bilan avant livraison">
        <div className="space-y-3 rounded border border-border p-3"><div className="flex items-center justify-between gap-3"><p className="text-xs font-medium">{deliveryLabel}</p><span className={cn("text-2xs", deliveryComplete ? "text-success" : "text-warning")}>Preuves {deliveryComplete ? "complètes" : "à compléter"}</span></div>{reservations.length > 0 && <ul className="space-y-1.5 text-xs text-muted-foreground">{reservations.map((reservation) => <li key={reservation} className="flex gap-2"><TriangleAlert className="mt-0.5 h-3 w-3 shrink-0 text-warning" /><span>{reservation}</span></li>)}</ul>}<p className="text-xs text-muted-foreground">{deliveryNote}</p></div>
      </QualitySection>

      <p className="border-t border-border pt-3 text-2xs text-muted-foreground">Les preuves sont liées à la version du code, aux critères et à la configuration. Toute modification impose une nouvelle vérification.</p>
      <QualityEvidenceDialog evidence={selectedEvidence} quality={quality} currentRunIds={quality.runs.filter((run) => qualityRunIsCurrent(run, gate.currentRunIds, preview)).map((run) => run.id)} onClose={() => setSelectedEvidence(null)} />
    </div>
  );
}
