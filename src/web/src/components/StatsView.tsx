import { RefreshCw } from "lucide-react";
import { useId, useMemo, useState, type ReactNode } from "react";

import type { ProjectInfo } from "@shared/schemas";

import { ProjectSelect } from "@/components/ProjectSelect";
import { StatCard } from "@/components/stats/StatCard";
import {
  DurationChart,
  CostSummary,
  CodexTierSummary,
  KindChart,
  OutcomeChart,
  ProjectChart,
  SuccessRateChart,
  ThroughputChart,
  TokensByProjectChart,
} from "@/components/stats/StatCharts";
import { Button } from "@/components/ui/button";
import { useStats } from "@/hooks/useStats";
import { cn } from "@/lib/utils";

const ALL_PROJECTS = "all";

interface StatsViewProps {
  projects: ProjectInfo[];
}

export function StatsView({ projects }: StatsViewProps): ReactNode {
  const { records, loading, error, reload } = useStats();
  const projectSelectId = useId();
  const [project, setProject] = useState(ALL_PROJECTS);
  const selectableProjects = projects.filter((item) => !item.hidden);
  const selectedProject = selectableProjects.some((item) => item.key === project) ? project : ALL_PROJECTS;
  const filtered = useMemo(
    () => selectedProject === ALL_PROJECTS ? records : records.filter((record) => record.project === selectedProject),
    [records, selectedProject],
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3 rounded-lg border bg-card p-4">
        <div className="space-y-2">
          <ProjectSelect
            id={projectSelectId}
            projects={selectableProjects}
            value={selectedProject}
            onChange={setProject}
            label="Projet"
            ariaLabel="Projet pour toutes les statistiques"
            options={[{ key: ALL_PROJECTS, label: "Tous les projets" }]}
            className="w-56 max-w-full"
          />
          <p className="text-xs text-muted-foreground" role="status">
            {loading ? "Chargement…" : `${filtered.length} tickets dans l'historique sélectionné`}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={reload} disabled={loading} aria-label="Recharger les stats">
          <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
          Recharger
        </Button>
      </div>

      {error && (
        <div role="alert" className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <section aria-label="Résultats" className="space-y-3">
        <h2 className="text-base font-semibold">Résultats</h2>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <StatCard title="Tickets traités" description="Répartition par issue">
            <OutcomeChart records={filtered} />
          </StatCard>
          <StatCard title="Taux de réussite" description="Sur les tickets terminés">
            <SuccessRateChart records={filtered} />
          </StatCard>
          <StatCard title="Répartition par type" description="Nombre de tickets par type">
            <KindChart records={filtered} />
          </StatCard>
          <StatCard title="Tickets traités par projet" description="Nombre de tickets par projet">
            <ProjectChart records={filtered} projects={projects} />
          </StatCard>
        </div>
      </section>
      <section aria-label="Temps" className="space-y-3">
        <h2 className="text-base font-semibold">Temps</h2>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <StatCard title="Temps moyen de finalisation" description="Durée de travail des tickets réussis">
            <DurationChart records={filtered} />
          </StatCard>
          <StatCard title="Débit dans le temps" description="Tickets réussis par semaine">
            <ThroughputChart records={filtered} />
          </StatCard>
        </div>
      </section>
      <section aria-label="Coûts" className="space-y-3">
        <h2 className="text-base font-semibold">Coûts</h2>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <StatCard title="Coût des exécutions" description="Total disponible ou sous-total explicitement partiel">
            <CostSummary records={filtered} />
          </StatCard>
          <StatCard title="Tokens par projet" description="Nombre de tokens par projet">
            <TokensByProjectChart records={filtered} projects={projects} />
          </StatCard>
          <StatCard title="Mode FAST Codex" description="Tier demandé et configuration confirmée">
            <CodexTierSummary records={filtered} />
          </StatCard>
        </div>
      </section>
    </div>
  );
}
