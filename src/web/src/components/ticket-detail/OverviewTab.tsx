import type { ProjectInfo, Ticket } from "@shared/schemas";

import { TicketConfigSummary } from "@/components/TicketConfigSummary";
import { LaunchForm } from "@/components/ticket-detail/LaunchForm";
import { SectionHeader } from "@/components/ticket-detail/SectionHeader";
import { Markdown } from "@/components/ui/markdown";

interface OverviewTabProps {
  ticket: Ticket;
  projects: ProjectInfo[];
  locked: boolean;
}

const SUMMARY_COLUMNS: Ticket["column"][] = ["done", "merged"];

/** Read-only recap of the ticket, plus the launch configuration while it sits in TODO. */
export function OverviewTab({ ticket, projects, locked }: OverviewTabProps) {
  const isTodo = ticket.column === "todo";
  const showSummary = ticket.agentSummary !== null && SUMMARY_COLUMNS.includes(ticket.column);

  return (
    <div className="space-y-4">
      {ticket.error && (
        <div className="rounded-md border border-danger/40 bg-danger/10 p-3 text-sm text-danger">
          {ticket.error}
        </div>
      )}

      {!isTodo && <TicketConfigSummary ticket={ticket} />}

      <section className="space-y-2">
        <SectionHeader>Description</SectionHeader>
        {ticket.description ? (
          <Markdown content={ticket.description} />
        ) : (
          <p className="text-sm text-muted-foreground">(vide)</p>
        )}
      </section>

      {showSummary && ticket.agentSummary !== null && (
        <section className="space-y-2">
          <SectionHeader>Résumé de l'agent</SectionHeader>
          <Markdown content={ticket.agentSummary} />
        </section>
      )}

      {isTodo && <LaunchForm ticket={ticket} projects={projects} canEditTarget={!locked} />}
    </div>
  );
}
