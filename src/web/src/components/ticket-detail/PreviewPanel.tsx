import { Cloud, ExternalLink, Loader2, RefreshCw, ShieldCheck, Square } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import type { PreviewProjectSettings, PreviewRecord, PreviewSettings } from "@shared/preview";
import type { Ticket } from "@shared/schemas";

import { Button, buttonVariants } from "@/components/ui/button";
import { useBusyAction } from "@/hooks/useBusyAction";
import { errorMessage } from "@/lib/errors";
import { formatDateTime } from "@/lib/display";
import { previewApi } from "@/lib/previewApi";
import { PREVIEW_CLEANUP_LABELS, PREVIEW_CLEANUP_WATCH_LABEL, PREVIEW_POLL_INTERVAL_MS, PREVIEW_REVISION_LABEL_LENGTH, PREVIEW_STATUS_LABELS, previewConnectionReady } from "@/lib/previewDisplay";

const PENDING_PREVIEW_STATUSES: PreviewRecord["status"][] = ["queued", "provisioning", "building", "deploying"];

function newerPreview(current: PreviewRecord | null, incoming: PreviewRecord | null): PreviewRecord | null {
  if (current !== null && incoming !== null && current.id === incoming.id && current.updatedAt > incoming.updatedAt) return current;
  return incoming;
}

export function PreviewPanel({ ticket }: { ticket: Ticket }) {
  const [preview, setPreview] = useState<PreviewRecord | null>(null);
  const [cleanupWatchCount, setCleanupWatchCount] = useState(0);
  const [projectSettings, setProjectSettings] = useState<PreviewProjectSettings | null>(null);
  const [settings, setSettings] = useState<PreviewSettings | null>(null);
  const [provider, setProvider] = useState<"github" | "azureDevops" | null>(null);
  const [loading, setLoading] = useState(true);
  const [readError, setReadError] = useState<string | null>(null);
  const [settingsError, setSettingsError] = useState<string | null>(null);
  const [validationMessage, setValidationMessage] = useState<string | null>(null);
  const requestVersion = useRef(0);
  const { busy, error, run } = useBusyAction();

  useEffect(() => {
    let active = true;
    let polling = false;
    async function poll() {
      if (polling) return;
      polling = true;
      const version = requestVersion.current;
      try {
        const snapshot = await previewApi.ticketPreview(ticket.id);
        if (!active || version !== requestVersion.current) return;
        setPreview((current) => newerPreview(current, snapshot.preview));
        setCleanupWatchCount(snapshot.cleanupWatchCount ?? 0);
        setProjectSettings(snapshot.projectSettings);
        setProvider(snapshot.vcsProvider);
        setReadError(null);
      } catch (cause) {
        if (active && version === requestVersion.current) setReadError(errorMessage(cause, "Impossible de charger la prévisualisation."));
      } finally {
        polling = false;
        if (active) setLoading(false);
      }
    }
    void poll();
    const settingsVersion = requestVersion.current;
    void previewApi.settings().then((result) => { if (active && settingsVersion === requestVersion.current) setSettings(result.settings); }).catch((cause: unknown) => {
      if (active && settingsVersion === requestVersion.current) setSettingsError(errorMessage(cause, "Impossible de charger la connexion Coolify."));
    });
    const interval = window.setInterval(() => void poll(), PREVIEW_POLL_INTERVAL_MS);
    return () => { active = false; window.clearInterval(interval); };
  }, [ticket.id]);

  const supported = provider === "github";
  const eligible = ticket.kind === "feature" && (ticket.column === "done" || ticket.column === "merged") && ticket.prUrl !== null;
  const setupReady = previewConnectionReady(settings);
  const deploying = preview !== null && PENDING_PREVIEW_STATUSES.includes(preview.status);
  const previewCanDeploy = preview === null || (preview.desiredState === "stopped" && preview.cleanupStatus === "complete");
  const canDeploy = eligible && supported && setupReady && projectSettings?.enabled === true && !deploying && preview?.status !== "stopping" && previewCanDeploy;
  const canStop = preview !== null && preview.desiredState !== "stopped";
  const ready = preview?.status === "ready" && preview.desiredState === "running";
  const showWatchCount = cleanupWatchCount > 0 && (preview === null || !preview.cleanupWatch || cleanupWatchCount > 1);

  async function refresh() {
    await run(async () => {
      requestVersion.current += 1;
      const [snapshot, connection] = await Promise.all([previewApi.ticketPreview(ticket.id), previewApi.settings()]);
      requestVersion.current += 1;
      setPreview((current) => newerPreview(current, snapshot.preview));
      setCleanupWatchCount(snapshot.cleanupWatchCount ?? 0);
      setProjectSettings(snapshot.projectSettings);
      setProvider(snapshot.vcsProvider);
      setSettings(connection.settings);
      setReadError(null);
      setSettingsError(null);
    }, "Impossible d'actualiser la prévisualisation.");
  }

  async function deploy() {
    setValidationMessage(null);
    await run(async () => {
      requestVersion.current += 1;
      const result = await previewApi.createPreview(ticket.id);
      requestVersion.current += 1;
      setPreview(result.preview);
    }, "Impossible de créer la prévisualisation.");
  }

  async function stop() {
    if (preview === null) return;
    await run(async () => {
      requestVersion.current += 1;
      const result = await previewApi.stopPreview(preview.id);
      requestVersion.current += 1;
      setPreview(result.preview);
    }, "Impossible de supprimer la prévisualisation.");
  }

  async function cleanup() {
    if (preview === null) return;
    await run(async () => {
      requestVersion.current += 1;
      const result = await previewApi.retryCleanup(preview.id);
      requestVersion.current += 1;
      setPreview(result.preview);
    }, "Impossible de relancer le nettoyage.");
  }

  async function validate(validationProvider: "claude" | "codex") {
    if (preview === null) return;
    setValidationMessage(null);
    await run(async () => {
      await previewApi.validatePreview(preview.id, validationProvider);
      setValidationMessage(`Vérification locale ${validationProvider === "claude" ? "Claude" : "Codex"} lancée. Consultez l'onglet Validation pour les résultats.`);
    }, "Impossible de lancer la vérification locale.");
  }

  return (
    <section className="space-y-3 rounded-lg border border-border bg-muted/20 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 text-sm font-semibold"><Cloud className="size-4 text-primary" />Prévisualisation Coolify</h3>
        <Button variant="ghost" size="sm" aria-label="Actualiser la prévisualisation" disabled={busy} onClick={() => void refresh()}><RefreshCw className="size-3.5" /></Button>
      </div>
      {loading && <p className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin" />Chargement…</p>}
      {(error || readError || settingsError) && <p role="alert" className="rounded-md border border-danger/40 bg-danger/10 p-3 text-sm text-danger">{error || readError || settingsError}</p>}
      {provider === "azureDevops" && <p className="text-sm text-muted-foreground">Azure DevOps n'est pas disponible pour les prévisualisations. Son support est prévu en V2.</p>}
      {!loading && supported && !setupReady && <p className="text-sm text-muted-foreground">Complétez la connexion, les ressources et les identifiants d'accès dans Paramètres · Coolify, puis actualisez ce panneau.</p>}
      {!loading && supported && setupReady && projectSettings?.enabled === false && <p className="text-sm text-muted-foreground">Activez les prévisualisations dans les paramètres de ce projet. « Préparer pour Coolify » crée la carte de préparation de sa recette.</p>}
      {!loading && supported && !eligible && <p className="text-sm text-muted-foreground">La création nécessite une fonctionnalité terminée avec une pull request GitHub associée.</p>}
      {preview !== null && (
        <>
          <div className="flex flex-wrap items-center gap-2 text-sm">
            {(deploying || preview.status === "stopping") && <Loader2 className="size-4 animate-spin text-primary" />}
            <span className={ready ? "font-medium text-primary" : "font-medium"}>{PREVIEW_STATUS_LABELS[preview.status]}</span>
            <span className="text-muted-foreground">·</span>
            <span className="font-mono text-xs">{(preview.deployedRevision ?? preview.revision).slice(0, PREVIEW_REVISION_LABEL_LENGTH)}</span>
            {preview.expiresAt !== null && <span className="text-xs text-muted-foreground">Expire le {formatDateTime(preview.expiresAt)}</span>}
          </div>
          {preview.error && <p role="alert" className="rounded-md border border-danger/40 bg-danger/10 p-3 text-sm text-danger">{preview.error}</p>}
          {ready && preview.url !== null && (
            <div className="space-y-2">
              <a className="block break-all text-sm text-primary hover:underline" href={preview.url} target="_blank" rel="noreferrer">{preview.url}</a>
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground"><ShieldCheck className="size-3.5 shrink-0" />Utilisez les identifiants définis dans Paramètres · Coolify.</p>
            </div>
          )}
          {preview.desiredState === "stopped" && <p role="status" className={preview.cleanupStatus === "failed" ? "text-sm text-danger" : "text-sm text-muted-foreground"}>{preview.cleanupStatus === "complete" && preview.cleanupWatch ? PREVIEW_CLEANUP_WATCH_LABEL : PREVIEW_CLEANUP_LABELS[preview.cleanupStatus]}</p>}
          <div className="flex flex-wrap gap-2">
            {ready && preview.url !== null && <a className={buttonVariants({ size: "sm" })} href={preview.url} target="_blank" rel="noreferrer"><ExternalLink className="size-3.5" />Ouvrir</a>}
            {canDeploy && <Button size="sm" variant="outline" disabled={busy} onClick={() => void deploy()}><RefreshCw className="size-3.5" />Créer une prévisualisation</Button>}
            {canStop && <Button size="sm" variant="destructive" disabled={busy} onClick={() => void stop()}><Square className="size-3.5" />Supprimer la prévisualisation</Button>}
            {preview.desiredState === "stopped" && preview.cleanupStatus === "failed" && <Button size="sm" variant="outline" disabled={busy} onClick={() => void cleanup()}>Réessayer le nettoyage</Button>}
          </div>
          {ready && <p className="text-xs text-muted-foreground">Pour déployer le dernier commit, supprimez cette prévisualisation puis recréez-la après la fin du nettoyage.</p>}
          {ready && (
            <div className="space-y-2 border-t border-border pt-3">
              <p className="text-xs text-muted-foreground">Lancez une vérification depuis votre machine sur cette prévisualisation.</p>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" disabled={busy} onClick={() => void validate("claude")}>Vérifier avec Claude</Button>
                <Button variant="outline" size="sm" disabled={busy} onClick={() => void validate("codex")}>Vérifier avec Codex</Button>
              </div>
              {preview.qualityRunId !== null && <p className="text-xs text-muted-foreground">Une vérification est associée à cette prévisualisation. Résultats dans l'onglet Validation.</p>}
              {validationMessage && <p role="status" className="text-sm text-primary">{validationMessage}</p>}
            </div>
          )}
        </>
      )}
      {showWatchCount && <p role="status" className="text-xs text-muted-foreground">{cleanupWatchCount === 1 ? "Un arrêt reste surveillé." : `${cleanupWatchCount} arrêts restent surveillés.`}</p>}
      {!loading && preview === null && supported && (
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">Déployez le dernier commit de la pull request pour essayer cette fonctionnalité. La suppression reste disponible pendant la construction.</p>
          <Button size="sm" disabled={busy || !canDeploy} onClick={() => void deploy()}>{busy && <Loader2 className="size-3.5 animate-spin" />}Créer une prévisualisation</Button>
        </div>
      )}
    </section>
  );
}
