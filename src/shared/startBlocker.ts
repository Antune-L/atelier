import { isDependencyReady } from "./dependencies.ts";
import type { Ticket } from "./schemas.ts";

export type StartBlocker = "triage" | "dependency";

export function startBlocker(ticket: Ticket, parent: Ticket | null): StartBlocker | null {
  if (ticket.column === "todo" && ticket.triageStatus === "running") return "triage";
  if (!isDependencyReady(ticket, parent)) return "dependency";
  return null;
}
