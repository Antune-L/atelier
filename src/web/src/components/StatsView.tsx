import { RefreshCw } from "lucide-react";
import type { ReactNode } from "react";

import type { ProjectInfo } from "@shared/schemas";

import { StatCard } from "@/components/stats/StatCard";
import {
  CostChart,
  DurationChart,
  KindChart,
  OutcomeChart,
  ProjectChart,
  SuccessRateChart,
  ThroughputChart,
} from "@/components/stats/StatCharts";
import { Button } from "@/components/ui/button";
import { useStats } from "@/hooks/useStats";
import { cn } from "@/lib/utils";

interface StatsViewProps {
  projects: ProjectInfo[];
}

export function StatsView({ projects }: StatsViewProps): ReactNode {
  const { records, loading, error, reload } = useStats();

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          {loading ? "Chargement…" : `${records.length} tickets dans l'historique`}
        </p>
        <Button variant="outline" size="sm" onClick={reload} disabled={loading} aria-label="Recharger les stats">
          <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
          Recharger
        </Button>
      </div>

      {error && (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <StatCard
          title="Tickets traités"
          description="Répartition par issue"
          projects={projects}
          records={records}
        >
          {(filtered) => <OutcomeChart records={filtered} />}
        </StatCard>

        <StatCard
          title="Taux de réussite"
          description="Sur les tickets terminés"
          projects={projects}
          records={records}
        >
          {(filtered) => <SuccessRateChart records={filtered} />}
        </StatCard>

        <StatCard
          title="Temps moyen de finalisation"
          description="Durée de travail des tickets réussis"
          projects={projects}
          records={records}
        >
          {(filtered) => <DurationChart records={filtered} />}
        </StatCard>

        <StatCard
          title="Débit dans le temps"
          description="Tickets réussis par semaine"
          projects={projects}
          records={records}
        >
          {(filtered) => <ThroughputChart records={filtered} />}
        </StatCard>

        <StatCard
          title="Répartition par type"
          description="Nombre de tickets par type"
          projects={projects}
          records={records}
        >
          {(filtered) => <KindChart records={filtered} />}
        </StatCard>

        <StatCard
          title="Tickets traités par projet"
          description="Nombre de tickets par projet"
          projects={projects}
          records={records}
        >
          {(filtered) => <ProjectChart records={filtered} projects={projects} />}
        </StatCard>

        <StatCard
          title="Coût"
          description="Dépense des sessions Claude (Cursor non inclus)"
          projects={projects}
          records={records}
        >
          {(filtered) => <CostChart records={filtered} projects={projects} />}
        </StatCard>
      </div>
    </div>
  );
}
