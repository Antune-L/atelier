import { ExternalLink, MessageSquare, ShieldCheck } from "lucide-react";
import { useState } from "react";

import type { AuditTicketOrigin } from "@shared/audit";
import { COLUMN_LABELS, ORCHESTRATOR_LABELS, type Column } from "@shared/constants";
import type { ProjectInfo, Ticket } from "@shared/schemas";
import { columnSchema } from "@shared/schemas";

import { ReviewLevelDot } from "@/components/ReviewLevelDot";
import { resolveProjectLabel } from "@/components/TicketCard";
import { MetaRow } from "@/components/ticket-detail/MetaRow";
import { ConfirmPopover } from "@/components/ui/confirm";
import { Select } from "@/components/ui/select";
import { useCompactLayout } from "@/hooks/useCompactLayout";
import { useBoard } from "@/hooks/useBoard";
import { auditOriginFor, formatAuditDate } from "@/lib/auditDisplay";
import { finishedKindLabel, formatDateTime } from "@/lib/display";

const STATUS_SELECT_ID = "ticket-status";
const LINK_CLASSES = "inline-flex items-center gap-1 hover:underline";

interface StatusConfirm {
  title: string;
  description: string;
  confirmLabel: string;
  destructive?: boolean;
}

/** Side-effecting move targets: abandon kills the session, merged archives, implementing launches. */
const STATUS_CONFIRMS: Partial<Record<Column, StatusConfirm>> = {
  abandoned: {
    title: "Abandonner le ticket",
    description:
      "Action destructive : la session est tuée, le worktree et la branche locale sont supprimés.",
    confirmLabel: "Abandonner",
    destructive: true,
  },
  merged: {
    title: "Marquer la PR comme mergée",
    description: "La carte sera archivée et le worktree/branche nettoyés.",
    confirmLabel: "PR mergée",
  },
  implementing: {
    title: "Lancer l'implémentation",
    description: "L'agent d'implémentation va être (re)lancé sur cette carte et occupera un slot.",
    confirmLabel: "Lancer",
  },
};

interface TicketMetaProps {
  ticket: Ticket;
  projects: ProjectInfo[];
  statusOptions: Column[];
  locked: boolean;
  onStatusChange: (target: Column) => void;
  onOpenPrdOrigin?: (prdId: string, project: string) => void;
  onOpenAuditOrigin?: (origin: AuditTicketOrigin) => void;
}

function statusTitle(ticket: Ticket, locked: boolean): string | undefined {
  if (locked) return "Carte verrouillée (en traitement)";
  if (ticket.column === "to_review") {
    return "En attente de review : crée la PR ou abandonne le ticket";
  }
  return undefined;
}

/** Key/value recap of the open ticket, shown in the sheet's right-hand column. */
export function TicketMeta({ ticket, projects, statusOptions, locked, onStatusChange, onOpenPrdOrigin, onOpenAuditOrigin }: TicketMetaProps) {
  const { conversations, audits } = useBoard();
  const compact = useCompactLayout();
  const auditOrigin = auditOriginFor(audits, ticket.id);
  const [pending, setPending] = useState<Column | null>(null);
  const pendingConfirm = pending === null ? undefined : STATUS_CONFIRMS[pending];

  const requestChange = (target: Column): void => {
    if (target === ticket.column) return;
    if (STATUS_CONFIRMS[target] !== undefined) {
      setPending(target);
      return;
    }
    onStatusChange(target);
  };

  const statusSelect = (
    <Select
      id={STATUS_SELECT_ID}
      className="h-7 w-auto max-w-full px-2 text-xs"
      value={ticket.column}
      disabled={locked || ticket.column === "to_review"}
      title={statusTitle(ticket, locked)}
      onChange={(e) => requestChange(columnSchema.parse(e.target.value))}
    >
      {statusOptions.map((col) => (
        <option key={col} value={col}>
          {COLUMN_LABELS[col]}
        </option>
      ))}
    </Select>
  );

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2 text-xs">
        <label htmlFor={STATUS_SELECT_ID} className="text-muted-foreground">
          Statut
        </label>
        {pending !== null && pendingConfirm !== undefined ? (
          <ConfirmPopover
            open
            onOpenChange={(next) => {
              if (!next) setPending(null);
            }}
            title={pendingConfirm.title}
            description={pendingConfirm.description}
            confirmLabel={pendingConfirm.confirmLabel}
            destructive={pendingConfirm.destructive === true}
            onConfirm={() => {
              setPending(null);
              onStatusChange(pending);
            }}
          >
            {statusSelect}
          </ConfirmPopover>
        ) : (
          statusSelect
        )}
      </div>

      <details className="ticket-metadata" open={!compact}>
        <summary className="cursor-pointer py-1 text-xs text-muted-foreground md:hidden">Informations du ticket</summary>
        <div className="space-y-1.5">
          <MetaRow label="Projet">{resolveProjectLabel(projects, ticket.project)}</MetaRow>
          {ticket.slotId !== null && <MetaRow label="Slot">Emplacement {ticket.slotId}</MetaRow>}
          {ticket.branch !== null && <MetaRow label="Branche">{ticket.branch}</MetaRow>}
          <MetaRow label="Profil">{ORCHESTRATOR_LABELS[ticket.orchestrator]}</MetaRow>
          <MetaRow label="Créé">{formatDateTime(ticket.createdAt)}</MetaRow>
          {ticket.scheduledStartAt !== null && (
            <MetaRow label="Lancement">
              <span className="text-info">{formatDateTime(ticket.scheduledStartAt)}</span>
            </MetaRow>
          )}
          {ticket.finishedAt !== null && (
            <MetaRow label={finishedKindLabel(ticket)}>{formatDateTime(ticket.finishedAt)}</MetaRow>
          )}
          {ticket.externalUrl && (
            <MetaRow label="Lien">
              <a href={ticket.externalUrl} target="_blank" rel="noopener noreferrer" className={LINK_CLASSES}>
                <ExternalLink className="h-3 w-3" />
                Externe
              </a>
            </MetaRow>
          )}
          {ticket.sourcePrdId !== null && (
            <PrdOriginRow
              prdId={ticket.sourcePrdId}
              task={ticket.sourcePrdTask}
              project={ticket.project}
              hasConversations={conversations.some((c) => c.project === ticket.project)}
              onOpen={onOpenPrdOrigin}
            />
          )}
          {auditOrigin !== undefined && (
            <AuditOriginRow origin={auditOrigin} projectLabel={resolveProjectLabel(projects, auditOrigin.project)} onOpen={onOpenAuditOrigin} />
          )}
          {ticket.reviewLevel && (
            <MetaRow label="Relecture">
              <ReviewLevelDot level={ticket.reviewLevel} reason={ticket.reviewReason} flags={ticket.reviewFlags} withLabel />
            </MetaRow>
          )}
          {ticket.prUrl !== null && (
            <MetaRow label="PR">
              <a href={ticket.prUrl} target="_blank" rel="noopener noreferrer" className={LINK_CLASSES}>
                <ExternalLink className="h-3 w-3" />
                {ticket.prNumber === null ? "PR" : `#${ticket.prNumber}`}
              </a>
            </MetaRow>
          )}
        </div>
      </details>
    </div>
  );
}

interface PrdOriginRowProps {
  prdId: string;
  task: string | null;
  project: string;
  hasConversations: boolean;
  onOpen?: (prdId: string, project: string) => void;
}

function PrdOriginRow({ prdId, task, project, hasConversations, onOpen }: PrdOriginRowProps) {
  const label = task === null ? "PRD (Atelier)" : `PRD · ${task} (Atelier)`;
  if (!hasConversations || onOpen === undefined) {
    return (
      <MetaRow label="Origine">
        <span className="text-muted-foreground">{hasConversations ? label : "PRD supprimé"}</span>
      </MetaRow>
    );
  }
  return (
    <MetaRow label="Origine">
      <button type="button" onClick={() => onOpen(prdId, project)} className={LINK_CLASSES}>
        <MessageSquare className="h-3 w-3" />
        {label}
      </button>
    </MetaRow>
  );
}

interface AuditOriginRowProps {
  origin: AuditTicketOrigin;
  projectLabel: string;
  onOpen?: (origin: AuditTicketOrigin) => void;
}

function AuditOriginRow({ origin, projectLabel, onOpen }: AuditOriginRowProps) {
  const label = `Audit du ${formatAuditDate(origin.runStartedAt)} · ${projectLabel}`;
  if (onOpen === undefined) {
    return (
      <MetaRow label="Origine">
        <span className="text-muted-foreground">{label}</span>
      </MetaRow>
    );
  }
  return (
    <MetaRow label="Origine">
      <button type="button" onClick={() => onOpen(origin)} className={LINK_CLASSES} title="Ouvrir le constat dans la vue Audits">
        <ShieldCheck className="h-3 w-3" />
        {label}
      </button>
    </MetaRow>
  );
}
