import { isAbsolute } from "node:path";

import { getErrorMessage } from "../../shared/errors.ts";
import {
  atelierCreateTodoArgsSchema,
  atelierGetTicketArgsSchema,
  atelierListTicketsArgsSchema,
  atelierStartTicketArgsSchema,
} from "../../shared/protocol.ts";
import type { WorkerToolName } from "../../shared/protocol.ts";
import type { ConversationMessage } from "../../shared/schemas.ts";
import { getProject, isProjectKey } from "../config.ts";
import type { Store } from "../db/store.ts";
import type { ClientHub } from "../hub.ts";
import type { TicketOperations } from "../ticketOperations.ts";

export const ATELIER_BOARD_RESULT_PREFIX = "ATELIER_BOARD_RESULT ";

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
  constructor(private readonly deps: AtelierTicketToolsDeps) {}

  async handle(conversationId: string, name: WorkerToolName, args: unknown, callId: string): Promise<AtelierToolResult> {
    const conversation = this.deps.store.getConversation(conversationId);
    if (!conversation || !isProjectKey(conversation.project)) return { ok: false, result: "Atelier project is unavailable." };
    const project = getProject(conversation.project);
    if (!project.repoPath.trim() || !isAbsolute(project.repoPath)) return { ok: false, result: "Atelier project repository is unavailable." };
    const currentUserMessage = this.deps.store.listConversationMessages(conversationId).findLast((message) => message.role === "user");
    const mutation = name === "atelier_create_todo" || name === "atelier_start_ticket";
    let outcome: AtelierToolResult;
    try {
      if (name === "atelier_list_tickets") {
        const input = atelierListTicketsArgsSchema.parse(args);
        return { ok: true, result: JSON.stringify(this.deps.operations.listTickets({ ...input, project: conversation.project })) };
      }
      if (name === "atelier_get_ticket") {
        const input = atelierGetTicketArgsSchema.parse(args);
        return { ok: true, result: JSON.stringify(this.deps.operations.getProjectTicket(input.ticketId, conversation.project)) };
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
      } else {
        return { ok: false, result: "This tool is unavailable in Atelier." };
      }
    } catch (error) {
      outcome = { ok: false, result: getErrorMessage(error) };
    }
    if (mutation) {
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

  private assertAuthority(message: ConversationMessage | undefined, quote: string): void {
    if (!message || !message.content.includes(quote)) throw new Error("Quote the current user's explicit authorization before creating or starting a card.");
  }
}
