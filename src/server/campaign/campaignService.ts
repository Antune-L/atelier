import { z } from "zod";

import {
  CAMPAIGN_STATUSES,
  TERMINAL_CAMPAIGN_STATUSES,
  campaignApprovalBlockers,
  campaignMotherBranch,
  campaignPlanSchema,
  campaignReadinessSchema,
  campaignSkillFingerprintSchema,
  changedCampaignCards,
  validateCampaignPlan,
} from "../../shared/campaign.ts";
import type {
  Campaign,
  CampaignCard,
  CampaignEvent,
  CampaignPlan,
  CampaignPlanIssue,
  CampaignReadiness,
  CampaignSkillFingerprint,
  CampaignVersion,
} from "../../shared/campaign.ts";
import type { CampaignStore } from "../db/campaignStore.ts";
import { TicketOperationError } from "../ticketOperations.ts";

import { fetchSkillzerSkill, installSkillFiles, readCampaignSkills, SKILLZER_PINNED_COMMIT, skillFileSchema, skillInstallOutcomeSchema } from "./campaignSkills.ts";
import type { CampaignSkillRoots, SkillFile, SkillInstallOutcome } from "./campaignSkills.ts";
import { checkCampaignReadiness } from "./readiness.ts";
import type { CampaignReadinessDeps } from "./readiness.ts";

export const CAMPAIGN_EVENT = {
  versionSubmitted: "version_submitted",
  readinessChecked: "readiness_checked",
  approved: "approved",
  skillInstalled: "skill_installed",
  cardsSuspended: "cards_suspended",
} as const;

const requestIdSchema = z.string().trim().min(1).max(200);

export const submitCampaignPlanInputSchema = z.object({
  requestId: requestIdSchema,
  campaignId: z.string().trim().min(1).optional(),
  baseVersion: z.number().int().nonnegative().optional(),
  plan: z.unknown(),
});
export type SubmitCampaignPlanInput = z.infer<typeof submitCampaignPlanInputSchema>;

export const approveCampaignInputSchema = z.object({
  requestId: requestIdSchema,
  campaignId: z.string().trim().min(1),
  version: z.number().int().positive(),
});

export const checkCampaignReadinessInputSchema = z.object({
  campaignId: z.string().trim().min(1),
  version: z.number().int().positive().optional(),
});

export const installCampaignSkillInputSchema = z.object({
  requestId: requestIdSchema,
  campaignId: z.string().trim().min(1),
  skill: z.string().trim().min(1),
  source: z.discriminatedUnion("type", [
    z.object({ type: z.literal("paired_machine"), files: z.array(skillFileSchema).min(1) }),
    z.object({ type: z.literal("skillzer"), commit: z.string().trim().min(7).default(SKILLZER_PINNED_COMMIT) }),
  ]),
  replaceSha256: z.string().regex(/^[a-f0-9]{64}$/).optional(),
});

export const getCampaignInputSchema = z.object({
  campaignId: z.string().trim().min(1),
  cursor: z.number().int().nonnegative().optional(),
});

export interface CampaignServiceDeps {
  store: CampaignStore;
  readiness: CampaignReadinessDeps;
  skillRoots: CampaignSkillRoots;
  projectExists(key: string): boolean;
  projectBaseBranch(key: string): string;
  fetchSkillzer?(name: string, commit: string): Promise<SkillFile[] | null>;
  /** Wakes the campaign engine after a state change it should act on. */
  onChange?(campaignId: string): void;
  now?(): number;
}

export interface CampaignSnapshot {
  campaign: Campaign;
  plan: CampaignPlan;
  versions: { version: number; reason: string; createdAt: number; skills: CampaignSkillFingerprint[] | null }[];
  approvalBlockers: CampaignPlanIssue[];
  cards: CampaignCard[];
  events: CampaignEvent[];
  cursor: number;
}

function invalid(issues: readonly CampaignPlanIssue[]): TicketOperationError {
  return new TicketOperationError("INVALID_INPUT", issues.map((issue) => `${issue.code}${issue.path ? ` (${issue.path})` : ""}: ${issue.message}`).join(" | "));
}

function staleVersion(requested: number, current: number): TicketOperationError {
  return new TicketOperationError("CONFLICT", `stale version ${requested}; current version is ${current}.`);
}

function assertNotTerminal(campaign: Campaign): void {
  if (TERMINAL_CAMPAIGN_STATUSES.includes(campaign.status)) throw new TicketOperationError("CONFLICT", `campaign ${campaign.id} is ${campaign.status}.`);
}

/** Plan intake, readiness, approval and reads; execution belongs to the campaign engine. */
export class CampaignService {
  private readonly inflight = new Map<string, Promise<unknown>>();

  constructor(private readonly deps: CampaignServiceDeps) {}

  private now(): number {
    return this.deps.now?.() ?? Date.now();
  }

  private get store(): CampaignStore {
    return this.deps.store;
  }

  /** Replaying a command with the same request id returns the first result without a new effect (FR13). */
  private async once<T>(requestId: string, command: string, schema: z.ZodType<T>, run: () => Promise<{ campaignId: string | null; result: T }>): Promise<T> {
    const stored = this.store.getCommand(requestId);
    if (stored) {
      if (stored.command !== command) throw new TicketOperationError("CONFLICT", `requestId ${requestId} was already used by ${stored.command}.`);
      return schema.parse(stored.result);
    }
    const pending = this.inflight.get(requestId);
    if (pending) return schema.parse(await pending);
    const promise = run().then(({ campaignId, result }) => {
      this.store.saveCommand(requestId, command, campaignId, result, this.now());
      return result;
    });
    this.inflight.set(requestId, promise);
    try {
      return await promise;
    } finally {
      this.inflight.delete(requestId);
    }
  }

  requireCampaign(id: string): Campaign {
    const campaign = this.store.get(id);
    if (!campaign) throw new TicketOperationError("NOT_FOUND", `campaign not found: ${id}`);
    return campaign;
  }

  private parsePlan(raw: unknown): CampaignPlan {
    const parsed = campaignPlanSchema.safeParse(raw);
    if (!parsed.success) {
      throw invalid(parsed.error.issues.map((issue) => ({ code: "invalid_plan", path: issue.path.join("."), message: issue.message })));
    }
    const plan = parsed.data;
    if (!this.deps.projectExists(plan.project)) throw invalid([{ code: "unknown_project", path: "project", message: `Unknown project ${plan.project}.` }]);
    const issues = validateCampaignPlan(plan, this.deps.projectBaseBranch(plan.project));
    if (issues.length > 0) throw invalid(issues);
    return plan;
  }

  async submitPlan(input: SubmitCampaignPlanInput): Promise<{ campaignId: string; version: number; approvalBlockers: CampaignPlanIssue[] }> {
    const resultSchema = z.object({ campaignId: z.string(), version: z.number(), approvalBlockers: z.array(z.object({ code: z.string(), message: z.string(), path: z.string().optional() })) });
    return this.once(input.requestId, "submit_campaign_plan", resultSchema, () => {
      const plan = this.parsePlan(input.plan);
      const now = this.now();
      const created = this.store.runInTransaction(() => {
        if (input.campaignId === undefined) {
          const campaign = this.store.create(plan.project, plan.title, now);
          return { campaign, version: this.store.addVersion(campaign.id, plan, plan.versionReason || "initial plan", now), previous: null };
        }
        const campaign = this.requireCampaign(input.campaignId);
        assertNotTerminal(campaign);
        if (input.baseVersion !== undefined && input.baseVersion !== campaign.currentVersion) throw staleVersion(input.baseVersion, campaign.currentVersion);
        if (plan.project !== campaign.project) throw new TicketOperationError("INVALID_INPUT", "A campaign cannot change project.");
        const previous = this.store.requireVersion(campaign.id, campaign.currentVersion).plan;
        return { campaign, version: this.store.addVersion(campaign.id, plan, plan.versionReason || `version ${campaign.currentVersion + 1}`, now), previous };
      });
      const { campaign, version, previous } = created;
      this.store.appendEvent(campaign.id, CAMPAIGN_EVENT.versionSubmitted, { version: version.version, reason: version.reason }, now);
      if (previous !== null && campaign.approvedVersion !== null) this.suspendChangedCards(campaign, previous, plan, version.version, now);
      return Promise.resolve({ campaignId: campaign.id, result: { campaignId: campaign.id, version: version.version, approvalBlockers: campaignApprovalBlockers(plan) } });
    });
  }

  /** A plan changed after approval suspends touched cards and their descendants until the new version is approved (FR1). */
  private suspendChangedCards(campaign: Campaign, previous: CampaignPlan, next: CampaignPlan, version: number, now: number): void {
    const touched = changedCampaignCards(previous, next);
    const suspended: string[] = [];
    for (const card of this.store.listCards(campaign.id)) {
      if (!touched.has(card.cardId) || card.state === "merged") continue;
      this.store.updateCard(campaign.id, card.cardId, { state: "suspended", blockedReason: `Plan changed in version ${version}; awaiting approval.` }, now);
      suspended.push(card.cardId);
    }
    const runtime = campaign.runtime;
    const finalization = touched.has("__global__") && runtime.finalization
      ? { ...runtime.finalization, criteria: runtime.finalization.criteria.map((criterion) => ({ ...criterion, status: "missing" as const, evidence: null, revision: null })) }
      : runtime.finalization;
    this.store.update(campaign.id, { runtime: { ...runtime, finalization, statusReason: `Version ${version} awaits approval.` } }, now);
    this.store.appendEvent(campaign.id, CAMPAIGN_EVENT.cardsSuspended, { version, cards: suspended, globalCriteriaInvalidated: touched.has("__global__") }, now);
    this.deps.onChange?.(campaign.id);
  }

  private motherBranch(campaign: Campaign, plan: CampaignPlan): string {
    return campaign.motherBranch ?? campaignMotherBranch(campaign.id, plan.title, plan.motherBranch);
  }

  async checkReadiness(input: z.infer<typeof checkCampaignReadinessInputSchema>, approvedBaseRevision: string | null = null): Promise<CampaignReadiness> {
    const campaign = this.requireCampaign(input.campaignId);
    const version = this.store.requireVersion(campaign.id, input.version ?? campaign.currentVersion);
    const readiness = await checkCampaignReadiness({
      campaignId: campaign.id,
      version: version.version,
      plan: version.plan,
      motherBranch: this.motherBranch(campaign, version.plan),
      approvedBaseRevision,
    }, this.deps.readiness);
    const fresh = this.requireCampaign(campaign.id);
    this.store.update(campaign.id, { runtime: { ...fresh.runtime, readiness } }, this.now());
    this.store.appendEvent(campaign.id, CAMPAIGN_EVENT.readinessChecked, { version: version.version, ready: readiness.ready, blocked: readiness.items.filter((entry) => entry.status === "blocked").map((entry) => entry.id) }, this.now());
    return readiness;
  }

  /** Readiness re-run when an approved campaign starts after waiting, including drift of the base branch since approval (FR2). */
  async readyToStart(campaign: Campaign): Promise<{ ready: boolean; reason: string | null }> {
    if (campaign.approvedVersion === null) return { ready: false, reason: "The campaign has no approved version." };
    const readiness = await this.checkReadiness({ campaignId: campaign.id, version: campaign.approvedVersion }, campaign.runtime.approvedBaseRevision);
    const blocked = readiness.items.filter((entry) => entry.status === "blocked");
    return { ready: readiness.ready, reason: blocked.length === 0 ? null : blocked.map((entry) => `${entry.id}: ${entry.cause ?? "blocked"}`).join(" | ") };
  }

  async installSkill(input: z.infer<typeof installCampaignSkillInputSchema>): Promise<{ outcome: SkillInstallOutcome; readiness: CampaignReadiness | null }> {
    const outcomeSchema = z.object({ outcome: skillInstallOutcomeSchema, readiness: campaignReadinessSchema.nullable() });
    return this.once(input.requestId, "install_campaign_skill", outcomeSchema, async () => {
      const campaign = this.requireCampaign(input.campaignId);
      let files: readonly SkillFile[] | null;
      if (input.source.type === "paired_machine") files = input.source.files;
      else files = await (this.deps.fetchSkillzer ?? fetchSkillzerSkill)(input.skill, input.source.commit);
      const outcome: SkillInstallOutcome = files === null
        ? { status: "unavailable", name: input.skill, reason: `${input.skill} does not exist in skillzer at ${input.source.type === "skillzer" ? input.source.commit : ""}.` }
        : installSkillFiles({ name: input.skill, files, replaceSha256: input.replaceSha256 }, this.deps.skillRoots);
      this.store.appendEvent(campaign.id, CAMPAIGN_EVENT.skillInstalled, { skill: input.skill, source: input.source.type, status: outcome.status }, this.now());
      const readiness = outcome.status === "installed" || outcome.status === "unchanged" ? await this.checkReadiness({ campaignId: campaign.id }) : null;
      return { campaignId: campaign.id, result: { outcome, readiness } };
    });
  }

  /** Freeze one version and make the campaign executable exactly once (FR1, FR13, FR14). */
  async approve(input: z.infer<typeof approveCampaignInputSchema>): Promise<{ campaignId: string; version: number; status: Campaign["status"]; skills: CampaignSkillFingerprint[] }> {
    const resultSchema = z.object({ campaignId: z.string(), version: z.number(), status: z.enum(CAMPAIGN_STATUSES), skills: z.array(campaignSkillFingerprintSchema) });
    return this.once(input.requestId, "approve_campaign", resultSchema, async () => {
      const campaign = this.requireCampaign(input.campaignId);
      if (input.version !== campaign.currentVersion) throw staleVersion(input.version, campaign.currentVersion);
      if (campaign.approvedVersion === input.version) {
        const skills = this.store.requireVersion(campaign.id, input.version).skills ?? [];
        return { campaignId: campaign.id, result: { campaignId: campaign.id, version: input.version, status: campaign.status, skills } };
      }
      assertNotTerminal(campaign);
      const version = this.store.requireVersion(campaign.id, input.version);
      const blockers = campaignApprovalBlockers(version.plan);
      if (blockers.length > 0) throw invalid(blockers);
      const readiness = await this.checkReadiness({ campaignId: campaign.id, version: input.version });
      if (!readiness.ready) {
        const blocked = readiness.items.filter((entry) => entry.status === "blocked");
        throw new TicketOperationError("CONFLICT", `campaign is not ready: ${blocked.map((entry) => `${entry.id}: ${entry.cause ?? "blocked"}`).join(" | ")}`);
      }
      const skills = readCampaignSkills(this.deps.skillRoots);
      const now = this.now();
      const approved = this.store.runInTransaction(() => {
        const current = this.requireCampaign(campaign.id);
        if (current.currentVersion !== input.version) throw staleVersion(input.version, current.currentVersion);
        this.store.setVersionSkills(campaign.id, input.version, skills);
        const baseRevision = readiness.items.find((entry) => entry.id === "base_drift")?.detail.revision;
        const firstApproval = current.approvedVersion === null;
        const status = firstApproval ? "queued" : current.status;
        const resumed = this.resumeSuspendedCards(current, version, now);
        const updated = this.store.update(campaign.id, {
          status,
          approvedVersion: input.version,
          approvedAt: now,
          motherBranch: this.motherBranch(current, version.plan),
          baseBranch: this.deps.projectBaseBranch(version.plan.project),
          runtime: {
            ...current.runtime,
            readiness,
            statusReason: null,
            approvedBaseRevision: firstApproval && typeof baseRevision === "string" ? baseRevision : current.runtime.approvedBaseRevision,
          },
        }, now);
        this.store.appendEvent(campaign.id, CAMPAIGN_EVENT.approved, { version: input.version, skills, resumedCards: resumed }, now);
        return updated;
      });
      this.deps.onChange?.(campaign.id);
      return { campaignId: campaign.id, result: { campaignId: campaign.id, version: input.version, status: approved.status, skills } };
    });
  }

  private resumeSuspendedCards(campaign: Campaign, version: CampaignVersion, now: number): string[] {
    const resumed: string[] = [];
    for (const card of this.store.listCards(campaign.id)) {
      if (card.state !== "suspended") continue;
      const removed = !version.plan.cards.some((entry) => entry.id === card.cardId);
      this.store.updateCard(campaign.id, card.cardId, { state: removed ? "stopped" : "pending", blockedReason: removed ? `Removed from the plan in version ${version.version}.` : null, planVersion: version.version }, now);
      resumed.push(card.cardId);
    }
    return resumed;
  }

  get(input: z.infer<typeof getCampaignInputSchema>): CampaignSnapshot {
    const campaign = this.requireCampaign(input.campaignId);
    const versions = this.store.listVersions(campaign.id);
    const current = versions.find((version) => version.version === campaign.currentVersion);
    if (!current) throw new TicketOperationError("NOT_FOUND", `campaign ${campaign.id} has no plan version.`);
    const events = this.store.listEvents(campaign.id, input.cursor ?? 0);
    return {
      campaign,
      plan: current.plan,
      versions: versions.map((version) => ({ version: version.version, reason: version.reason, createdAt: version.createdAt, skills: version.skills })),
      approvalBlockers: campaignApprovalBlockers(current.plan),
      cards: this.store.listCards(campaign.id),
      events,
      cursor: events.at(-1)?.seq ?? input.cursor ?? 0,
    };
  }

  list(project?: string): Campaign[] {
    return this.store.list(project);
  }

  /** Another campaign is executing on the same project (one executing campaign per repository, FR5). */
  executingOn(project: string, excluding: string): Campaign | null {
    return this.store.listExecuting().find((campaign) => campaign.project === project && campaign.id !== excluding) ?? null;
  }
}
