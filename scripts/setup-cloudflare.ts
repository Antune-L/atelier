import { parseArgs } from "node:util";

import { z } from "zod";

import { DEFAULT_PORT } from "../src/shared/constants.ts";

import { EXIT_USAGE, finish, report } from "./lib/setupReport.ts";

const API_BASE = "https://api.cloudflare.com/client/v4";
const TOKEN_ENV = "CLOUDFLARE_API_TOKEN";
const PAGE_SIZE = 50;
const HTTP_TIMEOUT_MS = 20_000;
const OWNER_POLICY_NAME = "kanban-owner";
const DEFAULT_VPS_TUNNEL = "kanban-vps";
const DEFAULT_MAC_TUNNEL = "kanban-mac";
const SESSION_DURATION = "24h";
const MFA_AUTHENTICATORS = ["totp", "biometrics"] as const;
const MCP_GRANT_SESSION = "336h";
const MCP_ACCESS_TOKEN_LIFETIME = "15m";
const VPS_BOARD_SERVICE = "unix:/run/kanban/ui.sock";
const CATCH_ALL_SERVICE = "http_status:404";
const TUNNEL_TARGET_SUFFIX = ".cfargotunnel.com";
const ACCESS_TEAM_SUFFIX = ".cloudflareaccess.com";
const GOOGLE_IDP_TYPE = "google";
const ONE_TIME_PIN_IDP_TYPE = "onetimepin";
const APP_LAUNCHER_TYPE = "app_launcher";
const SELF_HOSTED_TYPE = "self_hosted";
const HOSTNAME_PATTERN = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/;
const ACCOUNT_ID_PATTERN = /^[0-9a-f]{32}$/;
const MAX_PORT = 65_535;
const SETUP_DOC = "docs/vps-bootstrap.md";

const HELP = `Usage:
  bun scripts/setup-cloudflare.ts --account-id <id> --zone <domain> --email <email> [hosts] [--apply]
  bun scripts/setup-cloudflare.ts tunnel-token --account-id <id> --tunnel <name> | <consumer>

Audits, and with --apply creates, the Cloudflare side of Kanban: one owner-only Access policy (Google, the one
email, Access MFA), an Access application per hostname, the tunnels, their routes with token validation, and the DNS
records last. It never changes or deletes a resource that already exists: drift is reported, the fix stays yours.
The API token is read from ${TOKEN_ENV}; make it short-lived and limited to this Mac's IP (${SETUP_DOC}).

Options:
  --account-id <id>     Cloudflare account id.
  --zone <domain>       Zone of the hostnames, for example example.com.
  --email <email>       The only email allowed by the Access policy.
  --board-host <host>   VPS board hostname (tunnel ${DEFAULT_VPS_TUNNEL}, origin ${VPS_BOARD_SERVICE}).
  --mcp-host <host>     Remote MCP hostname (tunnel ${DEFAULT_VPS_TUNNEL}); needs --mcp-port.
  --mcp-port <port>     Local port of the remote MCP listener on the VPS.
  --mac-host <host>     Mac board hostname (tunnel ${DEFAULT_MAC_TUNNEL}, origin http://127.0.0.1:${DEFAULT_PORT}).
  --preview-domain <d>  Preview domain base: checks that *.<d> is a DNS-only record.
  --apply               Create what is missing. Without it nothing is written.
  --tunnel <name>       tunnel-token only: the tunnel whose token goes to stdout (never to a terminal).
  --help                Show this help.`;

const envelopeSchema = z.object({
  success: z.boolean(),
  errors: z.array(z.object({ message: z.string() })).default([]),
  result: z.unknown(),
  result_info: z.object({ page: z.number().optional(), total_pages: z.number().optional() }).nullish(),
});
const idSchema = z.object({ id: z.string() });
const zoneSchema = z.object({ id: z.string(), name: z.string() });
const organizationSchema = z.object({
  auth_domain: z.string(),
  mfa_config: z.object({ allowed_authenticators: z.array(z.string()).optional() }).nullish(),
});
const identityProviderSchema = z.object({ id: z.string(), type: z.string(), name: z.string().optional() });
const ruleSchema = z.record(z.string(), z.unknown());
const policySchema = z.object({
  id: z.string(),
  name: z.string(),
  decision: z.string(),
  include: z.array(ruleSchema).default([]),
  require: z.array(ruleSchema).default([]),
  exclude: z.array(ruleSchema).default([]),
  mfa_config: z.object({ allowed_authenticators: z.array(z.string()).optional(), mfa_disabled: z.boolean().optional() }).nullish(),
});
const oauthSchema = z.object({
  enabled: z.boolean().optional(),
  dynamic_client_registration: z
    .object({ enabled: z.boolean().optional(), allow_any_on_localhost: z.boolean().optional(), allow_any_on_loopback: z.boolean().optional() })
    .optional(),
  grant: z.object({ session_duration: z.string().optional(), access_token_lifetime: z.string().optional() }).optional(),
});
const applicationSchema = z.object({
  id: z.string(),
  type: z.string(),
  name: z.string().optional(),
  domain: z.string().optional(),
  aud: z.string().optional(),
  allowed_idps: z.array(z.string()).default([]),
  policies: z.array(policySchema).default([]),
  oauth_configuration: oauthSchema.nullish(),
});
const tunnelSchema = z.object({ id: z.string(), name: z.string() });
const accessOriginSchema = z.object({ required: z.boolean().optional(), teamName: z.string().optional(), audTag: z.array(z.string()).optional() });
const ingressRuleSchema = z.object({
  hostname: z.string().optional(),
  service: z.string(),
  originRequest: z.object({ access: accessOriginSchema.optional(), httpHostHeader: z.string().optional() }).passthrough().optional(),
});
const tunnelConfigSchema = z.object({ config: z.object({ ingress: z.array(ingressRuleSchema).default([]) }).nullish() });
const dnsRecordSchema = z.object({ id: z.string(), type: z.string(), name: z.string(), content: z.string(), proxied: z.boolean().optional() });
const botManagementSchema = z.object({ fight_mode: z.boolean().optional() });

type Policy = z.infer<typeof policySchema>;
type Application = z.infer<typeof applicationSchema>;
type IngressRule = z.infer<typeof ingressRuleSchema>;
type AppKind = "board" | "mcp" | "mac";

interface Route {
  kind: AppKind;
  hostname: string;
  tunnel: string;
  service: string;
}

interface Options {
  apply: boolean;
  accountId: string;
  zone: string;
  email: string;
  routes: Route[];
  previewDomain: string | null;
}

interface Context {
  options: Options;
  zoneId: string;
  team: string;
  googleId: string;
}

class CloudflareError extends Error {}

function usageError(message: string): never {
  console.error(`setup-cloudflare: ${message}\n\n${HELP}`);
  process.exit(EXIT_USAGE);
}

function apiToken(): string {
  const token = process.env[TOKEN_ENV]?.trim();
  if (!token) usageError(`${TOKEN_ENV} is not set`);
  return token;
}

async function cloudflare(method: string, path: string, body?: unknown): Promise<z.infer<typeof envelopeSchema>> {
  const response = await fetch(`${API_BASE}${path}`, {
    method,
    headers: { authorization: `Bearer ${apiToken()}`, "content-type": "application/json" },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    signal: AbortSignal.timeout(HTTP_TIMEOUT_MS),
  });
  const parsed = envelopeSchema.safeParse(await response.json().catch(() => null));
  if (!parsed.success) throw new CloudflareError(`${method} ${path}: unexpected answer (HTTP ${response.status})`);
  if (!parsed.data.success) throw new CloudflareError(`${method} ${path}: ${parsed.data.errors.map((error) => error.message).join("; ") || `HTTP ${response.status}`}`);
  return parsed.data;
}

async function getOne<T>(schema: z.ZodType<T>, path: string): Promise<T> {
  const parsed = schema.safeParse((await cloudflare("GET", path)).result);
  if (!parsed.success) throw new CloudflareError(`GET ${path}: unexpected result`);
  return parsed.data;
}

async function listAll<T>(schema: z.ZodType<T>, path: string): Promise<T[]> {
  const items: T[] = [];
  const separator = path.includes("?") ? "&" : "?";
  for (let page = 1; ; page += 1) {
    const envelope = await cloudflare("GET", `${path}${separator}page=${page}&per_page=${PAGE_SIZE}`);
    const parsed = z.array(schema).safeParse(envelope.result);
    if (!parsed.success) throw new CloudflareError(`GET ${path}: unexpected list`);
    items.push(...parsed.data);
    const totalPages = envelope.result_info?.total_pages ?? 1;
    if (page >= totalPages || parsed.data.length === 0) return items;
  }
}

async function create<T>(schema: z.ZodType<T>, path: string, body: unknown): Promise<T> {
  const parsed = schema.safeParse((await cloudflare("POST", path, body)).result);
  if (!parsed.success) throw new CloudflareError(`POST ${path}: unexpected result`);
  return parsed.data;
}

function hostname(value: string | undefined, flag: string): string | undefined {
  if (value === undefined) return undefined;
  if (!HOSTNAME_PATTERN.test(value)) usageError(`invalid ${flag}`);
  return value;
}

function parseCliArgs() {
  return parseArgs({
    options: {
      apply: { type: "boolean" },
      help: { type: "boolean" },
      "account-id": { type: "string" },
      zone: { type: "string" },
      email: { type: "string" },
      "board-host": { type: "string" },
      "mcp-host": { type: "string" },
      "mcp-port": { type: "string" },
      "mac-host": { type: "string" },
      "preview-domain": { type: "string" },
      tunnel: { type: "string" },
    },
    strict: true,
    allowPositionals: true,
  });
}

function parsedArgs(): ReturnType<typeof parseCliArgs> {
  try {
    return parseCliArgs();
  } catch (error) {
    usageError(error instanceof Error ? error.message : "invalid arguments");
  }
}

function accountId(value: string | undefined): string {
  if (value === undefined || !ACCOUNT_ID_PATTERN.test(value)) usageError("--account-id must be a 32-character account id");
  return value;
}

function parseOptions(values: ReturnType<typeof parseCliArgs>["values"]): Options {
  const zone = hostname(values.zone, "--zone");
  const email = values.email;
  if (zone === undefined) usageError("--zone is required");
  if (email === undefined || !z.email().safeParse(email).success) usageError("--email must be the allowed email");
  const routes: Route[] = [];
  const boardHost = hostname(values["board-host"], "--board-host");
  if (boardHost !== undefined) routes.push({ kind: "board", hostname: boardHost, tunnel: DEFAULT_VPS_TUNNEL, service: VPS_BOARD_SERVICE });
  const mcpHost = hostname(values["mcp-host"], "--mcp-host");
  if (mcpHost !== undefined) {
    const port = Number(values["mcp-port"]);
    if (!Number.isInteger(port) || port <= 0 || port > MAX_PORT) usageError("--mcp-host needs a valid --mcp-port");
    routes.push({ kind: "mcp", hostname: mcpHost, tunnel: DEFAULT_VPS_TUNNEL, service: `http://127.0.0.1:${port}` });
  }
  const macHost = hostname(values["mac-host"], "--mac-host");
  if (macHost !== undefined) routes.push({ kind: "mac", hostname: macHost, tunnel: DEFAULT_MAC_TUNNEL, service: `http://127.0.0.1:${DEFAULT_PORT}` });
  for (const route of routes) {
    if (route.hostname !== zone && !route.hostname.endsWith(`.${zone}`)) usageError(`${route.hostname} is not in the zone ${zone}`);
  }
  return {
    apply: values.apply ?? false,
    accountId: accountId(values["account-id"]),
    zone,
    email,
    routes,
    previewDomain: hostname(values["preview-domain"], "--preview-domain") ?? null,
  };
}

async function readContext(options: Options): Promise<Context | null> {
  const account = `/accounts/${options.accountId}`;
  const zones = await listAll(zoneSchema, `/zones?name=${encodeURIComponent(options.zone)}`);
  const zone = zones.find((candidate) => candidate.name === options.zone);
  if (zone === undefined) {
    report("Account", "failed", "zone", `${options.zone} is not visible to the token`);
    return null;
  }
  report("Account", "ok", "zone", `${zone.name} (${zone.id})`);
  const organization = await getOne(organizationSchema, `${account}/access/organizations`);
  const team = organization.auth_domain.endsWith(ACCESS_TEAM_SUFFIX) ? organization.auth_domain.slice(0, -ACCESS_TEAM_SUFFIX.length) : null;
  if (team === null) {
    report("Account", "failed", "Zero Trust team", `unexpected auth domain ${organization.auth_domain}`);
    return null;
  }
  report("Account", "ok", "Zero Trust team", organization.auth_domain);
  const methods = organization.mfa_config?.allowed_authenticators ?? [];
  if (MFA_AUTHENTICATORS.every((method) => methods.includes(method))) report("Account", "ok", "MFA methods", methods.join(", "));
  else report("Account", "missing", "MFA methods", "allow authenticator app and biometrics in Access settings (account-wide, by hand)");
  const providers = await listAll(identityProviderSchema, `${account}/access/identity_providers`);
  if (providers.some((provider) => provider.type === ONE_TIME_PIN_IDP_TYPE)) {
    report("Account", "missing", "One-time PIN", "still a login method: delete it in Integrations > Identity providers (account-wide, by hand)");
  } else {
    report("Account", "ok", "One-time PIN", "not a login method");
  }
  const googleProviders = providers.filter((provider) => provider.type === GOOGLE_IDP_TYPE);
  if (googleProviders.length !== 1) {
    report("Account", "missing", "Google login", `${googleProviders.length} Google identity providers; exactly one is expected (Google OAuth client, by hand)`);
    return null;
  }
  const google = googleProviders[0];
  if (google === undefined) return null;
  report("Account", "ok", "Google login", google.id);
  return { options, zoneId: zone.id, team, googleId: google.id };
}

function ruleValue(rule: Record<string, unknown>, key: string, field: string): unknown {
  const inner = rule[key];
  if (inner === null || typeof inner !== "object") return undefined;
  return Object.entries(inner).find(([name]) => name === field)?.[1];
}

function policyProblem(policy: Policy, context: Context): string | null {
  if (policy.decision !== "allow") return `decision ${policy.decision}`;
  const [include] = policy.include;
  if (policy.include.length !== 1 || include === undefined || ruleValue(include, "email", "email") !== context.options.email) return `include must be the email ${context.options.email} only`;
  if (!policy.require.some((rule) => ruleValue(rule, "login_method", "id") === context.googleId)) return "require must name the Google login method";
  if (policy.exclude.length > 0) return "exclude must be empty";
  const methods = policy.mfa_config?.allowed_authenticators ?? [];
  if (policy.mfa_config?.mfa_disabled === true || methods.length === 0) return "MFA must be required with authenticator methods";
  return null;
}

function ownerPolicyBody(context: Context): unknown {
  return {
    name: OWNER_POLICY_NAME,
    decision: "allow",
    include: [{ email: { email: context.options.email } }],
    require: [{ login_method: { id: context.googleId } }],
    session_duration: SESSION_DURATION,
    mfa_config: { allowed_authenticators: [...MFA_AUTHENTICATORS], mfa_disabled: false, session_duration: SESSION_DURATION },
  };
}

// NOTE: any reusable policy with the owner-only shape is reused, so a policy made in the dashboard is never duplicated.
async function ensureOwnerPolicy(context: Context): Promise<Policy | null> {
  const path = `/accounts/${context.options.accountId}/access/policies`;
  const conforming = (await listAll(policySchema, path)).filter((policy) => policyProblem(policy, context) === null);
  let policy = conforming.find((candidate) => candidate.name === OWNER_POLICY_NAME) ?? conforming[0];
  if (policy === undefined) {
    if (!context.options.apply) {
      report("Access", "missing", "owner policy", "no reusable policy allows only this email with Google and MFA");
      return null;
    }
    policy = await create(policySchema, path, ownerPolicyBody(context));
    report("Access", "changed", "owner policy", `created ${OWNER_POLICY_NAME} (${policy.id})`);
    return policy;
  }
  report("Access", "ok", "owner policy", `${policy.name}: allow ${context.options.email}, Google, MFA`);
  return policy;
}

function mcpOauthBody(): z.infer<typeof oauthSchema> {
  return {
    enabled: true,
    dynamic_client_registration: { enabled: true, allow_any_on_localhost: true, allow_any_on_loopback: true },
    grant: { session_duration: MCP_GRANT_SESSION, access_token_lifetime: MCP_ACCESS_TOKEN_LIFETIME },
  };
}

function applicationBody(route: Route, context: Context, policy: Policy): unknown {
  return {
    type: SELF_HOSTED_TYPE,
    name: `kanban-${route.kind}`,
    domain: route.hostname,
    session_duration: SESSION_DURATION,
    allowed_idps: [context.googleId],
    auto_redirect_to_identity: true,
    policies: [{ id: policy.id, precedence: 1 }],
    ...(route.kind === "mcp" ? { oauth_configuration: mcpOauthBody() } : {}),
  };
}

// NOTE: an empty allowed_idps means every login method; the owner policy still requires Google, so both are accepted.
function applicationProblem(app: Application, route: Route, context: Context): string | null {
  if (app.type !== SELF_HOSTED_TYPE) return `type ${app.type}`;
  const [policy] = app.policies;
  if (app.policies.length !== 1 || policy === undefined) return "must have exactly one policy, the owner policy";
  const problem = policyProblem(policy, context);
  if (problem !== null) return `policy ${policy.name}: ${problem}`;
  if (app.allowed_idps.some((id) => id !== context.googleId)) return "a login method other than Google is allowed";
  if (app.aud === undefined) return "no AUD tag";
  if (route.kind !== "mcp") return null;
  const oauth = app.oauth_configuration;
  const registration = oauth?.dynamic_client_registration;
  if (oauth?.enabled === false || registration?.enabled !== true) return "Managed OAuth with dynamic client registration is off";
  if (registration.allow_any_on_localhost !== true || registration.allow_any_on_loopback !== true) return "localhost and loopback clients must be allowed";
  return null;
}

function reportGrantLifetime(app: Application, route: Route): void {
  if (route.kind !== "mcp") return;
  const lifetime = app.oauth_configuration?.grant?.access_token_lifetime;
  if (lifetime === MCP_ACCESS_TOKEN_LIFETIME) return;
  report("Access", "warning", `application ${route.hostname}`, `access token lifetime ${lifetime ?? "not returned by the API"}: check ${MCP_ACCESS_TOKEN_LIFETIME} in the dashboard`);
}

async function ensureApplications(context: Context, policy: Policy | null): Promise<Map<string, string>> {
  const path = `/accounts/${context.options.accountId}/access/apps`;
  const apps = await listAll(applicationSchema, path);
  const audByHost = new Map<string, string>();
  if (!apps.some((app) => app.type === APP_LAUNCHER_TYPE)) report("Access", "missing", "App Launcher", "turn it on with the owner policy (account-wide, by hand)");
  else report("Access", "ok", "App Launcher", "present");
  for (const route of context.options.routes) {
    const label = `application ${route.hostname}`;
    const matches = apps.filter((app) => app.domain === route.hostname);
    if (matches.length > 1) {
      report("Access", "failed", label, `${matches.length} applications share this hostname`);
      continue;
    }
    let app = matches[0];
    if (app === undefined) {
      if (policy === null || !context.options.apply) {
        report("Access", "missing", label, policy === null ? "needs a valid owner policy" : "not created");
        continue;
      }
      app = await create(applicationSchema, path, applicationBody(route, context, policy));
      report("Access", "changed", label, `created (${app.id})`);
    }
    const problem = applicationProblem(app, route, context);
    if (problem !== null || app.aud === undefined) {
      report("Access", "failed", label, `${problem ?? "no AUD tag"}; fix it in the dashboard`);
      continue;
    }
    audByHost.set(route.hostname, app.aud);
    report("Access", "ok", label, `AUD ${app.aud}`);
    reportGrantLifetime(app, route);
  }
  return audByHost;
}

function desiredRule(route: Route, team: string, aud: string): IngressRule {
  return { hostname: route.hostname, service: route.service, originRequest: { access: { required: true, teamName: team, audTag: [aud] } } };
}

function ruleProblem(rule: IngressRule | undefined, route: Route, team: string, aud: string): string | null {
  if (rule === undefined) return "no route";
  if (rule.service !== route.service) return `service ${rule.service}, expected ${route.service}`;
  const access = rule.originRequest?.access;
  if (access?.required !== true || access.teamName !== team || !(access.audTag ?? []).includes(aud)) return "token validation is off or names another application";
  if (rule.originRequest?.httpHostHeader !== undefined) return "httpHostHeader must not be set";
  return null;
}

interface TunnelState {
  id: string | null;
  routesValid: boolean;
}

async function ensureTunnel(context: Context, name: string, routes: Route[], audByHost: Map<string, string>): Promise<TunnelState> {
  const account = `/accounts/${context.options.accountId}`;
  const tunnels = await listAll(tunnelSchema, `${account}/cfd_tunnel?is_deleted=false&name=${encodeURIComponent(name)}`);
  let tunnel = tunnels.find((candidate) => candidate.name === name);
  if (tunnel === undefined) {
    if (!context.options.apply) {
      report("Tunnel", "missing", name, "not created");
      return { id: null, routesValid: false };
    }
    // NOTE: the create answer also carries the tunnel token; only id and name are parsed, nothing else is kept.
    tunnel = await create(tunnelSchema, `${account}/cfd_tunnel`, { name, config_src: "cloudflare" });
    report("Tunnel", "changed", name, `created (${tunnel.id})`);
  } else {
    report("Tunnel", "ok", name, tunnel.id);
  }
  const configPath = `${account}/cfd_tunnel/${tunnel.id}/configurations`;
  const ingress = (await getOne(tunnelConfigSchema, configPath)).config?.ingress ?? [];
  const ready = routes.filter((route) => audByHost.has(route.hostname));
  const isEmpty = ingress.every((rule) => rule.hostname === undefined);
  if (isEmpty && context.options.apply && ready.length === routes.length && ready.length > 0) {
    const rules = ready.flatMap((route) => {
      const aud = audByHost.get(route.hostname);
      return aud === undefined ? [] : [desiredRule(route, context.team, aud)];
    });
    await cloudflare("PUT", configPath, { config: { ingress: [...rules, { service: CATCH_ALL_SERVICE }] } });
    report("Tunnel", "changed", `${name} routes`, ready.map((route) => route.hostname).join(", "));
    return { id: tunnel.id, routesValid: true };
  }
  let complete = true;
  for (const route of routes) {
    const aud = audByHost.get(route.hostname);
    const problem = aud === undefined ? "its Access application is not ready" : ruleProblem(ingress.find((rule) => rule.hostname === route.hostname), route, context.team, aud);
    if (problem === null) {
      report("Tunnel", "ok", `${name} route ${route.hostname}`, `${route.service}, token validated`);
    } else {
      complete = false;
      report("Tunnel", isEmpty ? "missing" : "failed", `${name} route ${route.hostname}`, isEmpty ? problem : `${problem}; fix it in the dashboard`);
    }
  }
  return { id: tunnel.id, routesValid: complete };
}

// NOTE: an existing record is compared with the real tunnel target; route validity only gates creating one.
async function ensureDnsRecord(context: Context, route: Route, tunnel: TunnelState): Promise<void> {
  const path = `/zones/${context.zoneId}/dns_records`;
  const label = `DNS ${route.hostname}`;
  const records = await listAll(dnsRecordSchema, `${path}?name.exact=${encodeURIComponent(route.hostname)}`);
  const target = tunnel.id === null ? null : `${tunnel.id}${TUNNEL_TARGET_SUFFIX}`;
  const [record] = records;
  if (record === undefined) {
    if (target === null || !tunnel.routesValid) {
      report("DNS", "missing", label, "waits for the Access application and the tunnel route");
    } else if (!context.options.apply) {
      report("DNS", "missing", label, "not created");
    } else {
      await create(idSchema, path, { type: "CNAME", name: route.hostname, content: target, proxied: true });
      report("DNS", "changed", label, `CNAME to ${target}, proxied`);
    }
    return;
  }
  if (records.length === 1 && record.type === "CNAME" && record.content === target && record.proxied === true) report("DNS", "ok", label, `CNAME to ${target}, proxied`);
  else report("DNS", "failed", label, `${record.type} ${record.content}${record.proxied ? ", proxied" : ""}: expected a proxied CNAME to the tunnel`);
}

async function checkZone(context: Context): Promise<void> {
  const zonePath = `/zones/${context.zoneId}`;
  if (context.options.previewDomain !== null) {
    const name = `*.${context.options.previewDomain}`;
    const records = await listAll(dnsRecordSchema, `${zonePath}/dns_records?name.exact=${encodeURIComponent(name)}`);
    if (records.length === 0) report("DNS", "missing", name, "add an A record to the VPS address, DNS only (not proxied)");
    else if (records.some((record) => record.proxied === true)) report("DNS", "failed", name, "proxied: previews need a DNS-only record");
    else report("DNS", "ok", name, records.map((record) => `${record.type} ${record.content}`).join(", "));
  }
  const bots = await getOne(botManagementSchema, `${zonePath}/bot_management`).catch(() => null);
  if (bots === null) report("Zone", "warning", "Bot Fight Mode", "not readable with this token (Bot Management Read)");
  else if (bots.fight_mode === true) report("Zone", "warning", "Bot Fight Mode", "on for the whole zone: it can block the MCP clients and the public probe");
  else report("Zone", "ok", "Bot Fight Mode", "off");
}

async function audit(options: Options): Promise<void> {
  console.log(options.apply ? "Setting up Cloudflare (create-only)" : "Auditing Cloudflare (no change)");
  const context = await readContext(options);
  if (context === null) return;
  const policy = await ensureOwnerPolicy(context);
  const audByHost = await ensureApplications(context, policy);
  const tunnelNames = [...new Set(options.routes.map((route) => route.tunnel))];
  for (const name of tunnelNames) {
    const routes = options.routes.filter((route) => route.tunnel === name);
    const tunnel = await ensureTunnel(context, name, routes, audByHost);
    for (const route of routes) await ensureDnsRecord(context, route, tunnel);
  }
  await checkZone(context);
  if (options.routes.some((route) => route.kind === "board")) {
    console.log(`\nVPS tunnel token: bun scripts/setup-cloudflare.ts tunnel-token --account-id ${options.accountId} --tunnel ${DEFAULT_VPS_TUNNEL} | ssh <alias> sudo kanban-bootstrap ... --tunnel-token-stdin (${SETUP_DOC})`);
  }
  if (options.routes.some((route) => route.kind === "mac")) {
    console.log(`Mac tunnel token: bun scripts/setup-cloudflare.ts tunnel-token --account-id ${options.accountId} --tunnel ${DEFAULT_MAC_TUNNEL} | bun scripts/setup-mac-vps-link.ts --token-stdin`);
  }
}

async function printTunnelToken(values: ReturnType<typeof parseCliArgs>["values"]): Promise<void> {
  if (process.stdout.isTTY) usageError("tunnel-token never writes to a terminal: pipe it into its consumer");
  const account = `/accounts/${accountId(values["account-id"])}`;
  const name = values.tunnel;
  if (name === undefined) usageError("tunnel-token needs --tunnel");
  const tunnels = await listAll(tunnelSchema, `${account}/cfd_tunnel?is_deleted=false&name=${encodeURIComponent(name)}`);
  const tunnel = tunnels.find((candidate) => candidate.name === name);
  if (tunnel === undefined) throw new CloudflareError(`tunnel ${name} not found`);
  const token = z.string().min(1).safeParse((await cloudflare("GET", `${account}/cfd_tunnel/${tunnel.id}/token`)).result);
  if (!token.success) throw new CloudflareError(`tunnel ${name}: unexpected token answer`);
  process.stdout.write(`${token.data}\n`);
}

async function main(): Promise<void> {
  const { values, positionals } = parsedArgs();
  if (values.help) {
    console.log(HELP);
    process.exit(0);
  }
  const tokenCommand = positionals[0] === "tunnel-token" && positionals.length === 1;
  if (positionals.length > 0 && !tokenCommand) usageError(`unknown command ${positionals.join(" ")}`);
  try {
    if (tokenCommand) await printTunnelToken(values);
    else await audit(parseOptions(values));
  } catch (error) {
    if (!(error instanceof CloudflareError) && !(error instanceof TypeError) && !(error instanceof DOMException)) throw error;
    if (tokenCommand) {
      console.error(`setup-cloudflare: ${error.message}`);
      process.exit(1);
    }
    report("Cloudflare", "failed", "API", error.message);
  }
  if (!tokenCommand) finish();
}

await main();
