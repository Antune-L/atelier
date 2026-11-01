import { CARD_TRANSFER_BLOCKER_MESSAGES, cardTransferBlocker, cardTransferDraft } from "../shared/cardTransfer.ts";
import type { CardTransferDraft } from "../shared/cardTransfer.ts";
import type { Ticket } from "../shared/schemas.ts";

import type { Store } from "./db/store.ts";

const TICKET_NOT_FOUND_MESSAGE = "Carte introuvable.";

export class CardTransferError extends Error {
  constructor(
    readonly code: "NOT_FOUND" | "INELIGIBLE",
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
