import { expect, test } from "bun:test";

import type { BoardSearchState, FocusedElementInfo, ShortcutKeyEvent } from "./useBoardSearchShortcut";
import { shouldFocusBoardSearch } from "./useBoardSearchShortcut";

const SLASH_KEY = "/";
const ESCAPE_KEY = "Escape";
const QUESTION_MARK_KEY = "?";

const VISIBLE_SEARCH: BoardSearchState = { mounted: true, behindModal: false };

const BODY_FOCUS: FocusedElementInfo = { tagName: "BODY", isContentEditable: false };

const EDITABLE_TAG_NAMES = ["INPUT", "TEXTAREA", "SELECT"];

const NON_EDITABLE_TAG_NAMES = ["BODY", "BUTTON", "DIV"];

const SEARCH_STATES: BoardSearchState[] = [
  { mounted: true, behindModal: false },
  { mounted: true, behindModal: true },
  { mounted: false, behindModal: false },
  { mounted: false, behindModal: true },
];

const FOCUS_STATES: (FocusedElementInfo | null)[] = [
  null,
  BODY_FOCUS,
  { tagName: "BUTTON", isContentEditable: false },
  { tagName: "INPUT", isContentEditable: false },
  { tagName: "TEXTAREA", isContentEditable: false },
  { tagName: "DIV", isContentEditable: true },
];

function keyEvent(overrides: Partial<ShortcutKeyEvent> = {}): ShortcutKeyEvent {
  return {
    key: SLASH_KEY,
    ctrlKey: false,
    metaKey: false,
    altKey: false,
    shiftKey: false,
    repeat: false,
    isComposing: false,
    defaultPrevented: false,
    ...overrides,
  };
}

function focusOn(tagName: string, isContentEditable = false): FocusedElementInfo {
  return { tagName, isContentEditable };
}

test("F2-AC1 — a plain slash moves focus to the visible board search when no input field is focused", () => {
  expect(shouldFocusBoardSearch(keyEvent(), null, VISIBLE_SEARCH)).toBe(true);
  for (const tagName of NON_EDITABLE_TAG_NAMES) {
    expect(shouldFocusBoardSearch(keyEvent(), focusOn(tagName), VISIBLE_SEARCH)).toBe(true);
  }
});

test("F2-AC2 — a slash typed in an input, textarea (xterm), select or contenteditable element is left alone", () => {
  for (const tagName of EDITABLE_TAG_NAMES) {
    expect(shouldFocusBoardSearch(keyEvent(), focusOn(tagName), VISIBLE_SEARCH)).toBe(false);
  }
  expect(shouldFocusBoardSearch(keyEvent(), focusOn("DIV", true), VISIBLE_SEARCH)).toBe(false);
  expect(shouldFocusBoardSearch(keyEvent(), focusOn("SPAN", true), VISIBLE_SEARCH)).toBe(false);
});

test("F2-AC3 — slash combined with Ctrl, Cmd or Alt is ignored while Shift alone is tolerated", () => {
  expect(shouldFocusBoardSearch(keyEvent({ ctrlKey: true }), BODY_FOCUS, VISIBLE_SEARCH)).toBe(false);
  expect(shouldFocusBoardSearch(keyEvent({ metaKey: true }), BODY_FOCUS, VISIBLE_SEARCH)).toBe(false);
  expect(shouldFocusBoardSearch(keyEvent({ altKey: true }), BODY_FOCUS, VISIBLE_SEARCH)).toBe(false);
  expect(shouldFocusBoardSearch(keyEvent({ shiftKey: true, ctrlKey: true }), BODY_FOCUS, VISIBLE_SEARCH)).toBe(false);
  expect(shouldFocusBoardSearch(keyEvent({ shiftKey: true }), BODY_FOCUS, VISIBLE_SEARCH)).toBe(true);
  expect(shouldFocusBoardSearch(keyEvent({ shiftKey: true, key: QUESTION_MARK_KEY }), BODY_FOCUS, VISIBLE_SEARCH)).toBe(false);
});

test("F2-AC4 — slash does not target the board search while a modal sheet or dialog hides it", () => {
  const behindModal: BoardSearchState = { mounted: true, behindModal: true };
  expect(shouldFocusBoardSearch(keyEvent(), BODY_FOCUS, behindModal)).toBe(false);
  expect(shouldFocusBoardSearch(keyEvent(), null, behindModal)).toBe(false);
  expect(shouldFocusBoardSearch(keyEvent({ shiftKey: true }), focusOn("BUTTON"), behindModal)).toBe(false);
});

test("F2-AC5 — slash is not consumed when the board search is not mounted", () => {
  const unmounted: BoardSearchState = { mounted: false, behindModal: false };
  expect(shouldFocusBoardSearch(keyEvent(), BODY_FOCUS, unmounted)).toBe(false);
  expect(shouldFocusBoardSearch(keyEvent(), null, unmounted)).toBe(false);
  expect(shouldFocusBoardSearch(keyEvent(), BODY_FOCUS, { mounted: false, behindModal: true })).toBe(false);
});

test("F2-AC6 — Escape is never accepted, whatever the focus, search state or modifiers", () => {
  for (const search of SEARCH_STATES) {
    for (const focused of FOCUS_STATES) {
      expect(shouldFocusBoardSearch(keyEvent({ key: ESCAPE_KEY }), focused, search)).toBe(false);
      expect(shouldFocusBoardSearch(keyEvent({ key: ESCAPE_KEY, shiftKey: true }), focused, search)).toBe(false);
      expect(shouldFocusBoardSearch(keyEvent({ key: ESCAPE_KEY, defaultPrevented: true }), focused, search)).toBe(false);
    }
  }
});

test("F2-H2 — repeated keydowns and IME composition are ignored", () => {
  expect(shouldFocusBoardSearch(keyEvent({ repeat: true }), BODY_FOCUS, VISIBLE_SEARCH)).toBe(false);
  expect(shouldFocusBoardSearch(keyEvent({ isComposing: true }), BODY_FOCUS, VISIBLE_SEARCH)).toBe(false);
});

test("F2-H2 — a keydown already defaultPrevented by another handler is ignored", () => {
  expect(shouldFocusBoardSearch(keyEvent({ defaultPrevented: true }), BODY_FOCUS, VISIBLE_SEARCH)).toBe(false);
  expect(shouldFocusBoardSearch(keyEvent({ defaultPrevented: true }), null, VISIBLE_SEARCH)).toBe(false);
});
