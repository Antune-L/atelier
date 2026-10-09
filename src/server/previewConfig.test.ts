import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { PreviewConfig } from "./previewConfig.ts";

let dir: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "atelier-preview-config-"));
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

describe("PreviewConfig preview auth", () => {
  test("reports no preview auth by default", () => {
    const config = new PreviewConfig(dir, { dryRun: true });
    expect(config.getSettings()).toMatchObject({ previewAuthUsername: null, previewAuthConfigured: false });
  });

  test("exposes the username but never the password", () => {
    const config = new PreviewConfig(dir, { dryRun: true });
    config.updateSettings({ previewAuthUsername: "alice", previewAuthPassword: "s3cret-pass" });
    const settings = config.getSettings();
    expect(settings).toMatchObject({ previewAuthUsername: "alice", previewAuthConfigured: true });
    const serialized = JSON.stringify(settings);
    expect(serialized).not.toContain("s3cret-pass");
    expect(serialized).not.toContain("previewAuthPassword");
  });

  test("keeps the stored password when only the username changes", () => {
    const config = new PreviewConfig(dir, { dryRun: true });
    config.updateSettings({ previewAuthUsername: "alice", previewAuthPassword: "s3cret-pass" });
    config.updateSettings({ previewAuthUsername: "bob" });
    expect(config.getSettings()).toMatchObject({ previewAuthUsername: "bob", previewAuthConfigured: true });
    expect(config.getPreviewAuth()).toEqual({ username: "bob", password: "s3cret-pass" });
  });
});
