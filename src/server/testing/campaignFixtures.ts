import type { CampaignCriterion, CampaignPlanInput } from "../../shared/campaign.ts";

import { FIXTURE_PROJECT_KEY } from "./fixtures.ts";

export function makeCriterion(id: string): CampaignCriterion {
  return {
    id,
    data: "A seeded organiser account",
    role: "Organiser",
    actions: "Open the dashboard and create an event",
    observableResult: "The event appears in the list",
    proofMethod: "Browser test on the preview at the frozen revision",
  };
}

export function makeCampaignPlan(overrides: Partial<CampaignPlanInput> = {}): CampaignPlanInput {
  return {
    project: FIXTURE_PROJECT_KEY,
    title: "Autonomous campaign",
    cards: [
      { id: "A", title: "Card A", description: "Do A", dependsOn: [], budgetTokens: 100_000, criteria: [makeCriterion("A1")] },
      { id: "B", title: "Card B", description: "Do B", dependsOn: ["A"], budgetTokens: 100_000, criteria: [makeCriterion("B1")] },
      { id: "C", title: "Card C", description: "Do C", dependsOn: [], budgetTokens: 100_000, criteria: [makeCriterion("C1")] },
      { id: "D", title: "Card D", description: "Do D", dependsOn: [], budgetTokens: 100_000, criteria: [makeCriterion("D1")] },
    ],
    globalCriteria: [makeCriterion("G1")],
    budget: { totalTokens: 1_000_000, finalReserveTokens: 300_000 },
    ...overrides,
  };
}
