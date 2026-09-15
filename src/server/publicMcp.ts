import { timingSafeEqual } from "node:crypto";
import { isIP } from "node:net";

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";

import { COLUMNS } from "../shared/constants.ts";
import {
  analyzeTicketsSchema,
  kindSchema,
  ticketSchema,
  updateTicketSchema,
} from "../shared/schemas.ts";

import { createTodoTicketInputSchema, TicketOperationError } from "./ticketOperations.ts";
import type { TicketOperations } from "./ticketOperations.ts";

const HTTP_BAD_REQUEST = 400;
const HTTP_UNAUTHORIZED = 401;
const HTTP_FORBIDDEN = 403;
const SERVER_NAME = "atelier";
const SERVER_VERSION = "1.0.0";
const TEXT_CONTENT_TYPE = "text";
const columnSchema = z.enum(COLUMNS);

const compactTicketSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  externalUrl: z.string().nullable(),
  project: z.string(),
  kind: kindSchema,
  column: columnSchema,
  stage: z.string().nullable(),
  error: z.string().nullable(),
  dependsOn: z.string().nullable(),
  createdAt: z.number(),
  updatedAt: z.number(),
});

const projectSchema = z.object({
  key: z.string(),
  label: z.string(),
  baseBranch: z.string(),
  defaultAutoMerge: z.boolean(),
  defaultAddScreenshots: z.boolean(),
  color: z.string().optional(),
});

const listProjectsInputSchema = z.object({});
const listProjectsOutputSchema = z.object({ projects: z.array(projectSchema), dryRun: z.boolean() });
const listTicketsInputSchema = z.object({
  project: z.string().optional(),
  column: columnSchema.optional(),
  limit: z.number().int().min(1).max(100).optional(),
  offset: z.number().int().min(0).optional(),
});
const listTicketsOutputSchema = z.object({
  tickets: z.array(compactTicketSchema),
  total: z.number().int().min(0),
  nextOffset: z.number().int().min(0).nullable(),
  dryRun: z.boolean(),
});
const createTodoTicketOutputSchema = z.object({
  created: z.boolean(),
  ticket: compactTicketSchema,
  dryRun: z.boolean(),
});
const analyzeTicketsInputSchema = analyzeTicketsSchema.strict();
const analyzeTicketsOutputSchema = z.object({
  started: z.number().int().min(0).describe("Number of accepted analysis requests."),
  startedIds: z.array(z.string()).describe("Identifiers accepted for background launch."),
  rejected: z.array(z.object({
    id: z.string(),
    reason: z.enum(["not_found", "busy"]),
  })).describe("Identifiers rejected because they are missing or already being processed."),
  dryRun: z.boolean(),
});
const updateTicketInputSchema = updateTicketSchema
  .extend({ ticketId: z.string().min(1).describe("Identifier of the TODO card to update.") })
  .strict()
  .refine((input) => Object.keys(input).length > 1, {
    message: "at least one option to update is required",
  });
const editableTicketSchema = ticketSchema.pick({
  id: true,
  title: true,
  description: true,
  externalUrl: true,
  project: true,
  kind: true,
  column: true,
  stage: true,
  prdEnabled: true,
  prDraft: true,
  autoMerge: true,
  stealth: true,
  directPush: true,
  addScreenshots: true,
  verifyFeature: true,
  argusMultiLoop: true,
  baseBranch: true,
  dependsOn: true,
  model: true,
  effort: true,
  implementerModel: true,
  implementerEffort: true,
  orchestrator: true,
  implementer: true,
  codexModel: true,
  codexEffort: true,
  codexFast: true,
  codexImplementerModel: true,
  codexImplementerEffort: true,
  codexImplementerFast: true,
  feasibilityEngine: true,
  feasibilityContext: true,
  triageStatus: true,
  updatedAt: true,
});
const updateTicketOutputSchema = z.object({ ticket: editableTicketSchema, dryRun: z.boolean() });
const startTicketInputSchema = z.object({ ticketId: z.string().min(1) });
const startTicketOutputSchema = z.object({
  status: z.enum(["queued", "already_started"]),
  ticket: compactTicketSchema,
  dryRun: z.boolean(),
});

const PUBLIC_TOOLS = [
  {
    name: "list_projects",
    description: "Lists the Atelier projects available for creating a card.",
    inputSchema: z.toJSONSchema(listProjectsInputSchema, { io: "input" }),
    outputSchema: z.toJSONSchema(listProjectsOutputSchema, { io: "output" }),
    annotations: { readOnlyHint: true },
  },
  {
    name: "list_tickets",
    description: "Lists a compact page of Atelier cards, filterable by project and column.",
    inputSchema: z.toJSONSchema(listTicketsInputSchema, { io: "input" }),
    outputSchema: z.toJSONSchema(listTicketsOutputSchema, { io: "output" }),
    annotations: { readOnlyHint: true },
  },
  {
    name: "create_todo_ticket",
    description: "Creates a passive card in TODO without starting an agent.",
    inputSchema: z.toJSONSchema(createTodoTicketInputSchema, { io: "input" }),
    outputSchema: z.toJSONSchema(createTodoTicketOutputSchema, { io: "output" }),
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
  },
  {
    name: "analyze_tickets",
    description: "Runs the feasibility study of existing cards in the background, without starting their implementation. Each card keeps its configured feasibility engine.",
    inputSchema: z.toJSONSchema(analyzeTicketsInputSchema, { io: "input" }),
    outputSchema: z.toJSONSchema(analyzeTicketsOutputSchema, { io: "output" }),
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false },
  },
  {
    name: "update_ticket",
    description: "Updates the content, project, branch, dependency, or agent and pipeline options of an existing TODO card. Omitted fields stay unchanged; null and false are applied explicitly. Does not move or start the card, and does not run an analysis.",
    inputSchema: z.toJSONSchema(updateTicketInputSchema, { io: "input" }),
    outputSchema: z.toJSONSchema(updateTicketOutputSchema, { io: "output" }),
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
  },
  {
    name: "start_ticket",
    description: "Requests the start of a TODO card and returns its queueing status.",
    inputSchema: z.toJSONSchema(startTicketInputSchema, { io: "input" }),
    outputSchema: z.toJSONSchema(startTicketOutputSchema, { io: "output" }),
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
  },
];

interface McpTextResult {
  [key: string]: unknown;
  content: Array<{ type: "text"; text: string }>;
  structuredContent?: Record<string, unknown>;
  isError?: boolean;
}

interface OutputValidator {
  safeParse(value: unknown):
    | { success: true; data: Record<string, unknown> }
    | { success: false };
}

function jsonResponse(status: number, error: string, headers?: HeadersInit): Response {
  return Response.json({ error }, { status, headers });
}

function isLoopbackHost(hostname: string): boolean {
  const normalized = hostname.startsWith("[") && hostname.endsWith("]")
    ? hostname.slice(1, -1)
    : hostname.toLowerCase();
  if (normalized === "localhost" || normalized === "::1") return true;
  if (isIP(normalized) === 4) return normalized.split(".")[0] === "127";
  const mappedIpv4 = normalized.startsWith("::ffff:") ? normalized.slice("::ffff:".length) : "";
  return isIP(mappedIpv4) === 4 && mappedIpv4.split(".")[0] === "127";
}

function effectivePort(url: URL): number {
  if (url.port !== "") return Number(url.port);
  return url.protocol === "https:" ? 443 : 80;
}

function parseHost(host: string): URL | null {
  try {
    const parsed = new URL(`http://${host}`);
    if (parsed.username !== "" || parsed.password !== "" || parsed.pathname !== "/") return null;
    return parsed;
  } catch {
    return null;
  }
}

function isAllowedHost(request: Request, port: number): boolean {
  const host = request.headers.get("host");
  if (host === null) return false;
  const parsed = parseHost(host);
  return parsed !== null && isLoopbackHost(parsed.hostname) && effectivePort(parsed) === port;
}

function isAllowedOrigin(request: Request, port: number): boolean {
  const origin = request.headers.get("origin");
  if (origin === null) return true;
  try {
    const parsed = new URL(origin);
    return parsed.protocol === "http:"
      && parsed.username === ""
      && parsed.password === ""
      && parsed.pathname === "/"
      && parsed.search === ""
      && parsed.hash === ""
      && isLoopbackHost(parsed.hostname)
      && effectivePort(parsed) === port;
  } catch {
    return false;
  }
}

function isAuthorized(request: Request, token: string): boolean {
  const authorization = request.headers.get("authorization");
  if (authorization === null || !authorization.startsWith("Bearer ")) return false;
  const supplied = Buffer.from(authorization.slice("Bearer ".length));
  const expected = Buffer.from(token);
  return supplied.length === expected.length && timingSafeEqual(supplied, expected);
}

function toolResult(schema: OutputValidator, value: unknown): McpTextResult {
  const parsed = schema.safeParse(value);
  if (!parsed.success) return toolError(new Error("invalid MCP output"));
  const structuredContent = parsed.data;
  return {
    content: [{ type: TEXT_CONTENT_TYPE, text: JSON.stringify(structuredContent) }],
    structuredContent,
  };
}

function toolError(error: unknown): McpTextResult {
  if (error instanceof TicketOperationError) {
    const result = { error: { code: error.code, message: error.message } };
    return {
      content: [{ type: TEXT_CONTENT_TYPE, text: JSON.stringify(result) }],
      isError: true,
    };
  }
  const result = { error: { code: "INTERNAL_ERROR", message: "internal server error" } };
  return {
    content: [{ type: TEXT_CONTENT_TYPE, text: JSON.stringify(result) }],
    isError: true,
  };
}

function invalidInput(message: string): McpTextResult {
  return toolError(new TicketOperationError("INVALID_INPUT", message));
}

function createMcpServer(operations: TicketOperations, dryRun: boolean): Server {
  const server = new Server(
    { name: SERVER_NAME, version: SERVER_VERSION },
    { capabilities: { tools: {} } },
  );

  server.setRequestHandler(ListToolsRequestSchema, () => ({ tools: PUBLIC_TOOLS }));
  server.setRequestHandler(CallToolRequestSchema, async (request): Promise<McpTextResult> => {
    const input = request.params.arguments ?? {};
    try {
      if (request.params.name === "list_projects") {
        const parsed = listProjectsInputSchema.safeParse(input);
        if (!parsed.success) return invalidInput(parsed.error.issues[0]?.message ?? "invalid input");
        return toolResult(listProjectsOutputSchema, { projects: operations.listProjects(), dryRun });
      }
      if (request.params.name === "list_tickets") {
        const parsed = listTicketsInputSchema.safeParse(input);
        if (!parsed.success) return invalidInput(parsed.error.issues[0]?.message ?? "invalid input");
        return toolResult(listTicketsOutputSchema, { ...operations.listTickets(parsed.data), dryRun });
      }
      if (request.params.name === "create_todo_ticket") {
        const parsed = createTodoTicketInputSchema.safeParse(input);
        if (!parsed.success) return invalidInput(parsed.error.issues[0]?.message ?? "invalid input");
        return toolResult(createTodoTicketOutputSchema, {
          ...operations.createTodoTicket(parsed.data),
          dryRun,
        });
      }
      if (request.params.name === "analyze_tickets") {
        const parsed = analyzeTicketsInputSchema.safeParse(input);
        if (!parsed.success) return invalidInput(parsed.error.issues[0]?.message ?? "invalid input");
        return toolResult(analyzeTicketsOutputSchema, {
          ...operations.analyzeTickets(parsed.data.ids),
          dryRun,
        });
      }
      if (request.params.name === "update_ticket") {
        const parsed = updateTicketInputSchema.safeParse(input);
        if (!parsed.success) return invalidInput(parsed.error.issues[0]?.message ?? "invalid input");
        const { ticketId, ...patch } = parsed.data;
        return toolResult(updateTicketOutputSchema, {
          ticket: operations.updateTicket(ticketId, patch, { requireTodo: true }),
          dryRun,
        });
      }
      if (request.params.name === "start_ticket") {
        const parsed = startTicketInputSchema.safeParse(input);
        if (!parsed.success) return invalidInput(parsed.error.issues[0]?.message ?? "invalid input");
        return toolResult(startTicketOutputSchema, {
          ...await operations.startTicket(parsed.data.ticketId),
          dryRun,
        });
      }
      return toolError(new TicketOperationError("NOT_FOUND", `unknown tool: ${request.params.name}`));
    } catch (error) {
      return toolError(error);
    }
  });
  return server;
}

export interface PublicMcpRequest {
  request: Request;
  peerAddress: string | null;
  port: number;
}

export class PublicMcpManager {
  private token: string;

  constructor(
    private readonly operations: TicketOperations,
    token: string,
    private readonly dryRun: boolean,
  ) {
    this.token = token;
  }

  setToken(token: string): void {
    this.token = token;
  }

  async handleRequest({ request, peerAddress, port }: PublicMcpRequest): Promise<Response> {
    if (peerAddress === null || !isLoopbackHost(peerAddress)) {
      return jsonResponse(HTTP_FORBIDDEN, "MCP access is restricted to the local machine");
    }
    if (!isAllowedHost(request, port) || !isAllowedOrigin(request, port)) {
      return jsonResponse(HTTP_FORBIDDEN, "MCP host or origin rejected");
    }
    if (!isAuthorized(request, this.token)) {
      return jsonResponse(HTTP_UNAUTHORIZED, "MCP authentication required", {
        "www-authenticate": "Bearer",
      });
    }
    if (request.method !== "POST") {
      return jsonResponse(HTTP_BAD_REQUEST, "only MCP POST requests are accepted");
    }

    const server = createMcpServer(this.operations, this.dryRun);
    const transport = new WebStandardStreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
      enableJsonResponse: true,
    });
    await server.connect(transport);
    return transport.handleRequest(request);
  }
}
