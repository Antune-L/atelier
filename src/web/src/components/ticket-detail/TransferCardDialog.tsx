import { useState } from "react";

import { CARD_TRANSFER_BOARD_LABELS } from "@shared/cardTransfer";
import type { Ticket } from "@shared/schemas";
import { isRemoteTicket } from "@shared/startBlocker";
import { VPS_ANALYSIS_MODES } from "@shared/vpsBridge";
import type { BoardProject, VpsAnalysisMode } from "@shared/vpsBridge";

import { boardProjectOptionLabel } from "@/components/BoardTargetSelect";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Label } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useKeyedLoad } from "@/hooks/useKeyedLoad";
import { api } from "@/lib/api";
import { errorMessage } from "@/lib/errors";
import { FIELD_LABEL_CLASSES } from "@/lib/overlayStyles";

const MAC_PROJECTS_LOAD_KEY = "mac-projects";
const VPS_PROJECTS_LOAD_KEY = "vps-projects";

const ANALYSIS_LABELS: Record<VpsAnalysisMode, string> = {
  none: "Ne pas analyser",
  analyze: "Lancer l’analyse automatique sur le VPS",
};

interface TransferCardDialogProps {
  ticket: Ticket;
  cloudHost: boolean;
  onClose: () => void;
}

async function loadTargetProjects(cloudHost: boolean): Promise<BoardProject[]> {
  if (!cloudHost) return api.vpsProjects();
  const state = await api.macOutbox();
  return state.catalogue?.projects ?? [];
}

function isAnalysisMode(value: string): value is VpsAnalysisMode {
  return VPS_ANALYSIS_MODES.some((mode) => mode === value);
}

export function TransferCardDialog({ ticket, cloudHost, onClose }: TransferCardDialogProps) {
  const board = CARD_TRANSFER_BOARD_LABELS[cloudHost ? "mac" : "vps"];
  const remote = isRemoteTicket(ticket);
  const offersAnalysis = !cloudHost && !remote;
  const { data: projects, error: projectsError, reload: reloadProjects } = useKeyedLoad<BoardProject[]>(cloudHost ? MAC_PROJECTS_LOAD_KEY : VPS_PROJECTS_LOAD_KEY, () => loadTargetProjects(cloudHost));
  const [projectChoice, setProjectChoice] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<VpsAnalysisMode>("none");
  const [clientId] = useState(() => crypto.randomUUID());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const preselected = projects?.find((candidate) => candidate.key === ticket.project)?.key ?? projects?.[0]?.key ?? "";
  const project = projects?.find((candidate) => candidate.key === projectChoice)?.key ?? preselected;

  const submit = (): void => {
    setError(null);
    setBusy(true);
    const sent = cloudHost
      ? api.transferTicketToMac(ticket.id, { clientId, project })
      : api.transferTicketToVps(ticket.id, { clientId, project, analysis: offersAnalysis ? analysis : "none" });
    void sent
      .then(onClose)
      .catch((e) => setError(errorMessage(e)))
      .finally(() => setBusy(false));
  };

  return (
    <Dialog
      open
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
      title="Envoyer vers l'autre board"
      description={`La carte est recréée dans « À faire » sur le board ${board} et celle-ci passe dans Abandonnés. Elle revient ici dans « À faire » si le ${board} la refuse.`}
      footer={
        <>
          <Button size="sm" variant="ghost" onClick={onClose}>Annuler</Button>
          <Button size="sm" disabled={busy || project === ""} onClick={submit}>
            {busy ? "Envoi…" : `Envoyer vers le ${board}`}
          </Button>
        </>
      }
    >
      <div className="space-y-1.5">
        <Label htmlFor="transfer-project" className={FIELD_LABEL_CLASSES}>Projet du {board}</Label>
        {projectsError === null ? (
          <Select id="transfer-project" value={project} onChange={(e) => setProjectChoice(e.target.value)} disabled={projects === null} className="w-full">
            {projects === null && <option value="">Chargement des projets du {board}…</option>}
            {projects?.length === 0 && <option value="">Aucun projet sur le {board}</option>}
            {projects?.map((candidate) => (
              <option key={candidate.key} value={candidate.key}>
                {boardProjectOptionLabel(candidate)}
              </option>
            ))}
          </Select>
        ) : (
          <div className="flex flex-wrap items-center gap-2">
            <p role="alert" className="text-xs text-danger">Projets du {board} indisponibles : {projectsError}</p>
            <Button type="button" size="sm" variant="outline" onClick={reloadProjects}>Réessayer</Button>
          </div>
        )}
      </div>
      {offersAnalysis && (
        <div className="space-y-1.5">
          <Label htmlFor="transfer-analysis" className={FIELD_LABEL_CLASSES}>Analyse sur le VPS</Label>
          <Select
            id="transfer-analysis"
            value={analysis}
            onChange={(e) => {
              if (isAnalysisMode(e.target.value)) setAnalysis(e.target.value);
            }}
            className="w-full"
          >
            {VPS_ANALYSIS_MODES.map((mode) => (
              <option key={mode} value={mode}>{ANALYSIS_LABELS[mode]}</option>
            ))}
          </Select>
        </div>
      )}
      {remote && (
        <p className="text-xs text-muted-foreground">
          Cette carte vient de l’autre board : votre envoi vaut approbation, et aucune analyse n’est lancée à l’arrivée.
        </p>
      )}
      <p className="rounded-md border border-border bg-muted/30 p-3 text-xs text-warning">
        Seuls le titre et la description sont envoyés. Les dépendances, l’analyse, les commentaires, les images et pièces jointes, les agents et les réglages de la carte restent sur ce board.
      </p>
      {error && <p role="alert" className="text-sm text-danger">{error}</p>}
    </Dialog>
  );
}
