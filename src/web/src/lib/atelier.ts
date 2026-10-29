import {
  AGENT_EFFORT_FULL_LABELS,
  AGENT_MODEL_FULL_LABELS,
  CODEX_EFFORT_FULL_LABELS,
  CODEX_MODEL_LABELS,
  DEFAULT_CODEX_EFFORT,
  DEFAULT_CODEX_MODEL,
  type AgentEffort,
  type AgentModel,
  type CodexEffort,
  type CodexModel,
  type ConversationStatus,
  type Orchestrator,
} from "@shared/constants";
import type { Conversation, ConversationMessage, ConversationSteering } from "@shared/schemas";

import type { BadgeVariant } from "@/components/ui/badge";
import type { ResolvedAgentDefaults } from "@/lib/agentDefaults";
import { matchesQuery } from "@/lib/search";

const STEERING_LABELS: Record<ConversationSteering, string> = {
  pending: "aiguillé",
  steered: "aiguillé",
  queued: "en file",
  failed: "non transmis",
  abandoned: "non traité",
};

/** Badge label of a user message sent during a running turn; null for a regular turn. */
export function steeringLabel(steering: ConversationSteering | null): string | null {
  return steering === null ? null : STEERING_LABELS[steering];
}

export const ATELIER_STEPS = ["conversation", "prd", "cards"] as const;
export type AtelierStep = (typeof ATELIER_STEPS)[number];

export const ATELIER_STEP_LABELS: Record<AtelierStep, string> = {
  conversation: "Conversation",
  prd: "PRD",
  cards: "Cartes",
};

export interface AtelierSeed {
  project: string;
  title: string;
  description: string;
}

export type AtelierTarget =
  | { kind: "conversation"; conversationId: string }
  | { kind: "seed"; seed: AtelierSeed }
  | { kind: "prd"; prdId: string; project: string };

/** The agent knobs of an Atelier conversation; null model/effort follow the app defaults. */
export interface AtelierAgentSettings {
  orchestrator: Orchestrator;
  model: AgentModel | null;
  effort: AgentEffort | null;
  codexModel: CodexModel | null;
  codexEffort: CodexEffort | null;
  codexFast: boolean;
}

export const UNTITLED_CONVERSATION_LABEL = "Nouvelle idée";

/** Hover text of a (possibly truncated) conversation title: "titre — projet". */
export function conversationTooltip(title: string, projectLabel: string): string {
  return `${title || UNTITLED_CONVERSATION_LABEL} — ${projectLabel}`;
}

const SHORT_SHA_LENGTH = 7;

/** Which code the session reads: the pinned origin snapshot, the local checkout, or origin before the first pin. */
export function codeSourceLabel(conversation: Conversation): string {
  if (conversation.readLocalCheckout) return "Checkout local";
  if (conversation.snapshotSha === null || conversation.snapshotBaseBranch === null) return "origin (figé au prochain message)";
  const date = conversation.snapshotCommittedAt === null ? "" : ` · ${new Date(conversation.snapshotCommittedAt).toLocaleDateString("fr-FR")}`;
  return `origin/${conversation.snapshotBaseBranch} @ ${conversation.snapshotSha.slice(0, SHORT_SHA_LENGTH)}${date}`;
}

/** Whether a conversation's title matches an already-normalized search query (see normalizeSearch). */
export function conversationMatchesSearch(conversation: Conversation, query: string): boolean {
  return matchesQuery(query, conversation.title || UNTITLED_CONVERSATION_LABEL);
}

export const CONVERSATION_STATUS_VARIANTS: Record<ConversationStatus, BadgeVariant> = {
  exploring: "outline",
  prd_draft: "warning",
  prd_validated: "success",
  cards_created: "secondary",
};

/** Settled rows shown before the "show more" button. */
export const SETTLED_PREVIEW_COUNT = 10;

/** Splits conversations into active and settled lists, each a new array sorted by most recent update. */
export function splitConversations(conversations: readonly Conversation[]): { active: Conversation[]; settled: Conversation[] } {
  const sorted = [...conversations].sort((a, b) => b.updatedAt - a.updatedAt);
  return { active: sorted.filter((c) => !c.settled), settled: sorted.filter((c) => c.settled) };
}

export function agentSettingsOf(conversation: Conversation): AtelierAgentSettings {
  return {
    orchestrator: conversation.orchestrator,
    model: conversation.model,
    effort: conversation.effort,
    codexModel: conversation.codexModel,
    codexEffort: conversation.codexEffort,
    codexFast: conversation.codexFast,
  };
}

/** Fresh agent knobs: the given orchestrator, every model/effort following the app defaults. */
export function defaultAgentSettings(orchestrator: Orchestrator, codexFast: boolean): AtelierAgentSettings {
  return { orchestrator, model: null, effort: null, codexModel: null, codexEffort: null, codexFast };
}

function resolveCodexChoice(
  settings: AtelierAgentSettings,
  defaults: ResolvedAgentDefaults,
): { model: CodexModel; effort: CodexEffort } {
  return {
    model: settings.codexModel ?? defaults.codexModel ?? DEFAULT_CODEX_MODEL,
    effort: settings.codexEffort ?? defaults.codexEffort ?? DEFAULT_CODEX_EFFORT,
  };
}

function resolveClaudeChoice(
  settings: AtelierAgentSettings,
  defaults: ResolvedAgentDefaults,
): { model: AgentModel | null; effort: AgentEffort | null } {
  return { model: settings.model ?? defaults.model, effort: settings.effort ?? defaults.effort };
}

/** Compact "claude · opus · medium" label shown above assistant replies and in the top bar. */
export function agentLabel(settings: AtelierAgentSettings, defaults: ResolvedAgentDefaults): string {
  if (settings.orchestrator === "codex") {
    const { model, effort } = resolveCodexChoice(settings, defaults);
    const fast = settings.codexFast ? " · fast" : "";
    return `codex · ${CODEX_MODEL_LABELS[model].toLowerCase()} · ${effort}${fast}`;
  }
  const { model, effort } = resolveClaudeChoice(settings, defaults);
  const parts = ["claude"];
  if (model !== null) parts.push(model);
  if (effort !== null) parts.push(effort);
  return parts.join(" · ");
}

export const CONTEXT_WARNING_PERCENT = 80;

const decimalFormatter = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 1 });

/** Short French token count: `850`, `45,2k`, `1,2M`. */
export function formatTokenCount(tokens: number): string {
  if (tokens >= 1_000_000) return `${decimalFormatter.format(tokens / 1_000_000)}M`;
  if (tokens >= 1_000) return `${decimalFormatter.format(Math.round(tokens / 100) / 10)}k`;
  return decimalFormatter.format(Math.round(tokens));
}

export interface ContextUsageSummary {
  label: string;
  /** Rounded occupancy percentage, or null when the window is unknown. */
  percent: number | null;
  warn: boolean;
}

/** Live context figures of a conversation, or null when no session is live. */
export function contextUsageSummary(contextTokens: number | null, contextWindow: number | null): ContextUsageSummary | null {
  if (contextTokens === null) return null;
  if (contextWindow === null || contextWindow <= 0) {
    return { label: `Contexte : ${formatTokenCount(contextTokens)} tokens`, percent: null, warn: false };
  }
  const percent = Math.min(100, Math.round((contextTokens / contextWindow) * 100));
  return {
    label: `Contexte : ${formatTokenCount(contextTokens)} / ${formatTokenCount(contextWindow)} tokens (${percent} %)`,
    percent,
    warn: percent >= CONTEXT_WARNING_PERCENT,
  };
}

/** Long-form agent summary for the conversation top bar ("Claude Opus, effort Moyen"). */
export function agentSummary(settings: AtelierAgentSettings, defaults: ResolvedAgentDefaults): string {
  if (settings.orchestrator === "codex") {
    const { model, effort } = resolveCodexChoice(settings, defaults);
    return `Codex ${CODEX_MODEL_LABELS[model]} · ${CODEX_EFFORT_FULL_LABELS[effort]}`;
  }
  const { model, effort } = resolveClaudeChoice(settings, defaults);
  const modelLabel = model === null ? "" : ` ${AGENT_MODEL_FULL_LABELS[model]}`;
  const effortLabel = effort === null ? "" : ` · ${AGENT_EFFORT_FULL_LABELS[effort]}`;
  return `Claude${modelLabel}${effortLabel}`;
}

export const SUBAGENT_FALLBACK_LABEL = "Sous-agent";

export type ActivityEntry =
  | { kind: "row"; row: ConversationMessage }
  | { kind: "subagent"; agentId: string; label: string; rows: ConversationMessage[] };

/** Splits an activity block into main-agent rows and per-sub-agent groups, each group placed at its first row. */
export function groupActivityRows(rows: readonly ConversationMessage[]): ActivityEntry[] {
  const entries: ActivityEntry[] = [];
  const groups = new Map<string, ConversationMessage[]>();
  for (const row of rows) {
    if (row.agentId === null) {
      entries.push({ kind: "row", row });
      continue;
    }
    const group = groups.get(row.agentId);
    if (group) {
      group.push(row);
      continue;
    }
    const created = [row];
    groups.set(row.agentId, created);
    entries.push({ kind: "subagent", agentId: row.agentId, label: row.agentLabel ?? SUBAGENT_FALLBACK_LABEL, rows: created });
  }
  return entries;
}

export type ReasoningEntry =
  | { kind: "text"; message: ConversationMessage }
  | { kind: "activity"; id: string; entries: ActivityEntry[] };

export type AtelierThreadItem =
  | { kind: "user"; message: ConversationMessage }
  | { kind: "reasoning"; id: string; entries: ReasoningEntry[]; live: boolean }
  | { kind: "answer"; message: ConversationMessage };

/** Intermediate texts as-is, consecutive activity rows grouped by sub-agent. */
function reasoningEntries(messages: readonly ConversationMessage[]): ReasoningEntry[] {
  const entries: ReasoningEntry[] = [];
  let activity: ConversationMessage[] = [];
  const closeActivity = (): void => {
    const first = activity[0];
    if (first) entries.push({ kind: "activity", id: first.id, entries: groupActivityRows(activity) });
    activity = [];
  };
  for (const message of messages) {
    if (message.role === "activity") {
      activity.push(message);
      continue;
    }
    closeActivity();
    entries.push({ kind: "text", message });
  }
  closeActivity();
  return entries;
}

/**
 * Splits each agent turn into a « Réflexion » block (intermediate texts and activity) and its final answer,
 * the last assistant message. The live turn stays a single reasoning block until it ends.
 */
export function buildAtelierThread(messages: readonly ConversationMessage[], running: boolean): AtelierThreadItem[] {
  const items: Array<AtelierThreadItem | ConversationMessage[]> = [];
  let current: ConversationMessage[] | null = null;
  for (const message of messages) {
    if (message.role === "user") {
      current = null;
      items.push({ kind: "user", message });
      continue;
    }
    const head = current?.[0];
    if (current && head && head.turnId === message.turnId) {
      current.push(message);
      continue;
    }
    current = [message];
    items.push(current);
  }
  // Only a run closing the thread can be the live turn: a trailing user message means the reply has not started.
  const lastRun = items[items.length - 1];
  return items.flatMap((item): AtelierThreadItem[] => {
    if (!Array.isArray(item)) return [item];
    const first = item[0];
    if (!first) return [];
    const id = `reasoning:${first.turnId ?? first.id}`;
    if (running && item === lastRun) return [{ kind: "reasoning", id, entries: reasoningEntries(item), live: true }];
    const answer = item.findLast((message) => message.role === "assistant");
    const rest = item.filter((message) => message !== answer);
    const result: AtelierThreadItem[] = [];
    if (rest.length > 0) result.push({ kind: "reasoning", id, entries: reasoningEntries(rest), live: false });
    if (answer) result.push({ kind: "answer", message: answer });
    return result;
  });
}

/** "1 sous-agent" / "N sous-agents". */
export function subagentCountLabel(count: number): string {
  return count === 1 ? "1 sous-agent" : `${count} sous-agents`;
}

export interface SubagentRun {
  id: string;
  startedAt: number;
  /** Absent while the run is still active. */
  endedAt?: number;
}

/** A Codex child thread can run several times under one id: the start time identifies the run. */
export function subagentRunKey(run: SubagentRun): string {
  return `${run.id}:${run.startedAt}`;
}

/**
 * Number of activity rows of each sub-agent run, keyed by `subagentRunKey`. A row belongs to the
 * earliest run of its agent id that had not ended when the row was written.
 */
export function countSubagentRunActions(messages: readonly ConversationMessage[], runs: readonly SubagentRun[]): Map<string, number> {
  const runsById = new Map<string, SubagentRun[]>();
  for (const run of [...runs].sort((a, b) => a.startedAt - b.startedAt)) {
    runsById.set(run.id, [...(runsById.get(run.id) ?? []), run]);
  }
  const counts = new Map<string, number>();
  for (const message of messages) {
    if (message.role !== "activity" || message.agentId === null) continue;
    const run = runsById.get(message.agentId)?.find((candidate) => candidate.endedAt === undefined || message.createdAt <= candidate.endedAt);
    if (!run) continue;
    const key = subagentRunKey(run);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return counts;
}

/** Compact duration: "41s", "2m 05s", "1h 03m". */
export function formatSubagentDuration(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) return `${hours}h ${String(minutes).padStart(2, "0")}m`;
  if (minutes > 0) return `${minutes}m ${String(seconds).padStart(2, "0")}s`;
  return `${seconds}s`;
}
