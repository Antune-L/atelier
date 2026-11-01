import { getErrorMessage } from "../shared/errors.ts";
import { CONDITIONAL_WORKER_TOOL_NAMES } from "../shared/protocol.ts";
import type { WorkerToolName } from "../shared/protocol.ts";
import {
  MAC_CATALOGUE_STALE_AFTER_MS,
  OUTBOX_FETCH_MAX_CHARS,
  OUTBOX_FETCH_MAX_ITEMS,
  OUTBOX_ITEM_ID_PREFIXES,
  macOutboxDraftSchema,
  macOutboxTransferInputSchema,
  outboxItemIdSchema,
} from "../shared/vpsBridge.ts";
import type {
  BridgeCataloguePublishInput,
  BridgeOutboxItem,
  MacCatalogue,
  MacOutboxDraft,
  MacOutboxItem,
  MacOutboxSource,
  MacOutboxState,
  OutboxAck,
} from "../shared/vpsBridge.ts";

import { prepareCardTransfer } from "./cardTransfer.ts";
import { MacOutboxConflictError } from "./db/store.ts";
import type { Store } from "./db/store.ts";
import { isCloudHost } from "./hostRole.ts";
import type { TicketLifecycle } from "./lifecycle.ts";
import { createLogger } from "./logger.ts";

const MAC_OUTBOX_LIST_LIMIT = 100;
const TRANSFER_SOURCE = "transfer";
const TRANSFER_BOARD = "mac";
const TRANSFER_CANCELLED_REASON = "envoi annulé depuis le VPS (si le Mac l'avait déjà relevé, la carte peut exister des deux côtés).";
const log = createLogger("mac-outbox");

export interface MacOutboxTransferDeps {
  store: Store;
  lifecycle: Pick<TicketLifecycle, "transferOut" | "revertTransfer">;
}

export type MacOutboxAckDeps = { store: Store; lifecycle: Pick<TicketLifecycle, "revertTransfer"> };

export type MacOutboxErrorCode = "INVALID_INPUT" | "NOT_FOUND" | "CONFLICT" | "UNAVAILABLE";

export class MacOutboxError extends Error {
  constructor(
    readonly code: MacOutboxErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "MacOutboxError";
  }
}

export interface MacOutboxEnqueueRequest {
  id: string;
  draft: MacOutboxDraft;
  source: MacOutboxSource;
  sourceTicketId: string | null;
}

export function readMacCatalogue(store: Store, now: number = Date.now()): MacCatalogue | null {
  const catalogue = store.getMacCatalogue();
  if (catalogue === null) return null;
  return { ...catalogue, stale: now - catalogue.publishedAt > MAC_CATALOGUE_STALE_AFTER_MS };
}

export function macOutboxAvailable(store: Store): boolean {
  return isCloudHost() && (store.getMacCatalogue()?.projects.length ?? 0) > 0;
}

export function macOutboxWorkerTools(store: Store): WorkerToolName[] {
  return macOutboxAvailable(store) ? [...CONDITIONAL_WORKER_TOOL_NAMES] : [];
}

export function macOutboxState(store: Store): MacOutboxState {
  return { catalogue: readMacCatalogue(store), items: store.listMacOutbox(MAC_OUTBOX_LIST_LIMIT) };
}

export function publishMacCatalogue(store: Store, input: BridgeCataloguePublishInput): { publishedAt: number } {
  const publishedAt = Date.now();
  store.publishMacCatalogue(input, publishedAt);
  return { publishedAt };
}

export function enqueueMacOutboxItem(store: Store, request: MacOutboxEnqueueRequest): { created: boolean; item: MacOutboxItem } {
  if (!outboxItemIdSchema.safeParse(request.id).success) throw new MacOutboxError("INVALID_INPUT", "Identifiant d'envoi invalide.");
  if (!isCloudHost()) throw new MacOutboxError("UNAVAILABLE", "L'envoi vers le Mac n'existe que sur le board VPS.");
  const catalogue = store.getMacCatalogue();
  if (catalogue === null) throw new MacOutboxError("UNAVAILABLE", "Aucun catalogue de projets publié par le Mac : ouvrez l'application sur le Mac avec l'alias SSH du VPS configuré.");
  const project = catalogue.projects.find((candidate) => candidate.key === request.draft.project);
  if (project === undefined) throw new MacOutboxError("NOT_FOUND", `Projet absent du catalogue du Mac : ${request.draft.project}`);
  try {
    return store.enqueueMacOutboxItem({
      id: request.id,
      project: project.key,
      projectLabel: project.label,
      title: request.draft.title,
      description: request.draft.description,
      source: request.source,
      sourceTicketId: request.sourceTicketId,
    });
  } catch (error) {
    if (error instanceof MacOutboxConflictError) throw new MacOutboxError("CONFLICT", error.message);
    throw error;
  }
}

export function fetchMacOutbox(store: Store): BridgeOutboxItem[] {
  const items: BridgeOutboxItem[] = [];
  let chars = 0;
  for (const item of store.listPendingMacOutbox(OUTBOX_FETCH_MAX_ITEMS)) {
    chars += item.title.length + item.description.length;
    if (items.length > 0 && chars > OUTBOX_FETCH_MAX_CHARS) break;
    items.push({ id: item.id, project: item.project, title: item.title, description: item.description, createdAt: item.createdAt });
  }
  return items;
}

// NOTE(ali): a refused transfer brings its card back after the ack transaction; a failed revival never fails the ack.
export function acknowledgeMacOutbox(deps: MacOutboxAckDeps, acks: readonly OutboxAck[]): number {
  const at = Date.now();
  const applied = deps.store.transaction(() => acks.filter((ack) => deps.store.acknowledgeMacOutboxItem(ack, at)));
  for (const ack of applied) {
    if (ack.status === "rejected") revertRefusedTransfer(deps, ack.id, ack.reason);
  }
  return applied.length;
}

function revertRefusedTransfer(deps: MacOutboxAckDeps, itemId: string, reason: string): void {
  const item = deps.store.getMacOutboxItem(itemId);
  if (item === null || item.source !== TRANSFER_SOURCE || item.sourceTicketId === null) return;
  try {
    deps.lifecycle.revertTransfer(item.sourceTicketId, TRANSFER_BOARD, reason);
  } catch (error) {
    log.error("carte transférée non rétablie après refus du Mac", { outboxId: itemId, ticketId: item.sourceTicketId, error: getErrorMessage(error) });
  }
}

// NOTE(ali): the card leaves this board (abandoned) in the same transaction as its outbox entry; the Mac answers at its next sync.
export function transferCardToMac(deps: MacOutboxTransferDeps, ticketId: string, input: unknown): { created: boolean; item: MacOutboxItem } {
  const parsed = macOutboxTransferInputSchema.safeParse(input);
  if (!parsed.success) throw new MacOutboxError("INVALID_INPUT", parsed.error.issues[0]?.message ?? "Requête invalide.");
  const { clientId, project } = parsed.data;
  const { draft } = prepareCardTransfer(deps.store, ticketId);
  const checked = macOutboxDraftSchema.safeParse({ project, ...draft });
  if (!checked.success) throw new MacOutboxError("INVALID_INPUT", checked.error.issues[0]?.message ?? "Requête invalide.");
  const id = `${OUTBOX_ITEM_ID_PREFIXES.transfer}${clientId}`;
  const projectLabel = deps.store.getMacCatalogue()?.projects.find((candidate) => candidate.key === project)?.label ?? project;
  return deps.lifecycle.transferOut(
    ticketId,
    { board: TRANSFER_BOARD, sendId: id, projectLabel },
    () => enqueueMacOutboxItem(deps.store, { id, draft: checked.data, source: TRANSFER_SOURCE, sourceTicketId: ticketId }),
  );
}

export function cancelMacOutboxTransfer(deps: MacOutboxAckDeps, itemId: string): MacOutboxItem {
  const item = deps.store.getMacOutboxItem(itemId);
  if (item === null) throw new MacOutboxError("NOT_FOUND", "Envoi introuvable.");
  if (item.source !== TRANSFER_SOURCE) throw new MacOutboxError("CONFLICT", "Seul l'envoi d'une carte existante peut être annulé.");
  const cancelled = deps.store.acknowledgeMacOutboxItem({ id: itemId, status: "rejected", reason: TRANSFER_CANCELLED_REASON }, Date.now());
  if (!cancelled) throw new MacOutboxError("CONFLICT", "Le Mac a déjà répondu à cet envoi.");
  revertRefusedTransfer(deps, itemId, TRANSFER_CANCELLED_REASON);
  const updated = deps.store.getMacOutboxItem(itemId);
  if (updated === null) throw new MacOutboxError("NOT_FOUND", "Envoi introuvable.");
  return updated;
}
