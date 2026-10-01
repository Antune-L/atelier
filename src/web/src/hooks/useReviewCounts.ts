import { useSyncExternalStore } from "react";

import { api } from "@/lib/api";
import { boardStore } from "@/lib/store";

export interface ReviewCountSnapshot {
  counts: Record<string, number | null>;
  loading: boolean;
  checkedAt: number | null;
}

const REFRESH_INTERVAL_MS = 60_000;
const REVIEW_KIND = "review";
const INITIAL_SNAPSHOT: ReviewCountSnapshot = { counts: {}, loading: true, checkedAt: null };
const subscribers = new Set<() => void>();
let snapshot = INITIAL_SNAPSHOT;
let pending: Promise<void> | null = null;
let loadRequested = false;
let forceRequested = false;
let intervalId: ReturnType<typeof setInterval> | null = null;
let unsubscribeBoard: (() => void) | null = null;

function publish(next: ReviewCountSnapshot): void {
  snapshot = next;
  for (const notify of subscribers) notify();
}

function loadReviewCounts(refresh: boolean): Promise<void> {
  loadRequested = true;
  forceRequested ||= refresh;
  if (pending) return pending;

  pending = Promise.resolve().then(async () => {
    try {
      while (loadRequested) {
        const force = forceRequested;
        loadRequested = false;
        forceRequested = false;
        publish({ ...snapshot, loading: true });
        try {
          const { counts, checkedAt } = await api.projectReviewCounts(force);
          publish({ counts, checkedAt, loading: false });
        } catch {
          publish({ ...snapshot, counts: {}, loading: false });
        }
      }
    } finally {
      pending = null;
    }
  });
  return pending;
}

function reviewIdentity(): string {
  return JSON.stringify(boardStore.getSnapshot().tickets
    .filter((ticket) => ticket.kind === REVIEW_KIND)
    .map((ticket) => [ticket.id, ticket.column, ticket.stage, ticket.postComments]));
}

function startRefreshing(): void {
  let identity = reviewIdentity();
  let connected = boardStore.getSnapshot().connected;
  unsubscribeBoard = boardStore.subscribe(() => {
    const nextIdentity = reviewIdentity();
    const nextConnected = boardStore.getSnapshot().connected;
    const changed = identity !== nextIdentity || (!connected && nextConnected);
    identity = nextIdentity;
    connected = nextConnected;
    if (changed) void loadReviewCounts(false);
  });
  intervalId = setInterval(() => { void loadReviewCounts(false); }, REFRESH_INTERVAL_MS);
  void loadReviewCounts(false);
}

function subscribe(notify: () => void): () => void {
  subscribers.add(notify);
  if (subscribers.size === 1) startRefreshing();
  return () => {
    subscribers.delete(notify);
    if (subscribers.size !== 0) return;
    if (intervalId !== null) clearInterval(intervalId);
    intervalId = null;
    unsubscribeBoard?.();
    unsubscribeBoard = null;
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
