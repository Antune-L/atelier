import { ExternalLink } from "lucide-react";
import { useState } from "react";

import { COLUMN_LABELS, ORCHESTRATOR_LABELS, type Column } from "@shared/constants";
import type { ProjectInfo, Ticket } from "@shared/schemas";
import { columnSchema } from "@shared/schemas";

import { resolveProjectLabel } from "@/components/TicketCard";
import { TicketCost } from "@/components/TicketCost";
import { MetaRow } from "@/components/ticket-detail/MetaRow";
import { ConfirmPopover } from "@/components/ui/confirm";
import { Select } from "@/components/ui/select";
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
}

function statusTitle(ticket: Ticket, locked: boolean): string | undefined {
  if (locked) return "Carte verrouillée (en traitement)";
  if (ticket.column === "to_review") {
    return "En attente de review : crée la PR ou abandonne le ticket";
  }
  return undefined;
}

/** Key/value recap of the open ticket, shown in the sheet's right-hand column. */
export function TicketMeta({ ticket, projects, statusOptions, locked, onStatusChange }: TicketMetaProps) {
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

      <MetaRow label="Projet">{resolveProjectLabel(projects, ticket.project)}</MetaRow>
      {ticket.slotId !== null && <MetaRow label="Slot">slot-{ticket.slotId}</MetaRow>}
      {ticket.branch !== null && <MetaRow label="Branche">{ticket.branch}</MetaRow>}
      <MetaRow label="Profil">{ORCHESTRATOR_LABELS[ticket.orchestrator]}</MetaRow>
      <TicketCost ticket={ticket} />
      <MetaRow label="Créé">{formatDateTime(ticket.createdAt)}</MetaRow>
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
      {ticket.prUrl !== null && (
        <MetaRow label="PR">
          <a href={ticket.prUrl} target="_blank" rel="noopener noreferrer" className={LINK_CLASSES}>
            <ExternalLink className="h-3 w-3" />
            {ticket.prNumber === null ? "PR" : `#${ticket.prNumber}`}
          </a>
        </MetaRow>
      )}
    </div>
  );
}
