import type { ServerWebSocket } from "bun";

import { createLogger } from "./logger.ts";

export interface WorkerBridgeSocketData {
  kind: "worker-bridge";
  /** Per-session token, validated against the registry on open (query param `token`). */
  token: string;
}

export type WorkerBridgeSocket = ServerWebSocket<WorkerBridgeSocketData>;

export interface WorkerBridgeHandlers {
  onToolCall(name: string, args: unknown): Promise<{ ok: boolean; result: string }>;
}

interface BridgeRequest {
  callId: string;
  name: string;
  args: unknown;
}

const log = createLogger("worker-bridge");

/**
 * Backend side of the codexProvider worker-tool bridge. A Codex session has no in-process MCP, so
 * codexWorkerMcpServer.ts (a stdio-MCP subprocess Codex spawns) forwards every tool call over one WS
 * connection back into this ticket's `onToolCall` closure — keyed by a per-session token so a stray
 * connection can't reach another ticket's tools.
 */
export class WorkerBridgeManager {
  private readonly registry = new Map<string, WorkerBridgeHandlers>();

  /** Register a session's onToolCall before spawning its bridge subprocess. */
  register(token: string, handlers: WorkerBridgeHandlers): void {
    this.registry.set(token, handlers);
  }

  /** Deregister on session close (idempotent). */
  unregister(token: string): void {
    this.registry.delete(token);
  }

  handleOpen(ws: WorkerBridgeSocket): void {
    if (!this.registry.has(ws.data.token)) {
      log.warn("token de bridge inconnu, fermeture", { token: ws.data.token });
      ws.close(4001, "token inconnu");
    }
  }

  handleMessage(ws: WorkerBridgeSocket, text: string): void {
    void this.dispatch(ws, text);
  }

  /** No per-connection state to release; the token registry is owned by codexProvider's close(). */
  handleClose(_ws: WorkerBridgeSocket): void {}

  private async dispatch(ws: WorkerBridgeSocket, text: string): Promise<void> {
    let message: BridgeRequest;
    try {
      message = JSON.parse(text);
    } catch {
      return;
    }
    const handlers = this.registry.get(ws.data.token);
    if (!handlers) return;
    const outcome = await handlers.onToolCall(message.name, message.args);
    try {
      ws.send(JSON.stringify({ callId: message.callId, ...outcome }));
    } catch {
      // Bridge subprocess is gone; nothing to deliver to.
    }
  }
}
