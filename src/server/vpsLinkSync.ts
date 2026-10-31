import { nanoid } from "nanoid";
import type { ZodType } from "zod";

import { getErrorMessage } from "../shared/errors.ts";
import {
  BRIDGE_PROTOCOL_VERSION,
  MAC_CATALOGUE_MAX_PROJECTS,
  bridgeCataloguePublishOutputSchema,
  bridgeCreateTicketOutputSchema,
  bridgeListProjectsOutputSchema,
  bridgeOutboxAckOutputSchema,
  bridgeOutboxFetchOutputSchema,
  bridgeRequestId,
  bridgeVersionOutputSchema,
  vpsTicketDraftSchema,
} from "../shared/vpsBridge.ts";
import type {
  BoardProject,
  BridgeCataloguePublishInput,
  BridgeOp,
  OutboxAck,
  VpsCreateTicketResponse,
  VpsCreatedTicket,
  VpsPendingSend,
} from "../shared/vpsBridge.ts";

import { getProject } from "./config.ts";
import type { Store } from "./db/store.ts";
import { createLogger } from "./logger.ts";
import { remoteAllowedProjects } from "./remoteMcp/admission.ts";
import type { SystemAdapter } from "./system/types.ts";
import type { VpsBridgeFailureKind } from "./system/vpsBridge.ts";
import type { TicketOperations } from "./ticketOperations.ts";
import { admitVpsOutboxItem } from "./vpsOutboxImport.ts";

const SYNC_INTERVAL_MS = 5 * 60_000;
const VERSION_CHECK_TTL_MS = SYNC_INTERVAL_MS;
const OUTBOX_MAX_PAGES_PER_SYNC = 10;
const log = createLogger("vps-link");

export type VpsLinkErrorKind = VpsBridgeFailureKind | "not_configured" | "rejected" | "not_found";

const FAILURE_MESSAGES: Record<VpsBridgeFailureKind, string> = {
  invalid_request: "Requête refusée avant l'envoi au VPS (alias SSH invalide ou contenu trop volumineux).",
  auth: "Connexion SSH au VPS refusée : la clé n'est pas autorisée.",
  host_key: "Clé d'hôte SSH du VPS inconnue ou modifiée : vérifiez ~/.ssh/known_hosts.",
  unreachable: "VPS injoignable par SSH.",
  timeout: "Délai dépassé en joignant le VPS.",
  remote_missing: "Programme du pont absent sur le VPS : mettez le VPS à jour.",
  version_mismatch: "Le pont du VPS n'a pas la même version que le Mac : mettez les deux à jour.",
  remote_unavailable: "Le serveur Kanban du VPS ne répond pas.",
  bad_output: "Réponse illisible du VPS.",
};
const NOT_CONFIGURED_MESSAGE = "Configurez l'alias SSH du VPS dans les réglages.";

export class VpsLinkError extends Error {
  constructor(
    readonly kind: VpsLinkErrorKind,
    message: string,
  ) {
    super(message);
    this.name = "VpsLinkError";
  }
}

type DeliveryOutcome =
  | { status: "created"; ticket: VpsCreatedTicket }
  | { status: "rejected"; message: string }
  | { status: "pending"; send: VpsPendingSend };

function isPermanentFailure(kind: VpsLinkErrorKind): boolean {
  return kind === "rejected" || kind === "invalid_request";
}

export interface VpsLinkSyncDeps {
  store: Store;
  system: Pick<SystemAdapter, "runVpsBridge" | "checkCodexRuntime" | "checkClaudeAvailable">;
  operations: Pick<TicketOperations, "createTodoTicket">;
  composerAvailable: boolean;
}

/**
 * Mac-side link to the VPS board: sends N3 creations over the SSH bridge, keeps the unconfirmed ones in
 * `vps_pending_sends` and retries them with the same request id on a 5-minute task, without expiry.
 */
export class VpsLinkSync {
  private timer: ReturnType<typeof setTimeout> | null = null;
  private running: Promise<void> | null = null;
  private stopped = true;
  private readonly inFlight = new Set<string>();
  private readonly projectLabels = new Map<string, string>();
  private compatibility: { alias: string; checkedAt: number } | null = null;

  constructor(private readonly deps: VpsLinkSyncDeps) {}

  start(): void {
    if (!this.stopped) return;
    this.stopped = false;
    this.schedule(0);
  }

  async stop(): Promise<void> {
    this.stopped = true;
    if (this.timer !== null) clearTimeout(this.timer);
    this.timer = null;
    await this.running;
  }

  async listProjects(): Promise<BoardProject[]> {
    const { projects } = await this.call("list_projects", {}, bridgeListProjectsOutputSchema);
    for (const project of projects) this.projectLabels.set(project.key, project.label);
    return projects;
  }

  listSends(): VpsPendingSend[] {
    return this.deps.store.listVpsPendingSends();
  }

  dismissSend(id: string): void {
    if (!this.deps.store.deleteVpsPendingSend(id)) throw new VpsLinkError("not_found", "Envoi introuvable.");
  }

  async createTicket(input: unknown): Promise<VpsCreateTicketResponse> {
    const draft = vpsTicketDraftSchema.safeParse(input);
    if (!draft.success) throw new VpsLinkError("invalid_request", draft.error.issues[0]?.message ?? "Requête invalide.");
    this.hostAlias();
    const id = nanoid();
    const send = this.deps.store.createVpsPendingSend({
      id,
      requestId: bridgeRequestId(id),
      draft: draft.data,
      projectLabel: this.projectLabels.get(draft.data.project) ?? null,
    });
    const outcome = await this.deliver(send);
    if (outcome.status === "rejected") {
      this.deps.store.deleteVpsPendingSend(id);
      throw new VpsLinkError("rejected", outcome.message);
    }
    return outcome.status === "created" ? { status: "created", ticket: outcome.ticket } : { status: "pending", send: outcome.send };
  }

  private schedule(delay: number): void {
    if (this.stopped) return;
    this.timer = setTimeout(() => {
      this.timer = null;
      this.running = this.sync().catch((error: unknown) => {
        log.error("synchronisation avec le VPS échouée", { error: getErrorMessage(error) });
      }).finally(() => {
        this.running = null;
        this.schedule(SYNC_INTERVAL_MS);
      });
    }, delay);
  }

  private async sync(): Promise<void> {
    if (this.deps.store.getAppSettings().sshHostAlias === null) return;
    if (!(await this.retryPendingSends())) return;
    try {
      await this.publishCatalogue();
      await this.importOutbox();
    } catch (error) {
      if (!(error instanceof VpsLinkError)) throw error;
      log.warn("synchronisation de la boîte d'envoi du VPS interrompue", { kind: error.kind, error: error.message });
    }
  }

  private async retryPendingSends(): Promise<boolean> {
    for (const send of this.deps.store.listVpsPendingSends()) {
      if (this.stopped) return false;
      if (send.status !== "pending" || this.inFlight.has(send.id)) continue;
      const outcome = await this.deliver(send);
      if (outcome.status === "rejected") this.deps.store.recordVpsSendAttempt(send.id, { status: "failed", lastError: outcome.message });
      if (outcome.status === "pending") return false;
    }
    return !this.stopped;
  }

  private catalogue(): BridgeCataloguePublishInput {
    const projects = [...remoteAllowedProjects(this.deps.store)].slice(0, MAC_CATALOGUE_MAX_PROJECTS).map((key) => {
      const { label, baseBranch, vcsProvider } = getProject(key);
      return { key, label, baseBranch, vcsProvider };
    });
    return { boardName: this.deps.store.getAppSettings().boardName, projects };
  }

  private async publishCatalogue(): Promise<void> {
    const catalogue = this.catalogue();
    await this.call("catalogue_publish", catalogue, bridgeCataloguePublishOutputSchema);
    log.info("catalogue du Mac publié sur le VPS", { projects: catalogue.projects.length });
  }

  private async importOutbox(): Promise<void> {
    for (let page = 0; page < OUTBOX_MAX_PAGES_PER_SYNC; page += 1) {
      if (this.stopped) return;
      const { items } = await this.call("outbox_fetch", {}, bridgeOutboxFetchOutputSchema);
      if (items.length === 0) return;
      const acks: OutboxAck[] = [];
      for (const item of items) {
        const ack = await admitVpsOutboxItem(this.deps, item).catch((error: unknown) => {
          log.error("envoi du VPS non importé", { outboxId: item.id, error: getErrorMessage(error) });
          return null;
        });
        if (ack !== null) acks.push(ack);
      }
      if (acks.length > 0) await this.call("outbox_ack", { acks }, bridgeOutboxAckOutputSchema);
      if (acks.length < items.length) return;
    }
  }

  private async deliver(send: VpsPendingSend): Promise<DeliveryOutcome> {
    this.inFlight.add(send.id);
    try {
      const { created, ticket } = await this.call("create_ticket", { requestId: send.requestId, ...send.draft }, bridgeCreateTicketOutputSchema);
      this.deps.store.deleteVpsPendingSend(send.id);
      log.info("carte créée sur le VPS", { sendId: send.id, ticketId: ticket.id, replay: !created });
      return { status: "created", ticket };
    } catch (error) {
      const failure = error instanceof VpsLinkError ? error : new VpsLinkError("bad_output", getErrorMessage(error));
      if (isPermanentFailure(failure.kind)) return { status: "rejected", message: failure.message };
      const updated = this.deps.store.recordVpsSendAttempt(send.id, { status: "pending", lastError: failure.message });
      return { status: "pending", send: updated ?? send };
    } finally {
      this.inFlight.delete(send.id);
    }
  }

  private hostAlias(): string {
    const alias = this.deps.store.getAppSettings().sshHostAlias;
    if (alias === null) throw new VpsLinkError("not_configured", NOT_CONFIGURED_MESSAGE);
    return alias;
  }

  private async call<T>(op: Exclude<BridgeOp, "version">, input: unknown, schema: ZodType<T>): Promise<T> {
    const alias = this.hostAlias();
    await this.ensureCompatible(alias);
    return this.invoke(alias, op, input, schema);
  }

  private async ensureCompatible(alias: string): Promise<void> {
    const checked = this.compatibility;
    if (checked !== null && checked.alias === alias && Date.now() - checked.checkedAt < VERSION_CHECK_TTL_MS) return;
    const { protocolVersion } = await this.invoke(alias, "version", {}, bridgeVersionOutputSchema);
    if (protocolVersion !== BRIDGE_PROTOCOL_VERSION) {
      log.warn("version du pont VPS différente", { mac: BRIDGE_PROTOCOL_VERSION, vps: protocolVersion });
      throw new VpsLinkError("version_mismatch", `${FAILURE_MESSAGES.version_mismatch} (Mac ${BRIDGE_PROTOCOL_VERSION}, VPS ${protocolVersion})`);
    }
    this.compatibility = { alias, checkedAt: Date.now() };
  }

  private async invoke<T>(alias: string, op: BridgeOp, input: unknown, schema: ZodType<T>): Promise<T> {
    const result = await this.deps.system.runVpsBridge({ hostAlias: alias, op, input });
    if (!result.ok) {
      this.compatibility = null;
      log.warn("pont VPS en échec", { op, kind: result.kind, detail: result.detail });
      throw new VpsLinkError(result.kind, FAILURE_MESSAGES[result.kind]);
    }
    if (!result.envelope.ok) {
      if (result.envelope.error.code === "UNKNOWN_OP") throw new VpsLinkError("version_mismatch", FAILURE_MESSAGES.version_mismatch);
      if (result.envelope.error.code === "INTERNAL") throw new VpsLinkError("remote_unavailable", FAILURE_MESSAGES.remote_unavailable);
      throw new VpsLinkError("rejected", `Le VPS a refusé la demande : ${result.envelope.error.message}`);
    }
    const parsed = schema.safeParse(result.envelope.result);
    if (!parsed.success) throw new VpsLinkError("bad_output", FAILURE_MESSAGES.bad_output);
    return parsed.data;
  }
}
