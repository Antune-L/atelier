export const REMOTE_MCP_SANDBOX_STATUSES = ["ok", "failed", "pending", "skipped"] as const;
export type RemoteMcpSandboxStatus = (typeof REMOTE_MCP_SANDBOX_STATUSES)[number];

let sandboxStatus: RemoteMcpSandboxStatus = "skipped";

export function getRemoteMcpSandboxStatus(): RemoteMcpSandboxStatus {
  return sandboxStatus;
}

export function setRemoteMcpSandboxStatus(status: RemoteMcpSandboxStatus): void {
  sandboxStatus = status;
}
