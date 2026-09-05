import { describe, expect, test } from "bun:test";

import type { ExecutionRun, StatRecord } from "@shared/schemas";

import { meanDurationByModel, summarizeCodexTiers } from "./stats";

function record(executions: ExecutionRun[]): StatRecord {
  return {
    id: "ticket-1",
    project: "project",
    kind: "feature",
    column: "done",
    stage: "done",
    model: null,
    effort: null,
    orchestrator: "codex",
    implementer: "codex",
    effectiveModel: executions[executions.length - 1]?.effectiveModel ?? null,
    effectiveEffort: executions[executions.length - 1]?.effectiveEffort ?? null,
    executions,
    createdAt: 0,
    implementingStartedAt: 0,
    implementationStartedAt: 0,
    finishedAt: 10_000,
    costUsd: null,
    knownCostUsd: 0,
    costPartial: false,
    totalTokens: null,
  };
}

describe("effective execution statistics", () => {
  test("uses each generation duration instead of duplicating ticket duration", () => {
    const execution: ExecutionRun = {
      id: "run-1",
      ownerType: "ticket",
      ownerId: "ticket-1",
      generationId: "generation-1",
      sessionId: "session-1",
      role: "orchestrator",
      orchestrator: "codex",
      effectiveModel: "gpt-5.6-sol",
      effectiveEffort: "low",
      delegateProvider: null,
      delegateEffectiveModel: null,
      delegateEffectiveEffort: null,
      delegateCodexFast: null,
      codexFast: false,
      configuredServiceTier: "default",
      usageByModel: {},
      status: "completed",
      error: null,
      startedAt: 2_000,
      finishedAt: 3_500,
    };
    expect(meanDurationByModel([record([execution])])).toEqual([
      { key: "gpt-5.6-sol", label: "5.6 Sol", meanMs: 1_500, count: 1 },
    ]);
  });

  test("distinguishes requested, confirmed and unknown Codex tiers", () => {
    const base = record([]);
    const execution = (id: string, codexFast: boolean, configuredServiceTier: string | null): ExecutionRun => ({
      id,
      ownerType: "ticket",
      ownerId: "ticket-1",
      generationId: id,
      sessionId: null,
      role: "orchestrator",
      orchestrator: "codex",
      effectiveModel: "gpt-5.6-sol",
      effectiveEffort: "medium",
      delegateProvider: null,
      delegateEffectiveModel: null,
      delegateEffectiveEffort: null,
      delegateCodexFast: null,
      codexFast,
      configuredServiceTier,
      usageByModel: {},
      status: "completed",
      error: null,
      startedAt: 0,
      finishedAt: 1,
    });
    expect(summarizeCodexTiers([{ ...base, executions: [
      execution("fast", true, "fast"),
      execution("default", false, "default"),
      execution("unknown", true, null),
      execution("priority", false, "priority"),
      execution("flex", false, "flex"),
    ] }])).toEqual({
      total: 5,
      requestedFast: 2,
      requestedDefault: 3,
      confirmedFast: 2,
      confirmedDefault: 1,
      confirmedUnknown: 1,
      confirmedOther: [{ tier: "flex", count: 1 }],
    });
  });
});
