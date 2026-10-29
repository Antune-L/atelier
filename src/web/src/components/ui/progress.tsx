import type { HTMLAttributes } from "react";

import { cn } from "@/lib/utils";

interface ProgressProps extends HTMLAttributes<HTMLDivElement> {
  value: number | null;
  max: number;
}

const FULL_PERCENTAGE = 100;

export function Progress({ value, max, className, ...props }: ProgressProps) {
  const percentage = value === null ? null : Math.min(FULL_PERCENTAGE, Math.max(0, value / max * FULL_PERCENTAGE));
  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={value ?? undefined}
      className={cn("relative h-2 w-full overflow-hidden rounded-full bg-primary/15", className)}
      {...props}
    >
      <div
        className={cn("h-full rounded-full bg-primary", percentage === null && "w-1/3 animate-pulse motion-reduce:animate-none")}
        style={percentage === null ? undefined : { width: `${percentage}%` }}
      />
    </div>
  );
}
