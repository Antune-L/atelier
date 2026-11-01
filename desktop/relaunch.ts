import { join } from "node:path";

// NOTE(ali): Source updates install the committed dependency graph and rebuild before this handoff.
// NOTE(ali): The update admission gate excludes live provider sessions; preserved tmux shells are user shells only.

const RELAUNCH_LOG = ".update.log";
const MAX_EXIT_POLLS = 300;
const EXIT_POLL_SECONDS = 0.2;
/** Electrobun's bin shim (`#!/usr/bin/env node`); run from repoRoot so its projectRoot = repoRoot. */
const ELECTROBUN_BIN = join("node_modules", ".bin", "electrobun");

export function spawnRelauncher(repoRoot: string): void {
  const logPath = join(repoRoot, RELAUNCH_LOG);
  const bin = join(repoRoot, ELECTROBUN_BIN);
  // Wait for THIS process (the dying backend) to release the port, then relaunch. stdout/stderr are
  // redirected to <repoRoot>/.update.log inside the shell so we can fully detach (ignore here).
  const script = [
    'attempt=0',
    'while kill -0 "$4" 2>/dev/null; do',
    `  if [ "$attempt" -ge ${MAX_EXIT_POLLS} ]; then`,
    '    printf "%s\\n" "Source update restart timed out. Inspect the recovery receipt before retrying." >> "$3"',
    '    exit 1',
    '  fi',
    '  attempt=$((attempt + 1))',
    `  sleep ${EXIT_POLL_SECONDS}`,
    'done',
    'cd "$1" || exit 1',
    'exec "$2" dev >> "$3" 2>&1',
  ].join("\n");

  const proc = Bun.spawn(["sh", "-c", script, "atelier-relaunch", repoRoot, bin, logPath, String(process.pid)], {
    cwd: repoRoot,
    stdin: "ignore",
    stdout: "ignore",
    stderr: "ignore",
    // Inherit the repaired GUI PATH (so node/git/bun resolve) and re-export the checkout root so the
    // relaunched backend anchors slots at <repoRoot>/slots again.
    env: { ...process.env, KANBAN_REPO_ROOT: repoRoot },
    detached: true,
  });
  proc.unref();
}
