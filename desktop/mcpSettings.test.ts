import { afterEach, expect, test } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { createMcpSettingsController } from "./mcpSettings.ts";

const ENVIRONMENT_TOKEN = "environment-token";
const ENDPOINT_URL = "http://localhost:52817/mcp";

const temporaryDirectories: string[] = [];

function createTemporaryDirectory(): string {
  const directory = mkdtempSync(join(tmpdir(), "atelier-mcp-settings-"));
  temporaryDirectories.push(directory);
  return directory;
}

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
});

test("environment token metadata disables regeneration and copying uses the native callback", () => {
  let copiedToken = "";
  let updatedToken = "";
  const controller = createMcpSettingsController({
    dataRoot: createTemporaryDirectory(),
    endpointUrl: ENDPOINT_URL,
    tokenSource: "environment",
    getToken: () => ENVIRONMENT_TOKEN,
    updateToken: (token) => {
      updatedToken = token;
    },
    writeClipboard: (token) => {
      copiedToken = token;
    },
    assertTrustedCaller: () => undefined,
  });

  expect(controller.getMcpSettings()).toMatchObject({
    endpointUrl: ENDPOINT_URL,
    maskedToken: "••••••••",
    tokenSource: "environment",
    canCopyToken: true,
    canRegenerateToken: false,
  });
  expect(controller.copyMcpToken()).toEqual({ copied: true });
  expect(copiedToken).toBe(ENVIRONMENT_TOKEN);
  expect(() => controller.regenerateMcpToken()).toThrow("KANBAN_MCP_TOKEN");
  expect(updatedToken).toBe("");
});

test("every settings operation rejects an untrusted RPC caller", () => {
  const controller = createMcpSettingsController({
    dataRoot: createTemporaryDirectory(),
    endpointUrl: ENDPOINT_URL,
    tokenSource: "managed",
    getToken: () => ENVIRONMENT_TOKEN,
    updateToken: () => undefined,
    writeClipboard: () => undefined,
    assertTrustedCaller: () => {
      throw new Error("appel RPC refusé");
    },
  });

  expect(() => controller.getMcpSettings()).toThrow("appel RPC refusé");
  expect(() => controller.copyMcpToken()).toThrow("appel RPC refusé");
  expect(() => controller.regenerateMcpToken()).toThrow("appel RPC refusé");
});
