import { DndContext, PointerSensor, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, arrayMove, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ChevronRight, Eye, EyeOff, FolderOpen, GripVertical } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";

import type { VcsProvider } from "@shared/constants";
import { DEFAULT_VCS_PROVIDER, VCS_PROVIDERS, VCS_PROVIDER_LABELS } from "@shared/constants";
import type { CreateProjectInput, ManagedProject, UpdateProjectInput, VcsConnectionResult } from "@shared/schemas";
import { vcsProviderSchema } from "@shared/schemas";

import { Button } from "@/components/ui/button";
import { ConfirmPopover } from "@/components/ui/confirm";
import { Input, Label } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { DashedAddButton, SettingsFooter } from "@/components/ui/settings";
import { useCapabilities } from "@/hooks/useCapabilities";
import { refreshProjects } from "@/hooks/useProjects";
import { useSavedFlag } from "@/hooks/useSavedFlash";
import { api } from "@/lib/api";
import { errorMessage } from "@/lib/errors";
import { FIELD_LABEL_CLASSES } from "@/lib/overlayStyles";
import { cn } from "@/lib/utils";
import {
  formatCommitTimeout,
  mostCommonValue,
  shortenHomePath,
  timeoutUnitMs,
  timeoutUnitOf,
  type TimeoutUnit,
} from "@/lib/projectDisplay";

const DEFAULT_PROJECT_COLOR = "#6366f1";
const DEFAULT_COMMIT_TIMEOUT_MS = 600000;
const REFERENCE_COMMIT_TIMEOUT_MS = 120000;
const TIMEOUT_UNITS: TimeoutUnit[] = ["min", "s"];
const MUTED_TEXT_CLASS = "text-muted-foreground";
const DRAG_ACTIVATION_DISTANCE = 6;
const REORDER_ERROR = "Erreur lors de la réorganisation";
const PROJECT_GROUP_LIST_ID = "project-group-suggestions";

/** Narrow the native `<select>` value without a cast; an unknown value falls back to the default. */
function toVcsProvider(value: string): VcsProvider {
  const parsed = vcsProviderSchema.safeParse(value);
  return parsed.success ? parsed.data : DEFAULT_VCS_PROVIDER;
}

interface ConnectionHint {
  message: string;
  className: string;
}

/** The connection test only means something against the persisted project, hence the two guards. */
function connectionHint(
  saved: boolean,
  dirty: boolean,
  testing: boolean,
  result: VcsConnectionResult | null,
): ConnectionHint {
  if (!saved) return { message: "Enregistrez le projet pour tester la connexion.", className: MUTED_TEXT_CLASS };
  if (dirty) {
    return { message: "Enregistrez vos modifications pour tester la connexion.", className: MUTED_TEXT_CLASS };
  }
  if (testing) return { message: "Test en cours…", className: MUTED_TEXT_CLASS };
  if (result === null) return { message: "", className: MUTED_TEXT_CLASS };
  return { message: result.message, className: result.ok ? "text-success" : "text-destructive" };
}

function isPositiveIntegerString(value: string): boolean {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0;
}

function isValidDraft(label: string, repoPath: string, baseBranch: string, timeoutValue: string): boolean {
  return (
    label.trim() !== "" &&
    repoPath.trim() !== "" &&
    baseBranch.trim() !== "" &&
    isPositiveIntegerString(timeoutValue)
  );
}

/** Timeout considered "normal": the most common one, or a fixed baseline with a single project. */
function referenceCommitTimeout(projects: ManagedProject[]): number {
  if (projects.length < 2) return REFERENCE_COMMIT_TIMEOUT_MS;
  return mostCommonValue(projects.map((p) => p.commitTimeoutMs)) ?? REFERENCE_COMMIT_TIMEOUT_MS;
}

/** Projects tab: list, add, edit and delete the managed projects (also reused in onboarding). */
export function ProjectsSettings() {
  const { canPickFolder } = useCapabilities();
  const [projects, setProjects] = useState<ManagedProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [mutationBusy, setMutationBusy] = useState(false);
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: DRAG_ACTIVATION_DISTANCE },
    }),
  );

  useEffect(() => {
    let active = true;
    api
      .manageProjects()
      .then((data) => {
        if (active) setProjects(data);
      })
      .catch((e) => {
        if (active) setError(errorMessage(e));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const reload = async (): Promise<void> => {
    const data = await api.manageProjects();
    setProjects(data);
    await refreshProjects();
  };

  if (loading) {
    return <p className="text-sm text-muted-foreground">Chargement…</p>;
  }

  const selected = projects.find((p) => p.key === selectedKey) ?? projects[0] ?? null;
  const showCreate = creating || projects.length === 0;
  const reference = referenceCommitTimeout(projects);

  const onCreated = async (created: ManagedProject): Promise<void> => {
    await reload();
    setSelectedKey(created.key);
    setCreating(false);
  };

  const onDeleted = async (): Promise<void> => {
    await reload();
    setSelectedKey(null);
  };

  const handleDragEnd = async (event: DragEndEvent): Promise<void> => {
    const { active, over } = event;
    setError(null);
    if (!over || active.id === over.id) return;

    const oldIndex = projects.findIndex((project) => project.key === active.id);
    const newIndex = projects.findIndex((project) => project.key === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = arrayMove(projects, oldIndex, newIndex);
    setProjects(reordered);
    setMutationBusy(true);
    const results = await Promise.allSettled(
      reordered.map((project, index) => api.updateProject(project.key, { sortOrder: index })),
    );
    try {
      await reload();
      const failure = results.find((result) => result.status === "rejected");
      if (failure?.status === "rejected") setError(errorMessage(failure.reason, REORDER_ERROR));
    } catch (cause) {
      setError(errorMessage(cause, REORDER_ERROR));
    } finally {
      setMutationBusy(false);
    }
  };

  const toggleVisibility = async (project: ManagedProject): Promise<void> => {
    setError(null);
    const previousProjects = projects;
    setMutationBusy(true);
    setProjects((current) =>
      current.map((item) => (item.key === project.key ? { ...item, hidden: !project.hidden } : item)),
    );
    try {
      await api.updateProject(project.key, { hidden: !project.hidden });
      await reload();
    } catch (cause) {
      try {
        await reload();
      } catch {
        setProjects(previousProjects);
      }
      setError(errorMessage(cause));
    } finally {
      setMutationBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <h3 className="text-sm font-semibold">Projets</h3>
        <p className="text-sm text-muted-foreground">Dépôts sur lesquels les agents peuvent travailler.</p>
      </div>

      <div className="flex flex-col gap-4 min-[720px]:flex-row min-[720px]:items-start">
        <div className="space-y-2 min-[720px]:w-[260px] min-[720px]:shrink-0">
          <DndContext sensors={sensors} onDragEnd={(event) => void handleDragEnd(event)}>
            <SortableContext items={projects.map((project) => project.key)} strategy={verticalListSortingStrategy}>
              <div className="space-y-2">
                {projects.map((project) => (
                  <SortableProjectListRow
                    key={project.key}
                    project={project}
                    selected={!showCreate && selected?.key === project.key}
                    showTimeout={project.commitTimeoutMs !== reference}
                    disabled={mutationBusy}
                    onSelect={() => {
                      setCreating(false);
                      setSelectedKey(project.key);
                    }}
                    onToggleVisibility={() => void toggleVisibility(project)}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
          {projects.length > 0 && (
            <DashedAddButton label="Ajouter un projet" onClick={() => setCreating(true)} />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <ProjectPanel
            key={showCreate ? "new" : (selected?.key ?? "new")}
            project={showCreate ? null : selected}
            projects={projects}
            canPickFolder={canPickFolder}
            cancellable={projects.length > 0}
            onError={setError}
            onSaved={reload}
            onCreated={onCreated}
            onDeleted={onDeleted}
            onCancelCreate={() => setCreating(false)}
          />
        </div>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}

interface ProjectListRowProps {
  project: ManagedProject;
  selected: boolean;
  showTimeout: boolean;
  disabled: boolean;
  onSelect: () => void;
  onToggleVisibility: () => void;
}

function SortableProjectListRow(props: ProjectListRowProps) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({
    id: props.project.key,
    disabled: props.disabled,
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <ProjectListRow
        {...props}
        dragHandleAttributes={attributes}
        dragHandleListeners={listeners}
        setActivatorNodeRef={setActivatorNodeRef}
      />
    </div>
  );
}

type DragHandleAttributes = ReturnType<typeof useSortable>["attributes"];
type DragHandleListeners = ReturnType<typeof useSortable>["listeners"];

interface ProjectListRowInternalProps extends ProjectListRowProps {
  dragHandleAttributes: DragHandleAttributes;
  dragHandleListeners: DragHandleListeners;
  setActivatorNodeRef: (element: HTMLElement | null) => void;
}

function ProjectListRow({
  project,
  selected,
  showTimeout,
  disabled,
  onSelect,
  onToggleVisibility,
  dragHandleAttributes,
  dragHandleListeners,
  setActivatorNodeRef,
}: ProjectListRowInternalProps) {
  const borderClass = selected ? "border-primary bg-accent/40" : "border-border hover:bg-accent/20";

  return (
    <div
      className={cn("flex w-full items-center gap-1 rounded-md border px-1.5 py-1 transition-colors", borderClass)}
    >
      <button
        ref={setActivatorNodeRef}
        type="button"
        disabled={disabled}
        className="cursor-grab p-1 text-muted-foreground active:cursor-grabbing"
        aria-label={`Réorganiser ${project.label}`}
        {...dragHandleAttributes}
        {...dragHandleListeners}
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={onSelect}
        aria-current={selected}
        disabled={disabled}
        className="flex min-w-0 flex-1 items-center gap-2 p-1 text-left disabled:opacity-60"
      >
        <span
          className="h-3 w-3 shrink-0 rounded-sm"
          style={{ backgroundColor: project.color ?? DEFAULT_PROJECT_COLOR }}
        />
        <span className="min-w-0 flex-1 space-y-0.5">
          <span className="block truncate text-sm font-semibold">{project.label}</span>
          <span className="block truncate font-mono text-xs text-muted-foreground" title={project.repoPath}>
            {shortenHomePath(project.repoPath)}
          </span>
          <span className="flex flex-wrap items-center gap-1 pt-0.5">
            <Pill>{project.baseBranch}</Pill>
            {showTimeout && <Pill>commit {formatCommitTimeout(project.commitTimeoutMs)}</Pill>}
          </span>
        </span>
        <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
      </button>
      <button
        type="button"
        disabled={disabled}
        onClick={onToggleVisibility}
        className="p-1 text-muted-foreground hover:text-foreground"
        aria-label={`${project.hidden ? "Afficher" : "Cacher"} ${project.label} dans les sélecteurs`}
        aria-pressed={project.hidden}
      >
        {project.hidden ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
}

function Pill({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full border px-1.5 py-0.5 text-[11px] leading-none text-muted-foreground">
      {children}
    </span>
  );
}

interface ProjectPanelProps {
  project: ManagedProject | null;
  projects: ManagedProject[];
  canPickFolder: boolean;
  cancellable: boolean;
  onError: (message: string | null) => void;
  onSaved: () => Promise<void>;
  onCreated: (created: ManagedProject) => Promise<void>;
  onDeleted: () => Promise<void>;
  onCancelCreate: () => void;
}

function ProjectPanel({
  project,
  projects,
  canPickFolder,
  cancellable,
  onError,
  onSaved,
  onCreated,
  onDeleted,
  onCancelCreate,
}: ProjectPanelProps) {
  const initialTimeoutMs = project?.commitTimeoutMs ?? DEFAULT_COMMIT_TIMEOUT_MS;
  const initialUnit = timeoutUnitOf(initialTimeoutMs);

  const [label, setLabel] = useState(project?.label ?? "");
  const [group, setGroup] = useState(project?.group ?? "");
  const [repoPath, setRepoPath] = useState(project?.repoPath ?? "");
  const [baseBranch, setBaseBranch] = useState(project?.baseBranch ?? "");
  const [runScript, setRunScript] = useState(project?.runScript ?? "");
  const [vcsProvider, setVcsProvider] = useState<VcsProvider>(project?.vcsProvider ?? DEFAULT_VCS_PROVIDER);
  const [connection, setConnection] = useState<VcsConnectionResult | null>(null);
  const [testing, setTesting] = useState(false);
  const [unit, setUnit] = useState<TimeoutUnit>(initialUnit);
  const [timeoutValue, setTimeoutValue] = useState(String(initialTimeoutMs / timeoutUnitMs(initialUnit)));
  const [color, setColor] = useState(project?.color ?? DEFAULT_PROJECT_COLOR);
  const [busy, setBusy] = useState(false);
  const [picking, setPicking] = useState(false);
  const { saved: savedVisible, flashSaved } = useSavedFlag();

  const commitTimeoutMs = String(Number(timeoutValue) * timeoutUnitMs(unit));
  const valid = isValidDraft(label, repoPath, baseBranch, timeoutValue);
  const normalizedGroup = group.trim();
  const groupSuggestions = Array.from(
    new Set(projects.flatMap((managedProject) => (managedProject.group ? [managedProject.group] : []))),
  ).sort((left, right) => left.localeCompare(right));

  const dirty =
    project === null ||
    label !== project.label ||
    group !== (project.group ?? "") ||
    repoPath !== project.repoPath ||
    commitTimeoutMs !== String(project.commitTimeoutMs) ||
    baseBranch !== project.baseBranch ||
    runScript !== (project.runScript ?? "") ||
    vcsProvider !== project.vcsProvider ||
    color !== (project.color ?? DEFAULT_PROJECT_COLOR);

  const hint = connectionHint(project !== null, dirty, testing, connection);

  const pickFolder = async (): Promise<void> => {
    onError(null);
    setPicking(true);
    try {
      const picked = await api.pickFolder();
      if (picked !== null) setRepoPath(picked);
    } catch (e) {
      onError(errorMessage(e));
    } finally {
      setPicking(false);
    }
  };

  const buildPatch = (current: ManagedProject): UpdateProjectInput => {
    const patch: UpdateProjectInput = {};
    if (label !== current.label) patch.label = label.trim();
    if (group !== (current.group ?? "")) patch.group = normalizedGroup || null;
    if (repoPath !== current.repoPath) patch.repoPath = repoPath.trim();
    if (baseBranch !== current.baseBranch) patch.baseBranch = baseBranch.trim();
    if (commitTimeoutMs !== String(current.commitTimeoutMs)) patch.commitTimeoutMs = Number(commitTimeoutMs);
    if (vcsProvider !== current.vcsProvider) patch.vcsProvider = vcsProvider;
    if (runScript !== (current.runScript ?? "")) patch.runScript = runScript.trim() || null;
    if (color !== (current.color ?? DEFAULT_PROJECT_COLOR)) patch.color = color;
    return patch;
  };

  const create = async (): Promise<void> => {
    const input: CreateProjectInput = {
      label: label.trim(),
      repoPath: repoPath.trim(),
      baseBranch: baseBranch.trim(),
      commitTimeoutMs: Number(commitTimeoutMs),
      vcsProvider,
      ...(normalizedGroup !== "" ? { group: normalizedGroup } : {}),
      ...(runScript.trim() !== "" ? { runScript: runScript.trim() } : {}),
      color,
    };
    const created = await api.createProject(input);
    await onCreated(created);
  };

  const update = async (current: ManagedProject): Promise<void> => {
    const saved = await api.updateProject(current.key, buildPatch(current));
    setLabel(saved.label);
    setGroup(saved.group ?? "");
    setRepoPath(saved.repoPath);
    setBaseBranch(saved.baseBranch);
    setRunScript(saved.runScript ?? "");
    setVcsProvider(saved.vcsProvider);
    setConnection(null);
    await onSaved();
    flashSaved();
  };

  const testConnection = async (current: ManagedProject): Promise<void> => {
    onError(null);
    setTesting(true);
    try {
      setConnection(await api.testProjectConnection(current.key));
    } catch (e) {
      setConnection({ ok: false, message: errorMessage(e), checkedAt: Date.now() });
    } finally {
      setTesting(false);
    }
  };

  const submit = async (): Promise<void> => {
    onError(null);
    setBusy(true);
    try {
      if (project === null) {
        await create();
        return;
      }
      await update(project);
    } catch (e) {
      onError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const remove = async (current: ManagedProject): Promise<void> => {
    onError(null);
    setBusy(true);
    try {
      await api.deleteProject(current.key);
      await onDeleted();
    } catch (e) {
      onError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-3 rounded-md border bg-muted/30 p-4">
      <p className="text-sm font-semibold">{project?.label ?? "Nouveau projet"}</p>

      <div className="flex flex-col gap-3">
        <Field label="Nom">
          <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Nom du projet" />
        </Field>
        <Field label="Groupe / client">
          <Input
            value={group}
            onChange={(e) => setGroup(e.target.value)}
            placeholder="Fauna"
            aria-label="Groupe ou client"
            list={PROJECT_GROUP_LIST_ID}
          />
          <datalist id={PROJECT_GROUP_LIST_ID}>
            {groupSuggestions.map((suggestion) => (
              <option key={suggestion} value={suggestion} />
            ))}
          </datalist>
        </Field>
        <Field label="Chemin">
          <div className="flex w-full items-center gap-2">
            <Input
              value={repoPath}
              onChange={(e) => setRepoPath(e.target.value)}
              placeholder="/chemin/vers/le/dépôt"
            />
            {canPickFolder && (
              <Button
                variant="outline"
                onClick={() => void pickFolder()}
                disabled={picking || busy}
                aria-label="Parcourir"
              >
                <FolderOpen className="h-4 w-4" />
                Parcourir
              </Button>
            )}
          </div>
        </Field>
        <Field label="Branche de base">
          <Input value={baseBranch} onChange={(e) => setBaseBranch(e.target.value)} placeholder="main" />
        </Field>
        <Field label="Fournisseur">
          <div className="flex w-full flex-col items-start gap-1.5">
            <Select
              value={vcsProvider}
              onChange={(e) => setVcsProvider(toVcsProvider(e.target.value))}
              aria-label="Fournisseur"
            >
              {VCS_PROVIDERS.map((option) => (
                <option key={option} value={option}>
                  {VCS_PROVIDER_LABELS[option]}
                </option>
              ))}
            </Select>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (project !== null) void testConnection(project);
                }}
                disabled={project === null || dirty || testing || busy}
              >
                Tester la connexion
              </Button>
              <span role="status" className={`text-xs ${hint.className}`}>
                {hint.message}
              </span>
            </div>
          </div>
        </Field>
        <Field label="Commande de démarrage">
          <Input
            value={runScript}
            onChange={(e) => setRunScript(e.target.value)}
            placeholder="bun run dev"
          />
        </Field>
        <Field label="Délai max d'un commit">
          <div className="flex w-full items-center gap-2">
            <Input
              type="number"
              min={1}
              step={1}
              className="w-28"
              value={timeoutValue}
              onChange={(e) => setTimeoutValue(e.target.value)}
            />
            <Select
              value={unit}
              onChange={(e) => setUnit(e.target.value === "s" ? "s" : "min")}
              aria-label="Unité du délai"
            >
              {TIMEOUT_UNITS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </Select>
          </div>
        </Field>
        <Field label="Couleur">
          <input
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            className="h-9 w-12 cursor-pointer rounded-md border border-input bg-background"
            aria-label="Couleur"
          />
        </Field>
      </div>

      <SettingsFooter dirty={dirty && project !== null} justSaved={savedVisible}>
        {project !== null && (
          <ConfirmPopover
            title="Supprimer le projet"
            description={`Supprimer le projet « ${project.label} » ?`}
            confirmLabel="Supprimer"
            destructive
            onConfirm={() => remove(project)}
          >
            <Button variant="outline" size="sm" disabled={busy}>
              Supprimer
            </Button>
          </ConfirmPopover>
        )}
        {project === null && cancellable && (
          <Button variant="ghost" size="sm" onClick={onCancelCreate} disabled={busy}>
            Annuler
          </Button>
        )}
        {dirty && (
          <Button size="sm" onClick={() => void submit()} disabled={busy || !valid}>
            {project === null ? "Ajouter le projet" : "Enregistrer"}
          </Button>
        )}
      </SettingsFooter>

    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col items-start gap-1.5">
      <Label className={FIELD_LABEL_CLASSES}>{label}</Label>
      {children}
    </div>
  );
}
