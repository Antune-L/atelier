import type { ExecutionRun, ExecutionUsageByModel } from "../shared/schemas.ts";
import type { ResolvedExecution } from "./agents/executionConfig.ts";
import type { Store } from "./db/store.ts";
import type { AgentSessionEvent } from "./system/agentSession.ts";

/** Keep standalone action history tied to the captured selection even after settings change. */
export async function runRecordedAction(
  store: Store,
  ownerId: string,
  execution: ResolvedExecution,
  run: (onEvent: (event: AgentSessionEvent) => void) => Promise<string>,
  ownerType: ExecutionRun["ownerType"] = "action",
): Promise<string> {
  const generationId = crypto.randomUUID();
  let sessionId: string | null = null;
  let usageByModel: ExecutionUsageByModel = {};
  store.startExecution({
    id: generationId, generationId, ownerType, ownerId, sessionId,
    role: execution.role, orchestrator: execution.provider,
    effectiveModel: execution.model, effectiveEffort: execution.effort,
    codexFast: execution.serviceTier === "fast",
  });
  const onEvent = (event: AgentSessionEvent): void => {
    if (event.type === "init") {
      sessionId = event.sessionId;
      store.attachExecutionSession({ generationId, sessionId, configuredServiceTier: event.configuredServiceTier ?? null });
    }
    if (event.type === "turn_end") {
      sessionId = event.sessionId;
      usageByModel = event.usageByModel;
      store.updateExecutionUsage(generationId, usageByModel);
    }
  };
  try {
    const result = await run(onEvent);
    store.finalizeExecution({ generationId, sessionId, status: "completed", usageByModel });
    return result;
  } catch (error) {
    store.finalizeExecution({
      generationId, sessionId, status: "failed", usageByModel,
      error: error instanceof Error ? error.message : "Échec de l’opération",
    });
    throw error;
  }
}
