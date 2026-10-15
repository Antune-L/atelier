import { ArrowRight, ChevronDown, ChevronUp, ExternalLink, FileText } from "lucide-react";
import { useId, useState } from "react";
import type { ReactNode } from "react";

import { COLUMN_LABELS, ORCHESTRATOR_LABELS } from "@shared/constants";
import type { ErrorDetails, ProjectInfo, Ticket } from "@shared/schemas";

import { TicketConfigSummary } from "@/components/TicketConfigSummary";
import { TicketCost } from "@/components/TicketCost";
import { ImplementationRecovery } from "@/components/ticket-detail/ImplementationRecovery";
import { LaunchForm } from "@/components/ticket-detail/LaunchForm";
import { PreviewPanel } from "@/components/ticket-detail/PreviewPanel";
import { SectionHeader } from "@/components/ticket-detail/SectionHeader";
import type { TicketTab } from "@/components/ticket-detail/TicketTabs";
import { Button } from "@/components/ui/button";
import { Markdown } from "@/components/ui/markdown";
import { useCapabilities } from "@/hooks/useCapabilities";
import { formatDateTime, stageLabel } from "@/lib/display";
import { canRecoverImplementation } from "@/lib/implementationRecovery";

interface OverviewTabProps {
  ticket: Ticket;
  projects: ProjectInfo[];
  locked: boolean;
  onNavigate: (tab: TicketTab) => void;
  triage?: ReactNode;
}

const SUMMARY_COLUMNS: Ticket["column"][] = ["done", "merged"];
const MISSING_VALUE = "-";
const BRIEF_EXCERPT_LENGTH = 360;

interface TicketBriefProps {
  description: string;
  onEdit: () => void;
}

function TicketBrief({ description, onEdit }: TicketBriefProps) {
  const [expanded, setExpanded] = useState(false);
  const headingId = useId();
  const contentId = useId();
  const hasDescription = description.trim().length > 0;
  const canExpand = hasDescription && description.length > BRIEF_EXCERPT_LENGTH;

  return (
    <section aria-labelledby={headingId} className="ticket-brief min-w-0 space-y-4 rounded-lg border p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id={headingId} className="flex items-center gap-2 text-base font-semibold"><FileText className="size-4" aria-hidden />Brief</h2>
        <span className="ticket-brief-muted text-xs">Demande initiale</span>
      </div>
      {hasDescription ? (
        <div id={contentId} className={canExpand && !expanded ? "ticket-brief-preview" : undefined} onFocusCapture={() => setExpanded(true)}>
          <Markdown content={description} />
        </div>
      ) : <p className="ticket-brief-muted text-sm">Aucun brief renseigné.</p>}
      <div className="ticket-brief-footer flex flex-wrap items-center justify-between gap-2 border-t pt-3">
        {canExpand && <Button variant="outline" size="sm" className="ticket-brief-action" aria-expanded={expanded} aria-controls={contentId} onClick={() => setExpanded(!expanded)}>{expanded ? "Replier le brief" : "Lire le brief complet"}{expanded ? <ChevronUp className="size-3.5" aria-hidden /> : <ChevronDown className="size-3.5" aria-hidden />}</Button>}
        <Button variant="ghost" size="sm" className="ticket-brief-action ml-auto" onClick={onEdit}>Modifier le brief<ArrowRight className="size-3.5" aria-hidden /></Button>
      </div>
    </section>
  );
}

function formatErrorDetails(details: ErrorDetails): string {
  const lines = [
    `source: ${details.source}`,
    `stage: ${details.stage ?? MISSING_VALUE} · column: ${details.column ?? MISSING_VALUE} · slot: ${details.slotId ?? MISSING_VALUE}`,
    `session: ${details.sessionId ?? MISSING_VALUE}`,
    `generation: ${details.generationId ?? MISSING_VALUE}`,
    `date: ${formatDateTime(details.at)}`,
    "",
    details.stack ?? details.message,
  ];
  if (details.cause !== null) lines.push("", `cause: ${details.cause}`);
  return lines.join("\n");
}

function nextStep(ticket: Ticket): { title: string; description: string; tab: TicketTab; label: string } {
  if (canRecoverImplementation(ticket)) return { title: "Exécution interrompue", description: "Les lots et leurs changements conservés demandent une reprise explicite.", tab: "activity", label: "Voir la reprise" };
  if (ticket.pendingQuestions > 0) return { title: "Réponse attendue", description: "L’agent attend votre réponse avant de poursuivre.", tab: "activity", label: "Répondre dans la conversation" };
  if (ticket.column === "prd") return { title: "Plan à valider", description: "Consultez le document puis validez-le ou demandez des corrections.", tab: "prd", label: "Lire le PRD" };
  if (ticket.error !== null) return { title: "Une intervention est nécessaire", description: "Consultez le diagnostic et les actions disponibles pour poursuivre.", tab: "activity", label: "Voir la conversation" };
  if (ticket.column === "todo") return { title: "Prêt à préparer", description: "Vérifiez le brief et les réglages avant de lancer le ticket.", tab: "description", label: "Lire le brief" };
  if (ticket.kind === "feature" && ticket.column === "done") return { title: "Résultat à vérifier", description: "Consultez les preuves et les réserves avant de décider de la livraison.", tab: "validation", label: "Consulter les contrôles" };
  return { title: COLUMN_LABELS[ticket.column], description: ticket.stage === null ? "Les échanges et documents restent accessibles." : stageLabel(ticket.stage), tab: "activity", label: "Voir la conversation" };
}

export function OverviewTab({ ticket, projects, locked, onNavigate, triage }: OverviewTabProps) {
  const { prOnly } = useCapabilities();
  const isTodo = ticket.column === "todo";
  const showSummary = ticket.agentSummary !== null && SUMMARY_COLUMNS.includes(ticket.column);
  const expected = nextStep(ticket);
  const recordedModels = [...new Set(Object.values(ticket.sessionUsage).flatMap((usage) => Object.keys(usage)))];
  let requestedDelivery = "PR uniquement";
  if (ticket.autoMerge || (ticket.autonomous && ticket.autonomousDelivery === "merge")) requestedDelivery = "Fusion après contrôles";
  if (ticket.stealth) requestedDelivery = "Relecture locale avant création de PR";
  if (ticket.directPush) requestedDelivery = "Push direct sur la branche de base";
  const effectiveDelivery = prOnly ? "PR uniquement sur cet hôte" : requestedDelivery;

  return (
    <div className="space-y-5 pb-4">
      <TicketBrief key={ticket.id} description={ticket.description} onEdit={() => onNavigate("description")} />

      <section className="space-y-3 rounded-lg border border-primary/20 bg-primary/5 p-4">
        <p className="text-xs text-muted-foreground">Prochaine action</p>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1"><h2 className="text-lg font-semibold">{expected.title}</h2><p className="mt-1 text-sm text-muted-foreground">{expected.description}</p></div>
          <Button size="sm" variant="outline" onClick={() => onNavigate(expected.tab)}>{expected.label}<ArrowRight className="size-3.5" aria-hidden /></Button>
        </div>
      </section>

      {ticket.error && <p role="alert" className="rounded-md border border-danger/30 bg-danger/5 p-3 text-sm text-danger">{ticket.error}</p>}
      {ticket.implementationPlan && (ticket.implementationPlan.recovery || canRecoverImplementation(ticket)) && <ImplementationRecovery key={`${ticket.id}:${ticket.implementationPlan.id}:${ticket.implementationPlan.recovery?.generation ?? "delegated"}:${ticket.slotId}`} ticket={ticket} plan={ticket.implementationPlan} />}
      {ticket.errorDetails && <details className="rounded-md border border-border text-sm text-muted-foreground"><summary className="cursor-pointer px-3 py-2">Diagnostic de l’interruption</summary><pre className="max-h-64 overflow-auto whitespace-pre border-t border-border p-3 font-mono text-xs">{formatErrorDetails(ticket.errorDetails)}</pre></details>}

      <section className="space-y-3 rounded-lg border border-border p-4">
        <SectionHeader>Exécution et coût</SectionHeader>
        <div className="flex flex-wrap items-baseline justify-between gap-2 text-sm"><span>Fournisseur configuré</span><span className="font-medium">{ORCHESTRATOR_LABELS[ticket.orchestrator]}</span></div>
        <p className="text-xs text-muted-foreground">{recordedModels.length > 0 ? `Modèles avec usage enregistré : ${recordedModels.join(", ")}` : "Aucun usage de modèle enregistré. Le modèle réellement exécuté n’est pas confirmé ici."}</p>
        <TicketCost ticket={ticket} />
      </section>

      {ticket.kind === "feature" && <section className="space-y-3 rounded-lg border border-border p-4">
        <SectionHeader>Résultat et livraison</SectionHeader>
        <div className="flex flex-wrap items-center justify-between gap-2 text-sm"><span>Proposition de modification</span>{ticket.prUrl !== null ? <a href={ticket.prUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline">{ticket.prNumber === null ? "Ouvrir la PR" : `Ouvrir la PR #${ticket.prNumber}`}<ExternalLink className="size-3.5" aria-hidden /></a> : <span className="text-muted-foreground">Aucune PR associée</span>}</div>
        <div className="flex flex-wrap justify-between gap-2 text-sm"><span>Livraison demandée</span><span>{requestedDelivery}</span></div>
        <div className="flex flex-wrap justify-between gap-2 text-sm"><span>Mode effectif de cet hôte</span><span>{effectiveDelivery}</span></div>
        {ticket.column === "merged" ? <p className="text-xs text-muted-foreground">Le ticket est marqué comme fusionné. Ce statut reste distinct des preuves de validation.</p> : <p className="text-xs text-muted-foreground">La présence d’une PR ne confirme pas la validation ni la possibilité de fusion. Les réserves sont dans Contrôles.</p>}
        {ticket.column !== "todo" && <Button variant="outline" size="sm" onClick={() => onNavigate("validation")}>Voir les preuves et réserves</Button>}
      </section>}

      {ticket.kind === "feature" && ticket.prUrl !== null && <PreviewPanel key={ticket.id} ticket={ticket} />}
      {showSummary && ticket.agentSummary !== null && <details className="rounded-lg border border-border"><summary className="cursor-pointer px-4 py-3 text-sm font-medium">Résumé de l’agent</summary><div className="border-t border-border p-4"><Markdown content={ticket.agentSummary} /></div></details>}

      {isTodo ? <section className="space-y-4 rounded-lg border border-border p-4"><SectionHeader>Préparer le lancement</SectionHeader><LaunchForm ticket={ticket} projects={projects} canEditTarget={!locked} />{triage}</section> : <details className="rounded-lg border border-border"><summary className="cursor-pointer px-4 py-3 text-sm font-medium">Réglages utilisés</summary><div className="border-t border-border p-4"><TicketConfigSummary ticket={ticket} /></div></details>}
    </div>
  );
}
