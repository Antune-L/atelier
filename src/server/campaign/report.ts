import { campaignEnvelopeTokens, campaignReportSchema, missingGlobalCriteria } from "../../shared/campaign.ts";
import type { Campaign, CampaignCard, CampaignOperation, CampaignPlan, CampaignReport, CampaignSkillFingerprint, CampaignVerdict } from "../../shared/campaign.ts";

import { redactCampaignUrls } from "./redaction.ts";

export interface ReportInput {
  campaign: Campaign;
  plan: CampaignPlan;
  cards: readonly CampaignCard[];
  operations: readonly CampaignOperation[];
  skills: readonly CampaignSkillFingerprint[];
  activeSessions: number;
  finalTokens: number;
  now: number;
}

/** Verdict priority: unknown, then ready, partial, blocked (FR11). A merged card never proves readiness by itself. */
export function campaignVerdict(input: ReportInput): CampaignVerdict {
  const { campaign, plan, cards, operations } = input;
  const unreconciled = campaign.status === "unknown"
    || campaign.runtime.reconciliationError !== null
    || input.activeSessions > 0
    || operations.some((operation) => operation.status === "intent" || operation.status === "unknown");
  if (unreconciled) return "unknown";
  const finalization = campaign.runtime.finalization;
  const merged = cards.filter((card) => card.state === "merged").length;
  const allCriteriaProven = finalization !== null
    && finalization.frozenRevision !== null
    && finalization.criteria.length > 0
    && finalization.criteria.every((criterion) => criterion.status === "passed" && criterion.revision === finalization.frozenRevision);
  const confirmedFinalPr = finalization?.prUrl !== null && finalization?.prUrl !== undefined && finalization.prDraft === false;
  if (allCriteriaProven && confirmedFinalPr && merged === plan.cards.length) return "ready";
  if (merged > 0) return "partial";
  return "blocked";
}

export function buildCampaignReport(input: ReportInput): CampaignReport {
  const { campaign, plan, cards } = input;
  const finalization = campaign.runtime.finalization;
  const criteria = finalization?.criteria ?? missingGlobalCriteria(plan);
  const tokensUsed = cards.reduce((sum, card) => sum + card.tokensUsed, 0) + input.finalTokens;
  const report: CampaignReport = {
    verdict: campaignVerdict(input),
    producedAt: input.now,
    activity: {
      status: campaign.status,
      activeSessions: input.activeSessions,
      mergesInFlight: input.operations.filter((operation) => operation.kind === "merge_card" && operation.status === "intent").length,
      reconciledAt: campaign.runtime.reconciledAt,
      endedAt: campaign.runtime.endedAt,
    },
    finalPr: { url: finalization?.prUrl ?? null, draft: finalization?.prDraft ?? null },
    preview: {
      url: finalization?.previewUrl ?? null,
      cleanup: finalization?.previewCleanup ?? null,
      cleanupError: finalization?.previewCleanupError ?? null,
    },
    criteria: { validated: criteria.filter((criterion) => criterion.status === "passed").length, total: criteria.length, items: criteria },
    cards: {
      merged: cards.filter((card) => card.state === "merged").length,
      total: plan.cards.length,
      items: plan.cards.map((planCard) => {
        const card = cards.find((entry) => entry.cardId === planCard.id);
        return {
          cardId: planCard.id,
          title: planCard.title,
          state: card?.state ?? "pending",
          prUrl: card?.prUrl ?? null,
          blockedReason: card?.blockedReason ?? null,
          tokensUsed: card?.tokensUsed ?? 0,
          budgetTokens: planCard.budgetTokens,
        };
      }),
    },
    decisions: campaign.runtime.decisions,
    pendingQuestions: campaign.runtime.pendingQuestions,
    consumption: {
      tokensUsed,
      envelopeTokens: campaignEnvelopeTokens(plan, campaign.runtime),
      reserveTokens: plan.budget.finalReserveTokens,
      reserveUsedTokens: finalization?.reserveUsedTokens ?? 0,
      sessions: campaign.runtime.sessionsStarted,
      quotaPausedMs: campaign.runtime.quotaPausedMs,
      skills: [...input.skills],
    },
  };
  return campaignReportSchema.parse(redactCampaignUrls(report));
}

/** One aggregated notification: the only one the campaign emits (FR11). */
export function campaignReportNotification(campaign: Campaign, report: CampaignReport): { title: string; body: string } {
  const pr = report.finalPr.url === null ? "no final pull request" : `final PR ${report.finalPr.url}${report.finalPr.draft ? " (draft)" : ""}`;
  return {
    title: `Campaign ${report.verdict}: ${campaign.title}`,
    body: `${report.cards.merged}/${report.cards.total} cards merged, ${report.criteria.validated}/${report.criteria.total} criteria validated, ${pr}.`,
  };
}
