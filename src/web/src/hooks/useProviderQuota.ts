import { useEffect, useState } from "react";

import type { ProviderQuota, QuotaProvider } from "@shared/providerQuota";

import { api } from "@/lib/api";
import { timeoutQuota } from "@/lib/usageDisplay";

/** Client-side safety net above the server's own 15 s bound. */
const CLIENT_TIMEOUT_MS = 20_000;

interface UseProviderQuotaResult {
  quota: ProviderQuota | null;
  loading: boolean;
  error: string | null;
}

/** Reads one provider's quota on mount and whenever `nonce` changes; independent per provider. */
export function useProviderQuota(provider: QuotaProvider, nonce: number): UseProviderQuotaResult {
  const [quota, setQuota] = useState<ProviderQuota | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    let timedOut = false;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, CLIENT_TIMEOUT_MS);
    setLoading(true);
    setError(null);
    api
      .usageLimits(provider, controller.signal)
      .then((data) => {
        if (active) setQuota(data);
      })
      .catch((err: unknown) => {
        if (!active) return;
        if (timedOut) setQuota(timeoutQuota(provider));
        else setError(err instanceof Error ? err.message : "échec du chargement");
      })
      .finally(() => {
        clearTimeout(timer);
        if (active) setLoading(false);
      });
    return () => {
      active = false;
      clearTimeout(timer);
      controller.abort();
    };
  }, [provider, nonce]);

  return { quota, loading, error };
}
