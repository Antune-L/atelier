import { z } from "zod";

import { ACTIVE_STAGES, isAllowedAgentPair } from "../shared/constants.ts";
import type { Column } from "../shared/constants.ts";
import {
  columnSchema,
  deriveTitleFromDescription,
  externalUrlSchema,
  ticketBatchOptionsSchema,
  updateTicketSchema,
} from "../shared/schemas.ts";
import type { ProjectInfo, Ticket } from "../shared/schemas.ts";
import type { SlotManager } from "./agents/slotManager.ts";
import { getProject, isProjectKey, listProjectKeys, MODELS } from "./config.ts";
import { TicketCreationRequestConflictError } from "./db/store.ts";
import type { NewTicket, Store, TicketPatch } from "./db/store.ts";
import type { ClientHub } from "./hub.ts";
import type { TicketLifecycle } from "./lifecycle.ts";
import { createLogger } from "./logger.ts";

const DEFAULT_TICKET_LIST_LIMIT = 50;
const MAX_TICKET_LIST_LIMIT = 100;
const log = createLogger("ticket-operations");

export const createTodoTicketInputSchema = ticketBatchOptionsSchema
  .partial()
  .extend({
    project: z.string().min(1).describe("Key of a project returned by list_projects."),
    title: z.string().optional().describe("Optional title, derived from the description when empty."),
    description: z.string().optional().describe("Markdown description of the card."),
    externalUrl: externalUrlSchema.optional().describe("HTTP(S) URL of an external card, or null."),
    prdEnabled: ticketBatchOptionsSchema.shape.prdEnabled.removeDefault().optional().describe("Prepare and get a PRD approved before implementation."),
    prDraft: ticketBatchOptionsSchema.shape.prDraft.removeDefault().optional().describe("Open the pull request as a draft."),
    autoMerge: ticketBatchOptionsSchema.shape.autoMerge.removeDefault().optional().describe("Automatically merge the pull request after validation."),
    stealth: ticketBatchOptionsSchema.shape.stealth.removeDefault().optional().describe("Implement without opening a pull request."),
    directPush: ticketBatchOptionsSchema.shape.directPush.removeDefault().optional().describe("Push directly to the base branch, without a pull request; disables stealth and autoMerge."),
    addScreenshots: ticketBatchOptionsSchema.shape.addScreenshots.removeDefault().optional().describe("Add screenshots to the pull request."),
    verifyFeature: ticketBatchOptionsSchema.shape.verifyFeature.removeDefault().optional().describe("Run an E2E (end-to-end) functional verification in a real browser."),
    argusMultiLoop: ticketBatchOptionsSchema.shape.argusMultiLoop.removeDefault().optional().describe("Repeat the Argus review until two consecutive passes without findings."),
    baseBranch: ticketBatchOptionsSchema.shape.baseBranch.removeDefault().optional().describe("Starting branch and pull request target; null uses the project's branch."),
    dependsOn: z.string().nullable().optional().describe("Identifier of a parent card in the same project for a stacked pull request."),
    model: ticketBatchOptionsSchema.shape.model.removeDefault().optional().describe("Claude model of the orchestrator; null uses the server setting."),
    effort: ticketBatchOptionsSchema.shape.effort.removeDefault().optional().describe("Claude effort of the orchestrator; null uses the server setting."),
    implementerModel: ticketBatchOptionsSchema.shape.implementerModel.removeDefault().optional().describe("Claude model delegated to implementation; null uses the server setting."),
    implementerEffort: ticketBatchOptionsSchema.shape.implementerEffort.removeDefault().optional().describe("Claude effort delegated to implementation; null uses the server setting."),
    orchestrator: ticketBatchOptionsSchema.shape.orchestrator.removeDefault().optional().describe("Provider that drives the whole ticket."),
    implementer: ticketBatchOptionsSchema.shape.implementer.removeDefault().optional().describe("Agent that writes the implementation code."),
    codexModel: ticketBatchOptionsSchema.shape.codexModel.removeDefault().optional().describe("Codex model of the orchestrator; null uses the server setting."),
    codexEffort: ticketBatchOptionsSchema.shape.codexEffort.removeDefault().optional().describe("Codex effort of the orchestrator; null uses the server setting."),
    codexFast: ticketBatchOptionsSchema.shape.codexFast.removeDefault().optional().describe("Enable fast mode for the Codex orchestrator."),
    codexImplementerModel: ticketBatchOptionsSchema.shape.codexImplementerModel.removeDefault().optional().describe("Model of the Codex implementation subagent; null uses the server setting."),
    codexImplementerEffort: ticketBatchOptionsSchema.shape.codexImplementerEffort.removeDefault().optional().describe("Effort of the Codex implementation subagent; null uses the server setting."),
    codexImplementerFast: ticketBatchOptionsSchema.shape.codexImplementerFast.removeDefault().optional().describe("Fast mode of the Codex subagent; null inherits from the orchestrator."),
    feasibilityEngine: ticketBatchOptionsSchema.shape.feasibilityEngine.removeDefault().optional().describe("Engine used for the feasibility study; null follows the orchestrator."),
    requestId: z.string().trim().min(1).describe("Persistent idempotent identifier chosen by the client."),
  })
  .strict()
  .refine(
    (input) => (input.title ?? "").trim().length > 0 || (input.description ?? "").trim().length > 0,
    { message: "title or description required", path: ["title"] },
  );

export type TicketOperationErrorCode = "INVALID_INPUT" | "NOT_FOUND" | "CONFLICT";

export class TicketOperationError extends Error {
  constructor(
    readonly code: TicketOperationErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "TicketOperationError";
  }
}

export interface TicketOperationsDeps {
  store: Store;
  hub: ClientHub;
  lifecycle: TicketLifecycle;
  slots: SlotManager;
  feasibility: FeasibilityStarter;
}

interface FeasibilityStarter {
  start(ticketIds: string[], projectKey: string): Promise<void>;
}

export interface ListTicketsInput {
  project?: string;
  column?: Column;
  limit?: number;
  offset?: number;
}

export interface CompactTicket {
  id: string;
  title: string;
  description: string;
  externalUrl: string | null;
  project: string;
  kind: Ticket["kind"];
  column: Column;
  stage: Ticket["stage"];
  error: string | null;
  dependsOn: string | null;
  createdAt: number;
  updatedAt: number;
}

export interface TicketPage {
  tickets: CompactTicket[];
  total: number;
  nextOffset: number | null;
}

export type CreateTodoTicketInput = z.input<typeof createTodoTicketInputSchema>;

export interface CreateTodoTicketResult {
  created: boolean;
  ticket: CompactTicket;
}

export interface StartTicketResult {
  status: "queued" | "already_started";
  ticket: CompactTicket;
}

export type AnalyzeTicketRejectionReason = "not_found" | "busy";

export interface AnalyzeTicketsResult {
  started: number;
  startedIds: string[];
  rejected: Array<{ id: string; reason: AnalyzeTicketRejectionReason }>;
}

export interface UpdateTicketOptions {
  requireTodo?: boolean;
}

function compactTicket(ticket: Ticket): CompactTicket {
  return {
    id: ticket.id,
    title: ticket.title,
    description: ticket.description,
    externalUrl: ticket.externalUrl,
    project: ticket.project,
    kind: ticket.kind,
    column: ticket.column,
    stage: ticket.stage,
    error: ticket.error,
    dependsOn: ticket.dependsOn,
    createdAt: ticket.createdAt,
    updatedAt: ticket.updatedAt,
  };
}

function isBlocked(ticket: Ticket, store: Store): boolean {
  if (ticket.dependsOn === null) return false;
  const parent = store.getTicket(ticket.dependsOn);
  if (!parent || parent.branch === null) return true;
  const splitMother = parent.branch.startsWith("split/") && parent.prUrl === null;
  return parent.prUrl === null && !splitMother;
}

function isActive(ticket: Ticket): boolean {
  if (ticket.column === "implementing" || ticket.column === "prd" || ticket.column === "to_review") return true;
  if (ticket.stage === "awaiting_answers") return true;
  return ticket.stage !== null && ACTIVE_STAGES.includes(ticket.stage);
}

function isProcessing(stage: Ticket["stage"]): boolean {
  if (stage === null) return false;
  if (stage === "awaiting_answers") return true;
  return ACTIVE_STAGES.includes(stage);
}

function requestKeyConflictMessage(requestId: string): string {
  return `request key ${requestId} was already used with different content`;
}

function normalizeCreateInput(input: CreateTodoTicketInput) {
  const parsed = createTodoTicketInputSchema.safeParse(input);
  if (!parsed.success) throw new TicketOperationError("INVALID_INPUT", parsed.error.issues[0]?.message ?? "invalid input");
  const title = parsed.data.title ?? "";
  const description = parsed.data.description ?? "";
  let externalUrl: string | null = parsed.data.externalUrl ?? null;
  if (externalUrl === "") externalUrl = null;
  const {
    project,
    requestId,
    title: _parsedTitle,
    description: _parsedDescription,
    externalUrl: _parsedExternalUrl,
    ...options
  } = parsed.data;
  return { project, title, description, externalUrl, requestId, ...options };
}

export function ticketDependencyError(
  store: Store,
  ticketId: string | null,
  dependsOn: string,
  project: string,
): string | null {
  const parent = store.getTicket(dependsOn);
  if (!parent) return "ticket it depends on not found";
  if (parent.project !== project) return "the dependency must be in the same project";
  const seen = new Set<string>();
  let cursor: Ticket | null = parent;
  while (cursor) {
    if (cursor.id === ticketId) return "circular dependency not allowed";
    if (seen.has(cursor.id)) break;
    seen.add(cursor.id);
    cursor = cursor.dependsOn ? store.getTicket(cursor.dependsOn) : null;
  }
  return null;
}

export class TicketOperations {
  constructor(private readonly deps: TicketOperationsDeps) {}

  listProjects(): ProjectInfo[] {
    return listProjectKeys().map((key) => {
      const project = getProject(key);
      return {
        key,
        label: project.label,
        baseBranch: project.baseBranch,
        defaultAutoMerge: project.defaultAutoMerge,
        defaultAddScreenshots: project.defaultAddScreenshots,
        ...(project.color !== undefined ? { color: project.color } : {}),
      };
    });
  }

  listTickets(input: ListTicketsInput = {}): TicketPage {
    if (input.project !== undefined && !isProjectKey(input.project)) {
      throw new TicketOperationError("INVALID_INPUT", "unknown project");
    }
    if (input.column !== undefined && !columnSchema.safeParse(input.column).success) {
      throw new TicketOperationError("INVALID_INPUT", "unknown column");
    }
    const limit = input.limit ?? DEFAULT_TICKET_LIST_LIMIT;
    const offset = input.offset ?? 0;
    if (!Number.isInteger(limit) || limit < 1 || limit > MAX_TICKET_LIST_LIMIT) {
      throw new TicketOperationError("INVALID_INPUT", `limit must be between 1 and ${MAX_TICKET_LIST_LIMIT}`);
    }
    if (!Number.isInteger(offset) || offset < 0) {
      throw new TicketOperationError("INVALID_INPUT", "offset must be a positive integer or zero");
    }
    const filtered = this.deps.store
      .listTickets(false)
      .filter((ticket) => input.project === undefined || ticket.project === input.project)
      .filter((ticket) => input.column === undefined || ticket.column === input.column);
    const tickets = filtered.slice(offset, offset + limit).map(compactTicket);
    const nextOffset = offset + tickets.length < filtered.length ? offset + tickets.length : null;
    return { tickets, total: filtered.length, nextOffset };
  }

  createTodoTicket(input: CreateTodoTicketInput): CreateTodoTicketResult {
    const normalized = normalizeCreateInput(input);
    if (!isProjectKey(normalized.project)) {
      throw new TicketOperationError("INVALID_INPUT", "unknown project");
    }
    const orchestrator = normalized.orchestrator ?? "claude";
    const implementer = normalized.implementer ?? "claude";
    if (!isAllowedAgentPair(orchestrator, implementer)) {
      throw new TicketOperationError(
        "INVALID_INPUT",
        "Unsupported orchestrator/implementer combination: Codex only orchestrates Codex (cross delegation is coming later).",
      );
    }
    if (normalized.dependsOn !== undefined && normalized.dependsOn !== null) {
      const error = ticketDependencyError(this.deps.store, null, normalized.dependsOn, normalized.project);
      if (error !== null) throw new TicketOperationError("INVALID_INPUT", error);
    }
    const project = getProject(normalized.project);
    const title = normalized.title.trim() || deriveTitleFromDescription(normalized.description);
    const payload = JSON.stringify(normalized);
    const directPush = normalized.directPush ?? false;
    const stealth = directPush ? false : (normalized.stealth ?? false);
    const autoMerge = stealth || directPush
      ? false
      : (normalized.autoMerge ?? project.defaultAutoMerge);
    const ticketInput: NewTicket = {
      title,
      description: normalized.description,
      externalUrl: normalized.externalUrl,
      project: normalized.project,
      prdEnabled: normalized.prdEnabled ?? false,
      prDraft: normalized.prDraft ?? true,
      autoMerge,
      addScreenshots: normalized.addScreenshots ?? (!autoMerge && project.defaultAddScreenshots),
      verifyFeature: normalized.verifyFeature ?? false,
      argusMultiLoop: normalized.argusMultiLoop ?? false,
      stealth,
      directPush,
      baseBranch: normalized.baseBranch ?? null,
      dependsOn: normalized.dependsOn ?? null,
      model: normalized.model ?? null,
      effort: normalized.effort ?? null,
      implementerModel: normalized.implementerModel ?? null,
      implementerEffort: normalized.implementerEffort ?? null,
      implementer,
      orchestrator,
      codexModel: normalized.codexModel === undefined ? MODELS.codexModel : normalized.codexModel,
      codexEffort: normalized.codexEffort === undefined ? MODELS.codexEffort : normalized.codexEffort,
      codexFast: normalized.codexFast ?? MODELS.codexFast,
      codexImplementerModel: normalized.codexImplementerModel ?? null,
      codexImplementerEffort: normalized.codexImplementerEffort ?? null,
      codexImplementerFast: normalized.codexImplementerFast ?? null,
      feasibilityEngine: normalized.feasibilityEngine ?? null,
    };
    try {
      const result = this.deps.store.createTicketIdempotent(normalized.requestId, payload, ticketInput);
      if (result.created) this.deps.hub.pushTicket(result.ticket);
      return { created: result.created, ticket: compactTicket(result.ticket) };
    } catch (error) {
      if (error instanceof TicketCreationRequestConflictError) {
        throw new TicketOperationError("CONFLICT", requestKeyConflictMessage(normalized.requestId));
      }
      throw error;
    }
  }

  analyzeTickets(ids: string[]): AnalyzeTicketsResult {
    const startedIds: string[] = [];
    const rejected: AnalyzeTicketsResult["rejected"] = [];
    const idsByProject = new Map<string, string[]>();

    for (const id of ids) {
      const ticket = this.deps.store.getTicket(id);
      if (!ticket) {
        rejected.push({ id, reason: "not_found" });
        continue;
      }
      if (ticket.triageStatus === "running" || isProcessing(ticket.stage)) {
        rejected.push({ id, reason: "busy" });
        continue;
      }
      startedIds.push(id);
      const group = idsByProject.get(ticket.project) ?? [];
      group.push(id);
      idsByProject.set(ticket.project, group);
    }

    for (const [project, projectIds] of idsByProject) {
      void this.deps.feasibility.start(projectIds, project).catch((error: unknown) => {
        log.error("batch analysis start failed", {
          error: error instanceof Error ? error.message : String(error),
        });
      });
    }

    return { started: startedIds.length, startedIds, rejected };
  }

  updateTicket(ticketId: string, input: unknown, options: UpdateTicketOptions = {}): Ticket {
    const ticket = this.deps.store.getTicket(ticketId);
    if (!ticket) throw new TicketOperationError("NOT_FOUND", "ticket not found");
    if (options.requireTodo && ticket.column !== "todo") {
      throw new TicketOperationError("CONFLICT", "only a TODO ticket can be updated through MCP");
    }
    if (isProcessing(ticket.stage)) {
      throw new TicketOperationError("CONFLICT", "ticket locked (being processed)");
    }
    if (ticket.triageStatus === "running") {
      throw new TicketOperationError("CONFLICT", "analysis in progress: wait for the verdict before updating");
    }

    const parsed = updateTicketSchema.safeParse(input);
    if (!parsed.success) {
      throw new TicketOperationError("INVALID_INPUT", parsed.error.issues[0]?.message ?? "invalid input");
    }
    const project = parsed.data.project ?? ticket.project;
    if (parsed.data.project !== undefined && parsed.data.project !== ticket.project) {
      if (!isProjectKey(parsed.data.project)) {
        throw new TicketOperationError("INVALID_INPUT", "unknown project");
      }
      if (ticket.column !== "todo") {
        throw new TicketOperationError("CONFLICT", "the project can only be changed in TODO");
      }
    }

    const effectiveDependsOn = parsed.data.dependsOn === undefined
      ? ticket.dependsOn
      : parsed.data.dependsOn;
    if (
      effectiveDependsOn !== null
      && (parsed.data.dependsOn !== undefined || project !== ticket.project)
    ) {
      const error = ticketDependencyError(this.deps.store, ticket.id, effectiveDependsOn, project);
      if (error !== null) throw new TicketOperationError("INVALID_INPUT", error);
    }

    if (parsed.data.orchestrator !== undefined || parsed.data.implementer !== undefined) {
      if (ticket.column !== "todo") {
        throw new TicketOperationError(
          "CONFLICT",
          "orchestrator/implementer can only be changed in TODO",
        );
      }
      const orchestrator = parsed.data.orchestrator ?? ticket.orchestrator;
      const implementer = parsed.data.implementer ?? ticket.implementer;
      if (!isAllowedAgentPair(orchestrator, implementer)) {
        throw new TicketOperationError(
          "INVALID_INPUT",
          "Unsupported orchestrator/implementer combination: Codex only orchestrates Codex (cross delegation is coming later).",
        );
      }
    }

    const patch: TicketPatch = { ...parsed.data };
    const resultingDirectPush = parsed.data.directPush ?? ticket.directPush;
    if (resultingDirectPush) {
      patch.stealth = false;
      patch.autoMerge = false;
    } else if (parsed.data.stealth ?? ticket.stealth) {
      patch.autoMerge = false;
    }
    patch.directPush = resultingDirectPush;

    if (
      parsed.data.project !== undefined
      && parsed.data.project !== ticket.project
      && parsed.data.baseBranch === undefined
    ) {
      patch.baseBranch = null;
    }
    if (parsed.data.title !== undefined && parsed.data.title.trim() === "") {
      const derived = deriveTitleFromDescription(parsed.data.description ?? ticket.description);
      patch.title = derived || ticket.title;
    }

    const updated = this.deps.store.updateTicket(ticketId, patch);
    this.deps.hub.pushTicket(updated);
    return updated;
  }

  async startTicket(ticketId: string): Promise<StartTicketResult> {
    const ticket = this.deps.store.getTicket(ticketId);
    if (!ticket) throw new TicketOperationError("NOT_FOUND", "ticket not found");
    if (isActive(ticket)) return { status: "already_started", ticket: compactTicket(ticket) };
    if (ticket.column !== "todo") {
      throw new TicketOperationError("CONFLICT", "only a TODO ticket can be started");
    }
    if (ticket.triageStatus === "running") {
      throw new TicketOperationError("CONFLICT", "analysis in progress: wait for the verdict before starting the implementation");
    }
    if (isBlocked(ticket, this.deps.store)) {
      throw new TicketOperationError("CONFLICT", "waiting for the PR of the ticket it depends on");
    }
    const queued = this.deps.lifecycle.enqueue(ticketId);
    void this.deps.slots.startTicket(ticketId).catch((error: unknown) => {
      log.error("ticket start failed", {
        ticketId,
        error: error instanceof Error ? error.message : String(error),
      });
    });
    return { status: "queued", ticket: compactTicket(queued) };
  }
}

export function createTicketOperations(deps: TicketOperationsDeps): TicketOperations {
  return new TicketOperations(deps);
}
