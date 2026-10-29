import { useEffect, useRef, useState } from "react";

import type { ProviderQuota, QuotaProvider } from "@shared/providerQuota";

import { api } from "@/lib/api";
import { failedRevalidation } from "@/lib/usageDisplay";

/** Client-side safety net above the server's own 15 s bound. */
const CLIENT_TIMEOUT_MS = 20_000;

interface UseProviderQuotaResult {
  quota: ProviderQuota | null;
  loading: boolean;
  error: string | null;
}

class ClientTimeoutError extends Error {}

/**
 * Shows the last known quota immediately, then revalidates it with a live read on mount
 * and whenever `nonce` changes (a non-zero nonce forces the read past the server's gate).
 */
export function useProviderQuota(provider: QuotaProvider, nonce: number): UseProviderQuotaResult {
  const [quota, setQuota] = useState<ProviderQuota | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Mirrors the displayed quota so the effect can merge failures without depending on it.
  const quotaRef = useRef<ProviderQuota | null>(null);

  useEffect(() => {
    let active = true;
    let liveResolved = false;
    const show = (next: ProviderQuota | null): void => {
      quotaRef.current = next;
      setQuota(next);
    };

    if (quotaRef.current === null) {
      api
        .usageLastLimits(provider)
        .then((last) => {
          if (active && !liveResolved && last !== null && quotaRef.current === null) show(last);
        })
        .catch(() => {
          // The last known quota is best effort; the live read reports failures.
        });
    }

    let timer: ReturnType<typeof setTimeout> | undefined;
    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new ClientTimeoutError()), CLIENT_TIMEOUT_MS);
    });
    setLoading(true);
    Promise.race([api.usageLimits(provider, { fresh: nonce > 0 }), timeout])
      .then((data) => {
        liveResolved = true;
        if (!active) return;
        show(data);
        setError(null);
      })
      .catch((err: unknown) => {
        liveResolved = true;
        if (!active) return;
        const state = err instanceof ClientTimeoutError ? "timeout" : "error";
        const message = err instanceof Error && err.message !== "" ? err.message : "échec du chargement";
        const next = failedRevalidation(quotaRef.current, provider, state, message);
        show(next.quota);
        setError(next.error);
      })
      .finally(() => {
        clearTimeout(timer);
        if (active) setLoading(false);
      });
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [provider, nonce]);

  return { quota, loading, error };
}
