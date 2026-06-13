/**
 * macOS GUI apps launched from Finder do NOT inherit the login shell PATH, so `Bun.which` and every
 * spawned CLI (tmux/claude/gh/git/cursor-agent) fail to resolve. Rebuild the PATH once at boot by
 * asking an interactive login zsh for it, then merge it into process.env so all child processes and
 * Bun.which see the full set. No per-spawn change is needed (spawns inherit process.env).
 */

/** Login-interactive zsh sources ~/.zprofile + ~/.zshrc, where Homebrew/asdf/etc. extend PATH. */
const PATH_PROBE_COMMAND = ["zsh", "-ilc", "echo $PATH"] as const;
const PATH_PROBE_TIMEOUT_MS = 5_000;

/**
 * Return the user's login-shell PATH merged with the current one (current entries win on dedupe so
 * the bundled binaries stay reachable). Returns the unchanged PATH on any probe failure.
 */
export async function repairPath(): Promise<string> {
  const current = process.env.PATH ?? "";
  try {
    const proc = Bun.spawn([...PATH_PROBE_COMMAND], { stdout: "pipe", stderr: "ignore" });
    const timer = setTimeout(() => proc.kill(), PATH_PROBE_TIMEOUT_MS);
    const out = (await new Response(proc.stdout).text()).trim();
    clearTimeout(timer);
    await proc.exited;
    if (!out) return current;
    return mergePaths(current, out);
  } catch {
    return current;
  }
}

function mergePaths(current: string, fromShell: string): string {
  const seen = new Set<string>();
  const merged: string[] = [];
  for (const entry of [...current.split(":"), ...fromShell.split(":")]) {
    if (entry && !seen.has(entry)) {
      seen.add(entry);
      merged.push(entry);
    }
  }
  return merged.join(":");
}
