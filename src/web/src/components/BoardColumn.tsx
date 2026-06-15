import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { PanelLeftClose, PanelLeftOpen, Plus, Rocket } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import type { ProjectInfo, Ticket } from "@shared/schemas";
import { COLUMN_LABELS, type Column } from "@shared/constants";

import { TicketCard, resolveProjectLabel } from "@/components/TicketCard";
import { cn } from "@/lib/utils";

interface BoardColumnProps {
  column: Column;
  tickets: Ticket[];
  projects: ProjectInfo[];
  onOpenTicket: (ticket: Ticket) => void;
  /** When set on the TODO column, renders a "+" beside the count to create a ticket. */
  onAddTicket?: () => void;
  /** When set on the TODO column, renders a button to send the first eligible tickets to "À implémenter". */
  onMoveAllToImplementing?: () => void;
  /** How many tickets the bulk action would actually start (capped by free slots); disables the button at 0. */
  moveAllCount?: number;
  /** True while a bulk launch is in flight — disables the button to prevent re-entry. */
  moveAllBusy?: boolean;
}

const COLLAPSE_KEY_PREFIX = "column-collapsed:";

/** Cards rendered before any scroll. */
const WINDOW_INITIAL_SIZE = 20;
/** Cards added each time the bottom sentinel comes into view. */
const WINDOW_INCREMENT = 20;

/** Grow the next batch slightly before the sentinel is fully in view, for seamless scrolling. */
const WINDOW_PREFETCH_MARGIN = "200px";

/**
 * Progressive client-side windowing for a fully in-memory list. Renders an initial slice and
 * grows it whenever the bottom sentinel scrolls into view of the column's own scroll container,
 * clamping to the total length when the underlying list shrinks.
 */
function useWindowedTickets(tickets: Ticket[]): {
  visibleTickets: Ticket[];
  sentinelRef: React.RefObject<HTMLDivElement>;
  scrollRef: React.MutableRefObject<HTMLDivElement | null>;
  hasMore: boolean;
} {
  const sentinelRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [visibleCount, setVisibleCount] = useState(WINDOW_INITIAL_SIZE);
  // Restart from the first page when a filter/search collapses the list to within the initial page,
  // so clearing the filter later doesn't restore a stale expanded window. (render-phase reset, not an effect)
  const [trackedLength, setTrackedLength] = useState(tickets.length);
  if (tickets.length !== trackedLength) {
    setTrackedLength(tickets.length);
    if (tickets.length <= WINDOW_INITIAL_SIZE) setVisibleCount(WINDOW_INITIAL_SIZE);
  }

  const clampedCount = Math.min(visibleCount, tickets.length);
  const hasMore = clampedCount < tickets.length;

  useEffect(() => {
    if (!hasMore) return;
    const sentinel = sentinelRef.current;
    const root = scrollRef.current;
    if (sentinel === null || root === null) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setVisibleCount((current) => current + WINDOW_INCREMENT);
        }
      },
      { root, rootMargin: WINDOW_PREFETCH_MARGIN },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore]);

  const visibleTickets = useMemo(
    () => tickets.slice(0, clampedCount),
    [tickets, clampedCount],
  );

  return { visibleTickets, sentinelRef, scrollRef, hasMore };
}

/** "PR mergée"/"PR reviewed"/"Répondu" pile up over time, so they start folded; others start open. */
const DEFAULT_COLLAPSED: Partial<Record<Column, boolean>> = { merged: true, reviewed: true, answered: true };

function readCollapsed(column: Column): boolean {
  const stored = localStorage.getItem(`${COLLAPSE_KEY_PREFIX}${column}`);
  if (stored === null) return DEFAULT_COLLAPSED[column] ?? false;
  return stored === "1";
}

function writeCollapsed(column: Column, collapsed: boolean): void {
  localStorage.setItem(`${COLLAPSE_KEY_PREFIX}${column}`, collapsed ? "1" : "0");
}

function resolveMoveAllTitle(count: number, busy: boolean): string {
  if (busy) return "Lancement en cours…";
  if (count === 0) return "Aucun slot libre";
  return `Lancer ${count} ticket(s) dans « À implémenter »`;
}

export function BoardColumn({
  column,
  tickets,
  projects,
  onOpenTicket,
  onAddTicket,
  onMoveAllToImplementing,
  moveAllCount = 0,
  moveAllBusy = false,
}: BoardColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: column });
  const [collapsed, setCollapsed] = useState(() => readCollapsed(column));
  const label = COLUMN_LABELS[column];

  // Every column windows its card list so long piles stay responsive.
  const { visibleTickets, sentinelRef, scrollRef, hasMore } = useWindowedTickets(tickets);

  // The card container is both the dnd droppable and the windowing scroll root, so compose both refs.
  const setCardContainerRef = (node: HTMLDivElement | null): void => {
    setNodeRef(node);
    scrollRef.current = node;
  };

  const toggle = (): void => {
    const next = !collapsed;
    setCollapsed(next);
    writeCollapsed(column, next);
  };

  const countBadge = (
    <span className="rounded-full bg-background px-2 py-0.5 text-xs font-medium text-muted-foreground">
      {tickets.length}
    </span>
  );

  const canAdd = column === "todo" && onAddTicket !== undefined;
  const canMoveAll = column === "todo" && onMoveAllToImplementing !== undefined && tickets.length > 0;
  const moveAllButtonTitle = resolveMoveAllTitle(moveAllCount, moveAllBusy);
  const headerTrailing =
    canAdd || canMoveAll ? (
      <div className="flex items-center gap-1">
        {countBadge}
        {canMoveAll && (
          <button
            type="button"
            onClick={onMoveAllToImplementing}
            disabled={moveAllCount === 0 || moveAllBusy}
            className="flex h-5 w-5 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-background hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-muted-foreground"
            title={moveAllButtonTitle}
            aria-label="Tout lancer dans À implémenter"
          >
            <Rocket className="h-3.5 w-3.5" />
          </button>
        )}
        {canAdd && (
          <button
            type="button"
            onClick={onAddTicket}
            className="flex h-5 w-5 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-background hover:text-foreground"
            title="Nouveau ticket"
            aria-label="Nouveau ticket"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    ) : (
      countBadge
    );

  if (collapsed) {
    return (
      <div
        ref={setNodeRef}
        className={cn(
          "flex w-12 shrink-0 flex-col items-center rounded-xl border border-border bg-secondary/70 shadow-sm transition-colors",
          isOver && "bg-accent/70",
        )}
      >
        <button
          type="button"
          onClick={toggle}
          className="flex h-full w-full flex-col items-center gap-3 py-3 text-muted-foreground hover:text-foreground"
          title={`Déplier « ${label} »`}
          aria-label={`Déplier « ${label} »`}
        >
          <PanelLeftOpen className="h-4 w-4" />
          {countBadge}
          <span className="text-sm font-semibold text-foreground [writing-mode:vertical-rl]">{label}</span>
        </button>
      </div>
    );
  }

  return (
    <div className="flex w-72 shrink-0 flex-col rounded-xl border border-border bg-secondary/70 shadow-sm">
      <div className="flex items-center justify-between border-b border-border/70 px-3 py-2">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={toggle}
            className="text-muted-foreground hover:text-foreground"
            title={`Replier « ${label} »`}
            aria-label={`Replier « ${label} »`}
          >
            <PanelLeftClose className="h-4 w-4" />
          </button>
          <h2 className="text-sm font-semibold text-foreground">{label}</h2>
        </div>
        {headerTrailing}
      </div>
      <div
        ref={setCardContainerRef}
        className={cn(
          "flex max-h-[70vh] min-h-[60vh] flex-col gap-2 overflow-y-auto rounded-b-xl p-2 transition-colors",
          isOver && "bg-accent/70",
        )}
      >
        <SortableContext items={visibleTickets.map((t) => t.id)} strategy={verticalListSortingStrategy}>
          {visibleTickets.map((ticket) => (
            <TicketCard
              key={ticket.id}
              ticket={ticket}
              projectLabel={resolveProjectLabel(projects, ticket.project)}
              onOpen={onOpenTicket}
            />
          ))}
        </SortableContext>
        {hasMore && <div ref={sentinelRef} className="h-px shrink-0" aria-hidden />}
      </div>
    </div>
  );
}
