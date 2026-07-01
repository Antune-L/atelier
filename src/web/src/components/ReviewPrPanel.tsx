import { GitPullRequest } from "lucide-react";
import { useRef, useState } from "react";

import {
  REVIEW_DEPTHS,
  REVIEW_DEPTH_LABELS,
  type AgentEffort,
  type AgentModel,
  type ReviewDepth,
} from "@shared/constants";
import type { ProjectInfo } from "@shared/schemas";
import { reviewDepthSchema } from "@shared/schemas";

import { ProjectPrPicker } from "@/components/ProjectPrPicker";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs } from "@/components/ui/tabs";
import { useCapabilities } from "@/hooks/useCapabilities";
import { useProjectPanel } from "@/hooks/useProjectPanel";
import { resolveAgentDefaults } from "@/lib/agentDefaults";
import { api } from "@/lib/api";
import { AGENT_EFFORT_OPTIONS, AGENT_MODEL_OPTIONS } from "@/lib/display";

interface ReviewPrPanelProps {
  projects: ProjectInfo[];
  onClose: () => void;
}

/** Sentinel value for the "Auto" base-branch option (no override → each PR's own detected target). */
const BASE_BRANCH_AUTO = "";

export function ReviewPrPanel({ projects, onClose }: ReviewPrPanelProps) {
  const panel = useProjectPanel(projects);
  const capabilities = useCapabilities();
  const { project, prs, selected, error, setError, busy, setBusy } = panel;
  const [depth, setDepth] = useState<ReviewDepth>("full");
  const [fixComments, setFixComments] = useState(false);
  // null = follow the server default; resolve it so the matching tab is highlighted.
  const [model, setModel] = useState<AgentModel | null>(null);
  const [effort, setEffort] = useState<AgentEffort | null>(null);
  const { model: resolvedDefaultModel, effort: resolvedDefaultEffort } = resolveAgentDefaults(capabilities);
  // "" (BASE_BRANCH_AUTO) = no override → argus uses each PR's own detected target branch.
  const [baseBranch, setBaseBranch] = useState<string>(BASE_BRANCH_AUTO);
  const [branches, setBranches] = useState<string[] | null>(null);
  const [branchesKey, setBranchesKey] = useState<string | null>(null);
  // Tracks the latest requested project so an out-of-order branch fetch is dropped.
  const latestBranchKey = useRef<string | null>(null);

  // Load the project's branches for the override picker on first render and on each
  // project change (mirrors the no-useEffect load-on-render pattern).
  if (project && project !== branchesKey) {
    const key = project;
    latestBranchKey.current = key;
    setBranchesKey(key);
    setBranches(null);
    setBaseBranch(BASE_BRANCH_AUTO);
    void api
      .projectBranches(key)
      .then((list) => latestBranchKey.current === key && setBranches(list))
      .catch(() => latestBranchKey.current === key && setBranches([]));
  }

  const launch = async (): Promise<void> => {
    if (selected.size === 0 || !prs) return;
    setBusy(true);
    setError(null);
    try {
      const chosen = prs.filter((p) => selected.has(p.number));
      // Posting inline comments on GitHub is now the default behaviour for every review.
      await api.createReviews({
        project,
        depth,
        postComments: true,
        fixComments,
        // Auto → null override (each PR keeps its own detected target branch).
        baseBranch: baseBranch === BASE_BRANCH_AUTO ? null : baseBranch,
        model,
        effort,
        prs: chosen,
      });
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Échec du lancement de la revue");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <ProjectPrPicker projects={projects} panel={panel} idPrefix="review" />

      <div className="space-y-1.5">
        <Label htmlFor="review-depth">Niveau de review</Label>
        <Select
          className="ml-2"
          id="review-depth"
          value={depth}
          onChange={(e) => setDepth(reviewDepthSchema.parse(e.target.value))}
        >
          {REVIEW_DEPTHS.map((d) => (
            <option key={d} value={d}>
              {REVIEW_DEPTH_LABELS[d]}
            </option>
          ))}
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="review-base-branch">Branche de review (cible)</Label>
        <Select
          className="ml-2"
          id="review-base-branch"
          value={baseBranch}
          onChange={(e) => setBaseBranch(e.target.value)}
          disabled={branches === null}
        >
          <option value={BASE_BRANCH_AUTO}>Auto — cible réelle de chaque PR</option>
          {(branches ?? []).map((b) => (
            <option key={b} value={b}>
              {b}
            </option>
          ))}
        </Select>
      </div>

      <div className="flex flex-col items-start gap-1.5">
        <Label id="review-model">Modèle</Label>
        <Tabs
          options={AGENT_MODEL_OPTIONS}
          value={model ?? resolvedDefaultModel}
          onChange={(value) => setModel(value === resolvedDefaultModel ? null : value)}
          aria-labelledby="review-model"
        />
      </div>

      <div className="flex flex-col items-start gap-1.5">
        <Label id="review-effort">Réflexion (effort)</Label>
        <Tabs
          options={AGENT_EFFORT_OPTIONS}
          value={effort ?? resolvedDefaultEffort}
          onChange={(value) => setEffort(value === resolvedDefaultEffort ? null : value)}
          aria-labelledby="review-effort"
        />
      </div>

      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <Switch checked={fixComments} onCheckedChange={setFixComments} aria-labelledby="fix-comments-label" />
          <span id="fix-comments-label" className="text-sm">Corriger les retours directement sur la PR</span>
        </div>
        <p className="pl-11 text-xs text-muted-foreground">
          Un sous-agent applique les corrections puis pousse sur la branche de la PR.
        </p>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex justify-end gap-2 border-t pt-4">
        <Button variant="outline" onClick={onClose}>
          Annuler
        </Button>
        <Button onClick={launch} disabled={busy || selected.size === 0}>
          <GitPullRequest className="h-4 w-4" />
          Lancer la revue{selected.size > 0 ? ` (${selected.size})` : ""}
        </Button>
      </div>
    </div>
  );
}
