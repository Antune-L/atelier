import { ChevronDown, Play, ShieldCheck } from "lucide-react";
import { useState, type ReactNode } from "react";

import { AUDIT_RUN_STATUSES } from "@shared/audit";
import type { AuditFinding, AuditProjectView, AuditRunStatus } from "@shared/audit";
import { DEFAULT_VCS_PROVIDER, ORCHESTRATOR_LABELS } from "@shared/constants";
import type { ProjectInfo } from "@shared/schemas";

import { AskPanel } from "@/components/AskPanel";
import { AuditRunDetail } from "@/components/audits/AuditRunDetail";
import { AuditRunList } from "@/components/audits/AuditRunList";
import { AuditStartPointDialog } from "@/components/audits/AuditStartPointDialog";
import { ProjectAuditSettings } from "@/components/projects-settings/ProjectAuditSettings";
import { resolveProjectColor, resolveProjectLabel } from "@/components/TicketCard";
import { Button } from "@/components/ui/button";
import { ConfirmBody } from "@/components/ui/confirm";
import { Dialog } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverMenuItem, PopoverTrigger } from "@/components/ui/popover";
import { Select } from "@/components/ui/select";
import { useBoard } from "@/hooks/useBoard";
import { useCapabilities } from "@/hooks/useCapabilities";
import { api } from "@/lib/api";
import {
  ALL_FILTER,
  AUDIT_CARD_MODE_SHORT_LABELS,
  AUDIT_RUN_STATUS_LABELS,
  auditAskQuestion,
  formatAuditCadence,
  formatAuditDayTime,
  latestRunsByProject,
} from "@/lib/auditDisplay";
import { errorMessage } from "@/lib/errors";
import type { AuditTarget } from "@/lib/store";
import { boardStore } from "@/lib/store";

type StatusFilter = AuditRunStatus | typeof ALL_FILTER;

const SELECT_CLASSES = "h-7 text-xs";

interface AuditsViewProps {
  projects: ProjectInfo[];
  /** A request from the ticket detail or the project settings to open a run or a project. */
  target: AuditTarget | null;
}

function readStatusFilter(value: string): StatusFilter {
  return AUDIT_RUN_STATUSES.find((status) => status === value) ?? ALL_FILTER;
}

function projectEngineLabel(view: AuditProjectView): string {
  return view.settings.provider === null ? "moteur par défaut" : ORCHESTRATOR_LABELS[view.settings.provider];
}

interface ProjectMenuProps {
  label: ReactNode;
  projects: ProjectInfo[];
  renderItem: (project: ProjectInfo, close: () => void) => ReactNode;
}

function ProjectMenu({ label, projects, renderItem }: ProjectMenuProps) {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger>
        <Button size="sm" variant="outline" className="h-7 px-2 text-xs" disabled={projects.length === 0}>
          {label}
          <ChevronDown className="h-3 w-3" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72">
        {projects.map((project) => renderItem(project, () => setOpen(false)))}
      </PopoverContent>
    </Popover>
  );
}

function LaunchMenu({ projects }: { projects: ProjectInfo[] }) {
  const [open, setOpen] = useState(false);
  const [chosen, setChosen] = useState<ProjectInfo | null>(null);

  const launch = async (project: ProjectInfo): Promise<void> => {
    try {
      await api.runProjectAudit(project.key);
      boardStore.notify("Audit lancé", `L'audit de ${project.label} a démarré.`);
    } catch (cause) {
      boardStore.notify("Audit impossible", errorMessage(cause, "Impossible de lancer l'audit."));
    }
  };

  return (
    <Popover open={open} onOpenChange={(next) => { setOpen(next); if (!next) setChosen(null); }}>
      <PopoverTrigger>
        <Button size="sm" className="h-7 px-2 text-xs" disabled={projects.length === 0} title={projects.length === 0 ? "Activez l'audit sur un projet d'abord" : undefined}>
          <Play className="h-3 w-3" />
          Lancer un audit
          <ChevronDown className="h-3 w-3" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className={chosen === null ? "w-64" : "w-[280px] p-3"}>
        {chosen === null && projects.map((project) => (
          <PopoverMenuItem key={project.key} onClick={() => setChosen(project)}>{project.label}</PopoverMenuItem>
        ))}
        {chosen !== null && (
          <ConfirmBody
            title={`Lancer l'audit de ${chosen.label} ?`}
            description="Des agents en lecture seule relisent les commits pas encore audités."
            confirmLabel="Lancer"
            onConfirm={() => launch(chosen)}
            onDismiss={() => { setOpen(false); setChosen(null); }}
          />
        )}
      </PopoverContent>
    </Popover>
  );
}

/** Audits: enabled projects, the run history and the selected run's findings side by side. */
export function AuditsView({ projects, target }: AuditsViewProps) {
  const { audits } = useBoard();
  const { cloudHost } = useCapabilities();
  const [projectFilter, setProjectFilter] = useState<string>(ALL_FILTER);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(ALL_FILTER);
  const [hideEmpty, setHideEmpty] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [highlightedFindingId, setHighlightedFindingId] = useState<string | null>(null);
  const [configuring, setConfiguring] = useState<string | null>(null);
  const [startPointProject, setStartPointProject] = useState<string | null>(null);
  const [askFinding, setAskFinding] = useState<AuditFinding | null>(null);
  const [appliedTarget, setAppliedTarget] = useState<AuditTarget | null>(null);

  if (target !== appliedTarget) {
    setAppliedTarget(target);
    if (target !== null) {
      setProjectFilter(target.project ?? ALL_FILTER);
      setStatusFilter(ALL_FILTER);
      setHideEmpty(false);
      setSelectedId(target.runId);
      setHighlightedFindingId(target.findingId);
    }
  }

  const visibleProjects = projects.filter((project) => !project.hidden);
  const viewOf = (key: string): AuditProjectView | undefined => audits.projects.find((view) => view.project === key);
  const enabledViews = audits.projects.filter((view) => view.settings.enabled);
  const enabledProjects = visibleProjects.filter((project) => viewOf(project.key)?.settings.enabled === true);
  const configurableProjects = visibleProjects.filter((project) => viewOf(project.key)?.supported ?? (project.vcsProvider ?? DEFAULT_VCS_PROVIDER) === "github");
  const filterProjects = visibleProjects.filter((project) => viewOf(project.key) !== undefined || audits.runs.some((run) => run.project === project.key));
  const effectiveProjectFilter = filterProjects.some((project) => project.key === projectFilter) ? projectFilter : ALL_FILTER;
  const runs = audits.runs
    .filter((run) => effectiveProjectFilter === ALL_FILTER || run.project === effectiveProjectFilter)
    .filter((run) => statusFilter === ALL_FILTER || run.status === statusFilter)
    .filter((run) => !hideEmpty || run.status !== "no_changes")
    .sort((left, right) => right.startedAt - left.startedAt);
  const selectedRun = runs.find((run) => run.id === selectedId) ?? runs[0] ?? null;
  const pendingByLatestRun = new Map<string, number>();
  for (const [project, run] of latestRunsByProject(audits.runs)) pendingByLatestRun.set(run.id, viewOf(project)?.pendingTriage ?? 0);
  const configuringProject = visibleProjects.find((project) => project.key === configuring) ?? null;
  const strippedViews = enabledViews.filter((view) => effectiveProjectFilter === ALL_FILTER || view.project === effectiveProjectFilter);

  const selectRun = (runId: string): void => {
    setSelectedId(runId);
    setHighlightedFindingId(null);
  };

  const configureMenu = (
    <ProjectMenu
      label="Configurer un projet"
      projects={configurableProjects}
      renderItem={(project, close) => (
        <PopoverMenuItem key={project.key} onClick={() => { close(); setConfiguring(project.key); }}>{project.label}</PopoverMenuItem>
      )}
    />
  );

  const renderDetail = (): ReactNode => {
    if (selectedRun !== null) {
      return (
        <AuditRunDetail
          key={selectedRun.id}
          run={selectedRun}
          projects={projects}
          highlightedFindingId={highlightedFindingId}
          onAsk={setAskFinding}
          onChooseStart={setStartPointProject}
        />
      );
    }
    const nextRuns = enabledViews.flatMap((view) => (view.nextRunAt === null ? [] : [view.nextRunAt]));
    const next = nextRuns.length === 0 ? null : Math.min(...nextRuns);
    return (
      <div className="flex flex-col items-center gap-2 px-6 py-12 text-center text-xs text-muted-foreground">
        <ShieldCheck className="h-6 w-6" />
        <strong className="text-sm font-medium text-foreground">{audits.runs.length === 0 ? "Aucun audit pour l'instant" : "Aucun audit pour ce filtre"}</strong>
        {audits.runs.length === 0 && <p>{next === null ? "Lancez un premier audit pour relire les dernières 24 heures." : `Le premier audit aura lieu le ${formatAuditDayTime(next)}.`}</p>}
      </div>
    );
  };

  const empty = enabledViews.length === 0 && audits.runs.length === 0;

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="flex items-center gap-2 font-semibold"><ShieldCheck className="h-4 w-4" />Audits</h2>
        <Select aria-label="Filtrer les audits par projet" className={SELECT_CLASSES} value={effectiveProjectFilter} onChange={(event) => setProjectFilter(event.target.value)}>
          <option value={ALL_FILTER}>Tous les projets</option>
          {filterProjects.map((project) => <option key={project.key} value={project.key}>{project.label}</option>)}
        </Select>
        <Select aria-label="Filtrer les audits par statut" className={SELECT_CLASSES} value={statusFilter} onChange={(event) => setStatusFilter(readStatusFilter(event.target.value))}>
          <option value={ALL_FILTER}>Tous les statuts</option>
          {AUDIT_RUN_STATUSES.map((status) => <option key={status} value={status}>{AUDIT_RUN_STATUS_LABELS[status]}</option>)}
        </Select>
        <span className="ml-auto" />
        <LaunchMenu projects={enabledProjects} />
      </div>
      {!cloudHost && <p className="text-2xs text-muted-foreground">Chaque poste a sa propre base : seuls les audits exécutés ici apparaissent.</p>}

      {empty ? (
        <div className="flex flex-col items-center gap-2 px-6 py-16 text-center text-xs text-muted-foreground">
          <ShieldCheck className="h-6 w-6" />
          <strong className="text-sm font-medium text-foreground">Aucun audit configuré</strong>
          <p className="max-w-md">Activez l'audit planifié sur un projet : à intervalle régulier, les commits fusionnés sont relus et seuls les problèmes bloquants vérifiés sont signalés.</p>
          <div className="mt-2">{configureMenu}</div>
          {configurableProjects.length === 0 && <p>Aucun projet GitHub disponible.</p>}
        </div>
      ) : (
        <>
          {strippedViews.length > 0 && (
            <ul className="divide-y divide-border border-y border-border">
              {strippedViews.map((view) => {
                const color = resolveProjectColor(projects, view.project);
                return (
                  <li key={view.project} className="flex flex-wrap items-center gap-2 py-1.5 text-xs">
                    <span aria-hidden className="h-2 w-2 shrink-0 rounded-full bg-muted-foreground" style={color ? { backgroundColor: color } : undefined} />
                    <span className="font-medium">{resolveProjectLabel(projects, view.project)}</span>
                    <span className="font-mono text-2xs text-muted-foreground">
                      activé · {formatAuditCadence(view.settings)}{view.nextRunAt === null ? "" : ` · prochain ${formatAuditDayTime(view.nextRunAt)}`} · {projectEngineLabel(view)} · {AUDIT_CARD_MODE_SHORT_LABELS[view.settings.cardMode]}
                    </span>
                    {view.pendingTriage > 0 && <span className="text-warning">{view.pendingTriage} à trier</span>}
                    <Button variant="ghost" size="sm" className="ml-auto h-6 px-2 text-2xs" onClick={() => setConfiguring(view.project)}>Configurer</Button>
                  </li>
                );
              })}
            </ul>
          )}
          {enabledViews.length === 0 && <div className="flex items-center gap-2 text-xs text-muted-foreground">Aucun projet n'est audité sur ce poste. {configureMenu}</div>}
          <div className="flex min-h-0 flex-1 flex-col gap-4 md:flex-row">
            <aside className="flex w-full shrink-0 flex-col overflow-hidden md:w-80">
              <div className="flex items-center justify-between gap-2 border-b border-border pb-1.5 font-mono text-2xs uppercase tracking-wider text-muted-foreground">
                <span>Historique · {runs.length}</span>
                <label className="flex items-center gap-1.5 normal-case tracking-normal">
                  <input type="checkbox" checked={hideEmpty} onChange={(event) => setHideEmpty(event.target.checked)} />
                  Masquer les audits vides
                </label>
              </div>
              <div className="max-h-64 min-h-0 flex-1 overflow-y-auto md:max-h-none">
                <AuditRunList runs={runs} projects={projects} selectedId={selectedRun?.id ?? null} pendingByLatestRun={pendingByLatestRun} onSelect={selectRun} />
              </div>
            </aside>
            <section aria-label="Détail de l'audit" className="min-h-0 min-w-0 flex-1 overflow-y-auto">
              {renderDetail()}
            </section>
          </div>
        </>
      )}

      <Dialog
        open={configuringProject !== null}
        onOpenChange={(open) => { if (!open) setConfiguring(null); }}
        title={configuringProject === null ? "Audit planifié" : `Audit planifié · ${configuringProject.label}`}
      >
        {configuringProject !== null && <ProjectAuditSettings key={configuringProject.key} project={configuringProject} showAuditsLink={false} />}
      </Dialog>
      <AuditStartPointDialog
        project={startPointProject}
        projectLabel={startPointProject === null ? "" : resolveProjectLabel(projects, startPointProject)}
        onClose={() => setStartPointProject(null)}
      />
      <Dialog open={askFinding !== null} onOpenChange={(open) => { if (!open) setAskFinding(null); }} title="Demander à un agent">
        {askFinding !== null && (
          <AskPanel
            key={askFinding.id}
            projects={visibleProjects}
            initialProject={askFinding.project}
            initialQuestion={auditAskQuestion(askFinding)}
            onClose={() => setAskFinding(null)}
          />
        )}
      </Dialog>
    </div>
  );
}
