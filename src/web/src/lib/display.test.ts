import { describe, expect, test } from "bun:test";

import type { CodexRuntimeStatus } from "@shared/codexCapabilities";
import { IMPLEMENTER_LABELS, ORCHESTRATOR_LABELS } from "@shared/constants";

import { agentPairLabel, effectiveWorkDurationMs, isCodexFastAvailable, ticketImplementationDuration } from "./display";

const runtime: CodexRuntimeStatus = {
  status: "ready",
  models: [
    {
      model: "gpt-6-astra",
      efforts: ["medium"],
      defaultEffort: "medium",
      serviceTiers: [{ id: "priority", name: "Fast", description: "Faster responses" }],
      defaultServiceTier: "default",
    },
    {
      model: "gpt-6-sol",
      efforts: ["medium"],
      defaultEffort: "medium",
      serviceTiers: [{ id: "default", name: "Default", description: "Standard responses" }],
      defaultServiceTier: "default",
    },
  ],
  checkedAt: 1,
  message: null,
};

describe("isCodexFastAvailable", () => {
  test("uses the selected model service-tier catalog", () => {
    expect(isCodexFastAvailable(runtime, "gpt-6-astra")).toBe(true);
    expect(isCodexFastAvailable(runtime, "gpt-6-sol")).toBe(false);
    expect(isCodexFastAvailable(runtime, "gpt-6.1-sol")).toBe(false);
  });

  test("does not expose FAST while the catalog is unavailable", () => {
    expect(isCodexFastAvailable({ ...runtime, status: "temporarily_unavailable" }, "gpt-6-astra")).toBe(false);
  });
});

describe("effectiveWorkDurationMs", () => {
  test("ends at implementationFinishedAt, not at the merge time", () => {
    expect(effectiveWorkDurationMs({ implementationStartedAt: 1_000, implementingStartedAt: 500, implementationFinishedAt: 61_000 })).toBe(60_000);
  });

  test("falls back to implementingStartedAt when implementationStartedAt is null", () => {
    expect(effectiveWorkDurationMs({ implementationStartedAt: null, implementingStartedAt: 2_000, implementationFinishedAt: 5_000 })).toBe(3_000);
  });

  test("returns null when a bound is missing or the span is not positive", () => {
    expect(effectiveWorkDurationMs({ implementationStartedAt: null, implementingStartedAt: null, implementationFinishedAt: 5_000 })).toBeNull();
    expect(effectiveWorkDurationMs({ implementationStartedAt: 1_000, implementingStartedAt: null, implementationFinishedAt: null })).toBeNull();
    expect(effectiveWorkDurationMs({ implementationStartedAt: 5_000, implementingStartedAt: null, implementationFinishedAt: 5_000 })).toBeNull();
    expect(effectiveWorkDurationMs({ implementationStartedAt: 6_000, implementingStartedAt: null, implementationFinishedAt: 5_000 })).toBeNull();
  });
});

describe("ticketImplementationDuration", () => {
  test("excludes the review/merge wait on a merged ticket", () => {
    const ticket = { implementationStartedAt: 10_000, implementingStartedAt: 5_000, implementationFinishedAt: 70_000, finishedAt: 10_000_000 };
    expect(ticketImplementationDuration(ticket)).toBe(60_000);
  });

  test("falls back to implementingStartedAt", () => {
    const ticket = { implementationStartedAt: null, implementingStartedAt: 5_000, implementationFinishedAt: 65_000, finishedAt: 10_000_000 };
    expect(ticketImplementationDuration(ticket)).toBe(60_000);
  });

  test("returns null when only finishedAt is set", () => {
    const ticket = { implementationStartedAt: 10_000, implementingStartedAt: 5_000, implementationFinishedAt: null, finishedAt: 70_000 };
    expect(ticketImplementationDuration(ticket)).toBeNull();
  });
});

describe("agentPairLabel", () => {
  test("shows the provider once when orchestrator and implementer match", () => {
    expect(agentPairLabel("claude", "claude")).toBe(ORCHESTRATOR_LABELS.claude);
    expect(agentPairLabel("codex", "codex")).toBe(ORCHESTRATOR_LABELS.codex);
  });

  test("joins distinct providers with a separator", () => {
    expect(agentPairLabel("claude", "codex")).toBe(`${ORCHESTRATOR_LABELS.claude} · ${IMPLEMENTER_LABELS.codex}`);
    expect(agentPairLabel("claude", "composer")).toBe(`${ORCHESTRATOR_LABELS.claude} · ${IMPLEMENTER_LABELS.composer}`);
  });
});
