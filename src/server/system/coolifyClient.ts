import { z } from "zod";

import { PREVIEW_AUTH_HASH_ENV } from "../../shared/preview.ts";

const REQUEST_TIMEOUT_MS = 30_000;
const HTTP_NOT_FOUND = 404;
const API_ERROR_SCHEMA = z.object({ errors: z.record(z.string(), z.unknown()).optional() });
const API_FIELD_PATTERN = /^[a-zA-Z0-9_.]{1,100}$/;
const RESOURCE_SCHEMA = z.object({ uuid: z.string(), name: z.string().nullable().optional() }).passthrough();
const APPLICATION_SCHEMA = RESOURCE_SCHEMA.extend({ status: z.string().nullable().optional(), git_commit_sha: z.string().nullable().optional(), fqdn: z.string().nullable().optional() });
const DEPLOYMENT_SCHEMA = z.object({ deployment_uuid: z.string().optional(), uuid: z.string().optional(), status: z.string().optional(), commit: z.string().nullable().optional() }).passthrough();
const GITHUB_APP_SCHEMA = z.object({
  id: z.number().int().nonnegative(), uuid: z.string().min(1), name: z.string().nullable().optional(),
  installation_id: z.union([z.number().int().nonnegative(), z.string().regex(/^[0-9]*$/)]).nullable(),
  is_public: z.boolean().optional(),
  html_url: z.string().nullable().optional(),
});
const GITHUB_REPOSITORIES_SCHEMA = z.object({ repositories: z.array(z.object({ full_name: z.string().min(1), html_url: z.string().min(1) })) });

export interface CoolifyRequest {
  baseUrl: string;
  token: string;
  method: "GET" | "POST" | "PATCH" | "DELETE";
  path: string;
  body?: unknown;
}

export interface CoolifyResponse {
  status: number;
  body: unknown;
}

export type CoolifyTransport = (request: CoolifyRequest) => Promise<CoolifyResponse>;

export class CoolifyRequestError extends Error {
  constructor(readonly status: number, message: string) { super(message); }
}

export async function requestCoolify(request: CoolifyRequest): Promise<CoolifyResponse> {
  const url = new URL(`${request.baseUrl.replace(/\/$/, "")}/api/v1${request.path}`);
  const response = await fetch(url, {
    method: request.method,
    headers: { authorization: `Bearer ${request.token}`, "content-type": "application/json", accept: "application/json" },
    ...(request.body === undefined ? {} : { body: JSON.stringify(request.body) }),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    redirect: "error",
  });
  const body: unknown = await response.json().catch(() => null);
  return { status: response.status, body };
}

export class CoolifyClient {
  constructor(private readonly credentials: { baseUrl: string; token: string }, private readonly transport: CoolifyTransport) {}

  private async request(method: CoolifyRequest["method"], path: string, body?: unknown, allowMissing = false): Promise<unknown> {
    const result = await this.transport({ ...this.credentials, method, path, ...(body === undefined ? {} : { body }) });
    if (allowMissing && result.status === HTTP_NOT_FOUND) return null;
    if (result.status < 200 || result.status >= 300) {
      const error = API_ERROR_SCHEMA.safeParse(result.body);
      const fields = error.success ? Object.keys(error.data.errors ?? {}).filter((field) => API_FIELD_PATTERN.test(field)) : [];
      const details = fields.length > 0 ? ` Invalid fields: ${fields.join(", ")}.` : "";
      throw new CoolifyRequestError(result.status, `Coolify ${method} ${path} failed (HTTP ${result.status}).${details}`);
    }
    return result.body;
  }

  async inventory(projectUuid: string | null) {
    const [servers, projects, githubApps] = await Promise.all([
      this.request("GET", "/servers"), this.request("GET", "/projects"), this.request("GET", "/github-apps"),
    ]);
    let environments: Array<{ uuid: string; name?: string | null }> = [];
    if (projectUuid) {
      const project = z.object({ environments: z.array(RESOURCE_SCHEMA).default([]) }).parse(await this.request("GET", `/projects/${encodeURIComponent(projectUuid)}`));
      environments = project.environments;
    }
    const appNames = z.array(z.object({ uuid: z.string(), name: z.string().nullable().optional() })).parse(githubApps);
    return { servers: z.array(RESOURCE_SCHEMA).parse(servers), projects: z.array(RESOURCE_SCHEMA).parse(projects), githubApps: appNames, environments };
  }

  async githubApps() {
    const parsed = z.array(GITHUB_APP_SCHEMA).safeParse(await this.request("GET", "/github-apps"));
    if (!parsed.success) throw new Error("Coolify GitHub source discovery returned an invalid response.");
    return parsed.data;
  }

  async githubRepositories(id: number) {
    const parsed = GITHUB_REPOSITORIES_SCHEMA.safeParse(await this.request("GET", `/github-apps/${id}/repositories`));
    if (!parsed.success) throw new Error("Coolify GitHub repository discovery returned an invalid response.");
    return parsed.data.repositories;
  }

  async findApplication(name: string) {
    return z.array(APPLICATION_SCHEMA).parse(await this.request("GET", "/applications")).find((app) => app.name === name) ?? null;
  }

  async getServerAddress(uuid: string): Promise<string> {
    return z.object({ ip: z.string().min(1) }).parse(await this.request("GET", `/servers/${encodeURIComponent(uuid)}`)).ip;
  }

  async getDeploymentTimeoutSeconds(uuid: string): Promise<number> {
    const server = z.object({ settings: z.object({ dynamic_timeout: z.number().int().positive() }) }).safeParse(await this.request("GET", `/servers/${encodeURIComponent(uuid)}`));
    if (!server.success) throw new Error("Coolify must report a positive deployment timeout before a preview deployment can be queued.");
    return server.data.settings.dynamic_timeout;
  }

  async ensureEnvironment(projectUuid: string, name: string) {
    const read = async () => z.array(RESOURCE_SCHEMA).parse(await this.request("GET", `/projects/${encodeURIComponent(projectUuid)}/environments`));
    const existing = (await read()).find((environment) => environment.name === name);
    if (existing) return existing;
    try {
      const created = RESOURCE_SCHEMA.parse(await this.request("POST", `/projects/${encodeURIComponent(projectUuid)}/environments`, { name }));
      return { uuid: created.uuid, name };
    } catch (error) {
      const recovered = (await read()).find((environment) => environment.name === name);
      if (recovered) return recovered;
      throw error;
    }
  }

  async createApplication(path: string, body: Record<string, unknown>) {
    return RESOURCE_SCHEMA.parse(await this.request("POST", path, body));
  }

  async application(uuid: string) {
    const body = await this.request("GET", `/applications/${encodeURIComponent(uuid)}`, undefined, true);
    return body === null ? null : APPLICATION_SCHEMA.parse(body);
  }

  async updateApplication(uuid: string, body: Record<string, unknown>): Promise<void> {
    await this.request("PATCH", `/applications/${encodeURIComponent(uuid)}`, body);
  }

  async setEnvironment(uuid: string, values: Record<string, string>): Promise<void> {
    if (Object.keys(values).length === 0) return;
    await this.request("PATCH", `/applications/${encodeURIComponent(uuid)}/envs/bulk`, { data: Object.entries(values).map(([key, value]) => ({ key, value, is_preview: false, is_buildtime: false, is_runtime: true, is_literal: true, is_multiline: false, is_shown_once: key === PREVIEW_AUTH_HASH_ENV })) });
  }

  async deploy(uuid: string) {
    const body = z.object({ deployments: z.array(DEPLOYMENT_SCHEMA) }).parse(await this.request("POST", "/deploy", { uuid, force: false }));
    const deployment = body.deployments[0];
    const deploymentUuid = deployment?.deployment_uuid ?? deployment?.uuid;
    if (!deploymentUuid) throw new Error("Coolify did not return a deployment identifier.");
    return deploymentUuid;
  }

  async deployment(uuid: string) {
    return DEPLOYMENT_SCHEMA.parse(await this.request("GET", `/deployments/${encodeURIComponent(uuid)}`));
  }

  async deployments(uuid: string) {
    const body = await this.request("GET", `/deployments/applications/${encodeURIComponent(uuid)}`);
    const object = z.object({ deployments: z.array(DEPLOYMENT_SCHEMA) }).safeParse(body);
    if (object.success) return object.data.deployments;
    return z.array(DEPLOYMENT_SCHEMA).parse(body);
  }

  async cancelDeployment(uuid: string): Promise<void> {
    await this.request("POST", `/deployments/${encodeURIComponent(uuid)}/cancel`);
  }

  async deleteApplication(uuid: string): Promise<void> {
    await this.request("DELETE", `/applications/${encodeURIComponent(uuid)}?delete_configurations=true&delete_volumes=true&docker_cleanup=false&delete_connected_networks=true`, undefined, true);
  }
}

export function createFakeCoolifyTransport(): CoolifyTransport {
  const applications = new Map<string, Record<string, unknown>>();
  const deployments = new Map<string, Record<string, unknown>>();
  return async (request) => {
    const path = request.path.split("?")[0] ?? request.path;
    const body = z.record(z.string(), z.unknown()).safeParse(request.body);
    const values = body.success ? body.data : {};
    if (path === "/servers") return { status: 200, body: [{ uuid: "fake-server", name: "Simulated preview server" }] };
    if (path.startsWith("/servers/")) return { status: 200, body: { ip: "127.0.0.1", settings: { dynamic_timeout: 3600 } } };
    if (path === "/projects") return { status: 200, body: [{ uuid: "fake-project", name: "Simulated previews" }] };
    if (path === "/github-apps") return { status: 200, body: [{ id: 1, uuid: "fake-github-app", name: "Simulated GitHub app", installation_id: 1, html_url: "https://github.com" }] };
    if (path === "/github-apps/1/repositories") return { status: 200, body: { repositories: [{ full_name: "example/preview-demo", html_url: "https://github.com/example/preview-demo" }] } };
    if (path.endsWith("/environments")) return { status: 200, body: [{ uuid: "fake-environment", name: "previews" }] };
    if (path.startsWith("/projects/")) return { status: 200, body: { environments: [{ uuid: "fake-environment", name: "previews" }] } };
    if (path === "/applications" && request.method === "GET") return { status: 200, body: [...applications.values()] };
    if (path.startsWith("/applications/") && request.method === "POST") {
      const uuid = crypto.randomUUID();
      applications.set(uuid, { ...values, uuid, status: "stopped" });
      return { status: 201, body: { uuid, name: values.name } };
    }
    if (path === "/deploy") {
      const uuid = z.string().parse(values.uuid);
      const deploymentUuid = crypto.randomUUID();
      const application = applications.get(uuid);
      if (!application) return { status: HTTP_NOT_FOUND, body: null };
      application.status = "running:healthy";
      const deployment = { deployment_uuid: deploymentUuid, status: "finished", commit: application.git_commit_sha, application_uuid: uuid };
      deployments.set(deploymentUuid, deployment);
      return { status: 200, body: { deployments: [deployment] } };
    }
    if (path.startsWith("/deployments/applications/")) {
      const applicationUuid = path.split("/")[3];
      return { status: 200, body: { deployments: [...deployments.values()].filter((deployment) => deployment.application_uuid === applicationUuid) } };
    }
    if (path.startsWith("/deployments/")) return { status: 200, body: deployments.get(path.split("/")[2] ?? "") ?? {} };
    const uuid = path.split("/")[2] ?? "";
    const application = applications.get(uuid);
    if (!application) return { status: HTTP_NOT_FOUND, body: null };
    if (request.method === "DELETE") { applications.delete(uuid); return { status: 200, body: { message: "Simulated deletion" } }; }
    if (request.method === "PATCH") Object.assign(application, values);
    return { status: 200, body: application };
  };
}
