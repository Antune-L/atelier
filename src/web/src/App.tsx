import { ChevronDown, GitBranch, LayoutGrid, MonitorPlay, Network, Plus, RefreshCw } from "lucide-react";
import { useState, type ReactNode } from "react";

import type { Ticket } from "@shared/schemas";

import { AgentsView } from "@/components/AgentsView";
import { AutomationView } from "@/components/AutomationView";
import { Board } from "@/components/Board";
import { NewTicketSheet } from "@/components/NewTicketSheet";
import { PrdView } from "@/components/PrdView";
import { ProjectsSettings } from "@/components/ProjectsSettings";
import { SettingsModal } from "@/components/SettingsModal";
import { Sidebar, type SidebarView } from "@/components/Sidebar";
import { SlotPips } from "@/components/SlotPips";
import { StatsView } from "@/components/StatsView";
import { TerminalsView } from "@/components/TerminalsView";
import { TicketDetail } from "@/components/TicketDetail";
import { ToolDialogs, TOOLS, TOOL_KINDS, type ToolKind } from "@/components/ToolDialogs";
import { WorkflowView } from "@/components/WorkflowView";
import { WorktreeSessionsView } from "@/components/WorktreeSessionsView";
import { Toaster } from "@/components/Toaster";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverMenuItem,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Select } from "@/components/ui/select";
import { useBoard } from "@/hooks/useBoard";
import { useCapabilities } from "@/hooks/useCapabilities";
import { useProjects, useProjectsLoaded } from "@/hooks/useProjects";
import { useSuppressEscapeBeep } from "@/hooks/useSuppressEscapeBeep";
import { api } from "@/lib/api";
import { boardStore } from "@/lib/store";
import { cn } from "@/lib/utils";

/** Home sub-view: the Board/Agents/Workflow toggle (Stats moved to the sidebar). */
type HomeView = "kanban" | "agents" | "workflow" | "worktree";

/** If the relaunch hasn't replaced the window after this long, release the update overlay. */
const UPDATE_WATCHDOG_MS = 60_000;
/** If location.reload() is suppressed (e.g. Electrobun quirk), release the spinner. */
const RELOAD_WATCHDOG_MS = 5_000;

/** The onboarding dialog is blocking: it closes only once a project exists. */
const NOOP_OPEN_CHANGE = (): void => {};

const HOME_VIEW_OPTIONS: { value: HomeView; label: string; Icon: typeof LayoutGrid }[] = [
  { value: "kanban", label: "Kanban", Icon: LayoutGrid },
  { value: "agents", label: "Agents", Icon: MonitorPlay },
  { value: "workflow", label: "Workflow", Icon: Network },
  { value: "worktree", label: "Worktree", Icon: GitBranch },
];

export function App() {
  useSuppressEscapeBeep();
  const projects = useProjects();
  const projectsLoaded = useProjectsLoaded();
  const showOnboarding = projectsLoaded && projects.length === 0;
  const { slots, openTicketId } = useBoard();
  const [view, setView] = useState<SidebarView>("home");
  const [homeView, setHomeView] = useState<HomeView>("kanban");
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [creating, setCreating] = useState(false);
  const [toolsMenuOpen, setToolsMenuOpen] = useState(false);
  const [openTool, setOpenTool] = useState<ToolKind | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [updating, setUpdating] = useState(false);
  const { canUpdate } = useCapabilities();

  const { tickets } = useBoard();
  const openTicket: Ticket | null = openTicketId
    ? (tickets.find((t) => t.id === openTicketId) ?? null)
    : null;

  // Dev desktop self-update: git pull + rebuild, then either soft-reload (frontend-only diff) or
  // full relaunch (backend/shared/worker changes). Guard failures (dirty tree, wrong branch) toast.
  const handleUpdate = async (): Promise<void> => {
    setUpdating(true);
    try {
      const result = await api.appUpdate();
      if (result.mode === "reload") {
        // Assets are already rebuilt server-side before the response; a plain reload picks them up.
        // Fallback: if the reload is suppressed (Electrobun quirk), release the spinner.
        window.setTimeout(() => setUpdating(false), RELOAD_WATCHDOG_MS);
        window.location.reload();
        return;
      }
      // Hard relaunch: the app recreates the window, which clears this overlay. If the relauncher
      // silently fails (see .update.log), release the spinner after the watchdog timeout.
      window.setTimeout(() => {
        boardStore.notify("Relance non détectée", "Vérifie .update.log à la racine du dépôt.");
        setUpdating(false);
      }, UPDATE_WATCHDOG_MS);
    } catch (error) {
      boardStore.notify("Mise à jour impossible", error instanceof Error ? error.message : "échec");
      setUpdating(false);
    }
  };

  const renderHome = (): ReactNode => {
    if (homeView === "kanban") {
      return (
        <Board
          projects={projects}
          projectFilter={filter}
          searchQuery={search}
          onOpenTicket={(t) => boardStore.openTicket(t.id)}
          onAddTicket={() => setCreating(true)}
        />
      );
    }
    if (homeView === "agents") {
      return (
        <AgentsView
          projects={projects}
          projectFilter={filter}
          searchQuery={search}
          onOpenTicket={(t) => boardStore.openTicket(t.id)}
        />
      );
    }
    if (homeView === "worktree") {
      return <WorktreeSessionsView projects={projects} />;
    }
    return (
      <WorkflowView
        projectFilter={filter}
        onOpenTicket={(t) => boardStore.openTicket(t.id)}
      />
    );
  };

  const renderView = (): ReactNode => {
    if (view === "terminals") return <TerminalsView projects={projects} projectFilter={filter} />;
    if (view === "stats") return <StatsView projects={projects} />;
    if (view === "automation") return <AutomationView />;
    return renderHome();
  };

  return (
    <div className="flex h-screen flex-row bg-background">
      <Sidebar
        view={view}
        onSelect={setView}
        onOpenSettings={() => setSettingsOpen(true)}
        onUpdate={handleUpdate}
        updating={updating}
        canUpdate={canUpdate}
      />

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <div className="flex h-9 shrink-0 items-center gap-4 border-b px-3">
          <span className="font-mono text-xs font-medium tracking-wider text-brand">
            ATELIER
          </span>

          {view === "home" && (
            <div className="flex items-center">
              {HOME_VIEW_OPTIONS.map(({ value, label, Icon }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setHomeView(value)}
                  aria-pressed={homeView === value}
                  className={cn(
                    "inline-flex items-center gap-1.5 px-2 py-1 text-xs font-medium transition-colors",
                    homeView === value
                      ? "text-foreground shadow-[inset_0_-2px_0_hsl(var(--info))]"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {label}
                </button>
              ))}
            </div>
          )}

          <SlotPips slots={slots} />

          {view === "home" && (
            <div className="ml-auto flex items-center gap-2">
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Rechercher…"
                className="h-7 w-44 text-xs"
                aria-label="Rechercher un ticket"
              />
              <Select
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="h-7 text-xs"
              >
                <option value="all">Tous les projets</option>
                {projects.map((p) => (
                  <option key={p.key} value={p.key}>
                    {p.label}
                  </option>
                ))}
              </Select>
              <div className="flex items-center gap-0.5">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  title="Nouveau ticket"
                  aria-label="Nouveau ticket"
                  onClick={() => setCreating(true)}
                >
                  <Plus className="h-3.5 w-3.5" />
                </Button>
                <Popover open={toolsMenuOpen} onOpenChange={setToolsMenuOpen}>
                  <PopoverTrigger>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      title="Autres outils"
                      aria-label="Autres outils"
                      aria-haspopup="menu"
                    >
                      <ChevronDown className="h-3.5 w-3.5" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-52">
                    {TOOL_KINDS.map((kind) => {
                      const { label, Icon } = TOOLS[kind];
                      return (
                        <PopoverMenuItem
                          key={kind}
                          onClick={() => {
                            setToolsMenuOpen(false);
                            setOpenTool(kind);
                          }}
                        >
                          <Icon className="h-3.5 w-3.5" />
                          {label}
                        </PopoverMenuItem>
                      );
                    })}
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          )}
        </div>

        <div className="flex min-h-0 min-w-0 flex-1 flex-col p-4">
          <main
            className={cn(
              "min-h-0 flex-1",
              view === "prd" ? "overflow-hidden" : "overflow-auto",
            )}
          >
            <div className={view === "prd" ? "flex min-h-0 h-full flex-col" : "hidden"}>
              <PrdView />
            </div>
            {view !== "prd" && renderView()}
          </main>
        </div>
      </div>

      <NewTicketSheet
        open={creating}
        projects={projects}
        onClose={() => setCreating(false)}
      />
      <ToolDialogs
        openTool={openTool}
        projects={projects}
        onClose={() => setOpenTool(null)}
      />
      <SettingsModal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
      />
      <TicketDetail
        ticket={openTicket}
        projects={projects}
        onClose={() => boardStore.closeTicket()}
      />
      <Toaster />

      <Dialog
        open={showOnboarding}
        onOpenChange={NOOP_OPEN_CHANGE}
        size="md"
        blocking
        title="Bienvenue"
        description="Ajoutez au moins un projet pour commencer à créer des tickets."
      >
        <ProjectsSettings />
      </Dialog>

      {updating && (
        <div className="fixed inset-0 z-dialog flex items-center justify-center bg-background/60">
          <div className="flex items-center gap-3 rounded-md border border-border bg-card px-4 py-3 text-sm shadow-lg">
            <RefreshCw className="h-5 w-5 animate-spin" />
            <span className="font-medium">Mise à jour en cours…</span>
          </div>
        </div>
      )}
    </div>
  );
}
