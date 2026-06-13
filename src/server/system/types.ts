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

export interface DoneGateResult {
  ok: boolean;
  /** Human-readable reason when ok === false. */
  reason: string;
}

export interface PrepareSlotFiles {
  /** Absolute slot dir into which to write .mcp.json / .claude/settings.json. */
  slotPath: string;
  mcpJson: string;
  settingsJson: string;
}

export interface ReviewDoneOptions {
  /**
   * When set, the gate also requires a review posted by the current gh user at or after this
   * epoch ms (safety net for argus --post). Null keeps the plain PR-existence check.
   */
  requirePostedSince: number | null;
}

export interface SystemAdapter {
  readonly dryRun: boolean;

  // ---- First-boot setup (gated behind KANBAN_SETUP=1) ----
  seedTrustForSlots(slotPaths: string[]): Promise<void>;
  excludeAgentFilesInRepo(repoPath: string): Promise<void>;

  // ---- git worktree lifecycle ----
  worktreeRemove(repoPath: string, slotPath: string): Promise<void>;
  fetch(repoPath: string, baseBranch: string): Promise<void>;
  worktreeAdd(opts: GitWorktreeAddOptions): Promise<void>;
  deleteLocalBranch(repoPath: string, branch: string): Promise<void>;

  // ---- slot preparation ----
  prepareSlotFiles(files: PrepareSlotFiles): Promise<void>;
  copyEnvFiles(repoPath: string, slotPath: string): Promise<void>;
  installDeps(slotPath: string, timeoutMs: number): Promise<void>;

  // ---- tmux session ----
  spawnSession(opts: SpawnTmuxOptions): Promise<void>;
  killSession(sessionName: string): Promise<void>;
  hasSession(sessionName: string): Promise<boolean>;
  /** Last ~200 lines of the session's pane (read-only). Empty string if missing. */
  capturePane(sessionName: string): Promise<string>;

  // ---- done() gate verification ----
  verifyDone(slotPath: string, branch: string, prUrl: string): Promise<DoneGateResult>;
  /** Review done() gate: the reviewed PR still exists, plus the posted-review check when requested. */
  verifyReviewDone(slotPath: string, prUrl: string, opts: ReviewDoneOptions): Promise<DoneGateResult>;

  // ---- PR listing (review entry point) ----
  /** Open PRs of the project repo, as surfaced by `gh pr list`. Throws on CLI failure. */
  listOpenPrs(repoPath: string): Promise<OpenPr[]>;

  // ---- branch listing (base branch picker) ----
  /** Remote branch names of the project repo (`git ls-remote --heads origin`). Throws on CLI failure. */
  listBranches(repoPath: string): Promise<string[]>;

  // ---- auto-merge (opt-in per ticket) ----
  /** Mark the PR ready (no-op if already), merge it into its base branch, and delete its remote branch. */
  mergePr(slotPath: string, branch: string, prUrl: string): Promise<DoneGateResult>;

  // ---- notifications ----
  notify(title: string, body: string): Promise<void>;

  // ---- project test commands ----
  runProjectScript(slotPath: string, command: string, timeoutMs: number): Promise<{ ok: boolean; output: string }>;

  // ---- implementability triage (read-only, against the real repo) ----
  runTriage(opts: TriageOptions): Promise<{ ok: boolean; output: string }>;

  // ---- capability probe ----
  /** Whether the Cursor headless CLI (the Composer driver) is installed AND authenticated. */
  checkComposerAvailable(): Promise<boolean>;
}

export interface TriageOptions {
  repoPath: string;
  prompt: string;
  timeoutMs: number;
  /** Called with each human-readable progress line as the analysis streams. */
  onLine?: (line: string) => void;
}
