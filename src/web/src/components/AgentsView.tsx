import { ChevronDown, ChevronUp, Clock, Cpu } from "lucide-react";
import { useState } from "react";

import { TERMINAL_STAGES } from "@shared/constants";
import type { ProjectInfo, Ticket } from "@shared/schemas";

import { ReviewLevelDot } from "@/components/ReviewLevelDot";
import { StageProgressBar } from "@/components/StageProgressBar";
import { TerminalView } from "@/components/TerminalView";
import { TicketBadges } from "@/components/TicketBadges";
import { resolveProjectColor, resolveProjectLabel, ticketCostLabel, ticketDecisionLabel, ticketDeliveryLabel } from "@/components/TicketCard";
import { TicketConfigSummary } from "@/components/TicketConfigSummary";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useBoard } from "@/hooks/useBoard";
import { useTickTimer } from "@/hooks/useTickTimer";
import {
  agentPairLabel,
  formatDateTime,
  formatRelativeDuration,
  isStageAnimated,
  stageLabel,
  ticketElapsedStart,
} from "@/lib/display";
import { matchesQuery, normalizeSearch } from "@/lib/search";

interface AgentsViewProps {
  projects: ProjectInfo[];
  projectFilter: string;
  searchQuery: string;
  onOpenTicket: (ticket: Ticket) => void;
}

function hasLiveAgent(ticket: Ticket): boolean {
  return ticket.slotId !== null && ticket.stage !== null && !TERMINAL_STAGES.includes(ticket.stage);
}

export function AgentsView({ projects, projectFilter, searchQuery, onOpenTicket }: AgentsViewProps) {
  const { tickets } = useBoard();
  const [history, setHistory] = useState(false);
  const query = normalizeSearch(searchQuery);
  const searched = tickets.filter((ticket) => (projectFilter === "all" || ticket.project === projectFilter) && matchesQuery(query, ticket.title, ticket.description, ticket.id, ticket.branch ?? "", resolveProjectLabel(projects, ticket.project)));
  const activeAgents = searched.filter(hasLiveAgent);
  const previousAgents = searched.filter((ticket) => !hasLiveAgent(ticket) && (ticket.sessionId !== null || Object.keys(ticket.sessionUsage).length > 0 || ticket.slotId !== null));
  const agents = history ? previousAgents : activeAgents;

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div><h2 className="text-sm font-semibold">Supervision des agents</h2><p className="mt-1 text-xs text-muted-foreground">Progression enregistrée et prochaines décisions dans cette sélection.</p></div>
        <div className="flex gap-1" role="group" aria-label="Sessions d’agents">
          <Button size="sm" variant={history ? "ghost" : "secondary"} aria-pressed={!history} onClick={() => setHistory(false)}>Actifs · {activeAgents.length}</Button>
          <Button size="sm" variant={history ? "secondary" : "ghost"} aria-pressed={history} onClick={() => setHistory(true)}>Historique · {previousAgents.length}</Button>
        </div>
      </header>
      {agents.length === 0 && <div className="flex h-48 items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">{history ? "Aucune session enregistrée pour cette sélection." : "Aucun agent actif pour cette sélection."}</div>}
      <div className="flex flex-wrap items-start gap-4">
        {agents.map((ticket) => <AgentCard key={ticket.id} ticket={ticket} projectLabel={resolveProjectLabel(projects, ticket.project)} projectColor={resolveProjectColor(projects, ticket.project)} onOpen={onOpenTicket} />)}
      </div>
    </div>
  );
}

interface AgentCardProps {
  ticket: Ticket;
  projectLabel: string;
  projectColor?: string;
  onOpen: (ticket: Ticket) => void;
}

function AgentCard({ ticket, projectLabel, projectColor, onOpen }: AgentCardProps) {
  const now = useTickTimer();
  const [diagnosticsOpen, setDiagnosticsOpen] = useState(false);
  const decisionLabel = ticketDecisionLabel(ticket);
  const live = hasLiveAgent(ticket);
  let nextAction = "Session terminée · consulter le résultat";
  if (live) nextAction = "L’agent poursuit l’étape enregistrée";
  if (ticket.stage === "queued") nextAction = "En attente d’une place d’exécution";
  if (decisionLabel !== null) nextAction = decisionLabel;

  return (
    <article className="flex w-full min-w-0 flex-col rounded-lg border bg-card p-4 shadow-sm md:w-[calc(50%-0.5rem)] xl:w-[calc(33.333%-0.667rem)]">
      <div className="flex items-start justify-between gap-3">
        <button type="button" onClick={() => onOpen(ticket)} className="min-w-0 rounded-sm text-left text-sm font-medium leading-snug hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><span className="line-clamp-2">{ticket.title}</span></button>
        <div className="flex shrink-0 items-center gap-2">
          {ticket.reviewLevel && <ReviewLevelDot level={ticket.reviewLevel} reason={ticket.reviewReason} flags={ticket.reviewFlags} />}
          {ticket.slotId !== null && <Badge variant="info" className="gap-1 text-2xs"><Cpu className="h-3 w-3" />slot {ticket.slotId}</Badge>}
        </div>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <span style={projectColor ? { color: projectColor } : undefined}>{projectLabel}</span>
        <span>{agentPairLabel(ticket.orchestrator, ticket.implementer)}</span>
        <TicketBadges ticket={ticket} />
      </div>
      <p className="mt-4 text-sm font-medium">{ticket.stage === null ? "Aucune étape enregistrée" : stageLabel(ticket.stage)}</p>
      {ticket.stage && <StageProgressBar stage={ticket.stage} animated={isStageAnimated(ticket.stage)} />}
      <p className={decisionLabel === null ? "mt-3 text-xs text-muted-foreground" : "mt-3 text-xs font-medium text-warning"}>{nextAction}</p>
      {ticket.error && <p className="mt-2 line-clamp-3 break-words text-xs text-danger" title={ticket.error}>{ticket.error}</p>}
      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-2xs text-muted-foreground">
        <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" aria-hidden="true" />{formatRelativeDuration(ticketElapsedStart(ticket), now)}</span>
        <span>{ticketCostLabel(ticket)}</span>
        <span>{ticketDeliveryLabel(ticket)}</span>
      </div>
      <p className="mt-1 text-2xs text-muted-foreground">Carte mise à jour le {formatDateTime(ticket.updatedAt)}</p>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t pt-3">
        <Button size="sm" variant="outline" onClick={() => onOpen(ticket)}>Ouvrir le ticket</Button>
        <Button size="sm" variant="ghost" onClick={() => setDiagnosticsOpen(!diagnosticsOpen)} aria-expanded={diagnosticsOpen} aria-controls={`agent-diagnostics-${ticket.id}`}>{diagnosticsOpen ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}Diagnostic</Button>
      </div>
      {diagnosticsOpen && <div id={`agent-diagnostics-${ticket.id}`} className="mt-3 space-y-4 border-t pt-3">
        {ticket.error && <p role="alert" className="break-words text-xs text-danger">{ticket.error}</p>}
        <dl className="space-y-2 text-xs"><div><dt className="text-muted-foreground">Branche</dt><dd className="break-all font-mono">{ticket.branch ?? "Non attribuée"}</dd></div><div><dt className="text-muted-foreground">Session enregistrée</dt><dd className="break-all font-mono">{ticket.sessionId ?? "Non reçue"}</dd></div></dl>
        <TicketConfigSummary ticket={ticket} />
        <div className="h-64 overflow-hidden rounded-md"><TerminalView ticketId={ticket.id} compact /></div>
      </div>}
    </article>
  );
}
