// Atelier HTML mockups: the agent writes `<mockup title="…">…full HTML document…</mockup>`
// in its normal reply text. This module is pure (no DOM) and shared by the server
// (history replay) and the web (rendering in a sandboxed iframe).

export const MOCKUP_MAX_BYTES = 64 * 1024;
export const MOCKUP_DEFAULT_TITLE = "Maquette";
export const MOCKUP_TITLE_MAX_LENGTH = 80;

// Empty sandbox: opaque origin, no scripts, no forms, no popups. Never add
// `allow-same-origin` (see MEMORY.md).
export const MOCKUP_SANDBOX = "";
export const MOCKUP_CSP =
  "default-src 'none'; style-src 'unsafe-inline'; img-src data:; font-src data:; script-src 'none'; connect-src 'none'; frame-src 'none'; object-src 'none'; media-src 'none'; worker-src 'none'; form-action 'none'; base-uri 'none'";

export type MockupSegment = { kind: "text"; text: string } | { kind: "mockup"; title: string; html: string; complete: boolean };

const OPEN_TAG = "<mockup";
const CLOSE_TAG = "</mockup>";

type ScannedMockup = { start: number; end: number; title: string; html: string; complete: boolean };
type Scan = { mockups: ScannedMockup[]; visibleEnd: number };

function isLineStart(content: string, index: number): boolean {
  return index === 0 || content[index - 1] === "\n";
}

function runLength(content: string, index: number, char: string): number {
  let end = index;
  while (content[end] === char) end += 1;
  return end - index;
}

/** Returns the end offset of the fenced block opening at `index`, or null when no fence opens there. */
function fenceEnd(content: string, index: number): number | null {
  let cursor = index;
  while (cursor - index < 3 && content[cursor] === " ") cursor += 1;
  const char = content[cursor];
  if (char !== "`" && char !== "~") return null;
  const length = runLength(content, cursor, char);
  if (length < 3) return null;
  let lineEnd = content.indexOf("\n", cursor);
  if (lineEnd === -1) return content.length;
  // A backtick fence info string cannot contain backticks.
  if (char === "`" && content.slice(cursor + length, lineEnd).includes("`")) return null;
  while (lineEnd !== -1) {
    const lineStart = lineEnd + 1;
    const nextEnd = content.indexOf("\n", lineStart);
    const line = content.slice(lineStart, nextEnd === -1 ? content.length : nextEnd);
    const trimmed = line.replace(/^ {0,3}/, "");
    const closing = runLength(trimmed, 0, char);
    if (closing >= length && trimmed.slice(closing).trim() === "") return nextEnd === -1 ? content.length : nextEnd;
    lineEnd = nextEnd;
  }
  return content.length;
}

/** Returns the end offset of the inline code span opening at `index`, or null when unmatched. */
function codeSpanEnd(content: string, index: number, length: number): number | null {
  let cursor = index + length;
  while (cursor < content.length) {
    const next = content.indexOf("`", cursor);
    if (next === -1) return null;
    const run = runLength(content, next, "`");
    if (run === length) return next + run;
    cursor = next + run;
  }
  return null;
}

/** Offset of the `>` closing the opening tag, ignoring `>` inside quoted attribute values. */
function openTagEnd(content: string, index: number): number | null {
  let quote: string | null = null;
  for (let cursor = index; cursor < content.length; cursor += 1) {
    const char = content[cursor];
    if (quote) {
      if (char === quote) quote = null;
    } else if (char === '"' || char === "'") {
      quote = char;
    } else if (char === ">") {
      return cursor;
    }
  }
  // Unbalanced quote: fall back to the first `>`.
  const fallback = content.indexOf(">", index);
  return fallback === -1 ? null : fallback;
}

function parseTitle(attributes: string): string {
  const match = /(?:^|\s)title\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+))/i.exec(attributes);
  const raw = (match?.[1] ?? match?.[2] ?? match?.[3] ?? "").trim();
  return raw ? raw.slice(0, MOCKUP_TITLE_MAX_LENGTH).trim() : MOCKUP_DEFAULT_TITLE;
}

function scan(content: string): Scan {
  const mockups: ScannedMockup[] = [];
  const lower = content.toLowerCase();
  let index = 0;
  while (index < content.length) {
    if (isLineStart(content, index)) {
      const end = fenceEnd(content, index);
      if (end !== null) {
        index = end;
        continue;
      }
    }
    const char = content[index];
    if (char === "`") {
      const length = runLength(content, index, "`");
      index = codeSpanEnd(content, index, length) ?? index + length;
      continue;
    }
    if (char === "<") {
      const rest = lower.slice(index, index + OPEN_TAG.length + 1);
      // A partial `<mockup` prefix at the very end may still become a tag while streaming.
      if (OPEN_TAG.startsWith(rest) || rest === OPEN_TAG) return { mockups, visibleEnd: index };
      const after = rest.charAt(OPEN_TAG.length);
      if (rest.startsWith(OPEN_TAG) && /[\s>/]/.test(after)) {
        const tagEnd = openTagEnd(content, index + OPEN_TAG.length);
        if (tagEnd === null) return { mockups, visibleEnd: index };
        const title = parseTitle(content.slice(index + OPEN_TAG.length, tagEnd));
        const bodyStart = tagEnd + 1;
        // The body is raw HTML: no code tracking, the first closing tag wins.
        const close = lower.indexOf(CLOSE_TAG, bodyStart);
        if (close === -1) {
          mockups.push({ start: index, end: content.length, title, html: content.slice(bodyStart), complete: false });
          return { mockups, visibleEnd: content.length };
        }
        const end = close + CLOSE_TAG.length;
        mockups.push({ start: index, end, title, html: content.slice(bodyStart, close), complete: true });
        index = end;
        continue;
      }
    }
    index += 1;
  }
  return { mockups, visibleEnd: content.length };
}

export function splitMockupBlocks(content: string): MockupSegment[] {
  const { mockups, visibleEnd } = scan(content);
  if (mockups.length === 0 && visibleEnd === content.length) return content ? [{ kind: "text", text: content }] : [];
  const segments: MockupSegment[] = [];
  const pushText = (text: string): void => {
    if (text) segments.push({ kind: "text", text });
  };
  let cursor = 0;
  for (const mockup of mockups) {
    pushText(content.slice(cursor, mockup.start));
    segments.push({ kind: "mockup", title: mockup.title, html: mockup.html, complete: mockup.complete });
    cursor = mockup.end;
  }
  pushText(content.slice(cursor, Math.max(cursor, visibleEnd)));
  return segments;
}

function escapeAttribute(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}

/** Injects the CSP meta as the first child of `<head>`, never before the doctype. */
export function buildMockupSrcdoc(sanitizedHtml: string): string {
  const meta = `<meta http-equiv="Content-Security-Policy" content="${escapeAttribute(MOCKUP_CSP)}">`;
  const insertAfter = (match: RegExpExecArray, insertion: string): string => {
    const at = match.index + match[0].length;
    return sanitizedHtml.slice(0, at) + insertion + sanitizedHtml.slice(at);
  };
  const head = /<head(?=[\s>/])[^>]*>/i.exec(sanitizedHtml);
  if (head) return insertAfter(head, meta);
  const html = /<html(?=[\s>/])[^>]*>/i.exec(sanitizedHtml);
  if (html) return insertAfter(html, `<head>${meta}</head>`);
  const doctype = /^\s*<!doctype[^>]*>/i.exec(sanitizedHtml);
  if (doctype) return insertAfter(doctype, `<head>${meta}</head>`);
  return `<head>${meta}</head>${sanitizedHtml}`;
}

export function isMockupTooLarge(html: string): boolean {
  return new TextEncoder().encode(html).length > MOCKUP_MAX_BYTES;
}

export function omittedMockupPlaceholder(title: string): string {
  return `[version précédente de la maquette « ${title} » omise]`;
}

/**
 * Given assistant message contents in order, keeps only the last complete version of
 * each mockup title and replaces earlier ones with a placeholder. Untouched messages
 * are returned byte-identical.
 */
export function collapseMockupHistory(contents: string[]): string[] {
  const scans = contents.map((content) => scan(content).mockups.filter((mockup) => mockup.complete));
  const latest = new Map<string, string>();
  scans.forEach((mockups, messageIndex) => {
    mockups.forEach((mockup, mockupIndex) => latest.set(mockup.title, `${messageIndex}:${mockupIndex}`));
  });
  return contents.map((content, messageIndex) => {
    const mockups = scans[messageIndex] ?? [];
    let result = "";
    let cursor = 0;
    let changed = false;
    mockups.forEach((mockup, mockupIndex) => {
      if (latest.get(mockup.title) === `${messageIndex}:${mockupIndex}`) return;
      result += content.slice(cursor, mockup.start) + omittedMockupPlaceholder(mockup.title);
      cursor = mockup.end;
      changed = true;
    });
    return changed ? result + content.slice(cursor) : content;
  });
}
