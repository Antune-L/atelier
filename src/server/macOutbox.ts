import { CONDITIONAL_WORKER_TOOL_NAMES } from "../shared/protocol.ts";
import type { WorkerToolName } from "../shared/protocol.ts";
import { MAC_CATALOGUE_STALE_AFTER_MS, OUTBOX_FETCH_MAX_CHARS, OUTBOX_FETCH_MAX_ITEMS, outboxItemIdSchema } from "../shared/vpsBridge.ts";
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

import { MacOutboxConflictError } from "./db/store.ts";
import type { Store } from "./db/store.ts";
import { isCloudHost } from "./hostRole.ts";

const MAC_OUTBOX_LIST_LIMIT = 100;

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

export function acknowledgeMacOutbox(store: Store, acks: readonly OutboxAck[]): number {
  const at = Date.now();
  return store.transaction(() => acks.filter((ack) => store.acknowledgeMacOutboxItem(ack, at)).length);
}
