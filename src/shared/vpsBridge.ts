import { z } from "zod";

import { VCS_PROVIDERS } from "./constants.ts";

// NOTE: bump on any breaking change to an op, its input or its output; the Mac refuses a VPS reporting another version.
export const BRIDGE_PROTOCOL_VERSION = 1;

export const BRIDGE_OPS = ["version", "list_projects", "create_ticket"] as const;
export type BridgeOp = (typeof BRIDGE_OPS)[number];

export const BRIDGE_REQUEST_ID_PREFIX = "mac:";
const BRIDGE_REQUEST_SUFFIX_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;
export const BRIDGE_MAX_REQUEST_BYTES = 256 * 1024;
const BRIDGE_TITLE_MAX_LENGTH = 500;
const BRIDGE_DESCRIPTION_MAX_LENGTH = 100_000;
const BRIDGE_PROJECT_KEY_MAX_LENGTH = 200;

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
  project: z.string().trim().min(1).max(BRIDGE_PROJECT_KEY_MAX_LENGTH),
  title: z.string().max(BRIDGE_TITLE_MAX_LENGTH),
  description: z.string().max(BRIDGE_DESCRIPTION_MAX_LENGTH),
  analysis: z.enum(VPS_ANALYSIS_MODES),
});

function hasTitleOrDescription(input: { title: string; description: string }): boolean {
  return input.title.trim().length > 0 || input.description.trim().length > 0;
}

const TITLE_OR_DESCRIPTION_ISSUE = { message: "title or description required", path: ["title"] };

export const vpsTicketDraftSchema = vpsTicketDraftFields.strict().refine(hasTitleOrDescription, TITLE_OR_DESCRIPTION_ISSUE);
export type VpsTicketDraft = z.infer<typeof vpsTicketDraftSchema>;

export const bridgeCreateTicketInputSchema = vpsTicketDraftFields.extend({
  requestId: z.string().refine(
    (value) => value.startsWith(BRIDGE_REQUEST_ID_PREFIX) && BRIDGE_REQUEST_SUFFIX_PATTERN.test(value.slice(BRIDGE_REQUEST_ID_PREFIX.length)),
    { message: `requestId must be ${BRIDGE_REQUEST_ID_PREFIX}<id>` },
  ),
}).strict().refine(hasTitleOrDescription, TITLE_OR_DESCRIPTION_ISSUE);
export type BridgeCreateTicketInput = z.infer<typeof bridgeCreateTicketInputSchema>;

export const bridgeEmptyInputSchema = z.object({}).strict();

export const bridgeVersionOutputSchema = z.object({ protocolVersion: z.number().int() }).strict();

export const vpsProjectSchema = z.object({
  key: z.string(),
  label: z.string(),
  baseBranch: z.string(),
  vcsProvider: z.enum(VCS_PROVIDERS),
}).strict();
export type VpsProject = z.infer<typeof vpsProjectSchema>;

export const bridgeListProjectsOutputSchema = z.object({ projects: z.array(vpsProjectSchema) }).strict();

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
