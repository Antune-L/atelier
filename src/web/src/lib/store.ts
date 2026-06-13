import type { Slot, Ticket, WsClientEvent } from "@shared/schemas";
import { wsClientEventSchema } from "@shared/schemas";

const WS_URL = `${location.protocol === "https:" ? "wss" : "ws"}://${location.host}/ws`;
const RECONNECT_DELAY_MS = 1500;
const TOAST_TTL_MS = 6000;

export interface Toast {
  id: number;
  title: string;
  body: string;
}

export interface BoardState {
  tickets: Ticket[];
  slots: Slot[];
  connected: boolean;
  toasts: Toast[];
}

type Listener = () => void;

class BoardStore {
  private state: BoardState = { tickets: [], slots: [], connected: false, toasts: [] };
  private readonly listeners = new Set<Listener>();
  private toastSeq = 0;
  private ws: WebSocket | null = null;

  subscribe = (listener: Listener): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  getSnapshot = (): BoardState => this.state;

  private set(next: Partial<BoardState>): void {
    this.state = { ...this.state, ...next };
    for (const listener of this.listeners) listener();
  }

  connect(): void {
    if (this.ws) return;
    const socket = new WebSocket(WS_URL);
    this.ws = socket;
    socket.addEventListener("open", () => this.set({ connected: true }));
    socket.addEventListener("message", (event) => this.handle(event.data));
    socket.addEventListener("close", () => {
      this.set({ connected: false });
      this.ws = null;
      setTimeout(() => this.connect(), RECONNECT_DELAY_MS);
    });
    socket.addEventListener("error", () => socket.close());
  }

  private handle(raw: unknown): void {
    if (typeof raw !== "string") return;
    const parsed = wsClientEventSchema.safeParse(JSON.parse(raw));
    if (!parsed.success) return;
    this.apply(parsed.data);
  }

  private apply(event: WsClientEvent): void {
    switch (event.type) {
      case "snapshot":
        this.set({ tickets: event.tickets, slots: event.slots });
        break;
      case "ticket":
        this.set({ tickets: this.upsertTicket(event.ticket) });
        break;
      case "ticket_removed":
        this.set({ tickets: this.state.tickets.filter((t) => t.id !== event.ticketId) });
        break;
      case "slots":
        this.set({ slots: event.slots });
        break;
      case "comment":
        // Comments are fetched on demand in the detail view; nothing to store here.
        break;
      case "notification":
        this.pushToast(event.title, event.body);
        break;
    }
  }

  private upsertTicket(ticket: Ticket): Ticket[] {
    const exists = this.state.tickets.some((t) => t.id === ticket.id);
    if (ticket.archived) return this.state.tickets.filter((t) => t.id !== ticket.id);
    if (exists) return this.state.tickets.map((t) => (t.id === ticket.id ? ticket : t));
    return [...this.state.tickets, ticket];
  }

  /** Show a transient toast triggered by the UI (not from a server event). */
  notify(title: string, body: string): void {
    this.pushToast(title, body);
  }

  private pushToast(title: string, body: string): void {
    this.toastSeq += 1;
    const id = this.toastSeq;
    this.set({ toasts: [...this.state.toasts, { id, title, body }] });
    setTimeout(() => this.dismissToast(id), TOAST_TTL_MS);
  }

  dismissToast(id: number): void {
    this.set({ toasts: this.state.toasts.filter((t) => t.id !== id) });
  }
}

export const boardStore = new BoardStore();
boardStore.connect();
