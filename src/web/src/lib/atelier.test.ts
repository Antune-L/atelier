import { describe, expect, test } from "bun:test";

import { DEFAULT_RESEARCH_OPTIONS } from "@shared/schemas";
import type { Conversation, ConversationMessage } from "@shared/schemas";

import { SETTLED_PREVIEW_COUNT, contextUsageSummary, formatTokenCount, groupActivityRows, splitConversations } from "./atelier";

function activity(id: string, agentId: string | null = null, agentLabel: string | null = null): ConversationMessage {
  return { id, conversationId: "c1", role: "activity", content: id, turnId: "t1", agentId, agentLabel, createdAt: 0 };
}

function makeConversation(id: string, updatedAt: number, settled: boolean): Conversation {
  return {
    id,
    project: "demo",
    title: id,
    orchestrator: "claude",
    model: null,
    effort: null,
    codexModel: null,
    codexEffort: null,
    codexFast: false,
    researchEnabled: true,
    researchOptions: DEFAULT_RESEARCH_OPTIONS,
    status: "exploring",
    sessionStatus: "idle",
    sessionId: null,
    error: null,
    unread: false,
    settled,
    contextTokens: null,
    contextWindow: null,
    activeSubagents: [],
    createdAt: 0,
    updatedAt,
  };
}

describe("splitConversations", () => {
  test("splits active and settled conversations, each sorted by recent activity", () => {
    const input = [
      makeConversation("a1", 10, false),
      makeConversation("s1", 5, true),
      makeConversation("a2", 30, false),
      makeConversation("s2", 50, true),
      makeConversation("a3", 20, false),
    ];
    const { active, settled } = splitConversations(input);
    expect(active.map((conversation) => conversation.id)).toEqual(["a2", "a3", "a1"]);
    expect(settled.map((conversation) => conversation.id)).toEqual(["s2", "s1"]);
    expect(input.map((conversation) => conversation.id)).toEqual(["a1", "s1", "a2", "s2", "a3"]);
  });

  test("empty input yields empty groups", () => {
    expect(splitConversations([])).toEqual({ active: [], settled: [] });
  });

  test("previews ten settled conversations", () => {
    expect(SETTLED_PREVIEW_COUNT).toBe(10);
  });
});

describe("groupActivityRows", () => {
  test("groups interleaved sub-agent rows at their first position", () => {
    const entries = groupActivityRows([
      activity("m1"),
      activity("a1", "a", "Analyse · atelier-analyst"),
      activity("b1", "b", null),
      activity("m2"),
      activity("a2", "a", "Analyse · atelier-analyst"),
    ]);
    expect(entries.map((entry) => (entry.kind === "row" ? entry.row.id : `${entry.label}:${entry.rows.map((row) => row.id).join(",")}`))).toEqual([
      "m1",
      "Analyse · atelier-analyst:a1,a2",
      "Sous-agent:b1",
      "m2",
    ]);
  });

  test("keeps a main-agent-only block unchanged", () => {
    expect(groupActivityRows([activity("m1"), activity("m2")])).toEqual([
      { kind: "row", row: activity("m1") },
      { kind: "row", row: activity("m2") },
    ]);
  });
});

describe("formatTokenCount", () => {
  test("formats with French decimals", () => {
    expect(formatTokenCount(850)).toBe("850");
    expect(formatTokenCount(45_210)).toBe("45,2k");
    expect(formatTokenCount(200_000)).toBe("200k");
    expect(formatTokenCount(1_250_000)).toBe("1,3M");
  });
});

describe("contextUsageSummary", () => {
  test("null without a live session", () => {
    expect(contextUsageSummary(null, 200_000)).toBeNull();
  });

  test("used / limit with percentage", () => {
    expect(contextUsageSummary(45_200, 200_000)).toEqual({
      label: "Contexte : 45,2k / 200k tokens (23 %)",
      percent: 23,
      warn: false,
    });
  });

  test("warns from 80 %", () => {
    expect(contextUsageSummary(160_000, 200_000)?.warn).toBe(true);
  });

  test("used only when the limit is unknown", () => {
    expect(contextUsageSummary(45_200, null)).toEqual({ label: "Contexte : 45,2k tokens", percent: null, warn: false });
  });
});
