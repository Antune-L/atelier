import { describe, expect, test } from "bun:test";

import { AUTONOMOUS_MAX_TIMEOUT_MINUTES } from "../../shared/autonomous.ts";
import { campaignPlanSchema } from "../../shared/campaign.ts";
import { makeCampaignPlan } from "../testing/campaignFixtures.ts";

import { campaignCardDescription, campaignFinalDescription, campaignFinalTicket } from "./cardTicket.ts";

const MOCKUP_SHA = "a".repeat(64);
const SPEC_SHA = "b".repeat(64);
const MOTHER = "campaign/c1-demo";

const plan = campaignPlanSchema.parse(makeCampaignPlan({
  attachments: [
    { id: "spec", path: "/srv/campaign/spec.md", sha256: SPEC_SHA, rank: 2 },
    { id: "mockup", path: "/srv/campaign/mockup.HTML", sha256: MOCKUP_SHA, rank: 1, label: "Dashboard mockup" },
  ],
}));

function referenceSection(description: string): string {
  const start = description.indexOf("### Reference files");
  const end = description.indexOf("###", start + 1);
  return description.slice(start, end);
}

describe("campaign card briefs", () => {
  test("every card brief lists the frozen attachments by rank with their path and sha256, mockups flagged", () => {
    const card = plan.cards[0];
    if (!card) throw new Error("no card");
    const section = referenceSection(campaignCardDescription(plan, card, MOTHER, []));
    expect(section).toContain("Read every file below before implementing");
    expect(section).toContain(`Dashboard mockup: \`/srv/campaign/mockup.HTML\` (sha256 ${MOCKUP_SHA}) — UI mockup`);
    expect(section).toContain(`spec: \`/srv/campaign/spec.md\` (sha256 ${SPEC_SHA})\n`);
    expect(section.indexOf("Dashboard mockup")).toBeLessThan(section.indexOf("spec:"));
  });

  test("the final card brief lists them too, and an empty list says none", () => {
    expect(referenceSection(campaignFinalDescription(plan, MOTHER, "main", [], []))).toContain("/srv/campaign/mockup.HTML");
    const bare = campaignPlanSchema.parse(makeCampaignPlan());
    expect(referenceSection(campaignFinalDescription(bare, MOTHER, "main", [], []))).toContain("- none");
  });

  test("the final card timeout no longer depends on a report time", () => {
    expect(campaignFinalTicket(plan, "main", "brief", false).autonomousTimeoutMinutes).toBe(AUTONOMOUS_MAX_TIMEOUT_MINUTES);
  });
});
