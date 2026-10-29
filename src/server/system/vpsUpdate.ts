import { vpsUpdateSchema } from "../../shared/vpsUpdate.ts";
import type { VpsUpdateAction, VpsUpdateStatus } from "../../shared/vpsUpdate.ts";

const SOCKET = "/run/kanban-updater/control.sock";
const TIMEOUT_MS = 15_000;

export async function requestVpsUpdate(action: VpsUpdateAction, assertion: string): Promise<VpsUpdateStatus> {
  const response = await fetch(`http://updater/${action}`, {
    unix: SOCKET,
    method: action === "start" ? "POST" : "GET",
    headers: { "Cf-Access-Jwt-Assertion": assertion },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!response.ok) throw new Error(`Updater refused the request (HTTP ${response.status}).`);
  return vpsUpdateSchema.parse(await response.json());
}
