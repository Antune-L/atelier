import { useEffect, useRef, useState } from "react";

/** How long the "Enregistré" confirmation stays visible after a successful save. */
export const SAVED_FEEDBACK_MS = 2_000;

interface SavedFlash<T> {
  savedValue: T | null;
  flashSaved: (value: T) => void;
}

/** Latches which item was just saved, clearing it after SAVED_FEEDBACK_MS and on unmount. */
export function useSavedFlash<T>(): SavedFlash<T> {
  const [savedValue, setSavedValue] = useState<T | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timer.current !== null) clearTimeout(timer.current);
    },
    [],
  );

  const flashSaved = (value: T): void => {
    if (timer.current !== null) clearTimeout(timer.current);
    setSavedValue(value);
    timer.current = setTimeout(() => setSavedValue(null), SAVED_FEEDBACK_MS);
  };

  return { savedValue, flashSaved };
}

interface SavedFlag {
  saved: boolean;
  flashSaved: () => void;
}

/** Single-target variant for a panel that only ever saves the item it is editing. */
export function useSavedFlag(): SavedFlag {
  const { savedValue, flashSaved } = useSavedFlash<true>();
  return { saved: savedValue === true, flashSaved: () => flashSaved(true) };
}
