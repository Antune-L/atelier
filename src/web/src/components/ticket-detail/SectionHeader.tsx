import type { ReactNode } from "react";

import { FIELD_LABEL_CLASSES } from "@/lib/overlayStyles";
import { cn } from "@/lib/utils";

interface SectionHeaderProps {
  children: ReactNode;
  /** Rendered on the same row, pushed to the right (e.g. a button). */
  aside?: ReactNode;
  className?: string;
}

/** The one section-header style used across the ticket sheet. */
export function SectionHeader({ children, aside, className }: SectionHeaderProps) {
  if (aside === undefined) {
    return <h3 className={cn(FIELD_LABEL_CLASSES, className)}>{children}</h3>;
  }
  return (
    <div className={cn("flex items-center justify-between gap-2", className)}>
      <h3 className={FIELD_LABEL_CLASSES}>{children}</h3>
      {aside}
    </div>
  );
}
