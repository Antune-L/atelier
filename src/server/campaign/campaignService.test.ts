import { describe, expect, test } from "bun:test";

import { makeCampaignPlan } from "../testing/campaignFixtures.ts";
import { TicketOperationError } from "../ticketOperations.ts";

import { makeCampaignHarness, writeSkill } from "./campaignTestHarness.ts";

async function rejection(promise: Promise<unknown>): Promise<TicketOperationError> {
  try {
    await promise;
  } catch (error) {
    if (error instanceof TicketOperationError) return error;
    throw error;
  }
  throw new Error("expected a rejection");
}

describe("CampaignService", () => {
  test("a submitted plan is versioned and nothing runs before approval", async () => {
    const { service, store } = makeCampaignHarness();
    const submitted = await service.submitPlan({ requestId: "r1", plan: makeCampaignPlan() });
    expect(submitted.version).toBe(1);
    expect(store.campaigns.require(submitted.campaignId).status).toBe("planning");
    expect(store.campaigns.listCards(submitted.campaignId)).toEqual([]);
  });

  test("a plan with a cycle is refused with its cause and not stored", async () => {
    const { service, store } = makeCampaignHarness();
    const plan = makeCampaignPlan();
    const cards = (plan.cards ?? []).map((card) => (card.id === "A" ? { ...card, dependsOn: ["B"] } : card));
    const error = await rejection(service.submitPlan({ requestId: "r1", plan: { ...plan, cards } }));
    expect(error.code).toBe("INVALID_INPUT");
    expect(error.message).toContain("cycle");
    expect(store.campaigns.list()).toEqual([]);
  });

  test("approval is refused while a blocking question has no answer, then accepted once", async () => {
    const { service, store, changes } = makeCampaignHarness();
    const { campaignId } = await service.submitPlan({ requestId: "r1", plan: makeCampaignPlan({ questions: [{ id: "Q1", text: "Locale?", blocking: true }] }) });
    const blocked = await rejection(service.approve({ requestId: "a1", campaignId, version: 1 }));
    expect(blocked.message).toContain("unanswered_question");
    await service.submitPlan({ requestId: "r2", campaignId, baseVersion: 1, plan: makeCampaignPlan({ questions: [{ id: "Q1", text: "Locale?", blocking: true, answer: "fr" }] }) });
    const first = await service.approve({ requestId: "a2", campaignId, version: 2 });
    const replay = await service.approve({ requestId: "a2", campaignId, version: 2 });
    const repeated = await service.approve({ requestId: "a3", campaignId, version: 2 });
    expect(first).toEqual(replay);
    expect(repeated.status).toBe("queued");
    expect(store.campaigns.require(campaignId).approvedVersion).toBe(2);
    expect(store.campaigns.listEvents(campaignId).filter((event) => event.type === "approved")).toHaveLength(1);
    expect(changes).toEqual([campaignId]);
  });

  test("a stale version is refused with the current one", async () => {
    const { service } = makeCampaignHarness();
    const { campaignId } = await service.submitPlan({ requestId: "r1", plan: makeCampaignPlan() });
    await service.submitPlan({ requestId: "r2", campaignId, baseVersion: 1, plan: makeCampaignPlan() });
    expect((await rejection(service.approve({ requestId: "a1", campaignId, version: 1 }))).message).toContain("current version is 2");
    expect((await rejection(service.submitPlan({ requestId: "r3", campaignId, baseVersion: 1, plan: makeCampaignPlan() }))).message).toContain("current version is 2");
  });

  test("readiness lists each missing prerequisite with its cause and blocks approval", async () => {
    const { service } = makeCampaignHarness({
      pilot: false,
      inspection: { ci: { presence: "absent", workflows: [], cause: "No workflow" }, motherRules: { known: true, requiresApproval: true, mergeQueue: false, cause: null } },
      quota: null,
    });
    const { campaignId } = await service.submitPlan({ requestId: "r1", plan: makeCampaignPlan() });
    const readiness = await service.checkReadiness({ campaignId });
    const blocked = readiness.items.filter((item) => item.status === "blocked").map((item) => item.id).sort();
    expect(blocked).toEqual(["autonomous_pilot", "ci", "mother_protection", "quota"]);
    expect(readiness.items.find((item) => item.id === "ci")?.action).toEqual({ type: "accept_ci_absence" });
    expect((await rejection(service.approve({ requestId: "a1", campaignId, version: 1 }))).code).toBe("CONFLICT");
  });

  test("an accepted CI absence becomes a warning", async () => {
    const { service } = makeCampaignHarness({ inspection: { ci: { presence: "absent", workflows: [], cause: "No workflow" } } });
    const { campaignId } = await service.submitPlan({ requestId: "r1", plan: makeCampaignPlan({ ciAbsenceAccepted: true }) });
    const readiness = await service.checkReadiness({ campaignId });
    expect(readiness.items.find((item) => item.id === "ci")?.status).toBe("warning");
    expect(readiness.ready).toBe(true);
  });

  test("missing skills are warnings with install actions and fingerprints are recorded at approval (FR14)", async () => {
    const { service, store, skillRoots } = makeCampaignHarness();
    const { campaignId } = await service.submitPlan({ requestId: "r1", plan: makeCampaignPlan() });
    const before = await service.checkReadiness({ campaignId });
    const simplifier = before.items.find((item) => item.id === "skill:simplifier");
    expect(simplifier?.status).toBe("warning");
    expect(simplifier?.action).toMatchObject({ type: "install_skill", sources: [{ source: "paired_machine" }, { source: "skillzer", available: false }] });
    writeSkill(skillRoots.install[0] ?? "", "simplifier", "# simplifier v1");
    const approved = await service.approve({ requestId: "a1", campaignId, version: 1 });
    expect(approved.skills.find((skill) => skill.name === "simplifier")?.source).toBe("installed");
    expect(approved.skills.find((skill) => skill.name === "argus-review")?.source).toBe("internal");
    expect(store.campaigns.requireVersion(campaignId, 1).skills?.length).toBe(2);
  });

  test("installing a skill copies the folder, refuses to overwrite a different version, and reports skillzer gaps (FR15)", async () => {
    const { service, skillRoots } = makeCampaignHarness();
    const { campaignId } = await service.submitPlan({ requestId: "r1", plan: makeCampaignPlan() });
    const files = [{ path: "SKILL.md", contentBase64: Buffer.from("# simplifier from mac").toString("base64") }];
    const installed = await service.installSkill({ requestId: "i1", campaignId, skill: "simplifier", source: { type: "paired_machine", files } });
    expect(installed.outcome.status).toBe("installed");
    expect(installed.readiness?.items.find((item) => item.id === "skill:simplifier")?.status).toBe("ok");
    writeSkill(skillRoots.install[0] ?? "", "argus-review", "# local argus");
    const conflict = await service.installSkill({ requestId: "i2", campaignId, skill: "argus-review", source: { type: "skillzer", commit: "8f3ccad" } });
    expect(conflict.outcome.status).toBe("conflict");
    const missing = await service.installSkill({ requestId: "i3", campaignId, skill: "simplifier", source: { type: "skillzer", commit: "8f3ccad" } });
    expect(missing.outcome.status).toBe("unavailable");
  });

  test("changing an approved plan suspends touched cards and their descendants until approval", async () => {
    const { service, store } = makeCampaignHarness();
    const { campaignId } = await service.submitPlan({ requestId: "r1", plan: makeCampaignPlan() });
    await service.approve({ requestId: "a1", campaignId, version: 1 });
    for (const id of ["A", "B", "C", "D"]) store.campaigns.upsertCard(campaignId, id, 1);
    store.campaigns.updateCard(campaignId, "C", { state: "merged" });
    const plan = makeCampaignPlan();
    const cards = (plan.cards ?? []).map((card) => (card.id === "A" ? { ...card, description: "Changed" } : card));
    await service.submitPlan({ requestId: "r2", campaignId, baseVersion: 1, plan: { ...plan, cards } });
    const states = Object.fromEntries(store.campaigns.listCards(campaignId).map((card) => [card.cardId, card.state]));
    expect(states).toEqual({ A: "suspended", B: "suspended", C: "merged", D: "pending" });
    await service.approve({ requestId: "a2", campaignId, version: 2 });
    expect(store.campaigns.requireCard(campaignId, "B").state).toBe("pending");
  });

  test("get returns only events after the cursor", async () => {
    const { service } = makeCampaignHarness();
    const { campaignId } = await service.submitPlan({ requestId: "r1", plan: makeCampaignPlan() });
    const first = service.get({ campaignId });
    await service.checkReadiness({ campaignId });
    const next = service.get({ campaignId, cursor: first.cursor });
    expect(next.events.map((event) => event.type)).toEqual(["readiness_checked"]);
  });
});
