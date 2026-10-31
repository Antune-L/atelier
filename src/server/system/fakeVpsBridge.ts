import { sshHostAliasSchema } from "../../shared/boardLink.ts";
import {
  BRIDGE_PROTOCOL_VERSION,
  BRIDGE_REQUEST_ID_PREFIX,
  bridgeCataloguePublishInputSchema,
  bridgeCreateTicketInputSchema,
  bridgeOutboxAckInputSchema,
  draftTitle,
} from "../../shared/vpsBridge.ts";
import type { BoardProject, BridgeEnvelope, VpsCreatedTicket } from "../../shared/vpsBridge.ts";

import { VPS_BRIDGE_FAILURE_KINDS } from "./vpsBridge.ts";
import type { VpsBridgeCall, VpsBridgeResult } from "./vpsBridge.ts";

// NOTE: set to a failure kind (e.g. `unreachable`) to simulate a broken bridge in dry-run.
const FAKE_FAILURE_ENV = "KANBAN_FAKE_VPS_BRIDGE_FAILURE";
const FAKE_TICKET_ID_PREFIX = "vps-";
const FAKE_PROJECTS: BoardProject[] = [
  { key: "vps-github", label: "Projet VPS GitHub (simulé)", baseBranch: "main", vcsProvider: "github" },
  { key: "vps-azure", label: "Projet VPS Azure DevOps (simulé)", baseBranch: "main", vcsProvider: "azureDevops" },
];

function failureFromEnv(): VpsBridgeResult | null {
  const configured = process.env[FAKE_FAILURE_ENV]?.trim();
  const kind = VPS_BRIDGE_FAILURE_KINDS.find((candidate) => candidate === configured);
  return kind === undefined ? null : { ok: false, kind, detail: "simulated failure" };
}

function rejected(code: "INVALID_INPUT" | "CONFLICT", message: string): BridgeEnvelope {
  return { ok: false, error: { code, message } };
}

function invalidInput(issues: readonly { message: string }[]): BridgeEnvelope {
  return rejected("INVALID_INPUT", issues[0]?.message ?? "invalid input");
}

export class FakeVpsBridge {
  private readonly created = new Map<string, { payload: string; ticket: VpsCreatedTicket }>();

  run(call: VpsBridgeCall): VpsBridgeResult {
    if (!sshHostAliasSchema.safeParse(call.hostAlias).success) return { ok: false, kind: "invalid_request", detail: "invalid SSH host alias" };
    const simulated = failureFromEnv();
    if (simulated !== null) return simulated;
    if (call.op === "version") return { ok: true, envelope: { ok: true, result: { protocolVersion: BRIDGE_PROTOCOL_VERSION } } };
    if (call.op === "list_projects") return { ok: true, envelope: { ok: true, result: { projects: FAKE_PROJECTS } } };
    if (call.op === "create_ticket") return { ok: true, envelope: this.createTicket(call.input) };
    return { ok: true, envelope: this.outboxOp(call) };
  }

  private outboxOp(call: VpsBridgeCall): BridgeEnvelope {
    if (call.op === "catalogue_publish") {
      const parsed = bridgeCataloguePublishInputSchema.safeParse(call.input);
      return parsed.success ? { ok: true, result: { publishedAt: Date.now() } } : invalidInput(parsed.error.issues);
    }
    if (call.op === "outbox_ack") {
      const parsed = bridgeOutboxAckInputSchema.safeParse(call.input);
      return parsed.success ? { ok: true, result: { acknowledged: 0 } } : invalidInput(parsed.error.issues);
    }
    return { ok: true, result: { items: [] } };
  }

  private createTicket(input: unknown): BridgeEnvelope {
    const parsed = bridgeCreateTicketInputSchema.safeParse(input);
    if (!parsed.success) return invalidInput(parsed.error.issues);
    const { requestId, ...draft } = parsed.data;
    if (!FAKE_PROJECTS.some((project) => project.key === draft.project)) return rejected("INVALID_INPUT", "unknown project");
    const payload = JSON.stringify(draft);
    const existing = this.created.get(requestId);
    if (existing !== undefined) {
      if (existing.payload !== payload) return rejected("CONFLICT", `request key ${requestId} was already used with different content`);
      return { ok: true, result: { created: false, ticket: existing.ticket } };
    }
    const ticket = {
      id: `${FAKE_TICKET_ID_PREFIX}${requestId.slice(BRIDGE_REQUEST_ID_PREFIX.length)}`,
      title: draftTitle(draft),
      project: draft.project,
    };
    this.created.set(requestId, { payload, ticket });
    return { ok: true, result: { created: true, ticket } };
  }
}
