import { useMemo, useState, type ReactNode } from "react";

import type { ProjectInfo, StatRecord } from "@shared/schemas";

import { Select } from "@/components/ui/select";

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
  const [project, setProject] = useState<string>(ALL_PROJECTS);
  const filtered = useMemo(
    () => (project === ALL_PROJECTS ? records : records.filter((r) => r.project === project)),
    [project, records],
  );
  return (
    <div className="flex flex-col gap-3 rounded-lg border bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold">{title}</h2>
          {description && <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>}
        </div>
        <Select
          value={project}
          onChange={(e) => setProject(e.target.value)}
          className="h-8 w-40 shrink-0 bg-background text-xs"
          aria-label={`Filtrer « ${title} » par projet`}
        >
          <option value={ALL_PROJECTS}>Tous les projets</option>
          {projects.map((p) => (
            <option key={p.key} value={p.key}>
              {p.label}
            </option>
          ))}
        </Select>
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
