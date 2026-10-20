import { useDroppable } from "@dnd-kit/core";

import { COLUMN_LABELS, type Column } from "@shared/constants";

import { ReviewLevelDot } from "@/components/ReviewLevelDot";
import { REVIEW_LEVEL_DISPLAY } from "@/lib/display";
import { cn } from "@/lib/utils";

interface TerminalColumnsPanelProps {
  columns: Column[];
  countByColumn: Map<Column, number>;
  highReviewCountByColumn: Map<Column, number>;
  expanded: Set<Column>;
  onToggle: (column: Column) => void;
}

const OPEN_KEY_PREFIX = "terminal-column-open:";

/** "Fini" stays actionable (merge checks), so it starts open; the other terminal lanes start folded. */
const DEFAULT_OPEN: Partial<Record<Column, boolean>> = { done: true };

export function readTerminalColumnOpen(column: Column): boolean {
  const stored = localStorage.getItem(`${OPEN_KEY_PREFIX}${column}`);
  if (stored === null) return DEFAULT_OPEN[column] ?? false;
  return stored === "1";
}

export function writeTerminalColumnOpen(column: Column, open: boolean): void {
  localStorage.setItem(`${OPEN_KEY_PREFIX}${column}`, open ? "1" : "0");
}

interface TerminalRowProps {
  column: Column;
  count: number;
  highReviewCount: number;
  expanded: boolean;
  onToggle: (column: Column) => void;
}

interface TerminalRowButtonProps extends TerminalRowProps {
  isOver: boolean;
  dropRef?: (node: HTMLElement | null) => void;
}

function TerminalRowButton({ column, count, highReviewCount, expanded, isOver, dropRef, onToggle }: TerminalRowButtonProps) {
  const label = COLUMN_LABELS[column];
  const isAlerting = column === "failed" && count > 0;

  return (
    <button
      ref={dropRef}
      type="button"
      onClick={() => onToggle(column)}
      aria-pressed={expanded}
      title={expanded ? `Fermer « ${label} »` : `Ouvrir « ${label} »`}
      className={cn(
        "flex w-full items-center justify-between border-b border-border/60 px-2.5 py-1.5 text-xs transition-colors",
        expanded && "bg-accent text-foreground",
        isOver && "bg-accent/40",
      )}
    >
      <span className={cn("truncate text-muted-foreground", expanded && "text-foreground")}>{label}</span>
      <span className="flex items-center gap-1 font-mono tabular-nums">
        <span className={cn("text-foreground", isAlerting && "text-danger")}>{count}</span>
        {highReviewCount > 0 && (
          <span className="flex items-center gap-1 text-2xs text-muted-foreground" title={`${REVIEW_LEVEL_DISPLAY.high.label} : ${highReviewCount}`}>
            ·
            <ReviewLevelDot level="high" />
            {highReviewCount}
          </span>
        )}
      </span>
    </button>
  );
}

/**
 * Folded row: it is the only drop target for its column, since no lane registers that droppable id
 * while the column stays collapsed into the panel.
 */
function DroppableTerminalRow(props: TerminalRowProps) {
  const { setNodeRef, isOver } = useDroppable({ id: props.column });
  return <TerminalRowButton {...props} isOver={isOver} dropRef={setNodeRef} />;
}

export function TerminalColumnsPanel({ columns, countByColumn, highReviewCountByColumn, expanded, onToggle }: TerminalColumnsPanelProps) {
  return (
    <div className="flex h-full w-40 shrink-0 flex-col border-l border-border">
      <div className="px-2.5 pb-2 pt-1">
        <h2 className="text-2xs font-medium uppercase tracking-wider text-muted-foreground">Livraison et historique</h2>
        <p className="mt-1 text-2xs text-muted-foreground">Ouvrir un état pour ses cartes</p>
      </div>
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
        {columns.map((column) => {
          const row = {
            column,
            count: countByColumn.get(column) ?? 0,
            highReviewCount: highReviewCountByColumn.get(column) ?? 0,
            onToggle,
          };
          // NOTE: an expanded column already owns the droppable id through its lane; registering it
          // here too would give dnd-kit two nodes for the same id.
          if (expanded.has(column)) {
            return <TerminalRowButton key={column} {...row} expanded isOver={false} />;
          }
          return <DroppableTerminalRow key={column} {...row} expanded={false} />;
        })}
      </div>
    </div>
  );
}
