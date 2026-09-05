import { TRIAGE_RAW_REPORT_MAX, TRIAGE_TIMEOUT_MS } from "../../shared/constants.ts";
import { getErrorMessage } from "../../shared/errors.ts";
import type { TriageResult } from "../../shared/schemas.ts";
import { TRIAGE_VERDICT_LABELS } from "../../shared/schemas.ts";
import { MODELS, getProject, isProjectKey } from "../config.ts";

import type { Store } from "../db/store.ts";
import type { ClientHub } from "../hub.ts";
import { createLogger } from "../logger.ts";
import type { Notifier } from "../notifier.ts";
import type { SystemAdapter } from "../system/index.ts";

import { resolveBaseBranch } from "./baseBranch.ts";
import { assertExecutionAvailable, resolveFeasibilityExecution } from "./executionConfig.ts";
import { buildTriageSessionConfig } from "./sessionConfig.ts";
import type { SessionHub } from "./sessionHub.ts";
import { buildTriageChannelPrompt, buildTriagePlusChannelPrompt } from "./triage.ts";

const log = createLogger("triage");

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

interface TriageSession {
  timer: ReturnType<typeof setTimeout>;
}

/**
 * Runs the read-only feasibility triage as an SDK agent session on the real repo (no worktree,
 * branch, install, or slot): a light read-only session whose contract is its first user turn,
 * stopped once the verdict arrives via `submit_triage`.
 */
export class TriageManager {
  private readonly sessions = new Map<string, TriageSession>();
  /** Tickets whose spawn is mid-flight: guards the relaunch path (no 409) against unserialized double-spawn. */
  private readonly launching = new Set<string>();

  constructor(
    private readonly store: Store,
    private readonly system: SystemAdapter,
    private readonly sessionHub: SessionHub,
    private readonly hub: ClientHub,
    private readonly notifier: Notifier,
  ) {}

  /**
   * Start the read-only triage SDK session and inject its prompt as the first turn. With `deep`, runs
   * the deeper "Analyse +" variant: a parallel-fan-out feasibility/solutions analysis on opus/low.
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
    // relaunch mid-spawn) could otherwise both start a session for the same ticket. Serialize per
    // ticket: bail while a spawn is already in flight (a prior live session is torn down by cleanup below).
    if (this.launching.has(ticketId)) return;
    this.launching.add(ticketId);
    try {
      // A relaunch (terminal stuck) may find a previous session still live: tear it down first so a
      // stale session and timeout can't collide with or clobber the fresh run.
      this.cleanup(ticketId);

      const triageLanguage = this.store.getAppSettings().triageLanguage;
      const baseBranch = resolveBaseBranch(ticket, project, this.store);
      // The ticket's feasibility engine wins when pinned; otherwise a codex-orchestrated ticket triages
      // on Codex too (its knobs), so Claude never enters its pipeline.
      const execution = resolveFeasibilityExecution(ticket, "triage", {
        model: MODELS.triage,
        effort: MODELS.triageEffort,
      });
      await assertExecutionAvailable(this.system, execution);
      const driver = execution.provider;
      const prompt = deep
        ? buildTriagePlusChannelPrompt(ticket, project, baseBranch, triageLanguage, driver)
        : buildTriageChannelPrompt(ticket, project, baseBranch, triageLanguage, driver);
      this.sessionHub.start(
        buildTriageSessionConfig({
          ticketId,
          cwd: project.repoPath,
          model: execution.model,
          effort: execution.effort,
          serviceTier: execution.serviceTier,
          deep,
          driver,
        }),
        { onFailure: (reason) => void this.failTriage(ticketId, reason) },
      );
      // The contract is the session's first user turn — no connect poll, no drop race.
      this.sessionHub.sendEvent(ticketId, { type: "ticket", payload: prompt });
      this.store.logEvent(ticketId, "triage_prompt_delivered", {});
      const timer = setTimeout(() => void this.failTriage(ticketId, "délai de triage dépassé"), TRIAGE_TIMEOUT_MS);
      this.sessions.set(ticketId, { timer });
    } catch (error) {
      await this.failTriage(ticketId, getErrorMessage(error));
    } finally {
      this.launching.delete(ticketId);
    }
  }

  /** Worker submitted its verdict: persist it and tear the session down. */
  async complete(ticketId: string, result: TriageResult): Promise<void> {
    this.cleanup(ticketId, "completed");
    this.persistVerdict(ticketId, result);
    const ticket = this.store.getTicket(ticketId);
    if (ticket) {
      void this.notifier.notify(
        "Analyse terminée",
        `${ticket.title} → ${TRIAGE_VERDICT_LABELS[result.verdict]}`,
        ticket.id,
      );
    }
    log.info("triage terminé", { ticketId, verdict: result.verdict });
  }

  /**
   * Live-viewer bridge: the SDK triage session has no tmux pane, so the legacy terminal viewer has
   * nothing to attach to. Returns null until the Phase 5 transcript viewer replaces this path.
   */
  resolveSession(_ticketId: string): string | null {
    return null;
  }

  /** Boot recovery: a `running` triage has no surviving SDK session after a restart, so it is dead. */
  async recoverStale(): Promise<void> {
    for (const ticket of this.store.listTickets(true)) {
      if (ticket.triageStatus !== "running") continue;
      this.sessionHub.disconnect(ticket.id);
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

  /** Stop every live triage session (desktop shutdown). */
  async teardownAll(): Promise<void> {
    for (const [ticketId, entry] of this.sessions) {
      clearTimeout(entry.timer);
      this.sessionHub.disconnect(ticketId);
    }
    this.sessions.clear();
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
    this.cleanup(ticketId, "failed");
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

  /** Stop the SDK session and clear the timeout. Idempotent. */
  private cleanup(ticketId: string, status: "completed" | "failed" | "cancelled" = "cancelled"): void {
    const entry = this.sessions.get(ticketId);
    if (entry) clearTimeout(entry.timer);
    this.sessions.delete(ticketId);
    this.sessionHub.disconnect(ticketId, status);
  }
}
