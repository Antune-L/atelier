import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import {
  ArrowDownWideNarrow,
  ArrowUpNarrowWide,
  GitBranch,
  GitMerge,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Rocket,
  ScanSearch,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import type { ProjectInfo, Ticket } from "@shared/schemas";
import { COLUMN_LABELS, COLUMN_SORT_FIELD, SPLIT_BRANCH_PREFIX, type Column } from "@shared/constants";

import { ColumnActionsMenu } from "@/components/ColumnActionsMenu";
import { TicketCard, resolveProjectColor, resolveProjectLabel } from "@/components/TicketCard";
import { cn } from "@/lib/utils";

interface BoardColumnProps {
  column: Column;
  tickets: Ticket[];
  projects: ProjectInfo[];
  /** Full-board lookup for resolving a card's dependency parent (which may live in another column). */
  ticketsById: Map<string, Ticket>;
  onOpenTicket: (ticket: Ticket) => void;
  /** When set on the TODO column, renders a "+" beside the count to create a ticket. */
  onAddTicket?: () => void;
  /** When set on the TODO column, renders a button to send the first eligible tickets to "À implémenter". */
  onMoveAllToImplementing?: () => void;
  /** How many tickets the bulk action would actually start (capped by free slots); disables the button at 0. */
  moveAllCount?: number;
  /** True while a bulk launch is in flight — disables the button to prevent re-entry. */
  moveAllBusy?: boolean;
  /** When set on the TODO column, runs the batch feasibility analysis on eligible tickets. */
  onAnalyzeAll?: () => void;
  /** How many TODO tickets the bulk analysis targets; disables the item at 0. */
  analyzeAllCount?: number;
  /** True while a bulk analysis launch is in flight. */
  analyzeAllBusy?: boolean;
  /** When set on the "Fini" column, lets each card re-check its PR merge status. */
  onCheckMerge?: (ticket: Ticket) => Promise<void>;
  /** When set on the "Fini" column, re-checks the merge status of every eligible card at once. */
  onCheckAllMerges?: () => void;
  /** How many "Fini" cards the bulk check targets; disables the button at 0. */
  checkAllCount?: number;
  /** True while a bulk merge check is in flight — disables the button to prevent re-entry. */
  checkAllBusy?: boolean;
}

/** Stable placeholder so a menu item with an undefined handler still has a callable onSelect. */
const NOOP = (): void => {};

const COLLAPSE_KEY_PREFIX = "column-collapsed:";
const SORT_DIR_KEY_PREFIX = "column-sort-dir:";

type SortDir = "asc" | "desc";

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

function readSortDir(column: Column): SortDir {
  const stored = localStorage.getItem(`${SORT_DIR_KEY_PREFIX}${column}`);
  return stored === "asc" ? "asc" : "desc";
}

function writeSortDir(column: Column, dir: SortDir): void {
  localStorage.setItem(`${SORT_DIR_KEY_PREFIX}${column}`, dir);
}

function resolveMoveAllTitle(count: number, busy: boolean): string {
  if (busy) return "Lancement en cours…";
  if (count === 0) return "Aucun slot libre";
  return `Lancer ${count} ticket(s) dans « À implémenter »`;
}

function resolveAnalyzeAllTitle(count: number, busy: boolean): string {
  if (busy) return "Analyse en cours…";
  if (count === 0) return "Aucun ticket à analyser";
  return `Analyser ${count} ticket(s)`;
}

function resolveCheckAllTitle(count: number, busy: boolean): string {
  if (busy) return "Vérification en cours…";
  if (count === 0) return "Aucune carte à vérifier";
  return `Vérifier le merge de ${count} carte(s)`;
}

/** A split mother carries a branch under the dedicated split prefix. */
function isSplitMother(ticket: Ticket): boolean {
  return ticket.branch !== null && ticket.branch.startsWith(SPLIT_BRANCH_PREFIX);
}

/**
 * The split-family key for a ticket: its own id when it is a split mother, the mother's id when it
 * directly depends on a split mother, or null for non-family / regular dependency tickets.
 */
function familyKeyOf(ticket: Ticket, ticketsById: Map<string, Ticket>): string | null {
  if (isSplitMother(ticket)) return ticket.id;
  if (ticket.dependsOn === null) return null;
  const parent = ticketsById.get(ticket.dependsOn);
  if (parent !== undefined && isSplitMother(parent)) return parent.id;
  return null;
}

type RenderGroup =
  | { kind: "single"; ticket: Ticket }
  | { kind: "family"; familyKey: string; members: Ticket[] };

/**
 * Partition an already-sorted, windowed list into ordered render groups: standalone cards keep their
 * position, while tickets sharing a split-family key collapse into one framed group ordered by first
 * appearance and preserving member order.
 */
function groupTicketsByFamily(tickets: Ticket[], ticketsById: Map<string, Ticket>): RenderGroup[] {
  const groups: RenderGroup[] = [];
  const familyGroupByKey = new Map<string, { kind: "family"; familyKey: string; members: Ticket[] }>();
  for (const ticket of tickets) {
    const familyKey = familyKeyOf(ticket, ticketsById);
    if (familyKey === null) {
      groups.push({ kind: "single", ticket });
      continue;
    }
    const existing = familyGroupByKey.get(familyKey);
    if (existing === undefined) {
      const group = { kind: "family" as const, familyKey, members: [ticket] };
      familyGroupByKey.set(familyKey, group);
      groups.push(group);
      continue;
    }
    existing.members.push(ticket);
  }
  return groups;
}

/** Flatten a render group back to its ticket ids in render order, for the sortable items list. */
function groupTicketIds(group: RenderGroup): string[] {
  if (group.kind === "single") return [group.ticket.id];
  return group.members.map((member) => member.id);
}

export function BoardColumn({
  column,
  tickets,
  projects,
  ticketsById,
  onOpenTicket,
  onAddTicket,
  onMoveAllToImplementing,
  moveAllCount = 0,
  moveAllBusy = false,
  onAnalyzeAll,
  analyzeAllCount = 0,
  analyzeAllBusy = false,
  onCheckMerge,
  onCheckAllMerges,
  checkAllCount = 0,
  checkAllBusy = false,
}: BoardColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: column });
  const [collapsed, setCollapsed] = useState(() => readCollapsed(column));
  const [sortDir, setSortDir] = useState(() => readSortDir(column));
  const label = COLUMN_LABELS[column];

  const sortField = COLUMN_SORT_FIELD[column];
  const sortedTickets = useMemo(() => {
    if (sortField === undefined) return tickets;
    const value = (t: Ticket): number => (sortField === "finishedAt" ? (t.finishedAt ?? t.updatedAt) : t.createdAt);
    return [...tickets].sort((a, b) => (sortDir === "desc" ? value(b) - value(a) : value(a) - value(b)));
  }, [tickets, sortField, sortDir]);

  // Every column windows its card list so long piles stay responsive.
  const { visibleTickets, sentinelRef, scrollRef, hasMore } = useWindowedTickets(sortedTickets);

  const renderGroups = useMemo(
    () => groupTicketsByFamily(visibleTickets, ticketsById),
    [visibleTickets, ticketsById],
  );

  // The sortable items must list ids in the actual rendered (grouped) order, not the raw sort order,
  // or dnd-kit's vertical strategy maps drop targets to the wrong indices for framed members.
  const sortableIds = useMemo(() => renderGroups.flatMap(groupTicketIds), [renderGroups]);

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

  const toggleSort = (): void => {
    const next: SortDir = sortDir === "desc" ? "asc" : "desc";
    setSortDir(next);
    writeSortDir(column, next);
  };

  const countBadge = (
    <span className="rounded-full bg-background px-2 py-0.5 text-xs font-medium text-muted-foreground">
      {tickets.length}
    </span>
  );

  const canAdd = column === "todo" && onAddTicket !== undefined;
  const canCheckAll = column === "done" && onCheckAllMerges !== undefined;
  const canColumnMenu = column === "todo" && (onMoveAllToImplementing !== undefined || onAnalyzeAll !== undefined);
  const moveAllButtonTitle = resolveMoveAllTitle(moveAllCount, moveAllBusy);
  const analyzeAllButtonTitle = resolveAnalyzeAllTitle(analyzeAllCount, analyzeAllBusy);
  const checkAllButtonTitle = resolveCheckAllTitle(checkAllCount, checkAllBusy);
  const columnMenuItems = useMemo(
    () => [
      {
        label: "Lancer tous les tickets",
        icon: Rocket,
        onSelect: onMoveAllToImplementing ?? NOOP,
        disabled: onMoveAllToImplementing === undefined || moveAllCount === 0 || moveAllBusy,
        title: moveAllButtonTitle,
      },
      {
        label: "Lancer l'analyse de tous les tickets",
        icon: ScanSearch,
        onSelect: onAnalyzeAll ?? NOOP,
        disabled: onAnalyzeAll === undefined || analyzeAllCount === 0 || analyzeAllBusy,
        title: analyzeAllButtonTitle,
      },
    ],
    [
      onMoveAllToImplementing,
      moveAllCount,
      moveAllBusy,
      moveAllButtonTitle,
      onAnalyzeAll,
      analyzeAllCount,
      analyzeAllBusy,
      analyzeAllButtonTitle,
    ],
  );
  const headerTrailing =
    canAdd || canColumnMenu || canCheckAll ? (
      <div className="flex items-center gap-1">
        {countBadge}
        {canCheckAll && (
          <button
            type="button"
            onClick={onCheckAllMerges}
            disabled={checkAllCount === 0 || checkAllBusy}
            className="flex h-5 w-5 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-background hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-muted-foreground"
            title={checkAllButtonTitle}
            aria-label="Vérifier le merge de toutes les cartes"
          >
            <GitMerge className="h-3.5 w-3.5" />
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
        {canColumnMenu && <ColumnActionsMenu items={columnMenuItems} ariaLabel="Actions de la colonne" />}
      </div>
    ) : (
      countBadge
    );

  if (collapsed) {
    return (
      <div
        ref={setNodeRef}
        className={cn(
          "flex h-full w-12 shrink-0 flex-col items-center rounded-xl border border-border bg-secondary/70 shadow-sm transition-colors",
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
    <div className="flex h-full w-72 shrink-0 flex-col rounded-xl border border-border bg-secondary/70 shadow-sm">
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
          {sortField !== undefined && (
            <button
              type="button"
              onClick={toggleSort}
              className="text-muted-foreground hover:text-foreground"
              title={sortDir === "desc" ? "Tri : plus récents d'abord" : "Tri : plus anciens d'abord"}
              aria-label={sortDir === "desc" ? "Tri : plus récents d'abord, cliquer pour inverser" : "Tri : plus anciens d'abord, cliquer pour inverser"}
            >
              {sortDir === "desc" ? (
                <ArrowDownWideNarrow className="h-4 w-4" />
              ) : (
                <ArrowUpNarrowWide className="h-4 w-4" />
              )}
            </button>
          )}
        </div>
        {headerTrailing}
      </div>
      <div
        ref={setCardContainerRef}
        className={cn(
          "flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto rounded-b-xl p-2 transition-colors",
          isOver && "bg-accent/70",
        )}
      >
        <SortableContext items={sortableIds} strategy={verticalListSortingStrategy}>
          {renderGroups.map((group) => {
            const renderCard = (ticket: Ticket): React.ReactElement => (
              <TicketCard
                key={ticket.id}
                ticket={ticket}
                projectLabel={resolveProjectLabel(projects, ticket.project)}
                projectColor={resolveProjectColor(projects, ticket.project)}
                parent={ticket.dependsOn ? ticketsById.get(ticket.dependsOn) ?? null : null}
                onOpen={onOpenTicket}
                onCheckMerge={onCheckMerge}
              />
            );

            if (group.kind === "single") return renderCard(group.ticket);

            const mother = ticketsById.get(group.familyKey);
            const headerTitle = mother?.title ?? null;

            return (
              <div
                key={group.familyKey}
                className="flex flex-col gap-2 rounded-lg border border-dashed border-border/80 bg-background/30 p-2"
              >
                {headerTitle !== null && (
                  <div className="flex items-center gap-1.5 px-0.5 text-xs font-medium text-muted-foreground">
                    <GitBranch className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate" title={headerTitle}>
                      {headerTitle}
                    </span>
                  </div>
                )}
                {group.members.map(renderCard)}
              </div>
            );
          })}
        </SortableContext>
        {hasMore && <div ref={sentinelRef} className="h-px shrink-0" aria-hidden />}
      </div>
    </div>
  );
}
