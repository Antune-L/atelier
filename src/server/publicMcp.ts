import { startExternalValidationSchema, externalRequestSchema, externalArtifactRequestSchema, externalValidationOutputSchema, externalArtifactOutputSchema } from "../shared/externalValidation.ts";
import type { ExternalValidationManager } from "./externalValidation.ts";
import { timingSafeEqual } from "node:crypto";

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import type { CallToolRequest } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";

import { applicationVersionInputSchema, applicationVersionSchema } from "../shared/applicationVersion.ts";
import type { ApplicationVersion } from "../shared/applicationVersion.ts";
import { branchPreviewOutputSchema, createBranchPreviewInputSchema, getBranchPreviewInputSchema } from "../shared/branchPreview.ts";
import type { BranchPreviewErrorCode } from "../shared/branchPreview.ts";
import { getErrorMessage } from "../shared/errors.ts";
import type { PreviewRecord } from "../shared/preview.ts";
import { COLUMNS, REVIEW_OUTCOMES, VCS_PROVIDERS } from "../shared/constants.ts";
import {
  analyzeTicketsSchema,
  commentSchema,
  createCommentSchema,
  feasibilityAnswerBatchInputSchema,
  kindSchema,
  openPrSchema,
  ticketSchema,
  triageStatusSchema,
  triageVerdictSchema,
  updateTicketSchema,
} from "../shared/schemas.ts";

import { createApplicationVersionReader } from "./applicationVersion.ts";
import type { AgentCoordinator } from "./agents/coordinator.ts";
import { FeasibilityAnswerError } from "./agents/feasibilityAnswerManager.ts";
import type { FeasibilityAnswerManager } from "./agents/feasibilityAnswerManager.ts";
import { CAMPAIGN_TOOLS, runCampaignTool } from "./campaign/campaignMcpTools.ts";
import type { CampaignService } from "./campaign/campaignService.ts";
import { BranchPreviewError } from "./previewManager.ts";
import type { PreviewManager } from "./previewManager.ts";
import { effectivePort, isLoopbackHost, parseHost } from "./requestGuard.ts";
import { REVIEW_PUBLICATION_EVENTS } from "./system/types.ts";
import { createReviewTicketInputSchema, createTodoTicketInputSchema, PullRequestListingError, TicketOperationError } from "./ticketOperations.ts";
import type { TicketOperations } from "./ticketOperations.ts";

const HTTP_BAD_REQUEST = 400;
const HTTP_UNAUTHORIZED = 401;
const HTTP_NOT_FOUND = 404;
const HTTP_FORBIDDEN = 403;
const SERVER_NAME = "atelier";
const SERVER_VERSION = "1.0.0";
const TEXT_CONTENT_TYPE = "text";
const RECENT_COMMENT_LIMIT = 20;
const columnSchema = z.enum(COLUMNS);
const BRANCH_PREVIEW_DISPLAY_MESSAGES: Record<BranchPreviewErrorCode | "UNAVAILABLE" | "PREVIEW_ERROR", string> = {
  PROJECT_NOT_FOUND: "Ce projet est introuvable dans Atelier.",
  UNSUPPORTED_PROVIDER: "Les prévisualisations Coolify ne prennent en charge que les projets GitHub.",
  COOLIFY_NOT_CONFIGURED: "Coolify n'est pas configuré : complétez la connexion, le serveur, le projet Coolify, le domaine et les identifiants d'accès dans Paramètres · Coolify.",
  PREVIEWS_DISABLED: "Les prévisualisations sont désactivées pour ce projet dans Atelier.",
  RECIPE_NOT_READY: "La recette de prévisualisation n'est pas prête sur cette branche : préparez le projet pour Coolify dans Atelier.",
  READINESS_CHECK_FAILED: "Impossible de vérifier la recette de prévisualisation de cette branche.",
  REQUEST_CONFLICT: "Cet identifiant de requête est déjà associé à un autre projet ou à une autre branche.",
  UNAVAILABLE: "Les prévisualisations de branche sont indisponibles sur ce serveur Atelier.",
  PREVIEW_ERROR: "Impossible de lancer la prévisualisation de cette branche.",
};

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
const feasibilityQuestionOutputSchema = z.object({
  index: z.number().int().nonnegative().describe("Stable position of the question in the current report, passed back as questionIndex."),
  question: z.string(),
  recommendedAnswer: z.string().nullable().describe("Answer recommended by the study, or null."),
  answerStatus: z.enum(["open", "running", "done", "failed"]).describe("open: no answer submitted. running: the answer is being integrated into the description. done: integrated. failed: integration failed, submit again."),
  answer: z.string().nullable(),
  runId: z.string().nullable().describe("Identifier of the latest answer integration of this question, or null."),
  error: z.string().nullable(),
});
const feasibilityOutputSchema = z.object({
  status: triageStatusSchema.describe("none: no study. running: wait for the verdict. done: the verdict is available. failed: the study could not finish."),
  verdict: triageVerdictSchema.nullable(),
  summary: z.string().nullable().describe("Summary of the study, or the failure reason when status is failed."),
  reasons: z.array(z.string()),
  revision: z.number().int().nonnegative().describe("Current card revision, passed back to answer_feasibility_questions."),
  reportVersion: z.number().int().nonnegative().describe("Current report version, passed back to answer_feasibility_questions."),
  questions: z.array(feasibilityQuestionOutputSchema),
});
const answerFeasibilityQuestionsInputSchema = feasibilityAnswerBatchInputSchema.extend({
  ticketId: z.string().min(1),
}).strict();
const answerFeasibilityQuestionsOutputSchema = z.object({
  runIds: z.array(z.string()).describe("One integration run per answer; follow them through the feasibility questions of get_ticket."),
  dryRun: z.boolean(),
});
const getTicketOutputSchema = z.object({
  ticket: compactTicketSchema.extend({
    prUrl: z.string().nullable().describe("URL of the pull request opened for the card, or of the reviewed pull request for a review card; null before publication."),
    prNumber: ticketSchema.shape.prNumber.describe("Number of the reviewed pull request for a review card, null otherwise."),
    reviewedCommitSha: z.string().nullable().describe("Review cards only: pull request head commit read by the latest review pass, or null before that pass prepared its worktree. Compare it with the current head to skip a pull request already reviewed at the same commit."),
    autonomousState: ticketSchema.shape.autonomousState.describe("Progress of the autonomous delivery, or null for a non-autonomous card."),
    feasibility: feasibilityOutputSchema.describe("Feasibility study of the card: status, verdict and the questions it left open."),
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
  ...[
    { name: "start_external_validation", description: "Starts independent browser validation of an exact pushed SHA without creating a ticket. Reconcile uncertain calls with get_external_validation.", input: startExternalValidationSchema, output: externalValidationOutputSchema },
    { name: "get_external_validation", description: "Reconciles a validation receipt by caller request ID; unknown requests return null.", input: externalRequestSchema, output: externalValidationOutputSchema },
    { name: "cancel_external_validation", description: "Cancels validation and stops its owned preview; repeat to reconcile cleanup.", input: externalRequestSchema, output: externalValidationOutputSchema },
    { name: "read_external_validation_artifact", description: "Reads an owned retained artifact, up to 512000 base64 characters, with its SHA-256 digest.", input: externalArtifactRequestSchema, output: externalArtifactOutputSchema },
  ].map(tool => ({ name: tool.name, description: tool.description, inputSchema: z.toJSONSchema(tool.input), outputSchema: z.toJSONSchema(tool.output) })),
  {
    name: "create_branch_preview",
    description: "Deploys a remote branch as a Coolify preview, like the board's Create preview button, without any browser validation. Returns the active preview of the same project and branch when it already targets the current remote SHA, and replaces it when the branch moved. Repeating a requestId returns the preview of its first call. Deployment is asynchronous: follow it with get_branch_preview. Errors carry a French displayMessage for end users.",
    inputSchema: z.toJSONSchema(createBranchPreviewInputSchema, { io: "input" }),
    outputSchema: z.toJSONSchema(branchPreviewOutputSchema, { io: "output" }),
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
  },
  {
    name: "get_branch_preview",
    description: "Reads a branch preview by previewId or by the requestId given to create_branch_preview. Unknown identifiers return a null preview.",
    inputSchema: z.toJSONSchema(getBranchPreviewInputSchema, { io: "input" }),
    outputSchema: z.toJSONSchema(branchPreviewOutputSchema, { io: "output" }),
    annotations: { readOnlyHint: true },
  },
  {
    name: "get_application_version",
    description: "Reads the installed Atelier application version and an accessible verified update target. Source installations report the startup commit, never provider versions. Unavailable data includes stable reason codes.",
    inputSchema: z.toJSONSchema(applicationVersionInputSchema, { io: "input" }),
    outputSchema: z.toJSONSchema(applicationVersionSchema, { io: "output" }),
    annotations: { readOnlyHint: true },
  },
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
    name: "answer_feasibility_questions",
    description: "Answers open questions of a card's feasibility study: the answers are integrated into the card description in the background. Send every available answer in one call, with the revision and reportVersion read from get_ticket.",
    inputSchema: z.toJSONSchema(answerFeasibilityQuestionsInputSchema, { io: "input" }),
    outputSchema: z.toJSONSchema(answerFeasibilityQuestionsOutputSchema, { io: "output" }),
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false },
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

export function errorResult(code: string, message: string, displayMessage?: string): McpTextResult {
  const result = { error: { code, message, ...(displayMessage === undefined ? {} : { displayMessage }) } };
  return {
    content: [{ type: TEXT_CONTENT_TYPE, text: JSON.stringify(result) }],
    isError: true,
  };
}

function toolError(error: unknown): McpTextResult {
  if (error instanceof TicketOperationError) return errorResult(error.code, error.message);
  if (error instanceof PullRequestListingError) return errorResult("UPSTREAM_ERROR", error.message);
  if (error instanceof FeasibilityAnswerError) return errorResult(error.status === HTTP_NOT_FOUND ? "NOT_FOUND" : "CONFLICT", error.message);
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

function publicBranchPreview(preview: PreviewRecord | null) {
  if (preview === null) return null;
  return {
    id: preview.id, project: preview.project, branch: preview.branch, status: preview.status, desiredState: preview.desiredState, url: preview.url,
    requestedSha: preview.revision, deployedSha: preview.deployedRevision, error: preview.error, cleanupStatus: preview.cleanupStatus,
    expiresAt: preview.expiresAt, createdAt: preview.createdAt, updatedAt: preview.updatedAt,
  };
}

async function runBranchPreviewTool(name: string, input: unknown, previews: BranchPreviews | undefined, dryRun: boolean): Promise<McpTextResult> {
  if (previews === undefined) return errorResult("UNAVAILABLE", "Branch previews are unavailable", BRANCH_PREVIEW_DISPLAY_MESSAGES.UNAVAILABLE);
  if (name === "get_branch_preview") {
    const parsed = getBranchPreviewInputSchema.safeParse(input);
    if (!parsed.success) return invalidInput(parsed.error.issues[0]?.message ?? "invalid input");
    return toolResult(branchPreviewOutputSchema, { preview: publicBranchPreview(previews.findBranchPreview(parsed.data)), dryRun });
  }
  const parsed = createBranchPreviewInputSchema.safeParse(input);
  if (!parsed.success) return invalidInput(parsed.error.issues[0]?.message ?? "invalid input");
  try {
    const preview = await previews.ensureBranch(parsed.data.projectKey, parsed.data.branch, parsed.data.requestId);
    return toolResult(branchPreviewOutputSchema, { preview: publicBranchPreview(preview), dryRun });
  } catch (error) {
    if (error instanceof BranchPreviewError) return errorResult(error.code, error.message, BRANCH_PREVIEW_DISPLAY_MESSAGES[error.code]);
    return errorResult("PREVIEW_ERROR", previews.redactError(getErrorMessage(error)), BRANCH_PREVIEW_DISPLAY_MESSAGES.PREVIEW_ERROR);
  }
}

type QuestionAnswerer = Pick<AgentCoordinator, "submitUserComment">;
type BranchPreviews = Pick<PreviewManager, "ensureBranch" | "findBranchPreview" | "redactError">;
type FeasibilityAnswerer = Pick<FeasibilityAnswerManager, "startBatch">;

function createMcpServer(operations: TicketOperations, coordinator: QuestionAnswerer, feasibilityAnswers: FeasibilityAnswerer | undefined, dryRun: boolean, campaigns: CampaignService | null, readApplicationVersion: () => Promise<ApplicationVersion>, external?: ExternalValidationManager, previews?: BranchPreviews): Server {
  const tools = campaigns === null ? PUBLIC_TOOLS : [...PUBLIC_TOOLS, ...CAMPAIGN_TOOLS];
  return createToolServer(tools, async (request): Promise<McpTextResult> => {
    const input = request.params.arguments ?? {};
    try {
      if (request.params.name === "get_application_version") {
        const parsed = applicationVersionInputSchema.safeParse(input);
        if (!parsed.success) return invalidInput(parsed.error.issues[0]?.message ?? "invalid input");
        return toolResult(applicationVersionSchema, await readApplicationVersion());
      }
      if (request.params.name.includes("external_validation")) {
        if (!external) return errorResult("UNAVAILABLE", "External validation is unavailable");
        const name = request.params.name;
        try {
          if (name === "start_external_validation") return toolResult(externalValidationOutputSchema, { validation: await external.start(startExternalValidationSchema.parse(input)) });
          if (name === "read_external_validation_artifact") {
            const args = externalArtifactRequestSchema.parse(input);
            return toolResult(externalArtifactOutputSchema, await external.artifact(args.requestId, args.artifactId));
          }
          const args = externalRequestSchema.parse(input);
          if (name === "get_external_validation") return toolResult(externalValidationOutputSchema, { validation: await external.get(args.requestId) });
          if (name === "cancel_external_validation") return toolResult(externalValidationOutputSchema, { validation: await external.cancel(args.requestId) });
        } catch (error) {
          if (error instanceof z.ZodError) return invalidInput(error.issues[0]?.message ?? "Invalid input");
          return errorResult("VALIDATION_ERROR", error instanceof Error ? error.message : "External validation failed");
        }
      }
      if (request.params.name === "create_branch_preview" || request.params.name === "get_branch_preview") return await runBranchPreviewTool(request.params.name, input, previews, dryRun);
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
      if (request.params.name === "answer_feasibility_questions") {
        if (feasibilityAnswers === undefined) return errorResult("UNAVAILABLE", "Feasibility answers are unavailable");
        const parsed = answerFeasibilityQuestionsInputSchema.safeParse(input);
        if (!parsed.success) return invalidInput(parsed.error.issues[0]?.message ?? "invalid input");
        const { ticketId, ...answers } = parsed.data;
        return toolResult(answerFeasibilityQuestionsOutputSchema, { runIds: feasibilityAnswers.startBatch(ticketId, answers), dryRun });
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
      const campaignOutput = campaigns === null ? null : await runCampaignTool(request.params.name, input, campaigns, dryRun);
      if (campaignOutput !== null) return toolResult(campaignOutput.schema, campaignOutput.value);
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
    private readonly campaigns: CampaignService | null = null,
    private readonly readApplicationVersion: () => Promise<ApplicationVersion> = createApplicationVersionReader({ sourceRevision: null, cloud: false }),
    private readonly external?: ExternalValidationManager,
    private readonly feasibilityAnswers?: FeasibilityAnswerer,
    private readonly previews?: BranchPreviews,
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

    return serveStatelessMcp(createMcpServer(this.operations, this.coordinator, this.feasibilityAnswers, this.dryRun, this.campaigns, this.readApplicationVersion, this.external, this.previews), request);
  }
}
