import { useEffect, useSyncExternalStore } from "react";

import type { UsagePeriod, UsageScope, UsageSummary } from "@shared/providerUsage";

import { api } from "@/lib/api";

interface UsageSummarySnapshot {
  summary: UsageSummary | null;
  loading: boolean;
  error: string | null;
}

interface UseUsageSummaryResult extends UsageSummarySnapshot {
  refresh: () => void;
}

interface UsageSummaryEntry {
  snapshot: UsageSummarySnapshot;
  pending: Promise<void> | null;
}

const EMPTY_SNAPSHOT: UsageSummarySnapshot = { summary: null, loading: false, error: null };
const summaries = new Map<string, UsageSummaryEntry>();
const listeners = new Set<() => void>();

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

function notify(): void {
  for (const listener of listeners) listener();
}

function summaryKey(period: UsagePeriod, scope: UsageScope): string {
  return `${period}:${scope}`;
}

function refreshSummary(period: UsagePeriod, scope: UsageScope): void {
  const key = summaryKey(period, scope);
  let entry = summaries.get(key);
  if (entry === undefined) {
    entry = { snapshot: EMPTY_SNAPSHOT, pending: null };
    summaries.set(key, entry);
  }
  if (entry.pending !== null) return;

  const current = entry;
  current.snapshot = { ...current.snapshot, loading: true, error: null };
  current.pending = api.usageSummary(period, scope)
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

export function useUsageSummary(period: UsagePeriod, scope: UsageScope, enabled: boolean): UseUsageSummaryResult {
  const snapshot = useSyncExternalStore(subscribe, () => summaries.get(summaryKey(period, scope))?.snapshot ?? EMPTY_SNAPSHOT);

  useEffect(() => {
    if (enabled) refreshSummary(period, scope);
  }, [period, scope, enabled]);

  return { ...snapshot, loading: enabled && snapshot.loading, refresh: () => refreshSummary(period, scope) };
}
