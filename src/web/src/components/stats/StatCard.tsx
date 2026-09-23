import { useId, useMemo, useState, type ReactNode } from "react";

import type { ProjectInfo, StatRecord } from "@shared/schemas";

import { ProjectSelect } from "@/components/ProjectSelect";

const ALL_PROJECTS = "all";

interface StatCardProps {
  title: string;
  description?: string;
  projects: ProjectInfo[];
  records: StatRecord[];
  /** Renders the chart from the project-filtered subset. */
  children: (filtered: StatRecord[]) => ReactNode;
}

/** A dashboard card with its own independent project filter over the shared record set. */
export function StatCard({ title, description, projects, records, children }: StatCardProps): ReactNode {
  const projectSelectId = useId();
  const [project, setProject] = useState<string>(ALL_PROJECTS);
  const selectableProjects = projects.filter((item) => !item.hidden);
  const selectedProject = selectableProjects.some((item) => item.key === project) ? project : ALL_PROJECTS;
  const filtered = useMemo(
    () => (selectedProject === ALL_PROJECTS ? records : records.filter((r) => r.project === selectedProject)),
    [selectedProject, records],
  );
  return (
    <div className="flex flex-col gap-3 rounded-lg border bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold">{title}</h2>
          {description && <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>}
        </div>
        <ProjectSelect
          id={projectSelectId}
          projects={selectableProjects}
          value={selectedProject}
          onChange={setProject}
          label={null}
          ariaLabel={`Filtrer « ${title} » par projet`}
          options={[{ key: ALL_PROJECTS, label: "Tous les projets" }]}
          className="w-40 shrink-0"
          triggerClassName="h-8 bg-background text-xs"
        />
      </div>
      {children(filtered)}
    </div>
  );
}

export function StatEmpty(): ReactNode {
  return (
    <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
      Pas encore de données
    </div>
  );
}
