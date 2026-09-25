import { Check, ChevronDown, ChevronRight, GitPullRequest, Search } from "lucide-react";
import { useRef, useState, type KeyboardEvent, type ReactNode } from "react";

import type { ProjectInfo } from "@shared/schemas";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { ReviewCountSnapshot } from "@/hooks/useReviewCounts";
import { FIELD_LABEL_CLASSES } from "@/lib/overlayStyles";
import { cn } from "@/lib/utils";

const UNGROUPED_LABEL = "Sans groupe";

export interface ProjectSelectOption {
  key: string;
  label: string;
}

interface ProjectGroup {
  key: string;
  label: string;
  projects: ProjectInfo[];
}

interface ProjectSelectProps {
  id: string;
  projects: ProjectInfo[];
  value: string;
  onChange: (key: string) => void;
  label?: string | null;
  ariaLabel?: string;
  options?: ProjectSelectOption[];
  disabled?: boolean;
  className?: string;
  triggerClassName?: string;
  reviewCounts?: ReviewCountSnapshot;
}

function ReviewCountBadge({
  count,
  loading,
  partial = false,
}: { count: number | null; loading: boolean; partial?: boolean }): ReactNode {
  let label = "—";
  let ariaLabel = "Nombre de PR à review indisponible";
  if (loading) {
    label = "…";
    ariaLabel = "Chargement du nombre de PR à review";
  } else if (count !== null) {
    label = `${partial ? "≥" : ""}${count} PR`;
    ariaLabel = `${partial ? "Au moins " : ""}${count} PR à review`;
  }

  return (
    <span
      aria-label={ariaLabel}
      className={cn(
        "inline-flex shrink-0 items-center gap-1 rounded border px-1.5 py-0.5 text-[10px] font-semibold leading-none",
        !loading && count !== null && count > 0
          ? "border-warning/30 bg-warning/15 text-warning"
          : "border-border bg-muted text-muted-foreground",
      )}
    >
      <GitPullRequest className="h-3 w-3" aria-hidden="true" />
      {label}
    </span>
  );
}

function groupReviewCount(group: ProjectGroup, counts: Record<string, number | null>): { count: number | null; partial: boolean } {
  let count = 0;
  let unavailable = false;
  let available = false;
  for (const project of group.projects) {
    const projectCount = counts[project.key];
    if (projectCount === null || projectCount === undefined) {
      unavailable = true;
      continue;
    }
    available = true;
    count += projectCount;
  }
  return { count: available ? count : null, partial: unavailable };
}

function normalizeSearch(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}

function projectGroupIdentity(project: ProjectInfo): { key: string; label: string } {
  const group = project.group?.trim();
  if (!group) return { key: "ungrouped", label: UNGROUPED_LABEL };
  return { key: `named:${group}`, label: group };
}

function groupProjects(projects: ProjectInfo[]): ProjectGroup[] {
  const groups = new Map<string, ProjectGroup>();
  for (const project of projects) {
    const identity = projectGroupIdentity(project);
    const group = groups.get(identity.key);
    if (group) group.projects.push(project);
    else groups.set(identity.key, { ...identity, projects: [project] });
  }
  return [...groups.values()];
}

function initialExpandedGroups(projects: ProjectInfo[], value: string): Set<string> {
  const selectedGroup = projects.find((project) => project.key === value);
  return selectedGroup ? new Set([projectGroupIdentity(selectedGroup).key]) : new Set();
}

function projectInitial(groupLabel: string): string {
  if (groupLabel === UNGROUPED_LABEL) return "·";
  return groupLabel.charAt(0).toLocaleUpperCase();
}

export function ProjectSelect({
  id,
  projects,
  value,
  onChange,
  label = "Projet",
  ariaLabel,
  options = [],
  disabled = false,
  className,
  triggerClassName,
  reviewCounts,
}: ProjectSelectProps): ReactNode {
  const groups = groupProjects(projects);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [expandedGroups, setExpandedGroups] = useState(() => initialExpandedGroups(projects, value));
  const searchRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  const normalizedQuery = normalizeSearch(query);
  const selectedProject = projects.find((project) => project.key === value);
  const selectedOption = options.find((option) => option.key === value);
  const selectedLabel = selectedProject?.label ?? selectedOption?.label ?? "Aucun projet visible";
  const filteredGroups = groups
    .map((group) => ({
      ...group,
      visibleProjects: group.projects.filter((project) =>
        normalizeSearch(`${group.label} ${project.label} ${project.key}`).includes(normalizedQuery),
      ),
    }))
    .filter((group) => group.visibleProjects.length > 0);
  const filteredOptions = options.filter((option) =>
    normalizeSearch(`${option.label} ${option.key}`).includes(normalizedQuery),
  );
  const resultCount = filteredOptions.length
    + filteredGroups.reduce((count, group) => count + group.visibleProjects.length, 0);
  const hasChoices = projects.length > 0 || options.length > 0;

  const changeOpen = (nextOpen: boolean): void => {
    setOpen(nextOpen);
    if (!nextOpen) setQuery("");
  };

  const select = (key: string): void => {
    onChange(key);
    changeOpen(false);
  };

  const toggleGroup = (groupKey: string): void => {
    setExpandedGroups((current) => {
      const next = new Set(current);
      if (next.has(groupKey)) next.delete(groupKey);
      else next.add(groupKey);
      return next;
    });
  };

  const focusItem = (direction: 1 | -1, current?: HTMLButtonElement): void => {
    const pickerItems = [
      ...(resultsRef.current?.querySelectorAll<HTMLButtonElement>("[data-picker-item]:not(:disabled)") ?? []),
    ];
    if (pickerItems.length === 0) return;
    const currentIndex = current ? pickerItems.indexOf(current) : -1;
    let nextIndex = (currentIndex + direction + pickerItems.length) % pickerItems.length;
    if (currentIndex < 0) nextIndex = direction === 1 ? 0 : pickerItems.length - 1;
    pickerItems[nextIndex]?.focus();
  };

  const focusFirstProject = (direction: 1 | -1): void => {
    const projectButtons = [
      ...(resultsRef.current?.querySelectorAll<HTMLButtonElement>("[data-project-option]") ?? []),
    ];
    if (direction === 1) projectButtons[0]?.focus();
    else projectButtons.at(-1)?.focus();
  };

  const handleProjectKeyDown = (event: KeyboardEvent<HTMLButtonElement>): void => {
    if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
    event.preventDefault();
    focusItem(event.key === "ArrowDown" ? 1 : -1, event.currentTarget);
  };

  const projectOption = (key: string, optionLabel: string, groupLabel?: string): ReactNode => {
    const selected = key === value;
    return (
      <button
        key={key}
        type="button"
        aria-pressed={selected}
        data-project-option
        data-picker-item
        onClick={() => select(key)}
        onKeyDown={handleProjectKeyDown}
        className={cn(
          "flex w-full items-center gap-2 rounded-sm px-2 py-2 text-left text-sm transition-colors hover:bg-accent focus-visible:bg-accent focus-visible:outline-none",
          groupLabel && "pl-8",
          selected && "bg-accent text-accent-foreground",
        )}
      >
        {groupLabel && (
          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-muted text-[10px] font-semibold text-muted-foreground">
            {projectInitial(groupLabel)}
          </span>
        )}
        <span className="min-w-0 flex-1 truncate">{optionLabel}</span>
        {groupLabel && <span className="truncate font-mono text-[10px] text-muted-foreground">{key}</span>}
        {groupLabel && reviewCounts && (
          <ReviewCountBadge count={reviewCounts.counts[key] ?? null} loading={reviewCounts.loading} />
        )}
        {selected && <Check className="h-3.5 w-3.5 shrink-0 text-info" aria-hidden="true" />}
      </button>
    );
  };

  const field = (
    <Popover open={open} onOpenChange={changeOpen}>
      <PopoverTrigger>
        <Button
          id={id}
          type="button"
          variant="outline"
          aria-expanded={open}
          aria-haspopup="dialog"
          aria-controls={`${id}-project-dialog`}
          aria-label={label ? undefined : ariaLabel}
          disabled={disabled || !hasChoices}
          className={cn("w-full justify-between px-3 font-normal", triggerClassName)}
        >
          <span className="truncate">{selectedLabel}</span>
          <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        id={`${id}-project-dialog`}
        role="dialog"
        aria-label="Choisir un projet"
        align="start"
        className="w-[var(--radix-popover-trigger-width)] min-w-64 overflow-hidden p-0"
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          searchRef.current?.focus();
        }}
      >
        <div className="flex h-10 items-center gap-2 border-b px-3 focus-within:shadow-[inset_0_-2px_0_hsl(var(--ring))]">
          <Search className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          <input
            ref={searchRef}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
              event.preventDefault();
              focusFirstProject(event.key === "ArrowDown" ? 1 : -1);
            }}
            aria-label="Rechercher un client ou un projet"
            placeholder="Rechercher un client ou un projet…"
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="none"
            className="h-full min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
          <kbd className="rounded border px-1 py-0.5 text-[10px] text-muted-foreground">esc</kbd>
        </div>
        <div
          ref={resultsRef}
          className="max-h-72 overflow-y-auto p-1"
        >
          {filteredOptions.map((option) => projectOption(option.key, option.label))}
          {filteredGroups.map((group) => {
            const expanded = normalizedQuery.length > 0 || expandedGroups.has(group.key);
            const reviewTotal = reviewCounts ? groupReviewCount(group, reviewCounts.counts) : null;
            const projectCount = reviewCounts ? group.projects.length : group.visibleProjects.length;
            return (
              <div key={group.key} role="group" aria-label={group.label} className="mb-0.5 last:mb-0">
                <button
                  type="button"
                  aria-expanded={expanded}
                  disabled={normalizedQuery.length > 0}
                  data-picker-item
                  onClick={() => toggleGroup(group.key)}
                  onKeyDown={handleProjectKeyDown}
                  className="flex w-full items-center gap-2 rounded-sm px-2 py-2 text-left text-xs font-semibold transition-colors hover:bg-accent focus-visible:bg-accent focus-visible:outline-none disabled:cursor-default disabled:opacity-100"
                >
                  {expanded
                    ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
                    : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />}
                  <span className="flex h-5 w-5 items-center justify-center rounded bg-muted text-[10px] text-muted-foreground">
                    {projectInitial(group.label)}
                  </span>
                  <span className="min-w-0 flex-1 truncate">{group.label}</span>
                  <span className="font-normal text-muted-foreground" aria-label={`${projectCount} projets`}>
                    {projectCount}
                  </span>
                  {reviewCounts && reviewTotal && (
                    <ReviewCountBadge count={reviewTotal.count} loading={reviewCounts.loading} partial={reviewTotal.partial} />
                  )}
                </button>
                  {expanded && group.visibleProjects.map((project) => projectOption(project.key, project.label, group.label))}
              </div>
            );
          })}
          {resultCount === 0 && (
            <p className="px-3 py-8 text-center text-sm text-muted-foreground">Aucun projet trouvé.</p>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );

  if (label === null) return <div className={className}>{field}</div>;

  return (
    <div className={cn("space-y-1.5", className)}>
      <Label htmlFor={id} className={FIELD_LABEL_CLASSES}>{label}</Label>
      {field}
    </div>
  );
}
