import { CARD_TRANSFER_BLOCKER_MESSAGES, cardTransferBlocker, cardTransferDraft } from "../shared/cardTransfer.ts";
import type { CardTransferDraft } from "../shared/cardTransfer.ts";
import type { Ticket } from "../shared/schemas.ts";

import type { Store } from "./db/store.ts";

const TICKET_NOT_FOUND_MESSAGE = "Carte introuvable.";
const HTTP_NOT_FOUND = 404;
const HTTP_CONFLICT = 409;

export type CardTransferErrorCode = "NOT_FOUND" | "INELIGIBLE";

export const CARD_TRANSFER_ERROR_STATUS: Record<CardTransferErrorCode, number> = {
  NOT_FOUND: HTTP_NOT_FOUND,
  INELIGIBLE: HTTP_CONFLICT,
};

export class CardTransferError extends Error {
  constructor(
    readonly code: CardTransferErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "CardTransferError";
  }
}

// NOTE(ali): server-side gate of "Envoyer vers l'autre board"; the UI mirrors it with the same shared rules.
export function prepareCardTransfer(store: Store, ticketId: string): { ticket: Ticket; draft: CardTransferDraft } {
  const ticket = store.getTicket(ticketId);
  if (ticket === null) throw new CardTransferError("NOT_FOUND", TICKET_NOT_FOUND_MESSAGE);
  const blocker = cardTransferBlocker(ticket, {
    hasDependents: store.listDependents(ticketId).length > 0,
    linkedToAuditFinding: store.hasAuditFindingForTicket(ticketId),
  });
  if (blocker !== null) throw new CardTransferError("INELIGIBLE", CARD_TRANSFER_BLOCKER_MESSAGES[blocker]);
  return { ticket, draft: cardTransferDraft(ticket) };
}
