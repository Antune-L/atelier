import { getErrorMessage } from "../../shared/errors.ts";
import type { Ticket } from "../../shared/schemas.ts";
import { MODELS, getProject, isProjectKey } from "../config.ts";

import type { Store } from "../db/store.ts";
import type { ClientHub } from "../hub.ts";
import { createLogger } from "../logger.ts";
import type { Notifier } from "../notifier.ts";
import type { SystemAdapter } from "../system/index.ts";

import { buildReformulatePrompt } from "./reformulate.ts";

const log = createLogger("reformulate");

/**
 * Runs the read-only "Reformuler le besoin" SDK query in the background. The HTTP route returns
 * immediately; status and the resulting markdown are persisted on the ticket and broadcast over the
 * client WS — the request never stays open long enough to hit Bun's idle timeout.
 */
export class ReformulateManager {
  /** Tickets with a query in flight: guards against concurrent duplicate runs. */
  private readonly running = new Set<string>();

  constructor(
    private readonly store: Store,
    private readonly system: SystemAdapter,
    private readonly hub: ClientHub,
    private readonly notifier: Notifier,
  ) {}

  /** Kick off the background reformulation; the result lands on the ticket via `pushTicket`. */
  start(ticketId: string): void {
    if (this.running.has(ticketId)) return;
    const ticket = this.store.getTicket(ticketId);
    if (!ticket || !isProjectKey(ticket.project)) return;
    this.running.add(ticketId);
    const started = this.store.updateTicket(ticketId, { reformulateStatus: "running", reformulation: null });
    this.hub.pushTicket(started);
    this.store.logEvent(ticketId, "reformulate_started", {});
    log.info("reformulation démarrée", { ticketId });
    void this.run(ticket).finally(() => this.running.delete(ticketId));
  }

  private async run(ticket: Ticket): Promise<void> {
    const project = getProject(ticket.project);
    try {
      const markdown = await this.system.reformulate({
        cwd: project.repoPath,
        prompt: buildReformulatePrompt(ticket),
        model: MODELS.triage,
        effort: MODELS.triageEffort,
      });
      // The ticket may have been deleted while the query ran: skip persistence if it is gone.
      if (!this.store.getTicket(ticket.id)) return;
      const done = this.store.updateTicket(ticket.id, { reformulateStatus: "done", reformulation: markdown });
      this.hub.pushTicket(done);
      this.store.logEvent(ticket.id, "reformulate_done", {});
      void this.notifier.notify("Reformulation terminée", done.title, done.id);
      log.info("reformulation terminée", { ticketId: ticket.id });
    } catch (error) {
      const reason = getErrorMessage(error);
      if (!this.store.getTicket(ticket.id)) return;
      const failed = this.store.updateTicket(ticket.id, { reformulateStatus: "failed", reformulation: reason });
      this.hub.pushTicket(failed);
      this.store.logEvent(ticket.id, "reformulate_failed", { reason });
      log.warn("reformulation échouée", { ticketId: ticket.id, reason });
    }
  }

  /** Boot recovery: a `running` reformulation has no surviving in-process query after a restart. */
  recoverStale(): void {
    for (const ticket of this.store.listTickets(true)) {
      if (ticket.reformulateStatus !== "running") continue;
      const updated = this.store.updateTicket(ticket.id, {
        reformulateStatus: "failed",
        reformulation: "reformulation interrompue (redémarrage du serveur)",
      });
      this.hub.pushTicket(updated);
      this.store.logEvent(ticket.id, "reformulate_failed", { reason: "server restart" });
      log.warn("reformulation orpheline récupérée au boot", { ticketId: ticket.id });
    }
  }
}
