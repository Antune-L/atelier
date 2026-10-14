import { useState } from "react";

import { PrdAnnotator } from "@/components/PrdAnnotator";
import { Button } from "@/components/ui/button";
import { Sheet } from "@/components/ui/sheet";
import { useLocalDraft, useLocalJsonDraft } from "@/hooks/useLocalDraft";
import { SHEET_FOOTER_CLASSES } from "@/lib/overlayStyles";
import {
  compileFeedback,
  PRD_ANNOTATIONS_SCHEMA,
  prdAnnotationsDraftKey,
  type PrdAnnotation,
} from "@/lib/prdAnnotations";

interface PrdReviewDialogProps {
  open: boolean;
  ticketId: string;
  prdMarkdown: string;
  /** Proposed PRD (column `prd`): annotation + feedback actions. Otherwise read-only. */
  actionable: boolean;
  onClose: () => void;
  onValidate: (note: string) => Promise<void> | void;
  onRequestChanges: (message: string) => Promise<void> | void;
}

const REQUEST_CHANGES_PREFIX =
  "Merci de réviser le PRD selon ces retours, puis de le re-soumettre via submit_prd.";

const BREADCRUMB = ["Ticket", "PRD"];

const NO_ANNOTATIONS: PrdAnnotation[] = [];

/** The PRD, stacked on top of the ticket sheet, with annotation and validation actions. */
export function PrdReviewDialog({
  open,
  ticketId,
  prdMarkdown,
  actionable,
  onClose,
  onValidate,
  onRequestChanges,
}: PrdReviewDialogProps) {
  // Annotations anchor to the PRD text: the draft key includes a hash of it, so a re-submitted
  // PRD starts clean while an accidental Escape never loses what was annotated.
  const [annotations, setAnnotations, clearAnnotations] = useLocalJsonDraft(
    prdAnnotationsDraftKey(ticketId, prdMarkdown),
    PRD_ANNOTATIONS_SCHEMA,
    NO_ANNOTATIONS,
  );
  const [note, setNote, clearNote] = useLocalDraft(`prd-note:${ticketId}`);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasFeedback = annotations.length > 0 || note.trim().length > 0;

  const runAction = async (action: () => Promise<void> | void): Promise<void> => {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await action();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "La décision n’a pas été enregistrée. Vos retours sont conservés.");
      // Keep the sheet open so the user can retry; reset only on failure
      // (on success the parent unmounts us, so no setState-after-unmount).
      setBusy(false);
      return;
    }
    clearNote();
    clearAnnotations();
    onClose();
  };

  const requestChanges = (): void => {
    if (!hasFeedback) return;
    const message = `${REQUEST_CHANGES_PREFIX}\n\n${compileFeedback(annotations, note)}`;
    void runAction(() => onRequestChanges(message));
  };

  const validate = (): void => {
    void runAction(() => onValidate(hasFeedback ? compileFeedback(annotations, note) : ""));
  };

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
      size="lg"
      breadcrumb={BREADCRUMB}
      title={actionable ? "PRD · À valider" : "PRD · Lecture seule"}
    >
      <div className="flex min-h-0 flex-1 flex-col">
        <p className="shrink-0 border-b border-border px-4 py-2 text-xs text-muted-foreground">Document soumis pour ce ticket · Annotations liées à cette version du contenu{!actionable && " · Lecture seule"}</p>
        <PrdAnnotator
          key={prdMarkdown}
          markdown={prdMarkdown}
          actionable={actionable}
          annotations={annotations}
          onAnnotationsChange={setAnnotations}
          generalNote={note}
          onGeneralNoteChange={setNote}
        />
        {actionable && (
          <div className={SHEET_FOOTER_CLASSES}>
            {error !== null && <p role="alert" className="mr-auto text-xs text-danger">{error}</p>}
            <Button variant="outline" size="sm" disabled={busy || !hasFeedback} onClick={requestChanges}>
              Demander des corrections
            </Button>
            <Button size="sm" disabled={busy} onClick={validate}>
              Valider le PRD
            </Button>
          </div>
        )}
      </div>
    </Sheet>
  );
}
