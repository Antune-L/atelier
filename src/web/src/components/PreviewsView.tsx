import { ChevronLeft, ChevronRight, Cloud, ExternalLink, GitBranch, Loader2, MoreHorizontal, Plus, RefreshCw, Square } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import type { PreviewRecord } from "@shared/preview";
import type { ProjectInfo } from "@shared/schemas";

import { BranchPreviewForm } from "@/components/BranchPreviewForm";
import { Badge } from "@/components/ui/badge";
import type { BadgeVariant } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Sheet } from "@/components/ui/sheet";
import { useBusyAction } from "@/hooks/useBusyAction";
import { formatDateTime } from "@/lib/display";
import { errorMessage } from "@/lib/errors";
import { previewApi } from "@/lib/previewApi";
import { PREVIEW_CLEANUP_LABELS, PREVIEW_CLEANUP_WATCH_LABEL, PREVIEW_HISTORY_LIMIT, PREVIEW_POLL_INTERVAL_MS, PREVIEW_REVISION_LABEL_LENGTH, PREVIEW_STATUS_LABELS, sortPreviewHistory } from "@/lib/previewDisplay";
import { matchesQuery, normalizeSearch } from "@/lib/search";
import { boardStore } from "@/lib/store";

const PREVIEW_STATUS_VARIANTS: Record<PreviewRecord["status"], BadgeVariant> = {
  queued: "secondary",
  provisioning: "info",
  building: "info",
  deploying: "info",
  ready: "success",
  stopping: "warning",
  stopped: "secondary",
  failed: "danger",
  interrupted: "warning",
};

type PreviewFilter = "all" | "active" | "attention" | "stopped";
const PREVIEW_FILTERS: { key: PreviewFilter; label: string }[] = [
  { key: "all", label: "Toutes" },
  { key: "active", label: "Actives" },
  { key: "attention", label: "À vérifier" },
  { key: "stopped", label: "Arrêt demandé" },
];

function matchesPreviewFilter(preview: PreviewRecord, filter: PreviewFilter): boolean {
  const needsAttention = preview.status === "failed" || preview.status === "interrupted" || preview.cleanupStatus === "failed" || Boolean(preview.error);
  if (filter === "active") return preview.desiredState === "running" && !needsAttention;
  if (filter === "attention") return needsAttention;
  if (filter === "stopped") return preview.desiredState === "stopped";
  return true;
}

function PreviewStatus({ preview }: { preview: PreviewRecord }) {
  return <Badge variant={PREVIEW_STATUS_VARIANTS[preview.status]} className="whitespace-nowrap">{PREVIEW_STATUS_LABELS[preview.status]}</Badge>;
}

function PreviewDetails({ preview, projectLabel, onAction, onOpenTicket }: { preview: PreviewRecord; projectLabel: string; onOpenTicket: (ticketId: string) => void; onAction: (preview: PreviewRecord, action: "stop" | "cleanup" | "redeploy") => Promise<void> }) {
  const { busy, error, run } = useBusyAction();
  const ready = preview.status === "ready" && preview.desiredState === "running";
  const canRedeploy = preview.ticketId === null && preview.desiredState === "stopped" && preview.cleanupStatus === "complete";
  const ticketId = preview.ticketId;

  return <article className="w-full space-y-5 overflow-y-auto p-4">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="min-w-0 space-y-1">
        <h3 className="flex items-center gap-2 text-sm font-medium"><Cloud className="size-4 shrink-0 text-muted-foreground" /><span className="break-all font-mono">{preview.branch}</span></h3>
        <p className="text-xs text-muted-foreground">{projectLabel} · {ticketId === null ? "Branche indépendante" : "Prévisualisation de ticket"} · commit <span className="font-mono">{(preview.deployedRevision ?? preview.revision).slice(0, PREVIEW_REVISION_LABEL_LENGTH)}</span></p>
        {preview.expiresAt !== null && <p className="text-xs text-muted-foreground">Expire le {formatDateTime(preview.expiresAt)}</p>}
      </div>
      <PreviewStatus preview={preview} />
    </div>
    <dl className="space-y-3 text-sm">
      <div><dt className="text-xs text-muted-foreground">Création</dt><dd>{formatDateTime(preview.createdAt)}</dd></div>
      <div><dt className="text-xs text-muted-foreground">Dernière mise à jour</dt><dd>{formatDateTime(preview.updatedAt)}</dd></div>
      <div><dt className="text-xs text-muted-foreground">Version déployée</dt><dd className="break-all font-mono">{preview.deployedRevision ?? preview.revision}</dd></div>
    </dl>
    {preview.url !== null && <a href={preview.url} target="_blank" rel="noreferrer" className="block break-all text-sm text-primary hover:underline">{preview.url}</a>}
    {(preview.error || error) && <p role="alert" className="break-words text-sm text-danger">{error || preview.error}</p>}
    {preview.desiredState === "stopped" && <p role="status" className={preview.cleanupStatus === "failed" ? "text-sm text-danger" : "text-xs text-muted-foreground"}>{preview.cleanupStatus === "complete" && preview.cleanupWatch ? PREVIEW_CLEANUP_WATCH_LABEL : PREVIEW_CLEANUP_LABELS[preview.cleanupStatus]}</p>}
    <div className="flex flex-wrap gap-2">
      {ready && preview.url !== null && <a className={buttonVariants({ size: "sm" })} href={preview.url} target="_blank" rel="noreferrer"><ExternalLink className="size-3.5" />Ouvrir</a>}
      {ticketId !== null && <Button variant="outline" size="sm" onClick={() => onOpenTicket(ticketId)}>Ouvrir le ticket</Button>}
      {preview.desiredState === "running" && <Button variant="destructive" size="sm" disabled={busy} onClick={() => void run(() => onAction(preview, "stop"), "Impossible de supprimer la prévisualisation.")}>{busy ? <Loader2 className="size-3.5 animate-spin" /> : <Square className="size-3.5" />}Supprimer la prévisualisation</Button>}
      {preview.desiredState === "stopped" && preview.cleanupStatus === "failed" && <Button variant="outline" size="sm" disabled={busy} onClick={() => void run(() => onAction(preview, "cleanup"), "Impossible de relancer le nettoyage.")}>Réessayer le nettoyage</Button>}
      {canRedeploy && <Button variant="outline" size="sm" disabled={busy} onClick={() => void run(() => onAction(preview, "redeploy"), "Impossible de relancer la prévisualisation.")}><RefreshCw className="size-3.5" />Relancer le dernier commit distant</Button>}
    </div>
  </article>;
}

export function PreviewsView({ projects, projectFilter, searchQuery }: { projects: ProjectInfo[]; projectFilter: string; searchQuery: string }) {
  const [previews, setPreviews] = useState<PreviewRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<PreviewFilter>("all");
  const [pagination, setPagination] = useState({ filterKey: "", page: 0 });
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
    matchesPreviewFilter(preview, statusFilter) && matchesQuery(query, preview.branch, preview.project, projects.find((project) => project.key === preview.project)?.label ?? "", PREVIEW_STATUS_LABELS[preview.status]));
  const sortedPreviews = sortPreviewHistory(visiblePreviews);
  const filterKey = JSON.stringify([projectFilter, query, statusFilter]);
  const pageCount = Math.max(1, Math.ceil(sortedPreviews.length / PREVIEW_HISTORY_LIMIT));
  const page = pagination.filterKey === filterKey ? Math.min(pagination.page, pageCount - 1) : 0;
  const pageStart = page * PREVIEW_HISTORY_LIMIT;
  const displayedPreviews = sortedPreviews.slice(pageStart, pageStart + PREVIEW_HISTORY_LIMIT);
  const selectedPreview = previews.find((preview) => preview.id === selectedId);

  return <div className="flex min-w-0 flex-col gap-4">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="space-y-1">
        <h2 className="text-sm font-semibold">Prévisualisations <span className="font-normal text-muted-foreground">· {visiblePreviews.length}</span></h2>
        <p className="text-xs text-muted-foreground">Toutes les branches, l’essentiel en un regard.</p>
      </div>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" disabled={busy} onClick={() => void refresh()}><RefreshCw className="size-3.5" /><span className="hidden sm:inline">Actualiser la liste</span><span className="sr-only sm:hidden">Actualiser la liste</span></Button>
        <Button size="sm" onClick={() => setCreating(true)}><Plus className="size-3.5" />Nouvelle prévisualisation</Button>
      </div>
    </div>
    <div className="flex flex-wrap gap-1" role="group" aria-label="Filtrer les prévisualisations par état">
      {PREVIEW_FILTERS.map((filter) => <Button key={filter.key} size="sm" variant={statusFilter === filter.key ? "secondary" : "ghost"} aria-pressed={statusFilter === filter.key} onClick={() => setStatusFilter(filter.key)}>{filter.label}</Button>)}
    </div>
    {(error || readError) && <p role="alert" className="text-sm text-danger">{error || readError}</p>}
    {loading && <p className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin" />Chargement des prévisualisations…</p>}
    {!loading && visiblePreviews.length === 0 && <p className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">Aucune prévisualisation pour cette sélection.</p>}
    {displayedPreviews.length > 0 && <div className="overflow-hidden rounded-lg border bg-card">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <caption className="sr-only">Prévisualisations de branches et de tickets</caption>
          <thead className="border-b bg-muted/40 text-xs text-muted-foreground">
            <tr><th scope="col" className="px-4 py-3 font-medium">Branche / travail</th><th scope="col" className="hidden px-4 py-3 font-medium md:table-cell">Projet</th><th scope="col" className="hidden px-4 py-3 font-medium sm:table-cell">État</th><th scope="col" className="hidden px-4 py-3 font-medium lg:table-cell">Expiration</th><th scope="col" className="px-4 py-3 text-right font-medium">Actions</th></tr>
          </thead>
          <tbody className="divide-y">
            {displayedPreviews.map((preview) => {
              const projectLabel = projects.find((project) => project.key === preview.project)?.label ?? preview.project;
              const ready = preview.status === "ready" && preview.desiredState === "running" && preview.url !== null;
              return <tr key={preview.id} className="hover:bg-muted/30">
                <td className="w-3/4 px-4 py-3 sm:w-auto sm:max-w-0">
                  <button type="button" className="flex max-w-full items-start gap-2 rounded-sm text-left font-medium sm:items-center hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" onClick={() => setSelectedId(preview.id)} aria-label={`Détails de ${preview.branch}`}><GitBranch className="size-3.5 shrink-0 text-muted-foreground" /><span className="min-w-0 break-all font-mono sm:truncate" title={preview.branch}>{preview.branch}</span></button>
                  <p className="mt-1 truncate text-xs text-muted-foreground"><span className="md:hidden">{projectLabel} · </span>{preview.ticketId === null ? "Branche indépendante" : `Ticket · ${preview.ticketId}`}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-2 sm:hidden"><PreviewStatus preview={preview} />{(preview.error || preview.cleanupStatus === "failed") && <span className="text-xs text-danger">Diagnostic disponible</span>}</div>
                  <p className="mt-1 text-xs text-muted-foreground lg:hidden">{preview.expiresAt === null ? "Expiration non définie" : `Expire le ${formatDateTime(preview.expiresAt)}`}</p>
                </td>
                <td className="hidden max-w-48 truncate px-4 py-3 text-muted-foreground md:table-cell" title={projectLabel}>{projectLabel}</td>
                <td className="hidden px-4 py-3 sm:table-cell"><PreviewStatus preview={preview} />{(preview.error || preview.cleanupStatus === "failed") && <p className="mt-1 text-xs text-danger">Diagnostic disponible</p>}</td>
                <td className="hidden whitespace-nowrap px-4 py-3 text-xs text-muted-foreground lg:table-cell">{preview.expiresAt === null ? "Non définie" : formatDateTime(preview.expiresAt)}</td>
                <td className="px-4 py-3"><div className="flex items-center justify-end gap-1">
                  {ready && preview.url !== null && <a className={buttonVariants({ size: "sm", variant: "outline" })} href={preview.url} target="_blank" rel="noreferrer" aria-label={`Ouvrir ${preview.branch}`}><ExternalLink className="size-3.5" /><span className="hidden sm:inline">Ouvrir</span></a>}
                  <Button variant="ghost" size="sm" className="px-2" onClick={() => setSelectedId(preview.id)} aria-label={`Détails de ${preview.branch}`} title="Détails"><MoreHorizontal className="size-4" /></Button>
                </div></td>
              </tr>;
            })}
          </tbody>
        </table>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 border-t px-4 py-3 text-xs text-muted-foreground">
        <p>{pageStart + 1}–{pageStart + displayedPreviews.length} sur {visiblePreviews.length} prévisualisations</p>
        <nav className="flex items-center gap-2" aria-label="Pagination des prévisualisations">
          <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPagination({ filterKey, page: page - 1 })}><ChevronLeft className="size-3.5" /><span className="hidden sm:inline">Précédent</span><span className="sr-only sm:hidden">Précédent</span></Button>
          <span aria-live="polite">{page + 1} / {pageCount}</span>
          <Button variant="outline" size="sm" disabled={page === pageCount - 1} onClick={() => setPagination({ filterKey, page: page + 1 })}><span className="hidden sm:inline">Suivant</span><span className="sr-only sm:hidden">Suivant</span><ChevronRight className="size-3.5" /></Button>
        </nav>
      </div>
    </div>}
    <Dialog open={creating} onOpenChange={setCreating} title="Nouvelle prévisualisation" description="Choisissez le projet et la branche à déployer." size="lg">
      <BranchPreviewForm projects={projects} projectFilter={projectFilter} onCreated={(preview) => { accept(preview); setCreating(false); }} onOpenTicket={(ticketId) => { setCreating(false); boardStore.openTicket(ticketId); }} />
    </Dialog>
    <Sheet open={selectedPreview !== undefined} onOpenChange={(open) => { if (!open) setSelectedId(null); }} title="Détails de la prévisualisation" size="md">
      {selectedPreview !== undefined && <PreviewDetails key={selectedPreview.id} preview={selectedPreview} projectLabel={projects.find((project) => project.key === selectedPreview.project)?.label ?? selectedPreview.project} onAction={act} onOpenTicket={(ticketId) => { setSelectedId(null); boardStore.openTicket(ticketId); }} />}
    </Sheet>
  </div>;
}
