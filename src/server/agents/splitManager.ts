import { SPLIT_TIMEOUT_MS } from "../../shared/constants.ts";
import { getErrorMessage } from "../../shared/errors.ts";
import type { SplitResult } from "../../shared/schemas.ts";
import { MODELS, getProject, isProjectKey } from "../config.ts";

import type { Store } from "../db/store.ts";
import { createLogger } from "../logger.ts";
import type { SystemAdapter } from "../system/index.ts";

import { buildSplitSessionConfig } from "./sessionConfig.ts";
import type { SessionHub } from "./sessionHub.ts";
import { buildSplitChannelPrompt } from "./split.ts";

const log = createLogger("split");

/** Stub decomposition resolved in dry-run so the board stays exercisable without spawning claude. */
const DRY_RUN_RESULT: SplitResult = {
  summary: "Découpage simulé (dry-run) : aucune session claude n'est lancée dans le bac à sable.",
  children: [
    { title: "Sous-ticket simulé 1", summary: "Première fille simulée (dry-run).", children: [] },
    { title: "Sous-ticket simulé 2", summary: "Seconde fille simulée (dry-run).", children: [] },
  ],
};

interface PendingSplit {
  resolve: (result: SplitResult) => void;
  reject: (error: Error) => void;
  timer: ReturnType<typeof setTimeout>;
}

/**
 * Runs the read-only ticket-split decomposition as an SDK agent session on the real repo (no worktree,
 * branch, install, or slot): a light read-only session whose contract is its first user turn, resolved
 * once the decomposition arrives via `submit_split`. SplitManager only produces the SplitResult — the
 * REST route owns the create-children → branch → link → mother-done orchestration.
 */
export class SplitManager {
  private readonly pending = new Map<string, PendingSplit>();

  constructor(
    private readonly store: Store,
    private readonly system: SystemAdapter,
    private readonly sessionHub: SessionHub,
  ) {}

  /** Start the read-only split session, inject its prompt, and resolve once `submit_split` arrives. */
  async run(ticketId: string): Promise<SplitResult> {
    const ticket = this.store.getTicket(ticketId);
    if (!ticket || !isProjectKey(ticket.project)) {
      throw new Error("projet inconnu");
    }
    const project = getProject(ticket.project);
    log.info("split démarré", { ticketId, project: ticket.project });

    // Dry-run/tests never spawn claude: short-circuit to a stub decomposition so the flow stays green.
    if (this.system.dryRun) {
      return DRY_RUN_RESULT;
    }

    // Guard against a concurrent split of the same ticket (e.g. a double-click): the first run owns the
    // session keyed by this ticketId, so a second would tear it down and start a duplicate decomposition.
    if (this.pending.has(ticketId)) {
      throw new Error("découpage déjà en cours pour ce ticket");
    }

    // A stale session for this ticket (rare) is torn down first so it can't collide with the fresh run.
    this.cleanup(ticketId);

    const splitLanguage = this.store.getAppSettings().triageLanguage;
    const prompt = buildSplitChannelPrompt(ticket, project, splitLanguage);

    return new Promise<SplitResult>((resolve, reject) => {
      try {
        this.sessionHub.start(
          buildSplitSessionConfig({
            ticketId,
            cwd: project.repoPath,
            model: MODELS.triage,
            effort: MODELS.triageEffort,
          }),
        );
        this.sessionHub.sendEvent(ticketId, { type: "ticket", payload: prompt });
        const timer = setTimeout(() => {
          this.cleanup(ticketId);
          reject(new Error("délai de découpage dépassé"));
        }, SPLIT_TIMEOUT_MS);
        this.pending.set(ticketId, { resolve, reject, timer });
      } catch (error) {
        this.cleanup(ticketId);
        reject(new Error(getErrorMessage(error)));
      }
    });
  }

  /** Worker submitted its decomposition: tear the session down and resolve the pending promise. */
  async complete(ticketId: string, result: SplitResult): Promise<void> {
    const entry = this.pending.get(ticketId);
    this.cleanup(ticketId);
    if (entry) entry.resolve(result);
    log.info("split terminé", { ticketId, children: result.children.length });
  }

  /** Stop the SDK session and clear the pending entry/timeout. Idempotent. */
  private cleanup(ticketId: string): void {
    const entry = this.pending.get(ticketId);
    if (entry) clearTimeout(entry.timer);
    this.pending.delete(ticketId);
    this.sessionHub.disconnect(ticketId);
  }
}
