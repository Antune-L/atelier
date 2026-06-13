import { join } from "node:path";

/**
 * Generates the per-slot agent config files:
 *  - .mcp.json        → registers the worker channel MCP server
 *  - .claude/settings.json → bash allowlist + PreToolUse deny hook + Stop hook
 *  - .claude/hooks/*.ts    → the actual hook scripts (POST to backend)
 *
 * Files are deposited into the worktree before the tmux session spawns.
 */

export interface SlotTemplateContext {
  /** Absolute path to this repo's worker.ts (resolved at runtime). */
  workerScriptPath: string;
  /** Absolute path to the PreToolUse deny hook script. */
  preToolUseHookPath: string;
  /** Absolute path to the Stop hook script. */
  stopHookPath: string;
  /** Absolute path to the vendored Composer driver script. */
  composerScriptPath: string;
  backendHttp: string;
  backendWs: string;
  ticketId: string;
  slotId: number;
  /** Bun runtime binary (so the worker.ts/hooks run under bun). */
  bunPath: string;
}

/** Bash commands the agent may run without escalation. Everything else is denied. */
const BASH_ALLOWLIST = [
  "Bash(git status:*)",
  "Bash(git add:*)",
  "Bash(git commit:*)",
  "Bash(git push:*)",
  "Bash(git fetch:*)",
  "Bash(git diff:*)",
  "Bash(git log:*)",
  "Bash(git checkout:*)",
  "Bash(git branch:*)",
  "Bash(git rev-parse:*)",
  "Bash(git restore:*)",
  "Bash(bun:*)",
  "Bash(bunx:*)",
  "Bash(npm run:*)",
  "Bash(pnpm:*)",
  "Bash(yarn:*)",
  "Bash(node:*)",
  "Bash(sleep:*)",
  "Bash(tail:*)",
  "Bash(gh pr create:*)",
  "Bash(gh pr view:*)",
  // Review pipeline (argus): list/diff PRs, post one inline review via the API.
  "Bash(gh pr list:*)",
  "Bash(gh pr diff:*)",
  "Bash(gh pr comment:*)",
  "Bash(gh api:*)",
  "Bash(gh repo view:*)",
  "Bash(ls:*)",
  "Bash(cat:*)",
  "Bash(grep:*)",
  "Bash(rg:*)",
  "Bash(find:*)",
  // Shell helpers argus uses to build the commentable-line set for inline posting.
  "Bash(awk:*)",
  "Bash(sed:*)",
  "Bash(cut:*)",
  "Bash(sort:*)",
  "Bash(head:*)",
  "Bash(wc:*)",
  "Bash(mktemp:*)",
  "Bash(echo:*)",
];

export function buildMcpJson(ctx: SlotTemplateContext): string {
  const config = {
    mcpServers: {
      worker: {
        command: ctx.bunPath,
        args: [ctx.workerScriptPath],
        env: {
          TICKET_ID: ctx.ticketId,
          SLOT_ID: String(ctx.slotId),
          BACKEND_WS: ctx.backendWs,
        },
      },
    },
  };
  return JSON.stringify(config, null, 2);
}

export function buildSettingsJson(ctx: SlotTemplateContext): string {
  const config = {
    // Skip the interactive "enable MCP servers?" dialog: the session is headless.
    enableAllProjectMcpServers: true,
    permissions: {
      allow: [...BASH_ALLOWLIST, `Bash(${ctx.composerScriptPath}:*)`],
    },
    env: {
      TICKET_ID: ctx.ticketId,
      SLOT_ID: String(ctx.slotId),
      BACKEND_HTTP: ctx.backendHttp,
      BACKEND_WS: ctx.backendWs,
      DISABLE_AUTOUPDATER: "1",
    },
    hooks: {
      PreToolUse: [
        {
          matcher: "Bash",
          hooks: [{ type: "command", command: `${ctx.bunPath} ${ctx.preToolUseHookPath}` }],
        },
      ],
      Stop: [
        {
          hooks: [{ type: "command", command: `${ctx.bunPath} ${ctx.stopHookPath}` }],
        },
      ],
    },
  };
  return JSON.stringify(config, null, 2);
}

export function resolveTemplatePaths(projectRoot: string): {
  workerScriptPath: string;
  preToolUseHookPath: string;
  stopHookPath: string;
  composerScriptPath: string;
} {
  return {
    workerScriptPath: join(projectRoot, "worker", "worker.ts"),
    preToolUseHookPath: join(projectRoot, "templates", "preToolUse.ts"),
    stopHookPath: join(projectRoot, "templates", "stopHook.ts"),
    composerScriptPath: join(projectRoot, "templates", "run_composer.sh"),
  };
}
