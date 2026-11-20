import { describe, expect, test } from "bun:test";

import { installedDesktopVersion } from "../server/applicationVersion.ts";

import {
  APPLICATION_UPDATE_LABELS,
  APPLICATION_UPDATE_REASON_LABELS,
  applicationUpdateVerdict,
  availableApplicationVersion,
} from "./applicationUpdate.ts";
import type { ApplicationUpdateReason } from "./applicationUpdate.ts";
import type { ProviderUpdates } from "./providerUpdates.ts";

const SHA_HIGH = "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";
const SHA_LOW = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
const PROVIDERS = { claude: "1.0.0", codex: "1.0.0" };
const SHA_HOSTS = ["source", "vps"] satisfies Array<ProviderUpdates["host"]>;
const ALL_HOSTS = ["source", "mac", "vps", "browser"] satisfies Array<ProviderUpdates["host"]>;
const UNKNOWN_REASONS = ["simulated", "installed_unknown", "target_not_configured", "target_unknown"] satisfies ApplicationUpdateReason[];

describe("F3-AC1 — available application version picked from /api/provider-updates", () => {
  test("F3-AC1 — the Mac desktop compares the target semver, not its id", () => {
    expect(availableApplicationVersion({ host: "mac", target: { id: "1.5.0", version: "1.5.0", providers: PROVIDERS } })).toBe("1.5.0");
  });

  test("F3-AC1 — source and VPS installations compare the target commit SHA", () => {
    for (const host of SHA_HOSTS) {
      expect(availableApplicationVersion({ host, target: { id: SHA_HIGH, version: SHA_HIGH.slice(0, 7), providers: PROVIDERS } })).toBe(SHA_HIGH);
    }
  });

  test("F3-AC1 — no available version without a target or on a browser host", () => {
    for (const host of ALL_HOSTS) expect(availableApplicationVersion({ host, target: null })).toBeNull();
    expect(availableApplicationVersion({ host: "browser", target: { id: SHA_HIGH, version: "1.5.0", providers: PROVIDERS } })).toBeNull();
  });
});

describe("F3-AC2 — identical installed and available versions", () => {
  test("F3-AC2 — the label is « À jour »", () => {
    expect(APPLICATION_UPDATE_LABELS.up_to_date).toBe("À jour");
  });

  test("F3-AC2 — equal semvers on the Mac desktop are up to date", () => {
    expect(applicationUpdateVerdict({ host: "mac", simulated: false, installed: "1.4.2", available: "1.4.2" })).toEqual({ state: "up_to_date", reason: null });
  });

  test("F3-AC2 — equal SHAs on source and VPS installations are up to date", () => {
    for (const host of SHA_HOSTS) {
      expect(applicationUpdateVerdict({ host, simulated: false, installed: SHA_HIGH, available: SHA_HIGH })).toEqual({ state: "up_to_date", reason: null });
    }
  });
});

describe("F3-AC3 — different installed and available versions", () => {
  test("F3-AC3 — the label is « Mise à jour disponible »", () => {
    expect(APPLICATION_UPDATE_LABELS.update_available).toBe("Mise à jour disponible");
  });

  test("F3-AC3 — the Mac desktop compares semver, so 1.9.0 is older than 1.10.0", () => {
    expect(applicationUpdateVerdict({ host: "mac", simulated: false, installed: "1.4.2", available: "1.5.0" })).toEqual({ state: "update_available", reason: null });
    expect(applicationUpdateVerdict({ host: "mac", simulated: false, installed: "1.9.0", available: "1.10.0" })).toEqual({ state: "update_available", reason: null });
  });

  test("F3-AC3 — a SHA only counts by equality, never by ordering", () => {
    for (const host of SHA_HOSTS) {
      expect(applicationUpdateVerdict({ host, simulated: false, installed: SHA_LOW, available: SHA_HIGH })).toEqual({ state: "update_available", reason: null });
      expect(applicationUpdateVerdict({ host, simulated: false, installed: SHA_HIGH, available: SHA_LOW })).toEqual({ state: "update_available", reason: null });
    }
  });
});

describe("F3-AC4 — an unknown value never reads as up to date", () => {
  test("F3-AC4 — the label is « Vérification impossible » and every reason has a sentence", () => {
    expect(APPLICATION_UPDATE_LABELS.unknown).toBe("Vérification impossible");
    for (const reason of UNKNOWN_REASONS) expect(APPLICATION_UPDATE_REASON_LABELS[reason].trim().length).toBeGreaterThan(0);
  });

  test("F3-AC4 — the dry-run sandbox is unknown even when both values match", () => {
    for (const host of ALL_HOSTS) {
      expect(applicationUpdateVerdict({ host, simulated: true, installed: "1.4.2", available: "1.4.2" })).toEqual({ state: "unknown", reason: "simulated" });
      expect(applicationUpdateVerdict({ host, simulated: true, installed: SHA_HIGH, available: SHA_HIGH })).toEqual({ state: "unknown", reason: "simulated" });
    }
  });

  test("F3-AC4 — an unknown installed version is unknown", () => {
    for (const host of SHA_HOSTS) {
      expect(applicationUpdateVerdict({ host, simulated: false, installed: null, available: SHA_HIGH })).toEqual({ state: "unknown", reason: "installed_unknown" });
    }
    expect(applicationUpdateVerdict({ host: "mac", simulated: false, installed: null, available: "1.5.0" })).toEqual({ state: "unknown", reason: "installed_unknown" });
  });

  test("F3-AC4 — the 0.0.0 desktop placeholder is an unknown installed version", () => {
    const installed = installedDesktopVersion("0.0.0");
    expect(installed).toBeNull();
    expect(applicationUpdateVerdict({ host: "mac", simulated: false, installed, available: "0.0.0" })).toEqual({ state: "unknown", reason: "installed_unknown" });
  });

  test("F3-AC4 — installedDesktopVersion keeps only a real semver", () => {
    expect(installedDesktopVersion("1.4.2")).toBe("1.4.2");
    expect(installedDesktopVersion(undefined)).toBeNull();
    expect(installedDesktopVersion("not-a-version")).toBeNull();
  });

  test("F3-AC4 — a browser host has no configured target", () => {
    expect(applicationUpdateVerdict({ host: "browser", simulated: false, installed: SHA_HIGH, available: SHA_HIGH })).toEqual({ state: "unknown", reason: "target_not_configured" });
  });

  test("F3-AC4 — an unknown target (offline or unconfirmed) is unknown", () => {
    for (const host of SHA_HOSTS) {
      expect(applicationUpdateVerdict({ host, simulated: false, installed: SHA_HIGH, available: null })).toEqual({ state: "unknown", reason: "target_unknown" });
    }
    expect(applicationUpdateVerdict({ host: "mac", simulated: false, installed: "1.4.2", available: null })).toEqual({ state: "unknown", reason: "target_unknown" });
  });

  test("F3-AC4 — a value that is not a semver on the Mac desktop is unknown", () => {
    expect(applicationUpdateVerdict({ host: "mac", simulated: false, installed: "1.4.2", available: "not-a-version" })).toEqual({ state: "unknown", reason: "target_unknown" });
    expect(applicationUpdateVerdict({ host: "mac", simulated: false, installed: "not-a-version", available: "1.4.2" })).toEqual({ state: "unknown", reason: "installed_unknown" });
  });

  test("F3-AC4 — no combination with an unknown input is up to date", () => {
    const values = [null, "1.4.2", SHA_HIGH];
    for (const host of ALL_HOSTS) {
      for (const simulated of [true, false]) {
        for (const installed of values) {
          for (const available of values) {
            const unknownInput = simulated || host === "browser" || installed === null || available === null;
            if (!unknownInput) continue;
            const verdict = applicationUpdateVerdict({ host, simulated, installed, available });
            expect(verdict.state).toBe("unknown");
            expect(verdict.reason).not.toBeNull();
          }
        }
      }
    }
  });
});
