import { useEffect, useState } from "react";

import type { AuditFinding, AuditOverview, AuditRun, AuditRunDetail } from "@shared/audit";

import { api } from "@/lib/api";
import { errorMessage } from "@/lib/errors";

interface LoadedDetail {
  runId: string;
  detail: AuditRunDetail | null;
  error: string | null;
}

export interface AuditRunDetailState {
  detail: AuditRunDetail | null;
  loading: boolean;
  error: string | null;
  replaceFinding: (finding: AuditFinding) => void;
}

/** Stable identity of a run summary, ignoring the progress ticks pushed during the run. */
function runVersion(run: AuditRun | null): string | null {
  if (run === null) return null;
  return JSON.stringify({ ...run, progress: null });
}

function recheckingToken(detail: AuditRunDetail | null, overview: AuditOverview): string {
  if (detail === null) return "";
  const rechecking = new Set(overview.rechecking);
  return detail.findings.filter((finding) => rechecking.has(finding.id)).map((finding) => finding.id).sort().join(",");
}

/**
 * Loads the findings of the selected run over REST. Refetches when the run summary changes in the
 * overview, and when a re-verification of one of its findings starts or ends.
 */
export function useAuditRunDetail(run: AuditRun | null, overview: AuditOverview): AuditRunDetailState {
  const [loaded, setLoaded] = useState<LoadedDetail | null>(null);
  const runId = run?.id ?? null;
  const version = runVersion(run);
  const current = loaded !== null && loaded.runId === runId ? loaded : null;
  const recheckToken = recheckingToken(current?.detail ?? null, overview);

  useEffect(() => {
    if (runId === null) return;
    const controller = new AbortController();
    api.auditRun(runId, controller.signal).then(
      (detail) => setLoaded({ runId, detail, error: null }),
      (cause: unknown) => {
        if (controller.signal.aborted) return;
        setLoaded((previous) => ({
          runId,
          detail: previous?.runId === runId ? previous.detail : null,
          error: errorMessage(cause, "Impossible de charger le détail de l'audit."),
        }));
      },
    );
    return () => controller.abort();
  }, [runId, version, recheckToken]);

  const replaceFinding = (finding: AuditFinding): void => {
    setLoaded((previous) => {
      if (previous?.detail == null) return previous;
      const findings = previous.detail.findings.map((known) => (known.id === finding.id ? finding : known));
      return { ...previous, detail: { ...previous.detail, findings } };
    });
  };

  return {
    detail: current?.detail ?? null,
    loading: runId !== null && current === null,
    error: current?.error ?? null,
    replaceFinding,
  };
}
