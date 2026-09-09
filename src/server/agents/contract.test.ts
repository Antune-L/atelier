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
  test("Claude×Claude delegates implementation and both independent reviews", () => {
    const contract = buildTicketContract(makeTicket({ orchestrator: "claude", implementer: "claude" }), TICKET_OPTS);
    expect(contract).toContain("session Claude Code");
    expect(contract).toContain("subagent_type: implementer");
    expect(contract).toContain('delegate_review(kind="quality"');
    expect(contract).toContain('delegate_review(kind="conventions"');
    expect(contract).toContain('delegate_review(kind="regression"');
    expect(contract).toContain('delegate_review(kind="logic"');
    expect(contract).not.toContain('delegate_review(kind="architecture"');
  });

  test("Claude×Composer implements via Composer and keeps independent reviews", () => {
    const ticket = makeTicket({ id: "tc-composer", orchestrator: "claude", implementer: "composer" });
    const contract = buildTicketContract(ticket, TICKET_OPTS);
    expect(contract).toContain(TICKET_OPTS.composerScriptPath);
    expect(contract).toContain(`/tmp/composer-plan-${ticket.id}.md`);
    expect(contract).toContain("delegate_review");
  });

  test("Codex×Codex delegates implementation and reviews to fresh contexts", () => {
    const contract = buildTicketContract(makeTicket({ orchestrator: "codex", implementer: "codex" }), TICKET_OPTS);
    expect(contract).toContain("session Codex");
    expect(contract).toContain("delegate_implementation");
    expect(contract).toContain("delegate_review");
    expect(contract).not.toContain(TICKET_OPTS.composerScriptPath);
    expect(contract).not.toContain("argus");
  });

  test("Claude×Codex delegates implementation and independent reviews", () => {
    const contract = buildTicketContract(makeTicket({ id: "tc-delegate", orchestrator: "claude", implementer: "codex" }), TICKET_OPTS);
    expect(contract).toContain("session Claude Code");
    expect(contract).toContain("delegate_implementation");
    expect(contract).toContain("implementation_done");
    expect(contract).not.toContain("subagent_type: implementer");
    expect(contract).not.toContain(TICKET_OPTS.composerScriptPath);
    expect(contract).toContain("delegate_review");
  });
});

describe("buildTicketContract — PRD variants", () => {
  test("Claude×Claude with PRD delegates implementation with the PRD path", () => {
    const ticket = makeTicket({ id: "tp-claude", orchestrator: "claude", implementer: "claude", prdEnabled: true });
    const contract = buildTicketContract(ticket, TICKET_OPTS);
    expect(contract).toContain(`/tmp/prd-${ticket.id}.md`);
    expect(contract).toContain("subagent_type: implementer");
  });

  test("Codex×Codex with PRD writes the PRD then delegates it", () => {
    const ticket = makeTicket({ id: "tp-codex", orchestrator: "codex", implementer: "codex", prdEnabled: true });
    const contract = buildTicketContract(ticket, TICKET_OPTS);
    expect(contract).toContain(`/tmp/prd-${ticket.id}.md`);
    expect(contract).toContain("delegate_implementation");
  });

  test("Claude×Codex with PRD writes the PRD then passes it as the delegation plan", () => {
    const ticket = makeTicket({ id: "tp-delegate", orchestrator: "claude", implementer: "codex", prdEnabled: true });
    const contract = buildTicketContract(ticket, TICKET_OPTS);
    expect(contract).toContain(`/tmp/prd-${ticket.id}.md`);
    expect(contract).toContain("delegate_implementation");
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

  test("claude → independent read-only reviewers", () => {
    const contract = buildReviewContract(reviewTicket("claude", "claude"), REVIEW_OPTS);
    expect(contract).toContain("session Claude Code");
    expect(contract).toContain("delegate_review");
  });

  test("codex → independent read-only reviewers then backend publication", () => {
    const contract = buildReviewContract(reviewTicket("codex", "codex"), REVIEW_OPTS);
    expect(contract).toContain("session Codex");
    expect(contract).toContain("publish_review");
    expect(contract).not.toContain("gh api");
    expect(contract).toContain("delegate_review");
    expect(contract).toContain("head GitHub exact");
    expect(contract).toContain("Un verdict revise est une conclusion valide");
  });

  test("legacy correction ticket without a PR branch keeps the read-only completion policy", () => {
    const contract = buildReviewContract(
      makeTicket({
        kind: "review",
        orchestrator: "codex",
        implementer: "codex",
        reviewDepth: "light",
        prNumber: 42,
        prHeadBranch: null,
        prUrl: "https://github.com/o/r/pull/42",
        postComments: false,
        fixComments: true,
      }),
      REVIEW_OPTS,
    );
    expect(contract).toContain("Un verdict revise est une conclusion valide");
    expect(contract).toContain("Ne modifie AUCUN fichier");
  });

  test("full requests the four light dimensions plus architecture and security", () => {
    const contract = buildReviewContract(reviewTicket("codex", "codex"), REVIEW_OPTS);
    for (const kind of ["quality", "conventions", "regression", "logic", "architecture", "security"]) {
      expect(contract).toContain(`delegate_review(kind="${kind}"`);
    }
    expect(contract).toContain("6 dimensions indépendantes");
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
    expect(contract).toContain("delegate_review");
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
    expect(contract).toContain("delegate_review");
  });

  test("codex framing", () => {
    const contract = buildConflictResolutionContract(conflictTicket("codex", "codex"), REVIEW_OPTS);
    expect(contract).toContain("session Codex");
    expect(contract).toContain("delegate_review");
  });
});

describe("isAllowedAgentPair — full truth table", () => {
  test("codex orchestrates only codex; claude orchestrates any implementer (codex via delegation)", () => {
    expect(isAllowedAgentPair("claude", "claude")).toBe(true);
    expect(isAllowedAgentPair("claude", "composer")).toBe(true);
    expect(isAllowedAgentPair("claude", "codex")).toBe(true);
    expect(isAllowedAgentPair("codex", "claude")).toBe(false);
    expect(isAllowedAgentPair("codex", "composer")).toBe(false);
    expect(isAllowedAgentPair("codex", "codex")).toBe(true);
  });
});
