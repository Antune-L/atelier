import { nanoid } from "nanoid";

import {
  FEASIBILITY_AUTO_RELAUNCH_EVENT,
  FEASIBILITY_AUTO_RELAUNCH_MAX,
  FEASIBILITY_BATCH_PREFIX,
  FEASIBILITY_TIMEOUT_MS,
} from "../../shared/constants.ts";
import { getErrorMessage } from "../../shared/errors.ts";
import type { FeasibilityResult, Ticket, TriageResult } from "../../shared/schemas.ts";
import type { ProjectConfig } from "../config.ts";
import { getProject, isProjectKey } from "../config.ts";

import type { Store } from "../db/store.ts";
import type { ClientHub } from "../hub.ts";
import { createLogger } from "../logger.ts";
import type { Notifier } from "../notifier.ts";
import type { SystemAdapter } from "../system/index.ts";

import { prepareAnalysisWorkspace, releaseAnalysisWorkspace } from "./analysisWorkspace.ts";
import type { AnalysisWorkspace } from "./analysisWorkspace.ts";
import { resolveBaseBranch } from "./baseBranch.ts";
import { buildFeasibilityBatchContract } from "./contract.ts";
import { assertExecutionAvailable, resolveFeasibilityExecution } from "./executionConfig.ts";
import type { ResolvedExecution } from "./executionConfig.ts";
import { buildFeasibilitySessionConfig } from "./sessionConfig.ts";
import type { SessionHub } from "./sessionHub.ts";

const log = createLogger("feasibility");
const MAX_CONCURRENT_BATCHES = 2;
const MAX_TICKETS_PER_BATCH = 4;

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
    suggestedOrchestrator: result.suggestedOrchestrator,
    suggestedCodexModel: result.suggestedCodexModel,
    suggestedCodexEffort: result.suggestedCodexEffort,
    solutions: result.solutions,
  };
}

interface FeasibilitySession {
  ticketIds: string[];
  ticketVersions: Map<string, number>;
  project: ProjectConfig;
  baseBranch: string;
  execution: ResolvedExecution;
  /** Number of prior automatic relaunches; 0 for the initial spawn. */
  attempt: number;
  timer: ReturnType<typeof setTimeout> | null;
  workspace: AnalysisWorkspace | null;
}

export interface FeasibilityGroup {
  ticketIds: string[];
  project: ProjectConfig;
  baseBranch: string;
  execution: ResolvedExecution;
}

interface QueuedFeasibility extends FeasibilityGroup {
  attempt: number;
}

export function groupFeasibilityTickets(tickets: Ticket[], baseBranchOf: (ticket: Ticket, project: ProjectConfig) => string): {
  groups: FeasibilityGroup[];
  invalidTicketIds: string[];
} {
  const groups = new Map<string, FeasibilityGroup>();
  const invalidTicketIds: string[] = [];
  for (const ticket of tickets) {
    if (!isProjectKey(ticket.project)) {
      invalidTicketIds.push(ticket.id);
      continue;
    }
    const execution = resolveFeasibilityExecution(ticket, "feasibility");
    const project = getProject(ticket.project);
    const baseBranch = baseBranchOf(ticket, project);
    const key = [ticket.project, baseBranch, execution.provider, execution.model, execution.effort ?? "", execution.serviceTier].join("\u0000");
    const existing = groups.get(key);
    if (existing) {
      existing.ticketIds.push(ticket.id);
    } else {
      groups.set(key, { ticketIds: [ticket.id], project, baseBranch, execution });
    }
  }
  return { groups: [...groups.values()], invalidTicketIds };
}

/**
 * Runs the batch feasibility analysis as ONE read-only SDK agent session on a detached origin/<base>
 * analysis worktree that fans out a scout then a verifier per imported ticket (reusing the triage fields). Calqued on TriageManager: no worktree/slot, a
 * synthetic batch id (no real ticket) the session identifies with, stopped once the orchestrator
 * submits its aggregated verdicts via `submit_feasibility`.
 */
export class FeasibilityBatchManager {
  private readonly sessions = new Map<string, FeasibilitySession>();
  /** ticketId → batchId of the live batch evaluating it, for the terminal viewer. */
  private readonly ticketToBatch = new Map<string, string>();
  private readonly pending: QueuedFeasibility[] = [];
  private readonly scheduledTickets = new Set<string>();
  private launching = 0;
  private stopped = false;

  constructor(
    private readonly store: Store,
    private readonly system: SystemAdapter,
    private readonly sessionHub: SessionHub,
    private readonly hub: ClientHub,
    private readonly notifier: Notifier,
  ) {}

  /** Mark every ticket `running`, then spawn the batch session and deliver its contract once connected. */
  async start(ticketIds: string[], projectKey: string): Promise<void> {
    if (this.stopped) return;
    if (ticketIds.length === 0) return;
    if (!isProjectKey(projectKey)) {
      log.warn("faisabilité ignorée : projet inconnu", { projectKey });
      return;
    }
    const tickets = [...new Set(ticketIds)].filter((id) => !this.scheduledTickets.has(id))
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

    const { groups, invalidTicketIds } = groupFeasibilityTickets(tickets, (ticket, project) => resolveBaseBranch(ticket, project, this.store));
    for (const ticketId of invalidTicketIds) this.failTicket(ticketId, "projet inconnu");
    for (const group of groups) {
      for (let offset = 0; offset < group.ticketIds.length; offset += MAX_TICKETS_PER_BATCH) {
        const ids = group.ticketIds.slice(offset, offset + MAX_TICKETS_PER_BATCH);
        for (const id of ids) this.scheduledTickets.add(id);
        this.pending.push({ ...group, ticketIds: ids, attempt: 0 });
      }
    }
    this.drainQueue();
  }

  /** Reserve capacity during asynchronous startup as well as for the entire live session. */
  private drainQueue(): void {
    while (!this.stopped && this.sessions.size + this.launching < MAX_CONCURRENT_BATCHES) {
      const group = this.pending.shift();
      if (!group) return;
      this.launching += 1;
      void this.spawnBatch(group).finally(() => {
        this.launching -= 1;
        this.drainQueue();
      });
    }
  }

  /**
   * Spawn ONE feasibility session for `ticketIds` under a fresh batch id and deliver its contract
   * once the worker connects. `attempt` tracks automatic relaunches (0 = initial). A failure to
   * spawn routes to `retryOrFail` WITH the known ids so a throw before registration can't lose them.
   */
  private async spawnBatch(group: QueuedFeasibility): Promise<void> {
    const { ticketIds, project, baseBranch, execution, attempt } = group;
    const batchId = `${FEASIBILITY_BATCH_PREFIX}${nanoid(8)}`;
    const tickets = ticketIds
      .map((id) => this.store.getTicket(id))
      .filter((ticket): ticket is NonNullable<typeof ticket> => ticket !== null);
    if (tickets.length === 0) {
      for (const id of ticketIds) this.scheduledTickets.delete(id);
      return;
    }

    this.store.logEvent(null, "feasibility_started", { batchId, count: tickets.length, attempt });
    log.info("faisabilité en lot démarrée", { batchId, count: tickets.length, attempt });
    const ticketVersions = new Map(tickets.map((ticket) => [ticket.id, ticket.updatedAt]));

    try {
      await assertExecutionAvailable(this.system, execution);
      if (this.stopped) return;
      const session: FeasibilitySession = {
        ticketIds: tickets.map((ticket) => ticket.id),
        ticketVersions,
        project,
        baseBranch,
        execution,
        attempt,
        timer: null,
        workspace: null,
      };
      this.sessions.set(batchId, session);
      session.workspace = await prepareAnalysisWorkspace(this.system, project.repoPath, baseBranch, batchId);
      if (this.stopped || this.sessions.get(batchId) !== session) {
        releaseAnalysisWorkspace(this.system, session.workspace);
        return;
      }
      const prompt = buildFeasibilityBatchContract(tickets, project, baseBranch, execution.provider);
      session.timer = setTimeout(
        () => void this.handleBatchFailure(batchId, "délai de faisabilité dépassé"),
        FEASIBILITY_TIMEOUT_MS,
      );
      for (const ticket of tickets) this.ticketToBatch.set(ticket.id, batchId);
      this.sessionHub.start(
        buildFeasibilitySessionConfig({
          batchId,
          cwd: session.workspace.cwd,
          model: execution.model,
          effort: execution.effort,
          serviceTier: execution.serviceTier,
          driver: execution.provider,
        }),
        {
          onFailure: (reason) => void this.handleBatchFailure(batchId, reason),
          onTurnEnd: () => void this.handleBatchFailure(batchId, "tour terminé sans verdict de faisabilité"),
        },
      );
      // The contract is the session's first user turn — no connect poll, no drop race.
      this.sessionHub.sendEvent(batchId, { type: "ticket", payload: prompt });
      log.info("contrat de faisabilité délivré", { batchId });
    } catch (error) {
      this.cleanup(batchId);
      await this.retryOrFail({ ...group, ticketIds: tickets.map((ticket) => ticket.id) }, batchId, getErrorMessage(error), ticketVersions);
    }
  }

  /** Worker submitted the aggregated verdicts: persist each, mark missing tickets failed, tear down. */
  async complete(batchId: string, results: FeasibilityResult[]): Promise<void> {
    const session = this.sessions.get(batchId);
    const expectedIds = session?.ticketIds ?? results.map((result) => result.ticketId);
    const ticketVersions = session?.ticketVersions;
    this.cleanup(batchId, "completed");

    const byId = new Map(results.map((result) => [result.ticketId, result]));
    for (const ticketId of expectedIds) {
      const result = byId.get(ticketId);
      if (result && this.isCurrentBatchTicket(ticketId, ticketVersions?.get(ticketId))) {
        this.persistVerdict(ticketId, toTriageResult(result));
      } else if (!result && this.isCurrentBatchTicket(ticketId, ticketVersions?.get(ticketId))) {
        this.failTicket(ticketId, "non évalué par la session de faisabilité");
      }
    }
    this.notifyBatchDone(expectedIds.length);
    for (const id of expectedIds) this.scheduledTickets.delete(id);
    this.drainQueue();
    log.info("faisabilité en lot terminée", { batchId, count: expectedIds.length });
  }

  /** Fire one batch-level notification when a feasibility run finishes (avoids per-ticket spam). */
  private notifyBatchDone(count: number): void {
    void this.notifier.notify(
      "Analyse de faisabilité terminée",
      `${count} ticket${count > 1 ? "s" : ""} évalué${count > 1 ? "s" : ""}`,
    );
  }

  /** The batch id (= live transcript key) evaluating `ticketId`, for the polled agent viewer; null if none. */
  batchKeyForTicket(ticketId: string): string | null {
    return this.ticketToBatch.get(ticketId) ?? null;
  }

  async fail(batchId: string, reason: string): Promise<void> {
    await this.handleBatchFailure(batchId, reason);
  }

  /** Legacy terminal-WS bridge: SDK sessions have no tmux pane (the viewer polls the transcript instead). */
  resolveSession(_batchId: string): string | null {
    return null;
  }

  /** Legacy terminal-WS bridge for the batch evaluating `ticketId`; the viewer polls the transcript instead. */
  resolveSessionForTicket(_ticketId: string): string | null {
    return null;
  }

  /** Boot recovery: a `running` batch has no surviving SDK session after a restart, so it is dead. */
  async recoverStale(): Promise<void> {
    this.pending.length = 0;
    this.scheduledTickets.clear();
    for (const batchId of [...this.sessions.keys()]) this.sessionHub.disconnect(batchId);
    this.sessions.clear();
    this.ticketToBatch.clear();
    // The TriageManager's recoverStale already flips every `running` triage status to `failed`;
    // tickets evaluated by a batch share those fields, so they are covered there too. Stopping the
    // known batch sessions here is the only extra step needed.
  }

  /** Stop every live feasibility session (desktop shutdown). */
  async teardownAll(): Promise<void> {
    this.stopped = true;
    this.pending.length = 0;
    this.scheduledTickets.clear();
    for (const [batchId, entry] of this.sessions) {
      if (entry.timer) clearTimeout(entry.timer);
      this.sessionHub.disconnect(batchId);
      if (entry.workspace) releaseAnalysisWorkspace(this.system, entry.workspace);
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

  private isCurrentBatchTicket(ticketId: string, expectedUpdatedAt: number | undefined): boolean {
    const ticket = this.store.getTicket(ticketId);
    return ticket?.triageStatus === "running" && ticket.updatedAt === expectedUpdatedAt;
  }

  /**
   * A live batch failed for a retriable reason (timeout / never connected): tear it down and route
   * to `retryOrFail` with the session's context. No-op when the session was already torn down.
   */
  private async handleBatchFailure(batchId: string, reason: string): Promise<void> {
    const session = this.sessions.get(batchId);
    if (!session) return;
    const { ticketIds, ticketVersions, project, baseBranch, execution, attempt } = session;
    this.cleanup(batchId, "failed");
    await this.retryOrFail({ ticketIds, project, baseBranch, execution, attempt }, batchId, reason, ticketVersions);
  }

  /**
   * Bounded automatic relaunch (calqued on the slot auto-reclaim convention): under the cap, spawn a
   * fresh batch for the same tickets; once exhausted, mark every ticket failed for good.
   */
  private async retryOrFail(group: QueuedFeasibility, batchId: string, reason: string, ticketVersions: Map<string, number>): Promise<void> {
    const { ticketIds, attempt } = group;
    const currentTicketIds = ticketIds.filter((ticketId) =>
      this.isCurrentBatchTicket(ticketId, ticketVersions.get(ticketId)),
    );
    for (const ticketId of ticketIds) {
      if (!currentTicketIds.includes(ticketId)) this.scheduledTickets.delete(ticketId);
    }
    if (currentTicketIds.length === 0) {
      this.drainQueue();
      return;
    }
    if (attempt < FEASIBILITY_AUTO_RELAUNCH_MAX) {
      log.warn("faisabilité en lot relancée automatiquement", { batchId, reason, attempt: attempt + 1 });
      this.store.logEvent(null, FEASIBILITY_AUTO_RELAUNCH_EVENT, {
        batchId,
        reason,
        attempt: attempt + 1,
      });
      if (!this.stopped) this.pending.push({ ...group, ticketIds: currentTicketIds, attempt: attempt + 1 });
      this.drainQueue();
      return;
    }
    for (const ticketId of currentTicketIds) {
      this.failTicket(ticketId, reason);
      this.scheduledTickets.delete(ticketId);
    }
    this.store.logEvent(null, "feasibility_batch_failed", { batchId, reason });
    log.warn("faisabilité en lot échouée", { batchId, reason });
    this.drainQueue();
  }

  /** Stop the SDK session, drop the batch↔ticket mappings, and clear the timeout. Idempotent. */
  private cleanup(batchId: string, status: "completed" | "failed" | "cancelled" = "cancelled"): void {
    const entry = this.sessions.get(batchId);
    if (entry?.timer) clearTimeout(entry.timer);
    if (entry?.workspace) releaseAnalysisWorkspace(this.system, entry.workspace);
    this.sessions.delete(batchId);
    for (const [ticketId, id] of this.ticketToBatch) {
      if (id === batchId) this.ticketToBatch.delete(ticketId);
    }
    this.sessionHub.disconnect(batchId, status);
  }
}
