/**
 * Dry-run VCS client: the sample PR data and the always-passing gates the fake adapter serves,
 * whatever the project's provider is. Zero external side effects.
 */

import type { PrState } from "../../../shared/constants.ts";
import type { OpenPr, VcsConnectionResult } from "../../../shared/schemas.ts";
import { isPrNeedsAttention } from "../../../shared/pr.ts";

import type { DoneGateResult, PublishReviewResult, ReviewHeadResult } from "../types.ts";
import { githubPrHeadRef } from "./github.ts";
import type { CreatePrResult, VcsClient } from "./types.ts";

/** Base offset for the deterministic dry-run stealth PR number (createPr). */
const FAKE_STEALTH_PR_BASE = 900;
const FAKE_REVIEW_HEAD = "dry-run-review-head";
const FAKE_REVIEW_ID = 1;

/** Sample open PRs surfaced by the review picker in dry-run (one clearly "needs attention"). */
const FAKE_OPEN_PRS: OpenPr[] = [
  {
    number: 142,
    title: "feat: panier multi-devises",
    url: "https://github.com/acme/repo/pull/142",
    headBranch: "feat/panier-devises",
    baseBranch: "main",
    isDraft: false,
    reviewStatus: "needs_review",
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
    baseBranch: "develop",
    isDraft: false,
    reviewStatus: "none",
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
    baseBranch: "main",
    isDraft: true,
    reviewStatus: "approved",
    updatedAt: "2026-06-09T08:00:00Z",
    author: "carol",
    additions: 980,
    deletions: 970,
  },
];

export class FakeVcsClient implements VcsClient {
  async testConnection(_repoPath: string, checkedAt: number): Promise<VcsConnectionResult> {
    // Same dry-run stance as checkClaudeAvailable: the pipeline stays exerciseable end-to-end.
    return { ok: true, message: "Mode simulation", checkedAt };
  }

  async listOpenPrs(_repoPath: string): Promise<OpenPr[]> {
    return FAKE_OPEN_PRS;
  }

  async listReviewCounts(repoPaths: string[]): Promise<Record<string, number | null>> {
    const count = FAKE_OPEN_PRS.filter(isPrNeedsAttention).length;
    return Object.fromEntries(repoPaths.map((repoPath) => [repoPath, count]));
  }

  async verifyPrExists(_cwd: string, _prUrl: string): Promise<DoneGateResult> {
    return { ok: true, reason: "" };
  }

  async readPrHead(_cwd: string, _prUrl: string): Promise<ReviewHeadResult> {
    return { ok: true, reason: "", commitSha: FAKE_REVIEW_HEAD };
  }

  async confirmPrHead(cwd: string, prUrl: string): Promise<ReviewHeadResult> {
    return this.readPrHead(cwd, prUrl);
  }

  async prHeadFetchRef(_cwd: string, _prUrl: string, prNumber: number): Promise<string> {
    return githubPrHeadRef(prNumber);
  }

  async createPr(_cwd: string, baseBranch: string, _opts: { draft: boolean }): Promise<CreatePrResult> {
    // Deterministic fake PR number derived from the base branch (no Math.random/Date.now).
    const prNumber = FAKE_STEALTH_PR_BASE + baseBranch.length;
    return { ok: true, url: `https://github.com/fake/repo/pull/${prNumber}`, reason: "" };
  }

  async fetchPrSummary(_cwd: string, _prUrl: string): Promise<string | null> {
    return "## Résumé (dry-run)\n\nImplémentation simulée de la fonctionnalité décrite par le ticket.";
  }

  async publishReview(_cwd: string, _prUrl: string): Promise<PublishReviewResult> {
    return { ok: true, reason: "", reviewId: FAKE_REVIEW_ID };
  }

  async verifyReviewPublication(_cwd: string, _prUrl: string): Promise<DoneGateResult> {
    return { ok: true, reason: "" };
  }

  async mergePr(_cwd: string, _prUrl: string): Promise<DoneGateResult> {
    return { ok: true, reason: "" };
  }

  async readPrState(_cwd: string, _prUrl: string): Promise<PrState> {
    return "merged";
  }
}
