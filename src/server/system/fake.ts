import type { OpenPr } from "../../shared/schemas.ts";
import { createLogger } from "../logger.ts";

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

const dryRunLog = createLogger("dry-run");

const FAKE_SETTLE_MS = 50;

/** Sample open PRs surfaced by the review picker in dry-run (one clearly "needs attention"). */
const FAKE_OPEN_PRS: OpenPr[] = [
  {
    number: 142,
    title: "feat: panier multi-devises",
    url: "https://github.com/acme/repo/pull/142",
    headBranch: "feat/panier-devises",
    isDraft: false,
    reviewDecision: "REVIEW_REQUIRED",
    updatedAt: "2026-06-12T09:30:00Z",
    author: "alice",
    additions: 320,
    deletions: 45,
  },
  {
    number: 137,
    title: "fix: race condition au checkout",
    url: "https://github.com/acme/repo/pull/137",
    headBranch: "fix/checkout-race",
    isDraft: false,
    reviewDecision: "",
    updatedAt: "2026-06-11T14:05:00Z",
    author: "bob",
    additions: 28,
    deletions: 12,
  },
  {
    number: 130,
    title: "chore: bump des dépendances",
    url: "https://github.com/acme/repo/pull/130",
    headBranch: "chore/bump-deps",
    isDraft: true,
    reviewDecision: "APPROVED",
    updatedAt: "2026-06-09T08:00:00Z",
    author: "carol",
    additions: 980,
    deletions: 970,
  },
];

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Dry-run adapter: logs intent, performs zero external side effects.
 * Used by default in dev/test. The done() gate always passes so the pipeline
 * can be exercised end-to-end. tmux sessions are tracked in memory.
 */
export class FakeSystemAdapter implements SystemAdapter {
  readonly dryRun = true;
  private readonly liveSessions = new Set<string>();
  private readonly captureCounters = new Map<string, number>();
  private readonly paneStreams = new Map<string, FakePaneStream>();

  private log(action: string, detail: Record<string, unknown> = {}): void {
    dryRunLog.debug(action, detail);
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

  async fetch(repoPath: string, baseBranch: string): Promise<void> {
    this.log("fetch", { repoPath, baseBranch });
    await delay(FAKE_SETTLE_MS);
  }

  async worktreeAdd(opts: GitWorktreeAddOptions): Promise<void> {
    this.log("worktreeAdd", { ...opts });
    await delay(FAKE_SETTLE_MS);
  }

  async worktreeAddExisting(repoPath: string, slotPath: string, branch: string): Promise<void> {
    this.log("worktreeAddExisting", { repoPath, slotPath, branch });
    await delay(FAKE_SETTLE_MS);
  }

  async deleteLocalBranch(repoPath: string, branch: string): Promise<void> {
    this.log("deleteLocalBranch", { repoPath, branch });
  }

  async prepareSlotFiles(files: PrepareSlotFiles): Promise<void> {
    this.log("prepareSlotFiles", { slotPath: files.slotPath, mcpBytes: files.mcpJson.length });
  }

  async copyEnvFiles(repoPath: string, slotPath: string): Promise<void> {
    this.log("copyEnvFiles", { repoPath, slotPath });
  }

  async installDeps(slotPath: string, timeoutMs: number): Promise<void> {
    this.log("installDeps", { slotPath, timeoutMs });
    await delay(FAKE_SETTLE_MS);
  }

  async spawnSession(opts: SpawnTmuxOptions): Promise<void> {
    this.log("spawnSession", { sessionName: opts.sessionName, cwd: opts.cwd, model: opts.model, effort: opts.effort });
    this.liveSessions.add(opts.sessionName);
  }

  async spawnTriageSession(opts: SpawnTriageOptions): Promise<void> {
    // Never reached in practice: the dry-run TriageManager short-circuits to a stub verdict
    // instead of spawning. Tracked anyway so the terminal viewer stays consistent if it ever is.
    this.log("spawnTriageSession", { sessionName: opts.sessionName, cwd: opts.cwd, model: opts.model, effort: opts.effort });
    this.liveSessions.add(opts.sessionName);
  }

  async killSession(sessionName: string): Promise<void> {
    this.log("killSession", { sessionName });
    this.liveSessions.delete(sessionName);
  }

  async hasSession(sessionName: string): Promise<boolean> {
    return this.liveSessions.has(sessionName);
  }

  async capturePane(sessionName: string): Promise<string> {
    if (!this.liveSessions.has(sessionName)) return "";
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

  async capturePaneAnsi(sessionName: string): Promise<string> {
    return this.capturePane(sessionName);
  }

  async openPaneStream(sessionName: string): Promise<PaneStream> {
    this.log("openPaneStream", { sessionName });
    const stream = new FakePaneStream(() => this.paneStreams.delete(sessionName));
    this.paneStreams.set(sessionName, stream);
    stream.push(`\r\n[dry-run] flux terminal interactif pour ${sessionName}\r\n`);
    return stream;
  }

  async sendKeysRaw(sessionName: string, hexBytes: string): Promise<void> {
    this.log("sendKeysRaw", { sessionName, hexBytes });
    // Co-control echo: surface the injected bytes back so the viewer sees its own input.
    const stream = this.paneStreams.get(sessionName);
    if (stream) stream.push(hexToBytes(hexBytes));
  }

  async resizePane(sessionName: string, cols: number, rows: number): Promise<void> {
    this.log("resizePane", { sessionName, cols, rows });
  }

  async verifyDone(slotPath: string, branch: string, prUrl: string): Promise<DoneGateResult> {
    this.log("verifyDone", { slotPath, branch, prUrl });
    return { ok: true, reason: "" };
  }

  async verifyReviewDone(slotPath: string, prUrl: string, opts: ReviewDoneOptions): Promise<DoneGateResult> {
    this.log("verifyReviewDone", { slotPath, prUrl, requirePostedSince: opts.requirePostedSince });
    return { ok: true, reason: "" };
  }

  async listOpenPrs(repoPath: string): Promise<OpenPr[]> {
    this.log("listOpenPrs", { repoPath });
    return FAKE_OPEN_PRS;
  }

  async listBranches(repoPath: string): Promise<string[]> {
    this.log("listBranches", { repoPath });
    return ["main", "develop", "staging"];
  }

  async mergePr(slotPath: string, branch: string, prUrl: string): Promise<DoneGateResult> {
    this.log("mergePr", { slotPath, branch, prUrl });
    return { ok: true, reason: "" };
  }

  async runProjectScript(slotPath: string, command: string, timeoutMs: number): Promise<{ ok: boolean; output: string }> {
    this.log("runProjectScript", { slotPath, command, timeoutMs });
    return { ok: true, output: "[dry-run] skipped" };
  }

  async checkComposerAvailable(): Promise<boolean> {
    // Mirrors the "pipeline exerciseable end-to-end in dry-run" stance (like verifyDone): report available.
    return true;
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
