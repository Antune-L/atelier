import { z } from "zod";

import { createLogger } from "../logger.ts";

import type { AgentSessionOptions } from "./agentSession.ts";

const log = createLogger("agent-permissions");
const MISSING_COMMAND = "(commande non disponible)";
export const PERMISSION_DENIAL_REASON = "Permission refusée par le runtime ; ce refus concerne uniquement cet appel et cette session.";

export const permissionDenialSchema = z.object({
  toolName: z.string(),
  command: z.string().nullable(),
  reason: z.string(),
  sourceId: z.string().optional(),
});

export function reportPermissionDenial(
  options: Pick<AgentSessionOptions, "provider" | "role" | "ticketId" | "onEvent">,
  denial: z.infer<typeof permissionDenialSchema>,
): void {
  const role = options.role ?? "orchestrator";
  log.warn("permission refusée", { ticketId: options.ticketId, provider: options.provider, role, ...denial });
  try {
    options.onEvent({
      type: "progress",
      kind: "command",
      message: `Permission refusée [${options.provider}/${role}] ${denial.toolName}: ${denial.command ?? MISSING_COMMAND}\nMotif : ${denial.reason}`,
      ...(denial.sourceId ? { sourceId: denial.sourceId } : {}),
    });
  } catch (error) {
    log.warn("diffusion d'un refus de permission impossible", { ticketId: options.ticketId, reason: String(error) });
  }
}
