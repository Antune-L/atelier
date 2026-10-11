import { useCallback, useEffect, useState } from "react";

import type { GithubAccountSummary } from "@shared/github";

import { api } from "@/lib/api";
import { errorMessage } from "@/lib/errors";

interface GithubAccountsState {
  accounts: GithubAccountSummary[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

/** Registered GitHub accounts (login + status + attached projects), refreshed on demand. */
export function useGithubAccounts(): GithubAccountsState {
  const [accounts, setAccounts] = useState<GithubAccountSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async (): Promise<void> => {
    setLoading(true);
    try {
      setAccounts(await api.githubAccounts());
      setError(null);
    } catch (cause) {
      setError(errorMessage(cause, "Impossible de charger les comptes GitHub"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { accounts, loading, error, refresh };
}
