import { regenerateMcpToken } from "./bootstrap.ts";
import type { McpSettingsMetadata, McpTokenSource } from "./mcpRpc.ts";

const MASKED_MCP_TOKEN = "••••••••";
const MCP_ENV_REGENERATION_UNAVAILABLE = "La régénération est indisponible quand KANBAN_MCP_TOKEN est défini.";

interface McpSettingsControllerDependencies {
  dataRoot: string;
  endpointUrl: string;
  tokenSource: McpTokenSource;
  getToken(): string;
  updateToken(token: string): void;
  writeClipboard(token: string): void;
  assertTrustedCaller(): void;
}

export interface McpSettingsController {
  getMcpSettings(): McpSettingsMetadata;
  copyMcpToken(): { copied: true };
  regenerateMcpToken(): McpSettingsMetadata;
}

export function createMcpSettingsController(
  dependencies: McpSettingsControllerDependencies,
): McpSettingsController {
  const getMcpSettings = (): McpSettingsMetadata => ({
    endpointUrl: dependencies.endpointUrl,
    maskedToken: MASKED_MCP_TOKEN,
    tokenSource: dependencies.tokenSource,
    canCopyToken: true,
    canRegenerateToken: dependencies.tokenSource === "managed",
    regenerationUnavailableReason:
      dependencies.tokenSource === "environment" ? MCP_ENV_REGENERATION_UNAVAILABLE : null,
  });

  return {
    getMcpSettings() {
      dependencies.assertTrustedCaller();
      return getMcpSettings();
    },
    copyMcpToken() {
      dependencies.assertTrustedCaller();
      dependencies.writeClipboard(dependencies.getToken());
      return { copied: true };
    },
    regenerateMcpToken() {
      dependencies.assertTrustedCaller();
      if (dependencies.tokenSource === "environment") throw new Error(MCP_ENV_REGENERATION_UNAVAILABLE);
      const token = regenerateMcpToken(dependencies.dataRoot);
      dependencies.updateToken(token);
      return getMcpSettings();
    },
  };
}
