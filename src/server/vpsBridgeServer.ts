import { chmodSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";

import type { Server } from "bun";
import type { ZodType } from "zod";

import { getErrorMessage } from "../shared/errors.ts";
import {
  BRIDGE_MAX_REQUEST_BYTES,
  BRIDGE_PROTOCOL_VERSION,
  bridgeCataloguePublishInputSchema,
  bridgeCreateTicketInputSchema,
  bridgeEmptyInputSchema,
  bridgeOutboxAckInputSchema,
  isBridgeOp,
} from "../shared/vpsBridge.ts";
import type { BridgeEnvelope, BridgeErrorCode, BridgeOp } from "../shared/vpsBridge.ts";

import type { Store } from "./db/store.ts";
import { createLogger } from "./logger.ts";
import { acknowledgeMacOutbox, fetchMacOutbox, publishMacCatalogue } from "./macOutbox.ts";
import { readBoundedBody } from "./remoteMcp/listener.ts";
import { TicketOperationError } from "./ticketOperations.ts";
import type { TicketOperations } from "./ticketOperations.ts";

// NOTE: deploy/vps/kanban-bridge hardcodes /run/kanban/bridge.sock, next to KANBAN_SOCKET=/run/kanban/ui.sock.
const BRIDGE_SOCKET_FILENAME = "bridge.sock";
const BRIDGE_SOCKET_MODE = 0o660;
const BRIDGE_OP_PATH_PREFIX = "/ops/";
const ALLOWED_METHOD = "POST";
const HTTP_NOT_FOUND = 404;
const HTTP_METHOD_NOT_ALLOWED = 405;
const HTTP_PAYLOAD_TOO_LARGE = 413;

const log = createLogger("vps-bridge");

class BridgeOpError extends Error {
  constructor(
    readonly code: BridgeErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "BridgeOpError";
  }
}

type BridgeOpHandler = (input: unknown) => unknown;

export interface BridgeHandlerDeps {
  operations: TicketOperations;
  store: Store;
}

function parseInput<T>(schema: ZodType<T>, input: unknown): T {
  const parsed = schema.safeParse(input);
  if (!parsed.success) throw new BridgeOpError("INVALID_INPUT", parsed.error.issues[0]?.message ?? "invalid input");
  return parsed.data;
}

// NOTE: the op registry; adding an op is one entry in BRIDGE_OPS plus its handler here (the Record type enforces both).
function createBridgeOpHandlers({ operations, store }: BridgeHandlerDeps): Record<BridgeOp, BridgeOpHandler> {
  return {
    version: (input) => {
      parseInput(bridgeEmptyInputSchema, input);
      return { protocolVersion: BRIDGE_PROTOCOL_VERSION };
    },
    list_projects: (input) => {
      parseInput(bridgeEmptyInputSchema, input);
      const projects = operations.listProjects()
        .filter((project) => !project.hidden)
        .map(({ key, label, baseBranch, vcsProvider }) => ({ key, label, baseBranch, vcsProvider }));
      return { projects };
    },
    create_ticket: (input) => {
      const { requestId, project, title, description, analysis } = parseInput(bridgeCreateTicketInputSchema, input);
      // NOTE: an ordinary unlocked TODO card with the project defaults, exactly like one created on this board.
      const result = operations.createTodoTicket(
        { requestId, project, title, description },
        { afterCreate: analysis === "analyze" ? "analyze" : "none" },
      );
      return { created: result.created, ticket: { id: result.ticket.id, title: result.ticket.title, project: result.ticket.project } };
    },
    catalogue_publish: (input) => publishMacCatalogue(store, parseInput(bridgeCataloguePublishInputSchema, input)),
    outbox_fetch: (input) => {
      parseInput(bridgeEmptyInputSchema, input);
      return { items: fetchMacOutbox(store) };
    },
    outbox_ack: (input) => ({ acknowledged: acknowledgeMacOutbox(store, parseInput(bridgeOutboxAckInputSchema, input).acks) }),
  };
}

function envelopeResponse(envelope: BridgeEnvelope, status?: number): Response {
  return Response.json(envelope, status === undefined ? undefined : { status });
}

function errorEnvelope(code: BridgeErrorCode, message: string): BridgeEnvelope {
  return { ok: false, error: { code, message } };
}

function parseBody(body: string): unknown {
  if (body.trim() === "") return {};
  try {
    return JSON.parse(body);
  } catch {
    throw new BridgeOpError("INVALID_INPUT", "request body is not valid JSON");
  }
}

export function createBridgeHandler(deps: BridgeHandlerDeps): (request: Request) => Promise<Response> {
  const handlers = createBridgeOpHandlers(deps);
  return async (request) => {
    const pathname = new URL(request.url).pathname;
    const op = pathname.startsWith(BRIDGE_OP_PATH_PREFIX) ? pathname.slice(BRIDGE_OP_PATH_PREFIX.length) : "";
    if (!isBridgeOp(op)) return envelopeResponse(errorEnvelope("UNKNOWN_OP", "unknown bridge operation"), HTTP_NOT_FOUND);
    if (request.method !== ALLOWED_METHOD) return envelopeResponse(errorEnvelope("INVALID_INPUT", "method not allowed"), HTTP_METHOD_NOT_ALLOWED);
    const body = await readBoundedBody(request, BRIDGE_MAX_REQUEST_BYTES);
    if (body === null) return envelopeResponse(errorEnvelope("INVALID_INPUT", "payload too large"), HTTP_PAYLOAD_TOO_LARGE);
    try {
      const result = handlers[op](parseBody(body));
      log.info("opération du pont exécutée", { op });
      return envelopeResponse({ ok: true, result });
    } catch (error) {
      if (error instanceof BridgeOpError) return envelopeResponse(errorEnvelope(error.code, error.message));
      if (error instanceof TicketOperationError) return envelopeResponse(errorEnvelope(error.code, error.message));
      log.error("opération du pont échouée", { op, error: getErrorMessage(error) });
      return envelopeResponse(errorEnvelope("INTERNAL", "internal error"));
    }
  };
}

export interface BridgeListener {
  stop(): Promise<void>;
}

// NOTE(ali): a dedicated Unix socket; cloudflared and the TCP listener only reach the UI socket, so neither ever routes a bridge op.
export function startBridgeListener(uiSocketPath: string, deps: BridgeHandlerDeps): BridgeListener {
  const socketPath = join(dirname(uiSocketPath), BRIDGE_SOCKET_FILENAME);
  rmSync(socketPath, { force: true });
  const handle = createBridgeHandler(deps);
  const server: Server<undefined> = Bun.serve({ unix: socketPath, maxRequestBodySize: BRIDGE_MAX_REQUEST_BYTES, fetch: handle });
  chmodSync(socketPath, BRIDGE_SOCKET_MODE);
  log.info("socket du pont Mac prêt", { socketPath });
  return {
    async stop() {
      await server.stop(true);
      rmSync(socketPath, { force: true });
    },
  };
}
