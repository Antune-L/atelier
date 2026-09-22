/**
 * The VCS seam: everything the pipeline needs from a PR host (GitHub, Azure DevOps), behind one
 * interface resolved per project. Plain-git work (worktree state, pushed-branch checks, remote branch
 * deletion) stays in the SystemAdapter — a client only owns the provider-specific calls.
 *
 * Named `VcsClient` because `VcsProvider` is already the project-setting string union.
 */

import type { PrState } from "../../../shared/constants.ts";
import type { OpenPr, VcsConnectionResult } from "../../../shared/schemas.ts";

import type {
  DoneGateResult,
  PublishReviewOptions,
  PublishReviewResult,
  ReviewHeadResult,
  ReviewPublicationState,
} from "../types.ts";

export interface CreatePrResult {
  ok: boolean;
  url: string;
  reason: string;
}

/** Proof the current review pass was really published, re-checked by the review done() gate. */
export interface ReviewPublicationCheck {
  /** Epoch ms the publication must be at or after. */
  since: number;
  marker: string;
  commitSha: string;
  reviewId: number;
  expectedState: ReviewPublicationState;
}

export interface VcsClient {
  /** Cheap read-only reachability check (list one PR). Never throws. */
  testConnection(repoPath: string, checkedAt: number): Promise<VcsConnectionResult>;
  /** Open PRs of the project repo. Throws on CLI failure. */
  listOpenPrs(repoPath: string): Promise<OpenPr[]>;
  /** done() gate: the PR still exists. */
  verifyPrExists(cwd: string, prUrl: string): Promise<DoneGateResult>;
  /** The PR's current head commit, as the provider reports it. */
  readPrHead(cwd: string, prUrl: string): Promise<ReviewHeadResult>;
  /** Same read, worded for the review done() gate (PR existence first, then head confirmation). */
  confirmPrHead(cwd: string, prUrl: string): Promise<ReviewHeadResult>;
  /**
   * Remote ref carrying the PR head, fetched into the review worktree; null when unresolvable. The
   * adapter owns the git half (fetch + SHA comparison against the head the client reported), so a
   * provider without a dedicated PR ref only has to name the branch to fetch.
   */
  prHeadFetchRef(cwd: string, prUrl: string, prNumber: number): Promise<string | null>;
  createPr(cwd: string, baseBranch: string, opts: { draft: boolean }): Promise<CreatePrResult>;
  /** PR description body, used as the agent-work summary. null when unreadable. */
  fetchPrSummary(cwd: string, prUrl: string): Promise<string | null>;
  /**
   * Publish the review pass on the PR. The client applies its own capabilities here (GitHub rejects
   * APPROVE/REQUEST_CHANGES on one's own PR, so it downgrades the event to COMMENT).
   */
  publishReview(cwd: string, prUrl: string, opts: PublishReviewOptions): Promise<PublishReviewResult>;
  /** Review done() gate: the publication described by `check` is really on the PR. */
  verifyReviewPublication(cwd: string, prUrl: string, check: ReviewPublicationCheck): Promise<DoneGateResult>;
  /** Mark the PR ready (no-op if already) and merge it; the caller deletes the remote branch. */
  mergePr(cwd: string, prUrl: string): Promise<DoneGateResult>;
  readPrState(cwd: string, prUrl: string): Promise<PrState>;
}
