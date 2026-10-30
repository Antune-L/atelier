import { REMOTE_TICKET_ORIGIN } from "./constants.ts";
import { isDependencyReady } from "./dependencies.ts";
import type { Ticket } from "./schemas.ts";

export type StartBlocker = "triage" | "approval" | "dependency";

export function isRemoteTicket(ticket: Pick<Ticket, "origin">): boolean {
  return ticket.origin === REMOTE_TICKET_ORIGIN;
}

export function needsRemoteApproval(ticket: Pick<Ticket, "origin" | "remoteApprovedAt">): boolean {
  return isRemoteTicket(ticket) && ticket.remoteApprovedAt === null;
}

export function startBlocker(ticket: Ticket, parent: Ticket | null): StartBlocker | null {
  if (ticket.column === "todo" && ticket.triageStatus === "running") return "triage";
  if (needsRemoteApproval(ticket)) return "approval";
  if (!isDependencyReady(ticket, parent)) return "dependency";
  return null;
}
