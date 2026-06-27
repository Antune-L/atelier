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
import type { Ticket } from "../../shared/schemas.ts";
import { MODELS } from "../config.ts";
import type { AgentSubagentDefinition } from "../system/agentSession.ts";

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

/** Read-only tool surface for a triage/feasibility session (Edit/Write/Bash are structurally removed). */
const READONLY_TOOLS = ["Read", "Glob", "Grep"];
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
const SCOUT_TOOLS = ["Read", "Glob", "Grep"];
const SCOUT_DISALLOWED = ["Task", "Agent", "Bash", "Edit", "Write"];

const FEASIBILITY_SCOUT_PROMPT =
  "Tu es un scout de faisabilité en LECTURE SEULE. Tu n'as que Read, Glob et Grep : tu ne peux " +
  "ni modifier le dépôt, ni exécuter de commande, ni lancer d'autre sous-agent. Évalue le ticket " +
  "fourni EXACTEMENT tel qu'il est écrit, fonde chaque affirmation sur du code réellement lu.";

const SOLUTIONS_SCOUT_PROMPT =
  "Tu es un scout de solutions en LECTURE SEULE. Tu n'as que Read, Glob et Grep : tu ne peux " +
  "ni modifier le dépôt, ni exécuter de commande, ni lancer d'autre sous-agent. Pour le ticket " +
  "et l'angle fournis, propose UNE approche concrète et déployable. Retourne : Recommendation " +
  "(l'approche), Evidence (fichiers:line ou raisonnement), Trade-offs, Confidence (high/medium/low).";

function feasibilityScoutAgent(): AgentSubagentDefinition {
  return {
    description: "Évalue en lecture seule la faisabilité d'UN ticket contre le dépôt.",
    prompt: FEASIBILITY_SCOUT_PROMPT,
    tools: SCOUT_TOOLS,
    disallowedTools: SCOUT_DISALLOWED,
  };
}

function solutionsScoutAgent(): AgentSubagentDefinition {
  return {
    description: "Identifie en lecture seule des approches de solution concrètes pour UN ticket.",
    prompt: SOLUTIONS_SCOUT_PROMPT,
    tools: SCOUT_TOOLS,
    disallowedTools: SCOUT_DISALLOWED,
  };
}

export interface TriageSessionInput {
  ticketId: string;
  cwd: string;
  model: string;
  effort: string | null;
  /** "Analyse +" deep variant: fan out the feasibility + solutions scouts via the `Agent` tool. */
  deep: boolean;
}

/** Config for a read-only feasibility-triage session (no worktree/slot; only `submit_triage` is gated in). */
export function buildTriageSessionConfig(input: TriageSessionInput): SessionStartConfig {
  const { ticketId, cwd, model, effort, deep } = input;
  const base: SessionStartConfig = {
    ticketId,
    slotId: TRIAGE_SLOT_ID,
    cwd,
    model,
    effort,
    permissionMode: "dontAsk",
    allowedTools: deep ? [...READONLY_TOOLS, "Agent"] : [...READONLY_TOOLS],
    disallowedTools: deep ? READONLY_FANOUT_DISALLOWED : READONLY_PLAIN_DISALLOWED,
  };
  if (!deep) return base;
  return {
    ...base,
    permissionDeny: DENIED_BUILTIN_AGENTS.map((name) => `Agent(${name})`),
    agents: {
      [FEASIBILITY_SCOUT_AGENT_NAME]: feasibilityScoutAgent(),
      [TRIAGE_PLUS_SOLUTIONS_SCOUT_AGENT_NAME]: solutionsScoutAgent(),
    },
  };
}

export interface SplitSessionInput {
  ticketId: string;
  cwd: string;
  model: string;
  effort: string | null;
}

/** Config for a read-only ticket-split session (no worktree/slot; only `submit_split` is gated in). */
export function buildSplitSessionConfig(input: SplitSessionInput): SessionStartConfig {
  const { ticketId, cwd, model, effort } = input;
  return {
    ticketId,
    slotId: SPLIT_SLOT_ID,
    cwd,
    model,
    effort,
    permissionMode: "dontAsk",
    allowedTools: [...READONLY_TOOLS],
    disallowedTools: READONLY_PLAIN_DISALLOWED,
  };
}

export interface FeasibilitySessionInput {
  batchId: string;
  cwd: string;
  model: string;
  effort: string | null;
}

/** Config for a read-only batch feasibility session (fans out one scout per ticket via the `Agent` tool). */
export function buildFeasibilitySessionConfig(input: FeasibilitySessionInput): SessionStartConfig {
  const { batchId, cwd, model, effort } = input;
  return {
    ticketId: batchId,
    slotId: FEASIBILITY_SLOT_ID,
    cwd,
    model,
    effort,
    permissionMode: "dontAsk",
    allowedTools: [...READONLY_TOOLS, "Agent"],
    disallowedTools: READONLY_FANOUT_DISALLOWED,
    permissionDeny: DENIED_BUILTIN_AGENTS.map((name) => `Agent(${name})`),
    agents: { [FEASIBILITY_SCOUT_AGENT_NAME]: feasibilityScoutAgent() },
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
  // Review pipeline (argus): list/diff PRs, post one inline review via the API.
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
  // Shell helpers argus uses to build the commentable-line set for inline posting.
  "Bash(awk:*)",
  "Bash(sed:*)",
  "Bash(cut:*)",
  "Bash(sort:*)",
  "Bash(head:*)",
  "Bash(wc:*)",
  "Bash(mktemp:*)",
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
- Tu reçois dans ton prompt les findings d'argus et/ou le numéro de la PR. Tu peux aussi lire les commentaires de review postés via \`gh pr view <url> --json reviews\` et \`gh api\`.
- N'applique que les corrections PERTINENTES (ignore les nits et les points hors périmètre).
- Respecte les conventions de code du projet.
- Travaille uniquement dans le répertoire de travail courant (le worktree). Ne touche à aucun fichier en dehors.
- Ne commit JAMAIS, ne push JAMAIS, n'ouvre JAMAIS de PR : la session orchestratrice garde la main sur git, les tests et la PR.
- Quand tu as terminé, rends la main en résumant ce que tu as corrigé et les fichiers touchés.`;

function implementerAgent(model: string, effort: string): AgentSubagentDefinition {
  return {
    description:
      "Implémente intégralement la fonctionnalité demandée dans le worktree courant. Ne commit, ne push, n'ouvre jamais de PR.",
    prompt: IMPLEMENTER_PROMPT,
    model,
    effort,
  };
}

function prFixerAgent(model: string, effort: string): AgentSubagentDefinition {
  return {
    description:
      "Applique les corrections demandées par les retours de review d'une PR dans le worktree courant. Ne commit, ne push, n'ouvre jamais de PR.",
    prompt: PR_FIXER_PROMPT,
    model,
    effort,
  };
}

export interface ImplementSessionInput {
  ticket: Ticket;
  slotId: number;
  cwd: string;
  /** Absolute path to the vendored Composer driver script (allowed bash for the composer implementer). */
  composerScriptPath: string;
}

/** Config for a feature/ask/review/clean/conflict implementation session (full tools, git-owning). */
export function buildImplementSessionConfig(input: ImplementSessionInput): SessionStartConfig {
  const { ticket, slotId, cwd, composerScriptPath } = input;
  const implementerModel = ticket.implementerModel ?? MODELS.implementerModel;
  const implementerEffort = ticket.implementerEffort ?? MODELS.implementerEffort;
  return {
    ticketId: ticket.id,
    slotId,
    cwd,
    model: ticket.model ?? MODELS.implement,
    effort: ticket.effort ?? MODELS.implementEffort,
    permissionMode: "dontAsk",
    permissionAllow: [...BASH_ALLOWLIST, `Bash(${composerScriptPath}:*)`],
    allowedTools: IMPLEMENTER_SAFE_TOOLS,
    agents: {
      implementer: implementerAgent(implementerModel, implementerEffort),
      "pr-fixer": prFixerAgent(implementerModel, implementerEffort),
    },
  };
}
