/**
 * The side-effect boundary. Every external mutation (git lifecycle, tmux, gh,
 * osascript, ~/.claude.json) goes through this interface so the server can boot
 * and run end-to-end with a fake implementation (dry-run) during dev/test.
 */

import type { OpenPr } from "../../shared/schemas.ts";

export interface GitWorktreeAddOptions {
  repoPath: string;
  slotPath: string;
  branch: string;
  baseBranch: string;
}

export interface SpawnTmuxOptions {
  sessionName: string;
  cwd: string;
  env: Record<string, string>;
  /** Model alias for the implementation session (claude --model). */
  model: string;
  /** Reasoning effort (claude --effort), or null to use the model default. */
  effort: string | null;
}

/**
 * A read-only feasibility triage session: a detached `claude` spawned on the real repo with the
 * worker channel attached but no worktree/slot. Read-only is structural (`--tools Read,Glob,Grep`;
 * with `deep: true`, Task + inline read-only scouts are added for parallel fan-out).
 */
export interface SpawnTriageOptions {
  sessionName: string;
  cwd: string;
  /** Model alias for the triage session (claude --model). */
  model: string;
  /** Reasoning effort (claude --effort), or null to use the model default. */
  effort: string | null;
  /** Inline worker MCP config (JSON), passed via `--mcp-config` + `--strict-mcp-config`. */
  mcpConfig: string;
  /** Extra tmux env (e.g. DISABLE_AUTOUPDATER); the worker's TICKET_ID/SLOT_ID live in mcpConfig. */
  env: Record<string, string>;
  /** "Analyse +" variant: orchestrator may fan out read-only sub-agents via Task. */
  deep?: boolean;
}

/**
 * A read-only batch feasibility session: a detached `claude` on the real repo with the worker
 * channel attached but no worktree/slot, allowed to fan out sub-agents (`--tools Read,Glob,Grep,Task`).
 * Same options as a triage session; the wider tool surface is the only difference.
 */
export type SpawnFeasibilityOptions = SpawnTriageOptions;

export interface ReformulateOptions {
  cwd: string;
  prompt: string;
  model: string;
  effort: string | null;
}

/**
 * A live byte stream of a tmux pane's output. Backed by `pipe-pane` → FIFO → `cat`
 * in the real adapter, or a synthetic echo queue in the fake. The boundary keeps all
 * tmux/FIFO plumbing inside the adapter so the terminal manager runs in dry-run too.
 */
export interface PaneStream {
  /** Raw output chunks as they are produced; ends when the pane closes or `close()` runs. */
  readonly chunks: AsyncIterable<Uint8Array>;
  /** Stop the pipe, kill the reader, and remove the FIFO. Idempotent. */
  close(): Promise<void>;
}

export interface DoneGateResult {
  ok: boolean;
  /** Human-readable reason when ok === false. */
  reason: string;
}

/** A tmux window's geometry, used to decide whether a viewer connect will reflow (and reprint) the pane. */
export interface PaneSize {
  cols: number;
  rows: number;
}

export interface PrepareSlotFiles {
  /** Absolute slot dir into which to write .mcp.json / .claude/settings.json. */
  slotPath: string;
  mcpJson: string;
  settingsJson: string;
  /** `.claude/agents/implementer.md` content (the configurable code-writing sub-agent). */
  implementerAgentMd: string;
  /** `.claude/agents/pr-fixer.md` content (review-fix sub-agent that applies reviewer findings). */
  prFixerAgentMd: string;
}

export interface WorktreeSetupOptions {
  repoPath: string;
  slotPath: string;
  branch: string;
  baseBranch: string;
  /** Explicit command from project config, or null to auto-detect a conventional script file. */
  script: string | null;
  timeoutMs: number;
}

export interface ReviewDoneOptions {
  /**
   * When set, the gate also requires a review posted by the current gh user at or after this
   * epoch ms (safety net for argus --post). Null keeps the plain PR-existence check.
   */
  requirePostedSince: number | null;
  /**
   * When set (fixComments review or clean ticket), also require a clean tree with the PR branch fully
   * pushed. The gate compares `origin/<branch>..HEAD` (the worktree's checked-out tip), so a clean
   * ticket's suffixed local branch is still verified against the PR head.
   */
  requirePushedBranch: string | null;
}

/** A free interactive login-shell session for the user terminals (CMUX) view. */
export interface SpawnShellOptions {
  sessionName: string;
  cwd: string;
  /**
   * Command auto-run when the shell starts; the shell stays interactive afterward (`exec zsh -l`) so
   * the user keeps the worktree shell after the launched command exits or is stopped.
   */
  initialCommand?: string;
}

export interface SystemAdapter {
  readonly dryRun: boolean;

  // ---- Workspace trust seeding (slots at first-boot; the real repo before a triage session) ----
  seedWorkspaceTrust(paths: string[]): Promise<void>;
  excludeAgentFilesInRepo(repoPath: string): Promise<void>;

  // ---- git worktree lifecycle ----
  worktreeRemove(repoPath: string, slotPath: string): Promise<void>;
  fetch(repoPath: string, baseBranch: string): Promise<void>;
  worktreeAdd(opts: GitWorktreeAddOptions): Promise<void>;
  /**
   * Check out an EXISTING remote branch into a worktree, resetting the local ref to origin/<startBranch>.
   * `localBranch` is the worktree's branch name; `startBranch` (default = localBranch) is the origin ref
   * to start from — they differ for a clean ticket whose local branch is suffixed to avoid collisions.
   */
  worktreeAddExisting(repoPath: string, slotPath: string, localBranch: string, startBranch?: string): Promise<void>;
  deleteLocalBranch(repoPath: string, branch: string): Promise<void>;

  // ---- slot preparation ----
  prepareSlotFiles(files: PrepareSlotFiles): Promise<void>;
  copyEnvFiles(repoPath: string, slotPath: string): Promise<void>;
  /** Run the project's worktree setup script (explicit config command, else auto-detected) in the freshly-created slot worktree. No-op when neither exists. Throws on non-zero exit. */
  runWorktreeSetupScript(opts: WorktreeSetupOptions): Promise<void>;
  /**
   * Symmetric to runWorktreeSetupScript; best-effort cleanup run before worktree removal (e.g. docker
   * compose down). Never throws (logs on failure) so the removal always proceeds; no-op when no
   * teardown command/script exists.
   */
  runWorktreeTeardownScript(opts: WorktreeSetupOptions): Promise<void>;
  installDeps(slotPath: string, timeoutMs: number): Promise<void>;

  // ---- tmux session ----
  spawnSession(opts: SpawnTmuxOptions): Promise<void>;
  /** Spawn a detached read-only triage session (worker channel attached, no worktree/slot). */
  spawnTriageSession(opts: SpawnTriageOptions): Promise<void>;
  /** Spawn a detached read-only batch feasibility session (fans out sub-agents; no worktree/slot). */
  spawnFeasibilitySession(opts: SpawnFeasibilityOptions): Promise<void>;
  /**
   * Run a one-shot `claude -p` returning its final text (used to reformulate a ticket need).
   * Read-only, no worktree/slot.
   */
  reformulate(opts: ReformulateOptions): Promise<string>;
  /** Spawn a detached interactive login-shell (zsh) session rooted at cwd for a user terminal. */
  spawnShellSession(opts: SpawnShellOptions): Promise<void>;
  killSession(sessionName: string): Promise<void>;
  hasSession(sessionName: string): Promise<boolean>;
  /** Last ~200 lines of the session's pane (read-only). Empty string if missing. */
  capturePane(sessionName: string): Promise<string>;

  // ---- interactive terminal (live PTY stream + co-control) ----
  /**
   * Like capturePane but keeps ANSI escapes (`-e`), to seed an xterm viewer. `historyLines` is how
   * much scrollback to prepend to the visible frame; pass 0 for the current frame only. A full-screen
   * TUI (the agent pane) reprints its whole static log on every resize, so its detached scrollback
   * stacks duplicate frames — capture only the visible frame there.
   */
  capturePaneAnsi(sessionName: string, historyLines: number): Promise<string>;
  /**
   * Current tmux window geometry (`display-message #{window_width}/#{window_height}`), or null when
   * unreadable. Lets the caller tell whether reflowing the pane to a viewer will trigger a reprint.
   */
  paneSize(sessionName: string): Promise<PaneSize | null>;
  /** Open a live byte stream of the pane's output (pipe-pane → FIFO in the real adapter). */
  openPaneStream(sessionName: string): Promise<PaneStream>;
  /** Inject raw key bytes (hex pairs) into the pane verbatim (`send-keys -H`). */
  sendKeysRaw(sessionName: string, hexBytes: string): Promise<void>;
  /** Resize the pane's window to cols×rows (`resize-window -x -y`). */
  resizePane(sessionName: string, cols: number, rows: number): Promise<void>;

  // ---- done() gate verification ----
  verifyDone(slotPath: string, branch: string, prUrl: string): Promise<DoneGateResult>;
  /** Review done() gate: the reviewed PR still exists, plus the posted-review check when requested. */
  verifyReviewDone(slotPath: string, prUrl: string, opts: ReviewDoneOptions): Promise<DoneGateResult>;
  /** PR description body (`gh pr view --json body`), used as the agent-work summary. null when unreadable. */
  fetchPrSummary(slotPath: string, prUrl: string): Promise<string | null>;

  // ---- PR listing (review entry point) ----
  /** Open PRs of the project repo, as surfaced by `gh pr list`. Throws on CLI failure. */
  listOpenPrs(repoPath: string): Promise<OpenPr[]>;

  // ---- branch listing (base branch picker) ----
  /** Remote branch names of the project repo (`git ls-remote --heads origin`). Throws on CLI failure. */
  listBranches(repoPath: string): Promise<string[]>;

  // ---- auto-merge (opt-in per ticket) ----
  /** Mark the PR ready (no-op if already), merge it into its base branch, and delete its remote branch. */
  mergePr(slotPath: string, branch: string, prUrl: string): Promise<DoneGateResult>;
  /** Read the PR's GitHub merge state. `merged` is true only when state === "MERGED". `state` is "OPEN"|"MERGED"|"CLOSED"|"" (empty when unreadable). */
  checkPrMerged(repoPath: string, prUrl: string): Promise<{ merged: boolean; state: string }>;

  // ---- project test commands ----
  runProjectScript(slotPath: string, command: string, timeoutMs: number): Promise<{ ok: boolean; output: string }>;

  // ---- capability probe ----
  /** Whether the Cursor headless CLI (the Composer driver) is installed AND authenticated. */
  checkComposerAvailable(): Promise<boolean>;

  // ---- desktop self-update guards (dev desktop only) ----
  /** Current checked-out branch (`git rev-parse --abbrev-ref HEAD`); "" when it can't be read. */
  gitCurrentBranch(repoPath: string): Promise<string>;
  /** True when the working tree has no uncommitted changes (`git status --porcelain` empty). */
  gitStatusClean(repoPath: string): Promise<boolean>;
  /** Fast-forward-only pull of origin/<baseBranch> (never merges; blocks on divergence). */
  gitPullFastForward(repoPath: string, baseBranch: string): Promise<DoneGateResult>;
}
