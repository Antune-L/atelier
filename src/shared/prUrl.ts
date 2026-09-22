/**
 * The single provider-aware parser for PR web URLs, shared by the server (API endpoints, gates) and
 * the web board (card badges). Pure: no I/O, so both sides can import it.
 */

import { VCS_PROVIDERS } from "./constants.ts";
import type { VcsProvider } from "./constants.ts";

/**
 * Path segment introducing the PR identifier in each provider's web URL:
 * GitHub `…/pull/<n>`, Azure DevOps `https://dev.azure.com/{org}/{project}/_git/{repo}/pullrequest/{id}`.
 */
const PR_URL_SEGMENT: Record<VcsProvider, string> = {
  github: "pull",
  azureDevops: "pullrequest",
};

const PR_NUMBER_PATTERN = /^\d+$/;

export interface PrUrlRef {
  provider: VcsProvider;
  /** PR number (GitHub) or pull request id (Azure DevOps). */
  number: number;
  /** Path segments preceding the provider's PR segment (GitHub: `[owner, repo]`). */
  ownerSegments: string[];
}

/** Parse a PR web URL into its provider, identifier and owning path segments; null when it matches none. */
export function parsePrUrl(prUrl: string): PrUrlRef | null {
  let segments: string[];
  try {
    segments = new URL(prUrl).pathname.split("/").filter((segment) => segment.length > 0);
  } catch {
    return null;
  }
  for (const provider of VCS_PROVIDERS) {
    const index = segments.lastIndexOf(PR_URL_SEGMENT[provider]);
    if (index < 0) continue;
    const raw = segments[index + 1];
    if (raw === undefined || !PR_NUMBER_PATTERN.test(raw)) continue;
    return { provider, number: Number.parseInt(raw, 10), ownerSegments: segments.slice(0, index) };
  }
  return null;
}

/** PR identifier carried by a PR URL (e.g. ".../pull/123" → 123), or null when unparseable. */
export function prNumberFromUrl(prUrl: string | null): number | null {
  if (prUrl === null) return null;
  return parsePrUrl(prUrl)?.number ?? null;
}
