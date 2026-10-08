import { chmodSync, existsSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { createConnection } from "node:net";
import { join } from "node:path";

const COOLIFY_TIMEOUT_MS = 30_000;
const CLEANUP_TIMEOUT_MS = 60_000;
const SOCKET_MODE = 0o660;
const STATE_FILE_MODE = 0o600;
const MAX_REQUEST_BYTES = 256 * 1024;
const MAX_BASIC_AUTH_BYTES = 31;
const DEFAULT_MAX_ACTIVE_PREVIEWS = 3;
const HTTP_FORBIDDEN = 403;
const HTTP_BAD_REQUEST = 400;
const HTTP_TOO_MANY = 429;
const HTTP_UNPROCESSABLE = 422;
const HTTP_BAD_GATEWAY = 502;
const COOLIFY_PREFIX = "/coolify";
const CLEANUP_PATH = "/kanban/cleanup";
const DELETE_QUERY = "delete_configurations=true&delete_volumes=true&docker_cleanup=false&delete_connected_networks=true";
const UUID_PATTERN = /^[a-z0-9]{24}$/;
const RESOURCE_UUID_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;
const MARKER_PATTERN = /^kanban-preview-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const COMMIT_PATTERN = /^[0-9a-f]{40}$/;
const BRANCH_PATTERN = /^[A-Za-z0-9._/-]{1,200}$/;
const ENV_KEY_PATTERN = /^[A-Z_][A-Z0-9_]{0,99}$/;
const REPOSITORY_PATTERN = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/;
const CREATE_ENDPOINTS: Record<SourceType, string> = {
  public: "/applications/public",
  github_app: "/applications/private-github-app",
  deploy_key: "/applications/private-deploy-key",
};

type SourceType = "public" | "github_app" | "deploy_key";

interface ProjectConfig {
  repository: string;
  host: string;
  source: { type: SourceType; uuid?: string };
  dockerfile: string;
  buildContext: string;
  port: number;
}

interface BrokerConfig {
  coolify: { baseUrl: string; token: string; serverUuid: string; projectUuid: string; environmentName: string; destinationUuid?: string };
  domainBase: string;
  maxActivePreviews?: number;
  projects: Record<string, ProjectConfig>;
}

interface AppEntry {
  marker: string;
  project: string;
  createdAt: number;
  deletedAt: number | null;
  deployments: string[];
}

interface Registry {
  intents: Record<string, number>;
  apps: Record<string, AppEntry>;
}

class PolicyError extends Error {
  constructor(readonly status: number, message: string) { super(message); }
}

function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required.`);
  return value;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function requireString(value: unknown, label: string, pattern?: RegExp): string {
  if (typeof value !== "string" || value.length === 0 || (pattern && !pattern.test(value))) throw new PolicyError(HTTP_BAD_REQUEST, `Invalid ${label}.`);
  return value;
}

function loadConfig(path: string): BrokerConfig {
  const raw: unknown = JSON.parse(readFileSync(path, "utf8"));
  if (!isRecord(raw) || !isRecord(raw.coolify) || !isRecord(raw.projects) || typeof raw.domainBase !== "string") throw new Error("Invalid broker configuration.");
  const coolify = raw.coolify;
  for (const key of ["baseUrl", "token", "serverUuid", "projectUuid", "environmentName"]) {
    if (typeof coolify[key] !== "string" || coolify[key] === "") throw new Error(`Broker configuration requires coolify.${key}.`);
  }
  if (!new URL(String(coolify.baseUrl)).protocol.startsWith("https")) throw new Error("The Coolify base URL must use HTTPS.");
  const projects: Record<string, ProjectConfig> = {};
  for (const [key, value] of Object.entries(raw.projects)) {
    if (!isRecord(value) || !isRecord(value.source)) throw new Error(`Invalid project ${key}.`);
    const sourceType = value.source.type;
    if (sourceType !== "public" && sourceType !== "github_app" && sourceType !== "deploy_key") throw new Error(`Invalid source for project ${key}.`);
    if (sourceType !== "public" && typeof value.source.uuid !== "string") throw new Error(`Project ${key} requires a source uuid.`);
    if (typeof value.repository !== "string" || !REPOSITORY_PATTERN.test(value.repository) || typeof value.host !== "string" || typeof value.dockerfile !== "string" || typeof value.buildContext !== "string" || typeof value.port !== "number") throw new Error(`Incomplete project ${key}.`);
    projects[key] = {
      repository: value.repository, host: value.host, dockerfile: value.dockerfile, buildContext: value.buildContext, port: value.port,
      source: sourceType === "public" ? { type: "public" } : { type: sourceType, uuid: String(value.source.uuid) },
    };
  }
  return {
    coolify: {
      baseUrl: String(coolify.baseUrl), token: String(coolify.token), serverUuid: String(coolify.serverUuid), projectUuid: String(coolify.projectUuid), environmentName: String(coolify.environmentName),
      ...(typeof coolify.destinationUuid === "string" ? { destinationUuid: coolify.destinationUuid } : {}),
    },
    domainBase: raw.domainBase,
    maxActivePreviews: typeof raw.maxActivePreviews === "number" ? raw.maxActivePreviews : DEFAULT_MAX_ACTIVE_PREVIEWS,
    projects,
  };
}

const config = loadConfig(process.env.CREDENTIALS_DIRECTORY ? join(process.env.CREDENTIALS_DIRECTORY, "config") : requireEnv("KANBAN_PREVIEW_BROKER_CONFIG"));
const registryPath = join(process.env.STATE_DIRECTORY ?? requireEnv("KANBAN_PREVIEW_BROKER_STATE"), "registry.json");
const socketPath = process.env.KANBAN_PREVIEW_BROKER_SOCKET?.trim() || "/run/kanban-preview/broker.sock";
const cleanupSocketPath = process.env.KANBAN_PREVIEW_CLEANUP_SOCKET?.trim() || "/run/kanban-preview-cleanup.sock";

function readRegistry(): Registry {
  if (!existsSync(registryPath)) return { intents: {}, apps: {} };
  const raw: unknown = JSON.parse(readFileSync(registryPath, "utf8"));
  if (!isRecord(raw) || !isRecord(raw.intents) || !isRecord(raw.apps)) throw new Error("The preview registry is corrupted.");
  const intents: Record<string, number> = {};
  for (const [marker, value] of Object.entries(raw.intents)) if (typeof value === "number") intents[marker] = value;
  const apps: Record<string, AppEntry> = {};
  for (const [uuid, value] of Object.entries(raw.apps)) {
    if (!isRecord(value) || typeof value.marker !== "string" || typeof value.project !== "string" || !Array.isArray(value.deployments)) continue;
    apps[uuid] = {
      marker: value.marker, project: value.project, createdAt: Number(value.createdAt ?? 0),
      deletedAt: typeof value.deletedAt === "number" ? value.deletedAt : null,
      deployments: value.deployments.filter((entry): entry is string => typeof entry === "string"),
    };
  }
  return { intents, apps };
}

function writeRegistry(registry: Registry): void {
  const temporary = `${registryPath}.${process.pid}.tmp`;
  writeFileSync(temporary, JSON.stringify(registry), { mode: STATE_FILE_MODE });
  renameSync(temporary, registryPath);
}

function mutateRegistry(change: (registry: Registry) => void): Registry {
  const registry = readRegistry();
  change(registry);
  writeRegistry(registry);
  return registry;
}

function ownedApp(uuid: string): AppEntry {
  const entry = readRegistry().apps[uuid];
  if (!entry) throw new PolicyError(HTTP_FORBIDDEN, "The application is not owned by the preview broker.");
  return entry;
}

function ownedDeployment(uuid: string): string {
  const owner = Object.entries(readRegistry().apps).find(([, entry]) => entry.deployments.includes(uuid));
  if (!owner) throw new PolicyError(HTTP_FORBIDDEN, "The deployment is not owned by the preview broker.");
  return owner[0];
}

function recordDeployments(appUuid: string, deployments: unknown): void {
  const uuids = (Array.isArray(deployments) ? deployments : []).flatMap((deployment) => {
    if (!isRecord(deployment)) return [];
    const uuid = deployment.deployment_uuid ?? deployment.uuid;
    return typeof uuid === "string" && RESOURCE_UUID_PATTERN.test(uuid) ? [uuid] : [];
  });
  if (uuids.length === 0) return;
  mutateRegistry((registry) => {
    const entry = registry.apps[appUuid];
    if (entry) entry.deployments = [...new Set([...entry.deployments, ...uuids])];
  });
}

async function coolify(method: string, path: string, body?: unknown): Promise<{ status: number; body: unknown }> {
  const response = await fetch(`${config.coolify.baseUrl.replace(/\/$/, "")}/api/v1${path}`, {
    method,
    headers: { authorization: `Bearer ${config.coolify.token}`, "content-type": "application/json", accept: "application/json" },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    signal: AbortSignal.timeout(COOLIFY_TIMEOUT_MS),
    redirect: "error",
  });
  return { status: response.status, body: await response.json().catch(() => null) };
}

function repositoryIdentity(gitRepository: string): string {
  const sshMatch = /^git@[^:]+:(.+?)(?:\.git)?$/.exec(gitRepository);
  if (sshMatch?.[1]) return sshMatch[1].toLowerCase();
  if (gitRepository.startsWith("https://")) return new URL(gitRepository).pathname.replace(/^\//, "").replace(/\.git$/, "").toLowerCase();
  return gitRepository.toLowerCase();
}

function sourceRepository(project: ProjectConfig): string {
  if (project.source.type === "deploy_key") return `git@${project.host}:${project.repository}.git`;
  if (project.source.type === "public") return new URL(`/${project.repository}`, `https://${project.host}`).href;
  return project.repository;
}

async function configuredEnvironmentUuid(): Promise<string> {
  const result = await coolify("GET", `/projects/${encodeURIComponent(config.coolify.projectUuid)}/environments`);
  const environments = Array.isArray(result.body) ? result.body : [];
  const match = environments.find((entry) => isRecord(entry) && entry.name === config.coolify.environmentName);
  if (!isRecord(match) || typeof match.uuid !== "string") throw new PolicyError(HTTP_BAD_GATEWAY, "The configured Coolify environment does not exist.");
  return match.uuid;
}

async function createApplication(body: unknown): Promise<{ status: number; body: unknown }> {
  if (!isRecord(body)) throw new PolicyError(HTTP_BAD_REQUEST, "Invalid application payload.");
  const marker = requireString(body.name, "ownership marker", MARKER_PATTERN);
  if (body.description !== marker) throw new PolicyError(HTTP_BAD_REQUEST, "The application description must be its ownership marker.");
  if (body.build_pack !== "dockerfile" || body.docker_compose_location !== undefined || body.docker_compose_domains !== undefined) throw new PolicyError(HTTP_FORBIDDEN, "Only Dockerfile previews are allowed on this host.");
  if (body.custom_docker_run_options !== undefined) throw new PolicyError(HTTP_FORBIDDEN, "Custom Docker run options are not allowed.");
  if (body.server_uuid !== config.coolify.serverUuid || body.project_uuid !== config.coolify.projectUuid) throw new PolicyError(HTTP_FORBIDDEN, "The preview settings do not match the broker configuration.");
  const branch = requireString(body.git_branch, "branch", BRANCH_PATTERN);
  const commit = requireString(body.git_commit_sha, "commit", COMMIT_PATTERN);
  const identity = repositoryIdentity(requireString(body.git_repository, "repository"));
  const projectEntry = Object.entries(config.projects).find(([, project]) => project.repository.toLowerCase() === identity);
  if (!projectEntry) throw new PolicyError(HTTP_FORBIDDEN, "The repository is not configured for previews.");
  const [projectKey, project] = projectEntry;
  if (body.is_http_basic_auth_enabled !== true) throw new PolicyError(HTTP_FORBIDDEN, "Preview authentication is required.");
  const username = requireString(body.http_basic_auth_username, "preview username");
  const password = requireString(body.http_basic_auth_password, "preview password");
  if (Buffer.byteLength(password, "utf8") > MAX_BASIC_AUTH_BYTES) throw new PolicyError(HTTP_BAD_REQUEST, "The preview password is too long.");
  const registry = readRegistry();
  const active = Object.values(registry.apps).filter((entry) => entry.deletedAt === null).length + Object.keys(registry.intents).length;
  if (active >= (config.maxActivePreviews ?? DEFAULT_MAX_ACTIVE_PREVIEWS)) throw new PolicyError(HTTP_TOO_MANY, "Too many active previews.");
  const environmentUuid = await configuredEnvironmentUuid();
  const payload: Record<string, unknown> = {
    name: marker, description: marker, tags: [marker],
    server_uuid: config.coolify.serverUuid, project_uuid: config.coolify.projectUuid,
    environment_uuid: environmentUuid, environment_name: config.coolify.environmentName,
    git_repository: sourceRepository(project), git_branch: branch, git_commit_sha: commit,
    build_pack: "dockerfile", dockerfile_location: `/${project.dockerfile}`, ports_exposes: String(project.port),
    base_directory: project.buildContext === "." ? "/" : `/${project.buildContext}`,
    instant_deploy: false, is_auto_deploy_enabled: false, is_preview_deployments_enabled: false, autogenerate_domain: false,
    is_http_basic_auth_enabled: true, http_basic_auth_username: username, http_basic_auth_password: password,
    ...(config.coolify.destinationUuid ? { destination_uuid: config.coolify.destinationUuid } : {}),
    ...(project.source.type === "github_app" ? { github_app_uuid: project.source.uuid } : {}),
    ...(project.source.type === "deploy_key" ? { private_key_uuid: project.source.uuid } : {}),
  };
  mutateRegistry((current) => { current.intents[marker] = Date.now(); });
  const result = await coolify("POST", CREATE_ENDPOINTS[project.source.type], payload);
  const uuid = isRecord(result.body) && typeof result.body.uuid === "string" ? result.body.uuid : null;
  mutateRegistry((current) => {
    if (uuid !== null) current.apps[uuid] = { marker, project: projectKey, createdAt: Date.now(), deletedAt: null, deployments: [] };
    if (uuid !== null || result.status === HTTP_BAD_REQUEST || result.status === HTTP_UNPROCESSABLE) delete current.intents[marker];
  });
  return result;
}

async function listApplications(): Promise<{ status: number; body: unknown }> {
  const registry = readRegistry();
  const markers = new Set([...Object.keys(registry.intents), ...Object.values(registry.apps).map((entry) => entry.marker)]);
  const result = await coolify("GET", "/applications");
  if (!Array.isArray(result.body)) return result;
  const owned = result.body.filter((app) => isRecord(app) && typeof app.name === "string" && markers.has(app.name));
  mutateRegistry((current) => {
    for (const app of owned) {
      if (!isRecord(app) || typeof app.uuid !== "string" || typeof app.name !== "string") continue;
      const marker = app.name;
      if (current.intents[marker] === undefined || current.apps[app.uuid]) continue;
      const project = Object.entries(config.projects).find(([, entry]) => typeof app.git_repository === "string" && repositoryIdentity(app.git_repository) === entry.repository.toLowerCase())?.[0] ?? "unknown";
      current.apps[app.uuid] = { marker, project, createdAt: Date.now(), deletedAt: null, deployments: [] };
      delete current.intents[marker];
    }
  });
  return { status: result.status, body: owned };
}

function updateApplication(uuid: string, body: unknown): Promise<{ status: number; body: unknown }> {
  const entry = ownedApp(uuid);
  if (!isRecord(body)) throw new PolicyError(HTTP_BAD_REQUEST, "Invalid application update.");
  const allowed: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(body)) {
    if (key === "domains") {
      if (value !== `https://${entry.marker}.${config.domainBase}`) throw new PolicyError(HTTP_FORBIDDEN, "The preview domain does not match the broker configuration.");
      allowed.domains = value;
    } else if (key === "git_commit_sha") allowed.git_commit_sha = requireString(value, "commit", COMMIT_PATTERN);
    else if ((key === "is_auto_deploy_enabled" || key === "is_preview_deployments_enabled") && value === false) allowed[key] = false;
    else throw new PolicyError(HTTP_FORBIDDEN, `The application field ${key} cannot be changed through the broker.`);
  }
  return coolify("PATCH", `/applications/${encodeURIComponent(uuid)}`, allowed);
}

function updateEnvironment(uuid: string, body: unknown): Promise<{ status: number; body: unknown }> {
  ownedApp(uuid);
  if (!isRecord(body) || !Array.isArray(body.data)) throw new PolicyError(HTTP_BAD_REQUEST, "Invalid environment update.");
  const data = body.data.map((entry) => {
    if (!isRecord(entry) || typeof entry.value !== "string") throw new PolicyError(HTTP_BAD_REQUEST, "Invalid environment entry.");
    const key = requireString(entry.key, "environment key", ENV_KEY_PATTERN);
    return { key, value: entry.value, is_preview: false, is_buildtime: false, is_runtime: true, is_literal: true, is_multiline: false, is_shown_once: entry.is_shown_once === true };
  });
  return coolify("PATCH", `/applications/${encodeURIComponent(uuid)}/envs/bulk`, { data });
}

async function deleteApplication(uuid: string): Promise<{ status: number; body: unknown }> {
  ownedApp(uuid);
  const result = await coolify("DELETE", `/applications/${encodeURIComponent(uuid)}?${DELETE_QUERY}`);
  if ((result.status >= 200 && result.status < 300) || result.status === 404) {
    mutateRegistry((registry) => {
      const entry = registry.apps[uuid];
      if (entry && entry.deletedAt === null) entry.deletedAt = Date.now();
    });
  }
  return result;
}

async function deploy(body: unknown): Promise<{ status: number; body: unknown }> {
  if (!isRecord(body)) throw new PolicyError(HTTP_BAD_REQUEST, "Invalid deployment request.");
  const uuid = requireString(body.uuid, "application", RESOURCE_UUID_PATTERN);
  if (ownedApp(uuid).deletedAt !== null) throw new PolicyError(HTTP_FORBIDDEN, "The application was deleted.");
  const result = await coolify("POST", "/deploy", { uuid, force: false });
  if (isRecord(result.body)) recordDeployments(uuid, result.body.deployments);
  return result;
}

async function listDeployments(uuid: string): Promise<{ status: number; body: unknown }> {
  ownedApp(uuid);
  const result = await coolify("GET", `/deployments/applications/${encodeURIComponent(uuid)}`);
  recordDeployments(uuid, isRecord(result.body) ? result.body.deployments : result.body);
  return result;
}

function filterList(result: { status: number; body: unknown }, allowed: (item: Record<string, unknown>) => boolean, pick?: (item: Record<string, unknown>) => Record<string, unknown>) {
  if (!Array.isArray(result.body)) return result;
  const items = result.body.filter((item): item is Record<string, unknown> => isRecord(item) && allowed(item));
  return { status: result.status, body: pick ? items.map(pick) : items };
}

function configuredSourceUuids(type: SourceType): Set<string> {
  return new Set(Object.values(config.projects).flatMap((project) => project.source.type === type && project.source.uuid ? [project.source.uuid] : []));
}

async function githubAppRepositories(id: string): Promise<{ status: number; body: unknown }> {
  const apps = await coolify("GET", "/github-apps");
  const allowed = configuredSourceUuids("github_app");
  const match = Array.isArray(apps.body) && apps.body.some((app) => isRecord(app) && String(app.id) === id && typeof app.uuid === "string" && allowed.has(app.uuid));
  if (!match) throw new PolicyError(HTTP_FORBIDDEN, "The GitHub App is not configured for previews.");
  return coolify("GET", `/github-apps/${encodeURIComponent(id)}/repositories`);
}

async function routeCoolify(method: string, path: string, body: unknown): Promise<{ status: number; body: unknown }> {
  const segments = path.split("?")[0]?.split("/").filter(Boolean).map(decodeURIComponent) ?? [];
  const [first, second, third, fourth] = segments;
  const { serverUuid, projectUuid, environmentName } = config.coolify;
  if (method === "GET" && first === "servers" && second === undefined) return filterList(await coolify("GET", "/servers"), (item) => item.uuid === serverUuid);
  if (method === "GET" && first === "servers" && second === serverUuid && third === undefined) return coolify("GET", `/servers/${encodeURIComponent(serverUuid)}`);
  if (method === "GET" && first === "projects" && second === undefined) return filterList(await coolify("GET", "/projects"), (item) => item.uuid === projectUuid);
  if (first === "projects" && second === projectUuid && third === undefined && method === "GET") return coolify("GET", `/projects/${encodeURIComponent(projectUuid)}`);
  if (first === "projects" && second === projectUuid && third === "environments" && fourth === undefined) {
    if (method === "GET") return coolify("GET", `/projects/${encodeURIComponent(projectUuid)}/environments`);
    if (method === "POST" && isRecord(body) && body.name === environmentName) return coolify("POST", `/projects/${encodeURIComponent(projectUuid)}/environments`, { name: environmentName });
  }
  if (method === "GET" && first === "github-apps" && second === undefined) {
    const allowed = configuredSourceUuids("github_app");
    return filterList(await coolify("GET", "/github-apps"), (item) => typeof item.uuid === "string" && allowed.has(item.uuid));
  }
  if (method === "GET" && first === "github-apps" && second !== undefined && third === "repositories" && fourth === undefined) return githubAppRepositories(requireString(second, "GitHub App", /^[0-9]+$/));
  if (method === "GET" && first === "security" && second === "keys" && third === undefined) {
    const allowed = configuredSourceUuids("deploy_key");
    return filterList(await coolify("GET", "/security/keys"), (item) => typeof item.uuid === "string" && allowed.has(item.uuid), (item) => ({ uuid: item.uuid, name: item.name ?? null, description: item.description ?? null }));
  }
  if (first === "applications" && second === undefined && method === "GET") return listApplications();
  if (first === "applications" && method === "POST" && third === undefined && (second === "public" || second === "private-github-app" || second === "private-deploy-key")) return createApplication(body);
  if (first === "applications" && second !== undefined && third === undefined) {
    const uuid = requireString(second, "application", RESOURCE_UUID_PATTERN);
    if (method === "GET") { ownedApp(uuid); return coolify("GET", `/applications/${encodeURIComponent(uuid)}`); }
    if (method === "PATCH") return updateApplication(uuid, body);
    if (method === "DELETE") return deleteApplication(uuid);
  }
  if (first === "applications" && second !== undefined && third === "envs" && fourth === "bulk" && method === "PATCH") return updateEnvironment(requireString(second, "application", RESOURCE_UUID_PATTERN), body);
  if (first === "deploy" && second === undefined && method === "POST") return deploy(body);
  if (first === "deployments" && second === "applications" && third !== undefined && fourth === undefined && method === "GET") return listDeployments(requireString(third, "application", RESOURCE_UUID_PATTERN));
  if (first === "deployments" && second !== undefined && second !== "applications") {
    const uuid = requireString(second, "deployment", RESOURCE_UUID_PATTERN);
    ownedDeployment(uuid);
    if (method === "GET" && third === undefined) return coolify("GET", `/deployments/${encodeURIComponent(uuid)}`);
    if (method === "POST" && third === "cancel" && fourth === undefined) return coolify("POST", `/deployments/${encodeURIComponent(uuid)}/cancel`);
  }
  throw new PolicyError(HTTP_FORBIDDEN, `${method} ${path.split("?")[0]} is not allowed through the preview broker.`);
}

function requestCleanup(request: { appUuid: string; mode: "remove" | "verify"; deploymentUuids: string[] }): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const connection = createConnection(cleanupSocketPath);
    let output = "";
    const timer = setTimeout(() => { connection.destroy(); reject(new Error("The cleanup helper timed out.")); }, CLEANUP_TIMEOUT_MS);
    connection.setEncoding("utf8");
    connection.on("connect", () => connection.write(`${JSON.stringify(request)}\n`));
    connection.on("data", (chunk: string) => { output += chunk; });
    connection.on("error", (error) => { clearTimeout(timer); reject(error); });
    connection.on("close", () => {
      clearTimeout(timer);
      try { resolve(JSON.parse(output.trim().split("\n").at(-1) ?? "")); } catch { reject(new Error("The cleanup helper returned an invalid result.")); }
    });
  });
}

async function cleanup(body: unknown): Promise<{ status: number; body: unknown }> {
  if (!isRecord(body)) throw new PolicyError(HTTP_BAD_REQUEST, "Invalid cleanup request.");
  const appUuid = requireString(body.appUuid, "application", UUID_PATTERN);
  const entry = ownedApp(appUuid);
  const deploymentUuids = Array.isArray(body.deploymentUuids) ? body.deploymentUuids.map((uuid) => requireString(uuid, "deployment", UUID_PATTERN)) : [];
  if (deploymentUuids.some((uuid) => !entry.deployments.includes(uuid))) throw new PolicyError(HTTP_FORBIDDEN, "A deployment is not owned by this preview.");
  const mode = body.mode === "remove" ? "remove" : "verify";
  return { status: 200, body: await requestCleanup({ appUuid, mode, deploymentUuids }) };
}

async function readBody(request: Request): Promise<unknown> {
  if (request.method === "GET" || request.method === "DELETE") return undefined;
  const text = await request.text();
  if (text.length > MAX_REQUEST_BYTES) throw new PolicyError(HTTP_BAD_REQUEST, "The request is too large.");
  return text === "" ? undefined : JSON.parse(text);
}

rmSync(socketPath, { force: true });
Bun.serve({
  unix: socketPath,
  async fetch(request) {
    const url = new URL(request.url);
    try {
      const body = await readBody(request);
      let result: { status: number; body: unknown };
      if (url.pathname === CLEANUP_PATH && request.method === "POST") result = await cleanup(body);
      else if (url.pathname.startsWith(`${COOLIFY_PREFIX}/`)) result = await routeCoolify(request.method, `${url.pathname.slice(COOLIFY_PREFIX.length)}${url.search}`, body);
      else throw new PolicyError(HTTP_FORBIDDEN, "Unknown broker endpoint.");
      return Response.json(result.body, { status: result.status });
    } catch (error) {
      const status = error instanceof PolicyError ? error.status : HTTP_BAD_GATEWAY;
      const message = error instanceof Error ? error.message : "Preview broker failure.";
      console.error(JSON.stringify({ level: "warn", method: request.method, path: url.pathname, status, message }));
      return Response.json({ message, errors: { broker: [message] } }, { status });
    }
  },
});
chmodSync(socketPath, SOCKET_MODE);
console.log(JSON.stringify({ level: "info", message: "preview broker ready", socket: socketPath, projects: Object.keys(config.projects) }));
