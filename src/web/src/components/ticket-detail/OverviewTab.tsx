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

export function OverviewTab({ ticket, projects, locked }: OverviewTabProps) {
  const isTodo = ticket.column === "todo";
  const showSummary = ticket.agentSummary !== null && SUMMARY_COLUMNS.includes(ticket.column);

  return (
    <div className="flex h-full min-h-0 flex-col gap-4">
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

      <div className="flex min-h-0 flex-1 flex-col gap-6 lg:flex-row lg:overflow-hidden">
        <div className="min-w-0 space-y-4 lg:flex-1 lg:overflow-y-auto lg:pr-3">
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
        </div>

        <section className="min-w-0 space-y-4 border-t border-border pt-4 lg:w-80 lg:shrink-0 lg:overflow-y-auto lg:border-l lg:border-t-0 lg:pl-4 lg:pt-0">
          <SectionHeader>Configuration</SectionHeader>
          {isTodo ? (
            <LaunchForm ticket={ticket} projects={projects} canEditTarget={!locked} />
          ) : (
            <TicketConfigSummary ticket={ticket} />
          )}
        </section>
      </div>
    </div>
  );
}
