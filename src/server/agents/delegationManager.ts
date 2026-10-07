import { posix } from "node:path";

import { nanoid } from "nanoid";
import { z } from "zod";

import { DELEGATION_SLOT_ID, MAX_GLOBAL_IMPLEMENTERS, MAX_PARALLEL_IMPLEMENTERS, TERMINAL_STAGES } from "../../shared/constants.ts";
import type { Orchestrator } from "../../shared/constants.ts";
import type { CommitLanguage } from "../../shared/constants.ts";
import { getErrorMessage } from "../../shared/errors.ts";
import type { Ticket } from "../../shared/schemas.ts";
import { submitReviewArgsSchema } from "../../shared/schemas.ts";
import { reviewFindingSeveritySchema, reviewKindSchema } from "../../shared/protocol.ts";
import type { ReviewFinding, ReviewKind, recoverImplementationPlanArgsSchema, submitImplementationPlanArgsSchema } from "../../shared/protocol.ts";
import type { ImplementationPlan, ImplementationPlanLot, ImplementationRecovery } from "../../shared/implementationPlan.ts";

import type { PersistedReviewResult, ReviewPass, Store } from "../db/store.ts";
import { getProject, isProjectKey, MODELS, projectVcsProvider } from "../config.ts";
import type { ClientHub } from "../hub.ts";
import { createLogger } from "../logger.ts";
import { KeyedMutex } from "../mutex.ts";
import type { AgentSessionEvent, AgentSessionHandle, AgentTurnUsage } from "../system/agentSession.ts";
import { renderCollapsedDetails } from "../system/reviewMarkdown.ts";
import { implementationFailureDiagnostic } from "../system/delegationWorkspace.ts";
import { REVIEW_PUBLICATION_STATE_BY_EVENT } from "../system/types.ts";
import type { CodeSnapshot, ImplementationLotOptions, SystemAdapter } from "../system/types.ts";

import {
  DEFAULT_FINDING_RENDER_STYLE,
  dedupeIdenticalFindings,
  isSelfRefuting,
  keptFindings,
  reviewProseIsFrench,
  reviewPublicationEvent,
  type FindingRenderStyle,
} from "./reviewFindings.ts";
import { allowedReviewPasses, passDimensionFindings, publishedReviewFindings, requiredReviewKinds } from "./reviewPass.ts";
import { resolveBaseBranch } from "./baseBranch.ts";
import { codexImplementerKnobs, delegatedImplementerPermissions } from "./sessionConfig.ts";
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
const GLOB_CHARACTERS = "*?[]{}";
const MAX_CHANGED_PATHS = 30;
const MAX_INFRASTRUCTURE_ATTEMPTS = 2;
const MAX_IMPLEMENTATION_ATTEMPTS = 2;
const RECOVERY_ASSESSMENT_TIMEOUT_MS = 300_000;
const recoveryCoverageSchema = z.object({
  coverage: z.array(z.object({ label: z.string().min(1), covered: z.boolean(), evidence: z.string().trim().min(1) })),
});
const { $schema: _coverageSchemaDraft, ...RECOVERY_COVERAGE_OUTPUT_SCHEMA } = z.toJSONSchema(recoveryCoverageSchema, { io: "output" });

/** Transcript prefix marking lines produced by one delegated child lot (vs the parent session). */
function childTranscriptPrefix(label: string, provider: Orchestrator): string {
  return `⟨${provider}:${label}⟩ `;
}

function normalizeImplementationScope(files: readonly string[]): string[] | null {
  const normalized: string[] = [];
  for (const file of files) {
    const path = file.trim();
    const segments = path.split("/");
    if (
      path === "" || posix.isAbsolute(path) || path.includes("\\")
      || /\p{Cc}/u.test(path)
      || [...path].some((character) => GLOB_CHARACTERS.includes(character))
      || segments.some((segment) => segment === "" || segment === "." || segment === ".." || segment === ".git")
      || /^[a-z]:/iu.test(segments[0] ?? "")
      || posix.normalize(path) !== path
    ) return null;
    normalized.push(path);
  }
  return [...new Set(normalized)].sort();
}

function implementationScopesOverlap(left: readonly string[], right: readonly string[]): boolean {
  if (left.length === 0 || right.length === 0) return true;
  return left.some((file) => right.some((otherFile) => {
    const first = file.toLowerCase();
    const second = otherFile.toLowerCase();
    return first === second || first.startsWith(`${second}/`) || second.startsWith(`${first}/`);
  }));
}

const CHILD_FRAMING = `Tu es la session d'implémentation déléguée. Ton unique rôle est d'écrire le code décrit dans le plan ci-dessous, intégralement, dans le répertoire de travail courant (le worktree).

Consignes :
- Travaille uniquement dans le worktree courant. Ne touche à aucun fichier en dehors.
- Si le plan précise un périmètre de fichiers, reste strictement dedans : d'autres lots d'implémentation tournent peut-être en parallèle, ne touche jamais à leurs fichiers.
- Respecte les conventions de code du projet.
- Ne commit JAMAIS, ne push JAMAIS, n'ouvre JAMAIS de PR : la session orchestratrice garde la main sur git, la review, les tests et la PR.
- Exécute les commandes directement depuis le worktree courant, sans préfixe cd, env ou rtk. Utilise pnpm directement ou corepack pnpm si le projet le nécessite. Un refus d'une commande composée ne signifie pas que ses commandes individuelles sont interdites.
- Les conventions du projet ne changent pas les permissions de cette session : une recommandation d'utiliser un wrapper ne l'autorise pas. Utilise la commande directe équivalente autorisée.
- Les validations finales et la publication appartiennent à l'orchestrateur : leur absence n'est pas un échec de ton lot. Ne demande pas d'élargir tes permissions ni de relancer ta session pour ces étapes.
- Si une commande nécessaire à l'écriture du code est refusée, rapporte la commande exacte et le motif dans ton bilan, sans conclure que tout Bash est interdit.
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
  reservationId: string;
  planId: string | null;
  durableWorkspace: boolean;
  consumesCodeAttempt: boolean;
  label: string;
  provider: Orchestrator;
  files: readonly string[];
  lotOptions: ImplementationLotOptions | null;
  cancelled: boolean;
  preserveWorkspace: boolean;
  childClosed: boolean;
  settlement: Promise<void> | null;
  handle: AgentSessionHandle | null;
  generationId: string;
  usageByModel: Record<string, AgentTurnUsage>;
  sessionId: string | null;
  lastAssistantText: string;
  lastError: string;
  lastHeartbeatAt: number;
  settled: boolean;
}

interface QueuedImplementation {
  ticket: Ticket;
  slotId: number;
  plan: string;
  label: string;
  files: readonly string[];
}

interface ReviewResult {
  verdict: "approve" | "revise";
  summary: string;
  findings: ReviewFinding[];
}

// NOTE(ali): the Claude Code CLI validates `--json-schema` with a draft-07 validator and rejects the
// `$schema` draft 2020-12 URI zod emits, so it is stripped before being handed to the session.
const { $schema: _reviewSchemaDraft, ...REVIEW_OUTPUT_SCHEMA } = z.toJSONSchema(submitReviewArgsSchema, {
  io: "output",
});

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
  fileHashes: Record<string, string> | null;
  reviewedCommitSha: string | null;
  fingerprintComputedAt: number;
  depth: "light" | "full";
  execution: ResolvedExecution;
}

type ReviewGateRequirement = "approved" | "approved_or_limit" | "completed";

type ReviewGateResult =
  | { ok: true; passId: string; acceptedWithFindings: boolean }
  | { ok: false; reason: string; reasonCode: "code_changed" | "fingerprint_error" | "fingerprint_timeout" | "incomplete_review" | "missing_review" | "incomplete_implementation" };

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

/** Resolved per-ticket reviewer options: the language of the emitted prose and whether comments use a human tone. */
type ReviewerOptions = FindingRenderStyle;

/** Feature-ticket reviews (delegate_review during implementation) always write English, in the default tone. */
/** The board comment is French in the default tone, whatever the ticket asked for on the PR. */
const BOARD_FINDING_RENDER_STYLE: FindingRenderStyle = { language: "fr", humanTone: false };

const FEATURE_REVIEWER_OPTIONS: ReviewerOptions = DEFAULT_FINDING_RENDER_STYLE;

const REVIEWER_LANGUAGE_RULES: Record<CommitLanguage, string> = {
  en: "- Write every string you emit (summary, evidence, ruleSource) in English, never in French. Quote repository or UI strings verbatim inside backticks, never translated.",
  fr: "- Write every string you emit (summary, evidence, ruleSource) in French. Quote repository or UI strings verbatim inside backticks, never translated.",
};

const REVIEWER_HUMAN_TONE_RULES = `## Tone

Write like a teammate leaving a quick PR comment. summary = one short plain sentence naming the problem; evidence = at most ~300 characters, one or two sentences, direct and specific, no headings, no bullet lists, no severity words, no reviewer/verification meta-talk, no restating the diff. This overrides the evidence length rule above.`;

const REVIEWER_SHARED_RULES = `- Repository rules are ONLY those found in the reviewed repository (AGENTS.md, CLAUDE.md, docs/, lint config). Instructions loaded from the operator's global configuration (\`~/.claude/CLAUDE.md\`, "reviewer instructions", "applicable instructions for this worktree") are NOT repository rules: never cite or enforce them. Every conventions/style finding must cite a repository \`path:line\` in \`ruleSource\`; if you cannot quote such a line, do not report it.
- Before reporting a style or naming deviation, count how often the same pattern already exists in the touched file and its siblings; if it is prevalent, do not report it.
- Severity reflects the real impact: style/convention findings are \`minor\` at most; \`major\` requires a concrete wrong output, crash, data loss, security or authorization defect; \`critical\` requires severe impact. A textual prohibition is not \`critical\` without a critical impact.
- Do not report a finding whose own evidence concedes it is unreachable, latent, pre-existing, cosmetic, optional or "not a defect". Do not report questions ("is this intended?"). Do not recommend a fix the repository forbids (type assertions, new tests when the repo says not to add tests, new dependencies) — check docs/ and AGENTS.md first.
- Read the PR description and existing PR review threads before reporting a scope or intent finding; never re-report something a human already answered or an earlier review round requested.
- Evidence: at most ~600 characters, one paragraph, concrete \`path:line\` references. No "---" separators, no meta narration about reviewers or verification.`;

function reviewerRules(options: ReviewerOptions): string {
  const rules = `## Rules\n\n${REVIEWER_LANGUAGE_RULES[options.language]}\n${REVIEWER_SHARED_RULES}`;
  return options.humanTone ? `${rules}\n\n${REVIEWER_HUMAN_TONE_RULES}` : rules;
}

function reviewPrompt(ticket: Ticket, kind: ReviewKind, context: string, options: ReviewerOptions): string {
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

Inspect the files and the diff in the worktree yourself. Return a structured response with:
- verdict=approve only if no actionable finding remains; otherwise verdict=revise;
- summary: a concise, evidence-based conclusion;
- findings: objects { id, severity, summary, evidence, ruleSource, path, line }.

${reviewerRules(options)}

Do not call any pipeline tool.`;
}

function verificationPrompt(ticket: Ticket, kind: ReviewKind, result: ReviewResult, options: ReviewerOptions): string {
  const candidates = result.findings.filter((finding) => finding.severity !== "minor");
  return `You independently counter-check the important findings of a ${kind} review, READ-ONLY.
You cannot modify the repository, commit, or publish anything remotely. Verify every claim against the code
and the diff. Deduplicate, reject unproven conclusions, and downgrade the severity of a finding whose claimed
impact does not match its evidence.

Ticket: ${ticket.title}
Candidate findings: ${JSON.stringify(candidates)}

${reviewerRules(options)}

Return the confirmed findings only. Use verdict=revise if any remains, approve otherwise.
State briefly in the summary which findings you rejected or downgraded. Do not call any pipeline tool.`;
}

/**
 * Inline comment body: GitHub already renders the `path:line` anchor, so it is not repeated here.
 * A provider whose threads do not show it (Azure DevOps) prepends it in its own client.
 */
function renderFinding(finding: ReviewFinding, humanTone: boolean): string {
  if (!humanTone) return `**${finding.severity.toUpperCase()}** — ${finding.summary}\n\n${finding.evidence}`;
  return finding.evidence ? `${finding.summary}\n\n${finding.evidence}` : finding.summary;
}

function renderCollapsedFinding(finding: ReviewFinding, humanTone: boolean): string {
  const location = finding.path ? `${finding.path}${finding.line ? `:${finding.line}` : ""}` : null;
  const prefix = [humanTone ? null : finding.severity.toUpperCase(), location].filter((part) => part !== null);
  const title = [...prefix, finding.summary].join(" — ");
  return renderCollapsedDetails(title, finding.evidence);
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

const REVIEW_REPORT_LABELS: Record<CommitLanguage, ReviewReportLabels> = {
  en: REVIEW_REPORT_LABELS_EN,
  fr: REVIEW_REPORT_LABELS_FR,
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
  private readonly startingImplementations = new Map<string, readonly string[]>();
  private readonly activeReviews = new Map<string, ActiveReview>();
  private readonly activeReviewPasses = new Map<string, ActiveReviewPass>();
  private readonly reviewStartQueues = new Map<string, Promise<unknown>>();
  private readonly reviewEpochs = new Map<string, number>();
  private readonly generations = new Map<string, number>();
  private readonly closingExecutions = new Set<Promise<void>>();
  private readonly closingByTicket = new Map<string, Set<Promise<void>>>();
  private readonly implementationReservations = new Set<string>();
  private readonly implementationPlans = new Map<string, number>();
  private readonly recoveringImplementations = new Set<string>();
  private readonly queuedImplementations = new Map<string, QueuedImplementation>();
  private readonly implementationResumes = new Map<string, Promise<void>>();
  private implementationScheduling = false;
  private implementationScheduleQueued = false;
  private readonly recoveryOperations = new Map<string, Promise<{ ok: boolean; result: string }>>();
  private readonly recoveryAssessments = new Map<string, ClosableExecution>();
  private readonly unclosedWriters = new Set<string>();
  private readonly writerOwners = new Map<string, string>();
  private readonly integratingTickets = new Set<string>();

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
    if (this.hasActiveImplementations(ticketId)) return true;
    return [...this.activeReviews.values()].some((review) => review.ticketId === ticketId);
  }

  /** True while at least one implementation lot of this ticket runs or is being prepared. */
  hasActiveImplementations(ticketId: string): boolean {
    return this.lotCount(ticketId) > 0 || this.pendingPlanLots(ticketId) > 0 || this.integratingTickets.has(ticketId);
  }

  private hasImplementationWriters(ticketId: string): boolean {
    return (this.active.get(ticketId)?.size ?? 0) > 0
      || [...this.startingImplementations.keys()].some((key) => key.startsWith(`${ticketId}:`))
      || (this.closingByTicket.get(ticketId)?.size ?? 0) > 0 || this.unclosedWriters.has(ticketId) || this.integratingTickets.has(ticketId);
  }

  private saveRecovery(ticketId: string, recovery: ImplementationRecovery): void {
    const plan = this.store.getImplementationPlan(ticketId);
    if (!plan || plan.recovery?.generation !== recovery.generation) throw new Error("Recovery generation changed.");
    this.store.saveImplementationPlan(ticketId, { ...plan, recovery: { ...recovery, updatedAt: Date.now() }, updatedAt: Date.now() });
    const ticket = this.store.getTicket(ticketId);
    if (ticket) this.hub.pushTicket(ticket);
  }

  private ownsRecovery(ticketId: string, slotId: number, generation: string, epoch = this.reviewEpochs.get(ticketId) ?? 0): boolean {
    const ticket = this.store.getTicket(ticketId);
    const recovery = this.store.getImplementationPlan(ticketId)?.recovery;
    return ticket?.kind === "feature" && !ticket.archived && !ticket.testing && !ticket.stealth && !ticket.directPush && ticket.column !== "abandoned"
      && ticket.slotId === slotId && this.store.getSlot(slotId)?.ticketId === ticketId
      && recovery?.generation === generation && recovery.slotId === slotId && (this.reviewEpochs.get(ticketId) ?? 0) === epoch;
  }

  recoverImplementationPlan(
    ticketId: string,
    slotId: number,
    args: z.infer<typeof recoverImplementationPlanArgsSchema>,
    actor: "user" | "agent",
  ): Promise<{ ok: boolean; result: string }> {
    const pending = this.recoveryOperations.get(ticketId);
    if (pending) return Promise.resolve({ ok: false, result: "An implementation recovery operation is already in progress. Refresh its persisted status." });
    const operation = this.recoverImplementationPlanNow(ticketId, slotId, args, actor).catch((error: unknown) => {
      const recovery = this.store.getImplementationPlan(ticketId)?.recovery;
      if (args.action === "takeover" && recovery?.status === "freezing" && this.ownsRecovery(ticketId, slotId, recovery.generation)) this.saveRecovery(ticketId, { ...recovery, diagnostic: getErrorMessage(error) });
      return { ok: false, result: getErrorMessage(error) };
    });
    this.recoveryOperations.set(ticketId, operation);
    void operation.finally(() => this.recoveryOperations.delete(ticketId));
    return operation;
  }

  private async recoverImplementationPlanNow(
    ticketId: string,
    slotId: number,
    args: z.infer<typeof recoverImplementationPlanArgsSchema>,
    actor: "user" | "agent",
  ): Promise<{ ok: boolean; result: string }> {
    const ticket = this.store.getTicket(ticketId);
    const plan = this.store.getImplementationPlan(ticketId);
    if (this.store.getActiveQualityIteration(ticketId)?.status === "verifying") return { ok: false, result: "Independent quality verification is running. Wait for its result before changing implementation recovery." };
    if (!ticket || ticket.archived || ticket.column === "abandoned" || ticket.testing || ticket.stealth || ticket.directPush || ticket.resolvingConflicts || ticket.kind !== "feature" || ticket.slotId !== slotId || this.store.getSlot(slotId)?.ticketId !== ticketId || !plan || !isProjectKey(ticket.project)) {
      return { ok: false, result: "Recovery requires a feature ticket owning its implementation plan and slot." };
    }
    if (args.generation && args.generation !== plan.recovery?.generation) return { ok: false, result: "Recovery generation changed. Refresh before continuing." };
    if (plan.recovery && plan.recovery.slotId !== slotId) return { ok: false, result: "Recovery belongs to a different slot allocation; preserve the current owner." };
    if (args.action === "retry_integration") return this.retryImplementationIntegration(ticket, slotId, plan, args.label);
    if (args.action === "finalize") return { ok: false, result: "Finalize recovery through the normal delivery coordinator." };
    if (args.action === "takeover") {
      if (plan.recovery && plan.recovery.status !== "freezing") return { ok: true, result: "The remaining plan is already owned by recovery. Read its obligations and assess the current candidate." };
      const obligations = plan.lots.filter((lot) => lot.status !== "completed").map(({ label, plan: requirement, files, dependsOn }) => ({ label, plan: requirement, files, dependsOn }));
      if (this.store.getImplementationQueue(ticketId).some((lot) => !plan.lots.some((entry) => entry.label === lot.label))) return { ok: false, result: "A queued implementation is outside this plan. Reconcile its original obligation before whole-plan takeover." };
      if (obligations.length === 0 && !plan.recovery) return { ok: false, result: "The implementation plan has no remaining obligations." };
      const now = Date.now();
      const recovery: ImplementationRecovery = plan.recovery ?? {
        generation: nanoid(16), actor, reason: args.reason, status: "freezing", slotId, obligations,
        candidate: null, coverage: [], assessmentExecutionId: null, archives: [], diagnostic: null,
        prUrl: args.prUrl ?? null, createdAt: now, updatedAt: now,
      };
      this.store.saveImplementationPlan(ticketId, { ...plan, recovery, updatedAt: now });
      this.stop(ticketId);
      const frozenEpoch = this.reviewEpochs.get(ticketId) ?? 0;
      await this.drainTicket(ticketId);
      if (this.hasImplementationWriters(ticketId)) throw new Error("A delegated writer has not stopped. Recovery keeps the slot and child work.");
      if (this.store.getTicket(ticketId)?.slotId !== slotId || this.store.getSlot(slotId)?.ticketId !== ticketId) throw new Error("Slot ownership changed during recovery.");
      const archives = await this.system.preserveImplementationRecovery({ slotPath: slotPath(slotId), repoPath: getProject(ticket.project).repoPath });
      if (!this.ownsRecovery(ticketId, slotId, recovery.generation, frozenEpoch) || this.store.getImplementationPlan(ticketId)?.recovery?.status !== "freezing" || this.hasImplementationWriters(ticketId)) throw new Error("Recovery ownership changed during preservation. Retained archives remain available; the plan is not resumed.");
      this.store.resetImplementationQueue(ticketId);
      this.saveRecovery(ticketId, { ...recovery, status: "pending", archives, diagnostic: null });
      this.store.logEvent(ticketId, "implementation_recovery_takeover", { generation: recovery.generation, actor, reason: args.reason, obligations, archives });
      this.sessionHub.sendEvent(ticketId, { type: "nudge", message: `Explicit recovery owns all remaining obligations: ${JSON.stringify(obligations)}. Complete them in the ticket worktree, preserve the existing PR ${recovery.prUrl ?? "when present"}, then call recover_implementation_plan action=assess. Run the required normal reviews and checks before done(). Do not delegate or replace this frozen plan.` });
      return { ok: true, result: "Remaining obligations are frozen, writers drained and child artifacts preserved. Complete the work and assess the clean candidate before normal delivery." };
    }
    const recovery = plan.recovery;
    if (!recovery || recovery.status === "freezing") return { ok: false, result: "Take over and preserve the remaining plan before assessing it." };
    if (this.system.dryRun) {
      const diagnostic = "Recovery coverage is inconclusive in dry-run: no real independent candidate inspection was performed.";
      this.saveRecovery(ticketId, { ...recovery, status: "pending", candidate: null, coverage: [], assessmentExecutionId: null, diagnostic });
      return { ok: false, result: diagnostic };
    }
    if (this.hasImplementationWriters(ticketId) || this.hasActiveReviews(ticketId)) return { ok: false, result: "Wait for delegated writers and reviewers to close before assessment." };
    const project = getProject(ticket.project);
    const assessmentEpoch = this.reviewEpochs.get(ticketId) ?? 0;
    const revision = await this.system.captureValidationRevision({ repoPath: project.repoPath, sourcePath: slotPath(slotId), ...(ticket.branch ? { branch: ticket.branch } : {}) });
    if (!revision.clean) return { ok: false, result: "Commit the recovered candidate before assessment; its worktree must be clean." };
    const candidate = { commitSha: revision.commitSha, fingerprint: (await this.system.codeSnapshot(slotPath(slotId))).fingerprint };
    if (!this.ownsRecovery(ticketId, slotId, recovery.generation, assessmentEpoch) || this.hasImplementationWriters(ticketId)) throw new Error("Recovery ownership changed while capturing the candidate.");
    const generationId = nanoid(16);
    this.saveRecovery(ticketId, { ...recovery, status: "assessing", candidate, coverage: [], assessmentExecutionId: generationId, diagnostic: null, prUrl: args.prUrl ?? recovery.prUrl });
    const execution = resolveTicketExecution(ticket, "reviewer", { model: ticket.model ?? "sonnet", effort: ticket.effort ?? "low" });
    const state: ClosableExecution = { handle: null, generationId, usageByModel: {} };
    this.recoveryAssessments.set(ticketId, state);
    this.store.startExecution({ id: generationId, ownerType: "ticket", ownerId: ticketId, generationId, sessionId: null, role: "reviewer", orchestrator: execution.provider, effectiveModel: execution.model, effectiveEffort: execution.effort, codexFast: execution.serviceTier === "fast" });
    let assessmentError = "The independent assessor returned no complete structured coverage evidence.";
    let coverageResult: z.infer<typeof recoveryCoverageSchema> | null = null;
    const readToolCalls = new Set<string>();
    const successfulReadToolCalls = new Set<string>();
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      await assertExecutionAvailable(this.system, execution);
      if (!this.ownsRecovery(ticketId, slotId, recovery.generation, assessmentEpoch) || this.recoveryAssessments.get(ticketId) !== state || this.hasImplementationWriters(ticketId)) throw new Error("Recovery ownership changed before independent assessor startup.");
      await new Promise<void>((resolve, reject) => {
        timer = setTimeout(() => reject(new Error("Independent recovery assessment timed out.")), RECOVERY_ASSESSMENT_TIMEOUT_MS);
        state.handle = this.system.startAgentSession({
          ticketId: `${ticketId}-recovery-${recovery.generation}`, slotId: DELEGATION_SLOT_ID, cwd: slotPath(slotId),
          provider: execution.provider, model: execution.model, effort: execution.effort, serviceTier: execution.serviceTier,
          role: "reviewer", generation: 1, permissionMode: "dontAsk", readOnly: true, blockTypecheck: true,
          allowedTools: REVIEW_TOOLS, disallowedTools: REVIEW_DISALLOWED_TOOLS, skills: [], disableWorkerTools: true,
          outputSchema: RECOVERY_COVERAGE_OUTPUT_SCHEMA,
          onToolCall: async () => ({ ok: false, result: "The recovery assessor has no pipeline tools." }),
          onEvent: (event) => {
            this.sessionHub.appendExternalEvent(ticketId, generationId, event, "⟨recovery coverage⟩ ");
            if (event.type === "init") this.attachChildSession(generationId, event, { ticketId, recoveryGeneration: recovery.generation });
            if (event.type === "error") assessmentError = event.message;
            if (event.type === "tool_use" && event.toolCallId && (REVIEW_TOOLS.includes(event.name) || event.name === "command_execution")) readToolCalls.add(event.toolCallId);
            if (event.type === "tool_result" && event.ok && readToolCalls.has(event.toolCallId)) successfulReadToolCalls.add(event.toolCallId);
            if (event.type === "turn_end") {
              state.usageByModel = mergeAgentUsageByModel(state.usageByModel, event.usageByModel);
              const parsed = recoveryCoverageSchema.safeParse(event.structuredOutput);
              if (event.ok && parsed.success) coverageResult = parsed.data;
              resolve();
            }
          },
        });
        state.handle.send(`You are an independent READ-ONLY recovery assessor. Inspect this exact clean candidate ${candidate.commitSha} and its actual code and diff. Assess every original remaining obligation, including blocked descendants. Return coverage with exactly one entry per obligation label, covered=true only when the implementation fulfills all requirements, and evidence with concrete inspected file/line references explaining the observed behavior. Missing, partial, unobservable or inconclusive work must have covered=false. Do not infer fulfillment from PR existence, filenames, orchestrator claims, normal review approval or review budget exhaustion. Do not change code or call pipeline tools.\nTicket: ${ticket.title}\nDescription: ${ticket.description}\nObligations: ${JSON.stringify(recovery.obligations)}`);
      });
      if (!await this.closeHandle(state)) throw new Error("The coverage assessor has not closed.");
      const assessed = recoveryCoverageSchema.safeParse(coverageResult);
      const current = this.store.getImplementationPlan(ticketId)?.recovery;
      if (current?.generation !== recovery.generation || current.status !== "assessing" || current.assessmentExecutionId !== generationId || this.store.getTicket(ticketId)?.slotId !== slotId || this.store.getSlot(slotId)?.ticketId !== ticketId) throw new Error("Recovery ownership or assessment changed.");
      const latestRevision = await this.system.captureValidationRevision({ repoPath: project.repoPath, sourcePath: slotPath(slotId), ...(ticket.branch ? { branch: ticket.branch } : {}) });
      const latestFingerprint = (await this.system.codeSnapshot(slotPath(slotId))).fingerprint;
      if (!latestRevision.clean || latestRevision.commitSha !== candidate.commitSha || latestFingerprint !== candidate.fingerprint) throw new Error("Candidate changed during recovery assessment. Assess it again.");
      const finalRecovery = this.store.getImplementationPlan(ticketId)?.recovery;
      if (finalRecovery?.generation !== recovery.generation || finalRecovery.status !== "assessing" || finalRecovery.assessmentExecutionId !== generationId
        || !this.ownsRecovery(ticketId, slotId, recovery.generation, assessmentEpoch) || this.hasImplementationWriters(ticketId)) throw new Error("Recovery ownership or assessment changed before coverage persistence.");
      const labels = new Set(assessed.success ? assessed.data.coverage.map((entry) => entry.label) : []);
      const complete = assessed.success && successfulReadToolCalls.size > 0 && labels.size === recovery.obligations.length && assessed.data.coverage.length === labels.size
        && recovery.obligations.every((obligation) => assessed.data.coverage.some((entry) => entry.label === obligation.label && entry.covered && /[^\s]+:\d+/.test(entry.evidence)));
      if (!complete) {
        this.saveRecovery(ticketId, { ...finalRecovery, status: "pending", coverage: assessed.success ? assessed.data.coverage : [], diagnostic: assessmentError });
        this.store.finalizeExecution({ generationId, status: "failed", usageByModel: state.usageByModel, error: assessmentError });
        return { ok: false, result: assessmentError };
      }
      this.saveRecovery(ticketId, { ...finalRecovery, status: "assessed", coverage: assessed.data.coverage, diagnostic: null });
      this.store.finalizeExecution({ generationId, status: "completed", usageByModel: state.usageByModel });
      this.store.logEvent(ticketId, "implementation_recovery_assessed", { generation: recovery.generation, generationId, candidate, coverage: assessed.data.coverage, successfulReadToolCalls: [...successfulReadToolCalls] });
      this.sessionHub.sendEvent(ticketId, { type: "nudge", message: "Independent coverage passed for every recovery obligation. Complete the current normal reviews and required checks, keep quality reservations, then deliver the exact assessed candidate using done() and the existing PR when supplied." });
      return { ok: true, result: "Every remaining obligation has affirmative independent coverage. Current normal reviews, checks and exact candidate delivery are still required." };
    } catch (error) {
      await this.closeHandle(state);
      const current = this.store.getImplementationPlan(ticketId)?.recovery;
      if (current?.generation === recovery.generation && current.assessmentExecutionId === generationId) this.saveRecovery(ticketId, { ...current, status: "pending", diagnostic: getErrorMessage(error) });
      this.store.finalizeExecution({ generationId, status: "failed", usageByModel: state.usageByModel, error: getErrorMessage(error) });
      throw error;
    } finally {
      if (timer) clearTimeout(timer);
      if (this.recoveryAssessments.get(ticketId) === state) this.recoveryAssessments.delete(ticketId);
    }
  }

  async verifyRecoveryDelivery(ticketId: string, slotId: number, prUrl: string): Promise<{ ok: boolean; result: string }> {
    const deliveryEpoch = this.reviewEpochs.get(ticketId) ?? 0;
    const plan = this.store.getImplementationPlan(ticketId);
    const recovery = plan?.recovery;
    if (!recovery) return { ok: true, result: "" };
    if (this.system.dryRun) return { ok: false, result: "Simulated recovery evidence cannot certify delivery of a real candidate." };
    const ticket = this.store.getTicket(ticketId);
    if (!plan || !ticket || this.recoveryOperations.has(ticketId) || !this.ownsRecovery(ticketId, slotId, recovery.generation) || !ticket.branch || !isProjectKey(ticket.project)
      || recovery.slotId !== slotId || !recovery.candidate || (recovery.status !== "assessed" && recovery.status !== "resolved") || this.hasImplementationWriters(ticketId) || this.recoveryAssessments.has(ticketId)) {
      return { ok: false, result: "Recovery candidate, independent coverage or slot ownership is incomplete." };
    }
    const project = getProject(ticket.project);
    const fingerprint = await this.system.codeSnapshot(slotPath(slotId));
    if (fingerprint.fingerprint !== recovery.candidate.fingerprint) return { ok: false, result: "Recovered candidate changed. Assess coverage and review the candidate again." };
    const reviewed = await this.reviewGate(ticketId, slotId, "approved_or_limit", recovery.generation);
    if (!reviewed.ok) return { ok: false, result: reviewed.reason };
    const gate = await this.system.verifyRecoveryCandidate({ repoPath: project.repoPath, slotPath: slotPath(slotId), branch: ticket.branch, baseBranch: resolveBaseBranch(ticket, project, this.store), prUrl, commitSha: recovery.candidate.commitSha }, projectVcsProvider(ticket.project));
    if (!gate.ok) return { ok: false, result: gate.reason };
    const archives = await this.system.preserveImplementationRecovery({ repoPath: project.repoPath, slotPath: slotPath(slotId) });
    const current = this.store.getImplementationPlan(ticketId);
    if (current?.recovery?.generation !== recovery.generation || (current.recovery.status !== "assessed" && current.recovery.status !== "resolved") || current.recovery.assessmentExecutionId !== recovery.assessmentExecutionId || current.recovery.candidate?.commitSha !== recovery.candidate.commitSha || this.store.getTicket(ticketId)?.slotId !== slotId || this.store.getSlot(slotId)?.ticketId !== ticketId) return { ok: false, result: "Recovery ownership changed before reconciliation." };
    const finalFingerprint = await this.system.codeSnapshot(slotPath(slotId));
    if (finalFingerprint.fingerprint !== recovery.candidate.fingerprint) return { ok: false, result: "Candidate changed before reconciliation." };
    const reconciled = this.store.getImplementationPlan(ticketId);
    if (this.recoveryOperations.has(ticketId) || this.hasImplementationWriters(ticketId) || reconciled?.recovery?.generation !== recovery.generation
      || (reconciled.recovery.status !== "assessed" && reconciled.recovery.status !== "resolved")
      || reconciled.recovery.assessmentExecutionId !== recovery.assessmentExecutionId || reconciled.recovery.candidate?.commitSha !== recovery.candidate.commitSha
      || !this.ownsRecovery(ticketId, slotId, recovery.generation, deliveryEpoch)) return { ok: false, result: "Recovery ownership changed before reconciliation." };
    const retainedArchives = new Map([...recovery.archives, ...archives].map((archive) => [`${archive.ticketId}:${archive.cycleId ?? ""}:${archive.archivePath}`, archive]));
    this.store.saveImplementationPlan(ticketId, { ...reconciled, status: "completed", lots: reconciled.lots.map((lot) => recovery.obligations.some((obligation) => obligation.label === lot.label) ? { ...lot, status: "completed", summary: `Recovered candidate ${recovery.candidate?.commitSha}; independent coverage ${recovery.assessmentExecutionId}.` } : lot), recovery: { ...reconciled.recovery, status: "resolved", prUrl, archives: [...retainedArchives.values()], diagnostic: null, updatedAt: Date.now() }, updatedAt: Date.now() });
    this.store.logEvent(ticketId, "implementation_recovery_resolved", { generation: recovery.generation, candidate: recovery.candidate, assessmentExecutionId: recovery.assessmentExecutionId, reviewPassId: reviewed.passId, prUrl });
    this.hub.pushTicket(this.store.getTicket(ticketId) ?? ticket);
    return { ok: true, result: "Recovery reconciled against the verified candidate and PR." };
  }

  private async retryImplementationIntegration(ticket: Ticket, slotId: number, plan: ImplementationPlan, label: string | undefined): Promise<{ ok: boolean; result: string }> {
    if (plan.recovery) return { ok: false, result: "The frozen recovery plan cannot resume delegated integration." };
    const lot = plan.lots.find((entry) => entry.label === label);
    if (!lot || lot.failurePhase !== "integration" || !lot.childResult || this.hasImplementationWriters(ticket.id)) return { ok: false, result: "Integration retry requires a successful closed child result and no active writers." };
    if (lot.retryBlockedReason) return { ok: false, result: `Integration retry refused: ${lot.retryBlockedReason}. Inspect the recorded identity diagnostic and preserve the original workspace.` };
    if ((lot.infrastructureAttempts ?? 0) >= MAX_INFRASTRUCTURE_ATTEMPTS) return { ok: false, result: "Infrastructure retry allowance is exhausted. Use explicit takeover." };
    this.updatePlannedLot(ticket.id, plan.id, lot.label, { infrastructureAttempts: (lot.infrastructureAttempts ?? 0) + 1 });
    this.integratingTickets.add(ticket.id);
    try {
      const options = { ticketId: ticket.id, cycleId: plan.id, slotPath: slotPath(slotId), label: lot.label, files: lot.files, recoveryOnly: true };
      const prepared = await this.system.prepareImplementationLot(options);
      if (this.store.getTicket(ticket.id)?.slotId !== slotId || this.store.getSlot(slotId)?.ticketId !== ticket.id || this.store.getImplementationPlan(ticket.id)?.id !== plan.id || this.store.getImplementationPlan(ticket.id)?.recovery) throw new Error("Implementation ownership changed before retained integration.");
      if (!prepared.integrated) await this.system.finishImplementationLot(options);
      if (this.store.getTicket(ticket.id)?.slotId !== slotId || this.store.getSlot(slotId)?.ticketId !== ticket.id || this.store.getImplementationPlan(ticket.id)?.recovery) throw new Error("Implementation ownership changed during integration.");
      this.updatePlannedLot(ticket.id, plan.id, lot.label, { status: "completed", failurePhase: null, summary: lot.childResult.summary });
      this.implementationPlans.set(ticket.id, slotId);
      this.scheduleImplementationPlans();
      this.hub.pushTicket(this.store.getTicket(ticket.id) ?? ticket);
      return { ok: true, result: "The retained successful child result was integrated without rerunning the child." };
    } catch (error) {
      this.system.cancelImplementationLot({ ticketId: ticket.id, cycleId: plan.id, slotPath: slotPath(slotId), label: lot.label, files: lot.files });
      this.recordLotFailure(ticket.id, plan.id, lot.label, "integration", getErrorMessage(error));
      throw error;
    } finally {
      this.integratingTickets.delete(ticket.id);
    }
  }

  async submitImplementationPlan(
    ticket: Ticket,
    slotId: number,
    args: z.infer<typeof submitImplementationPlanArgsSchema>,
  ): Promise<{ ok: boolean; result: string }> {
    const lots: ImplementationPlanLot[] = [];
    const labels = new Set<string>();
    for (const lot of args.lots) {
      const files = normalizeImplementationScope(lot.files);
      if (files === null || files.length === 0) return { ok: false, result: `Périmètre invalide pour le lot «${lot.label}».` };
      if (labels.has(lot.label)) return { ok: false, result: `Label dupliqué : «${lot.label}».` };
      labels.add(lot.label);
      lots.push({ ...lot, files, dependsOn: [...new Set(lot.dependsOn)], status: "pending", attempts: 0, summary: null, executionRunId: null });
    }
    const dependencies = new Map(lots.map((lot) => [lot.label, lot.dependsOn]));
    const completed = new Set<string>();
    while (completed.size < lots.length) {
      const ready = lots.filter((lot) => !completed.has(lot.label) && lot.dependsOn.every((dependency) => completed.has(dependency)));
      if (ready.length === 0) return { ok: false, result: "Les dépendances du plan sont inconnues ou forment un cycle." };
      for (const lot of ready) completed.add(lot.label);
    }
    const dependsOn = (label: string, dependency: string): boolean => {
      const direct = dependencies.get(label) ?? [];
      return direct.includes(dependency) || direct.some((next) => dependsOn(next, dependency));
    };
    for (const lot of lots) {
      for (const other of lots) {
        if (lot.label === other.label || dependsOn(lot.label, other.label) || dependsOn(other.label, lot.label)) continue;
        if (implementationScopesOverlap(lot.files, other.files)) {
          return { ok: false, result: `Les lots indépendants «${lot.label}» et «${other.label}» ont des périmètres qui se chevauchent.` };
        }
      }
    }
    const existing = this.store.getImplementationPlan(ticket.id);
    const definitions = (planLots: ImplementationPlanLot[]): string => JSON.stringify(planLots.map(({ label, plan, files, dependsOn: lotDependencies }) => ({ label, plan, files, dependsOn: lotDependencies })));
    if (existing?.recovery) {
      if (definitions(existing.lots) === definitions(lots) && existing.maxParallel === args.maxParallel) return this.readImplementationPlan(ticket.id);
      return { ok: false, result: "The recovery plan is frozen; its obligations and delivery provenance cannot be replaced." };
    }
    if (existing && definitions(existing.lots) === definitions(lots) && existing.maxParallel === args.maxParallel) {
      if (existing.status === "interrupted" || existing.status === "cancelled") await this.resumeImplementationPlan(ticket, slotId);
      else {
        this.implementationPlans.set(ticket.id, slotId);
        this.scheduleImplementationPlans();
      }
      return this.readImplementationPlan(ticket.id);
    }
    if (existing && existing.lots.some((lot) => lot.status !== "completed")) {
      return { ok: false, result: "Un plan est déjà enregistré : relis read_implementation_plan et reprends ses lots avant de le remplacer." };
    }
    if (this.lotCount(ticket.id) > 0) return { ok: false, result: "Attends la fin des lots en cours avant d'enregistrer un nouveau plan." };
    if (lots.some((lot) => this.store.implementationLotAttempts(ticket.id, lot.label).started > 0)) {
      return { ok: false, result: "Utilise de nouveaux labels pour les lots d'un nouveau plan." };
    }
    const now = Date.now();
    this.store.saveImplementationPlan(ticket.id, {
      id: nanoid(16), ticketId: ticket.id, status: "pending", lots,
      maxParallel: args.maxParallel, createdAt: now, updatedAt: now,
    });
    this.store.logEvent(ticket.id, "implementation_plan_submitted", { lots: lots.map((lot) => ({ label: lot.label, files: lot.files, dependsOn: lot.dependsOn })), maxParallel: args.maxParallel });
    this.implementationPlans.set(ticket.id, slotId);
    this.scheduleImplementationPlans();
    return { ok: true, result: "Plan d'implémentation enregistré. Le backend lance les lots prêts selon leurs dépendances et la capacité disponible. Termine ton tour et attends implementation_done." };
  }

  readImplementationPlan(ticketId: string): { ok: boolean; result: string } {
    const plan = this.store.getImplementationPlan(ticketId);
    if (!plan) return { ok: false, result: "Aucun plan d'implémentation enregistré pour ce ticket." };
    return { ok: true, result: JSON.stringify(plan) };
  }

  refreshImplementationPlan(ticketId: string): void {
    const ticket = this.store.getTicket(ticketId);
    if (!ticket || ticket.slotId === null || !this.canScheduleImplementation(ticket)) return;
    if ([...this.queuedImplementations.values()].some((queued) => queued.ticket.id === ticketId)) this.scheduleImplementationPlans();
    const plan = this.store.getImplementationPlan(ticketId);
    if (plan?.status === "interrupted" || !this.implementationPlans.has(ticketId)) {
      void this.resumeImplementationPlan(ticket, ticket.slotId).catch((error: unknown) => {
        log.error("reprise du plan impossible", { ticketId, reason: getErrorMessage(error) });
      });
      return;
    }
    this.scheduleImplementationPlans();
  }

  resumeImplementationPlan(ticket: Ticket, slotId: number): Promise<void> {
    const pending = this.implementationResumes.get(ticket.id);
    if (pending) return pending;
    const resumed = this.resumeImplementationPlanNow(ticket, slotId);
    this.implementationResumes.set(ticket.id, resumed);
    void resumed.finally(() => this.implementationResumes.delete(ticket.id)).catch(() => {});
    return resumed;
  }

  private async resumeImplementationPlanNow(ticket: Ticket, slotId: number): Promise<void> {
    if (!this.canScheduleImplementation(ticket)) return;
    const plan = this.store.getImplementationPlan(ticket.id);
    if (plan?.recovery) {
      const recovery = plan.recovery;
      if (recovery.status === "assessing" && !this.recoveryAssessments.has(ticket.id)) this.saveRecovery(ticket.id, { ...recovery, status: "pending", diagnostic: "Independent assessment was interrupted by restart; assess the candidate again." });
      return;
    }
    const queued = this.store.getImplementationQueue(ticket.id);
    if ((!plan || plan.status === "completed" || plan.status === "failed") && queued.length === 0) return;
    if (this.hasActiveImplementations(ticket.id) && this.implementationPlans.has(ticket.id)) return;
    const epoch = this.reviewEpochs.get(ticket.id) ?? 0;
    await this.drainTicket(ticket.id);
    const refreshedTicket = this.store.getTicket(ticket.id);
    if (!refreshedTicket || refreshedTicket.slotId !== slotId || !this.canScheduleImplementation(refreshedTicket)
      || (this.reviewEpochs.get(ticket.id) ?? 0) !== epoch || this.store.getSlot(slotId)?.ticketId !== ticket.id) return;
    for (const lot of queued) {
      if (lot.slotId !== slotId || this.hasLot(ticket.id, lot.label)) continue;
      if (lot.started) this.recoveringImplementations.add(`${ticket.id}:${lot.label}`);
      this.queuedImplementations.set(`${ticket.id}:${lot.label}`, { ticket: refreshedTicket, slotId, plan: lot.plan, label: lot.label, files: lot.files });
    }
    this.scheduleImplementationPlans();
    const current = this.store.getImplementationPlan(ticket.id);
    if (!current || !plan || current.id !== plan.id || !this.sessionHub.getExecutionConfig(ticket.id)) return;
    const lots = current.lots.map((lot): ImplementationPlanLot => {
      if (lot.status !== "running" && lot.status !== "interrupted" && lot.status !== "cancelled") return lot;
      if (lot.attempts > 0) this.recoveringImplementations.add(`${ticket.id}:${lot.label}`);
      return { ...lot, status: "pending", summary: "Lot repris après interruption." };
    });
    this.store.saveImplementationPlan(ticket.id, { ...current, status: "pending", lots, updatedAt: Date.now() });
    this.implementationPlans.set(ticket.id, slotId);
    this.scheduleImplementationPlans();
  }

  private pendingPlanLots(ticketId: string): number {
    if (!this.implementationPlans.has(ticketId)) return 0;
    const plan = this.store.getImplementationPlan(ticketId);
    if (!plan || plan.status === "interrupted" || plan.status === "cancelled") return 0;
    return plan.lots.filter((lot) => lot.status === "pending").length;
  }

  private remainingImplementationLots(ticketId: string): number {
    return this.lotCount(ticketId) + this.pendingPlanLots(ticketId);
  }

  private updatePlannedLot(ticketId: string, planId: string | null, label: string, patch: Partial<ImplementationPlanLot>): void {
    if (planId === null) return;
    const plan = this.store.getImplementationPlan(ticketId);
    if (!plan || plan.id !== planId || plan.recovery || plan.status === "cancelled" || plan.status === "interrupted") return;
    const lots = plan.lots.map((lot) => lot.label === label ? { ...lot, ...patch } : lot);
    const byLabel = new Map(lots.map((lot) => [lot.label, lot]));
    let changed = true;
    while (changed) {
      changed = false;
      for (const lot of lots) {
        if (lot.status !== "pending" && lot.status !== "blocked") continue;
        const blocked = lot.dependsOn.some((dependency) => {
          const status = byLabel.get(dependency)?.status;
          return status === "failed" || status === "blocked" || status === "cancelled";
        });
        const status = blocked ? "blocked" : "pending";
        if (lot.status !== status) {
          lot.status = status;
          changed = true;
        }
      }
    }
    let status: ImplementationPlan["status"] = "completed";
    if (lots.some((lot) => lot.status === "pending" || lot.status === "running")) status = "running";
    else if (lots.some((lot) => lot.status !== "completed")) status = "failed";
    this.store.saveImplementationPlan(ticketId, { ...plan, lots, status, updatedAt: Date.now() });
    const ticket = this.store.getTicket(ticketId);
    if (ticket) this.hub.pushTicket(ticket);
  }

  private recordLotFailure(ticketId: string, planId: string | null, label: string, phase: NonNullable<ImplementationPlanLot["failurePhase"]>, summary: string, error?: unknown): void {
    const lot = this.store.getImplementationPlan(ticketId)?.lots.find((entry) => entry.label === label);
    const diagnostic = implementationFailureDiagnostic(error);
    this.updatePlannedLot(ticketId, planId, label, {
      status: "failed", failurePhase: phase, summary,
      retryBlockedReason: diagnostic?.reason.includes("identity_mismatch") ? diagnostic.reason : (lot?.retryBlockedReason ?? null),
      failureHistory: [...(lot?.failureHistory ?? []), { phase, summary, at: Date.now(), ...(diagnostic ? { diagnostic } : {}) }],
    });
    this.store.logEvent(ticketId, "delegation_phase_failed", { label, phase, summary, diagnostic });
  }

  private releaseImplementationReservation(reservationId: string): void {
    this.implementationReservations.delete(reservationId);
    this.queueImplementationSchedule();
  }

  private removePersistedImplementationQueue(ticketId: string, label: string): void {
    this.store.saveImplementationQueue(ticketId, this.store.getImplementationQueue(ticketId).filter((lot) => lot.label !== label));
  }

  private queueImplementationSchedule(): void {
    if (this.implementationScheduleQueued) return;
    this.implementationScheduleQueued = true;
    queueMicrotask(() => {
      this.implementationScheduleQueued = false;
      this.scheduleImplementationPlans();
    });
  }

  private scheduleImplementationPlans(): void {
    if (this.implementationScheduling) return;
    this.implementationScheduling = true;
    try {
      let launched = true;
      while (launched && this.implementationReservations.size < MAX_GLOBAL_IMPLEMENTERS) {
        launched = false;
        for (const [key, queued] of this.queuedImplementations) {
          if (this.implementationReservations.size >= MAX_GLOBAL_IMPLEMENTERS) break;
          const ticket = this.store.getTicket(queued.ticket.id);
          if (!ticket || !this.sessionHub.getExecutionConfig(ticket.id)) {
            this.queuedImplementations.delete(key);
            continue;
          }
          if (!this.canScheduleImplementation(ticket) || this.store.getImplementationPlan(ticket.id)?.recovery) continue;
          this.queuedImplementations.delete(key);
          launched = true;
          const epoch = this.reviewEpochs.get(ticket.id) ?? 0;
          void this.launchImplementation(ticket, queued.slotId, queued.plan, queued.label, queued.files).then((result) => {
            if ((this.reviewEpochs.get(ticket.id) ?? 0) !== epoch) return;
            if (!result.ok) {
              this.removePersistedImplementationQueue(ticket.id, queued.label);
              this.sessionHub.sendEvent(ticket.id, { type: "implementation_done", ok: false, label: queued.label, summary: result.result, remaining: this.remainingImplementationLots(ticket.id) });
            }
          }).catch((error: unknown) => {
            if ((this.reviewEpochs.get(ticket.id) ?? 0) !== epoch) return;
            this.removePersistedImplementationQueue(ticket.id, queued.label);
            log.error("lot en attente impossible à lancer", { ticketId: ticket.id, label: queued.label, reason: getErrorMessage(error) });
            this.sessionHub.sendEvent(ticket.id, { type: "implementation_done", ok: false, label: queued.label, summary: getErrorMessage(error), remaining: this.remainingImplementationLots(ticket.id) });
          });
        }
        for (const [ticketId, slotId] of [...this.implementationPlans]) {
          if (this.implementationReservations.size >= MAX_GLOBAL_IMPLEMENTERS) break;
          const ticket = this.store.getTicket(ticketId);
          const plan = this.store.getImplementationPlan(ticketId);
          if (!ticket || !plan || plan.recovery || plan.status === "interrupted" || plan.status === "cancelled" || !this.sessionHub.getExecutionConfig(ticketId)) {
            this.implementationPlans.delete(ticketId);
            continue;
          }
          if (!this.canScheduleImplementation(ticket)) continue;
          if (this.lotCount(ticketId) >= plan.maxParallel) continue;
          const ready = plan.lots.find((lot) => lot.status === "pending" && lot.dependsOn.every((dependency) => plan.lots.some((candidate) => candidate.label === dependency && candidate.status === "completed")));
          if (!ready) continue;
          this.updatePlannedLot(ticketId, plan.id, ready.label, { status: "running" });
          const started = this.launchImplementation(ticket, slotId, ready.plan, ready.label, ready.files);
          const epoch = this.reviewEpochs.get(ticketId) ?? 0;
          launched = true;
          this.implementationPlans.delete(ticketId);
          this.implementationPlans.set(ticketId, slotId);
          void started.then((result) => {
            if ((this.reviewEpochs.get(ticketId) ?? 0) !== epoch) return;
            if (result.ok) return;
            this.updatePlannedLot(ticketId, plan.id, ready.label, { status: "failed", summary: result.result });
            this.sessionHub.sendEvent(ticketId, { type: "implementation_done", ok: false, label: ready.label, summary: result.result, remaining: this.remainingImplementationLots(ticketId) });
            this.queueImplementationSchedule();
          }).catch((error: unknown) => {
            if ((this.reviewEpochs.get(ticketId) ?? 0) !== epoch) return;
            this.updatePlannedLot(ticketId, plan.id, ready.label, { status: "failed", summary: getErrorMessage(error) });
            log.error("plan d'implémentation impossible à lancer", { ticketId, label: ready.label, reason: getErrorMessage(error) });
            this.queueImplementationSchedule();
          });
        }
      }
    } finally {
      this.implementationScheduling = false;
    }
  }

  private canScheduleImplementation(ticket: Ticket): boolean {
    return !ticket.testing && ticket.stage !== "awaiting_answers" && ticket.stage !== "planning"
      && ticket.stage !== "stalled" && ticket.stage !== "interrupted"
      && (ticket.stage === null || !TERMINAL_STAGES.includes(ticket.stage))
      && ticket.pendingQuestions === 0;
  }

  hasActiveReviews(ticketId: string): boolean {
    return [...this.activeReviews.values()].some((review) => review.ticketId === ticketId);
  }

  private boundedReviewGateFingerprint(
    ticketId: string,
    slotId: number,
    correlationId: string,
  ): Promise<({ ok: true } & CodeSnapshot) | { ok: false; reason: string; reasonCode: "fingerprint_error" | "fingerprint_timeout" }> {
    const startedAt = Date.now();
    const fingerprint = this.system.codeSnapshot(slotPath(slotId));
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
          resolve({ ok: true, ...value });
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
    const implementationPlan = this.store.getImplementationPlan(ticketId);
    if (this.hasImplementationWriters(ticketId) || this.recoveryAssessments.has(ticketId)) return { ok: false, reason: "Des écrivains délégués ou une évaluation indépendante sont encore actifs.", reasonCode: "incomplete_implementation" };
    const recovered = implementationPlan?.recovery;
    if ((implementationPlan?.lots.some((lot) => lot.status !== "completed") && recovered?.status !== "assessed" && recovered?.status !== "resolved") || this.store.getImplementationQueue(ticketId).length > 0) {
      return { ok: false, reason: "Le plan d'implémentation contient encore des lots non terminés. Relis read_implementation_plan, reprends les lots en échec et termine chaque lot avant la validation finale.", reasonCode: "incomplete_implementation" };
    }
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
      const diagnosticsAvailable = reviewPass.fileHashes !== null;
      const changedPaths = new Set([...Object.keys(reviewPass.fileHashes ?? {}), ...Object.keys(fingerprint.fileHashes)]);
      const changed = [...changedPaths].filter((path) => reviewPass.fileHashes?.[path] !== fingerprint.fileHashes[path]).sort();
      this.store.logEvent(ticketId, "review_code_changed", {
        passId: reviewPass.passId,
        correlationId,
        diagnosticsAvailable,
        changedPaths: diagnosticsAvailable ? changed.slice(0, MAX_CHANGED_PATHS) : [],
        changedPathCount: diagnosticsAvailable ? changed.length : null,
        truncated: diagnosticsAvailable && changed.length > MAX_CHANGED_PATHS,
      });
      return {
        ok: false,
        reason: "Les fichiers ont changé depuis la passe de review. Relance tous les reviewers sur le code courant.",
        reasonCode: "code_changed",
      };
    }
    const requiredKinds = requiredReviewKinds(reviewPass.reviewDepth);
    const incompleteKinds = requiredKinds.filter((kind) => {
      if (requirement === "completed") return reviewPass.results[kind]?.status !== "completed";
      if (requirement === "approved") return reviewPass.approvals[kind] !== true;
      return reviewPass.results[kind]?.status !== "completed";
    });
    if (incompleteKinds.length > 0) {
      const missing = requirement === "approved" ? "approbation manquante" : "résultat vérifié manquant";
      return {
        ok: false,
        reason: `Review incomplète : ${missing} pour ${incompleteKinds.join(", ")}.`,
        reasonCode: "incomplete_review",
      };
    }
    const hasOpenFindings = requiredKinds.some((kind) => reviewPass.results[kind]?.verdict === "revise");
    if (requirement === "approved_or_limit" && hasOpenFindings) {
      const ticket = this.store.getTicket(ticketId);
      const allowed = allowedReviewPasses(ticket);
      if (ticket?.kind !== "feature" || ticket.reviewRounds < allowed) {
        return {
          ok: false,
          reason: `Review non approuvée : corrige les findings pertinents puis relance tous les reviewers (${ticket?.reviewRounds ?? 0}/${allowed} passes effectuées).`,
          reasonCode: "incomplete_review",
        };
      }
    }
    log.info("gate de review acceptée", {
      ticketId,
      slotId,
      correlationId,
      requirement,
      passId: reviewPass.passId,
      elapsedMs: Date.now() - startedAt,
    });
    return { ok: true, passId: reviewPass.passId, acceptedWithFindings: hasOpenFindings };
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

  /**
   * Rendering in the review language (English by default): the body posted on the pull request.
   * Azure DevOps carries the verdict through the vote, so its summary thread skips the verdict line.
   */
  reviewReport(ticketId: string, options: ReviewerOptions = FEATURE_REVIEWER_OPTIONS, withVerdict = true): string | null {
    return this.renderReviewReport(ticketId, REVIEW_REPORT_LABELS[options.language], options, withVerdict);
  }

  /** French rendering: the board comment shown in the app. */
  reviewBoardReport(ticketId: string): string | null {
    return this.renderReviewReport(ticketId, REVIEW_REPORT_LABELS_FR, BOARD_FINDING_RENDER_STYLE, true);
  }

  private reviewerOptions(ticket: Ticket): ReviewerOptions {
    if (ticket.kind !== "review") return FEATURE_REVIEWER_OPTIONS;
    return {
      language: ticket.reviewLanguage ?? this.store.getAppSettings().commitLanguage,
      humanTone: ticket.humanTone,
    };
  }

  private renderReviewReport(
    ticketId: string,
    labels: ReviewReportLabels,
    style: FindingRenderStyle,
    withVerdict: boolean,
  ): string | null {
    const findings = publishedReviewFindings(this.store.getReviewPass(ticketId), style);
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
      : `${labels.outsideDiffHeading}\n\n${outsideDiffFindings.map((finding) => renderCollapsedFinding(finding, style.humanTone)).join("\n\n")}`;
    const sections = [
      withVerdict ? `**${verdict}**` : "",
      style.humanTone ? "" : labels.keptLine(findings.length, countSummary),
      details,
    ];
    return sections.filter((section) => section !== "").join("\n\n");
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
    const options = this.reviewerOptions(ticket);
    const provider = projectVcsProvider(ticket.project);
    const report = this.reviewReport(ticket.id, options, provider !== "azureDevops");
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
    const findings = keptFindings(entries, options);
    const refutedCount = entries.filter((entry) =>
      entry.finding.verificationStatus !== "rejected" && isSelfRefuting(entry.finding)).length;
    const comments = findings.flatMap((finding) => {
      if (finding.path === null || finding.line === null) return [];
      return [{
        path: finding.path,
        line: finding.line,
        body: renderFinding(finding, options.humanTone),
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
    }, provider);
    const publicationPayload = {
      passId,
      reviewId: published.reviewId,
      commitSha: reviewedCommitSha,
      event,
      expectedState: REVIEW_PUBLICATION_STATE_BY_EVENT[event],
      actualState: published.actualState ?? null,
      result: published,
      warnings: published.ok && published.reason !== "" ? [published.reason] : [],
    };
    if (!published.ok || published.reviewId === null) {
      this.store.logEvent(ticket.id, "review_publication_failed", {
        ...publicationPayload,
        error: published.reason,
      });
      return { ok: false, result: `Publication refusée : ${published.reason}` };
    }
    if (!this.store.recordReviewPublication({
      ticketId: ticket.id,
      passId,
      reviewId: published.reviewId,
      commitSha: reviewedCommitSha,
    })) {
      const result = "La review a été publiée, mais son accusé n'a pas pu être persisté. Rappelle publish_review pour le récupérer.";
      this.store.logEvent(ticket.id, "review_publication_failed", {
        ...publicationPayload,
        error: result,
      });
      return { ok: false, result };
    }
    this.store.logEvent(ticket.id, "review_published", publicationPayload);
    const refutedNote = refutedCount === 0 ? "" : ` (${refutedCount} finding(s) auto-réfuté(s) ignoré(s))`;
    const degradedNote = published.reason === "" ? "" : ` Note : ${published.reason}.`;
    return {
      ok: true,
      result: `Review publiée sur le commit ${reviewedCommitSha}${refutedNote}.${degradedNote} Appelle maintenant done().`,
    };
  }

  /** Number of implementation lots running or being prepared for this ticket. */
  private lotCount(ticketId: string): number {
    const running = this.active.get(ticketId)?.size ?? 0;
    const prefix = `${ticketId}:`;
    let starting = 0;
    for (const key of this.startingImplementations.keys()) {
      if (key.startsWith(prefix)) starting += 1;
    }
    for (const queued of this.queuedImplementations.values()) {
      if (queued.ticket.id === ticketId) starting += 1;
    }
    return running + starting;
  }

  private hasLot(ticketId: string, label: string): boolean {
    return this.active.get(ticketId)?.has(label) === true || this.startingImplementations.has(`${ticketId}:${label}`)
      || this.queuedImplementations.has(`${ticketId}:${label}`);
  }

  /** Spawn one implementation child lot and hand it the plan. Non-blocking. */
  start(ticket: Ticket, slotId: number, plan: string, label: string, files: readonly string[] = []): Promise<{ ok: boolean; result: string }> {
    const storedPlan = this.store.getImplementationPlan(ticket.id);
    if (storedPlan?.recovery) return Promise.resolve({ ok: false, result: "The remaining plan is frozen for explicit recovery; do not start delegated writers." });
    const lot = storedPlan?.lots.find((candidate) => candidate.label === label);
    if (lot?.status === "completed") {
      return Promise.resolve({ ok: false, result: `Le lot «${label}» est déjà terminé. Utilise un nouveau label pour une nouvelle correction.` });
    }
    const normalizedFiles = normalizeImplementationScope(files);
    if (lot && storedPlan && lot.plan === plan && JSON.stringify(lot.files) === JSON.stringify(normalizedFiles)) {
      if (lot.status === "pending" || lot.status === "running") {
        return Promise.resolve({ ok: true, result: `Le lot «${label}» est déjà enregistré : le backend gère son lancement. Attends implementation_done.` });
      }
      if (lot.status === "failed") {
        if (lot.retryBlockedReason) return Promise.resolve({ ok: false, result: `Unsafe workspace retry refused (${lot.retryBlockedReason}). Inspect its recorded identity diagnostic and use explicit recovery without changing the journal identity.` });
        const attempts = this.store.implementationLotAttempts(ticket.id, label);
        const infrastructureFailure = lot.failurePhase === "preparation" || lot.failurePhase === "startup";
        if (lot.childResult) return Promise.resolve({ ok: false, result: "The successful child result is retained. Use recover_implementation_plan action=retry_integration." });
        if ((infrastructureFailure && (lot.infrastructureAttempts ?? 0) < MAX_INFRASTRUCTURE_ATTEMPTS) || (!infrastructureFailure && lot.attempts === 1 && attempts.failed >= 1)) {
          this.updatePlannedLot(ticket.id, storedPlan.id, label, { status: "pending" });
          this.implementationPlans.set(ticket.id, slotId);
          this.scheduleImplementationPlans();
          return Promise.resolve({ ok: true, result: `Relance du lot «${label}» enregistrée. Le backend attend ses dépendances et la capacité disponible. Termine ton tour et attends implementation_done.` });
        }
      }
    }
    return this.launchImplementation(ticket, slotId, plan, label, files);
  }

  private launchImplementation(ticket: Ticket, slotId: number, plan: string, label: string, files: readonly string[]): Promise<{ ok: boolean; result: string }> {
    const started = this.startNow(ticket, slotId, plan, label, files);
    const planId = this.store.getImplementationPlan(ticket.id)?.id ?? null;
    void started.then((result) => {
      if (!result.ok && !this.hasLot(ticket.id, label)) this.updatePlannedLot(ticket.id, planId, label, { status: "failed", summary: result.result });
    }).catch((error: unknown) => {
      this.updatePlannedLot(ticket.id, planId, label, { status: "failed", summary: getErrorMessage(error) });
    });
    this.trackClosing(started.then(() => undefined), ticket.id);
    return started;
  }

  private async startNow(ticket: Ticket, slotId: number, plan: string, label: string, files: readonly string[]): Promise<{ ok: boolean; result: string }> {
    const normalizedFiles = normalizeImplementationScope(files);
    if (normalizedFiles === null) {
      return { ok: false, result: "Périmètre invalide : utilise des chemins relatifs au dépôt, sans glob ni segment . ou ..." };
    }
    if (this.hasLot(ticket.id, label)) {
      return { ok: false, result: `Le lot «${label}» est déjà en cours : attends son événement implementation_done.` };
    }
    const attempts = this.store.implementationLotAttempts(ticket.id, label);
    const initialPlan = this.store.getImplementationPlan(ticket.id);
    if (initialPlan?.recovery) return { ok: false, result: "Implementation scheduling is frozen by recovery." };
    const initialLot = initialPlan?.lots.find((lot) => lot.label === label);
    if (initialLot?.retryBlockedReason) return { ok: false, result: `Workspace retry refused: ${initialLot.retryBlockedReason}. Preserve and diagnose its original identity.` };
    if (initialLot?.childResult) return { ok: false, result: "Retained successful child output requires integration-only retry." };
    if (initialLot && (initialLot.infrastructureAttempts ?? 0) >= MAX_INFRASTRUCTURE_ATTEMPTS && (initialLot.failurePhase === "preparation" || initialLot.failurePhase === "startup")) return { ok: false, result: "Infrastructure retry allowance exhausted. Use explicit recovery." };
    const recovering = attempts.started > 0 && this.recoveringImplementations.has(`${ticket.id}:${label}`);
    const codeStarts = initialLot?.attempts ?? attempts.started;
    if (!recovering && codeStarts > 0 && (codeStarts >= MAX_IMPLEMENTATION_ATTEMPTS || (initialLot === undefined && attempts.failed !== 1))) {
      return {
        ok: false,
        result: `Le lot «${label}» ne peut être relancé qu'une fois après son premier échec. Reprends l'implémentation toi-même ou appelle fail().`,
      };
    }
    const previousFiles = this.store.implementationLotScope(ticket.id, label);
    if (previousFiles !== null && JSON.stringify(previousFiles) !== JSON.stringify(normalizedFiles)) {
      return { ok: false, result: `Le lot «${label}» doit conserver son périmètre de fichiers lors de sa relance.` };
    }
    const activeScopes = this.active.get(ticket.id);
    for (const [otherLabel, state] of activeScopes ?? []) {
      if (otherLabel !== label && implementationScopesOverlap(normalizedFiles, state.files)) {
        return { ok: false, result: `Le périmètre du lot «${label}» chevauche celui du lot «${otherLabel}» en cours.` };
      }
    }
    const startingPrefix = `${ticket.id}:`;
    for (const [key, scope] of this.startingImplementations) {
      if (key.startsWith(startingPrefix) && implementationScopesOverlap(normalizedFiles, scope)) {
        return { ok: false, result: `Le périmètre du lot «${label}» chevauche celui d'un lot en préparation.` };
      }
    }
    for (const queued of this.queuedImplementations.values()) {
      if (queued.ticket.id === ticket.id && implementationScopesOverlap(normalizedFiles, queued.files)) {
        return { ok: false, result: `Le périmètre du lot «${label}» chevauche celui d'un lot en attente.` };
      }
    }
    if (this.lotCount(ticket.id) >= MAX_PARALLEL_IMPLEMENTERS) {
      return {
        ok: false,
        result: `Limite de ${MAX_PARALLEL_IMPLEMENTERS} lots d'implémentation en parallèle atteinte pour ce ticket : attends les événements implementation_done en cours avant d'en lancer un autre.`,
      };
    }
    if (this.implementationReservations.size >= MAX_GLOBAL_IMPLEMENTERS) {
      this.store.saveImplementationQueue(ticket.id, [...this.store.getImplementationQueue(ticket.id), { label, plan, files: normalizedFiles, slotId, started: false, executionRunId: null }]);
      this.queuedImplementations.set(`${ticket.id}:${label}`, { ticket, slotId, plan, label, files: normalizedFiles });
      this.store.logEvent(ticket.id, "delegation_queued", { label, files: normalizedFiles });
      return { ok: true, result: `Le lot «${label}» attend la capacité globale de ${MAX_GLOBAL_IMPLEMENTERS} implémenteurs. Le backend le lancera automatiquement. Termine ton tour et attends implementation_done.` };
    }
    const persistedPlan = this.store.getImplementationPlan(ticket.id);
    const queuedLot = this.store.getImplementationQueue(ticket.id).find((lot) => lot.label === label);
    const plannedLot = persistedPlan?.lots.find((lot) => lot.label === label);
    if (plannedLot && persistedPlan && this.lotCount(ticket.id) >= persistedPlan.maxParallel) {
      return { ok: false, result: "La capacité parallèle du plan est occupée." };
    }
    if (plannedLot && (plannedLot.plan !== plan || JSON.stringify(plannedLot.files) !== JSON.stringify(normalizedFiles))) {
      return { ok: false, result: `Le lot «${label}» doit conserver le plan et le périmètre enregistrés.` };
    }
    const planId = plannedLot && persistedPlan ? persistedPlan.id : null;
    const durableWorkspace = planId !== null || queuedLot !== undefined;
    if (plannedLot && persistedPlan) {
      const ready = plannedLot.dependsOn.every((dependency) => persistedPlan.lots.some((lot) => lot.label === dependency && lot.status === "completed"));
      if (!ready) return { ok: false, result: `Les dépendances du lot «${label}» ne sont pas terminées.` };
      if (plannedLot.status !== "running") {
        this.updatePlannedLot(ticket.id, planId, label, { status: "running" });
      }
    }
    const reservationId = nanoid(16);
    this.implementationReservations.add(reservationId);
    this.recoveringImplementations.delete(`${ticket.id}:${label}`);
    const epoch = this.reviewEpochs.get(ticket.id) ?? 0;
    const startingKey = `${ticket.id}:${label}`;
    this.startingImplementations.set(startingKey, normalizedFiles);
    const parentExecution = this.sessionHub.getExecutionConfig(ticket.id);
    let provider: Orchestrator = ticket.implementer === "claude" ? "claude" : "codex";
    if (parentExecution?.delegateProvider === "codex" || parentExecution?.delegateProvider === "claude") {
      provider = parentExecution.delegateProvider;
    }
    const fallbackKnobs: { model: string; effort: string; serviceTier: "default" | "fast" } = provider === "codex"
      ? codexImplementerKnobs(ticket)
      : {
          model: ticket.implementerModel ?? MODELS.implementerModel,
          effort: ticket.implementerEffort ?? MODELS.implementerEffort,
          serviceTier: "default",
        };
    const knobs = parentExecution?.delegateProvider === provider && parentExecution.delegateModel && parentExecution.delegateEffort
      ? {
          model: parentExecution.delegateModel,
          effort: parentExecution.delegateEffort,
          serviceTier: parentExecution.delegateServiceTier ?? "default",
        }
      : fallbackKnobs;
    const lotOptions: ImplementationLotOptions | null = normalizedFiles.length === 0
      ? null
      : { ticketId: ticket.id, slotPath: slotPath(slotId), label, files: normalizedFiles, ...(planId === null ? {} : { cycleId: planId }) };
    let preparationPhase: "preparation" | "startup" = "startup";
    if (queuedLot) this.store.saveImplementationQueue(ticket.id, this.store.getImplementationQueue(ticket.id).map((lot) => lot.label === label ? { ...lot, started: true } : lot));
    let childCwd = slotPath(slotId);
    try {
      if (provider === "codex") {
        await assertExecutionAvailable(this.system, {
          provider,
          model: knobs.model,
          effort: knobs.effort,
          serviceTier: knobs.serviceTier,
        });
      }
      if (lotOptions !== null) {
        preparationPhase = "preparation";
        const prepared = await this.system.prepareImplementationLot(lotOptions);
        childCwd = prepared.cwd;
        if (prepared.integrated) {
          this.startingImplementations.delete(startingKey);
          if ((this.reviewEpochs.get(ticket.id) ?? 0) !== epoch) {
            this.system.cancelImplementationLot(lotOptions);
            this.releaseImplementationReservation(reservationId);
            return { ok: false, result: "Délégation annulée pendant sa reprise." };
          }
          const summary = "Lot déjà intégré avant l'interruption : résultat conservé sans relancer l'implémentation.";
          this.store.transaction(() => {
            this.updatePlannedLot(ticket.id, planId, label, { status: "completed", summary });
            const remaining = this.remainingImplementationLots(ticket.id);
            const delivered = this.sessionHub.sendEvent(ticket.id, { type: "implementation_done", ok: true, summary, label, remaining });
            this.store.logEvent(ticket.id, "delegation_done", { ok: true, delivered, label, remaining, recovered: true, summary });
            this.removePersistedImplementationQueue(ticket.id, label);
          });
          await this.system.discardImplementationLot(lotOptions).catch((error: unknown) => {
            log.warn("nettoyage du lot intégré impossible", { ticketId: ticket.id, label, reason: getErrorMessage(error) });
          });
          this.releaseImplementationReservation(reservationId);
          return { ok: true, result: summary };
        }
      }
    } catch (error) {
      this.startingImplementations.delete(startingKey);
      if (lotOptions !== null && !durableWorkspace) await this.system.discardImplementationLot(lotOptions).catch((cleanupError: unknown) => {
        log.warn("nettoyage de lot impossible", { ticketId: ticket.id, label, reason: getErrorMessage(cleanupError) });
      });
      if (lotOptions !== null && durableWorkspace) this.system.cancelImplementationLot(lotOptions);
      this.releaseImplementationReservation(reservationId);
      const message = error instanceof Error ? error.message : String(error);
      this.updatePlannedLot(ticket.id, planId, label, { infrastructureAttempts: (plannedLot?.infrastructureAttempts ?? 0) + 1 });
      this.recordLotFailure(ticket.id, planId, label, preparationPhase, message, error);
      this.store.logEvent(ticket.id, "delegation_done", { ok: false, delivered: false, label, remaining: this.lotCount(ticket.id), stage: "launch" });
      return { ok: false, result: `Impossible de lancer la délégation : ${message}` };
    }
    this.startingImplementations.delete(startingKey);
    if ((this.reviewEpochs.get(ticket.id) ?? 0) !== epoch) {
      try {
        if (lotOptions !== null && !durableWorkspace) await this.system.discardImplementationLot(lotOptions);
        if (lotOptions !== null && durableWorkspace) this.system.cancelImplementationLot(lotOptions);
      } finally {
        this.releaseImplementationReservation(reservationId);
      }
      this.store.logEvent(ticket.id, "delegation_done", { ok: false, delivered: false, label, remaining: this.lotCount(ticket.id), stage: "cancelled" });
      return { ok: false, result: "Délégation annulée pendant sa préparation." };
    }
    const generationKey = `${ticket.id}:implementation`;
    const generation = (this.generations.get(generationKey) ?? 0) + 1;
    this.generations.set(generationKey, generation);
    const generationId = nanoid(16);
    const previousExecutionId = plannedLot?.executionRunId ?? queuedLot?.executionRunId;
    const previousExecution = recovering && previousExecutionId
      ? this.store.listExecutionRuns("ticket", ticket.id).find((execution) => execution.generationId === previousExecutionId)
      : undefined;
    const resumeSessionId = provider === "codex" && previousExecution?.orchestrator === provider
      && previousExecution.effectiveModel === knobs.model && previousExecution.effectiveEffort === knobs.effort
      ? previousExecution.sessionId
      : null;
    const state: ActiveDelegation = {
      reservationId,
      planId,
      durableWorkspace,
      consumesCodeAttempt: !recovering,
      label,
      provider,
      files: normalizedFiles,
      lotOptions,
      cancelled: false,
      preserveWorkspace: false,
      childClosed: false,
      settlement: null,
      handle: null,
      generationId,
      usageByModel: {},
      sessionId: null,
      lastAssistantText: "",
      lastError: "",
      lastHeartbeatAt: Date.now(),
      settled: false,
    };
    this.writerOwners.set(generationId, ticket.id);
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
        orchestrator: provider,
        effectiveModel: knobs.model,
        effectiveEffort: knobs.effort,
        codexFast: knobs.serviceTier === "fast",
      });
      executionStarted = true;
      this.updatePlannedLot(ticket.id, planId, label, { executionRunId: generationId });
      if (queuedLot) this.store.saveImplementationQueue(ticket.id, this.store.getImplementationQueue(ticket.id).map((lot) => lot.label === label ? { ...lot, executionRunId: generationId } : lot));
      const handle = this.system.startAgentSession({
        ticketId: ticket.id,
        slotId: DELEGATION_SLOT_ID,
        cwd: childCwd,
        provider,
        model: knobs.model,
        effort: knobs.effort,
        serviceTier: knobs.serviceTier,
        generation,
        ...(resumeSessionId ? { resumeSessionId } : {}),
        ...delegatedImplementerPermissions(projectVcsProvider(ticket.project)),
        ...(ticket.autonomous ? { blockReviewPublishing: true } : {}),
        onToolCall: async () => ({ ok: false, result: "Session d'implémentation déléguée : aucun tool de pipeline n'est disponible." }),
        onEvent: (event) => this.handleEvent(ticket.id, state, event),
      });
      state.handle = handle;
      const scopeDirective = normalizedFiles.length === 0
        ? ""
        : `\n- Périmètre déclaré de ce lot : ${normalizedFiles.join(", ")}. N'écris aucun autre fichier.\n`;
      const recoveryDirective = recovering
        ? "\n- Ce lot reprend après interruption. Le worktree contient le travail partiel conservé : inspecte-le et complète le lot sans recommencer les modifications déjà présentes.\n"
        : "";
      const retryDirective = plannedLot?.summary ? `\n- Résultat de la tentative précédente : ${plannedLot.summary}\n` : "";
      handle.send(`${CHILD_FRAMING}${scopeDirective}${recoveryDirective}${retryDirective}${plan}`);
      const eventType = recovering ? "delegation_resumed" : "delegation_started";
      this.store.logEvent(ticket.id, eventType, { provider, model: knobs.model, effort: knobs.effort, label, files: normalizedFiles });
      this.updatePlannedLot(ticket.id, planId, label, { attempts: (plannedLot?.attempts ?? 0) + (recovering ? 0 : 1), failurePhase: null });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.updatePlannedLot(ticket.id, planId, label, { infrastructureAttempts: (plannedLot?.infrastructureAttempts ?? 0) + 1 });
      this.recordLotFailure(ticket.id, planId, label, "startup", message, error);
      try {
        if (executionStarted) await this.closeAndFinalize(state, "failed", message);
        if (lotOptions !== null && !durableWorkspace) await this.system.discardImplementationLot(lotOptions);
        if (lotOptions !== null && durableWorkspace) this.system.cancelImplementationLot(lotOptions);
      } finally {
        this.removeLot(ticket.id, label, state);
        this.releaseImplementationReservation(reservationId);
      }
      this.store.logEvent(ticket.id, "delegation_done", { ok: false, delivered: false, label, remaining: this.lotCount(ticket.id), stage: "launch" });
      return { ok: false, result: `Impossible de lancer la délégation : ${message}` };
    }
    this.sessionHub.appendExternalLine(
      ticket.id,
      `${childTranscriptPrefix(label, provider)}—— délégation ${provider} lancée (${knobs.model}) ——`,
    );
    log.info("délégation lancée", { ticketId: ticket.id, slotId, model: knobs.model, label });
    return {
      ok: true,
      result: `Délégation du lot «${label}» lancée : une session ${provider} implémente ce plan en arrière-plan. Termine ton tour MAINTENANT ; tu recevras un événement implementation_done par lot lancé.`,
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
  private async timedCodeFingerprint(cwd: string, ticketId: string, kind: ReviewKind, startId: string): Promise<CodeSnapshot> {
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
      return await this.system.codeSnapshot(cwd);
    } finally {
      clearTimeout(slowTimer);
      const elapsedMs = Date.now() - startedAt;
      const timing = { ticketId, kind, startId, elapsedMs };
      if (elapsedMs >= SLOW_FINGERPRINT_WARN_MS) log.warn("empreinte du code LENTE", timing);
      else log.info("empreinte du code calculée", timing);
    }
  }

  /**
   * Refusal for a brand new pass once the feature ticket burnt its budget, or `null` when a pass is
   * still allowed. Only a stored pass whose required dimensions all completed counts as consumed:
   * a pass whose reviewers crashed — or one lost across a backend restart — must stay re-runnable.
   */
  private reviewBudgetExhausted(ticket: Ticket): { ok: false; result: string } | null {
    if (ticket.kind !== "feature") return null;
    const allowed = allowedReviewPasses(ticket);
    const rounds = this.store.getTicket(ticket.id)?.reviewRounds ?? ticket.reviewRounds;
    if (rounds < allowed) return null;
    const stored = this.store.getReviewPass(ticket.id);
    if (!stored) return null;
    const complete = requiredReviewKinds(stored.reviewDepth).every(
      (kind) => stored.results[kind]?.status === "completed",
    );
    if (!complete) return null;
    log.warn("budget de passes de review épuisé", {
      ticketId: ticket.id,
      rounds,
      allowed,
    });
    return {
      ok: false,
      result: `Budget de passes de review épuisé (${rounds}/${allowed}) : ne relance plus les reviewers. Poursuis les tests, le commit, le push et l'ouverture de la PR, puis signale les findings encore ouverts dans sa description.`,
    };
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
      const { repoPath, vcsProvider } = getProject(ticket.project);
      const prUrl = ticket.prUrl;
      const prNumber = ticket.prNumber;
      const prepared = await this.repoMutex.run(repoPath, async () => {
        const slot = this.store.getSlot(slotId);
        if ((this.reviewEpochs.get(ticket.id) ?? 0) !== epoch || slot?.ticketId !== ticket.id) {
          return { ok: false, reason: "slot de review libéré pendant la préparation", commitSha: null };
        }
        if (requiresApproval) return this.system.readReviewHead(cwd, prUrl, vcsProvider);
        return this.system.prepareReviewWorktree({
          repoPath,
          slotPath: cwd,
          prUrl,
          prNumber,
          provider: vcsProvider,
        });
      });
      if (!prepared.ok || prepared.commitSha === null) {
        return { ok: false, result: `Impossible de préparer la review ${kind} : ${prepared.reason}` };
      }
      reviewedCommitSha = prepared.commitSha;
    }
    let snapshot: CodeSnapshot;
    try {
      snapshot = await this.timedCodeFingerprint(cwd, ticket.id, kind, startId);
    } catch (error) {
      return { ok: false, result: `Impossible de lancer la review ${kind} : ${getErrorMessage(error)}` };
    }
    const { fingerprint: codeFingerprint, fileHashes } = snapshot;
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
    const persisted = this.store.getReviewPass(ticket.id);
    if (
      persisted?.codeFingerprint === codeFingerprint
      && persisted.reviewDepth === depth
      && persisted.reviewedCommitSha === reviewedCommitSha
      && persisted.requiresApproval === requiresApproval
    ) {
      const restored: ActiveReviewPass = {
        passId: persisted.passId,
        codeFingerprint,
        fileHashes: persisted.fileHashes,
        reviewedCommitSha,
        fingerprintComputedAt: computedAt,
        depth,
        execution: requestedExecution,
      };
      this.activeReviewPasses.set(ticket.id, restored);
      return { ok: true, pass: restored };
    }
    const exhausted = this.reviewBudgetExhausted(ticket);
    if (exhausted !== null) return exhausted;
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
      fileHashes,
      reviewedCommitSha,
      fingerprintComputedAt: computedAt,
      depth,
      execution: requestedExecution,
    };
    const reuseRound = persisted !== null && requiredReviewKinds(persisted.reviewDepth).some(
      (requiredKind) => persisted.results[requiredKind]?.status !== "completed",
    );
    this.store.beginReviewPass({
      ticketId: ticket.id,
      passId: created.passId,
      codeFingerprint,
      fileHashes,
      reviewedCommitSha,
      reviewDepth: depth,
      requiresApproval,
      reuseRound,
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
    const restoredCompleted = this.completedInCurrentPass(ticket.id, kind);
    if (restoredCompleted !== null) {
      return {
        ok: true,
        result: `La review ${kind} est déjà rendue dans la passe ${restoredCompleted} : relis son verdict avec read_review_results, ne la relance pas.`,
      };
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
        blockTypecheck: true,
        allowedTools: REVIEW_TOOLS,
        disallowedTools: REVIEW_DISALLOWED_TOOLS,
        skills: [],
        disableWorkerTools: true,
        outputSchema: REVIEW_OUTPUT_SCHEMA,
        onToolCall: async () => ({ ok: false, result: "Session reviewer : aucun tool de pipeline n'est disponible." }),
        onEvent: (event) => this.handleReviewEvent(state, event),
      });
      state.handle = handle;
      handle.send(reviewPrompt(ticket, kind, context, this.reviewerOptions(ticket)));
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
    this.implementationPlans.delete(ticketId);
    for (const [key, queued] of this.queuedImplementations) {
      if (queued.ticket.id === ticketId) this.queuedImplementations.delete(key);
    }
    const ticket = this.store.getTicket(ticketId);
    const terminal = !ticket || (ticket.stage !== null && TERMINAL_STAGES.includes(ticket.stage));
    if (terminal) this.store.resetImplementationQueue(ticketId);
    const plan = this.store.getImplementationPlan(ticketId);
    const assessment = this.recoveryAssessments.get(ticketId);
    if (assessment) {
      this.recoveryAssessments.delete(ticketId);
      if (plan?.recovery && plan.recovery.assessmentExecutionId === assessment.generationId) this.saveRecovery(ticketId, { ...plan.recovery, status: "pending", assessmentExecutionId: null, diagnostic: "Independent coverage assessment interrupted; assess again." });
      void assessment.handle?.interrupt().catch((error: unknown) => log.warn("interruption de l'évaluation impossible", { ticketId, reason: getErrorMessage(error) }));
      this.trackClosing(this.closeAndFinalize(assessment, "cancelled", "Recovery assessment interrupted."), ticketId);
    }
    if (plan && (plan.status === "pending" || plan.status === "running")) {
      this.store.saveImplementationPlan(ticketId, {
        ...plan,
        status: terminal ? "cancelled" : "interrupted",
        lots: plan.lots.map((lot): ImplementationPlanLot => {
          if (lot.status !== "running" && lot.status !== "pending") return lot;
          if (terminal) return { ...lot, status: "cancelled" };
          if (lot.status === "running") return { ...lot, status: "interrupted" };
          return lot;
        }),
        updatedAt: Date.now(),
      });
    }
    // NOTE(ali): drop the lots still being prepared too, otherwise a relaunched session is refused
    // with "déjà en cours"; the in-flight start bails on its epoch check and its delete is a no-op.
    const startingPrefix = `${ticketId}:`;
    for (const key of this.startingImplementations.keys()) {
      if (key.startsWith(startingPrefix)) {
        this.startingImplementations.delete(key);
      }
    }
    const lots = this.active.get(ticketId);
    if (lots) {
      this.active.delete(ticketId);
      for (const state of lots.values()) {
        state.cancelled = true;
        state.preserveWorkspace = !!plan?.recovery || (!terminal && (state.planId !== null || this.store.getImplementationQueue(ticketId).some((lot) => lot.label === state.label)));
        if (state.lotOptions !== null) this.system.cancelImplementationLot(state.lotOptions);
        void state.handle?.interrupt().catch((error: unknown) => {
          log.warn("interruption de session enfant impossible", { ticketId, reason: String(error) });
        });
        if (state.settlement === null) {
          const cleanup = (async (): Promise<void> => {
            try {
              await this.closeAndFinalize(state, "cancelled", null);
              if (state.lotOptions !== null && !state.preserveWorkspace) await this.system.discardImplementationLot(state.lotOptions);
            } finally {
              this.releaseImplementationReservation(state.reservationId);
            }
          })();
          this.trackClosing(cleanup, ticketId);
        } else if (state.childClosed && state.lotOptions !== null && !state.preserveWorkspace) {
          this.trackClosing(this.system.discardImplementationLot(state.lotOptions), ticketId);
        }
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

  async drainTicket(ticketId: string): Promise<void> {
    while ((this.closingByTicket.get(ticketId)?.size ?? 0) > 0) {
      await Promise.all([...this.closingByTicket.get(ticketId) ?? []]);
    }
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
      if (current && event.ok) {
        const parsed = submitReviewArgsSchema.safeParse(event.structuredOutput);
        if (parsed.success) {
          state.result = parsed.data;
          if (this.reviewerOptions(state.ticket).language !== "fr" && reviewProseIsFrench(parsed.data)) {
            log.warn("review structurée acceptée en français", { ticketId: state.ticketId, kind: state.kind });
          }
        } else {
          state.lastError = `réponse structurée invalide : ${parsed.error.message}`;
        }
      }
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
      this.closeAndFinalize(state, "failed", state.lastError || "réponse structurée absente");
      void this.startVerification(state, state.sourceResult, state.verificationAttempt + 1);
      return;
    }
    const failure = state.lastError || "le reviewer s'est terminé sans réponse structurée";
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
        disableWorkerTools: true,
        outputSchema: REVIEW_OUTPUT_SCHEMA,
        onToolCall: async () => ({ ok: false, result: "Session reviewer : aucun tool de pipeline n'est disponible." }),
        onEvent: (event) => this.handleReviewEvent(state, event),
      });
      state.handle.send(verificationPrompt(source.ticket, source.kind, result, this.reviewerOptions(source.ticket)));
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
    this.sessionHub.appendExternalEvent(ticketId, state.generationId, event, childTranscriptPrefix(state.label, state.provider));
    this.heartbeat(ticketId, state);
    if (event.type === "turn_end" && !state.settled) {
      state.settled = true;
      this.recordUsage(ticketId, state, event.sessionId, event.usageByModel);
      const ok = event.ok;
      setTimeout(() => {
        const settlement = this.settle(ticketId, state, ok);
        state.settlement = settlement;
        this.trackClosing(settlement, ticketId);
      }, SETTLE_DELAY_MS);
    }
  }

  /** One lot's single turn ended: tear it down and resume the parent via implementation_done. */
  private async settle(ticketId: string, state: ActiveDelegation, turnOk: boolean): Promise<void> {
    if (this.active.get(ticketId)?.get(state.label) !== state) return;
    try {
      await this.settleImplementation(ticketId, state, turnOk);
    } finally {
      this.removeLot(ticketId, state.label, state);
      this.releaseImplementationReservation(state.reservationId);
    }
  }

  private async settleImplementation(ticketId: string, state: ActiveDelegation, turnOk: boolean): Promise<void> {
    const closed = await this.closeHandle(state);
    if (!closed) this.unclosedWriters.add(ticketId);
    state.childClosed = true;
    let ok = turnOk && closed;
    let summary = ok
      ? state.lastAssistantText
      : state.lastError || state.lastAssistantText || "la session déléguée s'est terminée en erreur sans détail";
    if (!closed) summary = "La session déléguée n'a pas pu être fermée avant l'intégration de ses fichiers.";
    if (turnOk && closed && !state.cancelled) this.updatePlannedLot(ticketId, state.planId, state.label, {
      childResult: { summary: state.lastAssistantText, executionRunId: state.generationId },
    });
    let failurePhase: "startup" | "execution" | "integration" = "execution";
    if (!turnOk && state.sessionId === null) {
      failurePhase = "startup";
      const lot = this.store.getImplementationPlan(ticketId)?.lots.find((entry) => entry.label === state.label);
      this.updatePlannedLot(ticketId, state.planId, state.label, { attempts: Math.max(0, (lot?.attempts ?? 1) - (state.consumesCodeAttempt ? 1 : 0)), infrastructureAttempts: (lot?.infrastructureAttempts ?? 0) + 1 });
    }
    try {
      if (state.lotOptions !== null) {
        if (ok) failurePhase = "integration";
        if (ok && !state.cancelled) await this.system.finishImplementationLot(state.lotOptions);
        else if (!state.preserveWorkspace && !state.durableWorkspace) await this.system.discardImplementationLot(state.lotOptions);
        else this.system.cancelImplementationLot(state.lotOptions);
      }
    } catch (error) {
      ok = false;
      summary = `Intégration du lot impossible : ${getErrorMessage(error)}`;
      if (state.lotOptions !== null && !state.preserveWorkspace && !state.durableWorkspace) {
        try {
          await this.system.discardImplementationLot(state.lotOptions);
        } catch (discardError) {
          summary += ` Nettoyage impossible : ${getErrorMessage(discardError)}`;
        }
      }
      if (state.lotOptions !== null && state.durableWorkspace) this.system.cancelImplementationLot(state.lotOptions);
      this.recordLotFailure(ticketId, state.planId, state.label, "integration", summary, error);
    }
    if (state.cancelled || this.active.get(ticketId)?.get(state.label) !== state) {
      this.store.finalizeExecution({ generationId: state.generationId, status: "cancelled", usageByModel: state.usageByModel });
      return;
    }
    const { delivered, remaining } = this.store.transaction(() => {
      this.store.finalizeExecution({
        generationId: state.generationId,
        status: ok ? "completed" : "failed",
        usageByModel: state.usageByModel,
        error: ok ? null : summary,
      });
      if (ok) this.updatePlannedLot(ticketId, state.planId, state.label, { status: "completed", failurePhase: null, summary });
      else if (failurePhase !== "integration") this.recordLotFailure(ticketId, state.planId, state.label, failurePhase, summary);
      const remaining = this.remainingImplementationLots(ticketId) - 1;
      const delivered = this.sessionHub.sendEvent(ticketId, { type: "implementation_done", ok, summary, label: state.label, remaining });
      this.store.logEvent(ticketId, "delegation_done", { ok, delivered, label: state.label, remaining, summary });
      this.removePersistedImplementationQueue(ticketId, state.label);
      return { delivered, remaining };
    });
    if (ok && state.durableWorkspace && state.lotOptions !== null) {
      await this.system.discardImplementationLot(state.lotOptions).catch((error: unknown) => {
        log.warn("nettoyage du lot intégré impossible", { ticketId, label: state.label, reason: getErrorMessage(error) });
      });
    }
    this.removeLot(ticketId, state.label, state);
    log.info("délégation terminée", { ticketId, ok, delivered, label: state.label, remaining });
    if (!delivered) log.warn("implementation_done non délivré : session parente absente", { ticketId });
  }

  private async closeHandle(state: ClosableExecution): Promise<boolean> {
    const handle = state.handle;
    if (!handle) return true;
    let timeout: ReturnType<typeof setTimeout> | undefined;
    try {
      await Promise.race([
        handle.close(),
        new Promise<never>((_, reject) => {
          timeout = setTimeout(() => reject(new Error("Délai de fermeture de session enfant dépassé")), this.closeTimeoutMs);
          timeout.unref();
        }),
      ]);
      this.writerOwners.delete(state.generationId);
      return true;
    } catch (closeError) {
      const writerOwner = this.writerOwners.get(state.generationId);
      if (writerOwner) this.unclosedWriters.add(writerOwner);
      handle.dispose?.();
      log.warn("fermeture de session enfant incomplète", {
        generationId: state.generationId,
        reason: closeError instanceof Error ? closeError.message : String(closeError),
      });
      return false;
    } finally {
      if (timeout) clearTimeout(timeout);
    }
  }

  private trackClosing(closing: Promise<void>, ticketId?: string): void {
    this.closingExecutions.add(closing);
    if (ticketId !== undefined) {
      const ticketClosings = this.closingByTicket.get(ticketId) ?? new Set<Promise<void>>();
      ticketClosings.add(closing);
      this.closingByTicket.set(ticketId, ticketClosings);
    }
    void closing.finally(() => {
      this.closingExecutions.delete(closing);
      if (ticketId !== undefined) {
        const ticketClosings = this.closingByTicket.get(ticketId);
        ticketClosings?.delete(closing);
        if (ticketClosings?.size === 0) this.closingByTicket.delete(ticketId);
      }
    }).catch((error: unknown) => {
      log.warn("finalisation de session enfant impossible", { reason: String(error) });
    });
  }

  private closeAndFinalize(
    state: ClosableExecution,
    status: "completed" | "failed" | "cancelled",
    error: string | null,
  ): Promise<void> {
    const closing = this.closeHandle(state).then(() => {
      this.store.finalizeExecution({
        generationId: state.generationId,
        status,
        usageByModel: state.usageByModel,
        error,
      });
    });
    this.trackClosing(closing);
    return closing;
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
