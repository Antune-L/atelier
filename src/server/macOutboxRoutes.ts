import { Elysia } from "elysia";

import { OUTBOX_ITEM_ID_PREFIXES, macOutboxEnqueueInputSchema } from "../shared/vpsBridge.ts";

import { CARD_TRANSFER_ERROR_STATUS, CardTransferError } from "./cardTransfer.ts";
import type { Store } from "./db/store.ts";
import type { TicketLifecycle } from "./lifecycle.ts";
import { MacOutboxError, cancelMacOutboxTransfer, enqueueMacOutboxItem, macOutboxState, transferCardToMac } from "./macOutbox.ts";
import type { MacOutboxErrorCode } from "./macOutbox.ts";

const HTTP_OK = 200;
const HTTP_CREATED = 201;
const HTTP_BAD_REQUEST = 400;
const HTTP_NOT_FOUND = 404;
const HTTP_CONFLICT = 409;

const MAC_OUTBOX_ERROR_STATUS: Record<MacOutboxErrorCode, number> = {
  INVALID_INPUT: HTTP_BAD_REQUEST,
  NOT_FOUND: HTTP_NOT_FOUND,
  CONFLICT: HTTP_CONFLICT,
  UNAVAILABLE: HTTP_CONFLICT,
};

type StatusSetter = { status?: number | string };

function handle<T>(set: StatusSetter, action: () => T): T | { error: string } {
  try {
    return action();
  } catch (error) {
    if (error instanceof MacOutboxError) {
      set.status = MAC_OUTBOX_ERROR_STATUS[error.code];
      return { error: error.message };
    }
    if (error instanceof CardTransferError) {
      set.status = CARD_TRANSFER_ERROR_STATUS[error.code];
      return { error: error.message };
    }
    throw error;
  }
}

// NOTE(ali): VPS-only routes of the "Board cible : Mac" mode; they write the outbox, never the bridge.
export function createMacOutboxRoutes({ store, lifecycle }: { store: Store; lifecycle: TicketLifecycle }) {
  return new Elysia({ prefix: "/mac-outbox" })
    .get("/", () => macOutboxState(store))
    .post("/", ({ body, set }) => {
      const parsed = macOutboxEnqueueInputSchema.safeParse(body);
      if (!parsed.success) {
        set.status = HTTP_BAD_REQUEST;
        return { error: parsed.error.issues[0]?.message ?? "Requête invalide." };
      }
      const { clientId, ...draft } = parsed.data;
      return handle(set, () => {
        const result = enqueueMacOutboxItem(store, { id: `${OUTBOX_ITEM_ID_PREFIXES.board}${clientId}`, draft, source: "board", sourceTicketId: null });
        set.status = result.created ? HTTP_CREATED : HTTP_OK;
        return result;
      });
    })
    .post("/tickets/:id/transfer", ({ params, body, set }) => handle(set, () => {
      const result = transferCardToMac({ store, lifecycle }, params.id, body);
      set.status = result.created ? HTTP_CREATED : HTTP_OK;
      return result;
    }))
    .post("/items/:id/cancel", ({ params, set }) => handle(set, () => cancelMacOutboxTransfer({ store, lifecycle }, params.id)));
}
