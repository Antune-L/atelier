import type { ServerWebSocket } from "bun";

import type { ChannelEvent, WorkerOutbound } from "../shared/schemas.ts";
import { workerInboundSchema } from "../shared/schemas.ts";

export interface WorkerSocketData {
  kind: "worker";
  ticketId: string | null;
  slotId: number | null;
}

export type WorkerSocket = ServerWebSocket<WorkerSocketData>;

export interface ToolCallContext {
  ticketId: string;
  slotId: number;
  callId: string;
  name: string;
  args: unknown;
}

export interface WorkerHubHandlers {
  onHello(ticketId: string, slotId: number): void;
  onToolCall(ctx: ToolCallContext): Promise<{ ok: boolean; result: string }>;
  onStop(ticketId: string, sessionId: string | null): void;
}

/**
 * Manages the outbound WS connections from worker.ts processes. Each worker
 * identifies by ticketId/slotId. Tool calls are answered with a tool_result;
 * channel events (ticket/answer/prd_validated/nudge) are pushed to the session.
 */
export class WorkerHub {
  private readonly byTicket = new Map<string, WorkerSocket>();
  private handlers: WorkerHubHandlers | null = null;

  setHandlers(handlers: WorkerHubHandlers): void {
    this.handlers = handlers;
  }

  isConnected(ticketId: string): boolean {
    return this.byTicket.has(ticketId);
  }

  handleClose(ws: WorkerSocket): void {
    if (ws.data.ticketId && this.byTicket.get(ws.data.ticketId) === ws) {
      this.byTicket.delete(ws.data.ticketId);
    }
  }

  async handleMessage(ws: WorkerSocket, raw: string): Promise<void> {
    const parsed = workerInboundSchema.safeParse(JSON.parse(raw));
    if (!parsed.success || !this.handlers) return;
    const message = parsed.data;

    if (message.type === "hello") {
      ws.data.ticketId = message.ticketId;
      ws.data.slotId = message.slotId;
      this.byTicket.set(message.ticketId, ws);
      this.handlers.onHello(message.ticketId, message.slotId);
      return;
    }

    if (message.type === "stop") {
      if (ws.data.ticketId) this.handlers.onStop(ws.data.ticketId, message.sessionId);
      return;
    }

    // tool_call
    if (!ws.data.ticketId || ws.data.slotId === null) return;
    const result = await this.handlers.onToolCall({
      ticketId: ws.data.ticketId,
      slotId: ws.data.slotId,
      callId: message.id,
      name: message.name,
      args: message.args,
    });
    this.sendOutbound(ws, { type: "tool_result", id: message.id, ok: result.ok, result: result.result });
  }

  /** Push a channel event to the live session (delivered as an MCP notification). */
  sendEvent(ticketId: string, event: ChannelEvent): boolean {
    const ws = this.byTicket.get(ticketId);
    if (!ws) return false;
    this.sendOutbound(ws, { type: "event", event });
    return true;
  }

  private sendOutbound(ws: WorkerSocket, message: WorkerOutbound): void {
    ws.send(JSON.stringify(message));
  }
}
