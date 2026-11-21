import { beforeEach, expect, mock, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";

import type { Slot } from "@shared/schemas";

const openTicket = mock((_ticketId: string) => undefined);
const notify = mock((_title: string, _body?: string) => undefined);
const writeText = mock((_text: string) => Promise.resolve());

mock.module("@/lib/store", () => ({
  boardStore: {
    openTicket,
    notify,
    subscribe: () => () => undefined,
    getSnapshot: () => ({ tickets: [] }),
  },
}));

if (typeof globalThis.navigator === "undefined") {
  Object.defineProperty(globalThis, "navigator", { value: {}, configurable: true, writable: true });
}
Object.defineProperty(globalThis.navigator, "clipboard", { value: { writeText }, configurable: true, writable: true });

const { SlotPips, openSlotTicket, slotPipView } = await import("./SlotPips");

const TICKETED_STATUSES: Slot["status"][] = ["busy", "stalled", "interrupted", "failed"];
const COPY_WORDING = ["Copier", "tmux"];

function makeSlot(overrides: Partial<Slot>): Slot {
  return { id: 1, ticketId: null, repoPath: null, tmuxSession: null, status: "free", ...overrides };
}

beforeEach(() => {
  openTicket.mockClear();
  notify.mockClear();
  writeText.mockClear();
});

test("F1-AC1 — clicking a pip whose slot has a ticketId opens that ticket for busy, stalled, interrupted and failed", () => {
  for (const [index, status] of TICKETED_STATUSES.entries()) {
    openTicket.mockClear();
    const ticketId = `ticket-${status}`;
    const slot = makeSlot({ id: index + 1, status, ticketId, tmuxSession: `session-${status}` });
    const onTicketOpen = mock((_ticketId: string) => undefined);

    openSlotTicket(slot, onTicketOpen);

    expect(openTicket).toHaveBeenCalledTimes(1);
    expect(openTicket).toHaveBeenCalledWith(ticketId);
    expect(onTicketOpen).toHaveBeenCalledTimes(1);
    expect(onTicketOpen).toHaveBeenCalledWith(ticketId);
    expect(slotPipView(slot).ticketId).toBe(ticketId);
    expect(slotPipView(slot).disabled).toBe(false);
  }
});

test("F1-AC1 — opening a ticket works without an onTicketOpen callback", () => {
  openSlotTicket(makeSlot({ status: "busy", ticketId: "lonely" }));

  expect(openTicket).toHaveBeenCalledTimes(1);
  expect(openTicket).toHaveBeenCalledWith("lonely");
});

test("F1-AC2 — clicking a pip neither touches the clipboard nor notifies a copied command", () => {
  for (const status of TICKETED_STATUSES) {
    openSlotTicket(makeSlot({ status, ticketId: `ticket-${status}`, tmuxSession: `session-${status}` }), () => undefined);
  }
  openSlotTicket(makeSlot({ status: "busy", ticketId: null, tmuxSession: "worktree-session" }));

  expect(writeText).not.toHaveBeenCalled();
  expect(notify).not.toHaveBeenCalled();
});

test("F1-AC2 — rendered pips no longer offer to copy a connection command", () => {
  const slots = [
    makeSlot({ id: 1, status: "busy", ticketId: "abc", tmuxSession: "ticket-abc" }),
    makeSlot({ id: 2, status: "busy", ticketId: null, tmuxSession: "worktree-session" }),
    makeSlot({ id: 3, status: "free" }),
  ];

  const html = renderToStaticMarkup(<SlotPips slots={slots} />);

  expect(html).not.toContain("Copier la commande");
  expect(html).not.toContain("tmux attach");
  expect(writeText).not.toHaveBeenCalled();
  expect(notify).not.toHaveBeenCalled();
});

test("F1-AC3 — a free slot without a ticket is disabled and has no effect", () => {
  const slot = makeSlot({ id: 4, status: "free" });
  const onTicketOpen = mock((_ticketId: string) => undefined);

  expect(slotPipView(slot).disabled).toBe(true);
  expect(slotPipView(slot).ticketId).toBeNull();

  openSlotTicket(slot, onTicketOpen);

  expect(openTicket).not.toHaveBeenCalled();
  expect(onTicketOpen).not.toHaveBeenCalled();
});

test("F1-AC3 — a busy slot with a ticketId but no tmuxSession stays enabled", () => {
  const slot = makeSlot({ id: 5, status: "busy", ticketId: "end-of-pipeline", tmuxSession: null });
  const onTicketOpen = mock((_ticketId: string) => undefined);

  expect(slotPipView(slot).disabled).toBe(false);

  openSlotTicket(slot, onTicketOpen);

  expect(openTicket).toHaveBeenCalledWith("end-of-pipeline");
  expect(onTicketOpen).toHaveBeenCalledWith("end-of-pipeline");
});

test("F1-AC3 — a slot with a tmuxSession but no ticketId is disabled and has no effect", () => {
  const slot = makeSlot({ id: 6, status: "busy", ticketId: null, tmuxSession: "worktree-session" });
  const onTicketOpen = mock((_ticketId: string) => undefined);

  expect(slotPipView(slot).disabled).toBe(true);

  openSlotTicket(slot, onTicketOpen);

  expect(openTicket).not.toHaveBeenCalled();
  expect(onTicketOpen).not.toHaveBeenCalled();
});

test("F1-AC3 — rendered buttons are disabled according to ticketId, not tmuxSession", () => {
  const slots = [
    makeSlot({ id: 7, status: "busy", ticketId: "no-session", tmuxSession: null }),
    makeSlot({ id: 8, status: "busy", ticketId: null, tmuxSession: "worktree-session" }),
    makeSlot({ id: 9, status: "free" }),
  ];

  const html = renderToStaticMarkup(<SlotPips slots={slots} />);
  const buttons = html.match(/<button[^>]*>/g) ?? [];

  expect(buttons).toHaveLength(slots.length);
  expect(buttons.map((button) => button.includes("disabled"))).toEqual([false, true, true]);
});

test("F1-AC4 — a clickable pip announces opening the ticket in its aria-label and title", () => {
  for (const status of TICKETED_STATUSES) {
    const ticketId = `ticket-${status}`;
    const view = slotPipView(makeSlot({ status, ticketId, tmuxSession: `session-${status}` }));

    expect(view.label).toContain(`Ouvrir la carte ${ticketId}`);
    expect(view.title).toContain(`Ouvrir la carte ${ticketId}`);
    for (const word of COPY_WORDING) {
      expect(view.label).not.toContain(word);
      expect(view.title).not.toContain(word);
    }
  }
});

test("F1-AC4 — rendered clickable pips carry the open-ticket aria-label and title", () => {
  const slot = makeSlot({ id: 10, status: "stalled", ticketId: "rendered-ticket", tmuxSession: "ticket-rendered-ticket" });
  const view = slotPipView(slot);

  const html = renderToStaticMarkup(<SlotPips slots={[slot]} />);

  expect(html).toContain(`aria-label="${view.label}"`);
  expect(html).toContain(`title="${view.title}"`);
  expect(html).toContain("Ouvrir la carte rendered-ticket");
  for (const word of COPY_WORDING) {
    expect(html).not.toContain(word);
  }
});
