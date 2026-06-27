import { join } from "node:path";

/**
 * Resolves the vendored Composer (Cursor CLI) driver script path. The per-slot agent config
 * (`.mcp.json` / `.claude/settings.json` / `.claude/agents/*.md`) the tmux sessions needed is gone —
 * the SDK session carries its tools, permissions, and sub-agents programmatically (see sessionConfig).
 */
interface TemplatePaths {
  /** Absolute path to the vendored Composer driver script (allowed bash for the composer implementer). */
  composerScriptPath: string;
}

export function resolveTemplatePaths(projectRoot: string): TemplatePaths {
  return { composerScriptPath: join(projectRoot, "templates", "run_composer.sh") };
}
