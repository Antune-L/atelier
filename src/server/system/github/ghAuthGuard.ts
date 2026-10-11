/**
 * Agents never manage gh credentials: `gh auth` (login, logout, switch, token, setup-git…) is denied
 * in every Claude and Codex session, whatever its position in a compound command. A project's
 * account is chosen by the server through GH_CONFIG_DIR only.
 */

/** Claude settings deny rule mirroring the hook. */
export const GH_AUTH_PERMISSION_DENY = "Bash(gh auth:*)";

export const GH_AUTH_DENIAL_REASON = "Les commandes « gh auth » sont interdites : le compte GitHub du projet est fixé par le serveur.";

/**
 * True when the shell command would EXECUTE `gh auth`. Quoted arguments are ignored (a commit
 * message or a grep mentioning "gh auth" is allowed), except where quotes still run code: the
 * script of `sh -c`/`bash -c`/`eval`, and `$(…)` / backtick substitutions.
 *
 * NOTE: self-contained on purpose (no outer references): the Codex hook script embeds its source
 * through `Function.prototype.toString`, so both providers evaluate the exact same matcher.
 */
export function isGhAuthCommand(command: string): boolean {
  const candidates = [command];
  for (const match of command.matchAll(/(?:\B-c|\beval)\s+(["'])((?:\\.|(?!\1)[^\\])*)\1/g)) candidates.push(match[2] ?? "");
  for (const match of command.matchAll(/\$\(([^()]*)\)|`([^`]*)`/g)) candidates.push(match[1] ?? match[2] ?? "");
  const execution = /(?:^|[;&|(\n`]|\$\()\s*(?:(?:env|command|exec|sudo|time|nice|nohup)\s+|[A-Za-z_][A-Za-z0-9_]*=\S*\s+)*(?:\S*\/)?gh(?:\s+-{1,2}\S+(?:\s+(?!auth\b)[^\s-]\S*)?)*\s+auth(?:\s|$)/;
  return candidates.some((candidate) => {
    const unquoted = candidate.replace(/"(?:\\.|[^"\\])*"|'[^']*'/g, " ''");
    return execution.test(unquoted);
  });
}
