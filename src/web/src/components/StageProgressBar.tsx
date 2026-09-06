import type { Ticket } from "@shared/schemas";

import { stageCardState, stageLabel, stageSteps, type CardState } from "@/lib/display";
import { cn } from "@/lib/utils";

interface StageProgressBarProps {
  stage: NonNullable<Ticket["stage"]>;
  animated: boolean;
}

const GLYPH_FILLED = "▮";
const GLYPH_EMPTY = "▯";

const FILLED_GLYPH_COLORS: Record<CardState, string> = {
  running: "text-info",
  attention: "text-warning",
  failed: "text-danger",
  done: "text-success",
  idle: "text-muted-foreground",
};

/** Stage progress as a monospace glyph bar, shared by the kanban card and the agents view. */
export function StageProgressBar({ stage, animated }: StageProgressBarProps) {
  const { index, total } = stageSteps(stage);
  const label = stageLabel(stage);
  return (
    <div
      role="progressbar"
      aria-valuenow={index}
      aria-valuemin={0}
      aria-valuemax={total}
      aria-label={label}
      className="mt-1.5 flex items-center justify-between gap-2 font-mono text-2xs text-muted-foreground"
    >
      <span className="min-w-0 truncate">
        <span className={cn(FILLED_GLYPH_COLORS[stageCardState(stage)], animated && "animate-pulse")}>
          {GLYPH_FILLED.repeat(index)}
        </span>
        {GLYPH_EMPTY.repeat(total - index)} {label}
      </span>
      <span className="shrink-0 tabular-nums">
        {index}/{total}
      </span>
    </div>
  );
}
