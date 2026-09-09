/**
 * Selection of the findings a review pass actually publishes. Shared by the publication path and by
 * the done gate so both derive the same GitHub review event from the same set.
 */

import type { ReviewDepth } from "../../shared/constants.ts";
import type { ReviewFinding, ReviewKind } from "../../shared/protocol.ts";
import type { ReviewPass } from "../db/store.ts";

import { keptFindings, type DimensionFinding } from "./reviewFindings.ts";

const LIGHT_REVIEW_KINDS: readonly ReviewKind[] = ["quality", "conventions", "regression", "logic"];
const FULL_REVIEW_KINDS: readonly ReviewKind[] = [...LIGHT_REVIEW_KINDS, "architecture", "security"];

export function requiredReviewKinds(depth: ReviewDepth): readonly ReviewKind[] {
  return depth === "full" ? FULL_REVIEW_KINDS : LIGHT_REVIEW_KINDS;
}

/**
 * Every required dimension of the pass, flattened with the dimension that reported it. `null` when
 * one of them is missing or not completed: extra dimensions the pass happens to hold are ignored,
 * exactly like the publication path.
 */
export function passDimensionFindings(reviewPass: ReviewPass | null): DimensionFinding[] | null {
  if (reviewPass === null) return null;
  const entries: DimensionFinding[] = [];
  for (const kind of requiredReviewKinds(reviewPass.reviewDepth)) {
    const result = reviewPass.results[kind];
    if (result?.status !== "completed") return null;
    entries.push(...result.findings.map((finding) => ({ kind, finding })));
  }
  return entries;
}

/** The findings `publish_review` posts for this pass, or `null` while the pass is incomplete. */
export function publishedReviewFindings(reviewPass: ReviewPass | null): ReviewFinding[] | null {
  const entries = passDimensionFindings(reviewPass);
  return entries === null ? null : keptFindings(entries);
}
