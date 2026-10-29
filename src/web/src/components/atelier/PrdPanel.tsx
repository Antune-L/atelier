import { ArrowRight, Check, Copy, Download, RefreshCw, RotateCcw } from "lucide-react";
import { useMemo, useRef, useState } from "react";

import type { Conversation, PrdAnnotation, PrdDocumentRecord } from "@shared/schemas";
import { prdOutline, renderPrdMarkdown } from "@shared/prdMarkdown";

import { LiveDot } from "@/components/atelier/LiveDot";
import { PrdAnnotator } from "@/components/PrdAnnotator";
import { SectionHeader } from "@/components/ticket-detail/SectionHeader";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useBusyAction } from "@/hooks/useBusyAction";
import { api, atelierPrdExportUrl } from "@/lib/api";
import { errorMessage } from "@/lib/errors";
import { scrollToPrdAnchor } from "@/lib/prdOutline";
import { boardStore } from "@/lib/store";
import { cn } from "@/lib/utils";

interface PrdPanelProps {
  conversation: Conversation;
  prd: PrdDocumentRecord;
  prds: PrdDocumentRecord[];
  onSelectPrd: (prdId: string) => void;
  onApplyPrd: (prd: PrdDocumentRecord) => void;
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
const DECISIONS_ANCHOR = "prd-decisions";

function draftOf(prd: PrdDocumentRecord): FeedbackDraft {
  return { prdId: prd.id, annotations: prd.annotations, generalNote: prd.generalNote };
}

export function PrdPanel({
  conversation,
  prd,
  prds,
  onSelectPrd,
  onApplyPrd,
  onCreateCards,
}: PrdPanelProps) {
  const [draft, setDraft] = useState<FeedbackDraft>(() => draftOf(prd));
  const { busy, error, setError, run } = useBusyAction();
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const outline = useMemo(() => prdOutline(prd.document), [prd.document]);

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
      cancelPendingSave();
      await persist(draft);
      onApplyPrd(await api.atelierUpdatePrd(prd.id, { status }));
    }, "Mise à jour du statut impossible");
  };

  const copyJson = (): void => {
    void navigator.clipboard
      .writeText(JSON.stringify(prd.document, null, JSON_INDENT))
      .then(() => boardStore.notify("JSON copié", `PRD rév. ${prd.revision}`))
      .catch(() => setError("Copie impossible"));
  };

  const asideHeader = (
    <div className="space-y-3 border-b border-border pb-3">
      <div className="flex flex-wrap items-center gap-2" role="radiogroup" aria-label="Révision du PRD">
        {prds.map((revision) => (
          <button
            key={revision.id}
            type="button"
            role="radio"
            aria-checked={revision.id === prd.id}
            onClick={() => onSelectPrd(revision.id)}
            className={cn(
              "rounded-full border px-2 py-0.5 font-mono text-2xs transition-colors",
              revision.id === prd.id ? "border-foreground/40 bg-accent text-foreground" : "border-border text-muted-foreground hover:text-foreground",
            )}
          >rév. {revision.revision}</button>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant={validated ? "success" : "outline"}>{validated ? "Validé" : "Brouillon"}</Badge>
        {!isLatest && <Badge variant="outline">Historique · lecture seule</Badge>}
      </div>
      <p className="text-xs text-muted-foreground">
        {!isLatest ? "Cette révision est en lecture seule. Vous pouvez préparer ses cartes ou sélectionner la dernière pour la modifier." : validated ? "PRD validé. Choisissez ensuite les cartes à créer dans TODO." : "Relisez le document et ajoutez vos commentaires avant de le valider."}
      </p>
      <div className="flex flex-wrap items-center gap-2">
        {validated ? (
          <>
            <Button size="sm" variant="outline" onClick={() => setStatus("draft")} disabled={busy || regenerating || !isLatest}><RotateCcw className="h-3.5 w-3.5" />Rouvrir</Button>
            <Button size="sm" onClick={onCreateCards} disabled={busy || regenerating}>Préparer les cartes<ArrowRight className="h-3.5 w-3.5" /></Button>
          </>
        ) : (
          <>
            <Button size="sm" variant="outline" onClick={onCreateCards} disabled={busy || regenerating}>Préparer les cartes<ArrowRight className="h-3.5 w-3.5" /></Button>
            <Button size="sm" onClick={() => setStatus("validated")} disabled={busy || regenerating || !isLatest}><Check className="h-3.5 w-3.5" />Valider le PRD</Button>
          </>
        )}
      </div>
      <div className="space-y-2 text-xs">
        <SectionHeader aside={<Button size="sm" variant="ghost" className="h-auto px-1 py-0 text-xs underline-offset-2 hover:underline" onClick={() => scrollToPrdAnchor(DECISIONS_ANCHOR)}>Voir la section</Button>}>Décisions attendues · {openQuestions.length}</SectionHeader>
        {openQuestions.length === 0 ? <p className="text-muted-foreground">Toutes les questions ouvertes sont tranchées.</p> : <ol className="list-decimal space-y-1 pl-4">{openQuestions.map((question) => <li key={question}>{question}</li>)}</ol>}
      </div>
    </div>
  );

  const asideFooter = (
    <div className="space-y-2 border-t border-border pt-3">
      {actionable && (
        <Button size="sm" variant="outline" className="w-full" onClick={regenerate} disabled={busy || regenerating || !hasFeedback}>
          <RefreshCw className="h-3.5 w-3.5" />
          Régénérer avec les commentaires
        </Button>
      )}
      <Popover>
        <PopoverTrigger><Button size="sm" variant="outline"><Download className="h-3.5 w-3.5" />Exporter</Button></PopoverTrigger>
        <PopoverContent className="flex w-56 flex-col gap-2 p-3">
          <a href={atelierPrdExportUrl(prd.id, "json")} download className={EXPORT_LINK_CLASSES}><Download className="h-3.5 w-3.5" />JSON source</a>
          <a href={atelierPrdExportUrl(prd.id, "html")} download className={EXPORT_LINK_CLASSES}><Download className="h-3.5 w-3.5" />HTML généré</a>
          <Button size="sm" variant="ghost" onClick={copyJson}><Copy className="h-3.5 w-3.5" />Copier le JSON</Button>
        </PopoverContent>
      </Popover>
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col">
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
        outline={outline}
        asideHeader={asideHeader}
        asideFooter={asideFooter}
      />
    </div>
  );
}
