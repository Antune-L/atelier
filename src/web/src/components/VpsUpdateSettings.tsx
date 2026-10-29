import { useEffect, useId, useState } from "react";

import { vpsUpdateSchema } from "@shared/vpsUpdate";
import type { VpsUpdateStatus } from "@shared/vpsUpdate";

import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { SectionHeader } from "@/components/ui/settings";
import { request } from "@/lib/api";

const REFRESH_MS = 3_000;
const REQUEST_TIMEOUT_MS = 15_000;
const UPDATE_PATH = "/api/vps-update";
const PHASE_LABELS: Record<VpsUpdateStatus["phase"], string> = {
  idle: "Prêt", resolving: "Recherche de la version", running: "Mise à jour en cours",
  succeeded: "Mise à jour terminée", refused: "Mise à jour reportée : des tâches sont actives", failed: "Échec : intervention requise", interrupted: "Mise à jour interrompue : intervention requise",
};

const UPDATE_STEPS = [
  { label: "Préparation de la version", matches: /^(Taking the upgrade lock|Resolving the target commit|Checking free disk space)/ },
  { label: "Construction de la version", matches: /^Building release / },
  { label: "Vérification des tâches en cours", matches: /^Checking for running work/ },
  { label: "Sauvegarde de la base de données", matches: /^Backing up the database/ },
  { label: "Redémarrage du serveur", matches: /^(Stopping |Switching |Starting )/ },
  { label: "Vérification du redémarrage", matches: /^Checking health on / },
  { label: "Nettoyage des anciennes versions", matches: /^Pruning old releases and backups/ },
];
const TOTAL_STEPS = UPDATE_STEPS.length;
const SHORT_SHA_LENGTH = 12;

function getUpdateProgress(status: VpsUpdateStatus) {
  if (status.phase === "succeeded") return { value: TOTAL_STEPS, label: "Le serveur est prêt à être utilisé." };
  if (status.phase === "idle") return { value: null, label: "En attente de votre confirmation." };
  if (status.phase === "refused") return { value: null, label: "Le serveur n’a pas été arrêté. Terminez les tâches actives, puis confirmez pour réessayer." };
  if (status.phase === "failed" || status.phase === "interrupted") {
    return { value: null, label: "Vérifiez les détails avant toute nouvelle tentative." };
  }
  if (status.phase === "resolving") return { value: null, label: "Recherche de la version à installer…" };
  const stepIndex = UPDATE_STEPS.findIndex((step) => step.matches.test(status.progress.replace(/^==>\s*/, "")));
  const step = UPDATE_STEPS[stepIndex];
  if (step === undefined) return { value: null, label: "Mise à jour en cours. En attente de la prochaine étape…" };
  return { value: stepIndex, label: step.label };
}

export function VpsUpdateSettings() {
  const confirmationId = useId();
  const conditionsId = useId();
  const progressId = useId();
  const [status, setStatus] = useState<VpsUpdateStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  useEffect(() => {
    let disposed = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    async function refresh(): Promise<void> {
      try {
        const result: unknown = await request(UPDATE_PATH, { signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) });
        if (disposed) return;
        if (result === null) return;
        setStatus(vpsUpdateSchema.parse(result));
        setError(null);
      } catch {
        if (disposed) return;
        setError("Service de mise à jour indisponible. Reconnexion automatique ; vérifiez votre connexion Cloudflare Access si cela persiste.");
      }
      if (!disposed) timer = setTimeout(() => { void refresh(); }, REFRESH_MS);
    }
    void refresh();
    return () => { disposed = true; clearTimeout(timer); };
  }, []);

  async function start(): Promise<void> {
    setPending(true);
    setError(null);
    try {
      const result: unknown = await request(UPDATE_PATH, { method: "POST", signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS), headers: { "x-kanban-update": "confirm" } });
      setStatus(vpsUpdateSchema.parse(result));
      setConfirmed(false);
    } catch {
      setError("La demande n’a pas été confirmée. Consultez l’état avant de réessayer : une coupure peut accompagner le redémarrage.");
    } finally {
      setPending(false);
    }
  }

  if (status === null && error === null) return null;
  const canStart = status?.phase === "idle" || status?.phase === "succeeded" || status?.phase === "refused";
  const progress = status === null ? null : getUpdateProgress(status);
  const isFailure = status?.phase === "failed" || status?.phase === "interrupted";
  const showProgress = status?.phase === "resolving" || status?.phase === "running" || status?.phase === "succeeded";
  const isBusy = pending || status?.phase === "resolving" || status?.phase === "running";
  return (
    <section className="space-y-4 rounded-md border p-4">
      <SectionHeader title="Mise à jour du VPS" subtitle="Installe la dernière version et vérifie le redémarrage du serveur." />
      <div id={conditionsId} className="space-y-2 text-sm">
        <p>Terminez les cartes, validations et aperçus avant de continuer. Ne lancez aucun travail pendant la mise à jour.</p>
        <p className="text-muted-foreground">L’accès sera brièvement coupé. Le suivi reprendra automatiquement.</p>
        <p className="text-xs text-muted-foreground">La mise à jour est refusée si des tâches sont actives, mais une tâche lancée juste avant l’arrêt peut être interrompue. En cas d’échec, le retour arrière restaure le code, jamais la base de données.</p>
      </div>
      {status !== null && progress !== null && (
        <div className="space-y-3 rounded-md border bg-muted/30 p-3">
          <div role="status" className="space-y-1">
            <p className={`text-sm font-medium ${isFailure ? "text-destructive" : ""}`}>
              {error !== null ? "Reconnexion en cours" : PHASE_LABELS[status.phase]}
            </p>
            <p id={progressId} className="text-sm text-muted-foreground">
              {error !== null ? "Le suivi reprendra dès que le serveur sera accessible. Le dernier état reçu est conservé." : progress.label}
            </p>
          </div>
          {(showProgress || error !== null) && (
            <Progress
              value={error !== null ? null : progress.value}
              max={TOTAL_STEPS}
              aria-label="Avancement de la mise à jour"
              aria-valuetext={error !== null ? "En attente de reconnexion" : progress.label}
              aria-describedby={progressId}
            />
          )}
          {status.target !== null && (
            <p className="text-xs text-muted-foreground">Version cible <span className="font-mono" title={status.target}>{status.target.slice(0, SHORT_SHA_LENGTH)}</span></p>
          )}
          {status.progress && status.phase !== "idle" && (
            <details className="text-xs text-muted-foreground">
              <summary className="cursor-pointer rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">Détails techniques</summary>
              <p className="mt-2 whitespace-pre-wrap break-words font-mono">{status.progress}</p>
            </details>
          )}
        </div>
      )}
      <div className="flex items-start gap-3 rounded-md border p-3">
        <Switch
          id={confirmationId}
          checked={confirmed}
          disabled={!canStart || pending || error !== null}
          onCheckedChange={setConfirmed}
          aria-describedby={conditionsId}
          className="mt-0.5 motion-reduce:transition-none [&>span]:motion-reduce:transition-none"
        />
        <label htmlFor={confirmationId} className="cursor-pointer text-sm leading-5">
          J’ai compris et j’accepte ces conditions : mes tâches sont terminées et j’autorise le redémarrage.
        </label>
      </div>
      <Button disabled={!canStart || !confirmed || pending || error !== null} onClick={() => { void start(); }}>
        {isBusy ? "Mise à jour en cours…" : "Mettre à jour le VPS"}
      </Button>
      {error !== null && <p role="alert" className="text-sm text-destructive">{error}</p>}
    </section>
  );
}
