/**
 * GitHub client of the VCS seam: every `gh` invocation of the pipeline lives here (PR listing,
 * creation, done gates, review publication, merge). Extracted verbatim from the real adapter, so the
 * commands and the reasons handed back to the agent are unchanged.
 */

import { $ } from "bun";
import { z } from "zod";

import { VCS_PROVIDER_LABELS } from "../../../shared/constants.ts";
import type { PrReviewStatus, PrState } from "../../../shared/constants.ts";
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
  ReviewPublicationEvent,
  ReviewPublicationState,
} from "../types.ts";
import { CONNECTION_TEST_PR_LIMIT, connectionFailure, connectionResult } from "./connection.ts";
import { confirmPrMerged, unmergedReason } from "./prMerge.ts";
import type { CreatePrResult, ReviewPublicationCheck, VcsClient } from "./types.ts";

const GH_BINARY = "gh";
/** `gh pr list --json` fields surfaced to the review picker. */
const PR_LIST_FIELDS = "number,title,url,headRefName,baseRefName,isDraft,reviewDecision,updatedAt,author,additions,deletions";
/** Cap the review picker to the most recent open PRs. */
const PR_LIST_LIMIT = "50";
const REVIEW_COUNT_PAGE_SIZE = 100;
const REVIEW_COUNT_BATCH_SIZE = 10;
const GIT_REMOTE_SCP_RE = /^(?:[^@/]+@)?([^@/:]+):(.+)$/;
/** Merge strategy for the opt-in auto-merge (rebase replays commits onto the base branch). */
const PR_MERGE_STRATEGY = "--rebase";
/** GitHub PR state that proves the merge completed (vs. OPEN/CLOSED). */
const PR_STATE_MERGED = "MERGED";
const PR_STATE_CLOSED = "CLOSED";
const PR_STATE_OPEN = "OPEN";

const ghPrHeadSchema = z.object({ url: z.string(), headRefOid: z.string().min(1) });
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

/** Shape of one `gh pr list --json` entry (mapped to the shared OpenPr). */
const ghPrSchema = z.object({
  number: z.number(),
  title: z.string(),
  url: z.string(),
  headRefName: z.string(),
  baseRefName: z.string(),
  isDraft: z.boolean(),
  // gh returns "" for "no decision"; tolerate null too so one odd PR never 502s the list.
  reviewDecision: z.string().nullable().default(""),
  updatedAt: z.string(),
  author: z.object({ login: z.string() }).nullable(),
  additions: z.number(),
  deletions: z.number(),
});
const reviewCountPageSchema = z.object({
  nodes: z.array(z.object({ isDraft: z.boolean(), reviewDecision: z.string().nullable() }).nullable()),
  pageInfo: z.object({ hasNextPage: z.boolean(), endCursor: z.string().nullable() }),
});
const reviewCountResponseSchema = z.object({
  data: z.record(z.string(), z.object({ pullRequests: reviewCountPageSchema }).nullable()),
});

interface GithubRepoRef {
  host: string;
  owner: string;
  repository: string;
}

interface ReviewCountPageRequest {
  ref: GithubRepoRef;
  cursor: string | null;
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

/** GitHub's `reviewDecision` mapped onto the neutral review status ("" and anything else → none). */
const PR_REVIEW_STATUS_BY_DECISION: Record<string, PrReviewStatus> = {
  REVIEW_REQUIRED: "needs_review",
  APPROVED: "approved",
  CHANGES_REQUESTED: "changes_requested",
};

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

  async listOpenPrs(repoPath: string): Promise<OpenPr[]> {
    const res = await $`gh pr list --json ${PR_LIST_FIELDS} --limit ${PR_LIST_LIMIT}`.cwd(repoPath).nothrow().quiet();
    if (res.exitCode !== 0) {
      const detail = res.stderr.toString().trim() || res.stdout.toString().trim();
      throw new Error(`gh pr list a échoué (code ${res.exitCode}) : ${detail}`);
    }
    const parsed = z.array(ghPrSchema).safeParse(JSON.parse(res.stdout.toString()));
    if (!parsed.success) throw new Error(`gh pr list: sortie inattendue (${parsed.error.message})`);
    return parsed.data.map((pr) => ({
      number: pr.number,
      title: pr.title,
      url: pr.url,
      headBranch: pr.headRefName,
      baseBranch: pr.baseRefName,
      isDraft: pr.isDraft,
      reviewStatus: PR_REVIEW_STATUS_BY_DECISION[pr.reviewDecision ?? ""] ?? "none",
      updatedAt: pr.updatedAt,
      author: pr.author?.login ?? "?",
      additions: pr.additions,
      deletions: pr.deletions,
    }));
  }

  async listReviewCounts(repoPaths: string[]): Promise<Record<string, number | null>> {
    const counts: Record<string, number | null> = {};
    const pathsByRepo = new Map<string, string[]>();
    const refs = new Map<string, GithubRepoRef>();
    await Promise.all(repoPaths.map(async (repoPath) => {
      counts[repoPath] = null;
      let remote;
      try {
        remote = await runBoundedCommand(["git", "-C", repoPath, "remote", "get-url", "origin"], repoPath);
      } catch {
        return;
      }
      if (remote.exitCode !== 0 || remote.timedOut) return;
      const ref = parseGithubRemote(remote.stdout);
      if (!ref) return;
      const key = githubRepoKey(ref);
      refs.set(key, ref);
      pathsByRepo.set(key, [...(pathsByRepo.get(key) ?? []), repoPath]);
    }));

    let pending: ReviewCountPageRequest[] = [...refs.values()].map((ref) => ({ ref, cursor: null }));
    const repoCounts = new Map<string, number>();
    while (pending.length > 0) {
      const next: ReviewCountPageRequest[] = [];
      const byHost = Map.groupBy(pending, (request) => request.ref.host);
      for (const [host, requests] of byHost) {
        for (let start = 0; start < requests.length; start += REVIEW_COUNT_BATCH_SIZE) {
          const batch = requests.slice(start, start + REVIEW_COUNT_BATCH_SIZE);
          const fields = batch.map(({ ref, cursor }, index) => {
            const after = cursor === null ? "" : `,after:${JSON.stringify(cursor)}`;
            return `r${index}: repository(owner:${JSON.stringify(ref.owner)},name:${JSON.stringify(ref.repository)}) { pullRequests(states:OPEN,first:${REVIEW_COUNT_PAGE_SIZE}${after}) { nodes { isDraft reviewDecision } pageInfo { hasNextPage endCursor } } }`;
          });
          const query = `query { ${fields.join(" ")} }`;
          let result;
          try {
            result = await withJsonRequestFile({ query }, (inputPath) => runBoundedCommand(
              [GH_BINARY, "api", "graphql", "--hostname", host, "--input", inputPath],
              repoPaths[0] ?? ".",
            ));
          } catch {
            continue;
          }
          if (result.timedOut) continue;
          const parsed = reviewCountResponseSchema.safeParse(safeJsonParse(result.stdout));
          if (!parsed.success) continue;
          for (const [index, request] of batch.entries()) {
            const page = parsed.data.data[`r${index}`]?.pullRequests;
            if (!page) continue;
            const key = githubRepoKey(request.ref);
            const pageCount = page.nodes.filter((node) => node && isPrNeedsAttention({
              isDraft: node.isDraft,
              reviewStatus: PR_REVIEW_STATUS_BY_DECISION[node.reviewDecision ?? ""] ?? "none",
            })).length;
            repoCounts.set(key, (repoCounts.get(key) ?? 0) + pageCount);
            if (page.pageInfo.hasNextPage) {
              if (!page.pageInfo.endCursor) {
                repoCounts.delete(key);
                continue;
              }
              next.push({ ref: request.ref, cursor: page.pageInfo.endCursor });
            } else {
              for (const repoPath of pathsByRepo.get(key) ?? []) counts[repoPath] = repoCounts.get(key) ?? 0;
            }
          }
        }
      }
      pending = next;
    }
    return counts;
  }

  async verifyPrExists(_cwd: string, prUrl: string): Promise<DoneGateResult> {
    const pr = await $`gh pr view ${prUrl} --json url`.nothrow().quiet();
    if (pr.exitCode !== 0) return { ok: false, reason: `la PR n'existe pas (${prUrl})` };
    return { ok: true, reason: "" };
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

  async createPr(cwd: string, baseBranch: string, opts: { draft: boolean }): Promise<CreatePrResult> {
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

  async mergePr(cwd: string, prUrl: string): Promise<DoneGateResult> {
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
    return { ok: true, reason: "", reviewId: existing?.id ?? null };
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
      return { ok: true, reason: "", reviewId: parsed.data.id };
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
