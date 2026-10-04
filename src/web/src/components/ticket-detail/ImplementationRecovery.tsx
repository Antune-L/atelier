import { useRef, useState } from "react";

import type { ImplementationPlan, ImplementationPlanLot, ImplementationRecovery as RecoveryRecord } from "@shared/implementationPlan";
import type { Ticket } from "@shared/schemas";

import { SectionHeader } from "@/components/ticket-detail/SectionHeader";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/input";
import { api, type RecoverImplementationPlanInput } from "@/lib/api";
import { formatDateTime } from "@/lib/display";
import { canRecoverImplementation } from "@/lib/implementationRecovery";
import { boardStore } from "@/lib/store";

const LOT_STATUS_LABELS: Record<ImplementationPlanLot["status"], string> = {
  pending: "En attente",
  running: "En cours",
  completed: "Terminé par délégation",
  failed: "Échoué",
  interrupted: "Interrompu",
  blocked: "Bloqué",
  cancelled: "Annulé",
};

const RECOVERY_STATUS_LABELS: Record<RecoveryRecord["status"], string> = {
  freezing: "Arrêt et préservation des lots en cours",
  pending: "Reprise en attente de vérification",
  assessing: "Vérification et review en cours",
  assessed: "Vérification terminée, livraison en attente",
  resolved: "Exigences réconciliées",
};

const RECOVERY_STATUS_NOTES: Record<RecoveryRecord["status"], string> = {
  freezing: "Le serveur arrête les agents des lots et préserve leur travail avant la reprise.",
  pending: "Terminez les exigences restantes, puis faites vérifier la version candidate. Le ticket conserve son espace de travail.",
  assessing: "Chaque exigence restante doit être couverte. Une PR existante ne suffit pas à valider le travail.",
  assessed: "La livraison doit encore confirmer la version exacte de la PR et appliquer les contrôles habituels.",
  resolved: "Les exigences ont été réconciliées pour la version enregistrée. Le statut du ticket indique si la livraison a terminé.",
};

interface ImplementationRecoveryProps {
  ticket: Ticket;
  plan: ImplementationPlan;
}

export function ImplementationRecovery({ ticket, plan }: ImplementationRecoveryProps) {
  const recovery = plan.recovery;
  const [reason, setReason] = useState(recovery?.reason ?? "");
  const [prUrl, setPrUrl] = useState(recovery?.prUrl ?? ticket.prUrl ?? "");
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const [error, setError] = useState<{ revision: number; message: string } | null>(null);
  const eligible = canRecoverImplementation(ticket);
  const blocked = Boolean(recovery?.diagnostic);
  const inProgress = !blocked && (recovery?.status === "freezing" || recovery?.status === "assessing");
  const canResumePreservation = recovery?.status === "freezing" && blocked;
  const canResumeWork = recovery?.status === "pending" || recovery?.status === "assessed" || recovery?.status === "resolved";
  const canTakeover = eligible && (!recovery || canResumePreservation || canResumeWork);
  const canAssess = eligible && (recovery?.status === "pending" || recovery?.status === "assessed" || recovery?.status === "resolved" || (recovery?.status === "assessing" && blocked));
  const canFinalize = eligible && (recovery?.status === "assessed" || recovery?.status === "resolved");
  const integrationLots = plan.lots.filter((lot) => lot.failurePhase === "integration" && lot.childResult && lot.status !== "completed");
  const canRetryIntegration = eligible && !recovery;
  const actionable = canTakeover || canAssess || canFinalize || (canRetryIntegration && integrationLots.length > 0);
  const obligations = recovery?.obligations ?? plan.lots.filter((lot) => lot.status !== "completed");
  const reasonId = `implementation-recovery-reason-${ticket.id}`;
  const prId = `implementation-recovery-pr-${ticket.id}`;
  let statusLabel = "Des lots restent à réaliser ou à vérifier";
  if (recovery) statusLabel = RECOVERY_STATUS_LABELS[recovery.status];
  if (recovery?.status === "resolved" && ticket.slotId !== null) statusLabel = "Exigences réconciliées, livraison en attente";
  if (blocked) statusLabel = "Reprise bloquée";
  let takeoverLabel = "Reprendre les lots";
  if (canResumePreservation) takeoverLabel = "Recommencer la préservation";
  else if (canResumeWork) takeoverLabel = "Reprendre le travail";

  const submit = async (action: RecoverImplementationPlanInput["action"], label?: string): Promise<void> => {
    if (busyRef.current || !reason.trim()) return;
    busyRef.current = true;
    setBusy(true);
    setError(null);
    try {
      const updated = await api.recoverImplementationPlan(ticket.id, {
        action,
        reason: reason.trim(),
        prUrl: prUrl.trim() || undefined,
        generation: recovery?.generation,
        label,
      });
      boardStore.rememberTicket(updated);
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "Reprise refusée";
      try {
        const latest = await api.ticketDetail(ticket.id);
        boardStore.rememberTicket(latest.ticket);
        setError({ revision: latest.ticket.implementationPlan?.updatedAt ?? plan.updatedAt, message });
      } catch {
        setError({ revision: plan.updatedAt, message });
      }
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  };

  return (
    <section className="space-y-3 rounded-md border border-border p-3">
      <SectionHeader>Reprise des lots</SectionHeader>
      <div role="status" aria-live="polite" className="space-y-1">
        <p className="text-xs font-medium">{statusLabel}</p>
        <p className="text-xs text-muted-foreground">{recovery ? RECOVERY_STATUS_NOTES[recovery.status] : "La reprise conserve les lots terminés et l’historique des échecs. Passer le statut à Fini ne termine pas ces obligations."}</p>
      </div>
      {recovery && (
        <div className="space-y-1 text-xs text-muted-foreground">
          <p>Demandée par {recovery.actor === "user" ? "vous" : "l’agent"} le {formatDateTime(recovery.createdAt)} : {recovery.reason}</p>
          {recovery.candidate && <p className="break-all">Version candidate : <span className="font-mono">{recovery.candidate.commitSha}</span></p>}
          {recovery.prUrl && <p className="break-all">PR proposée : {recovery.prUrl}</p>}
        </div>
      )}
      {recovery?.diagnostic && <p className="whitespace-pre-wrap break-words text-xs text-warning">{recovery.diagnostic}</p>}
      <div className="space-y-2">
        <p className="text-xs font-medium">Exigences restantes</p>
        {obligations.map((obligation) => {
          const lot = plan.lots.find((item) => item.label === obligation.label);
          const coverage = recovery?.coverage.find((item) => item.label === obligation.label);
          let status = "Non vérifié";
          if (coverage) status = coverage.covered ? "Couverture confirmée" : "Couverture insuffisante";
          else if (lot) status = LOT_STATUS_LABELS[lot.status];
          return (
            <div key={obligation.label} className="space-y-1 rounded border border-border px-2 py-2 text-xs">
              <div className="flex items-start justify-between gap-2"><span className="font-medium">{obligation.label}</span><span className="shrink-0 text-muted-foreground">{status}</span></div>
              <p className="whitespace-pre-wrap break-words text-muted-foreground">{obligation.plan}</p>
              {coverage && <p className="whitespace-pre-wrap break-words">{coverage.evidence}</p>}
              {lot?.summary && <p className="whitespace-pre-wrap break-words text-muted-foreground">{lot.summary}</p>}
              {lot?.failureHistory && lot.failureHistory.length > 0 && (
                <details>
                  <summary className="cursor-pointer text-muted-foreground">Historique des échecs</summary>
                  {lot.failureHistory.map((failure, index) => (
                    <p key={`${failure.at}-${index}`} className="mt-1 whitespace-pre-wrap break-words">{formatDateTime(failure.at)} : {failure.summary}</p>
                  ))}
                </details>
              )}
            </div>
          );
        })}
      </div>
      {recovery && recovery.archives.length > 0 && (
        <details className="space-y-1 text-xs text-muted-foreground">
          <summary className="cursor-pointer">Travail des lots préservé</summary>
          {recovery.archives.map((archive) => (
            <div key={archive.label} className="mt-2 space-y-1 break-all">
              <p>{archive.label} : {archive.unchanged ? "aucune modification à archiver" : "archive vérifiée"}</p>
              <p className="font-mono">{archive.archivePath}</p>
              {archive.journalPath && <p className="font-mono">{archive.journalPath}</p>}
            </div>
          ))}
        </details>
      )}
      {actionable && (
        <div className="space-y-2 border-t border-border pt-3">
          <Label htmlFor={reasonId} className="text-xs">Motif de la reprise</Label>
          <Textarea id={reasonId} value={reason} onChange={(event) => setReason(event.target.value)} disabled={busy || inProgress} placeholder="Pourquoi reprendre ces lots ?" />
          <Label htmlFor={prId} className="text-xs">PR existante (facultatif)</Label>
          <Input id={prId} type="url" value={prUrl} onChange={(event) => setPrUrl(event.target.value)} disabled={busy || inProgress} placeholder="Collez le lien de la PR si elle existe déjà" />
          <p className="text-xs text-muted-foreground">Vous pouvez renseigner une PR mentionnée dans les commentaires. Le serveur vérifiera son dépôt, ses branches et sa version exacte.</p>
          <div className="flex flex-wrap gap-2">
            {canTakeover && <Button size="sm" disabled={busy || !reason.trim()} onClick={() => void submit("takeover")}>{busy ? "Reprise en cours…" : takeoverLabel}</Button>}
            {canAssess && <Button size="sm" disabled={busy || !reason.trim()} onClick={() => void submit("assess")}>{busy ? "Vérification en cours…" : "Vérifier la reprise"}</Button>}
            {canFinalize && <Button size="sm" disabled={busy || !reason.trim() || !prUrl.trim()} onClick={() => void submit("finalize")}>Livrer la PR vérifiée</Button>}
            {canRetryIntegration && integrationLots.map((lot) => <Button key={lot.label} size="sm" variant="outline" disabled={busy || !reason.trim()} onClick={() => void submit("retry_integration", lot.label)}>Réessayer l’intégration : {lot.label}</Button>)}
          </div>
        </div>
      )}
      {error?.revision === plan.updatedAt && <p role="alert" className="whitespace-pre-wrap break-words text-xs text-danger">{error.message}</p>}
    </section>
  );
}
