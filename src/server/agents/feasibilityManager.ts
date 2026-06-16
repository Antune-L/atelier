import { nanoid } from "nanoid";

import {
  FEASIBILITY_AUTO_RELAUNCH_EVENT,
  FEASIBILITY_AUTO_RELAUNCH_MAX,
  FEASIBILITY_BATCH_PREFIX,
  FEASIBILITY_SLOT_ID,
  FEASIBILITY_TIMEOUT_MS,
} from "../../shared/constants.ts";
import { getErrorMessage } from "../../shared/errors.ts";
import type { FeasibilityResult, TriageResult } from "../../shared/schemas.ts";
import type { ProjectConfig } from "../config.ts";
import { MODELS, getProject, isProjectKey } from "../config.ts";

import type { Store } from "../db/store.ts";
import type { ClientHub } from "../hub.ts";
import { createLogger } from "../logger.ts";
import type { SystemAdapter } from "../system/index.ts";
import type { WorkerHub } from "../workerHub.ts";

import { buildFeasibilityBatchContract } from "./contract.ts";
import { resolveTemplatePaths } from "./slotTemplates.ts";

const log = createLogger("feasibility");

/** Worker-connect poll for a feasibility session (≈2 min: claude boot + MCP connect can be slow). */
const FEASIBILITY_DELIVER_MAX_ATTEMPTS = 240;
const FEASIBILITY_DELIVER_DELAY_MS = 500;

/** Stub verdict persisted in dry-run so the board stays exercisable without spawning claude. */
const DRY_RUN_VERDICT: TriageResult = {
  verdict: "needs_info",
  summary: "Faisabilité simulée (dry-run) : aucune session claude n'est lancée dans le bac à sable.",
  reasons: [],
  questions: ["Active le mode réel (KANBAN_DRY_RUN=0) pour une vraie analyse de faisabilité."],
  files: [],
  suggestedModel: null,
  suggestedEffort: null,
};

function feasibilitySessionName(batchId: string): string {
  return `feasibility-${batchId}`;
}

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
  };
}

export interface FeasibilityManagerConfig {
  backendWs: string;
  projectRoot: string;
  bunPath: string;
}

interface FeasibilitySession {
  sessionName: string;
  ticketIds: string[];
  project: ProjectConfig;
  /** Number of prior automatic relaunches; 0 for the initial spawn. */
  attempt: number;
  timer: ReturnType<typeof setTimeout>;
}

/**
 * Runs the batch feasibility analysis as ONE detached worker-channel session that fans out a
 * read-only sub-agent per imported ticket (reusing the triage fields). Calqued on TriageManager:
 * no worktree/slot, a synthetic batch id (no real ticket) the worker identifies with, killed once
 * the orchestrator submits its aggregated verdicts via `submit_feasibility`.
 */
export class FeasibilityBatchManager {
  private readonly sessions = new Map<string, FeasibilitySession>();
  /** ticketId → batchId of the live batch evaluating it, for the terminal viewer. */
  private readonly ticketToBatch = new Map<string, string>();
  /** Repos whose `~/.claude.json` trust has been seeded this process (idempotent, outside KANBAN_SETUP). */
  private readonly seededRepos = new Set<string>();

  constructor(
    private readonly store: Store,
    private readonly system: SystemAdapter,
    private readonly workerHub: WorkerHub,
    private readonly hub: ClientHub,
    private readonly config: FeasibilityManagerConfig,
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
      // The interactive (TTY) session would block on the trust dialog with no human to confirm it;
      // seed the real repo's trust idempotently (outside KANBAN_SETUP, which only covers slots).
      if (!this.seededRepos.has(project.repoPath)) {
        await this.system.seedWorkspaceTrust([project.repoPath]);
        this.seededRepos.add(project.repoPath);
      }
      const prompt = buildFeasibilityBatchContract(tickets, project);
      await this.system.spawnFeasibilitySession({
        sessionName: feasibilitySessionName(batchId),
        cwd: project.repoPath,
        model: MODELS.triage,
        effort: MODELS.triageEffort,
        mcpConfig: this.buildMcpConfig(batchId),
        env: { DISABLE_AUTOUPDATER: "1" },
      });
      const timer = setTimeout(
        () => void this.handleBatchFailure(batchId, "délai de faisabilité dépassé"),
        FEASIBILITY_TIMEOUT_MS,
      );
      const session: FeasibilitySession = {
        sessionName: feasibilitySessionName(batchId),
        ticketIds: tickets.map((ticket) => ticket.id),
        project,
        attempt,
        timer,
      };
      this.sessions.set(batchId, session);
      for (const ticket of tickets) this.ticketToBatch.set(ticket.id, batchId);
      void this.deliverWhenReady(batchId, prompt, session);
    } catch (error) {
      await this.cleanup(batchId);
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
    await this.cleanup(batchId);

    const byId = new Map(results.map((result) => [result.ticketId, result]));
    for (const ticketId of expectedIds) {
      const result = byId.get(ticketId);
      if (result) {
        this.persistVerdict(ticketId, toTriageResult(result));
      } else {
        this.failTicket(ticketId, "non évalué par la session de faisabilité");
      }
    }
    log.info("faisabilité en lot terminée", { batchId, count: expectedIds.length });
  }

  /** tmux session backing a running feasibility batch, for the terminal viewer; null when none is live. */
  resolveSession(batchId: string): string | null {
    return this.sessions.get(batchId)?.sessionName ?? null;
  }

  /** tmux session backing the batch that is evaluating `ticketId`, for the terminal viewer. */
  resolveSessionForTicket(ticketId: string): string | null {
    const batchId = this.ticketToBatch.get(ticketId);
    return batchId ? this.resolveSession(batchId) : null;
  }

  /** Boot recovery: a `running` triage status with no live session (registry empty on boot) is dead. */
  async recoverStale(): Promise<void> {
    const names = [...this.sessions.values()].map((entry) => entry.sessionName);
    this.sessions.clear();
    this.ticketToBatch.clear();
    for (const name of names) await this.system.killSession(name);
    // The TriageManager's recoverStale already flips every `running` triage status to `failed`;
    // tickets evaluated by a batch share those fields, so they are covered there too. Killing the
    // known batch sessions here is the only extra step needed.
  }

  /** Kill every live feasibility session (desktop shutdown). */
  async teardownAll(): Promise<void> {
    const names = [...this.sessions.values()].map((entry) => {
      clearTimeout(entry.timer);
      return entry.sessionName;
    });
    this.sessions.clear();
    this.ticketToBatch.clear();
    for (const name of names) await this.system.killSession(name);
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
    await this.cleanup(batchId);
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

  /** Kill the tmux session, evict the worker socket, and clear the timeout. Idempotent. */
  private async cleanup(batchId: string): Promise<void> {
    const entry = this.sessions.get(batchId);
    if (entry) clearTimeout(entry.timer);
    this.sessions.delete(batchId);
    for (const [ticketId, id] of this.ticketToBatch) {
      if (id === batchId) this.ticketToBatch.delete(ticketId);
    }
    this.workerHub.disconnect(batchId);
    await this.system.killSession(feasibilitySessionName(batchId));
  }

  /**
   * Deliver the batch contract only once the worker has connected (its WS opens after the session
   * emits `initialized`), so the prompt can't race ahead of readiness and be dropped.
   */
  private async deliverWhenReady(
    batchId: string,
    prompt: string,
    session: FeasibilitySession,
    attempt = 0,
  ): Promise<void> {
    // Identity guard: bail if this session was torn down or superseded, so a stale poll can never
    // deliver the old prompt to a fresh worker.
    if (this.sessions.get(batchId) !== session) return;
    if (this.workerHub.isConnected(batchId)) {
      this.workerHub.sendEvent(batchId, { type: "ticket", payload: prompt });
      log.info("contrat de faisabilité délivré", { batchId });
      return;
    }
    if (attempt >= FEASIBILITY_DELIVER_MAX_ATTEMPTS) {
      await this.handleBatchFailure(batchId, "worker de faisabilité jamais connecté");
      return;
    }
    setTimeout(
      () => void this.deliverWhenReady(batchId, prompt, session, attempt + 1),
      FEASIBILITY_DELIVER_DELAY_MS,
    );
  }

  private buildMcpConfig(batchId: string): string {
    const { workerScriptPath } = resolveTemplatePaths(this.config.projectRoot);
    return JSON.stringify({
      mcpServers: {
        worker: {
          command: this.config.bunPath,
          args: [workerScriptPath],
          env: {
            TICKET_ID: batchId,
            SLOT_ID: String(FEASIBILITY_SLOT_ID),
            BACKEND_WS: this.config.backendWs,
          },
        },
      },
    });
  }
}
