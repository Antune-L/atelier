import {
  AGENT_EFFORT_FULL_LABELS,
  AGENT_MODEL_FULL_LABELS,
  CODEX_EFFORT_FULL_LABELS,
  CODEX_MODEL_LABELS,
  IMPLEMENTER_LABELS,
  ORCHESTRATOR_LABELS,
  type ProfileConfig,
} from "@shared/constants";

const FRENCH_LOCALE = "fr-FR";
const DOT_SEPARATOR = " · ";
const PIPELINE_ARROW = " → ";
const FAST_LABEL = "FAST";
const CLAUDE_SUBAGENT_PREFIX = "sous-agent ";

const ORCHESTRATOR_ROLE = "Orchestrateur";
const IMPLEMENTER_ROLE = "Implémenté par";
const SUBAGENT_ROLE = "Sous-agent";

const CLAUDE_SUBAGENT_NODE_LABEL = `${ORCHESTRATOR_LABELS.claude} sous-agent`;

/** One read-only step of the profile pipeline strip (role → value → optional model/effort detail). */
export interface ProfilePipelineNode {
  role: string;
  value: string;
  detail: string | null;
}

function lower(label: string): string {
  return label.toLocaleLowerCase(FRENCH_LOCALE);
}

function join(parts: (string | null)[]): string {
  return parts.filter((part) => part !== null).join(DOT_SEPARATOR);
}

function claudeDetail(profile: ProfileConfig): string {
  return join([
    AGENT_MODEL_FULL_LABELS[profile.model],
    lower(AGENT_EFFORT_FULL_LABELS[profile.effort]),
  ]);
}

function codexOrchestratorDetail(profile: ProfileConfig): string {
  return join([
    CODEX_MODEL_LABELS[profile.codexModel],
    lower(CODEX_EFFORT_FULL_LABELS[profile.codexEffort]),
    profile.codexFast ? FAST_LABEL : null,
  ]);
}

function orchestratorDetail(profile: ProfileConfig): string {
  if (profile.orchestrator === "codex") return codexOrchestratorDetail(profile);
  return claudeDetail(profile);
}

function claudeSubagentDetail(profile: ProfileConfig): string {
  return join([
    AGENT_MODEL_FULL_LABELS[profile.implementerModel],
    lower(AGENT_EFFORT_FULL_LABELS[profile.implementerEffort]),
  ]);
}

/** The Codex sub-agent knobs, each falling back to the orchestrator's when left inherited (null). */
function codexSubagentParts(profile: ProfileConfig, includeInherited: boolean): { model: string; extras: string } {
  const model = profile.codexImplementerModel ?? profile.codexModel;
  const effort = includeInherited ? profile.codexImplementerEffort ?? profile.codexEffort : profile.codexImplementerEffort;
  const fast = includeInherited ? profile.codexImplementerFast ?? profile.codexFast : profile.codexImplementerFast;
  return {
    model: CODEX_MODEL_LABELS[model],
    extras: join([
      effort === null ? null : lower(CODEX_EFFORT_FULL_LABELS[effort]),
      fast === true ? FAST_LABEL : null,
    ]),
  };
}

function implementerSummary(profile: ProfileConfig): string {
  if (profile.implementer === "claude") {
    return `${CLAUDE_SUBAGENT_PREFIX}${claudeSubagentDetail(profile)}`;
  }
  if (profile.implementer === "codex") {
    const { model, extras } = codexSubagentParts(profile, false);
    return `${IMPLEMENTER_LABELS.codex} ${join([model, extras === "" ? null : extras])}`;
  }
  return IMPLEMENTER_LABELS.composer;
}

/**
 * One-line human summary of a profile, e.g. "Claude Opus · moyen → sous-agent Opus · faible".
 * Pure: derived from the profile fields only, using the full (non-abbreviated) labels.
 */
export function describeProfile(profile: ProfileConfig): string {
  const orchestrator = `${ORCHESTRATOR_LABELS[profile.orchestrator]} ${orchestratorDetail(profile)}`;
  return `${orchestrator}${PIPELINE_ARROW}${implementerSummary(profile)}`;
}

function implementerNodeValue(profile: ProfileConfig): string {
  if (profile.implementer === "claude") return CLAUDE_SUBAGENT_NODE_LABEL;
  return IMPLEMENTER_LABELS[profile.implementer];
}

function subagentNode(profile: ProfileConfig): ProfilePipelineNode | null {
  if (profile.implementer === "claude") {
    return {
      role: SUBAGENT_ROLE,
      value: AGENT_MODEL_FULL_LABELS[profile.implementerModel],
      detail: lower(AGENT_EFFORT_FULL_LABELS[profile.implementerEffort]),
    };
  }
  if (profile.implementer === "codex") {
    const { model, extras } = codexSubagentParts(profile, true);
    return { role: SUBAGENT_ROLE, value: model, detail: extras === "" ? null : extras };
  }
  return null;
}

/** The 2 or 3 read-only pipeline nodes rendered above the editable profile fields. */
export function buildProfilePipeline(profile: ProfileConfig): ProfilePipelineNode[] {
  const nodes: ProfilePipelineNode[] = [
    {
      role: ORCHESTRATOR_ROLE,
      value: ORCHESTRATOR_LABELS[profile.orchestrator],
      detail: orchestratorDetail(profile),
    },
    { role: IMPLEMENTER_ROLE, value: implementerNodeValue(profile), detail: null },
  ];
  const subagent = subagentNode(profile);
  if (subagent !== null) nodes.push(subagent);
  return nodes;
}
