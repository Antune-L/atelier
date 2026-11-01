
import type { ZodType } from "zod";

import { getErrorMessage } from "../shared/errors.ts";
import { isRemoteTicket } from "../shared/startBlocker.ts";
import {
  BRIDGE_MAX_REQUEST_BYTES,
  BRIDGE_PROTOCOL_VERSION,
  MAC_CATALOGUE_MAX_PROJECTS,
  bridgeCataloguePublishOutputSchema,
  bridgeCreateTicketOutputSchema,
  bridgeListProjectsOutputSchema,
  bridgeOutboxAckOutputSchema,
  bridgeOutboxFetchOutputSchema,
  bridgeRequestId,
  bridgeUsagePublishOutputSchema,
  bridgeVersionOutputSchema,
  vpsCreateTicketInputSchema,
  vpsTicketDraftSchema,
  vpsTransferTicketInputSchema,
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

import { prepareCardTransfer } from "./cardTransfer.ts";
import { getProject } from "./config.ts";
import type { Store } from "./db/store.ts";
import type { TicketLifecycle } from "./lifecycle.ts";
import { createLogger } from "./logger.ts";
import { remoteAllowedProjects, resolveRemoteCardsProfile } from "./remoteMcp/admission.ts";
import type { SystemAdapter } from "./system/types.ts";
import type { VpsBridgeFailureKind } from "./system/vpsBridge.ts";
import type { TicketOperations } from "./ticketOperations.ts";
import { computeMacUsageSnapshot } from "./usage/summary.ts";
import { admitVpsOutboxItem } from "./vpsOutboxImport.ts";

const SYNC_INTERVAL_MS = 5 * 60_000;
const VERSION_CHECK_TTL_MS = SYNC_INTERVAL_MS;
const OUTBOX_MAX_PAGES_PER_SYNC = 10;
const USAGE_PUBLISH_INTERVAL_MS = 60 * 60_000;
const log = createLogger("vps-link");

export type VpsLinkErrorKind = VpsBridgeFailureKind | "not_configured" | "rejected" | "not_found" | "conflict";

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
const SEND_ID_TAKEN_MESSAGE = "Identifiant d'envoi déjà utilisé.";
const SEND_IN_FLIGHT_MESSAGE = "Envoi en cours vers le VPS : réessayez dans un instant.";
const TRANSFER_DISMISSED_REASON = "envoi retiré par l'utilisateur (la carte existe peut-être déjà sur le VPS).";
const TRANSFER_BOARD = "vps";

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
  system: Pick<SystemAdapter, "runVpsBridge" | "checkCodexRuntime" | "checkClaudeAvailable" | "readUsageHistory">;
  operations: Pick<TicketOperations, "createTodoTicket">;
  lifecycle: Pick<TicketLifecycle, "transferOut" | "revertTransfer">;
  composerAvailable: boolean;
}

// NOTE(ali): unconfirmed sends stay in `vps_pending_sends` and are retried with the same request id on every sync, without expiry.
export class VpsLinkSync {
  private timer: ReturnType<typeof setTimeout> | null = null;
  private running: Promise<void> | null = null;
  private stopped = true;
  private readonly inFlight = new Set<string>();
  private readonly projectLabels = new Map<string, string>();
  private compatibility: { alias: string; checkedAt: number } | null = null;
  private usageCheckedAt: number | null = null;
  private readonly usageWarnings = new Set<string>();

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
    const send = this.deps.store.getVpsPendingSend(id);
    if (send !== null && send.sourceTicketId !== null && this.inFlight.has(id)) throw new VpsLinkError("conflict", SEND_IN_FLIGHT_MESSAGE);
    if (!this.deps.store.deleteVpsPendingSend(id)) throw new VpsLinkError("not_found", "Envoi introuvable.");
    if (send !== null) this.revertTransferOf(send, TRANSFER_DISMISSED_REASON);
  }

  async createTicket(input: unknown): Promise<VpsCreateTicketResponse> {
    const parsed = vpsCreateTicketInputSchema.safeParse(input);
    if (!parsed.success) throw new VpsLinkError("invalid_request", parsed.error.issues[0]?.message ?? "Requête invalide.");
    this.hostAlias();
    const { clientId: id, ...draft } = parsed.data;
    const existing = this.deps.store.getVpsPendingSend(id);
    if (existing?.status === "failed") throw new VpsLinkError("rejected", existing.lastError ?? "Envoi refusé par le VPS.");
    if (existing !== null && this.inFlight.has(id)) return { status: "pending", send: existing };
    const send = existing ?? this.deps.store.createVpsPendingSend({
      id,
      requestId: bridgeRequestId(id),
      draft,
      projectLabel: this.projectLabels.get(draft.project) ?? null,
      sourceTicketId: null,
    });
    return this.deliverFirst(send);
  }

  // NOTE(ali): the card leaves this board (abandoned) together with the durable send, before the SSH call; a refusal brings it back.
  async transferTicket(ticketId: string, input: unknown): Promise<VpsCreateTicketResponse> {
    const parsed = vpsTransferTicketInputSchema.safeParse(input);
    if (!parsed.success) throw new VpsLinkError("invalid_request", parsed.error.issues[0]?.message ?? "Requête invalide.");
    this.hostAlias();
    const { clientId: id, project, analysis } = parsed.data;
    if (this.deps.store.getVpsPendingSend(id) !== null) throw new VpsLinkError("conflict", SEND_ID_TAKEN_MESSAGE);
    const { ticket, draft } = prepareCardTransfer(this.deps.store, ticketId);
    const checked = vpsTicketDraftSchema.safeParse({ project, ...draft, analysis: isRemoteTicket(ticket) ? "none" : analysis });
    if (!checked.success) throw new VpsLinkError("invalid_request", checked.error.issues[0]?.message ?? "Requête invalide.");
    const projectLabel = this.projectLabels.get(project) ?? null;
    const send = this.deps.lifecycle.transferOut(
      ticketId,
      { board: TRANSFER_BOARD, sendId: id, projectLabel: projectLabel ?? project },
      () => this.deps.store.createVpsPendingSend({ id, requestId: bridgeRequestId(id), draft: checked.data, projectLabel, sourceTicketId: ticketId }),
    );
    return this.deliverFirst(send);
  }

  private async deliverFirst(send: VpsPendingSend): Promise<VpsCreateTicketResponse> {
    const outcome = await this.deliver(send);
    if (outcome.status === "rejected") {
      this.deps.store.deleteVpsPendingSend(send.id);
      this.revertTransferOf(send, outcome.message);
      throw new VpsLinkError("rejected", outcome.message);
    }
    return outcome.status === "created" ? { status: "created", ticket: outcome.ticket } : { status: "pending", send: outcome.send };
  }

  private revertTransferOf(send: VpsPendingSend, reason: string): void {
    if (send.sourceTicketId === null) return;
    this.deps.lifecycle.revertTransfer(send.sourceTicketId, TRANSFER_BOARD, send.id, reason);
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
    await this.publishUsage();
  }

  // NOTE(ali): best effort; a failure here never blocks sends, the catalogue or the outbox, and is retried on the next tick.
  private async publishUsage(): Promise<void> {
    const now = Date.now();
    if (this.stopped || (this.usageCheckedAt !== null && now - this.usageCheckedAt < USAGE_PUBLISH_INTERVAL_MS)) return;
    try {
      await this.publishUsageSnapshot(now);
      this.usageCheckedAt = now;
    } catch (error) {
      if (error instanceof VpsLinkError && error.kind === "version_mismatch") {
        this.usageCheckedAt = now;
        this.warnUsageOnce("unsupported", "le VPS ne reçoit pas encore la consommation du Mac : mettez le VPS à jour", { error: error.message });
        return;
      }
      log.warn("publication de la consommation du Mac échouée", { error: getErrorMessage(error) });
    }
  }

  private async publishUsageSnapshot(now: number): Promise<void> {
    const snapshot = await computeMacUsageSnapshot(this.deps, now);
    if (Buffer.byteLength(JSON.stringify(snapshot)) > BRIDGE_MAX_REQUEST_BYTES) {
      this.warnUsageOnce("oversize", "consommation du Mac trop volumineuse pour le pont VPS, non publiée", { maxBytes: BRIDGE_MAX_REQUEST_BYTES });
      return;
    }
    await this.call("usage_publish", snapshot, bridgeUsagePublishOutputSchema);
    log.info("consommation du Mac publiée sur le VPS");
  }

  private warnUsageOnce(key: string, message: string, context: Record<string, unknown>): void {
    if (this.usageWarnings.has(key)) return;
    this.usageWarnings.add(key);
    log.warn(message, context);
  }

  private async retryPendingSends(): Promise<boolean> {
    for (const listed of this.deps.store.listVpsPendingSends()) {
      if (this.stopped) return false;
      const send = this.deps.store.getVpsPendingSend(listed.id);
      if (send === null || send.status !== "pending" || this.inFlight.has(send.id)) continue;
      const outcome = await this.deliver(send);
      if (outcome.status === "rejected") {
        this.deps.store.recordVpsSendAttempt(send.id, { status: "failed", lastError: outcome.message });
        this.revertTransferOf(send, outcome.message);
      }
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
      const profile = await resolveRemoteCardsProfile(this.deps);
      for (const item of items) {
        try {
          const ack = admitVpsOutboxItem(this.deps, item, profile);
          if (ack !== null) acks.push(ack);
        } catch (error) {
          log.error("envoi du VPS non importé", { outboxId: item.id, error: getErrorMessage(error) });
        }
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
      // NOTE(ali): an unknown op on an older VPS bridge program says nothing about the other ops, so the version check is kept.
      if (op === "version" || result.kind !== "version_mismatch") this.compatibility = null;
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
