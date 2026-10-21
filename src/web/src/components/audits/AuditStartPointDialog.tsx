import { Loader2 } from "lucide-react";
import { useId, useState } from "react";

import { auditSetStartInputSchema } from "@shared/audit";

import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input, Label } from "@/components/ui/input";
import { useBusyAction } from "@/hooks/useBusyAction";
import { api } from "@/lib/api";
import { boardStore } from "@/lib/store";
import { FIELD_LABEL_CLASSES } from "@/lib/overlayStyles";

interface AuditStartPointDialogProps {
  project: string | null;
  projectLabel: string;
  onClose: () => void;
}

/** After a force-push, the user picks the commit the next audit resumes from. */
export function AuditStartPointDialog({ project, projectLabel, onClose }: AuditStartPointDialogProps) {
  const fieldId = useId();
  const [sha, setSha] = useState("");
  const { busy, error, run } = useBusyAction();
  const parsed = auditSetStartInputSchema.safeParse({ sha: sha.trim().toLowerCase() });

  const submit = async (): Promise<void> => {
    if (project === null || !parsed.success) return;
    const ok = await run(() => api.setProjectAuditStart(project, parsed.data), "Impossible d'enregistrer le point de départ.");
    if (!ok) return;
    boardStore.notify("Point de départ enregistré", `Le prochain audit de ${projectLabel} reprendra à ${parsed.data.sha}.`);
    setSha("");
    onClose();
  };

  return (
    <Dialog
      open={project !== null}
      onOpenChange={(open) => { if (!open) onClose(); }}
      size="sm"
      blocking={busy}
      title="Choisir le point de départ"
      description={`L'historique de ${projectLabel} a été réécrit. Le prochain audit relira les commits fusionnés après celui-ci.`}
      footer={
        <>
          <Button size="sm" variant="ghost" disabled={busy} onClick={onClose}>Annuler</Button>
          <Button size="sm" disabled={busy || !parsed.success} onClick={() => void submit()}>
            {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Enregistrer
          </Button>
        </>
      }
    >
      <div className="space-y-1.5">
        <Label htmlFor={fieldId} className={FIELD_LABEL_CLASSES}>Commit (SHA)</Label>
        <Input id={fieldId} value={sha} onChange={(event) => setSha(event.target.value)} placeholder="7dcfef5" className="font-mono" />
        {sha.trim() !== "" && !parsed.success && <p className="text-xs text-danger">Indiquez un SHA de 7 à 40 caractères hexadécimaux.</p>}
      </div>
      {error && <p role="alert" className="text-xs text-danger">{error}</p>}
    </Dialog>
  );
}
