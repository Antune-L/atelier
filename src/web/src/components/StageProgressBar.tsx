import type { Ticket } from "@shared/schemas";

import { stageCardState, stageLabel, stageSteps, type CardState } from "@/lib/display";
import { cn } from "@/lib/utils";

interface StageProgressBarProps {
  stage: NonNullable<Ticket["stage"]>;
  animated: boolean;
}

const FILLED_STEP_COLORS: Record<CardState, string> = {
  running: "bg-info",
  attention: "bg-warning",
  failed: "bg-danger",
  done: "bg-success",
  idle: "bg-muted-foreground",
};

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
      aria-valuetext={`${label} · étape ${index} sur ${total}`}
      className="mt-1.5 space-y-1.5 text-2xs text-muted-foreground"
    >
      <div className="flex items-center justify-between gap-2"><span className="min-w-0 truncate">{label}</span><span className="shrink-0 tabular-nums">{index}/{total}</span></div>
      <div aria-hidden="true" className="flex gap-1">{Array.from({ length: total }, (_, step) => <span key={step} className={cn("h-1 min-w-0 flex-1 rounded-full", step < index ? FILLED_STEP_COLORS[stageCardState(stage)] : "bg-border", step === index - 1 && animated && "animate-pulse")} />)}</div>
    </div>
  );
}
