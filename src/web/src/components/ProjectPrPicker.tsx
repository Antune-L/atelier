import { RefreshCw } from "lucide-react";
import type { ReactNode } from "react";

import { TERMINAL_COLUMNS } from "@shared/constants";
import type { ProjectInfo, Ticket } from "@shared/schemas";

import { PrSelectRow } from "@/components/PrSelectRow";
import { ProjectSelect } from "@/components/ProjectSelect";
import { Button } from "@/components/ui/button";
import { useBoard } from "@/hooks/useBoard";
import type { ProjectPanelState } from "@/hooks/useProjectPanel";
import type { ReviewCountSnapshot } from "@/hooks/useReviewCounts";
import { ticketPrNumber } from "@/lib/display";
import { cn } from "@/lib/utils";

type PrTicketKind = Extract<Ticket["kind"], "review" | "clean">;

const ACTIVE_TICKET_LABELS: Record<PrTicketKind, string> = {
  review: "Review en cours",
  clean: "Nettoyage en cours",
};

interface ProjectPrPickerProps {
  projects: ProjectInfo[];
  panel: ProjectPanelState;
  idPrefix: string;
  ticketKind: PrTicketKind;
  reviewCounts?: ReviewCountSnapshot;
  onRefreshCounts?: () => void;
}

/** Project selector + open-PR multi-select list, shared by the review and clean PR panels. */
export function ProjectPrPicker({ projects, panel, idPrefix, ticketKind, reviewCounts, onRefreshCounts }: ProjectPrPickerProps) {
  const { project, setProjectChoice, prs, loading, selected, toggle, refresh } = panel;
  const { tickets } = useBoard();
  const activePrNumbers = new Set(
    tickets
      .filter((ticket) => ticket.kind === ticketKind && ticket.project === project && !TERMINAL_COLUMNS.includes(ticket.column))
      .map(ticketPrNumber),
  );
  const selectId = `${idPrefix}-project`;

  let list: ReactNode;
  if (loading) {
    list = <p role="status" className="text-sm text-muted-foreground">Chargement des pull requests…</p>;
  } else if (prs && prs.length > 0) {
    list = (
      <div className="space-y-1.5">
        {prs.map((pr) => (
          <PrSelectRow
            key={pr.number}
            pr={pr}
            selected={selected.has(pr.number)}
            activeLabel={activePrNumbers.has(pr.number) ? ACTIVE_TICKET_LABELS[ticketKind] : null}
            onToggle={() => toggle(pr.number)}
          />
        ))}
      </div>
    );
  } else {
    list = <p className="text-sm text-muted-foreground">Aucune pull request ouverte sur ce projet.</p>;
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

      <section className="space-y-2">
        <div className="flex flex-wrap items-baseline justify-between gap-2 text-xs">
          <h3 className="font-medium">Pull requests à traiter</h3>
          <p role="status" className="text-muted-foreground">{selected.size} sélectionnée(s)</p>
        </div>
        <div className="max-h-64 overflow-y-auto overscroll-contain">{list}</div>
      </section>
    </>
  );
}
