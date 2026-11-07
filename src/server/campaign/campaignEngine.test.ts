import { describe, expect, test } from "bun:test";

import type { Ticket } from "../../shared/schemas.ts";
import type { Store } from "../db/store.ts";
import type { DoneGateResult } from "../system/types.ts";
import type { PrSnapshot } from "../system/vcs/types.ts";
import { makeCampaignPlan } from "../testing/campaignFixtures.ts";

import { CampaignEngine } from "./campaignEngine.ts";
import type { CampaignSlots, CampaignVcs } from "./campaignEngine.ts";
import type { CampaignService } from "./campaignService.ts";
import { makeCampaignHarness } from "./campaignTestHarness.ts";

class FakeSlots implements CampaignSlots {
  readonly started: string[] = [];
  readonly interrupted: string[] = [];
  resolution: "launched" | "exhausted" | "no_slot" = "exhausted";

  constructor(private readonly store: Store) {}

  enqueue(): void {}

  startTicket(ticketId: string): Promise<void> {
    this.started.push(ticketId);
    this.store.updateTicket(ticketId, { column: "implementing", stage: "implementing", branch: `feat/${ticketId}` });
    return Promise.resolve();
  }

  retry(ticketId: string): Promise<void> {
    this.store.updateTicket(ticketId, { column: "implementing", stage: "implementing", error: null });
    return Promise.resolve();
  }

  markMerged(ticketId: string): Promise<Ticket> {
    return Promise.resolve(this.store.updateTicket(ticketId, { column: "merged" }));
  }

  interruptForCampaign(ticketId: string): Promise<boolean> {
    this.interrupted.push(ticketId);
    return Promise.resolve(true);
  }

  resolveCampaignConflict(): Promise<"launched" | "exhausted" | "no_slot"> {
    return Promise.resolve(this.resolution);
  }
}

class FakeVcs implements CampaignVcs {
  readonly branches = new Set<string>(["main"]);
  readonly prs = new Map<string, PrSnapshot>();
  readonly merges: string[] = [];
  failMerge: string | null = null;

  createBranch(_repoPath: string, branch: string): Promise<void> {
    this.branches.add(branch);
    return Promise.resolve();
  }

  branchExists(_repoPath: string, branch: string): Promise<boolean> {
    return Promise.resolve(this.branches.has(branch));
  }

  readPr(_repoPath: string, prUrl: string): Promise<PrSnapshot> {
    return Promise.resolve(this.prs.get(prUrl) ?? { state: "unknown", baseBranch: null, mergedAt: null, mergeCommitSha: null, headSha: null });
  }

  mergePr(_repoPath: string, _branch: string, prUrl: string): Promise<DoneGateResult> {
    if (this.failMerge !== null) return Promise.resolve({ ok: false, reason: this.failMerge });
    this.merges.push(prUrl);
    const pr = this.prs.get(prUrl);
    if (pr) this.prs.set(prUrl, { ...pr, state: "merged", mergeCommitSha: "f".repeat(40) });
    return Promise.resolve({ ok: true, reason: "" });
  }
}

async function setup() {
  const harness = makeCampaignHarness();
  const { campaignId } = await harness.service.submitPlan({ requestId: "r1", plan: makeCampaignPlan() });
  await harness.service.approve({ requestId: "a1", campaignId, version: 1 });
  const slots = new FakeSlots(harness.store);
  const vcs = new FakeVcs();
  const makeEngine = (service: CampaignService = harness.service) => new CampaignEngine({
    store: harness.store,
    slots,
    vcs,
    project: () => ({ repoPath: "/tmp/repo", vcsProvider: "github" }),
    skillRoots: harness.skillRoots,
    readyToStart: (campaign) => service.readyToStart(campaign),
  });
  const engine = makeEngine();
  const ticketOf = (cardId: string): Ticket => {
    const ticketId = harness.store.campaigns.requireCard(campaignId, cardId).ticketId;
    const ticket = ticketId === null ? null : harness.store.getTicket(ticketId);
    if (!ticket) throw new Error(`no ticket for ${cardId}`);
    return ticket;
  };
  const deliver = (cardId: string, options: { base?: string; eligible?: boolean } = {}) => {
    const ticket = ticketOf(cardId);
    const prUrl = `https://github.com/o/r/pull/${cardId}`;
    harness.store.updateTicket(ticket.id, { column: "done", prUrl });
    vcs.prs.set(prUrl, { state: "open", baseBranch: options.base ?? mother(), mergedAt: null, mergeCommitSha: null, headSha: "a".repeat(40) });
    engine.recordDelivery(ticket.id, { prUrl, mergeEligible: options.eligible ?? true });
  };
  const mother = () => harness.store.campaigns.require(campaignId).motherBranch ?? "";
  const state = (cardId: string) => harness.store.campaigns.requireCard(campaignId, cardId).state;
  return { ...harness, campaignId, slots, vcs, engine, makeEngine, ticketOf, deliver, mother, state };
}

describe("CampaignEngine", () => {
  test("A then B plus two independent cards: four PRs to the mother, B starts after A is merged", async () => {
    const ctx = await setup();
    await ctx.engine.tick();
    await ctx.engine.tick();
    expect(ctx.vcs.branches.has(ctx.mother())).toBe(true);
    expect(["A", "B", "C", "D"].map((id) => ctx.ticketOf(id).baseBranch)).toEqual([ctx.mother(), ctx.mother(), ctx.mother(), ctx.mother()]);
    expect(["A", "B", "C", "D"].every((id) => ctx.ticketOf(id).autoMerge === false && ctx.ticketOf(id).dependsOn === null)).toBe(true);
    expect(ctx.state("B")).toBe("waiting_prerequisites");
    expect(ctx.slots.started.sort()).toEqual([ctx.ticketOf("A").id, ctx.ticketOf("C").id, ctx.ticketOf("D").id].sort());

    ctx.deliver("A");
    await ctx.engine.tick();
    expect(ctx.state("A")).toBe("merged");
    expect(ctx.slots.started).toContain(ctx.ticketOf("B").id);
    for (const id of ["B", "C", "D"]) ctx.deliver(id);
    await ctx.engine.tick();
    expect(ctx.vcs.merges).toHaveLength(4);
    expect(["A", "B", "C", "D"].map(ctx.state)).toEqual(["merged", "merged", "merged", "merged"]);
  });

  test("a manual start before the prerequisites are merged is refused with the expected prerequisite", async () => {
    const ctx = await setup();
    await ctx.engine.tick();
    expect(() => ctx.engine.assertMayStart(ctx.ticketOf("B"))).toThrow(/prerequisites merged into .*: A\./);
  });

  test("a merge still conflicting after the bounded resolution blocks the card and its descendants, others continue", async () => {
    const ctx = await setup();
    await ctx.engine.tick();
    ctx.vcs.failMerge = "conflict";
    ctx.deliver("A");
    await ctx.engine.tick();
    expect(ctx.state("A")).toBe("blocked");
    expect(ctx.state("B")).toBe("blocked");
    ctx.vcs.failMerge = null;
    ctx.deliver("C");
    await ctx.engine.tick();
    expect(ctx.state("C")).toBe("merged");
  });

  test("a card whose review or checks did not pass cleanly is never merged", async () => {
    const ctx = await setup();
    await ctx.engine.tick();
    ctx.deliver("C", { eligible: false });
    await ctx.engine.tick();
    expect(ctx.state("C")).toBe("blocked");
    expect(ctx.vcs.merges).toEqual([]);
  });

  test("a pull request that targets main is never merged (NFR1)", async () => {
    const ctx = await setup();
    await ctx.engine.tick();
    ctx.deliver("C", { base: "main" });
    await ctx.engine.tick();
    expect(ctx.state("C")).toBe("blocked");
    expect(ctx.vcs.merges).toEqual([]);
  });

  test("after a restart, a merge whose outcome was unknown is checked remotely and not repeated", async () => {
    const ctx = await setup();
    await ctx.engine.tick();
    ctx.deliver("C");
    const ticket = ctx.ticketOf("C");
    ctx.store.campaigns.beginOperation(ctx.campaignId, `merge:${ctx.campaignId}:C:0`, "merge_card", {});
    const prUrl = ticket.prUrl ?? "";
    const pr = ctx.vcs.prs.get(prUrl);
    if (pr) ctx.vcs.prs.set(prUrl, { ...pr, state: "merged" });
    const restarted = ctx.makeEngine();
    await restarted.tick();
    expect(ctx.state("C")).toBe("merged");
    expect(ctx.vcs.merges).toEqual([]);
    const started = ctx.slots.started.length;
    await restarted.tick();
    expect(ctx.slots.started.length).toBe(started);
    expect(ctx.store.listTickets(true).filter((entry) => entry.project === "test-proj")).toHaveLength(4);
  });

  test("card notifications are silenced while the campaign runs", async () => {
    const ctx = await setup();
    await ctx.engine.tick();
    expect(ctx.engine.silences(ctx.ticketOf("A").id)).toBe(true);
  });

  test("the same defect is repaired at most twice, then the card is blocked", async () => {
    const ctx = await setup();
    await ctx.engine.tick();
    const id = ctx.ticketOf("C").id;
    for (let attempt = 0; attempt < 3; attempt += 1) {
      ctx.store.updateTicket(id, { column: "failed", stage: "stalled", error: "Type error in src/a.ts line 12" });
      await ctx.engine.tick();
    }
    expect(ctx.state("C")).toBe("blocked");
    expect(ctx.store.campaigns.requireCard(ctx.campaignId, "C").repairs).toEqual([{ fingerprint: "type error in src/a.ts line <n>", count: 2 }]);
  });

  test("an environment incident is retried without counting as a repair", async () => {
    const ctx = await setup();
    await ctx.engine.tick();
    const id = ctx.ticketOf("C").id;
    ctx.store.updateTicket(id, { column: "failed", stage: "stalled", error: "ECONNRESET while pushing" });
    await ctx.engine.tick();
    expect(ctx.state("C")).toBe("running");
    expect(ctx.store.campaigns.requireCard(ctx.campaignId, "C").repairs.every((repair) => repair.fingerprint.startsWith("incident:"))).toBe(true);
  });

  test("a second approved campaign on the same repository waits for the first", async () => {
    const ctx = await setup();
    await ctx.engine.tick();
    const { campaignId: second } = await ctx.service.submitPlan({ requestId: "r2", plan: makeCampaignPlan({ title: "Second" }) });
    await ctx.service.approve({ requestId: "a2", campaignId: second, version: 1 });
    await ctx.engine.tick();
    expect(ctx.store.campaigns.require(second).status).toBe("queued");
    expect(ctx.store.campaigns.require(second).runtime.statusReason).toContain("Another campaign");
  });
});
