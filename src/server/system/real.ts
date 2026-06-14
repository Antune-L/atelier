import { $ } from "bun";
import { existsSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { join } from "node:path";
import { z } from "zod";

import { TERMINAL_DEFAULT_COLS, TERMINAL_DEFAULT_ROWS } from "../../shared/constants.ts";
import type { OpenPr } from "../../shared/schemas.ts";

import type {
  DoneGateResult,
  GitWorktreeAddOptions,
  PaneStream,
  PrepareSlotFiles,
  ReviewDoneOptions,
  SpawnTmuxOptions,
  SpawnTriageOptions,
  SystemAdapter,
} from "./types.ts";

const CLAUDE_JSON_PATH = join(homedir(), ".claude.json");
const PROD_ENV_MARKER = "prod";
/**
 * Read-only built-in tool allowlist for a triage session: bounding `--tools` to these makes
 * Edit/Write/Bash structurally unloadable regardless of permission-mode. MCP tools survive `--tools`,
 * so `mcp__worker__submit_triage` stays callable.
 */
const TRIAGE_READONLY_TOOLS = "Read,Glob,Grep";
/** How long a crashed pane stays readable before the session closes itself (1 h). */
const DEAD_PANE_KEEP_ALIVE_S = 3600;
// The dev-channels warning dialog has no bypass (by design): the backend watches
// the pane after spawn and confirms the default "local development" option.
const DEV_CHANNELS_DIALOG_MARKER = "I am using this for local development";
const DIALOG_POLL_INTERVAL_MS = 500;
const DIALOG_POLL_ATTEMPTS = 120;
/** Keep only the tail of a failed install's output in the surfaced error. */
const INSTALL_ERROR_TAIL = 500;
/** Merge strategy for the opt-in auto-merge (rebase replays commits onto the base branch). */
const PR_MERGE_STRATEGY = "--rebase";
/** Cursor headless binary names, in priority order (installed as `cursor-agent`, also `agent`). */
const COMPOSER_BINARIES = ["cursor-agent", "agent"] as const;
/** Bound the boot-time auth probe so a hanging `status` can never block server start. */
const COMPOSER_PROBE_TIMEOUT_MS = 10_000;
/** `gh pr list --json` fields surfaced to the review picker. */
const PR_LIST_FIELDS = "number,title,url,headRefName,isDraft,reviewDecision,updatedAt,author,additions,deletions";
/** Cap the review picker to the most recent open PRs. */
const PR_LIST_LIMIT = "50";
/** Minimal settings injected inline so a triage session skips the "enable MCP servers?" dialog. */
const TRIAGE_SETTINGS_JSON = JSON.stringify({ enableAllProjectMcpServers: true });

/** Shape of one `gh pr view --json reviews` entry (only the fields the posted-review gate needs). */
const ghReviewSchema = z.object({
  author: z.object({ login: z.string() }).nullable(),
  submittedAt: z.string().nullable(),
});
const ghReviewsSchema = z.object({ reviews: z.array(ghReviewSchema) });

/** Shape of one `gh pr list --json` entry (mapped to the shared OpenPr). */
const ghPrSchema = z.object({
  number: z.number(),
  title: z.string(),
  url: z.string(),
  headRefName: z.string(),
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

/**
 * Real adapter: performs actual git/tmux/gh/osascript/filesystem side effects.
 * Only selected when KANBAN_DRY_RUN is off AND the env explicitly opts in.
 * Never instantiated in the default dev/test path.
 */
export class RealSystemAdapter implements SystemAdapter {
  readonly dryRun = false;

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

  async worktreeAddExisting(repoPath: string, slotPath: string, branch: string): Promise<void> {
    // `-B` (re)creates the local branch at origin/<branch>, so the worktree carries the PR's commits
    // rather than a fresh branch off base. Caller fetches origin/<branch> first.
    const res = await $`git -C ${repoPath} worktree add ${slotPath} -B ${branch} origin/${branch}`.nothrow().quiet();
    if (res.exitCode !== 0) {
      const detail = res.stderr.toString().trim() || res.stdout.toString().trim();
      throw new Error(`git worktree add (branche existante) a échoué (code ${res.exitCode}) : ${detail}`);
    }
  }

  async deleteLocalBranch(repoPath: string, branch: string): Promise<void> {
    await $`git -C ${repoPath} branch -D ${branch}`.nothrow().quiet();
  }

  async prepareSlotFiles(files: PrepareSlotFiles): Promise<void> {
    await Bun.write(join(files.slotPath, ".mcp.json"), files.mcpJson);
    await Bun.write(join(files.slotPath, ".claude", "settings.json"), files.settingsJson);
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

  async installDeps(slotPath: string, timeoutMs: number): Promise<void> {
    const command = await detectInstallCommand(slotPath);
    const res = await withTimeout($`sh -c ${command}`.cwd(slotPath).nothrow().quiet(), timeoutMs, command);
    if (res.exitCode !== 0) {
      const detail = (res.stderr.toString() + res.stdout.toString()).trim().slice(-INSTALL_ERROR_TAIL);
      throw new Error(`${command} a échoué (code ${res.exitCode}) : ${detail}`);
    }
  }

  async spawnSession(opts: SpawnTmuxOptions): Promise<void> {
    const envFlags = Object.entries(opts.env).flatMap(([k, v]) => ["-e", `${k}=${v}`]);
    const effortFlag = opts.effort ? ` --effort ${opts.effort}` : "";
    const claudeCmd = `claude --model ${opts.model}${effortFlag} --dangerously-load-development-channels server:worker --permission-mode auto`;
    // tmux kills the session when its root command exits, taking the error output
    // with it. Keep the pane alive after a crash so capture-pane can show why.
    const wrapped = `${claudeCmd}; status=$?; echo; echo "[claude exited: $status]"; exec sleep ${DEAD_PANE_KEEP_ALIVE_S}`;
    // -x/-y fix the detached pane size; without it an unattached session is 80×24
    // and the live terminal can't reflow to the viewer's xterm width.
    await $`tmux new-session -d -s ${opts.sessionName} -c ${opts.cwd} -x ${TERMINAL_DEFAULT_COLS} -y ${TERMINAL_DEFAULT_ROWS} ${envFlags} ${wrapped}`.quiet();
    void this.acceptDevChannelsDialog(opts.sessionName);
  }

  async spawnTriageSession(opts: SpawnTriageOptions): Promise<void> {
    const envFlags = Object.entries(opts.env).flatMap(([k, v]) => ["-e", `${k}=${v}`]);
    const effortFlag = opts.effort ? ` --effort ${opts.effort}` : "";
    // `auto` never prompts interactively (it auto-approves or silently blocks); the read-only tool
    // surface via `--tools` (Edit/Write/Bash unloadable) guarantees no write tool can exist anyway.
    // The JSON args carry no single quotes (JSON.stringify emits double quotes), so single-quoting
    // them for the inner shell is safe.
    const claudeCmd =
      `claude --model ${opts.model}${effortFlag}` +
      ` --mcp-config '${opts.mcpConfig}'` +
      ` --strict-mcp-config` +
      ` --dangerously-load-development-channels server:worker` +
      ` --settings '${TRIAGE_SETTINGS_JSON}'` +
      ` --tools ${TRIAGE_READONLY_TOOLS}` +
      ` --permission-mode auto`;
    const wrapped = `${claudeCmd}; status=$?; echo; echo "[claude exited: $status]"; exec sleep ${DEAD_PANE_KEEP_ALIVE_S}`;
    await $`tmux new-session -d -s ${opts.sessionName} -c ${opts.cwd} -x ${TERMINAL_DEFAULT_COLS} -y ${TERMINAL_DEFAULT_ROWS} ${envFlags} ${wrapped}`.quiet();
    void this.acceptDevChannelsDialog(opts.sessionName);
  }

  /** Confirm the unavoidable dev-channels warning so the session starts unattended. */
  private async acceptDevChannelsDialog(sessionName: string): Promise<void> {
    for (let attempt = 0; attempt < DIALOG_POLL_ATTEMPTS; attempt++) {
      await Bun.sleep(DIALOG_POLL_INTERVAL_MS);
      const pane = await this.capturePane(sessionName);
      if (pane.includes(DEV_CHANNELS_DIALOG_MARKER)) {
        await $`tmux send-keys -t ${sessionName} Enter`.nothrow().quiet();
        return;
      }
    }
  }

  async killSession(sessionName: string): Promise<void> {
    await $`tmux kill-session -t ${sessionName}`.nothrow().quiet();
  }

  async hasSession(sessionName: string): Promise<boolean> {
    const res = await $`tmux has-session -t ${sessionName}`.nothrow().quiet();
    return res.exitCode === 0;
  }

  async capturePane(sessionName: string): Promise<string> {
    const res = await $`tmux capture-pane -pt ${sessionName} -S -200`.nothrow().quiet();
    return res.exitCode === 0 ? res.stdout.toString() : "";
  }

  async capturePaneAnsi(sessionName: string): Promise<string> {
    const res = await $`tmux capture-pane -e -p -t ${sessionName} -S -200`.nothrow().quiet();
    return res.exitCode === 0 ? res.stdout.toString() : "";
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

  async verifyReviewDone(slotPath: string, prUrl: string, opts: ReviewDoneOptions): Promise<DoneGateResult> {
    const pr = await $`gh pr view ${prUrl} --json url`.cwd(slotPath).nothrow().quiet();
    if (pr.exitCode !== 0) return { ok: false, reason: `la PR n'existe pas (${prUrl})` };
    if (opts.requirePostedSince === null) return { ok: true, reason: "" };
    return this.verifyReviewPosted(slotPath, prUrl, opts.requirePostedSince);
  }

  /** Confirm the current gh user posted a review on the PR at or after `since` (epoch ms). */
  private async verifyReviewPosted(slotPath: string, prUrl: string, since: number): Promise<DoneGateResult> {
    const me = await $`gh api user -q .login`.cwd(slotPath).nothrow().quiet();
    const login = me.stdout.toString().trim();
    if (me.exitCode !== 0 || !login) {
      return { ok: false, reason: "postage demandé mais utilisateur gh courant indéterminé" };
    }
    const res = await $`gh pr view ${prUrl} --json reviews`.cwd(slotPath).nothrow().quiet();
    if (res.exitCode !== 0) return { ok: false, reason: "postage demandé mais lecture des reviews échouée" };
    const parsed = ghReviewsSchema.safeParse(safeJsonParse(res.stdout.toString()));
    if (!parsed.success) return { ok: false, reason: "postage demandé mais sortie gh inattendue" };
    const posted = parsed.data.reviews.some(
      (review) => review.author?.login === login && review.submittedAt !== null && Date.parse(review.submittedAt) >= since,
    );
    if (!posted) return { ok: false, reason: "postage demandé mais aucune review postée sur la PR" };
    return { ok: true, reason: "" };
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
    const res = await withTimeout($`sh -c ${command}`.cwd(slotPath).nothrow().quiet(), timeoutMs, command);
    return { ok: res.exitCode === 0, output: res.stdout.toString() + res.stderr.toString() };
  }

  async gitCurrentBranch(repoPath: string): Promise<string> {
    const res = await $`git -C ${repoPath} rev-parse --abbrev-ref HEAD`.nothrow().quiet();
    return res.exitCode === 0 ? res.stdout.toString().trim() : "";
  }

  async gitStatusClean(repoPath: string): Promise<boolean> {
    const res = await $`git -C ${repoPath} status --porcelain`.nothrow().quiet();
    return res.exitCode === 0 && res.stdout.toString().trim().length === 0;
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

async function detectInstallCommand(slotPath: string): Promise<string> {
  for (const { lockfile, command } of INSTALL_COMMANDS) {
    if (await Bun.file(join(slotPath, lockfile)).exists()) return command;
  }
  return "bun install";
}

/** Parse JSON, returning null instead of throwing so a malformed payload fails the zod guard. */
function safeJsonParse(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, label: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const guard = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`timeout (${timeoutMs}ms): ${label}`)), timeoutMs);
  });
  return Promise.race([promise, guard]).finally(() => {
    if (timer) clearTimeout(timer);
  });
}
