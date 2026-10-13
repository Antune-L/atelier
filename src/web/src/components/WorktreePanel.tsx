import { GitBranch } from "lucide-react";
import { useRef, useState } from "react";

import type { ProjectInfo } from "@shared/schemas";

import { ProjectSelect } from "@/components/ProjectSelect";
import { Button } from "@/components/ui/button";
import { BranchCombobox, Label } from "@/components/ui/input";
import { api } from "@/lib/api";
import { FIELD_LABEL_CLASSES, PANEL_FOOTER_CLASSES } from "@/lib/overlayStyles";
import { resolveProjectChoice } from "@/lib/projectSelection";

interface WorktreePanelProps {
  projects: ProjectInfo[];
  onClose: () => void;
}

/**
 * Launch a standalone, ticket-less runnable worktree session: pick a project + a base branch, then
 * spawn an interactive worktree (same machinery as "Tester la fonctionnalité" but tied to no card).
 */
export function WorktreePanel({ projects, onClose }: WorktreePanelProps) {
  const [projectChoice, setProjectChoice] = useState<string | null>(null);
  const project = resolveProjectChoice(projects, projectChoice);
  const selectedProject = projects.find((p) => p.key === project);
  const [baseBranchChoice, setBaseBranchChoice] = useState<string | null>(null);
  const baseBranch = baseBranchChoice ?? selectedProject?.baseBranch ?? "";
  const [branches, setBranches] = useState<string[] | null>(null);
  const [branchesKey, setBranchesKey] = useState<string | null>(null);
  // Tracks the latest requested project so an out-of-order branch fetch is dropped.
  const latestBranchKey = useRef<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Load the project's branches on first render and on each project change
  // (mirrors the no-useEffect load-on-render pattern of the ticket tab).
  if (project && project !== branchesKey) {
    const key = project;
    latestBranchKey.current = key;
    setBranchesKey(key);
    setBranches(null);
    setBaseBranchChoice(null);
    void api
      .projectBranches(key)
      .then((list) => latestBranchKey.current === key && setBranches(list))
      .catch(() => latestBranchKey.current === key && setBranches([]));
  }

  // The configured default is always selectable, even while the remote list loads or fails.
  const branchOptions = (() => {
    const list = branches ?? [];
    const fallback = selectedProject?.baseBranch;
    if (!fallback) return list;
    return list.includes(fallback) ? list : [fallback, ...list];
  })();

  const launch = async (): Promise<void> => {
    if (!project || !baseBranch) return;
    setBusy(true);
    setError(null);
    try {
      await api.startWorktreeSession({ project, baseBranch });
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Échec du lancement du worktree");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-[20rem] space-y-4">
      <p className="text-sm text-muted-foreground">Un espace de travail (worktree) est une copie isolée du dépôt pour préparer et tester le projet.</p>
      <ProjectSelect
        id="worktree-project"
        projects={projects}
        value={project}
        onChange={setProjectChoice}
      />
      <div className="space-y-1.5">
        <Label htmlFor="worktree-base-branch" className={FIELD_LABEL_CLASSES}>Branche de départ</Label>
        <BranchCombobox
          id="worktree-base-branch"
          value={baseBranch}
          onChange={setBaseBranchChoice}
          options={branchOptions}
          disabled={branches === null}
        />
      </div>

      <section className="space-y-2 rounded-md border border-border bg-muted/30 p-3">
        <h3 className="text-sm font-medium">Préparation demandée</h3>
        <dl className="space-y-1 text-xs">
          <div className="flex flex-wrap justify-between gap-2"><dt className="text-muted-foreground">Projet</dt><dd>{selectedProject?.label ?? "Choisissez un projet"}</dd></div>
          <div className="flex flex-wrap justify-between gap-2"><dt className="text-muted-foreground">Branche de départ</dt><dd className="break-all font-mono">{baseBranch || "À renseigner"}</dd></div>
        </dl>
        <p className="text-xs text-muted-foreground">La création lance la préparation avec la configuration enregistrée du projet. Cette demande ne confirme pas encore que l’environnement fonctionne.</p>
      </section>

      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}

      <div className={PANEL_FOOTER_CLASSES}>
        <Button size="sm" variant="ghost" onClick={onClose}>
          Annuler
        </Button>
        <Button size="sm" onClick={() => void launch()} disabled={busy || !project || !baseBranch}>
          <GitBranch className="h-4 w-4" />
          {busy ? "Préparation en cours…" : "Créer l’espace de travail"}
        </Button>
      </div>
    </div>
  );
}
