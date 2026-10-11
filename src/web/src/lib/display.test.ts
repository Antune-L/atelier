import { describe, expect, test } from "bun:test";

import { autonomousStateSchema } from "@shared/autonomous";
import type { AutonomousState } from "@shared/autonomous";
import type { CodexRuntimeStatus } from "@shared/codexCapabilities";

import { AUTONOMOUS_PHASE_LABELS, autonomousSteps, effectiveWorkDurationMs, isCodexFastAvailable, ticketImplementationDuration } from "./display";

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

function autonomousState(phase: AutonomousState["phase"], corrections = 0): AutonomousState {
  return autonomousStateSchema.parse({ phase, plan: null, acceptanceSnapshotId: null, functionalSnapshotId: null, revision: null, fullRunId: null, previewRunId: null, previewId: null, startedAt: 1, deadlineAt: 2, corrections, error: null });
}

function stepStatuses(phase: AutonomousState["phase"], corrections = 0): string[] {
  return autonomousSteps(autonomousState(phase, corrections)).map((step) => step.status);
}

describe("AUTONOMOUS_PHASE_LABELS", () => {
  test("labels every autonomous phase in French", () => {
    expect(AUTONOMOUS_PHASE_LABELS).toEqual({ planning: "Planification", checks: "Contrôles locaux", preview: "Déploiement Coolify", validating: "Vérification E2E", correcting: "Correction", ready: "Prêt à livrer", delivering: "Livraison", completed: "Terminé", paused: "En pause" });
  });
});

describe("autonomousSteps", () => {
  test("returns the six ordered steps", () => {
    const steps = autonomousSteps(autonomousState("planning"));
    expect(steps.map((step) => step.key)).toEqual(["planning", "checks", "preview", "validating", "correcting", "delivering"]);
    expect(steps.map((step) => step.label)).toEqual(["Planification", "Contrôles locaux", "Déploiement Coolify", "Vérification E2E", "Correction", "Livraison"]);
  });

  test("marks the active phase current, earlier steps done and later steps pending", () => {
    expect(stepStatuses("planning")).toEqual(["current", "pending", "pending", "pending", "pending", "pending"]);
    expect(stepStatuses("checks")).toEqual(["done", "current", "pending", "pending", "pending", "pending"]);
    expect(stepStatuses("preview")).toEqual(["done", "done", "current", "pending", "pending", "pending"]);
    expect(stepStatuses("validating")).toEqual(["done", "done", "done", "current", "pending", "pending"]);
    expect(stepStatuses("correcting", 1)).toEqual(["done", "done", "done", "done", "current", "pending"]);
  });

  test("keeps the correction step done when a correction loop goes back to earlier phases", () => {
    expect(stepStatuses("checks", 1)).toEqual(["done", "current", "pending", "pending", "done", "pending"]);
    expect(stepStatuses("preview", 1)).toEqual(["done", "done", "current", "pending", "done", "pending"]);
    expect(stepStatuses("validating", 2)).toEqual(["done", "done", "done", "current", "done", "pending"]);
  });

  test("ready and delivering put delivery current and resolve the correction step", () => {
    expect(stepStatuses("ready", 0)).toEqual(["done", "done", "done", "done", "skipped", "current"]);
    expect(stepStatuses("ready", 1)).toEqual(["done", "done", "done", "done", "done", "current"]);
    expect(stepStatuses("delivering", 2)).toEqual(["done", "done", "done", "done", "done", "current"]);
    expect(stepStatuses("delivering", 0)).toEqual(["done", "done", "done", "done", "skipped", "current"]);
  });

  test("completed marks every step done, correction skipped without corrections", () => {
    expect(stepStatuses("completed", 0)).toEqual(["done", "done", "done", "done", "skipped", "done"]);
    expect(stepStatuses("completed", 1)).toEqual(["done", "done", "done", "done", "done", "done"]);
  });

  test("paused has no current step and only keeps performed corrections done", () => {
    expect(stepStatuses("paused", 0)).toEqual(["pending", "pending", "pending", "pending", "pending", "pending"]);
    expect(stepStatuses("paused", 1)).toEqual(["pending", "pending", "pending", "pending", "done", "pending"]);
  });
});
