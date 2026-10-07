/**
 * GitHub client of the VCS seam: every `gh` invocation of the pipeline lives here (PR listing,
 * creation, done gates, review publication, merge). Extracted verbatim from the real adapter, so the
 * commands and the reasons handed back to the agent are unchanged.
 */

import { $ } from "bun";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { z } from "zod";

import { VCS_PROVIDER_LABELS } from "../../../shared/constants.ts";
import type { PrMergeability, PrReviewStatus, PrState } from "../../../shared/constants.ts";
import { parsePrUrl } from "../../../shared/prUrl.ts";
import { isPrNeedsAttention } from "../../../shared/pr.ts";
import type { OpenPr, VcsConnectionResult } from "../../../shared/schemas.ts";

import { boundedCommandDetail, runBoundedCommand, safeJsonParse, withJsonRequestFile } from "../boundedCommand.ts";
import { hostnameFromSshConfig, sshHostFromRemoteUrl } from "../repoInspection.ts";
import { renderOutsideDiffSection } from "../reviewMarkdown.ts";
import { REVIEW_PUBLICATION_STATE_BY_EVENT } from "../types.ts";
import type {
  DoneGateResult,
  CreatePrOptions,
  MergePrExpectation,
  PublishReviewOptions,
  PublishReviewResult,
  ReviewHeadResult,
  ReviewPublicationEvent,
  ReviewPublicationState,
  RecoveryCandidateOptions,
} from "../types.ts";
import { CONNECTION_TEST_PR_LIMIT, connectionFailure, connectionResult } from "./connection.ts";
import { confirmPrMerged, unmergedReason } from "./prMerge.ts";
import type { CreatePrResult, ReviewPublicationCheck, ReviewRequestSnapshot, VcsClient } from "./types.ts";

const GH_BINARY = "gh";
const OPEN_PR_FIELDS = `
  number title url headRefName baseRefName isDraft reviewDecision updatedAt
  author { login } additions deletions
  commentedReviews: reviews(first:1,states:[COMMENTED]) { totalCount }
`;
const OPEN_PR_PAGE_SIZE = 100;
const OPEN_PR_BATCH_SIZE = 10;
const GIT_REMOTE_SCP_RE = /^(?:[^@/]+@)?([^@/:]+):(?!\/\/)(.+)$/;
const GITHUB_API_HOST_BY_SSH_HOST: Record<string, string> = {
  "ssh.github.com": "github.com",
};
/** Merge strategy for the opt-in auto-merge (rebase replays commits onto the base branch). */
const PR_MERGE_STRATEGY = "--rebase";
const AUTONOMOUS_MERGE_METHOD = "rebase";
/** GitHub PR state that proves the merge completed (vs. OPEN/CLOSED). */
const PR_STATE_MERGED = "MERGED";
const PR_STATE_CLOSED = "CLOSED";
const PR_STATE_OPEN = "OPEN";

const ghAuthenticatedUserSchema = z.object({ id: z.number().int(), login: z.string().min(1) });
const ghRequestedPullSchema = z.object({
  number: z.number().int(), title: z.string(), html_url: z.string(), draft: z.boolean(),
  updated_at: z.string(), user: z.object({ login: z.string() }).nullable(),
  head: z.object({ ref: z.string() }), base: z.object({ ref: z.string() }),
  requested_reviewers: z.array(z.object({ id: z.number().int() })),
});
const ghRequestedPullPagesSchema = z.array(z.array(ghRequestedPullSchema));

const ghPrHeadSchema = z.object({ url: z.string(), headRefOid: z.string().min(1) });
const ghCandidateSchema = z.object({
  number: z.number().int(), html_url: z.string(), state: z.string(),
  merged: z.boolean().default(false),
  head: z.object({ ref: z.string(), sha: z.string(), repo: z.object({ full_name: z.string() }).nullable() }),
  base: z.object({ ref: z.string(), repo: z.object({ full_name: z.string() }) }),
});
const ghNativeCheckSchema = z.union([
  z.object({ __typename: z.literal("CheckRun"), status: z.string(), conclusion: z.string().nullable() }),
  z.object({ __typename: z.literal("StatusContext"), state: z.string() }),
]);
const ghAutonomousMergeSchema = z.object({
  headRefOid: z.string().min(1),
  baseRefName: z.string().min(1),
  state: z.string(),
  mergeStateStatus: z.string(),
  reviewDecision: z.enum(["APPROVED", "REVIEW_REQUIRED", "CHANGES_REQUESTED"]).nullable(),
  statusCheckRollup: z.array(ghNativeCheckSchema).nullable(),
});
const GH_NATIVE_CHECK_SUCCESS = "SUCCESS";
const GH_NATIVE_CHECK_COMPLETED = "COMPLETED";
const GH_NATIVE_CHECK_PENDING = "PENDING";
const GH_MERGE_STATE_CLEAN = "CLEAN";
const GH_PENDING_MERGE_STATES = new Set(["BLOCKED", "UNKNOWN"]);
const GH_AUTONOMOUS_PR_FIELDS = "headRefOid,baseRefName,state,mergeStateStatus,reviewDecision,statusCheckRollup";
const ghEmptyCheckRunsSchema = z.object({ total_count: z.literal(0), check_runs: z.array(z.unknown()).max(0) });
const ghEmptyCommitStatusesSchema = z.object({ sha: z.string().min(1), total_count: z.literal(0), statuses: z.array(z.unknown()).max(0) });
const ghSynchronousMergeSchema = z.object({ merged: z.boolean(), sha: z.string().nullable(), message: z.string() });
const GH_REST_OPEN_STATE = "open";
const ghRestPullSchema = z.object({
  base: z.object({ sha: z.string().min(1) }),
  head: z.object({ sha: z.string().min(1) }),
  user: z.object({ login: z.string() }).nullable(),
});
const ghRestReviewSchema = z.object({
  id: z.number().int(),
  body: z.string(),
  state: z.string(),
  commit_id: z.string(),
  submitted_at: z.string().nullable(),
  user: z.object({ login: z.string() }).nullable(),
});
const ghRestReviewsSchema = z.array(ghRestReviewSchema);
const ghRestReviewPagesSchema = z.array(ghRestReviewsSchema);

const ghPrSchema = z.object({
  number: z.number(),
  title: z.string(),
  url: z.string(),
  headRefName: z.string(),
  baseRefName: z.string(),
  isDraft: z.boolean(),
  reviewDecision: z.string().nullable(),
  commentedReviews: z.object({ totalCount: z.number().int().nonnegative() }),
  updatedAt: z.string(),
  author: z.object({ login: z.string() }).nullable(),
  additions: z.number(),
  deletions: z.number(),
});
const openPrRepositorySchema = z.object({
  pullRequests: z.object({
    nodes: z.array(ghPrSchema),
    pageInfo: z.object({ hasNextPage: z.boolean(), endCursor: z.string().nullable() }),
  }),
});
const openPrResponseSchema = z.object({
  data: z.record(z.string(), z.unknown()),
  errors: z.array(z.unknown()).optional(),
});

interface GithubRepoRef {
  host: string;
  owner: string;
  repository: string;
}

interface OpenPrPageRequest {
  ref: GithubRepoRef;
  cursor: string | null;
  seenCursors: Set<string>;
}

function parseGithubRemote(remote: string): GithubRepoRef | null {
  const trimmed = remote.trim();
  const scp = GIT_REMOTE_SCP_RE.exec(trimmed);
  let host: string;
  let path: string;
  if (scp && scp[1] && scp[2]) {
    host = scp[1].toLowerCase();
    path = scp[2];
  } else {
    try {
      const url = new URL(trimmed);
      host = url.hostname.toLowerCase();
      path = url.pathname;
    } catch {
      return null;
    }
  }
  const segments = path.replace(/^\/+/, "").replace(/\.git$/, "").split("/");
  if (segments.length !== 2 || !segments[0] || !segments[1] || host === "") return null;
  return { host, owner: segments[0], repository: segments[1] };
}

function githubRepoKey(ref: GithubRepoRef): string {
  return `${ref.host}/${ref.owner}/${ref.repository}`;
}

/** `gh pr view --json state` shape, used to confirm an auto-merge actually landed. */
const ghPrStateSchema = z.object({ state: z.string() });
const ghPrMergeableSchema = z.object({ mergeable: z.string() });

const PR_MERGEABILITY_BY_GITHUB_MERGEABLE: Record<string, PrMergeability> = {
  MERGEABLE: "mergeable",
  CONFLICTING: "conflicting",
};

const PR_REVIEW_STATUS_BY_DECISION: Record<string, PrReviewStatus> = {
  REVIEW_REQUIRED: "needs_review",
  APPROVED: "approved",
  CHANGES_REQUESTED: "changes_requested",
};

function mapGithubPr(pr: z.infer<typeof ghPrSchema>): OpenPr {
  let reviewStatus = PR_REVIEW_STATUS_BY_DECISION[pr.reviewDecision ?? ""] ?? "none";
  if (reviewStatus !== "approved" && reviewStatus !== "changes_requested" && pr.commentedReviews.totalCount > 0) {
    reviewStatus = "reviewed";
  }
  return {
    number: pr.number,
    title: pr.title,
    url: pr.url,
    headBranch: pr.headRefName,
    baseBranch: pr.baseRefName,
    isDraft: pr.isDraft,
    reviewStatus,
    updatedAt: pr.updatedAt,
    author: pr.author?.login ?? "?",
    additions: pr.additions,
    deletions: pr.deletions,
  };
}

async function readGithubRepoRef(repoPath: string): Promise<GithubRepoRef> {
  const remote = await runBoundedCommand(["git", "-C", repoPath, "remote", "get-url", "origin"], repoPath);
  if (remote.exitCode !== 0 || remote.timedOut) {
    throw new Error(`lecture du remote GitHub impossible : ${boundedCommandDetail(remote)}`);
  }
  const ref = parseGithubRemote(remote.stdout);
  if (ref === null) throw new Error("remote GitHub inattendu");
  const sshHost = sshHostFromRemoteUrl(remote.stdout.trim());
  if (sshHost === null) return ref;
  const sshConfig = await runBoundedCommand(["ssh", "-G", sshHost], repoPath);
  if (sshConfig.exitCode !== 0 || sshConfig.timedOut) {
    throw new Error(`résolution de l'hôte SSH GitHub impossible : ${boundedCommandDetail(sshConfig)}`);
  }
  const host = hostnameFromSshConfig(sshConfig.stdout);
  if (host === null) throw new Error("configuration de l'hôte SSH GitHub inattendue");
  const sshHostname = host.toLowerCase();
  return { ...ref, host: GITHUB_API_HOST_BY_SSH_HOST[sshHostname] ?? sshHostname };
}

async function fetchGithubOpenPrs(refs: GithubRepoRef[], cwd: string): Promise<Map<string, OpenPr[] | Error>> {
  const results = new Map<string, OpenPr[] | Error>();
  const repoPrs = new Map<string, OpenPr[]>();
  let pending: OpenPrPageRequest[] = refs.map((ref) => ({ ref, cursor: null, seenCursors: new Set() }));
  while (pending.length > 0) {
    const next: OpenPrPageRequest[] = [];
    const byHost = Map.groupBy(pending, (request) => request.ref.host);
    for (const [host, requests] of byHost) {
      for (let start = 0; start < requests.length; start += OPEN_PR_BATCH_SIZE) {
        const batch = requests.slice(start, start + OPEN_PR_BATCH_SIZE);
        const fields = batch.map(({ ref, cursor }, index) => {
          const after = cursor === null ? "" : `,after:${JSON.stringify(cursor)}`;
          return `r${index}: repository(owner:${JSON.stringify(ref.owner)},name:${JSON.stringify(ref.repository)}) { pullRequests(states:OPEN,first:${OPEN_PR_PAGE_SIZE},orderBy:{field:CREATED_AT,direction:DESC}${after}) { nodes { ${OPEN_PR_FIELDS} } pageInfo { hasNextPage endCursor } } }`;
        });
        const query = `query { ${fields.join(" ")} }`;
        try {
          const result = await withJsonRequestFile({ query }, (inputPath) => runBoundedCommand(
            [GH_BINARY, "api", "graphql", "--hostname", host, "--input", inputPath],
            cwd,
          ));
          if (result.exitCode !== 0 || result.timedOut) {
            throw new Error(`gh api graphql a échoué : ${boundedCommandDetail(result)}`);
          }
          const parsed = openPrResponseSchema.safeParse(safeJsonParse(result.stdout));
          if (!parsed.success || (parsed.data.errors?.length ?? 0) > 0) {
            throw new Error("gh api graphql : réponse inattendue ou incomplète");
          }
          for (const [index, request] of batch.entries()) {
            const key = githubRepoKey(request.ref);
            const repository = openPrRepositorySchema.safeParse(parsed.data.data[`r${index}`]);
            if (!repository.success) {
              results.set(key, new Error("gh api graphql : page de PR inattendue ou incomplète"));
              repoPrs.delete(key);
              continue;
            }
            const page = repository.data.pullRequests;
            const prs = [...(repoPrs.get(key) ?? []), ...page.nodes.map(mapGithubPr)];
            if (!page.pageInfo.hasNextPage) {
              results.set(key, prs);
              repoPrs.delete(key);
              continue;
            }
            const cursor = page.pageInfo.endCursor;
            if (!cursor || request.seenCursors.has(cursor)) {
              results.set(key, new Error("gh api graphql : curseur de pagination inattendu"));
              repoPrs.delete(key);
              continue;
            }
            repoPrs.set(key, prs);
            request.seenCursors.add(cursor);
            next.push({ ...request, cursor });
          }
        } catch (error) {
          const failure = error instanceof Error ? error : new Error("lecture des PR GitHub échouée");
          for (const { ref } of batch) {
            const key = githubRepoKey(ref);
            results.set(key, failure);
            repoPrs.delete(key);
          }
        }
      }
    }
    pending = next;
  }
  return results;
}

const PR_STATE_BY_GITHUB_STATE: Record<string, PrState> = {
  [PR_STATE_OPEN]: "open",
  [PR_STATE_MERGED]: "merged",
  [PR_STATE_CLOSED]: "closed",
};

/** Why the PR head could not be read; each caller words it for its own gate. */
type PrHeadFailure = "unreadable" | "unexpected";

type PrHeadRead = { ok: true; commitSha: string } | { ok: false; failure: PrHeadFailure };

function rightSideDiffLines(diff: string): Set<number> {
  const lines = new Set<number>();
  let currentLine: number | null = null;
  for (const content of diff.split("\n")) {
    const hunk = /^@@ -\d+(?:,\d+)? \+(\d+)(?:,\d+)? @@/.exec(content);
    if (hunk) {
      const start = hunk[1];
      currentLine = start === undefined ? null : Number(start);
      continue;
    }
    if (currentLine === null || content.startsWith("-")) continue;
    if (content.startsWith("+") || content.startsWith(" ")) {
      lines.add(currentLine);
      currentLine += 1;
      continue;
    }
    currentLine = null;
  }
  return lines;
}

/** Remote ref carrying a PR's head commit on origin. */
export function githubPrHeadRef(prNumber: number): string {
  return `refs/pull/${prNumber}/head`;
}

/** Extract the PR URL from `gh pr create` stdout: prefer the github.com line, else the last non-empty line. */
function extractPrUrl(stdout: string): string {
  const lines = stdout
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
  const ghLine = lines.findLast((line) => line.includes("github.com"));
  return ghLine ?? lines.at(-1) ?? "";
}

function reviewApiEndpoint(prUrl: string): string | null {
  const ref = parsePrUrl(prUrl);
  if (ref === null || ref.provider !== "github") return null;
  const owner = ref.ownerSegments.at(-2);
  const repo = ref.ownerSegments.at(-1);
  if (owner === undefined || repo === undefined) return null;
  return `repos/${owner}/${repo}/pulls/${ref.number}/reviews`;
}

/** The pull endpoint backing a reviews endpoint (same path minus the trailing `/reviews`). */
function pullApiEndpoint(reviewsEndpoint: string): string {
  return reviewsEndpoint.replace(/\/reviews$/, "");
}

export class GithubVcsClient implements VcsClient {
  async testConnection(repoPath: string, checkedAt: number): Promise<VcsConnectionResult> {
    if (!Bun.which(GH_BINARY)) return connectionFailure("CLI `gh` introuvable dans le PATH", checkedAt);
    const res = await runBoundedCommand(
      [GH_BINARY, "pr", "list", "--limit", CONNECTION_TEST_PR_LIMIT, "--json", "number"],
      repoPath,
    );
    return connectionResult(res, "gh pr list", "Connexion GitHub OK", checkedAt);
  }

  async listReviewRequests(repoPath: string): Promise<ReviewRequestSnapshot> {
    const ref = await readGithubRepoRef(repoPath);
    const userResult = await runBoundedCommand([GH_BINARY, "api", "user", "--hostname", ref.host], repoPath);
    if (userResult.exitCode !== 0 || userResult.timedOut) throw new Error("GitHub authenticated identity could not be read");
    const user = ghAuthenticatedUserSchema.safeParse(safeJsonParse(userResult.stdout));
    if (!user.success) throw new Error("GitHub authenticated identity response is invalid");
    const endpoint = `repos/${encodeURIComponent(ref.owner)}/${encodeURIComponent(ref.repository)}/pulls?state=open&per_page=${OPEN_PR_PAGE_SIZE}`;
    const result = await runBoundedCommand([GH_BINARY, "api", endpoint, "--hostname", ref.host, "--paginate", "--slurp"], repoPath);
    if (result.exitCode !== 0 || result.timedOut) throw new Error("GitHub review requests could not be read");
    const pages = ghRequestedPullPagesSchema.safeParse(safeJsonParse(result.stdout));
    if (!pages.success) throw new Error("GitHub review requests response is invalid");
    const prs = pages.data.flat().filter((pr) => !pr.draft && pr.requested_reviewers.some((reviewer) => reviewer.id === user.data.id));
    return {
      identityKey: `github:${githubRepoKey(ref).toLowerCase()}:${user.data.id}`,
      prs: prs.map((pr) => ({
        number: pr.number, title: pr.title, url: pr.html_url, headBranch: pr.head.ref, baseBranch: pr.base.ref,
        isDraft: pr.draft, reviewStatus: "needs_review", updatedAt: pr.updated_at, author: pr.user?.login ?? "?",
        additions: null, deletions: null,
      })),
    };
  }

  async listOpenPrs(repoPath: string): Promise<OpenPr[]> {
    const ref = await readGithubRepoRef(repoPath);
    const results = await fetchGithubOpenPrs([ref], repoPath);
    const prs = results.get(githubRepoKey(ref));
    if (prs instanceof Error) throw prs;
    if (prs === undefined) throw new Error("lecture des PR GitHub incomplète");
    return prs;
  }

  async listReviewCounts(repoPaths: string[]): Promise<Record<string, number | null>> {
    const counts: Record<string, number | null> = {};
    const pathsByRepo = new Map<string, string[]>();
    const refs = new Map<string, GithubRepoRef>();
    await Promise.all(repoPaths.map(async (repoPath) => {
      counts[repoPath] = null;
      let ref;
      try {
        ref = await readGithubRepoRef(repoPath);
      } catch {
        return;
      }
      const key = githubRepoKey(ref);
      refs.set(key, ref);
      pathsByRepo.set(key, [...(pathsByRepo.get(key) ?? []), repoPath]);
    }));
    const results = await fetchGithubOpenPrs([...refs.values()], repoPaths[0] ?? ".");
    for (const [key, prs] of results) {
      if (prs instanceof Error) continue;
      const count = prs.filter(isPrNeedsAttention).length;
      for (const repoPath of pathsByRepo.get(key) ?? []) counts[repoPath] = count;
    }
    return counts;
  }

  async verifyPrExists(_cwd: string, prUrl: string): Promise<DoneGateResult> {
    const pr = await $`gh pr view ${prUrl} --json url`.nothrow().quiet();
    if (pr.exitCode !== 0) return { ok: false, reason: `la PR n'existe pas (${prUrl})` };
    return { ok: true, reason: "" };
  }

  async verifyRecoveryCandidate(opts: RecoveryCandidateOptions): Promise<DoneGateResult> {
    try {
      const expected = await readGithubRepoRef(opts.repoPath);
      const slot = await readGithubRepoRef(opts.slotPath);
      const target = parsePrUrl(opts.prUrl);
      const url = new URL(opts.prUrl);
      const repository = `${expected.owner}/${expected.repository}`;
      if (target?.provider !== "github" || url.protocol !== "https:"
        || url.hostname.toLowerCase() !== expected.host
        || target.ownerSegments.join("/").toLowerCase() !== repository.toLowerCase()
        || githubRepoKey(slot).toLowerCase() !== githubRepoKey(expected).toLowerCase()) {
        return { ok: false, reason: "La PR ne correspond pas au dépôt configuré." };
      }
      const response = await runBoundedCommand([
        GH_BINARY, "api", "--hostname", expected.host,
        `repos/${expected.owner}/${expected.repository}/pulls/${target.number}`,
      ], opts.slotPath);
      const parsed = ghCandidateSchema.safeParse(safeJsonParse(response.stdout));
      if (response.exitCode !== 0 || response.timedOut || !parsed.success) {
        return { ok: false, reason: "Lecture de l'identité GitHub de la PR impossible." };
      }
      const pr = parsed.data;
      if (pr.number !== target.number || pr.html_url !== opts.prUrl
        || pr.base.repo.full_name.toLowerCase() !== repository.toLowerCase()
        || pr.head.repo?.full_name.toLowerCase() !== repository.toLowerCase()) {
        return { ok: false, reason: "L'identité du dépôt de la PR est incompatible." };
      }
      if (pr.state !== GH_REST_OPEN_STATE && !(opts.allowMerged && pr.merged)) return { ok: false, reason: "La PR doit être ouverte pour la récupération." };
      if (pr.head.ref !== opts.branch || pr.base.ref !== opts.baseBranch) {
        return { ok: false, reason: "Les branches de la PR ne correspondent pas au candidat." };
      }
      if (pr.head.sha !== opts.commitSha) return { ok: false, reason: "Le commit de la PR ne correspond pas au candidat évalué." };
      return { ok: true, reason: "" };
    } catch {
      return { ok: false, reason: "Vérification de l'identité GitHub du candidat impossible." };
    }
  }

  async readPrHead(cwd: string, prUrl: string): Promise<ReviewHeadResult> {
    const read = await this.readPrHeadCommit(cwd, prUrl);
    if (read.ok) return { ok: true, reason: "", commitSha: read.commitSha };
    const reason = read.failure === "unreadable"
      ? "lecture du head GitHub de la PR échouée"
      : "réponse GitHub inattendue pour le head de la PR";
    return { ok: false, reason, commitSha: null };
  }

  async confirmPrHead(cwd: string, prUrl: string): Promise<ReviewHeadResult> {
    const read = await this.readPrHeadCommit(cwd, prUrl);
    if (read.ok) return { ok: true, reason: "", commitSha: read.commitSha };
    const reason = read.failure === "unreadable"
      ? `la PR n'existe pas (${prUrl})`
      : "impossible de confirmer la PR et son head courant";
    return { ok: false, reason, commitSha: null };
  }

  private async readPrHeadCommit(cwd: string, prUrl: string): Promise<PrHeadRead> {
    const pr = await runBoundedCommand(["gh", "pr", "view", prUrl, "--json", "url,headRefOid"], cwd);
    if (pr.exitCode !== 0) return { ok: false, failure: "unreadable" };
    const parsed = ghPrHeadSchema.safeParse(safeJsonParse(pr.stdout));
    if (!parsed.success || parsed.data.url !== prUrl) return { ok: false, failure: "unexpected" };
    return { ok: true, commitSha: parsed.data.headRefOid };
  }

  async prHeadFetchRef(_cwd: string, _prUrl: string, prNumber: number): Promise<string> {
    return githubPrHeadRef(prNumber);
  }

  async createPr(cwd: string, baseBranch: string, opts: CreatePrOptions): Promise<CreatePrResult> {
    if (opts.title && opts.body && opts.headBranch) {
      const directory = await mkdtemp(join(tmpdir(), "kanban-pr-"));
      try {
        const bodyPath = join(directory, "body.md");
        await writeFile(bodyPath, opts.body, { mode: 0o600 });
        const args = [GH_BINARY, "pr", "create", "--base", baseBranch, "--head", opts.headBranch, "--title", opts.title, "--body-file", bodyPath, "--no-maintainer-edit"];
        if (opts.draft) args.push("--draft");
        if (opts.deadlineAt !== undefined && Date.now() >= opts.deadlineAt) throw new Error("Autonomous delivery deadline expired before pull request creation.");
        opts.assertCurrent?.();
        const result = await runBoundedCommand(args, cwd);
        const url = extractPrUrl(result.stdout);
        if (result.exitCode !== 0 || result.timedOut || !url.startsWith("http")) return { ok: false, url: "", reason: boundedCommandDetail(result) || "Pull request creation could not be confirmed." };
        return { ok: true, url, reason: "" };
      } finally {
        await rm(directory, { recursive: true, force: true });
      }
    }
    const res = opts.draft
      ? await $`gh pr create --draft --base ${baseBranch} --fill`.cwd(cwd).nothrow().quiet()
      : await $`gh pr create --base ${baseBranch} --fill`.cwd(cwd).nothrow().quiet();
    if (res.exitCode !== 0) {
      const detail = res.stderr.toString().trim() || res.stdout.toString().trim();
      return { ok: false, url: "", reason: detail || `gh pr create a échoué (code ${res.exitCode})` };
    }
    const url = extractPrUrl(res.stdout.toString());
    // gh can exit 0 without a parseable URL in stdout; treat that as failure rather than persisting an
    // empty prUrl and landing the card in "done" with a PR that has no link.
    if (!url.startsWith("http")) {
      return { ok: false, url: "", reason: "URL de PR introuvable dans la sortie de gh pr create" };
    }
    return { ok: true, url, reason: "" };
  }

  async fetchPrSummary(cwd: string, prUrl: string): Promise<string | null> {
    const res = await $`gh pr view ${prUrl} --json body`.cwd(cwd).nothrow().quiet();
    if (res.exitCode !== 0) return null;
    const parsed = z.object({ body: z.string() }).safeParse(safeJsonParse(res.stdout.toString()));
    if (!parsed.success) return null;
    const body = parsed.data.body.trim();
    return body.length > 0 ? body : null;
  }

  async publishReview(cwd: string, prUrl: string, opts: PublishReviewOptions): Promise<PublishReviewResult> {
    const endpoint = reviewApiEndpoint(prUrl);
    if (endpoint === null) return { ok: false, reason: "URL de PR GitHub invalide", reviewId: null };
    const own = await this.isOwnPullRequest(cwd, endpoint);
    if (!own.ok) return { ok: false, reason: own.reason, reviewId: null };
    const event: ReviewPublicationEvent = own.own ? "COMMENT" : opts.event;
    const expectedState = REVIEW_PUBLICATION_STATE_BY_EVENT[event];
    const existing = await this.findPublishedReview(cwd, endpoint, opts.marker, opts.expectedCommitSha, expectedState);
    if (!existing.ok || existing.reviewId !== null) return existing;
    const validated = await this.validateReviewComments(cwd, endpoint, opts.expectedCommitSha, opts.comments);
    if (!validated.ok) return { ok: false, reason: validated.reason, reviewId: null };
    const body = `${opts.body}${renderOutsideDiffSection(validated.outsideDiff)}\n\n${opts.marker}`;
    return this.createPublishedReview(cwd, endpoint, {
      body,
      commit_id: opts.expectedCommitSha,
      event,
      comments: validated.inline.map((comment) => ({ ...comment, side: "RIGHT" })),
    }, expectedState);
  }

  async verifyReviewPublication(
    cwd: string,
    prUrl: string,
    check: ReviewPublicationCheck,
  ): Promise<DoneGateResult> {
    const endpoint = reviewApiEndpoint(prUrl);
    if (endpoint === null) return { ok: false, reason: "URL de PR GitHub invalide" };
    const expectedState = await this.effectiveReviewState(cwd, endpoint, check.expectedState);
    if (!expectedState.ok) return { ok: false, reason: expectedState.reason };
    return this.verifyReviewPosted(cwd, endpoint, check, expectedState.state);
  }

  async mergePr(cwd: string, prUrl: string, expected?: MergePrExpectation): Promise<DoneGateResult> {
    if (expected) {
      const gate = await this.autonomousMergeGate(cwd, prUrl, expected);
      if (!gate.ok) return gate;
      const endpoint = reviewApiEndpoint(prUrl);
      if (!endpoint) return { ok: false, reason: "Autonomous merge requires an identified GitHub pull request." };
      const ref = await readGithubRepoRef(cwd);
      const result = await withJsonRequestFile({ sha: expected.commitSha, merge_method: AUTONOMOUS_MERGE_METHOD }, (inputPath) => {
        if (expected.deadlineAt !== undefined && Date.now() >= expected.deadlineAt) throw new Error("Autonomous delivery deadline expired before merge.");
        expected.assertCurrent?.();
        return runBoundedCommand([GH_BINARY, "api", "--hostname", ref.host, "--method", "PUT", `${pullApiEndpoint(endpoint)}/merge`, "--input", inputPath], cwd);
      });
      const response = ghSynchronousMergeSchema.safeParse(safeJsonParse(result.stdout));
      if (result.exitCode !== 0 || result.timedOut || !response.success || !response.data.merged || !response.data.sha) return { ok: false, reason: `Direct expected-head merge was not confirmed. Native policies requiring a merge queue are not supported by this pilot; no queue or auto-merge request is made. ${boundedCommandDetail(result) || "Keep the pull request and worktree for reconciliation."}` };
      const state = await confirmPrMerged(() => this.readPrState(cwd, prUrl));
      if (state !== "merged") return { ok: false, pending: state === "open", reason: unmergedReason(VCS_PROVIDER_LABELS.github, state, boundedCommandDetail(result)) };
      const head = await this.readPrHead(cwd, prUrl);
      if (!head.ok || head.commitSha !== expected.commitSha) return { ok: false, reason: "Merged pull request source does not match the preview-tested commit." };
      return { ok: true, reason: "" };
    }
    // A draft PR can't be merged; mark it ready first (harmless if already ready).
    await $`gh pr ready ${prUrl}`.cwd(cwd).nothrow().quiet();
    const res = await $`gh pr merge ${prUrl} ${PR_MERGE_STRATEGY}`.cwd(cwd).nothrow().quiet();
    if (res.exitCode !== 0) {
      const detail = res.stderr.toString().trim() || res.stdout.toString().trim();
      return { ok: false, reason: `gh pr merge a échoué (code ${res.exitCode}) : ${detail}` };
    }
    // `gh pr merge` can exit 0 without the PR landing on the base branch: with required
    // checks still pending it silently enables auto-merge instead, and GitHub may queue
    // or later reject the merge (e.g. a conflict). Trusting the exit code alone produced
    // false "PR mergée" badges, so confirm the real state before reporting success.
    const state = await confirmPrMerged(() => this.readPrState(cwd, prUrl));
    if (state !== "merged") {
      const hint = res.stdout.toString().trim() || res.stderr.toString().trim();
      return { ok: false, reason: unmergedReason(VCS_PROVIDER_LABELS.github, state, hint) };
    }
    return { ok: true, reason: "" };
  }

  private async autonomousMergeGate(cwd: string, prUrl: string, expected: MergePrExpectation): Promise<DoneGateResult> {
    const response = await runBoundedCommand([GH_BINARY, "pr", "view", prUrl, "--json", GH_AUTONOMOUS_PR_FIELDS], cwd);
    const parsed = ghAutonomousMergeSchema.safeParse(safeJsonParse(response.stdout));
    if (response.exitCode !== 0 || response.timedOut || !parsed.success) return { ok: false, reason: "Native pull request checks are unknown; autonomous merge is blocked." };
    const pr = parsed.data;
    if (pr.headRefOid !== expected.commitSha || pr.baseRefName !== expected.baseBranch) return { ok: false, reason: "Pull request source or target changed after autonomous validation." };
    if (pr.state === "MERGED") return { ok: true, reason: "" };
    if (pr.state !== "OPEN") return { ok: false, reason: "Native pull request checks are unavailable; autonomous merge is blocked." };
    if (pr.statusCheckRollup === null && !(await this.confirmAbsentNativeChecks(cwd, expected.commitSha))) return { ok: false, reason: "Native pull request checks are unknown; autonomous merge is blocked." };
    const checks = pr.statusCheckRollup ?? [];
    const failed = checks.some((check) => {
      if (check.__typename === "StatusContext") return check.state !== GH_NATIVE_CHECK_SUCCESS && check.state !== GH_NATIVE_CHECK_PENDING;
      return check.status === GH_NATIVE_CHECK_COMPLETED && check.conclusion !== GH_NATIVE_CHECK_SUCCESS;
    });
    if (failed) return { ok: false, reason: "Native pull request checks are unsuccessful; autonomous merge is blocked." };
    const pending = checks.some((check) => {
      if (check.__typename === "StatusContext") return check.state === GH_NATIVE_CHECK_PENDING;
      return check.status !== GH_NATIVE_CHECK_COMPLETED;
    });
    if (pending) return { ok: false, pending: true, reason: "Native pull request checks are pending; autonomous merge is blocked." };
    if (pr.mergeStateStatus !== GH_MERGE_STATE_CLEAN || pr.reviewDecision === "REVIEW_REQUIRED" || pr.reviewDecision === "CHANGES_REQUESTED") return { ok: false, pending: pr.reviewDecision !== "CHANGES_REQUESTED" && GH_PENDING_MERGE_STATES.has(pr.mergeStateStatus), reason: "Native pull request policies are not satisfied; keep the reviewed worktree and retry after they pass." };
    return { ok: true, reason: "" };
  }

  private async confirmAbsentNativeChecks(cwd: string, commitSha: string): Promise<boolean> {
    try {
      const ref = await readGithubRepoRef(cwd);
      const prefix = `repos/${ref.owner}/${ref.repository}/commits/${commitSha}`;
      const [checks, statuses] = await Promise.all([
        runBoundedCommand([GH_BINARY, "api", "--hostname", ref.host, `${prefix}/check-runs`], cwd),
        runBoundedCommand([GH_BINARY, "api", "--hostname", ref.host, `${prefix}/status`], cwd),
      ]);
      if (checks.exitCode !== 0 || checks.timedOut || statuses.exitCode !== 0 || statuses.timedOut) return false;
      const absentChecks = ghEmptyCheckRunsSchema.safeParse(safeJsonParse(checks.stdout));
      const absentStatuses = ghEmptyCommitStatusesSchema.safeParse(safeJsonParse(statuses.stdout));
      return absentChecks.success && absentStatuses.success && absentStatuses.data.sha === commitSha;
    } catch {
      return false;
    }
  }

  async readPrState(cwd: string, prUrl: string): Promise<PrState> {
    const res = await $`gh pr view ${prUrl} --json state`.cwd(cwd).nothrow().quiet();
    if (res.exitCode !== 0) return "unknown";
    try {
      const parsed = ghPrStateSchema.safeParse(JSON.parse(res.stdout.toString()));
      if (!parsed.success) return "unknown";
      return PR_STATE_BY_GITHUB_STATE[parsed.data.state] ?? "unknown";
    } catch {
      return "unknown";
    }
  }

  async readPrMergeability(cwd: string, prUrl: string): Promise<PrMergeability> {
    const res = await $`gh pr view ${prUrl} --json mergeable`.cwd(cwd).nothrow().quiet();
    if (res.exitCode !== 0) return "unknown";
    const parsed = ghPrMergeableSchema.safeParse(safeJsonParse(res.stdout.toString()));
    if (!parsed.success) return "unknown";
    return PR_MERGEABILITY_BY_GITHUB_MERGEABLE[parsed.data.mergeable] ?? "unknown";
  }

  /**
   * NOTE(ali): GitHub rejects APPROVE and REQUEST_CHANGES on one's own pull request with HTTP 422,
   * so a review published on our own PR is downgraded to COMMENT (and expected as COMMENTED).
   */
  private async isOwnPullRequest(
    cwd: string,
    endpoint: string,
  ): Promise<{ ok: true; own: boolean } | { ok: false; reason: string }> {
    const login = await this.currentGitHubLogin(cwd);
    if (login === null) return { ok: false, reason: "utilisateur gh courant indéterminé" };
    const pull = await runBoundedCommand(["gh", "api", pullApiEndpoint(endpoint)], cwd);
    if (pull.exitCode !== 0) {
      return { ok: false, reason: `lecture de la PR GitHub impossible : ${boundedCommandDetail(pull)}` };
    }
    const parsed = ghRestPullSchema.safeParse(safeJsonParse(pull.stdout));
    if (!parsed.success) return { ok: false, reason: "réponse GitHub inattendue pour la PR" };
    return { ok: true, own: parsed.data.user?.login === login };
  }

  private async effectiveReviewState(
    cwd: string,
    endpoint: string,
    state: ReviewPublicationState,
  ): Promise<{ ok: true; state: ReviewPublicationState } | { ok: false; reason: string }> {
    const own = await this.isOwnPullRequest(cwd, endpoint);
    if (!own.ok) return own;
    return { ok: true, state: own.own ? REVIEW_PUBLICATION_STATE_BY_EVENT.COMMENT : state };
  }

  private async validateReviewComments(
    cwd: string,
    endpoint: string,
    expectedCommitSha: string,
    comments: PublishReviewOptions["comments"],
  ): Promise<
    | { ok: true; inline: PublishReviewOptions["comments"]; outsideDiff: PublishReviewOptions["comments"] }
    | { ok: false; reason: string }
  > {
    if (comments.length === 0) return { ok: true, inline: [], outsideDiff: [] };
    const pull = await runBoundedCommand(["gh", "api", pullApiEndpoint(endpoint)], cwd);
    if (pull.exitCode !== 0) {
      return { ok: false, reason: `lecture du diff GitHub impossible : ${boundedCommandDetail(pull)}` };
    }
    const parsed = ghRestPullSchema.safeParse(safeJsonParse(pull.stdout));
    if (!parsed.success || parsed.data.head.sha !== expectedCommitSha) {
      return { ok: false, reason: "GitHub n'a pas confirmé les commits base et head du diff attendu" };
    }
    const linesByPath = new Map<string, Set<number>>();
    for (const path of new Set(comments.map((comment) => comment.path))) {
      const diff = await runBoundedCommand(
        ["git", "diff", "--unified=3", "--no-renames", "--no-color", `${parsed.data.base.sha}...${expectedCommitSha}`, "--", path],
        cwd,
      );
      if (diff.exitCode !== 0) {
        return { ok: false, reason: `validation des ancres du diff impossible pour ${path} : ${boundedCommandDetail(diff)}` };
      }
      linesByPath.set(path, rightSideDiffLines(diff.stdout));
    }
    const inline = comments.filter((comment) => linesByPath.get(comment.path)?.has(comment.line) === true);
    const outsideDiff = comments.filter((comment) => linesByPath.get(comment.path)?.has(comment.line) !== true);
    return { ok: true, inline, outsideDiff };
  }

  private async findPublishedReview(
    cwd: string,
    endpoint: string,
    marker: string,
    commitSha: string,
    expectedState: ReviewPublicationState,
  ): Promise<PublishReviewResult> {
    const login = await this.currentGitHubLogin(cwd);
    if (login === null) {
      return { ok: false, reason: "utilisateur gh courant indéterminé pendant la recherche de review", reviewId: null };
    }
    const reviews = await this.readReviewPages(cwd, endpoint);
    if (!reviews.ok) return { ok: false, reason: "lecture des reviews GitHub échouée", reviewId: null };
    if (reviews.pages === null) {
      return { ok: false, reason: "réponse GitHub inattendue pour les reviews", reviewId: null };
    }
    const existing = reviews.pages.find(
      (review) =>
        review.user?.login === login
        && review.state === expectedState
        && review.commit_id === commitSha
        && review.body.includes(marker),
    );
    if (existing === undefined) return { ok: true, reason: "", reviewId: null };
    return { ok: true, reason: "", reviewId: existing.id, actualState: expectedState };
  }

  private async createPublishedReview(
    cwd: string,
    endpoint: string,
    payload: Record<string, unknown>,
    expectedState: ReviewPublicationState,
  ): Promise<PublishReviewResult> {
    return withJsonRequestFile(payload, async (inputPath) => {
      const posted = await runBoundedCommand(
        ["gh", "api", "--method", "POST", endpoint, "--input", inputPath],
        cwd,
      );
      if (posted.exitCode !== 0) {
        return { ok: false, reason: `publication de la review GitHub échouée : ${boundedCommandDetail(posted)}`, reviewId: null };
      }
      const parsed = ghRestReviewSchema.safeParse(safeJsonParse(posted.stdout));
      if (!parsed.success || parsed.data.commit_id !== payload.commit_id || parsed.data.state !== expectedState) {
        return { ok: false, reason: "GitHub n'a pas confirmé la review sur le commit attendu", reviewId: null };
      }
      return { ok: true, reason: "", reviewId: parsed.data.id, actualState: expectedState };
    });
  }

  /** Confirm the current gh user posted the expected review on the PR at or after `check.since`. */
  private async verifyReviewPosted(
    cwd: string,
    endpoint: string,
    check: ReviewPublicationCheck,
    expectedState: ReviewPublicationState,
  ): Promise<DoneGateResult> {
    const login = await this.currentGitHubLogin(cwd);
    if (login === null) {
      return { ok: false, reason: "postage demandé mais utilisateur gh courant indéterminé" };
    }
    const reviews = await this.readReviewPages(cwd, endpoint);
    if (!reviews.ok) return { ok: false, reason: "postage demandé mais lecture des reviews échouée" };
    if (reviews.pages === null) return { ok: false, reason: "postage demandé mais sortie gh inattendue" };
    const posted = reviews.pages.some(
      (review) =>
        review.id === check.reviewId &&
        review.user?.login === login &&
        review.state === expectedState &&
        review.body.includes(check.marker) &&
        review.commit_id === check.commitSha &&
        review.submitted_at !== null &&
        Date.parse(review.submitted_at) >= check.since,
    );
    if (!posted) return { ok: false, reason: "postage demandé mais aucune review postée sur la PR" };
    return { ok: true, reason: "" };
  }

  /** Every review of the PR, flattened across pages. `ok: false` = CLI failure, `pages: null` = unparseable. */
  private async readReviewPages(
    cwd: string,
    endpoint: string,
  ): Promise<{ ok: false } | { ok: true; pages: z.infer<typeof ghRestReviewsSchema> | null }> {
    const res = await runBoundedCommand(["gh", "api", `${endpoint}?per_page=100`, "--paginate", "--slurp"], cwd);
    if (res.exitCode !== 0) return { ok: false };
    const parsed = ghRestReviewPagesSchema.safeParse(safeJsonParse(res.stdout));
    return { ok: true, pages: parsed.success ? parsed.data.flat() : null };
  }

  private async currentGitHubLogin(cwd: string): Promise<string | null> {
    const result = await runBoundedCommand(["gh", "api", "user", "-q", ".login"], cwd);
    const login = result.stdout.trim();
    return result.exitCode === 0 && login.length > 0 ? login : null;
  }
}
