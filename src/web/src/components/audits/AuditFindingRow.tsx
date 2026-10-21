import { ChevronRight, Loader2 } from "lucide-react";
import { useRef, useState, type ReactNode } from "react";

import { AUDIT_VERDICT_LABELS } from "@shared/audit";
import type { AuditDecisionInput, AuditFinding, AuditVerdictRecord } from "@shared/audit";
import type { Ticket } from "@shared/schemas";

import { AuditIgnorePopover } from "@/components/audits/AuditIgnorePopover";
import { Button } from "@/components/ui/button";
import { ConfirmPopover } from "@/components/ui/confirm";
import { useBusyAction } from "@/hooks/useBusyAction";
import { api } from "@/lib/api";
import {
  AUDIT_TONE_STRIPES,
  AUDIT_TONE_TEXT,
  LAUNCH_CARD_CONFIRM_DESCRIPTION,
  LAUNCH_CARD_CONFIRM_TITLE,
  auditFindingSection,
  auditFindingStatus,
  contradictingVerdict,
  findingKeyParts,
  findingLocation,
  formatAuditDate,
  formatAuditDayTime,
  lensLabel,
  severityLabel,
  shortSha,
  verdictSource,
} from "@/lib/auditDisplay";
import { boardStore } from "@/lib/store";
import { cn } from "@/lib/utils";

const ACTION_CLASSES = "h-7 px-2 text-xs";
const CHECK_MARK = "✓";
const CROSS_MARK = "✗";

interface AuditFindingRowProps {
  finding: AuditFinding;
  ticket: Ticket | undefined;
  highlighted: boolean;
  onChange: (finding: AuditFinding) => void;
  onAsk: (finding: AuditFinding) => void;
}

function checkMark(ok: boolean): string {
  return ok ? CHECK_MARK : CROSS_MARK;
}

function VerdictLine({ verdict }: { verdict: AuditVerdictRecord }) {
  const confirmed = verdict.verdict === "confirmed";
  return (
    <p className="text-xs text-muted-foreground">
      <span className="font-mono text-2xs">{verdictSource(verdict)}</span>
      {" : "}
      <span className={confirmed ? "text-success" : "text-danger"}>{AUDIT_VERDICT_LABELS[verdict.verdict].toLocaleLowerCase("fr-FR")}</span>
      {" — « "}
      {verdict.reason}
      {" »"}
    </p>
  );
}

function DetailItem({ label, children }: { label: string; children: ReactNode }) {
  return (
    <>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="min-w-0 break-words">{children}</dd>
    </>
  );
}

function FindingDetails({ finding }: { finding: AuditFinding }) {
  const { citation } = finding;
  return (
    <dl className="mt-2 grid grid-cols-[7.5rem_1fr] gap-x-3 gap-y-1.5 text-xs">
      <DetailItem label="Scénario">{finding.scenario}</DetailItem>
      <DetailItem label="Attendu">{finding.expected}</DetailItem>
      <DetailItem label="Source"><span className="font-mono text-2xs text-muted-foreground">{finding.expectedSource}</span></DetailItem>
      <DetailItem label="Preuve">
        <span className="font-mono text-2xs text-muted-foreground">{findingLocation(finding)}</span>
        <pre className="mt-1 max-h-48 overflow-auto whitespace-pre-wrap rounded border border-border bg-background p-2 font-mono text-2xs">{finding.evidence}</pre>
      </DetailItem>
      <DetailItem label="Introduit par"><span className="font-mono text-2xs text-muted-foreground">{finding.introducedBy}</span></DetailItem>
      <DetailItem label="Correctif">
        {finding.suggestedFix ?? null}
        <span className="block text-muted-foreground">Correctif non vérifié</span>
      </DetailItem>
      <DetailItem label="Revue adversariale">
        <span className="block">Analyste « {lensLabel(finding)} »</span>
        {finding.verdicts.map((verdict, index) => (
          <span key={`${verdict.role}-${verdict.at}-${index}`} className="block text-muted-foreground">
            {verdictSource(verdict)} · {formatAuditDayTime(verdict.at)} · à {shortSha(verdict.revision)}
          </span>
        ))}
        <span className="block font-mono text-2xs text-muted-foreground">
          Contrôle automatique des citations : fichier {checkMark(citation.fileExists)} · ligne {checkMark(citation.lineInRange)} · extrait présent {checkMark(citation.excerptFound)}
        </span>
      </DetailItem>
      <DetailItem label="Historique">
        <span className="text-muted-foreground">
          Signalé pour la première fois le {formatAuditDate(finding.createdAt)}
          {finding.seenCount > 1 ? ` · vu dans ${finding.seenCount} audits (toujours présent)` : ""}
        </span>
      </DetailItem>
    </dl>
  );
}

/** One finding: severity · class · location, status on the right, review verdicts and actions. */
export function AuditFindingRow({ finding, ticket, highlighted, onChange, onAsk }: AuditFindingRowProps) {
  const [expanded, setExpanded] = useState(highlighted);
  const [keepDismissed, setKeepDismissed] = useState(false);
  const scrolled = useRef(false);
  const { busy, error, run } = useBusyAction();
  const section = auditFindingSection(finding);
  const status = auditFindingStatus(finding, ticket);
  const contradiction = keepDismissed ? null : contradictingVerdict(finding);
  const hasTicket = finding.ticketId !== null;
  const todoCard = ticket?.column === "todo";
  const locked = busy || finding.recheckRunning;

  const scrollIntoView = (node: HTMLElement | null): void => {
    if (node === null || !highlighted || scrolled.current) return;
    scrolled.current = true;
    node.scrollIntoView({ block: "center" });
  };

  const act = (action: () => Promise<AuditFinding>, fallback: string): Promise<boolean> =>
    run(async () => onChange(await action()), fallback);

  const createCard = async (start: boolean): Promise<void> => {
    await run(async () => {
      const result = await api.createAuditCard(finding.id, { start });
      onChange(result.finding);
    }, "Impossible de créer la carte.");
  };

  const ignore = (input: AuditDecisionInput): Promise<boolean> =>
    act(() => api.decideAuditFinding(finding.id, input), "Impossible d'ignorer ce constat.");

  const recheckButton = (
    <Button variant="ghost" size="sm" className={ACTION_CLASSES} disabled={locked} onClick={() => void act(() => api.recheckAuditFinding(finding.id), "Impossible de relancer la vérification.")}>
      {finding.recheckRunning && <Loader2 className="h-3 w-3 animate-spin" />}
      {finding.recheckRunning ? "Re-vérification en cours…" : "Re-vérifier (vraie issue ?)"}
    </Button>
  );
  const askButton = (
    <Button variant="ghost" size="sm" className={ACTION_CLASSES} disabled={busy} onClick={() => onAsk(finding)}>Demander à un agent</Button>
  );
  const ignoreButton = <AuditIgnorePopover todoCard={todoCard} disabled={locked} onIgnore={ignore} />;
  const openCardButton = finding.ticketId !== null && (
    <Button variant="outline" size="sm" className={ACTION_CLASSES} onClick={() => { if (finding.ticketId !== null) boardStore.openTicket(finding.ticketId); }}>Voir la carte</Button>
  );
  const createAnywayButton = !hasTicket && (
    <Button variant="outline" size="sm" className={ACTION_CLASSES} disabled={locked} onClick={() => void createCard(false)}>Créer une carte quand même</Button>
  );

  const renderActions = (): ReactNode => {
    if (section === "masked") {
      return (
        <>
          {openCardButton}
          <Button variant="outline" size="sm" className={ACTION_CLASSES} disabled={busy} onClick={() => void act(() => api.clearAuditDecision(finding.id), "Impossible de rétablir ce constat.")}>Rétablir</Button>
        </>
      );
    }
    if (section === "arbitrate") {
      return (
        <>
          {openCardButton}
          <Button size="sm" className={ACTION_CLASSES} disabled={locked} onClick={() => void act(() => api.arbitrateAuditFinding(finding.id), "Impossible de lancer l'arbitrage.")}>
            {finding.recheckRunning && <Loader2 className="h-3 w-3 animate-spin" />}
            {finding.recheckRunning ? "Arbitrage en cours…" : "Arbitrer (agent)"}
          </Button>
          {createAnywayButton}
          {askButton}
          {ignoreButton}
        </>
      );
    }
    if (section !== "fix") {
      return (
        <>
          {openCardButton}
          {createAnywayButton}
          {section === "unverified" && recheckButton}
          {askButton}
          {section === "unverified" && ignoreButton}
        </>
      );
    }
    if (hasTicket) {
      return (
        <>
          {openCardButton}
          {recheckButton}
          {askButton}
          {ignoreButton}
        </>
      );
    }
    return (
      <>
        <Button size="sm" className={ACTION_CLASSES} disabled={locked} onClick={() => void createCard(false)}>Créer une carte</Button>
        <ConfirmPopover title={LAUNCH_CARD_CONFIRM_TITLE} description={LAUNCH_CARD_CONFIRM_DESCRIPTION} confirmLabel="Créer et lancer" onConfirm={() => createCard(true)}>
          <Button variant="outline" size="sm" className={ACTION_CLASSES} disabled={locked}>Créer et lancer</Button>
        </ConfirmPopover>
        {recheckButton}
        {askButton}
        {ignoreButton}
      </>
    );
  };

  return (
    <article
      ref={scrollIntoView}
      className={cn("relative border-b border-border py-3 pl-4 pr-1 last:border-b-0", highlighted && "bg-accent/40", section === "rejected" && "opacity-80")}
    >
      <span aria-hidden className={cn("absolute inset-y-2 left-0 w-0.5 rounded", AUDIT_TONE_STRIPES[status.tone])} />
      <div className="flex flex-wrap items-baseline gap-x-1.5 font-mono text-2xs text-muted-foreground">
        <span className={finding.severity === "critical" ? "font-bold text-foreground" : undefined}>{severityLabel(finding)}</span>
        {findingKeyParts(finding).map((part) => <span key={part}>· {part}</span>)}
        {finding.autoCreated && <span className="rounded border border-border px-1">auto</span>}
        <span className={cn("ml-auto", AUDIT_TONE_TEXT[status.tone])}>{status.label}</span>
      </div>
      <h4 className="mt-1 text-sm font-medium leading-snug">{finding.title}</h4>
      <p className="mt-0.5 text-xs text-muted-foreground">Impact : {finding.impact}</p>
      <div className="mt-1 space-y-0.5">
        {finding.verdicts.length === 0 && <p className="text-xs text-muted-foreground">Aucun verdict de la revue adversariale.</p>}
        {finding.verdicts.map((verdict, index) => <VerdictLine key={`${verdict.role}-${verdict.at}-${index}`} verdict={verdict} />)}
      </div>
      {contradiction !== null && (
        <div className="mt-2 flex flex-wrap items-center gap-2 border-l-2 border-info bg-info/5 px-3 py-2 text-xs">
          <span>Le vérificateur pense maintenant que ce n'est pas un vrai problème.</span>
          <Button size="sm" variant="outline" className={ACTION_CLASSES} disabled={busy} onClick={() => void ignore({ kind: "false_positive", note: null, abandonTodoCard: false })}>Ignorer (faux positif)</Button>
          <Button size="sm" variant="ghost" className={ACTION_CLASSES} onClick={() => setKeepDismissed(true)}>Garder</Button>
        </div>
      )}
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        {renderActions()}
        <button type="button" aria-expanded={expanded} onClick={() => setExpanded(!expanded)} className="ml-auto inline-flex items-center gap-1 font-mono text-2xs text-muted-foreground hover:text-foreground">
          <ChevronRight className={cn("h-3 w-3 transition-transform", expanded && "rotate-90")} />
          Détails
        </button>
      </div>
      {error && <p role="alert" className="mt-1 text-xs text-danger">{error}</p>}
      {expanded && <FindingDetails finding={finding} />}
    </article>
  );
}
