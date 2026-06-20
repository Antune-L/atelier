import { MessageSquarePlus, Trash2, X } from "lucide-react";
import { useMemo, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Modal, ModalHeader, ModalTitle } from "@/components/ui/modal";
import { Label, Textarea } from "@/components/ui/input";
import { renderMarkdownToSafeHtml } from "@/components/ui/markdown";
import { cn } from "@/lib/utils";

interface PrdAnnotation {
  id: string;
  quote: string;
  comment: string;
}

interface SelectionState {
  quote: string;
  top: number;
  left: number;
}

/** Gap in px between a text selection and its floating "Commenter" button. */
const SELECTION_BUTTON_GAP_PX = 4;

interface PrdReviewDialogProps {
  open: boolean;
  prdMarkdown: string;
  /** Proposed PRD (column `prd`): annotation + feedback actions. Otherwise read-only. */
  actionable: boolean;
  onClose: () => void;
  onValidate: (note: string) => Promise<void> | void;
  onRequestChanges: (message: string) => Promise<void> | void;
}

/** True when `node` is already wrapped by a previous annotation (avoids double-marking). */
function isInsideAnnotation(node: Node): boolean {
  let el = node.parentElement;
  while (el) {
    if (el.classList.contains("prd-annotation")) return true;
    el = el.parentElement;
  }
  return false;
}

/**
 * Wrap the first single-text-node occurrence of `quote` in a numbered <mark>.
 * Best-effort: a selection spanning multiple text nodes (bold, links, list items)
 * cannot be anchored and returns false — the caller surfaces that to the user.
 */
function wrapFirstOccurrence(
  root: HTMLElement,
  quote: string,
  id: string,
  pin: number,
  active: boolean,
): boolean {
  const doc = root.ownerDocument;
  const walker = doc.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    if (isInsideAnnotation(node)) continue;
    const text = node.nodeValue ?? "";
    const idx = text.indexOf(quote);
    if (idx === -1 || !node.parentNode) continue;

    const mark = doc.createElement("mark");
    mark.className = active ? "prd-annotation is-active" : "prd-annotation";
    mark.setAttribute("data-ann-id", id);
    mark.textContent = quote;
    const sup = doc.createElement("sup");
    sup.className = "prd-annotation-pin";
    sup.textContent = String(pin);
    mark.appendChild(sup);

    const frag = doc.createDocumentFragment();
    const before = text.slice(0, idx);
    const after = text.slice(idx + quote.length);
    if (before) frag.appendChild(doc.createTextNode(before));
    frag.appendChild(mark);
    if (after) frag.appendChild(doc.createTextNode(after));
    node.parentNode.replaceChild(frag, node);
    return true;
  }
  return false;
}

interface AnnotatedHtml {
  html: string;
  /** Ids whose quote was actually highlighted in the document (single-node match). */
  anchoredIds: Set<string>;
}

function injectAnnotations(
  baseHtml: string,
  annotations: PrdAnnotation[],
  activeId: string | null,
): AnnotatedHtml {
  const anchoredIds = new Set<string>();
  if (annotations.length === 0) return { html: baseHtml, anchoredIds };
  const doc = new DOMParser().parseFromString(baseHtml, "text/html");
  annotations.forEach((ann, index) => {
    if (wrapFirstOccurrence(doc.body, ann.quote, ann.id, index + 1, ann.id === activeId)) {
      anchoredIds.add(ann.id);
    }
  });
  return { html: doc.body.innerHTML, anchoredIds };
}

/** Compose the annotations + general note into the markdown message sent to the agent. */
function compileFeedback(annotations: PrdAnnotation[], generalNote: string): string {
  const parts: string[] = [];
  if (annotations.length > 0) {
    const count = annotations.length;
    parts.push(`Retours sur le PRD (${count} annotation${count > 1 ? "s" : ""}) :`);
    annotations.forEach((a, i) => {
      parts.push(`${i + 1}. Concernant « ${a.quote} » :\n   ${a.comment}`);
    });
  }
  const note = generalNote.trim();
  if (note) parts.push(`Retour général :\n${note}`);
  return parts.join("\n\n");
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
  const [annotations, setAnnotations] = useState<PrdAnnotation[]>([]);
  const [generalNote, setGeneralNote] = useState("");
  const [selection, setSelection] = useState<SelectionState | null>(null);
  const [composing, setComposing] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [lastMarkdown, setLastMarkdown] = useState(prdMarkdown);
  const [busy, setBusy] = useState(false);

  const contentRef = useRef<HTMLDivElement>(null);
  const nextId = useRef(0);

  // A re-submitted PRD invalidates annotations anchored to the old text — reset them.
  if (prdMarkdown !== lastMarkdown) {
    setLastMarkdown(prdMarkdown);
    setAnnotations([]);
    setGeneralNote("");
    setComposing(null);
    setSelection(null);
    setActiveId(null);
  }

  const baseHtml = useMemo(() => renderMarkdownToSafeHtml(prdMarkdown), [prdMarkdown]);
  const { html, anchoredIds } = useMemo(
    () => injectAnnotations(baseHtml, annotations, activeId),
    [baseHtml, annotations, activeId],
  );

  const hasFeedback = annotations.length > 0 || generalNote.trim().length > 0;

  const captureSelection = (): void => {
    if (!actionable) return;
    const sel = window.getSelection();
    const el = contentRef.current;
    if (!sel || sel.isCollapsed || sel.rangeCount === 0 || !el) {
      setSelection(null);
      return;
    }
    const range = sel.getRangeAt(0);
    if (!el.contains(range.commonAncestorContainer)) {
      setSelection(null);
      return;
    }
    const quote = sel.toString().trim();
    if (!quote) {
      setSelection(null);
      return;
    }
    const rect = range.getBoundingClientRect();
    const containerRect = el.getBoundingClientRect();
    setSelection({
      quote,
      top: rect.bottom - containerRect.top + el.scrollTop + SELECTION_BUTTON_GAP_PX,
      left: rect.left - containerRect.left + el.scrollLeft,
    });
  };

  const openComposer = (quote: string): void => {
    setComposing(quote);
    setDraft("");
    setSelection(null);
    window.getSelection()?.removeAllRanges();
  };

  const saveAnnotation = (): void => {
    const comment = draft.trim();
    if (composing === null || !comment) return;
    nextId.current += 1;
    setAnnotations((prev) => [...prev, { id: `ann-${nextId.current}`, quote: composing, comment }]);
    setComposing(null);
    setDraft("");
  };

  const removeAnnotation = (id: string): void => {
    setAnnotations((prev) => prev.filter((a) => a.id !== id));
    if (activeId === id) setActiveId(null);
  };

  const focusAnnotation = (id: string): void => {
    setActiveId(id);
    const mark = contentRef.current?.querySelector(`[data-ann-id="${id}"]`);
    if (mark instanceof HTMLElement) mark.scrollIntoView({ block: "center", behavior: "smooth" });
  };

  const onContentClick = (event: React.MouseEvent<HTMLDivElement>): void => {
    if (!(event.target instanceof HTMLElement)) return;
    const mark = event.target.closest(".prd-annotation");
    if (mark instanceof HTMLElement) {
      const id = mark.getAttribute("data-ann-id");
      if (id) setActiveId(id);
    }
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
    const message = `${REQUEST_CHANGES_PREFIX}\n\n${compileFeedback(annotations, generalNote)}`;
    void runAction(() => onRequestChanges(message));
  };

  const validate = (): void => {
    const note = hasFeedback ? compileFeedback(annotations, generalNote) : "";
    void runAction(() => onValidate(note));
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      side="center"
      disableEscape={hasFeedback || composing !== null}
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

      <div className="flex flex-1 overflow-hidden">
        <div
          ref={contentRef}
          onMouseUp={captureSelection}
          onScroll={() => setSelection(null)}
          onClick={onContentClick}
          className="relative min-w-0 flex-1 overflow-y-auto px-6 py-4"
        >
          {actionable && (
            <p className="mb-3 text-xs text-muted-foreground">
              Sélectionne un passage pour y attacher un retour.
            </p>
          )}
          <div
            className="markdown"
            // Sanitized by renderMarkdownToSafeHtml; only <mark>/<sup> are injected on top.
            dangerouslySetInnerHTML={{ __html: html }}
          />
          {actionable && selection && (
            <div className="absolute z-10" style={{ top: selection.top, left: selection.left }}>
              <Button
                size="sm"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => openComposer(selection.quote)}
              >
                <MessageSquarePlus className="h-4 w-4" />
                Commenter
              </Button>
            </div>
          )}
        </div>

        {actionable && (
          <aside className="flex w-80 shrink-0 flex-col overflow-hidden border-l">
            <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
              {composing !== null && (
                <div className="space-y-2 rounded-md border border-warning/50 bg-warning/10 p-3">
                  <p className="text-xs italic text-muted-foreground">« {composing} »</p>
                  <Textarea
                    autoFocus
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    className="min-h-[80px]"
                    placeholder="Ton retour sur ce passage…"
                  />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={saveAnnotation} disabled={!draft.trim()}>
                      Ajouter
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setComposing(null)}>
                      Annuler
                    </Button>
                  </div>
                </div>
              )}

              <div>
                <h4 className="mb-2 text-sm font-semibold">
                  Annotations {annotations.length > 0 && `(${annotations.length})`}
                </h4>
                {annotations.length === 0 ? (
                  <p className="text-xs text-muted-foreground">Aucune annotation pour l'instant.</p>
                ) : (
                  <ul className="space-y-2">
                    {annotations.map((a, i) => (
                      <li
                        key={a.id}
                        className={cn(
                          "rounded-md border p-2 text-sm",
                          a.id === activeId && "border-warning/60 bg-warning/10",
                        )}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <button
                            type="button"
                            onClick={() => focusAnnotation(a.id)}
                            className="min-w-0 flex-1 text-left"
                          >
                            <span className="mr-1 inline-flex h-4 w-4 items-center justify-center rounded-full bg-warning text-[10px] font-semibold text-warning-foreground">
                              {i + 1}
                            </span>
                            <span className="text-xs italic text-muted-foreground">« {a.quote} »</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => removeAnnotation(a.id)}
                            aria-label="Supprimer l'annotation"
                            className="text-muted-foreground transition-colors hover:text-destructive"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                        <p className="mt-1 whitespace-pre-wrap">{a.comment}</p>
                        {!anchoredIds.has(a.id) && (
                          <p className="mt-1 text-[11px] text-muted-foreground">
                            Non surligné dans le texte (passage à cheval sur plusieurs éléments) — envoyé quand même.
                          </p>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="prd-general-note">Retour général (optionnel)</Label>
                <Textarea
                  id="prd-general-note"
                  value={generalNote}
                  onChange={(e) => setGeneralNote(e.target.value)}
                  className="min-h-[60px]"
                  placeholder="Remarque globale sur le PRD…"
                />
              </div>
            </div>
          </aside>
        )}
      </div>

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
