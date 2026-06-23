import type { Comment, Slot, Ticket, WorktreeSession, WsClientEvent } from "@shared/schemas";
import { wsClientEventSchema } from "@shared/schemas";

import {
  ensureNotificationPermission,
  playNotificationSound,
  showDesktopNotification,
} from "./notifications";

const WS_URL = `${location.protocol === "https:" ? "wss" : "ws"}://${location.host}/ws`;
const RECONNECT_DELAY_MS = 1500;
const TOAST_TTL_MS = 6000;

export interface Toast {
  id: number;
  title: string;
  body: string;
  ticketId?: string;
}

export interface BoardState {
  tickets: Ticket[];
  slots: Slot[];
  worktreeSessions: WorktreeSession[];
  connected: boolean;
  toasts: Toast[];
  openTicketId: string | null;
}

type Listener = () => void;
type CommentListener = (comment: Comment) => void;

class BoardStore {
  private state: BoardState = { tickets: [], slots: [], worktreeSessions: [], connected: false, toasts: [], openTicketId: null };
  private readonly listeners = new Set<Listener>();
  private readonly commentListeners = new Set<CommentListener>();
  private toastSeq = 0;
  private ws: WebSocket | null = null;

  subscribe = (listener: Listener): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  /**
   * Comments live outside the board snapshot (fetched on demand by the detail view), so they get
   * their own stream: the open ticket subscribes to surface agent/user messages without a refresh.
   */
  subscribeComments = (listener: CommentListener): (() => void) => {
    this.commentListeners.add(listener);
    return () => this.commentListeners.delete(listener);
  };

  getSnapshot = (): BoardState => this.state;

  private set(next: Partial<BoardState>): void {
    this.state = { ...this.state, ...next };
    for (const listener of this.listeners) listener();
  }

  connect(): void {
    if (this.ws) return;
    ensureNotificationPermission();
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
        this.set({ tickets: event.tickets, slots: event.slots, worktreeSessions: event.worktreeSessions });
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
      case "worktree_sessions":
        this.set({ worktreeSessions: event.worktreeSessions });
        break;
      case "comment":
        // Not part of the board snapshot; fan out to whichever ticket detail is open.
        for (const listener of this.commentListeners) listener(event.comment);
        break;
      case "notification": {
        const ticketId = event.ticketId;
        this.pushToast(event.title, event.body, ticketId);
        // Pass a click callback rather than importing the store into notifications.ts to avoid a
        // circular import (store imports notifications).
        showDesktopNotification(
          event.title,
          event.body,
          ticketId ? () => this.openTicket(ticketId) : undefined,
        );
        // Only completion notifications carry `sound`; other events stay silent.
        if (event.sound) playNotificationSound();
        break;
      }
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

  private pushToast(title: string, body: string, ticketId?: string): void {
    this.toastSeq += 1;
    const id = this.toastSeq;
    this.set({ toasts: [...this.state.toasts, { id, title, body, ticketId }] });
    setTimeout(() => this.dismissToast(id), TOAST_TTL_MS);
  }

  dismissToast(id: number): void {
    this.set({ toasts: this.state.toasts.filter((t) => t.id !== id) });
  }

  /** The currently open ticket detail; lives here since notifications can request opening a ticket. */
  openTicket(ticketId: string): void {
    this.set({ openTicketId: ticketId });
  }

  closeTicket(): void {
    this.set({ openTicketId: null });
  }
}

export const boardStore = new BoardStore();
boardStore.connect();
