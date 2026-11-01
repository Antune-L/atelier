import { appUpdateTargetSchema } from "../../shared/providerUpdates.ts";
import type { AppUpdateTarget } from "../../shared/providerUpdates.ts";
import { vpsUpdateSchema } from "../../shared/vpsUpdate.ts";
import type { VpsUpdateAction, VpsUpdateStatus } from "../../shared/vpsUpdate.ts";

const SOCKET = "/run/kanban-updater/control.sock";
const TIMEOUT_MS = 15_000;

export async function requestVpsUpdate(action: VpsUpdateAction, assertion: string, target?: string): Promise<VpsUpdateStatus> {
  const response = await fetch(`http://updater/${action}`, {
    unix: SOCKET,
    method: action === "start" ? "POST" : "GET",
    headers: { "Cf-Access-Jwt-Assertion": assertion, ...(target ? { "x-kanban-target": target } : {}) },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!response.ok) throw new Error(`Updater refused the request (HTTP ${response.status}).`);
  return vpsUpdateSchema.parse(await response.json());
}

export async function requestVpsUpdateTarget(assertion: string): Promise<AppUpdateTarget> {
  const response = await fetch("http://updater/target", { unix: SOCKET, headers: { "Cf-Access-Jwt-Assertion": assertion }, signal: AbortSignal.timeout(TIMEOUT_MS) });
  if (!response.ok) throw new Error("Target metadata unavailable. The root updater may require an operator upgrade or source access.");
  return appUpdateTargetSchema.parse(await response.json());
}
