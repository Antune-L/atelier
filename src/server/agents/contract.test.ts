import type { Database } from "bun:sqlite";

import { afterAll, beforeAll, describe, expect, test } from "bun:test";

import { isAllowedAgentPair } from "../../shared/constants.ts";
import type { CommitLanguage, Implementer, Orchestrator } from "../../shared/constants.ts";
import { initProjectRegistry } from "../config.ts";
import { createDatabase } from "../db/schema.ts";
import { Store } from "../db/store.ts";
import { FIXTURE_PROJECT_KEY, makeTicket } from "../testing/fixtures.ts";
import { removeDbFiles, tmpDbPath } from "../testing/tmpDb.ts";

import {
  buildAskContract,
  buildCleanContract,
  buildConflictResolutionContract,
  buildReviewContract,
  buildTicketContract,
} from "./contract.ts";

const COMMIT_LANGUAGE: CommitLanguage = "en";
const TICKET_OPTS = { composerScriptPath: "/tmp/composer-driver.sh", commitLanguage: COMMIT_LANGUAGE, baseBranch: "main" };
const REVIEW_OPTS = { commitLanguage: COMMIT_LANGUAGE };

let dbPath = "";
let db: Database;

beforeAll(() => {
  dbPath = tmpDbPath();
  db = createDatabase(dbPath);
  const store = new Store(db);
  store.createProject(FIXTURE_PROJECT_KEY, {
    label: "Test Project",
    repoPath: "/tmp/repo",
    baseBranch: "main",
    commitTimeoutMs: 60_000,
    defaultAutoMerge: false,
    defaultAddScreenshots: false,
  });
  // Contracts resolve the project via config's module-level Store registry.
  initProjectRegistry(store);
});

afterAll(() => {
  db.close();
  removeDbFiles(dbPath);
});

describe("buildTicketContract — orchestrator/implementer framing", () => {
  test("Claude×Claude delegates implementing to the `implementer` sub-agent and reviews with argus", () => {
    const contract = buildTicketContract(makeTicket({ orchestrator: "claude", implementer: "claude" }), TICKET_OPTS);
    expect(contract).toContain("session Claude Code");
    expect(contract).toContain("subagent_type: implementer");
    expect(contract).toContain("argus");
  });

  test("Claude×Composer implements via the Composer script + plan file, review stays argus", () => {
    const ticket = makeTicket({ id: "tc-composer", orchestrator: "claude", implementer: "composer" });
    const contract = buildTicketContract(ticket, TICKET_OPTS);
    expect(contract).toContain(TICKET_OPTS.composerScriptPath);
    expect(contract).toContain(`/tmp/composer-plan-${ticket.id}.md`);
    expect(contract).toContain("argus");
  });

  test("Codex×Codex implements + reviews inline (no implementer sub-agent, no composer, no argus)", () => {
    const contract = buildTicketContract(makeTicket({ orchestrator: "codex", implementer: "codex" }), TICKET_OPTS);
    expect(contract).toContain("session Codex");
    expect(contract).not.toContain("subagent_type: implementer");
    expect(contract).not.toContain(TICKET_OPTS.composerScriptPath);
    expect(contract).not.toContain("argus");
  });
});

describe("buildTicketContract — PRD variants", () => {
  test("Claude×Claude with PRD delegates implementation with the PRD path", () => {
    const ticket = makeTicket({ id: "tp-claude", orchestrator: "claude", implementer: "claude", prdEnabled: true });
    const contract = buildTicketContract(ticket, TICKET_OPTS);
    expect(contract).toContain(`/tmp/prd-${ticket.id}.md`);
    expect(contract).toContain("subagent_type: implementer");
  });

  test("Codex×Codex with PRD writes the PRD then implements inline", () => {
    const ticket = makeTicket({ id: "tp-codex", orchestrator: "codex", implementer: "codex", prdEnabled: true });
    const contract = buildTicketContract(ticket, TICKET_OPTS);
    expect(contract).toContain(`/tmp/prd-${ticket.id}.md`);
    expect(contract).not.toContain("subagent_type: implementer");
  });
});

describe("buildTicketContract — stealth / directPush finalization (no PR)", () => {
  const combos: { orchestrator: Orchestrator; implementer: Implementer }[] = [
    { orchestrator: "claude", implementer: "claude" },
    { orchestrator: "codex", implementer: "codex" },
  ];

  for (const { orchestrator, implementer } of combos) {
    test(`stealth (${orchestrator}) signals ready_for_review and opens no PR`, () => {
      const ticket = makeTicket({ id: `st-${orchestrator}`, orchestrator, implementer, stealth: true });
      const contract = buildTicketContract(ticket, TICKET_OPTS);
      expect(contract).toContain("ready_for_review()");
      expect(contract).toContain("AUCUNE PR");
      expect(contract).not.toContain("done(pr_url)");
    });

    test(`directPush (${orchestrator}) pushes to base and opens no PR`, () => {
      const ticket = makeTicket({ id: `dp-${orchestrator}`, orchestrator, implementer, directPush: true });
      const contract = buildTicketContract(ticket, TICKET_OPTS);
      expect(contract).toContain("ready_for_review()");
      expect(contract).toContain("AUCUNE PR");
      expect(contract).not.toContain("done(pr_url)");
    });
  }
});

describe("buildReviewContract", () => {
  function reviewTicket(orchestrator: Orchestrator, implementer: Implementer) {
    return makeTicket({
      kind: "review",
      orchestrator,
      implementer,
      reviewDepth: "full",
      prNumber: 42,
      prHeadBranch: "feat/x",
      prUrl: "https://github.com/o/r/pull/42",
      postComments: true,
    });
  }

  test("claude → argus skill framing", () => {
    const contract = buildReviewContract(reviewTicket("claude", "claude"), REVIEW_OPTS);
    expect(contract).toContain("session Claude Code");
    expect(contract).toContain("argus");
  });

  test("codex → inline review via gh api, no argus", () => {
    const contract = buildReviewContract(reviewTicket("codex", "codex"), REVIEW_OPTS);
    expect(contract).toContain("session Codex");
    expect(contract).toContain("gh api");
    expect(contract).not.toContain("argus");
  });
});

describe("buildCleanContract", () => {
  function cleanTicket(orchestrator: Orchestrator, implementer: Implementer) {
    return makeTicket({
      kind: "clean",
      orchestrator,
      implementer,
      prNumber: 7,
      prHeadBranch: "feat/c",
      prUrl: "https://github.com/o/r/pull/7",
    });
  }

  test("claude → minos-pr-feedback skill", () => {
    const contract = buildCleanContract(cleanTicket("claude", "claude"), REVIEW_OPTS);
    expect(contract).toContain("session Claude Code");
    expect(contract).toContain("minos-pr-feedback");
  });

  test("codex → inline feedback triage via gh api, no minos skill", () => {
    const contract = buildCleanContract(cleanTicket("codex", "codex"), REVIEW_OPTS);
    expect(contract).toContain("session Codex");
    expect(contract).toContain("gh api");
    expect(contract).not.toContain("minos-pr-feedback");
  });
});

describe("buildAskContract", () => {
  test("claude → Claude Code framing", () => {
    const contract = buildAskContract(makeTicket({ kind: "ask", orchestrator: "claude", implementer: "claude" }));
    expect(contract).toContain("session Claude Code");
  });

  test("codex → Codex read-only sandbox framing", () => {
    const contract = buildAskContract(makeTicket({ kind: "ask", orchestrator: "codex", implementer: "codex" }));
    expect(contract).toContain("session Codex");
    expect(contract).toContain("sandbox en lecture seule");
  });
});

describe("buildConflictResolutionContract", () => {
  function conflictTicket(orchestrator: Orchestrator, implementer: Implementer) {
    return makeTicket({
      orchestrator,
      implementer,
      branch: "feat/z",
      prUrl: "https://github.com/o/r/pull/9",
      error: "branche en retard sur la base",
    });
  }

  test("claude framing", () => {
    const contract = buildConflictResolutionContract(conflictTicket("claude", "claude"), REVIEW_OPTS);
    expect(contract).toContain("session Claude Code");
  });

  test("codex framing", () => {
    const contract = buildConflictResolutionContract(conflictTicket("codex", "codex"), REVIEW_OPTS);
    expect(contract).toContain("session Codex");
  });
});

describe("isAllowedAgentPair — full truth table", () => {
  test("codex orchestrates only codex; codex implementer requires codex orchestrator", () => {
    expect(isAllowedAgentPair("claude", "claude")).toBe(true);
    expect(isAllowedAgentPair("claude", "composer")).toBe(true);
    expect(isAllowedAgentPair("claude", "codex")).toBe(false);
    expect(isAllowedAgentPair("codex", "claude")).toBe(false);
    expect(isAllowedAgentPair("codex", "composer")).toBe(false);
    expect(isAllowedAgentPair("codex", "codex")).toBe(true);
  });
});
