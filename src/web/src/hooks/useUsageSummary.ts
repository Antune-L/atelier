import { useEffect, useState } from "react";

import type { UsagePeriod, UsageSummary } from "@shared/providerUsage";

import { api } from "@/lib/api";

interface UseUsageSummaryResult {
  summary: UsageSummary | null;
  loading: boolean;
  error: string | null;
}

/**
 * Fetches the cost/token summary for a period while `enabled`; refetches when the period,
 * `nonce` or `enabled` changes. A failed refetch keeps the previously displayed summary.
 */
export function useUsageSummary(period: UsagePeriod, nonce: number, enabled: boolean): UseUsageSummaryResult {
  const [summary, setSummary] = useState<UsageSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return;
    }
    let active = true;
    setLoading(true);
    api
      .usageSummary(period)
      .then((data) => {
        if (!active) return;
        setSummary(data);
        setError(null);
      })
      .catch((err: unknown) => {
        if (active) setError(err instanceof Error ? err.message : "échec du chargement");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [period, nonce, enabled]);

  return { summary, loading, error };
}
