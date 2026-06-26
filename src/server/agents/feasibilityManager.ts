import { nanoid } from "nanoid";

import {
  FEASIBILITY_AUTO_RELAUNCH_EVENT,
  FEASIBILITY_AUTO_RELAUNCH_MAX,
  FEASIBILITY_BATCH_PREFIX,
  FEASIBILITY_TIMEOUT_MS,
} from "../../shared/constants.ts";
import { getErrorMessage } from "../../shared/errors.ts";
import type { FeasibilityResult, TriageResult } from "../../shared/schemas.ts";
import type { ProjectConfig } from "../config.ts";
import { MODELS, getProject, isProjectKey } from "../config.ts";

import type { Store } from "../db/store.ts";
import type { ClientHub } from "../hub.ts";
import { createLogger } from "../logger.ts";
import type { Notifier } from "../notifier.ts";
import type { SystemAdapter } from "../system/index.ts";

import { buildFeasibilityBatchContract } from "./contract.ts";
import { buildFeasibilitySessionConfig } from "./sessionConfig.ts";
import type { SessionHub } from "./sessionHub.ts";

const log = createLogger("feasibility");

/** Stub verdict persisted in dry-run so the board stays exercisable without spawning claude. */
const DRY_RUN_VERDICT: TriageResult = {
  verdict: "needs_info",
  summary: "Faisabilité simulée (dry-run) : aucune session claude n'est lancée dans le bac à sable.",
  reasons: [],
  questions: ["Active le mode réel (KANBAN_DRY_RUN=0) pour une vraie analyse de faisabilité."],
  files: [],
  suggestedModel: null,
  suggestedEffort: null,
  solutions: [],
};

/** Drop the batch-only `ticketId` key, leaving the plain triage report persisted in `triageReport`. */
function toTriageResult(result: FeasibilityResult): TriageResult {
  return {
    verdict: result.verdict,
    summary: result.summary,
    reasons: result.reasons,
    questions: result.questions,
    files: result.files,
    suggestedModel: result.suggestedModel,
    suggestedEffort: result.suggestedEffort,
    solutions: result.solutions,
  };
}

interface FeasibilitySession {
  ticketIds: string[];
  project: ProjectConfig;
  /** Number of prior automatic relaunches; 0 for the initial spawn. */
  attempt: number;
  timer: ReturnType<typeof setTimeout>;
}

/**
 * Runs the batch feasibility analysis as ONE read-only SDK agent session that fans out a sub-agent
 * per imported ticket (reusing the triage fields). Calqued on TriageManager: no worktree/slot, a
 * synthetic batch id (no real ticket) the session identifies with, stopped once the orchestrator
 * submits its aggregated verdicts via `submit_feasibility`.
 */
export class FeasibilityBatchManager {
  private readonly sessions = new Map<string, FeasibilitySession>();
  /** ticketId → batchId of the live batch evaluating it, for the terminal viewer. */
  private readonly ticketToBatch = new Map<string, string>();

  constructor(
    private readonly store: Store,
    private readonly system: SystemAdapter,
    private readonly sessionHub: SessionHub,
    private readonly hub: ClientHub,
    private readonly notifier: Notifier,
  ) {}

  /** Mark every ticket `running`, then spawn the batch session and deliver its contract once connected. */
  async start(ticketIds: string[], projectKey: string): Promise<void> {
    if (ticketIds.length === 0) return;
    if (!isProjectKey(projectKey)) {
      log.warn("faisabilité ignorée : projet inconnu", { projectKey });
      return;
    }
    const project = getProject(projectKey);

    const tickets = ticketIds
      .map((id) => this.store.getTicket(id))
      .filter((ticket): ticket is NonNullable<typeof ticket> => ticket !== null);
    if (tickets.length === 0) return;

    for (const ticket of tickets) {
      const updated = this.store.updateTicket(ticket.id, {
        triageStatus: "running",
        triageVerdict: null,
        triageReport: null,
      });
      this.hub.pushTicket(updated);
    }

    const evaluatedIds = tickets.map((ticket) => ticket.id);

    // Dry-run/tests never spawn claude: short-circuit each ticket to a stub verdict.
    if (this.system.dryRun) {
      for (const id of evaluatedIds) this.persistVerdict(id, DRY_RUN_VERDICT);
      this.notifyBatchDone(evaluatedIds.length);
      return;
    }

    await this.spawnBatch(evaluatedIds, project, 0);
  }

  /**
   * Spawn ONE feasibility session for `ticketIds` under a fresh batch id and deliver its contract
   * once the worker connects. `attempt` tracks automatic relaunches (0 = initial). A failure to
   * spawn routes to `retryOrFail` WITH the known ids so a throw before registration can't lose them.
   */
  private async spawnBatch(
    ticketIds: string[],
    project: ProjectConfig,
    attempt: number,
  ): Promise<void> {
    const batchId = `${FEASIBILITY_BATCH_PREFIX}${nanoid(8)}`;
    const tickets = ticketIds
      .map((id) => this.store.getTicket(id))
      .filter((ticket): ticket is NonNullable<typeof ticket> => ticket !== null);
    if (tickets.length === 0) return;

    this.store.logEvent(null, "feasibility_started", { batchId, count: tickets.length, attempt });
    log.info("faisabilité en lot démarrée", { batchId, count: tickets.length, attempt });

    try {
      const prompt = buildFeasibilityBatchContract(tickets, project);
      this.sessionHub.start(
        buildFeasibilitySessionConfig({
          batchId,
          cwd: project.repoPath,
          model: MODELS.triage,
          effort: MODELS.triageEffort,
        }),
      );
      // The contract is the session's first user turn — no connect poll, no drop race.
      this.sessionHub.sendEvent(batchId, { type: "ticket", payload: prompt });
      log.info("contrat de faisabilité délivré", { batchId });
      const timer = setTimeout(
        () => void this.handleBatchFailure(batchId, "délai de faisabilité dépassé"),
        FEASIBILITY_TIMEOUT_MS,
      );
      const session: FeasibilitySession = {
        ticketIds: tickets.map((ticket) => ticket.id),
        project,
        attempt,
        timer,
      };
      this.sessions.set(batchId, session);
      for (const ticket of tickets) this.ticketToBatch.set(ticket.id, batchId);
    } catch (error) {
      this.cleanup(batchId);
      await this.retryOrFail(
        tickets.map((ticket) => ticket.id),
        project,
        attempt,
        batchId,
        getErrorMessage(error),
      );
    }
  }

  /** Worker submitted the aggregated verdicts: persist each, mark missing tickets failed, tear down. */
  async complete(batchId: string, results: FeasibilityResult[]): Promise<void> {
    const session = this.sessions.get(batchId);
    const expectedIds = session?.ticketIds ?? results.map((result) => result.ticketId);
    this.cleanup(batchId);

    const byId = new Map(results.map((result) => [result.ticketId, result]));
    for (const ticketId of expectedIds) {
      const result = byId.get(ticketId);
      if (result) {
        this.persistVerdict(ticketId, toTriageResult(result));
      } else {
        this.failTicket(ticketId, "non évalué par la session de faisabilité");
      }
    }
    this.notifyBatchDone(expectedIds.length);
    log.info("faisabilité en lot terminée", { batchId, count: expectedIds.length });
  }

  /** Fire one batch-level notification when a feasibility run finishes (avoids per-ticket spam). */
  private notifyBatchDone(count: number): void {
    void this.notifier.notify(
      "Analyse de faisabilité terminée",
      `${count} ticket${count > 1 ? "s" : ""} évalué${count > 1 ? "s" : ""}`,
    );
  }

  /**
   * Live-viewer bridge: an SDK batch session has no tmux pane, so the legacy terminal viewer has
   * nothing to attach to. Returns null until the Phase 5 transcript viewer replaces this path.
   */
  resolveSession(_batchId: string): string | null {
    return null;
  }

  /** Live-viewer bridge for the batch evaluating `ticketId`; null until the Phase 5 viewer lands. */
  resolveSessionForTicket(_ticketId: string): string | null {
    return null;
  }

  /** Boot recovery: a `running` batch has no surviving SDK session after a restart, so it is dead. */
  async recoverStale(): Promise<void> {
    for (const batchId of [...this.sessions.keys()]) this.sessionHub.disconnect(batchId);
    this.sessions.clear();
    this.ticketToBatch.clear();
    // The TriageManager's recoverStale already flips every `running` triage status to `failed`;
    // tickets evaluated by a batch share those fields, so they are covered there too. Stopping the
    // known batch sessions here is the only extra step needed.
  }

  /** Stop every live feasibility session (desktop shutdown). */
  async teardownAll(): Promise<void> {
    for (const [batchId, entry] of this.sessions) {
      clearTimeout(entry.timer);
      this.sessionHub.disconnect(batchId);
    }
    this.sessions.clear();
    this.ticketToBatch.clear();
  }

  private persistVerdict(ticketId: string, result: TriageResult): void {
    if (!this.store.getTicket(ticketId)) return;
    const updated = this.store.updateTicket(ticketId, {
      triageStatus: "done",
      triageVerdict: result.verdict,
      triageReport: JSON.stringify(result),
    });
    this.hub.pushTicket(updated);
    this.store.logEvent(ticketId, "feasibility_done", { verdict: result.verdict });
  }

  private failTicket(ticketId: string, reason: string): void {
    if (!this.store.getTicket(ticketId)) return;
    const updated = this.store.updateTicket(ticketId, {
      triageStatus: "failed",
      triageVerdict: null,
      triageReport: reason,
    });
    this.hub.pushTicket(updated);
    this.store.logEvent(ticketId, "feasibility_failed", { reason });
  }

  /**
   * A live batch failed for a retriable reason (timeout / never connected): tear it down and route
   * to `retryOrFail` with the session's context. No-op when the session was already torn down.
   */
  private async handleBatchFailure(batchId: string, reason: string): Promise<void> {
    const session = this.sessions.get(batchId);
    if (!session) return;
    const { ticketIds, project, attempt } = session;
    this.cleanup(batchId);
    await this.retryOrFail(ticketIds, project, attempt, batchId, reason);
  }

  /**
   * Bounded automatic relaunch (calqued on the slot auto-reclaim convention): under the cap, spawn a
   * fresh batch for the same tickets; once exhausted, mark every ticket failed for good.
   */
  private async retryOrFail(
    ticketIds: string[],
    project: ProjectConfig,
    attempt: number,
    batchId: string,
    reason: string,
  ): Promise<void> {
    if (attempt < FEASIBILITY_AUTO_RELAUNCH_MAX) {
      log.warn("faisabilité en lot relancée automatiquement", { batchId, reason, attempt: attempt + 1 });
      this.store.logEvent(null, FEASIBILITY_AUTO_RELAUNCH_EVENT, {
        batchId,
        reason,
        attempt: attempt + 1,
      });
      await this.spawnBatch(ticketIds, project, attempt + 1);
      return;
    }
    for (const ticketId of ticketIds) this.failTicket(ticketId, reason);
    this.store.logEvent(null, "feasibility_batch_failed", { batchId, reason });
    log.warn("faisabilité en lot échouée", { batchId, reason });
  }

  /** Stop the SDK session, drop the batch↔ticket mappings, and clear the timeout. Idempotent. */
  private cleanup(batchId: string): void {
    const entry = this.sessions.get(batchId);
    if (entry) clearTimeout(entry.timer);
    this.sessions.delete(batchId);
    for (const [ticketId, id] of this.ticketToBatch) {
      if (id === batchId) this.ticketToBatch.delete(ticketId);
    }
    this.sessionHub.disconnect(batchId);
  }
}
