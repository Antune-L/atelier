import type { Server } from "bun";

import { getErrorMessage } from "../../shared/errors.ts";
import { createLogger } from "../logger.ts";
import { serveStatelessMcp } from "../publicMcp.ts";
import { isLoopbackHost } from "../requestGuard.ts";

import { AccessJwtVerifier } from "./accessJwt.ts";
import type { RemoteMcpConfig } from "./config.ts";
import { createRemoteMcpServer } from "./tools.ts";
import type { RemoteMcpToolsDeps } from "./tools.ts";

const BIND_HOSTNAME = "127.0.0.1";
const MCP_PATH = "/mcp";
const ALLOWED_METHOD = "POST";
const ACCESS_ASSERTION_HEADER = "cf-access-jwt-assertion";
const MAX_BODY_BYTES = 256 * 1024;
const HTTP_BAD_REQUEST = 400;
const HTTP_UNAUTHORIZED = 401;
const HTTP_FORBIDDEN = 403;
const HTTP_NOT_FOUND = 404;
const HTTP_METHOD_NOT_ALLOWED = 405;
const HTTP_PAYLOAD_TOO_LARGE = 413;
const JSON_RPC_PARSE_ERROR = -32700;
const JSON_RPC_INVALID_REQUEST = -32600;

const log = createLogger("remote-mcp");

export interface RemoteMcpListener {
  port: number;
  stop(): Promise<void>;
}

function errorResponse(status: number, error: string, headers?: HeadersInit): Response {
  return Response.json({ error }, { status, headers });
}

function jsonRpcError(code: number, message: string): Response {
  return Response.json({ jsonrpc: "2.0", id: null, error: { code, message } }, { status: HTTP_BAD_REQUEST });
}

export async function readBoundedBody(request: Request, maxBytes = MAX_BODY_BYTES): Promise<string | null> {
  const declared = Number(request.headers.get("content-length") ?? 0);
  if (!Number.isFinite(declared) || declared > maxBytes) return null;
  const reader = request.body?.getReader();
  if (reader === undefined) return "";
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > maxBytes) {
      await reader.cancel();
      return null;
    }
    chunks.push(value);
  }
  return new TextDecoder().decode(Buffer.concat(chunks));
}

function parseSingleMessage(body: string): { message: unknown } | { error: Response } {
  let message: unknown;
  try {
    message = JSON.parse(body);
  } catch {
    return { error: jsonRpcError(JSON_RPC_PARSE_ERROR, "Parse error") };
  }
  if (Array.isArray(message)) return { error: jsonRpcError(JSON_RPC_INVALID_REQUEST, "Batch requests are not supported") };
  if (typeof message !== "object" || message === null) return { error: jsonRpcError(JSON_RPC_INVALID_REQUEST, "Invalid Request") };
  return { message };
}

export function createRemoteMcpHandler(config: RemoteMcpConfig, deps: RemoteMcpToolsDeps, verifier: AccessJwtVerifier) {
  return async (request: Request, peerAddress: string | null): Promise<Response> => {
    if (peerAddress === null || !isLoopbackHost(peerAddress)) return errorResponse(HTTP_FORBIDDEN, "forbidden");
    if (request.headers.get("host")?.toLowerCase() !== config.hostname) return errorResponse(HTTP_FORBIDDEN, "forbidden");
    if (new URL(request.url).pathname !== MCP_PATH) return errorResponse(HTTP_NOT_FOUND, "not found");
    if (request.method !== ALLOWED_METHOD) return errorResponse(HTTP_METHOD_NOT_ALLOWED, "method not allowed", { allow: ALLOWED_METHOD });
    const body = await readBoundedBody(request);
    if (body === null) return errorResponse(HTTP_PAYLOAD_TOO_LARGE, "payload too large");
    if (!(await verifier.verify(request.headers.get(ACCESS_ASSERTION_HEADER)))) {
      log.warn("appel MCP distant refusé : preuve Access invalide ou absente");
      return errorResponse(HTTP_UNAUTHORIZED, "unauthorized");
    }
    const parsed = parseSingleMessage(body);
    if ("error" in parsed) return parsed.error;
    return serveStatelessMcp(createRemoteMcpServer(deps), request, parsed.message);
  };
}

/** Starts the dedicated remote MCP listener on 127.0.0.1; null when the port cannot be bound. */
export function startRemoteMcpListener(config: RemoteMcpConfig, deps: RemoteMcpToolsDeps): RemoteMcpListener | null {
  const verifier = new AccessJwtVerifier({ teamDomain: config.teamDomain, aud: config.aud });
  const handle = createRemoteMcpHandler(config, deps, verifier);
  let server: Server<undefined>;
  try {
    server = Bun.serve({
      hostname: BIND_HOSTNAME,
      port: config.port,
      maxRequestBodySize: MAX_BODY_BYTES,
      fetch: (request, srv) => handle(request, srv.requestIP(request)?.address ?? null),
    });
  } catch (error) {
    log.error("écoute MCP distante non démarrée", { port: config.port, error: getErrorMessage(error) });
    return null;
  }
  log.info("écoute MCP distante prête", { hostname: BIND_HOSTNAME, port: server.port });
  return {
    port: server.port ?? config.port,
    stop: () => server.stop(true),
  };
}
