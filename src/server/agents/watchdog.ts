import { ACTIVE_STAGES, WATCHDOG_TIMEOUT_MS } from "../../shared/constants.ts";

import type { Store } from "../db/store.ts";
import type { ClientHub } from "../hub.ts";
import { createLogger } from "../logger.ts";
import type { Notifier } from "../notifier.ts";

const WATCHDOG_TICK_MS = 60_000;

const log = createLogger("watchdog");

/**
 * Soft watchdog: flags a card and notifies after WATCHDOG_TIMEOUT_MS without
 * any update_stage / turn end. Never kills — a large legitimate ticket can be slow.
 */
export class Watchdog {
  private timer: ReturnType<typeof setInterval> | null = null;

  constructor(
    private readonly store: Store,
    private readonly hub: ClientHub,
    private readonly notifier: Notifier,
  ) {}

  start(): void {
    if (this.timer) return;
    this.timer = setInterval(() => this.tick(), WATCHDOG_TICK_MS);
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  private tick(): void {
    const now = Date.now();
    for (const ticket of this.store.listTickets(false)) {
      if (ticket.stage === null || !ACTIVE_STAGES.includes(ticket.stage)) continue;
      if (ticket.watchdogFlagged) continue;
      const last = this.store.getLastProgressAt(ticket.id);
      if (last > 0 && now - last >= WATCHDOG_TIMEOUT_MS) {
        const flagged = this.store.updateTicket(ticket.id, { watchdogFlagged: true });
        this.hub.pushTicket(flagged);
        this.store.logEvent(ticket.id, "watchdog", { idleMs: now - last });
        log.warn("inactivité détectée", { ticketId: ticket.id, idleMs: now - last });
        void this.notifier.notify("Watchdog", `${ticket.title}: aucune progression depuis 45 min`, ticket.id);
      }
    }
  }
}
