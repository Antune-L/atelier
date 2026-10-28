import { lstat, readdir, realpath, rm } from "node:fs/promises";
import { dirname, isAbsolute, join, relative } from "node:path";

import { Elysia } from "elysia";
import { nanoid } from "nanoid";

import { autonomousResumeSchema } from "../shared/autonomous.ts";
import { ACTIVE_STAGES, isAllowedAgentPair, PRD_SINGLE_SELECTION, SCHEDULED_START_MIN_LEAD_MS, SPLIT_BRANCH_PREFIX } from "../shared/constants.ts";
import { isSplitMother } from "../shared/dependencies.ts";
import { startBlocker } from "../shared/startBlocker.ts";
import type { ConversationStatus, Implementer, Orchestrator, PrdDocumentStatus, PrMergeability, PrState, Stage, VcsProvider } from "../shared/constants.ts";
import type { CodexRuntimeStatus } from "../shared/codexCapabilities.ts";
import { assertExecutionAvailable, resolveExecution } from "./agents/executionConfig.ts";
import { QUALITY_BROWSER_CLEANUP_MARKER } from "./agents/qualityValidator.ts";
import { QUALITY_NATIVE_CLEANUP_DIRECTORY } from "./agents/qualitySession.ts";
import { runRecordedAction } from "./recordedAction.ts";
import { getErrorMessage } from "../shared/errors.ts";
import { canMergePr, canResolveConflicts } from "../shared/ticketMerge.ts";
import { resolvePrTargetBaseBranch } from "./agents/baseBranch.ts";
import type { MergePrResult } from "../shared/ticketMerge.ts";
import {
  analyzeTicketsSchema,
  consolidatePrdSchema,
  createAskSchema,
  createAutomationSchema,
  createCleanSchema,
  createCommentSchema,
  createConversationSchema,
  createProfileSchema,
  createProjectSchema,
  createReviewSchema,
  createTicketSchema,
  createTicketsFromPrdSchema,
  deriveTitleFromDescription,
  importNotionSchema,
  importTicketsSchema,
  inspectProjectSchema,
  moveTicketSchema,
  postConversationMessageSchema,
  prNotificationReviewOptionsSchema,
  recoverImplementationPlanArgsSchema,
  reorderProjectsSchema,
  scheduleTicketSchema,
  startWorktreeSessionBodySchema,
  testConnectionDraftSchema,
  updateAppSettingsSchema,
  updateAutomationSchema,
  updateConversationSchema,
  updatePrdDocumentSchema,
  updateProfileSchema,
  updateProjectSchema,
  updateProjectGroupColorSchema,
  validatePrdSchema,
} from "../shared/schemas.ts";
import type { Conversation, CreateReviewInput, CreateTicketsFromPrdInput, ManagedProject, OpenPr, PrdDocument, PrdDocumentRecord, RepoInspection, SkillStatus, SplitChildInput, Ticket, UpdateConversationInput, UpdateMode, VcsConnectionResult } from "../shared/schemas.ts";
import { orderSelectedPrdTasks, renderPrdAxisBrief, renderPrdMarkdown, renderPrdSingleBrief, renderPrdTaskBrief, resolveSelectedPrdTaskParents } from "../shared/prdMarkdown.ts";
import type { ProjectConfig } from "./config.ts";
import { MODELS, getProject, isProjectKey } from "./config.ts";

import type { AtelierManager } from "./agents/atelierManager.ts";
import { AtelierBusyError } from "./agents/atelierManager.ts";
import type { QualityManager } from "./agents/qualityManager.ts";
import type { AgentCoordinator } from "./agents/coordinator.ts";
import type { AutomationManager } from "./agents/automationManager.ts";
import type { SessionHub } from "./agents/sessionHub.ts";
import type { SlotManager } from "./agents/slotManager.ts";
import type { FeasibilityBatchManager } from "./agents/feasibilityManager.ts";
import type { ReformulateManager } from "./agents/reformulateManager.ts";
import { FeasibilityAnswerError } from "./agents/feasibilityAnswerManager.ts";
import type { FeasibilityAnswerManager } from "./agents/feasibilityAnswerManager.ts";
import { feasibilityAnswerBatchInputSchema, feasibilityAnswerInputSchema } from "../shared/schemas.ts";
import type { SplitManager } from "./agents/splitManager.ts";
import { slugify } from "./agents/slotManager.ts";
import type { TriageManager } from "./agents/triageManager.ts";
import { ProjectInUseError } from "./db/store.ts";
import type { NewReview, NewTicket, Store } from "./db/store.ts";
import { deliveryPolicyError, isCloudHost } from "./hostRole.ts";
import { readHostMetrics } from "./system/hostMetrics.ts";
import type { GithubAccountRegistry } from "./system/github/accounts.ts";
import { withSiblingGroup } from "./system/repoInspection.ts";
import type { RepoInspectionContext } from "./system/repoInspection.ts";
import { githubAccountLabel, GithubAccountError, normalizeGithubLogin } from "./system/github/accountEnv.ts";
import { CloneConflictError, CloneSourceError, CloneTimeoutError } from "./system/github/clone.ts";
import { redactSecrets } from "./system/secretRedaction.ts";
import { addGithubAccountRequestSchema, cloneProjectRequestSchema, githubLoginSchema } from "../shared/github.ts";
import type { CloneResult, GithubAccountSummary, GithubRepoSummary } from "../shared/github.ts";
import type { ClientHub } from "./hub.ts";
import type { TicketLifecycle } from "./lifecycle.ts";
import { createLogger } from "./logger.ts";
import { buildNotionImportPrompt } from "./agents/notionImport.ts";
import type { DoneGateResult, ImportNotionOptions, ReformulateOptions } from "./system/types.ts";
import { PrdRenderError, renderPrdHtml } from "./prd/renderPrdHtml.ts";
import { saveUpload } from "./uploads.ts";
import { createQualityRoutes } from "./qualityRoutes.ts";
import { createPreviewRoutes } from "./previewRoutes.ts";
import { createAuditRoutes } from "./auditRoutes.ts";
import type { AuditManager } from "./agents/auditManager.ts";
import type { PreviewManager } from "./previewManager.ts";
import {
  autonomousOptionsError,
  createTicketOperations,
  startFeasibilityInBackground,
  ticketDependencyError,
  TicketOperationError,
} from "./ticketOperations.ts";

const log = createLogger("triage");
const REVIEW_COUNT_TTL_MS = 5 * 60 * 1000;

/** 400 message when an orchestrator/implementer pair violates isAllowedAgentPair (see PR1 invariant). */
const DISALLOWED_AGENT_PAIR_MSG =
  "Combinaison orchestrateur/implémenteur non supportée : Codex orchestre uniquement Codex (la délégation croisée arrive plus tard).";

interface PaneReader {
  capturePane(sessionName: string): Promise<string>;
  listOpenPrs(repoPath: string, provider: VcsProvider): Promise<OpenPr[]>;
  listReviewCounts(projects: { repoPath: string; provider: VcsProvider }[]): Promise<Record<string, number | null>>;
  listBranches(repoPath: string): Promise<string[]>;
  testVcsConnection(repoPath: string, provider: VcsProvider): Promise<VcsConnectionResult>;
  inspectRepo(repoPath: string, context: RepoInspectionContext): Promise<Omit<RepoInspection, "existingProjectKey">>;
  readPrMergeability(repoPath: string, prUrl: string, provider: VcsProvider): Promise<PrMergeability>;
  mergePrOnUserRequest(slotPath: string, branch: string, prUrl: string, provider: VcsProvider): Promise<DoneGateResult>;
  // Desktop self-update guards + build runner (dev desktop only).
  gitCurrentBranch(repoPath: string): Promise<string>;
  gitStatusClean(repoPath: string): Promise<boolean>;
  gitPullFastForward(repoPath: string, baseBranch: string): Promise<{ ok: boolean; reason: string }>;
  runProjectScript(slotPath: string, command: string, timeoutMs: number): Promise<{ ok: boolean; output: string }>;
  createBranchFromBase(repoPath: string, branch: string, baseBranch: string): Promise<void>;
  reformulate(opts: ReformulateOptions): Promise<string>;
  importNotion(opts: ImportNotionOptions): Promise<string>;
  checkCodexRuntime(refresh?: boolean): Promise<CodexRuntimeStatus>;
  checkClaudeAvailable(): Promise<boolean>;
  checkSkills(): Promise<SkillStatus[]>;
  githubAccounts(): GithubAccountRegistry;
  listGithubRepos(account: string | null): Promise<GithubRepoSummary[]>;
  cloneGithubRepo(opts: { source: string; account: string | null }): Promise<CloneResult>;
  checkGithubAvailable(): Promise<boolean>;
}

interface RouteDeps {
  previews?: PreviewManager;
  audits?: AuditManager;
  quality?: QualityManager;
  qualityArtifactDirectory?: string;
  store: Store;
  hub: ClientHub;
  lifecycle: TicketLifecycle;
  slots: SlotManager;
  coordinator: AgentCoordinator;
  sessionHub: SessionHub;
  system: PaneReader;
  triage: TriageManager;
  feasibility: FeasibilityBatchManager;
  split: SplitManager;
  atelier: AtelierManager;
  reformulate: ReformulateManager;
  feasibilityAnswers: FeasibilityAnswerManager;
  automations: AutomationManager;
  projectRoot: string;
  resourcesRoot?: string;
  /** Probed once at boot: is the Cursor headless CLI (Composer driver) usable? */
  composerAvailable: boolean;
  /** The real checkout root, for the self-update git guards + rebuild (desktop dev only). */
  repoRoot?: string;
  /** Tear down the server (not tmux) and relaunch the desktop app. Set only in dev desktop. */
  onRequestUpdate?: () => void;
  /** Native folder picker (desktop only); resolves to the picked path or null when cancelled. */
  pickFolder?: () => Promise<string | null>;
}

/** Branch the self-update tracks; mismatch blocks the update (no auto-switch). */
const UPDATE_BASE_BRANCH = "main";
/** Generous bound for the pre-relaunch web + agents rebuild. */
const UPDATE_BUILD_TIMEOUT_MS = 300_000;
/** Let the {ok:true} response flush before tearing the server down + relaunching. */
const UPDATE_RELAUNCH_DELAY_MS = 200;
/** Keep only the tail of a failed build's output in the surfaced error. */
const BUILD_ERROR_TAIL = 600;
/** Timeout for lightweight git introspection commands (rev-parse, diff --name-only). */
const GIT_QUERY_TIMEOUT_MS = 5_000;
/** Reported PR state for directPush tickets, which have no real PR to query. */
const DIRECT_PUSH_MERGED_STATE: PrState = "merged";
/** Reported PR state for split mothers, whose integration branch carries no real PR to query. */
const SPLIT_MERGED_STATE: PrState = "merged";
/** Length of the generated, opaque project key (nanoid). */
const PROJECT_KEY_LENGTH = 10;
/**
 * Strict allowlist: only paths under src/web/ are considered frontend-only.
 * src/shared/** is excluded — it is consumed by the server at runtime, so a change there requires
 * a full relaunch. Any unrecognised path defaults conservatively to a full relaunch.
 */
function isWebOnlyPath(filePath: string): boolean {
  return filePath.startsWith("src/web/");
}

const HTTP_CREATED = 201;
const HTTP_NO_CONTENT = 204;
const HTTP_BAD_REQUEST = 400;
const HTTP_NOT_FOUND = 404;
const HTTP_CONFLICT = 409;
const HTTP_INTERNAL_ERROR = 500;
const HTTP_BAD_GATEWAY = 502;
const SCHEDULED_START_SET_EVENT = "scheduled_start_set";
const SCHEDULED_START_CANCELLED_EVENT = "scheduled_start_cancelled";

/** Shared bullet list describing the target PR of a review/clean card. */
function prSummaryLines(pr: OpenPr): string[] {
  const lines = [
    `- **Titre** : ${pr.title}`,
    `- **Branche** : \`${pr.headBranch}\``,
    `- **Auteur** : ${pr.author}`,
  ];
  // Azure DevOps exposes no diff stat on a PR; omit the bullet rather than print zeros.
  if (pr.additions !== null && pr.deletions !== null) {
    lines.push(`- **Diff** : +${pr.additions} / -${pr.deletions}`);
  }
  return lines;
}

/** Markdown body shown on a review card, summarizing the target PR. */
function reviewDescription(pr: OpenPr): string {
  return [`Revue autonome (argus) de [PR #${pr.number}](${pr.url})`, "", ...prSummaryLines(pr)].join("\n");
}

function reviewTicketInput(input: CreateReviewInput, pr: OpenPr, language: NewReview["reviewLanguage"]): NewReview {
  return {
    title: `Review PR #${pr.number} — ${pr.title}`,
    description: reviewDescription(pr),
    project: input.project,
    prNumber: pr.number,
    prHeadBranch: pr.headBranch,
    prUrl: pr.url,
    baseBranch: input.baseBranch ?? pr.baseBranch,
    reviewDepth: input.depth,
    postComments: input.postComments,
    fixComments: input.fixComments,
    reviewLanguage: input.language ?? language,
    humanTone: input.humanTone,
    model: input.model,
    effort: input.effort,
    orchestrator: input.orchestrator,
    codexModel: input.codexModel,
    codexEffort: input.codexEffort,
    codexFast: input.codexFast,
  };
}

/** Markdown body shown on a clean card, summarizing the target PR and the user-provided context. */
function cleanDescription(pr: OpenPr, context: string): string {
  return [
    `Nettoyage des retours de [PR #${pr.number}](${pr.url})`,
    "",
    ...prSummaryLines(pr),
    "",
    "## Contexte fourni",
    context.trim() || "(aucun)",
  ].join("\n");
}

/** Project the stored config onto the 6-field managed-project DTO (omit color when unset). */
function toManagedProject(key: string, p: ProjectConfig): ManagedProject {
  return {
    key,
    label: p.label,
    repoPath: p.repoPath,
    baseBranch: p.baseBranch,
    commitTimeoutMs: p.commitTimeoutMs,
    vcsProvider: p.vcsProvider,
    hidden: p.hidden ?? false,
    sortOrder: p.sortOrder ?? 0,
    githubAccount: p.githubAccount ?? null,
    ...(p.group !== undefined ? { group: p.group } : {}),
    ...(p.validation !== undefined ? { validation: p.validation } : {}),
    ...(p.color !== undefined ? { color: p.color } : {}),
  };
}

function jsonError(set: { status?: number | string }, status: number, message: string): { error: string } {
  set.status = status;
  return { error: message };
}

const HTTP_GATEWAY_TIMEOUT = 504;
const AZURE_ACCOUNT_REFUSED_MESSAGE = "Un compte GitHub ne peut pas être rattaché à un projet Azure DevOps.";

/** Labels of the projects attached to `login` (case-insensitive). */
function projectsAttachedTo(store: Store, login: string): string[] {
  const normalized = normalizeGithubLogin(login);
  return store.listProjectKeys().flatMap((key) => {
    const row = store.getProjectRow(key);
    return row?.githubAccount !== undefined && normalizeGithubLogin(row.githubAccount) === normalized ? [row.label] : [];
  });
}

/** A ticket still running or holding a slot pins its project's account. */
function hasActiveTickets(store: Store, projectKey: string): boolean {
  return store.listTickets(false).some((ticket) => ticket.project === projectKey
    && ((ticket.stage !== null && ACTIVE_STAGES.includes(ticket.stage)) || ticket.stage === "awaiting_answers" || ticket.slotId !== null));
}

/** Canonical (lowercase) registered login, null for the machine account, or an error message. */
async function registeredGithubAccount(system: PaneReader, account: string | null): Promise<{ login: string | null } | { error: string }> {
  if (account === null) return { login: null };
  const normalized = normalizeGithubLogin(account);
  const logins = (await system.githubAccounts().logins()).map(normalizeGithubLogin);
  if (!logins.includes(normalized)) return { error: `Compte GitHub « ${account} » non enregistré : ajoute-le dans les Réglages.` };
  return { login: normalized };
}

/** Same inspection as POST /projects/inspect: suggested fields plus an already-registered project. */
async function inspectProjectFolder(store: Store, system: PaneReader, repoPath: string): Promise<RepoInspection> {
  const requestedPath = normalizeRepoPath(repoPath);
  const parentPath = dirname(requestedPath);
  const knownGroups = new Set<string>();
  const siblingGroups: (string | null)[] = [];
  let existingProjectKey: string | null = null;
  for (const key of store.listProjectKeys()) {
    const row = store.getProjectRow(key);
    if (!row) continue;
    if (row.group) knownGroups.add(row.group);
    const rowPath = normalizeRepoPath(row.repoPath);
    if (existingProjectKey === null && rowPath === requestedPath) existingProjectKey = key;
    if (rowPath !== requestedPath && dirname(rowPath) === parentPath) siblingGroups.push(row.group ?? null);
  }
  const githubLogins = await system.githubAccounts().logins().catch(() => []);
  const inspection = await system.inspectRepo(repoPath, { knownGroups: [...knownGroups], githubLogins });
  return { ...withSiblingGroup(inspection, siblingGroups), existingProjectKey } satisfies RepoInspection;
}

/** HTTP status of a clone/listing failure; the message is always redacted. */
function githubFailureStatus(error: unknown): number {
  if (error instanceof CloneSourceError) return HTTP_BAD_REQUEST;
  if (error instanceof CloneConflictError) return HTTP_CONFLICT;
  if (error instanceof CloneTimeoutError) return HTTP_GATEWAY_TIMEOUT;
  return HTTP_BAD_GATEWAY;
}

const TRAILING_SLASHES = /\/+$/;
const VCS_CONNECTION_FAILURE_MESSAGE = "échec du test de connexion";
const REPO_INSPECTION_FAILURE_MESSAGE = "échec de l'inspection du dossier";

function normalizeRepoPath(repoPath: string): string {
  return repoPath.trim().replace(TRAILING_SLASHES, "") || repoPath.trim();
}

/** A connection probe that threw still answers with the probe's own `ok: false` shape. */
function vcsConnectionFailure(error: unknown): VcsConnectionResult {
  return { ok: false, message: getErrorMessage(error, VCS_CONNECTION_FAILURE_MESSAGE), checkedAt: Date.now() };
}

function ticketOperationError(
  set: { status?: number | string },
  error: TicketOperationError,
): { error: string } {
  if (error.code === "NOT_FOUND") return jsonError(set, HTTP_NOT_FOUND, error.message);
  if (error.code === "CONFLICT") return jsonError(set, HTTP_CONFLICT, error.message);
  return jsonError(set, HTTP_BAD_REQUEST, error.message);
}

/** 400 response when the (orchestrator, implementer) pair is disallowed (Codex orchestrates only Codex — PR1), else null. */
function agentPairError(
  set: { status?: number | string },
  orchestrator: Orchestrator,
  implementer: Implementer,
): { error: string } | null {
  if (isAllowedAgentPair(orchestrator, implementer)) return null;
  return jsonError(set, HTTP_BAD_REQUEST, DISALLOWED_AGENT_PAIR_MSG);
}

/** A ticket is locked (only comments + abandon allowed) while it is being processed. */
function isProcessing(stage: Stage | null): boolean {
  if (stage === null) return false;
  if (stage === "awaiting_answers") return true;
  return ACTIVE_STAGES.includes(stage);
}

const MARK_MERGED_FAILED = "impossible de marquer la PR comme mergée";

function markMergedBlocker(ticket: Ticket, store: Store): string | null {
  if (isProcessing(ticket.stage)) return "ticket en traitement : attends la fin ou abandonne-le avant de le marquer mergé";
  if (store.getActiveQualityIteration(ticket.id)) return "Itération qualité en cours : utilise son action dédiée ou annule-la.";
  return null;
}

const MANUAL_MERGED_EVENT = "manual_merged";
const mergesInFlight = new Set<string>();

/** Mother branch name for a split: `split/<motherId>-<slug>`. */
function splitMotherBranch(ticket: Ticket): string {
  return `${SPLIT_BRANCH_PREFIX}${ticket.id}-${slugify(ticket.title)}`;
}

/**
 * A split of a PRD card has already disconnected its planning session by the time the work commits.
 * On failure past that point the card can't go back to awaiting PRD validation, so land it in "failed"
 * with the reason (and free its slot if still held). A TODO card never held a slot — leave it untouched.
 */
async function failSplitMother(deps: RouteDeps, ticket: Ticket, reason: string): Promise<void> {
  const { store, hub, slots } = deps;
  if (ticket.slotId === null) return;
  if (store.getSlot(ticket.slotId)?.ticketId === ticket.id) {
    await slots.releaseSlot(ticket.slotId, ticket);
  }
  const failed = store.updateTicket(ticket.id, {
    column: "failed",
    stage: null,
    slotId: null,
    error: `Découpage échoué : ${reason}`,
  });
  hub.pushTicket(failed);
}

/**
 * Default pipeline toggles a split child inherits (the family runs auto-merge stacked PRs). A cloud
 * host only delivers PRs, so its children start without auto-merge or direct push.
 */
function splitChildDefaults(ticket: Ticket): Pick<
  NewTicket,
  | "externalUrl"
  | "project"
  | "prdEnabled"
  | "prDraft"
  | "autoMerge"
  | "addScreenshots"
  | "verifyFeature"
  | "argusMultiLoop"
  | "stealth"
  | "directPush"
  | "baseBranch"
  | "model"
  | "effort"
  | "implementerModel"
  | "implementerEffort"
  | "implementer"
  | "orchestrator"
  | "codexModel"
  | "codexEffort"
  | "codexFast"
  | "codexImplementerModel"
  | "codexImplementerEffort"
  | "codexImplementerFast"
> {
  return {
    externalUrl: null,
    project: ticket.project,
    prdEnabled: false,
    prDraft: true,
    autoMerge: !isCloudHost(),
    addScreenshots: false,
    verifyFeature: false,
    argusMultiLoop: false,
    stealth: false,
    directPush: false,
    baseBranch: null,
    model: ticket.model,
    effort: ticket.effort,
    implementerModel: ticket.implementerModel,
    implementerEffort: ticket.implementerEffort,
    implementer: ticket.implementer,
    orchestrator: ticket.orchestrator,
    codexModel: ticket.codexModel,
    codexEffort: ticket.codexEffort,
    codexFast: ticket.codexFast,
    codexImplementerModel: ticket.codexImplementerModel,
    codexImplementerEffort: ticket.codexImplementerEffort,
    codexImplementerFast: ticket.codexImplementerFast,
  };
}

class QualityCleanupObligationError extends Error {}

async function removeQualityArtifacts(deps: RouteDeps, ticketId: string): Promise<void> {
  const runIds = deps.store.getTicketQuality(ticketId).runs.map((run) => run.id);
  if (!deps.qualityArtifactDirectory || runIds.length === 0) return;
  let root: string;
  try { root = await realpath(deps.qualityArtifactDirectory); } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") return;
    throw error;
  }
  for (const runId of runIds) {
    const path = join(root, runId);
    let resolved: string;
    try { resolved = await realpath(path); } catch (error) {
      if (error instanceof Error && "code" in error && error.code === "ENOENT") continue;
      throw error;
    }
    const withinRoot = relative(root, resolved);
    if (!withinRoot || withinRoot.startsWith("..") || isAbsolute(withinRoot)) throw new Error("Quality artifact directory is outside its controlled root.");
    for (const marker of [join(resolved, QUALITY_BROWSER_CLEANUP_MARKER), join(resolved, "browser", QUALITY_BROWSER_CLEANUP_MARKER)]) {
      try { await lstat(marker); } catch (error) {
        if (error instanceof Error && "code" in error && error.code === "ENOENT") continue;
        throw error;
      }
      throw new QualityCleanupObligationError("Browser session closure is unconfirmed. The ticket and its private artifacts are retained.");
    }
    for (const scope of [resolved, join(resolved, "browser"), join(resolved, "relevance")]) {
      try {
        if ((await readdir(join(scope, QUALITY_NATIVE_CLEANUP_DIRECTORY))).length === 0) continue;
      } catch (error) {
        if (error instanceof Error && "code" in error && error.code === "ENOENT") continue;
        throw error;
      }
      throw new QualityCleanupObligationError("Native session closure is unconfirmed. The ticket and its private artifacts are retained.");
    }
    await rm(path, { recursive: true, force: true });
  }
}

/**
 * Recursively create a split subtree under `parentTicket` (whose `parentBranch` already exists). Each
 * leaf becomes a regular todo child depending on its parent; each node with children becomes an
 * intermediate sub-mother: its own split/… branch is forked from the parent branch, it lands in "done",
 * and its children stack on it. Every created ticket id is collected so the caller can roll back on a
 * mid-tree branch failure.
 */
async function createSplitChildren(
  deps: RouteDeps,
  project: { repoPath: string },
  ticket: Ticket,
  parentTicket: Ticket,
  parentBranch: string,
  nodes: SplitChildInput[],
  createdIds: string[],
): Promise<Ticket[]> {
  const { store, hub, system } = deps;
  const created: Ticket[] = [];
  for (const [i, node] of nodes.entries()) {
    const child = store.createTicket({
      ...splitChildDefaults(ticket),
      title: node.title,
      description: node.summary,
      dependsOn: parentTicket.id,
      childOrder: i,
    });
    createdIds.push(child.id);

    if (node.children.length > 0) {
      const subBranch = splitMotherBranch(child);
      await system.createBranchFromBase(project.repoPath, subBranch, parentBranch);
      const subList = node.children.map((c) => `- ${c.title}`).join("\n");
      const subMother = store.updateTicket(child.id, {
        branch: subBranch,
        column: "done",
        stage: null,
        slotId: null,
        finishedAt: Date.now(),
        agentSummary: `## Découpage en sous-tickets\n\n${subList}`,
      });
      hub.pushTicket(subMother);
      created.push(subMother);
      const descendants = await createSplitChildren(deps, project, ticket, subMother, subBranch, node.children, createdIds);
      created.push(...descendants);
      continue;
    }

    hub.pushTicket(child);
    created.push(child);
  }
  return created;
}

/**
 * Run the split sub-agent then orchestrate the documented workaround: create + push the mother
 * integration branch, then recursively create the (possibly multi-level) subtree of children, and
 * move the mother to Done with a summary. The sub-agent runs FIRST (it disconnects a PRD card's
 * planning session anyway); only once it succeeds do we commit side effects. If any branch push
 * fails the just-created children are rolled back so no orphan child cards survive.
 */
async function performSplit(
  deps: RouteDeps,
  ticket: Ticket,
  project: { repoPath: string; baseBranch: string },
): Promise<{ created: Ticket[]; mother: Ticket }> {
  const { store, hub, system, split, slots } = deps;
  if (ticket.dependsOn !== null) throw new Error("A ticket with a dependency cannot be split.");

  // Decompose first. For a PRD card this disconnects the planning session (the split session is keyed
  // by the same ticketId); a failure here means we have not created any child or branch yet, so a TODO
  // card stays untouched and a PRD card is moved to "failed" (its planning session is already gone).
  let result;
  try {
    result = await split.run(ticket.id);
  } catch (error) {
    const reason = getErrorMessage(error, "découpage interrompu");
    await failSplitMother(deps, ticket, reason);
    throw error;
  }

  // Committed to mutating now: release the (defunct) planning slot a PRD card still holds. A TODO card
  // has no slot, so this is a no-op.
  if (ticket.slotId !== null && store.getSlot(ticket.slotId)?.ticketId === ticket.id) {
    await slots.releaseSlot(ticket.slotId, ticket);
  }

  // Create + push the mother integration branch from the project default base, or the mother's own
  // override when set (the mother has no dependsOn parent of its own to stack on), then recursively
  // create the subtree forked from it. On any failure, roll back every created child so a wedged push
  // never leaves orphan child cards behind.
  const baseBranch = ticket.baseBranch ?? project.baseBranch;
  const motherBranch = splitMotherBranch(ticket);
  const createdIds: string[] = [];
  let created: Ticket[];
  try {
    await system.createBranchFromBase(project.repoPath, motherBranch, baseBranch);
    created = await createSplitChildren(deps, project, ticket, ticket, motherBranch, result.children, createdIds);
  } catch (error) {
    for (const id of createdIds) {
      await removeQualityArtifacts(deps, id);
      store.deleteTicket(id);
      hub.pushTicketRemoved(id);
    }
    await failSplitMother(deps, ticket, getErrorMessage(error, "création de la branche mère échouée"));
    throw error;
  }

  // Move the mother to Done with the (top-level) children list + overall summary.
  const childList = result.children.map((c) => `- ${c.title}`).join("\n");
  const agentSummary = `## Découpage en sous-tickets\n\n${childList}\n\n${result.summary}`;
  const mother = store.updateTicket(ticket.id, {
    branch: motherBranch,
    column: "done",
    stage: null,
    slotId: null,
    finishedAt: Date.now(),
    agentSummary,
  });
  hub.pushTicket(mother);

  return { created, mother };
}

function scheduledStartTimeError(scheduledStartAt: number, now: number): string | null {
  if (scheduledStartAt < now + SCHEDULED_START_MIN_LEAD_MS) return "l'heure de lancement doit être au moins une minute dans le futur";
  return null;
}

function scheduleConflictError(store: Store, ticket: Ticket): string | null {
  if (ticket.kind !== "feature") return "seul un ticket feature peut être programmé";
  if (ticket.column !== "todo" || ticket.archived) return "seul un ticket « À faire » peut être programmé";
  if (ticket.slotId !== null || store.listSlots().some((slot) => slot.ticketId === ticket.id)) return "ce ticket occupe encore un slot : relance-le ou abandonne-le d'abord";
  return null;
}

function parkOrStart(deps: RouteDeps, ticket: Ticket, start: boolean): Ticket {
  const { store, hub, lifecycle, slots } = deps;
  // A blocked child stays in todo even with start=true: the parent's done() will auto-start it.
  if (!start || startBlocker(ticket, store.getDependencyParent(ticket)) !== null) {
    hub.pushTicket(ticket);
    if (!start) startFeasibilityInBackground(deps.feasibility, [ticket.id], ticket.project);
    return ticket;
  }
  const started = lifecycle.enqueue(ticket.id);
  // Slot launch does slow git worktree setup; don't block the HTTP response on it.
  void slots.startTicket(ticket.id).catch((e) => {
    log.error("démarrage du ticket échoué", {
      ticketId: ticket.id,
      error: getErrorMessage(e),
    });
  });
  return started;
}

const ATELIER_DEFAULT_TITLE = "Nouvelle conversation";
const ATELIER_SEED_TITLE_MAX_LENGTH = 60;
const ATELIER_SETTING_KEYS = [
  "orchestrator",
  "model",
  "effort",
  "codexModel",
  "codexEffort",
  "codexFast",
  "researchEnabled",
  "researchOptions",
] as const satisfies readonly (keyof UpdateConversationInput & keyof Conversation)[];
const PRD_JSON_CONTENT_TYPE = "application/json; charset=utf-8";
const PRD_HTML_CONTENT_TYPE = "text/html; charset=utf-8";
const CONVERSATION_NOT_FOUND = "conversation introuvable";
const PRD_NOT_FOUND = "PRD introuvable";
const CONVERSATION_STATUS_FOR_PRD: Record<PrdDocumentStatus, ConversationStatus> = {
  draft: "prd_draft",
  validated: "prd_validated",
};

function conversationTitle(title: string | undefined, seed: string | undefined): string {
  if (title) return title;
  const seedLine = seed?.replace(/\s+/g, " ").trim().slice(0, ATELIER_SEED_TITLE_MAX_LENGTH).trim();
  return seedLine || ATELIER_DEFAULT_TITLE;
}

function settingsChanged(before: Conversation, patch: UpdateConversationInput): boolean {
  return ATELIER_SETTING_KEYS.some((key) => {
    const next = patch[key];
    return next !== undefined && JSON.stringify(next) !== JSON.stringify(before[key]);
  });
}

function attachment(body: string, contentType: string, filename: string): Response {
  return new Response(body, {
    headers: { "content-type": contentType, "content-disposition": `attachment; filename="${filename}"` },
  });
}

function prdExportName(record: PrdDocumentRecord, extension: string): string {
  return `${record.document.id}-rev${record.revision}.${extension}`;
}

interface PrdCardDraft {
  candidateId: string;
  title: string;
  description: string;
  sourcePrdTask: string | null;
  dependsOnTask: string | null;
}

function prdCardDrafts(doc: PrdDocument, input: CreateTicketsFromPrdInput): PrdCardDraft[] | string {
  const selected = new Set(input.selection);
  if (input.split === "single") {
    return [{ candidateId: PRD_SINGLE_SELECTION, title: doc.title, description: renderPrdSingleBrief(doc), sourcePrdTask: null, dependsOnTask: null }];
  }
  if (input.split === "axes") {
    const unknown = input.selection.find((id) => !doc.axes.some((axis) => axis.id === id));
    if (unknown !== undefined) return `axe inconnu : ${unknown}`;
    return doc.axes.filter((axis) => selected.has(axis.id)).map((axis) => ({
      candidateId: axis.id,
      title: `${axis.id} — ${axis.title}`,
      description: renderPrdAxisBrief(doc, axis.id) ?? axis.summary,
      sourcePrdTask: null,
      dependsOnTask: null,
    }));
  }
  const resolution = resolveSelectedPrdTaskParents(doc, selected);
  if (!resolution.ok) return resolution.error.message;
  return orderSelectedPrdTasks(doc, selected).map((task) => ({
    candidateId: task.id,
    title: `${task.id} — ${task.title}`,
    description: renderPrdTaskBrief(doc, task.id) ?? task.expectedOutcome,
    sourcePrdTask: task.id,
    dependsOnTask: resolution.parents.get(task.id)?.dependsOnTaskId ?? null,
  }));
}

function createAtelierRoutes(deps: RouteDeps) {
  const { store, hub, atelier } = deps;

  function pushConversationStatus(conversationId: string, status: ConversationStatus): void {
    hub.pushConversation(store.updateConversation(conversationId, { status }));
  }

  function setConversationSettled(conversationId: string, settled: boolean, set: { status?: number | string }): Conversation | { error: string } {
    const conversation = store.getConversation(conversationId);
    if (!conversation) return jsonError(set, HTTP_NOT_FOUND, CONVERSATION_NOT_FOUND);
    if (conversation.settled === settled) return conversation;
    const updated = store.setConversationSettled(conversationId, settled);
    hub.pushConversation(updated);
    return updated;
  }

  function setConversationUnread(conversationId: string, unread: boolean, set: { status?: number | string }): Conversation | { error: string } {
    const conversation = store.getConversation(conversationId);
    if (!conversation) return jsonError(set, HTTP_NOT_FOUND, CONVERSATION_NOT_FOUND);
    if (conversation.unread === unread) return conversation;
    const updated = store.setConversationUnread(conversationId, unread);
    hub.pushConversation(updated);
    return updated;
  }

  return new Elysia({ prefix: "/atelier" })
    .get("/conversations", ({ query }) => store.listConversations(query.project || undefined))
    .post("/conversations", ({ body, set }) => {
      const parsed = createConversationSchema.safeParse(body);
      if (!parsed.success) return jsonError(set, HTTP_BAD_REQUEST, parsed.error.message);
      const input = parsed.data;
      if (!isProjectKey(input.project)) return jsonError(set, HTTP_BAD_REQUEST, "projet inconnu");
      const conversation = store.createConversation({
        project: input.project,
        title: conversationTitle(input.title, input.seed),
        orchestrator: input.orchestrator,
        model: input.model,
        effort: input.effort,
        codexModel: input.codexModel,
        codexEffort: input.codexEffort,
        codexFast: input.codexFast ?? MODELS.codexFast,
        researchEnabled: input.researchEnabled,
        researchOptions: input.researchOptions,
      });
      hub.pushConversation(conversation);
      if (input.seed) void atelier.postMessage(conversation.id, input.seed).delivered;
      return store.getConversation(conversation.id) ?? conversation;
    })
    .get("/conversations/:id", ({ params, set }) => {
      const conversation = store.getConversation(params.id);
      if (!conversation) return jsonError(set, HTTP_NOT_FOUND, CONVERSATION_NOT_FOUND);
      return {
        conversation,
        messages: store.listConversationMessages(params.id),
        prds: store.listPrdDocuments(params.id),
      };
    })
    .patch("/conversations/:id", ({ params, body, set }) => {
      const conversation = store.getConversation(params.id);
      if (!conversation) return jsonError(set, HTTP_NOT_FOUND, CONVERSATION_NOT_FOUND);
      const parsed = updateConversationSchema.safeParse(body);
      if (!parsed.success) return jsonError(set, HTTP_BAD_REQUEST, parsed.error.message);
      const updated = store.updateConversation(params.id, parsed.data);
      hub.pushConversation(updated);
      if (settingsChanged(conversation, parsed.data)) atelier.settingsChanged(params.id);
      return store.getConversation(params.id) ?? updated;
    })
    .delete("/conversations/:id", ({ params, set }) => {
      if (!store.getConversation(params.id)) return jsonError(set, HTTP_NOT_FOUND, CONVERSATION_NOT_FOUND);
      atelier.close(params.id);
      store.deleteConversation(params.id);
      hub.pushConversationRemoved(params.id);
      return { ok: true };
    })
    .post("/conversations/:id/messages", ({ params, body, set }) => {
      if (!store.getConversation(params.id)) return jsonError(set, HTTP_NOT_FOUND, CONVERSATION_NOT_FOUND);
      const parsed = postConversationMessageSchema.safeParse(body);
      if (!parsed.success) return jsonError(set, HTTP_BAD_REQUEST, parsed.error.message);
      const { message, delivered } = atelier.postMessage(params.id, parsed.data.content);
      void delivered;
      return { message };
    })
    .post("/conversations/:id/interrupt", async ({ params, set }) => {
      if (!store.getConversation(params.id)) return jsonError(set, HTTP_NOT_FOUND, CONVERSATION_NOT_FOUND);
      await atelier.interrupt(params.id);
      return { ok: true };
    })
    .post("/conversations/:id/compact", async ({ params, set }) => {
      const outcome = await atelier.compact(params.id);
      if (outcome.ok) return { conversation: outcome.conversation };
      if (outcome.reason === "not_found") return jsonError(set, HTTP_NOT_FOUND, CONVERSATION_NOT_FOUND);
      return jsonError(set, HTTP_CONFLICT, outcome.message);
    })
    .post("/conversations/:id/read", ({ params, set }) => setConversationUnread(params.id, false, set))
    .post("/conversations/:id/unread", ({ params, set }) => setConversationUnread(params.id, true, set))
    .post("/conversations/:id/settle", ({ params, set }) => setConversationSettled(params.id, true, set))
    .post("/conversations/:id/unsettle", ({ params, set }) => setConversationSettled(params.id, false, set))
    .post("/conversations/:id/consolidate", ({ params, body, set }) => {
      if (!store.getConversation(params.id)) return jsonError(set, HTTP_NOT_FOUND, CONVERSATION_NOT_FOUND);
      const parsed = consolidatePrdSchema.safeParse(body ?? {});
      if (!parsed.success) return jsonError(set, HTTP_BAD_REQUEST, parsed.error.message);
      try {
        void atelier.consolidate(params.id, parsed.data.feedback).delivered;
      } catch (error) {
        if (error instanceof AtelierBusyError) return jsonError(set, HTTP_CONFLICT, error.message);
        throw error;
      }
      return { ok: true };
    })
    .patch("/prd/:id", ({ params, body, set }) => {
      const record = store.getPrdDocument(params.id);
      if (!record) return jsonError(set, HTTP_NOT_FOUND, PRD_NOT_FOUND);
      const parsed = updatePrdDocumentSchema.safeParse(body);
      if (!parsed.success) return jsonError(set, HTTP_BAD_REQUEST, parsed.error.message);
      const updated = store.updatePrdDocument(params.id, parsed.data);
      hub.pushPrdDocument(updated);
      if (parsed.data.status) pushConversationStatus(updated.conversationId, CONVERSATION_STATUS_FOR_PRD[parsed.data.status]);
      return updated;
    })
    .post("/prd/:id/regenerate", ({ params, set }) => {
      if (!store.getPrdDocument(params.id)) return jsonError(set, HTTP_NOT_FOUND, PRD_NOT_FOUND);
      try {
        void atelier.regenerate(params.id).delivered;
      } catch (error) {
        if (error instanceof AtelierBusyError) return jsonError(set, HTTP_CONFLICT, error.message);
        throw error;
      }
      return { ok: true };
    })
    .get("/prd/:id/export.json", ({ params, set }) => {
      const record = store.getPrdDocument(params.id);
      if (!record) return jsonError(set, HTTP_NOT_FOUND, PRD_NOT_FOUND);
      return attachment(JSON.stringify(record.document, null, 2), PRD_JSON_CONTENT_TYPE, prdExportName(record, "prd.json"));
    })
    .get("/prd/:id/export.html", async ({ params, set }) => {
      const record = store.getPrdDocument(params.id);
      if (!record) return jsonError(set, HTTP_NOT_FOUND, PRD_NOT_FOUND);
      const previous = store.listPrdDocuments(record.conversationId).find((candidate) => candidate.revision === record.revision - 1);
      try {
        const html = await renderPrdHtml({
          document: record.document,
          previous: previous?.document ?? null,
          ...(deps.resourcesRoot !== undefined ? { resourcesRoot: deps.resourcesRoot } : {}),
        });
        return attachment(html, PRD_HTML_CONTENT_TYPE, prdExportName(record, "prd.html"));
      } catch (error) {
        if (error instanceof PrdRenderError) return jsonError(set, HTTP_BAD_GATEWAY, error.message);
        throw error;
      }
    })
    .post("/prd/:id/tickets", ({ params, body, set }) => {
      const record = store.getPrdDocument(params.id);
      if (!record) return jsonError(set, HTTP_NOT_FOUND, PRD_NOT_FOUND);
      const conversation = store.getConversation(record.conversationId);
      if (!conversation) return jsonError(set, HTTP_NOT_FOUND, CONVERSATION_NOT_FOUND);
      const parsed = createTicketsFromPrdSchema.safeParse(body);
      if (!parsed.success) return jsonError(set, HTTP_BAD_REQUEST, parsed.error.message);
      if (!isProjectKey(conversation.project)) return jsonError(set, HTTP_BAD_REQUEST, "projet inconnu");
      const { options, start } = parsed.data;
      const pairError = agentPairError(set, options.orchestrator, options.implementer);
      if (pairError) return pairError;
      const deliveryError = deliveryPolicyError(options);
      if (deliveryError) return jsonError(set, HTTP_BAD_REQUEST, deliveryError);
      const drafts = prdCardDrafts(record.document, parsed.data);
      if (typeof drafts === "string") return jsonError(set, HTTP_BAD_REQUEST, drafts);
      const overrides = new Map<string, NonNullable<CreateTicketsFromPrdInput["overrides"]>[number]>();
      for (const override of parsed.data.overrides ?? []) {
        if (overrides.has(override.candidateId)) return jsonError(set, HTTP_BAD_REQUEST, `Duplicate candidate override: ${override.candidateId}`);
        if (!parsed.data.selection.includes(override.candidateId) || !drafts.some((draft) => draft.candidateId === override.candidateId)) return jsonError(set, HTTP_BAD_REQUEST, `Override candidate is not a valid selection: ${override.candidateId}`);
        overrides.set(override.candidateId, override);
      }
      if (overrides.size > 0 && parsed.data.split === "single" && parsed.data.selection.some((id) => id !== PRD_SINGLE_SELECTION)) return jsonError(set, HTTP_BAD_REQUEST, "Unknown candidate in single-card selection");
      const prdMarkdown = renderPrdMarkdown(record.document);
      const stealth = options.directPush ? false : options.stealth;
      const autoMerge = stealth || options.directPush ? false : options.autoMerge;
      const created = new Map<string, string>();
      const tickets = drafts.map((draft) => {
        const override = overrides.get(draft.candidateId);
        const ticket = store.createTicket({
          ...options,
          stealth,
          autoMerge,
          project: conversation.project,
          prdEnabled: false,
          externalUrl: null,
          title: override?.title ?? draft.title,
          description: override?.description ?? draft.description,
          dependsOn: draft.dependsOnTask === null ? null : created.get(draft.dependsOnTask) ?? null,
          prdMarkdown,
          sourcePrdId: record.id,
          sourcePrdTask: draft.sourcePrdTask,
        });
        if (draft.sourcePrdTask !== null) created.set(draft.sourcePrdTask, ticket.id);
        return parkOrStart(deps, ticket, start);
      });
      pushConversationStatus(conversation.id, "cards_created");
      return { tickets };
    });
}

export function createApiRoutes(deps: RouteDeps) {
  const { store, hub, lifecycle, slots, coordinator, automations } = deps;
  const ticketOperations = createTicketOperations({ store, hub, lifecycle, slots, feasibility: deps.feasibility });
  let reviewCountsCache: { identity: string; counts: Record<string, number | null>; checkedAt: number } | null = null;
  let pendingReviewCounts: {
    identity: string;
    result: Promise<{ counts: Record<string, number | null>; checkedAt: number }>;
    refreshResult?: Promise<{ counts: Record<string, number | null>; checkedAt: number }>;
  } | null = null;
  let reviewCountsSequence = 0;
  const projectPrCache = new Map<string, { identity: string; prs: OpenPr[]; checkedAt: number }>();
  const projectPrPending = new Map<string, { identity: string; result: Promise<OpenPr[]>; refreshResult?: Promise<OpenPr[]> }>();

  function getProjectPrs(key: string, repoPath: string, provider: VcsProvider, refresh: boolean): Promise<OpenPr[]> {
    const identity = JSON.stringify([repoPath, provider, store.reviewCompletionVersion()]);
    const pending = projectPrPending.get(key);
    if (pending?.identity === identity) {
      if (!refresh) return pending.result;
      if (!pending.refreshResult) {
        const reload = () => getProjectPrs(key, repoPath, provider, true);
        pending.refreshResult = pending.result.then(reload, reload);
      }
      return pending.refreshResult;
    }
    const cached = projectPrCache.get(key);
    if (!refresh && cached?.identity === identity && Date.now() - cached.checkedAt < REVIEW_COUNT_TTL_MS) {
      return Promise.resolve(cached.prs);
    }
    const result = deps.system.listOpenPrs(repoPath, provider).then((prs) => {
      if (projectPrPending.get(key)?.result === result) {
        projectPrCache.set(key, { identity, prs, checkedAt: Date.now() });
      }
      return prs;
    }).finally(() => {
      if (projectPrPending.get(key)?.result === result) projectPrPending.delete(key);
    });
    projectPrPending.set(key, { identity, result });
    return result;
  }

  function getReviewCounts(refresh: boolean): Promise<{ counts: Record<string, number | null>; checkedAt: number }> {
    const projects = store.listProjectKeys().flatMap((key) => {
      const project = store.getProjectRow(key);
      return project && !project.hidden ? [{ key, repoPath: project.repoPath, provider: project.vcsProvider }] : [];
    });
    const identity = JSON.stringify([projects.toSorted((left, right) => left.key.localeCompare(right.key)), store.reviewCompletionVersion()]);
    if (pendingReviewCounts?.identity === identity) {
      if (!refresh) return pendingReviewCounts.result;
      if (!pendingReviewCounts.refreshResult) {
        const reload = () => getReviewCounts(true);
        pendingReviewCounts.refreshResult = pendingReviewCounts.result.then(reload, reload);
      }
      return pendingReviewCounts.refreshResult;
    }
    if (!refresh && reviewCountsCache?.identity === identity && Date.now() - reviewCountsCache.checkedAt < REVIEW_COUNT_TTL_MS) {
      return Promise.resolve(reviewCountsCache);
    }
    const sequence = ++reviewCountsSequence;
    const result = deps.system.listReviewCounts(projects).then((byPath) => {
      const counts = Object.fromEntries(projects.map((project) => [project.key, byPath[project.repoPath] ?? null]));
      const response = { identity, counts, checkedAt: Date.now() };
      if (sequence === reviewCountsSequence) reviewCountsCache = response;
      return response;
    }).catch(() => {
      const counts = Object.fromEntries(projects.map((project) => [project.key, null]));
      const response = { identity, counts, checkedAt: Date.now() };
      if (sequence === reviewCountsSequence) reviewCountsCache = response;
      return response;
    }).finally(() => {
      if (pendingReviewCounts?.result === result) pendingReviewCounts = null;
    });
    pendingReviewCounts = { identity, result };
    return result;
  }

  return new Elysia({ prefix: "/api" })
    .use(deps.previews ? createPreviewRoutes({ previews: deps.previews }) : new Elysia())
    .use(deps.audits ? createAuditRoutes({ audits: deps.audits }) : new Elysia())
    .use(createQualityRoutes({ ...deps, ticketOperations }))
    .use(createAtelierRoutes(deps))
    // Always 200 with a JSON body: `null` off-cloud so the client stops polling without a failed request.
    .get("/host-metrics", async () => {
      const metrics = isCloudHost() ? await readHostMetrics() : null;
      return new Response(JSON.stringify(metrics), { headers: { "content-type": "application/json" } });
    })
    .get("/projects", () => ticketOperations.listProjects())
    .get("/projects/manage", () => {
      const projects: ManagedProject[] = [];
      for (const key of store.listProjectKeys()) {
        const row = store.getProjectRow(key);
        if (!row) continue;
        projects.push(toManagedProject(key, row));
      }
      return projects;
    })
    .put("/projects/order", ({ body, set }) => {
      const parsed = reorderProjectsSchema.safeParse(body);
      if (!parsed.success) return jsonError(set, HTTP_BAD_REQUEST, parsed.error.message);
      if (!store.reorderProjects(parsed.data.keys)) return jsonError(set, HTTP_CONFLICT, "project order is stale or invalid");
      return { ok: true };
    })
    .put("/project-groups/color", ({ body, set }) => {
      const parsed = updateProjectGroupColorSchema.safeParse(body);
      if (!parsed.success) return jsonError(set, HTTP_BAD_REQUEST, parsed.error.message);
      const { group, color } = parsed.data;
      if (!store.setProjectGroupColor(group, color)) return jsonError(set, HTTP_NOT_FOUND, "groupe introuvable");
      return { group, color };
    })
    .post("/projects", async ({ body, set }) => {
      const parsed = createProjectSchema.safeParse(body);
      if (!parsed.success) return jsonError(set, HTTP_BAD_REQUEST, parsed.error.message);
      const { label, repoPath, baseBranch, commitTimeoutMs, vcsProvider, validation, color, group } = parsed.data;
      if (group !== undefined && color !== undefined) return jsonError(set, HTTP_BAD_REQUEST, "la couleur appartient au groupe");
      const requestedAccount = parsed.data.githubAccount ?? null;
      if (requestedAccount !== null && vcsProvider !== "github") return jsonError(set, HTTP_BAD_REQUEST, AZURE_ACCOUNT_REFUSED_MESSAGE);
      const account = await registeredGithubAccount(deps.system, requestedAccount);
      if ("error" in account) return jsonError(set, HTTP_BAD_REQUEST, account.error);
      const key = nanoid(PROJECT_KEY_LENGTH);
      const created = store.createProject(key, {
        label,
        repoPath,
        baseBranch,
        commitTimeoutMs,
        vcsProvider,
        defaultAutoMerge: false,
        defaultAddScreenshots: false,
        ...(validation !== undefined ? { validation } : {}),
        ...(color !== undefined ? { color } : {}),
        ...(group !== undefined ? { group } : {}),
        ...(account.login !== null ? { githubAccount: account.login } : {}),
      });
      set.status = HTTP_CREATED;
      return toManagedProject(key, created);
    })
    .post("/projects/inspect", async ({ body, set }) => {
      const parsed = inspectProjectSchema.safeParse(body);
      if (!parsed.success) return jsonError(set, HTTP_BAD_REQUEST, parsed.error.message);
      try {
        return await inspectProjectFolder(store, deps.system, parsed.data.repoPath);
      } catch (error) {
        return jsonError(set, HTTP_BAD_REQUEST, getErrorMessage(error, REPO_INSPECTION_FAILURE_MESSAGE));
      }
    })
    // « Depuis GitHub »: clone (or reuse) the repository under the chosen account, then the same
    // inspection as a local folder. The created project then records that account.
    .post("/projects/clone", async ({ body, set }) => {
      const parsed = cloneProjectRequestSchema.safeParse(body);
      if (!parsed.success) return jsonError(set, HTTP_BAD_REQUEST, parsed.error.message);
      const account = await registeredGithubAccount(deps.system, parsed.data.account);
      if ("error" in account) return jsonError(set, HTTP_BAD_REQUEST, account.error);
      let clone: CloneResult;
      try {
        clone = await deps.system.cloneGithubRepo({ source: parsed.data.source, account: account.login });
      } catch (error) {
        return jsonError(set, githubFailureStatus(error), redactSecrets(getErrorMessage(error, "Clonage du dépôt GitHub impossible.")));
      }
      try {
        const inspection = await inspectProjectFolder(store, deps.system, clone.repoPath);
        return { ...clone, inspection, existingProjectKey: inspection.existingProjectKey };
      } catch (error) {
        return jsonError(set, HTTP_BAD_REQUEST, getErrorMessage(error, REPO_INSPECTION_FAILURE_MESSAGE));
      }
    })
    .get("/github/accounts", async () => {
      const statuses = await deps.system.githubAccounts().list();
      return statuses.map((status): GithubAccountSummary => ({ ...status, projects: projectsAttachedTo(store, status.login) }));
    })
    .post("/github/accounts", async ({ body, set }) => {
      const parsed = addGithubAccountRequestSchema.safeParse(body);
      // The zod message could echo the submitted value: never surface it for a token.
      if (!parsed.success) return jsonError(set, HTTP_BAD_REQUEST, "Token GitHub manquant ou invalide.");
      try {
        const added = await deps.system.githubAccounts().add(parsed.data.token);
        set.status = HTTP_CREATED;
        return added;
      } catch (error) {
        return jsonError(set, HTTP_BAD_REQUEST, redactSecrets(getErrorMessage(error, "Ajout du compte GitHub impossible."), [parsed.data.token]));
      }
    })
    .delete("/github/accounts/:login", async ({ params, set }) => {
      const login = githubLoginSchema.safeParse(params.login);
      if (!login.success) return jsonError(set, HTTP_BAD_REQUEST, "Compte GitHub invalide.");
      const attached = projectsAttachedTo(store, login.data);
      if (attached.length > 0) {
        return jsonError(set, HTTP_CONFLICT, `Compte GitHub « ${login.data} » rattaché aux projets : ${attached.join(", ")}. Détache-le de ces projets avant de le retirer.`);
      }
      try {
        await deps.system.githubAccounts().remove(login.data);
      } catch (error) {
        return jsonError(set, error instanceof GithubAccountError ? HTTP_NOT_FOUND : HTTP_INTERNAL_ERROR, redactSecrets(getErrorMessage(error, "Retrait du compte impossible.")));
      }
      return new Response(null, { status: HTTP_NO_CONTENT });
    })
    .get("/github/repos", async ({ query, set }) => {
      const requested = typeof query.account === "string" && query.account.trim() !== "" ? query.account.trim() : null;
      const account = await registeredGithubAccount(deps.system, requested);
      if ("error" in account) return jsonError(set, HTTP_BAD_REQUEST, account.error);
      try {
        return await deps.system.listGithubRepos(account.login);
      } catch (error) {
        const message = error instanceof GithubAccountError ? error.message : `Liste des dépôts illisible pour le ${githubAccountLabel(account.login)}.`;
        return jsonError(set, HTTP_BAD_GATEWAY, redactSecrets(message));
      }
    })
    .post("/projects/test-connection", async ({ body, set }) => {
      const parsed = testConnectionDraftSchema.safeParse(body);
      if (!parsed.success) return jsonError(set, HTTP_BAD_REQUEST, parsed.error.message);
      try {
        return await deps.system.testVcsConnection(parsed.data.repoPath, parsed.data.vcsProvider);
      } catch (error) {
        return vcsConnectionFailure(error);
      }
    })
    .patch("/projects/:key", async ({ params, body, set }) => {
      const project = store.getProjectRow(params.key);
      if (!project) return jsonError(set, HTTP_NOT_FOUND, "projet introuvable");
      const parsed = updateProjectSchema.safeParse(body);
      if (!parsed.success) return jsonError(set, HTTP_BAD_REQUEST, parsed.error.message);
      const resultingGroup = parsed.data.group === undefined ? project.group : parsed.data.group;
      if (resultingGroup && parsed.data.color !== undefined) return jsonError(set, HTTP_BAD_REQUEST, "la couleur appartient au groupe");
      const currentAccount = project.githubAccount ?? null;
      const resultingAccount = parsed.data.githubAccount === undefined ? currentAccount : parsed.data.githubAccount;
      const resultingProvider = parsed.data.vcsProvider ?? project.vcsProvider;
      if (resultingAccount !== null && resultingProvider !== "github") return jsonError(set, HTTP_BAD_REQUEST, AZURE_ACCOUNT_REFUSED_MESSAGE);
      const accountChanged = parsed.data.githubAccount !== undefined
        && (parsed.data.githubAccount === null ? null : normalizeGithubLogin(parsed.data.githubAccount)) !== (currentAccount === null ? null : normalizeGithubLogin(currentAccount));
      if (accountChanged) {
        if (hasActiveTickets(store, params.key)) {
          return jsonError(set, HTTP_CONFLICT, "Impossible de changer le compte GitHub : le projet a des tickets en cours. Attends leur fin ou arrête-les avant de changer de compte.");
        }
        const account = await registeredGithubAccount(deps.system, parsed.data.githubAccount ?? null);
        if ("error" in account) return jsonError(set, HTTP_BAD_REQUEST, account.error);
      }
      const updated = store.updateProject(params.key, parsed.data);
      hub.pushPrNotifications();
      // NOTE(ali): WS project broadcast (hub.pushProjects) lands with the projects-frontend ticket;
      // the PATCH response returns the fresh project so a refetching client stays consistent.
      return toManagedProject(params.key, updated);
    })
    .delete("/projects/:key", ({ params, set }) => {
      if (!store.getProjectRow(params.key)) return jsonError(set, HTTP_NOT_FOUND, "projet introuvable");
      try {
        store.deleteProject(params.key);
        hub.pushPrNotifications();
      } catch (error) {
        if (error instanceof ProjectInUseError) return jsonError(set, HTTP_CONFLICT, error.message);
        throw error;
      }
      return new Response(null, { status: HTTP_NO_CONTENT });
    })
    .post("/native/pick-folder", async ({ set }) => {
      if (!deps.pickFolder) return jsonError(set, HTTP_NOT_FOUND, "sélecteur de dossier indisponible");
      const path = await deps.pickFolder();
      return { path: path ?? "" };
    })
    .get("/projects/review-counts", async ({ query }) => {
      const { counts, checkedAt } = await getReviewCounts(query.refresh === "1");
      return { counts, checkedAt };
    })
    .get("/projects/:key/prs", async ({ params, query, set }) => {
      if (!isProjectKey(params.key)) return jsonError(set, HTTP_NOT_FOUND, "projet inconnu");
      const project = getProject(params.key);
      try {
        return await getProjectPrs(params.key, project.repoPath, project.vcsProvider, query.refresh === "1");
      } catch (error) {
        return jsonError(set, HTTP_BAD_GATEWAY, getErrorMessage(error, "échec du listing des PR"));
      }
    })
    .get("/projects/:key/branches", async ({ params, set }) => {
      if (!isProjectKey(params.key)) return jsonError(set, HTTP_NOT_FOUND, "projet inconnu");
      const project = getProject(params.key);
      try {
        return await deps.system.listBranches(project.repoPath);
      } catch (error) {
        return jsonError(set, HTTP_BAD_GATEWAY, getErrorMessage(error, "échec listing branches"));
      }
    })
    .get("/projects/:key/test-connection", async ({ params, set }) => {
      if (!isProjectKey(params.key)) return jsonError(set, HTTP_NOT_FOUND, "projet inconnu");
      const project = getProject(params.key);
      try {
        return await deps.system.testVcsConnection(project.repoPath, project.vcsProvider);
      } catch (error) {
        return vcsConnectionFailure(error);
      }
    })
    .get("/capabilities", async ({ query }) => {
      const codex = await deps.system.checkCodexRuntime(query.refresh === "1");
      const claudeAvailable = await deps.system.checkClaudeAvailable();
      return {
        composerAvailable: deps.composerAvailable,
        claudeAvailable,
        codexAvailable: codex.status === "ready",
        codex,
        defaultModel: MODELS.implement,
        defaultEffort: MODELS.implementEffort,
        defaultImplementerModel: MODELS.implementerModel,
        defaultImplementerEffort: MODELS.implementerEffort,
        defaultCodexModel: MODELS.codexModel,
        defaultCodexEffort: MODELS.codexEffort,
        defaultCodexFast: MODELS.codexFast,
        canUpdate: deps.onRequestUpdate != null && deps.repoRoot != null,
        canPickFolder: deps.pickFolder != null,
        prOnly: isCloudHost(),
        githubAvailable: await deps.system.checkGithubAvailable(),
        skills: await deps.system.checkSkills(),
      };
    })
    .get("/settings", () => store.getAppSettings())
    .patch("/settings", ({ body, set }) => {
      const parsed = updateAppSettingsSchema.safeParse(body);
      if (!parsed.success) return jsonError(set, HTTP_BAD_REQUEST, parsed.error.message);
      return store.updateAppSettings(parsed.data);
    })
    .get("/profiles", () => store.listProfiles())
    .post("/profiles", ({ body, set }) => {
      const parsed = createProfileSchema.safeParse(body);
      if (!parsed.success) return jsonError(set, HTTP_BAD_REQUEST, parsed.error.message);
      const pairError = agentPairError(set, parsed.data.orchestrator, parsed.data.implementer);
      if (pairError) return pairError;
      return store.createProfile(parsed.data);
    })
    .patch("/profiles/:id", ({ params, body, set }) => {
      const profile = store.getProfile(params.id);
      if (!profile) return jsonError(set, HTTP_NOT_FOUND, "profil introuvable");
      const parsed = updateProfileSchema.safeParse(body);
      if (!parsed.success) return jsonError(set, HTTP_BAD_REQUEST, parsed.error.message);
      // Validate the MERGED profile (patch value else existing) — Codex orchestrates only Codex (PR1).
      const pairError = agentPairError(
        set,
        parsed.data.orchestrator ?? profile.orchestrator,
        parsed.data.implementer ?? profile.implementer,
      );
      if (pairError) return pairError;
      return store.updateProfile(params.id, parsed.data);
    })
    .delete("/profiles/:id", ({ params, set }) => {
      if (!store.getProfile(params.id)) return jsonError(set, HTTP_NOT_FOUND, "profil introuvable");
      store.deleteProfile(params.id);
      return { ok: true };
    })
    .get("/automations", () => store.listAutomations())
    .post("/automations", ({ body, set }) => {
      const parsed = createAutomationSchema.safeParse(body);
      if (!parsed.success) return jsonError(set, HTTP_BAD_REQUEST, parsed.error.message);
      const { name, prompt, trigger, model, effort, enabled } = parsed.data;
      // on_launch automations never recur, so drop any interval defensively (the refine already guards recurring).
      const intervalMinutes = trigger === "recurring" ? parsed.data.intervalMinutes : null;
      const created = store.createAutomation({ name, prompt, trigger, intervalMinutes, model, effort, enabled });
      automations.reschedule(created.id);
      hub.pushAutomations(store.listAutomations());
      return created;
    })
    .patch("/automations/:id", ({ params, body, set }) => {
      const existing = store.getAutomation(params.id);
      if (!existing) return jsonError(set, HTTP_NOT_FOUND, "automatisation introuvable");
      const parsed = updateAutomationSchema.safeParse(body);
      if (!parsed.success) return jsonError(set, HTTP_BAD_REQUEST, parsed.error.message);
      // Enforce the invariant "on_launch ⟹ interval null" on update too (the POST path already does),
      // so flipping the trigger to on_launch clears any stale interval instead of leaving it dangling.
      const patch = { ...parsed.data };
      const effectiveTrigger = parsed.data.trigger ?? existing.trigger;
      if (effectiveTrigger !== "recurring") patch.intervalMinutes = null;
      const updated = store.updateAutomation(params.id, patch);
      automations.reschedule(params.id);
      hub.pushAutomations(store.listAutomations());
      return updated;
    })
    .delete("/automations/:id", ({ params, set }) => {
      if (!store.getAutomation(params.id)) return jsonError(set, HTTP_NOT_FOUND, "automatisation introuvable");
      automations.unschedule(params.id);
      store.deleteAutomation(params.id);
      hub.pushAutomations(store.listAutomations());
      return { ok: true };
    })
    .post("/automations/:id/run", ({ params, set }) => {
      if (!store.getAutomation(params.id)) return jsonError(set, HTTP_NOT_FOUND, "automatisation introuvable");
      void automations.runNow(params.id);
      return { started: true };
    })
    .get("/tickets", ({ query }) => store.listTickets(query.archived === "true"))
    .get("/stats", () => store.listStatRecords())
    .get("/tickets/:id", ({ params, set }) => {
      const ticket = store.getTicket(params.id);
      if (!ticket) return jsonError(set, HTTP_NOT_FOUND, "ticket introuvable");
      return { ticket, comments: store.listComments(params.id) };
    })
    .post("/tickets", ({ body, set }) => {
      const parsed = createTicketSchema.safeParse(body);
      if (!parsed.success) return jsonError(set, HTTP_BAD_REQUEST, parsed.error.message);
      if (!isProjectKey(parsed.data.project)) return jsonError(set, HTTP_BAD_REQUEST, "projet inconnu");
      const pairError = agentPairError(set, parsed.data.orchestrator, parsed.data.implementer);
      if (pairError) return pairError;
      const autonomousError = autonomousOptionsError(parsed.data, getProject(parsed.data.project).vcsProvider);
      if (autonomousError) return jsonError(set, HTTP_BAD_REQUEST, autonomousError);
      if (parsed.data.dependsOn !== null) {
        const depError = ticketDependencyError(store, null, parsed.data.dependsOn, parsed.data.project);
        if (depError !== null) return jsonError(set, HTTP_BAD_REQUEST, depError);
      }
      const scheduledStartAt = parsed.data.scheduledStartAt ?? null;
      if (scheduledStartAt !== null) {
        if (parsed.data.start) return jsonError(set, HTTP_BAD_REQUEST, "un ticket programmé ne peut pas être lancé immédiatement");
        const timeError = scheduledStartTimeError(scheduledStartAt, Date.now());
        if (timeError !== null) return jsonError(set, HTTP_BAD_REQUEST, timeError);
      }
      // Title is optional: fall back to a slice of the description when left blank.
      const title =
        parsed.data.title.trim() || deriveTitleFromDescription(parsed.data.description);
      // directPush ⊕ stealth ⊕ autoMerge: directPush/stealth open no PR, so auto-merge is meaningless;
      // directPush also forces stealth off (the two are mutually exclusive no-PR lifecycles).
      const directPush = parsed.data.directPush;
      const resultingStealth = directPush ? false : parsed.data.stealth;
      const ticket = store.createTicket({
        title,
        description: parsed.data.description,
        externalUrl: parsed.data.externalUrl,
        project: parsed.data.project,
        prdEnabled: parsed.data.prdEnabled,
        prDraft: parsed.data.prDraft,
        autoMerge: (parsed.data.autonomous || resultingStealth || directPush) ? false : parsed.data.autoMerge,
        autonomous: parsed.data.autonomous,
        autonomousDelivery: parsed.data.autonomousDelivery,
        autonomousMaxCorrections: parsed.data.autonomousMaxCorrections,
        autonomousTimeoutMinutes: parsed.data.autonomousTimeoutMinutes,
        autonomousMaxStarts: parsed.data.autonomousMaxStarts,
        autonomousFinalizationMinutes: parsed.data.autonomousFinalizationMinutes,
        autonomousMaxPublicationAttempts: parsed.data.autonomousMaxPublicationAttempts,
        stealth: resultingStealth,
        directPush,
        addScreenshots: parsed.data.addScreenshots,
        verifyFeature: parsed.data.verifyFeature,
        argusMultiLoop: parsed.data.argusMultiLoop,
        baseBranch: parsed.data.baseBranch,
        dependsOn: parsed.data.dependsOn,
        model: parsed.data.model,
        effort: parsed.data.effort,
        implementerModel: parsed.data.implementerModel,
        implementerEffort: parsed.data.implementerEffort,
        implementer: parsed.data.implementer,
        orchestrator: parsed.data.orchestrator,
        codexModel: parsed.data.codexModel,
        codexEffort: parsed.data.codexEffort,
        codexFast: parsed.data.codexFast,
        codexImplementerModel: parsed.data.codexImplementerModel,
        codexImplementerEffort: parsed.data.codexImplementerEffort,
        codexImplementerFast: parsed.data.codexImplementerFast,
        feasibilityEngine: parsed.data.feasibilityEngine,
        scheduledStartAt,
      });
      return parkOrStart(deps, ticket, parsed.data.start);
    })
    .post("/tickets/import", ({ body, set }) => {
      const parsed = importTicketsSchema.safeParse(body);
      if (!parsed.success) return jsonError(set, HTTP_BAD_REQUEST, parsed.error.message);
      const input = parsed.data;
      if (!isProjectKey(input.project)) return jsonError(set, HTTP_BAD_REQUEST, "projet inconnu");
      const pairError = agentPairError(set, input.orchestrator, input.implementer);
      if (pairError) return pairError;
      // Server-side re-validation (never trust the client): every row needs a non-empty title.
      // All-or-nothing — reject the whole batch listing the offending rows before creating anything.
      const blankTitleRows = input.rows
        .map((row, index) => ({ row, line: index + 1 }))
        .filter(({ row }) => row.title.trim().length === 0)
        .map(({ line }) => line);
      if (blankTitleRows.length > 0) {
        return jsonError(set, HTTP_BAD_REQUEST, `titre manquant aux lignes : ${blankTitleRows.join(", ")}`);
      }
      const deliveryError = deliveryPolicyError(input);
      if (deliveryError) return jsonError(set, HTTP_BAD_REQUEST, deliveryError);

      const directPush = input.directPush;
      const resultingStealth = directPush ? false : input.stealth;
      const created: Ticket[] = [];
      for (const row of input.rows) {
        const ticket = store.createTicket({
          title: row.title.trim(),
          description: row.description,
          externalUrl: null,
          project: input.project,
          prdEnabled: input.prdEnabled,
          prDraft: input.prDraft,
          autoMerge: (resultingStealth || directPush) ? false : input.autoMerge,
          stealth: resultingStealth,
          directPush,
          addScreenshots: input.addScreenshots,
          verifyFeature: input.verifyFeature,
          argusMultiLoop: input.argusMultiLoop,
          baseBranch: input.baseBranch,
          dependsOn: null,
          model: input.model,
          effort: input.effort,
          implementerModel: input.implementerModel,
          implementerEffort: input.implementerEffort,
          implementer: input.implementer,
          orchestrator: input.orchestrator,
          codexModel: input.codexModel,
          codexEffort: input.codexEffort,
          codexFast: input.codexFast,
          codexImplementerModel: input.codexImplementerModel,
          codexImplementerEffort: input.codexImplementerEffort,
          codexImplementerFast: input.codexImplementerFast,
          feasibilityEngine: input.feasibilityEngine,
        });
        hub.pushTicket(ticket);
        created.push(ticket);
      }

      if (!input.runFeasibility) return { created, feasibilityStarted: false };
      // Kick off the batch feasibility analysis in the background; it marks tickets running then
      // persists verdicts via the worker channel (mirrors the triage path).
      startFeasibilityInBackground(deps.feasibility, created.map((ticket) => ticket.id), input.project);
      // The batch id is generated inside the manager; the client only needs to know the run started.
      return { created, feasibilityStarted: true };
    })
    .post("/tickets/analyze", ({ body, set }) => {
      const parsed = analyzeTicketsSchema.safeParse(body);
      if (!parsed.success) return jsonError(set, HTTP_BAD_REQUEST, parsed.error.message);
      return ticketOperations.analyzeTickets(parsed.data.ids);
    })
    .get("/pr-notifications", () => ({ notifications: store.listPrNotifications(), sync: store.listPrNotificationSync() }))
    .post("/pr-notifications/:id/read", ({ params, set }) => {
      if (!store.listPrNotifications().some((notification) => notification.id === params.id)) return jsonError(set, HTTP_NOT_FOUND, "Review notification not found");
      const notification = store.readPrNotification(params.id);
      hub.pushPrNotifications();
      return notification;
    })
    .post("/pr-notifications/:id/review", ({ params, body, set }) => {
      const notification = store.listPrNotifications().find((entry) => entry.id === params.id);
      if (!notification) return jsonError(set, HTTP_NOT_FOUND, "Review notification not found");
      if (notification.resolvedAt !== null && (notification.ticketId === null || store.getTicket(notification.ticketId) === null)) return jsonError(set, HTTP_CONFLICT, "This review request is no longer active");
      const options = prNotificationReviewOptionsSchema.safeParse(body ?? {});
      if (!options.success) return jsonError(set, HTTP_BAD_REQUEST, options.error.message);
      if (options.data.fixComments && store.listActiveQualityIterations().some((iteration) => iteration.project === notification.project && iteration.prUrl === notification.prUrl)) return jsonError(set, HTTP_CONFLICT, "Une PR sélectionnée est réservée par une itération qualité.");
      const pr: OpenPr = {
        number: notification.prNumber, title: notification.title, url: notification.prUrl,
        headBranch: notification.headRefName, baseBranch: notification.baseRefName,
        isDraft: false, reviewStatus: "needs_review", updatedAt: new Date(notification.requestedAt ?? notification.detectedAt).toISOString(),
        author: notification.author, additions: null, deletions: null,
      };
      const input = createReviewSchema.parse({ ...options.data, project: notification.project, prs: [pr] });
      const result = store.createPrNotificationReview(params.id, reviewTicketInput(input, pr, store.getAppSettings().commitLanguage));
      hub.pushTicket(result.ticket);
      hub.pushPrNotifications();
      if (result.created) void slots.startTicket(result.ticket.id).catch((error: unknown) => {
        log.error("démarrage de la review échoué", { ticketId: result.ticket.id, error: getErrorMessage(error) });
      });
      return result;
    })
    .post("/reviews", ({ body, set }) => {
      const parsed = createReviewSchema.safeParse(body);
      if (!parsed.success) return jsonError(set, HTTP_BAD_REQUEST, parsed.error.message);
      if (!isProjectKey(parsed.data.project)) return jsonError(set, HTTP_BAD_REQUEST, "projet inconnu");
      if (parsed.data.fixComments && store.listActiveQualityIterations().some((iteration) => iteration.project === parsed.data.project && parsed.data.prs.some((pr) => pr.url === iteration.prUrl))) return jsonError(set, HTTP_CONFLICT, "Une PR sélectionnée est réservée par une itération qualité.");
      const created: Ticket[] = [];
      for (const pr of parsed.data.prs) {
        const ticket = store.createReview(reviewTicketInput(parsed.data, pr, store.getAppSettings().commitLanguage));
        hub.pushTicket(ticket);
        // Slot launch does slow git worktree setup; don't block the HTTP response on it
        // (it kept the dialog open). Kick it off in the background and let the board update live.
        void slots.startTicket(ticket.id).catch((e) => {
          log.error("démarrage de la review échoué", {
            ticketId: ticket.id,
            error: getErrorMessage(e),
          });
        });
        created.push(ticket);
      }
      return created;
    })
    .post("/cleaners", ({ body, set }) => {
      const parsed = createCleanSchema.safeParse(body);
      if (!parsed.success) return jsonError(set, HTTP_BAD_REQUEST, parsed.error.message);
      if (!isProjectKey(parsed.data.project)) return jsonError(set, HTTP_BAD_REQUEST, "projet inconnu");
      if (store.listActiveQualityIterations().some((iteration) => iteration.project === parsed.data.project && parsed.data.prs.some((pr) => pr.url === iteration.prUrl))) return jsonError(set, HTTP_CONFLICT, "Une PR sélectionnée est réservée par une itération qualité.");
      const created: Ticket[] = [];
      for (const pr of parsed.data.prs) {
        const ticket = store.createClean({
          title: `Clean PR #${pr.number} — ${pr.title}`,
          description: cleanDescription(pr, parsed.data.context),
          project: parsed.data.project,
          prNumber: pr.number,
          prHeadBranch: pr.headBranch,
          prUrl: pr.url,
          orchestrator: parsed.data.orchestrator,
          codexModel: parsed.data.codexModel,
          codexEffort: parsed.data.codexEffort,
          codexFast: parsed.data.codexFast,
        });
        hub.pushTicket(ticket);
        // Slot launch does slow git worktree setup; don't block the HTTP response on it (mirrors reviews).
        void slots.startTicket(ticket.id).catch((e) => {
          log.error("démarrage du nettoyage échoué", {
            ticketId: ticket.id,
            error: getErrorMessage(e),
          });
        });
        created.push(ticket);
      }
      return created;
    })
    .post("/asks", ({ body, set }) => {
      const parsed = createAskSchema.safeParse(body);
      if (!parsed.success) return jsonError(set, HTTP_BAD_REQUEST, parsed.error.message);
      if (!isProjectKey(parsed.data.project)) return jsonError(set, HTTP_BAD_REQUEST, "projet inconnu");
      // Title is optional: fall back to a slice of the question when left blank.
      const title = parsed.data.title.trim() || deriveTitleFromDescription(parsed.data.description);
      const ticket = store.createAsk({
        title,
        description: parsed.data.description,
        project: parsed.data.project,
        model: parsed.data.model,
        effort: parsed.data.effort,
        orchestrator: parsed.data.orchestrator,
        codexModel: parsed.data.codexModel,
        codexEffort: parsed.data.codexEffort,
        codexFast: parsed.data.codexFast,
      });
      hub.pushTicket(ticket);
      // Slot launch does slow git worktree setup; don't block the HTTP response on it (mirrors reviews).
      void slots.startTicket(ticket.id).catch((e) => {
        log.error("démarrage de l'ask échoué", {
          ticketId: ticket.id,
          error: getErrorMessage(e),
        });
      });
      return ticket;
    })
    .patch("/tickets/:id", ({ params, body, set }) => {
      try {
        return ticketOperations.updateTicket(params.id, body);
      } catch (error) {
        if (error instanceof TicketOperationError) return ticketOperationError(set, error);
        throw error;
      }
    })
    .put("/tickets/:id/schedule", ({ params, body, set }) => {
      const parsed = scheduleTicketSchema.safeParse(body);
      if (!parsed.success) return jsonError(set, HTTP_BAD_REQUEST, parsed.error.message);
      const ticket = store.getTicket(params.id);
      if (!ticket) return jsonError(set, HTTP_NOT_FOUND, "ticket introuvable");
      const { scheduledStartAt } = parsed.data;
      if (scheduledStartAt !== null) {
        const conflict = scheduleConflictError(store, ticket);
        if (conflict !== null) return jsonError(set, HTTP_CONFLICT, conflict);
        const timeError = scheduledStartTimeError(scheduledStartAt, Date.now());
        if (timeError !== null) return jsonError(set, HTTP_BAD_REQUEST, timeError);
      }
      const updated = store.updateTicket(params.id, { scheduledStartAt, scheduledStartMissedAt: null });
      hub.pushTicket(updated);
      store.logEvent(params.id, scheduledStartAt === null ? SCHEDULED_START_CANCELLED_EVENT : SCHEDULED_START_SET_EVENT, { scheduledStartAt });
      return updated;
    })
    .post("/tickets/:id/move", async ({ params, body, set }) => {
      const ticket = store.getTicket(params.id);
      if (!ticket) return jsonError(set, HTTP_NOT_FOUND, "ticket introuvable");
      const parsed = moveTicketSchema.safeParse(body);
      if (!parsed.success) return jsonError(set, HTTP_BAD_REQUEST, parsed.error.message);
      const target = parsed.data.column;

      if (ticket.autonomous && (target === "done" || target === "merged") && ticket.autonomousState?.phase !== "completed") {
        return jsonError(set, HTTP_CONFLICT, "Autonomous delivery must verify its frozen plan and chosen outcome before completion.");
      }

      if (target === "done" && ticket.kind === "feature" && ticket.slotId !== null) {
        const plan = store.getImplementationPlan(params.id);
        if (plan?.lots.some((lot) => lot.status !== "completed")) return jsonError(set, HTTP_CONFLICT, "This ticket still has unresolved implementation obligations. Use implementation recovery to assess and deliver its candidate before marking it done.");
      }

      if (store.getActiveQualityIteration(params.id) && target !== "abandoned") return jsonError(set, HTTP_CONFLICT, "Itération qualité en cours : utilise son action dédiée ou annule-la.");
      if (target === "implementing" && store.getLatestQualityIteration(params.id)?.mode === "correction") return jsonError(set, HTTP_CONFLICT, "Utilise Corriger et revérifier ou Reprendre la vérification pour cette carte.");

      if (isProcessing(ticket.stage) && target !== "abandoned") {
        return jsonError(set, HTTP_CONFLICT, "ticket en traitement : seul Abandonnés est autorisé");
      }
      if (target === "abandoned") {
        if (!parsed.data.confirmed) return jsonError(set, HTTP_CONFLICT, "confirmation requise");
        await slots.abandonTicket(params.id);
        return store.getTicket(params.id);
      }
      // "À review" is a pipeline-managed lane reached only via the stealth ready_for_review() tool —
      // never by a manual drag (which would land a card there with no slot/worktree to test).
      if (target === "to_review") {
        return jsonError(set, HTTP_CONFLICT, "« À review » est géré par le pipeline (ready_for_review) — déplacement manuel interdit");
      }
      // A stealth card in "À review" still owns its slot/worktree: moving it elsewhere manually would
      // leak the slot (only "Créer la PR" or abandon release it). Force the user through those paths.
      if (ticket.column === "to_review" && ticket.slotId !== null) {
        return jsonError(set, HTTP_CONFLICT, "ticket en attente de review : crée la PR ou abandonne-le d'abord (le slot est occupé)");
      }
      if (target === "implementing") {
        // A running triage holds a worker socket keyed by this ticketId; launching now would
        // collide the two sessions on that key. Wait for the verdict first.
        const blocker = startBlocker(ticket, store.getDependencyParent(ticket));
        if (blocker === "triage") {
          return jsonError(set, HTTP_CONFLICT, "analyse en cours : attends le verdict avant de lancer l'implémentation");
        }
        if (blocker === "dependency") {
          return jsonError(set, HTTP_CONFLICT, "en attente de la PR du ticket dont il dépend");
        }
        lifecycle.moveColumn(params.id, "implementing");
        // retry() relaunches a failed/stalled/interrupted ticket in its held slot;
        // for a fresh ticket (no slot) it falls through to a normal startTicket.
        await slots.retry(params.id);
        return store.getTicket(params.id);
      }
      if (target === "merged") {
        try {
          return await slots.markMerged(params.id);
        } catch (error) {
          return jsonError(set, HTTP_CONFLICT, getErrorMessage(error, MARK_MERGED_FAILED));
        }
      }
      return lifecycle.moveColumn(params.id, target);
    })
    .post("/tickets/:id/comments", ({ params, body, set }) => {
      const ticket = store.getTicket(params.id);
      if (!ticket) return jsonError(set, HTTP_NOT_FOUND, "ticket introuvable");
      const parsed = createCommentSchema.safeParse(body);
      if (!parsed.success) return jsonError(set, HTTP_BAD_REQUEST, parsed.error.message);
      const comment = store.addComment(params.id, "user", parsed.data.body, parsed.data.questionId);
      hub.pushComment(comment);
      // A todo card has no implementation session (triage/split sessions share its id): only store
      // the comment, which reaches feasibility analyses and the contract at start.
      if (ticket.column === "todo") {
        if (parsed.data.questionId) store.markQuestionAnswered(parsed.data.questionId);
        return comment;
      }
      if (parsed.data.questionId) {
        coordinator.answerQuestion(params.id, parsed.data.questionId, parsed.data.body);
      } else {
        coordinator.forwardComment(params.id, parsed.data.body);
      }
      return comment;
    })
    .post("/tickets/:id/validate-prd", ({ params, body, set }) => {
      const ticket = store.getTicket(params.id);
      if (!ticket) return jsonError(set, HTTP_NOT_FOUND, "ticket introuvable");
      if (ticket.column !== "prd") return jsonError(set, HTTP_CONFLICT, "le ticket n'est pas en colonne PRD");
      const parsed = validatePrdSchema.safeParse(body ?? {});
      if (!parsed.success) return jsonError(set, HTTP_BAD_REQUEST, parsed.error.message);
      coordinator.validatePrd(params.id, parsed.data.note);
      return store.getTicket(params.id);
    })
    .post("/tickets/:id/merged", async ({ params, set }) => {
      const ticket = store.getTicket(params.id);
      if (!ticket) return jsonError(set, HTTP_NOT_FOUND, "ticket introuvable");
      if (ticket.autonomous && ticket.autonomousState?.phase !== "completed") {
        return jsonError(set, HTTP_CONFLICT, "Autonomous delivery must verify its chosen outcome before completion.");
      }
      const blocker = markMergedBlocker(ticket, store);
      if (blocker) return jsonError(set, HTTP_CONFLICT, blocker);
      try {
        return await slots.markMerged(params.id);
      } catch (error) {
        return jsonError(set, HTTP_CONFLICT, getErrorMessage(error, MARK_MERGED_FAILED));
      }
    })
    .post("/tickets/:id/check-merged", async ({ params, set }) => {
      const ticket = store.getTicket(params.id);
      if (!ticket) return jsonError(set, HTTP_NOT_FOUND, "ticket introuvable");
      if (ticket.column !== "done" || ticket.kind !== "feature") {
        return jsonError(set, HTTP_CONFLICT, "vérification réservée aux features en colonne Fini");
      }
      const blocker = markMergedBlocker(ticket, store);
      if (blocker) return jsonError(set, HTTP_CONFLICT, blocker);
      // directPush tickets push commits straight onto the base branch and never open a PR, so the
      // work is already merged; skip the PR existence check and the gh query entirely.
      if (ticket.directPush) {
        const merged = await slots.markMerged(params.id);
        return { merged: true, state: DIRECT_PUSH_MERGED_STATE, ticket: merged };
      }
      // A split mother has no PR but its integration branch carries the children's merged work; treat
      // it like directPush — its work IS integrated, so move it straight to "PR mergée".
      if (isSplitMother(ticket)) {
        const merged = await slots.markMerged(params.id);
        return { merged: true, state: SPLIT_MERGED_STATE, ticket: merged };
      }
      if (!ticket.prUrl) return jsonError(set, HTTP_CONFLICT, "aucune PR associée à cette carte");
      if (!isProjectKey(ticket.project)) return jsonError(set, HTTP_NOT_FOUND, "projet inconnu");
      try {
        return await slots.checkMergedPr(params.id);
      } catch (error) {
        return jsonError(set, HTTP_BAD_GATEWAY, getErrorMessage(error, "échec de la lecture de la PR"));
      }
    })
    .post("/tickets/:id/merge", async ({ params, set }) => {
      await slots.reconcileDependencies(params.id);
      const ticket = store.getTicket(params.id);
      if (!ticket) return jsonError(set, HTTP_NOT_FOUND, "ticket introuvable");
      if (ticket.dependencyStatus?.stale || ticket.dependencyStatus?.reason) {
        if (!isProjectKey(ticket.project)) return jsonError(set, HTTP_NOT_FOUND, "projet inconnu");
        const gate = await slots.verifyDependencyDelivery(ticket, getProject(ticket.project).repoPath, ticket.prUrl ?? undefined);
        if (!gate.ok) return jsonError(set, HTTP_CONFLICT, gate.reason);
      }
      const mergeTicket = store.getTicket(params.id) ?? ticket;
      if (!canMergePr(mergeTicket) || ticket.prUrl === null || ticket.branch === null) {
        return jsonError(set, HTTP_CONFLICT, "merge réservé aux features terminées avec une PR ouverte");
      }
      if (!isProjectKey(ticket.project)) return jsonError(set, HTTP_NOT_FOUND, "projet inconnu");
      if (mergesInFlight.has(params.id)) return jsonError(set, HTTP_CONFLICT, "un merge est déjà en cours pour cette carte");
      const project = getProject(ticket.project);
      const { prUrl, branch } = ticket;
      mergesInFlight.add(params.id);
      try {
        const dependencyDelivery = await slots.verifyDependencyDelivery(ticket, project.repoPath, prUrl);
        if (!dependencyDelivery.ok) return jsonError(set, HTTP_CONFLICT, dependencyDelivery.reason);
        const targetBaseBranch = resolvePrTargetBaseBranch(ticket, project, store);
        const conflictReason = `La PR a des conflits avec ${targetBaseBranch}`;
        const mergeability = await deps.system.readPrMergeability(project.repoPath, prUrl, project.vcsProvider);
        if (mergeability === "conflicting") {
          return { merged: false, conflicts: true, reason: conflictReason } satisfies MergePrResult;
        }
        const refreshedGate = await slots.verifyDependencyDelivery(ticket, project.repoPath, prUrl);
        if (!refreshedGate.ok) return jsonError(set, HTTP_CONFLICT, refreshedGate.reason);
        const merge = await deps.system.mergePrOnUserRequest(project.repoPath, branch, prUrl, project.vcsProvider);
        if (merge.ok) {
          store.logEvent(params.id, MANUAL_MERGED_EVENT, { prUrl });
          const merged = await slots.markMerged(params.id);
          return { merged: true, conflicts: false, ticket: merged } satisfies MergePrResult;
        }
        const after = await deps.system.readPrMergeability(project.repoPath, prUrl, project.vcsProvider);
        return { merged: false, conflicts: after === "conflicting", reason: merge.reason } satisfies MergePrResult;
      } catch (error) {
        return jsonError(set, HTTP_BAD_GATEWAY, getErrorMessage(error, "échec du merge de la PR"));
      } finally {
        mergesInFlight.delete(params.id);
      }
    })
    .post("/tickets/:id/update-base", async ({ params, set }) => {
      if (!store.getTicket(params.id)) return jsonError(set, HTTP_NOT_FOUND, "ticket introuvable");
      return slots.updateDependencyBase(params.id);
    })
    .post("/tickets/:id/retry", async ({ params, set }) => {
      const ticket = store.getTicket(params.id);
      if (!ticket) return jsonError(set, HTTP_NOT_FOUND, "ticket introuvable");
      if (store.getActiveQualityIteration(params.id) || store.getLatestQualityIteration(params.id)?.mode === "correction") return jsonError(set, HTTP_CONFLICT, "Utilise l'action dédiée à l'itération qualité.");
      const blocker = startBlocker(ticket, store.getDependencyParent(ticket));
      if (blocker === "triage") return jsonError(set, HTTP_CONFLICT, "analyse en cours : attends le verdict avant de relancer l'implémentation");
      if (blocker === "dependency") return jsonError(set, HTTP_CONFLICT, "en attente de la livraison du ticket dont il dépend");
      await slots.retry(params.id);
      return store.getTicket(params.id);
    })
    .post("/tickets/:id/resolve-conflicts", async ({ params, set }) => {
      const ticket = store.getTicket(params.id);
      if (!ticket) return jsonError(set, HTTP_NOT_FOUND, "ticket introuvable");
      if (store.getActiveQualityIteration(params.id)) return jsonError(set, HTTP_CONFLICT, "Itération qualité en cours.");
      // Only meaningful once the PR exists and the slot is released (failed merge or finished feature):
      // a fresh session can rebase the branch and re-trigger the merge.
      if (!canResolveConflicts(ticket)) {
        return jsonError(
          set,
          HTTP_CONFLICT,
          "résolution de conflits réservée aux PR dont le merge a échoué ou aux features terminées avec une PR ouverte",
        );
      }
      // Slow git worktree setup runs in the background; the board updates live over WS.
      void slots.resolveMergeConflicts(params.id).catch((e) => {
        log.error("résolution de conflits échouée", {
          ticketId: params.id,
          error: getErrorMessage(e),
        });
      });
      return store.getTicket(params.id);
    })
    .post("/tickets/:id/test", ({ params, set }) => {
      const ticket = store.getTicket(params.id);
      if (!ticket) return jsonError(set, HTTP_NOT_FOUND, "ticket introuvable");
      if (store.getActiveQualityIteration(params.id)) return jsonError(set, HTTP_CONFLICT, "Une itération qualité occupe cette carte ; attends sa fin avant de lancer un test interactif.");
      const eligible =
        ticket.kind === "feature" &&
        ticket.column === "done" &&
        ticket.slotId === null &&
        ticket.branch !== null &&
        !ticket.testing;
      if (!eligible) {
        return jsonError(set, HTTP_CONFLICT, "test réservé aux features terminées (colonne Fini) sans slot occupé");
      }
      // Slow git worktree setup + install runs in the background; the board updates live over WS.
      void slots.startTestSession(params.id).catch((e) => {
        log.error("démarrage session de test échoué", {
          ticketId: params.id,
          error: e instanceof Error ? e.message : String(e),
        });
      });
      return store.getTicket(params.id);
    })
    .post("/tickets/:id/stop-test", async ({ params, set }) => {
      const ticket = store.getTicket(params.id);
      if (!ticket) return jsonError(set, HTTP_NOT_FOUND, "ticket introuvable");
      if (!ticket.testing) return jsonError(set, HTTP_CONFLICT, "aucune session de test active");
      await slots.stopTestSession(params.id);
      return store.getTicket(params.id);
    })
    .post("/tickets/:id/create-pr", async ({ params, set }) => {
      const ticket = store.getTicket(params.id);
      if (!ticket) return jsonError(set, HTTP_NOT_FOUND, "ticket introuvable");
      const eligible = ticket.column === "to_review" && ticket.stealth && ticket.slotId !== null;
      if (!eligible) {
        return jsonError(set, HTTP_CONFLICT, "création de PR réservée aux tickets stealth en colonne À review");
      }
      const result = await slots.createStealthPr(params.id);
      if (!result.ok) return jsonError(set, HTTP_CONFLICT, result.reason);
      return store.getTicket(params.id);
    })
    .post("/tickets/:id/implementation-recovery", async ({ params, body, set }) => {
      if (!store.getTicket(params.id)) return jsonError(set, HTTP_NOT_FOUND, "Ticket not found.");
      const parsed = recoverImplementationPlanArgsSchema.safeParse(body);
      if (!parsed.success) return jsonError(set, HTTP_BAD_REQUEST, parsed.error.message);
      const outcome = await coordinator.recoverImplementationPlan(params.id, parsed.data);
      if (!outcome.ok) return jsonError(set, HTTP_CONFLICT, outcome.result);
      return { ...outcome, ticket: store.getTicket(params.id), implementationPlan: store.getImplementationPlan(params.id) };
    })
    .get("/tickets/:id/autonomous-workspaces", async ({ params, set }) => {
      if (!store.getTicket(params.id)) return jsonError(set, HTTP_NOT_FOUND, "Ticket not found.");
      return slots.autonomousWorkspaces(params.id);
    })
    .post("/tickets/:id/autonomous-resume", async ({ params, body, set }) => {
      if (!store.getTicket(params.id)) return jsonError(set, HTTP_NOT_FOUND, "Ticket not found.");
      const emptyBody = body == null || (typeof body === "object" && Object.keys(body).length === 0);
      const parsed = autonomousResumeSchema.safeParse(emptyBody ? { action: "resume" } : body);
      if (!parsed.success) return jsonError(set, HTTP_BAD_REQUEST, parsed.error.message);
      const outcome = await coordinator.resumeAutonomous(params.id, parsed.data);
      if (!outcome.ok) return jsonError(set, HTTP_CONFLICT, outcome.result);
      return store.getTicket(params.id);
    })
    .post("/tickets/:id/relaunch", async ({ params, set }) => {
      const ticket = store.getTicket(params.id);
      if (!ticket) return jsonError(set, HTTP_NOT_FOUND, "ticket introuvable");
      if (store.getActiveQualityIteration(params.id) || store.getLatestQualityIteration(params.id)?.mode === "correction") return jsonError(set, HTTP_CONFLICT, "Utilise l'action dédiée à l'itération qualité.");
      if (ticket.column !== "implementing" || ticket.slotId === null) {
        return jsonError(set, HTTP_CONFLICT, "relance réservée aux cartes en cours d'implémentation dans un slot");
      }
      const relaunched = await slots.relaunch(params.id);
      if (!relaunched) return jsonError(set, HTTP_CONFLICT, "lancement déjà en cours");
      return store.getTicket(params.id);
    })
    .post("/tickets/:id/triage", ({ params, set }) => {
      const ticket = store.getTicket(params.id);
      if (!ticket) return jsonError(set, HTTP_NOT_FOUND, "ticket introuvable");
      if (isProcessing(ticket.stage)) return jsonError(set, HTTP_CONFLICT, "ticket verrouillé (en traitement)");
      // No running-guard: a stuck "running" analysis can be force-relaunched; start() tears the
      // previous session down first (mirrors the ticket-side "Relancer la session" force relaunch).
      const running = store.updateTicket(params.id, {
        triageStatus: "running",
        triageVerdict: null,
        triageReport: null,
      });
      hub.pushTicket(running);
      // Spawn the triage session in the background; persistence happens in TriageManager.complete.
      void deps.triage.start(params.id).catch((e) => {
        log.error("démarrage du triage échoué", {
          ticketId: params.id,
          error: getErrorMessage(e),
        });
      });
      return { started: true };
    })
    .post("/tickets/:id/triage-plus", ({ params, set }) => {
      const ticket = store.getTicket(params.id);
      if (!ticket) return jsonError(set, HTTP_NOT_FOUND, "ticket introuvable");
      if (isProcessing(ticket.stage)) return jsonError(set, HTTP_CONFLICT, "ticket verrouillé (en traitement)");
      const running = store.updateTicket(params.id, {
        triageStatus: "running",
        triageVerdict: null,
        triageReport: null,
      });
      hub.pushTicket(running);
      // Deep "Analyse +": background fan-out analysis using configured Claude study defaults or pinned Codex knobs.
      void deps.triage.start(params.id, { deep: true }).catch((e) => {
        log.error("démarrage de l'analyse + échoué", {
          ticketId: params.id,
          error: getErrorMessage(e),
        });
      });
      return { started: true };
    })
    .post("/tickets/:id/split", async ({ params, set }) => {
      const ticket = store.getTicket(params.id);
      if (!ticket) return jsonError(set, HTTP_NOT_FOUND, "ticket introuvable");
      if (ticket.kind !== "feature") return jsonError(set, HTTP_CONFLICT, "découpage réservé aux tickets feature");
      if (ticket.dependsOn !== null) return jsonError(set, HTTP_CONFLICT, "A ticket with a dependency cannot be split.");
      if (ticket.autonomous) return jsonError(set, HTTP_CONFLICT, "The autonomous pilot supports a single feature card. Split delivery is not qualified.");
      // Gate (re-validated server-side): column todo, OR column prd with a non-null PRD markdown.
      const eligible =
        ticket.column === "todo" || (ticket.column === "prd" && ticket.prdMarkdown !== null);
      if (!eligible) {
        return jsonError(set, HTTP_CONFLICT, "découpage réservé aux features en TODO ou en PRD (PRD requis)");
      }
      if (!isProjectKey(ticket.project)) return jsonError(set, HTTP_CONFLICT, "projet inconnu");
      const project = getProject(ticket.project);
      try {
        return await performSplit(deps, ticket, project);
      } catch (error) {
        return jsonError(set, HTTP_INTERNAL_ERROR, getErrorMessage(error, "échec du découpage"));
      }
    })
    .post("/tickets/:id/feasibility-answers", ({ params, body, set }) => {
      const parsed = feasibilityAnswerInputSchema.safeParse(body);
      if (!parsed.success) return jsonError(set, HTTP_BAD_REQUEST, "Invalid feasibility answer");
      try {
        const id = deps.feasibilityAnswers.start(params.id, parsed.data);
        return { started: true, id };
      } catch (error) {
        return jsonError(set, error instanceof FeasibilityAnswerError ? error.status : HTTP_INTERNAL_ERROR, getErrorMessage(error));
      }
    })
    .post("/tickets/:id/feasibility-answers/batch", ({ params, body, set }) => {
      const parsed = feasibilityAnswerBatchInputSchema.safeParse(body);
      if (!parsed.success) return jsonError(set, HTTP_BAD_REQUEST, "Invalid feasibility answers");
      try {
        const ids = deps.feasibilityAnswers.startBatch(params.id, parsed.data);
        return { started: true, ids };
      } catch (error) {
        return jsonError(set, error instanceof FeasibilityAnswerError ? error.status : HTTP_INTERNAL_ERROR, getErrorMessage(error));
      }
    })
    .post("/tickets/:id/reformulate", ({ params, set }) => {
      const ticket = store.getTicket(params.id);
      if (!ticket) return jsonError(set, HTTP_NOT_FOUND, "ticket introuvable");
      if (isProcessing(ticket.stage)) return jsonError(set, HTTP_CONFLICT, "ticket verrouillé (en traitement)");
      if (!isProjectKey(ticket.project)) return jsonError(set, HTTP_NOT_FOUND, "projet inconnu");
      if (ticket.reformulateStatus === "running") return jsonError(set, HTTP_CONFLICT, "reformulation déjà en cours");
      // Fire-and-forget: the SDK query runs in the background and pushes its result onto the ticket
      // over WS, so the request returns instantly instead of holding the connection open past Bun's
      // idle timeout (which surfaced in the WebView as "Load failed").
      deps.reformulate.start(params.id);
      return { started: true };
    })
    .post("/notion/import", async ({ body, set }) => {
      const parsed = importNotionSchema.safeParse(body);
      if (!parsed.success) return jsonError(set, HTTP_BAD_REQUEST, "URL Notion invalide");
      try {
        const execution = resolveExecution("one-shot", parsed.data, { model: MODELS.triage, effort: MODELS.triageEffort });
        await assertExecutionAvailable(deps.system, execution);
        const markdown = await runRecordedAction(store, "notion-import", execution, (onEvent) => deps.system.importNotion({
          cwd: deps.projectRoot,
          prompt: buildNotionImportPrompt(parsed.data.url),
          ...execution,
          onEvent,
        }));
        return { markdown };
      } catch (error) {
        return jsonError(set, HTTP_BAD_GATEWAY, getErrorMessage(error, "échec de l'import Notion"));
      }
    })
    .delete("/tickets/:id", async ({ params, set }) => {
      const ticket = store.getTicket(params.id);
      if (!ticket) return jsonError(set, HTTP_NOT_FOUND, "ticket introuvable");
      if (ticket.slotId !== null) {
        return jsonError(set, HTTP_CONFLICT, "ticket occupe un slot : abandonne-le d'abord");
      }
      if (ticket.autonomousState?.hostMutation || ticket.autonomousState?.execution?.closure.status === "unknown" || ticket.autonomousState?.execution?.closure.status === "requested") return jsonError(set, HTTP_CONFLICT, "Autonomous writer closure is unconfirmed. The ticket and its proofs are retained.");
      await deps.quality?.cancel(params.id);
      const preview = store.getTicketPreview(params.id);
      if (preview && preview.cleanupStatus !== "complete") {
        await deps.previews?.stop(preview.id);
        return jsonError(set, HTTP_CONFLICT, "Preview cleanup is incomplete. The ticket cannot be deleted yet.");
      }
      if (ticket.kind === "feature" && deps.quality?.get(params.id).runs.some((run) => run.cleanupStatus !== "complete")) {
        return jsonError(set, HTTP_CONFLICT, "Quality cleanup is incomplete. The ticket cannot be deleted yet.");
      }
      try { await removeQualityArtifacts(deps, params.id); } catch (error) {
        if (error instanceof QualityCleanupObligationError) return jsonError(set, HTTP_CONFLICT, error.message);
        throw error;
      }
      store.deleteTicket(params.id);
      hub.pushTicketRemoved(params.id);
      return { ok: true };
    })
    .get("/tickets/:id/terminal", async ({ params, query, set }) => {
      const ticket = store.getTicket(params.id);
      if (!ticket) return jsonError(set, HTTP_NOT_FOUND, "ticket introuvable");
      const phase = slots.getSetupPhase(params.id);
      // A testing ticket runs an interactive tmux shell (still captured live); every agent / triage /
      // feasibility ticket runs an in-process SDK session whose rendered transcript is the viewer source.
      const slot = ticket.slotId !== null ? store.getSlot(ticket.slotId) : null;
      if (slot?.tmuxSession) {
        return { output: await deps.system.capturePane(slot.tmuxSession), phase };
      }
      // A feasibility-evaluated ticket's transcript lives under its batch id; everything else under its own id.
      const transcriptId = deps.feasibility.batchKeyForTicket(params.id) ?? params.id;
      if (query.incremental === "1") {
        return { output: "", phase, transcript: deps.sessionHub.getTranscriptUpdate(transcriptId, typeof query.cursor === "string" ? query.cursor : undefined) };
      }
      return { output: deps.sessionHub.getTranscript(transcriptId), phase };
    })
    .get("/worktree-sessions", () => slots.listWorktreeSessions())
    .post("/worktree-sessions", ({ body, set }) => {
      const parsed = startWorktreeSessionBodySchema.safeParse(body);
      if (!parsed.success) return jsonError(set, HTTP_BAD_REQUEST, parsed.error.message);
      if (!isProjectKey(parsed.data.project)) return jsonError(set, HTTP_NOT_FOUND, "projet inconnu");
      if (!store.findFreeSlot()) return jsonError(set, HTTP_CONFLICT, "Aucun slot libre — réessaie une fois un slot libéré.");
      // Slow git worktree setup + install runs in the background; the board updates live over WS.
      void slots.startWorktreeSession(parsed.data).catch((e) => {
        log.error("démarrage session worktree échoué", { error: getErrorMessage(e) });
      });
      return { started: true };
    })
    .delete("/worktree-sessions/:slotId", async ({ params, set }) => {
      const slotId = Number(params.slotId);
      if (!Number.isInteger(slotId) || slotId <= 0) return jsonError(set, HTTP_BAD_REQUEST, "slotId invalide");
      await slots.stopWorktreeSession(slotId);
      return { ok: true };
    })
    .post("/worktree-sessions/:slotId/relaunch", async ({ params, set }) => {
      const slotId = Number(params.slotId);
      if (!Number.isInteger(slotId) || slotId <= 0) return jsonError(set, HTTP_BAD_REQUEST, "slotId invalide");
      await slots.relaunchWorktreeSession(slotId);
      return { ok: true };
    })
    .post("/uploads", async ({ body, set }) => {
      const file = body && typeof body === "object" && "file" in body ? body.file : null;
      if (!(file instanceof File)) return jsonError(set, HTTP_BAD_REQUEST, "fichier manquant");
      const saved = await saveUpload(deps.projectRoot, file);
      return { path: saved.path, url: saved.url };
    })
    .get("/slots", () => store.listSlots())
    .post("/internal/update", async ({ set }) => {
      const { onRequestUpdate, repoRoot, system } = deps;
      if (!onRequestUpdate || !repoRoot) return jsonError(set, HTTP_CONFLICT, "mise à jour indisponible");

      // Guards: never touch a dirty or diverged tree.
      const branch = await system.gitCurrentBranch(repoRoot);
      if (branch !== UPDATE_BASE_BRANCH) {
        return jsonError(set, HTTP_BAD_REQUEST, `branche courante « ${branch || "?"} » ≠ ${UPDATE_BASE_BRANCH} : bascule dessus avant de mettre à jour`);
      }
      if (!(await system.gitStatusClean(repoRoot))) {
        return jsonError(set, HTTP_BAD_REQUEST, "arbre de travail sale : commite ou stashe tes changements avant de mettre à jour");
      }

      // Capture HEAD before the pull so we can diff what actually changed.
      const headResult = await system.runProjectScript(repoRoot, "git rev-parse HEAD", GIT_QUERY_TIMEOUT_MS);
      if (!headResult.ok) log.warn("git rev-parse HEAD a échoué, fallback relaunch", { repoRoot });
      const beforeHash = headResult.ok ? headResult.output.trim() : null;

      const pull = await system.gitPullFastForward(repoRoot, UPDATE_BASE_BRANCH);
      if (!pull.ok) return jsonError(set, HTTP_BAD_REQUEST, pull.reason);

      // Classify the pull: frontend-only (src/web/** exclusively) → soft reload; anything else → relaunch.
      let frontendOnly = false;
      if (beforeHash) {
        const diffResult = await system.runProjectScript(
          repoRoot,
          `git diff --name-only ${beforeHash} HEAD`,
          GIT_QUERY_TIMEOUT_MS,
        );
        if (!diffResult.ok) log.warn("git diff --name-only a échoué, fallback relaunch", { repoRoot, beforeHash });
        const changed = diffResult.ok ? diffResult.output.trim().split("\n").filter(Boolean) : [];
        frontendOnly = changed.length > 0 && changed.every(isWebOnlyPath);
      }

      try {
        // The server runs the agent sessions in-process from source, so a non-frontend change only
        // needs the web bundle rebuilt; the relaunch below picks up the new server source directly.
        const web = await system.runProjectScript(repoRoot, "bun run build:web", UPDATE_BUILD_TIMEOUT_MS);
        if (!web.ok) return jsonError(set, HTTP_BAD_GATEWAY, `build:web a échoué : ${web.output.trim().slice(-BUILD_ERROR_TAIL)}`);
      } catch (error) {
        return jsonError(set, HTTP_BAD_GATEWAY, `build interrompu : ${getErrorMessage(error)}`);
      }

      const mode: UpdateMode = frontendOnly ? "reload" : "relaunch";
      if (frontendOnly) {
        log.info("mise à jour frontend-only validée, soft-reload", { repoRoot, branch });
        return { ok: true, mode };
      }
      log.info("mise à jour validée, relance imminente", { repoRoot, branch });
      // Defer so this {ok:true} flushes before the server stops and the process exits.
      setTimeout(onRequestUpdate, UPDATE_RELAUNCH_DELAY_MS);
      return { ok: true, mode };
    });
}
