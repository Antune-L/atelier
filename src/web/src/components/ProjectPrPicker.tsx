import { RefreshCw } from "lucide-react";
import type { ReactNode } from "react";

import type { ProjectInfo } from "@shared/schemas";

import { PrSelectRow } from "@/components/PrSelectRow";
import { ProjectSelect } from "@/components/ProjectSelect";
import { Button } from "@/components/ui/button";
import type { ProjectPanelState } from "@/hooks/useProjectPanel";
import type { ReviewCountSnapshot } from "@/hooks/useReviewCounts";
import { cn } from "@/lib/utils";

interface ProjectPrPickerProps {
  projects: ProjectInfo[];
  panel: ProjectPanelState;
  idPrefix: string;
  reviewCounts?: ReviewCountSnapshot;
  onRefreshCounts?: () => void;
}

/** Project selector + open-PR multi-select list, shared by the review and clean PR panels. */
export function ProjectPrPicker({ projects, panel, idPrefix, reviewCounts, onRefreshCounts }: ProjectPrPickerProps) {
  const { project, setProjectChoice, prs, loading, selected, toggle, refresh } = panel;
  const selectId = `${idPrefix}-project`;

  let list: ReactNode;
  if (loading) {
    list = <p className="text-sm text-muted-foreground">Chargement des PRs…</p>;
  } else if (prs && prs.length > 0) {
    list = (
      <div className="space-y-1.5">
        {prs.map((pr) => (
          <PrSelectRow key={pr.number} pr={pr} selected={selected.has(pr.number)} onToggle={() => toggle(pr.number)} />
        ))}
      </div>
    );
  } else {
    list = <p className="text-sm text-muted-foreground">Aucune PR ouverte sur ce projet.</p>;
  }

  return (
    <>
      <div className="flex items-end gap-2">
        <ProjectSelect
          id={selectId}
          projects={projects}
          value={project}
          onChange={setProjectChoice}
          reviewCounts={reviewCounts}
          className="min-w-0 flex-1"
        />
        <Button
          variant="outline"
          onClick={() => {
            refresh();
            onRefreshCounts?.();
          }}
          disabled={loading}
          aria-label="Rafraîchir les PRs"
        >
          <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
        </Button>
      </div>

      <div className="max-h-[320px] overflow-y-auto">{list}</div>
    </>
  );
}
