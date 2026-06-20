import { TRIAGE_RAW_REPORT_MAX, TRIAGE_SLOT_ID, TRIAGE_TIMEOUT_MS } from "../../shared/constants.ts";
import { getErrorMessage } from "../../shared/errors.ts";
import type { AgentEffort, AgentModel } from "../../shared/constants.ts";
import type { TriageResult } from "../../shared/schemas.ts";
import { MODELS, getProject, isProjectKey } from "../config.ts";

import type { Store } from "../db/store.ts";
import type { ClientHub } from "../hub.ts";
import { createLogger } from "../logger.ts";
import type { SystemAdapter } from "../system/index.ts";
import type { WorkerHub } from "../workerHub.ts";

import { buildTriageChannelPrompt, buildTriagePlusChannelPrompt } from "./triage.ts";
import { resolveTemplatePaths } from "./slotTemplates.ts";

const log = createLogger("triage");

/** Worker-connect poll for a triage session (≈2 min: claude boot + MCP connect can be slow). */
const TRIAGE_DELIVER_MAX_ATTEMPTS = 240;
const TRIAGE_DELIVER_DELAY_MS = 500;

/** Deep "Analyse +" model/effort: a stronger model at low effort fans out the parallel sub-agents. */
const TRIAGE_PLUS_MODEL = "opus" satisfies AgentModel;
const TRIAGE_PLUS_EFFORT = "low" satisfies AgentEffort;

/** Stub verdict persisted in dry-run so the board stays exercisable without spawning claude. */
const DRY_RUN_VERDICT: TriageResult = {
  verdict: "needs_info",
  summary: "Triage simulé (dry-run) : aucune session claude n'est lancée dans le bac à sable.",
  reasons: [],
  questions: ["Active le mode réel (KANBAN_DRY_RUN=0) pour un vrai triage de faisabilité."],
  files: [],
  suggestedModel: null,
  suggestedEffort: null,
  solutions: [],
};

function triageSessionName(ticketId: string): string {
  return `triage-${ticketId}`;
}

export interface TriageManagerConfig {
  backendWs: string;
  projectRoot: string;
  bunPath: string;
}

interface TriageSession {
  sessionName: string;
  timer: ReturnType<typeof setTimeout>;
}

/**
 * Runs the read-only feasibility triage as a detached worker-channel session (visible in the same
 * terminal viewer as implementation agents) instead of a `claude -p` one-shot. No worktree, branch,
 * install, or slot: a light session on the real repo, killed once the verdict arrives via
 * `submit_triage`. The trust dialog of the real repo is seeded once before the first spawn.
 */
export class TriageManager {
  private readonly sessions = new Map<string, TriageSession>();
  /** Tickets whose spawn is mid-flight: guards the relaunch path (no 409) against unserialized double-spawn. */
  private readonly launching = new Set<string>();
  /** Repos whose `~/.claude.json` trust has been seeded this process (idempotent, outside KANBAN_SETUP). */
  private readonly seededRepos = new Set<string>();

  constructor(
    private readonly store: Store,
    private readonly system: SystemAdapter,
    private readonly workerHub: WorkerHub,
    private readonly hub: ClientHub,
    private readonly config: TriageManagerConfig,
  ) {}

  /**
   * Spawn the triage session and deliver the prompt once its worker connects. With `deep`, runs the
   * deeper "Analyse +" variant: a parallel-fan-out feasibility/solutions analysis on opus/low.
   */
  async start(ticketId: string, opts?: { deep?: boolean }): Promise<void> {
    const deep = opts?.deep ?? false;
    const ticket = this.store.getTicket(ticketId);
    if (!ticket || !isProjectKey(ticket.project)) {
      await this.failTriage(ticketId, "projet inconnu");
      return;
    }
    const project = getProject(ticket.project);
    this.store.logEvent(ticketId, "triage_started", {});
    log.info("triage démarré", { ticketId, project: ticket.project });

    // Dry-run/tests never spawn claude: short-circuit to a stub verdict so the pipeline stays green.
    if (this.system.dryRun) {
      this.persistVerdict(ticketId, DRY_RUN_VERDICT);
      return;
    }

    // The relaunch path drops the running-status 409, so two near-simultaneous calls (double-click,
    // relaunch mid-spawn) could otherwise both spawn against the same tmux name. Serialize per ticket:
    // bail while a spawn is already in flight (distinct from the in-flight tmux SESSION, which is a
    // legitimate relaunch target torn down by cleanup below).
    if (this.launching.has(ticketId)) return;
    this.launching.add(ticketId);
    try {
      // A relaunch (terminal stuck) may find a previous session still live: tear it down first so the
      // stale tmux pane, worker socket, and timeout can't collide with or clobber the fresh run.
      await this.cleanup(ticketId);

      // The interactive (TTY) session would block on the trust dialog with no human to confirm it;
      // seed the real repo's trust idempotently (outside KANBAN_SETUP, which only covers slots).
      if (!this.seededRepos.has(project.repoPath)) {
        await this.system.seedWorkspaceTrust([project.repoPath]);
        this.seededRepos.add(project.repoPath);
      }
      const prompt = deep
        ? buildTriagePlusChannelPrompt(ticket, project)
        : buildTriageChannelPrompt(ticket, project);
      await this.system.spawnTriageSession({
        sessionName: triageSessionName(ticketId),
        cwd: project.repoPath,
        model: deep ? TRIAGE_PLUS_MODEL : MODELS.triage,
        effort: deep ? TRIAGE_PLUS_EFFORT : MODELS.triageEffort,
        mcpConfig: this.buildMcpConfig(ticketId),
        env: { DISABLE_AUTOUPDATER: "1" },
      });
      const timer = setTimeout(() => void this.failTriage(ticketId, "délai de triage dépassé"), TRIAGE_TIMEOUT_MS);
      const session: TriageSession = { sessionName: triageSessionName(ticketId), timer };
      this.sessions.set(ticketId, session);
      void this.deliverWhenReady(ticketId, prompt, session);
    } catch (error) {
      await this.failTriage(ticketId, getErrorMessage(error));
    } finally {
      this.launching.delete(ticketId);
    }
  }

  /** Worker submitted its verdict: persist it and tear the session down. */
  async complete(ticketId: string, result: TriageResult): Promise<void> {
    await this.cleanup(ticketId);
    this.persistVerdict(ticketId, result);
    log.info("triage terminé", { ticketId, verdict: result.verdict });
  }

  /** tmux session backing a running triage, for the terminal viewer; null when none is live. */
  resolveSession(ticketId: string): string | null {
    return this.sessions.get(ticketId)?.sessionName ?? null;
  }

  /** Boot recovery: a `running` triage with no live session (registry is empty on boot) is dead. */
  async recoverStale(): Promise<void> {
    for (const ticket of this.store.listTickets(true)) {
      if (ticket.triageStatus !== "running") continue;
      this.workerHub.disconnect(ticket.id);
      await this.system.killSession(triageSessionName(ticket.id));
      const updated = this.store.updateTicket(ticket.id, {
        triageStatus: "failed",
        triageVerdict: null,
        triageReport: "triage interrompu (redémarrage du serveur)",
      });
      this.hub.pushTicket(updated);
      this.store.logEvent(ticket.id, "triage_failed", { reason: "server restart" });
      log.warn("triage orphelin récupéré au boot", { ticketId: ticket.id });
    }
  }

  /** Kill every live triage session (desktop shutdown). */
  async teardownAll(): Promise<void> {
    const names = [...this.sessions.values()].map((entry) => {
      clearTimeout(entry.timer);
      return entry.sessionName;
    });
    this.sessions.clear();
    for (const name of names) await this.system.killSession(name);
  }

  private persistVerdict(ticketId: string, result: TriageResult): void {
    const updated = this.store.updateTicket(ticketId, {
      triageStatus: "done",
      triageVerdict: result.verdict,
      triageReport: JSON.stringify(result),
    });
    this.hub.pushTicket(updated);
    this.store.logEvent(ticketId, "triage_done", { verdict: result.verdict });
  }

  private async failTriage(ticketId: string, reason: string): Promise<void> {
    await this.cleanup(ticketId);
    if (!this.store.getTicket(ticketId)) return;
    const updated = this.store.updateTicket(ticketId, {
      triageStatus: "failed",
      triageVerdict: null,
      triageReport: reason.slice(0, TRIAGE_RAW_REPORT_MAX),
    });
    this.hub.pushTicket(updated);
    this.store.logEvent(ticketId, "triage_failed", { reason });
    log.warn("triage échoué", { ticketId, reason });
  }

  /** Kill the tmux session, evict the worker socket, and clear the timeout. Idempotent. */
  private async cleanup(ticketId: string): Promise<void> {
    const entry = this.sessions.get(ticketId);
    if (entry) clearTimeout(entry.timer);
    this.sessions.delete(ticketId);
    this.workerHub.disconnect(ticketId);
    // Compute the name even without a registry entry so a partially-spawned session is still killed.
    await this.system.killSession(triageSessionName(ticketId));
  }

  /**
   * Deliver the triage prompt only once the worker has connected (its WS opens after the session
   * emits `initialized`), so the prompt can't race ahead of readiness and be dropped.
   */
  private async deliverWhenReady(ticketId: string, prompt: string, session: TriageSession, attempt = 0): Promise<void> {
    // Identity guard: bail if this session was torn down or superseded by a re-spawn, so a stale
    // poll can never deliver the old prompt to a fresh worker.
    if (this.sessions.get(ticketId) !== session) return;
    if (this.workerHub.isConnected(ticketId)) {
      this.workerHub.sendEvent(ticketId, { type: "ticket", payload: prompt });
      this.store.logEvent(ticketId, "triage_prompt_delivered", {});
      log.info("prompt de triage délivré", { ticketId });
      return;
    }
    if (attempt >= TRIAGE_DELIVER_MAX_ATTEMPTS) {
      await this.failTriage(ticketId, "worker de triage jamais connecté");
      return;
    }
    setTimeout(() => void this.deliverWhenReady(ticketId, prompt, session, attempt + 1), TRIAGE_DELIVER_DELAY_MS);
  }

  private buildMcpConfig(ticketId: string): string {
    const { workerScriptPath } = resolveTemplatePaths(this.config.projectRoot);
    return JSON.stringify({
      mcpServers: {
        worker: {
          command: this.config.bunPath,
          args: [workerScriptPath],
          env: {
            TICKET_ID: ticketId,
            SLOT_ID: String(TRIAGE_SLOT_ID),
            BACKEND_WS: this.config.backendWs,
          },
        },
      },
    });
  }
}
