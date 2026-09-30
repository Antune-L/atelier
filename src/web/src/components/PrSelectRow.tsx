import { Check, ExternalLink } from "lucide-react";

import type { OpenPr } from "@shared/schemas";

import { Badge } from "@/components/ui/badge";
import { isPrNeedsAttention } from "@/lib/pr";
import { cn } from "@/lib/utils";

interface PrSelectRowProps {
  pr: OpenPr;
  selected: boolean;
  onToggle: () => void;
}

export function PrSelectRow({ pr, selected, onToggle }: PrSelectRowProps) {
  const needsAttention = isPrNeedsAttention(pr);
  return (
    <div
      className={cn(
        "flex w-full items-start rounded-md border text-left transition-colors hover:border-ring",
        selected && "border-primary bg-primary/5",
        needsAttention && !selected && "border-warning/50 bg-warning/5",
      )}
    >
      <button
        type="button"
        onClick={onToggle}
        className="flex min-w-0 flex-1 items-start gap-3 p-2.5 text-left"
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
            {pr.additions !== null && <span className="text-success">+{pr.additions}</span>}
            {pr.deletions !== null && <span className="text-destructive">-{pr.deletions}</span>}
            {needsAttention && <Badge variant="warning">À reviewer</Badge>}
            {pr.isDraft && <Badge variant="secondary">Draft</Badge>}
          </div>
        </div>
      </button>
      <a
        href={pr.url}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`Ouvrir la PR #${pr.number} dans le navigateur`}
        title="Ouvrir la PR dans le navigateur"
        className="m-2.5 shrink-0 text-muted-foreground transition-colors hover:text-foreground"
      >
        <ExternalLink className="h-4 w-4" />
      </a>
    </div>
  );
}
