import { GitBranch } from "lucide-react";
import { useRef, useState } from "react";

import type { ProjectInfo } from "@shared/schemas";

import { ProjectSelect } from "@/components/ProjectSelect";
import { Button } from "@/components/ui/button";
import { BranchCombobox, Label } from "@/components/ui/input";
import { api } from "@/lib/api";

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
  const project = projectChoice ?? projects[0]?.key ?? "";
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
    <div className="space-y-4">
      <ProjectSelect
        id="worktree-project"
        projects={projects}
        value={project}
        onChange={setProjectChoice}
      />
      <div className="space-y-1.5">
        <Label htmlFor="worktree-base-branch">Branche de base du worktree</Label>
        <BranchCombobox
          id="worktree-base-branch"
          value={baseBranch}
          onChange={setBaseBranchChoice}
          options={branchOptions}
          disabled={branches === null}
        />
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex justify-end gap-2 border-t pt-4">
        <Button variant="outline" onClick={onClose}>
          Annuler
        </Button>
        <Button onClick={() => void launch()} disabled={busy || !project || !baseBranch}>
          <GitBranch className="h-4 w-4" />
          Lancer le worktree
        </Button>
      </div>
    </div>
  );
}
