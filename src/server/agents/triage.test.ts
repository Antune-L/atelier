import { describe, expect, test } from "bun:test";

import type { Comment } from "../../shared/schemas.ts";
import type { ProjectConfig } from "../config.ts";
import { makeTicket } from "../testing/fixtures.ts";

import { buildTriageChannelPrompt, buildTriagePlusChannelPrompt, fenceContent } from "./triage.ts";

const PROJECT: ProjectConfig = {
  label: "Test Project",
  repoPath: "/tmp/repo",
  baseBranch: "main",
  vcsProvider: "github",
  commitTimeoutMs: 60_000,
  defaultAutoMerge: false,
  defaultAddScreenshots: false,
};

function comment(overrides: Partial<Comment>): Comment {
  return { id: "c", ticketId: "t1", author: "user", body: "", questionId: null, answered: false, createdAt: 0, ...overrides };
}

const COMMENTS: Comment[] = [
  comment({ id: "c3", body: "Answer: use the modal", createdAt: 3_000 }),
  comment({ id: "c1", author: "agent", body: "Question: modal or page?", questionId: "q1", createdAt: 1_000 }),
  comment({ id: "c2", author: "system", body: "system notice", createdAt: 2_000 }),
  comment({ id: "c4", author: "agent", body: "plain agent note", createdAt: 4_000 }),
];

describe("triage prompt card rendering", () => {
  test("lists user comments and agent questions chronologically, without system or plain agent comments", () => {
    const prompt = buildTriageChannelPrompt(makeTicket(), PROJECT, "main", "fr", "claude", COMMENTS);
    expect(prompt).toContain("Commentaires :");
    expect(prompt.indexOf("Question: modal or page?")).toBeLessThan(prompt.indexOf("Answer: use the modal"));
    expect(prompt).toContain("agent (question)");
    expect(prompt).not.toContain("system notice");
    expect(prompt).not.toContain("plain agent note");
    expect(prompt).toContain("ne repose pas une question déjà tranchée");
  });

  test("omits the comments section and its rule without useful comments", () => {
    const prompt = buildTriageChannelPrompt(makeTicket(), PROJECT, "main", "fr", "claude", [comment({ author: "system", body: "noise" })]);
    expect(prompt).not.toContain("Commentaires :");
    expect(prompt).not.toContain("ne repose pas une question déjà tranchée");
  });

  test("renders English labels only in the English prompt", () => {
    const prompt = buildTriageChannelPrompt(makeTicket(), PROJECT, "main", "en", "codex", COMMENTS);
    expect(prompt).toContain("Comments:");
    expect(prompt).toContain("user:");
    expect(prompt).not.toContain("Commentaires");
    expect(prompt).not.toContain("utilisateur");
    expect(prompt).not.toContain("clôtures");
  });

  test.each([3, 4, 5])("keeps content with %i backticks inside a longer fence", (count) => {
    const ticks = "`".repeat(count);
    const description = `## Mission\n${ticks}\ncode\n${ticks}`;
    const fence = "`".repeat(count + 1);
    expect(fenceContent(description)).toBe(`${fence}\n${description}\n${fence}`);
    expect(buildTriageChannelPrompt(makeTicket({ description }), PROJECT, "main", "fr")).toContain(`${fence}\n${description}\n${fence}`);
  });

  test("uses a three-backtick fence for plain content", () => {
    expect(fenceContent("plain")).toBe("```\nplain\n```");
  });

  test("keeps blank lines of the description", () => {
    const description = "first\n\n\nsecond";
    expect(buildTriageChannelPrompt(makeTicket({ description }), PROJECT, "main", "fr")).toContain(description);
  });

  test("marks an empty description", () => {
    expect(buildTriageChannelPrompt(makeTicket({ description: "" }), PROJECT, "main", "fr")).toContain("(vide)");
    expect(buildTriageChannelPrompt(makeTicket({ description: "" }), PROJECT, "main", "en")).toContain("(empty)");
  });

  test("lists Figma links referenced by comments", () => {
    const url = "https://www.figma.com/design/abc/File?node-id=1-2";
    const prompt = buildTriageChannelPrompt(makeTicket({ description: "no link" }), PROJECT, "main", "fr", "claude", [comment({ body: `See ${url}` })]);
    expect(prompt).toContain("Liens Figma référencés :");
    expect(prompt).toContain(`- ${url}`);
  });

  test("Analyse + asks to copy the ticket block verbatim to every sub-agent", () => {
    expect(buildTriagePlusChannelPrompt(makeTicket(), PROJECT, "main", "fr", "codex", COMMENTS)).toContain("le bloc `## Ticket` complet (description ET commentaires) mot pour mot");
    expect(buildTriagePlusChannelPrompt(makeTicket(), PROJECT, "main", "en", "claude", COMMENTS)).toContain("the complete `## Ticket` block (description AND comments) verbatim");
  });
});
