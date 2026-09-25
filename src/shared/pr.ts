import type { OpenPr } from "./schemas.ts";

export function isPrNeedsAttention(pr: Pick<OpenPr, "isDraft" | "reviewStatus">): boolean {
  return !pr.isDraft && (pr.reviewStatus === "none" || pr.reviewStatus === "needs_review");
}
