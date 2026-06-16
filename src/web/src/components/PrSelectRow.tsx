import { Check } from "lucide-react";

import type { OpenPr } from "@shared/schemas";

import { Badge } from "@/components/ui/badge";
import { isPrNeedsAttention } from "@/lib/pr";
import { cn } from "@/lib/utils";

interface PrSelectRowProps {
  pr: OpenPr;
  selected: boolean;
  onToggle: () => void;
}

/** A selectable PR row (checkbox + metadata) shared by the review and clean PR pickers. */
export function PrSelectRow({ pr, selected, onToggle }: PrSelectRowProps) {
  const needsAttention = isPrNeedsAttention(pr);
  return (
    <button
      type="button"
      onClick={onToggle}
      className={cn(
        "flex w-full items-start gap-3 rounded-md border p-2.5 text-left transition-colors hover:border-ring",
        selected && "border-primary bg-primary/5",
        needsAttention && !selected && "border-warning/50 bg-warning/5",
      )}
    >
      <span
        className={cn(
          "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border",
          selected ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground/40",
        )}
      >
        {selected && <Check className="h-3 w-3" />}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="truncate text-sm font-medium">{pr.title}</span>
          <span className="shrink-0 text-xs text-muted-foreground">#{pr.number}</span>
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
          <span className="font-mono">{pr.headBranch}</span>
          <span>· {pr.author}</span>
          <span className="text-success">+{pr.additions}</span>
          <span className="text-destructive">-{pr.deletions}</span>
          {needsAttention && <Badge variant="warning">À reviewer</Badge>}
          {pr.isDraft && <Badge variant="secondary">Draft</Badge>}
        </div>
      </div>
    </button>
  );
}
