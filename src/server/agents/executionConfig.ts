import { isCodexFastServiceTier } from "../../shared/codexCapabilities.ts";
import { DEFAULT_CODEX_EFFORT } from "../../shared/constants.ts";
import type { AgentModel, CodexModel, FeasibilityEngine, Orchestrator } from "../../shared/constants.ts";
import type { Ticket } from "../../shared/schemas.ts";
import { MODELS } from "../config.ts";
import type { AgentSessionRole } from "../system/agentSession.ts";
import type { SystemAdapter } from "../system/types.ts";

export interface ExecutionOverrides {
  orchestrator?: Orchestrator;
  model?: string | null;
  effort?: string | null;
  codexModel?: string | null;
  codexEffort?: string | null;
  codexFast?: boolean;
}

/**
 * Provider knobs each feasibility engine pins. Kept server-side (not shared) because it is expressed
 * in ExecutionOverrides, which the web bundle never resolves.
 */
const FEASIBILITY_ENGINE_EXECUTION: Record<FeasibilityEngine, ExecutionOverrides> = {
  sonnet: { orchestrator: "claude", model: "sonnet" satisfies AgentModel },
  luna: { orchestrator: "codex", codexModel: "gpt-5.6-luna" satisfies CodexModel, codexEffort: DEFAULT_CODEX_EFFORT, codexFast: true },
};

export interface ExecutionDefaults {
  model: string;
  effort: string | null;
}

export interface ResolvedExecution {
  readonly provider: Orchestrator;
  readonly model: string;
  readonly effort: string | null;
  readonly serviceTier: "default" | "fast";
  readonly role: AgentSessionRole;
}

type CodexCapabilityReader = Pick<SystemAdapter, "checkCodexRuntime">;

const CODEX_LAUNCH_STATUS_MESSAGES = {
  checking: "Vérification des capacités Codex en cours",
  ready: "Codex disponible",
  unauthenticated: "Authentification Codex requise",
  unavailable: "Runtime Codex indisponible",
  model_unavailable: "Aucun modèle Codex pris en charge n'est disponible",
  temporarily_unavailable: "Service Codex temporairement indisponible",
  error: "Vérification Codex impossible",
} as const;

/** Refuse a stale Codex model/effort pair immediately before its session starts. */
export async function assertExecutionAvailable(
  system: CodexCapabilityReader,
  execution: Pick<ResolvedExecution, "provider" | "model" | "effort" | "serviceTier">,
): Promise<void> {
  if (execution.provider !== "codex") return;
  const runtime = await system.checkCodexRuntime(true);
  if (runtime.status !== "ready") {
    throw new Error(runtime.message ?? CODEX_LAUNCH_STATUS_MESSAGES[runtime.status]);
  }
  const model = runtime.models.find((candidate) => candidate.model === execution.model);
  if (!model) throw new Error(`Modèle Codex indisponible pour ce compte : ${execution.model}`);
  if (execution.effort === null || !model.efforts.some((effort) => effort === execution.effort)) {
    throw new Error(`Effort Codex indisponible pour ${execution.model} : ${execution.effort ?? "non défini"}`);
  }
  if (execution.serviceTier === "fast" && !model.serviceTiers.some((tier) => isCodexFastServiceTier(tier.id))) {
    throw new Error(`Mode FAST indisponible pour ${execution.model} avec ce compte`);
  }
}

/** Resolve and capture the provider knobs once, before an action starts. */
export function resolveExecution(
  role: AgentSessionRole,
  overrides: ExecutionOverrides | undefined,
  defaults: ExecutionDefaults,
): ResolvedExecution {
  const provider = overrides?.orchestrator ?? "claude";
  if (provider === "codex") {
    return {
      provider,
      model: overrides?.codexModel ?? MODELS.codexModel,
      effort: overrides?.codexEffort ?? MODELS.codexEffort,
      serviceTier: overrides?.codexFast === true ? "fast" : "default",
      role,
    };
  }
  return {
    provider,
    model: overrides?.model ?? defaults.model,
    effort: overrides?.effort ?? defaults.effort,
    serviceTier: "default",
    role,
  };
}

/** Resolve a ticket action from its captured ticket settings and role-specific Claude defaults. */
export function resolveTicketExecution(
  ticket: Ticket,
  role: AgentSessionRole,
  defaults: ExecutionDefaults,
): ResolvedExecution {
  return resolveExecution(
    role,
    {
      orchestrator: ticket.orchestrator,
      model: ticket.model,
      effort: ticket.effort,
      codexModel: ticket.codexModel,
      codexEffort: ticket.codexEffort,
      codexFast: ticket.codexFast,
    },
    defaults,
  );
}

/**
 * Resolve a feasibility/triage action: a ticket pinning a feasibility engine runs on that engine's
 * knobs, otherwise the analysis follows the ticket's own orchestrator settings.
 */
export function resolveFeasibilityExecution(
  ticket: Ticket,
  role: AgentSessionRole,
  defaults: ExecutionDefaults,
): ResolvedExecution {
  if (ticket.feasibilityEngine === null) return resolveTicketExecution(ticket, role, defaults);
  return resolveExecution(role, FEASIBILITY_ENGINE_EXECUTION[ticket.feasibilityEngine], defaults);
}
