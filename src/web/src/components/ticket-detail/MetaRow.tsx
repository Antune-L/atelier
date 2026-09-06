import type { ReactNode } from "react";

interface MetaRowProps {
  label: string;
  children: ReactNode;
}

/** One key/value line of the ticket sheet's meta column. */
export function MetaRow({ label, children }: MetaRowProps) {
  return (
    <div className="flex justify-between gap-2 text-xs">
      <span className="shrink-0 text-muted-foreground">{label}</span>
      <span className="min-w-0 truncate text-right font-mono text-2xs">{children}</span>
    </div>
  );
}
