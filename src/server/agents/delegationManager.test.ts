import type { Database } from "bun:sqlite";

import { afterAll, beforeAll, describe, expect, test } from "bun:test";

import { DELEGATION_SLOT_ID, MAX_PARALLEL_IMPLEMENTERS } from "../../shared/constants.ts";
import type { ReviewKind } from "../../shared/protocol.ts";
import type { Ticket } from "../../shared/schemas.ts";
import { ticketSchema } from "../../shared/schemas.ts";
import { initProjectRegistry } from "../config.ts";
import { createDatabase } from "../db/schema.ts";
import { Store } from "../db/store.ts";
import { ClientHub } from "../hub.ts";
import type { AgentSessionHandle, AgentSessionOptions, AgentTurnUsage } from "../system/agentSession.ts";
import { FakeSystemAdapter } from "../system/fake.ts";
import { FIXTURE_PROJECT_KEY } from "../testing/fixtures.ts";
import { removeDbFiles, tmpDbPath } from "../testing/tmpDb.ts";

import { DelegationManager } from "./delegationManager.ts";
import { SessionHub } from "./sessionHub.ts";

interface RecordedSession {
  opts: AgentSessionOptions;
  sent: string[];
  closed: boolean;
  interrupted: boolean;
  disposed: boolean;
}

/** Fake adapter that records every spawned session and exposes its onEvent for test-driven streams. */
class RecordingSystemAdapter extends FakeSystemAdapter {
  readonly sessions: RecordedSession[] = [];
  fingerprint = "code-v1";
  hangOnClose = false;
  throwOnClose = false;
  runtimeGate: Promise<void> | null = null;

  override async codeFingerprint(): Promise<string> {
    return this.fingerprint;
  }

  override async checkCodexRuntime() {
    await this.runtimeGate;
    return super.checkCodexRuntime();
  }

  override startAgentSession(opts: AgentSessionOptions): AgentSessionHandle {
    const record: RecordedSession = { opts, sent: [], closed: false, interrupted: false, disposed: false };
    this.sessions.push(record);
    return {
      ticketId: opts.ticketId,
      send: (content) => {
        record.sent.push(content);
        return "fixture-message";
      },
      interrupt: async () => {
        record.interrupted = true;
      },
      close: () => {
        record.closed = true;
        if (this.throwOnClose) throw new Error("close sync failure");
        if (this.hangOnClose) return new Promise<void>(() => undefined);
        return Promise.resolve();
      },
      dispose: () => { record.disposed = true; },
    };
  }
}

const CHILD_USAGE: Record<string, AgentTurnUsage> = {
  "gpt-5.6-sol": { inputTokens: 100, outputTokens: 50, cacheReadTokens: 10, cacheCreationTokens: 0, costUsd: 0 },
};

/** The settle path defers one tick to capture trailing error details; wait past it. */
const SETTLE_WAIT_MS = 120;
const LIGHT_REVIEW_KINDS: readonly ReviewKind[] = ["quality", "conventions", "regression", "logic"];
const FULL_REVIEW_KINDS: readonly ReviewKind[] = [...LIGHT_REVIEW_KINDS, "architecture", "security"];

function reviewFinding(severity: "critical" | "major" | "minor", id = "finding-1") {
  return {
    id,
    severity,
    summary: "Finding vérifiable",
    evidence: "src/example.ts:12 démontre le problème",
    ruleSource: null,
    path: "src/example.ts",
    line: 12,
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

let dbPath = "";
let db: Database;
let store: Store;

beforeAll(() => {
  dbPath = tmpDbPath();
  db = createDatabase(dbPath);
  store = new Store(db);
  store.createProject(FIXTURE_PROJECT_KEY, {
    label: "Test Project",
    repoPath: "/tmp/repo",
    baseBranch: "main",
    commitTimeoutMs: 60_000,
    defaultAutoMerge: false,
    defaultAddScreenshots: false,
  });
  initProjectRegistry(store);
});

afterAll(() => {
  db.close();
  removeDbFiles(dbPath);
});

function setup(closeTimeoutMs?: number): { system: RecordingSystemAdapter; sessionHub: SessionHub; delegation: DelegationManager } {
  const system = new RecordingSystemAdapter();
  const sessionHub = new SessionHub(system);
  const delegation = new DelegationManager(store, system, sessionHub, new ClientHub(store), closeTimeoutMs);
  // Mirrors the index.ts wiring: any parent-session teardown kills its delegated child.
  sessionHub.onDisconnect((ticketId) => delegation.stop(ticketId));
  return { system, sessionHub, delegation };
}

function newDelegatedTicket(): Ticket {
  return store.createTicket({
    title: "Ticket délégué",
    description: "Une feature implémentée par Codex sous orchestrateur Claude.",
    externalUrl: null,
    project: FIXTURE_PROJECT_KEY,
    prdEnabled: false,
    prDraft: true,
    autoMerge: false,
    addScreenshots: false,
    verifyFeature: false,
    argusMultiLoop: false,
    stealth: false,
    directPush: false,
    baseBranch: null,
    dependsOn: null,
    model: null,
    effort: null,
    implementerModel: null,
    implementerEffort: null,
    implementer: "codex",
    orchestrator: "claude",
    codexModel: "gpt-5.6-sol",
    codexEffort: "high",
    codexImplementerModel: "gpt-5.6-terra",
    codexImplementerEffort: "low",
    codexImplementerFast: false,
  });
}

/** Start a parent Claude session for the ticket so implementation_done has a live target. */
function startParentSession(sessionHub: SessionHub, ticketId: string): void {
  sessionHub.start({
    ticketId,
    slotId: 3,
    cwd: "/tmp/slot-3",
    provider: "claude",
    model: "opus",
    effort: null,
    role: "orchestrator",
    permissionMode: "dontAsk",
  });
}

async function startAndApproveReviews(
  delegation: DelegationManager,
  system: RecordingSystemAdapter,
  ticket: Ticket,
  kinds: readonly ReviewKind[],
): Promise<void> {
  const starts = await Promise.all(
    kinds.map((kind) => delegation.startReview(ticket, 3, kind, `diff ${kind}`)),
  );
  expect(starts.every((outcome) => outcome.ok)).toBe(true);
  const reviews = system.sessions.slice(-kinds.length);
  expect(reviews).toHaveLength(kinds.length);
  for (const [index, review] of reviews.entries()) {
    const kind = kinds[index];
    if (!review || !kind) throw new Error("review session missing");
    await review.opts.onToolCall("submit_review", {
      verdict: "approve",
      summary: `${kind} validé`,
      findings: [],
    });
    review.opts.onEvent({
      type: "turn_end",
      ok: true,
      subtype: "success",
      sessionId: `review-${kind}`,
      usageByModel: {},
    });
  }
  await sleep(SETTLE_WAIT_MS);
}

describe("DelegationManager.start", () => {
  test("spawns a bare Codex child in the slot worktree with the ticket's codex knobs and the plan", async () => {
    const { system, delegation } = setup();
    const ticket = newDelegatedTicket();

    const outcome = await delegation.start(ticket, 3, "PLAN: implémenter la feature X", "principal");

    expect(outcome.ok).toBe(true);
    expect(delegation.isActive(ticket.id)).toBe(true);
    expect(system.sessions).toHaveLength(1);
    const child = system.sessions[0];
    if (!child) throw new Error("child session missing");
    expect(child.opts.provider).toBe("codex");
    expect(child.opts.slotId).toBe(DELEGATION_SLOT_ID);
    expect(child.opts.disableWorkerTools).toBe(true);
    expect(child.opts.cwd.endsWith("slot-3")).toBe(true);
    expect(child.opts.model).toBe("gpt-5.6-terra");
    expect(child.opts.effort).toBe("low");
    expect(child.opts.serviceTier).toBe("default");
    expect(child.sent).toHaveLength(1);
    expect(child.sent[0]).toContain("PLAN: implémenter la feature X");
    expect(child.sent[0]).toContain("Ne commit JAMAIS");
  });

  test("uses the parent generation's captured delegate config after the ticket is edited", async () => {
    const { system, sessionHub, delegation } = setup();
    const ticket = newDelegatedTicket();
    sessionHub.start({
      ticketId: ticket.id,
      slotId: 3,
      cwd: "/tmp/slot-3",
      provider: "claude",
      model: "opus",
      effort: "medium",
      role: "orchestrator",
      permissionMode: "dontAsk",
      delegateProvider: "codex",
      delegateModel: "gpt-5.6-sol",
      delegateEffort: "high",
      delegateServiceTier: "fast",
    });
    const edited = store.updateTicket(ticket.id, {
      codexImplementerModel: "gpt-5.6-terra",
      codexImplementerEffort: "low",
      codexImplementerFast: false,
    });

    expect((await delegation.start(edited, 3, "plan capturé", "principal")).ok).toBe(true);
    expect(system.sessions[1]?.opts).toMatchObject({ model: "gpt-5.6-sol", effort: "high", serviceTier: "fast" });
  });

  test("refuses a second delegation with the same label", async () => {
    const { delegation } = setup();
    const ticket = newDelegatedTicket();

    expect((await delegation.start(ticket, 3, "plan", "principal")).ok).toBe(true);
    const second = await delegation.start(ticket, 3, "plan bis", "principal");
    expect(second.ok).toBe(false);
    expect(second.result).toContain("déjà en cours");
  });

  test(`refuses one lot beyond MAX_PARALLEL_IMPLEMENTERS (${MAX_PARALLEL_IMPLEMENTERS})`, async () => {
    const { delegation } = setup();
    const ticket = newDelegatedTicket();

    for (let index = 0; index < MAX_PARALLEL_IMPLEMENTERS; index += 1) {
      expect((await delegation.start(ticket, 3, `plan ${index}`, `lot-${index}`)).ok).toBe(true);
    }
    const refused = await delegation.start(ticket, 3, "plan de trop", "lot-en-trop");
    expect(refused.ok).toBe(false);
    expect(refused.result).toContain(String(MAX_PARALLEL_IMPLEMENTERS));
  });

  test("stop closes every child lot of the ticket", async () => {
    const { system, delegation } = setup();
    const ticket = newDelegatedTicket();
    expect((await delegation.start(ticket, 3, "plan A", "lot-a")).ok).toBe(true);
    expect((await delegation.start(ticket, 3, "plan B", "lot-b")).ok).toBe(true);

    delegation.stop(ticket.id);

    expect(delegation.isActive(ticket.id)).toBe(false);
    expect(system.sessions).toHaveLength(2);
    expect(system.sessions.every((session) => session.interrupted && session.closed)).toBe(true);
  });

  test("does not spawn a child when the parent stops during capability validation", async () => {
    const { system, delegation } = setup();
    const ticket = newDelegatedTicket();
    let release = (): void => undefined;
    system.runtimeGate = new Promise<void>((resolve) => { release = resolve; });

    const starting = delegation.start(ticket, 3, "plan", "principal");
    delegation.stop(ticket.id);
    release();

    expect((await starting).ok).toBe(false);
    expect(system.sessions).toHaveLength(0);
  });
});

describe("DelegationManager — settlement", () => {
  test("child turn_end ok → implementation_done (with summary) sent to the parent, usage summed on the ticket", async () => {
    const { system, sessionHub, delegation } = setup();
    const ticket = newDelegatedTicket();
    startParentSession(sessionHub, ticket.id);
    await delegation.start(ticket, 3, "plan", "principal");
    const [parent, child] = system.sessions;
    if (!parent || !child) throw new Error("sessions missing");

    child.opts.onEvent({ type: "init", sessionId: "codex-thread-1" });
    child.opts.onEvent({ type: "assistant_text", text: "Résumé final : feature X implémentée." });
    child.opts.onEvent({ type: "turn_end", ok: true, subtype: "success", sessionId: "codex-thread-1", usageByModel: CHILD_USAGE });
    await sleep(SETTLE_WAIT_MS);

    expect(delegation.isActive(ticket.id)).toBe(false);
    expect(child.closed).toBe(true);
    const doneEvent = parent.sent.find((m) => m.includes("Implémentation déléguée terminée"));
    expect(doneEvent).toBeDefined();
    expect(doneEvent).toContain("Résumé final : feature X implémentée.");
    const usage = store.getTicket(ticket.id)?.sessionUsage["codex-thread-1"]?.["gpt-5.6-sol"];
    expect(usage?.input_tokens).toBe(100);
    expect(usage?.output_tokens).toBe(50);
    expect(usage?.cache_read_input_tokens).toBe(10);
  });

  test("two lots settle independently, each implementation_done carrying its label and remaining count", async () => {
    const { system, sessionHub, delegation } = setup();
    const ticket = newDelegatedTicket();
    startParentSession(sessionHub, ticket.id);
    expect((await delegation.start(ticket, 3, "plan A", "lot-a")).ok).toBe(true);
    expect((await delegation.start(ticket, 3, "plan B", "lot-b")).ok).toBe(true);
    const [parent, childA, childB] = system.sessions;
    if (!parent || !childA || !childB) throw new Error("sessions missing");

    childA.opts.onEvent({ type: "assistant_text", text: "Lot A implémenté." });
    childA.opts.onEvent({ type: "turn_end", ok: true, subtype: "success", sessionId: "codex-a", usageByModel: {} });
    await sleep(SETTLE_WAIT_MS);

    expect(delegation.isActive(ticket.id)).toBe(true);
    const firstDone = parent.sent.at(-1);
    expect(firstDone).toContain("«lot-a»");
    expect(firstDone).toContain("Il reste 1 lot en cours");

    childB.opts.onEvent({ type: "assistant_text", text: "Lot B implémenté." });
    childB.opts.onEvent({ type: "turn_end", ok: true, subtype: "success", sessionId: "codex-b", usageByModel: {} });
    await sleep(SETTLE_WAIT_MS);

    expect(delegation.isActive(ticket.id)).toBe(false);
    const secondDone = parent.sent.at(-1);
    expect(secondDone).toContain("«lot-b»");
    expect(secondDone).toContain("Tous les lots sont terminés.");
  });

  test("a lot still inside its capability check counts in the remaining lots of a settling lot", async () => {
    const { system, sessionHub, delegation } = setup();
    const ticket = newDelegatedTicket();
    startParentSession(sessionHub, ticket.id);
    expect((await delegation.start(ticket, 3, "plan A", "lot-a")).ok).toBe(true);
    let release = (): void => undefined;
    system.runtimeGate = new Promise<void>((resolve) => { release = resolve; });
    const startingB = delegation.start(ticket, 3, "plan B", "lot-b");
    const [parent, childA] = system.sessions;
    if (!parent || !childA) throw new Error("sessions missing");

    childA.opts.onEvent({ type: "turn_end", ok: true, subtype: "success", sessionId: "codex-a", usageByModel: {} });
    await sleep(SETTLE_WAIT_MS);

    expect(parent.sent.at(-1)).toContain("Il reste 1 lot en cours");
    release();
    expect((await startingB).ok).toBe(true);
  });

  test("delegate_review is refused while an implementation lot still runs", async () => {
    const { delegation } = setup();
    const ticket = newDelegatedTicket();
    expect((await delegation.start(ticket, 3, "plan A", "lot-a")).ok).toBe(true);

    const review = await delegation.startReview(ticket, 3, "quality", "diff");

    expect(review.ok).toBe(false);
    expect(review.result).toContain("Des lots d'implémentation sont encore en cours");
  });

  test("child turn_end error → failure event carrying the trailing error detail", async () => {
    const { system, sessionHub, delegation } = setup();
    const ticket = newDelegatedTicket();
    startParentSession(sessionHub, ticket.id);
    await delegation.start(ticket, 3, "plan", "principal");
    const [parent, child] = system.sessions;
    if (!parent || !child) throw new Error("sessions missing");

    // codexProvider order on turn.failed: turn_end first, THEN the error detail.
    child.opts.onEvent({ type: "turn_end", ok: false, subtype: "error", sessionId: "", usageByModel: {} });
    child.opts.onEvent({ type: "error", message: "Authentification Codex refusée" });
    await sleep(SETTLE_WAIT_MS);

    expect(delegation.isActive(ticket.id)).toBe(false);
    const failEvent = parent.sent.find((m) => m.includes("Implémentation déléguée ÉCHOUÉE"));
    expect(failEvent).toBeDefined();
    expect(failEvent).toContain("Authentification Codex refusée");
  });
});

  describe("DelegationManager — cascade kill", () => {
    test("parent disconnect kills the child and drops its stale events", async () => {
    const { system, sessionHub, delegation } = setup();
    const ticket = newDelegatedTicket();
    startParentSession(sessionHub, ticket.id);
    await delegation.start(ticket, 3, "plan", "principal");
    const child = system.sessions[1];
    if (!child) throw new Error("child session missing");

    sessionHub.disconnect(ticket.id);

    expect(delegation.isActive(ticket.id)).toBe(false);
    expect(child.interrupted).toBe(true);
    expect(child.closed).toBe(true);
    // A stale turn_end after the kill must not settle (no throw, no event, no resurrection).
    child.opts.onEvent({ type: "turn_end", ok: true, subtype: "success", sessionId: "s", usageByModel: {} });
    await sleep(SETTLE_WAIT_MS);
    expect(delegation.isActive(ticket.id)).toBe(false);
    });

    test("a child that ignores close is disposed before shutdown drain returns", async () => {
      const { system, delegation } = setup(5);
      const ticket = newDelegatedTicket();
      await delegation.start(ticket, 3, "plan", "principal");
      system.hangOnClose = true;

      delegation.stop(ticket.id);
      await delegation.drainClosingSessions();

      expect(system.sessions[0]?.disposed).toBe(true);
    });

    test("a synchronous close failure still disposes and finalizes the child", async () => {
      const { system, delegation } = setup(5);
      const ticket = newDelegatedTicket();
      await delegation.start(ticket, 3, "plan", "principal");
      system.throwOnClose = true;

      delegation.stop(ticket.id);
      await delegation.drainClosingSessions();

      expect(system.sessions[0]?.disposed).toBe(true);
      expect(store.listExecutionRuns("ticket", ticket.id)[0]?.status).toBe("cancelled");
    });
  });

describe("DelegationManager — independent reviews", () => {
  test("light runs four independent reviewer sessions and requires every approval", async () => {
    const { system, sessionHub, delegation } = setup();
    const created = newDelegatedTicket();
    const ticket = ticketSchema.parse({ ...created, orchestrator: "codex", reviewDepth: "light" });
    startParentSession(sessionHub, ticket.id);

    await startAndApproveReviews(delegation, system, ticket, LIGHT_REVIEW_KINDS);
    expect(delegation.hasActiveReviews(ticket.id)).toBe(false);
    expect(await delegation.reviewsApproved(ticket.id, 3)).toBe(true);
    expect(delegation.reviewRequiresApproval(ticket.id)).toBe(true);
    const reviewerTicketIds = new Set(system.sessions.slice(1).map((session) => session.opts.ticketId));
    expect(reviewerTicketIds.size).toBe(4);
    expect(system.sessions.slice(1).every((session) => session.opts.readOnly && session.opts.role === "reviewer")).toBe(true);
  });

  test("full adds architecture and security for six independent sessions", async () => {
    const { system, sessionHub, delegation } = setup();
    const created = newDelegatedTicket();
    const ticket = ticketSchema.parse({ ...created, orchestrator: "codex", reviewDepth: "full" });
    startParentSession(sessionHub, ticket.id);

    await startAndApproveReviews(delegation, system, ticket, FULL_REVIEW_KINDS);

    expect(system.sessions).toHaveLength(7);
    expect(system.sessions[5]?.sent[0]).toContain("architecturales");
    expect(system.sessions[6]?.sent[0]).toContain("failles de sécurité");
    expect(await delegation.reviewsApproved(ticket.id, 3)).toBe(true);
  });

  test("approvals survive a manager restart but a code change invalidates the gate", async () => {
    const { system, sessionHub, delegation } = setup();
    const created = newDelegatedTicket();
    const ticket = ticketSchema.parse({ ...created, orchestrator: "codex", reviewDepth: "light" });
    startParentSession(sessionHub, ticket.id);
    await startAndApproveReviews(delegation, system, ticket, LIGHT_REVIEW_KINDS);

    const restarted = new DelegationManager(store, system, sessionHub, new ClientHub(store));
    expect(await restarted.reviewsApproved(ticket.id, 3)).toBe(true);

    system.fingerprint = "code-v2";
    expect(await restarted.reviewsApproved(ticket.id, 3)).toBe(false);
  });

  test("a missing submit_review never becomes an approval", async () => {
    const { system, sessionHub, delegation } = setup();
    const created = newDelegatedTicket();
    const ticket = store.updateTicket(created.id, { orchestrator: "codex" });
    startParentSession(sessionHub, ticket.id);
    expect((await delegation.startReview(ticket, 3, "quality", "diff")).ok).toBe(true);
    const review = system.sessions[1];
    if (!review) throw new Error("review session missing");

    review.opts.onEvent({ type: "turn_end", ok: true, subtype: "success", sessionId: "review-empty", usageByModel: {} });
    await sleep(SETTLE_WAIT_MS);

    expect(await delegation.reviewsApproved(ticket.id, 3)).toBe(false);
    const parent = system.sessions[0];
    expect(parent?.sent.some((message) => message.includes("review quality ÉCHOUÉE"))).toBe(true);
  });

  test("a revise result completes a read-only review pass without becoming an approval", async () => {
    const { system, sessionHub, delegation } = setup();
    const created = newDelegatedTicket();
    const ticket = ticketSchema.parse({
      ...created,
      kind: "review",
      orchestrator: "codex",
      reviewDepth: "light",
      fixComments: false,
      prHeadBranch: "feat/review",
    });
    startParentSession(sessionHub, ticket.id);

    for (const kind of LIGHT_REVIEW_KINDS) {
      expect((await delegation.startReview(ticket, 3, kind, `diff ${kind}`)).ok).toBe(true);
    }
    const reviews = system.sessions.slice(-LIGHT_REVIEW_KINDS.length);
    for (const [index, review] of reviews.entries()) {
      const kind = LIGHT_REVIEW_KINDS[index];
      if (!review || !kind) throw new Error("review session missing");
      await review.opts.onToolCall("submit_review", {
        verdict: kind === "conventions" ? "revise" : "approve",
        summary: `${kind} terminé`,
        findings: kind === "conventions" ? [reviewFinding("minor")] : [],
      });
      review.opts.onEvent({ type: "turn_end", ok: true, subtype: "success", sessionId: `review-${kind}`, usageByModel: {} });
    }
    await sleep(SETTLE_WAIT_MS);

    expect(await delegation.reviewsCompleted(ticket.id, 3)).toBe(true);
    expect(await delegation.reviewsApproved(ticket.id, 3)).toBe(false);
    expect(delegation.reviewRequiresApproval(ticket.id)).toBe(false);
    const restarted = new DelegationManager(store, system, sessionHub, new ClientHub(store));
    expect(await restarted.reviewsCompleted(ticket.id, 3)).toBe(true);
    expect(store.getReviewPass(ticket.id)?.results.conventions?.findings[0]?.summary).toBe("Finding vérifiable");
  });

  test("important findings wait for an independent verification and persist its calibrated result", async () => {
    const { system, sessionHub, delegation } = setup();
    const created = newDelegatedTicket();
    const ticket = ticketSchema.parse({ ...created, orchestrator: "codex", reviewDepth: "light" });
    startParentSession(sessionHub, ticket.id);
    expect((await delegation.startReview(ticket, 3, "quality", "diff")).ok).toBe(true);
    const review = system.sessions[1];
    if (!review) throw new Error("review session missing");
    await review.opts.onToolCall("submit_review", {
      verdict: "revise",
      summary: "impact important proposé",
      findings: [reviewFinding("critical")],
    });
    review.opts.onEvent({ type: "turn_end", ok: true, subtype: "success", sessionId: "review-quality", usageByModel: {} });
    await sleep(SETTLE_WAIT_MS);

    const passDuringVerification = store.getReviewPass(ticket.id);
    expect(passDuringVerification?.results.quality?.status).toBe("pending");
    expect(passDuringVerification?.results.quality?.verificationStatus).toBe("pending");
    expect((await delegation.startReview(ticket, 3, "logic", "diff concurrent")).ok).toBe(true);
    expect(store.getReviewPass(ticket.id)?.passId).toBe(passDuringVerification?.passId);
    expect(store.getReviewPass(ticket.id)?.results.quality?.verificationStatus).toBe("pending");
    const verifier = system.sessions[2];
    if (!verifier) throw new Error("verification session missing");
    expect(verifier.sent[0]).toContain("contre-vérifies indépendamment");
    await verifier.opts.onToolCall("submit_review", {
      verdict: "revise",
      summary: "impact confirmé mais local",
      findings: [reviewFinding("minor")],
    });
    verifier.opts.onEvent({ type: "turn_end", ok: true, subtype: "success", sessionId: "verify-quality", usageByModel: {} });
    await sleep(SETTLE_WAIT_MS);

    const result = store.getReviewPass(ticket.id)?.results.quality;
    expect(result?.status).toBe("completed");
    expect(result?.verificationStatus).toBe("verified");
    expect(result?.findings[0]?.severity).toBe("minor");
    expect(result?.findings[0]?.verificationStatus).toBe("demoted");
    expect(result?.findings[0]?.originalSeverity).toBe("critical");
  });

  test("a verifier without a result retries once then keeps the dimension incomplete", async () => {
    const { system, sessionHub, delegation } = setup();
    const created = newDelegatedTicket();
    const ticket = ticketSchema.parse({ ...created, orchestrator: "codex", reviewDepth: "light" });
    startParentSession(sessionHub, ticket.id);
    expect((await delegation.startReview(ticket, 3, "logic", "diff")).ok).toBe(true);
    const review = system.sessions[1];
    if (!review) throw new Error("review session missing");
    await review.opts.onToolCall("submit_review", {
      verdict: "revise",
      summary: "régression proposée",
      findings: [reviewFinding("major")],
    });
    review.opts.onEvent({ type: "turn_end", ok: true, subtype: "success", sessionId: "review-logic", usageByModel: {} });
    await sleep(SETTLE_WAIT_MS);

    const firstVerifier = system.sessions[2];
    if (!firstVerifier) throw new Error("first verification missing");
    firstVerifier.opts.onEvent({ type: "turn_end", ok: true, subtype: "success", sessionId: "verify-logic-1", usageByModel: {} });
    await sleep(SETTLE_WAIT_MS);
    const secondVerifier = system.sessions[3];
    if (!secondVerifier) throw new Error("second verification missing");
    secondVerifier.opts.onEvent({ type: "turn_end", ok: true, subtype: "success", sessionId: "verify-logic-2", usageByModel: {} });
    await sleep(SETTLE_WAIT_MS);

    const result = store.getReviewPass(ticket.id)?.results.logic;
    expect(result?.status).toBe("failed");
    expect(result?.verificationStatus).toBe("failed");
    expect(system.sessions).toHaveLength(4);
  });

  test("stopping a parent cancels reviewer starts that are still queued", async () => {
    const { system, delegation } = setup();
    const ticket = ticketSchema.parse({ ...newDelegatedTicket(), orchestrator: "codex", reviewDepth: "light" });
    const first = delegation.startReview(ticket, 3, "quality", "diff");
    const second = delegation.startReview(ticket, 3, "logic", "diff");
    delegation.stop(ticket.id);

    expect((await first).ok).toBe(false);
    expect((await second).ok).toBe(false);
    expect(system.sessions).toHaveLength(0);
  });
});
