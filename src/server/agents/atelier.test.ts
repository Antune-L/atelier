import { describe, expect, test } from "bun:test";

import { ATELIER_ADVERSARIAL_SUBAGENTS, ATELIER_REVIEWER_AGENT_NAME, RESEARCH_OPTION_LABELS } from "../../shared/constants.ts";
import type { Orchestrator } from "../../shared/constants.ts";
import { DEFAULT_RESEARCH_OPTIONS, researchOptionsFromKeys } from "../../shared/schemas.ts";
import type { Conversation, ResearchOptions } from "../../shared/schemas.ts";
import { projectConfigSchema } from "../config.ts";
import { FIXTURE_PROJECT_KEY } from "../testing/fixtures.ts";

import { buildAtelierPrompt } from "./atelier.ts";

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
    createdAt: 0,
    updatedAt: 0,
  };
}

const prompt = (c: Conversation): string => buildAtelierPrompt({ conversation: c, project: PROJECT });

describe("buildAtelierPrompt — adversarial review", () => {
  test("the section is absent by default and when research is off", () => {
    expect(prompt(conversation("claude", true, DEFAULT_RESEARCH_OPTIONS))).not.toContain(ADVERSARIAL_SECTION);
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
});
