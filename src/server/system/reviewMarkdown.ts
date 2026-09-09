/**
 * Markdown shared by the review report and its GitHub publication: findings that cannot be anchored
 * on a diff line are folded into a `<details>` block instead of an inline comment.
 */

function escapeHtml(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

export function renderCollapsedDetails(title: string, body: string): string {
  return `<details>\n<summary>${escapeHtml(title)}</summary>\n\n${escapeHtml(body)}\n\n</details>`;
}
