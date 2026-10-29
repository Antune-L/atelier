import { describe, expect, test } from "bun:test";

import { summarizeProviderUsage, usagePeriodStart } from "./providerUsage.ts";
import type { UsageSource } from "./providerUsage.ts";
import type { ExecutionModelUsage, ExecutionRun } from "./schemas.ts";

const DAY = 86_400_000;
const NOW = 1_800_000_000_000;

function usage(inputTokens: number, costUsd: number | null = null): ExecutionModelUsage {
  return { inputTokens, outputTokens: 0, cacheReadTokens: 0, cacheCreationTokens: 0, costUsd };
}

function run(overrides: Partial<ExecutionRun>): ExecutionRun {
  return {
    id: "run", ownerType: "ticket", ownerId: "ticket", generationId: "generation", sessionId: null, role: "orchestrator",
    orchestrator: "codex", effectiveModel: null, effectiveEffort: null, delegateProvider: null, delegateEffectiveModel: null,
    delegateEffectiveEffort: null, delegateCodexFast: null, codexFast: false, configuredServiceTier: null, usageByModel: {},
    status: "completed", error: null, errorDetails: null, startedAt: NOW, finishedAt: NOW, ...overrides,
  };
}

function source(executions: ExecutionRun[], overrides: Partial<UsageSource> = {}): UsageSource {
  return { createdAt: NOW, legacy: {}, executions, ...overrides };
}

describe("summarizeProviderUsage", () => {
  test("Codex input buckets exclude cached tokens so totals do not count them twice", () => {
    const summary = summarizeProviderUsage([source([run({ usageByModel: {
      "gpt-6.1-sol": { inputTokens: 1_000_000, outputTokens: 10, cacheReadTokens: 900_000, cacheCreationTokens: 0, costUsd: null },
    } })])], null, "all", NOW);
    expect(summary.providers.codex.tokens).toEqual({ input: 100_000, output: 10, cacheRead: 900_000, cacheCreate: 0 });
    expect(summary.providers.codex.totalTokens).toBe(1_000_010);
    expect(summary.providers.codex.models[0]?.totalTokens).toBe(1_000_010);
  });

  test("empty sources have no usage", () => {
    const summary = summarizeProviderUsage([], null, "all", NOW);
    expect(summary.providers.claude.hasUsage).toBe(false);
    expect(summary.providers.codex.hasUsage).toBe(false);
    expect(summary.providers.codex.costUsd).toBe(0);
  });

  test("filters executions and legacy sessions by period", () => {
    const since = usagePeriodStart("7d", NOW);
    expect(since).toBe(NOW - 7 * DAY);
    const summary = summarizeProviderUsage([
      source([run({ startedAt: NOW - 10 * DAY, usageByModel: { "gpt-6.1-sol": usage(1_000) } })], {
        createdAt: NOW - 10 * DAY,
        legacy: { old: { sonnet: { input_tokens: 5, output_tokens: 0, cache_read_input_tokens: 0, cache_creation_input_tokens: 0 } } },
      }),
      source([run({ startedAt: NOW, usageByModel: { "gpt-6.1-sol": usage(2_000) } })]),
    ], since, "7d", NOW);
    expect(summary.providers.codex.totalTokens).toBe(2_000);
    expect(summary.providers.claude.hasUsage).toBe(false);
  });

  test("splits providers by model and uses Claude SDK costs as-is", () => {
    const summary = summarizeProviderUsage([source([
      run({ orchestrator: "claude", usageByModel: { "claude-opus-5-5": usage(100, 1.5), "gpt-6-luna": usage(1_000_000) } }),
    ])], null, "all", NOW);
    expect(summary.providers.claude.costUsd).toBe(1.5);
    expect(summary.providers.claude.costByType.input).toBeCloseTo(1.5, 10);
    expect(summary.providers.codex.models.map((row) => row.model)).toEqual(["gpt-6-luna"]);
    expect(summary.providers.codex.costUsd).toBeCloseTo(0.1, 10);
  });

  test("prices FAST runs in a separate row with the FAST table", () => {
    const summary = summarizeProviderUsage([source([
      run({ usageByModel: { "gpt-6-astra": usage(1_000_000) } }),
      run({ configuredServiceTier: "priority", usageByModel: { "gpt-6-astra": usage(1_000_000) } }),
    ])], null, "all", NOW);
    const rows = summary.providers.codex.models;
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({ fast: true, costUsd: 20 });
    expect(rows[1]).toMatchObject({ fast: false, costUsd: 10 });
    expect(summary.providers.codex.partial).toBe(false);
  });

  test("unpriced models make the total partial with a null row cost", () => {
    const summary = summarizeProviderUsage([source([
      run({ usageByModel: { "gpt-7-preview": usage(500), "gpt-6.1-sol": usage(1_000_000) } }),
    ])], null, "all", NOW);
    const codex = summary.providers.codex;
    expect(codex.partial).toBe(true);
    expect(codex.unpricedTokens).toBe(500);
    expect(codex.costUsd).toBeCloseTo(2, 10);
    expect(codex.models.at(-1)).toMatchObject({ model: "gpt-7-preview", costUsd: null });
  });
});
