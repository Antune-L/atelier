import { GitPullRequest } from "lucide-react";
import { useState } from "react";

import type { CodexEffort, CodexModel, Orchestrator } from "@shared/constants";
import type { ProjectInfo } from "@shared/schemas";

import { ProjectPrPicker } from "@/components/ProjectPrPicker";
import { SessionDriverFields } from "@/components/SessionDriverFields";
import { Button } from "@/components/ui/button";
import { Label, Textarea } from "@/components/ui/input";
import { useCapabilities } from "@/hooks/useCapabilities";
import { useProjectPanel } from "@/hooks/useProjectPanel";
import { api } from "@/lib/api";
import { FIELD_LABEL_CLASSES, PANEL_FOOTER_CLASSES } from "@/lib/overlayStyles";

interface CleanPrPanelProps {
  projects: ProjectInfo[];
  onClose: () => void;
}

export function CleanPrPanel({ projects, onClose }: CleanPrPanelProps) {
  const capabilities = useCapabilities();
  const panel = useProjectPanel(projects);
  const { project, prs, selected, error, setError, busy, setBusy } = panel;
  const [context, setContext] = useState("");
  const [orchestrator, setOrchestrator] = useState<Orchestrator>("claude");
  const [codexModel, setCodexModel] = useState<CodexModel | null>(null);
  const [codexEffort, setCodexEffort] = useState<CodexEffort | null>(null);
  const [codexFastOverride, setCodexFast] = useState<boolean | null>(null);
  const codexFast = codexFastOverride ?? capabilities.defaultCodexFast;

  const launch = async (): Promise<void> => {
    if (selected.size === 0 || !prs) return;
    setBusy(true);
    setError(null);
    try {
      const chosen = prs.filter((p) => selected.has(p.number));
      await api.createCleaners({ project, context, orchestrator, codexModel, codexEffort, codexFast, prs: chosen });
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
        <Label htmlFor="clean-context" className={FIELD_LABEL_CLASSES}>Contexte de la PR (optionnel)</Label>
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

      <SessionDriverFields
        orchestrator={orchestrator}
        codexModel={codexModel}
        codexEffort={codexEffort}
        codexFast={codexFast}
        onOrchestratorChange={setOrchestrator}
        onCodexModelChange={setCodexModel}
        onCodexEffortChange={setCodexEffort}
        onCodexFastChange={setCodexFast}
      />

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className={PANEL_FOOTER_CLASSES}>
        <Button size="sm" variant="ghost" onClick={onClose}>
          Annuler
        </Button>
        <Button size="sm" onClick={launch} disabled={busy || selected.size === 0}>
          <GitPullRequest className="h-4 w-4" />
          Lancer le nettoyage{selected.size > 0 ? ` (${selected.size})` : ""}
        </Button>
      </div>
    </div>
  );
}
