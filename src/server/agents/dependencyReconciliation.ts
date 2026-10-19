import type { Ticket } from "../../shared/schemas.ts";
import { getErrorMessage } from "../../shared/errors.ts";
import { getProject, isProjectKey } from "../config.ts";
import type { Store } from "../db/store.ts";
import type { ClientHub } from "../hub.ts";
import type { Notifier } from "../notifier.ts";
import type { SystemAdapter } from "../system/types.ts";
import type { PrSnapshot } from "../system/vcs/types.ts";

import { MAX_DEPENDENCY_DEPTH, requireForkBaseBranch } from "./baseBranch.ts";

const UPDATE_BASE_LABEL = "Mettre à jour la base";

export function matchesTicketDelivery(current: Ticket | null, expected: Ticket): current is Ticket {
  return current !== null && current.id === expected.id && current.project === expected.project && current.branch === expected.branch && current.prUrl === expected.prUrl && current.dependsOn === expected.dependsOn;
}

export class DependencyReconciliation {
  constructor(
    private readonly store: Store,
    private readonly system: SystemAdapter,
    private readonly hub: ClientHub,
    private readonly notifier: Notifier,
    private readonly markMerged: (ticket: Ticket) => Promise<Ticket>,
  ) {}

  async reconcile(ticketId: string): Promise<void> {
    const child = this.store.getTicket(ticketId);
    if (!child) return;
    const visited = new Set<string>();
    let current = child;
    while (current.dependsOn !== null && visited.size < MAX_DEPENDENCY_DEPTH) {
      if (visited.has(current.id)) break;
      visited.add(current.id);
      const parent = this.store.getDependencyParent(current);
      if (!parent || parent.project !== child.project) break;
      if (parent.column === "done" && parent.prUrl !== null) {
        await this.readAndApply(parent);
        const latestChild = this.store.getTicket(ticketId);
        if (!matchesTicketDelivery(latestChild, child)) return;
      }
      const latest = this.store.getTicket(parent.id);
      if (!latest || latest.project !== child.project) break;
      current = latest;
    }
    this.refresh(ticketId);
  }

  async readAndApply(ticket: Ticket): Promise<PrSnapshot | null> {
    if (ticket.column !== "done" || !ticket.prUrl || !isProjectKey(ticket.project)) return null;
    const project = getProject(ticket.project);
    // TODO(ali): Reconcile Azure parent merges once its live delivery semantics are qualified.
    if (project.vcsProvider !== "github") return null;
    let snapshot: PrSnapshot;
    try {
      snapshot = await this.system.readPr(project.repoPath, ticket.prUrl, project.vcsProvider);
    } catch {
      return null;
    }
    const current = this.store.getTicket(ticket.id);
    if (!matchesTicketDelivery(current, ticket) || current.column !== "done" || !isProjectKey(current.project)) return null;
    const currentProject = getProject(current.project);
    if (currentProject.repoPath !== project.repoPath || currentProject.vcsProvider !== project.vcsProvider) return null;
    if (snapshot.state === "unknown") return snapshot;
    const previous = this.store.getDependencyPrObservation(ticket.id);
    const changed = this.store.recordDependencyPrObservation(ticket.id, {
      version: 1,
      prUrl: ticket.prUrl,
      project: ticket.project,
      branch: ticket.branch,
      ...snapshot,
      state: snapshot.state,
    });
    if (snapshot.state === "merged") await this.markMerged(current);
    else if (changed) this.hub.pushTicket(this.store.getTicket(ticket.id) ?? current);
    this.refreshDependents(ticket.id);
    if (changed && previous?.state !== snapshot.state && (snapshot.state === "merged" || snapshot.state === "closed")) {
      const body = snapshot.state === "merged"
        ? `${ticket.title} : PR fusionnée dans ${snapshot.baseBranch ?? "une base inconnue"}. Les bases des tickets dépendants ont été vérifiées.`
        : `${ticket.title} : PR fermée sans fusion. Les tickets dépendants restent bloqués.`;
      await this.notifier.notify("Dépendance mise à jour", body, ticket.id);
    }
    return snapshot;
  }

  refreshDependents(parentId: string): void {
    const pending = [parentId];
    const visited = new Set<string>();
    while (pending.length > 0) {
      const id = pending.shift();
      if (id === undefined || visited.has(id)) continue;
      visited.add(id);
      for (const child of this.store.listDependents(id)) {
        this.refresh(child.id);
        pending.push(child.id);
      }
    }
  }

  refresh(ticketId: string): void {
    const ticket = this.store.getTicket(ticketId);
    if (!ticket || ticket.dependsOn === null || !isProjectKey(ticket.project)) return;
    let baseBranch: string | null = null;
    let reason: string | null = null;
    try {
      baseBranch = requireForkBaseBranch(ticket, getProject(ticket.project), this.store);
      const launch = ticket.dependencyLaunch;
      if (launch && (launch.parentTicketId !== ticket.dependsOn || launch.branch !== ticket.branch || launch.project !== ticket.project)) {
        reason = `La dépendance ou la branche a changé depuis le lancement. Utilise « ${UPDATE_BASE_LABEL} » ou reprends manuellement.`;
      } else if (launch && launch.baseBranch !== baseBranch) {
        reason = `La base du parent a changé (${launch.baseBranch} vers ${baseBranch}). Utilise « ${UPDATE_BASE_LABEL} » avant de fusionner.`;
      }
    } catch (error) {
      reason = getErrorMessage(error);
    }
    const previous = this.store.getDependencyStatus(ticketId);
    const manualCommand = previous?.newBaseBranch === baseBranch ? previous.manualCommand : null;
    if (!reason && previous?.newBaseBranch === baseBranch) reason = previous.reason;
    if (this.store.recordDependencyStatus(ticketId, { stale: reason !== null, reason, newBaseBranch: baseBranch, manualCommand })) {
      const updated = this.store.getTicket(ticketId);
      if (updated) this.hub.pushTicket(updated);
    }
  }
}
