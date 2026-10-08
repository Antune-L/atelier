import { isIP } from "node:net";

import { DEV_WEB_PORT } from "../shared/devServer.ts";

const DEFAULT_BIND_HOST = "127.0.0.1";
const DEV_WEB_HOSTNAMES = ["localhost", "127.0.0.1"] as const;

export function isLoopbackHost(hostname: string): boolean {
  const normalized = hostname.startsWith("[") && hostname.endsWith("]")
    ? hostname.slice(1, -1)
    : hostname.toLowerCase();
  if (normalized === "localhost" || normalized === "::1") return true;
  if (isIP(normalized) === 4) return normalized.split(".")[0] === "127";
  const mappedIpv4 = normalized.startsWith("::ffff:") ? normalized.slice("::ffff:".length) : "";
  return isIP(mappedIpv4) === 4 && mappedIpv4.split(".")[0] === "127";
}

export function effectivePort(url: URL): number {
  if (url.port !== "") return Number(url.port);
  return url.protocol === "https:" ? 443 : 80;
}

export function parseHost(host: string): URL | null {
  try {
    const parsed = new URL(`http://${host}`);
    if (parsed.username !== "" || parsed.password !== "" || parsed.pathname !== "/") return null;
    return parsed;
  } catch {
    return null;
  }
}

function parseOrigin(origin: string): URL | null {
  try {
    return new URL(origin);
  } catch {
    return null;
  }
}

export function resolveBindHost(): string {
  const configured = process.env.KANBAN_HOST?.trim();
  return configured ? configured : DEFAULT_BIND_HOST;
}

// NOTE: Host is only enforced on a loopback bind (DNS rebinding); requests without Origin are not browser-initiated.
export function createRequestGuard(bindHost: string, devHost: string | undefined): (request: Request) => boolean {
  const enforceHost = isLoopbackHost(bindHost);
  const devHostname = devHost?.trim().toLowerCase() || null;
  const trustedOrigins = new Set([
    ...DEV_WEB_HOSTNAMES.map((hostname) => `http://${hostname}:${DEV_WEB_PORT}`),
    ...(devHostname === null ? [] : [`https://${devHostname}`]),
  ]);
  return (request) => {
    const hostHeader = request.headers.get("host");
    const host = hostHeader === null ? null : parseHost(hostHeader);
    if (enforceHost && (host === null || !(isLoopbackHost(host.hostname) || host.hostname === devHostname))) return false;
    const origin = request.headers.get("origin");
    if (origin === null) return true;
    const parsedOrigin = parseOrigin(origin);
    if (parsedOrigin === null) return false;
    if (host !== null && parsedOrigin.host === host.host) return true;
    return trustedOrigins.has(parsedOrigin.origin);
  };
}
