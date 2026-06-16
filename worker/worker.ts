/**
 * worker.ts — MCP channel server spawned by each Claude Code session.
 *
 * - Speaks MCP over stdio to its parent Claude session.
 * - Declares the research-preview `claude/channel` experimental capability so the
 *   backend can push sequential notification events (ticket / answer / prd_validated / nudge)
 *   into the session.
 * - Exposes 5 tools (update_stage, ask_user, submit_prd, done, fail) that forward to the backend.
 * - Connects OUTBOUND over WebSocket to the backend (BACKEND_WS), identifying by TICKET_ID/SLOT_ID.
 *   It opens no listening port. Reconnects on drop so a backend restart self-heals.
 *
 * No type casting: every external payload is validated with zod.
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";

import type { ChannelEvent, WorkerToolName } from "../src/shared/protocol.ts";
import { WORKER_TOOLS, isWorkerToolName, workerOutboundSchema } from "../src/shared/protocol.ts";

const WORKER_VERSION = "0.0.0";
const RECONNECT_DELAY_MS = 1500;
// Claude Code's channel handler only accepts this exact method, with
// params { content: string, meta?: Record<string, string> } — content is
// injected verbatim as a prompt into the session.
const CHANNEL_NOTIFICATION_METHOD = "notifications/claude/channel";

const envSchema = z.object({
  TICKET_ID: z.string().min(1),
  SLOT_ID: z.coerce.number().int(),
  BACKEND_WS: z.string().url(),
});

const env = envSchema.parse({
  TICKET_ID: process.env.TICKET_ID,
  SLOT_ID: process.env.SLOT_ID,
  BACKEND_WS: process.env.BACKEND_WS,
});

// The wire protocol (WS frames, tool registry, channel events) is the single source of truth
// in src/shared/protocol.ts. This worker is bundled standalone, so it imports that module by
// relative path; everything below derives from it (no hand-kept copies).

// ---- backend bridge ----

class BackendBridge {
  private ws: WebSocket | null = null;
  private readonly pending = new Map<string, (result: { ok: boolean; result: string }) => void>();
  private callSeq = 0;

  constructor(private readonly onEvent: (event: ChannelEvent) => Promise<void>) {}

  connect(): void {
    const socket = new WebSocket(env.BACKEND_WS);
    this.ws = socket;

    socket.addEventListener("open", () => {
      socket.send(JSON.stringify({ type: "hello", ticketId: env.TICKET_ID, slotId: env.SLOT_ID }));
    });

    socket.addEventListener("message", (msg) => {
      const text = typeof msg.data === "string" ? msg.data : "";
      const parsed = workerOutboundSchema.safeParse(JSON.parse(text));
      if (!parsed.success) return;
      const data = parsed.data;
      if (data.type === "tool_result") {
        const resolver = this.pending.get(data.id);
        if (resolver) {
          this.pending.delete(data.id);
          resolver({ ok: data.ok, result: data.result });
        }
        return;
      }
      void this.onEvent(data.event);
    });

    const reconnect = (): void => {
      if (this.ws === socket) this.ws = null;
      setTimeout(() => this.connect(), RECONNECT_DELAY_MS);
    };
    socket.addEventListener("close", reconnect);
    socket.addEventListener("error", () => socket.close());
  }

  callTool(name: WorkerToolName, args: unknown): Promise<{ ok: boolean; result: string }> {
    return new Promise((resolve) => {
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
        resolve({ ok: false, result: "backend injoignable" });
        return;
      }
      this.callSeq += 1;
      const id = `${env.TICKET_ID}-${this.callSeq}`;
      this.pending.set(id, resolve);
      this.ws.send(JSON.stringify({ type: "tool_call", id, name, args }));
    });
  }

  notifyStop(sessionId: string | null): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    this.ws.send(JSON.stringify({ type: "stop", sessionId }));
  }
}

// ---- MCP server ----

const server = new Server(
  { name: "kanban-worker", version: WORKER_VERSION },
  {
    capabilities: {
      tools: {},
      experimental: { "claude/channel": {} },
    },
  },
);

/** Render a backend event as the prompt text injected into the session. */
function renderEventContent(event: ChannelEvent): string {
  switch (event.type) {
    case "ticket":
      return event.payload;
    case "answer":
      return `Réponse de l'utilisateur (question ${event.questionId}) : ${event.answer}`;
    case "prd_validated":
      return `PRD validé par l'utilisateur. ${event.note}`;
    case "nudge":
      return event.message;
    case "user_comment":
      return `Commentaire de l'utilisateur (à prendre en compte dans le travail en cours) : ${event.body}`;
  }
}

const bridge = new BackendBridge(async (event) => {
  // Forward backend → session as a channel notification on the live MCP connection.
  await server.notification({
    method: CHANNEL_NOTIFICATION_METHOD,
    params: { content: renderEventContent(event), meta: { type: event.type } },
  });
});

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  // Advertise the real JSON Schema per tool: without declared `properties` the client
  // can't tell that e.g. `submit_feasibility.results` is an array, so it serializes nested
  // payloads as a JSON *string* and zod then rejects them ("Arguments invalides").
  tools: WORKER_TOOLS.map((t) => ({
    name: t.name,
    description: t.description,
    inputSchema: zodToJsonSchema(t.argsSchema, { target: "openApi3", $refStrategy: "none" }),
  })),
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  if (!isWorkerToolName(name)) {
    return { isError: true, content: [{ type: "text", text: `Tool inconnu: ${name}` }] };
  }
  const def = WORKER_TOOLS.find((t) => t.name === name);
  if (!def) {
    return { isError: true, content: [{ type: "text", text: `Tool inconnu: ${name}` }] };
  }
  const parsed = def.argsSchema.safeParse(args ?? {});
  if (!parsed.success) {
    return { isError: true, content: [{ type: "text", text: `Arguments invalides: ${parsed.error.message}` }] };
  }
  const outcome = await bridge.callTool(name, parsed.data);
  return {
    isError: !outcome.ok,
    content: [{ type: "text", text: outcome.result || (outcome.ok ? "ok" : "échec") }],
  };
});

// Claude injects channel notifications only AFTER it has emitted `initialized`.
// The backend pushes the contract the instant the worker's WS connects, so defer
// connecting until init — otherwise the first notification (the contract) races
// ahead of readiness and Claude silently drops it, leaving the session idle.
server.oninitialized = (): void => {
  bridge.connect();
};

const transport = new StdioServerTransport();
await server.connect(transport);
