import { AlertTriangle, Clock, Cpu, Eye, HelpCircle, MessageCircleQuestion } from "lucide-react";

import { TERMINAL_STAGES } from "@shared/constants";
import type { ProjectInfo, Ticket } from "@shared/schemas";

import { StageProgressBar } from "@/components/StageProgressBar";
import { TerminalView } from "@/components/TerminalView";
import { resolveProjectLabel } from "@/components/TicketCard";
import { Badge } from "@/components/ui/badge";
import { useBoard } from "@/hooks/useBoard";
import { useTickTimer } from "@/hooks/useTickTimer";
import { formatRelativeDuration, isStageAnimated, ticketElapsedStart } from "@/lib/display";

interface AgentsViewProps {
  projects: ProjectInfo[];
  projectFilter: string;
  searchQuery: string;
  onOpenTicket: (ticket: Ticket) => void;
}

/** Case- and diacritics-insensitive normalization for client-side search. */
function normalize(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");
}

/** A ticket whose agent session is live: it holds a slot and the run hasn't stopped.
 * (A dead/failed ticket can keep its slot, so a terminal stage must also exclude it.) */
function hasLiveAgent(ticket: Ticket): boolean {
  return ticket.slotId !== null && ticket.stage !== null && !TERMINAL_STAGES.includes(ticket.stage);
}

export function AgentsView({ projects, projectFilter, searchQuery, onOpenTicket }: AgentsViewProps) {
  const { tickets } = useBoard();

  const byProject = projectFilter === "all" ? tickets : tickets.filter((t) => t.project === projectFilter);
  const needle = normalize(searchQuery.trim());
  const searched = needle
    ? byProject.filter((t) => normalize(`${t.title} ${t.description}`).includes(needle))
    : byProject;
  const agents = searched.filter(hasLiveAgent);

  if (agents.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
        Aucun agent actif pour le moment.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
      {agents.map((ticket) => (
        <AgentCard
          key={ticket.id}
          ticket={ticket}
          projectLabel={resolveProjectLabel(projects, ticket.project)}
          onOpen={onOpenTicket}
        />
      ))}
    </div>
  );
}

interface AgentCardProps {
  ticket: Ticket;
  projectLabel: string;
  onOpen: (ticket: Ticket) => void;
}

function AgentCard({ ticket, projectLabel, onOpen }: AgentCardProps) {
  const now = useTickTimer();

  // A button may not wrap the block-level <h3> title, so use a focusable role="button" div.
  const open = (): void => onOpen(ticket);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={open}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          open();
        }
      }}
      className="flex cursor-pointer flex-col rounded-lg border bg-card p-3 text-left shadow-sm transition-colors hover:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="line-clamp-2 text-sm font-medium leading-snug">{ticket.title}</h3>
        <div className="flex shrink-0 items-center gap-1">
          {ticket.slotId !== null && (
            <Badge variant="info" className="gap-1 text-[10px]">
              <Cpu className="h-3 w-3" /> slot-{ticket.slotId}
            </Badge>
          )}
          <Badge variant="outline" className="text-[10px]">
            {projectLabel}
          </Badge>
        </div>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        {ticket.kind === "review" && (
          <Badge variant="secondary" className="gap-1 text-[10px]">
            <Eye className="h-3 w-3" /> Review
          </Badge>
        )}
        {ticket.kind === "ask" && (
          <Badge variant="secondary" className="gap-1 text-[10px]">
            <HelpCircle className="h-3 w-3" /> Ask
          </Badge>
        )}
        {ticket.watchdogFlagged && (
          <Badge variant="warning" className="gap-1">
            <AlertTriangle className="h-3 w-3" /> Inactif
          </Badge>
        )}
        {ticket.pendingQuestions > 0 && (
          <Badge variant="warning" className="gap-1">
            <MessageCircleQuestion className="h-3 w-3" /> {ticket.pendingQuestions}
          </Badge>
        )}
      </div>

      {ticket.stage && <StageProgressBar stage={ticket.stage} animated={isStageAnimated(ticket.stage)} />}

      <div className="mt-1.5 flex items-center gap-1 text-[10px] text-muted-foreground">
        <Clock className="h-3 w-3 shrink-0" aria-hidden="true" />
        <span>{formatRelativeDuration(ticketElapsedStart(ticket), now)}</span>
      </div>

      <div className="mt-2 h-40 overflow-hidden rounded-md">
        <TerminalView ticketId={ticket.id} compact />
      </div>
    </div>
  );
}
