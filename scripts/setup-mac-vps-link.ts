import { chmodSync, existsSync, lstatSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { homedir, userInfo } from "node:os";
import { dirname, join } from "node:path";
import { parseArgs } from "node:util";

import { z } from "zod";

import { runBoundedCommand, safeJsonParse } from "../src/server/system/boundedCommand.ts";
import type { BoundedCommandResult } from "../src/server/system/boundedCommand.ts";
import { NON_INTERACTIVE_SSH_OPTIONS } from "../src/server/system/previewCleanup.ts";
import { EXIT_BRIDGE_USAGE, EXIT_NOT_EXECUTABLE, EXIT_NOT_FOUND, runVpsBridge, VPS_BRIDGE_PROGRAM_VERSION_ARG, VPS_BRIDGE_REMOTE_PROGRAM } from "../src/server/system/vpsBridge.ts";
import { boardNameSchema, dnsHostnameSchema, otherBoardUrlSchema, sshHostAliasSchema } from "../src/shared/boardLink.ts";
import { DEFAULT_PORT } from "../src/shared/constants.ts";
import { appSettingsSchema } from "../src/shared/schemas.ts";
import type { UpdateAppSettingsInput } from "../src/shared/schemas.ts";
import { BRIDGE_OPS, BRIDGE_PROTOCOL_VERSION, bridgeVersionOutputSchema } from "../src/shared/vpsBridge.ts";

const EXIT_INCOMPLETE = 1;
const EXIT_USAGE = 64;
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
const ACCESS_REFUSAL_CODES = new Set(["401", "403"]);
const REDIRECT_CODES = new Set(["301", "302", "303", "307", "308"]);
const ACCESS_LOGIN_HOST_SUFFIX = ".cloudflareaccess.com";
const VPS_SERVICE_GROUP = "kanban";
const VPS_UI_SOCKET = "/run/kanban/ui.sock";
const VPS_HEALTH_COMMAND = `curl -s -o /dev/null -w '%{http_code}' --max-time 5 --unix-socket ${VPS_UI_SOCKET} http://kanban/health`;
const DETAIL_MAX_CHARS = 200;
const BRIDGE_SOURCE_PATH = join(import.meta.dir, "..", "deploy", "vps", "kanban-bridge");
const BRIDGE_VERSION_PATTERN = /^readonly PROGRAM_VERSION=(\d+)$/m;
const BRIDGE_OPS_PATTERN = /^\s*((?:[a-z_]+ \| )*[a-z_]+)\) op="\$1" ;;$/m;
const BASE64_PATTERN = /^[A-Za-z0-9+/]+={0,2}$/;
const SETUP_DOC = "docs/mac-vps-link-setup.md";

const HELP = `Usage: bun scripts/setup-mac-vps-link.ts [options]

Sets up and verifies the Mac side of the Mac <-> VPS link. Idempotent: a second run changes nothing.

Options:
  --check                    Change nothing; list what is missing. Exit code 1 when anything is missing.
  --other-board-url <url>    HTTPS address of the VPS board (setting "Adresse de l'autre board").
  --ssh-alias <alias>        ~/.ssh/config alias of the VPS (setting "Alias SSH du VPS").
  --public-hostname <host>   Public hostname of this Mac board, served by the Cloudflare tunnel.
  --board-name <name>        Name of this board (optional).
  --token-file <path>        Tunnel token file, mode 0600 (default: ${DEFAULT_TOKEN_FILE}).
  --token-stdin              Read the tunnel token on stdin and store it in the token file. Never printed.
  --api <url>                Local Kanban API (default: ${DEFAULT_API_URL}).
  --help                     Show this help.

Settings left out keep their current value. The Cloudflare resources (tunnel, DNS route, Access application,
token validation) are created beforehand by following ${SETUP_DOC}.`;

type Status = "ok" | "changed" | "missing" | "failed" | "skipped" | "warning";

const STATUS_LABELS: Record<Status, string> = {
  ok: "ok",
  changed: "fixed",
  missing: "MISSING",
  failed: "FAILED",
  skipped: "skipped",
  warning: "warning",
};
const LABEL_WIDTH = 9;
const BLOCKING_STATUSES = new Set<Status>(["missing", "failed"]);

const linkSettingsSchema = appSettingsSchema.pick({ boardName: true, otherBoardUrl: true, sshHostAlias: true, publicHostname: true });
type LinkSettings = z.infer<typeof linkSettingsSchema>;
type LinkSettingKey = keyof LinkSettings;
const LINK_SETTING_KEYS = ["otherBoardUrl", "sshHostAlias", "publicHostname", "boardName"] as const satisfies readonly LinkSettingKey[];
const OPTIONAL_SETTING_KEYS = new Set<LinkSettingKey>(["boardName"]);

const tunnelTokenSchema = z.object({ a: z.string().min(1), t: z.string().uuid(), s: z.string().min(1) });
const readyResponseSchema = z.object({ readyConnections: z.number().int() });

interface Options {
  apply: boolean;
  apiUrl: string;
  tokenFile: string;
  tokenStdin: boolean;
  desired: Partial<LinkSettings>;
}

let blocking = 0;

function report(section: string, status: Status, label: string, detail?: string): void {
  if (BLOCKING_STATUSES.has(status)) blocking += 1;
  const tag = `[${STATUS_LABELS[status]}]`.padEnd(LABEL_WIDTH);
  console.log(`${tag} ${section.padEnd(8)} ${label}${detail ? ` - ${detail}` : ""}`);
}

function usageError(message: string): never {
  console.error(`setup-mac-vps-link: ${message}\n\n${HELP}`);
  process.exit(EXIT_USAGE);
}

function shortDetail(text: string): string {
  return text.trim().split("\n").slice(-2).join(" ").slice(0, DETAIL_MAX_CHARS);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseSetting<T>(schema: z.ZodType<T>, value: string | undefined, flag: string): T | undefined {
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
  return {
    apply: !values.check,
    apiUrl: apiUrl.replace(/\/+$/, ""),
    tokenFile: values["token-file"] ?? DEFAULT_TOKEN_FILE,
    tokenStdin: values["token-stdin"] ?? false,
    desired,
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
      "token-file": { type: "string" },
      "token-stdin": { type: "boolean" },
      api: { type: "string" },
    },
    strict: true,
    allowPositionals: false,
  });
}

function run(args: string[], timeoutMs?: number): Promise<BoundedCommandResult> {
  return runBoundedCommand(args, process.cwd(), timeoutMs === undefined ? {} : { timeoutMs });
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
    const installed = await run([brew, "install", CLOUDFLARED], BREW_TIMEOUT_MS);
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

function parseTunnelToken(raw: string): z.infer<typeof tunnelTokenSchema> | null {
  const token = raw.trim();
  if (!BASE64_PATTERN.test(token)) return null;
  const parsed = tunnelTokenSchema.safeParse(safeJsonParse(Buffer.from(token, "base64").toString("utf8")));
  return parsed.success ? parsed.data : null;
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

async function ensureSettings(options: Options): Promise<LinkSettings | null> {
  const current = await fetchSettings(options);
  if (current === null) return null;
  const patch: UpdateAppSettingsInput = {};
  for (const key of LINK_SETTING_KEYS) {
    const wanted = options.desired[key];
    if (wanted !== undefined && wanted !== current[key]) patch[key] = wanted;
  }
  let settings = current;
  const changedKeys = Object.keys(patch);
  if (changedKeys.length > 0 && options.apply) {
    const updated = await fetchSettings(options, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(patch) });
    if (updated === null) return null;
    settings = updated;
  }
  for (const key of LINK_SETTING_KEYS) {
    const value = settings[key];
    if (key in patch) {
      if (options.apply) report("Kanban", "changed", key, `set to ${value}`);
      else report("Kanban", "missing", key, `would change ${current[key] ?? "(empty)"} to ${patch[key]}`);
    } else if (value !== null) {
      report("Kanban", "ok", key, value);
    } else if (OPTIONAL_SETTING_KEYS.has(key)) {
      report("Kanban", "skipped", key, "not set (optional)");
    } else {
      report("Kanban", "missing", key, "not set: pass the matching flag");
    }
  }
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

function ssh(alias: string, command: string[]): Promise<BoundedCommandResult> {
  return run(["ssh", ...NON_INTERACTIVE_SSH_OPTIONS, alias, ...command]);
}

async function checkVps(alias: string): Promise<void> {
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
    report("VPS", "missing", "bridge program", `${VPS_BRIDGE_REMOTE_PROGRAM} is missing or too old: run sudo kanban-upgrade on the VPS`);
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
}

function isAccessLogin(redirect: string): boolean {
  if (!URL.canParse(redirect)) return false;
  return new URL(redirect).hostname.endsWith(ACCESS_LOGIN_HOST_SUFFIX);
}

async function checkAccessRefusal(hostname: string): Promise<void> {
  const [status = "", redirect = ""] = (await curlStatus(["-w", "%{http_code} %{redirect_url}", `https://${hostname}/`])).split(" ");
  if (REDIRECT_CODES.has(status) && isAccessLogin(redirect)) {
    report("Final", "ok", "Access refusal", `${status} to the Cloudflare Access login`);
  } else if (ACCESS_REFUSAL_CODES.has(status)) {
    report("Final", "ok", "Access refusal", `${status} without a session`);
  } else {
    report("Final", "failed", "Access refusal", `https://${hostname}/ answered ${status || "nothing"}${redirect ? ` to ${redirect}` : ""} without a session`);
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
  if (settings?.sshHostAlias) await checkVps(settings.sshHostAlias);
  else report("VPS", "skipped", "SSH checks", "no SSH alias");

  if (settings?.publicHostname) await checkAccessRefusal(settings.publicHostname);
  else report("Final", "skipped", "Access refusal", "no public hostname");

  console.log(`\nC0 (SSH from the Finder-launched app, after a restart and after sleep) stays manual: ${SETUP_DOC}.`);
  if (blocking > 0) {
    console.log(`${blocking} item(s) missing or failing.`);
    process.exit(EXIT_INCOMPLETE);
  }
  console.log("Everything is in place.");
}

await main();
