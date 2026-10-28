import { describe, expect, test } from "bun:test";

import { ATELIER_ADVERSARIAL_SUBAGENTS, ATELIER_REVIEWER_AGENT_NAME, RESEARCH_OPTION_LABELS } from "../../shared/constants.ts";
import type { Orchestrator } from "../../shared/constants.ts";
import { DEFAULT_RESEARCH_OPTIONS, researchOptionsFromKeys } from "../../shared/schemas.ts";
import type { Conversation, ConversationMessage, ResearchOptions } from "../../shared/schemas.ts";
import { projectConfigSchema } from "../config.ts";
import { FIXTURE_PROJECT_KEY } from "../testing/fixtures.ts";

import { buildAtelierPrompt } from "./atelier.ts";
import { ATELIER_BOARD_RESULT_PREFIX } from "./atelierTicketTools.ts";

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
    createdAt: 0,
    updatedAt: 0,
  };
}

const prompt = (c: Conversation): string => buildAtelierPrompt({ conversation: c, project: PROJECT });

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

describe("buildAtelierPrompt — history", () => {
  function message(content: string, agentId: string | null): ConversationMessage {
    return { id: content, conversationId: "c1", role: "activity", content, turnId: null, agentId, agentLabel: agentId, createdAt: 0 };
  }

  test("sub-agent activity lines are never replayed, board results included", () => {
    const history = [message(`${ATELIER_BOARD_RESULT_PREFIX} main`, null), message(`${ATELIER_BOARD_RESULT_PREFIX} sub`, "a1"), message("sub activity", "a1")];
    const text = buildAtelierPrompt({ conversation: conversation("claude", false, DEFAULT_RESEARCH_OPTIONS), project: PROJECT, history });
    expect(text).toContain(`${ATELIER_BOARD_RESULT_PREFIX} main`);
    expect(text).not.toContain(`${ATELIER_BOARD_RESULT_PREFIX} sub`);
    expect(text).not.toContain("sub activity");
  });
});
