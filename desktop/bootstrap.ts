import { mkdirSync } from "node:fs";
import { join } from "node:path";

/**
 * Desktop bootstrap. Runs before importing the server: (1) ensures the writable data dirs exist under
 * dataRoot (dataRoot itself + uploads/), (2) exports the env the server reads at boot, then (3) imports
 * startServer dynamically. The server seeds its own config (legacy config.json is migrated into the
 * SQLite Store on first boot — see src/server/migration.ts), so this no longer seeds a config file.
 */

const CONFIG_FILE = "config.json";
const UPLOADS_DIR = "uploads";

export interface DesktopRoots {
  /** Read-only bundle assets: dist/web, claude-bin, codex-bin, templates, config.example.json. */
  resourcesRoot: string;
  /** Writable user data: config.json, kanban.db, uploads/, slots/. */
  dataRoot: string;
}

/**
 * Ensure the writable data dirs exist on launch (dataRoot + uploads/) and return the config path used
 * for KANBAN_CONFIG. Does NOT seed a config file: the server migrates any legacy config.json into the
 * SQLite Store on first boot (see src/server/migration.ts).
 */
export function ensureConfig(roots: DesktopRoots): string {
  mkdirSync(roots.dataRoot, { recursive: true });
  mkdirSync(join(roots.dataRoot, UPLOADS_DIR), { recursive: true });
  return join(roots.dataRoot, CONFIG_FILE);
}

/**
 * Export the env the server reads at import + boot time, so a subsequent dynamic import of
 * startServer picks up the writable data dir.
 *  - KANBAN_CONFIG / KANBAN_DB → writable config + db under dataRoot
 *  - KANBAN_BUN_PATH           → the bundled bun used to spawn the worktree/user tmux shells
 *  - KANBAN_DRY_RUN=0 / KANBAN_SETUP=1 → real adapter + first-boot trust seeding
 *
 * The agent sessions run in-process via the Agent SDK; the SDK's native `claude` binary is resolved
 * by system/claudeBinary.ts (KANBAN_CLAUDE_BINARY override → require.resolve fallback). A packaged
 * `.app` sets KANBAN_CLAUDE_BINARY to the extracted binary path (see the desktop build).
 */
export function applyDesktopEnv(roots: DesktopRoots, configPath: string, bunPath: string): void {
  process.env.KANBAN_CONFIG = configPath;
  process.env.KANBAN_DB = join(roots.dataRoot, "kanban.db");
  process.env.KANBAN_BUN_PATH = bunPath;
  // App mode drives real tmux/claude/git; dev keeps the dry-run default untouched.
  process.env.KANBAN_DRY_RUN ??= "0";
  process.env.KANBAN_SETUP ??= "1";
}
