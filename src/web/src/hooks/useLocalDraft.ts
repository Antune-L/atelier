import { useState } from "react";
import type { ZodType } from "zod";

const DRAFT_KEY_PREFIX = "draft:";

function readDraft(storageKey: string, initialValue = ""): string {
  try {
    return window.localStorage.getItem(storageKey) ?? initialValue;
  } catch {
    return initialValue;
  }
}

function writeDraft(storageKey: string, raw: string): void {
  try {
    window.localStorage.setItem(storageKey, raw);
  } catch {
    return;
  }
}

function removeDraft(storageKey: string): void {
  try {
    window.localStorage.removeItem(storageKey);
  } catch {
    return;
  }
}

type DraftUpdate = string | ((prev: string) => string);

/**
 * Raw draft storage with a render-phase reset when the key changes, so a component that
 * survives a ticket switch never shows the previous key's draft.
 */
function useDraftStorage(
  key: string,
  initialValue = "",
): [raw: string, setRaw: (next: DraftUpdate) => void, clear: () => void] {
  const storageKey = `${DRAFT_KEY_PREFIX}${key}`;
  const [loadedKey, setLoadedKey] = useState(storageKey);
  const [raw, setRawState] = useState<string>(() => readDraft(storageKey, initialValue));

  if (loadedKey !== storageKey) {
    setLoadedKey(storageKey);
    setRawState(readDraft(storageKey, initialValue));
  }

  const setRaw = (next: DraftUpdate): void => {
    setRawState((prev) => {
      const value = typeof next === "function" ? next(prev) : next;
      writeDraft(storageKey, value);
      return value;
    });
  };

  const clear = (): void => {
    setRawState("");
    removeDraft(storageKey);
  };

  return [raw, setRaw, clear];
}

/** Text kept in localStorage under `draft:<key>` so closing a sheet never loses what the user typed. */
export function useLocalDraft(
  key: string,
  initialValue = "",
): [value: string, setValue: (next: DraftUpdate) => void, clear: () => void] {
  return useDraftStorage(key, initialValue);
}

/** One `draft:<key>` text per key, reset in render when the key list changes. */
export function useLocalDraftList(
  keys: string[],
  initialValues: string[],
): [values: string[], setValueAt: (index: number, value: string) => void] {
  const storageKeys = keys.map((key) => `${DRAFT_KEY_PREFIX}${key}`);
  const joinedKeys = storageKeys.join("\n");
  const read = (): string[] => storageKeys.map((storageKey, index) => readDraft(storageKey, initialValues[index] ?? ""));
  const [loadedKeys, setLoadedKeys] = useState(joinedKeys);
  const [values, setValues] = useState<string[]>(read);

  if (loadedKeys !== joinedKeys) {
    setLoadedKeys(joinedKeys);
    setValues(read());
  }

  const setValueAt = (index: number, value: string): void => {
    const storageKey = storageKeys[index];
    if (storageKey === undefined) return;
    writeDraft(storageKey, value);
    setValues((prev) => prev.map((current, position) => position === index ? value : current));
  };

  return [values, setValueAt];
}

/** Structured draft (JSON) validated by `schema` on read; an invalid or missing draft yields `empty`. */
export function useLocalJsonDraft<T>(
  key: string,
  schema: ZodType<T>,
  empty: T,
): [value: T, setValue: (next: T) => void, clear: () => void] {
  const [raw, setRaw, clear] = useDraftStorage(key);

  const parsed = raw === "" ? null : schema.safeParse(parseJson(raw));
  const value = parsed?.success ? parsed.data : empty;

  const setValue = (next: T): void => {
    setRaw(JSON.stringify(next));
  };

  return [value, setValue, clear];
}

function parseJson(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}
