import { GitBranch, LayoutGrid, MonitorPlay, Network, Plus, RefreshCw } from "lucide-react";
import { useState, type ReactNode } from "react";

import type { Ticket } from "@shared/schemas";

import { AgentsView } from "@/components/AgentsView";
import { Board } from "@/components/Board";
import { NewTicketDialog } from "@/components/NewTicketDialog";
import { PrdView } from "@/components/PrdView";
import { SettingsModal } from "@/components/SettingsModal";
import { Sidebar, type SidebarView } from "@/components/Sidebar";
import { SlotsBar } from "@/components/SlotsBar";
import { StatsView } from "@/components/StatsView";
import { TerminalsView } from "@/components/TerminalsView";
import { TicketDetail } from "@/components/TicketDetail";
import { WorkflowView } from "@/components/WorkflowView";
import { WorktreeSessionsView } from "@/components/WorktreeSessionsView";
import { Toaster } from "@/components/Toaster";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useBoard } from "@/hooks/useBoard";
import { useCapabilities } from "@/hooks/useCapabilities";
import { useProjects } from "@/hooks/useProjects";
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

const HOME_VIEW_OPTIONS: { value: HomeView; label: string; Icon: typeof LayoutGrid }[] = [
  { value: "kanban", label: "Kanban", Icon: LayoutGrid },
  { value: "agents", label: "Agents", Icon: MonitorPlay },
  { value: "workflow", label: "Workflow", Icon: Network },
  { value: "worktree", label: "Worktree", Icon: GitBranch },
];

export function App() {
  useSuppressEscapeBeep();
  const projects = useProjects();
  const { slots, openTicketId } = useBoard();
  const [view, setView] = useState<SidebarView>("home");
  const [homeView, setHomeView] = useState<HomeView>("kanban");
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [creating, setCreating] = useState(false);
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
    if (view === "prd") return <PrdView />;
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

      <div className="flex min-h-0 min-w-0 flex-1 flex-col p-6">
        <header className="mb-4 flex shrink-0 flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            {view === "home" && (
              <div className="inline-flex items-center rounded-md border bg-card p-0.5">
                {HOME_VIEW_OPTIONS.map(({ value, label, Icon }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setHomeView(value)}
                    aria-pressed={homeView === value}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded px-2.5 py-1 text-xs font-medium transition-colors",
                      homeView === value
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {label}
                  </button>
                ))}
              </div>
            )}
          </div>
          {view === "home" && (
            <div className="flex items-center gap-2">
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Rechercher…"
                className="w-48 bg-card"
                aria-label="Rechercher un ticket"
              />
              <Select
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="bg-card"
              >
                <option value="all">Tous les projets</option>
                {projects.map((p) => (
                  <option key={p.key} value={p.key}>
                    {p.label}
                  </option>
                ))}
              </Select>
              <Button onClick={() => setCreating(true)}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          )}
        </header>

        {view !== "terminals" && (
          <div className="mb-4 shrink-0">
            <SlotsBar slots={slots} />
          </div>
        )}

        <main className="min-h-0 flex-1 overflow-auto">{renderView()}</main>
      </div>

      <NewTicketDialog
        open={creating}
        projects={projects}
        initialTab={homeView === "worktree" ? "worktree" : "ticket"}
        onClose={() => setCreating(false)}
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

      {updating && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="flex items-center gap-3 rounded-lg border bg-card px-6 py-4 shadow-lg">
            <RefreshCw className="h-5 w-5 animate-spin" />
            <span className="text-sm font-medium">Mise à jour en cours…</span>
          </div>
        </div>
      )}
    </div>
  );
}
