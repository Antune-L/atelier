import type { Ticket } from "@shared/schemas";

import { stageLabel, stageProgress, type ProgressColor } from "@/lib/display";
import { cn } from "@/lib/utils";

interface StageProgressBarProps {
  stage: NonNullable<Ticket["stage"]>;
  animated: boolean;
}

const PROGRESS_BAR_COLORS: Record<ProgressColor, string> = {
  info: "bg-info",
  success: "bg-success",
  destructive: "bg-destructive",
  warning: "bg-warning",
};

/** Stage progress bar with a label, shared by the kanban card and the agents view. */
export function StageProgressBar({ stage, animated }: StageProgressBarProps) {
  const { percent, color } = stageProgress(stage);
  return (
    <div className="mt-2 space-y-1">
      <div
        role="progressbar"
        aria-valuenow={Math.round(percent)}
        aria-valuemin={0}
        aria-valuemax={100}
        className="h-1.5 w-full overflow-hidden rounded-full bg-muted"
      >
        <div
          className={cn(
            "h-full rounded-full transition-all duration-500",
            PROGRESS_BAR_COLORS[color],
            animated && "animate-pulse",
          )}
          style={{ width: `${percent}%` }}
        />
      </div>
      <p className="text-[10px] text-muted-foreground">{stageLabel(stage)}</p>
    </div>
  );
}
