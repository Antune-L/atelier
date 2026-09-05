/**
 * DelegationManager — runs the delegated Codex implementation child sessions.
 *
 * When a ticket has a Codex implementer, the parent calls `delegate_implementation` and ends its
 * turn. This manager spawns a bare Codex session in the same slot worktree, feeds it the plan, then
 * pushes `implementation_done` back into the parent. It also owns the separate read-only sessions
 * used for the independent review dimensions required by each review depth.
 *
 * The child is attached to the parent ticket: its stream events heartbeat the ticket's
 * lastProgressAt (the parent is idle while waiting, so the watchdog would otherwise flag it), its
 * transcript lines are appended to the parent's live viewer, its token usage is summed into the
 * ticket's sessionUsage (keyed by the child thread id), and any parent-session teardown
 * (release/relaunch/shutdown) cascades into a kill via SessionHub's disconnect listener.
 */

import { nanoid } from "nanoid";

import { DELEGATION_SLOT_ID } from "../../shared/constants.ts";
import type { Ticket } from "../../shared/schemas.ts";
import { submitReviewArgsSchema } from "../../shared/schemas.ts";
import type { ReviewFinding, ReviewKind, WorkerToolName } from "../../shared/protocol.ts";

import type { Store } from "../db/store.ts";
import type { ClientHub } from "../hub.ts";
import { createLogger } from "../logger.ts";
import type { AgentSessionEvent, AgentSessionHandle, AgentTurnUsage } from "../system/agentSession.ts";
import type { SystemAdapter } from "../system/types.ts";

import { codexImplementerKnobs } from "./sessionConfig.ts";
import { assertExecutionAvailable, resolveTicketExecution } from "./executionConfig.ts";
import type { ResolvedExecution } from "./executionConfig.ts";
import { mergeAgentUsageByModel } from "./sessionHub.ts";
import type { SessionHub } from "./sessionHub.ts";
import { slotPath } from "./slotManager.ts";
import { addUsageByModel, toUsageByModel } from "./usage.ts";

const log = createLogger("delegation");

/** Min interval between two lastProgressAt refreshes driven by child stream events. */
const HEARTBEAT_MIN_INTERVAL_MS = 30_000;

/** Transcript prefix marking lines produced by the delegated child (vs the parent session). */
const CHILD_TRANSCRIPT_PREFIX = "⟨codex⟩ ";

const CHILD_FRAMING = `Tu es la session d'implémentation déléguée (Codex). Ton unique rôle est d'écrire le code décrit dans le plan ci-dessous, intégralement, dans le répertoire de travail courant (le worktree).

Consignes :
- Travaille uniquement dans le worktree courant. Ne touche à aucun fichier en dehors.
- Respecte les conventions de code du projet.
- Ne commit JAMAIS, ne push JAMAIS, n'ouvre JAMAIS de PR : la session orchestratrice garde la main sur git, la review, les tests et la PR.
- Termine en résumant ce que tu as implémenté et les fichiers touchés (ce résumé est transmis à l'orchestrateur).

## Plan à implémenter
`;

/**
 * codexProvider emits `turn.failed` as turn_end THEN the error detail (the pump catch path emits
 * them in the opposite order) — defer settlement one tick so the trailing error message is
 * captured into the failure summary either way.
 */
const SETTLE_DELAY_MS = 50;

interface ActiveDelegation {
  handle: AgentSessionHandle | null;
  generationId: string;
  usageByModel: Record<string, AgentTurnUsage>;
  sessionId: string | null;
  lastAssistantText: string;
  lastError: string;
  lastHeartbeatAt: number;
  settled: boolean;
}

interface ReviewResult {
  verdict: "approve" | "revise";
  summary: string;
  findings: ReviewFinding[];
}

interface ActiveReview {
  handle: AgentSessionHandle | null;
  ticketId: string;
  slotId: number;
  kind: ReviewKind;
  passId: string;
  generation: number;
  generationId: string;
  sessionId: string | null;
  result: ReviewResult | null;
  lastError: string;
  settled: boolean;
  usageByModel: Record<string, AgentTurnUsage>;
  phase: "review" | "verification";
  sourceResult: ReviewResult | null;
  verificationAttempt: number;
  ticket: Ticket;
  epoch: number;
  execution: ResolvedExecution;
}

interface ActiveReviewPass {
  passId: string;
  codeFingerprint: string;
  depth: "light" | "full";
  execution: ResolvedExecution;
}

interface ClosableExecution {
  handle: AgentSessionHandle | null;
  generationId: string;
  usageByModel: Record<string, AgentTurnUsage>;
}

const REVIEW_TOOLS = ["Read", "Glob", "Grep"];
const REVIEW_DISALLOWED_TOOLS = ["Bash", "Edit", "Write", "Task", "Agent"];

const LIGHT_REVIEW_KINDS: readonly ReviewKind[] = ["quality", "conventions", "regression", "logic"];
const FULL_REVIEW_KINDS: readonly ReviewKind[] = [...LIGHT_REVIEW_KINDS, "architecture", "security"];
const CHILD_CLOSE_TIMEOUT_MS = 65_000;

function requiredReviewKinds(depth: "light" | "full"): readonly ReviewKind[] {
  return depth === "full" ? FULL_REVIEW_KINDS : LIGHT_REVIEW_KINDS;
}

function reviewKey(ticketId: string, kind: ReviewKind): string {
  return `${ticketId}:${kind}`;
}

function reviewPrompt(ticket: Ticket, kind: ReviewKind, context: string): string {
  const missions: Record<ReviewKind, string> = {
    quality: "Évalue la qualité et la maintenabilité du changement, puis recherche les défauts actionnables.",
    conventions: "Vérifie les conventions du dépôt, ses instructions AGENTS.md et la cohérence avec les patterns existants.",
    regression: "Cartographie les consommateurs des symboles modifiés et recherche les régressions ou contrats cassés.",
    logic: "Vérifie la logique, les invariants, les transitions d'état et les cas limites du changement.",
    architecture: "Évalue les frontières, responsabilités et dépendances architecturales du changement.",
    security: "Recherche les failles de sécurité, escalades de permissions, fuites de secrets et mutations non autorisées.",
  };
  const depth = ticket.reviewDepth ?? "light";
  return `Tu es un reviewer indépendant à contexte frais, en LECTURE SEULE. Tu ne peux ni modifier le dépôt, ni committer, ni publier à distance.

${missions[kind]}
Profondeur demandée : ${depth}. Ta dimension attribuée est ${kind} ; rends un verdict autonome sur cette dimension.

## Contexte fourni par l'orchestrateur
${context}

Inspecte toi-même les fichiers et le diff dans le worktree. Appelle ensuite obligatoirement submit_review avec :
- verdict=approve uniquement si aucun finding actionnable ne reste ; sinon verdict=revise ;
- summary : conclusion concise et fondée ;
- findings : objets { id, severity, summary, evidence, ruleSource, path, line } ; severity reflète l'impact réel
  (critical = sécurité/perte de données/indisponibilité grave, major = comportement ou régression significative,
  minor = convention ou amélioration locale). Une interdiction textuelle n'est pas critical sans impact critique.

N'appelle aucun autre tool du pipeline.`;
}

function verificationPrompt(ticket: Ticket, kind: ReviewKind, result: ReviewResult): string {
  const candidates = result.findings.filter((finding) => finding.severity !== "minor");
  return `Tu contre-vérifies indépendamment des findings importants d'une review ${kind}, en LECTURE SEULE.
Tu ne peux ni modifier le dépôt, ni committer, ni publier à distance. Vérifie chaque affirmation dans le code,
le diff et les instructions applicables. Déduplique les doublons. Rejette les conclusions non prouvées et
dégrade leur sévérité lorsque l'impact annoncé ne correspond pas aux preuves.

Ticket : ${ticket.title}
Findings candidats : ${JSON.stringify(candidates)}

Appelle submit_review avec les seuls findings confirmés, au format structuré demandé. Utilise verdict=revise
s'il en reste, approve sinon. Dans summary, indique brièvement les rejets et dégradations. N'appelle aucun autre tool.`;
}

function dedupeFindings(findings: ReviewFinding[]): ReviewFinding[] {
  const seen = new Set<string>();
  return findings.filter((finding) => {
    const key = `${finding.path ?? ""}:${finding.line ?? ""}:${finding.summary.trim().toLowerCase()}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function verifiedFindings(source: ReviewResult, verification: ReviewResult): ReviewFinding[] {
  const submitted = new Map(verification.findings.map((finding) => [finding.id, finding]));
  return source.findings.map((finding) => {
    if (finding.severity === "minor") return { ...finding, verificationStatus: "not_needed" };
    const checked = submitted.get(finding.id);
    if (!checked) return { ...finding, verificationStatus: "rejected" };
    const demoted = checked.severity === "minor" || (finding.severity === "critical" && checked.severity === "major");
    return {
      ...finding,
      severity: demoted ? checked.severity : finding.severity,
      verificationStatus: demoted ? "demoted" : "confirmed",
      originalSeverity: demoted ? finding.severity : null,
    };
  });
}

export class DelegationManager {
  private readonly active = new Map<string, ActiveDelegation>();
  private readonly startingImplementations = new Set<string>();
  private readonly activeReviews = new Map<string, ActiveReview>();
  private readonly activeReviewPasses = new Map<string, ActiveReviewPass>();
  private readonly reviewStartQueues = new Map<string, Promise<unknown>>();
  private readonly reviewEpochs = new Map<string, number>();
  private readonly generations = new Map<string, number>();
  private readonly closingExecutions = new Set<Promise<void>>();

  constructor(
    private readonly store: Store,
    private readonly system: SystemAdapter,
    private readonly sessionHub: SessionHub,
    private readonly hub: ClientHub,
    private readonly closeTimeoutMs = CHILD_CLOSE_TIMEOUT_MS,
  ) {}

  /** True while a child implementation session runs for this ticket (parent is parked, not stalled). */
  isActive(ticketId: string): boolean {
    return this.active.has(ticketId) || [...this.activeReviews.values()].some((review) => review.ticketId === ticketId);
  }

  hasActiveReviews(ticketId: string): boolean {
    return [...this.activeReviews.values()].some((review) => review.ticketId === ticketId);
  }

  private async currentReviewPass(ticketId: string, slotId: number): Promise<ReturnType<Store["getReviewPass"]>> {
    const reviewPass = this.store.getReviewPass(ticketId);
    if (!reviewPass) return null;
    let fingerprint: string;
    try {
      fingerprint = await this.system.codeFingerprint(slotPath(slotId));
    } catch (error) {
      log.warn("empreinte du code illisible pendant la gate de review", {
        ticketId,
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
    if (reviewPass.codeFingerprint !== fingerprint) return null;
    return reviewPass;
  }

  async reviewsCompleted(ticketId: string, slotId: number): Promise<boolean> {
    const reviewPass = await this.currentReviewPass(ticketId, slotId);
    if (!reviewPass) return false;
    return requiredReviewKinds(reviewPass.reviewDepth).every((kind) => reviewPass.results[kind]?.status === "completed");
  }

  async reviewsApproved(ticketId: string, slotId: number): Promise<boolean> {
    const reviewPass = await this.currentReviewPass(ticketId, slotId);
    if (!reviewPass) return false;
    return requiredReviewKinds(reviewPass.reviewDepth).every((kind) => reviewPass.approvals[kind] === true);
  }

  reviewRequiresApproval(ticketId: string): boolean | null {
    return this.store.getReviewPass(ticketId)?.requiresApproval ?? null;
  }

  reviewReport(ticketId: string): string | null {
    const reviewPass = this.store.getReviewPass(ticketId);
    if (!reviewPass) return null;
    const results = requiredReviewKinds(reviewPass.reviewDepth).map((kind) => reviewPass.results[kind]);
    if (results.some((result) => result?.status !== "completed")) return null;
    const findings = dedupeFindings(
      results.flatMap((result) => result?.findings.filter((finding) => finding.verificationStatus !== "rejected") ?? []),
    );
    const verdict = findings.length > 0 ? "Corrections recommandées" : "Aucune correction recommandée";
    const summaries = results.map((result) => `- **${result?.kind ?? "review"}** : ${result?.summary ?? ""}`).join("\n");
    const details = findings.length === 0
      ? ""
      : `\n\n## Findings\n\n${findings.map((finding) => {
        const location = finding.path ? ` — ${finding.path}${finding.line ? `:${finding.line}` : ""}` : "";
        return `- **${finding.severity.toUpperCase()}**${location} — ${finding.summary}\n  ${finding.evidence}`;
      }).join("\n")}`;
    return `**Revue terminée — ${verdict}**\n\n${summaries}${details}`;
  }

  /** Spawn the bare Codex child in the ticket's slot worktree and hand it the plan. Non-blocking. */
  async start(ticket: Ticket, slotId: number, plan: string): Promise<{ ok: boolean; result: string }> {
    if (this.active.has(ticket.id) || this.startingImplementations.has(ticket.id)) {
      return { ok: false, result: "Une délégation est déjà en cours pour ce ticket : attends l'événement implementation_done." };
    }
    const epoch = this.reviewEpochs.get(ticket.id) ?? 0;
    this.startingImplementations.add(ticket.id);
    const parentExecution = this.sessionHub.getExecutionConfig(ticket.id);
    const fallbackKnobs = codexImplementerKnobs(ticket);
    const knobs = parentExecution?.delegateProvider === "codex" && parentExecution.delegateModel && parentExecution.delegateEffort
      ? {
          model: parentExecution.delegateModel,
          effort: parentExecution.delegateEffort,
          serviceTier: parentExecution.delegateServiceTier ?? "default",
        }
      : fallbackKnobs;
    try {
      await assertExecutionAvailable(this.system, {
        provider: "codex",
        model: knobs.model,
        effort: knobs.effort,
        serviceTier: knobs.serviceTier,
      });
    } catch (error) {
      this.startingImplementations.delete(ticket.id);
      const message = error instanceof Error ? error.message : String(error);
      return { ok: false, result: `Impossible de lancer la délégation : ${message}` };
    }
    this.startingImplementations.delete(ticket.id);
    if ((this.reviewEpochs.get(ticket.id) ?? 0) !== epoch) {
      return { ok: false, result: "Délégation annulée pendant sa préparation." };
    }
    const generationKey = `${ticket.id}:implementation`;
    const generation = (this.generations.get(generationKey) ?? 0) + 1;
    this.generations.set(generationKey, generation);
    const generationId = nanoid(16);
    const state: ActiveDelegation = {
      handle: null,
      generationId,
      usageByModel: {},
      sessionId: null,
      lastAssistantText: "",
      lastError: "",
      lastHeartbeatAt: Date.now(),
      settled: false,
    };
    this.active.set(ticket.id, state);
    let executionStarted = false;
    try {
      this.store.startExecution({
        id: generationId,
        ownerType: "ticket",
        ownerId: ticket.id,
        generationId,
        sessionId: null,
        role: "implementer",
        orchestrator: "codex",
        effectiveModel: knobs.model,
        effectiveEffort: knobs.effort,
        codexFast: knobs.serviceTier === "fast",
      });
      executionStarted = true;
      const handle = this.system.startAgentSession({
        ticketId: ticket.id,
        slotId: DELEGATION_SLOT_ID,
        cwd: slotPath(slotId),
        provider: "codex",
        model: knobs.model,
        effort: knobs.effort,
        serviceTier: knobs.serviceTier,
        role: "implementer",
        generation,
        permissionMode: "dontAsk",
        disableWorkerTools: true,
        onToolCall: async () => ({ ok: false, result: "Session d'implémentation déléguée : aucun tool de pipeline n'est disponible." }),
        onEvent: (event) => this.handleEvent(ticket.id, state, event),
      });
      state.handle = handle;
      handle.send(`${CHILD_FRAMING}${plan}`);
    } catch (error) {
      this.active.delete(ticket.id);
      const message = error instanceof Error ? error.message : String(error);
      if (executionStarted) this.closeAndFinalize(state, "failed", message);
      return { ok: false, result: `Impossible de lancer la délégation : ${message}` };
    }
    this.store.logEvent(ticket.id, "delegation_started", { model: knobs.model, effort: knobs.effort });
    this.sessionHub.appendExternalLine(ticket.id, `${CHILD_TRANSCRIPT_PREFIX}—— délégation Codex lancée (${knobs.model}) ——`);
    log.info("délégation lancée", { ticketId: ticket.id, slotId, model: knobs.model });
    return {
      ok: true,
      result:
        "Délégation lancée : une session Codex implémente le plan en arrière-plan dans le worktree courant. Termine ton tour MAINTENANT ; tu recevras l'événement implementation_done quand elle aura fini.",
    };
  }

  /** Serialize starts per ticket so concurrent tool calls join one persisted review pass. */
  async startReview(
    ticket: Ticket,
    slotId: number,
    kind: ReviewKind,
    context: string,
  ): Promise<{ ok: boolean; result: string }> {
    const epoch = this.reviewEpochs.get(ticket.id) ?? 0;
    const previous = this.reviewStartQueues.get(ticket.id) ?? Promise.resolve();
    const queued = previous
      .catch(() => undefined)
      .then(() => this.startReviewNow(ticket, slotId, kind, context, epoch));
    this.reviewStartQueues.set(ticket.id, queued);
    try {
      return await queued;
    } finally {
      if (this.reviewStartQueues.get(ticket.id) === queued) this.reviewStartQueues.delete(ticket.id);
    }
  }

  /** Start one bounded, fresh-context reviewer session within the ticket's current review pass. */
  private async startReviewNow(
    ticket: Ticket,
    slotId: number,
    kind: ReviewKind,
    context: string,
    epoch: number,
  ): Promise<{ ok: boolean; result: string }> {
    if ((this.reviewEpochs.get(ticket.id) ?? 0) !== epoch) {
      return { ok: false, result: "Passe de review annulée avant son lancement." };
    }
    const key = reviewKey(ticket.id, kind);
    if (this.activeReviews.has(key)) {
      return { ok: false, result: `La review ${kind} est déjà en cours.` };
    }
    const parentExecution = this.sessionHub.getExecutionConfig(ticket.id);
    const requestedExecution: ResolvedExecution = parentExecution
      ? { ...parentExecution, role: "reviewer" }
      : resolveTicketExecution(ticket, "reviewer", {
          model: ticket.model ?? "sonnet",
          effort: ticket.effort ?? "low",
        });
    const cwd = slotPath(slotId);
    let codeFingerprint: string;
    try {
      codeFingerprint = await this.system.codeFingerprint(cwd);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return { ok: false, result: `Impossible de lancer la review ${kind} : ${message}` };
    }
    if ((this.reviewEpochs.get(ticket.id) ?? 0) !== epoch) {
      return { ok: false, result: "Passe de review annulée pendant sa préparation." };
    }
    const depth = ticket.reviewDepth ?? "light";
    let reviewPass = this.activeReviewPasses.get(ticket.id);
    if (reviewPass && (reviewPass.codeFingerprint !== codeFingerprint || reviewPass.depth !== depth)) {
      return {
        ok: false,
        result: "Le code ou la profondeur a changé pendant la passe de review. Attends sa fin puis relance tous les reviewers.",
      };
    }
    if (!reviewPass) {
      reviewPass = { passId: nanoid(16), codeFingerprint, depth, execution: requestedExecution };
      try {
        await assertExecutionAvailable(this.system, requestedExecution);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return { ok: false, result: `Impossible de lancer la review ${kind} : ${message}` };
      }
      if ((this.reviewEpochs.get(ticket.id) ?? 0) !== epoch) {
        return { ok: false, result: "Passe de review annulée pendant sa préparation." };
      }
      this.store.beginReviewPass({
        ticketId: ticket.id,
        passId: reviewPass.passId,
        codeFingerprint,
        reviewDepth: depth,
        requiresApproval: ticket.kind !== "review" || (ticket.fixComments && ticket.prHeadBranch !== null),
      });
      this.activeReviewPasses.set(ticket.id, reviewPass);
    }
    const execution = reviewPass.execution;
    const generation = (this.generations.get(key) ?? 0) + 1;
    this.generations.set(key, generation);
    const generationId = nanoid(16);
    const state: ActiveReview = {
      handle: null,
      ticketId: ticket.id,
      slotId,
      kind,
      passId: reviewPass.passId,
      generation,
      generationId,
      sessionId: null,
      result: null,
      lastError: "",
      settled: false,
      usageByModel: {},
      phase: "review",
      sourceResult: null,
      verificationAttempt: 0,
      ticket,
      epoch,
      execution,
    };
    this.activeReviews.set(key, state);
    let executionStarted = false;
    try {
      this.store.startExecution({
        id: generationId,
        ownerType: "ticket",
        ownerId: ticket.id,
        generationId,
        sessionId: null,
        role: "reviewer",
        orchestrator: execution.provider,
        effectiveModel: execution.model,
        effectiveEffort: execution.effort,
        codexFast: execution.serviceTier === "fast",
      });
      executionStarted = true;
      const handle = this.system.startAgentSession({
        ticketId: `${ticket.id}-review-${kind}-${generation}`,
        slotId: DELEGATION_SLOT_ID,
        cwd,
        provider: execution.provider,
        model: execution.model,
        effort: execution.effort,
        serviceTier: execution.serviceTier,
        role: "reviewer",
        generation,
        permissionMode: "dontAsk",
        readOnly: true,
        allowedTools: REVIEW_TOOLS,
        disallowedTools: REVIEW_DISALLOWED_TOOLS,
        skills: [],
        onToolCall: (name, args) => this.handleReviewTool(state, name, args),
        onEvent: (event) => this.handleReviewEvent(state, event),
      });
      state.handle = handle;
      handle.send(reviewPrompt(ticket, kind, context));
    } catch (error) {
      this.activeReviews.delete(key);
      if (!this.hasActiveReviews(ticket.id)) this.activeReviewPasses.delete(ticket.id);
      const message = error instanceof Error ? error.message : String(error);
      if (executionStarted) this.closeAndFinalize(state, "failed", message);
      this.deliverReviewResult(state, false, null, message);
      return { ok: false, result: `Impossible de lancer la review ${kind} : ${message}` };
    }
    this.store.logEvent(ticket.id, "review_delegated", {
      kind,
      provider: execution.provider,
      model: execution.model,
      effort: execution.effort,
      generation,
    });
    return {
      ok: true,
      result: `Review ${kind} lancée en lecture seule. Termine ton tour et attends l'événement review_done.`,
    };
  }

  /** Kill an active child (parent released/relaunched/shutdown). Idempotent; stale events are dropped. */
  stop(ticketId: string): void {
    this.reviewEpochs.set(ticketId, (this.reviewEpochs.get(ticketId) ?? 0) + 1);
    const state = this.active.get(ticketId);
    if (state) {
      this.active.delete(ticketId);
      void state.handle?.interrupt().catch((error: unknown) => {
        log.warn("interruption de session enfant impossible", { ticketId, reason: String(error) });
      });
      this.closeAndFinalize(state, "cancelled", null);
      this.store.logEvent(ticketId, "delegation_killed", {});
      log.info("délégation tuée (cascade parent)", { ticketId });
    }
    for (const [key, review] of this.activeReviews) {
      if (review.ticketId !== ticketId) continue;
      this.activeReviews.delete(key);
      void review.handle?.interrupt().catch((error: unknown) => {
        log.warn("interruption de reviewer impossible", { ticketId, reason: String(error) });
      });
      this.closeAndFinalize(review, "cancelled", null);
    }
    this.activeReviewPasses.delete(ticketId);
  }

  async drainClosingSessions(): Promise<void> {
    while (this.closingExecutions.size > 0) await Promise.allSettled([...this.closingExecutions]);
  }

  private async handleReviewTool(
    state: ActiveReview,
    name: WorkerToolName,
    args: unknown,
  ): Promise<{ ok: boolean; result: string }> {
    if (this.activeReviews.get(reviewKey(state.ticketId, state.kind)) !== state) {
      return { ok: false, result: "génération de review périmée" };
    }
    if (name !== "submit_review") {
      return { ok: false, result: "Session reviewer : seul submit_review est autorisé." };
    }
    const parsed = submitReviewArgsSchema.safeParse(args);
    if (!parsed.success) return { ok: false, result: parsed.error.message };
    state.result = parsed.data;
    return { ok: true, result: "Review enregistrée. Termine le tour." };
  }

  private handleReviewEvent(state: ActiveReview, event: AgentSessionEvent): void {
    const current = this.activeReviews.get(reviewKey(state.ticketId, state.kind)) === state;
    if (event.type === "init") {
      state.sessionId = event.sessionId;
      this.store.attachExecutionSession({
        generationId: state.generationId,
        sessionId: event.sessionId,
        configuredServiceTier: event.configuredServiceTier ?? null,
      });
    }
    if (event.type === "turn_end") {
      state.usageByModel = mergeAgentUsageByModel(state.usageByModel, event.usageByModel);
    }
    if (!current) return;
    if (event.type === "error") state.lastError = event.message;
    this.sessionHub.appendExternalEvent(
      state.ticketId,
      state.generationId,
      event,
      `⟨${state.phase === "verification" ? "verification" : "review"} ${state.kind}⟩ `,
    );
    if (event.type === "turn_end" && !state.settled) {
      state.settled = true;
      this.recordReviewUsage(state, event.sessionId, event.usageByModel);
      setTimeout(() => this.settleReview(state), SETTLE_DELAY_MS);
    }
  }

  private settleReview(state: ActiveReview): void {
    const key = reviewKey(state.ticketId, state.kind);
    if (this.activeReviews.get(key) !== state) return;
    this.activeReviews.delete(key);
    if (state.phase === "review" && state.result) {
      this.closeAndFinalize(state, "completed", null);
      const needsVerification = state.result.findings.some((finding) => finding.severity !== "minor");
      if (!needsVerification) {
        this.persistReviewResult(state, state.result, "not_needed");
        this.deliverReviewResult(state, true, state.result, "");
        this.clearReviewPassIfIdle(state.ticketId);
        return;
      }
      this.store.recordReviewResult({
        ticketId: state.ticketId,
        passId: state.passId,
        kind: state.kind,
        status: "pending",
        verdict: state.result.verdict,
        summary: state.result.summary,
        findings: state.result.findings.map((finding) => ({ ...finding, verificationStatus: "pending" })),
        verificationStatus: "pending",
        error: "contre-vérification en cours",
      });
      void this.startVerification(state, state.result, 1);
      return;
    }
    if (state.phase === "verification" && state.result && state.sourceResult) {
      const persistedFindings = verifiedFindings(state.sourceResult, state.result);
      const findings = persistedFindings.filter((finding) => finding.verificationStatus !== "rejected");
      const result: ReviewResult = {
        verdict: findings.length > 0 ? "revise" : "approve",
        summary: `${state.sourceResult.summary}\nContre-vérification : ${state.result.summary}`,
        findings,
      };
      this.persistReviewResult(state, result, "verified", persistedFindings);
      this.deliverReviewResult(state, true, result, "");
      this.closeAndFinalize(state, "completed", null);
      this.clearReviewPassIfIdle(state.ticketId);
      return;
    }
    if (state.phase === "verification" && state.sourceResult && state.verificationAttempt < 2) {
      this.closeAndFinalize(state, "failed", state.lastError || "submit_review absent");
      void this.startVerification(state, state.sourceResult, state.verificationAttempt + 1);
      return;
    }
    const failure = state.lastError || "le reviewer s'est terminé sans appeler submit_review";
    this.store.recordReviewResult({
      ticketId: state.ticketId,
      passId: state.passId,
      kind: state.kind,
      status: "failed",
      verdict: state.sourceResult?.verdict ?? null,
      summary: state.sourceResult?.summary ?? failure,
      findings: state.sourceResult?.findings ?? [],
      verificationStatus: state.phase === "verification" ? "failed" : "not_needed",
      error: failure,
    });
    this.deliverReviewResult(
      state,
      false,
      null,
      failure,
    );
    this.closeAndFinalize(state, "failed", failure);
    this.clearReviewPassIfIdle(state.ticketId);
  }

  private clearReviewPassIfIdle(ticketId: string): void {
    if (!this.hasActiveReviews(ticketId)) this.activeReviewPasses.delete(ticketId);
  }

  private persistReviewResult(
    state: ActiveReview,
    result: ReviewResult,
    verificationStatus: "not_needed" | "verified",
    persistedFindings = result.findings,
  ): void {
    this.store.recordReviewResult({
      ticketId: state.ticketId,
      passId: state.passId,
      kind: state.kind,
      status: "completed",
      verdict: result.verdict,
      summary: result.summary,
      findings: dedupeFindings(persistedFindings),
      verificationStatus,
      error: null,
    });
  }

  private async startVerification(source: ActiveReview, result: ReviewResult, attempt: number): Promise<void> {
    if ((this.reviewEpochs.get(source.ticketId) ?? 0) !== source.epoch) return;
    const key = reviewKey(source.ticketId, source.kind);
    const execution = source.execution;
    const generation = (this.generations.get(key) ?? 0) + 1;
    this.generations.set(key, generation);
    const state: ActiveReview = {
      handle: null,
      ticketId: source.ticketId,
      slotId: source.slotId,
      kind: source.kind,
      passId: source.passId,
      generation,
      generationId: nanoid(16),
      sessionId: null,
      result: null,
      lastError: "",
      settled: false,
      usageByModel: {},
      phase: "verification",
      sourceResult: result,
      verificationAttempt: attempt,
      ticket: source.ticket,
      epoch: source.epoch,
      execution,
    };
    this.activeReviews.set(key, state);
    try {
      await assertExecutionAvailable(this.system, execution);
    } catch (error) {
      if (this.activeReviews.get(key) !== state) return;
      this.activeReviews.delete(key);
      const failure = error instanceof Error ? error.message : String(error);
      if (attempt < 2) {
        await this.startVerification(source, result, attempt + 1);
        return;
      }
      this.failVerification(source, result, failure);
      this.clearReviewPassIfIdle(source.ticketId);
      return;
    }
    if ((this.reviewEpochs.get(source.ticketId) ?? 0) !== source.epoch || this.activeReviews.get(key) !== state) return;
    try {
      this.store.startExecution({
        id: state.generationId,
        ownerType: "ticket",
        ownerId: state.ticketId,
        generationId: state.generationId,
        sessionId: null,
        role: "reviewer",
        orchestrator: execution.provider,
        effectiveModel: execution.model,
        effectiveEffort: execution.effort,
        codexFast: execution.serviceTier === "fast",
      });
      state.handle = this.system.startAgentSession({
        ticketId: `${state.ticketId}-verify-${state.kind}-${generation}`,
        slotId: DELEGATION_SLOT_ID,
        cwd: slotPath(source.slotId),
        provider: execution.provider,
        model: execution.model,
        effort: execution.effort,
        serviceTier: execution.serviceTier,
        role: "reviewer",
        generation,
        permissionMode: "dontAsk",
        readOnly: true,
        allowedTools: REVIEW_TOOLS,
        disallowedTools: REVIEW_DISALLOWED_TOOLS,
        skills: [],
        onToolCall: (name, args) => this.handleReviewTool(state, name, args),
        onEvent: (event) => this.handleReviewEvent(state, event),
      });
      state.handle.send(verificationPrompt(source.ticket, source.kind, result));
      this.store.logEvent(state.ticketId, "review_verification_delegated", { kind: state.kind, attempt, generation });
    } catch (error) {
      this.activeReviews.delete(key);
      this.closeAndFinalize(state, "failed", error instanceof Error ? error.message : String(error));
      if (attempt < 2) {
        await this.startVerification(source, result, attempt + 1);
        return;
      }
      this.failVerification(source, result, error instanceof Error ? error.message : String(error));
      this.clearReviewPassIfIdle(source.ticketId);
    }
  }

  private failVerification(source: ActiveReview, result: ReviewResult, failure: string): void {
    this.store.recordReviewResult({
      ticketId: source.ticketId,
      passId: source.passId,
      kind: source.kind,
      status: "failed",
      verdict: result.verdict,
      summary: result.summary,
      findings: result.findings,
      verificationStatus: "failed",
      error: failure,
    });
    this.deliverReviewResult(source, false, null, `contre-vérification échouée : ${failure}`);
  }

  private deliverReviewResult(
    state: ActiveReview,
    ok: boolean,
    result: ReviewResult | null,
    failure: string,
  ): void {
    const delivered = this.sessionHub.sendEvent(state.ticketId, {
      type: "review_done",
      kind: state.kind,
      passId: state.passId,
      ok,
      verdict: result?.verdict ?? null,
      summary: result?.summary ?? failure,
      findings: result?.findings ?? [],
    });
    this.store.logEvent(state.ticketId, "review_done", {
      kind: state.kind,
      ok,
      verdict: result?.verdict ?? null,
      delivered,
      generation: state.generation,
    });
  }

  private recordReviewUsage(
    state: ActiveReview,
    turnSessionId: string,
    usageByModel: Record<string, AgentTurnUsage>,
  ): void {
    const ticket = this.store.getTicket(state.ticketId);
    if (!ticket || Object.keys(usageByModel).length === 0) return;
    const key = turnSessionId || state.sessionId || `review-${state.ticketId}-${state.kind}-${state.generation}`;
    const sessionUsage = {
      ...ticket.sessionUsage,
      [key]: addUsageByModel(ticket.sessionUsage[key], toUsageByModel(usageByModel)),
    };
    this.hub.pushTicket(this.store.updateTicket(state.ticketId, { sessionUsage }));
  }

  private handleEvent(ticketId: string, state: ActiveDelegation, event: AgentSessionEvent): void {
    const current = this.active.get(ticketId) === state;
    if (event.type === "init") {
      state.sessionId = event.sessionId;
      this.store.attachExecutionSession({
        generationId: state.generationId,
        sessionId: event.sessionId,
        configuredServiceTier: event.configuredServiceTier ?? null,
      });
    }
    if (event.type === "turn_end") {
      state.usageByModel = mergeAgentUsageByModel(state.usageByModel, event.usageByModel);
    }
    if (!current) return;
    if (event.type === "assistant_text" && event.text.trim()) state.lastAssistantText = event.text.trim();
    if (event.type === "error") state.lastError = event.message;
    this.sessionHub.appendExternalEvent(ticketId, state.generationId, event, CHILD_TRANSCRIPT_PREFIX);
    this.heartbeat(ticketId, state);
    if (event.type === "turn_end" && !state.settled) {
      state.settled = true;
      this.recordUsage(ticketId, state, event.sessionId, event.usageByModel);
      const ok = event.ok;
      setTimeout(() => this.settle(ticketId, state, ok), SETTLE_DELAY_MS);
    }
  }

  /** The child's single turn ended: tear it down and resume the parent via implementation_done. */
  private settle(ticketId: string, state: ActiveDelegation, ok: boolean): void {
    if (this.active.get(ticketId) !== state) return;
    this.active.delete(ticketId);
    const summary = ok
      ? state.lastAssistantText
      : state.lastError || state.lastAssistantText || "la session Codex s'est terminée en erreur sans détail";
    const delivered = this.sessionHub.sendEvent(ticketId, { type: "implementation_done", ok, summary });
    this.store.logEvent(ticketId, "delegation_done", { ok, delivered });
    this.closeAndFinalize(state, ok ? "completed" : "failed", ok ? null : summary);
    log.info("délégation terminée", { ticketId, ok, delivered });
    if (!delivered) log.warn("implementation_done non délivré : session parente absente", { ticketId });
  }

  private closeAndFinalize(
    state: ClosableExecution,
    status: "completed" | "failed" | "cancelled",
    error: string | null,
  ): void {
    const finalize = (): void => {
      this.store.finalizeExecution({
        generationId: state.generationId,
        status,
        usageByModel: state.usageByModel,
        error,
      });
    };
    const handle = state.handle;
    if (!handle) {
      finalize();
      return;
    }
    const boundedClose = (async (): Promise<void> => {
      let timeout: ReturnType<typeof setTimeout> | undefined;
      try {
        await Promise.race([
          handle.close(),
          new Promise<never>((_, reject) => {
            timeout = setTimeout(() => reject(new Error("Délai de fermeture de session enfant dépassé")), this.closeTimeoutMs);
            timeout.unref();
          }),
        ]);
      } catch (closeError) {
        handle.dispose?.();
        log.warn("fermeture de session enfant incomplète", {
          generationId: state.generationId,
          reason: closeError instanceof Error ? closeError.message : String(closeError),
        });
      } finally {
        if (timeout) clearTimeout(timeout);
        finalize();
      }
    })();
    this.closingExecutions.add(boundedClose);
    void boundedClose.finally(() => this.closingExecutions.delete(boundedClose)).catch((error: unknown) => {
      log.warn("finalisation de session enfant impossible", { reason: String(error) });
    });
  }

  /** Sum the child turn's usage into the parent ticket (keyed by the child thread id). */
  private recordUsage(
    ticketId: string,
    state: ActiveDelegation,
    turnSessionId: string,
    usageByModel: Record<string, AgentTurnUsage>,
  ): void {
    if (Object.keys(usageByModel).length === 0) return;
    const ticket = this.store.getTicket(ticketId);
    if (!ticket) return;
    const key = turnSessionId || state.sessionId || `delegation-${ticketId}`;
    const sessionUsage = {
      ...ticket.sessionUsage,
      [key]: addUsageByModel(ticket.sessionUsage[key], toUsageByModel(usageByModel)),
    };
    this.hub.pushTicket(this.store.updateTicket(ticketId, { sessionUsage }));
  }

  /** Refresh the parent ticket's lastProgressAt (throttled) so watchdog/reclaim see live work. */
  private heartbeat(ticketId: string, state: ActiveDelegation): void {
    const now = Date.now();
    if (now - state.lastHeartbeatAt < HEARTBEAT_MIN_INTERVAL_MS) return;
    state.lastHeartbeatAt = now;
    if (!this.store.getTicket(ticketId)) return;
    this.store.updateTicket(ticketId, { lastProgressAt: now });
  }
}
