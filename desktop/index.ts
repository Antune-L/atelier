import { existsSync } from "node:fs";
import { join } from "node:path";

import Electrobun, { ApplicationMenu, BrowserWindow, PATHS, Utils, app } from "electrobun/bun";

import { applyDesktopEnv, ensureConfig, type DesktopRoots } from "./bootstrap.ts";
import { spawnRelauncher } from "./relaunch.ts";
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

const WINDOW_TITLE = "Atelier";
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

/**
 * Standard macOS application menu. Electrobun (WKWebView) drives system shortcuts — fullscreen
 * (Ctrl+Cmd+F), clipboard, undo/redo, window close/quit — off menu items keyed by `role`. Without
 * a menu none of those accelerators fire, so we install the conventional App/Edit/View/Window
 * structure; macOS supplies the canonical accelerators for each role automatically.
 */
function installApplicationMenu(): void {
  ApplicationMenu.setApplicationMenu([
    {
      label: WINDOW_TITLE,
      submenu: [
        { role: "about" },
        { type: "divider" },
        { role: "hide", accelerator: "Command+H" },
        { role: "hideOthers", accelerator: "Option+Command+H" },
        { role: "showAll" },
        { type: "divider" },
        { role: "quit", accelerator: "Command+Q" },
      ],
    },
    {
      label: "Edit",
      submenu: [
        { role: "undo", accelerator: "Command+Z" },
        { role: "redo", accelerator: "Shift+Command+Z" },
        { type: "divider" },
        { role: "cut", accelerator: "Command+X" },
        { role: "copy", accelerator: "Command+C" },
        { role: "paste", accelerator: "Command+V" },
        { role: "pasteAndMatchStyle", accelerator: "Shift+Option+Command+V" },
        { role: "delete" },
        { role: "selectAll", accelerator: "Command+A" },
      ],
    },
    {
      label: "View",
      submenu: [{ role: "toggleFullScreen", accelerator: "Control+Command+F" }],
    },
    {
      label: "Window",
      submenu: [
        { role: "minimize", accelerator: "Command+M" },
        { role: "zoom" },
        { type: "divider" },
        { role: "close", accelerator: "Command+W" },
        { role: "bringAllToFront" },
      ],
    },
  ]);
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

  // The in-app self-update is dev-desktop-only: it needs the real checkout (KANBAN_REPO_ROOT,
  // exported by the dev:desktop script + the relauncher) to be a git working copy. A packaged
  // .app never sets it, so canUpdate stays false there and the button is hidden.
  const repoRoot = process.env.KANBAN_REPO_ROOT;
  const canSelfUpdate = repoRoot != null && existsSync(join(repoRoot, ".git"));

  // Late-bound so onRequestUpdate can reference `server`/`teardown` defined just below.
  let requestUpdate: (() => void) | undefined;

  // 3. Dynamic import only now that config + env are in place.
  const { startServer } = await import("../src/server/index.ts");
  const server = await startServer({
    resourcesRoot: roots.resourcesRoot,
    dataRoot: roots.dataRoot,
    // WKWebView has no web Notification API, so the front's desktop notifications are inert here.
    // Fire a native notification attributed to the app instead (clicking focuses the app window).
    onNotify: (title, body) => Utils.showNotification({ title, body }),
    repoRoot: canSelfUpdate ? repoRoot : undefined,
    onRequestUpdate: canSelfUpdate ? () => requestUpdate?.() : undefined,
  });

  let tornDown = false;
  const teardown = async (): Promise<void> => {
    if (tornDown) return;
    tornDown = true;
    // Kill detached tmux sessions first (they outlive the process otherwise), then stop the server.
    await server.teardownSessions();
    server.stop();
  };

  // Update path: distinct from teardown — it must NEVER kill the tmux sessions (the running jobs
  // must survive the relaunch). Mark tornDown so the window-close handler's teardown no-ops, hand
  // off to the detached relauncher, stop the server (frees port 52817), then exit so the relauncher
  // — which waits on this PID — can rebind. repoRoot is non-null whenever canSelfUpdate gated this in.
  if (canSelfUpdate && repoRoot != null) {
    requestUpdate = (): void => {
      if (tornDown) return;
      tornDown = true;
      spawnRelauncher(repoRoot);
      server.stop();
      process.exit(0);
    };
  }

  // The server is already listening: a health timeout (or a window-open failure) must tear it down,
  // otherwise the listener, watchdog timer, and db handle leak on a dirty exit (acceptance crit. 5).
  try {
    await waitForHealth(server.port);

    // 4. Install the native menu so macOS wires up clipboard/fullscreen/window accelerators.
    installApplicationMenu();

    // 5. Same-origin window: http://, never views://.
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
