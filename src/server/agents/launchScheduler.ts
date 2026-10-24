import {
  LAUNCH_SCHEDULER_TICK_MS,
  SCHEDULED_START_FIRED_EVENT,
  SCHEDULED_START_MAX_DELAY_MS,
  SCHEDULED_START_MISSED_EVENT,
} from "../../shared/constants.ts";
import { getErrorMessage } from "../../shared/errors.ts";
import type { Ticket } from "../../shared/schemas.ts";
import { startBlocker } from "../../shared/startBlocker.ts";
import type { Store } from "../db/store.ts";
import type { ClientHub } from "../hub.ts";
import { createLogger } from "../logger.ts";
import type { Notifier } from "../notifier.ts";
import type { TicketOperations } from "../ticketOperations.ts";
import type { SlotManager } from "./slotManager.ts";

const SCHEDULED_START_FAILED_EVENT = "scheduled_start_failed";
const MISSED_NOTIFICATION_TITLE = "Lancement programmé non effectué";
const MISSED_NOTIFICATION_REASONS: Record<ScheduledStartMissReason, string> = {
  backend_down: "l'application était fermée",
  late: "l'application n'était pas active à l'heure prévue",
};
const FAILED_NOTIFICATION_TITLE = "Lancement programmé échoué";

const log = createLogger("launch-scheduler");

export interface LaunchSchedulerDeps {
  store: Pick<Store, "listDueScheduledTickets" | "getDependencyParent" | "getTicket" | "claimScheduledStart" | "markScheduledStartMissed" | "logEvent">;
  ticketOperations: Pick<TicketOperations, "startTicket">;
  slots: Pick<SlotManager, "isTicketEngaged">;
  hub: Pick<ClientHub, "pushTicket">;
  notifier: Pick<Notifier, "notify">;
  startedAt: number;
  now?: () => number;
}

export type ScheduledStartMissReason = "backend_down" | "late";

export class LaunchScheduler {
  private readonly deps: LaunchSchedulerDeps;
  private readonly now: () => number;
  private timer: ReturnType<typeof setInterval> | null = null;
  private lastTickAt: number;
  private ticking = false;
  private stopped = false;
  private readonly waitingSinceBoot = new Map<string, number>();

  constructor(deps: LaunchSchedulerDeps) {
    this.deps = deps;
    this.now = deps.now ?? Date.now;
    this.lastTickAt = deps.startedAt;
  }

  start(): void {
    if (this.timer !== null) return;
    this.stopped = false;
    this.timer = setInterval(() => void this.tick(), LAUNCH_SCHEDULER_TICK_MS);
    void this.tick();
  }

  stop(): void {
    this.stopped = true;
    if (this.timer !== null) clearInterval(this.timer);
    this.timer = null;
  }

  async tick(): Promise<void> {
    if (this.ticking || this.stopped) return;
    this.ticking = true;
    const now = this.now();
    const previousTickAt = this.lastTickAt;
    try {
      for (const ticket of this.deps.store.listDueScheduledTickets(now)) {
        if (this.stopped) return;
        const plannedAt = ticket.scheduledStartAt;
        if (plannedAt === null) continue;
        const blocked = startBlocker(ticket, this.deps.store.getDependencyParent(ticket)) !== null || this.deps.slots.isTicketEngaged(ticket.id);
        if (blocked && plannedAt < this.deps.startedAt) this.waitingSinceBoot.set(ticket.id, plannedAt);
        const missReason = this.waitingSinceBoot.get(ticket.id) === plannedAt ? null : this.missReason(plannedAt, previousTickAt, now);
        if (missReason !== null) {
          this.markMissed(ticket, plannedAt, now, missReason);
          continue;
        }
        if (blocked) continue;
        this.waitingSinceBoot.delete(ticket.id);
        await this.fire(ticket, plannedAt, now);
      }
    } catch (error) {
      log.error("tick du lancement programmé échoué", { error: getErrorMessage(error) });
    } finally {
      this.lastTickAt = now;
      this.ticking = false;
    }
  }

  private missReason(plannedAt: number, previousTickAt: number, now: number): ScheduledStartMissReason | null {
    if (plannedAt < this.deps.startedAt) return "backend_down";
    if (plannedAt > previousTickAt && now - plannedAt > SCHEDULED_START_MAX_DELAY_MS) return "late";
    return null;
  }

  private markMissed(ticket: Ticket, plannedAt: number, now: number, reason: ScheduledStartMissReason): void {
    const { store, hub, notifier } = this.deps;
    if (!store.markScheduledStartMissed(ticket.id, plannedAt)) return;
    const updated = store.getTicket(ticket.id);
    if (updated) hub.pushTicket(updated);
    const delayMs = now - plannedAt;
    store.logEvent(ticket.id, SCHEDULED_START_MISSED_EVENT, { scheduledStartAt: plannedAt, delayMs, reason });
    log.warn("lancement programmé non effectué", { ticketId: ticket.id, scheduledStartAt: plannedAt, delayMs, reason });
    void notifier.notify(MISSED_NOTIFICATION_TITLE, `${ticket.title} : ${MISSED_NOTIFICATION_REASONS[reason]}`, ticket.id);
  }

  private async fire(ticket: Ticket, plannedAt: number, now: number): Promise<void> {
    const { store, hub, notifier, ticketOperations } = this.deps;
    if (!store.claimScheduledStart(ticket.id, plannedAt)) return;
    const delayMs = now - plannedAt;
    try {
      const result = await ticketOperations.startTicket(ticket.id);
      store.logEvent(ticket.id, SCHEDULED_START_FIRED_EVENT, { scheduledStartAt: plannedAt, delayMs, status: result.status });
      log.info("lancement programmé déclenché", { ticketId: ticket.id, scheduledStartAt: plannedAt, delayMs, status: result.status });
    } catch (error) {
      const message = getErrorMessage(error);
      store.logEvent(ticket.id, SCHEDULED_START_FAILED_EVENT, { scheduledStartAt: plannedAt, delayMs, error: message });
      log.error("lancement programmé échoué", { ticketId: ticket.id, scheduledStartAt: plannedAt, error: message });
      void notifier.notify(FAILED_NOTIFICATION_TITLE, `${ticket.title} : ${message}`, ticket.id);
    } finally {
      const current = store.getTicket(ticket.id);
      if (current) hub.pushTicket(current);
    }
  }
}
