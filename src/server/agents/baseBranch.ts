import { isDependencyReady, isSplitMother } from "../../shared/dependencies.ts";
import type { Ticket } from "../../shared/schemas.ts";
import type { ProjectConfig } from "../config.ts";
import type { Store } from "../db/store.ts";

export const MAX_DEPENDENCY_DEPTH = 100;

export type BaseBranchResolution = { status: "ready"; baseBranch: string } | { status: "blocked"; reason: string };

export function resolveBaseBranch(ticket: Ticket, project: ProjectConfig, store: Store): BaseBranchResolution {
  const visited = new Set<string>();
  let current = ticket;
  while (current.dependsOn !== null) {
    if (visited.has(current.id) || visited.size >= MAX_DEPENDENCY_DEPTH) {
      return { status: "blocked", reason: "Dépendance cyclique ou chaîne de dépendances trop profonde." };
    }
    visited.add(current.id);
    const parent = store.getDependencyParent(current);
    if (parent && parent.project !== ticket.project) {
      return { status: "blocked", reason: "Le ticket parent appartient à un autre projet. Livraison bloquée." };
    }
    if (parent && store.getDependencyPrObservation(parent.id)?.state === "closed") {
      return { status: "blocked", reason: `La PR du ticket parent ${parent.id} est fermée sans fusion. Rouvre ou livre le parent avant de continuer.` };
    }
    if (!isDependencyReady(current, parent) || !parent) {
      return { status: "blocked", reason: `Le ticket parent ${current.dependsOn} est absent ou sa livraison n'est pas prête.` };
    }
    if (isSplitMother(parent) && parent.branch !== null) return { status: "ready", baseBranch: parent.branch };
    if (parent.column === "merged" || (parent.directPush && parent.column === "done")) {
      const deliveredBase = store.getDeliveredBase(parent.id);
      if (deliveredBase !== null) {
        const ancestor = store.getDependencyParent(parent);
        if (!ancestor || ancestor.branch !== deliveredBase || (ancestor.column !== "merged" && !(ancestor.directPush && ancestor.column === "done"))) {
          return { status: "ready", baseBranch: deliveredBase };
        }
        current = parent;
        continue;
      }
      if (store.getDependencyPrObservation(parent.id)?.state === "merged") {
        return { status: "blocked", reason: `La branche cible de la PR fusionnée du parent ${parent.id} est inconnue.` };
      }
      current = parent;
      continue;
    }
    if (parent.branch !== null && parent.prUrl !== null) return { status: "ready", baseBranch: parent.branch };
    return { status: "blocked", reason: `La branche du ticket parent ${parent.id} n'est pas disponible.` };
  }
  return { status: "ready", baseBranch: current.baseBranch ?? project.baseBranch };
}

export function resolveAnalysisBaseBranch(ticket: Ticket, project: ProjectConfig, store: Store): string {
  const resolved = resolveBaseBranch(ticket, project, store);
  return resolved.status === "ready" ? resolved.baseBranch : ticket.baseBranch ?? project.baseBranch;
}

export function requireForkBaseBranch(ticket: Ticket, project: ProjectConfig, store: Store): string {
  const resolved = resolveBaseBranch(ticket, project, store);
  if (resolved.status === "blocked") throw new Error(resolved.reason);
  return resolved.baseBranch;
}

export function resolvePrTargetBaseBranch(ticket: Ticket, project: ProjectConfig, store: Store): string {
  const launch = store.getDependencyLaunch(ticket.id);
  if (launch !== null) {
    if (launch.parentTicketId !== ticket.dependsOn || launch.branch !== ticket.branch || launch.project !== ticket.project) {
      throw new Error("La dépendance ou la branche du ticket a changé depuis son lancement. Livraison bloquée.");
    }
    const forkBase = requireForkBaseBranch(ticket, project, store);
    if (forkBase !== launch.baseBranch) {
      throw new Error(`La base du parent a changé depuis le lancement (${launch.baseBranch} vers ${forkBase}). Livraison bloquée ; utilise « Mettre à jour la base ».`);
    }
    return launch.baseBranch;
  }
  const parent = store.getDependencyParent(ticket);
  return parent?.branch ?? ticket.baseBranch ?? project.baseBranch;
}

export function resolveExecutionBaseBranch(ticket: Ticket, project: ProjectConfig, store: Store): string {
  return store.getDependencyLaunch(ticket.id) !== null
    ? resolvePrTargetBaseBranch(ticket, project, store)
    : requireForkBaseBranch(ticket, project, store);
}
