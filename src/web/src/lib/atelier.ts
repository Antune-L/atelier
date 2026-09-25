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
import type { Conversation } from "@shared/schemas";

import type { BadgeVariant } from "@/components/ui/badge";
import type { ResolvedAgentDefaults } from "@/lib/agentDefaults";

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

export const CONVERSATION_STATUS_VARIANTS: Record<ConversationStatus, BadgeVariant> = {
  exploring: "outline",
  prd_draft: "warning",
  prd_validated: "success",
  cards_created: "secondary",
};

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
