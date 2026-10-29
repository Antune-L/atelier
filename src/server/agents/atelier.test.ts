import { describe, expect, test } from "bun:test";

import {
  ATELIER_ADVERSARIAL_SUBAGENTS,
  ATELIER_ANALYST_AGENT_NAME,
  ATELIER_EXPLORER_AGENT_NAME,
  ATELIER_REVIEWER_AGENT_NAME,
  RESEARCH_OPTION_LABELS,
} from "../../shared/constants.ts";
import type { Orchestrator } from "../../shared/constants.ts";
import { DEFAULT_RESEARCH_OPTIONS, researchOptionsFromKeys } from "../../shared/schemas.ts";
import type { Conversation, ConversationMessage, ResearchOptions } from "../../shared/schemas.ts";
import { projectConfigSchema } from "../config.ts";
import { FIXTURE_PROJECT_KEY } from "../testing/fixtures.ts";

import { buildAtelierConsolidateTurn, buildAtelierPrompt } from "./atelier.ts";
import type { AtelierWorkspace } from "./atelier.ts";
import { ATELIER_BOARD_RESULT_PREFIX } from "./atelierTicketTools.ts";
import { STEER_PREFIX } from "./sessionHub.ts";

const PROJECT = projectConfigSchema.parse({ label: "Test", repoPath: "/tmp/repo", baseBranch: "main", commitTimeoutMs: 60_000 });
const ADVERSARIAL_SECTION = "## Revue adversariale (activée)";
const RESEARCH_SECTION = "## Réflexion préalable (activée)";

function conversation(orchestrator: Orchestrator, researchEnabled: boolean, researchOptions: ResearchOptions): Conversation {
  return {
    id: "c1",
    project: FIXTURE_PROJECT_KEY,
    title: "Recherches",
    orchestrator,
    model: null,
    effort: null,
    codexModel: null,
    codexEffort: null,
    codexFast: false,
    researchEnabled,
    researchOptions,
    status: "exploring",
    sessionStatus: "idle",
    sessionId: null,
    error: null,
    unread: false,
    settled: false,
    contextTokens: null,
    contextWindow: null,
    activeSubagents: [],
    finishedSubagents: [],
    snapshotSha: null,
    snapshotCommittedAt: null,
    snapshotBaseBranch: null,
    readLocalCheckout: false,
    createdAt: 0,
    updatedAt: 0,
  };
}

const SNAPSHOT_SHA = "0123456789abcdef0123456789abcdef01234567";
const SNAPSHOT_WORKSPACE: AtelierWorkspace = {
  source: "origin",
  cwd: "/var/snapshots/test/0123456789abcdef0123456789abcdef01234567",
  sha: SNAPSHOT_SHA,
  committedAt: Date.UTC(2026, 9, 1, 12, 30),
  baseBranch: "main",
};

const prompt = (c: Conversation): string => buildAtelierPrompt({ conversation: c, project: PROJECT, workspace: SNAPSHOT_WORKSPACE });

describe("buildAtelierPrompt — workspace", () => {
  test("snapshot mode names the pinned commit and never the stale checkout", () => {
    const text = prompt(conversation("claude", false, DEFAULT_RESEARCH_OPTIONS));
    expect(text).toContain(`Code lu : instantané figé d'origin/main @ ${SNAPSHOT_SHA} (2026-10-01 12:30 UTC) dans ${SNAPSHOT_WORKSPACE.cwd}`);
    expect(text).toContain(".env, node_modules");
    expect(text).toContain("« Rafraîchir »");
    expect(text).not.toContain(PROJECT.repoPath);
  });

  test("local mode reads the checkout with uncommitted changes", () => {
    const text = buildAtelierPrompt({ conversation: conversation("codex", false, DEFAULT_RESEARCH_OPTIONS), project: PROJECT, workspace: { source: "local", cwd: PROJECT.repoPath } });
    expect(text).toContain(`Code lu : checkout local ${PROJECT.repoPath} (modifications non commitées incluses)`);
    expect(text).not.toContain("instantané figé");
  });
});

describe("buildAtelierPrompt — adversarial review", () => {
  test("the section is present by default and absent when unchecked or when research is off", () => {
    expect(prompt(conversation("claude", true, DEFAULT_RESEARCH_OPTIONS))).toContain(ADVERSARIAL_SECTION);
    expect(prompt(conversation("claude", true, { ...DEFAULT_RESEARCH_OPTIONS, adversarialReview: false }))).not.toContain(ADVERSARIAL_SECTION);
    expect(prompt(conversation("claude", false, { ...DEFAULT_RESEARCH_OPTIONS, adversarialReview: true }))).not.toContain(ADVERSARIAL_SECTION);
  });

  test("each orchestrator cites its own sub-agent family", () => {
    for (const orchestrator of ["claude", "codex"] as const) {
      const text = prompt(conversation(orchestrator, true, { ...DEFAULT_RESEARCH_OPTIONS, adversarialReview: true }));
      expect(text).toContain(ADVERSARIAL_SECTION);
      expect(text).toContain(ATELIER_ADVERSARIAL_SUBAGENTS[orchestrator].label);
      expect(text).toContain(ATELIER_REVIEWER_AGENT_NAME);
      const other = orchestrator === "claude" ? "codex" : "claude";
      expect(text).not.toContain(ATELIER_ADVERSARIAL_SUBAGENTS[other].label);
      expect(text.indexOf(RESEARCH_SECTION)).toBeLessThan(text.indexOf(ADVERSARIAL_SECTION));
    }
  });

  test("the verification checklist never lists the adversarial review", () => {
    const text = prompt(conversation("claude", true, { ...DEFAULT_RESEARCH_OPTIONS, adversarialReview: true }));
    expect(text).not.toContain(`- ${RESEARCH_OPTION_LABELS.adversarialReview} —`);
    const only = prompt(conversation("codex", true, researchOptionsFromKeys(["adversarialReview"])));
    expect(only).not.toContain(RESEARCH_SECTION);
    expect(only).toContain(ADVERSARIAL_SECTION);
  });

  test("the restitution is a bullet-list synthesis in a fixed order", () => {
    const labels = ["**Run**", "**Objections retenues**", "**Alternatives écartées**", "**Solution recommandée**", "**Questions ouvertes**", "✅ Faisable", "❌ Non faisable"];
    const text = prompt(conversation("claude", true, { ...DEFAULT_RESEARCH_OPTIONS, adversarialReview: true }));
    const positions = labels.map((label) => text.indexOf(label));
    for (const position of positions) expect(position).toBeGreaterThan(-1);
    expect(positions).toEqual([...positions].sort((a, b) => a - b));
    const off = prompt(conversation("claude", true, { ...DEFAULT_RESEARCH_OPTIONS, adversarialReview: false }));
    for (const label of labels) expect(off).not.toContain(label);
  });
});

describe("buildAtelierPrompt — steering", () => {
  test("explains the steering prefix without inviting a PRD resubmission", () => {
    const text = prompt(conversation("claude", false, DEFAULT_RESEARCH_OPTIONS));
    expect(text).toContain("## Aiguillages");
    expect(text).toContain(STEER_PREFIX.trim());
    expect(text).toContain("ne demande jamais de régénérer ni de consolider un PRD");
  });
});

describe("buildAtelierPrompt — sub-agents on explicit request", () => {
  const SUBAGENT_SECTION = "## Sous-agents";
  const ADVERSARIAL_EXCEPTION = "sauf la revue adversariale ci-dessous";
  const SPAWN_TOOLS = { claude: "le tool `Agent`", codex: "tes sous-agents natifs Codex" } as const;

  for (const orchestrator of ["claude", "codex"] as const) {
    for (const adversarialReview of [false, true]) {
      test(`${orchestrator}, adversarial ${adversarialReview ? "on" : "off"}: the section is present`, () => {
        const text = prompt(conversation(orchestrator, true, { ...DEFAULT_RESEARCH_OPTIONS, adversarialReview }));
        expect(text).toContain(SUBAGENT_SECTION);
        expect(text).toContain("UNIQUEMENT si l'utilisateur le demande explicitement dans son message courant");
        for (const name of [ATELIER_EXPLORER_AGENT_NAME, ATELIER_ANALYST_AGENT_NAME, ATELIER_REVIEWER_AGENT_NAME]) expect(text).toContain(name);
        expect(text).toContain(`Lance-les via ${SPAWN_TOOLS[orchestrator]}`);
        if (adversarialReview) {
          expect(text).toContain(ADVERSARIAL_EXCEPTION);
          expect(text.indexOf(SUBAGENT_SECTION)).toBeLessThan(text.indexOf(ADVERSARIAL_SECTION));
        } else {
          expect(text).not.toContain(ADVERSARIAL_EXCEPTION);
        }
      });
    }
  }

  test("the adversarial exception is omitted when research is off", () => {
    const text = prompt(conversation("codex", false, { ...DEFAULT_RESEARCH_OPTIONS, adversarialReview: true }));
    expect(text).toContain(SUBAGENT_SECTION);
    expect(text).not.toContain(ADVERSARIAL_EXCEPTION);
  });
});

describe("buildAtelierPrompt — history", () => {
  function message(content: string, agentId: string | null): ConversationMessage {
    return { id: content, conversationId: "c1", role: "activity", content, turnId: null, agentId, agentLabel: agentId, steering: null, createdAt: 0 };
  }

  test("sub-agent activity lines are never replayed, board results included", () => {
    const history = [message(`${ATELIER_BOARD_RESULT_PREFIX} main`, null), message(`${ATELIER_BOARD_RESULT_PREFIX} sub`, "a1"), message("sub activity", "a1")];
    const text = buildAtelierPrompt({ conversation: conversation("claude", false, DEFAULT_RESEARCH_OPTIONS), project: PROJECT, workspace: SNAPSHOT_WORKSPACE, history });
    expect(text).toContain(`${ATELIER_BOARD_RESULT_PREFIX} main`);
    expect(text).not.toContain(`${ATELIER_BOARD_RESULT_PREFIX} sub`);
    expect(text).not.toContain("sub activity");
  });

  test("only the latest version of each mockup title is replayed", () => {
    const assistant = (content: string): ConversationMessage => ({ ...message(content, null), role: "assistant" });
    const history = [
      assistant('v1 <mockup title="Liste">ancienne</mockup> <mockup title="Fiche">fiche</mockup>'),
      { ...message("Encore", null), role: "user" as const },
      assistant('v2 <mockup title="Liste">nouvelle</mockup>'),
    ];
    const text = buildAtelierPrompt({ conversation: conversation("claude", false, DEFAULT_RESEARCH_OPTIONS), project: PROJECT, workspace: SNAPSHOT_WORKSPACE, history });
    expect(text).toContain("v1 [version précédente de la maquette « Liste » omise]");
    expect(text).not.toContain("ancienne");
    expect(text).toContain('<mockup title="Fiche">fiche</mockup>');
    expect(text).toContain('<mockup title="Liste">nouvelle</mockup>');
  });
});

describe("buildAtelierPrompt — mockups", () => {
  test("the mockup rules are in the first-turn prompt for both orchestrators", () => {
    for (const orchestrator of ["claude", "codex"] as const) {
      const text = prompt(conversation(orchestrator, false, DEFAULT_RESEARCH_OPTIONS));
      expect(text).toContain("## Maquettes HTML");
      expect(text).toContain('<mockup title="Nom court">');
      expect(text).toContain("64 Ko");
    }
  });

  test("the consolidate turn transcribes validated visual decisions", () => {
    expect(buildAtelierConsolidateTurn()).toContain("designConsiderations");
  });
});
