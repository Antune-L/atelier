import type { ErrorDetails, ProjectInfo, Ticket } from "@shared/schemas";

import { TicketConfigSummary } from "@/components/TicketConfigSummary";
import { LaunchForm } from "@/components/ticket-detail/LaunchForm";
import { SectionHeader } from "@/components/ticket-detail/SectionHeader";
import { Markdown } from "@/components/ui/markdown";
import { formatDateTime } from "@/lib/display";

interface OverviewTabProps {
  ticket: Ticket;
  projects: ProjectInfo[];
  locked: boolean;
}

const SUMMARY_COLUMNS: Ticket["column"][] = ["done", "merged"];
const ERROR_DETAILS_SUMMARY = "Détails techniques";
const MISSING_VALUE = "-";

function formatErrorDetails(details: ErrorDetails): string {
  const lines = [
    `source: ${details.source}`,
    `stage: ${details.stage ?? MISSING_VALUE} · column: ${details.column ?? MISSING_VALUE} · slot: ${details.slotId ?? MISSING_VALUE}`,
    `session: ${details.sessionId ?? MISSING_VALUE}`,
    `generation: ${details.generationId ?? MISSING_VALUE}`,
    `date: ${formatDateTime(details.at)}`,
    "",
    details.stack ?? details.message,
  ];
  if (details.cause !== null) lines.push("", `cause: ${details.cause}`);
  return lines.join("\n");
}

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
      {ticket.errorDetails && (
        <details className="text-sm text-muted-foreground">
          <summary className="cursor-pointer">{ERROR_DETAILS_SUMMARY}</summary>
          <pre className="mt-2 max-h-64 overflow-auto whitespace-pre rounded-md border border-border p-3 font-mono text-xs">
            {formatErrorDetails(ticket.errorDetails)}
          </pre>
        </details>
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
