import { cn } from "@/lib/utils";

export type TicketTab = "overview" | "activity" | "description" | "prd" | "terminal";

export const TICKET_TAB_LABELS: Record<TicketTab, string> = {
  overview: "Aperçu",
  activity: "Activité",
  description: "Description",
  prd: "PRD",
  terminal: "Terminal",
};

const TAB_CLASSES =
  "border-b-2 border-transparent px-1 py-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground";
const ACTIVE_TAB_CLASSES = "border-foreground text-foreground";

interface TicketTabsProps {
  tabs: TicketTab[];
  value: TicketTab;
  onChange: (tab: TicketTab) => void;
  /** Unanswered agent questions, shown as a mono counter on the activity tab. */
  questionCount: number;
}

/** Underline tab bar rendered as the ticket sheet's subheader. */
export function TicketTabs({ tabs, value, onChange, questionCount }: TicketTabsProps) {
  return (
    <div role="tablist" className="flex items-center gap-4 border-b border-border px-4">
      {tabs.map((tab) => (
        <button
          key={tab}
          type="button"
          role="tab"
          aria-selected={tab === value}
          onClick={() => onChange(tab)}
          className={cn(TAB_CLASSES, tab === value && ACTIVE_TAB_CLASSES)}
        >
          {TICKET_TAB_LABELS[tab]}
          {tab === "activity" && questionCount > 0 && (
            <span className="ml-1 font-mono text-2xs text-warning">{questionCount}</span>
          )}
        </button>
      ))}
    </div>
  );
}
