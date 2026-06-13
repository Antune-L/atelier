import { $ } from "bun";
import { homedir } from "node:os";
import { join } from "node:path";
import { z } from "zod";

import type { OpenPr } from "../../shared/schemas.ts";
import { MODELS } from "../config.ts";

import type {
  DoneGateResult,
  GitWorktreeAddOptions,
  PrepareSlotFiles,
  ReviewDoneOptions,
  SpawnTmuxOptions,
  SystemAdapter,
  TriageOptions,
} from "./types.ts";

const CLAUDE_JSON_PATH = join(homedir(), ".claude.json");
const PROD_ENV_MARKER = "prod";
const TRIAGE_ALLOWED_TOOLS = "Read,Glob,Grep";
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

// `claude -p --output-format stream-json` emits one JSON event per line. We only
// care about assistant turns (text + tool_use, for the live view) and the final
// result event (the verdict text to parse). Everything else (hooks, rate limits)
// is ignored.
const textBlockSchema = z.object({ type: z.literal("text"), text: z.string() });
const toolUseBlockSchema = z.object({
  type: z.literal("tool_use"),
  name: z.string(),
  input: z.record(z.string(), z.unknown()).optional(),
});
const assistantEventSchema = z.object({
  type: z.literal("assistant"),
  message: z.object({ content: z.unknown() }),
});
const resultEventSchema = z.object({
  type: z.literal("result"),
  result: z.string().default(""),
  is_error: z.boolean().default(false),
});

/**
 * Real adapter: performs actual git/tmux/gh/osascript/filesystem side effects.
 * Only selected when KANBAN_DRY_RUN is off AND the env explicitly opts in.
 * Never instantiated in the default dev/test path.
 */
export class RealSystemAdapter implements SystemAdapter {
  readonly dryRun = false;

  async seedTrustForSlots(slotPaths: string[]): Promise<void> {
    const file = Bun.file(CLAUDE_JSON_PATH);
    const exists = await file.exists();
    const config: Record<string, unknown> = exists ? await file.json() : {};
    const projectsRaw = config.projects;
    const projects: Record<string, unknown> =
      projectsRaw && typeof projectsRaw === "object" ? { ...projectsRaw } : {};
    for (const slotPath of slotPaths) {
      const existing = projects[slotPath];
      const base = existing && typeof existing === "object" ? existing : {};
      projects[slotPath] = { ...base, hasTrustDialogAccepted: true };
    }
    config.projects = projects;
    await Bun.write(CLAUDE_JSON_PATH, JSON.stringify(config, null, 2));
  }

  async excludeAgentFilesInRepo(repoPath: string): Promise<void> {
    const excludePath = join(repoPath, ".git", "info", "exclude");
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
    await $`tmux new-session -d -s ${opts.sessionName} -c ${opts.cwd} ${envFlags} ${wrapped}`.quiet();
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

  async mergePr(slotPath: string, branch: string, prUrl: string): Promise<DoneGateResult> {
    // A draft PR can't be merged; mark it ready first (harmless if already ready).
    await $`gh pr ready ${prUrl}`.cwd(slotPath).nothrow().quiet();
    const res = await $`gh pr merge ${prUrl} ${PR_MERGE_STRATEGY}`.cwd(slotPath).nothrow().quiet();
    if (res.exitCode !== 0) {
      const detail = res.stderr.toString().trim() || res.stdout.toString().trim();
      return { ok: false, reason: `gh pr merge a échoué (code ${res.exitCode}) : ${detail}` };
    }
    // Best-effort remote branch cleanup: the merge already succeeded, so a failed
    // deletion (e.g. branch protection) must not turn into a merge failure. We can't
    // use `gh pr merge --delete-branch` because its local cleanup checks out the base
    // branch, which is already checked out in the main worktree and would error.
    await $`git push origin --delete ${branch}`.cwd(slotPath).nothrow().quiet();
    return { ok: true, reason: "" };
  }

  async notify(title: string, body: string): Promise<void> {
    const escaped = (s: string): string => s.replace(/"/g, '\\"');
    await $`osascript -e ${`display notification "${escaped(body)}" with title "${escaped(title)}"`}`.nothrow().quiet();
  }

  async runProjectScript(slotPath: string, command: string, timeoutMs: number): Promise<{ ok: boolean; output: string }> {
    const res = await withTimeout($`sh -c ${command}`.cwd(slotPath).nothrow().quiet(), timeoutMs, command);
    return { ok: res.exitCode === 0, output: res.stdout.toString() + res.stderr.toString() };
  }

  async runTriage(opts: TriageOptions): Promise<{ ok: boolean; output: string }> {
    // Read-only allowlist: the session physically cannot write, safe on the real repo.
    // stream-json surfaces the analysis live (opts.onLine) while the final result
    // event carries the verdict text we parse.
    const proc = Bun.spawn(
      [
        "claude",
        "-p",
        opts.prompt,
        "--model",
        MODELS.triage,
        "--output-format",
        "stream-json",
        "--verbose",
        "--allowedTools",
        TRIAGE_ALLOWED_TOOLS,
      ],
      { cwd: opts.repoPath, stdout: "pipe", stderr: "pipe" },
    );
    const killTimer = setTimeout(() => proc.kill(), opts.timeoutMs);
    let result = "";
    let resultIsError = false;
    try {
      const reader = proc.stdout.getReader();
      const decoder = new TextDecoder();
      let pending = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        pending += decoder.decode(value, { stream: true });
        const lines = pending.split("\n");
        pending = lines.pop() ?? "";
        for (const line of lines) {
          const event = parseTriageStreamLine(line);
          if (!event) continue;
          if (event.kind === "result") {
            result = event.text;
            resultIsError = event.isError;
          } else if (event.text) {
            opts.onLine?.(event.text);
          }
        }
      }
      const exitCode = await proc.exited;
      clearTimeout(killTimer);
      if (resultIsError) return { ok: false, output: result };
      if (!result) {
        const stderr = await new Response(proc.stderr).text();
        return { ok: false, output: stderr || `claude triage: code ${exitCode}` };
      }
      return { ok: true, output: result };
    } catch (error) {
      clearTimeout(killTimer);
      return { ok: false, output: error instanceof Error ? error.message : String(error) };
    }
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

type TriageStreamEvent =
  | { kind: "progress"; text: string }
  | { kind: "result"; text: string; isError: boolean };

/** Map one stream-json line to a progress line or the final result; null for ignored events. */
function parseTriageStreamLine(line: string): TriageStreamEvent | null {
  const trimmed = line.trim();
  if (!trimmed) return null;
  let event: unknown;
  try {
    event = JSON.parse(trimmed);
  } catch {
    return null;
  }
  const result = resultEventSchema.safeParse(event);
  if (result.success) {
    return { kind: "result", text: result.data.result, isError: result.data.is_error };
  }
  const assistant = assistantEventSchema.safeParse(event);
  if (assistant.success) {
    const text = renderAssistantContent(assistant.data.message.content);
    return text ? { kind: "progress", text } : null;
  }
  return null;
}

/** Render an assistant message's content blocks as readable terminal lines. */
function renderAssistantContent(content: unknown): string {
  if (!Array.isArray(content)) return "";
  const lines: string[] = [];
  for (const block of content) {
    const text = textBlockSchema.safeParse(block);
    if (text.success) {
      const trimmed = text.data.text.trim();
      if (trimmed) lines.push(trimmed);
      continue;
    }
    const tool = toolUseBlockSchema.safeParse(block);
    if (tool.success) {
      lines.push(`● ${tool.data.name}(${summarizeToolInput(tool.data.input)})`);
    }
  }
  return lines.join("\n");
}

/** Pick the most telling argument of a read-only tool call for the live line. */
function summarizeToolInput(input: Record<string, unknown> | undefined): string {
  if (!input) return "";
  for (const key of ["file_path", "pattern", "path", "query"]) {
    const value = input[key];
    if (typeof value === "string") return value;
  }
  return "";
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
