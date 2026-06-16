import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { AlertTriangle, Brush, Clock, ExternalLink, Eye, GitMerge, HelpCircle, Loader2, MessageCircleQuestion, Palette, Sparkles } from "lucide-react";
import { useState } from "react";

import { extractFigmaUrls } from "@shared/figma";
import type { ProjectInfo, Ticket } from "@shared/schemas";

import { StageProgressBar } from "@/components/StageProgressBar";
import { Badge } from "@/components/ui/badge";
import {
  formatDuration,
  formatRelativeDuration,
  isStageAnimated,
  ticketElapsedStart,
  ticketImplementationDuration,
  ticketPrNumber,
  triageVerdictDot,
} from "@/lib/display";
import { useTickTimer } from "@/hooks/useTickTimer";
import { cn } from "@/lib/utils";

interface TicketCardProps {
  ticket: Ticket;
  projectLabel: string;
  onOpen: (ticket: Ticket) => void;
  /** When set on the "Fini" column, renders a small button to re-check the PR merge status. */
  onCheckMerge?: (ticket: Ticket) => Promise<void>;
}

export function TicketCard({ ticket, projectLabel, onOpen, onCheckMerge }: TicketCardProps) {
  const now = useTickTimer();
  const [checkingMerge, setCheckingMerge] = useState(false);
  const implementationDuration = ticket.column === "merged" ? ticketImplementationDuration(ticket) : null;
  const prNumber = ticketPrNumber(ticket);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: ticket.id,
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={() => onOpen(ticket)}
      className={cn(
        "cursor-grab rounded-lg border bg-card p-3 shadow-sm transition-colors hover:border-ring active:cursor-grabbing",
        ticket.stage === "failed" && "border-destructive/60",
        ticket.watchdogFlagged && "border-warning/60",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="min-w-0 break-words text-sm font-medium leading-snug">{ticket.title}</h3>
        <div className="flex shrink-0 items-center gap-1">
          {ticket.triageStatus === "done" && ticket.triageVerdict && <TriageDot verdict={ticket.triageVerdict} />}
          <Badge variant="outline" className="text-[10px]">
            {projectLabel}
          </Badge>
        </div>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        {ticket.triageStatus === "running" && (
          <Badge variant="secondary" className="gap-1 text-[10px]">
            <Loader2 className="h-3 w-3 animate-spin" /> Analyse…
          </Badge>
        )}
        {ticket.kind === "review" && (
          <Badge variant="secondary" className="gap-1 text-[10px]">
            <Eye className="h-3 w-3" /> Review
          </Badge>
        )}
        {ticket.kind === "clean" && (
          <Badge variant="secondary" className="gap-1 text-[10px]">
            <Brush className="h-3 w-3" /> Clean
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
        {extractFigmaUrls(ticket.description).length > 0 && (
          <Badge variant="secondary" className="gap-1 text-[10px]">
            <Palette className="h-3 w-3" /> UI
          </Badge>
        )}
        {ticket.implementer === "composer" && (
          <Badge variant="secondary" className="gap-1 text-[10px]">
            <Sparkles className="h-3 w-3" /> Composer
          </Badge>
        )}
        {ticket.prUrl && (
          <a
            href={ticket.prUrl}
            target="_blank"
            rel="noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
          >
            <ExternalLink className="h-3 w-3" />
            {prNumber !== null ? `PR #${prNumber}` : "PR"}
          </a>
        )}
        {ticket.column === "done" && ticket.kind === "feature" && onCheckMerge && (
          <button
            type="button"
            disabled={checkingMerge}
            onClick={(e) => {
              e.stopPropagation();
              setCheckingMerge(true);
              void onCheckMerge(ticket).finally(() => setCheckingMerge(false));
            }}
            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground hover:underline disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:no-underline"
          >
            {checkingMerge ? <Loader2 className="h-3 w-3 animate-spin" /> : <GitMerge className="h-3 w-3" />}
            Vérifier le merge
          </button>
        )}
      </div>

      {ticket.stage && <StageProgressBar stage={ticket.stage} animated={isStageAnimated(ticket.stage)} />}

      <div className="mt-1.5 flex items-center gap-1 text-[10px] text-muted-foreground">
        <Clock className="h-3 w-3 shrink-0" aria-hidden="true" />
        {implementationDuration !== null ? (
          <span>Implémentée en {formatDuration(implementationDuration)}</span>
        ) : (
          <span>{formatRelativeDuration(ticketElapsedStart(ticket), now)}</span>
        )}
      </div>
    </div>
  );
}

function TriageDot({ verdict }: { verdict: NonNullable<Ticket["triageVerdict"]> }) {
  const { glyph, className, title } = triageVerdictDot(verdict);
  return (
    <span className={cn("text-xs font-bold leading-none", className)} title={title} aria-label={title}>
      {glyph}
    </span>
  );
}

export function resolveProjectLabel(projects: ProjectInfo[], key: string): string {
  return projects.find((p) => p.key === key)?.label ?? key;
}
