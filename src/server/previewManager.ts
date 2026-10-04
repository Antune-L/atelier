import { readFile } from "node:fs/promises";
import { join } from "node:path";

import type { Orchestrator } from "../shared/constants.ts";
import { getErrorMessage } from "../shared/errors.ts";
import { coolifyInventorySchema, PREVIEW_AUTH_HASH_ENV, PREVIEW_AUTH_USERNAME_ENV, previewRecipeSchema, updatePreviewProjectSettingsSchema, updatePreviewSettingsSchema } from "../shared/preview.ts";
import type { PreviewRecord, UpdatePreviewInput, UpdatePreviewProjectSettingsInput, UpdatePreviewSettingsInput } from "../shared/preview.ts";
import { COOLIFY_PREPARATION_MARKER } from "../shared/skills.ts";

import type { QualityManager } from "./agents/qualityManager.ts";
import { getProject, isProjectKey } from "./config.ts";
import type { Store } from "./db/store.ts";
import { KeyedMutex } from "./mutex.ts";
import type { PreviewConfig } from "./previewConfig.ts";
import { CoolifyClient, CoolifyRequestError } from "./system/coolifyClient.ts";
import type { SystemAdapter } from "./system/types.ts";
import type { TicketOperations } from "./ticketOperations.ts";

const POLL_INTERVAL_MS = 5_000;
const HOURS_TO_MS = 60 * 60 * 1_000;
const DEPLOYMENT_TIMEOUT_MS = 30 * 60 * 1_000;
const COMPLETED_DEPLOYMENT_STATUSES = ["finished"];
const FAILED_DEPLOYMENT_STATUSES = ["failed", "cancelled-by-user", "cancelled", "error"];
const PREVIEW_BCRYPT_COST = 10;
const STOPPED_PREVIEW_AUDIT_INTERVAL_MS = 60_000;
const STOPPED_PREVIEW_TIMEOUT_GRACE_MS = 10 * 60 * 1_000;
const REQUIRED_EMPTY_CLEANUP_AUDITS = 2;
const SECONDS_TO_MS = 1_000;
const HTTP_VALIDATION_FAILED = 422;
const MAX_NATIVE_PREVIEW_AUTH_PASSWORD_BYTES = 31;

function validateNativePreviewPassword(password: string): void {
  if (Buffer.byteLength(password, "utf8") > MAX_NATIVE_PREVIEW_AUTH_PASSWORD_BYTES) throw new Error(`Coolify native preview authentication requires a password of at most ${MAX_NATIVE_PREVIEW_AUTH_PASSWORD_BYTES} UTF-8 bytes. Update the private preview password before starting this Dockerfile preview.`);
}

interface PreviewManagerDependencies {
  store: Store;
  config: PreviewConfig;
  system: SystemAdapter;
  quality?: QualityManager;
  ticketOperations: TicketOperations;
  resourcesRoot: string;
  onChange?: (ticketId: string) => void;
}

export class PreviewManager {
  private readonly operations = new KeyedMutex();
  private readonly pending = new Map<string, Promise<void>>();
  private readonly requests = new Set<Promise<unknown>>();
  private readonly cleanupAudits = new Map<string, number>();
  private timer: ReturnType<typeof setInterval> | null = null;
  private shuttingDown = false;

  constructor(private readonly deps: PreviewManagerDependencies) {}

  get settings() { return this.deps.config.getSettings(); }

  updateSettings(input: UpdatePreviewSettingsInput) {
    const patch = updatePreviewSettingsSchema.parse(input);
    const hasOwnedResources = this.requests.size > 0 || this.list().some((preview) => preview.cleanupStatus !== "complete" || preview.cleanupWatch);
    const identityChanged = Object.entries(patch).some(([key, value]) => {
      if (key === "sshHostAlias" && this.settings.sshHostAlias === null && typeof value === "string") return false;
      return value !== Reflect.get(this.settings, key);
    });
    if (hasOwnedResources && identityChanged) throw new Error("Stop and clean every existing preview before changing connection or authentication settings.");
    return this.deps.config.updateSettings(patch);
  }

  projectSettings(project: string) {
    if (!isProjectKey(project)) throw new Error("Project not found.");
    return this.deps.store.getPreviewProjectSettings(project);
  }

  updateProjectSettings(project: string, input: UpdatePreviewProjectSettingsInput) {
    this.projectSettings(project);
    return this.deps.store.updatePreviewProjectSettings(project, updatePreviewProjectSettingsSchema.parse(input));
  }

  list() { return this.deps.store.listPreviews(); }
  get(id: string) {
    const preview = this.deps.store.getPreview(id);
    if (!preview) throw new Error("Preview not found.");
    return preview;
  }

  ticket(ticketId: string) {
    const ticket = this.deps.store.getTicket(ticketId);
    if (!ticket) throw new Error("Ticket not found.");
    const cleanupWatchCount = this.list().filter((preview) => preview.ticketId === ticketId && preview.cleanupWatch).length;
    return { preview: this.deps.store.getTicketPreview(ticketId), projectSettings: this.projectSettings(ticket.project), vcsProvider: getProject(ticket.project).vcsProvider, cleanupWatchCount };
  }

  async testConnection() {
    const inventory = coolifyInventorySchema.parse(await this.client().inventory(this.settings.projectUuid));
    return { ok: true, inventory };
  }

  async prepare(project: string) {
    return this.trackRequest(this.operations.run(`prepare:${project}`, async () => {
      if (this.shuttingDown) throw new Error("Preview service is shutting down.");
      const settings = this.projectSettings(project);
      if (settings.preparationTicketId) {
        const existing = this.deps.store.getTicket(settings.preparationTicketId);
        if (existing) return { created: false, ticket: existing };
      }
      const skill = await readFile(join(this.deps.resourcesRoot, "skills", "coolify-preview-setup", "SKILL.md"), "utf8");
      const description = `${COOLIFY_PREPARATION_MARKER}\n\nPrepare the repository for isolated Coolify previews using the bundled skill below. Write the version 1 recipe at ${settings.recipePath}. Verify local build, health and cleanup by invoking the bundled helper directly without arguments: '${join(this.deps.resourcesRoot, "templates", "verify_coolify_preview.sh").replaceAll("'", "'\\''")}'. Open a draft pull request for human review. Do not deploy or merge automatically. Do not read or copy production secrets or connect to production services.\n\n${skill}`;
      const result = this.deps.ticketOperations.createTodoTicket({
        project, requestId: `coolify-preview-setup:${project}:${settings.recipePath}`, title: "Prepare isolated Coolify previews", description,
        prDraft: true, autoMerge: false, directPush: false, stealth: false,
      });
      this.deps.store.updatePreviewProjectSettings(project, { preparationTicketId: result.ticket.id });
      return result;
    }));
  }

  async create(ticketId: string) {
    return this.trackRequest(this.operations.run(`ticket:${ticketId}`, async () => {
      if (this.shuttingDown) throw new Error("Preview service is shutting down.");
      const ticket = this.deps.store.getTicket(ticketId);
      if (!ticket || !isProjectKey(ticket.project)) throw new Error("Ticket or project not found.");
      const project = getProject(ticket.project);
      if (ticket.kind !== "feature" || !ticket.prUrl || !["done", "merged"].includes(ticket.column)) throw new Error("A completed feature ticket with a GitHub pull request is required.");
      if (project.vcsProvider !== "github") throw new Error("Coolify previews currently support GitHub projects only.");
      const previous = this.deps.store.getTicketPreview(ticketId);
      if (previous && previous.cleanupStatus !== "complete") {
        if (previous.desiredState === "running" && !["failed", "interrupted"].includes(previous.status)) return previous;
        throw new Error("Clean the previous preview before starting another attempt.");
      }
      const projectSettings = this.projectSettings(ticket.project);
      if (!projectSettings.enabled) throw new Error("Enable previews for this project before starting a preview.");
      const settings = this.settings;
      this.client();
      if (!settings.serverUuid || !settings.projectUuid || !settings.domainBase || !this.deps.config.getPreviewAuth()) throw new Error("Configure the preview server, Coolify project, HTTPS domain and authentication first.");
      if (!this.deps.system.readPreviewSource) throw new Error("Preview source inspection is unavailable.");
      const source = await this.deps.system.readPreviewSource(project.repoPath, ticket.prUrl, projectSettings.recipePath);
      const recipe = previewRecipeSchema.parse(source.recipe);
      const auth = this.deps.config.getPreviewAuth();
      if (!auth) throw new Error("Preview authentication is unavailable.");
      if (recipe.buildPack === "dockerfile") validateNativePreviewPassword(auth.password);
      const inventory = await this.testConnection();
      const environment = inventory.inventory.environments.find((item) => item.name === settings.environmentName) ?? await this.client().ensureEnvironment(settings.projectUuid, settings.environmentName);
      const generation = (previous?.generation ?? 0) + 1;
      const ownershipMarker = `kanban-preview-${crypto.randomUUID()}`;
      const preview = this.deps.store.createPreview({
        ticketId, project: ticket.project, prUrl: ticket.prUrl, revision: source.revision, branch: source.branch,
        generation, recipe, ownershipMarker, coolifyBaseUrl: settings.baseUrl, serverUuid: settings.serverUuid,
        environmentUuid: environment.uuid, expiresAt: Date.now() + projectSettings.ttlHours * HOURS_TO_MS,
      });
      this.deps.onChange?.(ticketId);
      this.schedule(preview.id);
      return preview;
    }));
  }

  async stop(id: string) {
    return this.trackRequest(this.stopPreview(id));
  }

  private async stopPreview(id: string) {
    if (this.shuttingDown) throw new Error("Preview service is shutting down.");
    const preview = this.get(id);
    if (preview.cleanupStatus === "complete") return preview;
    this.update(id, { desiredState: "stopped", status: "stopping", cleanupStatus: "pending", error: null });
    await this.deps.quality?.cancelPreview(preview.ticketId, id);
    this.schedule(id);
    return this.get(id);
  }

  async retryCleanup(id: string) {
    return this.trackRequest(this.retryPreviewCleanup(id));
  }

  private async retryPreviewCleanup(id: string) {
    if (this.shuttingDown) throw new Error("Preview service is shutting down.");
    const preview = this.get(id);
    if (preview.cleanupStatus === "complete") return preview;
    if (preview.cleanupWatchUntil !== null && Date.now() >= preview.cleanupWatchUntil) {
      if (preview.deploymentTimeoutSeconds === null) throw new Error("The interrupted deployment timeout was not recorded. Inspect the remote workers before resolving this cleanup failure.");
    }
    if (preview.desiredState !== "stopped") await this.stop(id);
    let deleteRequestedAt = preview.deleteRequestedAt;
    if (deleteRequestedAt !== null && preview.appUuid && await this.client(preview).application(preview.appUuid)) deleteRequestedAt = null;
    const cleanupWatch = preview.cleanupWatchUntil !== null;
    const cleanupWatchUntil = preview.deploymentTimeoutSeconds === null ? null : Date.now() + preview.deploymentTimeoutSeconds * SECONDS_TO_MS + STOPPED_PREVIEW_TIMEOUT_GRACE_MS;
    this.update(id, { cleanupRequestedAt: null, stopRequestedAt: null, deleteRequestedAt, cleanupStatus: "pending", status: "stopping", error: null, cleanupWatch, cleanupWatchUntil: cleanupWatch ? cleanupWatchUntil : null, cleanupAuditAt: null, cleanupEmptyAuditCount: 0 });
    this.schedule(id);
    return this.get(id);
  }

  async validate(id: string, provider: Orchestrator) {
    return this.trackRequest(this.validatePreview(id, provider));
  }

  private async validatePreview(id: string, provider: Orchestrator) {
    if (this.shuttingDown) throw new Error("Preview service is shutting down.");
    const preview = this.get(id);
    if (preview.status !== "ready" || preview.desiredState !== "running" || !preview.url || preview.deployedRevision !== preview.revision) throw new Error("Wait for the exact preview revision to be ready before validation.");
    if (!this.deps.quality) throw new Error("Preview validation is unavailable.");
    const auth = this.deps.config.getPreviewAuth();
    if (!auth) throw new Error("Preview authentication is unavailable.");
    const run = await this.deps.quality.testPreview(preview.ticketId, provider, {
      previewId: id, revision: preview.revision, url: preview.url, healthPath: preview.recipe?.healthPath, auth,
      assertCurrent: async () => {
        const current = this.get(id);
        const latest = this.deps.store.getTicketPreview(preview.ticketId);
        if (latest?.id !== id || current.status !== "ready" || current.desiredState !== "running" || current.revision !== preview.revision || current.deployedRevision !== preview.revision || current.url !== preview.url) throw new Error("The preview changed or stopped during validation.");
      },
    });
    this.update(id, { qualityRunId: run.id });
    return run;
  }

  async recover(): Promise<void> {
    this.shuttingDown = false;
    for (const preview of this.list()) {
      if ((preview.cleanupStatus === "complete" && !preview.cleanupWatch) || preview.cleanupStatus === "failed") continue;
      if (preview.expiresAt !== null && preview.expiresAt <= Date.now()) this.update(preview.id, { desiredState: "stopped", status: "stopping" });
      this.schedule(preview.id);
    }
    if (!this.timer) this.timer = setInterval(() => this.tick(), POLL_INTERVAL_MS);
  }

  async shutdown(): Promise<void> {
    this.shuttingDown = true;
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    await Promise.allSettled([...this.requests]);
    await Promise.allSettled([...this.pending.values()]);
  }

  private tick(): void {
    if (this.shuttingDown) return;
    for (const preview of this.list()) {
      if (preview.cleanupStatus === "complete") {
        if (preview.cleanupWatch && Date.now() - (this.cleanupAudits.get(preview.id) ?? 0) >= STOPPED_PREVIEW_AUDIT_INTERVAL_MS) this.schedule(preview.id);
        continue;
      }
      if (preview.cleanupStatus === "failed") continue;
      if (preview.expiresAt !== null && preview.expiresAt <= Date.now() && preview.desiredState === "running") void this.stop(preview.id).catch(() => undefined);
      if (!["failed", "interrupted"].includes(preview.status) || preview.desiredState === "stopped") this.schedule(preview.id);
    }
  }

  private trackRequest<T>(request: Promise<T>): Promise<T> {
    this.requests.add(request);
    void request.finally(() => { this.requests.delete(request); }).catch(() => undefined);
    return request;
  }

  private schedule(id: string): void {
    if (this.pending.has(id) || this.shuttingDown) return;
    const completion = this.operations.run(id, () => this.reconcile(id)).catch((error: unknown) => {
      const current = this.deps.store.getPreview(id);
      if (!current) return;
      const message = this.deps.config.redactError(getErrorMessage(error));
      if (current.desiredState === "stopped") this.update(id, { status: "stopping", cleanupStatus: "failed", cleanupWatch: false, error: message });
      else this.update(id, { status: "failed", error: message });
    }).finally(() => { this.pending.delete(id); });
    this.pending.set(id, completion);
  }

  private update(id: string, patch: UpdatePreviewInput) {
    const preview = this.deps.store.updatePreview(id, patch);
    this.deps.onChange?.(preview.ticketId);
    return preview;
  }

  private client(preview?: PreviewRecord) {
    const credentials = this.deps.config.getCredentials();
    if (!credentials || !this.deps.system.coolifyRequest) throw new Error("Configure the private Coolify connection first.");
    if (preview?.coolifyBaseUrl && preview.coolifyBaseUrl !== credentials.baseUrl) throw new Error("Restore the preview's original Coolify connection to clean its resources.");
    return new CoolifyClient(credentials, (request) => {
      if (!this.deps.system.coolifyRequest) throw new Error("Coolify transport is unavailable.");
      return this.deps.system.coolifyRequest(request);
    });
  }

  private async reconcile(id: string): Promise<void> {
    if (this.shuttingDown) return;
    let preview = this.get(id);
    if (preview.cleanupStatus === "complete") {
      if (preview.cleanupWatch) await this.auditStoppedPreview(preview);
      return;
    }
    const client = this.client(preview);
    if (preview.desiredState === "stopped") { await this.cleanup(preview, client); return; }
    if (!preview.appUuid) {
      if (!preview.ownershipMarker || !preview.recipe) throw new Error("Preview ownership or recipe is missing.");
      const existing = await client.findApplication(preview.ownershipMarker);
      if (existing) preview = this.update(id, { appUuid: existing.uuid, status: "provisioning" });
      else if (preview.createRequestedAt !== null) {
        this.update(id, { status: "interrupted", error: "Application creation had an unknown outcome. Stop and clean this attempt before retrying." });
        return;
      } else {
        const settings = this.settings;
        const auth = this.deps.config.getPreviewAuth();
        if (!auth) throw new Error("Preview authentication is unavailable.");
        const url = new URL(preview.prUrl);
        const repository = url.pathname.split("/").slice(1, 3).join("/");
        const recipe = preview.recipe;
        if (!recipe) throw new Error("Preview recipe is missing.");
        const domain = settings.domainBase;
        if (!domain) throw new Error("Preview domain is unavailable.");
        const publicUrl = `https://${preview.ownershipMarker}.${domain}`;
        const payload: Record<string, unknown> = {
          name: preview.ownershipMarker, description: preview.ownershipMarker, tags: [preview.ownershipMarker],
          server_uuid: preview.serverUuid, project_uuid: settings.projectUuid, environment_uuid: preview.environmentUuid,
          git_repository: repository, git_branch: preview.branch, git_commit_sha: preview.revision,
          build_pack: recipe.buildPack, ports_exposes: String(recipe.port), base_directory: recipe.buildContext === "." ? "/" : `/${recipe.buildContext}`,
          instant_deploy: false, is_auto_deploy_enabled: false, is_preview_deployments_enabled: false,
          autogenerate_domain: false,
          ...(recipe.buildPack === "dockerfile" ? { dockerfile_location: `/${recipe.dockerfile}` } : { docker_compose_location: `/${recipe.composeFile}` }),
        };
        if (recipe.buildPack === "dockerfile") {
          validateNativePreviewPassword(auth.password);
          payload.is_http_basic_auth_enabled = true;
          payload.http_basic_auth_username = auth.username;
          payload.http_basic_auth_password = auth.password;
        } else {
          payload.build_pack = "dockerfile";
          payload.docker_compose_domains = [{ name: recipe.serviceName, domain: `${publicUrl}:${recipe.port}` }];
        }
        const endpoint = settings.githubAppUuid ? "/applications/private-github-app" : "/applications/public";
        if (settings.githubAppUuid) payload.github_app_uuid = settings.githubAppUuid;
        try {
          preview = this.update(id, { createRequestedAt: Date.now(), status: "provisioning" });
          const application = await client.createApplication(endpoint, payload);
          preview = this.update(id, { appUuid: application.uuid });
        } catch (error) {
          if (error instanceof CoolifyRequestError && error.status === HTTP_VALIDATION_FAILED) this.update(id, { createRequestedAt: null });
          throw error;
        }
      }
    }
    preview = this.get(id);
    if (preview.desiredState === "stopped") { await this.cleanup(preview, client); return; }
    if (!preview.appUuid || !preview.recipe) throw new Error("Preview application or recipe is missing.");
    const appUuid = preview.appUuid;
    const recipe = preview.recipe;
    if (!preview.url) {
      const domain = this.settings.domainBase;
      if (!domain || !/^[a-z0-9.-]+$/i.test(domain)) throw new Error("Configure a valid HTTPS preview domain suffix.");
      const url = `https://${preview.ownershipMarker}.${domain}`;
      const environment = { ...recipe.environment };
      if (recipe.buildPack === "dockerfile") {
        await client.updateApplication(appUuid, { domains: url, git_commit_sha: preview.revision, is_auto_deploy_enabled: false, is_preview_deployments_enabled: false });
      } else {
        const auth = this.deps.config.getPreviewAuth();
        if (!auth) throw new Error("Preview authentication is unavailable.");
        await client.updateApplication(appUuid, { build_pack: "dockercompose", docker_compose_location: `/${recipe.composeFile}`, instant_deploy: false, is_auto_deploy_enabled: false, is_preview_deployments_enabled: false });
        environment[PREVIEW_AUTH_USERNAME_ENV] = auth.username;
        environment[PREVIEW_AUTH_HASH_ENV] = await Bun.password.hash(auth.password, { algorithm: "bcrypt", cost: PREVIEW_BCRYPT_COST });
      }
      await client.setEnvironment(appUuid, environment);
      preview = this.update(id, { url, status: "building" });
    }
    if (this.get(id).desiredState === "stopped") { await this.cleanup(this.get(id), client); return; }
    if (!preview.deploymentUuid) {
      const existing = (await client.deployments(appUuid)).find((deployment) => deployment.commit === preview.revision);
      const existingUuid = existing?.deployment_uuid ?? existing?.uuid;
      if (!existingUuid && preview.deployRequestedAt !== null) {
        this.update(id, { status: "interrupted", error: "Deployment had an unknown outcome. Stop and clean this attempt before retrying." });
        return;
      }
      let deploymentUuid = existingUuid;
      if (!deploymentUuid) {
        if (!preview.serverUuid) throw new Error("Preview deployment server is missing.");
        const deploymentTimeoutSeconds = await client.getDeploymentTimeoutSeconds(preview.serverUuid);
        preview = this.update(id, { deployRequestedAt: Date.now(), deploymentTimeoutSeconds });
        deploymentUuid = await client.deploy(appUuid);
      }
      preview = this.update(id, { deploymentUuid, deploymentUuids: [...new Set([...preview.deploymentUuids, deploymentUuid])], status: "building" });
    }
    if (this.get(id).desiredState === "stopped") { await this.cleanup(this.get(id), client); return; }
    const deployment = await client.deployment(preview.deploymentUuid ?? "");
    if (FAILED_DEPLOYMENT_STATUSES.includes(deployment.status ?? "")) throw new Error(`Coolify deployment ended with status ${deployment.status}.`);
    if (Date.now() - preview.createdAt > DEPLOYMENT_TIMEOUT_MS && preview.status !== "ready") throw new Error("Coolify deployment did not become ready within the preview timeout.");
    if (!COMPLETED_DEPLOYMENT_STATUSES.includes(deployment.status ?? "")) {
      return;
    }
    if (deployment.commit !== preview.revision) throw new Error("Coolify did not confirm deployment of the requested pull request revision.");
    const application = await client.application(appUuid);
    if (!application?.status?.startsWith("running")) return;
    if (!preview.url || !this.deps.system.probePreviewHealth) throw new Error("Preview readiness verification is unavailable.");
    const auth = this.deps.config.getPreviewAuth();
    if (!auth) throw new Error("Preview authentication is unavailable.");
    const ready = await this.deps.system.probePreviewHealth(preview.url, recipe.healthPath, auth);
    if (!ready) { this.update(id, { status: "deploying", deployedRevision: deployment.commit }); return; }
    if (this.get(id).desiredState === "running") this.update(id, { status: "ready", deployedRevision: deployment.commit, error: null });
    else await this.cleanup(this.get(id), client);
  }

  private async cleanup(preview: PreviewRecord, client: CoolifyClient): Promise<void> {
    await this.deps.quality?.cancelPreview(preview.ticketId, preview.id);
    if (preview.cleanupWatch && preview.cleanupWatchUntil !== null && Date.now() >= preview.cleanupWatchUntil) {
      this.update(preview.id, { cleanupStatus: "failed", cleanupWatch: false, status: "stopping", error: "Interrupted deployment cleanup did not settle within the recorded server timeout and grace period. Inspect remote workers and retry cleanup." });
      return;
    }
    if (!preview.appUuid && preview.ownershipMarker) {
      const application = await client.findApplication(preview.ownershipMarker);
      if (application) preview = this.update(preview.id, { appUuid: application.uuid });
      else if (preview.createRequestedAt !== null) {
        this.update(preview.id, { status: "stopping", cleanupStatus: "failed", error: "Application creation is unresolved. Absence from the API does not prove resource cleanup." });
        return;
      }
    }
    if (!preview.appUuid) { this.update(preview.id, { status: "stopped", cleanupStatus: "complete", error: null }); return; }
    if (preview.stopRequestedAt === null && preview.deleteRequestedAt === null) {
      const deployments = await client.deployments(preview.appUuid);
      const deploymentUuids = deployments.flatMap((deployment) => {
        const uuid = deployment.deployment_uuid ?? deployment.uuid;
        return uuid ? [uuid] : [];
      });
      preview = this.update(preview.id, { deploymentUuids: [...new Set([...preview.deploymentUuids, ...deploymentUuids])] });
      const unresolvedDeploymentRequest = preview.deployRequestedAt !== null && preview.deploymentUuid === null && deployments.length === 0;
      const interrupted = unresolvedDeploymentRequest || deployments.some((deployment) => !COMPLETED_DEPLOYMENT_STATUSES.includes(deployment.status ?? "") && !FAILED_DEPLOYMENT_STATUSES.includes(deployment.status ?? ""));
      const stopRequestedAt = Date.now();
      const cleanupWatch = preview.cleanupWatch || interrupted;
      const cleanupWatchUntil = preview.deploymentTimeoutSeconds === null ? null : stopRequestedAt + preview.deploymentTimeoutSeconds * SECONDS_TO_MS + STOPPED_PREVIEW_TIMEOUT_GRACE_MS;
      preview = this.update(preview.id, { stopRequestedAt, status: "stopping", cleanupWatch, cleanupWatchUntil: cleanupWatch ? cleanupWatchUntil : null });
      for (const deployment of deployments) {
        const uuid = deployment.deployment_uuid ?? deployment.uuid;
        if (uuid && !COMPLETED_DEPLOYMENT_STATUSES.includes(deployment.status ?? "") && !FAILED_DEPLOYMENT_STATUSES.includes(deployment.status ?? "")) await client.cancelDeployment(uuid);
      }
    }
    if (preview.cleanupWatch && preview.deploymentTimeoutSeconds === null) {
      this.update(preview.id, { cleanupStatus: "failed", cleanupWatch: false, status: "stopping", error: "The interrupted deployment timeout is unknown. Inspect remote workers before retrying cleanup." });
      return;
    }
    if (!this.deps.system.confirmPreviewCleanup) {
      this.update(preview.id, { cleanupStatus: "failed", error: "Remote resource cleanup cannot be verified. The Coolify application has been retained." });
      return;
    }
    if (preview.deleteRequestedAt === null) {
      for (const uuid of preview.deploymentUuids) {
        const deployment = await client.deployment(uuid);
        if (!COMPLETED_DEPLOYMENT_STATUSES.includes(deployment.status ?? "") && !FAILED_DEPLOYMENT_STATUSES.includes(deployment.status ?? "")) {
          this.update(preview.id, { cleanupStatus: "pending", error: "Waiting for deployment cancellation before removing preview resources." });
          return;
        }
      }
    }
    const expectedServerAddress = preview.serverUuid ? await client.getServerAddress(preview.serverUuid) : null;
    const removeOwnedResources = preview.cleanupRequestedAt === null;
    if (removeOwnedResources && preview.deleteRequestedAt === null && !(await client.application(preview.appUuid ?? ""))) {
      this.update(preview.id, { status: "stopping", cleanupStatus: "failed", error: "The application disappeared before its storage was inspected. Remote cleanup cannot be proven." });
      return;
    }
    if (removeOwnedResources) preview = this.update(preview.id, { cleanupRequestedAt: Date.now() });
    const result = await this.deps.system.confirmPreviewCleanup(preview, { sshHostAlias: this.settings.sshHostAlias, expectedServerAddress, removeOwnedResources, deploymentUuids: preview.deploymentUuids });
    if (!result.complete) {
      if (result.retryable) {
        this.update(preview.id, { status: "stopping", cleanupStatus: "pending", cleanupRequestedAt: null, error: result.reason });
        return;
      }
      this.update(preview.id, { status: "stopping", cleanupStatus: "failed", error: result.reason ?? "Remote preview resources still exist." });
      return;
    }
    if (preview.deleteRequestedAt === null) {
      for (const uuid of preview.deploymentUuids) {
        const deployment = await client.deployment(uuid);
        if (!COMPLETED_DEPLOYMENT_STATUSES.includes(deployment.status ?? "") && !FAILED_DEPLOYMENT_STATUSES.includes(deployment.status ?? "")) {
          this.update(preview.id, { cleanupStatus: "pending", error: "Deployment state changed during cleanup; waiting for cancellation to settle." });
          return;
        }
      }
      preview = this.update(preview.id, { deleteRequestedAt: Date.now() });
      await client.deleteApplication(preview.appUuid ?? "");
    }
    const application = await client.application(preview.appUuid ?? "");
    if (application) { this.update(preview.id, { cleanupStatus: "pending", error: null }); return; }
    const verified = await this.deps.system.confirmPreviewCleanup(preview, { sshHostAlias: this.settings.sshHostAlias, expectedServerAddress, removeOwnedResources: false, deploymentUuids: preview.deploymentUuids });
    if (verified.complete) this.update(preview.id, { status: "stopped", cleanupStatus: "complete", error: null });
    else this.update(preview.id, { status: "stopping", cleanupStatus: "failed", error: verified.reason ?? "Remote preview resources still exist." });
  }

  private async auditStoppedPreview(preview: PreviewRecord): Promise<void> {
    this.cleanupAudits.set(preview.id, Date.now());
    if (preview.cleanupWatchUntil === null || preview.deploymentTimeoutSeconds === null) {
      this.update(preview.id, { cleanupWatch: false, cleanupStatus: "failed", status: "stopping", error: "The original deployment timeout is unknown. Automatic monitoring stopped; inspect the remote workers and retry cleanup." });
      return;
    }
    const client = this.client(preview);
    const expectedServerAddress = preview.serverUuid ? await client.getServerAddress(preview.serverUuid) : null;
    if (!this.deps.system.confirmPreviewCleanup) throw new Error("Stopped preview resource monitoring is unavailable.");
    const result = await this.deps.system.confirmPreviewCleanup(preview, { sshHostAlias: this.settings.sshHostAlias, expectedServerAddress, removeOwnedResources: false, deploymentUuids: preview.deploymentUuids });
    if (result.complete) {
      if (Date.now() < preview.cleanupWatchUntil) return;
      if (preview.cleanupAuditAt !== null && Date.now() - preview.cleanupAuditAt < STOPPED_PREVIEW_AUDIT_INTERVAL_MS) return;
      const cleanupEmptyAuditCount = preview.cleanupEmptyAuditCount + 1;
      this.update(preview.id, { cleanupAuditAt: Date.now(), cleanupEmptyAuditCount, cleanupWatch: cleanupEmptyAuditCount < REQUIRED_EMPTY_CLEANUP_AUDITS });
      return;
    }
    if (Date.now() >= preview.cleanupWatchUntil && !result.retryable) {
      this.update(preview.id, { cleanupWatch: false, cleanupStatus: "failed", status: "stopping", cleanupAuditAt: Date.now(), cleanupEmptyAuditCount: 0, error: result.reason ?? "Final interrupted-deployment cleanup could not be verified. Retry cleanup after inspecting the remote resources." });
      return;
    }
    const pending = this.update(preview.id, { status: "stopping", cleanupStatus: "pending", cleanupRequestedAt: null, cleanupAuditAt: null, cleanupEmptyAuditCount: 0, error: result.reason });
    await this.cleanup(pending, client);
  }
}
