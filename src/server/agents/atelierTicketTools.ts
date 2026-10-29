import { isAbsolute } from "node:path";

import { getErrorMessage } from "../../shared/errors.ts";
import {
  atelierCreateTodoArgsSchema,
  atelierGetTicketArgsSchema,
  atelierListTicketsArgsSchema,
  atelierSettleConversationArgsSchema,
  atelierStartTicketArgsSchema,
  atelierTicketActionArgsSchema,
} from "../../shared/protocol.ts";
import type { AtelierTicketAction, AtelierTicketView, WorkerToolName } from "../../shared/protocol.ts";
import type { ConversationMessage } from "../../shared/schemas.ts";
import { getProject, isProjectKey } from "../config.ts";
import type { Store } from "../db/store.ts";
import type { ClientHub } from "../hub.ts";
import type { TicketOperations } from "../ticketOperations.ts";

export const ATELIER_BOARD_RESULT_PREFIX = "ATELIER_BOARD_RESULT ";

const TICKETS_API_URL = "http://atelier.internal/api/tickets";
const MAX_RESULT_CHARS = 60_000;
const TRUNCATED_PREFIX = "[truncated] ";
const MIN_AUTHORIZATION_QUOTE_CHARS = 12;
const MUTATING_TOOLS: readonly WorkerToolName[] = ["atelier_create_todo", "atelier_start_ticket", "atelier_ticket_action", "atelier_settle_conversation"];

/** In-process entry point of the board HTTP API, so Atelier actions reuse the exact UI routes and their checks. */
export type BoardRouteHandler = (request: Request) => Promise<Response>;

type BoardMethod = "GET" | "POST" | "PATCH" | "DELETE";

interface BoardRoute {
  method: BoardMethod;
  path: string;
}

function post(path: string): BoardRoute {
  return { method: "POST", path };
}

const VIEW_PATHS = {
  details: "",
  quality: "/quality",
  preview: "/preview",
  transcript: "/terminal",
  autonomous_workspaces: "/autonomous-workspaces",
} satisfies Record<Exclude<AtelierTicketView, "card">, string>;

const ACTION_ROUTES = {
  update: { method: "PATCH", path: "" },
  move: post("/move"),
  comment: post("/comments"),
  validate_prd: post("/validate-prd"),
  mark_merged: post("/merged"),
  check_merged: post("/check-merged"),
  merge: post("/merge"),
  update_base: post("/update-base"),
  retry: post("/retry"),
  relaunch: post("/relaunch"),
  resolve_conflicts: post("/resolve-conflicts"),
  start_test: post("/test"),
  stop_test: post("/stop-test"),
  create_pr: post("/create-pr"),
  implementation_recovery: post("/implementation-recovery"),
  autonomous_resume: post("/autonomous-resume"),
  analyze: post("/analyze"),
  triage: post("/triage"),
  deep_triage: post("/triage-plus"),
  split: post("/split"),
  answer_feasibility: post("/feasibility-answers"),
  answer_feasibility_batch: post("/feasibility-answers/batch"),
  reformulate: post("/reformulate"),
  start_preview: post("/preview"),
  quality_criteria: post("/quality/criteria"),
  quality_preflight: post("/quality/preflight"),
  quality_iteration: post("/quality/iterations"),
  quality_follow_up: post("/quality/follow-ups"),
  quality_checks: post("/quality/checks"),
  quality_validate: post("/quality/validate"),
  quality_verify: post("/quality/verify"),
  quality_combined: post("/quality/combined"),
  quality_functional: post("/quality/functional"),
  quality_cancel: post("/quality/cancel"),
  quality_evidence: post("/quality/evidence"),
  delete: { method: "DELETE", path: "" },
} satisfies Record<AtelierTicketAction, BoardRoute>;

interface AtelierTicketToolsDeps {
  store: Store;
  hub: ClientHub;
  operations: TicketOperations;
}

interface AtelierToolResult {
  ok: boolean;
  result: string;
}

export class AtelierTicketTools {
  private routes: BoardRouteHandler | null = null;

  constructor(private readonly deps: AtelierTicketToolsDeps) {}

  setRoutes(routes: BoardRouteHandler): void {
    this.routes = routes;
  }

  async handle(conversationId: string, name: WorkerToolName, args: unknown, callId: string): Promise<AtelierToolResult> {
    const conversation = this.deps.store.getConversation(conversationId);
    if (!conversation || !isProjectKey(conversation.project)) return { ok: false, result: "Atelier project is unavailable." };
    const project = getProject(conversation.project);
    if (!project.repoPath.trim() || !isAbsolute(project.repoPath)) return { ok: false, result: "Atelier project repository is unavailable." };
    const currentUserMessage = this.deps.store.listConversationMessages(conversationId).findLast((message) => message.role === "user");
    let outcome: AtelierToolResult;
    try {
      if (name === "atelier_list_tickets") {
        const input = atelierListTicketsArgsSchema.parse(args);
        return { ok: true, result: JSON.stringify(this.deps.operations.listTickets({ ...input, project: conversation.project })) };
      }
      if (name === "atelier_get_ticket") {
        const input = atelierGetTicketArgsSchema.parse(args);
        const ticket = this.deps.operations.getProjectTicket(input.ticketId, conversation.project);
        if (input.view === "card") return { ok: true, result: JSON.stringify(ticket) };
        return await this.dispatch(`${ticketUrl(input.ticketId)}${VIEW_PATHS[input.view]}`, "GET");
      }
      if (name === "atelier_create_todo") {
        const { authorizationQuote, requestId, ...input } = atelierCreateTodoArgsSchema.parse(args);
        this.assertAuthority(currentUserMessage, authorizationQuote);
        const result = this.deps.operations.createTodoTicket({
          ...input,
          project: conversation.project,
          requestId: `atelier:${conversationId}:${requestId}`,
          orchestrator: conversation.orchestrator,
          implementer: conversation.orchestrator,
        });
        outcome = { ok: true, result: JSON.stringify(result) };
      } else if (name === "atelier_start_ticket") {
        const input = atelierStartTicketArgsSchema.parse(args);
        this.assertAuthority(currentUserMessage, input.authorizationQuote);
        this.deps.operations.getProjectTicket(input.ticketId, conversation.project);
        outcome = { ok: true, result: JSON.stringify(await this.deps.operations.startTicket(input.ticketId)) };
      } else if (name === "atelier_ticket_action") {
        const input = atelierTicketActionArgsSchema.parse(args);
        this.assertAuthority(currentUserMessage, input.authorizationQuote);
        this.deps.operations.getProjectTicket(input.ticketId, conversation.project);
        if (input.action === "update" && input.body?.project !== undefined && input.body.project !== conversation.project) {
          throw new Error("Atelier cannot move a card to another project.");
        }
        outcome = await this.runAction(input.ticketId, input.action, input.body);
      } else if (name === "atelier_settle_conversation") {
        const input = atelierSettleConversationArgsSchema.parse(args);
        this.assertAuthority(currentUserMessage, input.authorizationQuote);
        if (!conversation.settled) this.deps.hub.pushConversation(this.deps.store.setConversationSettled(conversationId, true));
        outcome = { ok: true, result: JSON.stringify({ conversationId, settled: true }) };
      } else {
        return { ok: false, result: "This tool is unavailable in Atelier." };
      }
    } catch (error) {
      outcome = { ok: false, result: getErrorMessage(error) };
    }
    if (MUTATING_TOOLS.includes(name)) {
      const message = this.deps.store.addConversationMessage({
        conversationId,
        role: "activity",
        turnId: currentUserMessage?.turnId ?? null,
        content: `${ATELIER_BOARD_RESULT_PREFIX}${JSON.stringify({ callId, tool: name, userMessageId: currentUserMessage?.id ?? null, input: args, ...outcome })}`,
      });
      this.deps.hub.pushConversationMessage(message);
    }
    return outcome;
  }

  private runAction(ticketId: string, action: AtelierTicketAction, body: Record<string, unknown> | undefined): Promise<AtelierToolResult> {
    const route = ACTION_ROUTES[action];
    if (action === "analyze") return this.dispatch(`${TICKETS_API_URL}${route.path}`, route.method, { ids: [ticketId] });
    return this.dispatch(`${ticketUrl(ticketId)}${route.path}`, route.method, body);
  }

  private async dispatch(url: string, method: BoardMethod, body?: Record<string, unknown>): Promise<AtelierToolResult> {
    if (!this.routes) return { ok: false, result: "Atelier board actions are unavailable." };
    const init: RequestInit = body === undefined ? { method } : { method, headers: { "content-type": "application/json" }, body: JSON.stringify(body) };
    const response = await this.routes(new Request(url, init));
    const text = await response.text();
    return { ok: response.ok, result: truncate(text || `HTTP ${response.status}`) };
  }

  private assertAuthority(message: ConversationMessage | undefined, quote: string): void {
    const excerpt = quote.trim();
    const meaningful = message !== undefined && excerpt.length >= Math.min(MIN_AUTHORIZATION_QUOTE_CHARS, message.content.trim().length);
    if (!meaningful || !quotesWholeWords(message.content, excerpt)) throw new Error("Quote the current user's explicit authorization before changing a card or this conversation.");
  }
}

function ticketUrl(ticketId: string): string {
  return `${TICKETS_API_URL}/${encodeURIComponent(ticketId)}`;
}

function quotesWholeWords(content: string, excerpt: string): boolean {
  const escaped = excerpt.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(?<![\\p{L}\\p{N}])${escaped}(?![\\p{L}\\p{N}])`, "u").test(content);
}

function truncate(text: string): string {
  return text.length > MAX_RESULT_CHARS ? `${TRUNCATED_PREFIX}${text.slice(-MAX_RESULT_CHARS)}` : text;
}
