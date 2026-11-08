import { timingSafeEqual } from "node:crypto";

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import type { CallToolRequest } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";

import { COLUMNS, REVIEW_OUTCOMES, VCS_PROVIDERS } from "../shared/constants.ts";
import {
  analyzeTicketsSchema,
  commentSchema,
  createCommentSchema,
  kindSchema,
  openPrSchema,
  ticketSchema,
  updateTicketSchema,
} from "../shared/schemas.ts";

import type { AgentCoordinator } from "./agents/coordinator.ts";
import { effectivePort, isLoopbackHost, parseHost } from "./requestGuard.ts";
import { REVIEW_PUBLICATION_EVENTS } from "./system/types.ts";
import { createReviewTicketInputSchema, createTodoTicketInputSchema, PullRequestListingError, TicketOperationError } from "./ticketOperations.ts";
import type { TicketOperations } from "./ticketOperations.ts";

const HTTP_BAD_REQUEST = 400;
const HTTP_UNAUTHORIZED = 401;
const HTTP_FORBIDDEN = 403;
const SERVER_NAME = "atelier";
const SERVER_VERSION = "1.0.0";
const TEXT_CONTENT_TYPE = "text";
const RECENT_COMMENT_LIMIT = 20;
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
  autonomous: ticketSchema.shape.autonomous,
  autonomousDelivery: ticketSchema.shape.autonomousDelivery,
  autonomousMaxCorrections: ticketSchema.shape.autonomousMaxCorrections,
  autonomousTimeoutMinutes: ticketSchema.shape.autonomousTimeoutMinutes,
  autonomousMaxStarts: ticketSchema.shape.autonomousMaxStarts,
  autonomousFinalizationMinutes: ticketSchema.shape.autonomousFinalizationMinutes,
  autonomousMaxPublicationAttempts: ticketSchema.shape.autonomousMaxPublicationAttempts,
  dependsOn: z.string().nullable(),
  scheduledStartAt: z.number().nullable().describe("Read-only epoch milliseconds of the planned one-shot launch of a TODO feature ticket, or null when none is planned. Set from the board; update_ticket cannot change it."),
  reviewOutcome: z.enum(REVIEW_OUTCOMES).nullable().describe("Read-only outcome of a finished review ticket when it differs from its configured publication: closed_unpublished means the review completed and the user decided not to publish it. Null otherwise."),
  createdAt: z.number(),
  updatedAt: z.number(),
});

const projectSchema = z.object({
  vcsProvider: z.enum(VCS_PROVIDERS).optional(),
  autonomousPilot: z.boolean().optional(),
  key: z.string(),
  label: z.string(),
  baseBranch: z.string(),
  defaultAutoMerge: z.boolean(),
  defaultAddScreenshots: z.boolean(),
  color: z.string().optional(),
  group: z.string().optional(),
});

const listProjectsInputSchema = z.object({});
const listProjectsOutputSchema = z.object({ projects: z.array(projectSchema), dryRun: z.boolean() });
const listTicketsInputSchema = z.object({
  project: z.string().optional(),
  column: columnSchema.optional(),
  kind: kindSchema.optional().describe("Only cards of this kind, for example review."),
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
  autonomous: true,
  autonomousDelivery: true,
  autonomousMaxCorrections: true,
  autonomousTimeoutMinutes: true,
  autonomousMaxStarts: true,
  autonomousFinalizationMinutes: true,
  autonomousMaxPublicationAttempts: true,
  autonomousState: true,
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
const getTicketInputSchema = z.object({ ticketId: z.string().min(1) });
const reviewVerdictOutputSchema = z.object({
  passId: z.string().describe("Identifier of the review pass this verdict comes from."),
  verdict: z.enum(REVIEW_PUBLICATION_EVENTS).describe("Review event of the pass: APPROVE when no finding is retained, REQUEST_CHANGES when at least one critical or major finding is retained, COMMENT when only minor findings are retained or the user forced a comment."),
  findings: z.object({
    critical: z.number().int().nonnegative().describe("Retained critical findings."),
    major: z.number().int().nonnegative().describe("Retained major findings."),
    minor: z.number().int().nonnegative().describe("Retained minor findings."),
    blocking: z.number().int().nonnegative().describe("Retained blocking findings: critical plus major."),
  }).describe("Findings retained after verification, deduplication across reviewers and user dismissals, counted by severity."),
  dismissed: z.number().int().nonnegative().describe("Findings dismissed by the user (false positive or accepted risk), excluded from the counts above."),
});
const getTicketOutputSchema = z.object({
  ticket: compactTicketSchema.extend({
    prUrl: z.string().nullable().describe("URL of the pull request opened for the card, or of the reviewed pull request for a review card; null before publication."),
    prNumber: ticketSchema.shape.prNumber.describe("Number of the reviewed pull request for a review card, null otherwise."),
    reviewedCommitSha: z.string().nullable().describe("Review cards only: pull request head commit read by the latest review pass, or null before that pass prepared its worktree. Compare it with the current head to skip a pull request already reviewed at the same commit."),
    autonomousState: ticketSchema.shape.autonomousState.describe("Progress of the autonomous delivery, or null for a non-autonomous card."),
    reviewVerdict: reviewVerdictOutputSchema.nullable().describe("Review cards only: outcome of the latest review pass once every reviewer of that pass completed; null for other cards, before the first pass finishes, and while a newer pass is still running."),
  }),
  questions: z.array(z.object({
    questionId: z.string(),
    text: z.string(),
    answered: z.boolean(),
    createdAt: z.number(),
  })).describe("Questions asked by the agent on the card, oldest first. Answer an open one with answer_question."),
  recentComments: z.array(commentSchema).describe(`The ${RECENT_COMMENT_LIMIT} most recent comments of the card, oldest first.`),
  dryRun: z.boolean(),
});
const answerQuestionInputSchema = z.object({
  ticketId: z.string().min(1),
  questionId: z.string().min(1).describe("Identifier of an agent question returned by get_ticket."),
  answer: createCommentSchema.shape.body,
}).strict();
const answerQuestionOutputSchema = z.object({
  commentId: z.string().describe("Identifier of the stored answer comment."),
  delivered: z.boolean().describe("True when the answer reached a live agent session. False when it was only stored (TODO card, or no live session)."),
  dryRun: z.boolean(),
});

const listOpenPrsInputSchema = z.object({
  project: z.string().min(1).describe("Key of a project returned by list_projects."),
  refresh: z.boolean().optional().describe("Bypass the five-minute cache and query the VCS provider again."),
}).strict();
const listOpenPrsOutputSchema = z.object({ prs: z.array(openPrSchema), dryRun: z.boolean() });

const getCapacityInputSchema = z.object({}).strict();
const getCapacityOutputSchema = z.object({
  slots: z.object({
    total: z.number().int().nonnegative().describe("Number of implementation slots on this host."),
    free: z.number().int().nonnegative().describe("Slots that can take a card now."),
    occupied: z.number().int().nonnegative().describe("Slots holding a card, whether running, stalled, interrupted or failed."),
  }),
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
    description: "Creates a card in TODO without starting its implementation. A new card runs its feasibility analysis in the background.",
    inputSchema: z.toJSONSchema(createTodoTicketInputSchema, { io: "input" }),
    outputSchema: z.toJSONSchema(createTodoTicketOutputSchema, { io: "output" }),
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
  },
  {
    name: "list_open_prs",
    description: "Lists the open pull requests of a project, as shown in the board's review dialog.",
    inputSchema: z.toJSONSchema(listOpenPrsInputSchema, { io: "input" }),
    outputSchema: z.toJSONSchema(listOpenPrsOutputSchema, { io: "output" }),
    annotations: { readOnlyHint: true },
  },
  {
    name: "create_review_ticket",
    description: "Creates one review card for one open pull request and starts it immediately. Follow it with get_ticket until the reviewed column. Not idempotent: each call creates a new card.",
    inputSchema: z.toJSONSchema(createReviewTicketInputSchema, { io: "input" }),
    outputSchema: z.toJSONSchema(createTodoTicketOutputSchema, { io: "output" }),
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false },
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
  {
    name: "get_capacity",
    description: "Returns how many implementation slots this host has and how many are free right now.",
    inputSchema: z.toJSONSchema(getCapacityInputSchema, { io: "input" }),
    outputSchema: z.toJSONSchema(getCapacityOutputSchema, { io: "output" }),
    annotations: { readOnlyHint: true },
  },
  {
    name: "get_ticket",
    description: "Returns one card with what is needed to follow it: column, stage, error, pull request URL, autonomous delivery state, agent questions and recent comments.",
    inputSchema: z.toJSONSchema(getTicketInputSchema, { io: "input" }),
    outputSchema: z.toJSONSchema(getTicketOutputSchema, { io: "output" }),
    annotations: { readOnlyHint: true },
  },
  {
    name: "answer_question",
    description: "Answers a question asked by the agent of a card, as the board does, and reports whether a live agent session received it.",
    inputSchema: z.toJSONSchema(answerQuestionInputSchema, { io: "input" }),
    outputSchema: z.toJSONSchema(answerQuestionOutputSchema, { io: "output" }),
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false },
  },
];

export interface McpTextResult {
  [key: string]: unknown;
  content: Array<{ type: "text"; text: string }>;
  structuredContent?: Record<string, unknown>;
  isError?: boolean;
}

export interface OutputValidator {
  safeParse(value: unknown):
    | { success: true; data: Record<string, unknown> }
    | { success: false };
}

function jsonResponse(status: number, error: string, headers?: HeadersInit): Response {
  return Response.json({ error }, { status, headers });
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

export function toolResult(schema: OutputValidator, value: unknown): McpTextResult {
  const parsed = schema.safeParse(value);
  if (!parsed.success) return toolError(new Error("invalid MCP output"));
  const structuredContent = parsed.data;
  return {
    content: [{ type: TEXT_CONTENT_TYPE, text: JSON.stringify(structuredContent) }],
    structuredContent,
  };
}

export function errorResult(code: string, message: string): McpTextResult {
  const result = { error: { code, message } };
  return {
    content: [{ type: TEXT_CONTENT_TYPE, text: JSON.stringify(result) }],
    isError: true,
  };
}

function toolError(error: unknown): McpTextResult {
  if (error instanceof TicketOperationError) return errorResult(error.code, error.message);
  if (error instanceof PullRequestListingError) return errorResult("UPSTREAM_ERROR", error.message);
  return errorResult("INTERNAL_ERROR", "internal server error");
}

function invalidInput(message: string): McpTextResult {
  return toolError(new TicketOperationError("INVALID_INPUT", message));
}

function listPublicProjects(operations: TicketOperations): z.infer<typeof projectSchema>[] {
  return operations.listProjects().map((project) => ({
    key: project.key,
    label: project.label,
    baseBranch: project.baseBranch,
    defaultAutoMerge: project.defaultAutoMerge,
    defaultAddScreenshots: project.defaultAddScreenshots,
    ...(project.color !== undefined ? { color: project.color } : {}),
    ...(project.group !== undefined ? { group: project.group } : {}),
  }));
}

export function createToolServer(
  tools: readonly object[],
  callTool: (request: CallToolRequest) => Promise<McpTextResult>,
): Server {
  const server = new Server(
    { name: SERVER_NAME, version: SERVER_VERSION },
    { capabilities: { tools: {} } },
  );
  server.setRequestHandler(ListToolsRequestSchema, () => ({ tools }));
  server.setRequestHandler(CallToolRequestSchema, callTool);
  return server;
}

export async function serveStatelessMcp(server: Server, request: Request, parsedBody?: unknown): Promise<Response> {
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  });
  await server.connect(transport);
  return transport.handleRequest(request, parsedBody === undefined ? undefined : { parsedBody });
}

type QuestionAnswerer = Pick<AgentCoordinator, "submitUserComment">;

function createMcpServer(operations: TicketOperations, coordinator: QuestionAnswerer, dryRun: boolean): Server {
  return createToolServer(PUBLIC_TOOLS, async (request): Promise<McpTextResult> => {
    const input = request.params.arguments ?? {};
    try {
      if (request.params.name === "list_projects") {
        const parsed = listProjectsInputSchema.safeParse(input);
        if (!parsed.success) return invalidInput(parsed.error.issues[0]?.message ?? "invalid input");
        return toolResult(listProjectsOutputSchema, { projects: listPublicProjects(operations), dryRun });
      }
      if (request.params.name === "get_capacity") {
        const parsed = getCapacityInputSchema.safeParse(input);
        if (!parsed.success) return invalidInput(parsed.error.issues[0]?.message ?? "invalid input");
        return toolResult(getCapacityOutputSchema, { slots: operations.slotCapacity(), dryRun });
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
      if (request.params.name === "list_open_prs") {
        const parsed = listOpenPrsInputSchema.safeParse(input);
        if (!parsed.success) return invalidInput(parsed.error.issues[0]?.message ?? "invalid input");
        return toolResult(listOpenPrsOutputSchema, {
          prs: await operations.listOpenPrs(parsed.data.project, parsed.data.refresh ?? false),
          dryRun,
        });
      }
      if (request.params.name === "create_review_ticket") {
        const parsed = createReviewTicketInputSchema.safeParse(input);
        if (!parsed.success) return invalidInput(parsed.error.issues[0]?.message ?? "invalid input");
        return toolResult(createTodoTicketOutputSchema, {
          ...await operations.createReviewTicket(parsed.data),
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
      if (request.params.name === "get_ticket") {
        const parsed = getTicketInputSchema.safeParse(input);
        if (!parsed.success) return invalidInput(parsed.error.issues[0]?.message ?? "invalid input");
        const { ticket, comments } = operations.getTicketDetail(parsed.data.ticketId);
        const questions = comments
          .filter((comment) => comment.author === "agent" && comment.questionId !== null)
          .map((comment) => ({ questionId: comment.questionId, text: comment.body, answered: comment.answered, createdAt: comment.createdAt }));
        return toolResult(getTicketOutputSchema, {
          ticket,
          questions,
          recentComments: comments.slice(-RECENT_COMMENT_LIMIT),
          dryRun,
        });
      }
      if (request.params.name === "answer_question") {
        const parsed = answerQuestionInputSchema.safeParse(input);
        if (!parsed.success) return invalidInput(parsed.error.issues[0]?.message ?? "invalid input");
        const { ticketId, questionId, answer } = parsed.data;
        const { comments } = operations.getTicketDetail(ticketId);
        if (!comments.some((comment) => comment.author === "agent" && comment.questionId === questionId)) {
          return invalidInput("question not found on this ticket");
        }
        const { comment, delivered } = coordinator.submitUserComment(ticketId, answer, questionId);
        return toolResult(answerQuestionOutputSchema, { commentId: comment.id, delivered, dryRun });
      }
      return toolError(new TicketOperationError("NOT_FOUND", `unknown tool: ${request.params.name}`));
    } catch (error) {
      return toolError(error);
    }
  });
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
    private readonly coordinator: QuestionAnswerer,
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

    return serveStatelessMcp(createMcpServer(this.operations, this.coordinator, this.dryRun), request);
  }
}
