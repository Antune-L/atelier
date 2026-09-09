import { randomUUID } from "node:crypto";

import { z } from "zod";

import { isWorkerToolName, WORKER_TOOLS } from "../shared/protocol.ts";
import type { WorkerToolName } from "../shared/protocol.ts";

import { createLogger } from "./logger.ts";

export interface WorkerMcpHandlers {
  allowedTools?: readonly WorkerToolName[];
  isActive?(): boolean;
  onToolCall(name: WorkerToolName, args: unknown): Promise<{ ok: boolean; result: string }>;
}

const log = createLogger("worker-mcp");

const JSONRPC_METHOD_NOT_FOUND = -32601;
const JSONRPC_INVALID_REQUEST = -32600;

const HTTP_ACCEPTED = 202;
const HTTP_UNAUTHORIZED = 401;
const HTTP_METHOD_NOT_ALLOWED = 405;

const BEARER_PREFIX = "Bearer ";
const DEFAULT_PROTOCOL_VERSION = "2025-03-26";

/** Above this, a tool call is worth flagging: the incident that motivated this instrumentation. */
const SLOW_TOOL_CALL_MS = 15_000;

const requestSchema = z.object({
  jsonrpc: z.literal("2.0"),
  id: z.union([z.string(), z.number()]).optional(),
  method: z.string(),
  params: z.unknown().optional(),
});

const toolCallParamsSchema = z.object({
  name: z.string(),
  arguments: z.unknown().optional(),
});

const initializeParamsSchema = z.object({
  protocolVersion: z.string().default(DEFAULT_PROTOCOL_VERSION),
});

function rpcResult(id: string | number, result: unknown): Response {
  return Response.json({ jsonrpc: "2.0", id, result });
}

function rpcError(id: string | number | null, code: number, message: string): Response {
  return Response.json({ jsonrpc: "2.0", id, error: { code, message } });
}

/**
 * Backend side of the codexProvider worker tools: a streamable-HTTP MCP endpoint served by the
 * backend itself. A Codex session has no in-process MCP handler API (unlike Claude's
 * `createSdkMcpServer`), but its client speaks HTTP MCP natively — each session's codex is pointed
 * at this endpoint via `mcp_servers.kanban.url`, authenticated by a per-session bearer token so a
 * stray request can't reach another ticket's tools. Serving in-process (rather than a stdio-MCP
 * subprocess Codex spawns) means there is no script file to ship in the packaged .app and no
 * interpreter to resolve from a bare GUI PATH.
 *
 * Codex's client only POSTs single JSON-RPC messages and accepts plain JSON responses, so no SSE
 * stream and no Mcp-Session-Id bookkeeping are needed (verified live against codex 0.144).
 */
export class WorkerMcpManager {
  private readonly registry = new Map<string, WorkerMcpHandlers>();

  /** Register a session's onToolCall before spawning its Codex session. */
  register(token: string, handlers: WorkerMcpHandlers): void {
    if (this.registry.has(token)) throw new Error("collision de jeton MCP");
    this.registry.set(token, handlers);
  }

  /** Deregister on session close (idempotent). */
  unregister(token: string): void {
    this.registry.delete(token);
  }

  async handleRequest(request: Request): Promise<Response> {
    const auth = request.headers.get("authorization") ?? "";
    const token = auth.startsWith(BEARER_PREFIX) ? auth.slice(BEARER_PREFIX.length) : "";
    const handlers = token ? this.registry.get(token) : undefined;
    if (!handlers) {
      log.warn("token MCP inconnu, requête refusée");
      return new Response("token inconnu", { status: HTTP_UNAUTHORIZED });
    }
    if (handlers.isActive && !handlers.isActive()) {
      return new Response("session MCP révoquée", { status: HTTP_UNAUTHORIZED });
    }
    if (request.method !== "POST") return new Response(null, { status: HTTP_METHOD_NOT_ALLOWED });

    let raw: unknown;
    try {
      raw = await request.json();
    } catch {
      return rpcError(null, JSONRPC_INVALID_REQUEST, "JSON invalide");
    }
    const parsed = requestSchema.safeParse(raw);
    if (!parsed.success) return rpcError(null, JSONRPC_INVALID_REQUEST, "requête JSON-RPC invalide");
    const { id, method, params } = parsed.data;

    // Notifications (no id) expect no body — 202 per the streamable HTTP transport spec.
    if (id === undefined) return new Response(null, { status: HTTP_ACCEPTED });

    if (method === "initialize") {
      const init = initializeParamsSchema.safeParse(params ?? {});
      return rpcResult(id, {
        protocolVersion: init.success ? init.data.protocolVersion : DEFAULT_PROTOCOL_VERSION,
        capabilities: { tools: {} },
        serverInfo: { name: "kanban", version: "0.0.0" },
      });
    }
    if (method === "tools/list") {
      const allowed = handlers.allowedTools ? new Set(handlers.allowedTools) : null;
      return rpcResult(id, {
        tools: WORKER_TOOLS.filter((entry) => allowed === null || allowed.has(entry.name)).map(
          (entry) => ({
            name: entry.name,
            description: entry.description,
            // io: "input" keeps defaulted fields optional (output mode would mark them required).
            inputSchema: z.toJSONSchema(entry.argsSchema, { io: "input" }),
          }),
        ),
      });
    }
    if (method === "tools/call") {
      const call = toolCallParamsSchema.safeParse(params);
      if (!call.success) return rpcError(id, JSONRPC_INVALID_REQUEST, "paramètres tools/call invalides");
      if (!isWorkerToolName(call.data.name)) {
        return rpcError(id, JSONRPC_METHOD_NOT_FOUND, `outil inconnu : ${call.data.name}`);
      }
      if (handlers.allowedTools && !handlers.allowedTools.includes(call.data.name)) {
        return rpcError(id, JSONRPC_METHOD_NOT_FOUND, `outil interdit pour cette session : ${call.data.name}`);
      }
      const tool = call.data.name;
      const callId = randomUUID();
      const startedAt = Date.now();
      let outcome: { ok: boolean; result: string };
      try {
        outcome = await handlers.onToolCall(tool, call.data.arguments ?? {});
      } catch (error) {
        const elapsedMs = Date.now() - startedAt;
        log.error("appel d'outil échoué", {
          tool,
          callId,
          elapsedMs,
          errorName: error instanceof Error ? error.name : "unknown",
        });
        if (this.registry.get(token) !== handlers || (handlers.isActive && !handlers.isActive())) {
          return new Response("session MCP révoquée", { status: HTTP_UNAUTHORIZED });
        }
        return rpcResult(id, {
          content: [{ type: "text", text: `Erreur interne pendant ${tool} (référence ${callId}).` }],
          isError: true,
        });
      }
      const elapsedMs = Date.now() - startedAt;
      if (elapsedMs >= SLOW_TOOL_CALL_MS) log.warn("appel d'outil lent", { tool, callId, elapsedMs });
      else log.debug("appel d'outil terminé", { tool, callId, elapsedMs });
      if (this.registry.get(token) !== handlers || (handlers.isActive && !handlers.isActive())) {
        return new Response("session MCP révoquée", { status: HTTP_UNAUTHORIZED });
      }
      return rpcResult(id, {
        content: [{ type: "text", text: outcome.result || (outcome.ok ? "ok" : "échec") }],
        isError: !outcome.ok,
      });
    }
    if (method === "ping") return rpcResult(id, {});
    return rpcError(id, JSONRPC_METHOD_NOT_FOUND, `méthode inconnue : ${method}`);
  }
}
