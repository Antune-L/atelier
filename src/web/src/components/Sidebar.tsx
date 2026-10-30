import {
  BarChart3,
  Gauge,
  LayoutGrid,
  MessageSquare,
  RefreshCw,
  Settings,
  ShieldCheck,
  Zap,
} from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export type SidebarView = "home" | "atelier" | "stats" | "usage" | "audits" | "automation";

interface SidebarProps {
  view: SidebarView;
  onSelect: (view: SidebarView) => void;
  onOpenSettings: () => void;
  onUpdate?: () => void;
  updating?: boolean;
  canUpdate?: boolean;
  expanded?: boolean;
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
  { value: "usage", label: "Consommation", Icon: Gauge },
  { value: "audits", label: "Audits", Icon: ShieldCheck },
  { value: "automation", label: "Automatisations", Icon: Zap },
];

const BADGE_TITLES: Partial<Record<SidebarView, string>> = {
  atelier: "nouvelles réponses",
  audits: "constats à trier",
};

const ITEM_BASE =
  "flex h-9 w-9 items-center justify-center gap-2 rounded-md transition-colors";
const ITEM_INACTIVE =
  "text-muted-foreground hover:bg-accent/60 hover:text-foreground";
const ITEM_ACTIVE =
  "bg-accent text-foreground shadow-[inset_2px_0_0_hsl(var(--info))]";

/** Permanent icon rail: Home / Atelier / Stats / Consommation / Audits / Automation, Settings pinned at the bottom. */
export function Sidebar({
  view,
  onSelect,
  onOpenSettings,
  onUpdate,
  updating = false,
  canUpdate = false,
  expanded = false,
  badges = {},
}: SidebarProps): ReactNode {
  const compact = view === "atelier" && !expanded;
  const itemClasses = cn(ITEM_BASE, expanded && "w-full justify-start px-3", !compact && !expanded && "xl:w-full xl:justify-start xl:px-3");
  const labelClasses = cn("text-xs", !expanded && "hidden", !compact && !expanded && "xl:inline");

  return (
    <nav aria-label="Navigation principale" className={cn("flex shrink-0 flex-col items-center gap-1 border-r bg-background px-1 py-2", compact && "hidden w-14 sm:flex", !compact && !expanded && "hidden w-12 sm:flex xl:w-40", expanded && "w-full border-r-0")}>
      <span className={cn("py-2 font-mono font-medium text-brand", compact ? "mb-3 text-lg" : "w-full px-3 text-xs tracking-wider", !compact && !expanded && "hidden xl:block")} aria-label="Atelier">
        {compact ? "A" : "ATELIER"}
      </span>
      {NAV_ENTRIES.map(({ value, label, Icon }) => {
        const badged = badges[value] === true;
        const badgeTitle = BADGE_TITLES[value];
        const title = badged && badgeTitle !== undefined ? `${label} — ${badgeTitle}` : label;
        return (
          <button
            key={value}
            type="button"
            onClick={() => onSelect(value)}
            aria-pressed={view === value}
            aria-label={title}
            title={title}
            className={cn(itemClasses, "relative", view === value ? ITEM_ACTIVE : ITEM_INACTIVE)}
          >
            <Icon className="h-4 w-4" />
            <span className={labelClasses}>{label}</span>
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
          className={cn(itemClasses, ITEM_INACTIVE, "disabled:opacity-50")}
        >
          <RefreshCw className={cn("h-4 w-4", updating && "animate-spin")} />
          <span className={labelClasses}>Mettre à jour</span>
        </button>
      )}

      <button
        type="button"
        onClick={onOpenSettings}
        aria-pressed={false}
        title="Réglages"
        aria-label="Ouvrir les réglages"
        className={cn(itemClasses, ITEM_INACTIVE)}
      >
        <Settings className="h-4 w-4" />
        <span className={labelClasses}>Réglages</span>
      </button>
    </nav>
  );
}
