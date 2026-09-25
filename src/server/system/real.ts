import { query } from "@anthropic-ai/claude-agent-sdk";
import type { Options } from "@anthropic-ai/claude-agent-sdk";
import { $ } from "bun";
import { randomUUID } from "node:crypto";
import { existsSync, realpathSync } from "node:fs";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { homedir, tmpdir } from "node:os";
import { join, resolve } from "node:path";

import { TERMINAL_DEFAULT_COLS, TERMINAL_DEFAULT_ROWS } from "../../shared/constants.ts";
import type { PrState, VcsProvider } from "../../shared/constants.ts";
import { getErrorMessage } from "../../shared/errors.ts";
import type { OpenPr, SkillStatus, VcsConnectionResult } from "../../shared/schemas.ts";
import { SKILL_REQUIREMENTS } from "../../shared/skills.ts";
import type { CodexRuntimeStatus } from "../../shared/codexCapabilities.ts";
import { createLogger } from "../logger.ts";
import type { WorkerMcpManager } from "../workerMcp.ts";

import type { AgentProvider, AgentSessionEvent, AgentSessionHandle, AgentSessionOptions } from "./agentSession.ts";
import { boundedCommandDetail, runBoundedCommand } from "./boundedCommand.ts";
import { ensureClaudeBinary, resolveClaudeBinary } from "./claudeBinary.ts";
import { claudeProvider, dispatchClaudeMessage, toSdkEffort } from "./claudeProvider.ts";
import { createCodexProvider } from "./codexProvider.ts";
import { computeCodeFingerprint } from "./codeFingerprint.ts";
import { probeCodexRuntime } from "./codexRuntime.ts";
import { CapabilityCache } from "./capabilityCache.ts";
import { agentBaseEnv, envWithProjectNode } from "./nvmNode.ts";
import { runOneShotSession } from "./oneShotSession.ts";
import { prepareProjectShell } from "./projectShell.ts";
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
  RunAutomationOptions,
  SpawnShellOptions,
  SystemAdapter,
  WorktreeSetupOptions,
} from "./types.ts";
import { AzureDevopsVcsClient } from "./vcs/azureDevops.ts";
import { GithubVcsClient } from "./vcs/github.ts";
import type { VcsClient } from "./vcs/types.ts";

const log = createLogger("system");

const CLAUDE_JSON_PATH = join(homedir(), ".claude.json");
const CLAUDE_SKILLS_DIR = join(homedir(), ".claude", "skills");
const SKILL_MANIFEST_FILE = "SKILL.md";
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
const SETUP_ERROR_EXCERPT_PART = 250;
const SETUP_LOG_FILE_MODE = 0o600;
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

function setupOutputExcerpt(output: string): string {
  const trimmed = output.trim();
  if (trimmed.length <= INSTALL_ERROR_TAIL) return trimmed;
  return `${trimmed.slice(0, SETUP_ERROR_EXCERPT_PART)}\n…\n${trimmed.slice(-SETUP_ERROR_EXCERPT_PART)}`;
}

/** Conventional worktree setup script paths (relative to the repo), tried in order when no explicit command is configured. */
const WORKTREE_SETUP_CANDIDATES = ["scripts/setup-worktree.sh", "setup-worktree.sh", ".kanban/setup-worktree.sh"] as const;
/** Conventional worktree teardown script paths (relative to the repo), tried in order when no explicit command is configured. */
const WORKTREE_TEARDOWN_CANDIDATES = ["scripts/teardown-worktree.sh", "teardown-worktree.sh", ".kanban/teardown-worktree.sh"] as const;
/** Cursor headless binary names, in priority order (installed as `cursor-agent`, also `agent`). */
const REVIEW_WORKTREE_DISCARD_ARGS = ["git", "checkout", "--", "."];
const REVIEW_WORKTREE_CLEAN_ARGS = ["git", "clean", "-fd"];

const CLAUDE_BINARY_NAME = "claude";
const COMPOSER_BINARIES = ["cursor-agent", "agent"] as const;
/** Bound the boot-time auth probe so a hanging `status` can never block server start. */
const COMPOSER_PROBE_TIMEOUT_MS = 10_000;

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
  /** The PR hosts behind the VCS seam, keyed by the project's `vcsProvider`. */
  private readonly vcsClients: Record<VcsProvider, VcsClient> = {
    github: new GithubVcsClient(),
    azureDevops: new AzureDevopsVcsClient(),
  };

  constructor(
    workerMcpManager: WorkerMcpManager,
    private readonly logsDirectory?: string,
  ) {
    this.providers = { claude: claudeProvider, codex: createCodexProvider(workerMcpManager) };
  }

  private vcs(provider: VcsProvider): VcsClient {
    return this.vcsClients[provider];
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

  async findWorktreeByBranch(repoPath: string, branch: string): Promise<string | null> {
    const res = await $`git -C ${repoPath} worktree list --porcelain -z`.nothrow().quiet();
    if (res.exitCode !== 0) {
      const detail = res.stderr.toString().trim() || res.stdout.toString().trim();
      throw new Error(`git worktree list a échoué (code ${res.exitCode}) : ${detail}`);
    }

    const branchRef = `refs/heads/${branch}`;
    for (const record of res.stdout.toString().split("\0\0")) {
      const fields = record.split("\0");
      if (!fields.includes(`branch ${branchRef}`)) continue;
      const pathField = fields.find((field) => field.startsWith("worktree "));
      const path = pathField?.slice("worktree ".length);
      if (!path || fields.some((field) => field.startsWith("prunable")) || !existsSync(path)) {
        throw new Error(`la branche ${branch} référence un worktree Git absent ou obsolète`);
      }
      const currentBranch = await $`git -C ${path} symbolic-ref --quiet HEAD`.nothrow().quiet();
      if (currentBranch.exitCode !== 0 || currentBranch.stdout.toString().trim() !== branchRef) {
        throw new Error(`le worktree ${path} ne pointe plus vers la branche ${branch}`);
      }
      return path;
    }
    return null;
  }

  async worktreeAdd(opts: GitWorktreeAddOptions): Promise<void> {
    const branchRef = `refs/heads/${opts.branch}`;
    const branchCheck = await $`git -C ${opts.repoPath} show-ref --verify --quiet ${branchRef}`.nothrow().quiet();
    if (branchCheck.exitCode !== 0 && branchCheck.exitCode !== 1) {
      const detail = branchCheck.stderr.toString().trim() || branchCheck.stdout.toString().trim();
      throw new Error(`vérification de la branche ${opts.branch} a échoué (code ${branchCheck.exitCode}) : ${detail}`);
    }

    const res =
      branchCheck.exitCode === 0
        ? await $`git -C ${opts.repoPath} worktree add ${opts.slotPath} ${opts.branch}`.nothrow().quiet()
        : await $`git -C ${opts.repoPath} worktree add ${opts.slotPath} -b ${opts.branch} origin/${opts.baseBranch}`
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
    const setupLogPath = await this.persistSetupOutput(res.stdout, res.stderr);
    const logDetail = setupLogPath === null ? "" : `\nJournal complet : ${setupLogPath}`;
    if (res.timedOut) {
      const stdoutExcerpt = setupOutputExcerpt(res.stdout);
      const stderrExcerpt = setupOutputExcerpt(res.stderr);
      const detail = [`stdout:\n${stdoutExcerpt}`, `stderr:\n${stderrExcerpt}`].join("\n");
      throw new Error(`timeout (${opts.timeoutMs}ms): ${command}\n${detail}${logDetail}`);
    }
    if (res.exitCode !== 0) {
      const stdoutExcerpt = setupOutputExcerpt(res.stdout);
      const stderrExcerpt = setupOutputExcerpt(res.stderr);
      const detail = [`stdout:\n${stdoutExcerpt}`, `stderr:\n${stderrExcerpt}`].join("\n");
      throw new Error(`le script de configuration du worktree a échoué (code ${res.exitCode}) : ${detail}${logDetail}`);
    }
  }

  private async persistSetupOutput(stdout: string, stderr: string): Promise<string | null> {
    if (this.logsDirectory === undefined) return null;
    const logPath = resolve(
      this.logsDirectory,
      `worktree-setup-${new Date().toISOString().replaceAll(":", "-")}-${randomUUID()}.log`,
    );
    try {
      await mkdir(this.logsDirectory, { recursive: true });
      await writeFile(logPath, `[stdout]\n${stdout}\n[stderr]\n${stderr}`, { mode: SETUP_LOG_FILE_MODE });
      return logPath;
    } catch (error) {
      log.warn("journal du setup du worktree non persisté", { error: getErrorMessage(error), logPath });
      return null;
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
      env: agentBaseEnv(),
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
    // Reclaim a zombie of this name first: tmux shell sessions survive a backend restart, so the name
    // can collide with an orphan — without this `new-session` would fail and the spawn would throw.
    // Killing it (nothrow) is a no-op when absent.
    const startupDirectory = await prepareProjectShell(opts.cwd);
    await this.killSession(opts.sessionName);
    if (startupDirectory) this.shellStartupDirectories.set(opts.sessionName, startupDirectory);
    const environmentArgs = startupDirectory ? ["-e", `ZDOTDIR=${startupDirectory}`] : [];
    try {
      if (opts.initialCommand !== undefined) {
        // Auto-run the launch command, then `exec zsh -l` so the user keeps an interactive worktree
        // shell once it exits/stops. `wrapped` is passed as a single `zsh -lc` argument.
        const wrapped = `${opts.initialCommand}; exec zsh -l`;
        await $`tmux new-session -d -s ${opts.sessionName} -c ${opts.cwd} -x ${TERMINAL_DEFAULT_COLS} -y ${TERMINAL_DEFAULT_ROWS} ${environmentArgs} zsh -lc ${wrapped}`.env(agentBaseEnv()).quiet();
        return;
      }
      // A plain interactive login shell — no keep-alive wrapper: when the user `exit`s, the session
      // dies and the cell settles on "session terminée" (consistent with the live-stream teardown).
      await $`tmux new-session -d -s ${opts.sessionName} -c ${opts.cwd} -x ${TERMINAL_DEFAULT_COLS} -y ${TERMINAL_DEFAULT_ROWS} ${environmentArgs} zsh -l`.env(agentBaseEnv()).quiet();
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

  async verifyDone(slotPath: string, branch: string, prUrl: string, provider: VcsProvider): Promise<DoneGateResult> {
    const status = await $`git -C ${slotPath} status --porcelain`.nothrow().quiet();
    if (status.exitCode !== 0) return { ok: false, reason: "git status a échoué" };
    if (status.stdout.toString().trim().length > 0) {
      return { ok: false, reason: "arbre de travail non propre (modifications non commitées)" };
    }
    const ahead = await $`git -C ${slotPath} rev-list --count origin/${branch}..${branch}`.nothrow().quiet();
    if (ahead.exitCode === 0 && ahead.stdout.toString().trim() !== "0") {
      return { ok: false, reason: "la branche n'est pas poussée (commits en avance)" };
    }
    return this.vcs(provider).verifyPrExists(slotPath, prUrl);
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

  async createPr(
    slotPath: string,
    baseBranch: string,
    opts: { draft: boolean },
    provider: VcsProvider,
  ): Promise<{ ok: boolean; url: string; reason: string }> {
    // The base branch must exist on origin before the PR creation can target it.
    const baseExists = await $`git -C ${slotPath} ls-remote --heads origin ${baseBranch}`.nothrow().quiet();
    if (baseExists.exitCode !== 0 || baseExists.stdout.toString().trim().length === 0) {
      const push = await $`git -C ${slotPath} push origin HEAD:refs/heads/${baseBranch}`.nothrow().quiet();
      if (push.exitCode !== 0) {
        const detail = push.stderr.toString().trim() || push.stdout.toString().trim();
        return { ok: false, url: "", reason: `création de la branche de base ${baseBranch} échouée : ${detail}` };
      }
    }
    return this.vcs(provider).createPr(slotPath, baseBranch, opts);
  }

  async fetchPrSummary(slotPath: string, prUrl: string, provider: VcsProvider): Promise<string | null> {
    return this.vcs(provider).fetchPrSummary(slotPath, prUrl);
  }

  async verifyReviewDone(
    slotPath: string,
    prUrl: string,
    opts: ReviewDoneOptions,
    provider: VcsProvider,
  ): Promise<DoneGateResult> {
    const client = this.vcs(provider);
    const head = await client.confirmPrHead(slotPath, prUrl);
    if (!head.ok || head.commitSha === null) return { ok: false, reason: head.reason };
    const localHead = await runBoundedCommand(["git", "rev-parse", "HEAD"], slotPath);
    if (localHead.exitCode !== 0 || localHead.stdout.trim() !== head.commitSha) {
      return { ok: false, reason: "le head de la PR a changé depuis la passe de review" };
    }
    if (opts.expectedCommitSha !== null && head.commitSha !== opts.expectedCommitSha) {
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
    return client.verifyReviewPublication(slotPath, prUrl, {
      since: opts.requirePostedSince,
      marker: opts.publicationMarker,
      commitSha: opts.expectedCommitSha,
      reviewId: opts.publishedReviewId,
      expectedState: opts.expectedReviewState,
    });
  }

  async prepareReviewWorktree(opts: PrepareReviewWorktreeOptions): Promise<ReviewHeadResult> {
    const client = this.vcs(opts.provider);
    const reset = await this.resetReviewWorktree(opts.slotPath);
    if (!reset.ok) return { ...reset, commitSha: null };
    const clean = await this.reviewWorktreeClean(opts.slotPath);
    if (!clean.ok) return { ...clean, commitSha: null };
    const remote = await client.readPrHead(opts.repoPath, opts.prUrl);
    if (!remote.ok || remote.commitSha === null) return remote;
    const local = await this.localHeadSha(opts.slotPath);
    if (local === remote.commitSha) return remote;
    const pullRef = await client.prHeadFetchRef(opts.repoPath, opts.prUrl, opts.prNumber);
    if (pullRef === null) {
      return { ok: false, reason: "ce fournisseur n'expose pas de ref de head de PR à récupérer", commitSha: null };
    }
    const temporaryRef = `refs/kanban/reviews/${randomUUID()}`;
    try {
      const fetch = await runBoundedCommand(
        ["git", "fetch", "--no-write-fetch-head", "origin", `${pullRef}:${temporaryRef}`],
        opts.repoPath,
      );
      if (fetch.exitCode !== 0) {
        return { ok: false, reason: `rafraîchissement du head de PR impossible : ${boundedCommandDetail(fetch)}`, commitSha: null };
      }
      const fetched = await runBoundedCommand(["git", "rev-parse", temporaryRef], opts.repoPath);
      if (fetched.exitCode !== 0 || fetched.stdout.trim() !== remote.commitSha) {
        return { ok: false, reason: "le SHA récupéré ne correspond pas au head courant de la PR", commitSha: null };
      }
      const checkout = await runBoundedCommand(["git", "switch", "--detach", remote.commitSha], opts.slotPath);
      if (checkout.exitCode !== 0) {
        return {
          ok: false,
          reason: `positionnement du worktree sur le head de PR impossible : ${boundedCommandDetail(checkout)}`,
          commitSha: null,
        };
      }
    } finally {
      await runBoundedCommand(["git", "update-ref", "-d", temporaryRef], opts.repoPath);
    }
    const refreshed = await this.readReviewHead(opts.slotPath, opts.prUrl, opts.provider);
    if (!refreshed.ok) return refreshed;
    if (refreshed.commitSha !== remote.commitSha) {
      return { ok: false, reason: "la PR a avancé pendant la préparation : relance la passe de review", commitSha: null };
    }
    return refreshed;
  }

  async readReviewHead(slotPath: string, prUrl: string, provider: VcsProvider): Promise<ReviewHeadResult> {
    const clean = await this.reviewWorktreeClean(slotPath);
    if (!clean.ok) return { ...clean, commitSha: null };
    const remote = await this.vcs(provider).readPrHead(slotPath, prUrl);
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
    provider: VcsProvider,
  ): Promise<PublishReviewResult> {
    const current = await this.readReviewHead(slotPath, prUrl, provider);
    if (!current.ok || current.commitSha === null) return { ok: false, reason: current.reason, reviewId: null };
    if (current.commitSha !== opts.expectedCommitSha) {
      return {
        ok: false,
        reason: "la PR a avancé depuis cette passe : lance une nouvelle passe de review complète, sans republier celle-ci",
        reviewId: null,
      };
    }
    return this.vcs(provider).publishReview(slotPath, prUrl, opts);
  }

  // NOTE(ali): safe only for a read-only review pass, which never produces a diff by design, so any local
  // change comes from setup (copied env files, setup script) and blocks the pass for nothing. Never call it from
  // readReviewHead: fix-mode reviews hold uncommitted fixes there. No `-x`: ignored files (.env, node_modules) stay.
  private async resetReviewWorktree(slotPath: string): Promise<DoneGateResult> {
    if (await this.isMainCheckout(slotPath)) {
      return { ok: false, reason: `refus de remettre au propre le worktree de review : ${slotPath} est le checkout PRINCIPAL` };
    }
    for (const args of [REVIEW_WORKTREE_DISCARD_ARGS, REVIEW_WORKTREE_CLEAN_ARGS]) {
      const res = await runBoundedCommand(args, slotPath);
      if (res.exitCode !== 0) {
        return { ok: false, reason: `remise au propre du worktree de review impossible : ${boundedCommandDetail(res)}` };
      }
    }
    return { ok: true, reason: "" };
  }

  private async reviewWorktreeClean(slotPath: string): Promise<DoneGateResult> {
    const status = await runBoundedCommand(["git", "status", "--porcelain"], slotPath);
    if (status.exitCode !== 0) return { ok: false, reason: "git status a échoué pendant la préparation de review" };
    if (status.stdout.trim().length > 0) {
      return { ok: false, reason: "le worktree contient des changements locaux ; aucune mise à jour de PR ne sera appliquée" };
    }
    return { ok: true, reason: "" };
  }

  private async localHeadSha(slotPath: string): Promise<string | null> {
    const head = await runBoundedCommand(["git", "rev-parse", "HEAD"], slotPath);
    if (head.exitCode !== 0) return null;
    const value = head.stdout.trim();
    return value.length > 0 ? value : null;
  }

  /** Clean working tree and the branch has no commits ahead of origin/<branch> (mirrors verifyDone). */
  private async verifyBranchPushed(slotPath: string, branch: string): Promise<DoneGateResult> {
    const status = await runBoundedCommand(["git", "status", "--porcelain"], slotPath);
    if (status.exitCode !== 0) return { ok: false, reason: "git status a échoué" };
    if (status.stdout.trim().length > 0) {
      return { ok: false, reason: "arbre de travail non propre (corrections non commitées)" };
    }
    // A non-zero exit means origin/<branch> couldn't be resolved (branch never pushed): fail the gate
    // rather than fall through to ok. origin/<branch> exists here (the worktree was checked out from it),
    // so a failure is a real signal, not the absent-ref case verifyDone tolerates for fresh branches.
    // Compare against HEAD (the worktree's checked-out tip), not the local branch name: a clean
    // ticket's local branch is suffixed (-cleaner) and differs from the PR head origin ref `branch`.
    const ahead = await runBoundedCommand(["git", "rev-list", "--count", `origin/${branch}..HEAD`], slotPath);
    if (ahead.exitCode !== 0) {
      return { ok: false, reason: "impossible de vérifier l'avance de la branche de la PR (ref origin absente ?)" };
    }
    if (ahead.stdout.trim() !== "0") {
      return { ok: false, reason: "la branche de la PR n'est pas poussée (commits en avance)" };
    }
    return { ok: true, reason: "" };
  }

  async listOpenPrs(repoPath: string, provider: VcsProvider): Promise<OpenPr[]> {
    return this.vcs(provider).listOpenPrs(repoPath);
  }

  async listReviewCounts(projects: { repoPath: string; provider: VcsProvider }[]): Promise<Record<string, number | null>> {
    const githubPaths = [...new Set(projects.filter((project) => project.provider === "github").map((project) => project.repoPath))];
    const azurePaths = [...new Set(projects.filter((project) => project.provider === "azureDevops").map((project) => project.repoPath))];
    const [github, azure] = await Promise.all([
      this.vcs("github").listReviewCounts(githubPaths),
      this.vcs("azureDevops").listReviewCounts(azurePaths),
    ]);
    return { ...github, ...azure };
  }

  async testVcsConnection(repoPath: string, provider: VcsProvider): Promise<VcsConnectionResult> {
    return this.vcs(provider).testConnection(repoPath, Date.now());
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

  async mergePr(slotPath: string, branch: string, prUrl: string, provider: VcsProvider): Promise<DoneGateResult> {
    const merged = await this.vcs(provider).mergePr(slotPath, prUrl);
    if (!merged.ok) return merged;
    // Best-effort remote branch cleanup: the merge already succeeded, so a failed
    // deletion (e.g. branch protection) must not turn into a merge failure. We can't
    // use `gh pr merge --delete-branch` because its local cleanup checks out the base
    // branch, which is already checked out in the main worktree and would error.
    await $`git push origin --delete ${branch}`.cwd(slotPath).nothrow().quiet();
    return { ok: true, reason: "" };
  }

  async checkPrMerged(repoPath: string, prUrl: string, provider: VcsProvider): Promise<{ merged: boolean; state: PrState }> {
    // Single read (no polling): a manual user-triggered check has no synchronous-merge
    // read lag to absorb as in the auto-merge path.
    const state = await this.vcs(provider).readPrState(repoPath, prUrl);
    return { merged: state === "merged", state };
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

  async checkSkills(): Promise<SkillStatus[]> {
    return SKILL_REQUIREMENTS.map((skill) => ({
      ...skill,
      installed: existsSync(join(CLAUDE_SKILLS_DIR, skill.name, SKILL_MANIFEST_FILE)),
    }));
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
 * Resolve the first conventional worktree script to a `bash <absolutePath>` command (so it runs without
 * a +x bit), ALWAYS pointing at the copy that lives inside the slot. Null when no candidate exists.
 *
 * Why the slot copy, never the repo copy: daedalus-style scripts derive their target worktree from
 * their own location (`WORKTREE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"`) and ignore cwd.
 * Running the repo's copy would make them mutate the MAIN checkout (offset its .env, package.json, etc.)
 * instead of the slot. The script is normally tracked, so `worktree add` already checked it out into the
 * slot; when a repo keeps it untracked it is absent from the slot, so copy it in first (Bun.write also
 * creates parent dirs). The copy loses the +x bit, which is fine — we invoke it via `bash <path>`.
 */
async function resolveWorktreeScriptCommand(
  candidates: readonly string[],
  repoPath: string,
  slotPath: string,
): Promise<string | null> {
  for (const rel of candidates) {
    const inSlot = join(slotPath, rel);
    if (await Bun.file(inSlot).exists()) return `bash ${shQuote(inSlot)}`;
    const inRepo = join(repoPath, rel);
    if (await Bun.file(inRepo).exists()) {
      await Bun.write(inSlot, Bun.file(inRepo));
      return `bash ${shQuote(inSlot)}`;
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
