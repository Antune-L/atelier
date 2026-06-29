import { useCallback, useEffect, useRef, useState, type RefObject } from "react";

import { ATELIER_SHORTCUT_EVENT } from "@/hooks/useTerminalShortcuts";

const HIGHLIGHT_MATCH = "prd-search-match";
const HIGHLIGHT_ACTIVE = "prd-search-active";
const SHORTCUT_KEY = "f";

interface ShortcutDetail {
  key: string;
  shiftKey?: boolean;
}

function isShortcutDetail(value: unknown): value is ShortcutDetail {
  if (!value || typeof value !== "object") return false;
  if (!("key" in value) || typeof value.key !== "string") return false;
  return true;
}

function supportsHighlightApi(): boolean {
  return typeof CSS !== "undefined" && "highlights" in CSS && typeof Highlight !== "undefined";
}

/** Build a Range for each case-insensitive occurrence of `query` across the container's text nodes. */
function collectMatchRanges(container: HTMLElement, query: string): Range[] {
  const ranges: Range[] = [];
  const needle = query.toLowerCase();
  if (!needle) return ranges;

  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
  let node = walker.nextNode();
  while (node) {
    const text = node.nodeValue ?? "";
    const haystack = text.toLowerCase();
    let from = haystack.indexOf(needle);
    while (from !== -1) {
      const range = document.createRange();
      range.setStart(node, from);
      range.setEnd(node, from + needle.length);
      ranges.push(range);
      from = haystack.indexOf(needle, from + needle.length);
    }
    node = walker.nextNode();
  }
  return ranges;
}

interface UsePrdSearchOptions {
  contentRef: RefObject<HTMLDivElement>;
  /** Changing this re-runs the match computation (rendered html changed). */
  htmlVersion: unknown;
  /** Bubble open/closed state up so the dialog can keep Escape from closing it. */
  onSearchingChange?: (searching: boolean) => void;
}

interface UsePrdSearchResult {
  open: boolean;
  query: string;
  total: number;
  /** 1-based index of the active match, 0 when none. */
  current: number;
  inputRef: RefObject<HTMLInputElement>;
  onQueryChange: (value: string) => void;
  next: () => void;
  prev: () => void;
  close: () => void;
  /** Handles Enter / Shift+Enter / Escape inside the input. */
  onInputKeyDown: (event: React.KeyboardEvent<HTMLInputElement>) => void;
}

export function usePrdSearch({
  contentRef,
  htmlVersion,
  onSearchingChange,
}: UsePrdSearchOptions): UsePrdSearchResult {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [total, setTotal] = useState(0);
  const [activeIndex, setActiveIndex] = useState(0);

  const inputRef = useRef<HTMLInputElement>(null);
  const rangesRef = useRef<Range[]>([]);
  const onSearchingChangeRef = useRef(onSearchingChange);
  onSearchingChangeRef.current = onSearchingChange;

  const clearHighlights = useCallback((): void => {
    if (!supportsHighlightApi()) return;
    CSS.highlights.delete(HIGHLIGHT_MATCH);
    CSS.highlights.delete(HIGHLIGHT_ACTIVE);
  }, []);

  const paint = useCallback(
    (ranges: Range[], activeIdx: number): void => {
      if (!supportsHighlightApi()) return;
      CSS.highlights.delete(HIGHLIGHT_ACTIVE);
      if (ranges.length === 0) {
        CSS.highlights.delete(HIGHLIGHT_MATCH);
        return;
      }
      const others = ranges.filter((_, i) => i !== activeIdx);
      CSS.highlights.set(HIGHLIGHT_MATCH, new Highlight(...others));
      const active = ranges[activeIdx];
      if (active) CSS.highlights.set(HIGHLIGHT_ACTIVE, new Highlight(active));
    },
    [],
  );

  const scrollToActive = useCallback((range: Range | undefined): void => {
    if (!range) return;
    const node = range.startContainer;
    const element = node instanceof HTMLElement ? node : node.parentElement;
    element?.scrollIntoView({ block: "center" });
  }, []);

  const recompute = useCallback(
    (nextQuery: string, preferredIndex: number): void => {
      const container = contentRef.current;
      const ranges = container ? collectMatchRanges(container, nextQuery) : [];
      rangesRef.current = ranges;
      setTotal(ranges.length);
      if (ranges.length === 0) {
        setActiveIndex(0);
        paint(ranges, 0);
        return;
      }
      const clamped = Math.min(Math.max(preferredIndex, 0), ranges.length - 1);
      setActiveIndex(clamped);
      paint(ranges, clamped);
      scrollToActive(ranges[clamped]);
    },
    [contentRef, paint, scrollToActive],
  );

  const onQueryChange = useCallback(
    (value: string): void => {
      setQuery(value);
      recompute(value, 0);
    },
    [recompute],
  );

  const goTo = useCallback(
    (index: number): void => {
      const ranges = rangesRef.current;
      if (ranges.length === 0) return;
      const wrapped = (index + ranges.length) % ranges.length;
      setActiveIndex(wrapped);
      paint(ranges, wrapped);
      scrollToActive(ranges[wrapped]);
    },
    [paint, scrollToActive],
  );

  const next = useCallback((): void => goTo(activeIndex + 1), [goTo, activeIndex]);
  const prev = useCallback((): void => goTo(activeIndex - 1), [goTo, activeIndex]);

  const close = useCallback((): void => {
    setOpen(false);
    setQuery("");
    setTotal(0);
    setActiveIndex(0);
    rangesRef.current = [];
    clearHighlights();
    onSearchingChangeRef.current?.(false);
  }, [clearHighlights]);

  const activate = useCallback((): void => {
    setOpen(true);
    onSearchingChangeRef.current?.(true);
    requestAnimationFrame(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    });
  }, []);

  const onInputKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLInputElement>): void => {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        close();
        return;
      }
      if (event.key === "Enter") {
        event.preventDefault();
        if (event.shiftKey) prev();
        else next();
      }
    },
    [close, prev, next],
  );

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      if (!event.metaKey || event.key.toLowerCase() !== SHORTCUT_KEY) return;
      event.preventDefault();
      event.stopPropagation();
      activate();
    };
    const onCustom = (event: Event): void => {
      if (!(event instanceof CustomEvent)) return;
      if (!isShortcutDetail(event.detail)) return;
      if (event.detail.key.toLowerCase() !== SHORTCUT_KEY) return;
      activate();
    };
    window.addEventListener("keydown", onKeyDown, true);
    window.addEventListener(ATELIER_SHORTCUT_EVENT, onCustom);
    return () => {
      window.removeEventListener("keydown", onKeyDown, true);
      window.removeEventListener(ATELIER_SHORTCUT_EVENT, onCustom);
    };
  }, [activate]);

  const recomputeRef = useRef(recompute);
  recomputeRef.current = recompute;
  const queryRef = useRef(query);
  queryRef.current = query;
  const activeIndexRef = useRef(activeIndex);
  activeIndexRef.current = activeIndex;
  const openRef = useRef(open);
  openRef.current = open;

  // Re-run matches when the rendered html changes (annotations edited). Reads live state via refs
  // so this fires only on htmlVersion, not on every keystroke.
  useEffect(() => {
    if (!openRef.current || !queryRef.current) return;
    recomputeRef.current(queryRef.current, activeIndexRef.current);
  }, [htmlVersion]);

  useEffect(() => clearHighlights, [clearHighlights]);

  return {
    open,
    query,
    total,
    current: total === 0 ? 0 : activeIndex + 1,
    inputRef,
    onQueryChange,
    next,
    prev,
    close,
    onInputKeyDown,
  };
}
