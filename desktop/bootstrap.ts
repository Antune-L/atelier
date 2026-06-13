import { existsSync, mkdirSync, copyFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Desktop bootstrap. MUST run before any static import of the server: `loadConfig()` is evaluated at
 * import time in src/server/config.ts and throws when config.json is missing. So the desktop main
 * (1) ensures a writable config.json + data dir exist under dataRoot, (2) exports the env the server
 * reads at boot, then (3) imports startServer dynamically.
 */

const CONFIG_FILE = "config.json";
const UPLOADS_DIR = "uploads";

export interface DesktopRoots {
  /** Read-only bundle assets: dist/web, dist/agents, templates, config.example.json. */
  resourcesRoot: string;
  /** Writable user data: config.json, kanban.db, uploads/, slots/. */
  dataRoot: string;
}

/**
 * Seed the writable data dir on first launch by copying the bundled config.example.json into
 * dataRoot/config.json (never overwrites an existing user config). Returns the config path.
 */
export function ensureConfig(roots: DesktopRoots): string {
  mkdirSync(roots.dataRoot, { recursive: true });
  mkdirSync(join(roots.dataRoot, UPLOADS_DIR), { recursive: true });
  const configPath = join(roots.dataRoot, CONFIG_FILE);
  if (!existsSync(configPath)) {
    copyFileSync(join(roots.resourcesRoot, "config.example.json"), configPath);
  }
  return configPath;
}

/**
 * Export the env the server reads at import + boot time, so a subsequent dynamic import of
 * startServer picks up the writable data dir and the bundled agent entrypoints.
 *  - KANBAN_CONFIG / KANBAN_DB → writable config + db under dataRoot
 *  - KANBAN_AGENT_DIST=1       → spawn the deps-inlined worker/hook .js bundles
 *  - KANBAN_BUN_PATH           → the bundled bun used to spawn those bundles
 *  - KANBAN_DRY_RUN=0 / KANBAN_SETUP=1 → real adapter + first-boot trust seeding
 */
export function applyDesktopEnv(roots: DesktopRoots, configPath: string, bunPath: string): void {
  process.env.KANBAN_CONFIG = configPath;
  process.env.KANBAN_DB = join(roots.dataRoot, "kanban.db");
  process.env.KANBAN_AGENT_DIST = "1";
  process.env.KANBAN_BUN_PATH = bunPath;
  // App mode drives real tmux/claude/git; dev keeps the dry-run default untouched.
  process.env.KANBAN_DRY_RUN ??= "0";
  process.env.KANBAN_SETUP ??= "1";
}
