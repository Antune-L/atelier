import { TERMINAL_CAMPAIGN_STATUSES, campaignDescendants } from "../../shared/campaign.ts";
import type { Campaign, CampaignCard, CampaignCardPlan, CampaignPlan, CampaignRepair, CampaignRuntime } from "../../shared/campaign.ts";
import type { VcsProvider } from "../../shared/constants.ts";
import { getErrorMessage } from "../../shared/errors.ts";
import type { Ticket } from "../../shared/schemas.ts";
import type { Store } from "../db/store.ts";
import { createLogger } from "../logger.ts";
import type { DoneGateResult } from "../system/types.ts";
import type { PrSnapshot } from "../system/vcs/types.ts";

import { readCampaignSkills, readSkillInstructions } from "./campaignSkills.ts";
import type { CampaignSkillRoots } from "./campaignSkills.ts";
import { campaignCardDescription, campaignCardTicket, parseCampaignDecisions } from "./cardTicket.ts";
import { consumedTokens, defectFingerprint, isEnvironmentIncident } from "./policies.ts";

const log = createLogger("campaign");

const CAMPAIGN_TICK_MS = 15_000;
const MAX_ENVIRONMENT_RETRIES = 3;
const ACTIVE_CARD_STATES: readonly CampaignCard["state"][] = ["running", "merging"];
const SETTLED_CARD_STATES: readonly CampaignCard["state"][] = ["merged", "blocked", "stopped"];
const MERGE_CONFLICT_FINGERPRINT = "merge-conflict";
const INCIDENT_PREFIX = "incident:";
const CONFLICT_WAITING_SLOT = "Merge conflict: waiting for a free slot to resolve it.";

export const CAMPAIGN_ENGINE_EVENT = {
  started: "started",
  waiting: "waiting",
  motherBranchReady: "mother_branch_ready",
  cardCreated: "card_created",
  cardStarted: "card_started",
  cardMerged: "card_merged",
  cardBlocked: "card_blocked",
  cardRepaired: "card_repaired",
  incident: "incident",
  decision: "decision",
  budgetExhausted: "budget_exhausted",
  error: "engine_error",
} as const;

export interface CampaignProject {
  repoPath: string;
  vcsProvider: VcsProvider;
}

export interface CampaignSlots {
  startTicket(ticketId: string): Promise<void>;
  enqueue(ticketId: string): void;
  retry(ticketId: string): Promise<void>;
  markMerged(ticketId: string): Promise<Ticket>;
  interruptForCampaign(ticketId: string, reason: string): Promise<boolean>;
  resolveCampaignConflict(ticketId: string, reason: string): Promise<"launched" | "exhausted" | "no_slot">;
}

export interface CampaignVcs {
  createBranch(repoPath: string, branch: string, baseBranch: string): Promise<void>;
  branchExists(repoPath: string, branch: string): Promise<boolean>;
  readPr(repoPath: string, prUrl: string, provider: VcsProvider): Promise<PrSnapshot>;
  mergePr(repoPath: string, branch: string, prUrl: string, provider: VcsProvider): Promise<DoneGateResult>;
}

export interface CampaignEngineDeps {
  store: Store;
  slots: CampaignSlots;
  vcs: CampaignVcs;
  project(key: string): CampaignProject;
  skillRoots: CampaignSkillRoots;
  /** Re-runs the readiness check when an approved campaign is about to start (FR2). */
  readyToStart(campaign: Campaign): Promise<{ ready: boolean; reason: string | null }>;
  now?(): number;
  onChange?(campaignId: string): void;
}

function repairCount(card: CampaignCard, fingerprint: string): number {
  return card.repairs.find((repair) => repair.fingerprint === fingerprint)?.count ?? 0;
}

function withRepairCount(card: CampaignCard, fingerprint: string, count: number): CampaignRepair[] {
  return [...card.repairs.filter((repair) => repair.fingerprint !== fingerprint), { fingerprint, count }];
}

/**
 * Drives approved campaigns from durable state only: every decision is re-read from SQLite on each
 * tick, so a restart resumes without in-memory queues, and every remote effect is journaled first.
 */
export class CampaignEngine {
  private timer: ReturnType<typeof setInterval> | null = null;
  private chain: Promise<void> = Promise.resolve();
  private wakePending = false;

  constructor(private readonly deps: CampaignEngineDeps) {}

  private get store(): Store {
    return this.deps.store;
  }

  private now(): number {
    return this.deps.now?.() ?? Date.now();
  }

  start(intervalMs = CAMPAIGN_TICK_MS): void {
    if (this.timer !== null) return;
    this.timer = setInterval(() => this.wake(), intervalMs);
    this.timer.unref();
    this.wake();
  }

  async stop(): Promise<void> {
    if (this.timer !== null) clearInterval(this.timer);
    this.timer = null;
    await this.chain;
  }

  /** Schedule a pass; wakes received before it starts coalesce into it. */
  wake(): void {
    if (this.timer === null || this.wakePending) return;
    this.wakePending = true;
    void this.tick();
  }

  /** Passes run one at a time, so a merge or start is never emitted twice concurrently. */
  tick(): Promise<void> {
    this.chain = this.chain.then(async () => {
      this.wakePending = false;
      try {
        await this.pass();
      } catch (error) {
        log.error("campaign pass failed", { error: getErrorMessage(error) });
      }
    });
    return this.chain;
  }

  private async pass(): Promise<void> {
    for (const campaign of this.store.campaigns.listQueued()) await this.guard(campaign.id, () => this.promote(campaign));
    for (const campaign of this.store.campaigns.listExecuting()) await this.guard(campaign.id, () => this.advance(campaign.id));
  }

  private async guard(campaignId: string, run: () => Promise<void>): Promise<void> {
    try {
      await run();
    } catch (error) {
      const message = getErrorMessage(error);
      log.error("campaign tick failed", { campaignId, error: message });
      this.store.campaigns.appendEvent(campaignId, CAMPAIGN_ENGINE_EVENT.error, { message }, this.now());
    }
  }

  private event(campaignId: string, type: string, payload: Record<string, unknown> = {}): void {
    this.store.campaigns.appendEvent(campaignId, type, payload, this.now());
    this.deps.onChange?.(campaignId);
  }

  private approvedPlan(campaign: Campaign): CampaignPlan {
    if (campaign.approvedVersion === null) throw new Error(`campaign ${campaign.id} has no approved version`);
    return this.store.campaigns.requireVersion(campaign.id, campaign.approvedVersion).plan;
  }

  private updateRuntime(campaignId: string, patch: (runtime: CampaignRuntime) => CampaignRuntime): Campaign {
    const campaign = this.store.campaigns.require(campaignId);
    return this.store.campaigns.update(campaignId, { runtime: patch(campaign.runtime) }, this.now());
  }

  /** One executing campaign per repository; the next approved one waits (FR5) and is re-checked before starting (FR2). */
  private async promote(campaign: Campaign): Promise<void> {
    const busy = this.store.campaigns.listExecuting().some((other) => other.project === campaign.project && other.id !== campaign.id);
    if (busy) {
      this.noteWaiting(campaign, "Another campaign is running on this repository.");
      return;
    }
    const check = await this.deps.readyToStart(campaign);
    if (!check.ready) {
      this.noteWaiting(campaign, check.reason ?? "The campaign is not ready.");
      return;
    }
    const now = this.now();
    this.store.campaigns.update(campaign.id, { status: "running", runtime: { ...campaign.runtime, statusReason: null, startedAt: campaign.runtime.startedAt ?? now } }, now);
    this.event(campaign.id, CAMPAIGN_ENGINE_EVENT.started);
  }

  private noteWaiting(campaign: Campaign, reason: string): void {
    if (campaign.runtime.statusReason === reason) return;
    this.updateRuntime(campaign.id, (runtime) => ({ ...runtime, statusReason: reason }));
    this.event(campaign.id, CAMPAIGN_ENGINE_EVENT.waiting, { reason });
  }

  private async advance(campaignId: string): Promise<void> {
    const campaign = this.store.campaigns.require(campaignId);
    if (campaign.status !== "running") return;
    const plan = this.approvedPlan(campaign);
    const project = this.deps.project(campaign.project);
    const mother = await this.ensureMotherBranch(campaign, project);
    this.ensureCards(campaign, plan, mother);
    this.syncCards(campaign, plan);
    await this.repairCards(campaign);
    await this.mergeCards(campaign, project, mother);
    await this.enforceBudgets(campaign, plan);
    await this.startReadyCards(campaign, plan);
  }

  private async ensureMotherBranch(campaign: Campaign, project: CampaignProject): Promise<string> {
    const mother = campaign.motherBranch;
    const base = campaign.baseBranch;
    if (mother === null || base === null) throw new Error("The approved campaign has no mother or base branch.");
    const operationId = `mother:${campaign.id}`;
    const { operation } = this.store.campaigns.beginOperation(campaign.id, operationId, "create_mother_branch", { mother, base }, this.now());
    if (operation.status === "done") return mother;
    if (!(await this.deps.vcs.branchExists(project.repoPath, mother))) await this.deps.vcs.createBranch(project.repoPath, mother, base);
    this.store.campaigns.completeOperation(operationId, "done", { mother }, this.now());
    this.event(campaign.id, CAMPAIGN_ENGINE_EVENT.motherBranchReady, { mother });
    return mother;
  }

  private ensureCards(campaign: Campaign, plan: CampaignPlan, mother: string): void {
    const skills = readCampaignSkills(this.deps.skillRoots);
    const guidance = skills.map((fingerprint) => ({ name: fingerprint.name, fingerprint, instructions: readSkillInstructions(fingerprint.name, this.deps.skillRoots) }));
    for (const planCard of plan.cards) {
      const card = this.store.campaigns.upsertCard(campaign.id, planCard.id, campaign.approvedVersion ?? 1, this.now());
      if (card.ticketId !== null || card.state === "stopped") continue;
      const requestId = `campaign:${campaign.id}:card:${planCard.id}`;
      const input = campaignCardTicket(plan, planCard, mother, campaignCardDescription(plan, planCard, mother, guidance));
      const { ticket } = this.store.createTicketIdempotent(requestId, JSON.stringify({ campaign: campaign.id, card: planCard.id }), input, (created) => {
        this.store.campaigns.updateCard(campaign.id, planCard.id, { ticketId: created.id, state: "waiting_prerequisites" }, this.now());
      });
      this.event(campaign.id, CAMPAIGN_ENGINE_EVENT.cardCreated, { cardId: planCard.id, ticketId: ticket.id });
    }
  }

  private block(campaign: Campaign, plan: CampaignPlan, cardId: string, reason: string): void {
    const card = this.store.campaigns.requireCard(campaign.id, cardId);
    if (SETTLED_CARD_STATES.includes(card.state)) return;
    this.store.campaigns.updateCard(campaign.id, cardId, { state: "blocked", blockedReason: reason }, this.now());
    this.event(campaign.id, CAMPAIGN_ENGINE_EVENT.cardBlocked, { cardId, reason });
    this.blockDescendants(campaign, plan, cardId, "blocked");
  }

  private blockDescendants(campaign: Campaign, plan: CampaignPlan, cardId: string, state: "blocked" | "stopped"): void {
    const reason = `Prerequisite ${cardId} is ${state}.`;
    for (const descendant of campaignDescendants(plan.cards, [cardId])) {
      const child = this.store.campaigns.getCard(campaign.id, descendant);
      if (!child || SETTLED_CARD_STATES.includes(child.state) || child.state === "running") continue;
      this.store.campaigns.updateCard(campaign.id, descendant, { state: "blocked", blockedReason: reason }, this.now());
      this.event(campaign.id, CAMPAIGN_ENGINE_EVENT.cardBlocked, { cardId: descendant, reason });
    }
  }

  private syncCards(campaign: Campaign, plan: CampaignPlan): void {
    for (const card of this.store.campaigns.listCards(campaign.id)) {
      if (card.ticketId === null) continue;
      const ticket = this.store.getTicket(card.ticketId);
      if (!ticket) {
        this.block(campaign, plan, card.cardId, "The card ticket disappeared.");
        continue;
      }
      this.store.campaigns.updateCard(campaign.id, card.cardId, { tokensUsed: consumedTokens(ticket.sessionUsage) }, this.now());
      if (card.state === "merged" || card.state === "stopped" || card.state === "suspended") continue;
      if (ticket.column === "merged") {
        this.recordMerged(campaign, card, ticket, null);
        continue;
      }
      if (ticket.column === "abandoned") {
        this.store.campaigns.updateCard(campaign.id, card.cardId, { state: "stopped", blockedReason: "The card was abandoned." }, this.now());
        this.blockDescendants(campaign, plan, card.cardId, "stopped");
        continue;
      }
      if (card.state === "blocked") continue;
      const question = this.store.listComments(ticket.id).find((comment) => comment.author === "agent" && comment.questionId !== null && !comment.answered);
      if (question || ticket.stage === "awaiting_answers") {
        const text = question?.body ?? "The agent asked a question the plan does not settle.";
        this.updateRuntime(campaign.id, (runtime) => ({ ...runtime, pendingQuestions: [...runtime.pendingQuestions.filter((entry) => entry.cardId !== card.cardId), { cardId: card.cardId, question: text, cause: "The plan does not settle this question.", at: this.now() }] }));
        this.block(campaign, plan, card.cardId, "Question the plan does not settle; kept for the report.");
        continue;
      }
      if (ticket.column === "implementing" && card.state !== "merging") {
        this.store.campaigns.updateCard(campaign.id, card.cardId, { state: "running" }, this.now());
        continue;
      }
      if (ticket.column === "done" && card.state === "running") {
        this.block(campaign, plan, card.cardId, "The card landed without a recorded merge decision; its pull request stays open.");
      }
    }
  }

  private recordMerged(campaign: Campaign, card: CampaignCard, ticket: Ticket, mergeSha: string | null): void {
    this.store.campaigns.updateCard(campaign.id, card.cardId, { state: "merged", prUrl: ticket.prUrl, mergeSha, blockedReason: null }, this.now());
    const decisions = parseCampaignDecisions(ticket.agentSummary).map((entry) => ({ cardId: card.cardId, decision: entry.decision, rule: entry.rule, at: this.now() }));
    if (decisions.length > 0) {
      this.updateRuntime(campaign.id, (runtime) => ({ ...runtime, decisions: [...runtime.decisions.filter((entry) => entry.cardId !== card.cardId), ...decisions] }));
    }
    this.event(campaign.id, CAMPAIGN_ENGINE_EVENT.cardMerged, { cardId: card.cardId, prUrl: ticket.prUrl, decisions: decisions.length });
  }

  private async confirmMerge(campaign: Campaign, card: CampaignCard, ticket: Ticket, operationId: string, result: { mergeCommitSha: string | null; reconciled?: boolean }): Promise<void> {
    this.store.campaigns.completeOperation(operationId, "done", result, this.now());
    await this.deps.slots.markMerged(ticket.id);
    this.recordMerged(campaign, card, this.store.getTicket(ticket.id) ?? ticket, result.mergeCommitSha);
  }

  /** A failed or stalled card is retried for environment incidents; the same defect is repaired at most `maxSameDefectRepairs` times (FR5). */
  private async repairCards(campaign: Campaign): Promise<void> {
    const plan = this.approvedPlan(campaign);
    for (const card of this.store.campaigns.listCards(campaign.id)) {
      if (card.ticketId === null || card.state !== "running") continue;
      const ticket = this.store.getTicket(card.ticketId);
      if (!ticket) continue;
      const failed = ticket.column === "failed" || ticket.stage === "stalled" || (ticket.stage === "interrupted" && ticket.slotId !== null);
      if (!failed) continue;
      const reason = ticket.error ?? "The card session stopped.";
      const incident = isEnvironmentIncident(reason);
      const fingerprint = incident ? `${INCIDENT_PREFIX}${defectFingerprint(reason)}` : defectFingerprint(reason);
      const previous = repairCount(card, fingerprint);
      const limit = incident ? MAX_ENVIRONMENT_RETRIES : plan.budget.maxSameDefectRepairs;
      if (previous >= limit) {
        this.block(campaign, plan, card.cardId, incident ? `Environment incident persists: ${reason}` : `Same defect after ${previous} repairs: ${reason}`);
        continue;
      }
      this.store.campaigns.updateCard(campaign.id, card.cardId, { repairs: withRepairCount(card, fingerprint, previous + 1) }, this.now());
      this.event(campaign.id, incident ? CAMPAIGN_ENGINE_EVENT.incident : CAMPAIGN_ENGINE_EVENT.cardRepaired, { cardId: card.cardId, reason, attempt: previous + 1 });
      try {
        await this.deps.slots.retry(ticket.id);
      } catch (error) {
        this.block(campaign, plan, card.cardId, `Repair could not start: ${getErrorMessage(error)}`);
      }
    }
  }

  /** Card delivered by the ordinary pipeline; the campaign decides whether it may be merged (FR3). */
  recordDelivery(ticketId: string, delivery: { prUrl: string; mergeEligible: boolean }): void {
    const card = this.store.campaigns.getCardByTicket(ticketId);
    if (!card) return;
    const campaign = this.store.campaigns.require(card.campaignId);
    if (delivery.mergeEligible) {
      this.store.campaigns.updateCard(campaign.id, card.cardId, { state: "merging", prUrl: delivery.prUrl }, this.now());
    } else {
      this.store.campaigns.updateCard(campaign.id, card.cardId, { prUrl: delivery.prUrl }, this.now());
      this.block(campaign, this.approvedPlan(campaign), card.cardId, "Review or checks did not pass cleanly; the pull request stays open and unmerged.");
    }
    this.wake();
  }

  private async mergeCards(campaign: Campaign, project: CampaignProject, mother: string): Promise<void> {
    for (const card of this.store.campaigns.listCards(campaign.id)) {
      if (card.state !== "merging" || card.ticketId === null) continue;
      const current = this.store.campaigns.require(campaign.id);
      if (current.status !== "running") return;
      await this.mergeCard(current, card, project, mother);
    }
  }

  /** Journaled merge into the mother branch; never into the base branch (NFR1), never repeated blindly (FR10). */
  private async mergeCard(campaign: Campaign, card: CampaignCard, project: CampaignProject, mother: string): Promise<void> {
    const plan = this.approvedPlan(campaign);
    const ticket = card.ticketId === null ? null : this.store.getTicket(card.ticketId);
    if (!ticket || ticket.prUrl === null || ticket.branch === null) {
      this.block(campaign, plan, card.cardId, "The card has no pull request to merge.");
      return;
    }
    const attempt = repairCount(card, MERGE_CONFLICT_FINGERPRINT);
    if (card.blockedReason === CONFLICT_WAITING_SLOT) {
      await this.afterResolution(campaign, plan, card.cardId, await this.deps.slots.resolveCampaignConflict(ticket.id, CONFLICT_WAITING_SLOT), CONFLICT_WAITING_SLOT, attempt, mother);
      return;
    }
    const operationId = `merge:${campaign.id}:${card.cardId}:${attempt}`;
    const { operation } = this.store.campaigns.beginOperation(campaign.id, operationId, "merge_card", { cardId: card.cardId, prUrl: ticket.prUrl, target: mother }, this.now());
    if (operation.status === "failed") return;
    const snapshot = await this.deps.vcs.readPr(project.repoPath, ticket.prUrl, project.vcsProvider);
    if (snapshot.baseBranch !== mother) {
      this.store.campaigns.completeOperation(operationId, "failed", { reason: "target", baseBranch: snapshot.baseBranch }, this.now());
      this.block(campaign, plan, card.cardId, `The pull request targets ${snapshot.baseBranch ?? "an unknown branch"} instead of ${mother}; it is never merged.`);
      return;
    }
    if (snapshot.state === "merged") {
      await this.confirmMerge(campaign, card, ticket, operationId, { mergeCommitSha: snapshot.mergeCommitSha, reconciled: operation.status === "intent" });
      return;
    }
    if (snapshot.state === "closed") {
      this.store.campaigns.completeOperation(operationId, "failed", { reason: "closed" }, this.now());
      this.block(campaign, plan, card.cardId, "The pull request was closed without merge.");
      return;
    }
    const result = await this.deps.vcs.mergePr(project.repoPath, ticket.branch, ticket.prUrl, project.vcsProvider);
    if (result.ok) {
      const merged = await this.deps.vcs.readPr(project.repoPath, ticket.prUrl, project.vcsProvider);
      await this.confirmMerge(campaign, card, ticket, operationId, { mergeCommitSha: merged.mergeCommitSha });
      return;
    }
    if (result.pending) return;
    this.store.campaigns.completeOperation(operationId, "failed", { reason: result.reason }, this.now());
    this.store.campaigns.updateCard(campaign.id, card.cardId, { repairs: withRepairCount(card, MERGE_CONFLICT_FINGERPRINT, attempt + 1) }, this.now());
    const resolution = await this.deps.slots.resolveCampaignConflict(ticket.id, result.reason);
    await this.afterResolution(campaign, plan, card.cardId, resolution, result.reason, attempt + 1, mother);
  }

  private async afterResolution(campaign: Campaign, plan: CampaignPlan, cardId: string, resolution: "launched" | "exhausted" | "no_slot", reason: string, attempt: number, mother: string): Promise<void> {
    if (resolution === "launched") {
      this.store.campaigns.updateCard(campaign.id, cardId, { state: "running", blockedReason: null }, this.now());
      this.event(campaign.id, CAMPAIGN_ENGINE_EVENT.cardRepaired, { cardId, reason, attempt });
      return;
    }
    if (resolution === "no_slot") {
      this.store.campaigns.updateCard(campaign.id, cardId, { blockedReason: CONFLICT_WAITING_SLOT }, this.now());
      return;
    }
    this.block(campaign, plan, cardId, `Merge into ${mother} failed after the bounded conflict resolution: ${reason}`);
  }

  /** Sub-budget per card and the envelope minus the final reserve (FR5). */
  private async enforceBudgets(campaign: Campaign, plan: CampaignPlan): Promise<void> {
    for (const card of this.store.campaigns.listCards(campaign.id)) {
      const planCard = plan.cards.find((entry) => entry.id === card.cardId);
      if (!planCard || !ACTIVE_CARD_STATES.includes(card.state) || card.tokensUsed <= planCard.budgetTokens) continue;
      this.block(campaign, plan, card.cardId, `Sub-budget exhausted (${card.tokensUsed} / ${planCard.budgetTokens} tokens).`);
      if (card.ticketId === null) continue;
      try {
        await this.deps.slots.interruptForCampaign(card.ticketId, "Campaign card sub-budget exhausted.");
      } catch (error) {
        log.warn("campaign card interruption failed", { campaignId: campaign.id, cardId: card.cardId, error: getErrorMessage(error) });
      }
    }
  }

  private envelopeRemaining(campaign: Campaign, plan: CampaignPlan): number {
    const used = this.store.campaigns.listCards(campaign.id).reduce((sum, card) => sum + card.tokensUsed, 0);
    const extra = campaign.runtime.extensions.reduce((sum, extension) => sum + extension.additionalTokens, 0);
    return plan.budget.totalTokens + extra - plan.budget.finalReserveTokens - used;
  }

  private missingPrerequisites(campaign: Campaign, planCard: CampaignCardPlan): string[] {
    return planCard.dependsOn.filter((dependency) => this.store.campaigns.getCard(campaign.id, dependency)?.state !== "merged");
  }

  private async startReadyCards(campaign: Campaign, plan: CampaignPlan): Promise<void> {
    if (this.envelopeRemaining(campaign, plan) <= 0) {
      if (campaign.runtime.statusReason !== "budget_exhausted") {
        this.updateRuntime(campaign.id, (runtime) => ({ ...runtime, statusReason: "budget_exhausted" }));
        this.event(campaign.id, CAMPAIGN_ENGINE_EVENT.budgetExhausted);
      }
      return;
    }
    for (const planCard of plan.cards) {
      const current = this.store.campaigns.require(campaign.id);
      if (current.status !== "running") return;
      const card = this.store.campaigns.getCard(campaign.id, planCard.id);
      if (!card || card.ticketId === null || (card.state !== "pending" && card.state !== "waiting_prerequisites")) continue;
      if (this.missingPrerequisites(campaign, planCard).length > 0) {
        if (card.state !== "waiting_prerequisites") this.store.campaigns.updateCard(campaign.id, card.cardId, { state: "waiting_prerequisites" }, this.now());
        continue;
      }
      const ticket = this.store.getTicket(card.ticketId);
      if (!ticket || ticket.column !== "todo") continue;
      const operationId = `start:${campaign.id}:${card.cardId}:${card.planVersion}`;
      const { operation } = this.store.campaigns.beginOperation(campaign.id, operationId, "start_card", { cardId: card.cardId, ticketId: ticket.id }, this.now());
      if (operation.status === "done") continue;
      this.store.campaigns.updateCard(campaign.id, card.cardId, { state: "running" }, this.now());
      this.updateRuntime(campaign.id, (runtime) => ({ ...runtime, sessionsStarted: runtime.sessionsStarted + 1 }));
      try {
        this.deps.slots.enqueue(ticket.id);
        await this.deps.slots.startTicket(ticket.id);
        this.store.campaigns.completeOperation(operationId, "done", {}, this.now());
        this.event(campaign.id, CAMPAIGN_ENGINE_EVENT.cardStarted, { cardId: card.cardId, ticketId: ticket.id });
      } catch (error) {
        this.store.campaigns.completeOperation(operationId, "failed", { reason: getErrorMessage(error) }, this.now());
        this.block(campaign, plan, card.cardId, `Start refused: ${getErrorMessage(error)}`);
      }
    }
  }

  /** Card notifications are withheld while their campaign executes; the final report is the only one (FR11). */
  silences(ticketId: string): boolean {
    const card = this.store.campaigns.getCardByTicket(ticketId);
    const campaign = card === null ? this.store.campaigns.findByFinalTicket(ticketId) : this.store.campaigns.get(card.campaignId);
    return campaign !== null && !TERMINAL_CAMPAIGN_STATUSES.includes(campaign.status);
  }

  ownsMerge(ticketId: string): boolean {
    return this.store.campaigns.getCardByTicket(ticketId) !== null;
  }

  /** Refuses any start, even manual, of a campaign card whose prerequisites are not merged into the mother (FR3). */
  assertMayStart(ticket: Ticket): void {
    const card = this.store.campaigns.getCardByTicket(ticket.id);
    if (!card) return;
    const campaign = this.store.campaigns.require(card.campaignId);
    if (campaign.status !== "running") throw new Error(`Campaign card: the campaign is ${campaign.status}; cards start only while it runs.`);
    if (card.state === "blocked" || card.state === "suspended" || card.state === "stopped") throw new Error(`Campaign card ${card.cardId} is ${card.state}: ${card.blockedReason ?? ""}`.trim());
    const planCard = this.approvedPlan(campaign).cards.find((entry) => entry.id === card.cardId);
    if (!planCard) throw new Error(`Campaign card ${card.cardId} is not in the approved plan.`);
    const missing = this.missingPrerequisites(campaign, planCard);
    if (missing.length > 0) throw new Error(`Campaign card ${card.cardId} waits for prerequisites merged into ${campaign.motherBranch ?? "the mother branch"}: ${missing.join(", ")}.`);
  }
}
