import { z } from "zod";

import { createLogger } from "../logger.ts";

const MIN_PORT = 1;
const MAX_PORT = 65_535;
const MAX_AUD_LENGTH = 256;
const HOSTNAME_PATTERN = /^(?=.{1,253}$)[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$/;
const AUD_PATTERN = /^[A-Za-z0-9]+$/;
const DECIMAL_PATTERN = /^\d+$/;

export const REMOTE_MCP_ENV = {
  port: "KANBAN_REMOTE_MCP_PORT",
  hostname: "KANBAN_REMOTE_MCP_HOSTNAME",
  teamDomain: "KANBAN_REMOTE_MCP_ACCESS_TEAM_DOMAIN",
  aud: "KANBAN_REMOTE_MCP_ACCESS_AUD",
} as const;

const REQUIRED_KEYS = [REMOTE_MCP_ENV.port, REMOTE_MCP_ENV.hostname, REMOTE_MCP_ENV.teamDomain, REMOTE_MCP_ENV.aud];

const decimalSchema = (min: number, max: number) => z.string()
  .regex(DECIMAL_PATTERN)
  .transform(Number)
  .pipe(z.number().int().min(min).max(max));

const hostnameSchema = z.string().transform((value) => value.toLowerCase()).pipe(z.string().regex(HOSTNAME_PATTERN));

const remoteMcpConfigSchema = z.object({
  port: decimalSchema(MIN_PORT, MAX_PORT),
  hostname: hostnameSchema,
  teamDomain: hostnameSchema,
  aud: z.string().min(1).max(MAX_AUD_LENGTH).regex(AUD_PATTERN),
});

export type RemoteMcpConfig = z.infer<typeof remoteMcpConfigSchema>;

const log = createLogger("remote-mcp");

function envValue(env: Record<string, string | undefined>, key: string): string | undefined {
  const value = env[key]?.trim();
  return value === undefined || value === "" ? undefined : value;
}

/** Null (listener disabled) unless every required variable is set and valid. */
export function readRemoteMcpConfig(env: Record<string, string | undefined> = process.env): RemoteMcpConfig | null {
  const missing = REQUIRED_KEYS.filter((key) => envValue(env, key) === undefined);
  if (missing.length === REQUIRED_KEYS.length) return null;
  if (missing.length > 0) {
    log.warn("écoute MCP distante désactivée : configuration incomplète", { missing });
    return null;
  }
  const parsed = remoteMcpConfigSchema.safeParse({
    port: envValue(env, REMOTE_MCP_ENV.port),
    hostname: envValue(env, REMOTE_MCP_ENV.hostname),
    teamDomain: envValue(env, REMOTE_MCP_ENV.teamDomain),
    aud: envValue(env, REMOTE_MCP_ENV.aud),
  });
  if (!parsed.success) {
    const invalid = [...new Set(parsed.error.issues.map((issue) => String(issue.path[0] ?? "")))];
    log.warn("écoute MCP distante désactivée : configuration invalide", { invalid });
    return null;
  }
  return parsed.data;
}
