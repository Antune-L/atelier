import { useState } from "react";

import type { AutonomousWorkspaces } from "@shared/autonomous";

import { RecoveryLink } from "@/components/ticket-detail/AutonomousResumeSection";
import { Dialog } from "@/components/ui/dialog";
import { Input, Label } from "@/components/ui/input";
import { api } from "@/lib/api";
import { formatQualityMessage, qualityErrorMessage } from "@/lib/qualityMessages";

const WORKSPACE_STATUS_LABELS = { retained: "Espace enfant conservé", archived: "Travail enfant archivé", integrated: "Travail intégré dans le slot parent", unknown: "Conservation non confirmée" };
const CHILD_PATH_FIELDS = [
  { field: "workspacePath", label: "Code de l’espace enfant" },
  { field: "archivePath", label: "Archive du travail enfant" },
  { field: "journalPath", label: "Journal de préservation" },
] satisfies { field: "workspacePath" | "archivePath" | "journalPath"; label: string }[];

export function AutonomousWorkspacesLink({ ticketId }: { ticketId: string }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [workspaces, setWorkspaces] = useState<AutonomousWorkspaces | null>(null);
  const [error, setError] = useState<string | null>(null);
  const recoverWork = async (): Promise<void> => {
    setOpen(true);
    setLoading(true);
    setWorkspaces(null);
    setError(null);
    try {
      setWorkspaces(await api.autonomousWorkspaces(ticketId));
    } catch (failure) {
      setError(qualityErrorMessage(failure));
    } finally {
      setLoading(false);
    }
  };

  return <>
    <RecoveryLink disabled={loading} onClick={() => void recoverWork()}>Voir les dossiers conservés</RecoveryLink>
    <Dialog open={open} onOpenChange={setOpen} title="Récupérer le travail conservé" description="Sélectionnez et copiez les chemins pour accéder aux fichiers sur la machine qui héberge le serveur. Le slot parent et les espaces enfants sont distincts ; ce dialogue ne modifie aucun fichier.">
      {loading && <p className="text-xs text-muted-foreground">Vérification des emplacements conservés…</p>}
      {error && <p role="alert" className="text-xs text-danger">{error}</p>}
      {workspaces && <div className="space-y-4 text-xs">
        <section className="space-y-2"><p className="font-medium">Code du slot parent</p>
          {workspaces.parent === null ? <p className="text-warning">Aucun emplacement parent conservé n’est identifié.</p> : <>
            <p className="text-muted-foreground">{workspaces.parent.available ? "Espace de travail disponible" : "Espace de travail indisponible ou non confirmé"}{workspaces.parent.simulated && " · simulation, aucun fichier réel vérifié"}.</p>
            <Label htmlFor="autonomous-parent-path">Emplacement du code parent</Label><Input id="autonomous-parent-path" value={workspaces.parent.path} readOnly onFocus={(event) => event.target.select()} />
          </>}
        </section>
        <section className="space-y-2"><p className="font-medium">Travail des lots enfants</p>
          {workspaces.children.length === 0 && <p className="text-muted-foreground">Aucun emplacement enfant conservé n’est enregistré.</p>}
          {workspaces.children.map((child, index) => <div key={`${child.label}-${index}`} className="space-y-2 rounded border border-border p-2">
            <p>{child.label} · {WORKSPACE_STATUS_LABELS[child.status]} · {child.verified ? "préservation vérifiée" : "préservation non vérifiée"}</p>
            {CHILD_PATH_FIELDS.map(({ field, label }) => child[field] === null ? null : <div key={field} className="space-y-1"><Label htmlFor={`autonomous-child-${index}-${field}`}>{label}</Label><Input id={`autonomous-child-${index}-${field}`} value={child[field]} readOnly onFocus={(event) => event.target.select()} /></div>)}
            {child.workspacePath === null && child.archivePath === null && <p className="text-warning">Aucun chemin vers le code ou une archive n’est confirmé.</p>}
          </div>)}
        </section>
        {workspaces.diagnostic && <p className="whitespace-pre-wrap text-warning">{formatQualityMessage(workspaces.diagnostic)}</p>}
      </div>}
    </Dialog>
  </>;
}
