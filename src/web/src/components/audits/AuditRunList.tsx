import type { AuditRun } from "@shared/audit";
import type { ProjectInfo } from "@shared/schemas";

import { resolveProjectColor, resolveProjectLabel } from "@/components/TicketCard";
import { useTickTimer } from "@/hooks/useTickTimer";
import {
  AUDIT_PHASE_LABELS,
  AUDIT_RUN_STRIPES,
  auditRunAutoLabel,
  auditRunCountsLabel,
  auditRunDuration,
  auditRunEngine,
  auditRunRange,
  auditRunSessions,
  auditWaitingSummary,
  formatAuditDayTime,
  plural,
} from "@/lib/auditDisplay";
import { cn } from "@/lib/utils";

const META_CLASSES = "font-mono text-2xs text-muted-foreground";

interface RunTag {
  label: string;
  className: string;
}

function runTags(run: AuditRun): RunTag[] {
  const tags: RunTag[] = [];
  if (run.status === "partial") tags.push({ label: "Partiel", className: "border-warning/40 text-warning" });
  if (run.status === "failed" || run.status === "rewritten") tags.push({ label: "Échec", className: "border-danger/40 text-danger" });
  if (run.observation) tags.push({ label: "Observation", className: "border-border text-muted-foreground" });
  if (run.simulated) tags.push({ label: "Simulation", className: "border-border text-muted-foreground" });
  return tags;
}

function runSummaryLines(run: AuditRun, now: number): string[] {
  if (run.status === "no_changes") return ["Rien à auditer · aucun nouveau commit"];
  if (run.status === "waiting") return [auditWaitingSummary(run)];
  if (run.status === "rewritten") return [`Historique réécrit sur ${run.branch} (force-push)`];
  if (run.status === "running") {
    const phase = run.progress === null ? "Démarrage" : AUDIT_PHASE_LABELS[run.progress.phase];
    return [`En cours · ${phase} · ${auditRunDuration(run, now)}`, auditRunEngine(run)];
  }
  const lines: string[] = [];
  const range = auditRunRange(run);
  lines.push([range, plural(run.commitCount, "commit"), auditRunEngine(run)].filter((part) => part !== null).join(" · "));
  if (run.status === "failed" || run.status === "interrupted") {
    lines.push(run.error ?? (run.status === "failed" ? "Échec de l'audit" : "Audit interrompu"));
    return lines;
  }
  lines.push(auditRunCountsLabel(run));
  const autoLabel = auditRunAutoLabel(run);
  lines.push([auditRunDuration(run, now), plural(auditRunSessions(run), "session"), autoLabel].filter((part) => part !== null).join(" · "));
  return lines;
}

interface AuditRunListProps {
  runs: AuditRun[];
  projects: ProjectInfo[];
  selectedId: string | null;
  /** Findings waiting for a decision, shown on the latest run of each project. */
  pendingByLatestRun: Map<string, number>;
  onSelect: (runId: string) => void;
}

/** History: one flat row per run, its state as the 2px left stripe. */
export function AuditRunList({ runs, projects, selectedId, pendingByLatestRun, onSelect }: AuditRunListProps) {
  const now = useTickTimer();
  if (runs.length === 0) return <p className="px-2 py-3 text-xs text-muted-foreground">Aucun audit pour ce filtre.</p>;
  return (
    <ul className="divide-y divide-border">
      {runs.map((run) => {
        const color = resolveProjectColor(projects, run.project);
        const pending = pendingByLatestRun.get(run.id) ?? 0;
        return (
          <li key={run.id}>
            <button
              type="button"
              aria-current={run.id === selectedId ? "true" : undefined}
              onClick={() => onSelect(run.id)}
              className={cn("relative w-full py-2.5 pl-3.5 pr-2 text-left transition-colors hover:bg-accent/50", run.id === selectedId && "bg-accent")}
            >
              <span aria-hidden className={cn("absolute inset-y-1.5 left-0 w-0.5 rounded", AUDIT_RUN_STRIPES[run.status])} />
              <span className="flex flex-wrap items-center gap-1.5 text-xs">
                <span className="font-mono">{formatAuditDayTime(run.startedAt)}</span>
                <span className="truncate font-medium" style={color ? { color } : undefined}>{resolveProjectLabel(projects, run.project)}</span>
                {pending > 0 && <span className="text-warning">{pending} à trier</span>}
                <span className="ml-auto flex gap-1">
                  {runTags(run).map((tag) => <span key={tag.label} className={cn("rounded border px-1 font-mono text-2xs", tag.className)}>{tag.label}</span>)}
                </span>
              </span>
              {runSummaryLines(run, now).map((line, index) => <span key={index} className={cn("mt-0.5 block", META_CLASSES)}>{line}</span>)}
            </button>
          </li>
        );
      })}
    </ul>
  );
}
