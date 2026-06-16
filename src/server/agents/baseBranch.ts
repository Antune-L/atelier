import type { Ticket } from "../../shared/schemas.ts";
import type { ProjectConfig } from "../config.ts";
import type { Store } from "../db/store.ts";

/**
 * Effective base branch for a ticket: both the worktree fork point AND the PR target. A child
 * (dependsOn set, parent has a pushed branch) stacks on its parent's branch; otherwise the
 * ticket's own override, else the project default. Keeps worktree fork + PR target consistent.
 */
export function resolveBaseBranch(ticket: Ticket, project: ProjectConfig, store: Store): string {
  const parent = ticket.dependsOn ? store.getTicket(ticket.dependsOn) : null;
  return parent?.branch ?? ticket.baseBranch ?? project.baseBranch;
}
