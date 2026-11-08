import { z } from "zod";

import { campaignPlanIssueSchema, campaignPlanSchema, campaignReadinessSchema, CAMPAIGN_REQUIRED_SKILLS, CAMPAIGN_STATUSES } from "../../shared/campaign.ts";
import { TicketOperationError } from "../ticketOperations.ts";

import { skillFileSchema, skillInstallOutcomeSchema, SKILLZER_PINNED_COMMIT } from "./campaignSkills.ts";
import {
  approveCampaignInputSchema,
  cancelCampaignInputSchema,
  checkCampaignReadinessInputSchema,
  commandResultSchema,
  getCampaignInputSchema,
  installCampaignSkillInputSchema,
  pauseCampaignInputSchema,
  resumeCampaignInputSchema,
  submitCampaignPlanInputSchema,
} from "./campaignService.ts";
import type { CampaignService } from "./campaignService.ts";
import { redactCampaignUrls } from "./redaction.ts";

const looseObject = z.record(z.string(), z.unknown());

const submitInputDoc = z.object({
  requestId: z.string().describe("Persistent idempotent identifier chosen by the client; replaying it returns the first result."),
  campaignId: z.string().optional().describe("Existing campaign to add a version to; omit to create a campaign."),
  baseVersion: z.number().int().optional().describe("Version the client edited; a stale value is refused with the current version."),
  plan: campaignPlanSchema.describe("Structured campaign plan: cards with prerequisites and criteria, global criteria, attachments, assumptions, questions, exclusions, budget, schedule and policies."),
});
const submitOutputSchema = z.object({ campaignId: z.string(), version: z.number().int(), approvalBlockers: z.array(campaignPlanIssueSchema), dryRun: z.boolean() });

const readinessOutputSchema = z.object({ readiness: campaignReadinessSchema, dryRun: z.boolean() });

const installInputDoc = z.object({
  requestId: z.string(),
  campaignId: z.string(),
  skill: z.enum(CAMPAIGN_REQUIRED_SKILLS),
  source: z.discriminatedUnion("type", [
    z.object({ type: z.literal("paired_machine"), files: z.array(skillFileSchema).describe("Complete skill folder copied from the other paired machine (relative paths, base64 content).") }),
    z.object({ type: z.literal("skillzer"), commit: z.string().default(SKILLZER_PINNED_COMMIT).describe("skillzer commit to copy from.") }),
  ]),
  replaceSha256: z.string().optional().describe("Fingerprint of the installed version the user chose to replace after comparing; without it a different installed version is never overwritten."),
});
const installOutputSchema = z.object({ outcome: skillInstallOutcomeSchema, readiness: campaignReadinessSchema.nullable(), dryRun: z.boolean() });

const approveOutputSchema = z.object({
  campaignId: z.string(),
  version: z.number().int(),
  status: z.enum(CAMPAIGN_STATUSES),
  skills: z.array(looseObject),
  dryRun: z.boolean(),
});

const getOutputSchema = z.object({
  campaign: looseObject,
  plan: looseObject,
  versions: z.array(looseObject),
  approvalBlockers: z.array(campaignPlanIssueSchema),
  cards: z.array(looseObject),
  events: z.array(looseObject),
  cursor: z.number().int(),
  dryRun: z.boolean(),
});

const commandOutputSchema = commandResultSchema.extend({ dryRun: z.boolean() });

const listInputSchema = z.object({ project: z.string().optional() });
const listOutputSchema = z.object({ campaigns: z.array(looseObject), dryRun: z.boolean() });

export const CAMPAIGN_TOOLS = [
  {
    name: "submit_campaign_plan",
    description: "Submits a campaign plan (new campaign or new version). Atelier validates it (no cycle, known prerequisites, complete criteria) and versions it; nothing runs before approve_campaign.",
    inputSchema: z.toJSONSchema(submitInputDoc, { io: "input" }),
    outputSchema: z.toJSONSchema(submitOutputSchema, { io: "output" }),
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
  },
  {
    name: "check_campaign_readiness",
    description: "Runs the \"campaign ready\" check on this machine: repository, branch protections, CI on pull requests to the mother branch, preview recipe and capacity, attachments, quota, autonomous pilot and required skills, each with its cause.",
    inputSchema: z.toJSONSchema(checkCampaignReadinessInputSchema, { io: "input" }),
    outputSchema: z.toJSONSchema(readinessOutputSchema, { io: "output" }),
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
  },
  {
    name: "install_campaign_skill",
    description: "Installs a missing campaign skill after the user clicked Install: copies the complete folder sent from the other paired machine, or from skillzer at a pinned commit, then re-runs the readiness check. Never overwrites a different installed version without replaceSha256.",
    inputSchema: z.toJSONSchema(installInputDoc, { io: "input" }),
    outputSchema: z.toJSONSchema(installOutputSchema, { io: "output" }),
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
  },
  {
    name: "approve_campaign",
    description: "Approves the current plan version: freezes it, records the skill fingerprints and creates the campaign execution exactly once. A stale version is refused with the current one.",
    inputSchema: z.toJSONSchema(approveCampaignInputSchema, { io: "input" }),
    outputSchema: z.toJSONSchema(approveOutputSchema, { io: "output" }),
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
  },
  {
    name: "get_campaign",
    description: "Returns a campaign: status, current plan, versions, cards and the events after the given cursor (pass the returned cursor to read only new changes).",
    inputSchema: z.toJSONSchema(getCampaignInputSchema, { io: "input" }),
    outputSchema: z.toJSONSchema(getOutputSchema, { io: "output" }),
    annotations: { readOnlyHint: true },
  },
  {
    name: "pause_campaign",
    description: "Pauses a running or finalizing campaign: no new start or merge; a merge already emitted finishes first, then sessions are stopped. Identities, consumed budgets and criteria are kept. Unavailable during a quota pause.",
    inputSchema: z.toJSONSchema(pauseCampaignInputSchema, { io: "input" }),
    outputSchema: z.toJSONSchema(commandOutputSchema, { io: "output" }),
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
  },
  {
    name: "cancel_campaign",
    description: "Ends a campaign after the user confirmed: sessions stop, merges already in the mother branch, branches and work are kept, and the final report is produced.",
    inputSchema: z.toJSONSchema(cancelCampaignInputSchema, { io: "input" }),
    outputSchema: z.toJSONSchema(commandOutputSchema, { io: "output" }),
    annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true },
  },
  {
    name: "resume_campaign",
    description: "Resumes a paused campaign progressively, or a reported one. After the deadline, a new deadline and an additional token budget are mandatory.",
    inputSchema: z.toJSONSchema(resumeCampaignInputSchema, { io: "input" }),
    outputSchema: z.toJSONSchema(commandOutputSchema, { io: "output" }),
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
  },
  {
    name: "list_campaigns",
    description: "Lists campaigns, optionally for one project, with their status and versions.",
    inputSchema: z.toJSONSchema(listInputSchema, { io: "input" }),
    outputSchema: z.toJSONSchema(listOutputSchema, { io: "output" }),
    annotations: { readOnlyHint: true },
  },
] as const;

export const CAMPAIGN_TOOL_NAMES: readonly string[] = CAMPAIGN_TOOLS.map((tool) => tool.name);

interface CampaignToolOutput {
  schema: { safeParse(value: unknown): { success: true; data: Record<string, unknown> } | { success: false } };
  value: Record<string, unknown>;
}

function parse<T>(schema: z.ZodType<T>, input: unknown): T {
  const parsed = schema.safeParse(input);
  if (!parsed.success) throw new TicketOperationError("INVALID_INPUT", parsed.error.issues[0]?.message ?? "invalid input");
  return parsed.data;
}

function plain(value: unknown): Record<string, unknown> {
  return looseObject.parse(JSON.parse(JSON.stringify(redactCampaignUrls(value))));
}

/** Dispatches a campaign tool call; null when the name is not a campaign tool. */
export async function runCampaignTool(name: string, input: unknown, service: CampaignService, dryRun: boolean): Promise<CampaignToolOutput | null> {
  if (name === "submit_campaign_plan") {
    return { schema: submitOutputSchema, value: { ...(await service.submitPlan(parse(submitCampaignPlanInputSchema, input))), dryRun } };
  }
  if (name === "check_campaign_readiness") {
    return { schema: readinessOutputSchema, value: { readiness: await service.checkReadiness(parse(checkCampaignReadinessInputSchema, input)), dryRun } };
  }
  if (name === "install_campaign_skill") {
    return { schema: installOutputSchema, value: { ...(await service.installSkill(parse(installCampaignSkillInputSchema, input))), dryRun } };
  }
  if (name === "approve_campaign") {
    return { schema: approveOutputSchema, value: { ...(await service.approve(parse(approveCampaignInputSchema, input))), dryRun } };
  }
  if (name === "get_campaign") {
    return { schema: getOutputSchema, value: { ...plain(service.get(parse(getCampaignInputSchema, input))), dryRun } };
  }
  if (name === "pause_campaign") {
    return { schema: commandOutputSchema, value: { ...(await service.pause(parse(pauseCampaignInputSchema, input))), dryRun } };
  }
  if (name === "cancel_campaign") {
    return { schema: commandOutputSchema, value: { ...(await service.cancel(parse(cancelCampaignInputSchema, input))), dryRun } };
  }
  if (name === "resume_campaign") {
    return { schema: commandOutputSchema, value: { ...(await service.resume(parse(resumeCampaignInputSchema, input))), dryRun } };
  }
  if (name === "list_campaigns") {
    const { project } = parse(listInputSchema, input);
    return { schema: listOutputSchema, value: { campaigns: service.list(project).map(plain), dryRun } };
  }
  return null;
}
