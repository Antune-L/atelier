import { join } from "node:path";

/**
 * Dev-desktop self-update relauncher. The update endpoint already pulled + rebuilt; here we hand
 * off to a DETACHED process that outlives this one, waits for it (and its port 52817 listener) to
 * die, then re-runs `electrobun dev` in the real checkout — which rewipes build/ and rebuilds the
 * bundle from the fresh dist/. The detached + unref'd child survives our process.exit; the
 * kill-0 wait avoids the EADDRINUSE race a too-eager rebind would hit (pattern: Electrobun's
 * Updater spin-wait on the old PID).
 *
 * Agent tmux sessions are intentionally NOT torn down by the update path, so they survive the gap
 * and the fresh backend re-attaches them on boot (SlotManager.recover + worker WS reconnect).
 */

const RELAUNCH_LOG = ".update.log";
/** Electrobun's bin shim (`#!/usr/bin/env node`); run from repoRoot so its projectRoot = repoRoot. */
const ELECTROBUN_BIN = join("node_modules", ".bin", "electrobun");

export function spawnRelauncher(repoRoot: string): void {
  const logPath = join(repoRoot, RELAUNCH_LOG);
  const bin = join(repoRoot, ELECTROBUN_BIN);
  // Wait for THIS process (the dying backend) to release the port, then relaunch. stdout/stderr are
  // redirected to <repoRoot>/.update.log inside the shell so we can fully detach (ignore here).
  const script = [
    `while kill -0 ${process.pid} 2>/dev/null; do sleep 0.2; done`,
    `cd ${JSON.stringify(repoRoot)}`,
    `exec ${JSON.stringify(bin)} dev >> ${JSON.stringify(logPath)} 2>&1`,
  ].join("\n");

  const proc = Bun.spawn(["sh", "-c", script], {
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
