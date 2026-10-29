import { ChevronDown } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import type { ActiveSubagent, Conversation, ConversationMessage, FinishedSubagent } from "@shared/schemas";

import { ProviderLogo } from "@/components/usage/ProviderLogo";
import { countSubagentRunActions, formatSubagentDuration, subagentRunKey } from "@/lib/atelier";
import { FIELD_LABEL_CLASSES } from "@/lib/overlayStyles";
import { cn } from "@/lib/utils";

interface SubagentsSidePanelProps {
  conversation: Conversation;
  messages: readonly ConversationMessage[];
  onSelect: (agentId: string) => void;
}

const ROW_CLASSES =
  "flex w-full min-w-0 items-start gap-2 rounded-md px-2 py-1.5 text-left hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

const FINISHED_DOT_CLASSES: Record<FinishedSubagent["status"], string> = {
  done: "bg-success",
  failed: "bg-danger",
  interrupted: "bg-warning",
};

interface StatusLabel {
  text: string;
  className: string;
}

const FINISHED_STATUS_LABELS: Record<FinishedSubagent["status"], StatusLabel | null> = {
  done: null,
  failed: { text: "échoué", className: "text-danger" },
  interrupted: { text: "interrompu", className: "text-warning" },
};

/** Current time refreshed every second, only while `active` is true. */
function useNow(active: boolean): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    setNow(Date.now());
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [active]);
  return now;
}

function actionLabel(count: number): string {
  return count === 1 ? "1 action" : `${count} actions`;
}

/** Right-hand column listing running and finished sub-agents; wide screens only. */
export function SubagentsSidePanel({ conversation, messages, onSelect }: SubagentsSidePanelProps) {
  const { activeSubagents, finishedSubagents } = conversation;
  const now = useNow(activeSubagents.length > 0);
  const actions = useMemo(
    () => countSubagentRunActions(messages, [...finishedSubagents, ...activeSubagents]),
    [messages, finishedSubagents, activeSubagents],
  );
  const finished = useMemo(() => [...finishedSubagents].reverse(), [finishedSubagents]);
  if (activeSubagents.length === 0 && finishedSubagents.length === 0) return null;
  return (
    <aside className="hidden w-[17rem] shrink-0 flex-col gap-3 overflow-y-auto border-l border-border px-3 py-5 min-[1100px]:flex" aria-label="Sous-agents">
      <h3 className={FIELD_LABEL_CLASSES}>Sous-agents · {activeSubagents.length} en cours</h3>
      {activeSubagents.length > 0 && (
        <ul className="space-y-1">
          {activeSubagents.map((subagent) => (
            <li key={subagent.id}>
              <SubagentRow
                subagent={subagent}
                durationMs={now - subagent.startedAt}
                actions={actions.get(subagentRunKey(subagent)) ?? 0}
                dotClassName="animate-pulse bg-info motion-reduce:animate-none"
                statusLabel={null}
                onSelect={onSelect}
              />
            </li>
          ))}
        </ul>
      )}
      {finished.length > 0 && (
        <details className="group border-t border-border pt-2">
          <summary className={cn("flex cursor-pointer list-none items-center gap-2 text-muted-foreground", FIELD_LABEL_CLASSES)}>
            <span>Terminés · {finished.length}</span>
            <ChevronDown className="ml-auto h-3.5 w-3.5 transition-transform group-open:rotate-180 motion-reduce:transition-none" />
          </summary>
          <ul className="mt-1 max-h-[14rem] space-y-1 overflow-y-auto">
            {finished.map((subagent) => (
              <li key={subagentRunKey(subagent)}>
                <SubagentRow
                  subagent={subagent}
                  durationMs={subagent.endedAt - subagent.startedAt}
                  actions={actions.get(subagentRunKey(subagent)) ?? 0}
                  dotClassName={FINISHED_DOT_CLASSES[subagent.status]}
                  statusLabel={FINISHED_STATUS_LABELS[subagent.status]}
                  onSelect={onSelect}
                />
              </li>
            ))}
          </ul>
        </details>
      )}
    </aside>
  );
}

interface SubagentRowProps {
  subagent: ActiveSubagent;
  durationMs: number;
  actions: number;
  dotClassName: string;
  statusLabel: StatusLabel | null;
  onSelect: (agentId: string) => void;
}

function SubagentRow({ subagent, durationMs, actions, dotClassName, statusLabel, onSelect }: SubagentRowProps) {
  return (
    <button type="button" className={ROW_CLASSES} onClick={() => onSelect(subagent.id)} title={subagent.label}>
      <span className="relative mt-0.5 shrink-0">
        <ProviderLogo provider={subagent.provider} />
        <span className={cn("absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full ring-2 ring-background", dotClassName)} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex min-w-0 items-baseline gap-2 text-xs">
          <span className="truncate">{subagent.name || subagent.label}</span>
          <span className="ml-auto shrink-0 font-mono text-2xs text-muted-foreground">{formatSubagentDuration(durationMs)}</span>
        </span>
        <span className="flex min-w-0 items-center gap-1 font-mono text-2xs text-muted-foreground">
          {subagent.type !== null && <span className="truncate">{subagent.type}</span>}
          {subagent.type !== null && <span aria-hidden>·</span>}
          <span className="shrink-0">{actionLabel(actions)}</span>
          {statusLabel !== null && (
            <span className={cn("shrink-0", statusLabel.className)}>· {statusLabel.text}</span>
          )}
        </span>
      </span>
    </button>
  );
}
