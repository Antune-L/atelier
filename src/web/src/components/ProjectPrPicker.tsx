import { RefreshCw } from "lucide-react";
import type { ReactNode } from "react";

import type { ProjectInfo } from "@shared/schemas";

import { PrSelectRow } from "@/components/PrSelectRow";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import type { ProjectPanelState } from "@/hooks/useProjectPanel";
import { cn } from "@/lib/utils";

interface ProjectPrPickerProps {
  projects: ProjectInfo[];
  panel: ProjectPanelState;
  /** Unique prefix for the project <Select>'s id/label association (e.g. "review", "clean"). */
  idPrefix: string;
}

/** Project selector + open-PR multi-select list, shared by the review and clean PR panels. */
export function ProjectPrPicker({ projects, panel, idPrefix }: ProjectPrPickerProps) {
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
        <div className="flex-1 space-y-1.5">
          <Label htmlFor={selectId}>Projet</Label>
          <Select
            id={selectId}
            value={project}
            onChange={(e) => setProjectChoice(e.target.value)}
            className="w-full"
          >
            {projects.map((p) => (
              <option key={p.key} value={p.key}>
                {p.label}
              </option>
            ))}
          </Select>
        </div>
        <Button variant="outline" onClick={refresh} disabled={loading} aria-label="Rafraîchir les PRs">
          <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
        </Button>
      </div>

      <div className="max-h-[320px] overflow-y-auto">{list}</div>
    </>
  );
}
