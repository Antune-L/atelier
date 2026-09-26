import { homedir } from "node:os";
import { basename, join } from "node:path";

import type { OpenPr, RepoInspection, SkillStatus, VcsConnectionResult } from "../../shared/schemas.ts";
import { SKILL_REQUIREMENTS } from "../../shared/skills.ts";
import type { CodexRuntimeStatus } from "../../shared/codexCapabilities.ts";
import { CODEX_MODELS, CODEX_EFFORTS, ORCHESTRATORS } from "../../shared/constants.ts";
import type { Orchestrator, PrState, VcsProvider } from "../../shared/constants.ts";
import { createLogger } from "../logger.ts";

import type { AgentSessionHandle, AgentSessionOptions } from "./agentSession.ts";
import { FALLBACK_BASE_BRANCH, formatProjectLabel } from "./repoInspection.ts";
import type {
  DoneGateResult,
  GitWorktreeAddOptions,
  ImplementationLotOptions,
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
import { FakeVcsClient } from "./vcs/fake.ts";
import type { VcsClient } from "./vcs/types.ts";

const dryRunLog = createLogger("dry-run");
const FAKE_SESSION_TEXT = "Session simulée (dry-run) : aucun agent réel n'est lancé dans le bac à sable.";
const FAKE_CONVERSATION_REPLY =
  "Réponse simulée (dry-run) : aucun agent réel n'est lancé dans le bac à sable. Active le mode réel (KANBAN_DRY_RUN=0) pour converser avec Claude ou Codex.";

const FAKE_SETTLE_MS = 50;

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

export class FakeSystemAdapter implements SystemAdapter {
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

  async excludeAgentFilesInRepo(repoPath: string): Promise<void> {
    this.log("excludeAgentFilesInRepo", { repoPath });
  }

  async worktreeRemove(repoPath: string, slotPath: string): Promise<void> {
    this.log("worktreeRemove", { repoPath, slotPath });
  }

  async prepareImplementationLot(opts: ImplementationLotOptions): Promise<{ cwd: string }> {
    this.log("prepareImplementationLot", { ...opts });
    return { cwd: opts.slotPath };
  }

  async finishImplementationLot(opts: ImplementationLotOptions): Promise<void> {
    this.log("finishImplementationLot", { ...opts });
  }

  cancelImplementationLot(opts: ImplementationLotOptions): void {
    this.log("cancelImplementationLot", { ...opts });
  }

  async discardImplementationLot(opts: ImplementationLotOptions): Promise<void> {
    this.log("discardImplementationLot", { ...opts });
  }

  async fetch(repoPath: string, baseBranch: string): Promise<void> {
    this.log("fetch", { repoPath, baseBranch });
    await delay(FAKE_SETTLE_MS);
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

  startAgentSession(opts: AgentSessionOptions): AgentSessionHandle {
    this.log("startAgentSession", { ticketId: opts.ticketId, slotId: opts.slotId, model: opts.model, provider: opts.provider });
    // Synthetic: no real claude is spawned. Emit `init` then a couple of display-only events on the
    // next ticks so the caller can wire its handle and the live transcript viewer has something to
    // show in dry-run. No `turn_end` is emitted — that would drive the real nudge/stall lifecycle.
    // NOTE(ali): an Atelier conversation idles between turns, so its synthetic session answers each message and ends the turn.
    const conversational = opts.role === "atelier";
    const sessionId = `dry-${opts.ticketId}`;
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
            opts.onEvent({ type: "turn_end", ok: true, subtype: "success", sessionId, usageByModel: {} });
          }, 0);
        }
        return messageId;
      },
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

  async prepareReviewWorktree(opts: PrepareReviewWorktreeOptions): Promise<ReviewHeadResult> {
    this.log("prepareReviewWorktree", { ...opts });
    return this.vcs(opts.provider).readPrHead(opts.slotPath, opts.prUrl);
  }

  async readReviewHead(slotPath: string, prUrl: string, provider: VcsProvider): Promise<ReviewHeadResult> {
    this.log("readReviewHead", { slotPath, prUrl });
    return this.vcs(provider).readPrHead(slotPath, prUrl);
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
    opts: { draft: boolean },
    provider: VcsProvider,
  ): Promise<{ ok: boolean; url: string; reason: string }> {
    this.log("createPr", { slotPath, baseBranch, draft: opts.draft });
    return this.vcs(provider).createPr(slotPath, baseBranch, opts);
  }

  async fetchPrSummary(slotPath: string, prUrl: string, provider: VcsProvider): Promise<string | null> {
    this.log("fetchPrSummary", { slotPath, prUrl });
    return this.vcs(provider).fetchPrSummary(slotPath, prUrl);
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

  async inspectRepo(repoPath: string, knownGroups: string[]): Promise<Omit<RepoInspection, "existingProjectKey">> {
    this.log("inspectRepo", { repoPath, knownGroups });
    const label = formatProjectLabel(basename(repoPath));
    return {
      repoPath,
      isGitRepo: true,
      label: label ? { value: label, source: "folderName" } : null,
      group: null,
      baseBranch: { value: FALLBACK_BASE_BRANCH, source: "remoteHead" },
      vcsProvider: { value: "github", source: "remoteUrl" },
      runScript: null,
    };
  }

  async listBranches(repoPath: string): Promise<string[]> {
    this.log("listBranches", { repoPath });
    return ["main", "develop", "staging"];
  }

  async mergePr(slotPath: string, branch: string, prUrl: string, provider: VcsProvider): Promise<DoneGateResult> {
    this.log("mergePr", { slotPath, branch, prUrl });
    return this.vcs(provider).mergePr(slotPath, prUrl);
  }

  async checkPrMerged(repoPath: string, prUrl: string, provider: VcsProvider): Promise<{ merged: boolean; state: PrState }> {
    this.log("checkPrMerged", { repoPath, prUrl });
    const state = await this.vcs(provider).readPrState(repoPath, prUrl);
    return { merged: state === "merged", state };
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
