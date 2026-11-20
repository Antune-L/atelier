import { describe, expect, spyOn, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";

import { APPLICATION_UPDATE_LABELS, APPLICATION_UPDATE_REASON_LABELS } from "@shared/applicationUpdate";
import { providerUpdatesSchema } from "@shared/providerUpdates";
import type { ProviderUpdates } from "@shared/providerUpdates";

import { ApplicationVersionStatus } from "@/components/ApplicationVersionStatus";

const INSTALLED_SHA = "0123456789abcdef0123456789abcdef01234567";
const OTHER_SHA = "fedcba9876543210fedcba9876543210fedcba98";
const SHORT_SHA_LENGTH = 7;
const PROVIDERS = { claude: "1.0.0", codex: "1.0.0" };
const HTML_ENTITIES: Record<string, string> = { "&amp;": "&", "&#x27;": "'", "&quot;": "\"", "&lt;": "<", "&gt;": ">", "&nbsp;": " " };

function updatesFixture(overrides: Partial<ProviderUpdates>): ProviderUpdates {
  return providerUpdatesSchema.parse({
    simulated: false,
    checkedAt: 0,
    rows: (["claude", "codex"] satisfies Array<ProviderUpdates["rows"][number]["provider"]>).map((provider) => ({
      provider, installed: "1.0.0", nativeVersion: null, nativeOrigin: "package", nativeError: null, latest: "1.0.0", latestAt: 0, state: "ready", message: null,
    })),
    host: "mac",
    target: null,
    available: false,
    message: null,
    maintenance: false,
    installed: null,
    ...overrides,
  });
}

function macUpdates(installed: string | null, available: string | null, simulated = false): ProviderUpdates {
  return updatesFixture({ host: "mac", simulated, installed, target: available === null ? null : { id: available, version: available, providers: PROVIDERS }, available: available !== null });
}

function shaUpdates(host: "source" | "vps", installed: string | null, available: string | null): ProviderUpdates {
  return updatesFixture({ host, installed, target: available === null ? null : { id: available, version: available.slice(0, SHORT_SHA_LENGTH), providers: PROVIDERS }, available: available !== null });
}

function visibleText(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&(?:amp|#x27|quot|lt|gt|nbsp);/g, (entity) => HTML_ENTITIES[entity] ?? entity)
    .replace(/\s+/g, " ")
    .trim();
}

function render(updates: ProviderUpdates, available?: string | null): { html: string; text: string } {
  const html = renderToStaticMarkup(available === undefined ? <ApplicationVersionStatus updates={updates} /> : <ApplicationVersionStatus updates={updates} available={available} />);
  return { html, text: visibleText(html) };
}

describe("F3-AC1 — installed and available application versions are shown", () => {
  test("F3-AC1 — the Mac desktop shows both semvers in full", () => {
    const { text } = render(macUpdates("1.4.2", "1.5.0"));
    expect(text).toContain("Application Atelier");
    expect(text).toMatch(/Installée\W*1\.4\.2/);
    expect(text).toMatch(/Disponible\W*1\.5\.0/);
  });

  test("F3-AC1 — a SHA is shortened to 7 characters with the full SHA in a title", () => {
    const { html, text } = render(shaUpdates("source", INSTALLED_SHA, OTHER_SHA));
    expect(text).toMatch(new RegExp(`Installée\\W*${INSTALLED_SHA.slice(0, SHORT_SHA_LENGTH)}`));
    expect(text).toMatch(new RegExp(`Disponible\\W*${OTHER_SHA.slice(0, SHORT_SHA_LENGTH)}`));
    expect(text).not.toContain(INSTALLED_SHA);
    expect(text).not.toContain(OTHER_SHA);
    expect(html).toContain(`title="${INSTALLED_SHA}"`);
    expect(html).toContain(`title="${OTHER_SHA}"`);
  });

  test("F3-AC1 — a missing value reads as « Inconnue »", () => {
    const { text } = render(macUpdates(null, null));
    expect(text).toMatch(/Installée\W*Inconnue/);
    expect(text).toMatch(/Disponible\W*Inconnue/);
  });
});

describe("F3-AC2 — identical versions read « À jour »", () => {
  test("F3-AC2 — equal semvers on the Mac desktop", () => {
    const { text } = render(macUpdates("1.4.2", "1.4.2"));
    expect(text).toContain(APPLICATION_UPDATE_LABELS.up_to_date);
    expect(text).toContain("À jour");
    expect(text).not.toContain("Mise à jour disponible");
    expect(text).not.toContain("Vérification impossible");
  });

  test("F3-AC2 — equal SHAs on a source checkout", () => {
    const { text } = render(shaUpdates("source", INSTALLED_SHA, INSTALLED_SHA));
    expect(text).toContain("À jour");
    expect(text).not.toContain("Mise à jour disponible");
  });
});

describe("F3-AC3 — different versions read « Mise à jour disponible »", () => {
  test("F3-AC3 — an older semver on the Mac desktop", () => {
    const { text } = render(macUpdates("1.9.0", "1.10.0"));
    expect(text).toContain("Mise à jour disponible");
    expect(text).not.toContain("À jour");
  });

  test("F3-AC3 — any different SHA, whatever its ordering", () => {
    for (const [installed, available] of [[INSTALLED_SHA, OTHER_SHA], [OTHER_SHA, INSTALLED_SHA]] satisfies Array<[string, string]>) {
      const { text } = render(shaUpdates("source", installed, available));
      expect(text).toContain("Mise à jour disponible");
      expect(text).not.toContain("À jour");
    }
  });
});

describe("F3-AC4 — an unknown value reads « Vérification impossible » with its reason", () => {
  const cases: Array<{ name: string; updates: ProviderUpdates; reason: keyof typeof APPLICATION_UPDATE_REASON_LABELS }> = [
    { name: "dry-run sandbox", updates: macUpdates("1.4.2", "1.4.2", true), reason: "simulated" },
    { name: "0.0.0 placeholder or unreadable installed version", updates: macUpdates(null, "1.4.2"), reason: "installed_unknown" },
    { name: "browser host without installer", updates: updatesFixture({ host: "browser", installed: INSTALLED_SHA, target: { id: INSTALLED_SHA, version: "1.4.2", providers: PROVIDERS } }), reason: "target_not_configured" },
    { name: "offline or unconfirmed target", updates: shaUpdates("vps", INSTALLED_SHA, null), reason: "target_unknown" },
  ];
  for (const { name, updates, reason } of cases) {
    test(`F3-AC4 — ${name}`, () => {
      const { text } = render(updates);
      expect(text).toContain("Vérification impossible");
      expect(text).toContain(APPLICATION_UPDATE_REASON_LABELS[reason]);
      expect(text).not.toContain("À jour");
    });
  }
});

describe("F3-AC5 — the VPS update dialog shows the verdict against its confirmed target", () => {
  test("F3-AC5 — installed revision equal to the confirmed target reads « À jour »", () => {
    const { text } = render(shaUpdates("vps", INSTALLED_SHA, null), INSTALLED_SHA);
    expect(text).toContain("À jour");
    expect(text).not.toContain("Vérification impossible");
  });

  test("F3-AC5 — a different confirmed target reads « Mise à jour disponible »", () => {
    const { text } = render(shaUpdates("vps", INSTALLED_SHA, null), OTHER_SHA);
    expect(text).toContain("Mise à jour disponible");
    expect(text).toMatch(new RegExp(`Disponible\\W*${OTHER_SHA.slice(0, SHORT_SHA_LENGTH)}`));
  });

  test("F3-AC5 — the confirmed target overrides the response target", () => {
    const { text } = render(shaUpdates("vps", INSTALLED_SHA, INSTALLED_SHA), OTHER_SHA);
    expect(text).toContain("Mise à jour disponible");
    expect(text).not.toContain("À jour");
  });

  test("F3-AC5 — no confirmed target reads « Vérification impossible »", () => {
    const { text } = render(shaUpdates("vps", INSTALLED_SHA, INSTALLED_SHA), null);
    expect(text).toContain("Vérification impossible");
    expect(text).not.toContain("À jour");
  });
});

describe("F3-AC6 — rendering the status has no side effect", () => {
  test("F3-AC6 — rendering never sends a request", () => {
    const fetchSpy = spyOn(globalThis, "fetch").mockRejectedValue(new Error("No request is expected while rendering."));
    try {
      render(macUpdates("1.4.2", "1.5.0"));
      render(shaUpdates("vps", INSTALLED_SHA, OTHER_SHA), OTHER_SHA);
      expect(fetchSpy).not.toHaveBeenCalled();
    } finally {
      fetchSpy.mockRestore();
    }
  });
});
