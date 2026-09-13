import { Electroview } from "electrobun/view";

import type {
  AtelierDesktopRpcSchema,
  McpSettingsMetadata,
} from "../../../../desktop/mcpRpc.ts";

interface McpSettingsClient {
  getSettings: () => Promise<McpSettingsMetadata>;
  copyToken: () => Promise<void>;
  regenerateToken: () => Promise<McpSettingsMetadata>;
}

let client: McpSettingsClient | null | undefined;

function createMcpSettingsClient(): McpSettingsClient | null {
  if (window.__electrobun == null || window.__electrobunBunBridge == null) return null;

  const rpc = Electroview.defineRPC<AtelierDesktopRpcSchema>({ handlers: {} });
  new Electroview({ rpc });

  return {
    getSettings: () => rpc.request.getMcpSettings(),
    copyToken: async () => {
      await rpc.request.copyMcpToken();
    },
    regenerateToken: () => rpc.request.regenerateMcpToken(),
  };
}

export function getMcpSettingsClient(): McpSettingsClient | null {
  if (client === undefined) client = createMcpSettingsClient();
  return client;
}
