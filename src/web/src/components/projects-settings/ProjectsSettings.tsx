import { useEffect, useState } from "react";

import type { ManagedProject } from "@shared/schemas";

import { ProjectList } from "@/components/projects-settings/ProjectList";
import { ProjectPanel } from "@/components/projects-settings/ProjectPanel";
import { useCapabilities } from "@/hooks/useCapabilities";
import { refreshProjects } from "@/hooks/useProjects";
import { api } from "@/lib/api";
import { errorMessage } from "@/lib/errors";
import { mostCommonValue, shortenHomePath } from "@/lib/projectDisplay";
import {
  filterProjectGroups,
  groupProjects,
  moveGroup,
  moveVisibleProject,
  projectGroupIdentity,
  type FilteredProjectGroup,
} from "@/lib/projectGroups";
import { matchesQuery, normalizeSearch } from "@/lib/search";

const REFERENCE_COMMIT_TIMEOUT_MS = 120000;
const REORDER_ERROR = "Erreur lors de la réorganisation";
const EMPTY_PANEL_LABEL = "Aucun projet à afficher.";
const NEW_PANEL_KEY = "new";
const SHOW_HIDDEN_STORAGE_KEY = "projects-settings:show-hidden";
const STORED_TRUE = "1";
const STORED_FALSE = "0";

function readShowHidden(): boolean {
  try {
    return localStorage.getItem(SHOW_HIDDEN_STORAGE_KEY) === STORED_TRUE;
  } catch {
    return false;
  }
}

function writeShowHidden(value: boolean): void {
  try {
    localStorage.setItem(SHOW_HIDDEN_STORAGE_KEY, value ? STORED_TRUE : STORED_FALSE);
  } catch {
    return;
  }
}

function referenceCommitTimeout(projects: ManagedProject[]): number {
  if (projects.length < 2) return REFERENCE_COMMIT_TIMEOUT_MS;
  return mostCommonValue(projects.map((p) => p.commitTimeoutMs)) ?? REFERENCE_COMMIT_TIMEOUT_MS;
}

function projectMatches(query: string, project: ManagedProject): boolean {
  return matchesQuery(query, project.label, project.repoPath, shortenHomePath(project.repoPath), project.group ?? "");
}

export function ProjectsSettings() {
  const { canPickFolder } = useCapabilities();
  const [projects, setProjects] = useState<ManagedProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [mutationBusy, setMutationBusy] = useState(false);
  const [query, setQuery] = useState("");
  const [showHidden, setShowHidden] = useState(readShowHidden);

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

  const normalizedQuery = normalizeSearch(query);
  const isListed = (project: ManagedProject): boolean =>
    (showHidden || !project.hidden || project.key === selectedKey) && projectMatches(normalizedQuery, project);
  const visibleProjects = projects.filter(isListed);
  const allGroups = groupProjects(projects);
  const listGroups = filterProjectGroups(allGroups, isListed);
  const selected =
    visibleProjects.find((p) => p.key === selectedKey) ??
    visibleProjects.find((p) => !p.hidden) ??
    visibleProjects[0] ??
    null;
  const showCreate = creating || projects.length === 0;
  const hiddenCount = projects.filter((project) => project.hidden).length;

  const changeShowHidden = (value: boolean): void => {
    setShowHidden(value);
    writeShowHidden(value);
  };

  const onCreated = async (created: ManagedProject): Promise<void> => {
    await reload();
    setSelectedKey(created.key);
    setCreating(false);
  };

  const openExisting = (key: string): void => {
    if (projects.find((project) => project.key === key)?.hidden) changeShowHidden(true);
    setQuery("");
    setCreating(false);
    setSelectedKey(key);
  };

  const onDeleted = async (): Promise<void> => {
    await reload();
    setSelectedKey(null);
  };

  const mutateOptimistically = async (
    applyOptimistic: (current: ManagedProject[]) => ManagedProject[],
    request: () => Promise<unknown>,
    fallbackError?: string,
  ): Promise<void> => {
    const previousProjects = projects;
    setError(null);
    setMutationBusy(true);
    setProjects(applyOptimistic);
    try {
      await request();
      await reload();
    } catch (cause) {
      try {
        await reload();
      } catch {
        setProjects(previousProjects);
      }
      setError(errorMessage(cause, fallbackError));
    } finally {
      setMutationBusy(false);
    }
  };

  const persistOrder = async (reordered: ManagedProject[] | null): Promise<void> => {
    if (!reordered) return;
    await mutateOptimistically(
      () => reordered,
      () => api.reorderProjects(reordered.map((project) => project.key)),
      REORDER_ERROR,
    );
  };

  const updateGroupColor = async (group: FilteredProjectGroup<ManagedProject>, color: string): Promise<void> => {
    await mutateOptimistically(
      (current) => current.map((project) => (
        projectGroupIdentity(project).key === group.key ? { ...project, color } : project
      )),
      () => api.updateProjectGroupColor(group.label, color),
    );
  };

  const toggleVisibility = async (project: ManagedProject): Promise<void> => {
    await mutateOptimistically(
      (current) => current.map((item) => (item.key === project.key ? { ...item, hidden: !project.hidden } : item)),
      () => api.updateProject(project.key, { hidden: !project.hidden }),
    );
  };

  const panelProject = showCreate ? null : selected;

  const renderPanel = () => {
    if (!showCreate && selected === null) {
      return <p className="text-sm text-muted-foreground">{EMPTY_PANEL_LABEL}</p>;
    }
    return (
      <ProjectPanel
        key={panelProject?.key ?? NEW_PANEL_KEY}
        project={panelProject}
        projects={projects}
        canPickFolder={canPickFolder}
        cancellable={projects.length > 0}
        onError={setError}
        onSaved={reload}
        onCreated={onCreated}
        onDeleted={onDeleted}
        onCancelCreate={() => setCreating(false)}
        onOpenExisting={openExisting}
      />
    );
  };

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <h3 className="text-sm font-semibold">Projets</h3>
        <p className="text-sm text-muted-foreground">Dépôts sur lesquels les agents peuvent travailler.</p>
      </div>

      <div className="flex flex-col gap-4 min-[720px]:flex-row min-[720px]:items-start">
        <ProjectList
          totalCount={projects.length}
          hiddenCount={hiddenCount}
          groups={listGroups}
          selectedKey={panelProject?.key ?? null}
          referenceTimeoutMs={referenceCommitTimeout(projects)}
          busy={mutationBusy}
          createDisabled={showCreate}
          query={query}
          searchActive={normalizedQuery !== ""}
          showHidden={showHidden}
          onQueryChange={setQuery}
          onShowHiddenChange={changeShowHidden}
          onCreate={() => setCreating(true)}
          onSelect={(key) => {
            setCreating(false);
            setSelectedKey(key);
          }}
          onToggleVisibility={(project) => void toggleVisibility(project)}
          onGroupColorChange={(group, color) => void updateGroupColor(group, color)}
          onGroupMove={(activeKey, overKey) => void persistOrder(moveGroup(allGroups, activeKey, overKey))}
          onProjectMove={(group, activeKey, overKey) =>
            void persistOrder(moveVisibleProject(projects, group, activeKey, overKey))
          }
        />

        <div className="min-w-0 flex-1">{renderPanel()}</div>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
