import type { Implementer, Orchestrator } from "@shared/constants";

/**
 * Coerce an implementer to satisfy isAllowedAgentPair after an orchestrator change: a codex
 * orchestrator pilots only a codex implementer; switching back to claude drops a codex implementer
 * to claude but preserves any claude-compatible implementer (claude/composer).
 */
export function pairedImplementer(orchestrator: Orchestrator, implementer: Implementer): Implementer {
  if (orchestrator === "codex") return "codex";
  return implementer === "codex" ? "claude" : implementer;
}
