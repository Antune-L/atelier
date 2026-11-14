import { AUTONOMOUS_DEFAULT_FINALIZATION_MINUTES, AUTONOMOUS_DEFAULT_MAX_PUBLICATION_ATTEMPTS } from "@shared/autonomous";
import type { AutonomousState } from "@shared/autonomous";
import type { QualityGate, TicketQuality } from "@shared/quality";
import type { Ticket } from "@shared/schemas";

import { AutonomousResumeSection, RecoveryLink } from "@/components/ticket-detail/AutonomousResumeSection";
import { AutonomousWorkspacesLink } from "@/components/ticket-detail/AutonomousWorkspacesLink";
import { Button } from "@/components/ui/button";
import { ConfirmPopover } from "@/components/ui/confirm";
import { api } from "@/lib/api";
import { formatDateTime } from "@/lib/display";
import { formatQualityMessage } from "@/lib/qualityMessages";

const PHASE_LABELS: Record<AutonomousState["phase"], string> = {
  planning: "Planification", checks: "Contrôles locaux", preview: "Déploiement Coolify", validating: "Vérification navigateur", correcting: "Correction", ready: "Prêt à livrer", delivering: "Livraison", completed: "Terminé", paused: "Parcours suspendu", closing: "Arrêt et conservation du travail", publishing_partial: "Publication partielle en cours", published_partial: "PR partielle publiée avec réserves", publication_failed: "Publication partielle non confirmée",
};
const RECOVERABLE_PHASES: AutonomousState["phase"][] = ["paused", "published_partial", "publication_failed"];
const PUBLICATION_RETRY_PHASES: AutonomousState["phase"][] = ["publication_failed", "paused"];
const RETAINED_DELIVERY_PHASES: AutonomousState["phase"][] = ["published_partial", "publication_failed", "publishing_partial", "closing"];
const CLOSURE_LABELS = { not_requested: "non demandé", requested: "demandé", confirmed: "confirmé", unknown: "inconnu : conservation requise" };
const REASON_LABELS: Record<string, string> = { explicit_publication: "Publication partielle demandée explicitement", deadline: "Durée d’exécution atteinte", starts_exhausted: "Garde-fou des démarrages atteint", corrections_exhausted: "Corrections épuisées", finalization_expired: "Réserve de finalisation expirée", publication_exhausted: "Tentatives de publication épuisées" };

function ExecutionDetails({ ticket, state }: { ticket: Ticket; state: AutonomousState }) {
  const execution = state.execution;
  const retainedDelivery = RETAINED_DELIVERY_PHASES.includes(state.phase);
  if (!execution && !retainedDelivery) return null;
  return (
    <details className="text-muted-foreground">
      <summary className="cursor-pointer">Détails de l’exécution</summary>
      <div className="mt-2 space-y-1">
        {execution && <>
          <p>Garde-fou expérimental : {execution.starts.length} démarrage(s) utilisé(s), {Math.max(0, execution.maxStarts - execution.starts.length)} restant(s). Ce compteur ne mesure pas l’avancement.</p>
          <p>Corrections : {state.corrections} utilisée(s), {Math.max(0, execution.maxCorrections - state.corrections)} restante(s). Échéance : {formatDateTime(execution.deadlineAt)}.</p>
          <p>Publication : {execution.publicationAttempts} tentative(s) utilisée(s), {Math.max(0, execution.maxPublicationAttempts - execution.publicationAttempts)} restante(s).</p>
          {execution.finalizationDeadlineAt !== null && <p>Réserve de finalisation jusqu’au {formatDateTime(execution.finalizationDeadlineAt)} ({execution.finalizationMinutes} minutes).</p>}
          <p>Arrêt des agents : {CLOSURE_LABELS[execution.closure.status]}. Travail {execution.closure.retention === "retained" ? "conservé" : "libéré"}.</p>
        </>}
        {retainedDelivery && <p>La livraison garde ses réserves : aucune fusion automatique ni validation complète. {ticket.branch && <>Branche conservée : <span className="font-mono">{ticket.branch}</span>. </>}{ticket.slotId !== null && <>Slot conservé : {ticket.slotId}.</>}</p>}
      </div>
    </details>
  );
}

export function AutonomousRecoveryPanel({ ticket, quality, gate, pending, act, onOpenTerminal }: {
  ticket: Ticket;
  quality: TicketQuality;
  gate: QualityGate;
  pending: boolean;
  act: (action: () => Promise<unknown>) => Promise<void>;
  onOpenTerminal?: () => void;
}) {
  const state = ticket.autonomousState;
  if (!ticket.autonomous || !state) return null;
  const execution = state.execution;
  const recoverable = RECOVERABLE_PHASES.includes(state.phase);
  const publicationRetry = PUBLICATION_RETRY_PHASES.includes(state.phase);
  const publicationRetryMinutes = ticket.autonomousFinalizationMinutes ?? AUTONOMOUS_DEFAULT_FINALIZATION_MINUTES;
  const publicationRetryAttempts = ticket.autonomousMaxPublicationAttempts ?? AUTONOMOUS_DEFAULT_MAX_PUBLICATION_ATTEMPTS;
  const confirmedPrUrl = execution?.publication.status === "confirmed" ? execution.publication.prUrl : null;
  const reason = execution?.revocationReason;
  const workRetained = execution?.closure.retention === "retained";
  // An abandoned card keeps its slot for recovery until the user explicitly lets the work go.
  const releasable = ticket.column === "abandoned" && ticket.slotId !== null && execution !== undefined && state.hostMutation === null && execution.closure.status !== "unknown";

  return <div role="status" className="space-y-3 rounded border border-warning/30 bg-warning/5 px-3 py-3 text-xs">
    <p className="font-medium">{PHASE_LABELS[state.phase]}</p>
    {state.hostMutation !== null && <p className="text-warning">Le résultat de l’opération distante reste incertain. Toute reprise demande d’abord une réconciliation en lecture seule (vérification sans modification). Le serveur refuse une nouvelle opération tant que son propriétaire ou l’arrêt des agents n’est pas confirmé.</p>}
    {state.error !== null && <p className="text-muted-foreground">{formatQualityMessage(state.error)}</p>}
    {execution?.publication.simulated && <p className="text-warning">Publication simulée : aucun dépôt distant réel n’est validé.</p>}
    {reason && <p>Réserve : {REASON_LABELS[reason] ?? formatQualityMessage(reason)}</p>}
    {execution && execution.publication.error !== null && <p className="text-muted-foreground">Publication : {formatQualityMessage(execution.publication.error)}</p>}
    {confirmedPrUrl && <a className="block break-all underline" href={confirmedPrUrl} target="_blank" rel="noreferrer">{execution?.publication.simulated ? "Voir la PR partielle simulée" : "Ouvrir la PR partielle confirmée"} : {confirmedPrUrl}</a>}
    {recoverable && <AutonomousResumeSection ticket={ticket} state={state} quality={quality} gate={gate} pending={pending} act={act} />}
    {publicationRetry && <>
      <div><Button size="sm" variant="outline" disabled={pending} onClick={() => void act(() => api.resumeAutonomous(ticket.id, { action: "publish" }))}>{state.hostMutation !== null ? "Réconcilier puis réessayer la publication" : "Réessayer la publication partielle"}</Button></div>
      <p className="text-muted-foreground">Réessayer la publication est une décision explicite : après réconciliation confirmée, elle autorise une réserve de {publicationRetryMinutes} minutes et au maximum {publicationRetryAttempts} tentative(s). Aucune allocation n’est renouvelée automatiquement.</p>
    </>}
    {releasable && <div className="space-y-1">
      <ConfirmPopover title="Libérer le travail conservé" description={`Le worktree du slot ${ticket.slotId} et la branche locale${ticket.branch ? ` ${ticket.branch}` : ""} seront supprimés. La branche distante et la PR éventuelle sont conservées.`} confirmLabel="Libérer" destructive onConfirm={() => act(() => api.releaseRetainedWork(ticket.id))}>
        <Button size="sm" variant="outline" disabled={pending}>Libérer le travail conservé</Button>
      </ConfirmPopover>
      <p className="text-muted-foreground">La carte est abandonnée mais occupe encore le slot {ticket.slotId}. Récupérez d’abord ce qui n’a pas été poussé.</p>
    </div>}
    {(workRetained || onOpenTerminal) && <div className="flex flex-wrap gap-3">
      {workRetained && <AutonomousWorkspacesLink ticketId={ticket.id} />}
      {onOpenTerminal && <RecoveryLink onClick={onOpenTerminal}>Voir le journal du travail conservé</RecoveryLink>}
    </div>}
    <ExecutionDetails ticket={ticket} state={state} />
  </div>;
}
