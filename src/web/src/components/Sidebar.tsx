import {
  BarChart3,
  FileText,
  LayoutGrid,
  RefreshCw,
  Settings,
  SquareTerminal,
  Zap,
} from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export type SidebarView = "home" | "terminals" | "stats" | "prd" | "automation";

interface SidebarProps {
  view: SidebarView;
  onSelect: (view: SidebarView) => void;
  onOpenSettings: () => void;
  onUpdate?: () => void;
  updating?: boolean;
  canUpdate?: boolean;
}

interface NavEntry {
  value: SidebarView;
  label: string;
  Icon: typeof LayoutGrid;
}

const NAV_ENTRIES: NavEntry[] = [
  { value: "home", label: "Home", Icon: LayoutGrid },
  { value: "terminals", label: "Terminal", Icon: SquareTerminal },
  { value: "stats", label: "Stats", Icon: BarChart3 },
  { value: "prd", label: "PRD", Icon: FileText },
  { value: "automation", label: "Automation", Icon: Zap },
];

const ITEM_BASE =
  "flex h-7 w-7 items-center justify-center rounded-md transition-colors";
const ITEM_INACTIVE =
  "text-muted-foreground hover:bg-accent/60 hover:text-foreground";
const ITEM_ACTIVE =
  "bg-accent text-foreground shadow-[inset_2px_0_0_hsl(var(--info))]";

/** Permanent icon rail: Home / Terminal / Stats / PRD / Automation, Settings pinned at the bottom. */
export function Sidebar({
  view,
  onSelect,
  onOpenSettings,
  onUpdate,
  updating = false,
  canUpdate = false,
}: SidebarProps): ReactNode {
  return (
    <nav className="flex w-11 shrink-0 flex-col items-center gap-1 border-r bg-background py-2">
      {NAV_ENTRIES.map(({ value, label, Icon }) => (
        <button
          key={value}
          type="button"
          onClick={() => onSelect(value)}
          aria-pressed={view === value}
          title={label}
          className={cn(ITEM_BASE, view === value ? ITEM_ACTIVE : ITEM_INACTIVE)}
        >
          <Icon className="h-4 w-4" />
        </button>
      ))}

      <div className="flex-1" />

      {canUpdate && onUpdate && (
        <button
          type="button"
          onClick={onUpdate}
          disabled={updating}
          aria-label="Mettre à jour l'app"
          title="Mettre à jour l'app (git pull main + rebuild + relaunch)"
          className={cn(ITEM_BASE, ITEM_INACTIVE, "disabled:opacity-50")}
        >
          <RefreshCw className={cn("h-4 w-4", updating && "animate-spin")} />
        </button>
      )}

      <button
        type="button"
        onClick={onOpenSettings}
        aria-pressed={false}
        title="Settings"
        className={cn(ITEM_BASE, ITEM_INACTIVE)}
      >
        <Settings className="h-4 w-4" />
      </button>
    </nav>
  );
}
