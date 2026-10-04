import { hasUnresolvedImplementation } from "@shared/implementationPlan";
import type { Ticket } from "@shared/schemas";

export const IMPLEMENTATION_RECOVERY_REQUIRED_MESSAGE =
  "Des lots restent à vérifier. Ouvrez l’activité du ticket et utilisez « Reprendre les lots » avant de le terminer.";

export function needsImplementationRecovery(ticket: Ticket): boolean {
  return ticket.kind === "feature" && ticket.slotId !== null && hasUnresolvedImplementation(ticket.implementationPlan);
}

export function canRecoverImplementation(ticket: Ticket): boolean {
  const plan = ticket.implementationPlan;
  if (ticket.kind !== "feature" || ticket.slotId === null || !plan || ticket.stealth || ticket.directPush || ticket.resolvingConflicts || ticket.testing) return false;
  if (plan.recovery) return plan.recovery.slotId === ticket.slotId;
  if (!needsImplementationRecovery(ticket)) return false;
  if (plan.status === "failed" || plan.status === "interrupted") return true;
  return plan.lots.some((lot) => lot.status === "failed" || lot.status === "blocked" || lot.status === "interrupted");
}
