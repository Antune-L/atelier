import { homedir } from "node:os";
import { basename, join } from "node:path";

import type { OpenPr, RepoInspection, SkillStatus, VcsConnectionResult } from "../../shared/schemas.ts";
import { SKILL_REQUIREMENTS } from "../../shared/skills.ts";
import type { CodexRuntimeStatus } from "../../shared/codexCapabilities.ts";
import type { PreviewReadiness, PreviewRecord } from "../../shared/preview.ts";
import type { ProviderQuota } from "../../shared/providerQuota.ts";
import { CLAUDE_LOGIN_TIMEOUT_MS, isClaudeLoginActive } from "../../shared/claudeLogin.ts";
import type { ClaudeLoginStatus } from "../../shared/claudeLogin.ts";
import type { HistoryUsageEntry } from "../../shared/providerUsage.ts";
import type { CloneResult, GithubRepoSummary } from "../../shared/github.ts";
import { CODEX_MODELS, CODEX_EFFORTS, ORCHESTRATORS } from "../../shared/constants.ts";
import type { Orchestrator, PrMergeability, VcsProvider } from "../../shared/constants.ts";
import { createLogger } from "../logger.ts";

import type { AgentSessionHandle, AgentSessionOptions } from "./agentSession.ts";
import type { AuditRange, AuditRangeInput } from "./auditRange.ts";
import { assertOperationActive } from "./boundedCommand.ts";
import { createFakeCoolifyTransport } from "./coolifyClient.ts";
import { FakeGithubAccountRegistry } from "./github/accounts.ts";
import type { GithubAccountRegistry } from "./github/accounts.ts";
import { plannedClonePath } from "./github/clone.ts";
import { FALLBACK_BASE_BRANCH, formatProjectLabel, rankBranchCandidates, suggestGithubAccount } from "./repoInspection.ts";
import type { RepoInspectionContext } from "./repoInspection.ts";
import type {
  CodeSnapshot,
  AutonomousWorkspace,
  AutonomousWorkspaceOptions,
  DoneGateResult,
  CreatePrOptions,
  PrMutationOptions,
  MergePrExpectation,
  GitWorktreeAddOptions,
  ImplementationLotOptions,
  ImplementationRecoveryArchive,
  ImplementationRecoveryOptions,
  RecoveryCandidateOptions,
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
  UpdateDependencyBaseOptions,
  UpdateDependencyBaseResult,
  WorktreeSetupOptions,
  OperationDeadlineOptions,
  ValidationCommandOptions,
  ValidationCommandResult,
  ValidationDependencyResult,
  ValidationRevision,
  ValidationRevisionOptions,
  ValidationServiceHandle,
  ValidationWorkspaceOptions,
} from "./types.ts";
import { FAKE_PR_BODY, FakeVcsClient } from "./vcs/fake.ts";
import type { PrSnapshot, ReviewRequestSnapshot, VcsClient } from "./vcs/types.ts";

const HOUR_MS = 3_600_000;
const DAY_MS = 24 * HOUR_MS;
const FAKE_CLAUDE_LOGIN_URL = "https://claude.ai/oauth/authorize?simulation=1";

const dryRunLog = createLogger("dry-run");
/** Fixed repository list served by the dry-run « Depuis GitHub » mode. */
const FAKE_GITHUB_REPOS = ["Antune-L/atelier", "acme-org/api", "acme-org/web"];
const FAKE_GITHUB_OWNER = "Antune-L";
const FAKE_REMOTE_BRANCHES = ["main", "develop", "staging"];
const FAKE_VALIDATION_START_COMMAND = "bun run dev --port $PORT --host 127.0.0.1 --strictPort";
const FAKE_SESSION_TEXT = "Session simulée (dry-run) : aucun agent réel n'est lancé dans le bac à sable.";
const FAKE_CONTEXT_WINDOW = 200_000;
const FAKE_CONTEXT_BASE_TOKENS = 12_000;
const FAKE_COMPACTED_TOKENS = 4_000;
const FAKE_CONVERSATION_REPLY =
  "Réponse simulée (dry-run) : aucun agent réel n'est lancé dans le bac à sable. Active le mode réel (KANBAN_DRY_RUN=0) pour converser avec Claude ou Codex.";

const FAKE_SETTLE_MS = 50;

function implementationLotKey(opts: ImplementationLotOptions): string {
  return JSON.stringify([opts.ticketId, opts.cycleId, opts.slotPath, opts.label]);
}

/** ASCII carriage return — marks an Enter keystroke in the dry-run shell echo. */
const CARRIAGE_RETURN = 0x0d;

/** Synthetic zsh-style prompt seeded by the dry-run shell stream (basename of cwd). */
function fakeShellPrompt(cwd: string): string {
  const segments = cwd.split("/").filter((s) => s.length > 0);
  const repo = segments[segments.length - 1] ?? cwd;
  return `\x1b[36m➜\x1b[0m \x1b[1m${repo}\x1b[0m `;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Dry-run adapter: logs intent, performs zero external side effects.
 * Used by default in dev/test. The done() gate always passes so the pipeline
 * can be exercised end-to-end. tmux sessions are tracked in memory.
 */
const FAKE_MISSING_SKILLS_ENV = "KANBAN_FAKE_MISSING_SKILLS";
const FAKE_MISSING_PROVIDER_SEPARATOR = ":";
const CODEX_HOME_ENV = "CODEX_HOME";
const SKILLS_DIR_NAME = "skills";

function fakeMissingKey(name: string, provider: Orchestrator): string {
  return `${name}${FAKE_MISSING_PROVIDER_SEPARATOR}${provider}`;
}

const FAKE_GIT_COMMIT_SHA = "0123456789abcdef0123456789abcdef01234567";
const FAKE_AUDIT_BASE_SHA = "fedcba9876543210fedcba9876543210fedcba98";
const FAKE_AUDIT_FILE = "src/example.ts";
const FAKE_AUDIT_DIFF = `diff --git a/${FAKE_AUDIT_FILE} b/${FAKE_AUDIT_FILE}\n--- a/${FAKE_AUDIT_FILE}\n+++ b/${FAKE_AUDIT_FILE}\n@@ -1 +1 @@\n-export const example = 1;\n+export const example = 2;\n`;

export class FakeSystemAdapter implements SystemAdapter {
  readonly coolifyRequest = createFakeCoolifyTransport();
  async readPreviewRepository(_repoPath: string) {
    return { repository: "example/preview-demo", host: "github.com", visibility: "public" } satisfies { repository: string; host: string; visibility: "public" | "private" };
  }
  async readPreviewBranchSource(repoPath: string, branch: string, recipePath: string) {
    const source = await this.readPreviewSource(repoPath, "https://github.com/example/preview-demo/pull/1", recipePath);
    return { ...source, branch };
  }
  async inspectPreviewReadiness(repoPath: string, branch: string, recipePath: string) {
    const source = await this.readPreviewBranchSource(repoPath, branch, recipePath);
    return { status: "ready", branch, revision: source.revision, diagnostics: [], preparationTicketId: null, preparationRetryAvailable: false } satisfies PreviewReadiness;
  }
  async readPreviewSource(_repoPath: string, prUrl: string, _recipePath: string) {
    const url = new URL(prUrl);
    return { revision: "0123456789012345678901234567890123456789", branch: "preview-demo", repository: url.pathname.split("/").slice(1, 3).join("/"), host: url.hostname, visibility: "public", recipe: { version: 1, buildPack: "dockerfile", dockerfile: "Dockerfile", buildContext: ".", port: 3000, healthPath: "/", environment: {} } } satisfies { revision: string; branch: string; repository: string; host: string; visibility: "public" | "private"; recipe: unknown };
  }
  async confirmPreviewCleanup(_preview: PreviewRecord) {
    return { complete: true, reason: null };
  }
  async probePreviewHealth(_url: string, _healthPath: string, _auth: { username: string; password: string }) {
    return true;
  }
  async probePreviewWebSocket(_url: string, _path: string, _auth: { username: string; password: string }) {
    return true;
  }
  private readonly implementationLots = new Map<string, { slotPath: string; files: string[]; integrated: boolean }>();
  readonly dryRun = true;
  /** One fake client for every provider: dry-run never talks to a real PR host. */
  private readonly vcsClient = new FakeVcsClient();
  private readonly liveSessions = new Set<string>();
  private readonly captureCounters = new Map<string, number>();
  private readonly paneStreams = new Map<string, FakePaneStream>();
  /** cwd of each synthetic shell session, used to seed a believable zsh banner/prompt in dry-run. */
  private readonly shellSessions = new Map<string, string>();

  private log(action: string, detail: Record<string, unknown> = {}): void {
    dryRunLog.debug(action, detail);
  }

  private vcs(_provider: VcsProvider): VcsClient {
    return this.vcsClient;
  }

  async seedWorkspaceTrust(paths: string[]): Promise<void> {
    this.log("seedWorkspaceTrust", { paths });
  }

  async worktreeRemove(repoPath: string, slotPath: string): Promise<void> {
    this.log("worktreeRemove", { repoPath, slotPath });
    for (const [key, lot] of this.implementationLots) {
      if (lot.slotPath === slotPath) this.implementationLots.delete(key);
    }
  }

  async prepareImplementationLot(opts: ImplementationLotOptions): Promise<{ cwd: string; integrated?: boolean }> {
    this.log("prepareImplementationLot", { ...opts });
    const key = implementationLotKey(opts);
    const lot = this.implementationLots.get(key);
    if (opts.recoveryOnly) {
      if (!lot || JSON.stringify([...lot.files].sort()) !== JSON.stringify([...opts.files].sort())) {
        throw new Error("Simulated retained implementation journal is missing or incompatible.");
      }
      return { cwd: opts.slotPath, integrated: lot.integrated };
    }
    this.implementationLots.set(key, { slotPath: opts.slotPath, files: [...opts.files], integrated: false });
    return { cwd: opts.slotPath };
  }

  async finishImplementationLot(opts: ImplementationLotOptions): Promise<void> {
    this.log("finishImplementationLot", { ...opts });
    const lot = this.implementationLots.get(implementationLotKey(opts));
    if (lot) lot.integrated = true;
  }

  async listAutonomousWorkspaces(opts: AutonomousWorkspaceOptions): Promise<AutonomousWorkspace[]> {
    this.log("listAutonomousWorkspaces", { ...opts, simulated: true });
    return [];
  }

  async preserveImplementationRecovery(opts: ImplementationRecoveryOptions): Promise<ImplementationRecoveryArchive[]> {
    this.log("preserveImplementationRecovery", { ...opts, simulated: true });
    return [];
  }

  cancelImplementationLot(opts: ImplementationLotOptions): void {
    this.log("cancelImplementationLot", { ...opts });
  }

  async discardImplementationLot(opts: ImplementationLotOptions): Promise<void> {
    this.log("discardImplementationLot", { ...opts });
    this.implementationLots.delete(implementationLotKey(opts));
  }

  async captureValidationRevision(opts: ValidationRevisionOptions): Promise<ValidationRevision> {
    assertOperationActive(opts);
    this.log("captureValidationRevision", { ...opts });
    return { commitSha: "simulated-revision", fingerprint: "simulated-revision", clean: true };
  }

  async prepareValidationWorkspace(opts: ValidationWorkspaceOptions): Promise<{ cwd: string; dataDirectory: string; port: number; databaseNamespace: string }> {
    assertOperationActive(opts);
    this.log("prepareValidationWorkspace", { ...opts });
    return { cwd: join("/simulated-validation", opts.runId), dataDirectory: join("/simulated-validation", `${opts.runId}-data`), port: 52819, databaseNamespace: `simulated_${opts.runId}` };
  }

  async cleanupValidationWorkspace(opts: ValidationWorkspaceOptions): Promise<void> {
    assertOperationActive(opts);
    this.log("cleanupValidationWorkspace", { ...opts });
  }

  async runValidationCommand(opts: ValidationCommandOptions): Promise<ValidationCommandResult> {
    assertOperationActive(opts);
    this.log("runValidationCommand", { cwd: opts.cwd, command: opts.command });
    return { exitCode: 0, timedOut: false, cancelled: opts.signal?.aborted === true, stdout: "Simulated command; no real check was executed.", stderr: "", durationMs: 0 };
  }

  async installValidationDeps(opts: Omit<ValidationCommandOptions, "command">): Promise<ValidationDependencyResult | null> {
    assertOperationActive(opts);
    this.log("installValidationDeps", { cwd: opts.cwd });
    const command = "bun install --frozen-lockfile";
    return { command, result: await this.runValidationCommand({ ...opts, command }) };
  }

  startValidationService(opts: ValidationCommandOptions): ValidationServiceHandle {
    assertOperationActive(opts);
    this.log("startValidationService", { cwd: opts.cwd, command: opts.command });
    const result = this.runValidationCommand(opts);
    return { result, output: () => "Simulated service; no real application was started.", stop: async () => { await result; } };
  }

  async fetch(repoPath: string, baseBranch: string, options: OperationDeadlineOptions = {}): Promise<void> {
    assertOperationActive(options);
    this.log("fetch", { repoPath, baseBranch });
    await delay(FAKE_SETTLE_MS);
    assertOperationActive(options);
  }

  async readGitRef(repoPath: string, ref: string, options: OperationDeadlineOptions = {}): Promise<string> {
    assertOperationActive(options);
    this.log("readGitRef", { repoPath, ref });
    return FAKE_GIT_COMMIT_SHA;
  }

  async updateDependencyBase(options: UpdateDependencyBaseOptions): Promise<UpdateDependencyBaseResult> {
    assertOperationActive(options);
    options.assertCurrent();
    const { repoPath, branch, baseBranch, forkSha } = options;
    this.log("updateDependencyBase", { repoPath, branch, baseBranch, forkSha });
    await delay(FAKE_SETTLE_MS);
    assertOperationActive(options);
    options.assertCurrent();
    return { ok: true, reason: "Base mise à jour. La PR reste ouverte.", forkSha: await this.readGitRef(repoPath, `origin/${baseBranch}`, options) };
  }

  async prepareAnalysisWorkspace(repoPath: string, path: string, baseBranch: string): Promise<void> {
    this.log("prepareAnalysisWorkspace", { repoPath, path, baseBranch });
  }

  async removeAnalysisWorkspace(repoPath: string, path: string): Promise<void> {
    this.log("removeAnalysisWorkspace", { repoPath, path });
  }

  async clearAnalysisWorkspaces(root: string, repoPaths: string[]): Promise<void> {
    this.log("clearAnalysisWorkspaces", { root, repoPaths });
  }

  async collectAuditRange(input: AuditRangeInput): Promise<AuditRange> {
    this.log("collectAuditRange", { cwd: input.cwd, baseSha: input.baseSha });
    const baseSha = input.baseSha ?? FAKE_AUDIT_BASE_SHA;
    return {
      status: "ok",
      baseSha,
      tipSha: FAKE_GIT_COMMIT_SHA,
      githubRepositoryUrl: null,
      chunks: [{
        index: 0,
        baseSha,
        headSha: FAKE_GIT_COMMIT_SHA,
        commits: [{ sha: FAKE_GIT_COMMIT_SHA, subject: "Simulated change (#1)", body: "", prNumber: 1 }],
        diff: FAKE_AUDIT_DIFF,
        files: [FAKE_AUDIT_FILE],
        skipped: [],
        part: null,
      }],
      deferredCommitCount: 0,
    };
  }

  async worktreeExists(slotPath: string): Promise<boolean> {
    this.log("worktreeExists", { slotPath });
    return true;
  }

  async findWorktreeByBranch(repoPath: string, branch: string): Promise<string | null> {
    this.log("findWorktreeByBranch", { repoPath, branch });
    return null;
  }

  async worktreeAdd(opts: GitWorktreeAddOptions): Promise<void> {
    this.log("worktreeAdd", { ...opts });
    await delay(FAKE_SETTLE_MS);
  }

  async worktreeAddExisting(repoPath: string, slotPath: string, localBranch: string, startBranch?: string): Promise<void> {
    this.log("worktreeAddExisting", { repoPath, slotPath, localBranch, startBranch: startBranch ?? localBranch });
    await delay(FAKE_SETTLE_MS);
  }

  async deleteLocalBranch(repoPath: string, branch: string): Promise<void> {
    this.log("deleteLocalBranch", { repoPath, branch });
  }

  async createBranchFromBase(repoPath: string, branch: string, baseBranch: string): Promise<void> {
    this.log("createBranchFromBase", { repoPath, branch, baseBranch });
    await delay(FAKE_SETTLE_MS);
  }

  async copyEnvFiles(repoPath: string, slotPath: string): Promise<void> {
    this.log("copyEnvFiles", { repoPath, slotPath });
  }

  async runWorktreeSetupScript(opts: WorktreeSetupOptions): Promise<void> {
    this.log("runWorktreeSetupScript", { repoPath: opts.repoPath, slotPath: opts.slotPath, script: opts.script });
    await delay(FAKE_SETTLE_MS);
  }

  async runWorktreeTeardownScript(opts: WorktreeSetupOptions): Promise<void> {
    this.log("runWorktreeTeardownScript", { repoPath: opts.repoPath, slotPath: opts.slotPath, script: opts.script });
  }

  async installDeps(slotPath: string, timeoutMs: number): Promise<void> {
    this.log("installDeps", { slotPath, timeoutMs });
    await delay(FAKE_SETTLE_MS);
  }

  async detectRunCommand(slotPath: string): Promise<string | null> {
    this.log("detectRunCommand", { slotPath });
    return null;
  }

  startAgentSession(opts: AgentSessionOptions): AgentSessionHandle {
    this.log("startAgentSession", { ticketId: opts.ticketId, slotId: opts.slotId, model: opts.model, provider: opts.provider });
    // Synthetic: no real claude is spawned. Emit `init` then a couple of display-only events on the
    // next ticks so the caller can wire its handle and the live transcript viewer has something to
    // show in dry-run. No `turn_end` is emitted — that would drive the real nudge/stall lifecycle.
    // NOTE(ali): an Atelier conversation idles between turns, so its synthetic session answers each message and ends the turn.
    const conversational = opts.role === "atelier";
    const sessionId = `dry-${opts.ticketId}`;
    // Simulated context occupancy: grows with each reply, shrinks on compaction.
    let contextTokens = 0;
    const reportContext = (): void => {
      if (opts.reportContextUsage) opts.onEvent({ type: "context_usage", usedTokens: contextTokens, maxTokens: FAKE_CONTEXT_WINDOW });
    };
    setTimeout(() => opts.onEvent({ type: "init", sessionId }), 0);
    if (!conversational) {
      setTimeout(() => opts.onEvent({ type: "assistant_text", text: FAKE_SESSION_TEXT }), 0);
    }
    return {
      ticketId: opts.ticketId,
      send: (content, messageId = crypto.randomUUID()) => {
        this.log("agentSession.send", { ticketId: opts.ticketId, bytes: content.length });
        opts.onEvent({ type: "message_status", messageId, status: "received", turnId: null });
        opts.onEvent({ type: "message_status", messageId, status: "accepted", turnId: null });
        if (conversational) {
          setTimeout(() => {
            opts.onEvent({ type: "assistant_text", text: FAKE_CONVERSATION_REPLY });
            contextTokens += FAKE_CONTEXT_BASE_TOKENS + content.length;
            reportContext();
            opts.onEvent({ type: "turn_end", ok: true, subtype: "success", sessionId, usageByModel: {} });
          }, 0);
        }
        return messageId;
      },
      ...(conversational ? {
        compact: async () => {
          this.log("agentSession.compact", { ticketId: opts.ticketId });
          setTimeout(() => {
            contextTokens = Math.min(contextTokens, FAKE_COMPACTED_TOKENS);
            reportContext();
            opts.onEvent({ type: "turn_end", ok: true, subtype: "success", sessionId, usageByModel: {} });
          }, 0);
        },
      } : {}),
      interrupt: async () => this.log("agentSession.interrupt", { ticketId: opts.ticketId }),
      close: async () => this.log("agentSession.close", { ticketId: opts.ticketId }),
    };
  }

  async reformulate(opts: ReformulateOptions): Promise<string> {
    this.log("reformulate", { cwd: opts.cwd, model: opts.model, effort: opts.effort, serviceTier: opts.serviceTier ?? "default", promptBytes: opts.prompt.length });
    return "# Besoin reformulé (simulé)\n\nReformulation simulée (dry-run).";
  }

  async importNotion(opts: ImportNotionOptions): Promise<string> {
    this.log("importNotion", { cwd: opts.cwd, model: opts.model, effort: opts.effort, serviceTier: opts.serviceTier ?? "default", promptBytes: opts.prompt.length });
    return "## Synthèse Notion (simulée)\n\nImport Notion simulé (dry-run).";
  }

  async runAutomation(opts: RunAutomationOptions): Promise<string> {
    this.log("runAutomation", { cwd: opts.cwd, model: opts.model, effort: opts.effort, promptBytes: opts.prompt.length });
    return "Exécution simulée (dry-run) de l'automatisation.";
  }

  async spawnShellSession(opts: SpawnShellOptions): Promise<void> {
    this.log("spawnShellSession", { sessionName: opts.sessionName, cwd: opts.cwd, initialCommand: opts.initialCommand });
    // Overwrite any existing live session of that name (mirrors real.ts reclaiming an orphan): a
    // name collision after a restart must not throw — the Set/Map writes below replace the zombie.
    this.liveSessions.add(opts.sessionName);
    this.shellSessions.set(opts.sessionName, opts.cwd);
  }

  async killSession(sessionName: string): Promise<void> {
    this.log("killSession", { sessionName });
    this.liveSessions.delete(sessionName);
    this.shellSessions.delete(sessionName);
  }

  async hasSession(sessionName: string): Promise<boolean> {
    return this.liveSessions.has(sessionName);
  }

  async capturePane(sessionName: string): Promise<string> {
    if (!this.liveSessions.has(sessionName)) return "";
    const shellCwd = this.shellSessions.get(sessionName);
    if (shellCwd !== undefined) return `[dry-run] zsh — ${shellCwd}\r\n${fakeShellPrompt(shellCwd)}`;
    const tick = (this.captureCounters.get(sessionName) ?? 0) + 1;
    this.captureCounters.set(sessionName, tick);
    const lines = [
      `[dry-run] tmux session ${sessionName} (capture #${tick})`,
      "",
      "● Lecture des fichiers du ticket…",
      `  ⎿  ${tick} fichier(s) analysé(s)`,
      "",
      "● Bash(bun run typecheck)",
      `  ⎿  tsc --noEmit … (${tick} passage)`,
      "",
      "● Implémentation en cours",
      `  ⎿  ${"▓".repeat(tick % 10)}${"░".repeat(10 - (tick % 10))} ${(tick * 7) % 100}%`,
      "",
      `claude> _`,
    ];
    return lines.join("\n");
  }

  async capturePaneAnsi(sessionName: string, _historyLines: number): Promise<string> {
    return this.capturePane(sessionName);
  }

  async paneSize(_sessionName: string): Promise<PaneSize | null> {
    // Dry-run has no real tmux pane and never reprints, so returning null keeps the plain capture seed.
    return null;
  }

  async openPaneStream(sessionName: string): Promise<PaneStream> {
    this.log("openPaneStream", { sessionName });
    const stream = new FakePaneStream(() => this.paneStreams.delete(sessionName));
    this.paneStreams.set(sessionName, stream);
    const cwd = this.shellSessions.get(sessionName);
    if (cwd !== undefined) {
      stream.push(`\r\n[dry-run] zsh — ${cwd}\r\n${fakeShellPrompt(cwd)}`);
    } else {
      stream.push(`\r\n[dry-run] flux terminal interactif pour ${sessionName}\r\n`);
    }
    return stream;
  }

  async sendKeysRaw(sessionName: string, hexBytes: string): Promise<void> {
    this.log("sendKeysRaw", { sessionName, hexBytes });
    const stream = this.paneStreams.get(sessionName);
    if (!stream) return;
    const bytes = hexToBytes(hexBytes);
    // Co-control echo: surface the injected bytes back so the viewer sees its own input.
    stream.push(bytes);
    // On a carriage return, re-emit a fresh shell prompt so the dry-run shell feels alive.
    const cwd = this.shellSessions.get(sessionName);
    if (cwd !== undefined && bytes.includes(CARRIAGE_RETURN)) {
      stream.push(`\r\n${fakeShellPrompt(cwd)}`);
    }
  }

  async resizePane(sessionName: string, cols: number, rows: number): Promise<void> {
    this.log("resizePane", { sessionName, cols, rows });
  }

  async verifyDone(slotPath: string, branch: string, prUrl: string, provider: VcsProvider): Promise<DoneGateResult> {
    this.log("verifyDone", { slotPath, branch, prUrl });
    return this.vcs(provider).verifyPrExists(slotPath, prUrl);
  }

  async verifyRecoveryCandidate(opts: RecoveryCandidateOptions, provider: VcsProvider): Promise<DoneGateResult> {
    this.log("verifyRecoveryCandidate", { ...opts, provider, simulated: true });
    return this.vcs(provider).verifyRecoveryCandidate(opts);
  }

  async verifyStealthReady(slotPath: string, branch: string): Promise<DoneGateResult> {
    this.log("verifyStealthReady", { slotPath, branch });
    return { ok: true, reason: "" };
  }

  async verifyDirectPushed(slotPath: string, baseBranch: string): Promise<DoneGateResult> {
    this.log("verifyDirectPushed", { slotPath, baseBranch });
    return { ok: true, reason: "" };
  }

  async codeFingerprint(slotPath: string): Promise<string> {
    this.log("codeFingerprint", { slotPath });
    return "dry-run-code-fingerprint";
  }

  async codeSnapshot(slotPath: string): Promise<CodeSnapshot> {
    return { fingerprint: await this.codeFingerprint(slotPath), fileHashes: {} };
  }

  async prepareReviewWorktree(opts: PrepareReviewWorktreeOptions): Promise<ReviewHeadResult> {
    this.log("prepareReviewWorktree", { ...opts });
    return this.vcs(opts.provider).readPrHead(opts.slotPath, opts.prUrl);
  }

  async readReviewHead(slotPath: string, prUrl: string, provider: VcsProvider): Promise<ReviewHeadResult> {
    this.log("readReviewHead", { slotPath, prUrl });
    return this.vcs(provider).readPrHead(slotPath, prUrl);
  }

  async readPullRequestHead(_repoPath: string, _prUrl: string, _provider: VcsProvider): Promise<ReviewHeadResult> {
    return { ok: true, reason: "", commitSha: "0123456789012345678901234567890123456789" };
  }

  async publishReview(
    slotPath: string,
    prUrl: string,
    opts: PublishReviewOptions,
    provider: VcsProvider,
  ): Promise<PublishReviewResult> {
    this.log("publishReview", { slotPath, prUrl, ...opts });
    return this.vcs(provider).publishReview(slotPath, prUrl, opts);
  }

  async createPr(
    slotPath: string,
    baseBranch: string,
    opts: CreatePrOptions,
    provider: VcsProvider,
  ): Promise<{ ok: boolean; url: string; reason: string }> {
    opts.assertCurrent?.();
    this.log("createPr", { slotPath, baseBranch, draft: opts.draft, requireExistingBase: opts.requireExistingBase });
    return this.vcs(provider).createPr(slotPath, baseBranch, opts);
  }

  async fetchPrSummary(slotPath: string, prUrl: string, provider: VcsProvider): Promise<string | null> {
    this.log("fetchPrSummary", { slotPath, prUrl });
    return this.vcs(provider).fetchPrSummary(slotPath, prUrl);
  }

  async readAutonomousBranchHead(slotPath: string, branch: string): Promise<ReviewHeadResult> {
    this.log("readAutonomousBranchHead", { slotPath, branch, simulated: true });
    return { ok: true, reason: "Mode simulation", commitSha: "simulated-revision" };
  }

  async verifyAutonomousWorkspace(slotPath: string, repoPath: string, branch: string): Promise<DoneGateResult> {
    this.log("verifyAutonomousWorkspace", { slotPath, repoPath, branch, simulated: true });
    return { ok: true, reason: "Mode simulation" };
  }

  async prepareAutonomousCandidate(slotPath: string, opts: PrMutationOptions): Promise<ReviewHeadResult> {
    opts.assertCurrent?.();
    this.log("prepareAutonomousCandidate", { slotPath, simulated: true });
    return { ok: true, reason: "Mode simulation", commitSha: "simulated-revision" };
  }

  async pushAutonomousCandidate(slotPath: string, branch: string, opts: PrMutationOptions): Promise<DoneGateResult> {
    opts.assertCurrent?.();
    this.log("pushAutonomousCandidate", { slotPath, branch, simulated: true });
    return { ok: true, reason: "Mode simulation" };
  }

  async readPrBody(slotPath: string, prUrl: string, provider: VcsProvider): Promise<string | null> {
    return this.vcs(provider).readPrBody(slotPath, prUrl);
  }

  async readWorktreePrBody(slotPath: string): Promise<string | null> {
    this.log("readWorktreePrBody", { slotPath });
    return FAKE_PR_BODY;
  }

  async convertPrToDraft(slotPath: string, prUrl: string, provider: VcsProvider, opts?: PrMutationOptions): Promise<DoneGateResult> {
    return this.vcs(provider).convertPrToDraft(slotPath, prUrl, opts);
  }

  async updatePrBody(slotPath: string, prUrl: string, transform: (body: string) => string, provider: VcsProvider, opts?: PrMutationOptions): Promise<DoneGateResult> {
    this.log("updatePrBody", { slotPath, prUrl });
    return this.vcs(provider).updatePrBody(slotPath, prUrl, transform, opts);
  }

  async verifyReviewDone(slotPath: string, prUrl: string, opts: ReviewDoneOptions): Promise<DoneGateResult> {
    this.log("verifyReviewDone", {
      slotPath,
      prUrl,
      requirePostedSince: opts.requirePostedSince,
      publicationMarker: opts.publicationMarker,
      expectedCommitSha: opts.expectedCommitSha,
      publishedReviewId: opts.publishedReviewId,
      expectedReviewState: opts.expectedReviewState,
      requirePushedBranch: opts.requirePushedBranch,
    });
    return { ok: true, reason: "" };
  }

  async listReviewRequests(repoPath: string, provider: VcsProvider): Promise<ReviewRequestSnapshot> {
    const snapshot = await this.vcs(provider).listReviewRequests(repoPath);
    return { ...snapshot, identityKey: `${provider}:${snapshot.identityKey}` };
  }

  async listOpenPrs(repoPath: string, provider: VcsProvider): Promise<OpenPr[]> {
    this.log("listOpenPrs", { repoPath });
    return this.vcs(provider).listOpenPrs(repoPath);
  }

  async listReviewCounts(projects: { repoPath: string; provider: VcsProvider }[]): Promise<Record<string, number | null>> {
    this.log("listReviewCounts", { projects: projects.length });
    return this.vcs("github").listReviewCounts(projects.map((project) => project.repoPath));
  }

  async testVcsConnection(repoPath: string, provider: VcsProvider): Promise<VcsConnectionResult> {
    this.log("testVcsConnection", { repoPath, provider });
    return this.vcs(provider).testConnection(repoPath, Date.now());
  }

  async inspectRepo(repoPath: string, context: RepoInspectionContext): Promise<Omit<RepoInspection, "existingProjectKey">> {
    this.log("inspectRepo", { repoPath, ...context });
    const label = formatProjectLabel(basename(repoPath));
    return {
      repoPath,
      isGitRepo: true,
      label: label ? { value: label, source: "folderName" } : null,
      group: null,
      baseBranch: { value: FALLBACK_BASE_BRANCH, source: "remoteHead" },
      currentBranch: FALLBACK_BASE_BRANCH,
      branchCandidates: rankBranchCandidates(FALLBACK_BASE_BRANCH, FALLBACK_BASE_BRANCH, FAKE_REMOTE_BRANCHES),
      vcsProvider: { value: "github", source: "remoteUrl" },
      validationStartCommand: { value: FAKE_VALIDATION_START_COMMAND, source: "viteScript" },
      githubAccount: suggestGithubAccount(FAKE_GITHUB_OWNER, context.githubLogins),
      composeFile: null,
    };
  }

  async listBranches(repoPath: string): Promise<string[]> {
    this.log("listBranches", { repoPath });
    return [...FAKE_REMOTE_BRANCHES];
  }

  private readonly fakeGithubAccounts = new FakeGithubAccountRegistry();

  githubAccounts(): GithubAccountRegistry {
    return this.fakeGithubAccounts;
  }

  async listGithubRepos(account: string | null): Promise<GithubRepoSummary[]> {
    this.log("listGithubRepos", { account });
    return FAKE_GITHUB_REPOS.map((fullName) => {
      const [owner = "", name = ""] = fullName.split("/");
      return { fullName, owner, name, private: owner !== "Antune-L", htmlUrl: `https://github.com/${fullName}` };
    });
  }

  async cloneGithubRepo(opts: { source: string; account: string | null }): Promise<CloneResult> {
    // Same validation as the real clone, but nothing is created: the planned path is returned as is.
    const planned = plannedClonePath(opts.source, opts.account);
    this.log("cloneGithubRepo", { ...opts, repoPath: planned.repoPath });
    return planned;
  }

  async checkGithubAvailable(): Promise<boolean> {
    return true;
  }

  async mergePr(slotPath: string, branch: string, prUrl: string, provider: VcsProvider, expected?: MergePrExpectation): Promise<DoneGateResult> {
    this.log("mergePr", { slotPath, branch, prUrl });
    expected?.assertCurrent?.();
    return this.vcs(provider).mergePr(slotPath, prUrl, expected);
  }

  async mergePrOnUserRequest(slotPath: string, branch: string, prUrl: string, provider: VcsProvider): Promise<DoneGateResult> {
    this.log("mergePrOnUserRequest", { slotPath, branch, prUrl });
    return this.vcs(provider).mergePr(slotPath, prUrl);
  }

  async readPr(repoPath: string, prUrl: string, provider: VcsProvider): Promise<PrSnapshot> {
    this.log("readPr", { repoPath, prUrl });
    return this.vcs(provider).readPr(repoPath, prUrl);
  }

  async readPrMergeability(repoPath: string, prUrl: string, provider: VcsProvider): Promise<PrMergeability> {
    this.log("readPrMergeability", { repoPath, prUrl });
    return this.vcs(provider).readPrMergeability(repoPath, prUrl);
  }

  async runProjectScript(slotPath: string, command: string, timeoutMs: number): Promise<{ ok: boolean; output: string }> {
    this.log("runProjectScript", { slotPath, command, timeoutMs });
    return { ok: true, output: "[dry-run] skipped" };
  }

  async checkComposerAvailable(): Promise<boolean> {
    // Mirrors the "pipeline exerciseable end-to-end in dry-run" stance (like verifyDone): report available.
    return true;
  }

  async checkClaudeAvailable(): Promise<boolean> {
    // Same dry-run stance as checkComposerAvailable: the pipeline stays exerciseable end-to-end.
    return true;
  }

  async checkSkills(): Promise<SkillStatus[]> {
    // NOTE: same dry-run stance as checkClaudeAvailable: every skill reported installed, unless
    // KANBAN_FAKE_MISSING_SKILLS simulates missing ones to exercise the UI. Comma-separated entries:
    // `name` (missing on every provider) or `name:claude` / `name:codex` (missing on that provider only).
    const missing = new Set(
      (process.env[FAKE_MISSING_SKILLS_ENV] ?? "").split(",").flatMap((rawEntry) => {
        const entry = rawEntry.trim();
        if (entry.includes(FAKE_MISSING_PROVIDER_SEPARATOR)) return [entry];
        return ORCHESTRATORS.map((provider) => fakeMissingKey(entry, provider));
      }),
    );
    const home = homedir();
    const codexHome = process.env[CODEX_HOME_ENV] || join(home, ".codex");
    const roots = {
      claude: [join(home, ".claude", SKILLS_DIR_NAME)],
      codex: [join(codexHome, SKILLS_DIR_NAME), join(home, ".agents", SKILLS_DIR_NAME)],
    };
    return SKILL_REQUIREMENTS.map((skill) => ({
      ...skill,
      roots,
      installed: {
        claude: !missing.has(fakeMissingKey(skill.name, "claude")),
        codex: !missing.has(fakeMissingKey(skill.name, "codex")),
      },
    }));
  }

  async checkCodexRuntime(): Promise<CodexRuntimeStatus> {
    return {
      status: "ready", checkedAt: Date.now(), message: "Mode simulation",
      models: CODEX_MODELS.map((model) => ({
        model,
        efforts: [...CODEX_EFFORTS],
        defaultEffort: "medium",
        serviceTiers: [{ id: "priority", name: "Fast", description: "Mode rapide" }],
        defaultServiceTier: null,
      })),
    };
  }

  async readClaudeUsage(): Promise<ProviderQuota> {
    const now = Date.now();
    return {
      provider: "claude", state: "ok", source: "live", observedAt: now, planType: "max", message: null,
      windows: [
        { id: "claude:five_hour", kind: "session", model: null, usedPercent: 42, windowDurationMins: 300, resetsAt: now + 2 * HOUR_MS },
        { id: "claude:seven_day", kind: "weekly", model: null, usedPercent: 63, windowDurationMins: 10_080, resetsAt: now + 3 * DAY_MS },
        { id: "claude:model:Fable", kind: "weekly_model", model: "Fable", usedPercent: 20, windowDurationMins: 10_080, resetsAt: now + 3 * DAY_MS },
      ],
    };
  }

  /** Fixed entries relative to now (like the fake quotas), never reads ~/.claude nor ~/.codex. */
  async readLocalUsageHistory(): Promise<HistoryUsageEntry[]> {
    const now = Date.now();
    const entry = (provider: Orchestrator, sessionId: string, ageMs: number, model: string, speed: string, tokens: HistoryUsageEntry["tokens"]): HistoryUsageEntry => ({
      provider, sessionId, timestamp: now - ageMs, model, speed, fast: speed !== "standard", tokens, dedupKey: null,
    });
    return [
      entry("claude", "fake-history-claude-1", 2 * HOUR_MS, "claude-opus-5-5", "standard", { input: 1_200, output: 3_400, cacheRead: 52_000, cacheCreate: 6_000 }),
      entry("claude", "fake-history-claude-1", 3 * DAY_MS, "claude-opus-5-5", "standard", { input: 800, output: 2_100, cacheRead: 30_000, cacheCreate: 4_000 }),
      entry("claude", "fake-history-claude-2", 5 * HOUR_MS, "claude-opus-5-5", "fast", { input: 400, output: 1_500, cacheRead: 12_000, cacheCreate: 2_000 }),
      entry("claude", "fake-history-claude-3", 20 * DAY_MS, "claude-experimental-x", "standard", { input: 600, output: 900, cacheRead: 5_000, cacheCreate: 1_000 }),
      entry("codex", "fake-history-codex-1", 4 * HOUR_MS, "gpt-6.1-sol", "standard", { input: 40_000, output: 2_500, cacheRead: 30_000, cacheCreate: 0 }),
      entry("codex", "fake-history-codex-2", 10 * DAY_MS, "gpt-6.1-sol", "priority", { input: 25_000, output: 1_800, cacheRead: 18_000, cacheCreate: 0 }),
      entry("codex", "fake-history-codex-3", 60 * DAY_MS, "gpt-6-luna", "standard", { input: 15_000, output: 900, cacheRead: 9_000, cacheCreate: 0 }),
    ];
  }

  /** In-memory login state machine: fake URL, any non-empty code succeeds; never spawns a process. */
  private fakeLogin: ClaudeLoginStatus = { state: "idle", url: null, expiresAt: null, message: null, oauthTokenEnvSet: false, restartRequired: false };

  startClaudeLogin(): ClaudeLoginStatus {
    if (isClaudeLoginActive(this.fakeLogin.state)) return this.claudeLoginStatus();
    this.fakeLogin = {
      ...this.fakeLogin, state: "awaiting_code", url: FAKE_CLAUDE_LOGIN_URL, expiresAt: Date.now() + CLAUDE_LOGIN_TIMEOUT_MS,
      message: "Ouvre le lien, autorise l'accès puis colle le code affiché", restartRequired: false,
    };
    return this.claudeLoginStatus();
  }

  submitClaudeLoginCode(code: string): ClaudeLoginStatus {
    if (this.fakeLogin.state !== "awaiting_code" || code.trim().length === 0) return this.claudeLoginStatus();
    this.fakeLogin = { ...this.fakeLogin, state: "success", url: null, expiresAt: null, message: "Claude est connecté (simulation)" };
    return this.claudeLoginStatus();
  }

  cancelClaudeLogin(): ClaudeLoginStatus {
    if (isClaudeLoginActive(this.fakeLogin.state)) {
      this.fakeLogin = { ...this.fakeLogin, state: "cancelled", url: null, expiresAt: null, message: "Connexion annulée" };
    }
    return this.claudeLoginStatus();
  }

  claudeLoginStatus(): ClaudeLoginStatus {
    return { ...this.fakeLogin };
  }

  async readCodexQuota(): Promise<ProviderQuota> {
    const now = Date.now();
    return {
      provider: "codex", state: "ok", source: "live", observedAt: now, planType: "pro", message: null,
      windows: [
        { id: "codex:primary", kind: "session", model: null, usedPercent: 35, windowDurationMins: 300, resetsAt: now + 90 * 60_000 },
        { id: "codex:secondary", kind: "weekly", model: null, usedPercent: 71, windowDurationMins: 10_080, resetsAt: now + 4 * DAY_MS },
      ],
    };
  }

  async gitCurrentBranch(): Promise<string> {
    return "main";
  }

  async gitStatusClean(): Promise<boolean> {
    return true;
  }

  async gitPullFastForward(repoPath: string, baseBranch: string): Promise<DoneGateResult> {
    this.log("gitPullFastForward", { repoPath, baseBranch });
    return { ok: true, reason: "" };
  }
}

/** Decode a hex byte string ("41 → 0x41…") to bytes; ignores any trailing odd nibble. */
function hexToBytes(hex: string): Uint8Array {
  const pairs = hex.match(/.{2}/g) ?? [];
  return Uint8Array.from(pairs, (pair) => Number.parseInt(pair, 16));
}

const fakeEncoder = new TextEncoder();

/**
 * Dry-run pane stream: a pushable async queue. `openPaneStream` seeds a banner and
 * `sendKeysRaw` echoes input back here, so the live terminal works end-to-end without tmux.
 */
class FakePaneStream implements PaneStream {
  private readonly queue: Uint8Array[] = [];
  private pending: ((result: IteratorResult<Uint8Array>) => void) | null = null;
  private closed = false;

  constructor(private readonly onClose: () => void) {}

  push(data: Uint8Array | string): void {
    if (this.closed) return;
    const bytes = typeof data === "string" ? fakeEncoder.encode(data) : data;
    if (this.pending) {
      const resolve = this.pending;
      this.pending = null;
      resolve({ value: bytes, done: false });
    } else {
      this.queue.push(bytes);
    }
  }

  get chunks(): AsyncIterable<Uint8Array> {
    return { [Symbol.asyncIterator]: () => this.iterator() };
  }

  private iterator(): AsyncIterator<Uint8Array> {
    return {
      next: (): Promise<IteratorResult<Uint8Array>> => {
        const buffered = this.queue.shift();
        if (buffered) return Promise.resolve({ value: buffered, done: false });
        if (this.closed) return Promise.resolve({ value: undefined, done: true });
        return new Promise((resolve) => {
          this.pending = resolve;
        });
      },
    };
  }

  async close(): Promise<void> {
    if (this.closed) return;
    this.closed = true;
    this.onClose();
    if (this.pending) {
      const resolve = this.pending;
      this.pending = null;
      resolve({ value: undefined, done: true });
    }
  }
}
