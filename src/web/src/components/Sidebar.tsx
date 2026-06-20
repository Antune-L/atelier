import {
  BarChart3,
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  Settings,
  SquareTerminal,
} from "lucide-react";
import { useState, type ReactNode } from "react";

import { cn } from "@/lib/utils";

export type SidebarView = "home" | "terminals" | "stats";

interface SidebarProps {
  view: SidebarView;
  onSelect: (view: SidebarView) => void;
  onOpenSettings: () => void;
}

const STORAGE_KEY = "atelier.sidebar.collapsed";

interface NavEntry {
  value: SidebarView;
  label: string;
  Icon: typeof LayoutGrid;
}

const NAV_ENTRIES: NavEntry[] = [
  { value: "home", label: "Home", Icon: LayoutGrid },
  { value: "terminals", label: "Terminals", Icon: SquareTerminal },
  { value: "stats", label: "Stats", Icon: BarChart3 },
];

function loadCollapsed(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

/** Primary navigation: Home / Terminals / Stats, with Settings pinned at the bottom. Collapsible. */
export function Sidebar({ view, onSelect, onOpenSettings }: SidebarProps): ReactNode {
  const [collapsed, setCollapsed] = useState<boolean>(loadCollapsed);

  const toggleCollapsed = (): void => {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(STORAGE_KEY, String(next));
      } catch {
        // Storage unavailable; collapse state is best-effort persistence.
      }
      return next;
    });
  };

  const renderItem = (
    active: boolean,
    label: string,
    Icon: typeof LayoutGrid,
    onClick: () => void,
    key?: string,
  ): ReactNode => (
    <button
      key={key}
      type="button"
      onClick={onClick}
      aria-pressed={active}
      title={collapsed ? label : undefined}
      className={cn(
        "flex items-center gap-2 rounded px-2.5 py-2 text-sm font-medium transition-colors",
        collapsed && "justify-center",
        active
          ? "bg-primary text-primary-foreground"
          : "text-muted-foreground hover:bg-muted hover:text-foreground",
      )}
    >
      <Icon className="h-4 w-4 shrink-0" />
      {!collapsed && <span className="truncate">{label}</span>}
    </button>
  );

  return (
    <nav
      className={cn(
        "flex shrink-0 flex-col gap-1 border-r bg-card p-2 transition-[width]",
        collapsed ? "w-14" : "w-44",
      )}
    >
      <button
        type="button"
        onClick={toggleCollapsed}
        aria-label={collapsed ? "Étendre la barre latérale" : "Réduire la barre latérale"}
        className={cn(
          "mb-1 flex items-center rounded px-2.5 py-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
          collapsed ? "justify-center" : "justify-end",
        )}
      >
        {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
      </button>

      {NAV_ENTRIES.map((entry) =>
        renderItem(view === entry.value, entry.label, entry.Icon, () => onSelect(entry.value), entry.value),
      )}

      <div className="flex-1" />

      {renderItem(false, "Settings", Settings, onOpenSettings)}
    </nav>
  );
}
