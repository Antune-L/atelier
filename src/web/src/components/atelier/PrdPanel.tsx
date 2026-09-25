import { ArrowLeft, ArrowRight, Check, Copy, Download, RefreshCw, RotateCcw } from "lucide-react";
import { useRef, useState } from "react";

import type { Conversation, PrdAnnotation, PrdDocumentRecord } from "@shared/schemas";
import { renderPrdMarkdown } from "@shared/prdMarkdown";

import { LiveDot } from "@/components/atelier/LiveDot";
import { PrdAnnotator } from "@/components/PrdAnnotator";
import { SectionHeader } from "@/components/ticket-detail/SectionHeader";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { useBusyAction } from "@/hooks/useBusyAction";
import { api, atelierPrdExportUrl } from "@/lib/api";
import { errorMessage } from "@/lib/errors";
import { boardStore } from "@/lib/store";
import { cn } from "@/lib/utils";

interface PrdPanelProps {
  conversation: Conversation;
  prd: PrdDocumentRecord;
  prds: PrdDocumentRecord[];
  onSelectPrd: (prdId: string) => void;
  onApplyPrd: (prd: PrdDocumentRecord) => void;
  onBackToConversation: () => void;
  onCreateCards: () => void;
}

interface FeedbackDraft {
  prdId: string;
  annotations: PrdAnnotation[];
  generalNote: string;
}

const SAVE_DEBOUNCE_MS = 400;
const JSON_INDENT = 2;
const EXPORT_LINK_CLASSES = buttonVariants({ variant: "outline", size: "sm" });

function draftOf(prd: PrdDocumentRecord): FeedbackDraft {
  return { prdId: prd.id, annotations: prd.annotations, generalNote: prd.generalNote };
}

/** Step 2 of the Atelier: review a PRD revision, annotate it, regenerate, validate and export. */
export function PrdPanel({
  conversation,
  prd,
  prds,
  onSelectPrd,
  onApplyPrd,
  onBackToConversation,
  onCreateCards,
}: PrdPanelProps) {
  const [draft, setDraft] = useState<FeedbackDraft>(() => draftOf(prd));
  const { busy, error, setError, run } = useBusyAction();
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const persist = async (next: FeedbackDraft): Promise<void> => {
    const updated = await api.atelierUpdatePrd(next.prdId, {
      annotations: next.annotations,
      generalNote: next.generalNote,
    });
    onApplyPrd(updated);
  };

  const cancelPendingSave = (): boolean => {
    if (saveTimer.current === null) return false;
    clearTimeout(saveTimer.current);
    saveTimer.current = null;
    return true;
  };

  if (draft.prdId !== prd.id) {
    if (cancelPendingSave()) void persist(draft).catch(() => undefined);
    setDraft(draftOf(prd));
  }

  const latest = prds[prds.length - 1];
  const isLatest = latest?.id === prd.id;
  const validated = prd.status === "validated";
  const regenerating = conversation.sessionStatus === "running";
  const actionable = !validated && isLatest && !regenerating;
  const markdown = renderPrdMarkdown(prd.document);
  const hasFeedback = draft.annotations.length > 0 || draft.generalNote.trim() !== "";
  const openQuestions = prd.document.openQuestions;

  const scheduleSave = (next: FeedbackDraft): void => {
    setDraft(next);
    cancelPendingSave();
    saveTimer.current = setTimeout(() => {
      saveTimer.current = null;
      void persist(next).catch((e: unknown) => setError(errorMessage(e, "Sauvegarde des commentaires impossible")));
    }, SAVE_DEBOUNCE_MS);
  };

  const regenerate = (): void => {
    void run(async () => {
      cancelPendingSave();
      await persist(draft);
      await api.atelierRegeneratePrd(prd.id);
    }, "Régénération impossible");
  };

  const setStatus = (status: PrdDocumentRecord["status"]): void => {
    void run(async () => {
      onApplyPrd(await api.atelierUpdatePrd(prd.id, { status }));
    }, "Mise à jour du statut impossible");
  };

  const copyJson = (): void => {
    void navigator.clipboard
      .writeText(JSON.stringify(prd.document, null, JSON_INDENT))
      .then(() => boardStore.notify("JSON copié", `PRD rév. ${prd.revision}`))
      .catch(() => setError("Copie impossible"));
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-border px-4 py-2">
        <h2 className="text-sm font-medium">PRD</h2>
        <div className="flex items-center gap-1" role="radiogroup" aria-label="Révision du PRD">
          {prds.map((revision) => (
            <button
              key={revision.id}
              type="button"
              role="radio"
              aria-checked={revision.id === prd.id}
              onClick={() => onSelectPrd(revision.id)}
              className={cn(
                "rounded-full border px-2 py-0.5 font-mono text-2xs transition-colors",
                revision.id === prd.id
                  ? "border-foreground/40 bg-accent text-foreground"
                  : "border-border text-muted-foreground hover:text-foreground",
              )}
            >
              rév. {revision.revision}
            </button>
          ))}
        </div>
        <Badge variant={validated ? "success" : "outline"}>{validated ? "validé" : "brouillon"}</Badge>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <Button size="sm" variant="ghost" onClick={onBackToConversation}>
            <ArrowLeft className="h-3.5 w-3.5" />
            Reprendre la conversation
          </Button>
          <a href={atelierPrdExportUrl(prd.id, "json")} download className={EXPORT_LINK_CLASSES}>
            <Download className="h-3.5 w-3.5" />
            Exporter JSON
          </a>
          <a href={atelierPrdExportUrl(prd.id, "html")} download className={EXPORT_LINK_CLASSES}>
            <Download className="h-3.5 w-3.5" />
            Exporter HTML
          </a>
          <Button size="sm" variant="outline" onClick={copyJson}>
            <Copy className="h-3.5 w-3.5" />
            Copier le JSON
          </Button>
          {validated ? (
            <Button size="sm" variant="outline" onClick={() => setStatus("draft")} disabled={busy}>
              <RotateCcw className="h-3.5 w-3.5" />
              Rouvrir
            </Button>
          ) : (
            <Button size="sm" variant="outline" onClick={() => setStatus("validated")} disabled={busy || regenerating}>
              <Check className="h-3.5 w-3.5" />
              Marquer comme validé
            </Button>
          )}
          <Button size="sm" onClick={onCreateCards}>
            Créer les cartes
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      <div className="grid max-h-48 shrink-0 grid-cols-1 gap-4 overflow-y-auto border-b border-border px-4 py-3 md:grid-cols-2">
        <div className="space-y-1.5">
          <SectionHeader
            aside={
              <Badge variant={openQuestions.length > 0 ? "warning" : "success"}>
                {openQuestions.length > 0 ? openQuestions.length : "aucune"}
              </Badge>
            }
          >
            Décisions attendues
          </SectionHeader>
          {openQuestions.length === 0 ? (
            <p className="text-xs text-muted-foreground">Toutes les questions ouvertes sont tranchées.</p>
          ) : (
            <ol className="list-decimal space-y-1 pl-4 text-xs">
              {openQuestions.map((question) => (
                <li key={question}>{question}</li>
              ))}
            </ol>
          )}
        </div>
        <div className="space-y-1.5">
          <SectionHeader>Axes</SectionHeader>
          <ul className="space-y-1 text-xs">
            {prd.document.axes.map((axis) => (
              <li key={axis.id} className="flex gap-2">
                <span className="shrink-0 font-mono text-2xs text-muted-foreground">{axis.id}</span>
                <span className="min-w-0">
                  <span className="font-medium">{axis.title}</span>
                  <span className="text-muted-foreground"> · {axis.summary}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {regenerating && (
        <div className="flex shrink-0 items-center gap-2 border-b border-border px-4 py-2 text-xs text-muted-foreground">
          <LiveDot />
          L'agent régénère…
        </div>
      )}

      <PrdAnnotator
        key={`${prd.id}:${markdown}`}
        markdown={markdown}
        actionable={actionable}
        annotations={draft.annotations}
        onAnnotationsChange={(annotations) => scheduleSave({ ...draft, annotations })}
        generalNote={draft.generalNote}
        onGeneralNoteChange={(generalNote) => scheduleSave({ ...draft, generalNote })}
      />

      {actionable && (
        <div className="flex shrink-0 items-center gap-2 border-t border-border px-4 py-2">
          {error && <p className="min-w-0 flex-1 truncate text-xs text-danger">{error}</p>}
          <Button size="sm" className="ml-auto" onClick={regenerate} disabled={busy || !hasFeedback}>
            <RefreshCw className="h-3.5 w-3.5" />
            Régénérer avec les commentaires
          </Button>
        </div>
      )}
      {!actionable && error && <p className="shrink-0 px-4 py-2 text-xs text-danger">{error}</p>}
    </div>
  );
}
