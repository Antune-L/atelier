import { useSyncExternalStore } from "react";

const TICK_MS = 60_000;

let currentNow = Date.now();
const subscribers = new Set<() => void>();

let intervalId: ReturnType<typeof setInterval> | null = null;

function startTicking(): void {
  if (intervalId !== null) return;
  intervalId = setInterval(() => {
    currentNow = Date.now();
    for (const cb of subscribers) cb();
  }, TICK_MS);
}

function stopTicking(): void {
  if (subscribers.size > 0 || intervalId === null) return;
  clearInterval(intervalId);
  intervalId = null;
}

function subscribe(cb: () => void): () => void {
  subscribers.add(cb);
  startTicking();
  return () => {
    subscribers.delete(cb);
    stopTicking();
  };
}

function getSnapshot(): number {
  return currentNow;
}

/** Returns `Date.now()` updated every minute via a shared singleton interval. */
export function useTickTimer(): number {
  return useSyncExternalStore(subscribe, getSnapshot);
}
