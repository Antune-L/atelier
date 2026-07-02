/**
 * The codexProvider worker-tool bridge subprocess.
 *
 * Codex has no in-process MCP handler API (unlike Claude's `createSdkMcpServer`): it only talks MCP
 * to an external server process, configured per-session via `mcp_servers.kanban` (see
 * codexProvider.ts). This script IS that process — Codex spawns it and speaks MCP to it over stdio.
 * Each tool call is forwarded over one WebSocket connection back into the backend's `onToolCall` for
 * this ticket, keyed by a per-session token (`KANBAN_BRIDGE_TOKEN`) so a stray connection can't reach
 * another ticket's tools. The backend address is read from `KANBAN_BRIDGE_WS_URL`.
 *
 * Standalone entrypoint — run directly by Codex (`bun codexWorkerMcpServer.ts`), never imported.
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { nanoid } from "nanoid";
import { z } from "zod";

import { WORKER_TOOLS } from "../../shared/protocol.ts";

if (!process.env.KANBAN_BRIDGE_TOKEN || !process.env.KANBAN_BRIDGE_WS_URL) {
  console.error("KANBAN_BRIDGE_TOKEN / KANBAN_BRIDGE_WS_URL manquants");
  process.exit(1);
}
const WS_URL: string = process.env.KANBAN_BRIDGE_WS_URL;

/** Backend round-trip is bounded so a dead bridge connection never hangs a Codex tool call forever. */
const CALL_TIMEOUT_MS = 60_000;

interface PendingCall {
  resolve: (outcome: { ok: boolean; result: string }) => void;
  reject: (error: Error) => void;
}

const pending = new Map<string, PendingCall>();
let socket: WebSocket | null = null;
let connecting: Promise<WebSocket> | null = null;

function connect(): Promise<WebSocket> {
  if (socket && socket.readyState === WebSocket.OPEN) return Promise.resolve(socket);
  if (connecting) return connecting;
  connecting = new Promise((resolve, reject) => {
    const ws = new WebSocket(WS_URL);
    ws.addEventListener("open", () => {
      socket = ws;
      connecting = null;
      resolve(ws);
    });
    ws.addEventListener("message", (event) => {
      const text = typeof event.data === "string" ? event.data : "";
      if (!text) return;
      let message: { callId: string; ok: boolean; result: string };
      try {
        message = JSON.parse(text);
      } catch {
        return;
      }
      const call = pending.get(message.callId);
      if (!call) return;
      pending.delete(message.callId);
      call.resolve({ ok: message.ok, result: message.result });
    });
    const onTerminate = (): void => {
      socket = null;
      connecting = null;
      for (const [callId, call] of pending) {
        pending.delete(callId);
        call.reject(new Error("connexion au backend perdue"));
      }
    };
    ws.addEventListener("close", onTerminate);
    ws.addEventListener("error", () => {
      reject(new Error("échec de connexion au bridge backend"));
      onTerminate();
    });
  });
  return connecting;
}

async function callBackend(name: string, args: unknown): Promise<{ ok: boolean; result: string }> {
  const ws = await connect();
  const callId = nanoid(12);
  const outcome = new Promise<{ ok: boolean; result: string }>((resolve, reject) => {
    pending.set(callId, { resolve, reject });
    const timer = setTimeout(() => {
      if (pending.delete(callId)) reject(new Error("délai dépassé en attendant le backend"));
    }, CALL_TIMEOUT_MS);
    timer.unref();
  });
  ws.send(JSON.stringify({ callId, name, args }));
  return outcome;
}

// Low-level Server API on purpose: the SDK's zod-compat layer types against ITS OWN nested zod copy,
// which conflicts with the repo's zod at the type level. Tools are advertised as plain JSON Schemas
// (z.toJSONSchema) and args are forwarded as-is — the backend coordinator re-validates them anyway.
const server = new Server({ name: "kanban", version: "0.0.0" }, { capabilities: { tools: {} } });

server.setRequestHandler(ListToolsRequestSchema, () => ({
  tools: WORKER_TOOLS.map((entry) => ({
    name: entry.name,
    description: entry.description,
    // io: "input" keeps defaulted fields optional (output mode would mark them required).
    inputSchema: z.toJSONSchema(entry.argsSchema, { io: "input" }),
  })),
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  try {
    const outcome = await callBackend(request.params.name, request.params.arguments ?? {});
    return {
      content: [{ type: "text", text: outcome.result || (outcome.ok ? "ok" : "échec") }],
      isError: !outcome.ok,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { content: [{ type: "text", text: message }], isError: true };
  }
});

await server.connect(new StdioServerTransport());
