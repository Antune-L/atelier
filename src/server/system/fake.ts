import { createLogger } from "../logger.ts";

import type {
  DoneGateResult,
  GitWorktreeAddOptions,
  PrepareSlotFiles,
  SpawnTmuxOptions,
  SystemAdapter,
  TriageOptions,
} from "./types.ts";

const dryRunLog = createLogger("dry-run");

const FAKE_SETTLE_MS = 50;
const FAKE_TRIAGE_STEP_MS = 400;
const TRIAGE_VERDICT_CYCLE = 3;

/** Simulated read-only analysis steps streamed to the live triage view in dry-run. */
const FAKE_TRIAGE_STEPS = [
  "Lecture de la structure du dépôt…",
  "● Glob(**/*.ts)",
  "● Read(src/server/routes.ts)",
  '● Grep("createTicket")',
  "Analyse de cohérence avec le ticket…",
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
  private triageCounter = 0;

  private log(action: string, detail: Record<string, unknown> = {}): void {
    dryRunLog.debug(action, detail);
  }

  async seedTrustForSlots(slotPaths: string[]): Promise<void> {
    this.log("seedTrustForSlots", { slotPaths });
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

  async verifyDone(slotPath: string, branch: string, prUrl: string): Promise<DoneGateResult> {
    this.log("verifyDone", { slotPath, branch, prUrl });
    return { ok: true, reason: "" };
  }

  async notify(title: string, body: string): Promise<void> {
    this.log("notify", { title, body });
  }

  async runProjectScript(slotPath: string, command: string, timeoutMs: number): Promise<{ ok: boolean; output: string }> {
    this.log("runProjectScript", { slotPath, command, timeoutMs });
    return { ok: true, output: "[dry-run] skipped" };
  }

  async runTriage(opts: TriageOptions): Promise<{ ok: boolean; output: string }> {
    this.log("runTriage", { repoPath: opts.repoPath, promptBytes: opts.prompt.length });
    for (const step of FAKE_TRIAGE_STEPS) {
      await delay(FAKE_TRIAGE_STEP_MS);
      opts.onLine?.(step);
    }
    this.triageCounter += 1;
    return { ok: true, output: fakeTriageVerdict(this.triageCounter % TRIAGE_VERDICT_CYCLE) };
  }
}

/** Deterministic-ish triage payload cycling through the three verdicts for demo. */
function fakeTriageVerdict(bucket: number): string {
  if (bucket === 0) {
    return JSON.stringify({
      verdict: "implementable",
      summary: "Le ticket est clair et cohérent avec le code existant. Aucun blocage identifié.",
      reasons: [],
      questions: [],
      files: ["src/server/routes.ts", "src/shared/schemas.ts"],
    });
  }
  if (bucket === 1) {
    return JSON.stringify({
      verdict: "needs_info",
      summary: "Le périmètre est plausible mais deux décisions manquent pour démarrer sans deviner.",
      reasons: [],
      questions: [
        "Quel libellé exact afficher pour le badge de faisabilité ?",
        "Faut-il notifier l'utilisateur à la fin du triage ?",
      ],
      files: ["src/web/src/components/TicketDetail.tsx"],
    });
  }
  return JSON.stringify({
    verdict: "needs_rework",
    summary: "Le ticket contredit le modèle de données actuel et ne peut être implémenté tel quel.",
    reasons: [
      "La colonne demandée n'existe pas dans le schéma (src/server/db/schema.ts).",
      "Le flux décrit suppose un endpoint absent de src/server/routes.ts.",
    ],
    questions: [],
    files: ["src/server/db/schema.ts", "src/server/routes.ts"],
  });
}
