import { findAuditMarker } from "./audit.ts";
import { CROSS_BOARD_DESCRIPTION_MAX_LENGTH, CROSS_BOARD_TITLE_MAX_LENGTH } from "./constants.ts";
import type { Ticket } from "./schemas.ts";
import { stripLocalUploadReferences } from "./uploadReferences.ts";

export const CARD_TRANSFERRED_EVENT = "transferred";
export const CARD_TRANSFER_REVERTED_EVENT = "transfer_reverted";
export const CARD_TRANSFER_EVENTS = [CARD_TRANSFERRED_EVENT, CARD_TRANSFER_REVERTED_EVENT] as const;

const TRANSFERABLE_KIND = "feature";
const TRANSFERABLE_COLUMN = "todo";

export type CardTransferBlocker =
  | "kind"
  | "column"
  | "archived"
  | "slot"
  | "triage"
  | "dependency"
  | "dependents"
  | "scheduled"
  | "audit"
  | "title"
  | "description";

export const CARD_TRANSFER_BLOCKER_MESSAGES: Record<CardTransferBlocker, string> = {
  kind: "Seule une carte de type feature peut être envoyée vers l'autre board.",
  column: "Seule une carte « À faire » peut être envoyée vers l'autre board.",
  archived: "Une carte archivée ne peut pas être envoyée vers l'autre board.",
  slot: "Cette carte occupe un slot : elle ne peut pas être envoyée vers l'autre board.",
  triage: "Analyse en cours : attendez le verdict avant d'envoyer la carte.",
  dependency: "Cette carte dépend d'une autre carte : retirez la dépendance avant de l'envoyer.",
  dependents: "D'autres cartes dépendent de celle-ci : retirez ces dépendances avant de l'envoyer.",
  scheduled: "Cette carte a un démarrage programmé : annulez-le avant de l'envoyer.",
  audit: "Une carte issue d'un constat d'audit reste sur ce board.",
  title: `Titre trop long pour l'autre board (${CROSS_BOARD_TITLE_MAX_LENGTH} caractères au plus).`,
  description: `Description trop longue pour l'autre board (${CROSS_BOARD_DESCRIPTION_MAX_LENGTH} caractères au plus, images retirées).`,
};

export type TransferableTicket = Pick<
  Ticket,
  "kind" | "column" | "archived" | "slotId" | "triageStatus" | "dependsOn" | "scheduledStartAt" | "title" | "description"
>;

export interface CardTransferContext {
  hasDependents: boolean;
  linkedToAuditFinding: boolean;
}

export interface CardTransferDraft {
  title: string;
  description: string;
}

export function cardTransferDraft(ticket: Pick<Ticket, "title" | "description">): CardTransferDraft {
  return { title: ticket.title, description: stripLocalUploadReferences(ticket.description) };
}

export function hasAuditFindingMarker(ticket: Pick<Ticket, "description">): boolean {
  return findAuditMarker(ticket.description) !== null;
}

export function cardTransferBlocker(ticket: TransferableTicket, context: CardTransferContext): CardTransferBlocker | null {
  if (ticket.kind !== TRANSFERABLE_KIND) return "kind";
  if (ticket.column !== TRANSFERABLE_COLUMN) return "column";
  if (ticket.archived) return "archived";
  if (ticket.slotId !== null) return "slot";
  if (ticket.triageStatus === "running") return "triage";
  if (ticket.dependsOn !== null) return "dependency";
  if (context.hasDependents) return "dependents";
  if (ticket.scheduledStartAt !== null) return "scheduled";
  if (context.linkedToAuditFinding || hasAuditFindingMarker(ticket)) return "audit";
  const draft = cardTransferDraft(ticket);
  if (draft.title.length > CROSS_BOARD_TITLE_MAX_LENGTH) return "title";
  if (draft.description.length > CROSS_BOARD_DESCRIPTION_MAX_LENGTH) return "description";
  return null;
}
