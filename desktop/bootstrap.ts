import { chmodSync, existsSync, mkdirSync, readFileSync, renameSync, unlinkSync, writeFileSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { join } from "node:path";

/**
 * Desktop bootstrap. Runs before importing the server: (1) ensures the writable data dirs exist under
 * dataRoot (dataRoot itself + uploads/), (2) exports the env the server reads at boot, then (3) imports
 * startServer dynamically. The server seeds its own config (legacy config.json is migrated into the
 * SQLite Store on first boot — see src/server/migration.ts), so this no longer seeds a config file.
 */

const CONFIG_FILE = "config.json";
const MCP_TOKEN_FILE = "mcp-token";
const MCP_TOKEN_BYTES = 32;
const PRIVATE_FILE_MODE = 0o600;
const UPLOADS_DIR = "uploads";

export interface DesktopRoots {
  /** Read-only bundle assets: dist/web, codex-bin, templates, config.example.json. */
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

export function ensureMcpToken(dataRoot: string): string {
  const tokenPath = join(dataRoot, MCP_TOKEN_FILE);
  try {
    const token = readFileSync(tokenPath, "utf8").trim();
    if (token.length === 0) throw new Error(`jeton MCP vide : ${tokenPath}`);
    chmodSync(tokenPath, PRIVATE_FILE_MODE);
    return token;
  } catch (error) {
    if (!(error instanceof Error) || !("code" in error) || error.code !== "ENOENT") throw error;
  }

  const token = randomBytes(MCP_TOKEN_BYTES).toString("hex");
  try {
    writeFileSync(tokenPath, `${token}\n`, { encoding: "utf8", flag: "wx", mode: PRIVATE_FILE_MODE });
    return token;
  } catch (error) {
    if (!(error instanceof Error) || !("code" in error) || error.code !== "EEXIST") throw error;
    const existingToken = readFileSync(tokenPath, "utf8").trim();
    if (existingToken.length === 0) throw new Error(`jeton MCP vide : ${tokenPath}`);
    chmodSync(tokenPath, PRIVATE_FILE_MODE);
    return existingToken;
  }
}

export function regenerateMcpToken(dataRoot: string): string {
  const tokenPath = join(dataRoot, MCP_TOKEN_FILE);
  const temporaryPath = join(dataRoot, `${MCP_TOKEN_FILE}.${process.pid}.${Date.now()}.tmp`);
  const token = randomBytes(MCP_TOKEN_BYTES).toString("hex");
  try {
    writeFileSync(temporaryPath, `${token}\n`, { encoding: "utf8", flag: "wx", mode: PRIVATE_FILE_MODE });
    renameSync(temporaryPath, tokenPath);
    chmodSync(tokenPath, PRIVATE_FILE_MODE);
    return token;
  } catch (error) {
    if (existsSync(temporaryPath)) unlinkSync(temporaryPath);
    throw error;
  }
}

/**
 * Export the env the server reads at import + boot time, so a subsequent dynamic import of
 * startServer picks up the writable data dir.
 *  - KANBAN_CONFIG / KANBAN_DB → writable config + db under dataRoot
 *  - KANBAN_BUN_PATH           → the bundled bun used to spawn the worktree/user tmux shells
 *  - KANBAN_DRY_RUN=0 / KANBAN_SETUP=1 → real adapter + first-boot trust seeding
 *
 * The agent sessions run in-process via the Agent SDK; the SDK's native `claude` binary is resolved
 * by system/claudeBinary.ts (KANBAN_CLAUDE_BINARY override → node_modules → provisioned/detected/
 * downloaded — the packaged `.app` does NOT embed it, see claudeBinary.ts).
 */
export function applyDesktopEnv(roots: DesktopRoots, configPath: string, bunPath: string): void {
  process.env.KANBAN_CONFIG = configPath;
  process.env.KANBAN_DB = join(roots.dataRoot, "kanban.db");
  process.env.KANBAN_BUN_PATH = bunPath;
  if (!process.env.KANBAN_MCP_TOKEN?.trim()) {
    process.env.KANBAN_MCP_TOKEN = ensureMcpToken(roots.dataRoot);
  }
  // App mode drives real tmux/claude/git; dev keeps the dry-run default untouched.
  process.env.KANBAN_DRY_RUN ??= "0";
  process.env.KANBAN_SETUP ??= "1";
}
