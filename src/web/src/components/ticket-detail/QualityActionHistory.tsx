import { useRef, useState } from "react";

import { ORCHESTRATOR_LABELS } from "@shared/constants";
import type { QualityAction, QualityActionPage, QualityRequest, QualityRequestPage } from "@shared/quality";

import { Dialog } from "@/components/ui/dialog";
import { api, qualityActionArtifactUrl } from "@/lib/api";
import { formatDateTime } from "@/lib/display";
import { formatQualityMessage, qualityErrorMessage, QUALITY_ACTION_LABELS, QUALITY_ACTION_KIND_LABELS, QUALITY_ORIGIN_LABELS, QUALITY_REQUEST_LABELS } from "@/lib/qualityMessages";

const IMAGE_EXTENSION = /\.(png|jpe?g|webp|gif)$/i;

type ActionOwner = { requestId: string } | { runId: string };

function ActionArtifact({ ticketId, action, index }: { ticketId: string; action: QualityAction; index: number }) {
  const [open, setOpen] = useState(false);
  const [unavailable, setUnavailable] = useState(false);
  const path = action.artifactPaths[index];
  if (path === undefined) return null;
  const url = qualityActionArtifactUrl(ticketId, action.id, index);
  return <>
    <button type="button" className="text-info underline" onClick={() => setOpen(true)}>Voir la pièce jointe {index + 1}</button>
    {open && <Dialog open onOpenChange={setOpen} size="lg" title="Pièce jointe de l’action" description={formatDateTime(action.createdAt)}>
      <p className="text-xs">{formatQualityMessage(action.summary)}</p>
      <a href={url} target="_blank" rel="noopener noreferrer" className="text-xs text-info underline">Ouvrir la pièce jointe</a>
      {IMAGE_EXTENSION.test(path) && !unavailable && <img src={url} alt="Capture enregistrée pendant cette action" className="max-h-96 w-full object-contain" onError={() => setUnavailable(true)} />}
      {unavailable && <p role="status" className="text-xs text-warning">Capture absente ou inaccessible. Le résultat enregistré est conservé.</p>}
    </Dialog>}
  </>;
}

export function QualityActionHistory({ ticketId, owner, criterionId }: { ticketId: string; owner: ActionOwner; criterionId?: string }) {
  const [page, setPage] = useState<QualityActionPage | null>(null);
  const [actions, setActions] = useState<QualityAction[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const pending = useRef(false);
  const load = async (afterSequence?: number): Promise<void> => {
    if (pending.current) return;
    pending.current = true;
    setLoading(true);
    setError(null);
    try {
      const result = await api.qualityActions(ticketId, owner, afterSequence);
      setPage(result);
      setActions((previous) => afterSequence === undefined ? result.actions : [...previous, ...result.actions]);
    } catch (failure) {
      setError(qualityErrorMessage(failure));
    } finally {
      pending.current = false;
      setLoading(false);
    }
  };
  const nextSequence = page?.nextSequence;
  const referencedIds = new Set(actions.filter((action) => action.criterionId === criterionId).flatMap((action) => action.actionIds));
  const visible = actions.filter((action) => criterionId === undefined || action.criterionId === criterionId || referencedIds.has(action.actionId));
  return <details className="rounded border border-border" onToggle={(event) => { if (event.currentTarget.open && page === null) void load(); }}>
    <summary className="cursor-pointer px-3 py-2 text-xs">{criterionId === undefined ? "Journal des actions" : `Actions du scénario ${criterionId}`}</summary>
    <div className="space-y-3 border-t border-border p-3 text-xs">
      <p className="text-2xs text-muted-foreground">Chaque ligne conserve le début ou le résultat d’une action. Un refus d’outil ne détermine pas le verdict du test.</p>
      {visible.map((action) => <div key={action.id} className="space-y-1 break-words border-l border-border pl-3">
        <p>{QUALITY_ACTION_LABELS[action.status]} · {action.toolName ?? QUALITY_ACTION_KIND_LABELS[action.kind]} · {action.provider ? ORCHESTRATOR_LABELS[action.provider] : "Serveur"}</p>
        <p className="text-2xs text-muted-foreground">{formatDateTime(action.createdAt)} · événement {action.sequence}</p>
        <p>{formatQualityMessage(action.summary)}</p>
        {action.truncated && <p className="text-warning">Détail tronqué lors de la capture.</p>}
        {action.criterionId && <p className="text-2xs text-muted-foreground">Scénario {action.criterionId}</p>}
        {action.actionIds.length > 0 && <p className="break-all text-2xs text-muted-foreground">Actions associées : {action.actionIds.join(", ")}</p>}
        <p className="break-all font-mono text-2xs text-muted-foreground">Action {action.actionId}</p>
        <div className="flex flex-wrap gap-3">{action.artifactPaths.map((path, index) => <ActionArtifact key={`${path}-${index}`} ticketId={ticketId} action={action} index={index} />)}</div>
      </div>)}
      {page !== null && visible.length === 0 && <p className="text-muted-foreground">Aucune action rattachée dans les pages chargées. Pour une ancienne exécution, l’historique peut ne pas avoir été capturé.</p>}
      {error && <p role="alert" className="text-danger">{error}</p>}
      {loading && <p role="status">Chargement…</p>}
      <div className="flex flex-wrap gap-3"><button type="button" disabled={loading} className="text-info underline disabled:opacity-50" onClick={() => void load()}>Actualiser le journal</button>{nextSequence !== null && nextSequence !== undefined && <button type="button" disabled={loading} className="text-info underline disabled:opacity-50" onClick={() => void load(nextSequence)}>Charger la suite</button>}</div>
    </div>
  </details>;
}

export function QualityRequestHistory({ ticketId }: { ticketId: string }) {
  const [cursor, setCursor] = useState<QualityRequestPage["nextCursor"]>(null);
  const [requests, setRequests] = useState<QualityRequest[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const pending = useRef(false);
  const load = async (nextCursor?: NonNullable<QualityRequestPage["nextCursor"]>): Promise<void> => {
    if (pending.current) return;
    pending.current = true;
    setError(null);
    try {
      const result = await api.qualityRequests(ticketId, nextCursor);
      setCursor(result.nextCursor);
      setRequests((previous) => nextCursor === undefined ? result.requests : [...previous ?? [], ...result.requests]);
    } catch (failure) {
      setError(qualityErrorMessage(failure));
    } finally {
      pending.current = false;
    }
  };
  return <details className="rounded border border-border" onToggle={(event) => { if (event.currentTarget.open && requests === null) void load(); }}>
    <summary className="cursor-pointer px-3 py-2 text-xs">Demandes de vérification et refus</summary>
    <div className="space-y-3 border-t border-border p-3 text-xs">
      {requests?.map((request) => <div key={request.requestId} className="space-y-2 rounded border border-border p-3">
        <p className="font-medium">{QUALITY_ORIGIN_LABELS[request.origin]} · {QUALITY_REQUEST_LABELS[request.status]}</p>
        <p className="text-muted-foreground">{formatDateTime(request.createdAt)} · {request.provider ? ORCHESTRATOR_LABELS[request.provider] : "Serveur"}{request.completedAt !== null && ` · fin ${formatDateTime(request.completedAt)}`}</p>
        {request.deadlineAt !== null && <p className="text-muted-foreground">Limite totale, nettoyage inclus : {formatDateTime(request.deadlineAt)}</p>}
        {request.revision && <p className="break-all text-muted-foreground">Version du code (SHA) : {request.revision}</p>}
        {request.previewId && <p className="break-all text-muted-foreground">Prévisualisation {request.previewId}</p>}
        {request.reason && <p className="text-warning">{formatQualityMessage(request.reason)}</p>}
        {request.runId === null && <p className="text-muted-foreground">Aucune exécution démarrée pour cette demande.</p>}
        {(request.historyCompleteness === "partial" || request.truncated) && <p className="text-warning">Historique partiel{request.truncated ? " : limite de capture atteinte." : ". Certaines actions peuvent manquer."}</p>}
        <QualityActionHistory ticketId={ticketId} owner={{ requestId: request.requestId }} />
      </div>)}
      {requests?.length === 0 && <p className="text-muted-foreground">Aucune demande enregistrée. L’historique des anciennes exécutions n’a pas été capturé.</p>}
      {error && <p role="alert" className="text-danger">{error}</p>}
      <button type="button" className="text-info underline" onClick={() => void load()}>Actualiser les demandes</button>
      {cursor !== null && <button type="button" className="ml-3 text-info underline" onClick={() => void load(cursor)}>Charger les demandes précédentes</button>}
    </div>
  </details>;
}
