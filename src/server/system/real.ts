import { query } from "@anthropic-ai/claude-agent-sdk";
import type { Options } from "@anthropic-ai/claude-agent-sdk";
import { $ } from "bun";
import { randomUUID } from "node:crypto";
import { existsSync, realpathSync } from "node:fs";
import { rm } from "node:fs/promises";
import { homedir, tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { z } from "zod";

import { TERMINAL_DEFAULT_COLS, TERMINAL_DEFAULT_ROWS } from "../../shared/constants.ts";
import type { OpenPr } from "../../shared/schemas.ts";
import type { CodexRuntimeStatus } from "../../shared/codexCapabilities.ts";
import { createLogger } from "../logger.ts";
import type { WorkerMcpManager } from "../workerMcp.ts";

import type { AgentProvider, AgentSessionEvent, AgentSessionHandle, AgentSessionOptions } from "./agentSession.ts";
import { ensureClaudeBinary, resolveClaudeBinary } from "./claudeBinary.ts";
import { claudeProvider, dispatchClaudeMessage, toSdkEffort } from "./claudeProvider.ts";
import { createCodexProvider } from "./codexProvider.ts";
import { computeCodeFingerprint } from "./codeFingerprint.ts";
import { probeCodexRuntime } from "./codexRuntime.ts";
import { CapabilityCache } from "./capabilityCache.ts";
import { envWithProjectNode } from "./nvmNode.ts";
import { runOneShotSession } from "./oneShotSession.ts";
import { prepareProjectShell } from "./projectShell.ts";
import { renderCollapsedDetails } from "./reviewMarkdown.ts";
import { REVIEW_PUBLICATION_STATE_BY_EVENT } from "./types.ts";
import type {
  DoneGateResult,
  GitWorktreeAddOptions,
  ImportNotionOptions,
  PaneSize,
  PaneStream,
  PrepareReviewWorktreeOptions,
  PublishReviewOptions,
  PublishReviewResult,
  ReformulateOptions,
  ReviewDoneOptions,
  ReviewHeadResult,
  ReviewPublicationEvent,
  RunAutomationOptions,
  SpawnShellOptions,
  SystemAdapter,
  WorktreeSetupOptions,
} from "./types.ts";

const log = createLogger("system");

const CLAUDE_JSON_PATH = join(homedir(), ".claude.json");
const PROD_ENV_MARKER = "prod";
/** Bound the synchronous one-shot reformulation SDK query (2 min). */
const REFORMULATE_TIMEOUT_MS = 120_000;
/** Read-only toolset for the reformulation query (the description may reference local image paths). */
const REFORMULATE_ALLOWED_TOOLS = ["Read"] as const;
/** Bound the synchronous one-shot Notion import SDK query (4 min, under Bun's 255s idle timeout). */
const NOTION_IMPORT_TIMEOUT_MS = 240_000;
const NOTION_MCP_SERVER_NAME = "notion";
const NOTION_MCP_URL = "https://mcp.notion.com/mcp";
/** Read-only allowlist for the Notion import query: only Read and the hosted Notion MCP tools. */
const NOTION_READ_TOOLS = ["notion-fetch", "notion-search"];
const NOTION_IMPORT_ALLOWED_TOOLS = ["Read", ...NOTION_READ_TOOLS.map((name) => `mcp__${NOTION_MCP_SERVER_NAME}__${name}`)];
/** Bound a background automation SDK query (30 min): not tied to an HTTP request. */
const AUTOMATION_TIMEOUT_MS = 30 * 60 * 1000;
/** Keep only the tail of a failed install's output in the surfaced error. */
const INSTALL_ERROR_TAIL = 500;
/**
 * Forced on every setup/install/project script: stdin is already detached, so any tool that would
 * otherwise prompt (corepack "download pnpm?", pnpm auth, husky) must auto-resolve instead of
 * blocking forever on a read that never returns. `CI=1` is the broad opt-out; the corepack flag is
 * its specific prompt (the one that wedged a worktree setup for 10 min before the timeout).
 */
const NON_INTERACTIVE_ENV: Record<string, string> = {
  CI: "1",
  COREPACK_ENABLE_DOWNLOAD_PROMPT: "0",
};

interface ShellRunResult {
  /** Process exit code, or null when terminated by a signal (e.g. the timeout kill). */
  exitCode: number | null;
  /** True when Bun's timeout SIGKILLed the child before it exited on its own. */
  timedOut: boolean;
  stdout: string;
  stderr: string;
}

/** Conventional worktree setup script paths (relative to the repo), tried in order when no explicit command is configured. */
const WORKTREE_SETUP_CANDIDATES = ["scripts/setup-worktree.sh", "setup-worktree.sh", ".kanban/setup-worktree.sh"] as const;
/** Conventional worktree teardown script paths (relative to the repo), tried in order when no explicit command is configured. */
const WORKTREE_TEARDOWN_CANDIDATES = ["scripts/teardown-worktree.sh", "teardown-worktree.sh", ".kanban/teardown-worktree.sh"] as const;
/** Merge strategy for the opt-in auto-merge (rebase replays commits onto the base branch). */
const PR_MERGE_STRATEGY = "--rebase";
/** Cursor headless binary names, in priority order (installed as `cursor-agent`, also `agent`). */
const CLAUDE_BINARY_NAME = "claude";
const COMPOSER_BINARIES = ["cursor-agent", "agent"] as const;
/** Bound the boot-time auth probe so a hanging `status` can never block server start. */
const COMPOSER_PROBE_TIMEOUT_MS = 10_000;
/** `gh pr list --json` fields surfaced to the review picker. */
const PR_LIST_FIELDS = "number,title,url,headRefName,baseRefName,isDraft,reviewDecision,updatedAt,author,additions,deletions";
/** Cap the review picker to the most recent open PRs. */
const PR_LIST_LIMIT = "50";
const REVIEW_COMMAND_TIMEOUT_MS = 30_000;

const ghPrHeadSchema = z.object({ url: z.string(), headRefOid: z.string().min(1) });
const ghRestPullSchema = z.object({
  base: z.object({ sha: z.string().min(1) }),
  head: z.object({ sha: z.string().min(1) }),
  user: z.object({ login: z.string() }).nullable(),
});
const ghRestReviewSchema = z.object({
  id: z.number().int(),
  body: z.string(),
  state: z.string(),
  commit_id: z.string(),
  submitted_at: z.string().nullable(),
  user: z.object({ login: z.string() }).nullable(),
});
const ghRestReviewsSchema = z.array(ghRestReviewSchema);
const ghRestReviewPagesSchema = z.array(ghRestReviewsSchema);

/** Shape of one `gh pr list --json` entry (mapped to the shared OpenPr). */
const ghPrSchema = z.object({
  number: z.number(),
  title: z.string(),
  url: z.string(),
  headRefName: z.string(),
  baseRefName: z.string(),
  isDraft: z.boolean(),
  // gh returns "" for "no decision"; tolerate null too so one odd PR never 502s the list.
  reviewDecision: z.string().nullable().default(""),
  updatedAt: z.string(),
  author: z.object({ login: z.string() }).nullable(),
  additions: z.number(),
  deletions: z.number(),
});

/** `gh pr view --json state` shape, used to confirm an auto-merge actually landed. */
const ghPrStateSchema = z.object({ state: z.string() });
/** GitHub PR state that proves the merge completed (vs. OPEN/CLOSED). */
const PR_STATE_MERGED = "MERGED";
/** A synchronous merge is occasionally not yet visible on the immediate read; poll a few times. */
const PR_MERGE_CONFIRM_ATTEMPTS = 3;
const PR_MERGE_CONFIRM_DELAY_MS = 1000;

interface BoundedCommandResult {
  exitCode: number;
  stdout: string;
  stderr: string;
  timedOut: boolean;
}

async function runBoundedReviewCommand(args: string[], cwd: string): Promise<BoundedCommandResult> {
  const proc = Bun.spawn(args, { cwd, stdin: "ignore", stdout: "pipe", stderr: "pipe" });
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    proc.kill(9);
  }, REVIEW_COMMAND_TIMEOUT_MS);
  try {
    const [exitCode, stdout, stderr] = await Promise.all([
      proc.exited,
      new Response(proc.stdout).text(),
      new Response(proc.stderr).text(),
    ]);
    return { exitCode, stdout, stderr, timedOut };
  } finally {
    clearTimeout(timer);
  }
}

function rightSideDiffLines(diff: string): Set<number> {
  const lines = new Set<number>();
  let currentLine: number | null = null;
  for (const content of diff.split("\n")) {
    const hunk = /^@@ -\d+(?:,\d+)? \+(\d+)(?:,\d+)? @@/.exec(content);
    if (hunk) {
      const start = hunk[1];
      currentLine = start === undefined ? null : Number(start);
      continue;
    }
    if (currentLine === null || content.startsWith("-")) continue;
    if (content.startsWith("+") || content.startsWith(" ")) {
      lines.add(currentLine);
      currentLine += 1;
      continue;
    }
    currentLine = null;
  }
  return lines;
}

function renderOutsideDiffComment(comment: PublishReviewOptions["comments"][number]): string {
  const title = comment.body.split("\n", 1)[0] ?? "Finding outside the diff";
  return renderCollapsedDetails(`${comment.path}:${comment.line} — ${title}`, comment.body);
}

/**
 * Real adapter: performs actual git/tmux/gh/osascript/filesystem side effects.
 * Only selected when KANBAN_DRY_RUN is off AND the env explicitly opts in.
 * Never instantiated in the default dev/test path.
 */
export class RealSystemAdapter implements SystemAdapter {
  readonly dryRun = false;
  /** The agent backends behind the session seam, keyed by `AgentSessionOptions.provider`. */
  private readonly providers: Record<"claude" | "codex", AgentProvider>;
  private readonly codexCapabilities = new CapabilityCache(probeCodexRuntime);
  private readonly shellStartupDirectories = new Map<string, string>();

  constructor(workerMcpManager: WorkerMcpManager) {
    this.providers = { claude: claudeProvider, codex: createCodexProvider(workerMcpManager) };
  }

  async seedWorkspaceTrust(paths: string[]): Promise<void> {
    const file = Bun.file(CLAUDE_JSON_PATH);
    const exists = await file.exists();
    const config: Record<string, unknown> = exists ? await file.json() : {};
    const projectsRaw = config.projects;
    const projects: Record<string, unknown> =
      projectsRaw && typeof projectsRaw === "object" ? { ...projectsRaw } : {};
    for (const path of paths) {
      const existing = projects[path];
      const base = existing && typeof existing === "object" ? existing : {};
      projects[path] = { ...base, hasTrustDialogAccepted: true };
    }
    config.projects = projects;
    await Bun.write(CLAUDE_JSON_PATH, JSON.stringify(config, null, 2));
  }

  async excludeAgentFilesInRepo(repoPath: string): Promise<void> {
    const infoDir = join(repoPath, ".git", "info");
    // A configured repo may be missing (placeholder/example config) or not a git checkout; skip
    // rather than abort first-boot setup. Bun.write would otherwise ENOENT on a missing parent.
    if (!existsSync(infoDir)) return;
    const excludePath = join(infoDir, "exclude");
    const file = Bun.file(excludePath);
    const current = (await file.exists()) ? await file.text() : "";
    const lines = new Set(current.split("\n").map((l) => l.trim()).filter(Boolean));
    lines.add(".claude/");
    lines.add(".mcp.json");
    await Bun.write(excludePath, `${[...lines].join("\n")}\n`);
  }

  async worktreeRemove(repoPath: string, slotPath: string): Promise<void> {
    // Full reset, best-effort: a stuck/half-built worktree can lose its `.git`
    // link (so `remove` fails) or leave a stale registration. `prune` clears the
    // dangling entry and `rm -rf` guarantees the path is empty and re-addable.
    await $`git -C ${repoPath} worktree remove ${slotPath} --force`.nothrow().quiet();
    await $`git -C ${repoPath} worktree prune`.nothrow().quiet();
    await $`rm -rf ${slotPath}`.nothrow().quiet();
  }

  async fetch(repoPath: string, baseBranch: string): Promise<void> {
    const res = await $`git -C ${repoPath} fetch origin ${baseBranch}`.nothrow().quiet();
    if (res.exitCode !== 0) {
      throw new Error(`git fetch origin ${baseBranch} a échoué (code ${res.exitCode}) : ${res.stderr.toString().trim()}`);
    }
  }

  async worktreeAdd(opts: GitWorktreeAddOptions): Promise<void> {
    const res =
      await $`git -C ${opts.repoPath} worktree add ${opts.slotPath} -b ${opts.branch} origin/${opts.baseBranch}`
        .nothrow()
        .quiet();
    if (res.exitCode !== 0) {
      const detail = res.stderr.toString().trim() || res.stdout.toString().trim();
      throw new Error(`git worktree add a échoué (code ${res.exitCode}) : ${detail}`);
    }
  }

  async worktreeAddExisting(repoPath: string, slotPath: string, localBranch: string, startBranch = localBranch): Promise<void> {
    // `-B` (re)creates the local branch at origin/<startBranch>, so the worktree carries the PR's commits
    // rather than a fresh branch off base. `localBranch` may differ from `startBranch` (clean ticket).
    // Caller fetches origin/<startBranch> first.
    const res = await $`git -C ${repoPath} worktree add ${slotPath} -B ${localBranch} origin/${startBranch}`.nothrow().quiet();
    if (res.exitCode !== 0) {
      const detail = res.stderr.toString().trim() || res.stdout.toString().trim();
      throw new Error(`git worktree add (branche existante) a échoué (code ${res.exitCode}) : ${detail}`);
    }
  }

  async deleteLocalBranch(repoPath: string, branch: string): Promise<void> {
    await $`git -C ${repoPath} branch -D ${branch}`.nothrow().quiet();
  }

  async createBranchFromBase(repoPath: string, branch: string, baseBranch: string): Promise<void> {
    await this.fetch(repoPath, baseBranch);
    const res =
      await $`git -C ${repoPath} push origin origin/${baseBranch}:refs/heads/${branch}`.nothrow().quiet();
    if (res.exitCode !== 0) {
      const detail = res.stderr.toString().trim() || res.stdout.toString().trim();
      throw new Error(`création de la branche ${branch} depuis ${baseBranch} a échoué (code ${res.exitCode}) : ${detail}`);
    }
  }

  async copyEnvFiles(repoPath: string, slotPath: string): Promise<void> {
    // Monorepos keep .env files in nested workspaces (apps/*, packages/*).
    const glob = new Bun.Glob("**/.env*");
    for await (const rel of glob.scan({ cwd: repoPath, dot: true })) {
      if (rel.includes("node_modules")) continue;
      if (rel.toLowerCase().includes(PROD_ENV_MARKER)) continue;
      const content = await Bun.file(join(repoPath, rel)).text();
      await Bun.write(join(slotPath, rel), content);
    }
  }

  async runWorktreeSetupScript(opts: WorktreeSetupOptions): Promise<void> {
    // An explicit config command is trusted input run verbatim through `sh -c`; the auto-detected path
    // is the slot's own copy, pre-quoted by resolveWorktreeScriptCommand.
    const command =
      opts.script ?? (await resolveWorktreeScriptCommand(WORKTREE_SETUP_CANDIDATES, opts.repoPath, opts.slotPath));
    if (command === null) return;
    // Defense-in-depth: the script body comes from the reviewed branch and mutates files in place, so
    // never let it run against the canonical checkout even if slotPath were misconfigured to point there.
    if (await this.isMainCheckout(opts.slotPath)) {
      throw new Error(
        `refus d'exécuter le script de setup du worktree : le slot ${opts.slotPath} est le checkout PRINCIPAL`,
      );
    }
    const res = await this.runShell(command, opts.slotPath, opts.timeoutMs, {
      WORKTREE_PATH: opts.slotPath,
      REPO_PATH: opts.repoPath,
      BRANCH: opts.branch,
      BASE_BRANCH: opts.baseBranch,
    });
    if (res.timedOut) throw new Error(`timeout (${opts.timeoutMs}ms): ${command}`);
    if (res.exitCode !== 0) {
      const detail = (res.stderr + res.stdout).trim().slice(-INSTALL_ERROR_TAIL);
      throw new Error(`le script de configuration du worktree a échoué (code ${res.exitCode}) : ${detail}`);
    }
  }

  async runWorktreeTeardownScript(opts: WorktreeSetupOptions): Promise<void> {
    // An explicit config command is trusted input run verbatim through `sh -c`; the auto-detected path
    // is the slot's own copy, pre-quoted by resolveWorktreeScriptCommand.
    const command =
      opts.script ?? (await resolveWorktreeScriptCommand(WORKTREE_TEARDOWN_CANDIDATES, opts.repoPath, opts.slotPath));
    if (command === null) return;
    // Same guard as setup, but best-effort: skip (never tear down the main checkout) rather than throw.
    if (await this.isMainCheckout(opts.slotPath)) {
      log.warn("teardown du worktree ignoré : le slot est le checkout PRINCIPAL", { slotPath: opts.slotPath });
      return;
    }
    // Best-effort cleanup: a failure here (timeout or non-zero exit) is logged but never thrown so the
    // worktree removal that follows always proceeds.
    const res = await this.runShell(command, opts.slotPath, opts.timeoutMs, {
      WORKTREE_PATH: opts.slotPath,
      REPO_PATH: opts.repoPath,
      BRANCH: opts.branch,
      BASE_BRANCH: opts.baseBranch,
    });
    if (res.timedOut) {
      log.warn("timeout du script de teardown du worktree (ignoré)", { command, timeoutMs: opts.timeoutMs });
      return;
    }
    if (res.exitCode !== 0) {
      const detail = (res.stderr + res.stdout).trim().slice(-INSTALL_ERROR_TAIL);
      log.warn("script de teardown du worktree en échec (ignoré)", { command, exitCode: res.exitCode, detail });
    }
  }

  /**
   * True only when `dir` is git's MAIN working tree (git-dir === git-common-dir); false for a linked
   * worktree, which has a distinct git-dir. Fails OPEN (returns false) on any probe error: the primary
   * safeguard is running the slot's own script copy — this is only a last-resort guard and must not
   * block setup on a transient git hiccup.
   */
  private async isMainCheckout(dir: string): Promise<boolean> {
    try {
      const gitDir = (await $`git -C ${dir} rev-parse --absolute-git-dir`.quiet()).stdout.toString().trim();
      const commonRaw = (await $`git -C ${dir} rev-parse --git-common-dir`.quiet()).stdout.toString().trim();
      if (!gitDir || !commonRaw) return false;
      return realpathSafe(gitDir) === realpathSafe(resolve(dir, commonRaw));
    } catch {
      return false;
    }
  }

  async installDeps(slotPath: string, timeoutMs: number): Promise<void> {
    const command = await detectInstallCommand(slotPath);
    const res = await this.runShell(command, slotPath, timeoutMs);
    if (res.timedOut) throw new Error(`timeout (${timeoutMs}ms): ${command}`);
    if (res.exitCode !== 0) {
      const detail = (res.stderr + res.stdout).trim().slice(-INSTALL_ERROR_TAIL);
      throw new Error(`${command} a échoué (code ${res.exitCode}) : ${detail}`);
    }
  }

  /**
   * Run a shell command in `cwd`, non-interactively and bounded. stdin is detached (`ignore`) so a
   * stray prompt hits EOF and fails fast instead of hanging; Bun's own `timeout` SIGKILLs the child
   * on expiry so a wedged command can't leak orphaned processes past its budget (the old
   * Promise.race timeout abandoned the JS promise but left `sh`/`pnpm` running). stdout+stderr are
   * drained concurrently with exit to avoid a full-pipe deadlock.
   */
  private async runShell(
    command: string,
    cwd: string,
    timeoutMs: number,
    extraEnv: Record<string, string> = {},
  ): Promise<ShellRunResult> {
    const proc = Bun.spawn(["sh", "-c", command], {
      cwd,
      env: { ...envWithProjectNode(cwd), ...NON_INTERACTIVE_ENV, ...extraEnv },
      stdin: "ignore",
      stdout: "pipe",
      stderr: "pipe",
      timeout: timeoutMs,
      killSignal: "SIGKILL",
    });
    const [stdout, stderr, exitCode] = await Promise.all([
      new Response(proc.stdout).text(),
      new Response(proc.stderr).text(),
      proc.exited,
    ]);
    return { exitCode, timedOut: proc.signalCode === "SIGKILL", stdout, stderr };
  }

  startAgentSession(opts: AgentSessionOptions): AgentSessionHandle {
    log.info("startAgentSession", { ticketId: opts.ticketId, slotId: opts.slotId, model: opts.model, provider: opts.provider });
    return this.providers[opts.provider].createSession(opts);
  }

  async reformulate(opts: ReformulateOptions): Promise<string> {
    if (opts.provider === "codex") {
      return runOneShotSession(this.providers.codex, {
        provider: "codex", cwd: opts.cwd, model: opts.model, effort: opts.effort, serviceTier: opts.serviceTier ?? "default",
        permissionMode: "dontAsk", allowedTools: [...REFORMULATE_ALLOWED_TOOLS],
      }, opts.prompt, REFORMULATE_TIMEOUT_MS, opts.onEvent);
    }
    // `dontAsk` never prompts and denies anything not pre-approved; the read-only toolset keeps it
    // safe while still letting it open local image paths referenced by the description.
    const sdkEffort = toSdkEffort(opts.effort);
    const queryOptions: Options = {
      cwd: opts.cwd,
      model: opts.model,
      pathToClaudeCodeExecutable: await ensureClaudeBinary(),
      systemPrompt: { type: "preset", preset: "claude_code" },
      permissionMode: "dontAsk",
      allowedTools: [...REFORMULATE_ALLOWED_TOOLS],
      env: envWithProjectNode(opts.cwd),
      stderr: () => {},
      ...(sdkEffort ? { effort: sdkEffort } : {}),
    };
    return this.runOneShotQuery(opts.prompt, queryOptions, REFORMULATE_TIMEOUT_MS, "reformulation échouée", opts.onEvent);
  }

  async importNotion(opts: ImportNotionOptions): Promise<string> {
    if (opts.provider === "codex") {
      return runOneShotSession(this.providers.codex, {
        provider: "codex", cwd: opts.cwd, model: opts.model, effort: opts.effort, serviceTier: opts.serviceTier ?? "default",
        permissionMode: "dontAsk", allowedTools: NOTION_IMPORT_ALLOWED_TOOLS,
        extraMcpServers: { [NOTION_MCP_SERVER_NAME]: {
          type: "http", url: NOTION_MCP_URL, enabledTools: NOTION_READ_TOOLS,
        } },
      }, opts.prompt, NOTION_IMPORT_TIMEOUT_MS, opts.onEvent);
    }
    // `dontAsk` + an allowlist keeps the run read-only: only Read and the hosted Notion MCP tools are
    // pre-approved, everything else is denied without prompting (mirrors reformulate's safe posture).
    const sdkEffort = toSdkEffort(opts.effort);
    const queryOptions: Options = {
      cwd: opts.cwd,
      model: opts.model,
      pathToClaudeCodeExecutable: await ensureClaudeBinary(),
      systemPrompt: { type: "preset", preset: "claude_code" },
      permissionMode: "dontAsk",
      mcpServers: { [NOTION_MCP_SERVER_NAME]: { type: "http", url: NOTION_MCP_URL } },
      allowedTools: [...NOTION_IMPORT_ALLOWED_TOOLS],
      env: envWithProjectNode(opts.cwd),
      stderr: () => {},
      ...(sdkEffort ? { effort: sdkEffort } : {}),
    };
    return this.runOneShotQuery(opts.prompt, queryOptions, NOTION_IMPORT_TIMEOUT_MS, "import Notion échoué", opts.onEvent);
  }

  async runAutomation(opts: RunAutomationOptions): Promise<string> {
    // A user-authored automation should be able to actually DO things (write files, run bash), so it
    // bypasses permissions and keeps the full default toolset — unlike the read-only reformulate/import.
    const sdkEffort = toSdkEffort(opts.effort);
    const queryOptions: Options = {
      cwd: opts.cwd,
      model: opts.model,
      pathToClaudeCodeExecutable: await ensureClaudeBinary(),
      systemPrompt: { type: "preset", preset: "claude_code" },
      permissionMode: "bypassPermissions",
      allowDangerouslySkipPermissions: true,
      env: { ...process.env },
      stderr: () => {},
      ...(sdkEffort ? { effort: sdkEffort } : {}),
    };
    return this.runOneShotQuery(opts.prompt, queryOptions, AUTOMATION_TIMEOUT_MS, "automation échouée");
  }

  /**
   * Drive a synchronous one-shot SDK query to completion and return its final text. The SDK exposes no
   * native timeout, so consumption is bounded here: `close()` on expiry, then `label`-prefixed errors
   * for timeout / non-success result / empty output.
   */
  private async runOneShotQuery(
    prompt: string,
    queryOptions: Options,
    timeoutMs: number,
    label: string,
    onEvent?: (event: AgentSessionEvent) => void,
  ): Promise<string> {
    const session = query({ prompt, options: queryOptions });

    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      session.close();
    }, timeoutMs);

    const assistantText: string[] = [];
    let resultText = "";
    let resultError = "";
    try {
      for await (const message of session) {
        if (onEvent) dispatchClaudeMessage(message, onEvent);
        if (message.type === "assistant") {
          for (const block of message.message.content) {
            if (block.type === "text") assistantText.push(block.text);
          }
        } else if (message.type === "result") {
          if (message.subtype === "success") resultText = message.result;
          else resultError = message.subtype;
        }
      }
    } catch (error) {
      if (timedOut) throw new Error(`${label} : timeout (${timeoutMs}ms)`);
      throw new Error(`${label} : ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      clearTimeout(timer);
    }

    if (timedOut) throw new Error(`${label} : timeout (${timeoutMs}ms)`);
    if (resultError) throw new Error(`${label} : ${resultError}`);
    const text = resultText.trim() || assistantText.join("").trim();
    if (!text) throw new Error(`${label} : réponse vide`);
    return text;
  }

  /** Shared spawn for the detached read-only worker-channel sessions (triage + batch feasibility). */
  async spawnShellSession(opts: SpawnShellOptions): Promise<void> {
    // Reclaim a zombie of this name first: user-terminal sessions survive a backend restart (PRD §7),
    // but `nextId` resets to 1 each process, so the derived name can collide with an orphan — without
    // this `new-session` would fail and the POST would throw. Killing it (nothrow) is a no-op when absent.
    const startupDirectory = await prepareProjectShell(opts.cwd);
    await this.killSession(opts.sessionName);
    if (startupDirectory) this.shellStartupDirectories.set(opts.sessionName, startupDirectory);
    const environmentArgs = startupDirectory ? ["-e", `ZDOTDIR=${startupDirectory}`] : [];
    try {
      if (opts.initialCommand !== undefined) {
        // Auto-run the launch command, then `exec zsh -l` so the user keeps an interactive worktree
        // shell once it exits/stops. `wrapped` is passed as a single `zsh -lc` argument.
        const wrapped = `${opts.initialCommand}; exec zsh -l`;
        await $`tmux new-session -d -s ${opts.sessionName} -c ${opts.cwd} -x ${TERMINAL_DEFAULT_COLS} -y ${TERMINAL_DEFAULT_ROWS} ${environmentArgs} zsh -lc ${wrapped}`.quiet();
        return;
      }
      // A plain interactive login shell — no keep-alive wrapper: when the user `exit`s, the session
      // dies and the cell settles on "session terminée" (consistent with the live-stream teardown).
      await $`tmux new-session -d -s ${opts.sessionName} -c ${opts.cwd} -x ${TERMINAL_DEFAULT_COLS} -y ${TERMINAL_DEFAULT_ROWS} ${environmentArgs} zsh -l`.quiet();
    } catch (error) {
      await this.killSession(opts.sessionName);
      throw error;
    }
  }

  async killSession(sessionName: string): Promise<void> {
    await $`tmux kill-session -t ${sessionName}`.nothrow().quiet();
    const directory = this.shellStartupDirectories.get(sessionName);
    this.shellStartupDirectories.delete(sessionName);
    if (directory) await rm(directory, { recursive: true, force: true });
  }

  async hasSession(sessionName: string): Promise<boolean> {
    const res = await $`tmux has-session -t ${sessionName}`.nothrow().quiet();
    return res.exitCode === 0;
  }

  async capturePane(sessionName: string): Promise<string> {
    const res = await $`tmux capture-pane -pt ${sessionName} -S -200`.nothrow().quiet();
    return res.exitCode === 0 ? res.stdout.toString() : "";
  }

  async capturePaneAnsi(sessionName: string, historyLines: number): Promise<string> {
    // historyLines === 0 → no -S, so capture-pane returns only the visible frame (no scrollback).
    const scrollback = historyLines > 0 ? ["-S", `-${historyLines}`] : [];
    const res = await $`tmux capture-pane -e -p -t ${sessionName} ${scrollback}`.nothrow().quiet();
    return res.exitCode === 0 ? res.stdout.toString() : "";
  }

  async paneSize(sessionName: string): Promise<PaneSize | null> {
    const res = await $`tmux display-message -p -t ${sessionName} -F ${"#{window_width} #{window_height}"}`.nothrow().quiet();
    if (res.exitCode !== 0) return null;
    const [width, height] = res.stdout.toString().trim().split(/\s+/);
    const cols = Number(width);
    const rows = Number(height);
    if (!Number.isInteger(cols) || !Number.isInteger(rows) || cols <= 0 || rows <= 0) return null;
    return { cols, rows };
  }

  async openPaneStream(sessionName: string): Promise<PaneStream> {
    return RealPaneStream.open(sessionName);
  }

  async sendKeysRaw(sessionName: string, hexBytes: string): Promise<void> {
    const pairs = hexBytes.match(/.{2}/g);
    if (!pairs || pairs.length === 0) return;
    // `-H` reads each argument as a literal hex byte, so multi-byte UTF-8 and control
    // keys (arrows, Ctrl-C, Esc) reach the pane process without any key-name mapping.
    await $`tmux send-keys -H -t ${sessionName} ${pairs}`.nothrow().quiet();
  }

  async resizePane(sessionName: string, cols: number, rows: number): Promise<void> {
    await $`tmux resize-window -t ${sessionName} -x ${cols} -y ${rows}`.nothrow().quiet();
  }

  async verifyDone(slotPath: string, branch: string, prUrl: string): Promise<DoneGateResult> {
    const status = await $`git -C ${slotPath} status --porcelain`.nothrow().quiet();
    if (status.exitCode !== 0) return { ok: false, reason: "git status a échoué" };
    if (status.stdout.toString().trim().length > 0) {
      return { ok: false, reason: "arbre de travail non propre (modifications non commitées)" };
    }
    const ahead = await $`git -C ${slotPath} rev-list --count origin/${branch}..${branch}`.nothrow().quiet();
    if (ahead.exitCode === 0 && ahead.stdout.toString().trim() !== "0") {
      return { ok: false, reason: "la branche n'est pas poussée (commits en avance)" };
    }
    const pr = await $`gh pr view ${prUrl} --json url`.nothrow().quiet();
    if (pr.exitCode !== 0) return { ok: false, reason: `la PR n'existe pas (${prUrl})` };
    return { ok: true, reason: "" };
  }

  async verifyStealthReady(slotPath: string, branch: string): Promise<DoneGateResult> {
    const status = await $`git -C ${slotPath} status --porcelain`.nothrow().quiet();
    if (status.exitCode !== 0) return { ok: false, reason: "git status a échoué" };
    if (status.stdout.toString().trim().length > 0) {
      return { ok: false, reason: "arbre de travail non propre (modifications non commitées)" };
    }
    const ahead = await $`git -C ${slotPath} rev-list --count origin/${branch}..${branch}`.nothrow().quiet();
    if (ahead.exitCode !== 0) {
      return { ok: false, reason: "la branche n'est pas poussée (ref origin absente ?)" };
    }
    if (ahead.stdout.toString().trim() !== "0") {
      return { ok: false, reason: "la branche n'est pas poussée (commits en avance)" };
    }
    return { ok: true, reason: "" };
  }

  async verifyDirectPushed(slotPath: string, baseBranch: string): Promise<DoneGateResult> {
    const status = await $`git -C ${slotPath} status --porcelain`.nothrow().quiet();
    if (status.exitCode !== 0) return { ok: false, reason: "git status a échoué" };
    if (status.stdout.toString().trim().length > 0) {
      return { ok: false, reason: "arbre de travail non propre (modifications non commitées)" };
    }
    const fetch = await $`git -C ${slotPath} fetch origin ${baseBranch}`.nothrow().quiet();
    if (fetch.exitCode !== 0) {
      return { ok: false, reason: `git fetch origin ${baseBranch} a échoué` };
    }
    const anc = await $`git -C ${slotPath} merge-base --is-ancestor HEAD origin/${baseBranch}`.nothrow().quiet();
    if (anc.exitCode !== 0) {
      return { ok: false, reason: `les commits ne sont pas poussés sur ${baseBranch} (push direct manquant ?)` };
    }
    return { ok: true, reason: "" };
  }

  async createPr(slotPath: string, baseBranch: string, opts: { draft: boolean }): Promise<{ ok: boolean; url: string; reason: string }> {
    // The base branch must exist on origin before `gh pr create --base` can target it.
    const baseExists = await $`git -C ${slotPath} ls-remote --heads origin ${baseBranch}`.nothrow().quiet();
    if (baseExists.exitCode !== 0 || baseExists.stdout.toString().trim().length === 0) {
      const push = await $`git -C ${slotPath} push origin HEAD:refs/heads/${baseBranch}`.nothrow().quiet();
      if (push.exitCode !== 0) {
        const detail = push.stderr.toString().trim() || push.stdout.toString().trim();
        return { ok: false, url: "", reason: `création de la branche de base ${baseBranch} échouée : ${detail}` };
      }
    }
    const res = opts.draft
      ? await $`gh pr create --draft --base ${baseBranch} --fill`.cwd(slotPath).nothrow().quiet()
      : await $`gh pr create --base ${baseBranch} --fill`.cwd(slotPath).nothrow().quiet();
    if (res.exitCode !== 0) {
      const detail = res.stderr.toString().trim() || res.stdout.toString().trim();
      return { ok: false, url: "", reason: detail || `gh pr create a échoué (code ${res.exitCode})` };
    }
    const url = extractPrUrl(res.stdout.toString());
    // gh can exit 0 without a parseable URL in stdout; treat that as failure rather than persisting an
    // empty prUrl and landing the card in "done" with a PR that has no link.
    if (!url.startsWith("http")) {
      return { ok: false, url: "", reason: "URL de PR introuvable dans la sortie de gh pr create" };
    }
    return { ok: true, url, reason: "" };
  }

  async fetchPrSummary(slotPath: string, prUrl: string): Promise<string | null> {
    const res = await $`gh pr view ${prUrl} --json body`.cwd(slotPath).nothrow().quiet();
    if (res.exitCode !== 0) return null;
    const parsed = z.object({ body: z.string() }).safeParse(safeJsonParse(res.stdout.toString()));
    if (!parsed.success) return null;
    const body = parsed.data.body.trim();
    return body.length > 0 ? body : null;
  }

  async verifyReviewDone(slotPath: string, prUrl: string, opts: ReviewDoneOptions): Promise<DoneGateResult> {
    const pr = await runBoundedReviewCommand(["gh", "pr", "view", prUrl, "--json", "url,headRefOid"], slotPath);
    if (pr.exitCode !== 0) return { ok: false, reason: `la PR n'existe pas (${prUrl})` };
    const parsedPr = ghPrHeadSchema.safeParse(safeJsonParse(pr.stdout));
    if (!parsedPr.success || parsedPr.data.url !== prUrl) {
      return { ok: false, reason: "impossible de confirmer la PR et son head courant" };
    }
    const localHead = await runBoundedReviewCommand(["git", "rev-parse", "HEAD"], slotPath);
    if (localHead.exitCode !== 0 || localHead.stdout.trim() !== parsedPr.data.headRefOid) {
      return { ok: false, reason: "le head de la PR a changé depuis la passe de review" };
    }
    if (opts.expectedCommitSha !== null && parsedPr.data.headRefOid !== opts.expectedCommitSha) {
      return { ok: false, reason: "la PR a avancé depuis la passe publiée : lance une nouvelle passe de review complète" };
    }

    // fixComments review: the fixes must be committed and pushed onto the PR's head branch.
    if (opts.requirePushedBranch !== null) {
      const pushed = await this.verifyBranchPushed(slotPath, opts.requirePushedBranch);
      if (!pushed.ok) return pushed;
    }

    if (opts.requirePostedSince === null) return { ok: true, reason: "" };
    if (opts.publicationMarker === null) {
      return { ok: false, reason: "postage demandé mais identité de passe introuvable" };
    }
    if (opts.expectedCommitSha === null || opts.publishedReviewId === null || opts.expectedReviewState === null) {
      return { ok: false, reason: "postage demandé mais publication backend absente : appelle publish_review" };
    }
    const endpoint = reviewApiEndpoint(prUrl);
    if (endpoint === null) return { ok: false, reason: "URL de PR GitHub invalide" };
    const expectedState = await this.effectiveReviewState(slotPath, endpoint, opts.expectedReviewState);
    if (!expectedState.ok) return { ok: false, reason: expectedState.reason };
    return this.verifyReviewPosted(
      slotPath,
      prUrl,
      opts.requirePostedSince,
      opts.publicationMarker,
      opts.expectedCommitSha,
      opts.publishedReviewId,
      expectedState.state,
    );
  }

  /**
   * NOTE(ali): GitHub rejects APPROVE and REQUEST_CHANGES on one's own pull request with HTTP 422,
   * so a review published on our own PR is downgraded to COMMENT (and expected as COMMENTED).
   */
  private async isOwnPullRequest(
    slotPath: string,
    endpoint: string,
  ): Promise<{ ok: true; own: boolean } | { ok: false; reason: string }> {
    const login = await this.currentGitHubLogin(slotPath);
    if (login === null) return { ok: false, reason: "utilisateur gh courant indéterminé" };
    const pull = await runBoundedReviewCommand(["gh", "api", endpoint.replace(/\/reviews$/, "")], slotPath);
    if (pull.exitCode !== 0) {
      const detail = pull.timedOut ? "délai de 30 s dépassé" : (pull.stderr.trim() || pull.stdout.trim());
      return { ok: false, reason: `lecture de la PR GitHub impossible : ${detail}` };
    }
    const parsed = ghRestPullSchema.safeParse(safeJsonParse(pull.stdout));
    if (!parsed.success) return { ok: false, reason: "réponse GitHub inattendue pour la PR" };
    return { ok: true, own: parsed.data.user?.login === login };
  }

  private async effectiveReviewState(
    slotPath: string,
    endpoint: string,
    state: NonNullable<ReviewDoneOptions["expectedReviewState"]>,
  ): Promise<
    | { ok: true; state: NonNullable<ReviewDoneOptions["expectedReviewState"]> }
    | { ok: false; reason: string }
  > {
    const own = await this.isOwnPullRequest(slotPath, endpoint);
    if (!own.ok) return own;
    return { ok: true, state: own.own ? REVIEW_PUBLICATION_STATE_BY_EVENT.COMMENT : state };
  }

  async prepareReviewWorktree(opts: PrepareReviewWorktreeOptions): Promise<ReviewHeadResult> {
    const clean = await this.reviewWorktreeClean(opts.slotPath);
    if (!clean.ok) return { ...clean, commitSha: null };
    const remote = await this.readPrHeadSha(opts.repoPath, opts.prUrl);
    if (!remote.ok || remote.commitSha === null) return remote;
    const local = await this.localHeadSha(opts.slotPath);
    if (local === remote.commitSha) return remote;
    const temporaryRef = `refs/kanban/reviews/${randomUUID()}`;
    const pullRef = `refs/pull/${opts.prNumber}/head`;
    try {
      const fetch = await runBoundedReviewCommand(
        ["git", "fetch", "--no-write-fetch-head", "origin", `${pullRef}:${temporaryRef}`],
        opts.repoPath,
      );
      if (fetch.exitCode !== 0) {
        const detail = fetch.timedOut ? "délai de 30 s dépassé" : (fetch.stderr.trim() || fetch.stdout.trim());
        return { ok: false, reason: `rafraîchissement du head de PR impossible : ${detail}`, commitSha: null };
      }
      const fetched = await runBoundedReviewCommand(["git", "rev-parse", temporaryRef], opts.repoPath);
      if (fetched.exitCode !== 0 || fetched.stdout.trim() !== remote.commitSha) {
        return { ok: false, reason: "le SHA récupéré ne correspond pas au head courant de la PR", commitSha: null };
      }
      const checkout = await runBoundedReviewCommand(["git", "switch", "--detach", remote.commitSha], opts.slotPath);
      if (checkout.exitCode !== 0) {
        const detail = checkout.timedOut ? "délai de 30 s dépassé" : (checkout.stderr.trim() || checkout.stdout.trim());
        return { ok: false, reason: `positionnement du worktree sur le head de PR impossible : ${detail}`, commitSha: null };
      }
    } finally {
      await runBoundedReviewCommand(["git", "update-ref", "-d", temporaryRef], opts.repoPath);
    }
    const refreshed = await this.readReviewHead(opts.slotPath, opts.prUrl);
    if (!refreshed.ok) return refreshed;
    if (refreshed.commitSha !== remote.commitSha) {
      return { ok: false, reason: "la PR a avancé pendant la préparation : relance la passe de review", commitSha: null };
    }
    return refreshed;
  }

  async readReviewHead(slotPath: string, prUrl: string): Promise<ReviewHeadResult> {
    const clean = await this.reviewWorktreeClean(slotPath);
    if (!clean.ok) return { ...clean, commitSha: null };
    const remote = await this.readPrHeadSha(slotPath, prUrl);
    if (!remote.ok || remote.commitSha === null) return remote;
    const local = await this.localHeadSha(slotPath);
    if (local === null) return { ok: false, reason: "SHA local du worktree introuvable", commitSha: null };
    if (local !== remote.commitSha) {
      return {
        ok: false,
        reason: "la PR a avancé depuis cette passe : lance une nouvelle passe de review complète, sans republier celle-ci",
        commitSha: null,
      };
    }
    return { ok: true, reason: "", commitSha: local };
  }

  async publishReview(
    slotPath: string,
    prUrl: string,
    opts: PublishReviewOptions,
  ): Promise<PublishReviewResult> {
    const current = await this.readReviewHead(slotPath, prUrl);
    if (!current.ok || current.commitSha === null) return { ok: false, reason: current.reason, reviewId: null };
    if (current.commitSha !== opts.expectedCommitSha) {
      return {
        ok: false,
        reason: "la PR a avancé depuis cette passe : lance une nouvelle passe de review complète, sans republier celle-ci",
        reviewId: null,
      };
    }
    const endpoint = reviewApiEndpoint(prUrl);
    if (endpoint === null) return { ok: false, reason: "URL de PR GitHub invalide", reviewId: null };
    const own = await this.isOwnPullRequest(slotPath, endpoint);
    if (!own.ok) return { ok: false, reason: own.reason, reviewId: null };
    const event: ReviewPublicationEvent = own.own ? "COMMENT" : opts.event;
    const expectedState = REVIEW_PUBLICATION_STATE_BY_EVENT[event];
    const existing = await this.findPublishedReview(slotPath, endpoint, opts.marker, opts.expectedCommitSha, expectedState);
    if (!existing.ok || existing.reviewId !== null) return existing;
    const validated = await this.validateReviewComments(slotPath, endpoint, opts.expectedCommitSha, opts.comments);
    if (!validated.ok) return { ok: false, reason: validated.reason, reviewId: null };
    const outsideDiff = validated.outsideDiff.map(renderOutsideDiffComment).join("\n\n");
    const outsideDiffSection = outsideDiff.length > 0
      ? `\n\n## Findings outside the diff\n\n${outsideDiff}`
      : "";
    const body = `${opts.body}${outsideDiffSection}\n\n${opts.marker}`;
    return this.createPublishedReview(slotPath, endpoint, {
      body,
      commit_id: opts.expectedCommitSha,
      event,
      comments: validated.inline.map((comment) => ({ ...comment, side: "RIGHT" })),
    }, expectedState);
  }

  private async validateReviewComments(
    slotPath: string,
    endpoint: string,
    expectedCommitSha: string,
    comments: PublishReviewOptions["comments"],
  ): Promise<
    | { ok: true; inline: PublishReviewOptions["comments"]; outsideDiff: PublishReviewOptions["comments"] }
    | { ok: false; reason: string }
  > {
    if (comments.length === 0) return { ok: true, inline: [], outsideDiff: [] };
    const pull = await runBoundedReviewCommand(["gh", "api", endpoint.replace(/\/reviews$/, "")], slotPath);
    if (pull.exitCode !== 0) {
      const detail = pull.timedOut ? "délai de 30 s dépassé" : (pull.stderr.trim() || pull.stdout.trim());
      return { ok: false, reason: `lecture du diff GitHub impossible : ${detail}` };
    }
    const parsed = ghRestPullSchema.safeParse(safeJsonParse(pull.stdout));
    if (!parsed.success || parsed.data.head.sha !== expectedCommitSha) {
      return { ok: false, reason: "GitHub n'a pas confirmé les commits base et head du diff attendu" };
    }
    const linesByPath = new Map<string, Set<number>>();
    for (const path of new Set(comments.map((comment) => comment.path))) {
      const diff = await runBoundedReviewCommand(
        ["git", "diff", "--unified=3", "--no-renames", "--no-color", `${parsed.data.base.sha}...${expectedCommitSha}`, "--", path],
        slotPath,
      );
      if (diff.exitCode !== 0) {
        const detail = diff.timedOut ? "délai de 30 s dépassé" : (diff.stderr.trim() || diff.stdout.trim());
        return { ok: false, reason: `validation des ancres du diff impossible pour ${path} : ${detail}` };
      }
      linesByPath.set(path, rightSideDiffLines(diff.stdout));
    }
    const inline = comments.filter((comment) => linesByPath.get(comment.path)?.has(comment.line) === true);
    const outsideDiff = comments.filter((comment) => linesByPath.get(comment.path)?.has(comment.line) !== true);
    return { ok: true, inline, outsideDiff };
  }

  private async reviewWorktreeClean(slotPath: string): Promise<DoneGateResult> {
    const status = await runBoundedReviewCommand(["git", "status", "--porcelain"], slotPath);
    if (status.exitCode !== 0) return { ok: false, reason: "git status a échoué pendant la préparation de review" };
    if (status.stdout.trim().length > 0) {
      return { ok: false, reason: "le worktree contient des changements locaux ; aucune mise à jour de PR ne sera appliquée" };
    }
    return { ok: true, reason: "" };
  }

  private async readPrHeadSha(cwd: string, prUrl: string): Promise<ReviewHeadResult> {
    const pr = await runBoundedReviewCommand(["gh", "pr", "view", prUrl, "--json", "url,headRefOid"], cwd);
    if (pr.exitCode !== 0) return { ok: false, reason: "lecture du head GitHub de la PR échouée", commitSha: null };
    const parsed = ghPrHeadSchema.safeParse(safeJsonParse(pr.stdout));
    if (!parsed.success || parsed.data.url !== prUrl) {
      return { ok: false, reason: "réponse GitHub inattendue pour le head de la PR", commitSha: null };
    }
    return { ok: true, reason: "", commitSha: parsed.data.headRefOid };
  }

  private async localHeadSha(slotPath: string): Promise<string | null> {
    const head = await runBoundedReviewCommand(["git", "rev-parse", "HEAD"], slotPath);
    if (head.exitCode !== 0) return null;
    const value = head.stdout.trim();
    return value.length > 0 ? value : null;
  }

  private async findPublishedReview(
    slotPath: string,
    endpoint: string,
    marker: string,
    commitSha: string,
    expectedState: NonNullable<ReviewDoneOptions["expectedReviewState"]>,
  ): Promise<PublishReviewResult> {
    const login = await this.currentGitHubLogin(slotPath);
    if (login === null) {
      return { ok: false, reason: "utilisateur gh courant indéterminé pendant la recherche de review", reviewId: null };
    }
    const reviews = await runBoundedReviewCommand(
      ["gh", "api", `${endpoint}?per_page=100`, "--paginate", "--slurp"],
      slotPath,
    );
    if (reviews.exitCode !== 0) return { ok: false, reason: "lecture des reviews GitHub échouée", reviewId: null };
    const parsed = ghRestReviewPagesSchema.safeParse(safeJsonParse(reviews.stdout));
    if (!parsed.success) return { ok: false, reason: "réponse GitHub inattendue pour les reviews", reviewId: null };
    const existing = parsed.data.flat().find(
      (review) =>
        review.user?.login === login
        && review.state === expectedState
        && review.commit_id === commitSha
        && review.body.includes(marker),
    );
    return { ok: true, reason: "", reviewId: existing?.id ?? null };
  }

  private async createPublishedReview(
    slotPath: string,
    endpoint: string,
    payload: Record<string, unknown>,
    expectedState: NonNullable<ReviewDoneOptions["expectedReviewState"]>,
  ): Promise<PublishReviewResult> {
    const inputPath = join(tmpdir(), `kanban-review-${randomUUID()}.json`);
    try {
      await Bun.write(inputPath, JSON.stringify(payload));
      const posted = await runBoundedReviewCommand(
        ["gh", "api", "--method", "POST", endpoint, "--input", inputPath],
        slotPath,
      );
      if (posted.exitCode !== 0) {
        const detail = posted.timedOut ? "délai de 30 s dépassé" : (posted.stderr.trim() || posted.stdout.trim());
        return { ok: false, reason: `publication de la review GitHub échouée : ${detail}`, reviewId: null };
      }
      const parsed = ghRestReviewSchema.safeParse(safeJsonParse(posted.stdout));
      if (!parsed.success || parsed.data.commit_id !== payload.commit_id || parsed.data.state !== expectedState) {
        return { ok: false, reason: "GitHub n'a pas confirmé la review sur le commit attendu", reviewId: null };
      }
      return { ok: true, reason: "", reviewId: parsed.data.id };
    } finally {
      await rm(inputPath, { force: true });
    }
  }

  /** Clean working tree and the branch has no commits ahead of origin/<branch> (mirrors verifyDone). */
  private async verifyBranchPushed(slotPath: string, branch: string): Promise<DoneGateResult> {
    const status = await runBoundedReviewCommand(["git", "status", "--porcelain"], slotPath);
    if (status.exitCode !== 0) return { ok: false, reason: "git status a échoué" };
    if (status.stdout.trim().length > 0) {
      return { ok: false, reason: "arbre de travail non propre (corrections non commitées)" };
    }
    // A non-zero exit means origin/<branch> couldn't be resolved (branch never pushed): fail the gate
    // rather than fall through to ok. origin/<branch> exists here (the worktree was checked out from it),
    // so a failure is a real signal, not the absent-ref case verifyDone tolerates for fresh branches.
    // Compare against HEAD (the worktree's checked-out tip), not the local branch name: a clean
    // ticket's local branch is suffixed (-cleaner) and differs from the PR head origin ref `branch`.
    const ahead = await runBoundedReviewCommand(["git", "rev-list", "--count", `origin/${branch}..HEAD`], slotPath);
    if (ahead.exitCode !== 0) {
      return { ok: false, reason: "impossible de vérifier l'avance de la branche de la PR (ref origin absente ?)" };
    }
    if (ahead.stdout.trim() !== "0") {
      return { ok: false, reason: "la branche de la PR n'est pas poussée (commits en avance)" };
    }
    return { ok: true, reason: "" };
  }

  /** Confirm the current gh user posted a review on the PR at or after `since` (epoch ms). */
  private async verifyReviewPosted(
    slotPath: string,
    prUrl: string,
    since: number,
    marker: string,
    commitSha: string,
    reviewId: number,
    expectedState: NonNullable<ReviewDoneOptions["expectedReviewState"]>,
  ): Promise<DoneGateResult> {
    const login = await this.currentGitHubLogin(slotPath);
    if (login === null) {
      return { ok: false, reason: "postage demandé mais utilisateur gh courant indéterminé" };
    }
    const endpoint = reviewApiEndpoint(prUrl);
    if (endpoint === null) return { ok: false, reason: "URL de PR GitHub invalide" };
    const res = await runBoundedReviewCommand(
      ["gh", "api", `${endpoint}?per_page=100`, "--paginate", "--slurp"],
      slotPath,
    );
    if (res.exitCode !== 0) return { ok: false, reason: "postage demandé mais lecture des reviews échouée" };
    const parsed = ghRestReviewPagesSchema.safeParse(safeJsonParse(res.stdout));
    if (!parsed.success) return { ok: false, reason: "postage demandé mais sortie gh inattendue" };
    const posted = parsed.data.flat().some(
      (review) =>
        review.id === reviewId &&
        review.user?.login === login &&
        review.state === expectedState &&
        review.body.includes(marker) &&
        review.commit_id === commitSha &&
        review.submitted_at !== null &&
        Date.parse(review.submitted_at) >= since,
    );
    if (!posted) return { ok: false, reason: "postage demandé mais aucune review postée sur la PR" };
    return { ok: true, reason: "" };
  }

  private async currentGitHubLogin(slotPath: string): Promise<string | null> {
    const result = await runBoundedReviewCommand(["gh", "api", "user", "-q", ".login"], slotPath);
    const login = result.stdout.trim();
    return result.exitCode === 0 && login.length > 0 ? login : null;
  }

  async listOpenPrs(repoPath: string): Promise<OpenPr[]> {
    const res = await $`gh pr list --json ${PR_LIST_FIELDS} --limit ${PR_LIST_LIMIT}`.cwd(repoPath).nothrow().quiet();
    if (res.exitCode !== 0) {
      const detail = res.stderr.toString().trim() || res.stdout.toString().trim();
      throw new Error(`gh pr list a échoué (code ${res.exitCode}) : ${detail}`);
    }
    const parsed = z.array(ghPrSchema).safeParse(JSON.parse(res.stdout.toString()));
    if (!parsed.success) throw new Error(`gh pr list: sortie inattendue (${parsed.error.message})`);
    return parsed.data.map((pr) => ({
      number: pr.number,
      title: pr.title,
      url: pr.url,
      headBranch: pr.headRefName,
      baseBranch: pr.baseRefName,
      isDraft: pr.isDraft,
      reviewDecision: pr.reviewDecision ?? "",
      updatedAt: pr.updatedAt,
      author: pr.author?.login ?? "?",
      additions: pr.additions,
      deletions: pr.deletions,
    }));
  }

  async listBranches(repoPath: string): Promise<string[]> {
    // Hit the remote so the picker reflects branches that exist on GitHub right now,
    // not just whatever this clone last fetched.
    const res = await $`git -C ${repoPath} ls-remote --heads origin`.nothrow().quiet();
    if (res.exitCode !== 0) {
      const detail = res.stderr.toString().trim() || res.stdout.toString().trim();
      throw new Error(`git ls-remote a échoué (code ${res.exitCode}) : ${detail}`);
    }
    return res.stdout
      .toString()
      .split("\n")
      .map((line) => line.split("\t")[1]?.replace(/^refs\/heads\//, "").trim() ?? "")
      .filter((name) => name !== "")
      .sort();
  }

  async mergePr(slotPath: string, branch: string, prUrl: string): Promise<DoneGateResult> {
    // A draft PR can't be merged; mark it ready first (harmless if already ready).
    await $`gh pr ready ${prUrl}`.cwd(slotPath).nothrow().quiet();
    const res = await $`gh pr merge ${prUrl} ${PR_MERGE_STRATEGY}`.cwd(slotPath).nothrow().quiet();
    if (res.exitCode !== 0) {
      const detail = res.stderr.toString().trim() || res.stdout.toString().trim();
      return { ok: false, reason: `gh pr merge a échoué (code ${res.exitCode}) : ${detail}` };
    }
    // `gh pr merge` can exit 0 without the PR landing on the base branch: with required
    // checks still pending it silently enables auto-merge instead, and GitHub may queue
    // or later reject the merge (e.g. a conflict). Trusting the exit code alone produced
    // false "PR mergée" badges, so confirm the real state before reporting success.
    const state = await this.confirmMerged(slotPath, prUrl);
    if (state !== PR_STATE_MERGED) {
      const hint = res.stdout.toString().trim() || res.stderr.toString().trim();
      return { ok: false, reason: `PR non mergée (état GitHub : ${state || "indéterminé"})${hint ? ` — ${hint}` : ""}` };
    }
    // Best-effort remote branch cleanup: the merge already succeeded, so a failed
    // deletion (e.g. branch protection) must not turn into a merge failure. We can't
    // use `gh pr merge --delete-branch` because its local cleanup checks out the base
    // branch, which is already checked out in the main worktree and would error.
    await $`git push origin --delete ${branch}`.cwd(slotPath).nothrow().quiet();
    return { ok: true, reason: "" };
  }

  async checkPrMerged(repoPath: string, prUrl: string): Promise<{ merged: boolean; state: string }> {
    // Single read (no polling): a manual user-triggered check has no synchronous-merge
    // read lag to absorb as in confirmMerged's auto-merge path.
    const state = await this.prState(repoPath, prUrl);
    return { merged: state === PR_STATE_MERGED, state };
  }

  /**
   * Resolve the PR's true merge state, polling briefly to absorb GitHub read lag so a
   * synchronous merge isn't misread as unmerged. Returns the last seen state ("MERGED"
   * once confirmed, otherwise "OPEN"/"CLOSED", or "" when it can't be read).
   */
  private async confirmMerged(slotPath: string, prUrl: string): Promise<string> {
    let state = "";
    for (let attempt = 0; attempt < PR_MERGE_CONFIRM_ATTEMPTS; attempt++) {
      if (attempt > 0) await Bun.sleep(PR_MERGE_CONFIRM_DELAY_MS);
      state = await this.prState(slotPath, prUrl);
      if (state === PR_STATE_MERGED) return state;
    }
    return state;
  }

  /** Read a PR's GitHub state ("OPEN" | "MERGED" | "CLOSED"); "" when it can't be read. */
  private async prState(slotPath: string, prUrl: string): Promise<string> {
    const res = await $`gh pr view ${prUrl} --json state`.cwd(slotPath).nothrow().quiet();
    if (res.exitCode !== 0) return "";
    try {
      const parsed = ghPrStateSchema.safeParse(JSON.parse(res.stdout.toString()));
      return parsed.success ? parsed.data.state : "";
    } catch {
      return "";
    }
  }

  async runProjectScript(slotPath: string, command: string, timeoutMs: number): Promise<{ ok: boolean; output: string }> {
    const res = await this.runShell(command, slotPath, timeoutMs);
    const output = res.stdout + res.stderr + (res.timedOut ? `\ntimeout (${timeoutMs}ms)` : "");
    return { ok: res.exitCode === 0 && !res.timedOut, output };
  }

  async gitCurrentBranch(repoPath: string): Promise<string> {
    const res = await $`git -C ${repoPath} rev-parse --abbrev-ref HEAD`.nothrow().quiet();
    return res.exitCode === 0 ? res.stdout.toString().trim() : "";
  }

  async gitStatusClean(repoPath: string): Promise<boolean> {
    const res = await $`git -C ${repoPath} status --porcelain`.nothrow().quiet();
    return res.exitCode === 0 && res.stdout.toString().trim().length === 0;
  }

  async codeFingerprint(slotPath: string): Promise<string> {
    return computeCodeFingerprint(slotPath);
  }

  async gitPullFastForward(repoPath: string, baseBranch: string): Promise<DoneGateResult> {
    const res = await $`git -C ${repoPath} pull --ff-only origin ${baseBranch}`.nothrow().quiet();
    if (res.exitCode !== 0) {
      const detail = res.stderr.toString().trim() || res.stdout.toString().trim();
      return { ok: false, reason: `git pull --ff-only origin ${baseBranch} a échoué : ${detail}` };
    }
    return { ok: true, reason: "" };
  }

  async checkComposerAvailable(): Promise<boolean> {
    for (const bin of COMPOSER_BINARIES) {
      if (!Bun.which(bin)) continue;
      // An exported API key authenticates headless runs without an interactive `agent login` session.
      if (process.env.CURSOR_API_KEY) return true;
      const proc = Bun.spawn([bin, "status"], { stdout: "ignore", stderr: "ignore" });
      const killTimer = setTimeout(() => proc.kill(), COMPOSER_PROBE_TIMEOUT_MS);
      try {
        return (await proc.exited) === 0;
      } finally {
        clearTimeout(killTimer);
      }
    }
    return false;
  }

  // Read-only probe: never provisions (no download), so the settings screen stays instant.
  async checkClaudeAvailable(): Promise<boolean> {
    try {
      if (existsSync(resolveClaudeBinary())) return true;
    } catch {
      // The SDK platform package is absent (packaged app before provisioning): fall through to PATH.
    }
    return Bun.which(CLAUDE_BINARY_NAME) !== null;
  }

  checkCodexRuntime(refresh = false): Promise<CodexRuntimeStatus> {
    return this.codexCapabilities.read(refresh);
  }
}

/** Monotonic suffix so concurrent streams on the same session never collide on a FIFO path. */
let fifoSeq = 0;

/**
 * Live pane output via `pipe-pane`. tmux writes to a FIFO through a shell it owns
 * (not a child of this process), so output must transit the FIFO: a `cat` reader
 * here drains it. `close()` stops the pipe, kills the reader, and unlinks the FIFO.
 */
class RealPaneStream implements PaneStream {
  private closed = false;

  private constructor(
    private readonly sessionName: string,
    private readonly fifoPath: string,
    private readonly proc: Bun.Subprocess<"ignore", "pipe", "ignore">,
    private readonly stdout: ReadableStream<Uint8Array>,
  ) {}

  static async open(sessionName: string): Promise<RealPaneStream> {
    fifoSeq += 1;
    const fifoPath = join(tmpdir(), `kanban-term-${sessionName}-${process.pid}-${fifoSeq}.fifo`);
    await $`rm -f ${fifoPath}`.nothrow().quiet();
    await $`mkfifo ${fifoPath}`.quiet();
    // The pane may leak secrets/env; on a shared /tmp keep the FIFO owner-only.
    await $`chmod 600 ${fifoPath}`.nothrow().quiet();
    try {
      // Without `-o` this always replaces any stale pipe, so a crashed prior viewer
      // can't leave a dangling writer attached to the pane.
      await $`tmux pipe-pane -t ${sessionName} ${`cat >> ${fifoPath}`}`.nothrow().quiet();
      const proc = Bun.spawn(["cat", fifoPath], { stdin: "ignore", stdout: "pipe", stderr: "ignore" });
      return new RealPaneStream(sessionName, fifoPath, proc, proc.stdout);
    } catch (error) {
      // Spawn failed after pipe-pane attached: detach it and remove the FIFO so nothing leaks.
      await $`tmux pipe-pane -t ${sessionName}`.nothrow().quiet();
      await $`rm -f ${fifoPath}`.nothrow().quiet();
      throw error;
    }
  }

  get chunks(): AsyncIterable<Uint8Array> {
    const stream = this.stdout;
    return {
      async *[Symbol.asyncIterator]() {
        const reader = stream.getReader();
        try {
          for (;;) {
            const { done, value } = await reader.read();
            if (done) break;
            if (value) yield value;
          }
        } finally {
          reader.releaseLock();
        }
      },
    };
  }

  async close(): Promise<void> {
    if (this.closed) return;
    this.closed = true;
    // No argument = stop piping this pane (closes tmux's FIFO writer → our reader gets EOF).
    await $`tmux pipe-pane -t ${this.sessionName}`.nothrow().quiet();
    this.proc.kill();
    await $`rm -f ${this.fifoPath}`.nothrow().quiet();
  }
}

/** Lockfile → install command. Installing with the wrong manager would diverge from the lockfile. */
const INSTALL_COMMANDS: ReadonlyArray<{ lockfile: string; command: string }> = [
  { lockfile: "pnpm-lock.yaml", command: "pnpm install" },
  { lockfile: "yarn.lock", command: "yarn install" },
  { lockfile: "package-lock.json", command: "npm install" },
  { lockfile: "bun.lock", command: "bun install" },
];

/**
 * Resolve the first conventional worktree script to a `sh <absolutePath>` command (so it runs without
 * a +x bit), ALWAYS pointing at the copy that lives inside the slot. Null when no candidate exists.
 *
 * Why the slot copy, never the repo copy: daedalus-style scripts derive their target worktree from
 * their own location (`WORKTREE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"`) and ignore cwd.
 * Running the repo's copy would make them mutate the MAIN checkout (offset its .env, package.json, etc.)
 * instead of the slot. The script is normally tracked, so `worktree add` already checked it out into the
 * slot; when a repo keeps it untracked it is absent from the slot, so copy it in first (Bun.write also
 * creates parent dirs). The copy loses the +x bit, which is fine — we invoke it via `sh <path>`.
 */
async function resolveWorktreeScriptCommand(
  candidates: readonly string[],
  repoPath: string,
  slotPath: string,
): Promise<string | null> {
  for (const rel of candidates) {
    const inSlot = join(slotPath, rel);
    if (await Bun.file(inSlot).exists()) return `sh ${shQuote(inSlot)}`;
    const inRepo = join(repoPath, rel);
    if (await Bun.file(inRepo).exists()) {
      await Bun.write(inSlot, Bun.file(inRepo));
      return `sh ${shQuote(inSlot)}`;
    }
  }
  return null;
}

async function detectInstallCommand(slotPath: string): Promise<string> {
  for (const { lockfile, command } of INSTALL_COMMANDS) {
    if (await Bun.file(join(slotPath, lockfile)).exists()) return command;
  }
  return "bun install";
}

/**
 * Wrap a value as a single POSIX-shell single-quoted argument, escaping any embedded apostrophe via
 * the `'\''` idiom (close-quote, literal quote, reopen). Required because the readonly `claude` command
 * is assembled as a string and re-parsed by `sh` when tmux runs it: an unescaped `'` inside an inline
 * JSON arg (e.g. French text in `--agents`) terminates the quote and corrupts the flag. `JSON.stringify`
 * escapes double quotes but leaves apostrophes literal, so it is NOT enough on its own.
 */
function shQuote(value: string): string {
  return `'${value.replaceAll("'", "'\\''")}'`;
}

/** Canonicalize a path (resolving symlinks), falling back to the input when it can't be resolved. */
function realpathSafe(p: string): string {
  try {
    return realpathSync(p);
  } catch {
    return p;
  }
}

/** Extract the PR URL from `gh pr create` stdout: prefer the github.com line, else the last non-empty line. */
function extractPrUrl(stdout: string): string {
  const lines = stdout
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
  const ghLine = lines.findLast((line) => line.includes("github.com"));
  return ghLine ?? lines.at(-1) ?? "";
}

function reviewApiEndpoint(prUrl: string): string | null {
  try {
    const segments = new URL(prUrl).pathname.split("/").filter((segment) => segment.length > 0);
    const pullIndex = segments.lastIndexOf("pull");
    const owner = pullIndex >= 2 ? segments[pullIndex - 2] : undefined;
    const repo = pullIndex >= 2 ? segments[pullIndex - 1] : undefined;
    const number = pullIndex >= 0 ? segments[pullIndex + 1] : undefined;
    if (!owner || !repo || !number || !/^\d+$/.test(number)) return null;
    return `repos/${owner}/${repo}/pulls/${number}/reviews`;
  } catch {
    return null;
  }
}

/** Parse JSON, returning null instead of throwing so a malformed payload fails the zod guard. */
function safeJsonParse(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}
