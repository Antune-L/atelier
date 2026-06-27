export interface PrdAnnotation {
  id: string;
  quote: string;
  comment: string;
}

export interface SelectionState {
  quote: string;
  top: number;
  left: number;
}

/** Gap in px between a text selection and its floating "Commenter" button. */
export const SELECTION_BUTTON_GAP_PX = 4;

export interface AnnotatedHtml {
  html: string;
  /** Ids whose quote was actually highlighted in the document (single-node match). */
  anchoredIds: Set<string>;
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

export function injectAnnotations(
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
export function compileFeedback(annotations: PrdAnnotation[], generalNote: string): string {
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
