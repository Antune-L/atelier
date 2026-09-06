import { ChevronDown, ChevronUp, MessageSquarePlus, Search, Trash2, X } from "lucide-react";
import { useMemo, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Label, Textarea } from "@/components/ui/input";
import { renderMarkdownToSafeHtml } from "@/components/ui/markdown";
import { usePrdSearch } from "@/hooks/usePrdSearch";
import {
  SELECTION_BUTTON_GAP_PX,
  injectAnnotations,
  type PrdAnnotation,
  type SelectionState,
} from "@/lib/prdAnnotations";
import { FIELD_LABEL_CLASSES } from "@/lib/overlayStyles";
import { cn } from "@/lib/utils";

interface PrdAnnotatorProps {
  markdown: string;
  /** When false the content is read-only (no selection capture, no annotations sidebar). */
  actionable: boolean;
  annotations: PrdAnnotation[];
  onAnnotationsChange: (annotations: PrdAnnotation[]) => void;
  generalNote: string;
  onGeneralNoteChange: (note: string) => void;
}

const GENERAL_NOTE_ID = "prd-general-note";

/**
 * Renders a PRD markdown with text-selection → floating "Commenter" button and an annotations
 * sidebar (focus/remove + general note). A re-generated PRD invalidates anchors built on the old
 * text, so consumers must remount this with `key={markdown}` to start from a clean slate.
 */
export function PrdAnnotator({
  markdown,
  actionable,
  annotations,
  onAnnotationsChange,
  generalNote,
  onGeneralNoteChange,
}: PrdAnnotatorProps) {
  const [selection, setSelection] = useState<SelectionState | null>(null);
  const [composing, setComposing] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [activeId, setActiveId] = useState<string | null>(null);

  const contentRef = useRef<HTMLDivElement>(null);
  const nextId = useRef(0);

  const baseHtml = useMemo(() => renderMarkdownToSafeHtml(markdown), [markdown]);
  const { html, anchoredIds } = useMemo(
    () => injectAnnotations(baseHtml, annotations, activeId),
    [baseHtml, annotations, activeId],
  );

  const search = usePrdSearch({ contentRef, htmlVersion: html });

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
    onAnnotationsChange([...annotations, { id: `ann-${nextId.current}`, quote: composing, comment }]);
    setComposing(null);
    setDraft("");
  };

  const removeAnnotation = (id: string): void => {
    onAnnotationsChange(annotations.filter((a) => a.id !== id));
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

  return (
    <div className="flex min-h-0 flex-1 overflow-hidden">
      <div
        ref={contentRef}
        onMouseUp={captureSelection}
        onScroll={() => setSelection(null)}
        onClick={onContentClick}
        className="relative min-w-0 flex-1 overflow-y-auto px-4 py-3"
      >
        {search.open && (
          <div className="sticky top-0 z-20 -mx-4 -mt-3 mb-2 flex justify-end px-4 pt-3">
            <div className="flex items-center gap-1 rounded-md border bg-card p-1 shadow-md">
              <Search className="ml-1 h-4 w-4 shrink-0 text-muted-foreground" />
              <input
                ref={search.inputRef}
                value={search.query}
                onChange={(e) => search.onQueryChange(e.target.value)}
                onKeyDown={search.onInputKeyDown}
                placeholder="Rechercher…"
                className="h-7 w-44 bg-transparent px-1 text-sm outline-none placeholder:text-muted-foreground"
              />
              <span className="w-14 shrink-0 text-center text-xs tabular-nums text-muted-foreground">
                {search.query && search.total === 0 ? "Aucun" : `${search.current}/${search.total}`}
              </span>
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7"
                aria-label="Résultat précédent"
                disabled={search.total === 0}
                onClick={search.prev}
              >
                <ChevronUp className="h-4 w-4" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7"
                aria-label="Résultat suivant"
                disabled={search.total === 0}
                onClick={search.next}
              >
                <ChevronDown className="h-4 w-4" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7"
                aria-label="Fermer la recherche"
                onClick={search.close}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
        {actionable && (
          <p className={cn("mb-3", FIELD_LABEL_CLASSES)}>
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
        <aside className="flex w-64 shrink-0 flex-col overflow-hidden border-l border-border">
          <div className="flex-1 space-y-3 overflow-y-auto px-3 py-3">
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
              <h4 className={cn("mb-2", FIELD_LABEL_CLASSES)}>
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
                          <span className="mr-1 inline-flex h-4 w-4 items-center justify-center rounded-full bg-warning font-mono text-2xs font-semibold text-warning-foreground">
                            {i + 1}
                          </span>
                          <span className="text-xs italic text-muted-foreground">« {a.quote} »</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => removeAnnotation(a.id)}
                          aria-label="Supprimer l'annotation"
                          className="text-muted-foreground transition-colors hover:text-danger"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <p className="mt-1 whitespace-pre-wrap">{a.comment}</p>
                      {!anchoredIds.has(a.id) && (
                        <p className="mt-1 text-2xs text-muted-foreground">
                          Non surligné dans le texte (passage à cheval sur plusieurs éléments) — envoyé quand même.
                        </p>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor={GENERAL_NOTE_ID}>Retour général (optionnel)</Label>
              <Textarea
                id={GENERAL_NOTE_ID}
                value={generalNote}
                onChange={(e) => onGeneralNoteChange(e.target.value)}
                className="min-h-[60px]"
                placeholder="Remarque globale sur le PRD…"
              />
            </div>
          </div>
        </aside>
      )}
    </div>
  );
}
