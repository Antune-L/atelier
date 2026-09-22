/**
 * Merge confirmation shared by every VCS client: a merge command can exit 0 without the PR actually
 * landing (queued auto-merge on GitHub, policies still running on Azure DevOps), so the client always
 * re-reads the PR state instead of trusting the exit code.
 */

import { PR_STATE_LABELS } from "../../../shared/constants.ts";
import type { PrState } from "../../../shared/constants.ts";

/** A synchronous merge is occasionally not yet visible on the immediate read; poll a few times. */
const PR_MERGE_CONFIRM_ATTEMPTS = 3;
const PR_MERGE_CONFIRM_DELAY_MS = 1000;

/**
 * Resolve the PR's true merge state, polling briefly to absorb provider read lag so a synchronous
 * merge isn't misread as unmerged. Returns the last seen state.
 */
export async function confirmPrMerged(readState: () => Promise<PrState>): Promise<PrState> {
  let state: PrState = "unknown";
  for (let attempt = 0; attempt < PR_MERGE_CONFIRM_ATTEMPTS; attempt++) {
    if (attempt > 0) await Bun.sleep(PR_MERGE_CONFIRM_DELAY_MS);
    state = await readState();
    if (state === "merged") return state;
  }
  return state;
}

/** Gate reason for a merge command that exited 0 without the PR landing on the base branch. */
export function unmergedReason(providerLabel: string, state: PrState, hint: string): string {
  const label = PR_STATE_LABELS[state];
  return `PR non mergée (état ${providerLabel} : ${label || "indéterminé"})${hint ? ` — ${hint}` : ""}`;
}
