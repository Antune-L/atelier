import { Maximize2 } from "lucide-react";

import type { Ticket } from "@shared/schemas";

import { SectionHeader } from "@/components/ticket-detail/SectionHeader";
import { Button } from "@/components/ui/button";
import { Markdown } from "@/components/ui/markdown";

interface PrdTabProps {
  ticket: Ticket;
  onExpand: () => void;
  onValidate: () => Promise<void>;
}

/** Full-height PRD reading pane; annotation and validation happen in the stacked PRD sheet. */
export function PrdTab({ ticket, onExpand, onValidate }: PrdTabProps) {
  const proposed = ticket.column === "prd";

  return (
    <div className="space-y-3">
      <SectionHeader
        aside={
          ticket.prdMarkdown === null ? undefined : (
            <Button variant="ghost" size="sm" onClick={onExpand}>
              <Maximize2 className="h-3.5 w-3.5" />
              {proposed ? "Agrandir & annoter" : "Agrandir"}
            </Button>
          )
        }
      >
        {proposed ? "PRD proposé" : "PRD validé"}
      </SectionHeader>

      {ticket.prdMarkdown === null ? (
        <p className="text-sm text-muted-foreground">Le PRD n'a pas encore été soumis.</p>
      ) : (
        <Markdown content={ticket.prdMarkdown} />
      )}

      {proposed && ticket.prdMarkdown !== null && (
        <Button size="sm" onClick={() => void onValidate()}>
          Valider le PRD
        </Button>
      )}
    </div>
  );
}
