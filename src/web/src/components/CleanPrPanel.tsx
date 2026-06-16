import { GitPullRequest } from "lucide-react";
import { useState } from "react";

import type { ProjectInfo } from "@shared/schemas";

import { ProjectPrPicker } from "@/components/ProjectPrPicker";
import { Button } from "@/components/ui/button";
import { Label, Textarea } from "@/components/ui/input";
import { useProjectPanel } from "@/hooks/useProjectPanel";
import { api } from "@/lib/api";

interface CleanPrPanelProps {
  projects: ProjectInfo[];
  onClose: () => void;
}

export function CleanPrPanel({ projects, onClose }: CleanPrPanelProps) {
  const panel = useProjectPanel(projects);
  const { project, prs, selected, error, setError, busy, setBusy } = panel;
  const [context, setContext] = useState("");

  const launch = async (): Promise<void> => {
    if (selected.size === 0 || !prs) return;
    setBusy(true);
    setError(null);
    try {
      const chosen = prs.filter((p) => selected.has(p.number));
      await api.createCleaners({ project, context, prs: chosen });
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Échec du lancement du nettoyage");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <ProjectPrPicker projects={projects} panel={panel} idPrefix="clean" />

      <div className="space-y-1">
        <Label htmlFor="clean-context">Contexte de la PR (optionnel)</Label>
        <Textarea
          id="clean-context"
          value={context}
          onChange={(e) => setContext(e.target.value)}
          rows={3}
          placeholder="Décris l'intention de la PR…"
        />
        <p className="text-xs text-muted-foreground">
          Le nettoyage n'applique que les retours qui respectent ce contexte ; les retours
          hors-périmètre sont ignorés.
        </p>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex justify-end gap-2 border-t pt-4">
        <Button variant="outline" onClick={onClose}>
          Annuler
        </Button>
        <Button onClick={launch} disabled={busy || selected.size === 0}>
          <GitPullRequest className="h-4 w-4" />
          Lancer le nettoyage{selected.size > 0 ? ` (${selected.size})` : ""}
        </Button>
      </div>
    </div>
  );
}
