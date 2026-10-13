import {
  BarChart3,
  LayoutGrid,
  MessageSquare,
  RefreshCw,
  Settings,
  Zap,
} from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export type SidebarView = "home" | "atelier" | "stats" | "automation";

interface SidebarProps {
  view: SidebarView;
  onSelect: (view: SidebarView) => void;
  onOpenSettings: () => void;
  onUpdate?: () => void;
  updating?: boolean;
  canUpdate?: boolean;
  /** Views showing an unread dot on their icon. */
  badges?: Partial<Record<SidebarView, boolean>>;
}

interface NavEntry {
  value: SidebarView;
  label: string;
  Icon: typeof LayoutGrid;
}

const NAV_ENTRIES: NavEntry[] = [
  { value: "home", label: "Tableau", Icon: LayoutGrid },
  { value: "atelier", label: "Atelier", Icon: MessageSquare },
  { value: "stats", label: "Statistiques", Icon: BarChart3 },
  { value: "automation", label: "Automatisations", Icon: Zap },
];

const ITEM_BASE =
  "flex h-9 w-9 items-center justify-center gap-2 rounded-md transition-colors xl:w-full xl:justify-start xl:px-3";
const ITEM_INACTIVE =
  "text-muted-foreground hover:bg-accent/60 hover:text-foreground";
const ITEM_ACTIVE =
  "bg-accent text-foreground shadow-[inset_2px_0_0_hsl(var(--info))]";

/** Permanent icon rail: Home / Atelier / Stats / Automation, Settings pinned at the bottom. */
export function Sidebar({
  view,
  onSelect,
  onOpenSettings,
  onUpdate,
  updating = false,
  canUpdate = false,
  badges = {},
}: SidebarProps): ReactNode {
  return (
    <nav aria-label="Navigation principale" className="flex w-12 shrink-0 flex-col items-center gap-1 border-r bg-background px-1 py-2 xl:w-40">
      {NAV_ENTRIES.map(({ value, label, Icon }) => {
        const badged = badges[value] === true;
        const title = badged ? `${label} — nouvelles réponses` : label;
        return (
          <button
            key={value}
            type="button"
            onClick={() => onSelect(value)}
            aria-pressed={view === value}
            aria-label={title}
            title={title}
            className={cn(ITEM_BASE, "relative", view === value ? ITEM_ACTIVE : ITEM_INACTIVE)}
          >
            <Icon className="h-4 w-4" />
            <span className="hidden text-xs xl:inline">{label}</span>
            {badged && <span className="absolute right-0.5 top-0.5 h-2 w-2 rounded-full bg-danger ring-2 ring-background" />}
          </button>
        );
      })}

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
          <span className="hidden text-xs xl:inline">Mettre à jour</span>
        </button>
      )}

      <button
        type="button"
        onClick={onOpenSettings}
        aria-pressed={false}
        title="Réglages"
        aria-label="Ouvrir les réglages"
        className={cn(ITEM_BASE, ITEM_INACTIVE)}
      >
        <Settings className="h-4 w-4" />
        <span className="hidden text-xs xl:inline">Réglages</span>
      </button>
    </nav>
  );
}
