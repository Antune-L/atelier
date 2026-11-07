import type { CampaignCardPlan, CampaignCriterion, CampaignPlan, CampaignSkillFingerprint } from "../../shared/campaign.ts";
import type { NewTicket } from "../db/store.ts";

export const DECISION_LINE_PREFIX = "- Decision:";
const RULE_SEPARATOR = "— Rule:";

function criterionBlock(criterion: CampaignCriterion): string {
  return [
    `- **${criterion.id}**`,
    `  - Data: ${criterion.data}`,
    `  - Role: ${criterion.role}`,
    `  - Actions: ${criterion.actions}`,
    `  - Observable result: ${criterion.observableResult}`,
    `  - Proof: ${criterion.proofMethod}`,
  ].join("\n");
}

function listOrNone(items: readonly string[]): string {
  return items.length === 0 ? "- none" : items.map((item) => `- ${item}`).join("\n");
}

export interface CardSkillGuidance {
  name: string;
  fingerprint: CampaignSkillFingerprint | null;
  instructions: string | null;
}

function guidanceBlock(guidance: CardSkillGuidance): string {
  if (guidance.instructions === null) return `### ${guidance.name}\n\nNot installed on this machine: use the internal pipeline guidance.`;
  return `### ${guidance.name} (sha256 ${guidance.fingerprint?.sha256 ?? "unknown"})\n\n${guidance.instructions.trim()}`;
}

/** Card brief: scope, verifiable criteria, the plan's rules for autonomous decisions, and the skill guidance read for this campaign (FR4, FR14). */
export function campaignCardDescription(plan: CampaignPlan, card: CampaignCardPlan, motherBranch: string, guidance: readonly CardSkillGuidance[]): string {
  const criteria = card.criteria.flatMap((criterion) => {
    const id = criterion.id;
    const complete = [criterion.data, criterion.role, criterion.actions, criterion.observableResult, criterion.proofMethod];
    if (id === undefined || complete.some((value) => value === undefined)) return [];
    return [criterionBlock({ id, data: criterion.data ?? "", role: criterion.role ?? "", actions: criterion.actions ?? "", observableResult: criterion.observableResult ?? "", proofMethod: criterion.proofMethod ?? "" })];
  });
  return [
    card.description,
    "",
    `## Campaign card ${card.id} — ${plan.title}`,
    "",
    `This card is part of an autonomous campaign. Its pull request targets the campaign branch \`${motherBranch}\` and is merged by the campaign once review and checks pass. Nobody answers questions during the run.`,
    "",
    "### Verifiable criteria",
    "",
    criteria.join("\n"),
    "",
    "### Accepted assumptions",
    "",
    listOrNone(plan.assumptions.filter((assumption) => assumption.accepted).map((assumption) => `${assumption.id}: ${assumption.text}`)),
    "",
    "### Answered questions",
    "",
    listOrNone(plan.questions.filter((question) => (question.answer ?? question.recommended ?? "") !== "").map((question) => `${question.id}: ${question.text} → ${question.answer ?? question.recommended ?? ""}`)),
    "",
    "### Exclusions",
    "",
    listOrNone(plan.exclusions),
    "",
    "### Allowed external effects",
    "",
    listOrNone(plan.externalEffects),
    "",
    "### Decision rules",
    "",
    "- Decide reversible technical choices yourself when they comply with the plan. List each one in the pull request description as a line:",
    `  \`${DECISION_LINE_PREFIX} <what you decided> ${RULE_SEPARATOR} <assumption id, answered question id, or "reversible technical choice">\``,
    "- When the plan does not settle a business question, a scope change, or a missing access, do not guess: ask one question and stop. The card is then blocked for the final report.",
    "- Never perform an external effect that is not listed above (for example sending a real email). Ask a question instead.",
    "",
    "## Skill guidance for this campaign",
    "",
    ...guidance.map(guidanceBlock),
  ].join("\n");
}

export function parseCampaignDecisions(summary: string | null): { decision: string; rule: string }[] {
  if (summary === null) return [];
  return summary.split("\n").flatMap((line) => {
    const trimmed = line.trim().replace(/`/g, "");
    if (!trimmed.startsWith(DECISION_LINE_PREFIX)) return [];
    const [decision, rule] = trimmed.slice(DECISION_LINE_PREFIX.length).split(RULE_SEPARATOR);
    const cleanDecision = decision?.trim() ?? "";
    const cleanRule = rule?.trim() ?? "";
    return cleanDecision && cleanRule ? [{ decision: cleanDecision, rule: cleanRule }] : [];
  });
}

export function campaignCardTicket(plan: CampaignPlan, card: CampaignCardPlan, motherBranch: string, description: string): NewTicket {
  const provider = card.provider ?? "claude";
  return {
    title: card.title,
    description,
    externalUrl: null,
    project: plan.project,
    prdEnabled: false,
    prDraft: true,
    autoMerge: false,
    addScreenshots: false,
    verifyFeature: false,
    argusMultiLoop: false,
    stealth: false,
    directPush: false,
    baseBranch: motherBranch,
    dependsOn: null,
    childOrder: null,
    model: null,
    effort: null,
    implementerModel: null,
    implementerEffort: null,
    implementer: provider,
    orchestrator: provider,
    codexModel: null,
    codexEffort: null,
  };
}

const MIN_FINAL_TIMEOUT_MINUTES = 30;
const MAX_FINAL_TIMEOUT_MINUTES = 1440;
const MINUTE_MS = 60_000;

/** Brief of the final card: validate the adopted mother branch and open the pull request to the base (FR6, FR7). */
export function campaignFinalDescription(plan: CampaignPlan, motherBranch: string, baseBranch: string, missingCards: readonly string[], guidance: readonly CardSkillGuidance[]): string {
  const criteria = plan.globalCriteria.flatMap((criterion) => {
    const { id, data, role, actions, observableResult, proofMethod } = criterion;
    if (id === undefined || data === undefined || role === undefined || actions === undefined || observableResult === undefined || proofMethod === undefined) return [];
    return [criterionBlock({ id, data, role, actions, observableResult, proofMethod })];
  });
  return [
    `Finalize the campaign "${plan.title}".`,
    "",
    `The worktree is the existing campaign branch \`${motherBranch}\`: never create another branch, never merge anything into it except your own fixes. The pull request goes from \`${motherBranch}\` to \`${baseBranch}\` and is never merged automatically.`,
    "",
    "1. Freeze the revision you validate; every proof must name that exact commit.",
    "2. Lightening pass following the simplifier guidance below, then an automatic review following the argus-review guidance, and fix what it reports.",
    "3. Typecheck, lint and unit tests.",
    "4. Submit the autonomous plan with exactly the global criteria below (same ids) and let the pipeline validate them on the preview of the frozen revision.",
    "5. A failing criterion is fixed on this branch, then revalidated on the new revision.",
    "",
    "### Global criteria",
    "",
    criteria.join("\n"),
    "",
    "### Cards not merged into the campaign branch",
    "",
    listOrNone(missingCards),
    "",
    "### Exclusions",
    "",
    listOrNone(plan.exclusions),
    "",
    "## Skill guidance for this campaign",
    "",
    ...guidance.map(guidanceBlock),
  ].join("\n");
}

export function campaignFinalTicket(plan: CampaignPlan, baseBranch: string, description: string, draft: boolean, now: number, reportAt: number): NewTicket {
  const minutesToReport = Math.floor((reportAt - now) / MINUTE_MS);
  const timeout = Math.min(MAX_FINAL_TIMEOUT_MINUTES, Math.max(MIN_FINAL_TIMEOUT_MINUTES, minutesToReport));
  return {
    ...campaignCardTicket(plan, { id: "final", title: `Finalize: ${plan.title}`, description, dependsOn: [], budgetTokens: plan.budget.finalReserveTokens, criteria: [] }, baseBranch, description),
    title: `Finalize campaign: ${plan.title}`,
    prDraft: draft,
    autonomous: true,
    autonomousDelivery: "pr_only",
    autonomousTimeoutMinutes: timeout,
  };
}
