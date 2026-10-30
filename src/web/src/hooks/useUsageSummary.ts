import { useEffect, useSyncExternalStore } from "react";

import type { UsagePeriod, UsageSummary } from "@shared/providerUsage";

import { api } from "@/lib/api";

interface UseUsageSummaryResult {
  summary: UsageSummary | null;
  loading: boolean;
  error: string | null;
}

interface UsageSummaryEntry {
  snapshot: UseUsageSummaryResult;
  pending: Promise<void> | null;
}

const EMPTY_SNAPSHOT: UseUsageSummaryResult = { summary: null, loading: false, error: null };
const summaries = new Map<UsagePeriod, UsageSummaryEntry>();
const listeners = new Set<() => void>();

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

function notify(): void {
  for (const listener of listeners) listener();
}

function refreshSummary(period: UsagePeriod): void {
  let entry = summaries.get(period);
  if (entry === undefined) {
    entry = { snapshot: EMPTY_SNAPSHOT, pending: null };
    summaries.set(period, entry);
  }
  if (entry.pending !== null) return;

  const current = entry;
  current.snapshot = { ...current.snapshot, loading: true, error: null };
  current.pending = api.usageSummary(period)
    .then((summary) => {
      current.snapshot = { summary, loading: false, error: null };
    })
    .catch((err: unknown) => {
      current.snapshot = { ...current.snapshot, loading: false, error: err instanceof Error ? err.message : "échec du chargement" };
    })
    .finally(() => {
      current.pending = null;
      notify();
    });
  notify();
}

export function useUsageSummary(period: UsagePeriod, nonce: number, enabled: boolean): UseUsageSummaryResult {
  const snapshot = useSyncExternalStore(subscribe, () => summaries.get(period)?.snapshot ?? EMPTY_SNAPSHOT);

  useEffect(() => {
    if (enabled) refreshSummary(period);
  }, [period, nonce, enabled]);

  return { ...snapshot, loading: enabled && snapshot.loading };
}
