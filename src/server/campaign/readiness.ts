import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { isAbsolute } from "node:path";

import { CAMPAIGN_REQUIRED_SKILLS, campaignReadinessSchema } from "../../shared/campaign.ts";
import type { CampaignPlan, CampaignReadiness, CampaignReadinessItem } from "../../shared/campaign.ts";
import type { PreviewReadiness } from "../../shared/preview.ts";
import type { ProviderQuota, QuotaProvider } from "../../shared/providerQuota.ts";

import { readCampaignSkills, SKILLZER_PINNED_COMMIT, skillzerListsSkill } from "./campaignSkills.ts";
import type { CampaignSkillRoots } from "./campaignSkills.ts";
import { quotaAvailability } from "./quotaAvailability.ts";
import type { CampaignRepositoryProbe } from "./repositoryProbe.ts";

export const DEFAULT_MAX_ACTIVE_PREVIEWS = 3;
const DEFAULT_PROVIDER: QuotaProvider = "claude";

export interface ReadinessProject {
  repoPath: string;
  baseBranch: string;
  vcsProvider: string;
}

export interface CampaignReadinessDeps {
  project(key: string): ReadinessProject | null;
  pilotEnabled(vcsProvider: string): boolean;
  previewReadiness(project: string, branch: string): Promise<PreviewReadiness>;
  /** Previews currently holding a broker slot, plus slots reserved by other approved campaigns. */
  occupiedPreviewSlots(excludingCampaignId: string): number;
  maxActivePreviews: number;
  quota(provider: QuotaProvider): Promise<ProviderQuota | null>;
  probe: CampaignRepositoryProbe;
  skillRoots: CampaignSkillRoots;
  host: "vps" | "mac";
  now(): number;
}

export interface ReadinessInput {
  campaignId: string;
  version: number;
  plan: CampaignPlan;
  motherBranch: string;
  /** main revision recorded at approval; drift is checked when an approved campaign starts (FR2). */
  approvedBaseRevision: string | null;
}

function item(id: CampaignReadinessItem["id"], status: CampaignReadinessItem["status"], cause: string | null, detail: Record<string, unknown> = {}, action: CampaignReadinessItem["action"] = null): CampaignReadinessItem {
  return { id, status, cause, detail, action };
}

function sha256File(path: string): string {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

function attachmentItem(plan: CampaignPlan): CampaignReadinessItem {
  const unreadable: string[] = [];
  const mismatched: string[] = [];
  for (const attachment of plan.attachments) {
    if (!isAbsolute(attachment.path) || !existsSync(attachment.path)) {
      unreadable.push(attachment.id);
      continue;
    }
    try {
      if (sha256File(attachment.path) !== attachment.sha256) mismatched.push(attachment.id);
    } catch {
      unreadable.push(attachment.id);
    }
  }
  if (unreadable.length > 0) return item("attachments", "blocked", `Attachments not readable on this machine: ${unreadable.join(", ")}.`, { unreadable, mismatched });
  if (mismatched.length > 0) return item("attachments", "blocked", `Attachments changed since they were frozen: ${mismatched.join(", ")}.`, { mismatched });
  return item("attachments", "ok", null, { count: plan.attachments.length });
}

async function quotaItem(plan: CampaignPlan, deps: CampaignReadinessDeps): Promise<CampaignReadinessItem> {
  const providers = [...new Set(plan.cards.map((card) => card.provider ?? DEFAULT_PROVIDER))];
  const detail: Record<string, unknown> = {};
  const unavailable: string[] = [];
  for (const provider of providers) {
    const availability = quotaAvailability(await deps.quota(provider), deps.now());
    detail[provider] = availability;
    if (!availability.available) unavailable.push(`${provider}: ${availability.reason}`);
  }
  return unavailable.length > 0 ? item("quota", "blocked", unavailable.join(" "), detail) : item("quota", "ok", null, detail);
}

function skillItems(deps: CampaignReadinessDeps): CampaignReadinessItem[] {
  const fingerprints = readCampaignSkills(deps.skillRoots);
  return CAMPAIGN_REQUIRED_SKILLS.map((name) => {
    const id = name === "simplifier" ? "skill:simplifier" : "skill:argus-review";
    const fingerprint = fingerprints.find((entry) => entry.name === name);
    if (fingerprint?.source === "installed") return item(id, "ok", null, { sha256: fingerprint.sha256, path: fingerprint.path });
    const action: CampaignReadinessItem["action"] = {
      type: "install_skill",
      skill: name,
      sources: [{ source: "paired_machine" }, { source: "skillzer", commit: SKILLZER_PINNED_COMMIT, available: skillzerListsSkill(name) }],
    };
    return item(id, "warning", `${name} is missing on this machine; internal guidance replaces it until it is installed.`, {}, action);
  });
}

/** "Campaign ready" check (FR2, FR14): every prerequisite with its cause; only `blocked` items prevent approval. */
export async function checkCampaignReadiness(input: ReadinessInput, deps: CampaignReadinessDeps): Promise<CampaignReadiness> {
  const { plan } = input;
  const project = deps.project(plan.project);
  const items: CampaignReadinessItem[] = [];
  if (project === null || project.vcsProvider !== "github") {
    items.push(item("repository", "blocked", project === null ? `Unknown project ${plan.project}.` : "Campaigns support GitHub projects only."));
  } else {
    const inspection = await deps.probe.inspect(project.repoPath, project.baseBranch, input.motherBranch);
    items.push(inspection.repository.ok ? item("repository", "ok", null) : item("repository", "blocked", inspection.repository.cause));
    if (inspection.baseProtection === "protected") items.push(item("base_protection", "ok", null, { branch: project.baseBranch }));
    else items.push(item("base_protection", "blocked", inspection.baseProtection === "unknown" ? `Protection of ${project.baseBranch} could not be read.` : `${project.baseBranch} is not protected; it must require a manual merge.`, { branch: project.baseBranch }));
    if (!inspection.motherRules.known) items.push(item("mother_protection", "blocked", `Rules for ${input.motherBranch} could not be read: ${inspection.motherRules.cause ?? "unknown"}.`));
    else if (inspection.motherRules.requiresApproval || inspection.motherRules.mergeQueue) {
      items.push(item("mother_protection", "blocked", `Merging into ${input.motherBranch} requires ${inspection.motherRules.mergeQueue ? "a merge queue" : "a human approval"}.`, { ...inspection.motherRules }));
    } else items.push(item("mother_protection", "ok", null, { branch: input.motherBranch }));
    if (inspection.ci.presence === "present") items.push(item("ci", "ok", null, { workflows: inspection.ci.workflows }));
    else if (plan.ciAbsenceAccepted) items.push(item("ci", "warning", `CI absence accepted in the plan: ${inspection.ci.cause ?? "no workflow"}.`, { presence: inspection.ci.presence }));
    else items.push(item("ci", "blocked", inspection.ci.cause ?? "No CI runs on pull requests to the mother branch.", { presence: inspection.ci.presence }, { type: "accept_ci_absence" }));
    if (input.approvedBaseRevision !== null && inspection.baseRevision !== null && inspection.baseRevision !== input.approvedBaseRevision) {
      items.push(item("base_drift", "blocked", `${project.baseBranch} moved from ${input.approvedBaseRevision} to ${inspection.baseRevision} since approval.`, { approved: input.approvedBaseRevision, current: inspection.baseRevision }));
    } else items.push(item("base_drift", "ok", null, { revision: inspection.baseRevision }));
    const preview = await deps.previewReadiness(plan.project, project.baseBranch);
    items.push(preview.status === "ready" ? item("preview_recipe", "ok", null, { revision: preview.revision }) : item("preview_recipe", "blocked", preview.diagnostics.join(" ") || "The Dockerfile preview recipe is not ready.", { status: preview.status }));
    items.push(deps.pilotEnabled(project.vcsProvider) ? item("autonomous_pilot", "ok", null) : item("autonomous_pilot", "blocked", "The autonomous pilot is disabled on this machine (KANBAN_AUTONOMOUS_PILOT)."));
  }
  const occupied = deps.occupiedPreviewSlots(input.campaignId);
  items.push(occupied < deps.maxActivePreviews
    ? item("preview_capacity", "ok", null, { occupied, max: deps.maxActivePreviews })
    : item("preview_capacity", "blocked", `The preview broker is full (${occupied}/${deps.maxActivePreviews}).`, { occupied, max: deps.maxActivePreviews }));
  items.push(attachmentItem(plan));
  items.push(await quotaItem(plan, deps));
  items.push(...skillItems(deps));
  return campaignReadinessSchema.parse({
    checkedAt: deps.now(),
    host: deps.host,
    version: input.version,
    ready: items.every((entry) => entry.status !== "blocked"),
    items,
  });
}
