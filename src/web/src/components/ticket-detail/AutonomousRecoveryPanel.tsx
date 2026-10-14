import { useState } from "react";

import { AUTONOMOUS_DEFAULT_FINALIZATION_MINUTES, AUTONOMOUS_DEFAULT_MAX_PUBLICATION_ATTEMPTS, AUTONOMOUS_DEFAULT_MAX_CORRECTIONS, AUTONOMOUS_DEFAULT_MAX_STARTS, AUTONOMOUS_DEFAULT_TIMEOUT_MINUTES, AUTONOMOUS_MINUTE_MS, autonomousResumeSchema } from "@shared/autonomous";
import type { AutonomousResumeInput, AutonomousState, AutonomousWorkspaces } from "@shared/autonomous";
import type { Ticket } from "@shared/schemas";

import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input, Label } from "@/components/ui/input";
import { api } from "@/lib/api";
import { formatDateTime } from "@/lib/display";
import { formatQualityMessage, qualityErrorMessage } from "@/lib/qualityMessages";

const PHASE_LABELS: Record<AutonomousState["phase"], string> = {
  planning: "Planification", checks: "Contrôles locaux", preview: "Déploiement Coolify", validating: "Vérification navigateur", correcting: "Correction", ready: "Prêt à livrer", delivering: "Livraison", completed: "Terminé", paused: "Parcours suspendu", closing: "Arrêt et conservation du travail", publishing_partial: "Publication partielle en cours", published_partial: "PR partielle publiée avec réserves", publication_failed: "Publication partielle non confirmée",
};
const RECOVERABLE_PHASES: AutonomousState["phase"][] = ["paused", "published_partial", "publication_failed"];
const WORKSPACE_STATUS_LABELS = { retained: "Espace enfant conservé", archived: "Travail enfant archivé", integrated: "Travail intégré dans le slot parent", unknown: "Conservation non confirmée" };
const INITIAL_EXTENSION = { additionalStarts: "", additionalMinutes: "", additionalCorrections: "" };
const CLOSURE_LABELS = { not_requested: "non demandé", requested: "demandé", confirmed: "confirmé", unknown: "inconnu : conservation requise" };
const REASON_LABELS: Record<string, string> = { explicit_publication: "Publication partielle demandée explicitement", deadline: "Durée d’exécution atteinte", starts_exhausted: "Garde-fou des démarrages atteint", corrections_exhausted: "Corrections épuisées", finalization_expired: "Réserve de finalisation expirée", publication_exhausted: "Tentatives de publication épuisées" };

export function AutonomousRecoveryPanel({ ticket, pending, act, onOpenTerminal }: {
  ticket: Ticket;
  pending: boolean;
  act: (action: () => Promise<unknown>) => Promise<void>;
  onOpenTerminal?: () => void;
}) {
  const [workspacesOpen, setWorkspacesOpen] = useState(false);
  const [workspacesLoading, setWorkspacesLoading] = useState(false);
  const [workspaces, setWorkspaces] = useState<AutonomousWorkspaces | null>(null);
  const [workspacesError, setWorkspacesError] = useState<string | null>(null);
  const [extending, setExtending] = useState(false);
  const [extension, setExtension] = useState(INITIAL_EXTENSION);
  const [extensionError, setExtensionError] = useState<string | null>(null);
  const state = ticket.autonomousState;
  if (!ticket.autonomous || !state) return null;
  const execution = state.execution;
  const recoverable = RECOVERABLE_PHASES.includes(state.phase);
  const busy = pending;
  const publicationRetryMinutes = ticket.autonomousFinalizationMinutes ?? AUTONOMOUS_DEFAULT_FINALIZATION_MINUTES;
  const publicationRetryAttempts = ticket.autonomousMaxPublicationAttempts ?? AUTONOMOUS_DEFAULT_MAX_PUBLICATION_ATTEMPTS;
  const confirmedPrUrl = execution?.publication.status === "confirmed" ? execution.publication.prUrl : null;
  const reason = execution?.revocationReason;
  const recoverWork = async (): Promise<void> => {
    setWorkspacesOpen(true);
    setWorkspacesLoading(true);
    setWorkspaces(null);
    setWorkspacesError(null);
    try {
      setWorkspaces(await api.autonomousWorkspaces(ticket.id));
    } catch (failure) {
      setWorkspacesError(qualityErrorMessage(failure));
    } finally {
      setWorkspacesLoading(false);
    }
  };
  const confirmExtension = async (): Promise<void> => {
    const input: AutonomousResumeInput = { action: "extend" };
    if (extension.additionalStarts !== "") input.additionalStarts = Number(extension.additionalStarts);
    if (extension.additionalMinutes !== "") input.additionalMinutes = Number(extension.additionalMinutes);
    if (extension.additionalCorrections !== "") input.additionalCorrections = Number(extension.additionalCorrections);
    const parsed = autonomousResumeSchema.safeParse(input);
    if (!parsed.success || Object.keys(input).length === 1) {
      setExtensionError("Indiquez au moins une allocation entière positive dans les limites autorisées.");
      return;
    }
    await act(async () => {
      await api.resumeAutonomous(ticket.id, parsed.data);
      setExtending(false);
      setExtension(INITIAL_EXTENSION);
      setExtensionError(null);
    });
  };

  return <div role="status" className="space-y-3 rounded border border-warning/30 bg-warning/5 px-3 py-3 text-xs">
    <p className="font-medium">{PHASE_LABELS[state.phase]}</p>
    {state.hostMutation !== null && <p className="text-warning">Le résultat de l’opération distante reste incertain. Toute reprise demande d’abord une réconciliation en lecture seule (vérification sans modification). Le serveur refuse une nouvelle opération tant que son propriétaire ou l’arrêt des agents n’est pas confirmé.</p>}
    {state.error !== null && <p className="text-muted-foreground">{formatQualityMessage(state.error)}</p>}
    {execution && <div className="space-y-1 text-muted-foreground">
      <p>Garde-fou expérimental : {execution.starts.length} démarrage(s) utilisé(s), {Math.max(0, execution.maxStarts - execution.starts.length)} restant(s). Ce compteur ne mesure pas l’avancement.</p>
      <p>Corrections : {state.corrections} utilisée(s), {Math.max(0, execution.maxCorrections - state.corrections)} restante(s). Échéance : {formatDateTime(execution.deadlineAt)}.</p>
      <p>Publication : {execution.publicationAttempts} tentative(s) utilisée(s), {Math.max(0, execution.maxPublicationAttempts - execution.publicationAttempts)} restante(s).</p>
      {execution.finalizationDeadlineAt !== null && <p>Réserve de finalisation jusqu’au {formatDateTime(execution.finalizationDeadlineAt)} ({execution.finalizationMinutes} minutes).</p>}
      <p>Arrêt des agents : {CLOSURE_LABELS[execution.closure.status]}. Travail {execution.closure.retention === "retained" ? "conservé" : "libéré"}.</p>
      {reason && <p>Réserve : {REASON_LABELS[reason] ?? formatQualityMessage(reason)}</p>}
      {execution.publication.error !== null && <p>Publication : {formatQualityMessage(execution.publication.error)}</p>}
    </div>}
    {execution?.publication.simulated && <p className="text-warning">Publication simulée : aucun dépôt distant réel n’est validé.</p>}
    {confirmedPrUrl && <a className="block break-all underline" href={confirmedPrUrl} target="_blank" rel="noreferrer">{execution?.publication.simulated ? "Voir la PR partielle simulée" : "Ouvrir la PR partielle confirmée"} : {confirmedPrUrl}</a>}
    {(state.phase === "published_partial" || state.phase === "publication_failed" || state.phase === "publishing_partial" || state.phase === "closing") && <p>La livraison garde ses réserves : aucune fusion automatique ni validation complète. {ticket.branch && <>Branche conservée : <span className="font-mono">{ticket.branch}</span>. </>}{ticket.slotId !== null && <>Slot conservé : {ticket.slotId}.</>}</p>}
    <div className="flex flex-wrap gap-2">
      {recoverable && <>
        <Button size="sm" variant="outline" disabled={busy} onClick={() => void act(() => api.resumeAutonomous(ticket.id))}>Reprendre avec les limites restantes</Button>
        <Button size="sm" variant="outline" disabled={busy} onClick={() => { setExtensionError(null); setExtending(true); }}>Accorder une extension limitée</Button>
      </>}
      {(state.phase === "publication_failed" || state.phase === "paused") && <Button size="sm" variant="outline" disabled={busy} onClick={() => void act(() => api.resumeAutonomous(ticket.id, { action: "publish" }))}>{state.hostMutation !== null ? "Réconcilier puis réessayer la publication" : "Réessayer la publication partielle"}</Button>}
      {execution?.closure.retention === "retained" && <Button size="sm" variant="outline" disabled={workspacesLoading} onClick={() => void recoverWork()}>Récupérer le travail</Button>}
      {onOpenTerminal && <Button size="sm" variant="outline" onClick={onOpenTerminal}>Voir le journal du travail conservé</Button>}
    </div>
    {(state.phase === "publication_failed" || state.phase === "paused") && <p className="text-muted-foreground">Réessayer la publication est une décision explicite : après réconciliation confirmée, elle autorise une réserve de {publicationRetryMinutes} minutes et au maximum {publicationRetryAttempts} tentative(s). Aucune allocation n’est renouvelée automatiquement.</p>}
    <Dialog open={workspacesOpen} onOpenChange={setWorkspacesOpen} title="Récupérer le travail conservé" description="Sélectionnez et copiez les chemins pour accéder aux fichiers sur la machine qui héberge le serveur. Le slot parent et les espaces enfants sont distincts ; ce dialogue ne modifie aucun fichier.">
      {workspacesLoading && <p className="text-xs text-muted-foreground">Vérification des emplacements conservés…</p>}
      {workspacesError && <p role="alert" className="text-xs text-danger">{workspacesError}</p>}
      {workspaces && <div className="space-y-4 text-xs">
        <section className="space-y-2"><p className="font-medium">Code du slot parent</p>
          {workspaces.parent === null ? <p className="text-warning">Aucun emplacement parent conservé n’est identifié.</p> : <>
            <p className="text-muted-foreground">{workspaces.parent.available ? "Espace de travail disponible" : "Espace de travail indisponible ou non confirmé"}{workspaces.parent.simulated && " · simulation, aucun fichier réel vérifié"}.</p>
            <Label htmlFor="autonomous-parent-path">Emplacement du code parent</Label><Input id="autonomous-parent-path" value={workspaces.parent.path} readOnly onFocus={(event) => event.target.select()} />
          </>}
        </section>
        <section className="space-y-2"><p className="font-medium">Travail des lots enfants</p>
          {workspaces.children.length === 0 && <p className="text-muted-foreground">Aucun emplacement enfant conservé n’est enregistré.</p>}
          {workspaces.children.map((child, index) => <div key={`${child.label}-${index}`} className="space-y-2 rounded border border-border p-2">
            <p>{child.label} · {WORKSPACE_STATUS_LABELS[child.status]} · {child.verified ? "préservation vérifiée" : "préservation non vérifiée"}</p>
            {([
              { field: "workspacePath", label: "Code de l’espace enfant" },
              { field: "archivePath", label: "Archive du travail enfant" },
              { field: "journalPath", label: "Journal de préservation" },
            ] satisfies { field: "workspacePath" | "archivePath" | "journalPath"; label: string }[]).map(({ field, label }) => child[field] === null ? null : <div key={field} className="space-y-1"><Label htmlFor={`autonomous-child-${index}-${field}`}>{label}</Label><Input id={`autonomous-child-${index}-${field}`} value={child[field]} readOnly onFocus={(event) => event.target.select()} /></div>)}
            {child.workspacePath === null && child.archivePath === null && <p className="text-warning">Aucun chemin vers le code ou une archive n’est confirmé.</p>}
          </div>)}
        </section>
        {workspaces.diagnostic && <p className="whitespace-pre-wrap text-warning">{formatQualityMessage(workspaces.diagnostic)}</p>}
      </div>}
    </Dialog>
    <Dialog open={extending} onOpenChange={setExtending} title="Confirmer une extension limitée" description="Seules les allocations indiquées sont ajoutées. Les consommations et réserves existantes sont conservées et cette décision est enregistrée." footer={<><Button size="sm" variant="outline" disabled={pending} onClick={() => setExtending(false)}>Annuler</Button><Button size="sm" disabled={busy} onClick={() => void confirmExtension()}>Confirmer les allocations et reprendre</Button></>}>
      <p className="text-xs text-muted-foreground">Limites actuelles : {execution?.maxStarts ?? ticket.autonomousMaxStarts ?? AUTONOMOUS_DEFAULT_MAX_STARTS} démarrages, {execution?.maxCorrections ?? ticket.autonomousMaxCorrections ?? AUTONOMOUS_DEFAULT_MAX_CORRECTIONS} corrections ; durée initiale {ticket.autonomousTimeoutMinutes ?? AUTONOMOUS_DEFAULT_TIMEOUT_MINUTES} minutes.</p>
      {([
        { field: "additionalStarts", label: "Démarrages supplémentaires (garde-fou expérimental)" },
        { field: "additionalMinutes", label: "Minutes supplémentaires" },
        { field: "additionalCorrections", label: "Corrections supplémentaires" },
      ] satisfies { field: keyof typeof INITIAL_EXTENSION; label: string }[]).map(({ field, label }) => <div key={field} className="space-y-1"><Label htmlFor={`extend-${field}`}>{label}</Label><Input id={`extend-${field}`} type="number" min={1} value={extension[field]} disabled={pending} onChange={(event) => setExtension({ ...extension, [field]: event.target.value })} /></div>)}
      {extension.additionalMinutes !== "" && Number.isFinite(Number(extension.additionalMinutes)) && <p className="text-xs text-muted-foreground">Nouvelle échéance proposée : {formatDateTime(Math.max(Date.now(), execution?.deadlineAt ?? state.deadlineAt) + Number(extension.additionalMinutes) * AUTONOMOUS_MINUTE_MS)}.</p>}
      {extensionError && <p role="alert" className="text-xs text-danger">{extensionError}</p>}
    </Dialog>
  </div>;
}
