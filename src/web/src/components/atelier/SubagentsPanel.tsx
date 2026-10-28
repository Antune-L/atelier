import type { Conversation } from "@shared/schemas";

import { LiveDot } from "@/components/atelier/LiveDot";
import { Badge } from "@/components/ui/badge";
import { FIELD_LABEL_CLASSES } from "@/lib/overlayStyles";

interface SubagentsPanelProps {
  subagents: Conversation["activeSubagents"];
}

/** Right column listing the sub-agents still working in the background. */
export function SubagentsPanel({ subagents }: SubagentsPanelProps) {
  if (subagents.length === 0) return null;
  const title = subagents.length === 1 ? "sous-agent en cours" : "sous-agents en cours";
  return (
    <aside className="hidden min-h-0 w-72 shrink-0 flex-col gap-3 overflow-y-auto border-l border-border px-4 py-3 lg:flex">
      <h3 className="flex items-center gap-2">
        <Badge variant="info">{subagents.length}</Badge>
        <span className={FIELD_LABEL_CLASSES}>{title}</span>
      </h3>
      <ul className="space-y-2 text-xs">
        {subagents.map((subagent) => (
          <li key={subagent.id} className="flex min-w-0 items-center gap-2">
            <LiveDot />
            <span className="truncate" title={subagent.label}>
              {subagent.label}
            </span>
          </li>
        ))}
      </ul>
    </aside>
  );
}
