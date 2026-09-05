import { isCodexFastServiceTier } from "./codexCapabilities.ts";
import { summarizeSessionCosts, totalTokensOfSessions } from "./pricing.ts";
import type { ExecutionRun, SessionUsage, StatRecord, Ticket } from "./schemas.ts";

function executionTokens(run: ExecutionRun): number {
  let total = 0;
  for (const usage of Object.values(run.usageByModel)) {
    total += usage.inputTokens + usage.outputTokens + usage.cacheReadTokens + usage.cacheCreationTokens;
  }
  return total;
}

function executionCosts(runs: ExecutionRun[], legacy: SessionUsage): Pick<StatRecord, "costUsd" | "knownCostUsd" | "costPartial"> {
  const summary = summarizeSessionCosts(legacy);
  let knownCostUsd = summary.knownCostUsd;
  let hasKnown = summary.costUsd !== null || summary.partial;
  let hasUnknown = Object.keys(legacy).length > 0 && summary.costUsd === null;
  for (const run of runs) {
    if (run.codexFast || isCodexFastServiceTier(run.configuredServiceTier)) {
      if (Object.keys(run.usageByModel).length > 0) hasUnknown = true;
      continue;
    }
    for (const usage of Object.values(run.usageByModel)) {
      if (usage.costUsd === null) {
        hasUnknown = true;
      } else {
        hasKnown = true;
        knownCostUsd += usage.costUsd;
      }
    }
  }
  return {
    costUsd: hasKnown && !hasUnknown ? knownCostUsd : null,
    knownCostUsd,
    costPartial: hasKnown && hasUnknown,
  };
}

/** Include unmatched legacy sessions without counting a captured execution's usage twice. */
export function projectStatRecord(ticket: Ticket, executions: ExecutionRun[]): StatRecord {
  const latest = executions.findLast((execution) => execution.role === "orchestrator") ?? executions[executions.length - 1];
  const hasExecutionUsage = executions.some((run) => Object.keys(run.usageByModel).length > 0);
  const legacy = structuredClone(ticket.sessionUsage);
  for (const run of executions) {
    if (!run.sessionId) continue;
    const session = legacy[run.sessionId];
    if (!session) continue;
    for (const [model, usage] of Object.entries(run.usageByModel)) {
      const remaining = session[model];
      if (!remaining) continue;
      remaining.input_tokens = Math.max(0, remaining.input_tokens - usage.inputTokens);
      remaining.output_tokens = Math.max(0, remaining.output_tokens - usage.outputTokens);
      remaining.cache_read_input_tokens = Math.max(0, remaining.cache_read_input_tokens - usage.cacheReadTokens);
      remaining.cache_creation_input_tokens = Math.max(0, remaining.cache_creation_input_tokens - usage.cacheCreationTokens);
      if (Object.values(remaining).every((tokens) => tokens === 0)) delete session[model];
    }
    if (Object.keys(session).length === 0) delete legacy[run.sessionId];
  }
  const hasLegacyUsage = Object.keys(legacy).length > 0;
  const costs = executionCosts(executions, legacy);
  const totalTokens = hasExecutionUsage || hasLegacyUsage
    ? executions.reduce((total, run) => total + executionTokens(run), totalTokensOfSessions(legacy))
    : null;
  return {
    id: ticket.id,
    project: ticket.project,
    kind: ticket.kind,
    column: ticket.column,
    stage: ticket.stage,
    model: ticket.model,
    effort: ticket.effort,
    orchestrator: ticket.orchestrator,
    implementer: ticket.implementer,
    effectiveModel: latest?.effectiveModel ?? null,
    effectiveEffort: latest?.effectiveEffort ?? null,
    executions,
    createdAt: ticket.createdAt,
    implementingStartedAt: ticket.implementingStartedAt,
    implementationStartedAt: ticket.implementationStartedAt,
    finishedAt: ticket.finishedAt,
    costUsd: costs.costUsd,
    knownCostUsd: costs.knownCostUsd,
    costPartial: costs.costPartial,
    totalTokens,
  };
}
