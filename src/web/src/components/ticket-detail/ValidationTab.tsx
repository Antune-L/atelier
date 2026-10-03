import { ChevronRight, FlaskConical, GitCommitHorizontal, Play, RefreshCw, ShieldCheck, Square, TriangleAlert } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { ORCHESTRATORS, ORCHESTRATOR_LABELS } from "@shared/constants";
import type { Orchestrator } from "@shared/constants";
import { QUALITY_ACTIVE_STATUSES } from "@shared/quality";
import type { QualityEvidence, QualityPreflight, QualityResponse } from "@shared/quality";
import type { Ticket } from "@shared/schemas";

import { QualityCriteriaPanel } from "@/components/ticket-detail/QualityCriteriaPanel";
import { QualityEvidenceDialog, QualityResult, QualityRunHistory, QualitySection, qualityEvidenceResult } from "@/components/ticket-detail/QualityResults";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { api } from "@/lib/api";
import { formatDuration } from "@/lib/display";
import { errorMessage } from "@/lib/errors";
import { cn } from "@/lib/utils";

const QUALITY_RUNNING_POLL_MS = 3_000;
const QUALITY_IDLE_POLL_MS = 10_000;
const REVISION_DISPLAY_LENGTH = 12;

export function ValidationTab({ ticket }: { ticket: Ticket }) {
  const [response, setResponse] = useState<QualityResponse | null>(null);
  const [preflight, setPreflight] = useState<QualityPreflight | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [provider, setProvider] = useState<Orchestrator>(ticket.orchestrator === "claude" ? "codex" : "claude");
  const [selectedEvidence, setSelectedEvidence] = useState<QualityEvidence | null>(null);

  const refresh = useCallback(async (signal?: AbortSignal): Promise<QualityResponse> => {
    const value = await api.ticketQuality(ticket.id, signal);
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
          if (value.quality.runs.some((run) => QUALITY_ACTIVE_STATUSES.includes(run.status))) delay = QUALITY_RUNNING_POLL_MS;
        }
      } catch (failure) {
        if (!controller.signal.aborted) setLoadError(errorMessage(failure));
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
    setPending(true);
    setError(null);
    try {
      if (action !== undefined) await action();
      await refresh();
    } catch (failure) {
      setError(errorMessage(failure));
    } finally {
      setPending(false);
    }
  };

  if (response === null) {
    return <div className="space-y-3"><p role="status" className="text-sm text-muted-foreground">Chargement de la validation…</p>{loadError !== null && <p role="alert" className="text-xs text-danger">{loadError}</p>}<Button variant="outline" size="sm" disabled={pending} onClick={() => void act()}>Réessayer</Button></div>;
  }

  const { quality, gate } = response;
  const activeRun = quality.runs.find((run) => QUALITY_ACTIVE_STATUSES.includes(run.status));
  const checksRun = [...quality.runs].reverse().find((run) => run.kind === "checks");
  const checks = quality.evidence.filter((evidence) => evidence.runId === checksRun?.id && evidence.kind === "command");
  const checksCurrent = checksRun !== undefined && gate.currentRunIds.includes(checksRun.id);
  const independentRun = [...quality.runs].reverse().find((run) => run.kind === "behavior" && run.provider !== null);
  const independentCurrent = independentRun !== undefined && gate.currentRunIds.includes(independentRun.id);
  const busy = pending || activeRun !== undefined;
  const latestRevision = quality.runs.at(-1)?.revision ?? preflight?.revision;
  const reservations = [...new Set([...gate.reservations, ...gate.reasons])];
  const simulated = quality.runs.some((run) => run.simulated);
  let deliveryLabel = "Validation à préparer";
  if (gate.enabled) deliveryLabel = gate.complete ? "Validation complète" : "Livraison avec réserves";

  return (
    <div className="mx-auto max-w-4xl space-y-6 pb-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><p className="font-mono text-2xs tracking-wider text-muted-foreground">QUALITÉ DU TICKET</p><h2 className="mt-1 text-lg font-medium">Validation</h2><p className="mt-1 text-xs text-muted-foreground">Des résultats vérifiables, pour la version livrée.</p></div>
        <div className="flex items-center gap-2">
          {latestRevision && <span className="flex items-center gap-1 rounded border border-border px-2 py-1 font-mono text-2xs text-muted-foreground" title={`Dernière version exécutée : ${latestRevision}`}><GitCommitHorizontal className="h-3 w-3" />{latestRevision.slice(0, REVISION_DISPLAY_LENGTH)}</span>}
          <Button variant="ghost" size="sm" aria-label="Actualiser la validation" disabled={pending} onClick={() => void act()}><RefreshCw className="h-3.5 w-3.5" /></Button>
        </div>
      </div>

      {(error !== null || loadError !== null) && <div role="alert" className="rounded border border-danger/30 bg-danger/5 p-3 text-xs text-danger">{error ?? loadError}</div>}

      <div className={cn("flex gap-3 rounded border p-3", gate.complete ? "border-success/30 bg-success/5" : "border-border bg-muted/20")}>
        {gate.complete ? <ShieldCheck className="h-4 w-4 shrink-0 text-success" /> : <TriangleAlert className="h-4 w-4 shrink-0 text-warning" />}
        <div className="space-y-1"><p className="text-xs font-medium">{deliveryLabel}</p><p className="text-xs text-muted-foreground">{gate.enabled ? "Les preuves enregistrées déterminent les réserves de livraison." : "Définissez des critères ou lancez les contrôles pour activer la validation de ce ticket."}</p>{gate.stale && <p className="text-xs text-warning">Le code, les critères ou la configuration ont changé. Renouvelez les preuves ; les anciennes restent dans l’historique.</p>}{simulated && <p className="text-xs text-warning">Des exécutions simulées sont présentes. Elles ne valident pas une livraison réelle.</p>}</div>
      </div>

      <QualitySection number={1} title="Prérequis de validation" action={<Button variant="ghost" size="sm" disabled={busy} onClick={() => void act(async () => setPreflight(await api.qualityPreflight(ticket.id)))}><RefreshCw className="h-3.5 w-3.5" />Vérifier</Button>}>
        <div className="rounded border border-border p-3">
          {preflight === null ? <p className="text-xs text-muted-foreground">Vérifiez la version du code, les commandes et la configuration de l’environnement de test.</p> : (
            <div className="space-y-2"><div className="flex items-center justify-between gap-3"><p className="text-xs">Préparation de l’environnement</p><QualityResult status={preflight.ok ? "passed" : "inconclusive"} /></div>{preflight.revision !== null && <p className="break-all font-mono text-2xs text-muted-foreground">Version inspectée : {preflight.revision}</p>}{preflight.blockers.map((blocker) => <p key={blocker} className="text-xs text-danger">{blocker}</p>)}{preflight.reservations.map((reservation) => <p key={reservation} className="text-xs text-warning">{reservation}</p>)}<p className="text-2xs text-muted-foreground">Ce contrôle prépare l’exécution. Les parcours et les commandes conservent leurs propres résultats.</p></div>
          )}
        </div>
      </QualitySection>

      <QualitySection number={2} title="Contrôles techniques" action={<Button variant="outline" size="sm" disabled={busy} onClick={() => void act(() => api.startQualityChecks(ticket.id))}><Play className="h-3.5 w-3.5" />{checksRun === undefined ? "Lancer les contrôles" : "Relancer les contrôles"}</Button>}>
        <div className="divide-y divide-border rounded border border-border">
          {checks.map((evidence) => <button key={evidence.id} type="button" className="flex w-full flex-wrap items-center gap-3 px-3 py-3 text-left hover:bg-muted/30" onClick={() => setSelectedEvidence(evidence)}><div className="min-w-0 flex-1"><p className="text-xs">{evidence.summary}</p><p className="mt-1 break-all font-mono text-2xs text-muted-foreground">{evidence.command}</p></div><span className="text-2xs text-muted-foreground">{checksRun?.simulated ? "Simulation" : "Serveur"} · {formatDuration(evidence.durationMs)}</span><QualityResult status={qualityEvidenceResult(evidence.status, checksCurrent, checksRun?.evidenceAccepted === true, checksRun?.simulated === true)} /><ChevronRight className="h-3.5 w-3.5 text-muted-foreground" /></button>)}
          {checks.length === 0 && <p className="px-3 py-3 text-xs text-muted-foreground">{checksRun === undefined ? "Aucune commande exécutée. Les contrôles utilisent les scripts du projet." : "Aucun journal disponible pour cette exécution."}</p>}
          {checksRun !== undefined && <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-2xs text-muted-foreground"><span>Dernière exécution · {checksRun.simulated ? "simulée" : "réelle"} · {checksCurrent ? "version actuelle" : "résultats obsolètes"}</span><QualityResult status={qualityEvidenceResult(checksRun.status, checksCurrent, checksRun.evidenceAccepted, checksRun.simulated)} />{checksRun.error !== null && <p className="w-full text-danger">{checksRun.error}</p>}</div>}
        </div>
      </QualitySection>

      <QualityCriteriaPanel quality={quality} gate={gate} busy={busy} onSave={async (criteria) => { setResponse(await api.setQualityCriteria(ticket.id, { criteria })); }} onEvidence={async (input) => { setResponse(await api.addQualityEvidence(ticket.id, input)); }} onOpenEvidence={setSelectedEvidence} />

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
        <div><p className="text-xs font-medium">Validation indépendante</p><p className="mt-1 text-xs text-muted-foreground">Une session distincte vérifie les critères dans sa propre copie du projet.</p></div>
        <div className="flex flex-wrap items-center gap-2"><Select aria-label="Agent de validation indépendant" value={provider} disabled={busy} className="w-auto" onChange={(event) => { if (event.target.value === "claude" || event.target.value === "codex") setProvider(event.target.value); }}>{ORCHESTRATORS.map((value) => <option key={value} value={value}>{ORCHESTRATOR_LABELS[value]}</option>)}</Select><Button size="sm" disabled={busy || quality.criteriaSnapshots.length === 0} onClick={() => void act(() => api.startQualityValidation(ticket.id, provider))}><FlaskConical className="h-3.5 w-3.5" />Vérifier les parcours</Button></div>
      </div>

      {independentRun !== undefined && <div className="space-y-2 rounded border border-border px-3 py-3"><div className="flex flex-wrap items-center justify-between gap-2 text-xs"><span>Dernière validation indépendante{independentRun.provider !== null && ` · ${ORCHESTRATOR_LABELS[independentRun.provider]}`}</span><QualityResult status={qualityEvidenceResult(independentRun.status, independentCurrent, independentRun.evidenceAccepted, independentRun.simulated)} /></div><p className="text-2xs text-muted-foreground">{independentRun.simulated ? "Simulation" : "Exécution réelle"} · {independentCurrent ? "version actuelle" : "résultats obsolètes"}</p>{independentRun.error !== null && <p role="alert" className="text-xs text-danger">{independentRun.error}</p>}</div>}

      {activeRun !== undefined && <div role="status" className="flex flex-wrap items-center justify-between gap-3 rounded border border-info/30 bg-info/5 px-3 py-2 text-xs"><span>{activeRun.kind === "checks" ? "Contrôles techniques" : "Validation des parcours"} en cours · {activeRun.simulated ? "simulation" : "exécution réelle"}</span><Button variant="ghost" size="sm" disabled={pending} onClick={() => void act(async () => setResponse(await api.cancelQualityValidation(ticket.id)))}><Square className="h-3 w-3" />Annuler la validation</Button></div>}

      <QualityRunHistory quality={quality} currentRunIds={gate.currentRunIds} onOpenEvidence={setSelectedEvidence} />

      <QualitySection number={4} title="Bilan avant livraison">
        <div className="space-y-3 rounded border border-border p-3"><div className="flex items-center justify-between gap-3"><p className="text-xs font-medium">{deliveryLabel}</p><span className={cn("text-2xs", gate.enabled && gate.complete ? "text-success" : "text-warning")}>Fusion automatique {gate.enabled && gate.complete ? "éligible" : "indisponible"}</span></div>{reservations.length > 0 && <ul className="space-y-1.5 text-xs text-muted-foreground">{reservations.map((reservation) => <li key={reservation} className="flex gap-2"><TriangleAlert className="mt-0.5 h-3 w-3 shrink-0 text-warning" /><span>{reservation}</span></li>)}</ul>}<p className="text-xs text-muted-foreground">{gate.complete ? "Toutes les preuves requises correspondent à la version livrée." : "Les vérifications manquantes, périmées ou en échec restent des réserves. Une observation humaine garde sa provenance."}</p></div>
      </QualitySection>

      <p className="border-t border-border pt-3 text-2xs text-muted-foreground">Les preuves sont liées à la version du code, aux critères et à la configuration. Toute modification impose une nouvelle vérification.</p>
      <QualityEvidenceDialog evidence={selectedEvidence} quality={quality} currentRunIds={gate.currentRunIds} onClose={() => setSelectedEvidence(null)} />
    </div>
  );
}
