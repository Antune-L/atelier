import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";

import { qualityValidationRunSchema } from "@shared/quality";

import { makeTicket } from "../../../../server/testing/fixtures.ts";

import { TicketTabs } from "./TicketTabs";
import { canShowVerification, VerificationReport, VerificationTab } from "./VerificationTab";

const bullet = { summary: "La quantité recalcule le total", details: "cart.test.ts: expect(total(10, 2)).toBe(20)", evidenceId: "source-read", provider: "codex", sessionId: "independent-reviewer", artifactPath: null };
const run = qualityValidationRunSchema.parse({ id: "run", ticketId: "ticket", criteriaSnapshotId: null, kind: "combined", revision: "sha", fingerprint: "sha", configFingerprint: "config", status: "inconclusive", provider: "codex", simulated: false, startedAt: 1, completedAt: 2, environment: null, cleanupStatus: "complete", error: null, verification: { sourceFingerprint: "source", technical: { status: "passed", tested: [bullet], improvements: [] }, relevance: { status: "failed", tested: [], improvements: [{ ...bullet, summary: "Une assertion cosmétique ne couvre pas le calcul" }] }, browser: { status: "blocked", tested: [], improvements: [{ ...bullet, summary: "Configuration du navigateur manquante" }] } } });

describe("combined verification card tab", () => {
  test("new tab belongs only to a completed feature with a created PR", () => {
    expect(canShowVerification(makeTicket({ column: "done", prUrl: "https://github.com/a/b/pull/1" }))).toBe(true);
    expect(canShowVerification(makeTicket({ column: "implementing", prUrl: "https://github.com/a/b/pull/1" }))).toBe(false);
    expect(canShowVerification(makeTicket({ column: "done" }))).toBe(false);
    expect(canShowVerification(makeTicket({ kind: "review", column: "done", prUrl: "https://github.com/a/b/pull/1" }))).toBe(false);
    const html = renderToStaticMarkup(<TicketTabs tabs={["validation", "verification"]} value="verification" onChange={() => undefined} questionCount={0} />);
    expect(html).toContain("Validation");
    expect(html).toContain("Vérification");
    expect(html).toContain('aria-selected="true"');
    expect(renderToStaticMarkup(<VerificationTab ticket={makeTicket({ column: "done", prUrl: "https://github.com/a/b/pull/1" })} />)).toContain("Lancer la vérification combinée");
  });
  test("two macro bullet lists carry collapsed evidence directly underneath each bullet", () => {
    const html = renderToStaticMarkup(<VerificationReport run={run} current />);
    expect(html).toContain("Ce qui a été testé");
    expect(html).toContain("Améliorations et angles morts");
    expect(html).toContain("La quantité recalcule le total");
    expect(html).toContain("Une assertion cosmétique");
    expect(html).toContain("Bloqué");
    expect(html.match(/<details/g)).toHaveLength(3);
    expect(html).not.toContain("<details open");
    expect(html).toContain("cart.test.ts");
    expect(html).toContain("independent-reviewer");
    expect(html).toContain("Vérification non acceptée");
  });
  test("stale, simulated and interrupted evidence never reads as accepted success", () => {
    const html = renderToStaticMarkup(<VerificationReport run={{ ...run, simulated: true, status: "interrupted", evidenceAccepted: false }} current={false} />);
    expect(html).toContain("Simulation");
    expect(html).toContain("Interrompu au redémarrage");
    expect(html).toContain("Preuves périmées");
    expect(html).not.toContain("Vérification acceptée");
  });
});
