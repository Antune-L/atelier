/**
 * Per-ticket agent session configs. Encapsulates the security posture the tmux sessions carried in
 * deposited `.claude/settings.json` + `.claude/agents/*.md`, now expressed as SDK session options:
 * a bash allowlist (`dontAsk` denies everything else) plus the implementer/pr-fixer subagents passed
 * programmatically instead of written into the worktree.
 */

import {
  FEASIBILITY_SCOUT_AGENT_NAME,
  FEASIBILITY_SLOT_ID,
  SPLIT_SLOT_ID,
  TRIAGE_PLUS_SOLUTIONS_SCOUT_AGENT_NAME,
  TRIAGE_SLOT_ID,
} from "../../shared/constants.ts";
import type { Orchestrator } from "../../shared/constants.ts";
import type { Ticket } from "../../shared/schemas.ts";
import { MODELS } from "../config.ts";
import type { AgentSubagentDefinition, StdioMcpServerDefinition } from "../system/agentSession.ts";

import type { SessionStartConfig } from "./sessionHub.ts";

/**
 * Safe built-in tools auto-approved for a full implementation session. Under `dontAsk` every tool is
 * denied unless pre-approved, so the implementer's non-bash surface is allow-listed here; bash stays
 * pattern-gated via `permissionAllow` (a bare `Bash` is deliberately absent). The composer driver runs
 * through its own `Bash(<script>:*)` allow rule.
 */
const IMPLEMENTER_SAFE_TOOLS = [
  "Read",
  "Edit",
  "Write",
  "Glob",
  "Grep",
  "NotebookEdit",
  "WebFetch",
  "WebSearch",
  "TodoWrite",
  "Task",
  "Agent",
  "BashOutput",
  "KillShell",
];

/**
 * Skills referenced by the pipeline contract (review, regression map, mockup fidelity, PR feedback
 * triage). The provider adapts these project instructions to its own session format.
 */
const CONTRACT_SKILLS = ["argus-review", "regression-check", "mockup-fidelity-review", "minos-pr-feedback"];

/** Read-only triage/feasibility/split sessions invoke no skill; scope context to none. */
const NO_SKILLS: string[] = [];

/**
 * Read-only Figma MCP tools (remote server of the `figma@claude-plugins-official` plugin, merged into
 * the session via the provider's `user` settingSource). Allow-listed so read-only analysis sessions
 * can consult figma.com links referenced in tickets; the write-capable figma tools (use_figma,
 * create_new_file…) stay denied under `dontAsk`. These tools load deferred — `ToolSearch` is granted
 * alongside so sessions can fetch their schemas.
 */
const FIGMA_READONLY_TOOLS = [
  "mcp__plugin_figma_figma__get_design_context",
  "mcp__plugin_figma_figma__get_screenshot",
  "mcp__plugin_figma_figma__get_metadata",
  "mcp__plugin_figma_figma__get_variable_defs",
  "mcp__plugin_figma_figma__get_figjam",
];

/**
 * Read-only Slack MCP tools (claude.ai connector, merged via the provider's `user` settingSource when
 * the host account has the Slack connector active). Lets sessions consult Slack threads/canvases
 * referenced in tickets; every write-capable tool (send_message, create_canvas, add_reaction…) stays
 * denied under `dontAsk`. Like the Figma tools these load deferred, behind `ToolSearch`.
 */
const SLACK_READONLY_TOOLS = [
  "mcp__claude_ai_Slack__slack_read_channel",
  "mcp__claude_ai_Slack__slack_read_thread",
  "mcp__claude_ai_Slack__slack_read_canvas",
  "mcp__claude_ai_Slack__slack_read_file",
  "mcp__claude_ai_Slack__slack_read_user_profile",
  "mcp__claude_ai_Slack__slack_search_channels",
  "mcp__claude_ai_Slack__slack_search_public",
  "mcp__claude_ai_Slack__slack_search_public_and_private",
  "mcp__claude_ai_Slack__slack_search_users",
  "mcp__claude_ai_Slack__slack_list_channel_members",
  "mcp__claude_ai_Slack__slack_get_reactions",
];

/**
 * Headless isolated browser for the mandatory functional-verification step (5b) of verifyFeature
 * tickets. `--isolated` keeps profile state per session so parallel slots never share a browser;
 * Chromium must be pre-installed once (`npx playwright install chromium`) or the first session pays
 * the download.
 */
const PLAYWRIGHT_MCP_SERVER: StdioMcpServerDefinition = {
  command: "npx",
  args: ["-y", "@playwright/mcp", "--isolated", "--headless"],
};

/** Read-only tool surface for a triage/feasibility session (Edit/Write/Bash are structurally removed). */
const READONLY_TOOLS = ["Read", "Glob", "Grep", "ToolSearch", ...FIGMA_READONLY_TOOLS, ...SLACK_READONLY_TOOLS];
const CODEX_READONLY_TOOLS = ["Read", "Glob", "Grep", "ToolSearch"];
/** Tools removed from a plain (non-fan-out) read-only session: no writes, no sub-agent recursion. */
const READONLY_PLAIN_DISALLOWED = ["Edit", "Write", "Bash", "Task", "Agent"];
/** Tools removed from a fan-out read-only session: no writes, no built-in `Task` (scouts go via `Agent`). */
const READONLY_FANOUT_DISALLOWED = ["Edit", "Write", "Bash", "Task"];
/**
 * Built-in spawnable agent types a fan-out read-only orchestrator must never invoke: each carries the
 * full toolset and would re-open unbounded recursion. Denied via `settings.permissions.deny` so only
 * the inline read-only scouts remain invokable through the `Agent` tool.
 */
const DENIED_BUILTIN_AGENTS = ["general-purpose", "Explore", "Plan"];

/** Read-only scout tool bounds: the inline sub-agents cannot write, run bash, or recurse. */
const SCOUT_TOOLS = ["Read", "Glob", "Grep", "ToolSearch", ...FIGMA_READONLY_TOOLS, ...SLACK_READONLY_TOOLS];
const SCOUT_DISALLOWED = ["Task", "Agent", "Bash", "Edit", "Write"];

const FIGMA_TOOLS_HINT =
  "Si le ticket référence un lien figma.com, consulte la maquette via les outils MCP Figma de " +
  "lecture (get_screenshot, get_design_context — namespace `mcp__plugin_figma_figma`, à charger " +
  "via ta recherche de tools s'ils sont différés). De même, un lien slack.com se consulte via les " +
  "outils MCP Slack de lecture (slack_read_thread, slack_read_channel — namespace `mcp__claude_ai_Slack`).";

const CODEX_EXTERNAL_TOOLS_HINT =
  "N'affirme avoir consulté un lien Figma ou Slack que si un outil de lecture correspondant est " +
  "réellement présent dans cette session Codex. Sinon, signale explicitement le lien non consultable.";

const FEASIBILITY_SCOUT_PROMPT =
  "Tu es un scout de faisabilité en LECTURE SEULE. Tu ne peux ni modifier le dépôt, ni exécuter " +
  "de commande, ni lancer d'autre sous-agent. Évalue le ticket " +
  "fourni EXACTEMENT tel qu'il est écrit, fonde chaque affirmation sur du code réellement lu.";

const SOLUTIONS_SCOUT_PROMPT =
  "Tu es un scout de solutions en LECTURE SEULE. Tu ne peux ni modifier le dépôt, ni exécuter de " +
  "commande, ni lancer d'autre sous-agent. Pour le ticket " +
  "et l'angle fournis, propose UNE approche concrète et déployable. Retourne : Recommendation " +
  "(l'approche), Evidence (fichiers:line ou raisonnement), Trade-offs, Confidence (high/medium/low).";

function feasibilityScoutAgent(driver: Orchestrator): AgentSubagentDefinition {
  return {
    description: "Évalue en lecture seule la faisabilité d'UN ticket contre le dépôt.",
    prompt: `${FEASIBILITY_SCOUT_PROMPT} ${driver === "codex" ? CODEX_EXTERNAL_TOOLS_HINT : FIGMA_TOOLS_HINT}`,
    role: "scout",
    tools: driver === "codex" ? CODEX_READONLY_TOOLS : SCOUT_TOOLS,
    disallowedTools: SCOUT_DISALLOWED,
  };
}

function solutionsScoutAgent(driver: Orchestrator): AgentSubagentDefinition {
  return {
    description: "Identifie en lecture seule des approches de solution concrètes pour UN ticket.",
    prompt: `${SOLUTIONS_SCOUT_PROMPT} ${driver === "codex" ? CODEX_EXTERNAL_TOOLS_HINT : FIGMA_TOOLS_HINT}`,
    role: "scout",
    tools: driver === "codex" ? CODEX_READONLY_TOOLS : SCOUT_TOOLS,
    disallowedTools: SCOUT_DISALLOWED,
  };
}

export interface TriageSessionInput {
  ticketId: string;
  cwd: string;
  model: string;
  effort: string | null;
  serviceTier?: "default" | "fast";
  /** "Analyse +" deep variant: fan out the feasibility + solutions scouts via the `Agent` tool. */
  deep: boolean;
  /** Which agent drives the triage; both providers use independent scouts for Analyse +. */
  driver: Orchestrator;
}

/** Config for a read-only feasibility-triage session (no worktree/slot; only `submit_triage` is gated in). */
export function buildTriageSessionConfig(input: TriageSessionInput): SessionStartConfig {
  const { ticketId, cwd, model, effort, serviceTier = "default", deep, driver } = input;
  if (driver === "codex") {
    return {
      ticketId,
      slotId: TRIAGE_SLOT_ID,
      cwd,
      provider: "codex",
      model,
      effort,
      serviceTier,
      role: "triage",
      permissionMode: "dontAsk",
      readOnly: true,
      allowedTools: deep ? [...CODEX_READONLY_TOOLS, "Agent"] : [...CODEX_READONLY_TOOLS],
      disallowedTools: deep ? READONLY_FANOUT_DISALLOWED : READONLY_PLAIN_DISALLOWED,
      skills: NO_SKILLS,
      ...(deep
        ? {
            agents: {
              [FEASIBILITY_SCOUT_AGENT_NAME]: feasibilityScoutAgent(driver),
              [TRIAGE_PLUS_SOLUTIONS_SCOUT_AGENT_NAME]: solutionsScoutAgent(driver),
            },
          }
        : {}),
    };
  }
  const base: SessionStartConfig = {
    ticketId,
    slotId: TRIAGE_SLOT_ID,
    cwd,
    provider: "claude",
    model,
    effort,
    role: "triage",
    permissionMode: "dontAsk",
    allowedTools: deep ? [...READONLY_TOOLS, "Agent"] : [...READONLY_TOOLS],
    disallowedTools: deep ? READONLY_FANOUT_DISALLOWED : READONLY_PLAIN_DISALLOWED,
    skills: NO_SKILLS,
  };
  if (!deep) return base;
  return {
    ...base,
    permissionDeny: DENIED_BUILTIN_AGENTS.map((name) => `Agent(${name})`),
    agents: {
      [FEASIBILITY_SCOUT_AGENT_NAME]: feasibilityScoutAgent(driver),
      [TRIAGE_PLUS_SOLUTIONS_SCOUT_AGENT_NAME]: solutionsScoutAgent(driver),
    },
  };
}

export interface SplitSessionInput {
  ticketId: string;
  cwd: string;
  model: string;
  effort: string | null;
  serviceTier?: "default" | "fast";
  /** Which agent drives the split (codex = read-only sandbox). */
  driver: Orchestrator;
}

/** Config for a read-only ticket-split session (no worktree/slot; only `submit_split` is gated in). */
export function buildSplitSessionConfig(input: SplitSessionInput): SessionStartConfig {
  const { ticketId, cwd, model, effort, serviceTier = "default", driver } = input;
  if (driver === "codex") {
    return {
      ticketId,
      slotId: SPLIT_SLOT_ID,
      cwd,
      provider: "codex",
      model,
      effort,
      serviceTier,
      role: "split",
      permissionMode: "dontAsk",
      readOnly: true,
    };
  }
  return {
    ticketId,
    slotId: SPLIT_SLOT_ID,
    cwd,
    provider: "claude",
    model,
    effort,
    role: "split",
    permissionMode: "dontAsk",
    allowedTools: [...READONLY_TOOLS],
    disallowedTools: READONLY_PLAIN_DISALLOWED,
    skills: NO_SKILLS,
  };
}

export interface FeasibilitySessionInput {
  batchId: string;
  cwd: string;
  model: string;
  effort: string | null;
  serviceTier?: "default" | "fast";
  driver: Orchestrator;
}

/** Config for a read-only batch feasibility session (fans out one scout per ticket via the `Agent` tool). */
export function buildFeasibilitySessionConfig(input: FeasibilitySessionInput): SessionStartConfig {
  const { batchId, cwd, model, effort, serviceTier = "default", driver } = input;
  return {
    ticketId: batchId,
    slotId: FEASIBILITY_SLOT_ID,
    cwd,
    provider: driver,
    model,
    effort,
    serviceTier,
    role: "feasibility",
    ownerType: "batch",
    ownerId: batchId,
    permissionMode: "dontAsk",
    allowedTools: [...(driver === "codex" ? CODEX_READONLY_TOOLS : READONLY_TOOLS), "Agent"],
    disallowedTools: READONLY_FANOUT_DISALLOWED,
    permissionDeny: DENIED_BUILTIN_AGENTS.map((name) => `Agent(${name})`),
    agents: { [FEASIBILITY_SCOUT_AGENT_NAME]: feasibilityScoutAgent(driver) },
    skills: NO_SKILLS,
  };
}

/** Bash commands the agent may run without escalation; under `dontAsk` everything else is denied. */
const BASH_ALLOWLIST = [
  "Bash(git status:*)",
  "Bash(git add:*)",
  "Bash(git commit:*)",
  "Bash(git push:*)",
  "Bash(git fetch:*)",
  "Bash(git diff:*)",
  "Bash(git log:*)",
  "Bash(git checkout:*)",
  "Bash(git branch:*)",
  "Bash(git rev-parse:*)",
  "Bash(git restore:*)",
  // Auto-merge conflict resolution: rebase the PR branch onto the base and continue through conflicts.
  "Bash(git rebase:*)",
  "Bash(bun:*)",
  "Bash(bunx:*)",
  "Bash(npm run:*)",
  "Bash(pnpm:*)",
  "Bash(yarn:*)",
  "Bash(node:*)",
  "Bash(sleep:*)",
  "Bash(tail:*)",
  "Bash(gh pr create:*)",
  "Bash(gh pr view:*)",
  // Review pipeline: list/diff PRs, post one inline review via the API.
  "Bash(gh pr list:*)",
  "Bash(gh pr diff:*)",
  "Bash(gh pr comment:*)",
  "Bash(gh api:*)",
  "Bash(gh repo view:*)",
  "Bash(ls:*)",
  "Bash(cat:*)",
  "Bash(grep:*)",
  "Bash(rg:*)",
  "Bash(find:*)",
  // Shell helpers used to build the commentable-line set for inline posting.
  "Bash(awk:*)",
  "Bash(sed:*)",
  "Bash(cut:*)",
  "Bash(sort:*)",
  "Bash(head:*)",
  "Bash(wc:*)",
  "Bash(mktemp:*)",
  "Bash(mkdir:*)",
  "Bash(echo:*)",
];

const IMPLEMENTER_PROMPT = `Tu es le sous-agent implémenteur. Ton unique rôle est d'écrire le code de la fonctionnalité décrite, intégralement, dans le worktree courant.

Consignes :
- Implémente de bout en bout la fonctionnalité demandée. Si un chemin de PRD t'est fourni dans le prompt, lis-le et traite-le comme le contrat à respecter.
- Travaille uniquement dans le répertoire de travail courant (le worktree). Ne touche à aucun fichier en dehors.
- Respecte les conventions de code du projet.
- Ne commit JAMAIS, ne push JAMAIS, n'ouvre JAMAIS de PR : la session orchestratrice garde la main sur git, la review, les tests et la PR.
- Quand tu as terminé, rends la main en résumant ce que tu as implémenté et les fichiers touchés.`;

const PR_FIXER_PROMPT = `Tu es le sous-agent pr-fixer. Ton unique rôle est d'appliquer les corrections pertinentes des retours de review d'une PR, intégralement, dans le worktree courant (déjà positionné sur la branche head de la PR).

Consignes :
- Tu reçois dans ton prompt les findings de review et/ou le numéro de la PR. Tu peux aussi lire les commentaires de review postés via \`gh pr view <url> --json reviews\` et \`gh api\`.
- N'applique que les corrections PERTINENTES (ignore les nits et les points hors périmètre).
- Respecte les conventions de code du projet.
- Travaille uniquement dans le répertoire de travail courant (le worktree). Ne touche à aucun fichier en dehors.
- Ne commit JAMAIS, ne push JAMAIS, n'ouvre JAMAIS de PR : la session orchestratrice garde la main sur git, les tests et la PR.
- Quand tu as terminé, rends la main en résumant ce que tu as corrigé et les fichiers touchés.`;

function implementerAgent(model: string, effort: string, serviceTier?: "default" | "fast"): AgentSubagentDefinition {
  return {
    description:
      "Implémente intégralement la fonctionnalité demandée dans le worktree courant. Ne commit, ne push, n'ouvre jamais de PR.",
    prompt: IMPLEMENTER_PROMPT,
    model,
    effort,
    ...(serviceTier ? { serviceTier } : {}),
    role: "implementer",
  };
}

function prFixerAgent(model: string, effort: string, serviceTier?: "default" | "fast"): AgentSubagentDefinition {
  return {
    description:
      "Applique les corrections demandées par les retours de review d'une PR dans le worktree courant. Ne commit, ne push, n'ouvre jamais de PR.",
    prompt: PR_FIXER_PROMPT,
    model,
    effort,
    ...(serviceTier ? { serviceTier } : {}),
    role: "implementer",
  };
}

export interface ImplementSessionInput {
  ticket: Ticket;
  slotId: number;
  cwd: string;
  /** Absolute path to the vendored Composer driver script (allowed bash for the composer implementer). */
  composerScriptPath: string;
  /** Provider-side conversation to resume on a relaunch (Codex only; Claude restarts fresh). */
  resumeSessionId?: string;
}

/** Resolved Codex knobs for a ticket: per-ticket override, else the persisted app-settings default. */
export function codexKnobs(ticket: Ticket): { model: string; effort: string; serviceTier: "default" | "fast" } {
  return {
    model: ticket.codexModel ?? MODELS.codexModel,
    effort: ticket.codexEffort ?? MODELS.codexEffort,
    serviceTier: ticket.codexFast ? "fast" : "default",
  };
}

/** Resolve the independent Codex writer, preserving an explicit FAST=false override. */
export function codexImplementerKnobs(ticket: Ticket): { model: string; effort: string; serviceTier: "default" | "fast" } {
  return {
    model: ticket.codexImplementerModel ?? ticket.codexModel ?? MODELS.codexModel,
    effort: ticket.codexImplementerEffort ?? ticket.codexEffort ?? MODELS.codexEffort,
    serviceTier: (ticket.codexImplementerFast ?? ticket.codexFast) ? "fast" : "default",
  };
}

/** Config for a feature/ask/review/clean/conflict implementation session (full tools, git-owning). */
export function buildImplementSessionConfig(input: ImplementSessionInput): SessionStartConfig {
  const { ticket, slotId, cwd, composerScriptPath, resumeSessionId } = input;
  // A ticket whose ORCHESTRATOR is "codex" runs EVERY session on Codex, including the auto-triggered
  // conflict-resolution one (buildConflictResolutionContract carries a codex-flavored framing).
  if (ticket.orchestrator === "codex") {
    const knobs = codexKnobs(ticket);
    const delegateKnobs = codexImplementerKnobs(ticket);
    return {
      ticketId: ticket.id,
      slotId,
      cwd,
      provider: "codex",
      model: knobs.model,
      effort: knobs.effort,
      serviceTier: knobs.serviceTier,
      delegateProvider: "codex",
      delegateModel: delegateKnobs.model,
      delegateEffort: delegateKnobs.effort,
      delegateServiceTier: delegateKnobs.serviceTier,
      role: "orchestrator",
      permissionMode: "dontAsk",
      // An ask ticket never writes: pin the Codex sandbox to read-only instead of tool-gating.
      ...(ticket.kind === "ask" ? { readOnly: true } : {}),
      ...(resumeSessionId ? { resumeSessionId } : {}),
      allowedTools: [...IMPLEMENTER_SAFE_TOOLS, "ToolSearch", ...(ticket.verifyFeature ? ["mcp__playwright"] : [])],
      skills: CONTRACT_SKILLS,
      agents: {
        implementer: implementerAgent(delegateKnobs.model, delegateKnobs.effort, delegateKnobs.serviceTier),
        "pr-fixer": prFixerAgent(delegateKnobs.model, delegateKnobs.effort, delegateKnobs.serviceTier),
      },
      ...(ticket.verifyFeature ? { extraMcpServers: { playwright: PLAYWRIGHT_MCP_SERVER } } : {}),
    };
  }
  const implementerModel = ticket.implementerModel ?? MODELS.implementerModel;
  const implementerEffort = ticket.implementerEffort ?? MODELS.implementerEffort;
  const delegateKnobs = ticket.implementer === "codex" ? codexImplementerKnobs(ticket) : null;
  const delegateModel = delegateKnobs?.model ?? (ticket.implementer === "claude" ? implementerModel : null);
  const delegateEffort = delegateKnobs?.effort ?? (ticket.implementer === "claude" ? implementerEffort : null);
  return {
    ticketId: ticket.id,
    slotId,
    cwd,
    provider: "claude",
    model: ticket.model ?? MODELS.implement,
    effort: ticket.effort ?? MODELS.implementEffort,
    role: "orchestrator",
    delegateProvider: ticket.implementer,
    delegateModel,
    delegateEffort,
    delegateServiceTier: delegateKnobs?.serviceTier,
    permissionMode: "dontAsk",
    permissionAllow: [...BASH_ALLOWLIST, `Bash(${composerScriptPath}:*)`],
    allowedTools: [
      ...IMPLEMENTER_SAFE_TOOLS,
      "ToolSearch",
      ...SLACK_READONLY_TOOLS,
      // "mcp__playwright" (server-level rule) allows every tool of the attached Playwright server.
      ...(ticket.verifyFeature ? ["mcp__playwright"] : []),
    ],
    skills: CONTRACT_SKILLS,
    agents: {
      implementer: implementerAgent(implementerModel, implementerEffort),
      "pr-fixer": prFixerAgent(implementerModel, implementerEffort),
    },
    ...(ticket.verifyFeature ? { extraMcpServers: { playwright: PLAYWRIGHT_MCP_SERVER } } : {}),
  };
}
