import { useCallback, useEffect, useRef, useState } from "react";

import type { PreviewReadiness } from "@shared/preview";

import { errorMessage } from "@/lib/errors";
import { previewApi } from "@/lib/previewApi";

const READINESS_DEBOUNCE_MS = 300;

export function usePreviewReadiness(project: string, branch?: string) {
  const [readiness, setReadiness] = useState<PreviewReadiness | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const requestVersion = useRef(0);
  const selectionKey = `${project}:${branch ?? ""}`;
  const currentKey = useRef(selectionKey);
  currentKey.current = selectionKey;

  const refresh = useCallback(async () => {
    if (!project || branch === "") return;
    const version = ++requestVersion.current;
    setLoading(true);
    setError(null);
    try {
      const result = await previewApi.projectReadiness(project, branch);
      if (currentKey.current === selectionKey && version === requestVersion.current) setReadiness(result.readiness);
    } catch (cause) {
      if (currentKey.current === selectionKey && version === requestVersion.current) {
        setError(errorMessage(cause, "Impossible de vérifier la préparation du projet."));
      }
    } finally {
      if (currentKey.current === selectionKey && version === requestVersion.current) setLoading(false);
    }
  }, [project, branch, selectionKey]);

  useEffect(() => {
    setReadiness(null);
    setError(null);
    setLoading(Boolean(project) && branch !== "");
    const timeout = window.setTimeout(() => void refresh(), READINESS_DEBOUNCE_MS);
    return () => {
      window.clearTimeout(timeout);
      requestVersion.current += 1;
    };
  }, [project, branch, refresh]);

  function accept(next: PreviewReadiness) {
    requestVersion.current += 1;
    setReadiness(next);
    setError(null);
    setLoading(false);
  }

  return { readiness, loading, error, refresh, accept };
}
