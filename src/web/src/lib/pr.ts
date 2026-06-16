import type { OpenPr } from "@shared/schemas";

/** A PR needs attention when it is open and no review is recorded yet (or one is required). */
export function isPrNeedsAttention(pr: OpenPr): boolean {
  return !pr.isDraft && (pr.reviewDecision === "" || pr.reviewDecision === "REVIEW_REQUIRED");
}
