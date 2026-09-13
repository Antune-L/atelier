import type { ElectrobunRPCSchema, RPCSchema } from "electrobun/bun";

export type McpTokenSource = "managed" | "environment";

export interface McpSettingsMetadata {
  endpointUrl: string;
  maskedToken: string;
  tokenSource: McpTokenSource;
  canCopyToken: boolean;
  canRegenerateToken: boolean;
  regenerationUnavailableReason: string | null;
}

type DesktopRequests = RPCSchema<{
  requests: {
    getMcpSettings: { params: undefined; response: McpSettingsMetadata };
    copyMcpToken: { params: undefined; response: { copied: true } };
    regenerateMcpToken: { params: undefined; response: McpSettingsMetadata };
  };
}>;

type WebviewRequests = RPCSchema<void>;

export interface AtelierDesktopRpcSchema extends ElectrobunRPCSchema {
  bun: DesktopRequests;
  webview: WebviewRequests;
}
