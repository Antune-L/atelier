import { useState } from "react";

import { errorMessage } from "@/lib/errors";

export interface BusyAction {
  busy: boolean;
  error: string | null;
  setError: (error: string | null) => void;
  run: (action: () => Promise<unknown>, fallback: string) => Promise<boolean>;
}

/** Runs one async action at a time, exposing its pending flag and last error; resolves true on success. */
export function useBusyAction(): BusyAction {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async (action: () => Promise<unknown>, fallback: string): Promise<boolean> => {
    setBusy(true);
    setError(null);
    try {
      await action();
      return true;
    } catch (e) {
      setError(errorMessage(e, fallback));
      return false;
    } finally {
      setBusy(false);
    }
  };

  return { busy, error, setError, run };
}
