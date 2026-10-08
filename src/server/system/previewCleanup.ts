import { Resolver } from "node:dns/promises";
import { isIP } from "node:net";

import { z } from "zod";

import { runBoundedCommand, safeJsonParse } from "./boundedCommand.ts";
import REMOTE_CLEANUP_SCRIPT from "./previewCleanup.py" with { type: "text" };
import { hostnameFromSshConfig } from "./repoInspection.ts";

const COOLIFY_APP_UUID_PATTERN = /^[a-z0-9]{24}$/;
const SSH_HOST_ALIAS_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,253}$/;
const LOCAL_COOLIFY_SERVER_ADDRESS = "host.docker.internal";
const DNS_TIMEOUT_MS = 2_000;
const DNS_TRIES = 1;
export const CLEANUP_RESULT_SCHEMA = z.object({ complete: z.boolean(), reason: z.string().nullable(), retryable: z.boolean().optional() }).strict();
const SSH_OPTIONS = [
  "-T",
  "-o", "BatchMode=yes",
  "-o", "StrictHostKeyChecking=yes",
  "-o", "UpdateHostKeys=no",
  "-o", "ConnectTimeout=8",
  "-o", "ConnectionAttempts=1",
  "-o", "ServerAliveInterval=5",
  "-o", "ServerAliveCountMax=1",
  "-o", "ForwardAgent=no",
  "-o", "ClearAllForwardings=yes",
  "-o", "PermitLocalCommand=no",
  "-o", "ControlMaster=no",
  "-o", "ControlPath=none",
];

export interface PreviewCleanupOptions {
  appUuid: string;
  sshHostAlias?: string | null;
  expectedServerAddress?: string | null;
  serverUuid?: string | null;
  ownershipMarker?: string | null;
  coolifyBaseUrl?: string | null;
  removeOwnedResources?: boolean;
  deploymentUuids?: string[];
}


async function matchesPreviewServer(hostname: string | null, options: PreviewCleanupOptions): Promise<boolean> {
  if (!hostname || !options.expectedServerAddress) return false;
  if (options.expectedServerAddress !== LOCAL_COOLIFY_SERVER_ADDRESS) {
    return hostname.toLowerCase() === options.expectedServerAddress.toLowerCase();
  }
  if (!options.coolifyBaseUrl) return false;
  const coolifyUrl = new URL(options.coolifyBaseUrl);
  if (coolifyUrl.protocol !== "https:" || coolifyUrl.username || coolifyUrl.password) return false;
  const resolver = new Resolver({ timeout: DNS_TIMEOUT_MS, tries: DNS_TRIES });
  async function addressesFor(host: string): Promise<string[]> {
    if (isIP(host)) return [host];
    const results = await Promise.allSettled([resolver.resolve4(host), resolver.resolve6(host)]);
    return results.flatMap((result) => result.status === "fulfilled" ? result.value : []);
  }
  const timeout = setTimeout(() => resolver.cancel(), DNS_TIMEOUT_MS);
  try {
    const [coolifyAddresses, sshAddresses] = await Promise.all([addressesFor(coolifyUrl.hostname), addressesFor(hostname)]);
    return coolifyAddresses.length > 0 && sshAddresses.some((address) => coolifyAddresses.includes(address));
  } finally {
    clearTimeout(timeout);
  }
}

export async function verifyPreviewCleanup(options: PreviewCleanupOptions): Promise<z.infer<typeof CLEANUP_RESULT_SCHEMA>> {
  if (!COOLIFY_APP_UUID_PATTERN.test(options.appUuid)) return { complete: false, reason: "Preview cleanup requires a valid Coolify application UUID." };
  if (!options.sshHostAlias || !SSH_HOST_ALIAS_PATTERN.test(options.sshHostAlias)) return { complete: false, reason: "Configure a valid SSH host alias to verify remote preview cleanup." };
  if (!options.expectedServerAddress) return { complete: false, reason: "The Coolify deployment server address is required to verify the SSH target." };
  if (options.removeOwnedResources && !options.ownershipMarker) return { complete: false, reason: "Preview resource ownership must be recorded before remote removal." };
  const deploymentUuids = options.deploymentUuids ?? [];
  if (!deploymentUuids.every((uuid) => COOLIFY_APP_UUID_PATTERN.test(uuid))) return { complete: false, reason: "Preview cleanup requires valid recorded Coolify deployment UUIDs." };
  const encodedScript = Buffer.from(REMOTE_CLEANUP_SCRIPT).toString("base64");
  const mode = options.removeOwnedResources ? "remove" : "verify";
  const command = `sudo -n python3 -c 'import base64; exec(base64.b64decode("${encodedScript}"))' ${options.appUuid} ${mode} ${deploymentUuids.join(" ")}`;
  try {
    const sshConfig = await runBoundedCommand(["ssh", "-G", ...SSH_OPTIONS, options.sshHostAlias], process.cwd());
    const hostname = hostnameFromSshConfig(sshConfig.stdout);
    if (sshConfig.timedOut || sshConfig.exitCode !== 0 || !await matchesPreviewServer(hostname, options)) {
      return { complete: false, reason: "The SSH target does not match the recorded Coolify deployment server address." };
    }
    const result = await runBoundedCommand(["ssh", ...SSH_OPTIONS, options.sshHostAlias, command], process.cwd());
    if (result.timedOut || result.exitCode !== 0) return { complete: false, reason: "SSH preview cleanup verification failed or timed out." };
    const parsed = CLEANUP_RESULT_SCHEMA.safeParse(safeJsonParse(result.stdout.trim()));
    if (!parsed.success) return { complete: false, reason: "Remote preview cleanup returned invalid verification evidence." };
    return parsed.data;
  } catch {
    return { complete: false, reason: "SSH preview cleanup verification is unavailable." };
  }
}
