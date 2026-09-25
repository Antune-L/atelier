import { useSyncExternalStore } from "react";

import { api } from "@/lib/api";

export interface ReviewCountSnapshot {
  counts: Record<string, number | null>;
  loading: boolean;
}

const INITIAL_SNAPSHOT: ReviewCountSnapshot = { counts: {}, loading: true };
const subscribers = new Set<() => void>();
let snapshot = INITIAL_SNAPSHOT;
let pending: Promise<void> | null = null;

function publish(next: ReviewCountSnapshot): void {
  snapshot = next;
  for (const notify of subscribers) notify();
}

function loadReviewCounts(refresh: boolean): Promise<void> {
  if (pending) return pending;

  publish({ counts: snapshot.counts, loading: true });
  pending = api.projectReviewCounts(refresh)
    .then(({ counts }) => {
      publish({ counts, loading: false });
    })
    .catch(() => {
      publish({ counts: {}, loading: false });
    })
    .finally(() => {
      pending = null;
    });
  return pending;
}

function subscribe(notify: () => void): () => void {
  subscribers.add(notify);
  if (subscribers.size === 1) void loadReviewCounts(false);
  return () => {
    subscribers.delete(notify);
  };
}

function getSnapshot(): ReviewCountSnapshot {
  return snapshot;
}

export function refreshReviewCounts(): Promise<void> {
  return loadReviewCounts(true);
}

export function useReviewCounts(): ReviewCountSnapshot {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
