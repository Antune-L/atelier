import { z } from "zod";

import { boardNameSchema } from "./boardLink.ts";
import { CROSS_BOARD_CLIENT_ID_PATTERN, CROSS_BOARD_DESCRIPTION_MAX_LENGTH, CROSS_BOARD_PROJECT_KEY_MAX_LENGTH, CROSS_BOARD_TITLE_MAX_LENGTH, VCS_PROVIDERS } from "./constants.ts";
import { deriveTitleFromDescription } from "./schemas.ts";

// NOTE: bump on any breaking change to an op, its input or its output; the Mac refuses a VPS reporting another version.
export const BRIDGE_PROTOCOL_VERSION = 2;

export const BRIDGE_OPS = ["version", "list_projects", "create_ticket", "catalogue_publish", "outbox_fetch", "outbox_ack"] as const;
export type BridgeOp = (typeof BRIDGE_OPS)[number];

export const BRIDGE_REQUEST_ID_PREFIX = "mac:";
export const BRIDGE_MAX_REQUEST_BYTES = 256 * 1024;

export const VPS_ANALYSIS_MODES = ["none", "analyze"] as const;
export type VpsAnalysisMode = (typeof VPS_ANALYSIS_MODES)[number];

export const BRIDGE_ERROR_CODES = ["INVALID_INPUT", "NOT_FOUND", "CONFLICT", "UNKNOWN_OP", "INTERNAL"] as const;
export type BridgeErrorCode = (typeof BRIDGE_ERROR_CODES)[number];

export function bridgeRequestId(sendId: string): string {
  return `${BRIDGE_REQUEST_ID_PREFIX}${sendId}`;
}

export function isBridgeOp(value: string): value is BridgeOp {
  return BRIDGE_OPS.some((op) => op === value);
}

const vpsTicketDraftFields = z.object({
  project: z.string().trim().min(1).max(CROSS_BOARD_PROJECT_KEY_MAX_LENGTH),
  title: z.string().max(CROSS_BOARD_TITLE_MAX_LENGTH),
  description: z.string().max(CROSS_BOARD_DESCRIPTION_MAX_LENGTH),
  analysis: z.enum(VPS_ANALYSIS_MODES),
});

function hasTitleOrDescription(input: { title: string; description: string }): boolean {
  return input.title.trim().length > 0 || input.description.trim().length > 0;
}

export function draftTitle(draft: { title: string; description: string }): string {
  return draft.title.trim() || deriveTitleFromDescription(draft.description);
}

const TITLE_OR_DESCRIPTION_ISSUE = { message: "title or description required", path: ["title"] };

export const vpsTicketDraftSchema = vpsTicketDraftFields.strict().refine(hasTitleOrDescription, TITLE_OR_DESCRIPTION_ISSUE);
export type VpsTicketDraft = z.infer<typeof vpsTicketDraftSchema>;

export const bridgeCreateTicketInputSchema = vpsTicketDraftFields.extend({
  requestId: z.string().refine(
    (value) => value.startsWith(BRIDGE_REQUEST_ID_PREFIX) && CROSS_BOARD_CLIENT_ID_PATTERN.test(value.slice(BRIDGE_REQUEST_ID_PREFIX.length)),
    { message: `requestId must be ${BRIDGE_REQUEST_ID_PREFIX}<id>` },
  ),
}).strict().refine(hasTitleOrDescription, TITLE_OR_DESCRIPTION_ISSUE);
export type BridgeCreateTicketInput = z.infer<typeof bridgeCreateTicketInputSchema>;

export const bridgeEmptyInputSchema = z.object({}).strict();

export const bridgeVersionOutputSchema = z.object({ protocolVersion: z.number().int() }).strict();

export const boardProjectSchema = z.object({
  key: z.string(),
  label: z.string(),
  baseBranch: z.string(),
  vcsProvider: z.enum(VCS_PROVIDERS),
}).strict();
export type BoardProject = z.infer<typeof boardProjectSchema>;

export const bridgeListProjectsOutputSchema = z.object({ projects: z.array(boardProjectSchema) }).strict();

export const vpsCreatedTicketSchema = z.object({ id: z.string().min(1), title: z.string(), project: z.string() }).strict();
export type VpsCreatedTicket = z.infer<typeof vpsCreatedTicketSchema>;

export const bridgeCreateTicketOutputSchema = z.object({ created: z.boolean(), ticket: vpsCreatedTicketSchema }).strict();

export const bridgeErrorSchema = z.object({ code: z.enum(BRIDGE_ERROR_CODES), message: z.string() }).strict();

export const bridgeEnvelopeSchema = z.discriminatedUnion("ok", [
  z.object({ ok: z.literal(true), result: z.unknown() }).strict(),
  z.object({ ok: z.literal(false), error: bridgeErrorSchema }).strict(),
]);
export type BridgeEnvelope = z.infer<typeof bridgeEnvelopeSchema>;

export const VPS_SEND_STATUSES = ["pending", "failed"] as const;

export const vpsPendingSendSchema = z.object({
  id: z.string(),
  requestId: z.string(),
  draft: vpsTicketDraftSchema,
  projectLabel: z.string().nullable(),
  status: z.enum(VPS_SEND_STATUSES),
  attempts: z.number().int(),
  lastError: z.string().nullable(),
  lastAttemptAt: z.number().nullable(),
  createdAt: z.number(),
});
export type VpsPendingSend = z.infer<typeof vpsPendingSendSchema>;

export const vpsCreateTicketResponseSchema = z.discriminatedUnion("status", [
  z.object({ status: z.literal("created"), ticket: vpsCreatedTicketSchema }),
  z.object({ status: z.literal("pending"), send: vpsPendingSendSchema }),
]);
export type VpsCreateTicketResponse = z.infer<typeof vpsCreateTicketResponseSchema>;

const OUTBOX_ITEM_ID_MAX_LENGTH = 200;
const OUTBOX_ITEM_ID_PATTERN = /^[A-Za-z0-9:_-]+$/;
export const OUTBOX_REASON_MAX_LENGTH = 500;
const MAC_TICKET_ID_MAX_LENGTH = 64;
export const MAC_CATALOGUE_MAX_PROJECTS = 200;
export const OUTBOX_FETCH_MAX_ITEMS = 50;
// NOTE(ali): stays well below VPS_BRIDGE_MAX_STDOUT_CHARS so a page of large descriptions is never truncated.
export const OUTBOX_FETCH_MAX_CHARS = 400_000;
// NOTE(ali): the Mac publishes every 5 minutes while awake; a sleeping Mac is the normal case, so only a day without any publication is flagged.
export const MAC_CATALOGUE_STALE_AFTER_MS = 24 * 60 * 60_000;

export const OUTBOX_ITEM_ID_PREFIXES = { board: "board:", agent: "agent:" } as const;
export const MAC_OUTBOX_SOURCES = ["board", "agent"] as const;
export type MacOutboxSource = (typeof MAC_OUTBOX_SOURCES)[number];
export const MAC_OUTBOX_STATUSES = ["pending", "received", "rejected"] as const;

export const outboxItemIdSchema = z.string().min(1).max(OUTBOX_ITEM_ID_MAX_LENGTH).regex(OUTBOX_ITEM_ID_PATTERN);
const outboxClientIdSchema = z.string().regex(CROSS_BOARD_CLIENT_ID_PATTERN);

const macOutboxDraftFields = vpsTicketDraftFields.omit({ analysis: true });
export const macOutboxDraftSchema = macOutboxDraftFields.strict().refine(hasTitleOrDescription, TITLE_OR_DESCRIPTION_ISSUE);
export type MacOutboxDraft = z.infer<typeof macOutboxDraftSchema>;

export const macOutboxEnqueueInputSchema = macOutboxDraftFields.extend({ clientId: outboxClientIdSchema }).strict()
  .refine(hasTitleOrDescription, TITLE_OR_DESCRIPTION_ISSUE);
export type MacOutboxEnqueueInput = z.infer<typeof macOutboxEnqueueInputSchema>;

export const bridgeCataloguePublishInputSchema = z.object({
  boardName: boardNameSchema.nullable(),
  projects: z.array(boardProjectSchema).max(MAC_CATALOGUE_MAX_PROJECTS),
}).strict();
export type BridgeCataloguePublishInput = z.infer<typeof bridgeCataloguePublishInputSchema>;
export const bridgeCataloguePublishOutputSchema = z.object({ publishedAt: z.number() }).strict();

export const bridgeOutboxItemSchema = macOutboxDraftFields.extend({ id: outboxItemIdSchema, createdAt: z.number() }).strict();
export type BridgeOutboxItem = z.infer<typeof bridgeOutboxItemSchema>;
export const bridgeOutboxFetchOutputSchema = z.object({ items: z.array(bridgeOutboxItemSchema).max(OUTBOX_FETCH_MAX_ITEMS) }).strict();

export const outboxAckSchema = z.discriminatedUnion("status", [
  z.object({ id: outboxItemIdSchema, status: z.literal("received"), macTicketId: z.string().min(1).max(MAC_TICKET_ID_MAX_LENGTH) }).strict(),
  z.object({ id: outboxItemIdSchema, status: z.literal("rejected"), reason: z.string().trim().min(1).max(OUTBOX_REASON_MAX_LENGTH) }).strict(),
]);
export type OutboxAck = z.infer<typeof outboxAckSchema>;
export const bridgeOutboxAckInputSchema = z.object({ acks: z.array(outboxAckSchema).min(1).max(OUTBOX_FETCH_MAX_ITEMS) }).strict();
export const bridgeOutboxAckOutputSchema = z.object({ acknowledged: z.number().int().min(0) }).strict();

export const macCatalogueSchema = z.object({
  boardName: z.string().nullable(),
  projects: z.array(boardProjectSchema),
  publishedAt: z.number(),
  stale: z.boolean(),
});
export type MacCatalogue = z.infer<typeof macCatalogueSchema>;

export const macOutboxItemSchema = z.object({
  id: outboxItemIdSchema,
  project: z.string(),
  projectLabel: z.string().nullable(),
  title: z.string(),
  description: z.string(),
  source: z.enum(MAC_OUTBOX_SOURCES),
  sourceTicketId: z.string().nullable(),
  status: z.enum(MAC_OUTBOX_STATUSES),
  macTicketId: z.string().nullable(),
  reason: z.string().nullable(),
  createdAt: z.number(),
  receivedAt: z.number().nullable(),
});
export type MacOutboxItem = z.infer<typeof macOutboxItemSchema>;

export const macOutboxStateSchema = z.object({ catalogue: macCatalogueSchema.nullable(), items: z.array(macOutboxItemSchema) });
export type MacOutboxState = z.infer<typeof macOutboxStateSchema>;

export const macOutboxEnqueueResponseSchema = z.object({ created: z.boolean(), item: macOutboxItemSchema });
export type MacOutboxEnqueueResponse = z.infer<typeof macOutboxEnqueueResponseSchema>;

const OUTBOX_REQUEST_ID_PREFIX = "outbox:";

export function outboxRequestId(itemId: string): string {
  return `${OUTBOX_REQUEST_ID_PREFIX}${itemId}`;
}
