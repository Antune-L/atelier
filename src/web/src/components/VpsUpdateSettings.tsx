import { useEffect, useState } from "react";

import { vpsUpdateSchema } from "@shared/vpsUpdate";
import type { VpsUpdateStatus } from "@shared/vpsUpdate";

import { Button } from "@/components/ui/button";
import { SectionHeader } from "@/components/ui/settings";
import { request } from "@/lib/api";

const REFRESH_MS = 3_000;
const REQUEST_TIMEOUT_MS = 15_000;
const UPDATE_PATH = "/api/vps-update";
const PHASE_LABELS: Record<VpsUpdateStatus["phase"], string> = {
  idle: "Prêt", resolving: "Recherche de la version", running: "Mise à jour en cours",
  succeeded: "Mise à jour terminée", failed: "Échec ou refus : intervention requise", interrupted: "Mise à jour interrompue : intervention requise",
};

export function VpsUpdateSettings() {
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
  const canStart = status?.phase === "idle" || status?.phase === "succeeded";
  return (
    <section className="space-y-3 rounded-md border p-4">
      <SectionHeader title="Mise à jour du VPS" subtitle="Installe la version actuelle de main et vérifie le redémarrage du serveur." />
      <p className="text-sm">Terminez les cartes, validations et aperçus avant de continuer. Ne lancez aucun travail pendant la mise à jour. L’accès sera brièvement coupé ; le suivi reprendra automatiquement.</p>
      <p className="text-xs text-muted-foreground">Le serveur refuse une mise à jour si du travail est actif. Une courte course avant l’arrêt reste possible. En cas d’échec, le retour arrière restaure le code, jamais la base de données.</p>
      {status !== null && <div role="status" className="space-y-1 text-sm">
        <p>{PHASE_LABELS[status.phase]}</p>
        <p>{status.progress}</p>
        {status.target !== null && <p className="break-all font-mono text-xs">Version cible : {status.target}</p>}
      </div>}
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={confirmed} disabled={!canStart || pending} onChange={(event) => setConfirmed(event.target.checked)} />
        J’ai terminé le travail en cours et j’accepte le redémarrage.
      </label>
      <Button disabled={!canStart || !confirmed || pending || error !== null} onClick={() => { void start(); }}>Mettre à jour le VPS</Button>
      {error !== null && <p role="alert" className="text-sm text-destructive">{error}</p>}
    </section>
  );
}
