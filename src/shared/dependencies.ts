import { isAutonomousParentIncomplete } from "./autonomous.ts";
import { SPLIT_BRANCH_PREFIX } from "./constants.ts";
import type { Ticket } from "./schemas.ts";

export function isSplitMother(ticket: Ticket): boolean {
  return ticket.branch !== null && ticket.branch.startsWith(SPLIT_BRANCH_PREFIX) && ticket.prUrl === null;
}

export function isDependencyReady(ticket: Ticket, parent: Ticket | null): boolean {
  if (ticket.dependsOn === null) return true;
  if (!parent || isAutonomousParentIncomplete(parent)) return false;
  if (parent.dependencyPrObservation?.state === "closed") return false;
  if (isSplitMother(parent)) return true;
  if (parent.column === "merged") return true;
  if (parent.directPush && parent.column === "done") return true;
  return parent.branch !== null && parent.prUrl !== null;
}
