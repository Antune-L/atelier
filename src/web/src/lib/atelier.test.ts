import { describe, expect, test } from "bun:test";

import { DEFAULT_RESEARCH_OPTIONS } from "@shared/schemas";
import type { Conversation, ConversationMessage } from "@shared/schemas";

import {
  SETTLED_PREVIEW_COUNT,
  UNTITLED_CONVERSATION_LABEL,
  buildAtelierThread,
  codeSourceLabel,
  contextUsageSummary,
  conversationMatchesSearch,
  conversationTooltip,
  countSubagentRunActions,
  formatSubagentDuration,
  formatTokenCount,
  groupActivityRows,
  splitConversations,
  steeringLabel,
} from "./atelier";
import { normalizeSearch } from "./search";

describe("steeringLabel", () => {
  test("maps each steering state to its French label", () => {
    expect(steeringLabel("pending")).toBe("aiguillé");
    expect(steeringLabel("steered")).toBe("aiguillé");
    expect(steeringLabel("queued")).toBe("en file");
    expect(steeringLabel("failed")).toBe("non transmis");
    expect(steeringLabel("abandoned")).toBe("non traité");
  });

  test("returns null for a regular turn", () => {
    expect(steeringLabel(null)).toBeNull();
  });
});

function activity(id: string, agentId: string | null = null, agentLabel: string | null = null): ConversationMessage {
  return { id, conversationId: "c1", role: "activity", content: id, turnId: "t1", agentId, agentLabel, steering: null, createdAt: 0 };
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
    finishedSubagents: [],
    snapshotSha: null,
    snapshotCommittedAt: null,
    snapshotBaseBranch: null,
    readLocalCheckout: false,
    createdAt: 0,
    updatedAt,
  };
}

describe("codeSourceLabel", () => {
  test("names the pinned origin commit, the local checkout, or a pending pin", () => {
    const base = makeConversation("c", 0, false);
    expect(codeSourceLabel(base)).toBe("origin (figé au prochain message)");
    const pinned = { ...base, snapshotSha: "0123456789abcdef0123456789abcdef01234567", snapshotBaseBranch: "main", snapshotCommittedAt: null };
    expect(codeSourceLabel(pinned)).toBe("origin/main @ 0123456");
    expect(codeSourceLabel({ ...pinned, readLocalCheckout: true })).toBe("Checkout local");
  });
});

describe("conversationTooltip", () => {
  test("joins the full title and the project label", () => {
    expect(conversationTooltip("Refonte du board", "Atelier")).toBe("Refonte du board — Atelier");
  });

  test("falls back to the untitled label when the title is empty", () => {
    expect(conversationTooltip("", "Atelier")).toBe(`${UNTITLED_CONVERSATION_LABEL} — Atelier`);
  });
});

describe("conversationMatchesSearch", () => {
  const titled = (title: string): Conversation => ({ ...makeConversation("c1", 0, false), title });

  test("an empty query matches every conversation", () => {
    expect(conversationMatchesSearch(titled("Refonte du board"), normalizeSearch(""))).toBe(true);
  });

  test("matches a title substring regardless of case and accents", () => {
    expect(conversationMatchesSearch(titled("Planning de l'été"), normalizeSearch("ÉTÉ"))).toBe(true);
    expect(conversationMatchesSearch(titled("Planning de l'été"), normalizeSearch("planning"))).toBe(true);
  });

  test("rejects a title that does not contain the query", () => {
    expect(conversationMatchesSearch(titled("Refonte du board"), normalizeSearch("hiver"))).toBe(false);
  });

  test("an empty title matches the untitled label", () => {
    expect(conversationMatchesSearch(titled(""), normalizeSearch(UNTITLED_CONVERSATION_LABEL))).toBe(true);
  });
});

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

describe("countSubagentRunActions", () => {
  const at = (message: ConversationMessage, createdAt: number): ConversationMessage => ({ ...message, createdAt });

  test("counts activity rows per run and ignores main-agent rows", () => {
    const messages = [activity("m1"), activity("a1", "a", null), activity("b1", "b", null), activity("a2", "a", null)];
    const counts = countSubagentRunActions(messages, [{ id: "a", startedAt: 0 }, { id: "b", startedAt: 0, endedAt: 5 }]);
    expect([...counts.entries()]).toEqual([
      ["a:0", 2],
      ["b:0", 1],
    ]);
  });

  test("splits the rows of an id across its successive runs", () => {
    const messages = [at(activity("a1", "a", null), 10), at(activity("a2", "a", null), 20), at(activity("a3", "a", null), 40), at(activity("a4", "a", null), 60)];
    const runs = [{ id: "a", startedAt: 50 }, { id: "a", startedAt: 5, endedAt: 25 }, { id: "a", startedAt: 30, endedAt: 45 }];
    expect(countSubagentRunActions(messages, runs)).toEqual(new Map([
      ["a:5", 2],
      ["a:30", 1],
      ["a:50", 1],
    ]));
  });
});

describe("formatSubagentDuration", () => {
  test("formats seconds, minutes and hours", () => {
    expect(formatSubagentDuration(-5)).toBe("0s");
    expect(formatSubagentDuration(41_900)).toBe("41s");
    expect(formatSubagentDuration(125_000)).toBe("2m 05s");
    expect(formatSubagentDuration(3_780_000)).toBe("1h 03m");
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

describe("buildAtelierThread", () => {
  function msg(id: string, role: ConversationMessage["role"], turnId: string): ConversationMessage {
    return { id, conversationId: "c1", role, content: id, turnId, agentId: null, agentLabel: null, steering: null, createdAt: 0 };
  }

  function shape(messages: ConversationMessage[], running: boolean): unknown[] {
    return buildAtelierThread(messages, running).map((item) => {
      if (item.kind !== "reasoning") return [item.kind, item.message.id];
      return [item.kind, item.live, item.entries.map((entry) => (entry.kind === "text" ? entry.message.id : entry.entries.map((e) => (e.kind === "row" ? e.row.id : e.agentId))))];
    });
  }

  const finished = [msg("u1", "user", "t1"), msg("a1", "assistant", "t1"), msg("x1", "activity", "t1"), msg("x2", "activity", "t1"), msg("a2", "assistant", "t1")];

  test("splits a finished turn into a collapsed reasoning and the final answer", () => {
    expect(shape(finished, false)).toEqual([["user", "u1"], ["reasoning", false, ["a1", ["x1", "x2"]]], ["answer", "a2"]]);
  });

  test("keeps the whole live turn in an open reasoning block", () => {
    expect(shape(finished, true)).toEqual([["user", "u1"], ["reasoning", true, ["a1", ["x1", "x2"], "a2"]]]);
  });

  test("still splits earlier turns while a later one runs", () => {
    const messages = [...finished, msg("u2", "user", "t2"), msg("x3", "activity", "t2")];
    expect(shape(messages, true)).toEqual([
      ["user", "u1"],
      ["reasoning", false, ["a1", ["x1", "x2"]]],
      ["answer", "a2"],
      ["user", "u2"],
      ["reasoning", true, [["x3"]]],
    ]);
    expect(shape([...finished, msg("u2", "user", "t2")], true).at(-2)).toEqual(["answer", "a2"]);
  });

  test("a turn with only activities is a reasoning block", () => {
    expect(shape([msg("u1", "user", "t1"), msg("x1", "activity", "t1")], false)).toEqual([["user", "u1"], ["reasoning", false, [["x1"]]]]);
  });

  test("an old merged turn shows its activities folded before the answer", () => {
    const messages = [msg("u1", "user", "t1"), msg("x1", "activity", "t1"), msg("a1", "assistant", "t1")];
    expect(shape(messages, false)).toEqual([["user", "u1"], ["reasoning", false, [["x1"]]], ["answer", "a1"]]);
    expect(shape([msg("u1", "user", "t1"), msg("a1", "assistant", "t1")], false)).toEqual([["user", "u1"], ["answer", "a1"]]);
  });
});
