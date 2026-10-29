import { ChevronDown } from "lucide-react";

import type { Conversation } from "@shared/schemas";

import { LiveDot } from "@/components/atelier/LiveDot";
import { Badge } from "@/components/ui/badge";

interface SubagentsPanelProps {
  subagents: Conversation["activeSubagents"];
}

export function SubagentsPanel({ subagents }: SubagentsPanelProps) {
  if (subagents.length === 0) return null;
  const title = subagents.length === 1 ? "sous-agent en cours" : "sous-agents en cours";
  return (
    <details className="group border-t border-border text-xs">
      <summary className="flex cursor-pointer list-none items-center gap-2 py-2 text-muted-foreground">
        <Badge variant="info">{subagents.length}</Badge>
        <span>{title}</span>
        <ChevronDown className="ml-auto h-3.5 w-3.5 transition-transform group-open:rotate-180 motion-reduce:transition-none" />
      </summary>
      <ul className="max-h-40 space-y-2 overflow-y-auto pb-3">
        {subagents.map((subagent) => (
          <li key={subagent.id} className="flex min-w-0 items-center gap-2">
            <LiveDot />
            <span className="truncate" title={subagent.label}>
              {subagent.label}
            </span>
          </li>
        ))}
      </ul>
    </details>
  );
}
