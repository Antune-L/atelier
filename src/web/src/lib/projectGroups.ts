import { arrayMove } from "@dnd-kit/sortable";

export const UNGROUPED_LABEL = "Sans groupe";
export const UNGROUPED_KEY = "ungrouped";
const NAMED_GROUP_PREFIX = "named:";

interface GroupableProject {
  key: string;
  group?: string;
}

export interface ProjectGroup<T extends GroupableProject> {
  key: string;
  label: string;
  projects: T[];
}

export interface FilteredProjectGroup<T extends GroupableProject> extends ProjectGroup<T> {
  visibleProjects: T[];
}

export function projectGroupIdentity(project: GroupableProject): { key: string; label: string } {
  const group = project.group?.trim();
  if (!group) return { key: UNGROUPED_KEY, label: UNGROUPED_LABEL };
  return { key: `${NAMED_GROUP_PREFIX}${group}`, label: group };
}

export function groupProjects<T extends GroupableProject>(projects: T[]): ProjectGroup<T>[] {
  const groups = new Map<string, ProjectGroup<T>>();
  for (const project of projects) {
    const identity = projectGroupIdentity(project);
    const group = groups.get(identity.key);
    if (group) group.projects.push(project);
    else groups.set(identity.key, { ...identity, projects: [project] });
  }
  return [...groups.values()];
}

export function filterProjectGroups<T extends GroupableProject>(
  groups: ProjectGroup<T>[],
  isVisible: (project: T, group: ProjectGroup<T>) => boolean,
): FilteredProjectGroup<T>[] {
  return groups
    .map((group) => ({ ...group, visibleProjects: group.projects.filter((project) => isVisible(project, group)) }))
    .filter((group) => group.visibleProjects.length > 0);
}

function moveByKey<T extends { key: string }>(items: T[], activeKey: string, overKey: string): T[] | null {
  const oldIndex = items.findIndex((item) => item.key === activeKey);
  const newIndex = items.findIndex((item) => item.key === overKey);
  if (oldIndex === -1 || newIndex === -1) return null;
  return arrayMove(items, oldIndex, newIndex);
}

export function moveVisibleProject<T extends GroupableProject>(
  projects: T[],
  group: FilteredProjectGroup<T>,
  activeKey: string,
  overKey: string,
): T[] | null {
  const visibleOrdered = moveByKey(group.visibleProjects, activeKey, overKey);
  if (!visibleOrdered) return null;
  const visibleKeys = new Set(group.visibleProjects.map((project) => project.key));
  let visibleIndex = 0;
  return projects.map((project) => {
    if (!visibleKeys.has(project.key)) return project;
    const replacement = visibleOrdered[visibleIndex];
    visibleIndex += 1;
    return replacement ?? project;
  });
}

export function moveGroup<T extends GroupableProject>(
  groups: ProjectGroup<T>[],
  activeKey: string,
  overKey: string,
): T[] | null {
  return moveByKey(groups, activeKey, overKey)?.flatMap((group) => group.projects) ?? null;
}
