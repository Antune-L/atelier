import { ACTIVE_STAGES, SPLIT_BRANCH_PREFIX } from "./constants.ts";
import type { Ticket } from "./schemas.ts";

export interface MergePrResult {
  merged: boolean;
  conflicts: boolean;
  reason?: string;
  ticket?: Ticket;
}

export interface UpdateDependencyBaseResult {
  ok: boolean;
  reason: string;
  manualCommand?: string;
  ticket?: Ticket;
}

export function canMergePr(ticket: Ticket): boolean {
  return (
    ticket.column === "done" &&
    ticket.kind === "feature" &&
    ticket.slotId === null &&
    ticket.prUrl !== null &&
    ticket.branch !== null &&
    !ticket.branch.startsWith(SPLIT_BRANCH_PREFIX) &&
    !ticket.testing &&
    !ticket.directPush &&
    !ticket.dependencyStatus?.stale &&
    !ticket.dependencyStatus?.reason
  );
}

export function canResolveConflicts(ticket: Ticket): boolean {
  const failedWithPr =
    ticket.column === "failed" &&
    ticket.kind !== "review" &&
    ticket.slotId === null &&
    ticket.prUrl !== null &&
    ticket.branch !== null;
  return failedWithPr || canMergePr(ticket);
}

export function canUpdateDependencyBase(ticket: Ticket): boolean {
  return (
    ticket.dependencyStatus?.stale === true &&
    ticket.dependsOn !== null &&
    ticket.dependencyLaunch !== null &&
    ticket.dependencyLaunch !== undefined &&
    ticket.branch !== null &&
    ticket.column !== "merged" &&
    ticket.column !== "abandoned" &&
    ticket.slotId === null &&
    !ticket.testing &&
    (ticket.stage === null || !ACTIVE_STAGES.includes(ticket.stage))
  );
}
