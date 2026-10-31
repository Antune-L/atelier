import { getErrorMessage } from "../../shared/errors.ts";
import type { Ticket } from "../../shared/schemas.ts";
import { isRemoteTicket } from "../../shared/startBlocker.ts";
import { MODELS, getProject, isProjectKey } from "../config.ts";

import type { Store } from "../db/store.ts";
import type { ClientHub } from "../hub.ts";
import { createLogger } from "../logger.ts";
import type { Notifier } from "../notifier.ts";
import { runRecordedAction } from "../recordedAction.ts";
import type { SystemAdapter } from "../system/index.ts";

import { resolveAnalysisBaseBranch } from "./baseBranch.ts";
import { buildReformulatePrompt } from "./reformulate.ts";
import { acquireRemoteAnalysisCopy, appendPromptLines, copyRemoteImages, withRemoteAnalysisEngine } from "./remoteAnalysis.ts";
import type { RemoteAnalysisCopy } from "./remoteAnalysis.ts";
import type { RepoSnapshots, SnapshotLease } from "./repoSnapshots.ts";
import { assertExecutionAvailable, resolveTicketExecution } from "./executionConfig.ts";

const log = createLogger("reformulate");

/**
 * Runs the read-only "Reformuler le besoin" SDK query in the background. The HTTP route returns
 * immediately; status and the resulting markdown are persisted on the ticket and broadcast over the
 * client WS — the request never stays open long enough to hit Bun's idle timeout.
 */
export class ReformulateManager {
  /** Tickets with a query in flight: guards against concurrent duplicate runs. */
  private readonly running = new Set<string>();
  private readonly generations = new Map<string, number>();

  constructor(
    private readonly store: Store,
    private readonly system: SystemAdapter,
    private readonly hub: ClientHub,
    private readonly notifier: Notifier,
    private readonly snapshots: Pick<RepoSnapshots, "acquire" | "repoMutex">,
  ) {}

  /** Kick off the background reformulation; the result lands on the ticket via `pushTicket`. */
  start(ticketId: string): void {
    if (this.running.has(ticketId)) return;
    const ticket = this.store.getTicket(ticketId);
    if (!ticket || !isProjectKey(ticket.project)) return;
    this.running.add(ticketId);
    const generation = (this.generations.get(ticketId) ?? 0) + 1;
    this.generations.set(ticketId, generation);
    const started = this.store.updateTicket(ticketId, { reformulateStatus: "running", reformulation: null });
    this.hub.pushTicket(started);
    this.store.logEvent(ticketId, "reformulate_started", {});
    log.info("reformulation démarrée", { ticketId });
    void this.run(ticket, generation).finally(() => {
      if (this.generations.get(ticketId) === generation) this.running.delete(ticketId);
    });
  }

  private async run(ticket: Ticket, generation: number): Promise<void> {
    const project = getProject(ticket.project);
    const remote = isRemoteTicket(ticket);
    const execution = resolveTicketExecution(withRemoteAnalysisEngine(ticket), "one-shot", {
      model: MODELS.triage,
      effort: MODELS.triageEffort,
    });
    const baseBranch = resolveAnalysisBaseBranch(ticket, project, this.store);
    let lease: SnapshotLease | RemoteAnalysisCopy | null = null;
    try {
      await assertExecutionAvailable(this.system, execution);
      let cwd: string;
      let imageLines: string[] = [];
      if (remote && !this.system.dryRun) {
        // A remote card reads its own isolated copy, never the shared snapshot.
        lease = await acquireRemoteAnalysisCopy({
          system: this.system,
          repoMutex: this.snapshots.repoMutex,
          provider: execution.provider,
          repoPath: project.repoPath,
          baseBranch,
          key: ticket.id,
        });
        cwd = lease.cwd;
        imageLines = await copyRemoteImages([ticket.description], cwd);
      } else {
        // Read a frozen origin/<base> snapshot: the local main checkout is never pulled by Kanban.
        lease = await this.snapshots.acquire({
          projectKey: ticket.project,
          repoPath: project.repoPath,
          baseBranch,
          fetch: true,
          requireFetch: true,
        });
        cwd = lease.cwd;
      }
      const prompt = appendPromptLines(buildReformulatePrompt(ticket), imageLines);
      const markdown = await runRecordedAction(this.store, ticket.id, execution, (onEvent) => this.system.reformulate({
        cwd,
        prompt,
        provider: execution.provider,
        model: execution.model,
        effort: execution.effort,
        serviceTier: execution.serviceTier,
        ...(remote ? { confined: true } : {}),
        onEvent,
      }), "ticket");
      // The ticket may have been deleted while the query ran: skip persistence if it is gone.
      if (!this.store.getTicket(ticket.id) || this.generations.get(ticket.id) !== generation) return;
      const done = this.store.updateTicket(ticket.id, { reformulateStatus: "done", reformulation: markdown });
      this.hub.pushTicket(done);
      this.store.logEvent(ticket.id, "reformulate_done", {});
      void this.notifier.notify("Reformulation terminée", done.title, done.id);
      log.info("reformulation terminée", { ticketId: ticket.id });
    } catch (error) {
      const reason = getErrorMessage(error);
      if (!this.store.getTicket(ticket.id) || this.generations.get(ticket.id) !== generation) return;
      const failed = this.store.updateTicket(ticket.id, { reformulateStatus: "failed", reformulation: reason });
      this.hub.pushTicket(failed);
      this.store.logEvent(ticket.id, "reformulate_failed", { reason });
      log.warn("reformulation échouée", { ticketId: ticket.id, reason });
    } finally {
      lease?.release();
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
