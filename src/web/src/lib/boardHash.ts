import { useSyncExternalStore } from "react";
import { z } from "zod";

import { boardStore } from "@/lib/store";

const NEW_TICKET_HASH_PREFIX = "#new=";
const TICKET_HASH_PREFIX = "#ticket=";
const HASH_MAX_LENGTH = 200_000;
const PREFILL_TITLE_MAX_LENGTH = 500;
const PREFILL_DESCRIPTION_MAX_LENGTH = 50_000;
const PREFILL_PROJECT_MAX_LENGTH = 200;
const TICKET_ID_MAX_LENGTH = 200;
const TICKET_ID_PATTERN = /^[A-Za-z0-9_-]+$/;
const INVALID_LINK_TITLE = "Lien ignoré";
const INVALID_LINK_BODY = "Ce lien est mal formé ou trop long.";

const ticketPrefillSchema = z.object({
  title: z.string().max(PREFILL_TITLE_MAX_LENGTH).default(""),
  description: z.string().max(PREFILL_DESCRIPTION_MAX_LENGTH).default(""),
  project: z.string().trim().min(1).max(PREFILL_PROJECT_MAX_LENGTH).nullish().transform((value) => value ?? null),
});

const ticketIdSchema = z.string().trim().min(1).max(TICKET_ID_MAX_LENGTH).regex(TICKET_ID_PATTERN);

export type TicketPrefill = z.infer<typeof ticketPrefillSchema>;

type BoardHashTarget =
  | { kind: "new"; prefill: TicketPrefill }
  | { kind: "ticket"; ticketId: string }
  | { kind: "invalid" };

function decodeHashValue(raw: string): string | null {
  try {
    return decodeURIComponent(raw);
  } catch {
    return null;
  }
}

function parseJson(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function parseBoardHash(hash: string): BoardHashTarget | null {
  const isNew = hash.startsWith(NEW_TICKET_HASH_PREFIX);
  if (!isNew && !hash.startsWith(TICKET_HASH_PREFIX)) return null;
  if (hash.length > HASH_MAX_LENGTH) return { kind: "invalid" };
  const value = decodeHashValue(hash.slice(isNew ? NEW_TICKET_HASH_PREFIX.length : TICKET_HASH_PREFIX.length));
  if (value === null) return { kind: "invalid" };
  if (!isNew) {
    const ticketId = ticketIdSchema.safeParse(value);
    return ticketId.success ? { kind: "ticket", ticketId: ticketId.data } : { kind: "invalid" };
  }
  const prefill = ticketPrefillSchema.safeParse(parseJson(value));
  return prefill.success ? { kind: "new", prefill: prefill.data } : { kind: "invalid" };
}

let pendingPrefill: TicketPrefill | null = null;
let listening = false;
const subscribers = new Set<() => void>();

function consumeBoardHash(): void {
  const target = parseBoardHash(window.location.hash);
  if (target === null) return;
  window.history.replaceState(window.history.state, "", `${window.location.pathname}${window.location.search}`);
  if (target.kind === "invalid") {
    boardStore.notify(INVALID_LINK_TITLE, INVALID_LINK_BODY);
    return;
  }
  if (target.kind === "ticket") {
    boardStore.openTicket(target.ticketId);
    return;
  }
  pendingPrefill = target.prefill;
  for (const notify of subscribers) notify();
}

function subscribe(notify: () => void): () => void {
  subscribers.add(notify);
  if (!listening) {
    listening = true;
    window.addEventListener("hashchange", consumeBoardHash);
    consumeBoardHash();
  }
  return () => {
    subscribers.delete(notify);
  };
}

function snapshot(): TicketPrefill | null {
  return pendingPrefill;
}

// NOTE: a link only fills the creation form or selects a card; it never creates nor starts a ticket.
export function useTicketPrefill(): TicketPrefill | null {
  return useSyncExternalStore(subscribe, snapshot, snapshot);
}
