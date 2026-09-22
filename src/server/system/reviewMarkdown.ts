/**
 * Markdown shared by the review report and its publication on a PR host: findings that cannot be
 * anchored on a diff line are folded into a `<details>` block instead of an inline comment.
 */

import type { ReviewPublicationComment } from "./types.ts";

/** Heading introducing the findings folded into the review body for lack of a diff anchor. */
const OUTSIDE_DIFF_HEADING = "## Findings outside the diff";
/** Fallback title when a finding body is empty (no first line to summarize it). */
const OUTSIDE_DIFF_FALLBACK_TITLE = "Finding outside the diff";

function escapeHtml(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

export function renderCollapsedDetails(title: string, body: string): string {
  return `<details>\n<summary>${escapeHtml(title)}</summary>\n\n${escapeHtml(body)}\n\n</details>`;
}

function renderOutsideDiffComment(comment: ReviewPublicationComment): string {
  const title = comment.body.split("\n", 1)[0] ?? OUTSIDE_DIFF_FALLBACK_TITLE;
  return renderCollapsedDetails(`${comment.path}:${comment.line} — ${title}`, comment.body);
}

/**
 * Section appended to the published review body for the findings no inline comment could carry
 * (GitHub: outside the diff hunks; Azure DevOps: file absent from the iteration changes). Empty
 * string when every finding got an inline anchor.
 */
export function renderOutsideDiffSection(comments: ReviewPublicationComment[]): string {
  if (comments.length === 0) return "";
  return `\n\n${OUTSIDE_DIFF_HEADING}\n\n${comments.map(renderOutsideDiffComment).join("\n\n")}`;
}
