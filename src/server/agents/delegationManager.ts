/**
 * DelegationManager — runs the delegated Codex implementation child sessions.
 *
 * When a ticket has a Codex implementer, the parent calls `delegate_implementation` — once per
 * independent lot, up to MAX_PARALLEL_IMPLEMENTERS — and ends its turn. This manager spawns one bare
 * Codex session per lot in the same slot worktree, feeds it the plan, then pushes one
 * `implementation_done` (carrying the lot label and how many lots are still running) per lot back
 * into the parent. It also owns the separate read-only sessions
 * used for the independent review dimensions required by each review depth.
 *
 * The child is attached to the parent ticket: its stream events heartbeat the ticket's
 * lastProgressAt (the parent is idle while waiting, so the watchdog would otherwise flag it), its
 * transcript lines are appended to the parent's live viewer, its token usage is summed into the
 * ticket's sessionUsage (keyed by the child thread id), and any parent-session teardown
 * (release/relaunch/shutdown) cascades into a kill via SessionHub's disconnect listener.
 */

import { nanoid } from "nanoid";

import { DELEGATION_SLOT_ID, MAX_PARALLEL_IMPLEMENTERS } from "../../shared/constants.ts";
import { getErrorMessage } from "../../shared/errors.ts";
import type { Ticket } from "../../shared/schemas.ts";
import { submitReviewArgsSchema } from "../../shared/schemas.ts";
import { reviewFindingSeveritySchema, reviewKindSchema } from "../../shared/protocol.ts";
import type { ReviewFinding, ReviewKind, WorkerToolName } from "../../shared/protocol.ts";

import type { PersistedReviewResult, ReviewPass, Store } from "../db/store.ts";
import { getProject, isProjectKey } from "../config.ts";
import type { ClientHub } from "../hub.ts";
import { createLogger } from "../logger.ts";
import { KeyedMutex } from "../mutex.ts";
import type { AgentSessionEvent, AgentSessionHandle, AgentTurnUsage } from "../system/agentSession.ts";
import { renderCollapsedDetails } from "../system/reviewMarkdown.ts";
import type { SystemAdapter } from "../system/types.ts";

import {
  dedupeIdenticalFindings,
  isSelfRefuting,
  keptFindings,
  reviewProseIsFrench,
  reviewPublicationEvent,
} from "./reviewFindings.ts";
import { passDimensionFindings, publishedReviewFindings, requiredReviewKinds } from "./reviewPass.ts";
import { codexImplementerKnobs } from "./sessionConfig.ts";
import { assertExecutionAvailable, resolveTicketExecution } from "./executionConfig.ts";
import type { ResolvedExecution } from "./executionConfig.ts";
import { mergeAgentUsageByModel, renderChannelEvent } from "./sessionHub.ts";
import type { SessionHub } from "./sessionHub.ts";
import { slotPath } from "./slotManager.ts";
import { addUsageByModel, toUsageByModel } from "./usage.ts";

const log = createLogger("delegation");

/** Min interval between two lastProgressAt refreshes driven by child stream events. */
const HEARTBEAT_MIN_INTERVAL_MS = 30_000;

/**
 * A review pass delegates one reviewer per dimension in a row; hashing the whole worktree on each
 * call cost tens of seconds under load. Within this window the pass reuses its stored fingerprint.
 */
const FINGERPRINT_REUSE_WINDOW_MS = 60_000;
/** Above this, computing the worktree fingerprint is logged as a warning. */
const SLOW_FINGERPRINT_WARN_MS = 2_000;
const REVIEW_GATE_FINGERPRINT_TIMEOUT_MS = 30_000;
/** Above this, a whole delegate_review start (queue wait included) is logged as a warning. */
const SLOW_REVIEW_START_WARN_MS = 10_000;

/**
 * A reviewer that answered in French is asked once to re-emit the same JSON in English; a second
 * French answer is accepted (and logged) so a stubborn model cannot loop the pass forever.
 */
const MAX_LANGUAGE_RETRIES = 1;

/** Transcript prefix marking lines produced by one delegated child lot (vs the parent session). */
function childTranscriptPrefix(label: string): string {
  return `⟨codex:${label}⟩ `;
}

const CHILD_FRAMING = `Tu es la session d'implémentation déléguée (Codex). Ton unique rôle est d'écrire le code décrit dans le plan ci-dessous, intégralement, dans le répertoire de travail courant (le worktree).

Consignes :
- Travaille uniquement dans le worktree courant. Ne touche à aucun fichier en dehors.
- Si le plan précise un périmètre de fichiers, reste strictement dedans : d'autres lots d'implémentation tournent peut-être en parallèle dans le même worktree, ne touche jamais à leurs fichiers.
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
  label: string;
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
  languageRetries: number;
  sourceResult: ReviewResult | null;
  verificationAttempt: number;
  ticket: Ticket;
  epoch: number;
  execution: ResolvedExecution;
}

interface ActiveReviewPass {
  passId: string;
  codeFingerprint: string;
  reviewedCommitSha: string | null;
  fingerprintComputedAt: number;
  depth: "light" | "full";
  execution: ResolvedExecution;
}

type ReviewGateRequirement = "approved" | "completed";

type ReviewGateResult =
  | { ok: true; passId: string }
  | { ok: false; reason: string; reasonCode: "code_changed" | "fingerprint_error" | "fingerprint_timeout" | "incomplete_review" | "missing_review" };

interface ClosableExecution {
  handle: AgentSessionHandle | null;
  generationId: string;
  usageByModel: Record<string, AgentTurnUsage>;
}

const REVIEW_TOOLS = ["Read", "Glob", "Grep"];
const REVIEW_DISALLOWED_TOOLS = ["Bash", "Edit", "Write", "Task", "Agent"];

const CHILD_CLOSE_TIMEOUT_MS = 65_000;

/** Delivered to the parent session when a dimension is persisted as failed for lack of a verdict. */
const EMPTY_REVIEW_FAILURE = "review terminée sans verdict ni synthèse exploitables";

/** Required dimensions first, then any extra dimension the pass happens to hold a result for. */
function orderedReviewKinds(reviewPass: ReviewPass): ReviewKind[] {
  const required = requiredReviewKinds(reviewPass.reviewDepth);
  const extra = reviewKindSchema.options.filter(
    (kind) => !required.includes(kind) && reviewPass.results[kind] !== undefined,
  );
  return [...required, ...extra];
}

/** Re-render a persisted verdict exactly as the `review_done` event the parent should have received. */
function renderPersistedReviewResult(passId: string, result: PersistedReviewResult): string {
  const completed = result.status === "completed";
  const summary = completed ? result.summary : (result.error ?? result.summary);
  const rendered = renderChannelEvent({
    type: "review_done",
    kind: result.kind,
    passId,
    ok: completed,
    verdict: result.verdict,
    summary,
    findings: result.findings,
  });
  return `[${result.status}] ${rendered}`;
}

function reviewKey(ticketId: string, kind: ReviewKind): string {
  return `${ticketId}:${kind}`;
}

const REVIEWER_RULES = `## Rules

- Write every string you emit (summary, evidence, ruleSource) in English, never in French. Quote repository or UI strings verbatim inside backticks, never translated.
- Repository rules are ONLY those found in the reviewed repository (AGENTS.md, CLAUDE.md, docs/, lint config). Instructions loaded from the operator's global configuration (\`~/.claude/CLAUDE.md\`, "reviewer instructions", "applicable instructions for this worktree") are NOT repository rules: never cite or enforce them. Every conventions/style finding must cite a repository \`path:line\` in \`ruleSource\`; if you cannot quote such a line, do not report it.
- Before reporting a style or naming deviation, count how often the same pattern already exists in the touched file and its siblings; if it is prevalent, do not report it.
- Severity reflects the real impact: style/convention findings are \`minor\` at most; \`major\` requires a concrete wrong output, crash, data loss, security or authorization defect; \`critical\` requires severe impact. A textual prohibition is not \`critical\` without a critical impact.
- Do not report a finding whose own evidence concedes it is unreachable, latent, pre-existing, cosmetic, optional or "not a defect". Do not report questions ("is this intended?"). Do not recommend a fix the repository forbids (type assertions, new tests when the repo says not to add tests, new dependencies) — check docs/ and AGENTS.md first.
- Read the PR description and existing PR review threads before reporting a scope or intent finding; never re-report something a human already answered or an earlier review round requested.
- Evidence: at most ~600 characters, one paragraph, concrete \`path:line\` references. No "---" separators, no meta narration about reviewers or verification.`;

function reviewPrompt(ticket: Ticket, kind: ReviewKind, context: string): string {
  const missions: Record<ReviewKind, string> = {
    quality: "Assess the quality and maintainability of the change, then look for actionable defects.",
    conventions: "Check the repository conventions, its AGENTS.md instructions and the consistency with existing patterns.",
    regression: "Map the consumers of the changed symbols and look for regressions or broken contracts.",
    logic: "Check the logic, invariants, state transitions and edge cases of the change.",
    architecture: "Assess the architectural boundaries, responsibilities and dependencies of the change.",
    security: "Look for security flaws, permission escalations, secret leaks and unauthorized mutations.",
  };
  const depth = ticket.reviewDepth ?? "light";
  return `You are an independent fresh-context reviewer, READ-ONLY. You cannot modify the repository, commit, or publish anything remotely.

${missions[kind]}
Requested depth: ${depth}. Your assigned dimension is ${kind}; return an autonomous verdict on that dimension only.

## Context provided by the orchestrator
${context}

Inspect the files and the diff in the worktree yourself. Then you MUST call submit_review with:
- verdict=approve only if no actionable finding remains; otherwise verdict=revise;
- summary: a concise, evidence-based conclusion;
- findings: objects { id, severity, summary, evidence, ruleSource, path, line }.

${REVIEWER_RULES}

Do not call any other pipeline tool.`;
}

function verificationPrompt(ticket: Ticket, kind: ReviewKind, result: ReviewResult): string {
  const candidates = result.findings.filter((finding) => finding.severity !== "minor");
  return `You independently counter-check the important findings of a ${kind} review, READ-ONLY.
You cannot modify the repository, commit, or publish anything remotely. Verify every claim against the code
and the diff. Deduplicate, reject unproven conclusions, and downgrade the severity of a finding whose claimed
impact does not match its evidence.

Ticket: ${ticket.title}
Candidate findings: ${JSON.stringify(candidates)}

${REVIEWER_RULES}

Call submit_review with the confirmed findings only. Use verdict=revise if any remains, approve otherwise.
State briefly in the summary which findings you rejected or downgraded. Do not call any other tool.`;
}

/** Inline comment body: GitHub already renders the `path:line` anchor, so it is not repeated here. */
function renderFinding(finding: ReviewFinding): string {
  return `**${finding.severity.toUpperCase()}** — ${finding.summary}\n\n${finding.evidence}`;
}

function renderCollapsedFinding(finding: ReviewFinding): string {
  const location = finding.path ? ` — ${finding.path}${finding.line ? `:${finding.line}` : ""}` : "";
  return renderCollapsedDetails(
    `${finding.severity.toUpperCase()}${location} — ${finding.summary}`,
    finding.evidence,
  );
}

interface ReviewReportLabels {
  changesRecommended: string;
  noChanges: string;
  noFindings: string;
  outsideDiffHeading: string;
  keptLine: (count: number, countSummary: string) => string;
}

const REVIEW_REPORT_LABELS_EN: ReviewReportLabels = {
  changesRecommended: "Review complete — changes recommended",
  noChanges: "Review complete — no changes recommended",
  noFindings: "no findings",
  outsideDiffHeading: "## Findings without a diff anchor",
  keptLine: (count, countSummary) => `${count} finding(s) kept: ${countSummary}.`,
};

const REVIEW_REPORT_LABELS_FR: ReviewReportLabels = {
  changesRecommended: "Revue terminée — modifications recommandées",
  noChanges: "Revue terminée — aucune modification recommandée",
  noFindings: "aucun finding",
  outsideDiffHeading: "## Findings hors du diff",
  keptLine: (count, countSummary) => `${count} finding(s) retenu(s) : ${countSummary}.`,
};

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
  /** ticketId → label → child. One entry per running implementation lot of that ticket. */
  private readonly active = new Map<string, Map<string, ActiveDelegation>>();
  /** `${ticketId}:${label}` pairs whose child is being prepared (not yet in `active`). */
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
    private readonly repoMutex = new KeyedMutex(),
  ) {}

  /** True while a child implementation session runs for this ticket (parent is parked, not stalled). */
  isActive(ticketId: string): boolean {
    if (this.lotCount(ticketId) > 0) return true;
    return [...this.activeReviews.values()].some((review) => review.ticketId === ticketId);
  }

  /** True while at least one implementation lot of this ticket runs or is being prepared. */
  hasActiveImplementations(ticketId: string): boolean {
    return this.lotCount(ticketId) > 0;
  }

  hasActiveReviews(ticketId: string): boolean {
    return [...this.activeReviews.values()].some((review) => review.ticketId === ticketId);
  }

  private boundedReviewGateFingerprint(
    ticketId: string,
    slotId: number,
    correlationId: string,
  ): Promise<{ ok: true; fingerprint: string } | { ok: false; reason: string; reasonCode: "fingerprint_error" | "fingerprint_timeout" }> {
    const startedAt = Date.now();
    const fingerprint = this.system.codeFingerprint(slotPath(slotId));
    return new Promise((resolve) => {
      let settled = false;
      const timer = setTimeout(() => {
        settled = true;
        log.warn("empreinte de gate expirée", {
          ticketId,
          slotId,
          correlationId,
          elapsedMs: Date.now() - startedAt,
        });
        resolve({
          ok: false,
          reason: "La vérification du code a dépassé 30 s. Son résultat sera ignoré. Rappelle done().",
          reasonCode: "fingerprint_timeout",
        });
      }, REVIEW_GATE_FINGERPRINT_TIMEOUT_MS);
      void fingerprint.then(
        (value) => {
          if (settled) {
            log.info("empreinte de gate terminée après expiration — résultat ignoré", {
              ticketId,
              slotId,
              correlationId,
              elapsedMs: Date.now() - startedAt,
            });
            return;
          }
          settled = true;
          clearTimeout(timer);
          resolve({ ok: true, fingerprint: value });
        },
        (error: unknown) => {
          const reason = getErrorMessage(error);
          if (settled) {
            log.warn("empreinte de gate échouée après expiration — erreur ignorée", {
              ticketId,
              slotId,
              correlationId,
              elapsedMs: Date.now() - startedAt,
              reason,
            });
            return;
          }
          settled = true;
          clearTimeout(timer);
          log.warn("empreinte du code illisible pendant la gate de review", {
            ticketId,
            slotId,
            correlationId,
            elapsedMs: Date.now() - startedAt,
            reason,
          });
          resolve({
            ok: false,
            reason: `La vérification du code n'a pas pu lire le dossier de travail : ${reason}`,
            reasonCode: "fingerprint_error",
          });
        },
      );
    });
  }

  async reviewGate(
    ticketId: string,
    slotId: number,
    requirement: ReviewGateRequirement,
    correlationId: string,
  ): Promise<ReviewGateResult> {
    const startedAt = Date.now();
    log.info("gate de review démarrée", { ticketId, slotId, correlationId, requirement });
    const reviewPass = this.store.getReviewPass(ticketId);
    if (!reviewPass) {
      return {
        ok: false,
        reason: "Aucune passe de review n'est enregistrée. Lance tous les reviewers requis avant de rappeler done().",
        reasonCode: "missing_review",
      };
    }
    const fingerprint = await this.boundedReviewGateFingerprint(ticketId, slotId, correlationId);
    if (!fingerprint.ok) return fingerprint;
    if (reviewPass.codeFingerprint !== fingerprint.fingerprint) {
      return {
        ok: false,
        reason: "Les fichiers ont changé depuis la passe de review. Relance tous les reviewers sur le code courant.",
        reasonCode: "code_changed",
      };
    }
    const incompleteKinds = requiredReviewKinds(reviewPass.reviewDepth).filter((kind) => {
      if (requirement === "completed") return reviewPass.results[kind]?.status !== "completed";
      return reviewPass.approvals[kind] !== true;
    });
    if (incompleteKinds.length > 0) {
      const missing = requirement === "completed" ? "résultat vérifié manquant" : "approbation manquante";
      return {
        ok: false,
        reason: `Review incomplète : ${missing} pour ${incompleteKinds.join(", ")}.`,
        reasonCode: "incomplete_review",
      };
    }
    log.info("gate de review acceptée", {
      ticketId,
      slotId,
      correlationId,
      requirement,
      passId: reviewPass.passId,
      elapsedMs: Date.now() - startedAt,
    });
    return { ok: true, passId: reviewPass.passId };
  }

  async reviewsCompleted(ticketId: string, slotId: number): Promise<boolean> {
    return (await this.reviewGate(ticketId, slotId, "completed", nanoid(8))).ok;
  }

  async reviewsApproved(ticketId: string, slotId: number): Promise<boolean> {
    return (await this.reviewGate(ticketId, slotId, "approved", nanoid(8))).ok;
  }

  /**
   * Re-read the verdicts persisted for the ticket's review pass. Recovery path when a `review_done`
   * event never reached the parent session: the results outlive the delivery.
   */
  readReviewResults(ticketId: string, passId: string | null): { ok: boolean; result: string } {
    const reviewPass = this.store.getReviewPass(ticketId);
    if (!reviewPass) {
      return { ok: false, result: "Aucune passe de review enregistrée pour ce ticket : lance delegate_review." };
    }
    if (passId !== null && passId !== reviewPass.passId) {
      return {
        ok: false,
        result: `Passe ${passId} introuvable : seule la passe courante ${reviewPass.passId} est conservée.`,
      };
    }
    const kinds = orderedReviewKinds(reviewPass);
    const rendered: string[] = [];
    const pending: ReviewKind[] = [];
    for (const kind of kinds) {
      const result = reviewPass.results[kind];
      if (!result || result.status === "pending") {
        pending.push(kind);
        continue;
      }
      rendered.push(renderPersistedReviewResult(reviewPass.passId, result));
    }
    const header = `Passe ${reviewPass.passId} (profondeur ${reviewPass.reviewDepth}) : ${rendered.length}/${kinds.length} dimension(s) rendue(s).`;
    const pendingLine = pending.length === 0 ? "" : `\n\nEn attente : ${pending.join(", ")}.`;
    const verdicts = rendered.length === 0 ? "" : `\n\n${rendered.join("\n\n")}`;
    return { ok: true, result: `${header}${verdicts}${pendingLine}` };
  }

  reviewRequiresApproval(ticketId: string): boolean | null {
    return this.store.getReviewPass(ticketId)?.requiresApproval ?? null;
  }

  /** English rendering: the body posted on the GitHub pull request. */
  reviewReport(ticketId: string): string | null {
    return this.renderReviewReport(ticketId, REVIEW_REPORT_LABELS_EN);
  }

  /** French rendering: the board comment shown in the app. */
  reviewBoardReport(ticketId: string): string | null {
    return this.renderReviewReport(ticketId, REVIEW_REPORT_LABELS_FR);
  }

  private renderReviewReport(ticketId: string, labels: ReviewReportLabels): string | null {
    const findings = publishedReviewFindings(this.store.getReviewPass(ticketId));
    if (findings === null) return null;
    const verdict = findings.length > 0 ? labels.changesRecommended : labels.noChanges;
    const counts = reviewFindingSeveritySchema.options.flatMap((severity) => {
      const count = findings.filter((finding) => finding.severity === severity).length;
      return count > 0 ? [`${count} ${severity}`] : [];
    });
    const countSummary = counts.length > 0 ? counts.join(", ") : labels.noFindings;
    const outsideDiffFindings = findings.filter((finding) => finding.path === null || finding.line === null);
    const details = outsideDiffFindings.length === 0
      ? ""
      : `\n\n${labels.outsideDiffHeading}\n\n${outsideDiffFindings.map(renderCollapsedFinding).join("\n\n")}`;
    return `**${verdict}**\n\n${labels.keptLine(findings.length, countSummary)}${details}`;
  }

  async publishReview(
    ticket: Ticket,
    slotId: number,
    passId: string,
    correlationId: string,
  ): Promise<{ ok: boolean; result: string }> {
    const epoch = this.reviewEpochs.get(ticket.id) ?? 0;
    const previous = this.reviewStartQueues.get(ticket.id) ?? Promise.resolve();
    const queued = previous
      .catch(() => undefined)
      .then(() => this.publishReviewNow(ticket, slotId, passId, correlationId, epoch));
    this.reviewStartQueues.set(ticket.id, queued);
    try {
      return await queued;
    } finally {
      if (this.reviewStartQueues.get(ticket.id) === queued) this.reviewStartQueues.delete(ticket.id);
    }
  }

  private async publishReviewNow(
    ticket: Ticket,
    slotId: number,
    passId: string,
    correlationId: string,
    epoch: number,
  ): Promise<{ ok: boolean; result: string }> {
    if (ticket.kind !== "review" || !ticket.postComments || ticket.prUrl === null) {
      return { ok: false, result: "publish_review est réservé aux tickets review avec postage GitHub activé." };
    }
    const prUrl = ticket.prUrl;
    const reviewPass = this.store.getReviewPass(ticket.id);
    if (!reviewPass || reviewPass.passId !== passId) {
      return {
        ok: false,
        result: "Cette passe n'est plus courante. Lance une nouvelle passe complète avec delegate_review.",
      };
    }
    const requirement = reviewPass.requiresApproval ? "approved" : "completed";
    const gate = await this.reviewGate(ticket.id, slotId, requirement, correlationId);
    if (!gate.ok) return { ok: false, result: `Publication refusée : ${gate.reason}` };
    if (!isProjectKey(ticket.project)) return { ok: false, result: "Publication refusée : projet inconnu." };
    return this.repoMutex.run(getProject(ticket.project).repoPath, () =>
      this.publishReviewUnderRepoLock(ticket, slotId, prUrl, passId, epoch));
  }

  private async publishReviewUnderRepoLock(
    ticket: Ticket,
    slotId: number,
    prUrl: string,
    passId: string,
    epoch: number,
  ): Promise<{ ok: boolean; result: string }> {
    const slot = this.store.getSlot(slotId);
    if ((this.reviewEpochs.get(ticket.id) ?? 0) !== epoch || slot?.ticketId !== ticket.id) {
      return { ok: false, result: "Publication annulée : le slot de review a été libéré." };
    }
    const currentPass = this.store.getReviewPass(ticket.id);
    if (!currentPass || currentPass.passId !== passId) {
      return { ok: false, result: "Publication annulée : une nouvelle passe a remplacé celle-ci." };
    }
    const report = this.reviewReport(ticket.id);
    if (report === null) return { ok: false, result: "Publication refusée : résultats de review incomplets." };
    const reviewedCommitSha = currentPass.reviewedCommitSha;
    if (reviewedCommitSha === null) {
      return {
        ok: false,
        result: "Cette ancienne passe n'a pas de SHA revu vérifiable. Lance une nouvelle passe complète avant publication.",
      };
    }
    if (!this.store.bindReviewPassCommit(ticket.id, passId, reviewedCommitSha)) {
      return { ok: false, result: "Publication annulée : la passe courante a changé. Lance une nouvelle passe complète." };
    }
    const entries = passDimensionFindings(this.store.getReviewPass(ticket.id)) ?? [];
    const findings = keptFindings(entries);
    const refutedCount = entries.filter((entry) =>
      entry.finding.verificationStatus !== "rejected" && isSelfRefuting(entry.finding)).length;
    const comments = findings.flatMap((finding) => {
      if (finding.path === null || finding.line === null) return [];
      return [{
        path: finding.path,
        line: finding.line,
        body: renderFinding(finding),
      }];
    });
    const event = reviewPublicationEvent(findings);
    const marker = `<!-- kanban-review-pass:${passId} -->`;
    const published = await this.system.publishReview(slotPath(slotId), prUrl, {
      expectedCommitSha: reviewedCommitSha,
      marker,
      body: report,
      comments,
      event,
    });
    if (!published.ok || published.reviewId === null) return { ok: false, result: `Publication refusée : ${published.reason}` };
    if (!this.store.recordReviewPublication({
      ticketId: ticket.id,
      passId,
      reviewId: published.reviewId,
      commitSha: reviewedCommitSha,
    })) {
      return {
        ok: false,
        result: "La review a été publiée, mais son accusé n'a pas pu être persisté. Rappelle publish_review pour le récupérer.",
      };
    }
    this.store.logEvent(ticket.id, "review_published", {
      passId,
      reviewId: published.reviewId,
      commitSha: reviewedCommitSha,
    });
    const refutedNote = refutedCount === 0 ? "" : ` (${refutedCount} finding(s) auto-réfuté(s) ignoré(s))`;
    return {
      ok: true,
      result: `Review publiée sur le commit ${reviewedCommitSha}${refutedNote}. Appelle maintenant done().`,
    };
  }

  /** Number of implementation lots running or being prepared for this ticket. */
  private lotCount(ticketId: string): number {
    const running = this.active.get(ticketId)?.size ?? 0;
    const prefix = `${ticketId}:`;
    let starting = 0;
    for (const key of this.startingImplementations) {
      if (key.startsWith(prefix)) starting += 1;
    }
    return running + starting;
  }

  private hasLot(ticketId: string, label: string): boolean {
    return this.active.get(ticketId)?.has(label) === true || this.startingImplementations.has(`${ticketId}:${label}`);
  }

  /** Spawn one bare Codex child lot in the ticket's slot worktree and hand it the plan. Non-blocking. */
  async start(ticket: Ticket, slotId: number, plan: string, label: string): Promise<{ ok: boolean; result: string }> {
    if (this.hasLot(ticket.id, label)) {
      return { ok: false, result: `Le lot «${label}» est déjà en cours : attends son événement implementation_done.` };
    }
    if (this.lotCount(ticket.id) >= MAX_PARALLEL_IMPLEMENTERS) {
      return {
        ok: false,
        result: `Limite de ${MAX_PARALLEL_IMPLEMENTERS} lots d'implémentation en parallèle atteinte pour ce ticket : attends les événements implementation_done en cours avant d'en lancer un autre.`,
      };
    }
    const epoch = this.reviewEpochs.get(ticket.id) ?? 0;
    const startingKey = `${ticket.id}:${label}`;
    this.startingImplementations.add(startingKey);
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
      this.startingImplementations.delete(startingKey);
      const message = error instanceof Error ? error.message : String(error);
      return { ok: false, result: `Impossible de lancer la délégation : ${message}` };
    }
    this.startingImplementations.delete(startingKey);
    if ((this.reviewEpochs.get(ticket.id) ?? 0) !== epoch) {
      return { ok: false, result: "Délégation annulée pendant sa préparation." };
    }
    const generationKey = `${ticket.id}:implementation`;
    const generation = (this.generations.get(generationKey) ?? 0) + 1;
    this.generations.set(generationKey, generation);
    const generationId = nanoid(16);
    const state: ActiveDelegation = {
      label,
      handle: null,
      generationId,
      usageByModel: {},
      sessionId: null,
      lastAssistantText: "",
      lastError: "",
      lastHeartbeatAt: Date.now(),
      settled: false,
    };
    const lots = this.active.get(ticket.id) ?? new Map<string, ActiveDelegation>();
    lots.set(label, state);
    this.active.set(ticket.id, lots);
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
      this.removeLot(ticket.id, label, state);
      const message = error instanceof Error ? error.message : String(error);
      if (executionStarted) this.closeAndFinalize(state, "failed", message);
      return { ok: false, result: `Impossible de lancer la délégation : ${message}` };
    }
    this.store.logEvent(ticket.id, "delegation_started", { model: knobs.model, effort: knobs.effort, label });
    this.sessionHub.appendExternalLine(
      ticket.id,
      `${childTranscriptPrefix(label)}—— délégation Codex lancée (${knobs.model}) ——`,
    );
    log.info("délégation lancée", { ticketId: ticket.id, slotId, model: knobs.model, label });
    return {
      ok: true,
      result: `Délégation du lot «${label}» lancée : une session Codex implémente ce plan en arrière-plan dans le worktree courant. Termine ton tour MAINTENANT ; tu recevras un événement implementation_done par lot lancé.`,
    };
  }

  /** Drop one lot entry (and the ticket map once empty) if it is still the current one. */
  private removeLot(ticketId: string, label: string, state: ActiveDelegation): void {
    const lots = this.active.get(ticketId);
    if (!lots || lots.get(label) !== state) return;
    lots.delete(label);
    if (lots.size === 0) this.active.delete(ticketId);
  }

  /** Serialize starts per ticket so concurrent tool calls join one persisted review pass. */
  async startReview(
    ticket: Ticket,
    slotId: number,
    kind: ReviewKind,
    context: string,
  ): Promise<{ ok: boolean; result: string }> {
    const startId = nanoid(8);
    const startedAt = Date.now();
    const epoch = this.reviewEpochs.get(ticket.id) ?? 0;
    const previous = this.reviewStartQueues.get(ticket.id) ?? Promise.resolve();
    const queuedBehindAnotherStart = this.reviewStartQueues.has(ticket.id);
    log.info("review mise en file de démarrage", { ticketId: ticket.id, kind, startId, queuedBehindAnotherStart });
    const queued = previous
      .catch(() => undefined)
      .then(() => {
        log.info("review sortie de la file de démarrage", {
          ticketId: ticket.id,
          kind,
          startId,
          queueWaitMs: Date.now() - startedAt,
        });
        return this.startReviewNow(ticket, slotId, kind, context, epoch, startId);
      });
    this.reviewStartQueues.set(ticket.id, queued);
    try {
      return await queued;
    } catch (error) {
      const reason = getErrorMessage(error);
      log.error("démarrage de review échoué", {
        ticketId: ticket.id,
        kind,
        startId,
        elapsedMs: Date.now() - startedAt,
        errorName: error instanceof Error ? error.name : "unknown",
      });
      return { ok: false, result: `Impossible de lancer la review ${kind} : ${reason}` };
    } finally {
      const elapsedMs = Date.now() - startedAt;
      const timing = { ticketId: ticket.id, kind, startId, elapsedMs };
      if (elapsedMs >= SLOW_REVIEW_START_WARN_MS) log.warn("démarrage de review LENT", timing);
      else log.info("démarrage de review", timing);
      if (this.reviewStartQueues.get(ticket.id) === queued) this.reviewStartQueues.delete(ticket.id);
    }
  }

  /** Pass id whose reviewer for this kind already rendered a verdict, or null (retry-safe delegate_review). */
  private completedInCurrentPass(ticketId: string, kind: ReviewKind): string | null {
    const activePass = this.activeReviewPasses.get(ticketId);
    if (!activePass) return null;
    const persisted = this.store.getReviewPass(ticketId);
    if (!persisted || persisted.passId !== activePass.passId) return null;
    return persisted.results[kind]?.status === "completed" ? activePass.passId : null;
  }

  /** Hash the worktree for a review pass, logging how long it took (the call dominates a slow start). */
  private async timedCodeFingerprint(cwd: string, ticketId: string, kind: ReviewKind, startId: string): Promise<string> {
    const startedAt = Date.now();
    log.info("calcul de l'empreinte démarré", { ticketId, kind, startId });
    const slowTimer = setTimeout(() => {
      log.warn("calcul de l'empreinte toujours en cours", {
        ticketId,
        kind,
        startId,
        elapsedMs: Date.now() - startedAt,
      });
    }, SLOW_FINGERPRINT_WARN_MS);
    try {
      return await this.system.codeFingerprint(cwd);
    } finally {
      clearTimeout(slowTimer);
      const elapsedMs = Date.now() - startedAt;
      const timing = { ticketId, kind, startId, elapsedMs };
      if (elapsedMs >= SLOW_FINGERPRINT_WARN_MS) log.warn("empreinte du code LENTE", timing);
      else log.info("empreinte du code calculée", timing);
    }
  }

  /**
   * Resolve the review pass the reviewer joins, recomputing the worktree fingerprint only when the
   * pass has none fresh enough — the mid-pass code-change guard stays meaningful, at one hash per
   * FINGERPRINT_REUSE_WINDOW_MS instead of one per delegate_review call.
   */
  private async resolveReviewPass(
    ticket: Ticket,
    slotId: number,
    cwd: string,
    kind: ReviewKind,
    depth: "light" | "full",
    epoch: number,
    requestedExecution: ResolvedExecution,
    startId: string,
  ): Promise<{ ok: true; pass: ActiveReviewPass } | { ok: false; result: string }> {
    const cached = this.activeReviewPasses.get(ticket.id);
    if (cached && cached.depth === depth && Date.now() - cached.fingerprintComputedAt < FINGERPRINT_REUSE_WINDOW_MS) {
      return { ok: true, pass: cached };
    }
    const requiresApproval = ticket.kind !== "review" || (ticket.fixComments && ticket.prHeadBranch !== null);
    let reviewedCommitSha = cached?.reviewedCommitSha ?? null;
    if (!cached && ticket.kind === "review") {
      if (!isProjectKey(ticket.project) || ticket.prUrl === null || ticket.prNumber === null) {
        return { ok: false, result: `Impossible de préparer la review ${kind} : identité de PR incomplète.` };
      }
      const repoPath = getProject(ticket.project).repoPath;
      const prUrl = ticket.prUrl;
      const prNumber = ticket.prNumber;
      const prepared = await this.repoMutex.run(repoPath, async () => {
        const slot = this.store.getSlot(slotId);
        if ((this.reviewEpochs.get(ticket.id) ?? 0) !== epoch || slot?.ticketId !== ticket.id) {
          return { ok: false, reason: "slot de review libéré pendant la préparation", commitSha: null };
        }
        if (requiresApproval) return this.system.readReviewHead(cwd, prUrl);
        return this.system.prepareReviewWorktree({
          repoPath,
          slotPath: cwd,
          prUrl,
          prNumber,
        });
      });
      if (!prepared.ok || prepared.commitSha === null) {
        return { ok: false, result: `Impossible de préparer la review ${kind} : ${prepared.reason}` };
      }
      reviewedCommitSha = prepared.commitSha;
    }
    let codeFingerprint: string;
    try {
      codeFingerprint = await this.timedCodeFingerprint(cwd, ticket.id, kind, startId);
    } catch (error) {
      return { ok: false, result: `Impossible de lancer la review ${kind} : ${getErrorMessage(error)}` };
    }
    const computedAt = Date.now();
    if ((this.reviewEpochs.get(ticket.id) ?? 0) !== epoch) {
      return { ok: false, result: "Passe de review annulée pendant sa préparation." };
    }
    const reviewPass = this.activeReviewPasses.get(ticket.id);
    if (reviewPass && (reviewPass.codeFingerprint !== codeFingerprint || reviewPass.depth !== depth)) {
      return {
        ok: false,
        result: "Le code ou la profondeur a changé pendant la passe de review. Attends sa fin puis relance tous les reviewers.",
      };
    }
    if (reviewPass) {
      reviewPass.fingerprintComputedAt = computedAt;
      return { ok: true, pass: reviewPass };
    }
    try {
      await assertExecutionAvailable(this.system, requestedExecution);
    } catch (error) {
      return { ok: false, result: `Impossible de lancer la review ${kind} : ${getErrorMessage(error)}` };
    }
    if ((this.reviewEpochs.get(ticket.id) ?? 0) !== epoch) {
      return { ok: false, result: "Passe de review annulée pendant sa préparation." };
    }
    const created: ActiveReviewPass = {
      passId: nanoid(16),
      codeFingerprint,
      reviewedCommitSha,
      fingerprintComputedAt: computedAt,
      depth,
      execution: requestedExecution,
    };
    this.store.beginReviewPass({
      ticketId: ticket.id,
      passId: created.passId,
      codeFingerprint,
      reviewedCommitSha,
      reviewDepth: depth,
      requiresApproval,
    });
    this.activeReviewPasses.set(ticket.id, created);
    return { ok: true, pass: created };
  }

  /** Start one bounded, fresh-context reviewer session within the ticket's current review pass. */
  private async startReviewNow(
    ticket: Ticket,
    slotId: number,
    kind: ReviewKind,
    context: string,
    epoch: number,
    startId: string,
  ): Promise<{ ok: boolean; result: string }> {
    if ((this.reviewEpochs.get(ticket.id) ?? 0) !== epoch) {
      return { ok: false, result: "Passe de review annulée avant son lancement." };
    }
    if (this.hasActiveImplementations(ticket.id)) {
      return {
        ok: false,
        result: "Des lots d'implémentation sont encore en cours : attends tous les événements implementation_done avant de lancer la review.",
      };
    }
    const key = reviewKey(ticket.id, kind);
    if (this.activeReviews.has(key)) {
      return { ok: false, result: `La review ${kind} est déjà en cours.` };
    }
    const completed = this.completedInCurrentPass(ticket.id, kind);
    if (completed !== null) {
      return {
        ok: true,
        result: `La review ${kind} est déjà rendue dans la passe ${completed} : relis son verdict avec read_review_results, ne la relance pas.`,
      };
    }
    const parentExecution = this.sessionHub.getExecutionConfig(ticket.id);
    const requestedExecution: ResolvedExecution = parentExecution
      ? { ...parentExecution, role: "reviewer" }
      : resolveTicketExecution(ticket, "reviewer", {
          model: ticket.model ?? "sonnet",
          effort: ticket.effort ?? "low",
        });
    const cwd = slotPath(slotId);
    const depth = ticket.reviewDepth ?? "light";
    const resolved = await this.resolveReviewPass(ticket, slotId, cwd, kind, depth, epoch, requestedExecution, startId);
    if (!resolved.ok) return { ok: false, result: resolved.result };
    const reviewPass = resolved.pass;
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
      languageRetries: 0,
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
        blockTypecheck: true,
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
    // NOTE(ali): drop the lots still being prepared too, otherwise a relaunched session is refused
    // with "déjà en cours"; the in-flight start bails on its epoch check and its delete is a no-op.
    const startingPrefix = `${ticketId}:`;
    for (const key of this.startingImplementations) {
      if (key.startsWith(startingPrefix)) this.startingImplementations.delete(key);
    }
    const lots = this.active.get(ticketId);
    if (lots) {
      this.active.delete(ticketId);
      for (const state of lots.values()) {
        void state.handle?.interrupt().catch((error: unknown) => {
          log.warn("interruption de session enfant impossible", { ticketId, reason: String(error) });
        });
        this.closeAndFinalize(state, "cancelled", null);
        this.store.logEvent(ticketId, "delegation_killed", { label: state.label });
        log.info("délégation tuée (cascade parent)", { ticketId, label: state.label });
      }
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
    if (reviewProseIsFrench(parsed.data)) {
      if (state.languageRetries < MAX_LANGUAGE_RETRIES) {
        state.languageRetries += 1;
        return {
          ok: false,
          result: "Re-emit the same JSON with all prose in English (repository strings may stay verbatim inside backticks).",
        };
      }
      log.warn("review acceptée en français après relance", { ticketId: state.ticketId, kind: state.kind });
    }
    state.result = parsed.data;
    return { ok: true, result: "Review enregistrée. Termine le tour." };
  }

  /**
   * Attach the provider session to its execution row without letting a failed write (locked SQLite,
   * vanished row) escape into the provider's stream loop and kill the child session.
   */
  private attachChildSession(
    generationId: string,
    event: Extract<AgentSessionEvent, { type: "init" }>,
    context: Record<string, unknown>,
  ): void {
    try {
      this.store.attachExecutionSession({
        generationId,
        sessionId: event.sessionId,
        configuredServiceTier: event.configuredServiceTier ?? null,
      });
    } catch (error) {
      log.error("rattachement de session enfant impossible", { ...context, generationId, reason: String(error) });
    }
  }

  private handleReviewEvent(state: ActiveReview, event: AgentSessionEvent): void {
    const current = this.activeReviews.get(reviewKey(state.ticketId, state.kind)) === state;
    if (event.type === "init") {
      state.sessionId = event.sessionId;
      this.attachChildSession(state.generationId, event, { ticketId: state.ticketId, kind: state.kind });
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
        const recorded = this.persistReviewResult(state, state.result, "not_needed");
        if (recorded) this.deliverReviewResult(state, true, state.result, "");
        else this.deliverReviewResult(state, false, null, EMPTY_REVIEW_FAILURE);
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
      const recorded = this.persistReviewResult(state, result, "verified", persistedFindings);
      if (recorded) this.deliverReviewResult(state, true, result, "");
      else this.deliverReviewResult(state, false, null, EMPTY_REVIEW_FAILURE);
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

  /**
   * A completed dimension MUST carry a verdict and a summary: a blank one silently publishes an
   * empty review round. Anything short of that is persisted as an explicit failure instead.
   */
  private persistReviewResult(
    state: ActiveReview,
    result: ReviewResult,
    verificationStatus: "not_needed" | "verified",
    persistedFindings = result.findings,
  ): boolean {
    if (result.summary.trim().length === 0) {
      const failure = EMPTY_REVIEW_FAILURE;
      this.store.recordReviewResult({
        ticketId: state.ticketId,
        passId: state.passId,
        kind: state.kind,
        status: "failed",
        verdict: null,
        summary: failure,
        findings: dedupeIdenticalFindings(persistedFindings),
        verificationStatus: "failed",
        error: failure,
      });
      log.warn("résultat de review vide refusé", { ticketId: state.ticketId, kind: state.kind });
      return false;
    }
    this.store.recordReviewResult({
      ticketId: state.ticketId,
      passId: state.passId,
      kind: state.kind,
      status: "completed",
      verdict: result.verdict,
      summary: result.summary,
      findings: dedupeIdenticalFindings(persistedFindings),
      verificationStatus,
      error: null,
    });
    return true;
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
      languageRetries: 0,
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
        blockTypecheck: true,
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
    if (!delivered) {
      log.warn("résultat de review non délivré à la session parente", {
        ticketId: state.ticketId,
        kind: state.kind,
        passId: state.passId,
      });
    }
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
    const current = this.active.get(ticketId)?.get(state.label) === state;
    if (event.type === "init") {
      state.sessionId = event.sessionId;
      this.attachChildSession(state.generationId, event, { ticketId, label: state.label });
    }
    if (event.type === "turn_end") {
      state.usageByModel = mergeAgentUsageByModel(state.usageByModel, event.usageByModel);
    }
    if (!current) return;
    if (event.type === "assistant_text" && event.text.trim()) state.lastAssistantText = event.text.trim();
    if (event.type === "error") state.lastError = event.message;
    this.sessionHub.appendExternalEvent(ticketId, state.generationId, event, childTranscriptPrefix(state.label));
    this.heartbeat(ticketId, state);
    if (event.type === "turn_end" && !state.settled) {
      state.settled = true;
      this.recordUsage(ticketId, state, event.sessionId, event.usageByModel);
      const ok = event.ok;
      setTimeout(() => this.settle(ticketId, state, ok), SETTLE_DELAY_MS);
    }
  }

  /** One lot's single turn ended: tear it down and resume the parent via implementation_done. */
  private settle(ticketId: string, state: ActiveDelegation, ok: boolean): void {
    if (this.active.get(ticketId)?.get(state.label) !== state) return;
    // NOTE(ali): the lot stays registered until sendEvent returns so the coordinator's onStop gate
    // still sees the ticket as active while the parent ends the turn woken by a previous lot.
    const remaining = this.lotCount(ticketId) - 1;
    const summary = ok
      ? state.lastAssistantText
      : state.lastError || state.lastAssistantText || "la session Codex s'est terminée en erreur sans détail";
    const delivered = this.sessionHub.sendEvent(ticketId, {
      type: "implementation_done",
      ok,
      summary,
      label: state.label,
      remaining,
    });
    this.removeLot(ticketId, state.label, state);
    this.store.logEvent(ticketId, "delegation_done", { ok, delivered, label: state.label, remaining });
    this.closeAndFinalize(state, ok ? "completed" : "failed", ok ? null : summary);
    log.info("délégation terminée", { ticketId, ok, delivered, label: state.label, remaining });
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
    const key = turnSessionId || state.sessionId || `delegation-${ticketId}-${state.label}`;
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
