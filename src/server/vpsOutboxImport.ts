import { REMOTE_TICKET_ORIGIN } from "../shared/constants.ts";
import { outboxRequestId } from "../shared/vpsBridge.ts";
import type { BridgeOutboxItem, OutboxAck } from "../shared/vpsBridge.ts";

import { createLogger } from "./logger.ts";
import { remoteAllowedProjects, resolveRemoteCardsProfile } from "./remoteMcp/admission.ts";
import type { RemoteCardAdmissionDeps } from "./remoteMcp/admission.ts";
import { TicketOperationError } from "./ticketOperations.ts";
import type { TicketOperations } from "./ticketOperations.ts";

const REJECTION_REASON_MAX_LENGTH = 500;
const NO_PROFILE_REASON = "Aucun profil de cartes distantes sur le Mac : choisissez-le dans Réglages › MCP distant du Mac, puis renvoyez la carte.";
const log = createLogger("vps-outbox-import");

export interface VpsOutboxImportDeps extends RemoteCardAdmissionDeps {
  operations: Pick<TicketOperations, "createTodoTicket">;
}

function received(id: string, macTicketId: string): OutboxAck {
  return { id, status: "received", macTicketId };
}

function rejected(id: string, reason: string): OutboxAck {
  return { id, status: "rejected", reason: reason.slice(0, REJECTION_REASON_MAX_LENGTH) };
}

function projectNotAllowedReason(project: string): string {
  return `Projet non autorisé sur le Mac : ${project}. Cochez-le dans Réglages › MCP distant du Mac, puis renvoyez la carte.`;
}

// NOTE(ali): the Mac-side admission of one VPS outbox item. Only the project, title and description are honoured; the project is
// re-validated against the Mac allowlist now (never the published catalogue) and the card is a locked remote card with the
// Mac remote-cards profile, auto-merge and direct push off. Returns null to leave the item pending for the next sync.
export async function admitVpsOutboxItem(deps: VpsOutboxImportDeps, item: BridgeOutboxItem): Promise<OutboxAck | null> {
  const receipt = deps.store.getVpsOutboxReceipt(item.id);
  if (receipt !== null) return received(item.id, receipt.ticketId);
  if (!remoteAllowedProjects(deps.store).has(item.project)) return rejected(item.id, projectNotAllowedReason(item.project));
  const profile = await resolveRemoteCardsProfile(deps);
  if (!profile.ok) {
    if (profile.reason === "not_configured") return rejected(item.id, NO_PROFILE_REASON);
    log.warn("moteur du profil des cartes distantes indisponible, envoi du VPS laissé en attente", { outboxId: item.id, error: profile.detail });
    return null;
  }
  if (!remoteAllowedProjects(deps.store).has(item.project)) return rejected(item.id, projectNotAllowedReason(item.project));
  try {
    const { created, ticket } = deps.operations.createTodoTicket(
      {
        requestId: outboxRequestId(item.id),
        project: item.project,
        title: item.title,
        description: item.description,
        autoMerge: false,
        directPush: false,
      },
      {
        origin: REMOTE_TICKET_ORIGIN,
        frozenAgents: profile.agents,
        afterCreate: "none",
        inTransaction: (card) => deps.store.recordVpsOutboxReceipt(item.id, card.id),
      },
    );
    log.info("carte reçue du VPS", { outboxId: item.id, ticketId: ticket.id, created });
    return received(item.id, ticket.id);
  } catch (error) {
    if (error instanceof TicketOperationError) return rejected(item.id, `Carte refusée par le Mac : ${error.message}`);
    throw error;
  }
}
