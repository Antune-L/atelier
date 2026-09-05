import { describe, expect, test } from "bun:test";

import type { CodexRuntimeStatus } from "../../shared/codexCapabilities.ts";
import { MODELS } from "../config.ts";
import { makeTicket } from "../testing/fixtures.ts";

import { assertExecutionAvailable, resolveExecution, resolveFeasibilityExecution, resolveTicketExecution } from "./executionConfig.ts";

function capabilityReader(status: CodexRuntimeStatus): {
  checkCodexRuntime(refresh?: boolean): Promise<CodexRuntimeStatus>;
  refreshes: boolean[];
} {
  const refreshes: boolean[] = [];
  return {
    refreshes,
    checkCodexRuntime: async (refresh = false) => {
      refreshes.push(refresh);
      return status;
    },
  };
}

const READY_CODEX: CodexRuntimeStatus = {
  status: "ready",
  models: [{
    model: "gpt-5.6-sol",
    efforts: ["low", "medium"],
    defaultEffort: "medium",
    serviceTiers: [{ id: "priority", name: "Fast", description: "Mode rapide" }],
    defaultServiceTier: null,
  }],
  checkedAt: 1,
  message: null,
};

describe("resolveExecution", () => {
  test("defaults an action without settings to Claude", () => {
    expect(resolveExecution("one-shot", undefined, { model: "sonnet", effort: "low" })).toEqual({
      provider: "claude",
      model: "sonnet",
      effort: "low",
      serviceTier: "default",
      role: "one-shot",
    });
  });

  test("uses the selected Codex knobs without consulting Claude defaults", () => {
    expect(
      resolveExecution(
        "one-shot",
        { orchestrator: "codex", codexModel: "gpt-5.6-sol", codexEffort: "ultra" },
        { model: "haiku", effort: "low" },
      ),
    ).toEqual({ provider: "codex", model: "gpt-5.6-sol", effort: "ultra", serviceTier: "default", role: "one-shot" });
  });

  test("maps the explicit fast switch to the fast service tier", () => {
    expect(resolveExecution(
      "one-shot",
      { orchestrator: "codex", codexModel: "gpt-5.6-sol", codexEffort: "medium", codexFast: true },
      { model: "haiku", effort: "low" },
    ).serviceTier).toBe("fast");
  });
});

describe("resolveTicketExecution", () => {
  test("captures ticket Codex overrides", () => {
    const ticket = makeTicket({ orchestrator: "codex", codexModel: "gpt-6-astra", codexEffort: "max" });
    expect(resolveTicketExecution(ticket, "triage", { model: MODELS.triage, effort: MODELS.triageEffort })).toEqual({
      provider: "codex",
      model: "gpt-6-astra",
      effort: "max",
      serviceTier: "default",
      role: "triage",
    });
  });

  test("uses role defaults for an inherited Claude ticket", () => {
    const ticket = makeTicket({ orchestrator: "claude", model: null, effort: null });
    expect(resolveTicketExecution(ticket, "triage", { model: "sonnet", effort: "low" })).toEqual({
      provider: "claude",
      model: "sonnet",
      effort: "low",
      serviceTier: "default",
      role: "triage",
    });
  });
});

describe("resolveFeasibilityExecution", () => {
  test("falls back to the ticket knobs when no engine is pinned", () => {
    const ticket = makeTicket({ feasibilityEngine: null, orchestrator: "codex", codexModel: "gpt-6-astra", codexEffort: "max" });
    expect(resolveFeasibilityExecution(ticket, "feasibility", { model: "sonnet", effort: "low" })).toEqual({
      provider: "codex",
      model: "gpt-6-astra",
      effort: "max",
      serviceTier: "default",
      role: "feasibility",
    });
  });

  test("pins Sonnet on Claude regardless of the ticket orchestrator", () => {
    const ticket = makeTicket({ feasibilityEngine: "sonnet", orchestrator: "codex", codexModel: "gpt-6-astra", codexEffort: "max" });
    expect(resolveFeasibilityExecution(ticket, "triage", { model: "opus", effort: "low" })).toEqual({
      provider: "claude",
      model: "sonnet",
      effort: "low",
      serviceTier: "default",
      role: "triage",
    });
  });

  test("pins Luna on Codex regardless of the ticket orchestrator", () => {
    const ticket = makeTicket({ feasibilityEngine: "luna", orchestrator: "claude", model: "opus", effort: "high" });
    expect(resolveFeasibilityExecution(ticket, "triage", { model: "opus", effort: "high" })).toEqual({
      provider: "codex",
      model: "gpt-5.6-luna",
      effort: "medium",
      serviceTier: "fast",
      role: "triage",
    });
  });
});

describe("assertExecutionAvailable", () => {
  test("does not probe Claude launches", async () => {
    const reader = capabilityReader(READY_CODEX);
    await assertExecutionAvailable(reader, { provider: "claude", model: "sonnet", effort: "low", serviceTier: "default" });
    expect(reader.refreshes).toEqual([]);
  });

  test("accepts only a freshly advertised Codex model and effort", async () => {
    const reader = capabilityReader(READY_CODEX);
    await assertExecutionAvailable(reader, { provider: "codex", model: "gpt-5.6-sol", effort: "medium", serviceTier: "default" });
    expect(reader.refreshes).toEqual([true]);

    await expect(
      assertExecutionAvailable(reader, { provider: "codex", model: "gpt-6-astra", effort: "medium", serviceTier: "default" }),
    ).rejects.toThrow("Modèle Codex indisponible pour ce compte : gpt-6-astra");
    await expect(
      assertExecutionAvailable(reader, { provider: "codex", model: "gpt-5.6-sol", effort: "ultra", serviceTier: "default" }),
    ).rejects.toThrow("Effort Codex indisponible pour gpt-5.6-sol : ultra");
  });

  test("rejects fast when the selected runtime model does not advertise it", async () => {
    const reader = capabilityReader({
      ...READY_CODEX,
      models: [{ ...READY_CODEX.models[0]!, serviceTiers: [] }],
    });
    await expect(assertExecutionAvailable(reader, {
      provider: "codex",
      model: "gpt-5.6-sol",
      effort: "medium",
      serviceTier: "fast",
    })).rejects.toThrow("Mode FAST indisponible");
  });

  test("surfaces authentication and runtime availability without fallback", async () => {
    const unauthenticated = capabilityReader({
      status: "unauthenticated",
      models: [],
      checkedAt: 1,
      message: "Connexion Codex requise",
    });
    await expect(
      assertExecutionAvailable(unauthenticated, { provider: "codex", model: "gpt-5.6-sol", effort: "medium", serviceTier: "default" }),
    ).rejects.toThrow("Connexion Codex requise");

    const unavailable = capabilityReader({
      status: "temporarily_unavailable",
      models: [],
      checkedAt: 1,
      message: "Service Codex injoignable",
    });
    await expect(
      assertExecutionAvailable(unavailable, { provider: "codex", model: "gpt-5.6-sol", effort: "medium", serviceTier: "default" }),
    ).rejects.toThrow("Service Codex injoignable");
  });
});


test("FAST launches accept the real priority catalog and retain the fast request value", async () => {
  const reader = capabilityReader(READY_CODEX);
  const execution = resolveExecution("one-shot", {
    orchestrator: "codex", codexModel: "gpt-5.6-sol", codexEffort: "medium", codexFast: true,
  }, { model: "sonnet", effort: "low" });
  await assertExecutionAvailable(reader, execution);
  expect(execution.serviceTier).toBe("fast");
  expect(reader.refreshes).toEqual([true]);
});
