import { Cloud, ExternalLink, Loader2, RefreshCw, Square } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import type { PreviewRecord } from "@shared/preview";
import type { ProjectInfo } from "@shared/schemas";

import { BranchPreviewForm } from "@/components/BranchPreviewForm";
import { Button, buttonVariants } from "@/components/ui/button";
import { useBusyAction } from "@/hooks/useBusyAction";
import { formatDateTime } from "@/lib/display";
import { errorMessage } from "@/lib/errors";
import { previewApi } from "@/lib/previewApi";
import { PREVIEW_CLEANUP_LABELS, PREVIEW_CLEANUP_WATCH_LABEL, PREVIEW_POLL_INTERVAL_MS, PREVIEW_REVISION_LABEL_LENGTH, PREVIEW_STATUS_LABELS } from "@/lib/previewDisplay";
import { matchesQuery, normalizeSearch } from "@/lib/search";
import { boardStore } from "@/lib/store";

function PreviewRow({ preview, projectLabel, onAction }: { preview: PreviewRecord; projectLabel: string; onAction: (preview: PreviewRecord, action: "stop" | "cleanup" | "redeploy") => Promise<void> }) {
  const { busy, error, run } = useBusyAction();
  const ready = preview.status === "ready" && preview.desiredState === "running";
  const canRedeploy = preview.ticketId === null && preview.desiredState === "stopped" && preview.cleanupStatus === "complete";
  const ticketId = preview.ticketId;

  return <article className="space-y-3 rounded-md border bg-card p-4">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="min-w-0 space-y-1">
        <h3 className="flex items-center gap-2 text-sm font-medium"><Cloud className="size-4 shrink-0 text-muted-foreground" /><span className="break-all font-mono">{preview.branch}</span></h3>
        <p className="text-xs text-muted-foreground">{projectLabel} · {ticketId === null ? "Branche indépendante" : "Prévisualisation de ticket"} · commit <span className="font-mono">{(preview.deployedRevision ?? preview.revision).slice(0, PREVIEW_REVISION_LABEL_LENGTH)}</span></p>
        {preview.expiresAt !== null && <p className="text-xs text-muted-foreground">Expire le {formatDateTime(preview.expiresAt)}</p>}
      </div>
      <span className={ready ? "text-sm font-medium text-primary" : "text-sm font-medium"}>{PREVIEW_STATUS_LABELS[preview.status]}</span>
    </div>
    {preview.url !== null && <a href={preview.url} target="_blank" rel="noreferrer" className="block break-all text-sm text-primary hover:underline">{preview.url}</a>}
    {(preview.error || error) && <p role="alert" className="break-words text-sm text-danger">{error || preview.error}</p>}
    {preview.desiredState === "stopped" && <p role="status" className={preview.cleanupStatus === "failed" ? "text-sm text-danger" : "text-xs text-muted-foreground"}>{preview.cleanupStatus === "complete" && preview.cleanupWatch ? PREVIEW_CLEANUP_WATCH_LABEL : PREVIEW_CLEANUP_LABELS[preview.cleanupStatus]}</p>}
    <div className="flex flex-wrap gap-2">
      {ready && preview.url !== null && <a className={buttonVariants({ size: "sm" })} href={preview.url} target="_blank" rel="noreferrer"><ExternalLink className="size-3.5" />Ouvrir</a>}
      {ticketId !== null && <Button variant="outline" size="sm" onClick={() => boardStore.openTicket(ticketId)}>Ouvrir le ticket</Button>}
      {preview.desiredState === "running" && <Button variant="destructive" size="sm" disabled={busy} onClick={() => void run(() => onAction(preview, "stop"), "Impossible de supprimer la prévisualisation.")}>{busy ? <Loader2 className="size-3.5 animate-spin" /> : <Square className="size-3.5" />}Supprimer la prévisualisation</Button>}
      {preview.desiredState === "stopped" && preview.cleanupStatus === "failed" && <Button variant="outline" size="sm" disabled={busy} onClick={() => void run(() => onAction(preview, "cleanup"), "Impossible de relancer le nettoyage.")}>Réessayer le nettoyage</Button>}
      {canRedeploy && <Button variant="outline" size="sm" disabled={busy} onClick={() => void run(() => onAction(preview, "redeploy"), "Impossible de relancer la prévisualisation.")}><RefreshCw className="size-3.5" />Relancer le dernier commit distant</Button>}
    </div>
  </article>;
}

export function PreviewsView({ projects, projectFilter, searchQuery }: { projects: ProjectInfo[]; projectFilter: string; searchQuery: string }) {
  const [previews, setPreviews] = useState<PreviewRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [readError, setReadError] = useState<string | null>(null);
  const requestVersion = useRef(0);
  const { busy, error, run } = useBusyAction();

  function accept(preview: PreviewRecord) {
    requestVersion.current += 1;
    setPreviews((current) => [preview, ...current.filter((candidate) => candidate.id !== preview.id)]);
  }

  useEffect(() => {
    let active = true;
    let polling = false;
    async function poll() {
      if (polling) return;
      polling = true;
      const version = requestVersion.current;
      try {
        const result = await previewApi.list();
        if (active && version === requestVersion.current) {
          setPreviews((current) => result.previews.map((incoming) => {
            const previous = current.find((preview) => preview.id === incoming.id);
            return previous !== undefined && previous.updatedAt > incoming.updatedAt ? previous : incoming;
          }));
          setReadError(null);
        }
      } catch (cause) {
        if (active && version === requestVersion.current) setReadError(errorMessage(cause, "Impossible de charger les prévisualisations."));
      } finally {
        polling = false;
        if (active) setLoading(false);
      }
    }
    void poll();
    const interval = window.setInterval(() => void poll(), PREVIEW_POLL_INTERVAL_MS);
    return () => { active = false; window.clearInterval(interval); };
  }, []);

  async function refresh() {
    await run(async () => {
      const version = ++requestVersion.current;
      const result = await previewApi.list();
      if (version !== requestVersion.current) return;
      requestVersion.current += 1;
      setPreviews(result.previews);
      setReadError(null);
      setLoading(false);
    }, "Impossible d'actualiser les prévisualisations.");
  }

  async function act(preview: PreviewRecord, action: "stop" | "cleanup" | "redeploy") {
    requestVersion.current += 1;
    if (action === "stop") accept((await previewApi.stopPreview(preview.id)).preview);
    else if (action === "cleanup") accept((await previewApi.retryCleanup(preview.id)).preview);
    else accept((await previewApi.redeployPreview(preview.id)).preview);
  }

  const query = normalizeSearch(searchQuery);
  const visiblePreviews = previews.filter((preview) => (projectFilter === "all" || preview.project === projectFilter) &&
    matchesQuery(query, preview.branch, preview.project, projects.find((project) => project.key === preview.project)?.label ?? "", PREVIEW_STATUS_LABELS[preview.status]));

  return <div className="flex flex-col gap-4">
    <BranchPreviewForm projects={projects} projectFilter={projectFilter} onCreated={accept} />
    <div className="flex items-center justify-between gap-3">
      <h2 className="text-sm font-semibold">Prévisualisations · {visiblePreviews.length}</h2>
      <Button variant="outline" size="sm" disabled={busy} onClick={() => void refresh()}><RefreshCw className="size-3.5" />Actualiser la liste</Button>
    </div>
    {(error || readError) && <p role="alert" className="text-sm text-danger">{error || readError}</p>}
    {loading && <p className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin" />Chargement des prévisualisations…</p>}
    {!loading && visiblePreviews.length === 0 && <p className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">Aucune prévisualisation pour cette sélection.</p>}
    {visiblePreviews.map((preview) => <PreviewRow key={preview.id} preview={preview} projectLabel={projects.find((project) => project.key === preview.project)?.label ?? preview.project} onAction={act} />)}
  </div>;
}
