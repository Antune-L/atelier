import { SPLIT_BRANCH_PREFIX } from "./constants.ts";
import type { Ticket } from "./schemas.ts";

export interface MergePrResult {
  merged: boolean;
  conflicts: boolean;
  reason?: string;
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
    !ticket.directPush
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
