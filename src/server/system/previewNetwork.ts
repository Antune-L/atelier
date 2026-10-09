import { request } from "node:https";
import { isIP } from "node:net";
import type { LookupFunction } from "node:net";

const IPV6_FAMILY = 6;
const IPV4_FAMILY = 4;
const SUCCESS_STATUS_MIN = 200;
const SUCCESS_STATUS_MAX = 299;

function previewConnectAddress(): string | null {
  return process.env.KANBAN_PREVIEW_CONNECT_ADDRESS?.trim() || null;
}

export function previewHostResolverArgs(url: string): string[] {
  const address = previewConnectAddress();
  return address ? [`--host-resolver-rules=MAP ${new URL(url).hostname} ${address}`] : [];
}

export function isSuccessStatus(status: number | null): boolean {
  return status !== null && status >= SUCCESS_STATUS_MIN && status <= SUCCESS_STATUS_MAX;
}

export async function previewStatus(url: URL, headers: Record<string, string>, signal: AbortSignal): Promise<number | null> {
  const address = previewConnectAddress();
  if (address === null) {
    const response = await fetch(url, { headers, signal, redirect: "manual" }).catch(() => null);
    await response?.body?.cancel();
    return response?.status ?? null;
  }
  const family = isIP(address) === IPV6_FAMILY ? IPV6_FAMILY : IPV4_FAMILY;
  const lookup: LookupFunction = (_hostname, options, callback) => {
    if (options.all) callback(null, [{ address, family }]);
    else callback(null, address, family);
  };
  return new Promise((resolve) => {
    const outgoing = request(url, { headers, signal, lookup }, (response) => {
      response.resume();
      resolve(response.statusCode ?? null);
    });
    outgoing.on("error", () => resolve(null));
    outgoing.end();
  });
}
