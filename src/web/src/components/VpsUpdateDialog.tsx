import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";

import { vpsUpdateSchema } from "@shared/vpsUpdate";
import type { VpsUpdateStatus } from "@shared/vpsUpdate";
import type { ProviderVersions } from "@shared/providerUpdates";

import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { request } from "@/lib/api";
import { formatDateTime } from "@/lib/display";
import { useProviderUpdates } from "@/hooks/useProviderUpdates";

const REFRESH_MS = 3_000;
const REQUEST_TIMEOUT_MS = 15_000;
const UPDATE_PATH = "/api/vps-update";

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
const SHORT_SHA_LENGTH = 7;

function getRunningStep(status: VpsUpdateStatus) {
  if (status.phase === "resolving") return { value: null, label: "Recherche de la version à installer…" };
  const stepIndex = UPDATE_STEPS.findIndex((step) => step.matches.test(status.progress.replace(/^==>\s*/, "")));
  const step = UPDATE_STEPS[stepIndex];
  if (step === undefined) return { value: null, label: "En attente de la prochaine étape…" };
  return { value: stepIndex, label: step.label };
}

function ShortSha({ sha }: { sha: string }) {
  return <span className="font-mono text-xs text-muted-foreground" title={sha}>{sha.slice(0, SHORT_SHA_LENGTH)}</span>;
}

function TechnicalDetails({ progress }: { progress: string }) {
  return (
    <details className="text-xs text-muted-foreground">
      <summary className="cursor-pointer rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">Détails techniques</summary>
      <p className="mt-2 whitespace-pre-wrap break-words font-mono">{progress}</p>
    </details>
  );
}

function RunningStatus({ status, reconnecting }: { status: VpsUpdateStatus; reconnecting: boolean }) {
  const labelId = useId();
  const step = getRunningStep(status);
  const label = reconnecting ? "Reconnexion en cours, le suivi reprendra automatiquement…" : step.label;
  return (
    <div className="space-y-2">
      <div role="status" className="flex items-baseline justify-between gap-3 text-sm">
        <span id={labelId}>{label}</span>
        {!reconnecting && step.value !== null && <span className="shrink-0 text-xs text-muted-foreground">Étape {step.value + 1} sur {TOTAL_STEPS}</span>}
      </div>
      <Progress
        value={reconnecting ? null : step.value}
        max={TOTAL_STEPS}
        aria-label="Avancement de la mise à jour"
        aria-valuetext={label}
        aria-describedby={labelId}
      />
      <p className="text-xs text-muted-foreground">
        Ne lancez aucun travail pendant la mise à jour.
        {status.target !== null && <> Vers <ShortSha sha={status.target} /></>}
      </p>
      {status.progress && <TechnicalDetails progress={status.progress} />}
    </div>
  );
}

function FinishedStatus({ status }: { status: VpsUpdateStatus }) {
  const date = formatDateTime(status.updatedAt);
  if (status.phase === "succeeded") {
    return (
      <p role="status" className="flex flex-wrap items-center gap-2 text-sm">
        <CheckCircle2 className="h-4 w-4 shrink-0 text-success" aria-hidden />
        <span>Mise à jour réussie le <span className="font-medium">{date}</span></span>
        {status.target !== null && <ShortSha sha={status.target} />}
      </p>
    );
  }
  if (status.phase === "refused") {
    return (
      <div role="status" className="space-y-2 text-sm">
        <p className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 shrink-0 text-warning" aria-hidden />
          <span>Mise à jour reportée le {date} : des tâches étaient actives.</span>
        </p>
        <p className="text-muted-foreground">Le serveur n’a pas été arrêté. Terminez les tâches, puis réessayez.</p>
      </div>
    );
  }
  if (status.phase === "failed" || status.phase === "interrupted") {
    return (
      <div role="status" className="space-y-2 rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm">
        <p className="flex items-center gap-2 font-medium text-destructive">
          <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden />
          {status.phase === "failed" ? "Échec" : "Interruption"} le {date} : intervention requise
        </p>
        <p className="text-muted-foreground">Le retour arrière restaure le code, jamais la base de données. Vérifiez les détails avant toute nouvelle tentative.</p>
        {status.progress && <TechnicalDetails progress={status.progress} />}
      </div>
    );
  }
  return null;
}

export function VpsUpdateDialog({ onClose, target, providers }: { onClose: () => void; target?: string; providers?: ProviderVersions }) {
  const { data: providerUpdates, error: targetError } = useProviderUpdates(target === undefined);
  const confirmedTarget = target ?? providerUpdates?.target?.id;
  const confirmedProviders = providers ?? providerUpdates?.target?.providers;
  const [status, setStatus] = useState<VpsUpdateStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const runningUpdatedAt = useRef<number | null>(null);

  useEffect(() => {
    if (status === null) return;
    if (status.phase === "resolving" || status.phase === "running") {
      runningUpdatedAt.current = status.updatedAt;
      return;
    }
    if (runningUpdatedAt.current === null || status.updatedAt < runningUpdatedAt.current) return;
    runningUpdatedAt.current = null;
    if (status.phase === "succeeded") window.location.reload();
  }, [status]);

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
      if (!confirmedTarget) throw new Error("No checked update target.");
      const result: unknown = await request(UPDATE_PATH, { method: "POST", signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS), headers: { "x-kanban-update": "confirm", "x-kanban-target": confirmedTarget, ...(target ? { "x-kanban-adoption": "confirm" } : {}) } });
      setStatus(vpsUpdateSchema.parse(result));
    } catch {
      setError("La demande n’a pas été confirmée. Consultez l’état avant de réessayer : une coupure peut accompagner le redémarrage.");
    } finally {
      setPending(false);
    }
  }

  const isRunning = status?.phase === "resolving" || status?.phase === "running";
  const isFailure = status?.phase === "failed" || status?.phase === "interrupted";
  const canStart = !!confirmedTarget && (status?.phase === "idle" || status?.phase === "succeeded" || status?.phase === "refused");
  return (
    <Dialog
      open
      onOpenChange={(open) => { if (!open) onClose(); }}
      title="Mise à jour du VPS"
      description="Installe la version confirmée. L’accès est coupé pendant le redémarrage. Cette page se rechargera automatiquement après une mise à jour réussie."
      footer={
        <>
          <Button variant="outline" onClick={onClose}>{isRunning || isFailure || error !== null ? "Fermer" : "Annuler"}</Button>
          {!isRunning && !isFailure && (
            <Button disabled={!canStart || pending || error !== null} onClick={() => { void start(); }}>
              {pending ? "Démarrage…" : "Mettre à jour"}
            </Button>
          )}
        </>
      }
    >
      {confirmedTarget && <p className="text-sm">Version confirmée : <strong className="font-mono">{confirmedTarget}</strong>{confirmedProviders && <> · Claude {confirmedProviders.claude} · Codex {confirmedProviders.codex}</>}</p>}
      {!confirmedTarget && <p role="status" className="text-sm">{targetError ?? providerUpdates?.message ?? "Vérification de la version à installer…"}</p>}
      {status === null && error === null && <p role="status" className="text-sm text-muted-foreground">Chargement de l’état de la mise à jour…</p>}
      {status !== null && (isRunning ? <RunningStatus status={status} reconnecting={error !== null} /> : <FinishedStatus status={status} />)}
      {canStart && (
        <div className="space-y-3">
          <div className="flex items-start gap-2 rounded-md border bg-secondary p-3 text-sm">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" aria-hidden />
            <p>Terminez vos tâches avant de lancer la mise à jour.</p>
          </div>
          <details className="text-xs text-muted-foreground">
            <summary className="cursor-pointer rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">Ce qui peut mal se passer</summary>
            <p className="mt-2">
              La mise à jour est refusée si des tâches sont actives, mais une tâche lancée juste avant l’arrêt peut être interrompue. En cas d’échec, le retour arrière restaure le code, jamais la base de données.
            </p>
          </details>
        </div>
      )}
      {error !== null && <p role="alert" className="text-sm text-destructive">{error}</p>}
    </Dialog>
  );
}
