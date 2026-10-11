import { useCallback, useEffect, useState } from "react";

import { ORCHESTRATORS, ORCHESTRATOR_LABELS } from "@shared/constants";
import type { Orchestrator } from "@shared/constants";
import { QUALITY_ACTIVE_STATUSES, QUALITY_ITERATION_ACTIVE_STATUSES } from "@shared/quality";
import type { QualityResponse, QualityValidationRun, QualityVerificationComponent } from "@shared/quality";
import type { Ticket } from "@shared/schemas";

import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { api } from "@/lib/api";
import { qualityErrorMessage } from "@/lib/qualityMessages";

export function canShowVerification(ticket: Pick<Ticket, "kind" | "column" | "prUrl">): boolean {
  return ticket.kind === "feature" && ticket.column === "done" && !!ticket.prUrl;
}

const STATUS_LABELS: Record<QualityVerificationComponent["status"], string> = { pending: "À vérifier", passed: "Réussi", failed: "Échec", inconclusive: "Incomplet", blocked: "Bloqué" };
const DIMENSION_LABELS = { technical: "Tests et contrôles techniques", relevance: "Pertinence des tests", browser: "Parcours Playwright" };

export function VerificationReport({ run, current }: { run: QualityValidationRun; current: boolean }) {
  const report = run.verification;
  if (!report) return <p>Aucun bilan disponible pour cette exécution.</p>;
  const components = ["technical", "relevance", "browser"] satisfies Array<keyof typeof DIMENSION_LABELS>;
  return <div className="space-y-4 text-xs">
    <p>Version : <span className="font-mono">{run.revision.slice(0, 12)}</span> · {run.provider} · {run.status === "running" || run.status === "queued" ? "En cours" : run.status === "interrupted" ? "Interrompu au redémarrage" : run.status === "cancelled" ? "Annulé" : run.evidenceAccepted && current ? "Vérification acceptée" : "Vérification non acceptée"}</p>
    {run.simulated && <p role="status" className="text-warning">Simulation : aucun succès réel ne peut être établi.</p>}
    {!current && <p className="text-warning">Preuves périmées ou version actuelle non confirmée. Relancez la vérification.</p>}
    {run.cleanupStatus !== "complete" && <p className="text-warning">Nettoyage de l’environnement {run.cleanupStatus === "failed" ? "en échec" : "en attente"}.</p>}
    <ul className="flex flex-wrap gap-3">{components.map((dimension) => <li key={dimension}>{DIMENSION_LABELS[dimension]} : {run.simulated ? "Simulation" : STATUS_LABELS[report[dimension].status]}</li>)}</ul>
    {(["tested", "improvements"] satisfies Array<"tested" | "improvements">).map((list) => <section key={list} className="space-y-2">
      <h3 className="font-medium">{list === "tested" ? "Ce qui a été testé" : "Améliorations et angles morts"}</h3>
      <ul className="list-disc space-y-3 pl-5">{components.flatMap((dimension) => report[dimension][list].map((bullet, index) => <li key={`${dimension}-${index}`}>
        <p>{bullet.summary} <span className="text-muted-foreground">· {DIMENSION_LABELS[dimension]}{run.simulated ? " · Simulation" : bullet.status ? ` · ${STATUS_LABELS[bullet.status]}` : ""}</span></p>
        <details className="mt-1 text-muted-foreground"><summary className="cursor-pointer">Preuves et détails</summary><div className="mt-2 space-y-1"><p>{bullet.provider ? `Agent ${bullet.provider} · session ${bullet.sessionId ?? "non attribuée"}` : "Observation du serveur"}{bullet.evidenceId ? ` · preuve ${bullet.evidenceId}` : " · sans preuve attribuée"}</p><pre className="whitespace-pre-wrap break-words">{bullet.details}</pre>{bullet.artifactPath && <p className="break-all">Artefact : {bullet.artifactPath}</p>}</div></details>
      </li>))}</ul>
      {components.every((dimension) => report[dimension][list].length === 0) && <p className="text-muted-foreground">{list === "tested" ? "Aucune observation enregistrée." : "Aucune amélioration enregistrée ; les dimensions en attente restent non vérifiées."}</p>}
    </section>)}
  </div>;
}

export function VerificationTab({ ticket }: { ticket: Ticket }) {
  const [response, setResponse] = useState<QualityResponse | null>(null);
  const [provider, setProvider] = useState<Orchestrator>(ticket.orchestrator === "claude" ? "codex" : "claude");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const refresh = useCallback(async (signal?: AbortSignal): Promise<void> => { setResponse(await api.ticketQuality(ticket.id, signal)); }, [ticket.id]);
  useEffect(() => {
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    const poll = async (): Promise<void> => {
      try { await refresh(controller.signal); } catch (failure) { if (!controller.signal.aborted) setError(qualityErrorMessage(failure)); }
      if (!controller.signal.aborted) timer = setTimeout(() => void poll(), 3_000);
    };
    void poll();
    return () => { controller.abort(); if (timer !== undefined) clearTimeout(timer); };
  }, [refresh]);
  const act = async (action: () => Promise<unknown>): Promise<void> => {
    setPending(true);
    setError(null);
    try { await action(); await refresh(); } catch (failure) { setError(qualityErrorMessage(failure)); } finally { setPending(false); }
  };
  const active = response?.quality.runs.some((run) => QUALITY_ACTIVE_STATUSES.includes(run.status)) || response?.quality.iterations.some((iteration) => QUALITY_ITERATION_ACTIVE_STATUSES.includes(iteration.status));
  const run = response?.quality.runs.filter((candidate) => candidate.kind === "combined").at(-1);
  return <div className="mx-auto max-w-4xl space-y-5 pb-4">
    <h2 className="text-lg font-medium">Vérification de la fonctionnalité</h2>
    <p className="text-xs text-muted-foreground">Une seule exécution vérifie les tests et contrôles existants, la pertinence de leurs assertions et les parcours réels dans le navigateur.</p>
    <div className="flex flex-wrap gap-2"><Select aria-label="Agent de vérification" value={provider} onChange={(event) => { const value = event.target.value; if (value === "claude" || value === "codex") setProvider(value); }} disabled={pending || !!active}>{ORCHESTRATORS.map((value) => <option key={value} value={value}>{ORCHESTRATOR_LABELS[value]}</option>)}</Select><Button disabled={!canShowVerification(ticket) || response === null || pending || !!active || ticket.testing || ticket.slotId !== null} onClick={() => void act(() => api.verifyCombinedQuality(ticket.id, provider))}>Lancer la vérification combinée</Button>{active && <Button variant="outline" disabled={pending} onClick={() => void act(() => api.cancelQualityValidation(ticket.id))}>Annuler la vérification</Button>}</div>
    {error && <p role="alert" className="text-xs text-danger">{error}</p>}
    {run ? <VerificationReport run={run} current={response?.gate.currentRunIds.includes(run.id) === true} /> : <p className="text-xs text-muted-foreground">Aucune vérification combinée enregistrée.</p>}
  </div>;
}
