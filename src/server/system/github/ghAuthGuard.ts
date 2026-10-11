/**
 * Agents never manage gh credentials: `gh auth` (login, logout, switch, token, setup-git…) is denied
 * in every Claude and Codex session, whatever its position in a compound command. A project's
 * account is chosen by the server through GH_CONFIG_DIR only.
 */

/** Exported as source so the Codex shell hook evaluates the exact same matcher. */
export const GH_AUTH_PATTERN_SOURCE = String.raw`(?:^|[\s;&|()\x60'"$])(?:[^\s;&|()\x60'"]*\/)?gh(?:\s+-{1,2}\S+(?:\s+(?!auth\b)[^\s-]\S*)?)*\s+auth(?:\s|$|[;&|)\x60'"])`;
const GH_AUTH_PATTERN = new RegExp(GH_AUTH_PATTERN_SOURCE);

/** Claude settings deny rule mirroring the hook. */
export const GH_AUTH_PERMISSION_DENY = "Bash(gh auth:*)";

export const GH_AUTH_DENIAL_REASON = "Les commandes « gh auth » sont interdites : le compte GitHub du projet est fixé par le serveur.";

export function isGhAuthCommand(command: string): boolean {
  return GH_AUTH_PATTERN.test(command);
}
