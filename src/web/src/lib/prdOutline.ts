import type { PrdOutlineEntry } from "@shared/prdMarkdown";

export interface RenderedHeading {
  level: number;
  text: string;
}

const HEADING_SELECTOR = "h1, h2, h3, h4, h5, h6";

function normalize(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

function matches(heading: RenderedHeading, entry: PrdOutlineEntry): boolean {
  if (heading.level !== entry.level) return false;
  const text = normalize(heading.text);
  if (text === normalize(entry.heading)) return true;
  // Inline markdown in titles (backticks, emphasis) alters textContent; the id prefix stays intact.
  return entry.prefix !== undefined && text.startsWith(normalize(entry.prefix));
}

/**
 * Assigns each outline anchor to the first not-yet-assigned rendered heading, walking both in
 * document order. Returns, per rendered heading, the anchor to set or null. Unmatched entries are
 * simply not navigable.
 */
export function matchHeadingAnchors(headings: readonly RenderedHeading[], entries: readonly PrdOutlineEntry[]): (string | null)[] {
  const result: (string | null)[] = headings.map(() => null);
  let cursor = 0;
  for (const entry of entries) {
    for (let index = cursor; index < headings.length; index += 1) {
      const heading = headings[index];
      if (heading && result[index] === null && matches(heading, entry)) {
        result[index] = entry.anchor;
        cursor = index + 1;
        break;
      }
    }
  }
  return result;
}

/** Sets the outline anchors as ids on the headings of already-sanitized HTML. */
export function applyHeadingAnchors(html: string, entries: readonly PrdOutlineEntry[]): string {
  const doc = new DOMParser().parseFromString(html, "text/html");
  const elements = [...doc.body.querySelectorAll(HEADING_SELECTOR)];
  const anchors = matchHeadingAnchors(
    elements.map((element) => ({ level: Number(element.tagName.slice(1)), text: element.textContent ?? "" })),
    entries,
  );
  elements.forEach((element, index) => {
    const anchor = anchors[index];
    if (anchor) {
      element.id = anchor;
      element.classList.add("prd-anchor");
    }
  });
  return doc.body.innerHTML;
}

/** Scrolls to an anchored heading, within `root` when given. */
export function scrollToPrdAnchor(anchor: string, root?: ParentNode | null): void {
  const target = root ? root.querySelector(`#${CSS.escape(anchor)}`) : document.getElementById(anchor);
  if (target instanceof HTMLElement) target.scrollIntoView({ block: "start", behavior: "smooth" });
}
