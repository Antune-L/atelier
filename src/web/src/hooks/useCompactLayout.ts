import { useSyncExternalStore } from "react";

const COMPACT_QUERY = "(max-width: 639px)";
const subscribe = (notify: () => void): (() => void) => {
  const media = window.matchMedia(COMPACT_QUERY);
  media.addEventListener("change", notify);
  return () => media.removeEventListener("change", notify);
};
const snapshot = (): boolean => window.matchMedia(COMPACT_QUERY).matches;
const serverSnapshot = (): boolean => false;

export function useCompactLayout(): boolean {
  return useSyncExternalStore(subscribe, snapshot, serverSnapshot);
}
