import type { ReviewFlag, ReviewLevel } from "@shared/constants";

import { REVIEW_LEVEL_DISPLAY, REVIEW_LEVEL_DOT_CLASSES, reviewLevelTooltip } from "@/lib/display";
import { cn } from "@/lib/utils";

interface ReviewLevelDotProps {
  level: ReviewLevel;
  reason?: string | null;
  flags?: readonly ReviewFlag[];
  withLabel?: boolean;
  className?: string;
}

export function ReviewLevelDot({ level, reason, flags, withLabel, className }: ReviewLevelDotProps) {
  const display = REVIEW_LEVEL_DISPLAY[level];
  const tooltip = reviewLevelTooltip(level, reason, flags);
  const dotClasses = cn("inline-block size-[9px] shrink-0 rounded-full", REVIEW_LEVEL_DOT_CLASSES[level]);
  if (!withLabel) {
    return <span role="img" aria-label={display.label} title={tooltip} className={cn(dotClasses, className)} />;
  }
  return (
    <span className={cn("inline-flex items-center gap-1.5", className)} title={tooltip}>
      <span aria-hidden className={dotClasses} />
      <span>{display.label}</span>
    </span>
  );
}
