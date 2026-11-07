import { describe, expect, test } from "bun:test";

import type { ProviderQuota } from "../../shared/providerQuota.ts";
import type { Ticket } from "../../shared/schemas.ts";
import type { Store } from "../db/store.ts";
import type { DoneGateResult } from "../system/types.ts";
import type { PrSnapshot } from "../system/vcs/types.ts";
import { makeCampaignPlan } from "../testing/campaignFixtures.ts";

import { CampaignEngine } from "./campaignEngine.ts";
import type { CampaignPreviewState, CampaignSlots, CampaignVcs } from "./campaignEngine.ts";
import type { CampaignService } from "./campaignService.ts";
import { makeCampaignHarness, okQuota } from "./campaignTestHarness.ts";

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
    this.store.updateTicket(ticketId, { stage: "interrupted" });
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

async function setup(overrides: Parameters<typeof makeCampaignPlan>[0] = {}) {
  const harness = makeCampaignHarness();
  const { campaignId } = await harness.service.submitPlan({ requestId: "r1", plan: makeCampaignPlan(overrides) });
  await harness.service.approve({ requestId: "a1", campaignId, version: 1 });
  const slots = new FakeSlots(harness.store);
  const quota: { current: Partial<ProviderQuota> | null } = { current: {} };
  const clock = { now: Date.now() };
  const previews = new Map<string, CampaignPreviewState>();
  const stopped: string[] = [];
  const notifications: { title: string; body: string }[] = [];
  const vcs = new FakeVcs();
  const makeEngine = (service: CampaignService = harness.service) => new CampaignEngine({
    store: harness.store,
    slots,
    vcs,
    project: () => ({ repoPath: "/tmp/repo", vcsProvider: "github" }),
    skillRoots: harness.skillRoots,
    readyToStart: (campaign) => service.readyToStart(campaign),
    quota: (provider) => Promise.resolve(quota.current === null ? null : { ...okQuota(provider, clock.now), ...quota.current }),
    now: () => clock.now,
    notify: (title, body) => notifications.push({ title, body }),
    preview: { get: (id) => previews.get(id) ?? null, stop: (id) => { stopped.push(id); return Promise.resolve(); } },
  });
  const engine = makeEngine();
  engine.start(3_600_000);
  await engine.tick();
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
  return { ...harness, notifications, previews, stopped, quota, clock, campaignId, slots, vcs, engine, makeEngine, ticketOf, deliver, mother, state };
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

describe("CampaignEngine quota pause", () => {
  const HOUR_MS = 3_600_000;

  test("a quota refusal stops starts and sessions, then resumes progressively without duplicates", async () => {
    const ctx = await setup();
    await ctx.engine.tick();
    const startsBefore = ctx.slots.started.length;
    ctx.engine.recordQuotaRefusal(ctx.ticketOf("A").id, { provider: "claude", resetsAt: ctx.clock.now + HOUR_MS, reason: "Claude rate limit rejected (five_hour)." });
    await ctx.engine.tick();
    const paused = ctx.store.campaigns.require(ctx.campaignId);
    expect(paused.status).toBe("quota_paused");
    expect(paused.runtime.quotaPause).toMatchObject({ provider: "claude", estimatedResumeAt: ctx.clock.now + HOUR_MS });
    expect(["A", "C", "D"].map(ctx.state)).toEqual(["suspended", "suspended", "suspended"]);
    expect(ctx.slots.interrupted).toHaveLength(3);

    ctx.clock.now += 2 * HOUR_MS;
    await ctx.engine.tick();
    expect(ctx.store.campaigns.require(ctx.campaignId).status).toBe("running");
    await ctx.engine.tick();
    expect(["A", "C", "D"].filter((id) => ctx.state(id) === "running")).toHaveLength(1);
    await ctx.engine.tick();
    await ctx.engine.tick();
    expect(["A", "C", "D"].map(ctx.state)).toEqual(["running", "running", "running"]);
    expect(ctx.slots.started.length).toBe(startsBefore);
    expect(ctx.store.listTickets(true)).toHaveLength(4);
  });

  test("unknown quota or an exhausted budget never resumes automatically", async () => {
    const ctx = await setup();
    await ctx.engine.tick();
    ctx.engine.recordQuotaRefusal(ctx.ticketOf("A").id, { provider: "claude", resetsAt: null, reason: "rejected" });
    await ctx.engine.tick();
    ctx.quota.current = null;
    ctx.clock.now += HOUR_MS;
    await ctx.engine.tick();
    expect(ctx.store.campaigns.require(ctx.campaignId).status).toBe("quota_paused");
    ctx.quota.current = {};
    ctx.store.campaigns.updateCard(ctx.campaignId, "C", { tokensUsed: 1_000_000 });
    ctx.store.updateTicket(ctx.ticketOf("C").id, { sessionUsage: { s: { m: { input_tokens: 1_000_000, output_tokens: 0, cache_creation_input_tokens: 0, cache_read_input_tokens: 0 } } } });
    ctx.clock.now += HOUR_MS;
    await ctx.engine.tick();
    expect(ctx.store.campaigns.require(ctx.campaignId).status).toBe("quota_paused");
    expect(ctx.store.campaigns.require(ctx.campaignId).runtime.statusReason).toContain("no budget");
  });

  test("repeated refusals after a resume space out the attempts", async () => {
    const ctx = await setup();
    await ctx.engine.tick();
    const refuse = () => ctx.engine.recordQuotaRefusal(ctx.ticketOf("A").id, { provider: "codex", resetsAt: null, reason: "usage limit" });
    refuse();
    await ctx.engine.tick();
    const first = ctx.store.campaigns.require(ctx.campaignId).runtime.quotaPause;
    ctx.clock.now = (first?.nextAttemptAt ?? 0) + 1;
    await ctx.engine.tick();
    expect(ctx.store.campaigns.require(ctx.campaignId).status).toBe("running");
    refuse();
    await ctx.engine.tick();
    const second = ctx.store.campaigns.require(ctx.campaignId).runtime.quotaPause;
    expect(second?.attempts).toBe(2);
    expect((second?.nextAttemptAt ?? 0) - (second?.since ?? 0)).toBeGreaterThan((first?.nextAttemptAt ?? 0) - (first?.since ?? 0));
  });
});

describe("CampaignEngine finalization", () => {
  const HOUR_MS = 3_600_000;

  async function mergeAll(ctx: Awaited<ReturnType<typeof setup>>): Promise<void> {
    await ctx.engine.tick();
    ctx.deliver("A");
    await ctx.engine.tick();
    for (const id of ["B", "C", "D"]) ctx.deliver(id);
    await ctx.engine.tick();
  }

  function finalTicket(ctx: Awaited<ReturnType<typeof setup>>): Ticket {
    const id = ctx.store.campaigns.require(ctx.campaignId).finalTicketId;
    const ticket = id === null ? null : ctx.store.getTicket(id);
    if (!ticket) throw new Error("no final ticket");
    return ticket;
  }

  test("when every card is merged, one final autonomous card adopts the mother and targets main as a pull request only", async () => {
    const ctx = await setup();
    await mergeAll(ctx);
    await ctx.engine.tick();
    const campaign = ctx.store.campaigns.require(ctx.campaignId);
    expect(campaign.status).toBe("finalizing");
    expect(campaign.runtime.finalization?.reason).toBe("all_merged");
    const ticket = finalTicket(ctx);
    expect(ticket).toMatchObject({ autonomous: true, autonomousDelivery: "pr_only", baseBranch: "main", dependsOn: null, childOrder: null, prDraft: false });
    expect(ticket.description).toContain(ctx.mother());
    expect(ctx.slots.started).toContain(ticket.id);
    await ctx.engine.tick();
    expect(ctx.store.listTickets(true).filter((entry) => entry.autonomous)).toHaveLength(1);
  });

  test("at the deadline, finalization starts with what is merged, a draft pull request lists the gaps and no further merge happens", async () => {
    const ctx = await setup();
    await ctx.engine.tick();
    ctx.deliver("A");
    await ctx.engine.tick();
    ctx.clock.now += 7 * HOUR_MS;
    await ctx.engine.tick();
    const campaign = ctx.store.campaigns.require(ctx.campaignId);
    expect(campaign.status).toBe("finalizing");
    expect(campaign.runtime.finalization?.reason).toBe("deadline");
    expect(ctx.state("C")).toBe("suspended");
    const ticket = finalTicket(ctx);
    expect(ticket.prDraft).toBe(true);
    expect(ticket.description).toContain("C: Card C");
    ctx.deliver("C");
    await ctx.engine.tick();
    expect(ctx.vcs.merges).toHaveLength(1);
  });

  test("without any merged change no pull request is opened, and report-only plans skip the final card", async () => {
    const empty = await setup();
    await empty.engine.tick();
    empty.clock.now += 7 * HOUR_MS;
    await empty.engine.tick();
    expect(empty.store.campaigns.require(empty.campaignId).status).toBe("awaiting_report");
    expect(empty.store.campaigns.require(empty.campaignId).finalTicketId).toBeNull();

    const reportOnly = await setup({ partialDelivery: "report_only" });
    await reportOnly.engine.tick();
    reportOnly.deliver("A");
    await reportOnly.engine.tick();
    reportOnly.clock.now += 7 * HOUR_MS;
    await reportOnly.engine.tick();
    expect(reportOnly.store.campaigns.require(reportOnly.campaignId).status).toBe("awaiting_report");
    expect(reportOnly.store.campaigns.require(reportOnly.campaignId).finalTicketId).toBeNull();
    expect(reportOnly.store.campaigns.require(reportOnly.campaignId).runtime.statusReason).toContain("report only");
  });

  test("the delivered pull request, frozen revision and preview are recorded, then the preview is cleaned after the review time", async () => {
    const ctx = await setup();
    await mergeAll(ctx);
    await ctx.engine.tick();
    const ticket = finalTicket(ctx);
    const state = ctx.store.ensureAutonomousExecution(ticket.id);
    if (!state) throw new Error("no autonomous state");
    ctx.previews.set("p1", { id: "p1", url: "https://user:secret@preview.example.com/?token=x", cleanupStatus: "pending", error: null });
    ctx.store.updateTicket(ticket.id, { column: "done", prUrl: "https://github.com/o/r/pull/99", autonomousState: { ...state, phase: "completed", revision: "c".repeat(40), previewId: "p1" } });
    await ctx.engine.tick();
    const finalization = ctx.store.campaigns.require(ctx.campaignId).runtime.finalization;
    expect(ctx.store.campaigns.require(ctx.campaignId).status).toBe("awaiting_report");
    expect(finalization).toMatchObject({ prUrl: "https://github.com/o/r/pull/99", prDraft: false, frozenRevision: "c".repeat(40), previewId: "p1" });
    expect(finalization?.criteria).toEqual([{ id: "G1", status: "missing", evidence: null, revision: null }]);
    await ctx.engine.tick();
    expect(ctx.stopped).toEqual([]);
    ctx.clock.now += 11 * HOUR_MS;
    await ctx.engine.tick();
    expect(ctx.stopped).toEqual(["p1"]);
    ctx.previews.set("p1", { id: "p1", url: null, cleanupStatus: "failed", error: "Coolify refused deletion" });
    await ctx.engine.tick();
    expect(ctx.store.campaigns.require(ctx.campaignId).runtime.finalization).toMatchObject({ previewCleanup: "failed", previewCleanupError: "Coolify refused deletion" });
  });

  test("the final card refuses merge delivery", async () => {
    const ctx = await setup();
    await mergeAll(ctx);
    await ctx.engine.tick();
    const ticket = finalTicket(ctx);
    expect(() => ctx.engine.assertMayStart({ ...ticket, autonomousDelivery: "merge" })).toThrow(/pull request only/);
    expect(ctx.engine.ownsMerge(ticket.id)).toBe(true);
  });
});

describe("CampaignEngine report and user commands", () => {
  const HOUR_MS = 3_600_000;

  test("the verdict priority is unknown, then ready, partial, blocked", async () => {
    const { campaignVerdict } = await import("./report.ts");
    const ctx = await setup();
    await ctx.engine.tick();
    const campaign = ctx.store.campaigns.require(ctx.campaignId);
    const plan = ctx.store.campaigns.requireVersion(ctx.campaignId, 1).plan;
    const cards = ctx.store.campaigns.listCards(ctx.campaignId);
    const base = { campaign, plan, cards, operations: [], skills: [], activeSessions: 0, finalTokens: 0, now: ctx.clock.now };
    expect(campaignVerdict(base)).toBe("blocked");
    const merged = cards.map((card) => ({ ...card, state: "merged" as const }));
    expect(campaignVerdict({ ...base, cards: merged })).toBe("partial");
    const finalization = { startedAt: 0, reason: "all_merged" as const, frozenRevision: "r1", targetBranch: "main", prUrl: "https://github.com/o/r/pull/9", prDraft: false, previewUrl: null, previewId: null, previewKeepUntil: null, previewCleanup: null, previewCleanupError: null, criteria: [{ id: "G1", status: "passed" as const, evidence: "shot.png", revision: "r1" }], reserveUsedTokens: 0 };
    const ready = { ...campaign, runtime: { ...campaign.runtime, finalization } };
    expect(campaignVerdict({ ...base, campaign: ready, cards: merged })).toBe("ready");
    expect(campaignVerdict({ ...base, campaign: ready, cards: merged, activeSessions: 1 })).toBe("unknown");
    const stale = { ...ready, runtime: { ...ready.runtime, finalization: { ...finalization, criteria: [{ ...finalization.criteria[0], id: "G1", status: "passed" as const, evidence: "x", revision: "old" }] } } };
    expect(campaignVerdict({ ...base, campaign: stale, cards: merged })).toBe("partial");
  });

  test("the report is produced once at the report time with a single aggregated notification", async () => {
    const ctx = await setup();
    await ctx.engine.tick();
    ctx.deliver("A");
    await ctx.engine.tick();
    expect(ctx.notifications).toEqual([]);
    ctx.clock.now += 6 * HOUR_MS + 1;
    await ctx.engine.tick();
    await ctx.engine.tick();
    expect(ctx.notifications).toEqual([]);
    ctx.store.updateTicket(ctx.store.campaigns.require(ctx.campaignId).finalTicketId ?? "", { column: "abandoned" });
    await ctx.engine.tick();
    ctx.clock.now += HOUR_MS;
    await ctx.engine.tick();
    await ctx.engine.tick();
    const campaign = ctx.store.campaigns.require(ctx.campaignId);
    expect(campaign.status).toBe("finished");
    expect(campaign.report?.cards).toMatchObject({ merged: 1, total: 4 });
    expect(ctx.notifications).toHaveLength(1);
    expect(ctx.notifications[0]?.title).toContain("Campaign");
  });

  test("pausing waits for the current pass, stops sessions and keeps identities; resuming restarts progressively", async () => {
    const ctx = await setup();
    await ctx.engine.tick();
    const paused = await ctx.engine.requestPause(ctx.campaignId);
    expect(paused.status).toBe("paused");
    expect(["A", "C", "D"].map(ctx.state)).toEqual(["suspended", "suspended", "suspended"]);
    ctx.deliver("A");
    await ctx.engine.tick();
    expect(ctx.vcs.merges).toEqual([]);
    const resumed = await ctx.engine.resume(ctx.campaignId, null);
    expect(resumed.status).toBe("running");
    await ctx.engine.tick();
    expect(ctx.store.listTickets(true)).toHaveLength(4);
  });

  test("pause is refused during a quota pause, and resuming after the deadline requires a new deadline and budget", async () => {
    const ctx = await setup();
    await ctx.engine.tick();
    ctx.engine.recordQuotaRefusal(ctx.ticketOf("A").id, { provider: "claude", resetsAt: null, reason: "rejected" });
    await ctx.engine.tick();
    expect(ctx.engine.requestPause(ctx.campaignId)).rejects.toThrow(/quota pause/);
    const fresh = await setup();
    await fresh.engine.tick();
    await fresh.engine.requestPause(fresh.campaignId);
    fresh.clock.now += 7 * HOUR_MS;
    expect(fresh.engine.resume(fresh.campaignId, null)).rejects.toThrow(/new deadline/);
    const resumed = await fresh.engine.resume(fresh.campaignId, { deadlineAt: new Date(fresh.clock.now + 2 * HOUR_MS).toISOString(), additionalTokens: 200_000 });
    expect(resumed.status).toBe("running");
    expect(resumed.runtime.extensions).toHaveLength(1);
  });

  test("cancelling keeps merges and branches, stops sessions and produces the report", async () => {
    const ctx = await setup();
    await ctx.engine.tick();
    ctx.deliver("A");
    await ctx.engine.tick();
    const cancelled = await ctx.engine.cancel(ctx.campaignId);
    expect(cancelled.status).toBe("cancelled");
    expect(ctx.state("A")).toBe("merged");
    expect(ctx.vcs.branches.has(ctx.mother())).toBe(true);
    expect(cancelled.report?.verdict).toBe("partial");
    expect(ctx.notifications).toHaveLength(1);
  });

  test("service commands are idempotent per request id and refuse a stale version", async () => {
    const ctx = await setup();
    ctx.service.attachLifecycle(ctx.engine);
    await ctx.engine.tick();
    const first = await ctx.service.pause({ requestId: "p1", campaignId: ctx.campaignId });
    const replay = await ctx.service.pause({ requestId: "p1", campaignId: ctx.campaignId });
    expect(replay).toEqual(first);
    await expect(ctx.service.resume({ requestId: "r9", campaignId: ctx.campaignId, version: 3 })).rejects.toThrow(/current version is 1/);
  });
});

describe("CampaignEngine restart reconciliation", () => {
  test("an unreachable remote during reconciliation puts the campaign in unknown and nothing starts until resume", async () => {
    const ctx = await setup();
    await ctx.engine.tick();
    ctx.deliver("C");
    ctx.store.campaigns.beginOperation(ctx.campaignId, `merge:${ctx.campaignId}:C:0`, "merge_card", { cardId: "C", prUrl: ctx.ticketOf("C").prUrl });
    const restarted = ctx.makeEngine();
    const readPr = ctx.vcs.readPr.bind(ctx.vcs);
    ctx.vcs.readPr = () => Promise.reject(new Error("gh: network unreachable"));
    restarted.start(60_000);
    await restarted.stop();
    const unknown = ctx.store.campaigns.require(ctx.campaignId);
    expect(unknown.status).toBe("unknown");
    expect(unknown.runtime.reconciliationError).toContain("network");
    const startsBefore = ctx.slots.started.length;
    await restarted.tick();
    expect(ctx.slots.started.length).toBe(startsBefore);
    ctx.vcs.readPr = readPr;
    const resumed = await restarted.resume(ctx.campaignId, null);
    expect(resumed.status).toBe("running");
    expect(resumed.runtime.reconciledAt).not.toBeNull();
  });
});
