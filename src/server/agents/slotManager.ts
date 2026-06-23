import { join } from "node:path";

import {
  AUTO_MERGE_RESOLVE_EVENT,
  AUTO_MERGE_RESOLVE_MAX,
  AUTO_RECLAIM_EVENT,
  AUTO_RECLAIM_MAX,
  CLEANER_BRANCH_SUFFIX,
  DONE_GATE_FAILED_EVENT,
  DONE_GATE_MAX_FAILURES,
  TERMINAL_STAGES,
  type Column,
} from "../../shared/constants.ts";
import { getErrorMessage } from "../../shared/errors.ts";
import type { Ticket } from "../../shared/schemas.ts";
import { MODELS, SLOTS_ROOT, getProject, isProjectKey } from "../config.ts";

import type { Store } from "../db/store.ts";
import type { ClientHub } from "../hub.ts";
import type { TicketLifecycle } from "../lifecycle.ts";
import { createLogger } from "../logger.ts";
import { KeyedMutex } from "../mutex.ts";
import type { Notifier } from "../notifier.ts";
import type { SystemAdapter } from "../system/index.ts";
import type { DoneGateResult } from "../system/types.ts";
import type { WorkerHub } from "../workerHub.ts";

import { resolveBaseBranch } from "./baseBranch.ts";
import {
  buildAskContract,
  buildCleanContract,
  buildConflictResolutionContract,
  buildReviewContract,
  buildTicketContract,
} from "./contract.ts";
import {
  buildImplementerAgentMd,
  buildPrFixerAgentMd,
  buildMcpJson,
  buildSettingsJson,
  resolveTemplatePaths,
  type SlotTemplateContext,
} from "./slotTemplates.ts";

const MAX_SLUG_WORDS = 6;
const SLUG_MAX_LENGTH = 40;

/** Worker-connect poll: ~2 min total (claude boot + MCP connect can exceed 20 s on a cold start). */
const CONTRACT_DELIVER_MAX_ATTEMPTS = 240;
const CONTRACT_DELIVER_DELAY_MS = 500;
/**
 * Delay before checking the agent acked the contract. Kept ABOVE the normal
 * init→first-tool-call latency (~13 s observed) so a healthy review session — whose contract
 * mandates update_stage("reviewing") as step 1 — acks before the check and is never re-pushed.
 * Only a dropped contract leaves no ack within this window.
 */
const CONTRACT_ACK_CHECK_DELAY_MS = 15_000;
/** Cap on forced re-pushes when delivery is never acked (≈45 s of dropped-contract recovery). */
const CONTRACT_REPUSH_MAX_ATTEMPTS = 3;

/** Audit event logged on the agent's first protocol tool call; gates the contract re-push. */
export const CONTRACT_ACKED_EVENT = "contract_acked";
/**
 * Audit event logged when the preToolUse hook fires for the first time: the agent is alive and
 * receiving tool calls, even before its first protocol call. Used as an early-life discriminator
 * in the contract re-push guard so feature tickets dropped before their first protocol call are
 * recovered just like review tickets.
 */
export const AGENT_ACTIVE_EVENT = "agent_active";

/**
 * Outcome of an auto-reclaim attempt:
 * - `reclaimed`: relaunched in place; caller does nothing.
 * - `escalate`: cap hit or relaunch failed; caller marks stalled/interrupted + notifies.
 * - `ignore`: no slot held or a launch is already in flight; caller does nothing (no escalation).
 */
export type ReclaimOutcome = "reclaimed" | "escalate" | "ignore";

const log = createLogger("slot");

/** Human-readable setup phases surfaced to the terminal view before the agent produces output. */
const SETUP_PHASES = {
  worktree: "Préparation du worktree…",
  setup: "Configuration du worktree (script projet)…",
  deps: "Installation des dépendances…",
  launching: "Lancement du projet…",
  spawning: "Démarrage de la session Claude…",
  waiting: "En attente de la première sortie de l'agent…",
} as const;

export interface SlotManagerConfig {
  backendHttp: string;
  backendWs: string;
  projectRoot: string;
  bunPath: string;
}

function slugify(title: string): string {
  return title
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .split("-")
    .slice(0, MAX_SLUG_WORDS)
    .join("-")
    .slice(0, SLUG_MAX_LENGTH);
}

export function slotPath(slotId: number): string {
  return join(SLOTS_ROOT, `slot-${slotId}`);
}

/**
 * Owns the full slot lifecycle: cleanup → fetch → worktree add → deposit config →
 * copy env → install → tmux spawn → done gate → release. Serializes git ops per repo.
 */
export class SlotManager {
  private readonly repoMutex = new KeyedMutex();
  private readonly queue: string[] = [];
  /** Live setup phase per ticket, shown in the terminal view until the agent outputs. */
  private readonly setupPhase = new Map<string, string>();

  /** Current pre-output setup phase for a ticket (null once the agent is producing output). */
  getSetupPhase(ticketId: string): string | null {
    return this.setupPhase.get(ticketId) ?? null;
  }

  private setPhase(ticketId: string, phase: string): void {
    this.setupPhase.set(ticketId, phase);
    log.info(phase, { ticketId });
  }

  private clearPhase(ticketId: string): void {
    this.setupPhase.delete(ticketId);
  }

  constructor(
    private readonly store: Store,
    private readonly system: SystemAdapter,
    private readonly hub: ClientHub,
    private readonly workerHub: WorkerHub,
    private readonly notifier: Notifier,
    private readonly lifecycle: TicketLifecycle,
    private readonly config: SlotManagerConfig,
  ) {}

  /** Entry point when a ticket is dragged into "À implémenter". */
  async startTicket(ticketId: string): Promise<void> {
    const free = this.store.findFreeSlot();
    if (!free) {
      if (!this.queue.includes(ticketId)) {
        this.queue.push(ticketId);
        this.store.logEvent(ticketId, "queued", { reason: "no free slot" });
        log.info("ticket en file (aucun slot libre)", { ticketId, queueLength: this.queue.length });
      }
      return;
    }
    await this.launchInSlot(free.id, ticketId);
  }

  private pumpQueue(): void {
    const next = this.queue.shift();
    if (next) void this.startTicket(next);
  }

  /**
   * Parent reached done() (PR open, branch pushed): auto-start any todo child that depends on it.
   * Recursive by nature (each child's own done releases its children).
   */
  private async startDependents(parentId: string): Promise<void> {
    for (const child of this.store.listDependents(parentId)) {
      if (child.column !== "todo") continue;
      this.lifecycle.enqueue(child.id);
      await this.startTicket(child.id);
    }
  }

  /**
   * Auto-merge failed (conflicts / branch behind base): spawn an opus-low session on the EXISTING
   * PR branch to rebase onto the base, resolve conflicts, force-push, then re-trigger the auto-merge
   * via done(). Unlike startTicket it never queues — with no free slot it surfaces a hint and bails,
   * leaving the card in its failed state so the user can retry once a slot frees up.
   */
  async resolveMergeConflicts(ticketId: string): Promise<boolean> {
    const ticket = this.store.getTicket(ticketId);
    if (!ticket || ticket.branch === null || ticket.prUrl === null) return false;
    const free = this.store.findFreeSlot();
    if (!free) {
      this.touch(
        this.store.updateTicket(ticketId, {
          error: "Aucun slot libre pour résoudre les conflits — réessaie une fois un slot libéré.",
        }),
      );
      return false;
    }
    this.store.logEvent(ticketId, "resolve_conflicts_started", { prUrl: ticket.prUrl });
    // opus low per the feature spec; the flag routes the conflict-resolution contract at delivery.
    this.touch(
      this.store.updateTicket(ticketId, {
        resolvingConflicts: true,
        model: "opus",
        effort: "low",
        column: "implementing",
        stage: "queued",
        error: null,
        finishedAt: null,
      }),
    );
    await this.launchInSlot(free.id, ticketId);
    return true;
  }

  /**
   * Spawn an interactive test session for a finished feature: reserve a free slot, recreate a
   * runnable worktree on the card's EXISTING feature branch (fetched from origin after the slot was
   * released), run the project setup + install deps, then spawn a PLAIN interactive shell that
   * auto-runs the project's launch command (`runScript`) and hands control to the user via the
   * terminal. No Claude, no contract, no pipeline, no gate, no PR, no queue. The card stays in "Fini"
   * (column/stage untouched) — the `testing` flag is the only marker. Eligibility is re-checked here
   * (the route also validates) so a double click can't double-spawn.
   */
  async startTestSession(ticketId: string): Promise<void> {
    const ticket = this.store.getTicket(ticketId);
    if (
      !ticket ||
      ticket.kind !== "feature" ||
      ticket.column !== "done" ||
      ticket.branch === null ||
      ticket.slotId !== null ||
      ticket.testing ||
      !isProjectKey(ticket.project)
    ) {
      return;
    }
    const free = this.store.findFreeSlot();
    if (!free) {
      this.touch(
        this.store.updateTicket(ticketId, {
          error: "Aucun slot libre pour tester — réessaie une fois un slot libéré.",
        }),
      );
      return;
    }
    this.store.logEvent(ticketId, "test_session_started", {});

    const project = getProject(ticket.project);
    const baseBranch = ticket.baseBranch ?? project.baseBranch;
    const branch = ticket.branch;
    const path = slotPath(free.id);
    const sessionName = `ticket-${ticketId}`;

    this.store.updateSlot(free.id, {
      ticketId,
      repoPath: project.repoPath,
      tmuxSession: sessionName,
      status: "busy",
    });
    this.touch(this.store.updateTicket(ticketId, { testing: true, slotId: free.id, error: null }));
    this.hub.pushSlots(this.store.listSlots());
    log.info("démarrage session de test", { ticketId, slotId: free.id, branch });

    try {
      this.setPhase(ticketId, SETUP_PHASES.worktree);
      await this.repoMutex.run(project.repoPath, async () => {
        const previous = this.store.getSlot(free.id);
        await this.system.worktreeRemove(previous?.repoPath ?? project.repoPath, path);
        await this.system.deleteLocalBranch(project.repoPath, branch);
        await this.system.fetch(project.repoPath, baseBranch);
        // The feature branch lives only on origin after the original slot was released.
        await this.system.fetch(project.repoPath, branch);
        await this.system.worktreeAddExisting(project.repoPath, path, branch);
      });

      await this.system.copyEnvFiles(project.repoPath, path);

      // Testing demands a runnable worktree — never skip setup/install (unlike an ask ticket).
      this.setPhase(ticketId, SETUP_PHASES.setup);
      await this.system.runWorktreeSetupScript({
        repoPath: project.repoPath,
        slotPath: path,
        branch,
        baseBranch,
        script: project.worktreeScript ?? null,
        timeoutMs: project.commitTimeoutMs,
      });
      this.setPhase(ticketId, SETUP_PHASES.deps);
      await this.system.installDeps(path, project.commitTimeoutMs);

      // Plain interactive shell (no Claude, no contract, no worker) that auto-runs the project's
      // launch command, then stays open for the user. A project without `runScript` drops into a bare
      // shell with no auto-launch.
      const runCmd = project.runScript ?? null;
      this.setPhase(ticketId, SETUP_PHASES.launching);
      await this.system.spawnShellSession({ sessionName, cwd: path, initialCommand: runCmd ?? undefined });
      this.store.logEvent(ticketId, "test_session_launched", { slotId: free.id, sessionName, runCmd });
      this.clearPhase(ticketId);
      log.info("shell de test lancé", { ticketId, slotId: free.id, sessionName, runCmd });
    } catch (error) {
      this.clearPhase(ticketId);
      // Not markFailed: a test setup failure must not flip the card to "failed". Free the slot and
      // surface the error; the user can retry once a slot frees up.
      const message = error instanceof Error ? error.message : String(error);
      await this.releaseSlot(free.id, ticket);
      this.touch(this.store.updateTicket(ticketId, { testing: false, slotId: null, error: message }));
      log.error("échec setup session de test", { ticketId, slotId: free.id, error: message });
    }
  }

  /** Stop an interactive test session: kill it, drop the worktree + local branch, free the slot. */
  async stopTestSession(ticketId: string): Promise<void> {
    const ticket = this.store.getTicket(ticketId);
    if (!ticket || !ticket.testing || ticket.slotId === null) return;
    await this.releaseSlot(ticket.slotId, ticket);
    this.touch(this.store.updateTicket(ticketId, { testing: false, slotId: null, error: null }));
    this.store.logEvent(ticketId, "test_session_stopped", {});
    log.info("session de test arrêtée", { ticketId });
    this.pumpQueue();
  }

  private async launchInSlot(slotId: number, ticketId: string): Promise<void> {
    const ticket = this.store.getTicket(ticketId);
    if (!ticket) return;
    if (!isProjectKey(ticket.project)) {
      this.markFailed(ticketId, slotId, `Projet inconnu: ${ticket.project}`);
      return;
    }
    const project = getProject(ticket.project);
    const baseBranch = resolveBaseBranch(ticket, project, this.store);
    const path = slotPath(slotId);
    const slug = slugify(ticket.title);
    // Resolving merge conflicts reuses the EXISTING PR branch (its commits); a fresh feature run
    // forks a new branch off the base.
    const resolving = ticket.resolvingConflicts && ticket.branch !== null;
    // A fixComments review reuses the EXISTING PR head branch (its commits) so fixes can be committed
    // and pushed straight to the PR — no new PR.
    const reviewFix = ticket.kind === "review" && ticket.fixComments && ticket.prHeadBranch !== null;
    // A clean ticket reuses the EXISTING PR head branch (its commits) so fixes can be committed and
    // pushed straight to the PR — no new PR (same as a fixComments review).
    const cleanFix = ticket.kind === "clean" && ticket.prHeadBranch !== null;
    // The repeated null checks are required: TS does not carry the narrowing across `resolving`/`reviewFix`/`cleanFix`.
    let branch = `feat/${ticket.id}-${slug}`;
    // For an existing-branch checkout (resolving/reviewFix/cleanFix), the origin ref to start from.
    // A clean ticket's local branch is suffixed to avoid colliding with the PR head branch when it is
    // already checked out in another worktree; it still starts from and pushes back to the PR head.
    let startBranch: string | null = null;
    if (resolving && ticket.branch !== null) {
      branch = ticket.branch;
      startBranch = ticket.branch;
    } else if (reviewFix && ticket.prHeadBranch !== null) {
      branch = ticket.prHeadBranch;
      startBranch = ticket.prHeadBranch;
    } else if (cleanFix && ticket.prHeadBranch !== null) {
      branch = `${ticket.prHeadBranch}${CLEANER_BRANCH_SUFFIX}`;
      startBranch = ticket.prHeadBranch;
    }
    const sessionName = `ticket-${ticket.id}`;

    this.store.updateSlot(slotId, {
      ticketId,
      repoPath: project.repoPath,
      tmuxSession: sessionName,
      status: "busy",
    });
    this.touch(
      this.store.updateTicket(ticketId, {
        slotId,
        branch,
        stage: "queued",
        finishedAt: null,
        lastProgressAt: Date.now(),
      }),
    );
    this.hub.pushSlots(this.store.listSlots());
    log.info("lancement du ticket", { ticketId, slotId, project: ticket.project, branch });

    try {
      this.setPhase(ticketId, SETUP_PHASES.worktree);
      await this.repoMutex.run(project.repoPath, async () => {
        const previous = this.store.getSlot(slotId);
        await this.system.worktreeRemove(previous?.repoPath ?? project.repoPath, path);
        // A failed/stuck prior launch leaves the feature branch behind; `worktree add -b`
        // then aborts (git exits 255, "branch already exists"). Drop the leftover first —
        // it is recreated fresh from origin/baseBranch just below.
        await this.system.deleteLocalBranch(project.repoPath, branch);
        await this.system.fetch(project.repoPath, baseBranch);
        if (resolving || reviewFix || cleanFix) {
          // The PR branch lives only on origin after the slot was released; fetch it, then check it
          // out so the session has the PR's commits. Conflict resolution rebases onto the (also
          // fetched) base; a review-fix or clean applies and pushes fixes onto this same PR head branch.
          const start = startBranch ?? branch;
          await this.system.fetch(project.repoPath, start);
          await this.system.worktreeAddExisting(project.repoPath, path, branch, start);
        } else {
          await this.system.worktreeAdd({
            repoPath: project.repoPath,
            slotPath: path,
            branch,
            baseBranch,
          });
        }
      });

      await this.depositSlotFiles(path, ticket, slotId);
      await this.system.copyEnvFiles(project.repoPath, path);
      // An ask ticket is read-only (explore + answer); the project setup script and dep install are
      // pure overhead, so skip both to start answering faster. Feature/review tickets need a built
      // tree (typecheck/lint/argus) and the project's own setup (e.g. generated .env). The setup
      // script runs before install since it may produce the .env the install step relies on.
      if (ticket.kind !== "ask") {
        this.setPhase(ticketId, SETUP_PHASES.setup);
        await this.system.runWorktreeSetupScript({
          repoPath: project.repoPath,
          slotPath: path,
          branch,
          baseBranch,
          script: project.worktreeScript ?? null,
          timeoutMs: project.commitTimeoutMs,
        });
        this.setPhase(ticketId, SETUP_PHASES.deps);
        await this.system.installDeps(path, project.commitTimeoutMs);
      }

      this.setPhase(ticketId, SETUP_PHASES.spawning);
      await this.system.spawnSession({
        sessionName,
        cwd: path,
        model: ticket.model ?? MODELS.implement,
        effort: ticket.effort ?? MODELS.implementEffort,
        env: {
          TICKET_ID: ticket.id,
          SLOT_ID: String(slotId),
          BACKEND_WS: this.config.backendWs,
          DISABLE_AUTOUPDATER: "1",
        },
      });
      this.setPhase(ticketId, SETUP_PHASES.waiting);

      this.touch(this.store.updateTicket(ticketId, { stage: "implementing", lastProgressAt: Date.now() }));
      this.store.logEvent(ticketId, "session_spawned", { slotId, sessionName });
      log.info("session spawnée", { ticketId, slotId, sessionName });

      // Deliver the contract once the worker connects (with a short retry window).
      void this.deliverContractWhenReady(ticket.id);
    } catch (error) {
      this.clearPhase(ticketId);
      this.markFailed(ticketId, slotId, getErrorMessage(error));
    }
  }

  private async depositSlotFiles(path: string, ticket: Ticket, slotId: number): Promise<void> {
    const templates = resolveTemplatePaths(this.config.projectRoot);
    const ctx: SlotTemplateContext = {
      ...templates,
      backendHttp: this.config.backendHttp,
      backendWs: this.config.backendWs,
      ticketId: ticket.id,
      slotId,
      bunPath: this.config.bunPath,
      implementerModel: ticket.implementerModel ?? MODELS.implementerModel,
      implementerEffort: ticket.implementerEffort ?? MODELS.implementerEffort,
    };
    await this.system.prepareSlotFiles({
      slotPath: path,
      mcpJson: buildMcpJson(ctx),
      settingsJson: buildSettingsJson(ctx),
      implementerAgentMd: buildImplementerAgentMd(ctx),
      prFixerAgentMd: buildPrFixerAgentMd(ctx),
    });
  }

  /**
   * Send the contract exactly once per spawned session. Called on worker hello
   * and from the post-spawn poll; the contract_delivered event marker makes it
   * idempotent across reconnects and backend restarts.
   */
  deliverContractIfPending(ticketId: string): boolean {
    if (!this.workerHub.isConnected(ticketId)) return false;
    const last = this.store.lastEventType(ticketId, ["session_spawned", "contract_delivered"]);
    if (last !== "session_spawned") return last === "contract_delivered";
    const ticket = this.store.getTicket(ticketId);
    if (!ticket) return false;
    const sent = this.workerHub.sendEvent(ticketId, { type: "ticket", payload: this.buildContractPayload(ticket) });
    if (sent) {
      this.store.logEvent(ticketId, "contract_delivered", {});
      this.clearPhase(ticketId);
      log.info("contrat délivré à l'agent", { ticketId });
    }
    return sent;
  }

  private buildContractPayload(ticket: Ticket): string {
    const { commitLanguage } = this.store.getAppSettings();
    if (ticket.resolvingConflicts) return buildConflictResolutionContract(ticket, { commitLanguage });
    if (ticket.kind === "review") return buildReviewContract(ticket, { commitLanguage });
    if (ticket.kind === "clean") return buildCleanContract(ticket, { commitLanguage });
    if (ticket.kind === "ask") return buildAskContract(ticket);
    // A child ticket stacks on its parent's branch: the PR target must match the worktree fork point
    // resolved in launchInSlot, so resolve it once here and pass it through.
    const baseBranch = isProjectKey(ticket.project)
      ? resolveBaseBranch(ticket, getProject(ticket.project), this.store)
      : ticket.baseBranch ?? "";
    return buildTicketContract(ticket, {
      composerScriptPath: resolveTemplatePaths(this.config.projectRoot).composerScriptPath,
      commitLanguage,
      baseBranch,
    });
  }

  private async deliverContractWhenReady(ticketId: string, attempt = 0): Promise<void> {
    if (this.deliverContractIfPending(ticketId)) {
      // Delivery over WS is fire-and-forget: the contract can be dropped if it lands before
      // Claude's conversation loop is ready. Gate on the agent's ack and re-push if it never comes.
      this.scheduleContractAckCheck(ticketId);
      return;
    }
    if (attempt >= CONTRACT_DELIVER_MAX_ATTEMPTS) {
      await this.handleWorkerConnectTimeout(ticketId);
      return;
    }
    setTimeout(() => void this.deliverContractWhenReady(ticketId, attempt + 1), CONTRACT_DELIVER_DELAY_MS);
  }

  /**
   * The worker never connected within the poll window (~2 min): claude most likely crashed at
   * boot, so the contract was never delivered and the session is dead weight. Auto-reclaim
   * (relaunch in place, reusing the Task 1 counter) instead of letting the card sit in
   * "implementing" until the 45 min progress watchdog. Past the reclaim cap → fail + notify.
   *
   * The poll only resolves false while the worker is disconnected, so reaching here means no
   * worker_connected event. A connect that has already completed before the synchronous guard is
   * caught here; one that lands later (a still-booting claude) is fenced off in the escalation
   * branch by killing the session before markFailed.
   */
  private async handleWorkerConnectTimeout(ticketId: string): Promise<void> {
    if (this.workerHub.isConnected(ticketId)) return;
    log.warn("worker jamais connecté dans la fenêtre de spawn", { ticketId });
    const outcome = await this.tryAutoReclaim(ticketId, "worker jamais connecté au spawn");
    if (outcome !== "escalate") return;
    const ticket = this.store.getTicket(ticketId);
    if (ticket?.slotId == null) return;
    // Past the reclaim cap: tear down the (possibly still-booting) session before marking failed.
    // Otherwise a late worker hello would reach deliverContractIfPending — which has no terminal
    // stage guard — and start the agent working on a card the UI already shows as failed.
    await this.system.killSession(`ticket-${ticketId}`);
    this.workerHub.disconnect(ticketId);
    this.markFailed(ticketId, ticket.slotId, "worker jamais connecté après reclaim");
  }

  private scheduleContractAckCheck(ticketId: string, attempt = 0): void {
    setTimeout(() => this.repushContractIfUnacked(ticketId, attempt), CONTRACT_ACK_CHECK_DELAY_MS);
  }

  /**
   * Re-push the contract when an agent never acked it (no protocol tool call → dropped contract).
   * The ack lands well before the first check in the nominal case, so this fires only on a real drop;
   * the re-push then arrives once the session is ready. Bounded by CONTRACT_REPUSH_MAX_ATTEMPTS.
   *
   * The early-life discriminator is agent_active (emitted by the preToolUse hook on the first tool
   * call). A healthy agent emits it before the check window expires → no re-push. An agent that
   * dropped the contract never calls any tool → no agent_active → re-push.
   * contract_acked (first protocol tool) and auto_nudge also count as "agent alive".
   */
  private repushContractIfUnacked(ticketId: string, attempt: number): void {
    if (
      this.store.lastEventType(ticketId, [CONTRACT_ACKED_EVENT, AGENT_ACTIVE_EVENT, "auto_nudge"]) !== null
    ) return;
    if (!this.workerHub.isConnected(ticketId)) return;
    if (attempt >= CONTRACT_REPUSH_MAX_ATTEMPTS) return;
    const ticket = this.store.getTicket(ticketId);
    if (!ticket) return;
    if (ticket.stage !== null && TERMINAL_STAGES.includes(ticket.stage)) return;
    const sent = this.workerHub.sendEvent(ticketId, { type: "ticket", payload: this.buildContractPayload(ticket) });
    if (sent) {
      this.store.logEvent(ticketId, "contract_repushed", { attempt: attempt + 1 });
      log.warn("contrat re-poussé (ack absent)", { ticketId, attempt: attempt + 1 });
    }
    this.scheduleContractAckCheck(ticketId, attempt + 1);
  }

  /**
   * Select the done gate by ticket kind. Review gates on optional posted/pushed proof; a clean gates
   * on a clean tree and a fully-pushed PR head branch — `requirePushedBranch` asserts both no
   * uncommitted changes AND zero commits ahead of origin, which also passes the legitimate "nothing
   * pertinent to apply" case (0 commits ahead) while preventing applied-but-unpushed fixes from being
   * lost when the slot is released; everything else gates on the standard feature done.
   */
  private doneGate(ticket: Ticket, path: string, branch: string, prUrl: string): Promise<DoneGateResult> {
    if (ticket.kind === "review") {
      return this.system.verifyReviewDone(path, prUrl, {
        requirePostedSince: ticket.postComments ? ticket.createdAt : null,
        requirePushedBranch: ticket.fixComments ? ticket.prHeadBranch : null,
      });
    }
    if (ticket.kind === "clean") {
      return this.system.verifyReviewDone(path, prUrl, {
        requirePostedSince: null,
        requirePushedBranch: ticket.prHeadBranch,
      });
    }
    return this.system.verifyDone(path, branch, prUrl);
  }

  /** Verify and release a slot on done(pr_url). */
  async finishTicket(ticketId: string, slotId: number, prUrl: string): Promise<{ ok: boolean; reason: string }> {
    const ticket = this.store.getTicket(ticketId);
    if (!ticket || !ticket.branch) return { ok: false, reason: "ticket ou branche introuvable" };
    const path = slotPath(slotId);

    log.info("vérification de la gate done", { ticketId, slotId, prUrl, kind: ticket.kind });
    const gate = await this.doneGate(ticket, path, ticket.branch, prUrl);
    if (!gate.ok) {
      this.store.logEvent(ticketId, DONE_GATE_FAILED_EVENT, { reason: gate.reason });
      const consecutiveFailures = this.store.countTrailingEvents(ticketId, DONE_GATE_FAILED_EVENT, DONE_GATE_MAX_FAILURES);
      // A failed gate is not, by itself, a stall: done() hands the actionable reason back to the
      // still-alive agent, which corrects and retries (e.g. commits a file it left uncommitted).
      // Marking the card "stalled" on the first failure produced false "Bloqué" badges while the
      // session kept working. Escalate to a real stall only once the agent is gone, or it loops on
      // the gate without ever passing it (no progress between attempts → consecutive failures).
      const retriable = this.workerHub.isConnected(ticketId) && consecutiveFailures < DONE_GATE_MAX_FAILURES;
      if (retriable) {
        // Keep the card active (animated "opening_pr"), clear of any stale error box. The watchdog
        // and Stop-hook still guard a session that genuinely dies in this stage.
        this.touch(this.store.updateTicket(ticketId, { stage: "opening_pr", error: null }));
        log.info("gate done échouée — l'agent corrige et réessaie", { ticketId, reason: gate.reason, consecutiveFailures });
        return { ok: false, reason: gate.reason };
      }
      log.warn("gate done échouée (épuisée)", { ticketId, reason: gate.reason, consecutiveFailures });
      await this.lifecycle.stall(
        ticketId,
        { title: "Gate done échouée", body: `${ticket.title}: ${gate.reason}` },
        { error: gate.reason },
      );
      return { ok: false, reason: gate.reason };
    }
    log.info("ticket terminé, slot libéré", { ticketId, slotId, prUrl });

    // Opt-in auto-merge: merge before releasing the slot (worktree still present for gh cwd).
    // Review and clean tickets land in their own "PR reviewed" column instead of the generic "done".
    let column: Column = "done";
    if (ticket.kind === "review" || ticket.kind === "clean") column = "reviewed";
    let mergeError: string | null = null;
    if (ticket.autoMerge && ticket.kind === "feature") {
      log.info("auto-merge de la PR", { ticketId, prUrl });
      const merge = await this.system.mergePr(path, ticket.branch, prUrl);
      if (merge.ok) {
        column = "merged";
        this.store.logEvent(ticketId, "auto_merged", { prUrl });
      } else {
        mergeError = merge.reason;
        column = "failed";
        this.store.logEvent(ticketId, "auto_merge_failed", { reason: merge.reason });
        log.warn("auto-merge échoué", { ticketId, reason: merge.reason });
        // Auto-merge failures (branch behind base / conflicts) are the top terminal-failure cause.
        // Instead of parking the card in "failed" for a manual resolve, spawn a rebase/resolution
        // session automatically (bounded by AUTO_MERGE_RESOLVE_MAX to break the resolve→fail loop).
        if (await this.tryAutoResolveMerge(ticket, slotId, prUrl, merge.reason)) {
          return { ok: true, reason: "" };
        }
      }
    }

    // Capture the agent's own work summary from the PR description (feature tickets that actually
    // landed in done/merged; a review/clean ticket's PR body is not the agent's work, and a
    // merge-failed ticket never surfaces it). Read before releasing the slot, while the worktree is
    // still present for gh's cwd.
    const agentSummary = ticket.kind === "feature" && !mergeError ? await this.system.fetchPrSummary(path, prUrl) : null;

    await this.releaseSlot(slotId, ticket);
    this.touch(
      this.store.updateTicket(ticketId, {
        column,
        stage: mergeError ? "failed" : "done",
        prUrl,
        slotId: null,
        // The run reached done(): any conflict-resolution session is over (cleared on both outcomes).
        resolvingConflicts: false,
        error: mergeError,
        agentSummary,
        finishedAt: Date.now(),
      }),
    );
    if (!mergeError) this.store.logEvent(ticketId, "done", { prUrl });
    await this.notifier.notify("Ticket terminé", this.doneNotifyBody(ticket, mergeError), ticket.id, true);
    // The PR is open and the branch pushed (gate passed): release any child stacked on this ticket.
    if (!mergeError) void this.startDependents(ticketId);
    this.pumpQueue();
    return { ok: true, reason: "" };
  }

  /**
   * On an auto-merge failure, automatically spawn a rebase/conflict-resolution session instead of
   * leaving the card in "failed" for a manual trigger. Bounded by AUTO_MERGE_RESOLVE_MAX (counted
   * from AUTO_MERGE_RESOLVE_EVENT) so a resolution session that itself reaches a failing merge can't
   * loop forever — past the budget the caller falls through to the normal failed landing.
   *
   * Returns true once it has taken over the card (slot released, resolution session launched); the
   * caller must then stop and NOT mark the ticket failed. Returns false to defer to the failed path —
   * either the budget is spent, or no slot could be claimed for the resolution session.
   */
  private async tryAutoResolveMerge(ticket: Ticket, slotId: number, prUrl: string, reason: string): Promise<boolean> {
    if (this.store.getAutoMergeResolveCount(ticket.id) >= AUTO_MERGE_RESOLVE_MAX) return false;
    // resolveMergeConflicts reads branch + prUrl from the store and grabs a free slot, so persist the
    // PR URL and free the current slot first (the just-freed slot is the one it reuses, when nothing
    // else stole it during releaseSlot's async cleanup).
    this.store.updateTicket(ticket.id, { prUrl });
    await this.releaseSlot(slotId, ticket);
    const launched = await this.resolveMergeConflicts(ticket.id);
    if (!launched) {
      // No slot was available for the resolution session: defer to the caller's failed landing. The
      // budget event is NOT logged, so a later retry (manual or once a slot frees) still has its turn.
      // pumpQueue is the caller's responsibility on the failed path.
      return false;
    }
    this.store.logEvent(ticket.id, AUTO_MERGE_RESOLVE_EVENT, { reason });
    log.info("auto-merge échoué — résolution de conflits automatique lancée", { ticketId: ticket.id, reason });
    await this.notifier.notify("Auto-merge en conflit", `${ticket.title} → rebase automatique en cours`, ticket.id);
    // The resolution session already holds its slot (claimed synchronously inside resolveMergeConflicts);
    // the caller skips its own pumpQueue on this early-return path, so wake any other queued ticket here.
    this.pumpQueue();
    return true;
  }

  /**
   * Close an ask ticket once the agent submitted its answer: no gate to verify (the answer is
   * already persisted as a comment by the coordinator), so just release the slot and land the card
   * in the "Répondu" column.
   */
  async completeAsk(ticketId: string, slotId: number): Promise<void> {
    const ticket = this.store.getTicket(ticketId);
    if (!ticket) return;
    // Ownership guard (the ask path has no done()-style gate): a stale/double submit_answer carries
    // the slotId baked at the worker hello. If that slot was already freed and handed to another
    // ticket by pumpQueue, releasing it here would tear down the victim's worktree — so only release
    // a slot we still own. This also makes the close idempotent (a second call finds slot.ticketId null).
    const slot = this.store.getSlot(slotId);
    if (slot?.ticketId !== ticketId) return;
    await this.releaseSlot(slotId, ticket);
    this.touch(
      this.store.updateTicket(ticketId, {
        column: "answered",
        stage: "done",
        slotId: null,
        finishedAt: Date.now(),
      }),
    );
    this.store.logEvent(ticketId, "answered", {});
    log.info("question répondue, slot libéré", { ticketId, slotId });
    await this.notifier.notify("Question répondue", ticket.title, ticket.id);
    this.pumpQueue();
  }

  /** Notification line summarizing how the PR ended (reviewed / cleaned / draft / open / merged / merge failed). */
  private doneNotifyBody(ticket: Ticket, mergeError: string | null): string {
    // Review and clean tickets never open a new PR — they act on an existing one.
    if (ticket.kind === "review") return `${ticket.title} → revue terminée`;
    if (ticket.kind === "clean") return `${ticket.title} → retours traités`;
    if (ticket.autoMerge) {
      return mergeError
        ? `${ticket.title} → PR ouverte mais auto-merge échoué`
        : `${ticket.title} → PR mergée automatiquement`;
    }
    return `${ticket.title} → PR ${ticket.prDraft ? "draft " : ""}ouverte`;
  }

  /** Cleanup tmux + worktree + local branch. Called on done and on abandon. */
  async releaseSlot(slotId: number, ticket: Ticket): Promise<void> {
    this.clearPhase(ticket.id);
    const slot = this.store.getSlot(slotId);
    if (slot?.tmuxSession) await this.system.killSession(slot.tmuxSession);
    if (!isProjectKey(ticket.project)) return;
    const project = getProject(ticket.project);
    // A test session may have spun up project infrastructure (e.g. docker compose) in the worktree.
    // Tear it down before the worktree is removed; best-effort (never throws) so removal proceeds.
    if (ticket.testing) {
      await this.system.runWorktreeTeardownScript({
        repoPath: project.repoPath,
        slotPath: slotPath(slotId),
        branch: ticket.branch ?? "",
        baseBranch: ticket.baseBranch ?? project.baseBranch,
        script: project.worktreeTeardownScript ?? null,
        timeoutMs: project.commitTimeoutMs,
      });
    }
    await this.repoMutex.run(project.repoPath, async () => {
      await this.system.worktreeRemove(project.repoPath, slotPath(slotId));
      if (ticket.branch) await this.system.deleteLocalBranch(project.repoPath, ticket.branch);
    });
    this.store.updateSlot(slotId, { ticketId: null, repoPath: null, tmuxSession: null, status: "free" });
    this.hub.pushSlots(this.store.listSlots());
  }

  async abandonTicket(ticketId: string): Promise<void> {
    const ticket = this.store.getTicket(ticketId);
    if (!ticket) return;
    if (ticket.slotId !== null) {
      await this.releaseSlot(ticket.slotId, ticket);
    }
    this.touch(
      this.store.updateTicket(ticketId, {
        column: "abandoned",
        stage: null,
        slotId: null,
        resolvingConflicts: false,
        finishedAt: Date.now(),
      }),
    );
    this.store.logEvent(ticketId, "abandoned", {});
    log.info("ticket abandonné", { ticketId });
    this.pumpQueue();
  }

  private markFailed(ticketId: string, slotId: number, reason: string): void {
    this.clearPhase(ticketId);
    this.lifecycle.markLaunchFailed(ticketId, slotId, reason);
    log.error("ticket en échec", { ticketId, slotId, reason });
  }

  private touch(ticket: Ticket): void {
    this.hub.pushTicket(ticket);
  }

  /**
   * Kill every live tmux session backing an occupied slot. Called on desktop app shutdown so the
   * detached tmux server (and the `claude` processes it holds) do not leak past the window close.
   */
  async teardownSessions(): Promise<void> {
    for (const slot of this.store.listSlots()) {
      if (slot.tmuxSession) await this.system.killSession(slot.tmuxSession);
    }
  }

  // ---- Recovery on boot ----

  async recover(): Promise<void> {
    for (const slot of this.store.listSlots()) {
      if (!slot.ticketId || !slot.tmuxSession) continue;
      const alive = await this.system.hasSession(slot.tmuxSession);
      if (alive) continue;
      const ticketId = slot.ticketId;

      // A test session is ephemeral: a backend restart ends it cleanly rather than resurrecting it.
      const recovered = this.store.getTicket(ticketId);
      if (recovered?.testing) {
        await this.releaseSlot(slot.id, recovered);
        this.touch(this.store.updateTicket(ticketId, { testing: false, slotId: null }));
        this.store.logEvent(ticketId, "test_session_stopped", { reason: "backend restart" });
        log.info("session de test terminée à la reprise", { ticketId, slotId: slot.id });
        continue;
      }

      // Under the cap, relaunch in place (keeps the worktree); otherwise leave interrupted + notify.
      if ((await this.tryAutoReclaim(ticketId, "session tmux disparue")) !== "escalate") continue;

      const ticket = this.store.getTicket(ticketId);
      if (ticket) {
        this.touch(
          this.store.updateTicket(ticket.id, {
            stage: "interrupted",
            error: "session tmux disparue",
            finishedAt: Date.now(),
          }),
        );
      }
      this.store.updateSlot(slot.id, { status: "interrupted" });
      this.store.logEvent(ticketId, "interrupted", {});
      log.warn("session tmux disparue à la reprise", { ticketId, slotId: slot.id });
      void this.notifier.notify("Ticket interrompu", `${ticket?.title ?? ticketId}: session tmux disparue`, ticketId);
    }
    this.hub.pushSlots(this.store.listSlots());
  }

  /** Re-spawn an interrupted ticket in its slot (retry endpoint). */
  async retry(ticketId: string): Promise<void> {
    const ticket = this.store.getTicket(ticketId);
    if (!ticket) return;
    if (ticket.slotId !== null) {
      const slot = this.store.getSlot(ticket.slotId);
      if (slot && (slot.status === "interrupted" || slot.status === "failed" || slot.status === "stalled")) {
        await this.relaunchInPlace(ticket.slotId, ticketId);
        return;
      }
    }
    await this.startTicket(ticketId);
  }

  /** True while a (re)launch is mid-setup, when a concurrent spawn would race the in-flight one. */
  private isLaunching(ticketId: string): boolean {
    const phase = this.setupPhase.get(ticketId);
    return (
      phase === SETUP_PHASES.worktree ||
      phase === SETUP_PHASES.setup ||
      phase === SETUP_PHASES.deps ||
      phase === SETUP_PHASES.spawning
    );
  }

  /**
   * Force a full re-spawn in the ticket's current slot, regardless of slot status.
   * UI escape hatch for a stuck "implementing" card whose session started but never
   * received the contract; falls back to a fresh launch if no slot is held.
   * No-ops (returns false) while a launch is still in setup, to avoid a double spawn.
   */
  async relaunch(ticketId: string): Promise<boolean> {
    const ticket = this.store.getTicket(ticketId);
    if (!ticket) return false;
    if (this.isLaunching(ticketId)) {
      log.warn("relance ignorée : lancement déjà en cours", { ticketId });
      return false;
    }
    if (ticket.slotId !== null) {
      await this.relaunchInPlace(ticket.slotId, ticketId);
      return true;
    }
    await this.startTicket(ticketId);
    return true;
  }

  /**
   * Auto-reclaim a dead/stalled turn: relaunch in the held slot (preserves the worktree — never
   * falls back to a fresh worktree, so uncommitted work is safe), bounded by AUTO_RECLAIM_MAX.
   *
   * The cap check, the launch claim (setPhase) and the AUTO_RECLAIM_EVENT log all run
   * synchronously before the first await. `onStop` is fire-and-forget and can be re-entered by a
   * concurrent stop frame (WS stop + HTTP stop-hook); claiming synchronously makes that second
   * entrant observe both `isLaunching` and the incremented count, so the cap can't be exceeded and
   * the session can't be double-spawned.
   */
  async tryAutoReclaim(ticketId: string, reason: string): Promise<ReclaimOutcome> {
    const ticket = this.store.getTicket(ticketId);
    if (!ticket || ticket.slotId === null) return "ignore";
    // A test session is ephemeral and lives on a "done" card: never resurrect it as a pipeline run.
    if (ticket.testing) return "ignore";
    if (this.isLaunching(ticketId)) {
      log.warn("auto-reclaim ignoré : lancement déjà en cours", { ticketId });
      return "ignore";
    }
    const reclaims = this.store.getReclaimCount(ticketId);
    if (reclaims >= AUTO_RECLAIM_MAX) return "escalate";

    this.setPhase(ticketId, SETUP_PHASES.spawning);
    this.store.logEvent(ticketId, AUTO_RECLAIM_EVENT, { attempt: reclaims + 1, reason });
    log.warn("auto-reclaim", { ticketId, slotId: ticket.slotId, attempt: reclaims + 1, reason });
    try {
      await this.relaunchInPlace(ticket.slotId, ticketId);
    } catch (error) {
      this.clearPhase(ticketId);
      log.error("auto-reclaim échoué", { ticketId, error: getErrorMessage(error) });
      return "escalate";
    }
    return "reclaimed";
  }

  private async relaunchInPlace(slotId: number, ticketId: string): Promise<void> {
    const ticket = this.store.getTicket(ticketId);
    if (!ticket || !isProjectKey(ticket.project)) return;
    // A test session must never be relaunched with a pipeline contract; the user stops it manually.
    if (ticket.testing) return;
    const sessionName = `ticket-${ticketId}`;
    const path = slotPath(slotId);
    log.info("relance en place", { ticketId, slotId });

    // Drop any live/stale session so the re-spawn below can claim the tmux name,
    // and evict its worker socket now so the contract re-delivers to the fresh one.
    await this.system.killSession(sessionName);
    this.workerHub.disconnect(ticketId);
    await this.depositSlotFiles(path, ticket, slotId);
    this.setPhase(ticketId, SETUP_PHASES.spawning);
    await this.system.spawnSession({
      sessionName,
      cwd: path,
      model: ticket.model ?? MODELS.implement,
      effort: ticket.effort ?? MODELS.implementEffort,
      env: {
        TICKET_ID: ticketId,
        SLOT_ID: String(slotId),
        BACKEND_WS: this.config.backendWs,
        DISABLE_AUTOUPDATER: "1",
      },
    });
    this.setPhase(ticketId, SETUP_PHASES.waiting);
    this.store.updateSlot(slotId, { status: "busy", tmuxSession: sessionName });
    // Re-arm contract delivery: deliverContractIfPending keys off the latest
    // session_spawned marker, so re-logging it makes the contract re-send to the
    // fresh session (the whole point of a relaunch).
    this.store.logEvent(ticketId, "session_spawned", { slotId, sessionName });
    this.touch(
      this.store.updateTicket(ticketId, {
        column: "implementing",
        stage: "implementing",
        error: null,
        finishedAt: null,
        lastProgressAt: Date.now(),
      }),
    );
    this.hub.pushSlots(this.store.listSlots());
    void this.deliverContractWhenReady(ticketId);
  }
}
