import { GitPullRequest } from "lucide-react";
import { useState } from "react";

import {
  REVIEW_DEPTHS,
  REVIEW_DEPTH_LABELS,
  type ReviewDepth,
} from "@shared/constants";
import type { ProjectInfo } from "@shared/schemas";
import { reviewDepthSchema } from "@shared/schemas";

import { ProjectPrPicker } from "@/components/ProjectPrPicker";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useProjectPanel } from "@/hooks/useProjectPanel";
import { api } from "@/lib/api";

interface ReviewPrPanelProps {
  projects: ProjectInfo[];
  onClose: () => void;
}

export function ReviewPrPanel({ projects, onClose }: ReviewPrPanelProps) {
  const panel = useProjectPanel(projects);
  const { project, prs, selected, error, setError, busy, setBusy } = panel;
  const [depth, setDepth] = useState<ReviewDepth>("full");
  const [fixComments, setFixComments] = useState(false);

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
