import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ExternalLink, GitMerge, Loader2 } from "lucide-react";
import { useState } from "react";
import type { CSSProperties } from "react";

import type { ProjectInfo, Ticket } from "@shared/schemas";

import { StageProgressBar } from "@/components/StageProgressBar";
import {
  formatDuration,
  formatRelativeDuration,
  isStageAnimated,
  ticketCardState,
  ticketElapsedStart,
  ticketImplementationDuration,
  ticketPrNumber,
  triageVerdictDot,
  type CardState,
} from "@/lib/display";
import { useTickTimer } from "@/hooks/useTickTimer";
import { cn } from "@/lib/utils";

interface TicketCardProps {
  ticket: Ticket;
  projectLabel: string;
  /** Optional CSS color value applied as the text colour of the project token. */
  projectColor?: string;
  /** The dependency parent (resolved by the caller, which holds the full board), or null/undefined. */
  parent?: Ticket | null;
  onOpen: (ticket: Ticket) => void;
  /** When set on the "Fini" column, renders a small button to re-check the PR merge status. */
  onCheckMerge?: (ticket: Ticket) => Promise<void>;
}

/** Left-edge stripe: the single glanceable signal of what the ticket is doing. */
const STATE_STRIPE_COLORS: Record<CardState, string> = {
  running: "bg-info",
  attention: "bg-warning",
  failed: "bg-danger",
  done: "bg-success",
  idle: "bg-border",
};

const PARENT_TITLE_MAX_CHARS = 24;

function truncateParentTitle(title: string): string {
  if (title.length <= PARENT_TITLE_MAX_CHARS) return title;
  return `${title.slice(0, PARENT_TITLE_MAX_CHARS - 1)}…`;
}

export function TicketCard({ ticket, projectLabel, projectColor, parent, onOpen, onCheckMerge }: TicketCardProps) {
  const now = useTickTimer();
  const parentBlocked = ticket.dependsOn ? !parent || parent.prUrl === null || parent.branch === null : false;
  const [checkingMerge, setCheckingMerge] = useState(false);
  const implementationDuration = ticket.column === "merged" ? ticketImplementationDuration(ticket) : null;
  const prNumber = ticketPrNumber(ticket);
  const state = ticketCardState(ticket);
  const parentTitle = parent?.title ?? "?";
  const dependencyLabel = `${parentBlocked ? "en attente de" : "basé sur"} ${parentTitle}`;
  const elapsedLabel =
    implementationDuration !== null
      ? `Implémentée en ${formatDuration(implementationDuration)}`
      : formatRelativeDuration(ticketElapsedStart(ticket), now);
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
        "relative cursor-grab rounded-md py-2 pl-3 pr-2.5 transition-colors hover:bg-accent/60 active:cursor-grabbing",
        state === "attention" ? "bg-warning/10" : "bg-card",
      )}
    >
      <span aria-hidden className={cn("absolute inset-y-0 left-0 w-0.5 rounded-l-md", STATE_STRIPE_COLORS[state])} />

      <div className="flex items-start justify-between gap-2">
        <h3 className="min-w-0 break-words text-sm font-medium leading-snug">{ticket.title}</h3>
        {ticket.triageStatus === "done" && ticket.triageVerdict && <TriageDot verdict={ticket.triageVerdict} />}
      </div>

      <div className="mt-1 flex flex-wrap items-center gap-x-2 font-mono text-2xs text-muted-foreground">
        <span style={projectColor ? { color: projectColor } : undefined}>{projectLabel}</span>
        {ticket.slotId !== null && <span>slot-{ticket.slotId}</span>}
        <span>{elapsedLabel}</span>
        {ticket.pendingQuestions > 0 && <span className="text-warning">{ticket.pendingQuestions} question(s)</span>}
        {ticket.watchdogFlagged && <span className="text-warning">inactif</span>}
        {ticket.testing && <span>test</span>}
        {ticket.dependsOn && (
          <span className="max-w-full truncate" title={dependencyLabel}>
            ↳ {truncateParentTitle(parentTitle)}
          </span>
        )}
        {ticket.triageStatus === "running" && (
          <span className="inline-flex items-center gap-1">
            <Loader2 className="h-3 w-3 animate-spin" /> Analyse…
          </span>
        )}
        {ticket.prUrl && (
          <a
            href={ticket.prUrl}
            target="_blank"
            rel="noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="inline-flex items-center gap-1 text-foreground hover:underline"
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
            className="inline-flex items-center gap-1 font-mono text-2xs hover:text-foreground hover:underline disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:no-underline"
          >
            {checkingMerge ? <Loader2 className="h-3 w-3 animate-spin" /> : <GitMerge className="h-3 w-3" />}
            Vérifier le merge
          </button>
        )}
      </div>

      {ticket.stage && <StageProgressBar stage={ticket.stage} animated={isStageAnimated(ticket.stage)} />}
    </div>
  );
}

function TriageDot({ verdict }: { verdict: NonNullable<Ticket["triageVerdict"]> }) {
  const { glyph, className, title } = triageVerdictDot(verdict);
  return (
    <span className={cn("shrink-0 text-xs font-bold leading-none", className)} title={title} aria-label={title}>
      {glyph}
    </span>
  );
}

export function resolveProjectLabel(projects: ProjectInfo[], key: string): string {
  return projects.find((p) => p.key === key)?.label ?? key;
}

export function resolveProjectColor(projects: ProjectInfo[], key: string): string | undefined {
  return projects.find((p) => p.key === key)?.color;
}

export function projectBadgeStyle(color: string | undefined): CSSProperties | undefined {
  if (!color) return undefined;
  return { backgroundColor: color, borderColor: color, color: "#fff" };
}
