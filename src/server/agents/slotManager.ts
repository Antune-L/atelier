import { join } from "node:path";

import type { Column } from "../../shared/constants.ts";
import type { Ticket } from "../../shared/schemas.ts";
import { MODELS, SLOTS_ROOT, getProject, isProjectKey } from "../config.ts";

import type { Store } from "../db/store.ts";
import type { ClientHub } from "../hub.ts";
import { createLogger } from "../logger.ts";
import { KeyedMutex } from "../mutex.ts";
import type { Notifier } from "../notifier.ts";
import type { SystemAdapter } from "../system/index.ts";
import type { WorkerHub } from "../workerHub.ts";

import { buildReviewContract, buildTicketContract } from "./contract.ts";
import {
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

const log = createLogger("slot");

/** Human-readable setup phases surfaced to the terminal view before the agent produces output. */
const SETUP_PHASES = {
  worktree: "Préparation du worktree…",
  deps: "Installation des dépendances…",
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

  private async launchInSlot(slotId: number, ticketId: string): Promise<void> {
    const ticket = this.store.getTicket(ticketId);
    if (!ticket) return;
    if (!isProjectKey(ticket.project)) {
      this.markFailed(ticketId, slotId, `Projet inconnu: ${ticket.project}`);
      return;
    }
    const project = getProject(ticket.project);
    const path = slotPath(slotId);
    const slug = slugify(ticket.title);
    const branch = `feat/${ticket.id}-${slug}`;
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
        await this.system.fetch(project.repoPath, project.baseBranch);
        await this.system.worktreeAdd({
          repoPath: project.repoPath,
          slotPath: path,
          branch,
          baseBranch: project.baseBranch,
        });
      });

      await this.depositSlotFiles(path, ticket.id, slotId);
      await this.system.copyEnvFiles(project.repoPath, path);
      this.setPhase(ticketId, SETUP_PHASES.deps);
      await this.system.installDeps(path, project.commitTimeoutMs);

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
      this.markFailed(ticketId, slotId, error instanceof Error ? error.message : String(error));
    }
  }

  private async depositSlotFiles(path: string, ticketId: string, slotId: number): Promise<void> {
    const templates = resolveTemplatePaths(this.config.projectRoot);
    const ctx: SlotTemplateContext = {
      ...templates,
      backendHttp: this.config.backendHttp,
      backendWs: this.config.backendWs,
      ticketId,
      slotId,
      bunPath: this.config.bunPath,
    };
    await this.system.prepareSlotFiles({
      slotPath: path,
      mcpJson: buildMcpJson(ctx),
      settingsJson: buildSettingsJson(ctx),
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
    return ticket.kind === "review"
      ? buildReviewContract(ticket)
      : buildTicketContract(ticket, {
          composerScriptPath: resolveTemplatePaths(this.config.projectRoot).composerScriptPath,
        });
  }

  private async deliverContractWhenReady(ticketId: string, attempt = 0): Promise<void> {
    if (this.deliverContractIfPending(ticketId)) {
      // Delivery over WS is fire-and-forget: the contract can be dropped if it lands before
      // Claude's conversation loop is ready. Gate on the agent's ack and re-push if it never comes.
      this.scheduleContractAckCheck(ticketId);
      return;
    }
    if (attempt >= CONTRACT_DELIVER_MAX_ATTEMPTS) return;
    setTimeout(() => void this.deliverContractWhenReady(ticketId, attempt + 1), CONTRACT_DELIVER_DELAY_MS);
  }

  private scheduleContractAckCheck(ticketId: string, attempt = 0): void {
    setTimeout(() => this.repushContractIfUnacked(ticketId, attempt), CONTRACT_ACK_CHECK_DELAY_MS);
  }

  /**
   * Re-push the contract when a review agent never acked it (no protocol tool call → dropped contract).
   * The ack lands well before the first check in the nominal case, so this fires only on a real drop;
   * the re-push then arrives once the session is ready. Bounded by CONTRACT_REPUSH_MAX_ATTEMPTS.
   *
   * Scoped to review tickets: their contract mandates update_stage("reviewing") as step 1, so a
   * missing ack within the window is a genuine drop. Feature tickets have no early-mandated protocol
   * call (a late first ack is normal work), so re-pushing them would re-inject the contract spuriously.
   */
  private repushContractIfUnacked(ticketId: string, attempt: number): void {
    if (this.store.lastEventType(ticketId, [CONTRACT_ACKED_EVENT]) !== null) return;
    if (!this.workerHub.isConnected(ticketId)) return;
    if (attempt >= CONTRACT_REPUSH_MAX_ATTEMPTS) return;
    const ticket = this.store.getTicket(ticketId);
    if (!ticket || ticket.kind !== "review") return;
    const sent = this.workerHub.sendEvent(ticketId, { type: "ticket", payload: this.buildContractPayload(ticket) });
    if (sent) {
      this.store.logEvent(ticketId, "contract_repushed", { attempt: attempt + 1 });
      log.warn("contrat re-poussé (ack absent)", { ticketId, attempt: attempt + 1 });
    }
    this.scheduleContractAckCheck(ticketId, attempt + 1);
  }

  /** Verify and release a slot on done(pr_url). */
  async finishTicket(ticketId: string, slotId: number, prUrl: string): Promise<{ ok: boolean; reason: string }> {
    const ticket = this.store.getTicket(ticketId);
    if (!ticket || !ticket.branch) return { ok: false, reason: "ticket ou branche introuvable" };
    const path = slotPath(slotId);

    log.info("vérification de la gate done", { ticketId, slotId, prUrl, kind: ticket.kind });
    const gate =
      ticket.kind === "review"
        ? await this.system.verifyReviewDone(path, prUrl, {
            requirePostedSince: ticket.postComments ? ticket.createdAt : null,
          })
        : await this.system.verifyDone(path, ticket.branch, prUrl);
    if (!gate.ok) {
      this.touch(this.store.updateTicket(ticketId, { stage: "stalled", error: gate.reason, finishedAt: Date.now() }));
      this.store.updateSlot(slotId, { status: "stalled" });
      this.hub.pushSlots(this.store.listSlots());
      log.warn("gate done échouée", { ticketId, reason: gate.reason });
      await this.notifier.notify("Gate done échouée", `${ticket.title}: ${gate.reason}`);
      return { ok: false, reason: gate.reason };
    }
    log.info("ticket terminé, slot libéré", { ticketId, slotId, prUrl });

    // Opt-in auto-merge: merge before releasing the slot (worktree still present for gh cwd).
    let column: Column = "done";
    let mergeError: string | null = null;
    if (ticket.autoMerge) {
      log.info("auto-merge de la PR", { ticketId, prUrl });
      const merge = await this.system.mergePr(path, ticket.branch, prUrl);
      if (merge.ok) {
        column = "merged";
        this.store.logEvent(ticketId, "auto_merged", { prUrl });
      } else {
        mergeError = merge.reason;
        this.store.logEvent(ticketId, "auto_merge_failed", { reason: merge.reason });
        log.warn("auto-merge échoué", { ticketId, reason: merge.reason });
      }
    }

    await this.releaseSlot(slotId, ticket);
    this.touch(
      this.store.updateTicket(ticketId, {
        column,
        stage: "done",
        prUrl,
        slotId: null,
        error: mergeError,
        finishedAt: Date.now(),
      }),
    );
    this.store.logEvent(ticketId, "done", { prUrl });
    await this.notifier.notify("Ticket terminé", this.doneNotifyBody(ticket, mergeError));
    this.pumpQueue();
    return { ok: true, reason: "" };
  }

  /** Notification line summarizing how the PR ended (draft / open / auto-merged / merge failed). */
  private doneNotifyBody(ticket: Ticket, mergeError: string | null): string {
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
      this.store.updateTicket(ticketId, { column: "abandoned", stage: null, slotId: null, finishedAt: Date.now() }),
    );
    this.store.logEvent(ticketId, "abandoned", {});
    log.info("ticket abandonné", { ticketId });
    this.pumpQueue();
  }

  private markFailed(ticketId: string, slotId: number, reason: string): void {
    this.clearPhase(ticketId);
    this.touch(
      this.store.updateTicket(ticketId, { column: "failed", stage: "failed", error: reason, finishedAt: Date.now() }),
    );
    this.store.updateSlot(slotId, { status: "failed" });
    this.hub.pushSlots(this.store.listSlots());
    this.store.logEvent(ticketId, "failed", { reason });
    log.error("ticket en échec", { ticketId, slotId, reason });
    void this.notifier.notify("Ticket en échec", `${reason}`);
  }

  private touch(ticket: Ticket): void {
    this.hub.pushTicket(ticket);
  }

  // ---- Recovery on boot ----

  async recover(): Promise<void> {
    for (const slot of this.store.listSlots()) {
      if (!slot.ticketId || !slot.tmuxSession) continue;
      const alive = await this.system.hasSession(slot.tmuxSession);
      if (alive) continue;
      const ticket = this.store.getTicket(slot.ticketId);
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
      this.store.logEvent(slot.ticketId, "interrupted", {});
      log.warn("session tmux disparue à la reprise", { ticketId: slot.ticketId, slotId: slot.id });
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

  private async relaunchInPlace(slotId: number, ticketId: string): Promise<void> {
    const ticket = this.store.getTicket(ticketId);
    if (!ticket || !isProjectKey(ticket.project)) return;
    const sessionName = `ticket-${ticketId}`;
    const path = slotPath(slotId);
    log.info("relance en place", { ticketId, slotId });

    await this.depositSlotFiles(path, ticketId, slotId);
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
