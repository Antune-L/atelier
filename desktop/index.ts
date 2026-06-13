import { join } from "node:path";

import Electrobun, { BrowserWindow, PATHS, app } from "electrobun/bun";

import { applyDesktopEnv, ensureConfig, type DesktopRoots } from "./bootstrap.ts";
import { repairPath } from "./repairPath.ts";

/**
 * Electrobun main process. Boots the Bun backend in-process and points a native WebKit window at
 * http://localhost:<port> — NOT views:// — so /api and /ws stay same-origin and the front needs
 * zero change (PRD §2). Ordering is load-bearing: bootstrap config + env BEFORE importing the
 * server (its config.ts throws at import time when config.json is missing), hence the dynamic import.
 *
 * Sidecar fallback (D1): if Bun.serve cannot bind from the Electrobun worker thread on a notarized
 * build (spike L0.3), spawn the server as a child instead:
 *   const sidecar = Bun.spawn([bunPath, join(resourcesRoot, "dist/agents/server.js")], { env: process.env });
 * then poll /health and open the window the same way. Kept documented, not wired, since in-process
 * is the chosen path. TODO(ali): validate L0.3 on a real notarized build before relying on either.
 */

const WINDOW_TITLE = "Kanban Agents";
const WINDOW_WIDTH = 1440;
const WINDOW_HEIGHT = 900;
const HEALTH_POLL_INTERVAL_MS = 150;
const HEALTH_POLL_TIMEOUT_MS = 30_000;

/**
 * Absolute path to the bundled bun. MUST be execPath, not argv0: the Electrobun launcher spawns the
 * worker as `./bun main.js`, so process.argv0 is the relative "./bun". That relative path is written
 * into each slot's .mcp.json (worker server) and .claude/settings.json (hooks) and breaks when claude
 * spawns them from the worktree cwd. execPath always resolves to the absolute bundled binary.
 */
const BUN_PATH = process.execPath;

/** resourcesRoot = bundle's read-only Resources/app (where electrobun.config `copy` lands files). */
function resolveRoots(): DesktopRoots {
  const resourcesRoot = join(PATHS.RESOURCES_FOLDER, "app");
  const dataRoot = join(
    process.env.HOME ?? PATHS.RESOURCES_FOLDER,
    "Library",
    "Application Support",
    "kanban-agents",
  );
  return { resourcesRoot, dataRoot };
}

async function waitForHealth(port: number): Promise<void> {
  const deadline = Date.now() + HEALTH_POLL_TIMEOUT_MS;
  const healthUrl = `http://localhost:${port}/health`;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(healthUrl);
      if (res.ok) return;
    } catch {
      // Server not listening yet; retry until the deadline.
    }
    await Bun.sleep(HEALTH_POLL_INTERVAL_MS);
  }
  throw new Error(`backend health check timed out after ${HEALTH_POLL_TIMEOUT_MS}ms`);
}

async function boot(): Promise<void> {
  const roots = resolveRoots();

  // 1. Bootstrap config + env BEFORE importing the server (config.ts throws at import otherwise).
  const configPath = ensureConfig(roots);
  applyDesktopEnv(roots, configPath, BUN_PATH);

  // 2. Repair the GUI PATH so tmux/claude/gh/git/cursor-agent resolve (macOS Finder launch).
  process.env.PATH = await repairPath();

  // 3. Dynamic import only now that config + env are in place.
  const { startServer } = await import("../src/server/index.ts");
  const server = await startServer({ resourcesRoot: roots.resourcesRoot, dataRoot: roots.dataRoot });

  let tornDown = false;
  const teardown = async (): Promise<void> => {
    if (tornDown) return;
    tornDown = true;
    // Kill detached tmux sessions first (they outlive the process otherwise), then stop the server.
    await server.teardownSessions();
    server.stop();
  };

  // The server is already listening: a health timeout (or a window-open failure) must tear it down,
  // otherwise the listener, watchdog timer, and db handle leak on a dirty exit (acceptance crit. 5).
  try {
    await waitForHealth(server.port);

    // 4. Same-origin window: http://, never views://.
    new BrowserWindow({
      title: WINDOW_TITLE,
      url: `http://localhost:${server.port}`,
      frame: { width: WINDOW_WIDTH, height: WINDOW_HEIGHT, x: 0, y: 0 },
    });
  } catch (error) {
    await teardown().catch(() => undefined);
    throw error;
  }

  // Closing the last window quits the app; tear down the server + tmux sessions before exit. The
  // .catch guarantees quit/exit still runs even if teardown rejects (otherwise the app hangs).
  Electrobun.events.on("close", () => {
    void teardown()
      .catch(() => undefined)
      .then(() => app.quit());
  });
  const onSignal = (): void => {
    void teardown()
      .catch(() => undefined)
      .then(() => process.exit(0));
  };
  process.on("SIGINT", onSignal);
  process.on("SIGTERM", onSignal);
}

await boot();
