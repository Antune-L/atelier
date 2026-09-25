import { DndContext, KeyboardSensor, PointerSensor, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ChevronRight, Eye, EyeOff, GripVertical, Plus, Search } from "lucide-react";
import type { CSSProperties, ReactNode } from "react";

import { DEFAULT_PROJECT_COLOR } from "@shared/constants";
import type { ManagedProject } from "@shared/schemas";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { FIELD_LABEL_CLASSES } from "@/lib/overlayStyles";
import { formatCommitTimeout, shortenHomePath } from "@/lib/projectDisplay";
import { UNGROUPED_KEY, type FilteredProjectGroup } from "@/lib/projectGroups";
import { cn } from "@/lib/utils";

const DRAG_ACTIVATION_DISTANCE = 6;
const DRAGGING_OPACITY = 0.4;
const GROUP_SORT_PREFIX = "group:";
const PROJECT_SORT_PREFIX = "project:";
const LIST_TITLE = "Projets";
const ADD_PROJECT_LABEL = "Ajouter un projet";
const SEARCH_PLACEHOLDER = "Rechercher un projet…";
const SHOW_HIDDEN_LABEL = "Afficher les projets cachés";
const DND_HINT = "Glissez pour réordonner les groupes ou les projets dans leur groupe.";
const DND_DISABLED_HINT = "Effacez la recherche pour réordonner.";
const NO_MATCH_LABEL = "Aucun projet ne correspond.";
const LIST_SCROLL_CLASSES = "min-h-0 overflow-y-auto pr-1 max-h-[40vh] min-[720px]:max-h-[calc(85vh-20rem)]";
const DRAG_HANDLE_CLASSES =
  "cursor-grab p-1 text-muted-foreground active:cursor-grabbing disabled:cursor-default disabled:opacity-40";

type ListGroup = FilteredProjectGroup<ManagedProject>;

interface ProjectListProps {
  totalCount: number;
  hiddenCount: number;
  groups: ListGroup[];
  selectedKey: string | null;
  referenceTimeoutMs: number;
  busy: boolean;
  createDisabled: boolean;
  query: string;
  searchActive: boolean;
  showHidden: boolean;
  onQueryChange: (value: string) => void;
  onShowHiddenChange: (value: boolean) => void;
  onCreate: () => void;
  onSelect: (key: string) => void;
  onToggleVisibility: (project: ManagedProject) => void;
  onGroupColorChange: (group: ListGroup, color: string) => void;
  onGroupMove: (activeKey: string, overKey: string) => void;
  onProjectMove: (group: ListGroup, activeKey: string, overKey: string) => void;
}

function groupSortId(key: string): string {
  return `${GROUP_SORT_PREFIX}${key}`;
}

function projectSortId(key: string): string {
  return `${PROJECT_SORT_PREFIX}${key}`;
}

function dragKeys<T>(
  items: T[],
  event: DragEndEvent,
  sortId: (item: T) => string,
): { active: T; over: T } | null {
  const { active, over } = event;
  if (!over || active.id === over.id) return null;
  const activeItem = items.find((item) => sortId(item) === active.id);
  const overItem = items.find((item) => sortId(item) === over.id);
  if (!activeItem || !overItem) return null;
  return { active: activeItem, over: overItem };
}

function sortableStyle({ transform, transition, isDragging }: ReturnType<typeof useSortable>): CSSProperties {
  return {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? DRAGGING_OPACITY : 1,
  };
}

function groupCountLabel(group: ListGroup): string {
  const total = group.projects.length;
  if (group.visibleProjects.length === total) return String(total);
  return `${group.visibleProjects.length}/${total}`;
}

export function ProjectList({
  totalCount,
  hiddenCount,
  groups,
  selectedKey,
  referenceTimeoutMs,
  busy,
  createDisabled,
  query,
  searchActive,
  showHidden,
  onQueryChange,
  onShowHiddenChange,
  onCreate,
  onSelect,
  onToggleVisibility,
  onGroupColorChange,
  onGroupMove,
  onProjectMove,
}: ProjectListProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: DRAG_ACTIVATION_DISTANCE },
    }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const dragDisabled = searchActive;
  const showHiddenLabel = hiddenCount > 0 ? `${SHOW_HIDDEN_LABEL} (${hiddenCount})` : SHOW_HIDDEN_LABEL;

  const handleGroupDragEnd = (event: DragEndEvent): void => {
    const keys = dragKeys(groups, event, (group) => groupSortId(group.key));
    if (keys) onGroupMove(keys.active.key, keys.over.key);
  };

  const handleProjectDragEnd = (group: ListGroup, event: DragEndEvent): void => {
    const keys = dragKeys(group.visibleProjects, event, (project) => projectSortId(project.key));
    if (keys) onProjectMove(group, keys.active.key, keys.over.key);
  };

  return (
    <div className="flex flex-col gap-2 min-[720px]:sticky min-[720px]:top-0 min-[720px]:w-[260px] min-[720px]:shrink-0">
      {totalCount > 0 && (
        <>
          <div className="flex items-center justify-between gap-2">
            <p className={FIELD_LABEL_CLASSES}>
              {LIST_TITLE} ({totalCount})
            </p>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              title={ADD_PROJECT_LABEL}
              aria-label={ADD_PROJECT_LABEL}
              disabled={createDisabled}
              onClick={onCreate}
            >
              <Plus className="h-3.5 w-3.5" />
            </Button>
          </div>
          <div className="relative">
            <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              value={query}
              onChange={(e) => onQueryChange(e.target.value)}
              placeholder={SEARCH_PLACEHOLDER}
              aria-label={SEARCH_PLACEHOLDER}
              className="h-7 w-full pl-7 text-xs"
            />
          </div>
          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            <Switch checked={showHidden} onCheckedChange={onShowHiddenChange} />
            {showHiddenLabel}
          </label>
        </>
      )}
      {totalCount > 1 && (
        <p className="text-xs text-muted-foreground">{dragDisabled ? DND_DISABLED_HINT : DND_HINT}</p>
      )}
      <div className={LIST_SCROLL_CLASSES}>
        {totalCount > 0 && groups.length === 0 && <p className="text-xs text-muted-foreground">{NO_MATCH_LABEL}</p>}
        <DndContext sensors={sensors} onDragEnd={handleGroupDragEnd}>
          <SortableContext items={groups.map((group) => groupSortId(group.key))} strategy={verticalListSortingStrategy}>
            <div className="space-y-3">
              {groups.map((group) => (
                <SortableProjectGroup
                  key={group.key}
                  group={group}
                  disabled={busy || dragDisabled || groups.length < 2}
                  colorBusy={busy}
                  onColorChange={(color) => onGroupColorChange(group, color)}
                >
                  <DndContext sensors={sensors} onDragEnd={(event) => handleProjectDragEnd(group, event)}>
                    <SortableContext
                      items={group.visibleProjects.map((project) => projectSortId(project.key))}
                      strategy={verticalListSortingStrategy}
                    >
                      <div className="space-y-2">
                        {group.visibleProjects.map((project) => (
                          <SortableProjectListRow
                            key={project.key}
                            project={project}
                            selected={selectedKey === project.key}
                            showTimeout={project.commitTimeoutMs !== referenceTimeoutMs}
                            disabled={busy}
                            dragDisabled={dragDisabled}
                            onSelect={() => onSelect(project.key)}
                            onToggleVisibility={() => onToggleVisibility(project)}
                          />
                        ))}
                      </div>
                    </SortableContext>
                  </DndContext>
                </SortableProjectGroup>
              ))}
            </div>
          </SortableContext>
        </DndContext>
      </div>
    </div>
  );
}

function SortableProjectGroup({
  group,
  disabled,
  colorBusy,
  onColorChange,
  children,
}: {
  group: ListGroup;
  disabled: boolean;
  colorBusy: boolean;
  onColorChange: (color: string) => void;
  children: ReactNode;
}) {
  const sortable = useSortable({ id: groupSortId(group.key), disabled });
  const { attributes, listeners, setNodeRef, setActivatorNodeRef } = sortable;

  return (
    <section ref={setNodeRef} style={sortableStyle(sortable)} className="rounded-lg border border-dashed border-border bg-background p-2">
      <div className="mb-2 flex items-center gap-1 px-1">
        <button
          ref={setActivatorNodeRef}
          type="button"
          disabled={disabled}
          className={DRAG_HANDLE_CLASSES}
          aria-label={`Réorganiser le groupe ${group.label}`}
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-4 w-4" aria-hidden="true" />
        </button>
        <h4 className="min-w-0 flex-1 truncate text-xs font-semibold text-foreground">{group.label}</h4>
        {group.key !== UNGROUPED_KEY && (
          <input
            type="color"
            value={group.projects[0]?.color ?? DEFAULT_PROJECT_COLOR}
            onChange={(event) => onColorChange(event.target.value)}
            disabled={colorBusy}
            className="h-6 w-7 shrink-0 cursor-pointer rounded border border-input bg-background p-0.5 disabled:cursor-default"
            aria-label={`Couleur du groupe ${group.label}`}
            title={`Couleur du groupe ${group.label}`}
          />
        )}
        <span className="shrink-0 text-xs text-muted-foreground">{groupCountLabel(group)}</span>
      </div>
      {children}
    </section>
  );
}

interface ProjectListRowProps {
  project: ManagedProject;
  selected: boolean;
  showTimeout: boolean;
  disabled: boolean;
  dragDisabled: boolean;
  onSelect: () => void;
  onToggleVisibility: () => void;
}

function SortableProjectListRow({
  project,
  selected,
  showTimeout,
  disabled,
  dragDisabled,
  onSelect,
  onToggleVisibility,
}: ProjectListRowProps) {
  const sortable = useSortable({ id: projectSortId(project.key), disabled: disabled || dragDisabled });
  const { attributes, listeners, setNodeRef, setActivatorNodeRef } = sortable;
  const borderClass = selected ? "border-primary bg-accent/40" : "border-border hover:bg-accent/20";

  return (
    <div ref={setNodeRef} style={sortableStyle(sortable)}>
      <div
        className={cn("flex w-full items-center gap-1 rounded-md border px-1.5 py-1 transition-colors", borderClass)}
      >
        <button
          ref={setActivatorNodeRef}
          type="button"
          disabled={disabled || dragDisabled}
          className={DRAG_HANDLE_CLASSES}
          aria-label={`Réorganiser ${project.label}`}
          {...attributes}
          {...listeners}
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
