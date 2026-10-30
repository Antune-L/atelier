import type { ServerWebSocket } from "bun";

import { EMPTY_AUDIT_OVERVIEW } from "../shared/audit.ts";
import type { AuditOverview } from "../shared/audit.ts";
import { isRemoteTicket } from "../shared/startBlocker.ts";
import type { Automation, NotificationSoundKind, Comment, Conversation, ConversationMessage, PrdDocumentRecord, Slot, Ticket, WorktreeSession, WsClientEvent } from "../shared/schemas.ts";

import type { Store } from "./db/store.ts";
import { createLogger } from "./logger.ts";

const log = createLogger("hub");

interface ClientSocketData {
  kind: "client";
}

export type ClientSocket = ServerWebSocket<ClientSocketData>;

const AUDIT_PUSH_THROTTLE_MS = 2_000;

/**
 * Broadcasts state mutations to all connected UI clients. The UI never polls;
 * every mutation flows through here.
 */
export class ClientHub {
  private readonly clients = new Set<ClientSocket>();
  private auditOverviewSource: () => AuditOverview = () => EMPTY_AUDIT_OVERVIEW;
  private lastAuditPushAt = 0;
  private auditPushPending = false;
  private auditPushTimer: ReturnType<typeof setTimeout> | null = null;

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
      worktreeSessions: this.store.listWorktreeSessions(),
      automations: this.store.listAutomations(),
      conversations: this.store.listConversations(),
      prNotifications: this.store.listPrNotifications(),
      prNotificationSync: this.store.listPrNotificationSync(),
      audits: this.safeAuditOverview(),
    };
    ws.send(JSON.stringify(event));
  }

  private safeAuditOverview(): AuditOverview {
    try {
      return this.auditOverviewSource();
    } catch (error) {
      log.warn("aperçu des audits indisponible pour le snapshot", { error: error instanceof Error ? error.message : String(error) });
      return EMPTY_AUDIT_OVERVIEW;
    }
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
    this.pushPrNotifications();
  }

  pushComment(comment: Comment): void {
    this.broadcast({ type: "comment", comment });
    if (comment.author === "user") return;
    const ticket = this.store.getTicket(comment.ticketId);
    if (ticket !== null && isRemoteTicket(ticket)) this.pushTicket(ticket);
  }

  pushSlots(slots: Slot[]): void {
    this.broadcast({ type: "slots", slots });
  }

  pushWorktreeSessions(worktreeSessions: WorktreeSession[]): void {
    this.broadcast({ type: "worktree_sessions", worktreeSessions });
  }

  pushAutomations(automations: Automation[]): void {
    this.broadcast({ type: "automations", automations });
  }

  pushConversation(conversation: Conversation): void {
    this.broadcast({ type: "conversation", conversation });
  }

  pushConversationRemoved(conversationId: string): void {
    this.broadcast({ type: "conversation_removed", conversationId });
  }

  pushConversationMessage(message: ConversationMessage): void {
    this.broadcast({ type: "conversation_message", message });
  }

  pushPrdDocument(prd: PrdDocumentRecord): void {
    this.broadcast({ type: "prd_document", prd });
  }

  pushPrNotifications(): void {
    this.broadcast({ type: "pr_notifications", notifications: this.store.listPrNotifications(), sync: this.store.listPrNotificationSync() });
  }

  setAuditOverviewSource(source: () => AuditOverview): void {
    this.auditOverviewSource = source;
  }

  pushAudits(): void {
    this.auditPushPending = true;
    if (this.auditPushTimer !== null) return;
    const wait = this.lastAuditPushAt + AUDIT_PUSH_THROTTLE_MS - Date.now();
    if (wait <= 0) {
      this.flushAudits();
      return;
    }
    this.auditPushTimer = setTimeout(() => {
      this.auditPushTimer = null;
      this.flushAudits();
    }, wait);
  }

  private flushAudits(): void {
    if (!this.auditPushPending) return;
    this.auditPushPending = false;
    this.lastAuditPushAt = Date.now();
    this.broadcast({ type: "audits", audits: this.safeAuditOverview() });
  }

  pushNotification(title: string, body: string, ticketId?: string, sound?: boolean, soundKind?: NotificationSoundKind): void {
    this.broadcast({
      type: "notification",
      title,
      body,
      ...(ticketId ? { ticketId } : {}),
      ...(sound ? { sound } : {}),
      ...(soundKind ? { soundKind } : {}),
    });
  }
}
