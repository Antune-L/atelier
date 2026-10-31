import type { Server } from "@modelcontextprotocol/sdk/server/index.js";
import type { CallToolRequest } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";

import { COLUMNS, REMOTE_TICKET_ORIGIN, TICKET_ORIGINS } from "../../shared/constants.ts";
import { getErrorMessage } from "../../shared/errors.ts";
import { triageStatusSchema } from "../../shared/schemas.ts";
import type { Ticket } from "../../shared/schemas.ts";
import { isRemoteTicket } from "../../shared/startBlocker.ts";
import { remoteMcpProfileEngineError } from "../agents/executionConfig.ts";
import { getProject, isProjectKey } from "../config.ts";
import type { Store } from "../db/store.ts";
import { createLogger } from "../logger.ts";
import { createToolServer, errorResult, toolResult } from "../publicMcp.ts";
import type { McpTextResult } from "../publicMcp.ts";
import type { SystemAdapter } from "../system/types.ts";
import { TicketOperationError, frozenAgentsOfProfile } from "../ticketOperations.ts";
import type { FrozenTicketAgents, TicketOperations } from "../ticketOperations.ts";

const REQUEST_ID_PREFIX = "mcp:";
const MAX_PROJECT_KEY_LENGTH = 128;
const MAX_TITLE_LENGTH = 200;
const MAX_DESCRIPTION_LENGTH = 20_000;
const MAX_REQUEST_ID_LENGTH = 128;
const REQUEST_ID_PATTERN = /^[A-Za-z0-9._:-]+$/;
const MAX_LIST_LIMIT = 100;
const REQUIRES_USER_INTERACTION_META_KEY = "anthropic/requiresUserInteraction";

const TOOL_NAMES = ["list_projects", "list_tickets", "create_todo_ticket"] as const;
type RemoteToolName = (typeof TOOL_NAMES)[number];
const toolNameSchema = z.enum(TOOL_NAMES);

const ERROR_MESSAGES = {
  projectUnavailable: "project not found or not available",
  requestConflict: "requestId was already used with different content",
  notConfigured: "remote card creation is not configured on this server",
  engineUnavailable: "the agent engine of the remote cards profile is not available on this server",
  unknownTool: "unknown tool",
  internal: "internal server error",
} as const;

type RemoteMcpOutcome = "ok" | "replay" | "invalid_input" | "denied" | "conflict" | "unavailable" | "error";

const projectKeySchema = z.string().min(1).max(MAX_PROJECT_KEY_LENGTH).describe("Key of a project returned by list_projects.");
const columnSchema = z.enum(COLUMNS);

const listProjectsInputSchema = z.object({}).strict();
const listTicketsInputSchema = z.object({
  project: projectKeySchema.optional(),
  column: columnSchema.optional(),
  limit: z.number().int().min(1).max(MAX_LIST_LIMIT).optional(),
  offset: z.number().int().min(0).optional(),
}).strict();
const createTodoTicketInputSchema = z.object({
  project: projectKeySchema,
  title: z.string().trim().min(1).max(MAX_TITLE_LENGTH).describe("Short title of the card."),
  description: z.string().max(MAX_DESCRIPTION_LENGTH).describe("Markdown description of the card."),
  requestId: z.string().min(1).max(MAX_REQUEST_ID_LENGTH).regex(REQUEST_ID_PATTERN)
    .describe("Persistent idempotency key chosen by the client; repeat it to retry the same creation safely."),
}).strict();

const remoteProjectSchema = z.object({ key: z.string(), label: z.string() });
const remoteTicketSchema = z.object({
  id: z.string(),
  title: z.string(),
  column: columnSchema,
  project: z.string(),
  createdAt: z.number(),
  updatedAt: z.number(),
  origin: z.enum(TICKET_ORIGINS).nullable(),
  analysisState: triageStatusSchema,
});
const listProjectsOutputSchema = z.object({ projects: z.array(remoteProjectSchema) });
const listTicketsOutputSchema = z.object({
  tickets: z.array(remoteTicketSchema),
  total: z.number().int().min(0),
  nextOffset: z.number().int().min(0).nullable(),
});
const createTodoTicketOutputSchema = z.object({ created: z.boolean(), ticket: remoteTicketSchema });

const REMOTE_TOOLS = [
  {
    name: "list_projects",
    description: "Lists the Atelier projects open to remote card creation.",
    inputSchema: z.toJSONSchema(listProjectsInputSchema, { io: "input" }),
    outputSchema: z.toJSONSchema(listProjectsOutputSchema, { io: "output" }),
    annotations: { readOnlyHint: true },
  },
  {
    name: "list_tickets",
    description: "Lists a compact page of cards from the projects open to remote access, filterable by project and column.",
    inputSchema: z.toJSONSchema(listTicketsInputSchema, { io: "input" }),
    outputSchema: z.toJSONSchema(listTicketsOutputSchema, { io: "output" }),
    annotations: { readOnlyHint: true },
  },
  {
    name: "create_todo_ticket",
    description: "Creates a passive card in TODO. The owner must approve it on the board before any agent can start it.",
    inputSchema: z.toJSONSchema(createTodoTicketInputSchema, { io: "input" }),
    outputSchema: z.toJSONSchema(createTodoTicketOutputSchema, { io: "output" }),
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
    _meta: { [REQUIRES_USER_INTERACTION_META_KEY]: true },
  },
];

const log = createLogger("remote-mcp");

export interface RemoteMcpToolsDeps {
  store: Store;
  operations: TicketOperations;
  system: Pick<SystemAdapter, "checkCodexRuntime" | "checkClaudeAvailable">;
  composerAvailable: boolean;
  now?: () => number;
}

interface ToolOutcome {
  result: McpTextResult;
  outcome: RemoteMcpOutcome;
  projectId?: string | null;
  detail?: string | null;
}

class RemoteToolError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly outcome: RemoteMcpOutcome,
  ) {
    super(message);
    this.name = "RemoteToolError";
  }
}

function projectUnavailable(): RemoteToolError {
  return new RemoteToolError("NOT_FOUND", ERROR_MESSAGES.projectUnavailable, "denied");
}

function invalidInput(error: z.ZodError): RemoteToolError {
  const issue = error.issues[0];
  const path = issue?.path.join(".") ?? "";
  const message = path === "" ? `invalid input: ${issue?.message ?? "invalid value"}` : `invalid input: ${path}: ${issue?.message ?? "invalid value"}`;
  return new RemoteToolError("INVALID_INPUT", message, "invalid_input");
}

function remoteTicket(ticket: Ticket): z.infer<typeof remoteTicketSchema> {
  return {
    id: ticket.id,
    title: ticket.title,
    column: ticket.column,
    project: ticket.project,
    createdAt: ticket.createdAt,
    updatedAt: ticket.updatedAt,
    origin: ticket.origin,
    analysisState: ticket.triageStatus,
  };
}

class RemoteMcpTools {
  private readonly now: () => number;

  constructor(private readonly deps: RemoteMcpToolsDeps) {
    this.now = deps.now ?? Date.now;
  }

  async call(request: CallToolRequest): Promise<McpTextResult> {
    const tool = toolNameSchema.safeParse(request.params.name);
    const input = request.params.arguments ?? {};
    let outcome: ToolOutcome;
    if (!tool.success) {
      outcome = { result: errorResult("NOT_FOUND", ERROR_MESSAGES.unknownTool), outcome: "invalid_input" };
    } else {
      outcome = await this.run(tool.data, input);
    }
    this.record(tool.success ? tool.data : "unknown", outcome);
    return outcome.result;
  }

  private async run(tool: RemoteToolName, input: unknown): Promise<ToolOutcome> {
    let projectId: string | null = null;
    try {
      if (tool === "list_projects") {
        const parsed = listProjectsInputSchema.safeParse(input);
        if (!parsed.success) throw invalidInput(parsed.error);
        return { result: toolResult(listProjectsOutputSchema, { projects: this.listProjects() }), outcome: "ok" };
      }
      if (tool === "list_tickets") {
        const parsed = listTicketsInputSchema.safeParse(input);
        if (!parsed.success) throw invalidInput(parsed.error);
        projectId = parsed.data.project ?? null;
        return { result: toolResult(listTicketsOutputSchema, this.listTickets(parsed.data)), outcome: "ok", projectId };
      }
      const parsed = createTodoTicketInputSchema.safeParse(input);
      if (!parsed.success) throw invalidInput(parsed.error);
      projectId = parsed.data.project;
      const { created, ticket } = await this.createTodoTicket(parsed.data);
      return {
        result: toolResult(createTodoTicketOutputSchema, { created, ticket: remoteTicket(ticket) }),
        outcome: created ? "ok" : "replay",
        projectId,
        detail: ticket.id,
      };
    } catch (error) {
      if (error instanceof RemoteToolError) {
        return { result: errorResult(error.code, error.message), outcome: error.outcome, projectId };
      }
      log.error("appel MCP distant en échec", { tool, error: getErrorMessage(error) });
      return { result: errorResult("INTERNAL_ERROR", ERROR_MESSAGES.internal), outcome: "error", projectId };
    }
  }

  private record(tool: string, outcome: ToolOutcome): void {
    try {
      this.deps.store.recordRemoteMcpCall({
        at: this.now(),
        tool,
        projectId: outcome.projectId ?? null,
        outcome: outcome.outcome,
        detail: outcome.detail ?? null,
      });
    } catch (error) {
      log.error("journal MCP distant indisponible", { error: getErrorMessage(error) });
    }
  }

  private allowedProjects(): Set<string> {
    return new Set(this.deps.store.getAppSettings().remoteMcpProjectIds.filter(isProjectKey));
  }

  private assertAllowed(project: string): void {
    if (!this.allowedProjects().has(project)) throw projectUnavailable();
  }

  private listProjects(): z.infer<typeof remoteProjectSchema>[] {
    return [...this.allowedProjects()].map((key) => ({ key, label: getProject(key).label }));
  }

  private listTickets(input: z.infer<typeof listTicketsInputSchema>): z.infer<typeof listTicketsOutputSchema> {
    const { project, ...paging } = input;
    let projects = this.allowedProjects();
    if (project !== undefined) {
      if (!projects.has(project)) throw projectUnavailable();
      projects = new Set([project]);
    }
    const page = this.deps.operations.listTicketsWithin(projects, paging);
    return { ...page, tickets: page.tickets.map(remoteTicket) };
  }

  private creationRequestTicketId(requestKey: string): string | null {
    return this.deps.store
      .listTicketCreationRequestsByPrefix(requestKey)
      .find((request) => request.requestId === requestKey)?.ticketId ?? null;
  }

  private hasCreationRequest(requestKey: string): boolean {
    return this.creationRequestTicketId(requestKey) !== null;
  }

  private async resolveProfileAgents(): Promise<FrozenTicketAgents> {
    const profileId = this.deps.store.getAppSettings().remoteMcpCardsProfileId;
    const profile = profileId === null ? null : this.deps.store.getProfile(profileId);
    if (profile === null) throw new RemoteToolError("UNAVAILABLE", ERROR_MESSAGES.notConfigured, "unavailable");
    const engineError = await remoteMcpProfileEngineError(this.deps.system, this.deps.composerAvailable, profile);
    if (engineError !== null) {
      log.warn("moteur du profil des cartes distantes indisponible", { error: engineError });
      throw new RemoteToolError("UNAVAILABLE", ERROR_MESSAGES.engineUnavailable, "unavailable");
    }
    return frozenAgentsOfProfile(profile);
  }

  private async createTodoTicket(input: z.infer<typeof createTodoTicketInputSchema>): Promise<{ created: boolean; ticket: Ticket }> {
    this.assertAllowed(input.project);
    const requestKey = `${REQUEST_ID_PREFIX}${input.requestId}`;
    const frozenAgents = this.hasCreationRequest(requestKey) ? undefined : await this.resolveProfileAgents();
    this.assertAllowed(input.project);
    const replayedTicketId = this.creationRequestTicketId(requestKey);
    if (replayedTicketId !== null && this.deps.store.getTicket(replayedTicketId) === null) {
      throw new RemoteToolError("CONFLICT", ERROR_MESSAGES.requestConflict, "conflict");
    }
    const result = this.createOrReplay({ ...input, requestId: requestKey }, frozenAgents);
    const ticket = this.deps.store.getTicket(result.ticket.id);
    if (ticket === null) throw new Error("remote ticket missing after creation");
    if (result.created) return { created: true, ticket };
    if (!isRemoteTicket(ticket) || !this.allowedProjects().has(ticket.project)) {
      throw new RemoteToolError("CONFLICT", ERROR_MESSAGES.requestConflict, "conflict");
    }
    return { created: false, ticket };
  }

  private createOrReplay(input: z.infer<typeof createTodoTicketInputSchema>, frozenAgents: FrozenTicketAgents | undefined) {
    if (frozenAgents === undefined && !this.hasCreationRequest(input.requestId)) {
      throw new RemoteToolError("UNAVAILABLE", ERROR_MESSAGES.notConfigured, "unavailable");
    }
    try {
      return this.deps.operations.createTodoTicket(input, { origin: REMOTE_TICKET_ORIGIN, frozenAgents });
    } catch (error) {
      if (error instanceof TicketOperationError) {
        if (error.code === "CONFLICT") throw new RemoteToolError("CONFLICT", ERROR_MESSAGES.requestConflict, "conflict");
        if (!isProjectKey(input.project)) throw projectUnavailable();
        throw new RemoteToolError("INVALID_INPUT", "invalid input", "invalid_input");
      }
      throw error;
    }
  }
}

export function createRemoteMcpServer(deps: RemoteMcpToolsDeps): Server {
  const tools = new RemoteMcpTools(deps);
  return createToolServer(REMOTE_TOOLS, (request) => tools.call(request));
}
