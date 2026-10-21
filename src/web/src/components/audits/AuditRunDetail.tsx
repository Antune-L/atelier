import { ChevronRight, Loader2 } from "lucide-react";
import { useState, type ReactNode } from "react";

import { AUDIT_ACTIVE_RUN_STATUSES } from "@shared/audit";
import type { AuditFinding, AuditRun } from "@shared/audit";
import type { ProjectInfo } from "@shared/schemas";

import { AuditFindingRow } from "@/components/audits/AuditFindingRow";
import { resolveProjectLabel } from "@/components/TicketCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmPopover } from "@/components/ui/confirm";
import { useAuditRunDetail } from "@/hooks/useAuditRunDetail";
import { useBoard } from "@/hooks/useBoard";
import { useBusyAction } from "@/hooks/useBusyAction";
import { useTickTimer } from "@/hooks/useTickTimer";
import { api } from "@/lib/api";
import {
  AUDIT_COLLAPSED_SECTIONS,
  AUDIT_RUN_STATUS_LABELS,
  AUDIT_RUN_STATUS_VARIANTS,
  AUDIT_SECTIONS,
  AUDIT_SECTION_TITLES,
  auditFindingSection,
  auditPhaseSteps,
  auditRunAutoLabel,
  auditRunCostLabel,
  auditRunCoverageComplete,
  auditRunDuration,
  auditRunEngine,
  auditRunRange,
  auditRunSessions,
  auditWaitingBanner,
  decisionBreakdown,
  formatAuditDateTime,
  formatAuditTime,
  plural,
  type AuditFindingSection,
} from "@/lib/auditDisplay";
import { cn } from "@/lib/utils";

const BANNER_BASE = "border-l-2 px-3 py-2 text-xs";
const BANNER_TONES = {
  info: "border-info bg-info/5",
  warning: "border-warning bg-warning/5",
  danger: "border-danger bg-danger/5",
  neutral: "border-border bg-muted/30",
} as const;
type BannerTone = keyof typeof BANNER_TONES;

const SECTION_NOTES: Partial<Record<AuditFindingSection, string>> = {
  arbitrate: "les vérificateurs ne sont pas d'accord",
};

function Banner({ tone, children }: { tone: BannerTone; children: ReactNode }) {
  return <div className={cn(BANNER_BASE, BANNER_TONES[tone], "flex flex-wrap items-center gap-2")}>{children}</div>;
}

interface AuditRunDetailProps {
  run: AuditRun;
  projects: ProjectInfo[];
  highlightedFindingId: string | null;
  onAsk: (finding: AuditFinding) => void;
  onChooseStart: (project: string) => void;
}

function runMetaParts(run: AuditRun, now: number): string[] {
  const parts: string[] = [];
  const range = auditRunRange(run);
  if (range !== null) parts.push(range);
  parts.push(`${plural(run.commitCount, "commit")} (${run.branch})`);
  if (run.coverage.length > 0) parts.push(plural(run.coverage.length, "lot"));
  parts.push(plural(run.analystSessions, "analyste"), plural(run.verifierSessions, "vérificateur"));
  parts.push(auditRunEngine(run), auditRunDuration(run, now), plural(auditRunSessions(run), "session"), auditRunCostLabel(run));
  parts.push(auditRunCoverageComplete(run) ? "couverture complète" : "couverture partielle");
  return parts;
}

function PartialCoverage({ run }: { run: AuditRun }) {
  const [open, setOpen] = useState(false);
  const skipped = run.coverage.flatMap((chunk) => chunk.skipped);
  const failedChunks = run.coverage.filter((chunk) => chunk.status === "failed").length;
  const parts: string[] = [];
  if (skipped.length > 0) parts.push(`${plural(skipped.length, "fichier non lu", "fichiers non lus")}`);
  if (failedChunks > 0) parts.push(`${plural(failedChunks, "lot en échec", "lots en échec")}`);
  if (run.deferredCommitCount > 0) parts.push(`${plural(run.deferredCommitCount, "commit reporté", "commits reportés")} au prochain audit`);
  return (
    <div className="space-y-1">
      <Banner tone="warning">Couverture partielle{parts.length > 0 ? ` : ${parts.join(", ")}` : ""}. Les constats déjà trouvés restent affichés et actionnables.</Banner>
      {skipped.length > 0 && (
        <button type="button" aria-expanded={open} onClick={() => setOpen(!open)} className="inline-flex items-center gap-1 font-mono text-2xs text-muted-foreground hover:text-foreground">
          <ChevronRight className={cn("h-3 w-3 transition-transform", open && "rotate-90")} />
          Fichiers non lus ({skipped.length})
        </button>
      )}
      {open && (
        <ul className="space-y-0.5 pl-4 font-mono text-2xs text-muted-foreground">
          {skipped.map((file) => <li key={file.path}>{file.path} — {file.reason}</li>)}
        </ul>
      )}
    </div>
  );
}

/** Selected run: header meta, state banners, then the findings grouped by what the user must do. */
export function AuditRunDetail({ run, projects, highlightedFindingId, onAsk, onChooseStart }: AuditRunDetailProps) {
  const { audits, tickets } = useBoard();
  const now = useTickTimer();
  const { detail, loading, error, replaceFinding } = useAuditRunDetail(run, audits);
  const [toggled, setToggled] = useState<Partial<Record<AuditFindingSection, boolean>>>({});
  const action = useBusyAction();
  const active = AUDIT_ACTIVE_RUN_STATUSES.includes(run.status);
  const projectLabel = resolveProjectLabel(projects, run.project);
  const findings = detail?.findings ?? [];
  const autoLabel = auditRunAutoLabel(run);
  const showPartial = run.status === "partial" || (run.status === "completed" && !auditRunCoverageComplete(run));

  const relaunch = (): Promise<void> => action.run(() => api.runProjectAudit(run.project), "Impossible de relancer l'audit.").then(() => undefined);
  const stop = (): Promise<void> => action.run(() => api.stopAuditRun(run.id), "Impossible d'arrêter l'audit.").then(() => undefined);

  const relaunchButton = (
    <ConfirmPopover title="Relancer l'audit" description="L'audit reprend au dernier commit audité." confirmLabel="Relancer" onConfirm={relaunch}>
      <Button size="sm" variant="outline" className="h-7 px-2 text-xs" disabled={action.busy}>Relancer</Button>
    </ConfirmPopover>
  );

  const renderStateBanner = (): ReactNode => {
    if (run.status === "waiting") return <Banner tone="neutral">{auditWaitingBanner(run)}</Banner>;
    if (run.status === "no_changes") return <Banner tone="neutral">Rien à auditer : aucun nouveau commit sur {run.branch} depuis le dernier audit. Aucun appel au moteur.</Banner>;
    if (run.status === "interrupted") return <Banner tone="neutral">Audit interrompu. Il reprendra au même commit. {relaunchButton}</Banner>;
    if (run.status === "failed") return <Banner tone="danger">L'audit a échoué{run.error ? ` : ${run.error}` : ""}. Il reprendra au même commit au prochain créneau. {relaunchButton}</Banner>;
    if (run.status === "rewritten") {
      return (
        <Banner tone="danger">
          L'historique de {run.branch} a été réécrit (force-push) depuis le dernier audit. Choisissez le commit à partir duquel reprendre.
          <Button size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={() => onChooseStart(run.project)}>Choisir le point de départ</Button>
        </Banner>
      );
    }
    if (showPartial) return <PartialCoverage run={run} />;
    return null;
  };

  const renderSection = (section: AuditFindingSection): ReactNode => {
    const items = findings.filter((finding) => auditFindingSection(finding) === section);
    const collapsible = AUDIT_COLLAPSED_SECTIONS.includes(section);
    if (collapsible && items.length === 0) return null;
    if (section === "arbitrate" && items.length === 0) return null;
    const containsHighlight = items.some((finding) => finding.id === highlightedFindingId);
    const open = toggled[section] ?? (!collapsible || containsHighlight);
    const note = collapsible ? decisionBreakdown(items) : SECTION_NOTES[section];
    const heading = (
      <>
        {collapsible && <ChevronRight className={cn("h-3 w-3 transition-transform", open && "rotate-90")} />}
        <span>{AUDIT_SECTION_TITLES[section]} · {items.length}</span>
        {note && <span className="font-normal normal-case tracking-normal">({note})</span>}
      </>
    );
    const headingClasses = "flex items-center gap-1.5 font-mono text-2xs font-medium uppercase tracking-wider text-muted-foreground";
    return (
      <section key={section} aria-label={AUDIT_SECTION_TITLES[section]} className="space-y-1">
        {collapsible ? (
          <button type="button" aria-expanded={open} onClick={() => setToggled({ ...toggled, [section]: !open })} className={cn(headingClasses, "hover:text-foreground")}>{heading}</button>
        ) : (
          <h4 className={headingClasses}>{heading}</h4>
        )}
        {open && items.length === 0 && <p className="py-2 text-xs text-muted-foreground">Aucun constat à corriger dans cet audit.</p>}
        {open && items.map((finding) => (
          <AuditFindingRow
            key={finding.id}
            finding={finding}
            ticket={finding.ticketId === null ? undefined : tickets.find((ticket) => ticket.id === finding.ticketId)}
            highlighted={finding.id === highlightedFindingId}
            onChange={replaceFinding}
            onAsk={onAsk}
          />
        ))}
      </section>
    );
  };

  const findingsExpected = run.status === "completed" || run.status === "partial";
  const showFindings = !active && run.status !== "no_changes" && run.status !== "rewritten" && (findingsExpected || findings.length > 0);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="text-sm font-semibold">Audit du {formatAuditDateTime(run.startedAt)} · {projectLabel}</h3>
        <Badge variant={AUDIT_RUN_STATUS_VARIANTS[run.status]}>{AUDIT_RUN_STATUS_LABELS[run.status]}</Badge>
        {run.simulated && <span className="rounded border border-border px-1.5 font-mono text-2xs text-muted-foreground">Simulation</span>}
        {run.observation && <span className="rounded border border-border px-1.5 font-mono text-2xs text-muted-foreground">Observation</span>}
        {active && (
          <ConfirmPopover title="Arrêter l'audit" description="Les agents en cours sont arrêtés. L'audit reprendra au même commit." confirmLabel="Arrêter" destructive onConfirm={stop}>
            <Button size="sm" variant="outline" className="ml-auto h-7 px-2 text-xs" disabled={action.busy}>Arrêter l'audit</Button>
          </ConfirmPopover>
        )}
      </div>
      <p className="font-mono text-2xs text-muted-foreground">{runMetaParts(run, now).join(" · ")}</p>
      {action.error && <p role="alert" className="text-xs text-danger">{action.error}</p>}
      {run.simulated && <Banner tone="info">Mode simulation : constats d'exemple, aucun moteur ni dépôt réel n'est appelé.</Banner>}
      {run.observation && <p className="text-xs text-muted-foreground">Semaine d'observation : aucune carte n'est créée automatiquement.</p>}
      {autoLabel !== null && <Banner tone="info">Mode automatique · {autoLabel}.</Banner>}
      {run.status === "running" && (
        <div className="space-y-1">
          <p className="flex flex-wrap items-center gap-x-1.5 font-mono text-2xs">
            <Loader2 className="h-3 w-3 animate-spin text-info" />
            {auditPhaseSteps(run.progress).map((step, index) => (
              <span key={step.phase} className={step.state === "current" ? "text-info" : "text-muted-foreground"}>
                {index > 0 && "· "}
                {step.label}
              </span>
            ))}
          </p>
          <p className="font-mono text-2xs text-muted-foreground">Démarré à {formatAuditTime(run.startedAt)} · {auditRunDuration(run, now)} · {auditRunEngine(run)}</p>
        </div>
      )}
      {renderStateBanner()}
      {showFindings && loading && <p className="flex items-center gap-2 text-xs text-muted-foreground"><Loader2 className="h-3.5 w-3.5 animate-spin" />Chargement des constats…</p>}
      {showFindings && error && <p role="alert" className="text-xs text-danger">{error}</p>}
      {showFindings && detail !== null && AUDIT_SECTIONS.map(renderSection)}
    </div>
  );
}
