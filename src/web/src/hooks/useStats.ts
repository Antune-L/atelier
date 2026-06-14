import { useEffect, useState } from "react";

import type { StatRecord } from "@shared/schemas";

import { api } from "@/lib/api";

interface UseStatsResult {
  records: StatRecord[];
  loading: boolean;
  error: string | null;
  reload: () => void;
}

/** Fetches the full stat-record history once on mount; exposes a manual reload. */
export function useStats(): UseStatsResult {
  const [records, setRecords] = useState<StatRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    api
      .stats()
      .then((data) => {
        if (active) setRecords(data);
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
  }, [nonce]);

  return { records, loading, error, reload: () => setNonce((n) => n + 1) };
}
