import { useEffect, useState } from "react";

import type { UsagePeriod, UsageSummary } from "@shared/providerUsage";

import { api } from "@/lib/api";

interface UseUsageSummaryResult {
  summary: UsageSummary | null;
  loading: boolean;
  error: string | null;
}

/** Fetches the cost/token summary for a period; refetches when the period or `nonce` changes. */
export function useUsageSummary(period: UsagePeriod, nonce: number): UseUsageSummaryResult {
  const [summary, setSummary] = useState<UsageSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    api
      .usageSummary(period)
      .then((data) => {
        if (active) setSummary(data);
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
  }, [period, nonce]);

  return { summary, loading, error };
}
