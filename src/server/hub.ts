import type { ServerWebSocket } from "bun";

import type { Comment, Slot, Ticket, WsClientEvent } from "../shared/schemas.ts";

import type { Store } from "./db/store.ts";

interface ClientSocketData {
  kind: "client";
}

export type ClientSocket = ServerWebSocket<ClientSocketData>;

/**
 * Broadcasts state mutations to all connected UI clients. The UI never polls;
 * every mutation flows through here.
 */
export class ClientHub {
  private readonly clients = new Set<ClientSocket>();

  constructor(private readonly store: Store) {}

  add(ws: ClientSocket): void {
    this.clients.add(ws);
    this.sendSnapshot(ws);
  }

  remove(ws: ClientSocket): void {
    this.clients.delete(ws);
  }

  private sendSnapshot(ws: ClientSocket): void {
    const event: WsClientEvent = {
      type: "snapshot",
      tickets: this.store.listTickets(false),
      slots: this.store.listSlots(),
    };
    ws.send(JSON.stringify(event));
  }

  private broadcast(event: WsClientEvent): void {
    const payload = JSON.stringify(event);
    for (const ws of this.clients) {
      ws.send(payload);
    }
  }

  pushTicket(ticket: Ticket): void {
    this.broadcast({ type: "ticket", ticket });
  }

  pushTicketRemoved(ticketId: string): void {
    this.broadcast({ type: "ticket_removed", ticketId });
  }

  pushComment(comment: Comment): void {
    this.broadcast({ type: "comment", comment });
  }

  pushSlots(slots: Slot[]): void {
    this.broadcast({ type: "slots", slots });
  }

  pushNotification(title: string, body: string): void {
    this.broadcast({ type: "notification", title, body });
  }
}
