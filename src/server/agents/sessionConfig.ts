/**
 * Per-ticket agent session configs. Encapsulates the security posture the tmux sessions carried in
 * deposited `.claude/settings.json` + `.claude/agents/*.md`, now expressed as SDK session options:
 * a bash allowlist (`dontAsk` denies everything else) plus the implementer/pr-fixer subagents passed
 * programmatically instead of written into the worktree.
 */

import type { Ticket } from "../../shared/schemas.ts";
import { MODELS } from "../config.ts";
import type { AgentSubagentDefinition } from "../system/agentSession.ts";

import type { SessionStartConfig } from "./sessionHub.ts";

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
    agents: {
      implementer: implementerAgent(implementerModel, implementerEffort),
      "pr-fixer": prFixerAgent(implementerModel, implementerEffort),
    },
  };
}
