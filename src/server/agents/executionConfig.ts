import { isCodexFastServiceTier } from "../../shared/codexCapabilities.ts";
import type { CodexEffort, CodexModel, FeasibilityEngine, Implementer, Orchestrator } from "../../shared/constants.ts";
import type { Profile, Ticket } from "../../shared/schemas.ts";
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
 * Feasibility provider selection and pinned Codex knobs. Claude inherits the configured triage
 * defaults. Kept server-side because ExecutionOverrides is never resolved by the web bundle.
 */
const FEASIBILITY_ENGINE_EXECUTION: Record<FeasibilityEngine, ExecutionOverrides> = {
  claude: { orchestrator: "claude" },
  codex: { orchestrator: "codex", codexModel: "gpt-6.1-sol" satisfies CodexModel, codexEffort: "medium" satisfies CodexEffort },
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

type EngineAvailabilityReader = Pick<SystemAdapter, "checkCodexRuntime" | "checkClaudeAvailable">;

const ENGINE_UNAVAILABLE_MESSAGES: Record<Implementer, string> = {
  claude: "Claude n'est pas disponible sur cette machine",
  codex: "Codex n'est pas prêt sur cette machine",
  composer: "Composer (Cursor CLI) n'est pas disponible sur cette machine",
};

async function isEngineAvailable(system: EngineAvailabilityReader, composerAvailable: boolean, engine: Implementer): Promise<boolean> {
  if (engine === "claude") return system.checkClaudeAvailable();
  if (engine === "composer") return composerAvailable;
  return (await system.checkCodexRuntime(true)).status === "ready";
}

/** Null when every engine of the remote cards profile can run on this host, else the first refusal. */
export async function remoteMcpProfileEngineError(
  system: EngineAvailabilityReader,
  composerAvailable: boolean,
  profile: Pick<Profile, "orchestrator" | "implementer">,
): Promise<string | null> {
  const engines = [...new Set<Implementer>([profile.orchestrator, profile.implementer])];
  for (const engine of engines) {
    if (!(await isEngineAvailable(system, composerAvailable, engine))) return ENGINE_UNAVAILABLE_MESSAGES[engine];
  }
  return null;
}

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
 * Resolve feasibility/triage using configured Claude triage defaults or pinned Codex knobs.
 * The feasibility provider falls back to the ticket orchestrator; implementation knobs are ignored.
 */
export function resolveFeasibilityExecution(ticket: Pick<Ticket, "feasibilityEngine" | "orchestrator">, role: AgentSessionRole): ResolvedExecution {
  const engine = ticket.feasibilityEngine ?? ticket.orchestrator;
  return resolveExecution(role, FEASIBILITY_ENGINE_EXECUTION[engine], { model: MODELS.triage, effort: MODELS.triageEffort });
}
