import type { Ticket } from "@shared/schemas";

export function getDependencyParent(ticket: Ticket, ticketsById: ReadonlyMap<string, Ticket>): Ticket | null {
  return ticket.dependsOn === null ? null : ticketsById.get(ticket.dependsOn) ?? null;
}
