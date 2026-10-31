import { ChevronDown, Cloud, Cpu, GitBranch, LayoutGrid, MonitorPlay, Plus, RefreshCw } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";

import type { AuditTicketOrigin } from "@shared/audit";
import type { Ticket } from "@shared/schemas";

import { AgentsView } from "@/components/AgentsView";
import { AtelierView } from "@/components/atelier/AtelierView";
import { AuditsView } from "@/components/audits/AuditsView";
import { AutomationView } from "@/components/AutomationView";
import { Board } from "@/components/Board";
import { NotificationCenter } from "@/components/NotificationCenter";
import { NewTicketSheet } from "@/components/NewTicketSheet";
import { PreviewsView } from "@/components/PreviewsView";
import { ProjectSelect } from "@/components/ProjectSelect";
import { ProjectsSettings } from "@/components/projects-settings/ProjectsSettings";
import { SettingsModal } from "@/components/SettingsModal";
import { Sidebar, type SidebarView } from "@/components/Sidebar";
import { Sheet } from "@/components/ui/sheet";
import { SkillsPreflightDialog } from "@/components/SkillsPreflightDialog";
import { SlotPips } from "@/components/SlotPips";
import { HostMetricsBadge } from "@/components/HostMetricsBadge";
import { StatsView } from "@/components/StatsView";
import { TicketDetail } from "@/components/TicketDetail";
import { UsageView } from "@/components/UsageView";
import { ToolDialogs, TOOLS, TOOL_KINDS, type ToolKind } from "@/components/ToolDialogs";
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
import { useBoard } from "@/hooks/useBoard";
import { useCapabilities } from "@/hooks/useCapabilities";
import { useProjects, useProjectsLoaded } from "@/hooks/useProjects";
import { useSuppressEscapeBeep } from "@/hooks/useSuppressEscapeBeep";
import { api } from "@/lib/api";
import type { AtelierSeed, AtelierTarget } from "@/lib/atelier";
import { auditsNeedAttention } from "@/lib/auditDisplay";
import { useTicketPrefill, type TicketPrefill } from "@/lib/boardHash";
import { boardStore, type AuditTarget } from "@/lib/store";
import { cn } from "@/lib/utils";
import { matchesQuery, normalizeSearch } from "@/lib/search";

/** Home sub-view: the Board/Agents/Worktree toggle (Stats moved to the sidebar). */
type HomeView = "kanban" | "agents" | "worktree" | "previews";

/** If the relaunch hasn't replaced the window after this long, release the update overlay. */
const UPDATE_WATCHDOG_MS = 60_000;
/** If location.reload() is suppressed (e.g. Electrobun quirk), release the spinner. */
const RELOAD_WATCHDOG_MS = 5_000;

/** The onboarding dialog is blocking: it closes only once a project exists. */
const NOOP_OPEN_CHANGE = (): void => {};

const HOME_VIEW_OPTIONS: { value: HomeView; label: string; Icon: typeof LayoutGrid }[] = [
  { value: "kanban", label: "Kanban", Icon: LayoutGrid },
  { value: "agents", label: "Agents", Icon: MonitorPlay },
  { value: "worktree", label: "Worktree", Icon: GitBranch },
  { value: "previews", label: "Prévisualisations", Icon: Cloud },
];

export function App() {
  useSuppressEscapeBeep();
  const projects = useProjects();
  const selectableProjects = projects.filter((project) => !project.hidden);
  const projectsLoaded = useProjectsLoaded();
  const showOnboarding = projectsLoaded && projects.length === 0;
  const { slots, openTicketId, conversations, audits, auditTarget: requestedAuditTarget } = useBoard();
  // Global icon badges: ignore the project filter.
  const atelierUnread = conversations.some((c) => c.unread);
  const auditsAlert = auditsNeedAttention(audits);
  const [view, setView] = useState<SidebarView>("home");
  const [homeView, setHomeView] = useState<HomeView>("kanban");
  const [filter, setFilter] = useState("all");
  const effectiveFilter = selectableProjects.some((project) => project.key === filter) ? filter : "all";
  const [search, setSearch] = useState("");
  const [creating, setCreating] = useState(false);
  const [toolsMenuOpen, setToolsMenuOpen] = useState(false);
  const [toolSearch, setToolSearch] = useState("");
  const [openTool, setOpenTool] = useState<ToolKind | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [navigationOpen, setNavigationOpen] = useState(false);
  const navigationButtonRef = useRef<HTMLButtonElement>(null);
  const [updating, setUpdating] = useState(false);
  const [atelierTarget, setAtelierTarget] = useState<AtelierTarget | null>(null);
  const [auditTarget, setAuditTarget] = useState<AuditTarget | null>(null);
  const [atelierListRequest, setAtelierListRequest] = useState(0);
  const [appliedAuditRequest, setAppliedAuditRequest] = useState<AuditTarget | null>(requestedAuditTarget);
  const { canUpdate } = useCapabilities();
  const ticketPrefill = useTicketPrefill();
  const [openedPrefill, setOpenedPrefill] = useState<TicketPrefill | null>(null);
  if (ticketPrefill !== openedPrefill) {
    setOpenedPrefill(ticketPrefill);
    if (ticketPrefill !== null) setCreating(true);
  }

  if (requestedAuditTarget !== appliedAuditRequest) {
    setAppliedAuditRequest(requestedAuditTarget);
    if (requestedAuditTarget !== null) {
      setAuditTarget(requestedAuditTarget);
      setView("audits");
      setSettingsOpen(false);
    }
  }

  const { tickets } = useBoard();
  const [fetchedTicket, setFetchedTicket] = useState<Ticket | null>(null);
  const knownTicket = tickets.find((ticket) => ticket.id === openTicketId);
  const knownTicketId = knownTicket?.id ?? null;
  const openTicket = knownTicket ?? (fetchedTicket?.id === openTicketId ? fetchedTicket : null);

  useEffect(() => {
    if (openTicketId === null || knownTicketId !== null) return;
    let active = true;
    void api.ticketDetail(openTicketId).then(({ ticket }) => {
      if (active) setFetchedTicket(ticket);
    }).catch((cause: unknown) => {
      if (active) boardStore.notify("Carte indisponible", cause instanceof Error ? cause.message : "Impossible de charger cette carte.");
    });
    return () => { active = false; };
  }, [openTicketId, knownTicketId]);

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

  const selectView = (next: SidebarView): void => {
    if (next === "atelier" && view === "atelier") setAtelierListRequest((n) => n + 1);
    setAtelierTarget(null);
    setAuditTarget(null);
    setView(next);
  };

  const openAtelier = (target: AtelierTarget): void => {
    setAtelierTarget(target);
    setView("atelier");
  };

  const openAtelierWithSeed = (seed: AtelierSeed): void => {
    setCreating(false);
    openAtelier({ kind: "seed", seed });
  };

  const openPrdOrigin = (prdId: string, project: string): void => {
    boardStore.closeTicket();
    openAtelier({ kind: "prd", prdId, project });
  };

  const openAuditOrigin = (origin: AuditTicketOrigin): void => {
    boardStore.openAudits({ project: origin.project, runId: origin.runId, findingId: origin.findingId });
  };

  const projectFilterSelect = (
    <ProjectSelect
      id="board-project-filter"
      projects={selectableProjects}
      value={effectiveFilter}
      onChange={setFilter}
      label={null}
      ariaLabel="Filtrer le tableau par projet"
      options={[{ key: "all", label: "Tous les projets" }]}
      className="w-44"
      triggerClassName="h-7 bg-background text-xs"
    />
  );

  const renderHome = (): ReactNode => {
    if (homeView === "kanban") {
      return (
        <Board
          projects={projects}
          projectFilter={effectiveFilter}
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
          projectFilter={effectiveFilter}
          searchQuery={search}
          onOpenTicket={(t) => boardStore.openTicket(t.id)}
        />
      );
    }
    if (homeView === "previews") return <PreviewsView projects={selectableProjects} projectFilter={effectiveFilter} searchQuery={search} />;
    return <WorktreeSessionsView projects={projects} projectFilter={effectiveFilter} searchQuery={search} />;
  };

  const renderView = (): ReactNode => {
    if (view === "stats") return <StatsView projects={projects} />;
    if (view === "usage") return <UsageView />;
    if (view === "automation") return <AutomationView />;
    if (view === "audits") return <AuditsView projects={projects} target={auditTarget} />;
    if (view === "atelier") {
      return (
        <AtelierView
          projects={selectableProjects}
          projectFilter={effectiveFilter}
          target={atelierTarget}
          listRequest={atelierListRequest}
          toolbar={(
            <>
              <Button ref={navigationButtonRef} variant="ghost" size="icon" className="h-8 w-8 sm:hidden" aria-label="Ouvrir la navigation" title="Navigation" aria-expanded={navigationOpen} onClick={() => setNavigationOpen((open) => !open)}>
                <LayoutGrid className="h-4 w-4" />
              </Button>
              <div className="hidden items-center gap-1 sm:flex">
                <Popover>
                  <PopoverTrigger>
                    <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Projet et système" title="Projet et système">
                      <Cpu className="h-4 w-4" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[min(360px,calc(100vw-2rem))] space-y-4 p-4">
                    <div className="space-y-2">
                      <p className="text-xs font-medium">Projet</p>
                      {projectFilterSelect}
                    </div>
                    <div className="space-y-3 border-t border-border pt-3">
                      <p className="text-xs font-medium">Sessions et ressources système</p>
                      <SlotPips slots={slots} />
                      <HostMetricsBadge />
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
              <NotificationCenter projects={projects} />
            </>
          )}
        />
      );
    }
    return renderHome();
  };

  return (
    <div className="flex h-[100dvh] flex-row bg-background">
      <Sidebar
        view={view}
        onSelect={selectView}
        badges={{ atelier: atelierUnread, audits: auditsAlert }}
        onOpenSettings={() => setSettingsOpen(true)}
        onUpdate={handleUpdate}
        updating={updating}
        canUpdate={canUpdate}
      />
      <Sheet open={navigationOpen} onOpenChange={setNavigationOpen} side="left" size="md" title="Navigation" className="w-80" onCloseAutoFocus={(event) => { if (navigationButtonRef.current) { event.preventDefault(); navigationButtonRef.current.focus(); } }}>
        <div className="min-h-0 w-full overflow-y-auto">
          <Sidebar
            expanded
            view={view}
            onSelect={(nextView) => { selectView(nextView); setNavigationOpen(false); }}
            badges={{ atelier: atelierUnread, audits: auditsAlert }}
            onOpenSettings={() => { setNavigationOpen(false); setSettingsOpen(true); }}
            onUpdate={handleUpdate}
            updating={updating}
            canUpdate={canUpdate}
          />
          <div className="space-y-3 border-t border-border p-4">
            {projectFilterSelect}
            <SlotPips slots={slots} />
            <HostMetricsBadge />
          </div>
        </div>
      </Sheet>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        {view !== "atelier" && (
          <div className="app-toolbar flex shrink-0 flex-wrap items-center gap-x-4 gap-y-2 border-b px-3 py-2">
            <Button ref={navigationButtonRef} variant="ghost" size="icon" className="h-9 w-9 sm:hidden" aria-label="Ouvrir la navigation" aria-expanded={navigationOpen} onClick={() => setNavigationOpen((open) => !open)}>
              <LayoutGrid className="h-4 w-4" />
            </Button>
            {view === "home" && (
              <div className="flex max-w-full items-center overflow-x-auto">
                {HOME_VIEW_OPTIONS.map(({ value, label, Icon }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setHomeView(value)}
                    aria-pressed={homeView === value}
                    className={cn(
                      "inline-flex shrink-0 items-center gap-1.5 px-2 py-1 text-xs font-medium transition-colors",
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

            <div className="hidden items-center gap-3 sm:flex"><SlotPips slots={slots} /><HostMetricsBadge /></div>

            {view === "home" && (
              <div className="ml-auto flex max-w-full flex-wrap items-center gap-2">
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={homeView === "worktree" ? "Rechercher une session…" : "Rechercher…"}
                  className="h-8 w-44 text-xs"
                  aria-label={homeView === "worktree" ? "Rechercher une session de travail" : "Rechercher dans la vue actuelle"}
                />
                {projectFilterSelect}
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
                  <Popover open={toolsMenuOpen} onOpenChange={(open) => { setToolsMenuOpen(open); if (!open) setToolSearch(""); }}>
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
                    <PopoverContent className="w-64">
                      <Input autoFocus value={toolSearch} onChange={(event) => setToolSearch(event.target.value)} placeholder="Rechercher un outil…" aria-label="Rechercher un outil" className="mb-2 h-8 text-xs" />
                      {TOOL_KINDS.filter((kind) => matchesQuery(normalizeSearch(toolSearch), TOOLS[kind].label)).map((kind) => {
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
                      {TOOL_KINDS.every((kind) => !matchesQuery(normalizeSearch(toolSearch), TOOLS[kind].label)) && <p className="px-2 py-3 text-xs text-muted-foreground">Aucun outil pour cette recherche.</p>}
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            )}
            <NotificationCenter projects={projects} className={view === "home" ? undefined : "ml-auto"} />
          </div>
        )}
        <div className={cn("flex min-h-0 min-w-0 flex-1 flex-col", view !== "atelier" && "p-2 sm:p-4")}>
          <main className="min-h-0 flex-1 overflow-auto">
            {renderView()}
          </main>
        </div>
      </div>

      <NewTicketSheet
        open={creating}
        projects={selectableProjects}
        onClose={() => setCreating(false)}
        onOpenAtelier={openAtelierWithSeed}
        prefill={ticketPrefill}
      />
      <ToolDialogs
        openTool={openTool}
        projects={selectableProjects}
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
        onOpenPrdOrigin={openPrdOrigin}
        onOpenAuditOrigin={openAuditOrigin}
      />
      <Toaster />

      <Dialog
        open={showOnboarding}
        onOpenChange={NOOP_OPEN_CHANGE}
        size="lg"
        blocking
        title="Bienvenue"
        description="Ajoutez au moins un projet pour commencer à créer des tickets."
      >
        <ProjectsSettings />
      </Dialog>
      <SkillsPreflightDialog suppressed={showOnboarding} />

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
