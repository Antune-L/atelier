import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, readdirSync, renameSync, writeFileSync } from "node:fs";
import { lstat, readFile, realpath } from "node:fs/promises";
import { extname, join, resolve, sep } from "node:path";

import { EXTERNAL_PREVIEW_MARKER_PREFIX, externalValidationSchema, startExternalValidationSchema } from "../shared/externalValidation.ts";
import type { ExternalValidation, StartExternalValidation } from "../shared/externalValidation.ts";
import { runQualityValidator } from "./agents/qualityValidator.ts";
import { assertExecutionAvailable, resolveExecution } from "./agents/executionConfig.ts";
import { previewRecipeSchema } from "../shared/preview.ts";
import { getProject, MODELS } from "./config.ts";
import type { PreviewManager } from "./previewManager.ts";
import type { PreviewConfig } from "./previewConfig.ts";
import type { SystemAdapter } from "./system/types.ts";

const MAX_ARTIFACT_BASE64_CHARACTERS = 512_000;
const MAX_ARTIFACT_BYTES = MAX_ARTIFACT_BASE64_CHARACTERS / 4 * 3;
const ACTIVE = ["queued", "deploying", "running"];
const digest = (value: string | Buffer) => createHash("sha256").update(value).digest("hex");

/** Receipts and browser evidence live in a private host directory, never in project checkouts. */
export class ExternalValidationManager {
  private shuttingDown = false;
  private readonly tasks = new Set<Promise<void>>();
  private readonly active = new Map<string, AbortController>();
  constructor(private readonly root: string, private readonly previews: Pick<PreviewManager, "list" | "get" | "stop" | "projectSettings" | "createExternal">, private readonly config: PreviewConfig, private readonly system: SystemAdapter) {
    mkdirSync(root, { recursive: true, mode: 0o700 });
  }
  private directory(id: string) { return join(this.root, digest(id)); }
  private marker(id: string) { return `${EXTERNAL_PREVIEW_MARKER_PREFIX}${digest(id).slice(0, 32)}`; }
  private nativeCleanupPending(directory: string): boolean {
    const nativeDirectory = join(directory, "native-cleanup-obligations");
    return existsSync(join(directory, "browser-cleanup-obligation.json")) || existsSync(nativeDirectory) && readdirSync(nativeDirectory).length > 0;
  }
  private save(value: ExternalValidation) {
    const directory = this.directory(value.requestId);
    mkdirSync(directory, { recursive: true, mode: 0o700 });
    const path = join(directory, "receipt.json");
    writeFileSync(`${path}.tmp`, JSON.stringify(externalValidationSchema.parse(value)), { mode: 0o600 });
    renameSync(`${path}.tmp`, path);
  }
  private load(id: string): ExternalValidation | null {
    const path = join(this.directory(id), "receipt.json");
    return existsSync(path) ? externalValidationSchema.parse(JSON.parse(readFileSync(path, "utf8"))) : null;
  }
  async get(id: string): Promise<ExternalValidation | null> {
    const value = this.load(id);
    if (!value) return null;
    const preview = this.previews.list().find(item => item.ownershipMarker === this.marker(id));
    if (preview) {
      value.previewId = preview.id; value.previewUrl = preview.url; value.deploymentId = preview.deploymentUuid; value.deployedSha = preview.deployedRevision;
      value.cleanupStatus = preview.cleanupStatus;

    }
    if (!preview && !ACTIVE.includes(value.status)) value.cleanupStatus = this.active.has(id) ? "pending" : "complete";
    const nativeObligations = this.nativeCleanupPending(this.directory(id));
    if (nativeObligations) {
      value.cleanupStatus = "failed";
      if (value.status === "passed") value.status = "inconclusive";
      value.error = "Native session or browser closure is unconfirmed; operator reconciliation is required.";
    }
    if (value.status === "inconclusive" && !value.simulated && value.cleanupStatus === "complete" && value.error === null && value.sessionId && value.previewId && value.previewUrl && value.deploymentId && value.results.length === value.scenarios.length && value.deployedSha === value.headSha && value.scenarios.every(scenario => value.results.filter(result => result.scenarioId === scenario.id && result.status === "passed").length === 1)) value.status = "passed";
    this.save(value);
    if (preview && !ACTIVE.includes(value.status) && preview.desiredState !== "stopped") await this.previews.stop(preview.id);
    return this.load(id);
  }
  async start(input: StartExternalValidation): Promise<ExternalValidation> {
    const parsed = startExternalValidationSchema.parse(input);
    const previous = this.load(parsed.requestId);
    if (previous) {
      const original = startExternalValidationSchema.parse({ requestId: previous.requestId, missionId: previous.missionId, project: previous.project, branch: previous.branch, headSha: previous.headSha, provider: previous.provider, scenarios: previous.scenarios });
      if (JSON.stringify(original) !== JSON.stringify(parsed)) throw new Error("Request ID already belongs to different validation inputs");
      return await this.get(parsed.requestId) ?? previous;
    }
    for (const name of readdirSync(this.root)) {
      const path = join(this.root, name, "receipt.json");
      if (!existsSync(path)) continue;
      const existing = externalValidationSchema.parse(JSON.parse(readFileSync(path, "utf8")));
      if (existing.missionId !== parsed.missionId) continue;
      const preview = this.previews.list().find(item => item.ownershipMarker === this.marker(existing.requestId));
      const nativePending = this.nativeCleanupPending(join(this.root, name));
      if (this.active.has(existing.requestId) || ACTIVE.includes(existing.status) || existing.cleanupStatus !== "complete" || nativePending || preview && preview.cleanupStatus !== "complete") throw new Error("The previous mission validation must finish cleanup before replacement");
    }
    if (this.shuttingDown) throw new Error("External validation service is shutting down");
    if (this.system.sourceUpdateAdmission.isUpdating) throw new Error("External validation is unavailable during source maintenance");
    const value: ExternalValidation = { ...parsed, status: "queued", simulated: this.system.dryRun, previewId: null, previewUrl: null, deploymentId: null, deployedSha: null, sessionId: null, startedAt: new Date().toISOString(), finishedAt: null, cleanupStatus: "complete", error: null, results: [], artifacts: [] };
    this.save(value);
    const controller = new AbortController();
    this.active.set(value.requestId, controller);
    const task = this.run(value, controller).finally(() => { this.active.delete(value.requestId); this.tasks.delete(task); });
    this.tasks.add(task);
    void task.catch(() => { /* The durable receipt remains available for restart reconciliation. */ });
    return value;
  }
  async cancel(id: string) {
    this.active.get(id)?.abort();
    const value = this.load(id);
    if (!value) return null;
    value.status = "cancelled"; value.finishedAt = new Date().toISOString();
    this.save(value);
    return this.get(id);
  }
  async recover() {
    for (const name of readdirSync(this.root)) {
      const path = join(this.root, name, "receipt.json");
      if (!existsSync(path)) continue;
      const value = externalValidationSchema.parse(JSON.parse(readFileSync(path, "utf8")));
      if (ACTIVE.includes(value.status)) {
        value.status = "interrupted"; value.finishedAt = new Date().toISOString(); value.error = "Validation interrupted by server restart; native browser closure is unconfirmed.";
        this.save(value);
      }
      await this.get(value.requestId);
    }
  }
  async shutdown() { this.shuttingDown = true; for (const id of this.active.keys()) await this.cancel(id); await Promise.allSettled(this.tasks); }
  private async run(value: ExternalValidation, controller: AbortController) {
    const persist = () => { if (controller.signal.aborted) throw new Error("Validation cancelled"); this.save(value); };
    try {
      if (this.system.dryRun) throw new Error("Dry-run cannot establish live browser or deployment evidence");
      const project = getProject(value.project);
      if (project.vcsProvider !== "github") throw new Error("Coolify previews currently support GitHub projects only.");
      const settings = this.previews.projectSettings(value.project);
      const source = await this.system.readPreviewBranchSource?.(project.repoPath, value.branch, settings.recipePath);
      if (!source || source.revision !== value.headSha) throw new Error("Pushed branch does not match the requested SHA");
      const recipe = previewRecipeSchema.parse(source.recipe);
      if (!recipe.testData) throw new Error("Preview recipe must describe seeded testData");
      value.status = "deploying"; value.cleanupStatus = "pending"; persist();
      const preview = await this.previews.createExternal(value.project, value.branch, value.headSha, this.marker(value.requestId));
      value.previewId = preview.id; persist();
      const deadline = Date.now() + 30 * 60 * 1000;
      let target = this.previews.get(preview.id);
      while (target.status !== "ready") {
        if (controller.signal.aborted) throw new Error("Validation cancelled");
        if (Date.now() > deadline || ["failed", "interrupted", "stopped", "stopping"].includes(target.status)) throw new Error("Preview deployment did not become ready");
        await new Promise<void>(resolve => setTimeout(resolve, 1000));
        target = this.previews.get(preview.id);
      }
      if (target.deployedRevision !== value.headSha || !target.url) throw new Error("Deployment SHA could not be verified");
      value.deploymentId = target.deploymentUuid; value.deployedSha = target.deployedRevision; value.previewUrl = target.url; value.status = "running"; persist();
      const auth = this.config.getPreviewAuth();
      if (!auth) throw new Error("Preview authentication is unavailable");
      const execution = resolveExecution("quality-validator", { orchestrator: value.provider }, { model: MODELS.triage, effort: MODELS.triageEffort });
      await assertExecutionAvailable(this.system, execution);
      const directory = this.directory(value.requestId);
      const previewUrl = target.url;
      const result = await this.system.sourceUpdateAdmission.run(() => runQualityValidator({ ticketId: value.missionId, runId: digest(value.requestId), cwd: directory, startSession: options => this.system.startAgentSession(options), execution, criteria: value.scenarios.map(item => ({ id: item.id, text: item.description, expected: item.expected, interaction: item.interaction, source: "user", required: true, independent: true })), revisionSha: value.headSha, environment: {}, checks: [], addresses: [{ label: "Preview", url: previewUrl }], signal: controller.signal, artifactDirectory: directory, browserAuth: auth, testData: recipe.testData, mode: "browser", functional: true }), false);
      value.sessionId = result.sessionId;
      for (const evidence of result.evidence) {
        const artifactIds: string[] = [];
        if (evidence.artifactPath) {
          const path = await this.ownedFile(value.requestId, evidence.artifactPath);
          const bytes = await readFile(path);
          const id = digest(bytes);
          writeFileSync(join(directory, id), bytes, { mode: 0o600 });
          const image = extname(path) === ".png";
          if (!value.artifacts.some(item => item.id === id)) value.artifacts.push({ id, name: `evidence-${id.slice(0, 12)}${image ? ".png" : ".json"}`, mimeType: image ? "image/png" : "application/json", sha256: id }); artifactIds.push(id);
        }
        value.results.push({ scenarioId: evidence.criterionId ?? "", status: evidence.status === "passed" || evidence.status === "failed" ? evidence.status : "inconclusive", summary: evidence.summary, actions: evidence.scenario?.actions.map(action => action.tool) ?? [], observed: evidence.scenario?.observed || (evidence.scenario?.interaction === "visual" ? evidence.output || evidence.summary : ""), artifactIds });
      }
      value.status = "inconclusive";
      if (value.results.some(item => item.status === "failed")) value.status = "failed";

      persist();
    } catch (error) {
      value.status = controller.signal.aborted ? "cancelled" : "blocked";
      value.error = this.config.redactError(error instanceof Error ? error.message : "External validation failed");
    } finally {
      value.finishedAt = new Date().toISOString();
      this.save(value);
      await this.get(value.requestId);
    }
  }
  private async ownedFile(id: string, path: string) {
    const directory = await realpath(this.directory(id));
    const resolved = await realpath(resolve(directory, path));
    if (!resolved.startsWith(directory + sep) || !(await lstat(resolved)).isFile()) throw new Error("Artifact is not an owned run file");
    return resolved;
  }
  async artifact(requestId: string, artifactId: string) {
    const value = this.load(requestId);
    const artifact = value?.artifacts.find(item => item.id === artifactId);
    if (!artifact) throw new Error("Artifact not found");
    const path = await this.ownedFile(requestId, artifact.id);
    if ((await lstat(path)).size > MAX_ARTIFACT_BYTES) throw new Error("Artifact exceeds the 512000-character base64 response limit; request a smaller capture");
    const bytes = await readFile(path);
    if (digest(bytes) !== artifact.sha256) throw new Error("Artifact digest mismatch");
    return { artifact: { ...artifact, contentBase64: bytes.toString("base64") } };
  }
}
