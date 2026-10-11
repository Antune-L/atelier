import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";

import { autonomousStateSchema } from "@shared/autonomous";
import type { AutonomousState } from "@shared/autonomous";

import { makeTicket } from "../../../server/testing/fixtures.ts";

import { TicketConfigSummary } from "./TicketConfigSummary";

function state(phase: AutonomousState["phase"], corrections: number, error: string | null = null): AutonomousState {
  return autonomousStateSchema.parse({ phase, plan: null, acceptanceSnapshotId: null, functionalSnapshotId: null, revision: null, fullRunId: null, previewRunId: null, previewId: null, startedAt: 1, deadlineAt: 2, corrections, error });
}

const STEP_LABELS = ["Planification", "Contrôles locaux", "Déploiement Coolify", "Vérification E2E", "Correction", "Livraison"];

function stepStatuses(html: string): string[] {
  return [...html.matchAll(/data-status="(done|current|pending|skipped)"/g)].map((match) => match[1] ?? "");
}

describe("TicketConfigSummary Devin stepper", () => {
  test("lists the six steps with their status while correcting", () => {
    const html = renderToStaticMarkup(<TicketConfigSummary ticket={makeTicket({ autonomous: true, autonomousState: state("correcting", 1, "La vérification E2E du panier a échoué.") })} />);
    expect(html).toContain('aria-label="Étapes Devin"');
    for (const label of STEP_LABELS) expect(html).toContain(label);
    expect(stepStatuses(html)).toEqual(["done", "done", "done", "done", "current", "pending"]);
    expect(html).toContain("1 correction");
    expect(html).toContain("Blocage autonome");
    expect(html).toContain("La vérification E2E du panier a échoué.");
  });

  test("paused ticket shows the pause status and no current step", () => {
    const html = renderToStaticMarkup(<TicketConfigSummary ticket={makeTicket({ autonomous: true, autonomousState: state("paused", 1, "Le délai autonome est dépassé.") })} />);
    expect(html).toContain("En pause");
    expect(stepStatuses(html)).toEqual(["pending", "pending", "pending", "pending", "done", "pending"]);
    expect(html).toContain("Le délai autonome est dépassé.");
  });

  test("completed ticket without corrections marks correction as skipped", () => {
    const html = renderToStaticMarkup(<TicketConfigSummary ticket={makeTicket({ autonomous: true, autonomousState: state("completed", 0) })} />);
    expect(html).toContain("Terminé");
    expect(stepStatuses(html)).toEqual(["done", "done", "done", "done", "skipped", "done"]);
  });

  test("autonomous ticket without state announces an unfrozen plan", () => {
    const html = renderToStaticMarkup(<TicketConfigSummary ticket={makeTicket({ autonomous: true, autonomousState: null })} />);
    expect(html).toContain("Plan non encore figé");
    expect(html).not.toContain("Étapes Devin");
  });

  test("non-autonomous ticket has no stepper", () => {
    const html = renderToStaticMarkup(<TicketConfigSummary ticket={makeTicket({ autonomous: false })} />);
    expect(html).not.toContain("Étapes Devin");
  });
});
