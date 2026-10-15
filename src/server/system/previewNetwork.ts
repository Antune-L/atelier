import { randomBytes } from "node:crypto";
import { request } from "node:https";
import { isIP } from "node:net";
import type { LookupFunction } from "node:net";

const IPV6_FAMILY = 6;
const IPV4_FAMILY = 4;
const SUCCESS_STATUS_MIN = 200;
const SUCCESS_STATUS_MAX = 299;
const HTTP_SWITCHING_PROTOCOLS = 101;
const WEBSOCKET_VERSION = "13";
const WEBSOCKET_KEY_BYTES = 16;

function previewConnectAddress(): string | null {
  return process.env.KANBAN_PREVIEW_CONNECT_ADDRESS?.trim() || null;
}

function pinnedLookup(): LookupFunction | null {
  const address = previewConnectAddress();
  if (address === null) return null;
  const family = isIP(address) === IPV6_FAMILY ? IPV6_FAMILY : IPV4_FAMILY;
  return (_hostname, options, callback) => {
    if (options.all) callback(null, [{ address, family }]);
    else callback(null, address, family);
  };
}

export function previewHostResolverArgs(url: string): string[] {
  const address = previewConnectAddress();
  return address ? [`--host-resolver-rules=MAP ${new URL(url).hostname} ${address}`] : [];
}

export function previewBasicAuthorization(auth: { username: string; password: string }): string {
  return `Basic ${Buffer.from(`${auth.username}:${auth.password}`).toString("base64")}`;
}

export function previewWebSocketOpens(url: URL, headers: Record<string, string>, timeoutMs: number): Promise<boolean> {
  const upgradeHeaders = { ...headers, connection: "Upgrade", upgrade: "websocket", "sec-websocket-version": WEBSOCKET_VERSION, "sec-websocket-key": randomBytes(WEBSOCKET_KEY_BYTES).toString("base64") };
  return new Promise((resolve, reject) => {
    const signal = AbortSignal.timeout(timeoutMs);
    const outgoing = request(url, { headers: upgradeHeaders, signal, lookup: pinnedLookup() ?? undefined });
    outgoing.on("upgrade", (_response, socket) => {
      socket.destroy();
      resolve(true);
    });
    outgoing.on("response", (response) => {
      response.destroy();
      if (response.statusCode === HTTP_SWITCHING_PROTOCOLS) resolve(true);
      else reject(new Error(`${url.pathname}: the WebSocket upgrade answered HTTP ${response.statusCode ?? "without status"}.`));
    });
    outgoing.on("error", (error) => {
      if (signal.aborted) reject(new Error(`${url.pathname}: the WebSocket upgrade did not answer within ${timeoutMs} ms.`));
      else reject(new Error(`${url.pathname}: the WebSocket upgrade failed (${error.message}).`));
    });
    outgoing.end();
  });
}

export function isSuccessStatus(status: number | null): boolean {
  return status !== null && status >= SUCCESS_STATUS_MIN && status <= SUCCESS_STATUS_MAX;
}

export async function previewStatus(url: URL, headers: Record<string, string>, signal: AbortSignal): Promise<number | null> {
  const lookup = pinnedLookup();
  if (lookup === null) {
    const response = await fetch(url, { headers, signal, redirect: "manual" }).catch(() => null);
    await response?.body?.cancel();
    return response?.status ?? null;
  }
  return new Promise((resolve) => {
    const outgoing = request(url, { headers, signal, lookup }, (response) => {
      response.resume();
      resolve(response.statusCode ?? null);
    });
    outgoing.on("error", () => resolve(null));
    outgoing.end();
  });
}
