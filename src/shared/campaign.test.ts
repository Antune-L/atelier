import { describe, expect, test } from "bun:test";

import { makeCampaignPlan, makeCriterion } from "../server/testing/campaignFixtures.ts";

import { campaignApprovalBlockers, campaignPlanSchema, changedCampaignCards, validateCampaignPlan } from "./campaign.ts";

function codes(overrides: Parameters<typeof makeCampaignPlan>[0]): string[] {
  return validateCampaignPlan(campaignPlanSchema.parse(makeCampaignPlan(overrides)), "main").map((issue) => issue.code);
}

describe("validateCampaignPlan", () => {
  test("accepts a plan with several prerequisites per card", () => {
    const plan = makeCampaignPlan();
    const cards = [...(plan.cards ?? []), { id: "E", title: "E", description: "E", dependsOn: ["B", "C"], budgetTokens: 100_000, criteria: [makeCriterion("E1")] }];
    expect(codes({ cards })).toEqual([]);
  });

  test("refuses a cycle with its path", () => {
    const issues = validateCampaignPlan(campaignPlanSchema.parse(makeCampaignPlan({
      cards: [
        { id: "A", title: "A", description: "A", dependsOn: ["B"], budgetTokens: 1, criteria: [makeCriterion("A1")] },
        { id: "B", title: "B", description: "B", dependsOn: ["A"], budgetTokens: 1, criteria: [makeCriterion("B1")] },
      ],
    })), "main");
    expect(issues.find((issue) => issue.code === "cycle")?.message).toContain("A -> B -> A");
  });

  test("refuses an unknown prerequisite", () => {
    expect(codes({ cards: [{ id: "A", title: "A", description: "A", dependsOn: ["Z"], budgetTokens: 1, criteria: [makeCriterion("A1")] }] })).toContain("unknown_prerequisite");
  });

  test("refuses a criterion missing one of its six fields", () => {
    const { proofMethod: _proof, ...incomplete } = makeCriterion("A1");
    const issues = validateCampaignPlan(campaignPlanSchema.parse(makeCampaignPlan({
      cards: [{ id: "A", title: "A", description: "A", dependsOn: [], budgetTokens: 1, criteria: [incomplete] }],
    })), "main");
    expect(issues.find((issue) => issue.code === "incomplete_criterion")?.message).toContain("proofMethod");
  });

  test("refuses a card that asks to merge or to target main (NFR1)", () => {
    const card = { id: "A", title: "A", description: "A", dependsOn: [], budgetTokens: 1, criteria: [makeCriterion("A1")] };
    expect(codes({ cards: [{ ...card, deliveryMode: "merge" }] })).toContain("forbidden_delivery");
    expect(codes({ cards: [{ ...card, targetBranch: "main" }] })).toContain("forbidden_target");
  });

  test("refuses card budgets above the envelope minus the reserve", () => {
    expect(codes({ budget: { totalTokens: 400_000, finalReserveTokens: 300_000 } })).toContain("invalid_budget");
  });
});

describe("campaignApprovalBlockers", () => {
  test("lists an unanswered blocking question and an unaccepted assumption", () => {
    const plan = campaignPlanSchema.parse(makeCampaignPlan({
      questions: [{ id: "Q1", text: "Which locale?", blocking: true }, { id: "Q2", text: "Colour?", blocking: false }],
      assumptions: [{ id: "H1", text: "Stripe sandbox", accepted: false }],
    }));
    expect(campaignApprovalBlockers(plan).map((issue) => issue.code)).toEqual(["unanswered_question", "unaccepted_assumption"]);
  });
});

describe("changedCampaignCards", () => {
  test("includes the changed card and its descendants only", () => {
    const previous = campaignPlanSchema.parse(makeCampaignPlan());
    const next = campaignPlanSchema.parse({ ...makeCampaignPlan(), cards: previous.cards.map((card) => (card.id === "A" ? { ...card, description: "Do A differently" } : card)) });
    expect([...changedCampaignCards(previous, next)].sort()).toEqual(["A", "B"]);
  });
});
