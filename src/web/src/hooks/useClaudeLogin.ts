import { useCallback, useEffect, useRef, useState } from "react";

import { isClaudeLoginActive } from "@shared/claudeLogin";
import type { ClaudeLoginStatus } from "@shared/claudeLogin";

import { api } from "@/lib/api";

/** Status polling cadence while a login flow runs (URL appearing, code being verified). */
const POLL_MS = 1_500;

interface UseClaudeLoginResult {
  status: ClaudeLoginStatus | null;
  pending: boolean;
  error: string | null;
  start: () => void;
  submit: (code: string) => void;
  cancel: () => void;
}

/** In-app `claude auth login` flow; `onSuccess` fires once when a flow ends in success. */
export function useClaudeLogin(onSuccess: (status: ClaudeLoginStatus) => void): UseClaudeLoginResult {
  const [status, setStatus] = useState<ClaudeLoginStatus | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const previousState = useRef<ClaudeLoginStatus["state"] | null>(null);
  const onSuccessRef = useRef(onSuccess);
  onSuccessRef.current = onSuccess;

  const apply = useCallback((next: ClaudeLoginStatus) => {
    const before = previousState.current;
    previousState.current = next.state;
    setStatus(next);
    if (next.state === "success" && before !== null && before !== "success") onSuccessRef.current(next);
  }, []);

  const run = useCallback((action: () => Promise<ClaudeLoginStatus>) => {
    setPending(true);
    setError(null);
    action()
      .then(apply)
      .catch((err: unknown) => setError(err instanceof Error ? err.message : "échec de la connexion"))
      .finally(() => setPending(false));
  }, [apply]);

  useEffect(() => {
    let active = true;
    api.claudeLoginStatus().then((next) => {
      if (!active) return;
      previousState.current = next.state;
      setStatus(next);
    }).catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  const polling = status !== null && isClaudeLoginActive(status.state);
  useEffect(() => {
    if (!polling) return;
    const id = setInterval(() => {
      api.claudeLoginStatus().then(apply).catch(() => {});
    }, POLL_MS);
    return () => clearInterval(id);
  }, [polling, apply]);

  return {
    status,
    pending,
    error,
    start: () => run(() => api.startClaudeLogin()),
    submit: (code: string) => run(() => api.submitClaudeLoginCode(code)),
    cancel: () => run(() => api.cancelClaudeLogin()),
  };
}
