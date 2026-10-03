import { z } from "zod";

import { qualityPermissionBlockReasonSchema } from "../../shared/quality.ts";
import { createLogger } from "../logger.ts";

import type { AgentSessionOptions } from "./agentSession.ts";

const log = createLogger("agent-permissions");
const MISSING_COMMAND = "(commande non disponible)";
export const PERMISSION_DENIAL_REASON = "Permission refusée par le runtime ; ce refus concerne uniquement cet appel et cette session.";

export const permissionDenialSchema = z.object({
  toolName: z.string(),
  command: z.string().nullable(),
  reason: z.string(),
  blockReason: qualityPermissionBlockReasonSchema.nullable().default(null),
  sourceId: z.string().optional(),
});
export type PermissionDenial = z.infer<typeof permissionDenialSchema>;

export function reportPermissionDenial(
  options: Pick<AgentSessionOptions, "provider" | "role" | "ticketId" | "onEvent">,
  input: z.input<typeof permissionDenialSchema>,
): void {
  const denial = permissionDenialSchema.parse(input);
  const role = options.role ?? "orchestrator";
  log.warn("permission refusée", { ticketId: options.ticketId, provider: options.provider, role, ...denial });
  try {
    options.onEvent({
      type: "progress",
      kind: "command",
      permissionDenial: denial,
      message: `Permission refusée [${options.provider}/${role}] ${denial.toolName}: ${denial.command ?? MISSING_COMMAND}\nMotif : ${denial.reason}`,
      ...(denial.sourceId ? { sourceId: denial.sourceId } : {}),
    });
  } catch (error) {
    log.warn("diffusion d'un refus de permission impossible", { ticketId: options.ticketId, reason: String(error) });
  }
}
