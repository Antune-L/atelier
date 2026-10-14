import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";

import type { PreviewQualification } from "@shared/preview";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useBusyAction } from "@/hooks/useBusyAction";
import { formatDateTime } from "@/lib/display";
import { errorMessage } from "@/lib/errors";
import { previewApi } from "@/lib/previewApi";
import { PREVIEW_POLL_INTERVAL_MS, PREVIEW_QUALIFICATION_LABELS, PREVIEW_QUALIFICATION_STEP_LABELS, PREVIEW_QUALIFICATION_STEP_STATUS_LABELS, PREVIEW_QUALIFICATION_STEP_VARIANTS, PREVIEW_QUALIFICATION_VARIANTS, PREVIEW_REVISION_LABEL_LENGTH } from "@/lib/previewDisplay";

export function PreviewQualificationPanel({ project, initial, disabled }: { project: string; initial: PreviewQualification | null; disabled: boolean }) {
  const [qualification, setQualification] = useState(initial);
  const { busy, error, setError, run } = useBusyAction();
  const running = qualification?.status === "running";

  useEffect(() => {
    if (!running) return;
    let active = true;
    const interval = window.setInterval(() => {
      void previewApi.projectQualification(project).then((result) => {
        if (active) setQualification(result.qualification);
      }).catch((cause: unknown) => {
        if (active) setError(errorMessage(cause, "Impossible de charger le test de préparation Devin."));
      });
    }, PREVIEW_POLL_INTERVAL_MS);
    return () => { active = false; window.clearInterval(interval); };
  }, [project, running, setError]);

  async function start() {
    await run(async () => {
      const result = await previewApi.qualifyProject(project);
      setQualification(result.qualification);
    }, "Impossible de lancer le test de préparation Devin.");
  }

  return (
    <div className="space-y-2 rounded-md border border-border p-3 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="space-y-1">
          <p className="font-medium">Préparation Devin</p>
          <p className="text-xs text-muted-foreground">Déploie la branche de base, vérifie la santé, l'authentification et les WebSockets, puis supprime la prévisualisation.</p>
        </div>
        <Button variant="outline" size="sm" disabled={disabled || busy || running} onClick={() => void start()}>
          {(busy || running) && <Loader2 className="size-3.5 animate-spin" />}Tester la préparation Devin
        </Button>
      </div>
      {error && <p role="alert" className="text-xs text-danger">{error}</p>}
      {qualification !== null && (
        <div role="status" className="space-y-2">
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <Badge variant={PREVIEW_QUALIFICATION_VARIANTS[qualification.status]}>{PREVIEW_QUALIFICATION_LABELS[qualification.status]}</Badge>
            <span>{formatDateTime(qualification.finishedAt ?? qualification.startedAt)}</span>
            <span>Branche <span className="font-mono">{qualification.branch}</span>{qualification.revision !== null && <> · commit <span className="font-mono">{qualification.revision.slice(0, PREVIEW_REVISION_LABEL_LENGTH)}</span></>}</span>
          </div>
          {qualification.error && <p className="break-words text-xs text-danger">{qualification.error}</p>}
          <details>
            <summary className="cursor-pointer text-xs font-medium">Détail des vérifications</summary>
          <ul className="mt-3 space-y-1.5">
            {qualification.steps.map((step) => (
              <li key={step.id} className="space-y-0.5">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={PREVIEW_QUALIFICATION_STEP_VARIANTS[step.status]}>{PREVIEW_QUALIFICATION_STEP_STATUS_LABELS[step.status]}</Badge>
                  <span className="text-xs">{PREVIEW_QUALIFICATION_STEP_LABELS[step.id]}</span>
                </div>
                {step.detail && <p className="whitespace-pre-wrap break-words text-xs text-muted-foreground">{step.detail}</p>}
              </li>
            ))}
          </ul>
          </details>
        </div>
      )}
    </div>
  );
}
