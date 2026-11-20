import { useEffect, type RefObject } from "react";

import { isTextEntryElement } from "@/lib/textEntry";

export interface ShortcutKeyEvent {
  key: string;
  ctrlKey: boolean;
  metaKey: boolean;
  altKey: boolean;
  shiftKey: boolean;
  repeat: boolean;
  isComposing: boolean;
  defaultPrevented: boolean;
}

export interface FocusedElementInfo {
  tagName: string;
  isContentEditable: boolean;
}

export interface BoardSearchState {
  mounted: boolean;
  behindModal: boolean;
}

const SEARCH_SHORTCUT_KEY = "/";

export function shouldFocusBoardSearch(event: ShortcutKeyEvent, focused: FocusedElementInfo | null, search: BoardSearchState): boolean {
  if (event.key !== SEARCH_SHORTCUT_KEY) return false;
  if (event.ctrlKey || event.metaKey || event.altKey) return false;
  if (event.repeat || event.isComposing || event.defaultPrevented) return false;
  if (!search.mounted || search.behindModal) return false;
  return focused === null || !isTextEntryElement(focused);
}

function focusedElement(): HTMLElement | null {
  const active = document.activeElement;
  return active instanceof HTMLElement ? active : null;
}

function isCoveredByOverlay(input: HTMLInputElement): boolean {
  const { left, top, width, height } = input.getBoundingClientRect();
  const topmost = document.elementFromPoint(left + width / 2, top + height / 2);
  return topmost === null || !input.contains(topmost);
}

export function useBoardSearchShortcut(searchRef: RefObject<HTMLInputElement | null>): void {
  // NOTE(ali): bubble phase and a check of defaultPrevented, so any surface that already handled the key wins.
  // The search counts as hidden when anything sits on top of it: Radix overlays, the fullscreen terminal, the update veil.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      const input = searchRef.current;
      if (!input) return;
      if (!shouldFocusBoardSearch(event, focusedElement(), { mounted: true, behindModal: false }) || isCoveredByOverlay(input)) return;
      input.focus();
      if (document.activeElement !== input) return;
      event.preventDefault();
      input.select();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [searchRef]);
}
