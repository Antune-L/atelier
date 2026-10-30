import { Terminal } from "lucide-react";

import { cn } from "@/lib/utils";

export type TicketTab = "overview" | "activity" | "description" | "prd" | "validation" | "verification" | "controls" | "terminal";

type TicketDestination = "overview" | "activity" | "controls" | "documents";

const DESTINATIONS: TicketDestination[] = ["overview", "activity", "controls", "documents"];
const DESTINATION_LABELS: Record<TicketDestination, string> = {
  overview: "Aperçu",
  activity: "Conversation",
  controls: "Contrôles",
  documents: "Documents",
};

export const TICKET_TAB_LABELS: Record<TicketTab, string> = {
  overview: "Aperçu",
  activity: "Conversation",
  description: "Brief",
  prd: "PRD",
  validation: "Critères et preuves",
  verification: "Contrôle croisé",
  controls: "Contrôles",
  terminal: "Session",
};

const TAB_CLASSES = "shrink-0 border-b-2 border-transparent px-1 py-2.5 text-sm text-muted-foreground transition-colors hover:text-foreground";
const ACTIVE_TAB_CLASSES = "border-primary text-foreground font-medium";

function destinationOf(tab: TicketTab): TicketDestination | null {
  if (tab === "description" || tab === "prd") return "documents";
  if (tab === "validation" || tab === "verification" || tab === "controls") return "controls";
  if (tab === "terminal") return null;
  return tab;
}

interface TicketTabsProps {
  tabs: TicketTab[];
  value: TicketTab;
  onChange: (tab: TicketTab) => void;
  questionCount: number;
  testing?: boolean;
}

export function TicketTabs({ tabs, value, onChange, questionCount, testing = false }: TicketTabsProps) {
  const destination = destinationOf(value);
  const selectDestination = (next: TicketDestination): void => {
    if (next === destination) return;
    if (next === "documents") {
      onChange("description");
      return;
    }
    if (next === "controls") {
      onChange(tabs.includes("validation") ? "validation" : "controls");
      return;
    }
    onChange(next);
  };

  return (
    <div className="flex flex-wrap items-center justify-between gap-x-4 border-b border-border px-4">
      <div role="tablist" aria-label="Destinations du ticket" className="flex min-w-0 max-w-full items-center gap-2 overflow-x-auto sm:gap-4">
        {DESTINATIONS.map((next) => (
          <button key={next} type="button" role="tab" aria-selected={next === destination} tabIndex={next === destination || (destination === null && next === "overview") ? 0 : -1} onKeyDown={(event) => {
            const index = DESTINATIONS.indexOf(next);
            let target = index;
            if (event.key === "ArrowRight") target = (index + 1) % DESTINATIONS.length;
            else if (event.key === "ArrowLeft") target = (index + DESTINATIONS.length - 1) % DESTINATIONS.length;
            else if (event.key === "Home") target = 0;
            else if (event.key === "End") target = DESTINATIONS.length - 1;
            else return;
            event.preventDefault();
            const selected = DESTINATIONS[target];
            if (selected === undefined) return;
            selectDestination(selected);
            event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>("button")[target]?.focus();
          }} onClick={() => selectDestination(next)} className={cn(TAB_CLASSES, next === destination && ACTIVE_TAB_CLASSES)}>
            {DESTINATION_LABELS[next]}
            {next === "activity" && questionCount > 0 && <span className="ml-1.5 rounded-full bg-warning/15 px-1.5 text-xs text-warning">{questionCount}</span>}
          </button>
        ))}
      </div>
      {tabs.includes("terminal") && (
        <button type="button" aria-pressed={value === "terminal"} className={cn("inline-flex items-center gap-1.5 rounded-md px-2 py-1.5 text-xs text-muted-foreground hover:bg-muted hover:text-foreground", value === "terminal" && "bg-muted text-foreground")} onClick={() => onChange("terminal")}>
          <Terminal className="size-3.5" aria-hidden />{testing ? "Terminal de test" : "Session agent"}
        </button>
      )}
    </div>
  );
}

export function TicketSectionNavigation({ tabs, value, onChange }: Pick<TicketTabsProps, "tabs" | "value" | "onChange">) {
  return (
    <nav aria-label="Sections de la destination" className="mb-5 flex flex-wrap gap-2">
      {tabs.map((section) => <button key={section} type="button" aria-current={section === value ? "page" : undefined} onClick={() => onChange(section)} className={cn("rounded-md border border-border px-3 py-1.5 text-xs transition-colors hover:bg-muted", section === value && "border-primary/30 bg-primary/10 text-primary")}>{TICKET_TAB_LABELS[section]}</button>)}
    </nav>
  );
}
