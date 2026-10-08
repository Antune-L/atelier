import { CLEANUP_RESULT_SCHEMA } from "./previewCleanup.ts";
import { safeJsonParse } from "./boundedCommand.ts";
import type { CoolifyRequest, CoolifyResponse } from "./coolifyClient.ts";

const BROKER_ORIGIN = "http://preview-broker";
const COOLIFY_TIMEOUT_MS = 45_000;
const CLEANUP_TIMEOUT_MS = 90_000;

export function previewBrokerSocket(): string | null {
  return process.env.KANBAN_PREVIEW_BROKER_SOCKET?.trim() || null;
}

export async function requestPreviewBroker(socket: string, request: CoolifyRequest): Promise<CoolifyResponse> {
  const response = await fetch(`${BROKER_ORIGIN}/coolify${request.path}`, {
    unix: socket,
    method: request.method,
    headers: { "content-type": "application/json", accept: "application/json" },
    ...(request.body === undefined ? {} : { body: JSON.stringify(request.body) }),
    signal: AbortSignal.timeout(COOLIFY_TIMEOUT_MS),
  });
  return { status: response.status, body: safeJsonParse(await response.text()) };
}

export async function confirmBrokerCleanup(socket: string, input: { appUuid: string; removeOwnedResources: boolean; deploymentUuids: string[] }) {
  try {
    const response = await fetch(`${BROKER_ORIGIN}/kanban/cleanup`, {
      unix: socket,
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ appUuid: input.appUuid, mode: input.removeOwnedResources ? "remove" : "verify", deploymentUuids: input.deploymentUuids }),
      signal: AbortSignal.timeout(CLEANUP_TIMEOUT_MS),
    });
    const parsed = CLEANUP_RESULT_SCHEMA.safeParse(safeJsonParse(await response.text()));
    if (!response.ok || !parsed.success) return { complete: false, reason: `The preview broker refused or failed the cleanup (HTTP ${response.status}).` };
    return parsed.data;
  } catch {
    return { complete: false, reason: "The preview broker is unavailable for cleanup." };
  }
}
