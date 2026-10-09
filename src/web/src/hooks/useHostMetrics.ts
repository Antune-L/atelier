import { useSyncExternalStore } from "react";

import type { HostMetrics } from "@shared/types";
import { api } from "@/lib/api";

const REFRESH_INTERVAL_MS = 5_000;
const subscribers = new Set<() => void>();
let snapshot: HostMetrics | null = null;
let pending = false;
let intervalId: ReturnType<typeof setInterval> | null = null;

function publish(next: HostMetrics | null): void {
  snapshot = next;
  for (const notify of subscribers) notify();
}

function stopRefreshing(): void {
  if (intervalId !== null) clearInterval(intervalId);
  intervalId = null;
}

async function loadHostMetrics(): Promise<void> {
  if (pending) return;
  pending = true;
  try {
    const metrics = await api.hostMetrics();
    publish(metrics);
    // A null answer means a non-cloud host (or unreadable /proc): the role never changes at runtime.
    if (metrics === null) stopRefreshing();
  } catch {
    publish(null);
  } finally {
    pending = false;
  }
}

function subscribe(notify: () => void): () => void {
  subscribers.add(notify);
  if (subscribers.size === 1) {
    intervalId = setInterval(() => { void loadHostMetrics(); }, REFRESH_INTERVAL_MS);
    void loadHostMetrics();
  }
  return () => {
    subscribers.delete(notify);
    if (subscribers.size === 0) stopRefreshing();
  };
}

function getSnapshot(): HostMetrics | null {
  return snapshot;
}

export function useHostMetrics(): HostMetrics | null {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
