import type { PrdOutlineEntry } from "@shared/prdMarkdown";

import { FIELD_LABEL_CLASSES } from "@/lib/overlayStyles";
import { cn } from "@/lib/utils";

interface PrdOutlineNavProps {
  entries: PrdOutlineEntry[];
  onNavigate: (anchor: string) => void;
  className?: string;
}

/** PRD table of contents ("Sommaire"): one indented button per navigable heading. */
export function PrdOutlineNav({ entries, onNavigate, className }: PrdOutlineNavProps) {
  return (
    <nav aria-label="Sommaire du PRD" className={className}>
      <h4 className={cn("mb-2 px-2", FIELD_LABEL_CLASSES)}>Sommaire</h4>
      <ul className="space-y-0.5">
        {entries.map((entry) => (
          <li key={entry.anchor}>
            <button
              type="button"
              onClick={() => onNavigate(entry.anchor)}
              title={entry.label}
              className={cn(
                "w-full truncate rounded-sm px-2 py-1 text-left text-xs transition-colors hover:bg-accent hover:text-foreground",
                entry.depth === 0 ? "font-medium text-foreground" : "pl-5 text-muted-foreground",
              )}
            >
              {entry.label}
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
}
