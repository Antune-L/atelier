import { X } from "lucide-react";
import { useState } from "react";

import { PrdAnnotator } from "@/components/PrdAnnotator";
import { Button } from "@/components/ui/button";
import { Modal, ModalHeader, ModalTitle } from "@/components/ui/modal";

interface PrdReviewDialogProps {
  open: boolean;
  prdMarkdown: string;
  /** Proposed PRD (column `prd`): annotation + feedback actions. Otherwise read-only. */
  actionable: boolean;
  onClose: () => void;
  onValidate: (note: string) => Promise<void> | void;
  onRequestChanges: (message: string) => Promise<void> | void;
}

const REQUEST_CHANGES_PREFIX =
  "Merci de réviser le PRD selon ces retours, puis de le re-soumettre via submit_prd.";

export function PrdReviewDialog({
  open,
  prdMarkdown,
  actionable,
  onClose,
  onValidate,
  onRequestChanges,
}: PrdReviewDialogProps) {
  const [feedback, setFeedback] = useState("");
  const [hasFeedback, setHasFeedback] = useState(false);
  const [composing, setComposing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [lastMarkdown, setLastMarkdown] = useState(prdMarkdown);

  // A re-submitted PRD invalidates the feedback anchored to the old text; the remounted
  // PrdAnnotator (key) starts clean, so clear our mirror of its state in step.
  if (prdMarkdown !== lastMarkdown) {
    setLastMarkdown(prdMarkdown);
    setFeedback("");
    setHasFeedback(false);
    setComposing(false);
  }

  const onFeedbackChange = (next: string, present: boolean): void => {
    setFeedback(next);
    setHasFeedback(present);
  };

  const runAction = async (action: () => Promise<void> | void): Promise<void> => {
    if (busy) return;
    setBusy(true);
    try {
      await action();
    } catch {
      // Keep the dialog open so the user can retry; reset only on failure
      // (on success the parent unmounts us, so no setState-after-unmount).
      setBusy(false);
      return;
    }
    onClose();
  };

  const requestChanges = (): void => {
    if (!hasFeedback) return;
    const message = `${REQUEST_CHANGES_PREFIX}\n\n${feedback}`;
    void runAction(() => onRequestChanges(message));
  };

  const validate = (): void => {
    const note = hasFeedback ? feedback : "";
    void runAction(() => onValidate(note));
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      side="center"
      disableEscape={hasFeedback || composing}
      className="flex h-[85vh] max-h-[85vh] w-[80vw] max-w-[80vw] flex-col !overflow-hidden"
    >
      <ModalHeader>
        <div className="flex items-center justify-between gap-3">
          <ModalTitle>{actionable ? "PRD proposé" : "PRD validé"}</ModalTitle>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            className="text-muted-foreground transition-colors hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </ModalHeader>

      <PrdAnnotator
        key={prdMarkdown}
        markdown={prdMarkdown}
        actionable={actionable}
        onFeedbackChange={onFeedbackChange}
        onComposingChange={setComposing}
      />

      {actionable && (
        <div className="flex shrink-0 items-center justify-between gap-2 border-t px-6 py-4">
          <span className="max-w-md text-xs text-muted-foreground">
            {hasFeedback
              ? "« Demander des corrections » fait réviser le PRD ; « Valider » lance l'implémentation en appliquant tes retours."
              : "Sélectionne un passage ou écris un retour général."}
          </span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={busy || !hasFeedback} onClick={requestChanges}>
              Demander des corrections
            </Button>
            <Button size="sm" disabled={busy} onClick={validate}>
              Valider le PRD
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
