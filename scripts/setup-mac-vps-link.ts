import { chmodSync, existsSync, lstatSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { homedir, userInfo } from "node:os";
import { dirname, join } from "node:path";
import { parseArgs } from "node:util";

import { z } from "zod";

import { safeJsonParse } from "../src/server/system/boundedCommand.ts";
import type { BoundedCommandResult } from "../src/server/system/boundedCommand.ts";
import { NON_INTERACTIVE_SSH_OPTIONS } from "../src/server/system/previewCleanup.ts";
import { EXIT_BRIDGE_USAGE, EXIT_NOT_EXECUTABLE, EXIT_NOT_FOUND, runVpsBridge, VPS_BRIDGE_PROGRAM_VERSION_ARG, VPS_BRIDGE_REMOTE_PROGRAM } from "../src/server/system/vpsBridge.ts";
import { boardNameSchema, dnsHostnameSchema, otherBoardUrlSchema, sshHostAliasSchema } from "../src/shared/boardLink.ts";
import { DEFAULT_PORT } from "../src/shared/constants.ts";
import { appSettingsSchema } from "../src/shared/schemas.ts";
import type { UpdateAppSettingsInput } from "../src/shared/schemas.ts";
import { BRIDGE_OPS, BRIDGE_PROTOCOL_VERSION, bridgeVersionOutputSchema } from "../src/shared/vpsBridge.ts";

import { EXIT_USAGE, finish, parseTunnelToken, report, run, shortDetail, sleep } from "./lib/setupReport.ts";

const DEFAULT_API_URL = `http://127.0.0.1:${DEFAULT_PORT}`;
const DATA_ROOT = join(homedir(), "Library", "Application Support", "kanban-agents");
const DEFAULT_TOKEN_FILE = join(DATA_ROOT, "cloudflared-tunnel.token");
const PRIVATE_FILE_MODE = 0o600;
const PRIVATE_DIR_MODE = 0o700;
const PUBLIC_FILE_MODE = 0o644;
const PERMISSION_BITS = 0o777;
const CLOUDFLARED = "cloudflared";
const BREW_TIMEOUT_MS = 600_000;
const MIN_CLOUDFLARED_VERSION = [2025, 4, 0] as const;
const CLOUDFLARED_VERSION_PATTERN = /(\d{4})\.(\d+)\.(\d+)/;
const LAUNCH_AGENT_LABEL = "com.kanban-agents.cloudflared";
const LAUNCH_AGENTS_DIR = join(homedir(), "Library", "LaunchAgents");
const LAUNCH_AGENT_PATH = join(LAUNCH_AGENTS_DIR, `${LAUNCH_AGENT_LABEL}.plist`);
const CONNECTOR_LOG_PATH = join(homedir(), "Library", "Logs", "kanban-agents-cloudflared.log");
const OFFICIAL_SERVICE_PLISTS = [
  join(LAUNCH_AGENTS_DIR, "com.cloudflare.cloudflared.plist"),
  "/Library/LaunchDaemons/com.cloudflare.cloudflared.plist",
];
const METRICS_ADDRESS = "127.0.0.1:20249";
const READY_ATTEMPTS = 15;
const RETRY_DELAY_MS = 2_000;
const BOOTSTRAP_ATTEMPTS = 3;
const HTTP_TIMEOUT_MS = 10_000;
const CURL_MAX_TIME_SECONDS = "15";
const HTTP_OK = "200";
const HTTP_FORBIDDEN = "403";
const REDIRECT_CODES = new Set(["301", "302", "303", "307", "308"]);
const ACCESS_LOGIN_HOST_SUFFIX = ".cloudflareaccess.com";
const ACCESS_LOGIN_PATH_PREFIX = "/cdn-cgi/access/login";
const VPS_SERVICE_GROUP = "kanban";
const VPS_UI_SOCKET = "/run/kanban/ui.sock";
const VPS_API_BASE = "http://localhost";
const VPS_CURL = `curl -s --max-time 10 --unix-socket ${VPS_UI_SOCKET} -H 'Host: localhost'`;
const VPS_HEALTH_COMMAND = `${VPS_CURL} -o /dev/null -w '%{http_code}' ${VPS_API_BASE}/health`;
const VPS_SETTINGS_GET_COMMAND = `${VPS_CURL} -f ${VPS_API_BASE}/api/settings`;
const VPS_SETTINGS_PATCH_COMMAND = `${VPS_CURL} -f -X PATCH -H 'content-type: application/json' --data-binary @- ${VPS_API_BASE}/api/settings`;
const LIST_SEPARATOR = ",";
const BRIDGE_SOURCE_PATH = join(import.meta.dir, "..", "deploy", "vps", "kanban-bridge");
const BRIDGE_VERSION_PATTERN = /^readonly PROGRAM_VERSION=(\d+)$/m;
const BRIDGE_OPS_PATTERN = /^\s*((?:[a-z_]+ \| )*[a-z_]+)\) op="\$1" ;;$/m;
const SETUP_DOC = "docs/mac-vps-link-setup.md";

const HELP = `Usage: bun scripts/setup-mac-vps-link.ts [options]

Sets up and verifies the Mac side of the Mac <-> VPS link. Idempotent: a second run changes nothing.

Options:
  --check                    Change nothing; list what is missing. Exit code 1 when anything is missing.
  --other-board-url <url>    HTTPS address of the VPS board (setting "Adresse de l'autre board").
  --ssh-alias <alias>        ~/.ssh/config alias of the VPS (setting "Alias SSH du VPS").
  --public-hostname <host>   Public hostname of this Mac board, served by the Cloudflare tunnel.
  --board-name <name>        Name of this board (optional).
  --allow-projects <keys>    Comma-separated Mac project keys the VPS may send cards to ("Projets exposés").
  --remote-profile <id>      Mac profile copied onto cards that come from the VPS ("Profil des cartes distantes").
  --vps-allow-projects <keys>  Same allowlist on the VPS board, for its remote MCP.
  --vps-remote-profile <id>  Remote cards profile on the VPS board.
  --access-team <team>       Zero Trust team: the Access refusal checks then require <team>.cloudflareaccess.com.
  --token-file <path>        Tunnel token file, mode 0600 (default: ${DEFAULT_TOKEN_FILE}).
  --token-stdin              Read the tunnel token on stdin and store it in the token file. Never printed.
  --api <url>                Local Kanban API (default: ${DEFAULT_API_URL}).
  --help                     Show this help.

Settings left out keep their current value. The Cloudflare resources (tunnel, DNS route, Access application,
token validation) are created beforehand by following ${SETUP_DOC}.`;

const linkSettingsSchema = appSettingsSchema.pick({
  boardName: true,
  otherBoardUrl: true,
  sshHostAlias: true,
  publicHostname: true,
  remoteMcpProjectIds: true,
  remoteMcpCardsProfileId: true,
});
type LinkSettings = z.infer<typeof linkSettingsSchema>;
type LinkSettingKey = keyof LinkSettings;
const LINK_SETTING_KEYS = [
  "otherBoardUrl",
  "sshHostAlias",
  "publicHostname",
  "boardName",
  "remoteMcpProjectIds",
  "remoteMcpCardsProfileId",
] as const satisfies readonly LinkSettingKey[];
const OPTIONAL_SETTING_KEYS = new Set<LinkSettingKey>(["boardName", "remoteMcpProjectIds", "remoteMcpCardsProfileId"]);
const vpsSettingsSchema = appSettingsSchema.pick({ otherBoardUrl: true, remoteMcpProjectIds: true, remoteMcpCardsProfileId: true });
type VpsSettings = z.infer<typeof vpsSettingsSchema>;
const VPS_SETTING_KEYS = ["otherBoardUrl", "remoteMcpProjectIds", "remoteMcpCardsProfileId"] as const satisfies readonly (keyof VpsSettings)[];
const projectKeysSchema = z.array(z.string().min(1)).min(1);
const profileIdSchema = z.string().min(1);

const readyResponseSchema = z.object({ readyConnections: z.number().int() });

interface Options {
  apply: boolean;
  apiUrl: string;
  tokenFile: string;
  tokenStdin: boolean;
  accessTeam: string | null;
  desired: Partial<LinkSettings>;
  vpsDesired: Partial<VpsSettings>;
}

function usageError(message: string): never {
  console.error(`setup-mac-vps-link: ${message}\n\n${HELP}`);
  process.exit(EXIT_USAGE);
}

function parseSetting<T>(schema: z.ZodType<T>, value: string | string[] | undefined, flag: string): T | undefined {
  if (value === undefined) return undefined;
  const parsed = schema.safeParse(value);
  if (!parsed.success) usageError(`invalid ${flag}`);
  return parsed.data;
}

function parseOptions(): Options {
  let parsed: ReturnType<typeof parseCliArgs>;
  try {
    parsed = parseCliArgs();
  } catch (error) {
    usageError(error instanceof Error ? error.message : "invalid arguments");
  }
  const { values } = parsed;
  if (values.help) {
    console.log(HELP);
    process.exit(0);
  }
  if (values.check && values["token-stdin"]) usageError("--token-stdin changes the Mac and cannot run with --check");
  const apiUrl = values.api ?? DEFAULT_API_URL;
  if (!URL.canParse(apiUrl)) usageError("invalid --api");
  const desired: Partial<LinkSettings> = {};
  const otherBoardUrl = parseSetting(otherBoardUrlSchema, values["other-board-url"], "--other-board-url");
  if (otherBoardUrl !== undefined) desired.otherBoardUrl = otherBoardUrl;
  const sshHostAlias = parseSetting(sshHostAliasSchema, values["ssh-alias"], "--ssh-alias");
  if (sshHostAlias !== undefined) desired.sshHostAlias = sshHostAlias;
  const publicHostname = parseSetting(dnsHostnameSchema, values["public-hostname"], "--public-hostname");
  if (publicHostname !== undefined) desired.publicHostname = publicHostname;
  const boardName = parseSetting(boardNameSchema, values["board-name"], "--board-name");
  if (boardName !== undefined) desired.boardName = boardName;
  const allowProjects = parseSetting(projectKeysSchema, values["allow-projects"]?.split(LIST_SEPARATOR), "--allow-projects");
  if (allowProjects !== undefined) desired.remoteMcpProjectIds = allowProjects;
  const remoteProfile = parseSetting(profileIdSchema, values["remote-profile"], "--remote-profile");
  if (remoteProfile !== undefined) desired.remoteMcpCardsProfileId = remoteProfile;
  const vpsDesired: Partial<VpsSettings> = {};
  const vpsAllowProjects = parseSetting(projectKeysSchema, values["vps-allow-projects"]?.split(LIST_SEPARATOR), "--vps-allow-projects");
  if (vpsAllowProjects !== undefined) vpsDesired.remoteMcpProjectIds = vpsAllowProjects;
  const vpsRemoteProfile = parseSetting(profileIdSchema, values["vps-remote-profile"], "--vps-remote-profile");
  if (vpsRemoteProfile !== undefined) vpsDesired.remoteMcpCardsProfileId = vpsRemoteProfile;
  const accessTeam = values["access-team"] ?? null;
  if (accessTeam !== null && !/^[a-z0-9-]+$/.test(accessTeam)) usageError("invalid --access-team");
  return {
    apply: !values.check,
    apiUrl: apiUrl.replace(/\/+$/, ""),
    tokenFile: values["token-file"] ?? DEFAULT_TOKEN_FILE,
    tokenStdin: values["token-stdin"] ?? false,
    accessTeam,
    desired,
    vpsDesired,
  };
}

function parseCliArgs() {
  return parseArgs({
    options: {
      check: { type: "boolean" },
      help: { type: "boolean" },
      "other-board-url": { type: "string" },
      "ssh-alias": { type: "string" },
      "public-hostname": { type: "string" },
      "board-name": { type: "string" },
      "allow-projects": { type: "string" },
      "remote-profile": { type: "string" },
      "vps-allow-projects": { type: "string" },
      "vps-remote-profile": { type: "string" },
      "access-team": { type: "string" },
      "token-file": { type: "string" },
      "token-stdin": { type: "boolean" },
      api: { type: "string" },
    },
    strict: true,
    allowPositionals: false,
  });
}

function compareVersions(left: readonly number[], right: readonly number[]): number {
  for (let index = 0; index < right.length; index += 1) {
    const difference = (left[index] ?? 0) - (right[index] ?? 0);
    if (difference !== 0) return difference;
  }
  return 0;
}

async function ensureCloudflared(options: Options): Promise<string | null> {
  let binary = Bun.which(CLOUDFLARED);
  if (binary === null) {
    if (!options.apply) {
      report("Mac", "missing", "cloudflared", "not installed (the setup runs brew install cloudflared)");
      return null;
    }
    const brew = Bun.which("brew");
    if (brew === null) {
      report("Mac", "failed", "cloudflared", "not installed and Homebrew is missing: install Homebrew or cloudflared from Cloudflare's downloads, then rerun");
      return null;
    }
    const installed = await run([brew, "install", CLOUDFLARED], { timeoutMs: BREW_TIMEOUT_MS });
    binary = Bun.which(CLOUDFLARED);
    if (installed.exitCode !== 0 || binary === null) {
      report("Mac", "failed", "cloudflared", `brew install cloudflared failed: ${shortDetail(installed.stderr)}`);
      return null;
    }
    report("Mac", "changed", "cloudflared", "installed with Homebrew");
  }
  const versionOutput = await run([binary, "--version"]);
  const match = CLOUDFLARED_VERSION_PATTERN.exec(versionOutput.stdout + versionOutput.stderr);
  if (match === null) {
    report("Mac", "failed", "cloudflared version", "unreadable output of cloudflared --version");
    return null;
  }
  const version = [Number(match[1]), Number(match[2]), Number(match[3])];
  const label = version.join(".");
  if (compareVersions(version, MIN_CLOUDFLARED_VERSION) < 0) {
    report("Mac", "failed", "cloudflared version", `${label} is older than ${MIN_CLOUDFLARED_VERSION.join(".")}, needed for --token-file: brew upgrade cloudflared`);
    return null;
  }
  report("Mac", "ok", "cloudflared", `${label} at ${binary}`);
  return binary;
}

function writePrivateFile(path: string, content: string): void {
  const directory = dirname(path);
  mkdirSync(directory, { recursive: true, mode: PRIVATE_DIR_MODE });
  const temporary = `${path}.${process.pid}.tmp`;
  try {
    writeFileSync(temporary, content, { encoding: "utf8", flag: "wx", mode: PRIVATE_FILE_MODE });
    renameSync(temporary, path);
  } finally {
    rmSync(temporary, { force: true });
  }
  chmodSync(path, PRIVATE_FILE_MODE);
}

async function ensureTunnelToken(options: Options): Promise<boolean> {
  const path = options.tokenFile;
  if (options.tokenStdin) {
    const raw = (await Bun.stdin.text()).trim();
    if (parseTunnelToken(raw) === null) {
      report("Mac", "failed", "tunnel token", "stdin does not hold a Cloudflare tunnel token (nothing written)");
      return false;
    }
    const current = existsSync(path) ? readFileSync(path, "utf8").trim() : null;
    if (current !== raw) {
      writePrivateFile(path, `${raw}\n`);
      report("Mac", "changed", "tunnel token", `stored in ${path} (0600)`);
    }
  }
  if (!existsSync(path)) {
    report("Mac", "missing", "tunnel token", `no file at ${path}: pipe the token with --token-stdin (${SETUP_DOC})`);
    return false;
  }
  const stat = lstatSync(path);
  if (!stat.isFile()) {
    report("Mac", "failed", "tunnel token", `${path} is not a regular file`);
    return false;
  }
  if (stat.uid !== userInfo().uid) {
    report("Mac", "failed", "tunnel token", `${path} is not owned by the current user`);
    return false;
  }
  const token = parseTunnelToken(readFileSync(path, "utf8"));
  if (token === null) {
    report("Mac", "failed", "tunnel token", `${path} does not hold a Cloudflare tunnel token`);
    return false;
  }
  if ((stat.mode & PERMISSION_BITS) !== PRIVATE_FILE_MODE) {
    if (!options.apply) {
      report("Mac", "missing", "tunnel token", `${path} is not mode 0600`);
      return false;
    }
    chmodSync(path, PRIVATE_FILE_MODE);
    report("Mac", "changed", "tunnel token", `${path} set to mode 0600`);
  }
  report("Mac", "ok", "tunnel token", `tunnel ${token.t}, file ${path}`);
  return true;
}

function xmlEscape(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

function launchAgentPlist(binary: string, tokenFile: string): string {
  const programArguments = [binary, "tunnel", "--metrics", METRICS_ADDRESS, "run", "--token-file", tokenFile]
    .map((argument) => `    <string>${xmlEscape(argument)}</string>`)
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>${LAUNCH_AGENT_LABEL}</string>
  <key>ProgramArguments</key>
  <array>
${programArguments}
  </array>
  <key>RunAtLoad</key>
  <true/>
  <key>KeepAlive</key>
  <true/>
  <key>StandardOutPath</key>
  <string>${xmlEscape(CONNECTOR_LOG_PATH)}</string>
  <key>StandardErrorPath</key>
  <string>${xmlEscape(CONNECTOR_LOG_PATH)}</string>
</dict>
</plist>
`;
}

function launchDomain(): string {
  return `gui/${userInfo().uid}`;
}

async function isLaunchAgentLoaded(): Promise<boolean> {
  const result = await run(["launchctl", "print", `${launchDomain()}/${LAUNCH_AGENT_LABEL}`]);
  return result.exitCode === 0;
}

async function bootstrapLaunchAgent(): Promise<BoundedCommandResult> {
  let result = await run(["launchctl", "bootstrap", launchDomain(), LAUNCH_AGENT_PATH]);
  for (let attempt = 1; attempt < BOOTSTRAP_ATTEMPTS && result.exitCode !== 0; attempt += 1) {
    await sleep(RETRY_DELAY_MS);
    result = await run(["launchctl", "bootstrap", launchDomain(), LAUNCH_AGENT_PATH]);
  }
  return result;
}

async function ensureConnectorService(options: Options, binary: string): Promise<boolean> {
  for (const plist of OFFICIAL_SERVICE_PLISTS) {
    if (existsSync(plist)) {
      report("Mac", "warning", "official cloudflared service", `${plist} also exists; keep a single connector per hostname (cloudflared service --help)`);
    }
  }
  const desired = launchAgentPlist(binary, options.tokenFile);
  const current = existsSync(LAUNCH_AGENT_PATH) ? readFileSync(LAUNCH_AGENT_PATH, "utf8") : null;
  const loaded = await isLaunchAgentLoaded();
  if (current === desired && loaded) {
    report("Mac", "ok", "connector service", `${LAUNCH_AGENT_LABEL} loaded`);
    return true;
  }
  if (!options.apply) {
    let state = "not loaded";
    if (current === null) state = "not installed";
    else if (current !== desired) state = "outdated";
    report("Mac", "missing", "connector service", `${LAUNCH_AGENT_LABEL} ${state}`);
    return false;
  }
  if (current !== desired) {
    mkdirSync(LAUNCH_AGENTS_DIR, { recursive: true });
    writeFileSync(LAUNCH_AGENT_PATH, desired, { encoding: "utf8", mode: PUBLIC_FILE_MODE });
    if (loaded) await run(["launchctl", "bootout", `${launchDomain()}/${LAUNCH_AGENT_LABEL}`]);
  }
  const bootstrapped = await bootstrapLaunchAgent();
  if (bootstrapped.exitCode !== 0) {
    report("Mac", "failed", "connector service", `launchctl bootstrap failed: ${shortDetail(bootstrapped.stderr)}`);
    return false;
  }
  report("Mac", "changed", "connector service", `${LAUNCH_AGENT_LABEL} installed and loaded`);
  return true;
}

async function readyConnections(): Promise<number> {
  try {
    const response = await fetch(`http://${METRICS_ADDRESS}/ready`, { signal: AbortSignal.timeout(HTTP_TIMEOUT_MS) });
    const parsed = readyResponseSchema.safeParse(safeJsonParse(await response.text()));
    return response.ok && parsed.success ? parsed.data.readyConnections : 0;
  } catch {
    return 0;
  }
}

async function checkTunnelConnected(options: Options): Promise<void> {
  const attempts = options.apply ? READY_ATTEMPTS : 1;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const connections = await readyConnections();
    if (connections > 0) {
      report("Mac", "ok", "tunnel connected", `${connections} connections to Cloudflare`);
      return;
    }
    if (attempt < attempts) await sleep(RETRY_DELAY_MS);
  }
  report("Mac", "failed", "tunnel connected", `no ready connection on http://${METRICS_ADDRESS}/ready; see ${CONNECTOR_LOG_PATH}`);
}

async function fetchSettings(options: Options, init?: RequestInit): Promise<LinkSettings | null> {
  try {
    const response = await fetch(`${options.apiUrl}/api/settings`, { ...init, signal: AbortSignal.timeout(HTTP_TIMEOUT_MS) });
    if (!response.ok) {
      report("Kanban", "failed", "settings API", `${init?.method ?? "GET"} /api/settings answered ${response.status}: ${shortDetail(await response.text())}`);
      return null;
    }
    const parsed = linkSettingsSchema.safeParse(await response.json());
    if (!parsed.success) {
      report("Kanban", "failed", "settings API", "unexpected /api/settings response");
      return null;
    }
    return parsed.data;
  } catch {
    report("Kanban", "failed", "settings API", `${options.apiUrl} is unreachable: open the desktop app`);
    return null;
  }
}

type SettingValue = string | readonly string[] | null;

function settingText(value: SettingValue | undefined): string {
  if (value === undefined || value === null) return "(empty)";
  return typeof value === "string" ? value : value.join(LIST_SEPARATOR) || "(empty)";
}

function isSettingSet(value: SettingValue): boolean {
  return typeof value === "string" || (value !== null && value.length > 0);
}

function differingKeys<K extends string>(keys: readonly K[], desired: Partial<Record<K, SettingValue>>, current: Record<K, SettingValue>): K[] {
  return keys.filter((key) => desired[key] !== undefined && JSON.stringify(desired[key]) !== JSON.stringify(current[key]));
}

function reportSettings<K extends string>(
  section: string,
  keys: readonly K[],
  before: Record<K, SettingValue>,
  after: Record<K, SettingValue>,
  changed: readonly K[],
  options: { apply: boolean; optional: ReadonlySet<string> },
): void {
  for (const key of keys) {
    const value = after[key];
    if (changed.includes(key)) {
      if (options.apply) report(section, "changed", key, `set to ${settingText(value)}`);
      else report(section, "missing", key, `would change ${settingText(before[key])}`);
    } else if (isSettingSet(value)) {
      report(section, "ok", key, settingText(value));
    } else if (options.optional.has(key)) {
      report(section, "skipped", key, "not set (optional)");
    } else {
      report(section, "missing", key, "not set: pass the matching flag");
    }
  }
}

async function ensureSettings(options: Options): Promise<LinkSettings | null> {
  const current = await fetchSettings(options);
  if (current === null) return null;
  const changed = differingKeys(LINK_SETTING_KEYS, options.desired, current);
  let settings = current;
  if (changed.length > 0 && options.apply) {
    const patch: UpdateAppSettingsInput = Object.fromEntries(changed.map((key) => [key, options.desired[key]]));
    const updated = await fetchSettings(options, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(patch) });
    if (updated === null) return null;
    settings = updated;
  }
  reportSettings("Kanban", LINK_SETTING_KEYS, current, settings, changed, { apply: options.apply, optional: OPTIONAL_SETTING_KEYS });
  return settings;
}

async function curlStatus(args: string[]): Promise<string> {
  const result = await run(["curl", "-s", "-o", "/dev/null", "--max-time", CURL_MAX_TIME_SECONDS, ...args]);
  return result.stdout.trim();
}

async function checkActiveHostname(options: Options, hostname: string): Promise<void> {
  const status = await curlStatus(["-w", "%{http_code}", "-H", `Host: ${hostname}`, `${options.apiUrl}/health`]);
  if (status === HTTP_OK) report("Kanban", "ok", "public hostname active", `the running app accepts Host: ${hostname}`);
  else if (status === HTTP_FORBIDDEN) report("Kanban", "missing", "public hostname active", "quit and reopen the desktop app so it exports the hostname");
  else report("Kanban", "failed", "public hostname active", `/health with Host: ${hostname} answered ${status || "nothing"}`);
}

function checkBridgeSourceDrift(): void {
  const source = readFileSync(BRIDGE_SOURCE_PATH, "utf8");
  const version = BRIDGE_VERSION_PATTERN.exec(source)?.[1];
  const ops = BRIDGE_OPS_PATTERN.exec(source)?.[1]?.split(" | ") ?? [];
  const sameOps = ops.length === BRIDGE_OPS.length && BRIDGE_OPS.every((op) => ops.includes(op));
  if (version !== String(BRIDGE_PROTOCOL_VERSION) || !sameOps) {
    report("Repo", "failed", "bridge program", `deploy/vps/kanban-bridge (version ${version ?? "?"}, ${ops.length} ops) differs from src/shared/vpsBridge.ts (version ${BRIDGE_PROTOCOL_VERSION}, ${BRIDGE_OPS.length} ops)`);
    return;
  }
  report("Repo", "ok", "bridge program", `version ${version} and op list match src/shared/vpsBridge.ts`);
}

function ssh(alias: string, command: string[], stdin?: string): Promise<BoundedCommandResult> {
  return run(["ssh", ...NON_INTERACTIVE_SSH_OPTIONS, alias, ...command], stdin === undefined ? {} : { stdin });
}

async function checkVps(options: Options, alias: string, publicHostname: string | null): Promise<void> {
  const groups = await ssh(alias, ["id", "-nG"]);
  if (groups.timedOut || groups.exitCode !== 0) {
    report("VPS", "failed", "non-interactive SSH", `ssh ${alias} failed: ${shortDetail(groups.stderr) || "timeout"}`);
    report("VPS", "skipped", "bridge and socket checks", "SSH is not working");
    return;
  }
  report("VPS", "ok", "non-interactive SSH", `ssh ${alias} answered with BatchMode=yes`);
  if (groups.stdout.trim().split(/\s+/).includes(VPS_SERVICE_GROUP)) report("VPS", "ok", "group", `the SSH user is in ${VPS_SERVICE_GROUP}`);
  else report("VPS", "missing", "group", `the SSH user is not in ${VPS_SERVICE_GROUP}: sudo usermod -aG ${VPS_SERVICE_GROUP} <user> on the VPS, then reconnect`);

  const health = await ssh(alias, [VPS_HEALTH_COMMAND]);
  if (health.stdout.trim() === HTTP_OK) report("VPS", "ok", "ui.sock /health", "200");
  else report("VPS", "failed", "ui.sock /health", `answered ${health.stdout.trim() || shortDetail(health.stderr) || "nothing"}`);

  const program = await ssh(alias, [VPS_BRIDGE_REMOTE_PROGRAM, VPS_BRIDGE_PROGRAM_VERSION_ARG]);
  const programVersion = program.stdout.trim();
  if ([EXIT_NOT_FOUND, EXIT_NOT_EXECUTABLE, EXIT_BRIDGE_USAGE].includes(program.exitCode)) {
    report("VPS", "missing", "bridge program", `${VPS_BRIDGE_REMOTE_PROGRAM} is missing or too old: run sudo kanban-upgrade --sha <sha> --install-bridge on the VPS`);
  } else if (program.exitCode !== 0) {
    report("VPS", "failed", "bridge program", shortDetail(program.stderr) || `exit ${program.exitCode}`);
  } else if (programVersion !== String(BRIDGE_PROTOCOL_VERSION)) {
    report("VPS", "failed", "bridge program", `version ${programVersion}, the Mac expects ${BRIDGE_PROTOCOL_VERSION}: upgrade both sides`);
  } else {
    report("VPS", "ok", "bridge program", `${VPS_BRIDGE_REMOTE_PROGRAM} version ${programVersion}`);
  }

  const bridge = await runVpsBridge({ hostAlias: alias, op: "version", input: {} });
  if (!bridge.ok) {
    report("VPS", "failed", "bridge socket", `${bridge.kind}${bridge.detail ? `: ${bridge.detail}` : ""}`);
    return;
  }
  const version = bridge.envelope.ok ? bridgeVersionOutputSchema.safeParse(bridge.envelope.result) : null;
  if (version === null || !version.success) report("VPS", "failed", "bridge socket", "the version op returned an error");
  else if (version.data.protocolVersion !== BRIDGE_PROTOCOL_VERSION) report("VPS", "failed", "bridge socket", `server protocol ${version.data.protocolVersion}, the Mac expects ${BRIDGE_PROTOCOL_VERSION}`);
  else report("VPS", "ok", "bridge socket", `protocol ${BRIDGE_PROTOCOL_VERSION}`);
  await ensureVpsSettings(options, alias, publicHostname);
}

async function readVpsSettings(alias: string): Promise<VpsSettings | null> {
  const result = await ssh(alias, [VPS_SETTINGS_GET_COMMAND]);
  const parsed = vpsSettingsSchema.safeParse(safeJsonParse(result.stdout));
  if (result.exitCode !== 0 || !parsed.success) {
    report("VPS", "failed", "settings", `GET /api/settings through ui.sock failed: ${shortDetail(result.stderr) || `exit ${result.exitCode}`}`);
    return null;
  }
  return parsed.data;
}

// NOTE: the reciprocal link is only filled when empty on the VPS, so a URL set there by hand is never replaced.
function vpsDesiredSettings(options: Options, current: VpsSettings, publicHostname: string | null): Partial<VpsSettings> {
  const desired = { ...options.vpsDesired };
  if (publicHostname !== null) {
    const macUrl = `https://${publicHostname}`;
    if (current.otherBoardUrl === null) desired.otherBoardUrl = macUrl;
    else if (current.otherBoardUrl !== macUrl) report("VPS", "warning", "otherBoardUrl", `${current.otherBoardUrl}, not ${macUrl}: left unchanged`);
  }
  return desired;
}

async function ensureVpsSettings(options: Options, alias: string, publicHostname: string | null): Promise<void> {
  const current = await readVpsSettings(alias);
  if (current === null) return;
  const desired = vpsDesiredSettings(options, current, publicHostname);
  const changed = differingKeys(VPS_SETTING_KEYS, desired, current);
  let settings = current;
  if (changed.length > 0 && options.apply) {
    const patch = JSON.stringify(Object.fromEntries(changed.map((key) => [key, desired[key]])));
    const result = await ssh(alias, [VPS_SETTINGS_PATCH_COMMAND], patch);
    const parsed = vpsSettingsSchema.safeParse(safeJsonParse(result.stdout));
    if (result.exitCode !== 0 || !parsed.success) {
      report("VPS", "failed", "settings", `PATCH /api/settings through ui.sock failed (a profile must exist with an available engine): exit ${result.exitCode}`);
      return;
    }
    settings = parsed.data;
  }
  reportSettings("VPS", VPS_SETTING_KEYS, current, settings, changed, { apply: options.apply, optional: new Set(VPS_SETTING_KEYS) });
}

function isAccessLogin(redirect: string, accessTeam: string | null): boolean {
  if (!URL.canParse(redirect)) return false;
  const url = new URL(redirect);
  const hostMatches = accessTeam === null ? url.hostname.endsWith(ACCESS_LOGIN_HOST_SUFFIX) : url.hostname === `${accessTeam}${ACCESS_LOGIN_HOST_SUFFIX}`;
  return url.protocol === "https:" && hostMatches && url.pathname.startsWith(ACCESS_LOGIN_PATH_PREFIX);
}

// NOTE: only a redirect to the Access login proves Access is in front; a bare 403 can come from Kanban's own Host guard.
async function checkAccessRefusal(hostname: string, accessTeam: string | null, label: string): Promise<void> {
  const [status = "", redirect = ""] = (await curlStatus(["-w", "%{http_code} %{redirect_url}", `https://${hostname}/`])).split(" ");
  if (REDIRECT_CODES.has(status) && isAccessLogin(redirect, accessTeam)) {
    report("Final", "ok", label, `${status} to the Cloudflare Access login`);
  } else {
    report("Final", "failed", label, `https://${hostname}/ answered ${status || "nothing"}${redirect ? ` to ${redirect}` : ""} without a session, not a redirect to the Access login`);
  }
}

async function main(): Promise<void> {
  const options = parseOptions();
  console.log(options.apply ? "Setting up the Mac <-> VPS link" : "Checking the Mac <-> VPS link (no change)");

  const binary = await ensureCloudflared(options);
  const tokenReady = await ensureTunnelToken(options);
  if (binary !== null && tokenReady) {
    if (await ensureConnectorService(options, binary)) await checkTunnelConnected(options);
  } else {
    report("Mac", "skipped", "connector service", "needs cloudflared and the tunnel token");
  }

  const settings = await ensureSettings(options);
  if (settings?.publicHostname) await checkActiveHostname(options, settings.publicHostname);

  checkBridgeSourceDrift();
  if (settings?.sshHostAlias) await checkVps(options, settings.sshHostAlias, settings.publicHostname);
  else report("VPS", "skipped", "SSH checks", "no SSH alias");

  if (settings?.publicHostname) await checkAccessRefusal(settings.publicHostname, options.accessTeam, "Access refusal (Mac)");
  else report("Final", "skipped", "Access refusal (Mac)", "no public hostname");
  const vpsHostname = settings?.otherBoardUrl && URL.canParse(settings.otherBoardUrl) ? new URL(settings.otherBoardUrl).hostname : null;
  if (vpsHostname !== null) await checkAccessRefusal(vpsHostname, options.accessTeam, "Access refusal (VPS)");
  else report("Final", "skipped", "Access refusal (VPS)", "no other board URL");

  console.log(`\nC0 (SSH from the Finder-launched app, after a restart and after sleep) stays manual: ${SETUP_DOC}.`);
  finish();
}

await main();
