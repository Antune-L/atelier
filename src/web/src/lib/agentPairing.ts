import type { Implementer, Orchestrator } from "@shared/constants";

/**
 * Coerce an implementer to satisfy isAllowedAgentPair after an orchestrator change: a codex
 * orchestrator pilots only a codex implementer; a claude orchestrator accepts any implementer
 * (a codex implementer runs as a backend-delegated child session), so the choice is preserved.
 */
export function pairedImplementer(orchestrator: Orchestrator, implementer: Implementer): Implementer {
  if (orchestrator === "codex") return "codex";
  return implementer;
}
