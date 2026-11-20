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
const MODAL_HIDDEN_SELECTOR = '[aria-hidden="true"]';
const OPEN_MODAL_SELECTOR = '[aria-modal="true"]';

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

function isBehindModal(input: HTMLInputElement): boolean {
  return input.closest(MODAL_HIDDEN_SELECTOR) !== null || document.querySelector(OPEN_MODAL_SELECTOR) !== null;
}

export function useBoardSearchShortcut(searchRef: RefObject<HTMLInputElement | null>): void {
  // NOTE(ali): bubble phase and a check of defaultPrevented, so any surface that already handled the key wins.
  // Radix modals hide the rest of the app with aria-hidden (hideOthers), which is how a hidden search is detected.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      const input = searchRef.current;
      if (!input) return;
      if (!shouldFocusBoardSearch(event, focusedElement(), { mounted: true, behindModal: isBehindModal(input) })) return;
      event.preventDefault();
      input.focus();
      input.select();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [searchRef]);
}
