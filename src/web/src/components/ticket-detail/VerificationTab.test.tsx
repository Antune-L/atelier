import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";

import { qualityValidationRunSchema } from "@shared/quality";

import { makeTicket } from "../../../../server/testing/fixtures.ts";

import { TicketTabs } from "./TicketTabs";
import { canShowVerification, LaunchLabel, toggleKey, VerificationProgress, VerificationReport, VerificationTab } from "./VerificationTab";

const bullet = { summary: "La quantité recalcule le total", details: "cart.test.ts: expect(total(10, 2)).toBe(20)", evidenceId: "source-read", provider: "codex", sessionId: "independent-reviewer", artifactPath: null };
const run = qualityValidationRunSchema.parse({ id: "run", ticketId: "ticket", criteriaSnapshotId: null, kind: "combined", revision: "sha", fingerprint: "sha", configFingerprint: "config", status: "inconclusive", provider: "codex", simulated: false, startedAt: 1, completedAt: 2, environment: null, cleanupStatus: "complete", error: null, verification: { sourceFingerprint: "source", technical: { status: "passed", tested: [bullet], improvements: [] }, relevance: { status: "failed", tested: [], improvements: [{ ...bullet, summary: "Une assertion cosmétique ne couvre pas le calcul" }] }, browser: { status: "blocked", tested: [], improvements: [{ ...bullet, summary: "Configuration du navigateur manquante" }] } } });

describe("combined verification card tab", () => {
  test("new tab belongs only to a completed feature with a created PR", () => {
    expect(canShowVerification(makeTicket({ column: "done", prUrl: "https://github.com/a/b/pull/1" }))).toBe(true);
    expect(canShowVerification(makeTicket({ column: "implementing", prUrl: "https://github.com/a/b/pull/1" }))).toBe(false);
    expect(canShowVerification(makeTicket({ column: "done" }))).toBe(false);
    expect(canShowVerification(makeTicket({ kind: "review", column: "done", prUrl: "https://github.com/a/b/pull/1" }))).toBe(false);
    const html = renderToStaticMarkup(<TicketTabs tabs={["validation", "verification"]} value="verification" onChange={() => undefined} questionCount={0} />);
    expect(html).toContain("Contrôles");
    expect(html).toContain("Documents");
    expect(html).toContain('aria-selected="true"');
    expect(renderToStaticMarkup(<VerificationTab ticket={makeTicket({ column: "done", prUrl: "https://github.com/a/b/pull/1" })} />)).toContain("Lancer le contrôle croisé");
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
  test("a running verification shows an animated in-progress indicator", () => {
    const html = renderToStaticMarkup(<VerificationReport run={{ ...run, status: "running" }} current />);
    expect(html).toContain("animate-spin");
    expect(html).toContain("En cours");
  });
  test("starting or running verification animates the launch button and shows a live status banner", () => {
    expect(renderToStaticMarkup(<LaunchLabel busy={false} />)).toBe("Lancer le contrôle croisé");
    const busy = renderToStaticMarkup(<LaunchLabel busy />);
    expect(busy).toContain("animate-spin");
    expect(busy).toContain("Vérification en cours…");
    expect(renderToStaticMarkup(<VerificationProgress pending={false} active={false} />)).toBe("");
    const starting = renderToStaticMarkup(<VerificationProgress pending active={false} />);
    expect(starting).toContain('role="status"');
    expect(starting).toContain('aria-live="polite"');
    expect(starting).toContain("animate-spin");
    expect(starting).toContain("Démarrage de la vérification…");
    const running = renderToStaticMarkup(<VerificationProgress pending={false} active />);
    expect(running).toContain("Vérification en cours : tests");
    expect(running).not.toContain("Démarrage");
  });
  test("expand and collapse all controls appear only when there are bullets", () => {
    const html = renderToStaticMarkup(<VerificationReport run={run} current />);
    expect(html).toContain("Tout déplier");
    expect(html).toContain("Tout replier");
    expect(html).not.toContain("<details open");
    const empty = qualityValidationRunSchema.parse({ ...run, verification: { sourceFingerprint: "source", technical: { status: "pending", tested: [], improvements: [] }, relevance: { status: "pending", tested: [], improvements: [] }, browser: { status: "pending", tested: [], improvements: [] } } });
    const bare = renderToStaticMarkup(<VerificationReport run={empty} current />);
    expect(bare).not.toContain("Tout déplier");
    expect(bare).not.toContain("Tout replier");
  });
  test("toggling a key keeps the set in sync and reuses it when unchanged", () => {
    const keys = new Set(["a"]);
    expect(toggleKey(keys, "a", true)).toBe(keys);
    expect([...toggleKey(keys, "b", true)]).toEqual(["a", "b"]);
    expect([...toggleKey(keys, "a", false)]).toEqual([]);
  });
});
