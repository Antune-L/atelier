import type { RefObject } from "react";

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

export function shouldFocusBoardSearch(_event: ShortcutKeyEvent, _focused: FocusedElementInfo | null, _search: BoardSearchState): boolean {
  return false;
}

export function useBoardSearchShortcut(_searchRef: RefObject<HTMLInputElement | null>): void {}
