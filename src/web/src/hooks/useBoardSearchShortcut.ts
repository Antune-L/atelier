import { useEffect, type RefObject } from "react";

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
const EDITABLE_TAGS: ReadonlySet<string> = new Set(["INPUT", "TEXTAREA", "SELECT"]);
const MODAL_HIDDEN_SELECTOR = '[aria-hidden="true"]';
const OPEN_MODAL_SELECTOR = '[aria-modal="true"]';

function isEditable(focused: FocusedElementInfo | null): boolean {
  if (!focused) return false;
  return focused.isContentEditable || EDITABLE_TAGS.has(focused.tagName.toUpperCase());
}

export function shouldFocusBoardSearch(event: ShortcutKeyEvent, focused: FocusedElementInfo | null, search: BoardSearchState): boolean {
  if (event.key !== SEARCH_SHORTCUT_KEY) return false;
  if (event.ctrlKey || event.metaKey || event.altKey) return false;
  if (event.repeat || event.isComposing || event.defaultPrevented) return false;
  if (!search.mounted || search.behindModal) return false;
  return !isEditable(focused);
}

function focusedElementInfo(): FocusedElementInfo | null {
  const active = document.activeElement;
  if (!(active instanceof HTMLElement)) return null;
  return { tagName: active.tagName, isContentEditable: active.isContentEditable };
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
      const search = { mounted: input !== null, behindModal: input !== null && isBehindModal(input) };
      if (!input || !shouldFocusBoardSearch(event, focusedElementInfo(), search)) return;
      event.preventDefault();
      input.focus();
      input.select();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [searchRef]);
}
