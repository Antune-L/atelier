/**
 * Azure DevOps (Azure Repos) client of the VCS seam. Every call spawns `az` as an argv array through
 * the shared bounded-command helper, always with `--org <url> --detect false -o json` so nothing is
 * inferred from ambient git config. The org/project/repository triple comes from the parsed `origin`
 * remote for repo-scoped calls, and from the PR web URL for PR-scoped ones.
 *
 * A review pass is published as comment threads (`az devops invoke --area git`): one general thread
 * carrying the marker and the review body, plus one inline thread per finding
 * anchored on the latest iteration's changes. The verdict becomes a reviewer vote through
 * `az repos pr set-vote`.
 */

import { z } from "zod";

import { VCS_PROVIDER_LABELS } from "../../../shared/constants.ts";
import type { PrMergeability, PrReviewStatus, PrState } from "../../../shared/constants.ts";
import { parsePrUrl } from "../../../shared/prUrl.ts";
import { isPrNeedsAttention } from "../../../shared/pr.ts";
import type { OpenPr, VcsConnectionResult } from "../../../shared/schemas.ts";

import { boundedCommandDetail, runBoundedCommand, safeJsonParse, withJsonRequestFile } from "../boundedCommand.ts";
import { renderOutsideDiffSection } from "../reviewMarkdown.ts";
import { REVIEW_PUBLICATION_STATE_BY_EVENT } from "../types.ts";
import type {
  DoneGateResult,
  PublishReviewOptions,
  PublishReviewResult,
  ReviewHeadResult,
  ReviewPublicationComment,
  ReviewPublicationEvent,
  ReviewPublicationState,
  RecoveryCandidateOptions,
} from "../types.ts";
import { parseAzureRepoRef } from "./azureRemote.ts";
import type { AzureRepoRef } from "./azureRemote.ts";
import {
  AZ_API_VERSION,
  AZ_AREA_GIT,
  AZ_AREA_POLICY,
  AZ_BINARY,
  AZ_COMMENT_TYPE_SYSTEM,
  AZ_PREVIEW_API_VERSION,
  AZ_RESOURCE_POLICY_EVALUATIONS,
  AZ_RESOURCE_PRS,
  AZ_RESOURCE_PR_ITERATION_CHANGES,
  AZ_RESOURCE_PR_ITERATIONS,
  AZ_RESOURCE_PR_REVIEWERS,
  AZ_RESOURCE_PR_THREADS,
  HTTP_GET,
  HTTP_POST,
} from "./azureRest.ts";
import { CONNECTION_TEST_PR_LIMIT, connectionFailure, connectionResult } from "./connection.ts";
import { confirmPrMerged, unmergedReason } from "./prMerge.ts";
import type { CreatePrResult, ReviewPublicationCheck, ReviewRequestSnapshot, VcsClient } from "./types.ts";

const AZURE_PYTHON_LOCATION_RE = /^Python location '([^'\r\n]+)'$/m;
const AZURE_PENDING_REVIEW_VOTE = 0;
const AZURE_CURRENT_IDENTITY_SCRIPT = `
import json, sys
from azure.cli.core.extension import get_extension_path
sys.path.insert(0, get_extension_path("azure-devops"))
from azext_devops.dev.common.identities import get_current_identity
identity = get_current_identity(sys.argv[1])
print(json.dumps({"id": identity.id}))
`;
const azureCurrentIdentitySchema = z.object({ id: z.string().min(1) });

const AZURE_LABEL = VCS_PROVIDER_LABELS.azureDevops;

const PR_PAGE_SIZE = 100;
const POLICY_PAGE_SIZE = 100;
const POLICY_LOOKUP_BATCH_SIZE = 5;
const MINIMUM_APPROVAL_POLICY_TYPE = "fa4e907d-c16b-4a4c-9dfa-4906e5d171dd";
const POLICY_APPROVED_STATUS = "approved";
const POLICY_NOT_APPLICABLE_STATUS = "notApplicable";
const HEADS_REF_PREFIX = "refs/heads/";
const PR_URL_SEGMENT = "pullrequest";
/** Path segment separating the project from the repository in an Azure PR web URL. */
const GIT_SEGMENT = "_git";

/**
 * Azure reviewer vote scale: 10 approved, 5 approved with suggestions, 0 no vote, -5 waiting for the
 * author, -10 rejected. Any negative vote outranks any positive one, as on GitHub.
 */
const VOTE_REJECTED_MAX = -1;
const VOTE_APPROVED_MIN = 1;
const VOTE_APPROVED = 10;
const VOTE_WAIT_FOR_AUTHOR = -5;

/**
 * Azure statuses of `az repos pr show/list`, mapped onto the neutral PR state. `notSet` never appears
 * on a real PR, so anything unlisted falls back to "unknown".
 */
const PR_STATE_BY_AZURE_STATUS: Record<string, PrState> = {
  active: "open",
  completed: "merged",
  abandoned: "closed",
};

const PR_MERGEABILITY_BY_AZURE_MERGE_STATUS: Record<string, PrMergeability> = {
  succeeded: "mergeable",
  conflicts: "conflicting",
};

/**
 * NOTE(ali): the CLI exposes no rebase merge strategy — `az repos pr update --help` offers only
 * `--squash` (plus the policy-bypass flags). Squash is the closest match to the GitHub `--rebase`
 * strategy in that it keeps the base branch linear; it does collapse the PR's commits into one.
 */
const PR_MERGE_SQUASH = "true";
const PR_COMPLETED_STATUS = "completed";

/** Thread/comment enum values the create payload takes as integers (the GET side returns strings). */
const COMMENT_TYPE_TEXT = 1;
const THREAD_STATUS_ACTIVE = 1;
const THREAD_STATUS_CLOSED = 4;
const ROOT_PARENT_COMMENT_ID = 0;
/** A one-character right-side selection: the narrowest anchor Azure accepts on a line. */
const ANCHOR_START_OFFSET = 1;
const ANCHOR_END_OFFSET = 2;
/** Inline anchors always compare the first iteration to the latest one (the whole PR so far). */
const FIRST_COMPARING_ITERATION = 1;
/** Azure prefixes every repository path with a slash; the app stores paths relative to the root. */
const AZURE_PATH_PREFIX = "/";

/**
 * Reviewer vote each publication verdict maps to. `--vote` takes a name, not the numeric scale:
 * `approve | approve-with-suggestions | reject | reset | wait-for-author` (verified in
 * `az repos pr set-vote --help`). A COMMENT pass states no position, so it casts no vote at all.
 */
const VOTE_BY_EVENT: Record<ReviewPublicationEvent, string | null> = {
  APPROVE: "approve",
  REQUEST_CHANGES: "wait-for-author",
  COMMENT: null,
};

const azureReviewerSchema = z.object({
  id: z.string().optional(),
  isFlagged: z.boolean().nullable().optional(),
  hasDeclined: z.boolean().nullable().optional(),
  vote: z.number(),
  isRequired: z.boolean().nullable().default(false),
});
const azureReviewerVoteSchema = azureReviewerSchema.extend({ id: z.string().min(1) });
const azureIdentitySchema = z.object({
  displayName: z.string().nullable().default(null),
  uniqueName: z.string().nullable().default(null),
});

/** One `az repos pr list` entry (mapped to the shared OpenPr). */
const azurePrListEntrySchema = z.object({
  pullRequestId: z.number().int(),
  title: z.string(),
  sourceRefName: z.string(),
  targetRefName: z.string(),
  isDraft: z.boolean(),
  reviewers: z.array(azureReviewerSchema).default([]),
  creationDate: z.string(),
  createdBy: azureIdentitySchema.nullable().default(null),
  repository: z.object({
    name: z.string(),
    project: z.object({ id: z.string().min(1) }).nullable().default(null),
  }),
});
const azurePrListSchema = z.object({ value: z.array(azurePrListEntrySchema) });
const azurePolicyListSchema = z.object({
  value: z.array(z.object({
    status: z.string(),
    configuration: z.object({
      isEnabled: z.boolean(),
      isBlocking: z.boolean(),
      isDeleted: z.boolean().default(false),
      type: z.object({ id: z.string() }),
    }),
  })),
});

/**
 * The `az repos pr show` fields the gates read. `repository.id` is the GUID every `az devops invoke`
 * route needs (the repository *name* is not accepted there), and `repository.project.name` saves a
 * second lookup for the `project` route parameter.
 */
const azurePrShowSchema = z.object({
  pullRequestId: z.number().int(),
  status: z.string(),
  mergeStatus: z.string().nullable().default(null),
  sourceRefName: z.string(),
  description: z.string().nullable().default(null),
  lastMergeSourceCommit: z.object({ commitId: z.string().min(1) }).nullable().default(null),
  repository: z.object({
    id: z.string().min(1),
    project: z.object({ name: z.string().min(1) }).nullable().default(null),
  }).nullable().default(null),
});

const azurePrCreateSchema = z.object({ pullRequestId: z.number().int() });
const azureCandidateSchema = azurePrShowSchema.extend({
  targetRefName: z.string(),
  forkSource: z.unknown().nullable().default(null),
  repository: z.object({ id: z.string().min(1), name: z.string().min(1), project: z.object({ name: z.string().min(1) }) }),
});
const azureCandidateRefsSchema = z.array(z.object({ name: z.string(), objectId: z.string().min(1) }));
const AZURE_SOURCE_REF_FILTER_PREFIX = "heads/";
const AZURE_ACTIVE_STATE = "active";

const azureCommentSchema = z.object({
  id: z.number().int(),
  content: z.string().nullable().default(null),
  commentType: z.string().nullable().default(null),
  isDeleted: z.boolean().nullable().default(null),
  publishedDate: z.string().nullable().default(null),
  author: z.object({ id: z.string().min(1) }).nullable().default(null),
});

const azureThreadSchema = z.object({
  id: z.number().int(),
  isDeleted: z.boolean().nullable().default(null),
  comments: z.array(azureCommentSchema).default([]),
});

/** `az devops invoke` wraps every collection response in `{ count, value }`. */
const azureThreadListSchema = z.object({ value: z.array(azureThreadSchema).default([]) });
const azureIterationListSchema = z.object({ value: z.array(z.object({ id: z.number().int() })).default([]) });

/**
 * One entry of `pullRequestIterationChanges`. `changeTrackingId` anchors an inline thread on the
 * change; an entry without one (or without an item path) simply yields no anchor for that file.
 */
const azureChangeEntrySchema = z.object({
  changeTrackingId: z.number().int().nullable().default(null),
  item: z.object({ path: z.string().nullable().default(null) }).nullable().default(null),
});
const azureIterationChangesSchema = z.object({ changeEntries: z.array(azureChangeEntrySchema).default([]) });

function stripHeadsPrefix(ref: string): string {
  return ref.startsWith(HEADS_REF_PREFIX) ? ref.slice(HEADS_REF_PREFIX.length) : ref;
}

/**
 * Web URL of a PR. The `url` field of the JSON payload is the REST API endpoint (…/_apis/git/…),
 * which is not clickable in the board, so the browsable URL is rebuilt from the repo triple.
 */
function prWebUrl(ref: AzureRepoRef, prNumber: number): string {
  return `${ref.orgUrl}/${ref.project}/${GIT_SEGMENT}/${ref.repository}/${PR_URL_SEGMENT}/${prNumber}`;
}

function reviewStatusFromReviewers(reviewers: z.infer<typeof azureReviewerSchema>[]): PrReviewStatus {
  if (reviewers.some((reviewer) => reviewer.vote <= VOTE_REJECTED_MAX)) return "changes_requested";
  if (reviewers.some((reviewer) => reviewer.isRequired && reviewer.vote < VOTE_APPROVED_MIN)) return "needs_review";
  if (reviewers.some((reviewer) => reviewer.vote >= VOTE_APPROVED_MIN)) return "approved";
  return reviewers.length > 0 ? "needs_review" : "none";
}

/** Everything a review-publication call needs about the PR, resolved from a single `az repos pr show`. */
interface AzurePrContext {
  orgUrl: string;
  project: string;
  repositoryId: string;
  prNumber: number;
  headCommitSha: string | null;
}

type AzureThread = z.infer<typeof azureThreadSchema>;
type AzurePrListEntry = z.infer<typeof azurePrListEntrySchema>;

// NOTE(ali): Finding markers contain the pass marker; only a completion comment allows the vote retry.
const FINDING_MARKER_PREFIX = "<!-- kanban-review-finding:";
const FINDING_MARKER_SUFFIX = " -->";
const COMPLETION_MARKER = "<!-- kanban-review-complete -->";

function completionMarker(passMarker: string): string {
  return `${passMarker}${COMPLETION_MARKER}`;
}

function inlineFindingMarker(passMarker: string, comment: ReviewPublicationComment): string {
  return `${passMarker}${FINDING_MARKER_PREFIX}${comment.path}:${comment.line}${FINDING_MARKER_SUFFIX}`;
}

/** An inline finding thread still to post: its content before any completion marker, plus its anchor. */
interface PendingInlineThread {
  content: string;
  threadContext: Record<string, unknown>;
  pullRequestThreadContext: Record<string, unknown>;
}

/** The thread's first comment, when it is a live human comment (system and deleted threads excluded). */
function reviewComment(thread: AzureThread): z.infer<typeof azureCommentSchema> | null {
  if (thread.isDeleted === true) return null;
  const first = thread.comments[0];
  if (first === undefined || first.isDeleted === true) return null;
  if (first.commentType === AZ_COMMENT_TYPE_SYSTEM) return null;
  return first;
}

function threadCarriesMarker(thread: AzureThread, marker: string): boolean {
  return reviewComment(thread)?.content?.includes(marker) === true;
}

// NOTE(ali): Legacy summary threads carry the pass marker without a finding marker.
function completionComment(thread: AzureThread, passMarker: string): z.infer<typeof azureCommentSchema> | null {
  const comment = reviewComment(thread);
  if (comment === null || comment.content === null) return null;
  if (comment.content.includes(completionMarker(passMarker))) return comment;
  if (comment.content.includes(passMarker) && !comment.content.includes(FINDING_MARKER_PREFIX)) return comment;
  return null;
}

/** Repository path as Azure spells it in `threadContext.filePath` and in the iteration changes. */
function azurePath(path: string): string {
  return path.startsWith(AZURE_PATH_PREFIX) ? path : `${AZURE_PATH_PREFIX}${path}`;
}

function threadComment(content: string): Record<string, unknown> {
  return { parentCommentId: ROOT_PARENT_COMMENT_ID, content, commentType: COMMENT_TYPE_TEXT };
}

/**
 * NOTE(ali): an Azure thread renders the file it is attached to but no `path:line` header the way a
 * GitHub inline comment does, so the location is prepended to the body here rather than in the shared
 * finding renderer — GitHub would show it twice.
 */
function renderInlineLocation(comment: ReviewPublicationComment): string {
  return `\`${comment.path}:${comment.line}\`\n\n`;
}

async function readOriginRemote(repoPath: string): Promise<string | null> {
  const res = await runBoundedCommand(["git", "-C", repoPath, "remote", "get-url", "origin"], repoPath);
  if (res.exitCode !== 0 || res.timedOut) return null;
  return res.stdout.trim() || null;
}

/** The org/project/repository triple of a working copy, from its `origin` remote. */
async function repoRefFromRemote(repoPath: string): Promise<AzureRepoRef | null> {
  const remote = await readOriginRemote(repoPath);
  return remote === null ? null : parseAzureRepoRef(remote);
}

/**
 * The same triple read off a PR web URL (`…/{org}/{project}/_git/{repo}/pullrequest/{id}`), so a
 * PR-scoped gate never depends on the working copy's remote. A PR URL is the repository URL plus the
 * `/pullrequest/{id}` suffix, so `parseAzureRepoRef` — the single owner of "org/project/repo from a
 * URL" — reads the triple straight off it, and `parsePrUrl` owns the identifier.
 */
function repoRefFromPrUrl(prUrl: string): { ref: AzureRepoRef; prNumber: number } | null {
  const parsed = parsePrUrl(prUrl);
  if (parsed === null || parsed.provider !== "azureDevops") return null;
  const ref = parseAzureRepoRef(prUrl);
  return ref === null ? null : { ref, prNumber: parsed.number };
}

export class AzureDevopsVcsClient implements VcsClient {
  async testConnection(repoPath: string, checkedAt: number): Promise<VcsConnectionResult> {
    if (!Bun.which(AZ_BINARY)) return connectionFailure("CLI `az` introuvable dans le PATH", checkedAt);
    const remote = await readOriginRemote(repoPath);
    if (remote === null) return connectionFailure("remote `origin` introuvable dans le dépôt", checkedAt);
    const ref = parseAzureRepoRef(remote);
    if (ref === null) {
      return connectionFailure(`le remote origin n'est pas une URL Azure DevOps : ${remote}`, checkedAt);
    }
    const res = await runBoundedCommand(
      [...this.repoArgs(ref, ["repos", "pr", "list"]), "--top", CONNECTION_TEST_PR_LIMIT],
      repoPath,
    );
    return connectionResult(res, "az repos pr list", `Connexion Azure DevOps OK (${ref.project}/${ref.repository})`, checkedAt);
  }

  async listReviewRequests(repoPath: string): Promise<ReviewRequestSnapshot> {
    const ref = await repoRefFromRemote(repoPath);
    if (ref === null) throw new Error("Azure DevOps origin remote could not be read");
    const runtime = await runBoundedCommand([AZ_BINARY, "--version"], repoPath);
    if (runtime.exitCode !== 0 || runtime.timedOut) throw new Error("Azure CLI Python runtime could not be resolved");
    const python = AZURE_PYTHON_LOCATION_RE.exec(runtime.stdout)?.[1];
    if (!python || !Bun.which(python)) throw new Error("Azure CLI Python runtime response is invalid");
    const result = await runBoundedCommand([python, "-c", AZURE_CURRENT_IDENTITY_SCRIPT, ref.orgUrl], repoPath);
    if (result.exitCode !== 0 || result.timedOut) throw new Error("Azure DevOps authenticated identity could not be read");
    const identity = azureCurrentIdentitySchema.safeParse(safeJsonParse(result.stdout));
    if (!identity.success) throw new Error("Azure DevOps authenticated identity response is invalid");
    const prs = await this.readOpenPrs(repoPath, ref);
    if (prs === null) throw new Error("Azure DevOps review requests could not be read");
    if (prs.some((pr) => pr.reviewers.some((reviewer) => !reviewer.id))) {
      throw new Error("Azure DevOps reviewer identity response is invalid");
    }
    const userId = identity.data.id.toLowerCase();
    const requested = prs.filter((pr) => !pr.isDraft && pr.reviewers.some((reviewer) => reviewer.id?.toLowerCase() === userId && reviewer.hasDeclined !== true && (reviewer.vote === AZURE_PENDING_REVIEW_VOTE || reviewer.isFlagged === true)));
    return {
      identityKey: `azureDevops:${ref.orgUrl.toLowerCase()}/${ref.project.toLowerCase()}/${ref.repository.toLowerCase()}:${userId}`,
      prs: requested.map((pr) => ({
        number: pr.pullRequestId, title: pr.title, url: prWebUrl(ref, pr.pullRequestId),
        headBranch: stripHeadsPrefix(pr.sourceRefName), baseBranch: stripHeadsPrefix(pr.targetRefName), isDraft: pr.isDraft,
        reviewStatus: "needs_review", updatedAt: pr.creationDate, author: pr.createdBy?.displayName ?? pr.createdBy?.uniqueName ?? "?",
        additions: null, deletions: null,
      })),
    };
  }

  async listOpenPrs(repoPath: string): Promise<OpenPr[]> {
    const ref = await repoRefFromRemote(repoPath);
    if (ref === null) throw new Error("listing des PR : remote origin Azure DevOps introuvable");
    const prs = await this.readOpenPrs(repoPath, ref);
    if (prs === null) throw new Error("lecture des PR Azure DevOps échouée ou sortie inattendue");
    const statuses = await this.reviewStatuses(repoPath, ref, prs);
    return prs.map((pr, index) => ({
      number: pr.pullRequestId,
      title: pr.title,
      url: prWebUrl(ref, pr.pullRequestId),
      headBranch: stripHeadsPrefix(pr.sourceRefName),
      baseBranch: stripHeadsPrefix(pr.targetRefName),
      isDraft: pr.isDraft,
      reviewStatus: statuses[index] ?? "needs_review",
      // NOTE(ali): the Azure PR payload carries no "last updated" date — only creationDate — so the
      // picker orders by creation. A last-activity date would need one threads read per listed PR.
      updatedAt: pr.creationDate,
      author: pr.createdBy?.displayName ?? pr.createdBy?.uniqueName ?? "?",
      // Azure exposes no diff stat on a PR; the pickers hide the counters rather than show zeros.
      additions: null,
      deletions: null,
    }));
  }

  async listReviewCounts(repoPaths: string[]): Promise<Record<string, number | null>> {
    const entries = await Promise.all(repoPaths.map(async (repoPath): Promise<[string, number | null]> => {
      try {
        const ref = await repoRefFromRemote(repoPath);
        if (!ref) return [repoPath, null];
        const prs = await this.readOpenPrs(repoPath, ref);
        if (prs === null) return [repoPath, null];
        const eligible = prs.filter((pr) => !pr.isDraft);
        const statuses = await this.reviewStatuses(repoPath, ref, eligible);
        const attention = eligible.map((pr, index) => isPrNeedsAttention({
          isDraft: pr.isDraft,
          reviewStatus: statuses[index] ?? "needs_review",
        }));
        return [repoPath, attention.filter(Boolean).length];
      } catch {
        return [repoPath, null];
      }
    }));
    return Object.fromEntries(entries);
  }

  async verifyPrExists(cwd: string, prUrl: string): Promise<DoneGateResult> {
    const pr = await this.showPr(cwd, prUrl);
    if (!pr.ok) return { ok: false, reason: `la PR n'existe pas (${prUrl})` };
    return { ok: true, reason: "" };
  }

  async verifyRecoveryCandidate(opts: RecoveryCandidateOptions): Promise<DoneGateResult> {
    const expected = await repoRefFromRemote(opts.repoPath);
    const slot = await repoRefFromRemote(opts.slotPath);
    const target = repoRefFromPrUrl(opts.prUrl);
    if (!expected || !slot || !target || new URL(opts.prUrl).protocol !== "https:"
      || JSON.stringify(expected).toLowerCase() !== JSON.stringify(slot).toLowerCase()
      || JSON.stringify(expected).toLowerCase() !== JSON.stringify(target.ref).toLowerCase()) {
      return { ok: false, reason: "La PR ne correspond pas au dépôt Azure DevOps configuré." };
    }
    const result = await runBoundedCommand([
      AZ_BINARY, "repos", "pr", "show", "--id", String(target.prNumber),
      "--org", expected.orgUrl, "--detect", "false", "-o", "json",
    ], opts.slotPath);
    const parsed = azureCandidateSchema.safeParse(safeJsonParse(result.stdout));
    if (result.exitCode !== 0 || result.timedOut || !parsed.success) {
      return { ok: false, reason: "Lecture de l'identité Azure DevOps de la PR impossible." };
    }
    const pr = parsed.data;
    if (pr.forkSource !== null) return { ok: false, reason: "La PR provient d'un fork ; récupération refusée." };
    if (pr.pullRequestId !== target.prNumber || pr.repository.name.toLowerCase() !== expected.repository.toLowerCase()
      || pr.repository.project.name.toLowerCase() !== expected.project.toLowerCase()) {
      return { ok: false, reason: "L'identité du dépôt de la PR Azure DevOps est incompatible." };
    }
    if (pr.status !== AZURE_ACTIVE_STATE) return { ok: false, reason: "La PR doit être ouverte pour la récupération." };
    if (pr.sourceRefName !== `${HEADS_REF_PREFIX}${opts.branch}` || pr.targetRefName !== `${HEADS_REF_PREFIX}${opts.baseBranch}`) {
      return { ok: false, reason: "Les branches de la PR ne correspondent pas au candidat." };
    }
    if (pr.lastMergeSourceCommit?.commitId !== opts.commitSha) return { ok: false, reason: "Le commit de la PR ne correspond pas au candidat évalué." };
    const refs = await runBoundedCommand([
      ...this.repoArgs(expected, ["repos", "ref", "list"]), "--filter", `${AZURE_SOURCE_REF_FILTER_PREFIX}${opts.branch}`,
    ], opts.slotPath);
    const parsedRefs = azureCandidateRefsSchema.safeParse(safeJsonParse(refs.stdout));
    if (refs.exitCode !== 0 || refs.timedOut || !parsedRefs.success) {
      return { ok: false, reason: "Lecture du commit courant de la branche Azure DevOps impossible." };
    }
    const sourceRefs = parsedRefs.data.filter((ref) => ref.name === `${HEADS_REF_PREFIX}${opts.branch}`);
    if (sourceRefs.length !== 1 || sourceRefs[0]?.objectId !== opts.commitSha) {
      return { ok: false, reason: "Le commit courant de la branche Azure DevOps ne correspond pas au candidat." };
    }
    return { ok: true, reason: "" };
  }

  async readPrHead(cwd: string, prUrl: string): Promise<ReviewHeadResult> {
    const pr = await this.showPr(cwd, prUrl);
    if (!pr.ok) return { ok: false, reason: "lecture du head Azure DevOps de la PR échouée", commitSha: null };
    const commitSha = pr.data.lastMergeSourceCommit?.commitId ?? null;
    if (commitSha === null) {
      return { ok: false, reason: "réponse Azure DevOps inattendue pour le head de la PR", commitSha: null };
    }
    return { ok: true, reason: "", commitSha };
  }

  async confirmPrHead(cwd: string, prUrl: string): Promise<ReviewHeadResult> {
    const pr = await this.showPr(cwd, prUrl);
    if (!pr.ok) return { ok: false, reason: `la PR n'existe pas (${prUrl})`, commitSha: null };
    const commitSha = pr.data.lastMergeSourceCommit?.commitId ?? null;
    if (commitSha === null) {
      return { ok: false, reason: "impossible de confirmer la PR et son head courant", commitSha: null };
    }
    return { ok: true, reason: "", commitSha };
  }

  /**
   * NOTE(ali): Azure publishes only `refs/pull/<n>/merge` on origin, never `/head` (checked with
   * `git ls-remote`), and the merge ref is a preview merge commit, not the PR head. The review
   * worktree therefore fetches the PR's source branch; the adapter then compares the fetched SHA to
   * the `lastMergeSourceCommit.commitId` this client reported, which rejects a branch that moved.
   */
  async prHeadFetchRef(cwd: string, prUrl: string, _prNumber: number): Promise<string | null> {
    const pr = await this.showPr(cwd, prUrl);
    return pr.ok ? pr.data.sourceRefName : null;
  }

  async createPr(cwd: string, baseBranch: string, opts: { draft: boolean }): Promise<CreatePrResult> {
    const ref = await repoRefFromRemote(cwd);
    if (ref === null) return { ok: false, url: "", reason: "création de PR : remote origin Azure DevOps introuvable" };
    const sourceBranch = await this.currentBranch(cwd);
    if (sourceBranch === null) return { ok: false, url: "", reason: "branche courante introuvable pour la création de PR" };
    // `az repos pr create` has no `--fill`: derive the title and the description from the commits,
    // the way `gh pr create --fill` does.
    const subjects = await this.commitSubjects(cwd, baseBranch);
    if (subjects.length === 0) {
      return { ok: false, url: "", reason: `aucun commit entre origin/${baseBranch} et HEAD : rien à proposer en PR` };
    }
    const title = subjects[subjects.length - 1] ?? sourceBranch;
    const description = subjects.map((subject) => `- ${subject}`);
    const res = await runBoundedCommand(
      [
        ...this.repoArgs(ref, ["repos", "pr", "create"]),
        "--source-branch", sourceBranch,
        "--target-branch", baseBranch,
        "--title", title,
        "--description", ...description,
        "--draft", String(opts.draft),
      ],
      cwd,
    );
    if (res.exitCode !== 0 || res.timedOut) {
      return { ok: false, url: "", reason: `az repos pr create a échoué : ${boundedCommandDetail(res)}` };
    }
    const parsed = azurePrCreateSchema.safeParse(safeJsonParse(res.stdout));
    if (!parsed.success) {
      return { ok: false, url: "", reason: "identifiant de PR introuvable dans la sortie de az repos pr create" };
    }
    return { ok: true, url: prWebUrl(ref, parsed.data.pullRequestId), reason: "" };
  }

  async fetchPrSummary(cwd: string, prUrl: string): Promise<string | null> {
    const pr = await this.showPr(cwd, prUrl);
    if (!pr.ok) return null;
    const body = pr.data.description?.trim() ?? "";
    return body.length > 0 ? body : null;
  }

  /**
   * One inline thread carries each finding whose file appears in the latest iteration's changes; a
   * finding Azure cannot anchor is folded into the summary body instead of failing the publication,
   * exactly as on GitHub. The completion marker lands on the last thing posted: the general summary
   * thread when its body has visible content, otherwise the last inline thread, otherwise a closed
   * marker-only thread so no empty comment shows. That thread's id is the persisted `reviewId`.
   */
  async publishReview(cwd: string, prUrl: string, opts: PublishReviewOptions): Promise<PublishReviewResult> {
    const context = await this.prContext(cwd, prUrl);
    if (context === null) return { ok: false, reason: "URL de PR Azure DevOps invalide ou PR illisible", reviewId: null };
    const threads = await this.readThreads(cwd, context);
    if (threads === null) return { ok: false, reason: "lecture des fils Azure DevOps échouée", reviewId: null };
    const already = threads.find((thread) => completionComment(thread, opts.marker) !== null);
    if (already !== undefined) return this.finishReviewPublication(cwd, context, opts.event, opts.marker, already);

    const anchors = await this.readChangeAnchors(cwd, context);
    const outsideDiff: ReviewPublicationComment[] = [];
    const pending: PendingInlineThread[] = [];
    for (const comment of opts.comments) {
      const anchor = anchors?.byPath.get(azurePath(comment.path));
      if (anchors === null || anchor === undefined) {
        outsideDiff.push(comment);
        continue;
      }
      const marker = inlineFindingMarker(opts.marker, comment);
      if (threads.some((thread) => threadCarriesMarker(thread, marker))) continue;
      pending.push({
        content: `${renderInlineLocation(comment)}${comment.body}\n\n${marker}`,
        threadContext: {
          filePath: azurePath(comment.path),
          rightFileStart: { line: comment.line, offset: ANCHOR_START_OFFSET },
          rightFileEnd: { line: comment.line, offset: ANCHOR_END_OFFSET },
        },
        pullRequestThreadContext: {
          changeTrackingId: anchor,
          iterationContext: {
            firstComparingIteration: FIRST_COMPARING_ITERATION,
            secondComparingIteration: anchors.iterationId,
          },
        },
      });
    }

    const completion = completionMarker(opts.marker);
    const visibleBody = `${opts.body}${renderOutsideDiffSection(outsideDiff)}`.trim();
    const completesInline = visibleBody === "" && pending.length > 0;
    let lastInline: AzureThread | null = null;
    for (const [index, { content, threadContext, pullRequestThreadContext }] of pending.entries()) {
      const carriesCompletion = completesInline && index === pending.length - 1;
      lastInline = await this.createThread(cwd, context, {
        comments: [threadComment(carriesCompletion ? `${content}${completion}` : content)],
        status: THREAD_STATUS_ACTIVE,
        threadContext,
        pullRequestThreadContext,
      });
      if (lastInline === null) {
        return { ok: false, reason: `publication d'un commentaire inline ${AZURE_LABEL} échouée`, reviewId: null };
      }
    }
    if (completesInline && lastInline !== null) {
      return this.finishReviewPublication(cwd, context, opts.event, opts.marker, lastInline);
    }

    const summary = await this.createThread(cwd, context, {
      comments: [threadComment(visibleBody === "" ? completion : `${visibleBody}\n\n${completion}`)],
      status: visibleBody === "" ? THREAD_STATUS_CLOSED : THREAD_STATUS_ACTIVE,
    });
    if (summary === null) {
      return { ok: false, reason: `publication de la review ${AZURE_LABEL} échouée`, reviewId: null };
    }
    return this.finishReviewPublication(cwd, context, opts.event, opts.marker, summary);
  }

  async verifyReviewPublication(cwd: string, prUrl: string, check: ReviewPublicationCheck): Promise<DoneGateResult> {
    const context = await this.prContext(cwd, prUrl);
    if (context === null) return { ok: false, reason: "URL de PR Azure DevOps invalide ou PR illisible" };
    if (context.headCommitSha !== check.commitSha) {
      return { ok: false, reason: "postage demandé mais le head de la PR a changé depuis le commit revu" };
    }
    const threads = await this.readThreads(cwd, context);
    if (threads === null) return { ok: false, reason: "postage demandé mais lecture des fils échouée" };
    const thread = threads.find((candidate) => candidate.id === check.reviewId);
    const posted = thread === undefined ? null : completionComment(thread, check.marker);
    const publishedDate = posted?.publishedDate ?? null;
    if (posted === null || publishedDate === null || !(Date.parse(publishedDate) >= check.since)) {
      return { ok: false, reason: "postage demandé mais aucune review postée sur la PR" };
    }
    return this.verifyVote(cwd, context, check.expectedState, posted.author?.id ?? null);
  }

  async mergePr(cwd: string, prUrl: string): Promise<DoneGateResult> {
    const target = repoRefFromPrUrl(prUrl);
    if (target === null) return { ok: false, reason: "URL de PR Azure DevOps invalide" };
    // A draft PR can't be completed; publish it first (harmless if already published).
    await runBoundedCommand(this.prUpdateArgs(target, ["--draft", "false"]), cwd);
    const res = await runBoundedCommand(
      this.prUpdateArgs(target, ["--status", PR_COMPLETED_STATUS, "--squash", PR_MERGE_SQUASH]),
      cwd,
    );
    if (res.exitCode !== 0 || res.timedOut) {
      return { ok: false, reason: `az repos pr update a échoué : ${boundedCommandDetail(res)}` };
    }
    // Completion is asynchronous when policies are still running: confirm the real state, as on GitHub.
    const state = await confirmPrMerged(() => this.readPrState(cwd, prUrl));
    if (state !== "merged") {
      return { ok: false, reason: unmergedReason(AZURE_LABEL, state, res.stdout.trim() || res.stderr.trim()) };
    }
    return { ok: true, reason: "" };
  }

  async readPrState(cwd: string, prUrl: string): Promise<PrState> {
    const pr = await this.showPr(cwd, prUrl);
    if (!pr.ok) return "unknown";
    return PR_STATE_BY_AZURE_STATUS[pr.data.status] ?? "unknown";
  }

  async readPrMergeability(cwd: string, prUrl: string): Promise<PrMergeability> {
    const pr = await this.showPr(cwd, prUrl);
    if (!pr.ok || pr.data.mergeStatus === null) return "unknown";
    return PR_MERGEABILITY_BY_AZURE_MERGE_STATUS[pr.data.mergeStatus] ?? "unknown";
  }

  private async readOpenPrs(cwd: string, ref: AzureRepoRef): Promise<AzurePrListEntry[] | null> {
    const prs: AzurePrListEntry[] = [];
    const repositoryName = ref.repository.toLowerCase();
    for (let offset = 0; ; offset += PR_PAGE_SIZE) {
      const res = await runBoundedCommand(this.resourceArgs(ref.orgUrl, AZ_AREA_GIT, AZ_RESOURCE_PRS, [
        `project=${ref.project}`,
        `repositoryId=${ref.repository}`,
      ], {
        method: HTTP_GET,
        queryParameters: ["searchCriteria.status=active", `$top=${PR_PAGE_SIZE}`, `$skip=${offset}`],
      }), cwd);
      if (res.exitCode !== 0 || res.timedOut) return null;
      const parsed = azurePrListSchema.safeParse(safeJsonParse(res.stdout));
      if (!parsed.success) return null;
      prs.push(...parsed.data.value.filter((pr) => pr.repository.name.toLowerCase() === repositoryName));
      if (parsed.data.value.length < PR_PAGE_SIZE) return prs;
    }
  }

  private async reviewStatuses(cwd: string, ref: AzureRepoRef, prs: AzurePrListEntry[]): Promise<PrReviewStatus[]> {
    const statuses: PrReviewStatus[] = [];
    for (let offset = 0; offset < prs.length; offset += POLICY_LOOKUP_BATCH_SIZE) {
      const batch = prs.slice(offset, offset + POLICY_LOOKUP_BATCH_SIZE);
      statuses.push(...await Promise.all(batch.map((pr) => this.reviewStatus(cwd, ref, pr))));
    }
    return statuses;
  }

  private async reviewStatus(cwd: string, ref: AzureRepoRef, pr: AzurePrListEntry): Promise<PrReviewStatus> {
    const status = reviewStatusFromReviewers(pr.reviewers);
    if (status !== "approved") return status;
    const projectId = pr.repository.project?.id;
    if (projectId === undefined) return "needs_review";
    const artifactId = `vstfs:///CodeReview/CodeReviewId/${projectId}/${pr.pullRequestId}`;
    for (let offset = 0; ; offset += POLICY_PAGE_SIZE) {
      const res = await runBoundedCommand(this.resourceArgs(ref.orgUrl, AZ_AREA_POLICY, AZ_RESOURCE_POLICY_EVALUATIONS, [
        `project=${projectId}`,
      ], {
        method: HTTP_GET,
        apiVersion: AZ_PREVIEW_API_VERSION,
        queryParameters: [`artifactId=${artifactId}`, `$top=${POLICY_PAGE_SIZE}`, `$skip=${offset}`],
      }), cwd);
      if (res.exitCode !== 0 || res.timedOut) return "needs_review";
      const parsed = azurePolicyListSchema.safeParse(safeJsonParse(res.stdout));
      if (!parsed.success) return "needs_review";
      const pending = parsed.data.value.some(({ configuration, status: policyStatus }) => (
        configuration.isEnabled && configuration.isBlocking && !configuration.isDeleted
        && configuration.type.id.toLowerCase() === MINIMUM_APPROVAL_POLICY_TYPE
        && policyStatus !== POLICY_APPROVED_STATUS && policyStatus !== POLICY_NOT_APPLICABLE_STATUS
      ));
      if (pending) return "needs_review";
      if (parsed.data.value.length < POLICY_PAGE_SIZE) return "approved";
    }
  }

  private resourceArgs(
    orgUrl: string,
    area: string,
    resource: string,
    routeParameters: string[],
    opts: { method: string; inFile?: string; apiVersion?: string; queryParameters?: string[] },
  ): string[] {
    return [
      AZ_BINARY, "devops", "invoke",
      "--area", area,
      "--resource", resource,
      "--route-parameters", ...routeParameters,
      ...(opts.queryParameters === undefined ? [] : ["--query-parameters", ...opts.queryParameters]),
      "--org", orgUrl,
      "--api-version", opts.apiVersion ?? AZ_API_VERSION,
      "--http-method", opts.method,
      ...(opts.inFile === undefined ? [] : ["--in-file", opts.inFile]),
      "--detect", "false",
      "-o", "json",
    ];
  }

  /** Repo-scoped `az` invocation: the shared org/project/repository flags plus the JSON output mode. */
  private repoArgs(ref: AzureRepoRef, command: string[]): string[] {
    return [
      AZ_BINARY, ...command,
      "--org", ref.orgUrl,
      "--project", ref.project,
      "--repository", ref.repository,
      "--detect", "false",
      "-o", "json",
    ];
  }

  /** `az repos pr update` takes the PR id and the org only (no project/repository flag). */
  private prUpdateArgs(target: { ref: AzureRepoRef; prNumber: number }, extra: string[]): string[] {
    return [
      AZ_BINARY, "repos", "pr", "update",
      "--id", String(target.prNumber),
      "--org", target.ref.orgUrl,
      ...extra,
      "--detect", "false",
      "-o", "json",
    ];
  }

  /**
   * `az devops invoke` argv for one `git`-area resource of the PR. The route parameters MUST be
   * separate argv tokens (`project=X`, `repositoryId=Y`): joined into a single string the CLI reports
   * a misleading "requires user authentication" error instead of a parse failure.
   */
  private invokeArgs(
    context: AzurePrContext,
    resource: string,
    routeParameters: string[],
    opts: { method: string; inFile?: string },
  ): string[] {
    return this.resourceArgs(context.orgUrl, AZ_AREA_GIT, resource, [
      `project=${context.project}`,
      `repositoryId=${context.repositoryId}`,
      `pullRequestId=${String(context.prNumber)}`,
      ...routeParameters,
    ], opts);
  }

  /** The org/project/repositoryId triple plus the PR head, from one `az repos pr show`. */
  private async prContext(cwd: string, prUrl: string): Promise<AzurePrContext | null> {
    const target = repoRefFromPrUrl(prUrl);
    if (target === null) return null;
    const pr = await this.showPr(cwd, prUrl);
    if (!pr.ok) return null;
    const repository = pr.data.repository;
    if (repository === null) return null;
    return {
      orgUrl: target.ref.orgUrl,
      project: repository.project?.name ?? target.ref.project,
      repositoryId: repository.id,
      prNumber: target.prNumber,
      headCommitSha: pr.data.lastMergeSourceCommit?.commitId ?? null,
    };
  }

  /** Every comment thread of the PR; null when the read failed or the payload was unparseable. */
  private async readThreads(cwd: string, context: AzurePrContext): Promise<AzureThread[] | null> {
    const res = await runBoundedCommand(
      this.invokeArgs(context, AZ_RESOURCE_PR_THREADS, [], { method: HTTP_GET }),
      cwd,
    );
    if (res.exitCode !== 0 || res.timedOut) return null;
    const parsed = azureThreadListSchema.safeParse(safeJsonParse(res.stdout));
    return parsed.success ? parsed.data.value : null;
  }

  /**
   * `changeTrackingId` per changed file in the PR's latest iteration — the anchor an inline thread
   * needs. null when the iterations or their changes are unreadable: every finding is then folded
   * into the summary body rather than failing the publication.
   */
  private async readChangeAnchors(
    cwd: string,
    context: AzurePrContext,
  ): Promise<{ iterationId: number; byPath: Map<string, number> } | null> {
    const iterations = await runBoundedCommand(
      this.invokeArgs(context, AZ_RESOURCE_PR_ITERATIONS, [], { method: HTTP_GET }),
      cwd,
    );
    if (iterations.exitCode !== 0 || iterations.timedOut) return null;
    const parsedIterations = azureIterationListSchema.safeParse(safeJsonParse(iterations.stdout));
    if (!parsedIterations.success) return null;
    const latest = parsedIterations.data.value.at(-1);
    if (latest === undefined) return null;
    const changes = await runBoundedCommand(
      this.invokeArgs(context, AZ_RESOURCE_PR_ITERATION_CHANGES, [`iterationId=${String(latest.id)}`], { method: HTTP_GET }),
      cwd,
    );
    if (changes.exitCode !== 0 || changes.timedOut) return null;
    const parsedChanges = azureIterationChangesSchema.safeParse(safeJsonParse(changes.stdout));
    if (!parsedChanges.success) return null;
    const byPath = new Map<string, number>();
    for (const entry of parsedChanges.data.changeEntries) {
      const path = entry.item?.path ?? null;
      if (path === null || entry.changeTrackingId === null) continue;
      byPath.set(path, entry.changeTrackingId);
    }
    return { iterationId: latest.id, byPath };
  }

  // NOTE(ali): The create response supplies the publisher identity used to verify the review vote.
  private async createThread(
    cwd: string,
    context: AzurePrContext,
    payload: Record<string, unknown>,
  ): Promise<AzureThread | null> {
    return withJsonRequestFile(payload, async (inFile) => {
      const res = await runBoundedCommand(
        this.invokeArgs(context, AZ_RESOURCE_PR_THREADS, [], { method: HTTP_POST, inFile }),
        cwd,
      );
      if (res.exitCode !== 0 || res.timedOut) return null;
      const parsed = azureThreadSchema.safeParse(safeJsonParse(res.stdout));
      return parsed.success ? parsed.data : null;
    });
  }

  private async finishReviewPublication(
    cwd: string,
    context: AzurePrContext,
    event: ReviewPublicationEvent,
    marker: string,
    thread: AzureThread,
  ): Promise<PublishReviewResult> {
    const publisherId = completionComment(thread, marker)?.author?.id ?? null;
    const voted = await this.castVote(cwd, context, event, publisherId);
    if (!voted.ok) return { ok: false, reason: voted.reason, reviewId: null };
    return { ok: true, reason: "", reviewId: thread.id, actualState: REVIEW_PUBLICATION_STATE_BY_EVENT[event] };
  }

  private async verifyVote(
    cwd: string,
    context: AzurePrContext,
    state: ReviewPublicationState,
    publisherId: string | null,
  ): Promise<DoneGateResult> {
    if (state === "COMMENTED") return { ok: true, reason: "" };
    if (publisherId === null) return { ok: false, reason: `auteur de la review ${AZURE_LABEL} introuvable pour la vérification du vote` };
    const reviewer = await runBoundedCommand(this.invokeArgs(
      context, AZ_RESOURCE_PR_REVIEWERS, [`reviewerId=${publisherId}`], { method: HTTP_GET },
    ), cwd);
    if (reviewer.exitCode !== 0 || reviewer.timedOut) {
      return { ok: false, reason: `lecture du vote ${AZURE_LABEL} échouée : ${boundedCommandDetail(reviewer)}` };
    }
    const parsedReviewer = azureReviewerVoteSchema.safeParse(safeJsonParse(reviewer.stdout));
    if (!parsedReviewer.success || parsedReviewer.data.id.toLowerCase() !== publisherId.toLowerCase()) {
      return { ok: false, reason: `vote ${AZURE_LABEL} de l'auteur de la review introuvable` };
    }
    const expectedVote = state === "APPROVED" ? VOTE_APPROVED : VOTE_WAIT_FOR_AUTHOR;
    if (parsedReviewer.data.vote !== expectedVote) {
      return { ok: false, reason: `vote ${AZURE_LABEL} attendu ${expectedVote}, reçu ${parsedReviewer.data.vote}` };
    }
    return { ok: true, reason: "" };
  }

  private async castVote(
    cwd: string,
    context: AzurePrContext,
    event: ReviewPublicationEvent,
    publisherId: string | null,
  ): Promise<DoneGateResult> {
    const vote = VOTE_BY_EVENT[event];
    if (vote === null) return { ok: true, reason: "" };
    if (publisherId === null) return { ok: false, reason: `auteur de la review ${AZURE_LABEL} introuvable pour la publication du vote` };
    const res = await runBoundedCommand(
      [
        AZ_BINARY, "repos", "pr", "set-vote",
        "--id", String(context.prNumber),
        "--vote", vote,
        "--org", context.orgUrl,
        "--detect", "false",
        "-o", "json",
      ],
      cwd,
    );
    if (res.exitCode !== 0 || res.timedOut) {
      return { ok: false, reason: `vote ${AZURE_LABEL} « ${vote} » refusé : ${boundedCommandDetail(res)}` };
    }
    const parsed = azureReviewerVoteSchema.safeParse(safeJsonParse(res.stdout));
    if (!parsed.success) return { ok: false, reason: `réponse ${AZURE_LABEL} inattendue après la publication du vote` };
    if (parsed.data.id.toLowerCase() !== publisherId.toLowerCase()) {
      return { ok: false, reason: `le vote ${AZURE_LABEL} provient d'une identité différente de l'auteur de la review` };
    }
    const state = REVIEW_PUBLICATION_STATE_BY_EVENT[event];
    const expectedVote = state === "APPROVED" ? VOTE_APPROVED : VOTE_WAIT_FOR_AUTHOR;
    if (parsed.data.vote !== expectedVote) {
      return { ok: false, reason: `vote ${AZURE_LABEL} attendu ${expectedVote}, reçu ${parsed.data.vote}` };
    }
    return this.verifyVote(cwd, context, state, publisherId);
  }

  /** `az repos pr show --id N --org URL` — the single read backing every PR-scoped gate. */
  private async showPr(
    cwd: string,
    prUrl: string,
  ): Promise<{ ok: true; data: z.infer<typeof azurePrShowSchema> } | { ok: false }> {
    const target = repoRefFromPrUrl(prUrl);
    if (target === null) return { ok: false };
    const res = await runBoundedCommand(
      [
        AZ_BINARY, "repos", "pr", "show",
        "--id", String(target.prNumber),
        "--org", target.ref.orgUrl,
        "--detect", "false",
        "-o", "json",
      ],
      cwd,
    );
    if (res.exitCode !== 0 || res.timedOut) return { ok: false };
    const parsed = azurePrShowSchema.safeParse(safeJsonParse(res.stdout));
    if (!parsed.success || parsed.data.pullRequestId !== target.prNumber) return { ok: false };
    return { ok: true, data: parsed.data };
  }

  private async currentBranch(cwd: string): Promise<string | null> {
    const res = await runBoundedCommand(["git", "rev-parse", "--abbrev-ref", "HEAD"], cwd);
    if (res.exitCode !== 0) return null;
    const branch = res.stdout.trim();
    return branch.length > 0 ? branch : null;
  }

  /** Commit subjects of `origin/<base>..HEAD`, oldest first (the PR description source). */
  private async commitSubjects(cwd: string, baseBranch: string): Promise<string[]> {
    const res = await runBoundedCommand(
      ["git", "log", "--reverse", "--pretty=%s", `origin/${baseBranch}..HEAD`],
      cwd,
    );
    if (res.exitCode !== 0) return [];
    return res.stdout.split("\n").map((line) => line.trim()).filter((line) => line.length > 0);
  }
}
