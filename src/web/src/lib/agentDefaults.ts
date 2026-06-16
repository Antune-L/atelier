import type { AgentEffort, AgentModel } from "@shared/constants";
import type { Capabilities } from "@shared/schemas";
import { agentEffortSchema, agentModelSchema } from "@shared/schemas";

function resolveModel(value: string): AgentModel | null {
  const parsed = agentModelSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

function resolveEffort(value: string): AgentEffort | null {
  const parsed = agentEffortSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

/**
 * The server-configured defaults parsed into typed values (or null when unset/unknown). A null
 * per-ticket knob follows the matching default, so callers highlight the resolved tab and treat a
 * pick equal to it as "no override".
 */
export interface ResolvedAgentDefaults {
  model: AgentModel | null;
  effort: AgentEffort | null;
  implementerModel: AgentModel | null;
  implementerEffort: AgentEffort | null;
}

/** Parse the agent-config defaults from backend capabilities into typed values. */
export function resolveAgentDefaults(capabilities: Capabilities): ResolvedAgentDefaults {
  return {
    model: resolveModel(capabilities.defaultModel),
    effort: resolveEffort(capabilities.defaultEffort),
    implementerModel: resolveModel(capabilities.defaultImplementerModel),
    implementerEffort: resolveEffort(capabilities.defaultImplementerEffort),
  };
}
