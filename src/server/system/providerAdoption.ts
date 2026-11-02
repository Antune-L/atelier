import { createPublicKey } from "node:crypto";

import { z } from "zod";

import { ADOPTION_WORKFLOW, adoptionShaSchema, adoptionStatusSchema } from "../../shared/providerAdoption.ts";
import type { AdoptionStatus } from "../../shared/providerAdoption.ts";
import { lockedProviderVersions, providerVersionsSchema } from "../../shared/providerUpdates.ts";
import type { Store } from "../db/store.ts";
import type { SystemAdapter } from "./types.ts";
import { AdoptionRequestError, adoptionDispatchPath, readAdoptionReceipt } from "./providerAdoptionTransport.ts";

const META_KEY = "provider-adoption-v1";
const STABLE = z.string().regex(/^\d+\.\d+\.\d+$/);
const WORKFLOW_PATH = `.github/workflows/${ADOPTION_WORKFLOW}`;
const WORKFLOW_PATHS = new Set([WORKFLOW_PATH, `${WORKFLOW_PATH}@main`, `${WORKFLOW_PATH}@refs/heads/main`]);
export class ProviderAdoptionService {
  private pending: Promise<AdoptionStatus> | null = null;
  constructor(private readonly store: Store, private readonly system: Pick<SystemAdapter, "dryRun" | "providerAdoptionRequest">, private readonly resourcesRoot: string) {}
  private save(status: AdoptionStatus, replace = false): AdoptionStatus {
    const raw = this.store.getMeta(META_KEY);
    const current = raw ? adoptionStatusSchema.parse(JSON.parse(raw)) : null;
    if (!replace && current && current.requestId !== status.requestId) return current;
    const parsed = adoptionStatusSchema.parse({ ...status, updatedAt: Date.now() });
    if (!this.store.compareAndSetMeta(META_KEY, raw, JSON.stringify(parsed))) return this.snapshot() ?? parsed;
    return parsed;
  }
  snapshot(): AdoptionStatus | null {
    const saved = this.store.getMeta(META_KEY);
    return saved ? adoptionStatusSchema.parse(JSON.parse(saved)) : null;
  }
  private async credentials(): Promise<{ token: string; key: string } | null> {
    const token = process.env.ATELIER_ADOPTION_TOKEN ?? (process.env.ATELIER_ADOPTION_TOKEN_FILE ? (await Bun.file(process.env.ATELIER_ADOPTION_TOKEN_FILE).text()).trim() : "");
    const key = process.env.ATELIER_ADOPTION_PUBLIC_KEY ?? (process.env.ATELIER_ADOPTION_PUBLIC_KEY_FILE ? await Bun.file(process.env.ATELIER_ADOPTION_PUBLIC_KEY_FILE).text() : "");
    if (!token || !key || createPublicKey(key).asymmetricKeyType !== "ed25519") return null;
    return { token, key };
  }
  start(): Promise<AdoptionStatus> {
    if (this.pending) return this.pending;
    this.pending = this.prepare().finally(() => { this.pending = null; });
    return this.pending;
  }
  private async prepare(): Promise<AdoptionStatus> {
    const previousRaw = this.store.getMeta(META_KEY);
    const previous = this.snapshot();
    if (previous && !["setup-required", "unchanged", "simulated", "failed", "ready"].includes(previous.phase)) return this.status();
    const initial: AdoptionStatus = { requestId: crypto.randomUUID(), providers: null, base: null, runId: null, phase: "queued", reason: null, receipt: null, updatedAt: Date.now() };
    if (this.system.dryRun) return this.save({ ...initial, phase: "simulated", reason: "Simulation : aucune préparation externe ni qualification réelle." }, true);
    const credentials = await this.credentials().catch(() => null);
    if (!credentials) return this.save({ ...initial, phase: "setup-required", reason: "Configure the dedicated preparation token and publisher public key on the backend." }, true);
    try {
      const versions = await Promise.all(["@anthropic-ai/claude-agent-sdk", "@openai/codex-sdk"].map(async (name) => z.object({ version: STABLE }).parse(await this.system.providerAdoptionRequest(`registry/${encodeURIComponent(name)}/latest`, "")).version));
      const providers = providerVersionsSchema.parse({ claude: versions[0], codex: versions[1] });
      let installed;
      if (await Bun.file(`${this.resourcesRoot}/bun.lock`).exists()) installed = lockedProviderVersions(await Bun.file(`${this.resourcesRoot}/bun.lock`).text());
      else installed = providerVersionsSchema.parse({
        claude: z.object({ version: STABLE }).parse(await Bun.file(`${this.resourcesRoot}/provider-packages/claude.json`).json()).version,
        codex: z.object({ version: STABLE }).parse(await Bun.file(`${this.resourcesRoot}/provider-packages/codex.json`).json()).version,
      });
      if (installed.claude === providers.claude && installed.codex === providers.codex) return this.save({ ...initial, providers, phase: "unchanged", reason: "Les deux fournisseurs sont déjà à ces versions." }, true);
      if (previous?.phase === "ready" && previous.providers?.claude === providers.claude && previous.providers.codex === providers.codex) return this.status();
      const base = z.object({ sha: adoptionShaSchema }).parse(await this.system.providerAdoptionRequest("commits/main", credentials.token)).sha;
      const queued = adoptionStatusSchema.parse({ ...initial, providers, base, phase: "unknown", reason: "Dispatch pending acknowledgement. Do not retry an unknown request." });
      if (!this.store.compareAndSetMeta(META_KEY, previousRaw, JSON.stringify(queued))) return this.status();
      const result = z.object({ workflow_run_id: z.number().int().positive() }).parse(await this.system.providerAdoptionRequest(adoptionDispatchPath, credentials.token, { ref: "main", return_run_details: true, inputs: { request_id: queued.requestId, base, claude: providers.claude, codex: providers.codex } }));
      return this.save({ ...queued, runId: result.workflow_run_id, phase: "queued", reason: null });
    } catch (error) {
      const current = this.snapshot();
      if (current && current.requestId !== initial.requestId) {
        const failed = { ...initial, phase: "failed", reason: "Preparation unavailable. Check the dedicated service configuration." } satisfies AdoptionStatus;
        if (this.store.compareAndSetMeta(META_KEY, previousRaw, JSON.stringify(failed))) return failed;
        return this.snapshot() ?? failed;
      }
      const uncertain = current?.phase === "unknown" && !(error instanceof AdoptionRequestError && error.rejected);
      return this.save({ ...(current ?? initial), phase: uncertain ? "unknown" : "failed", reason: "Preparation unavailable. Check dedicated credentials, workflow setup and the recorded request before retrying." });
    }
  }
  async status(): Promise<AdoptionStatus> {
    let status = this.snapshot();
    if (!status) throw new Error("No provider preparation requested.");
    if (this.system.dryRun) return { ...status, phase: "simulated", receipt: null };
    if (status.phase === "failed") return status;
    const credentials = await this.credentials().catch(() => null);
    if (!credentials) return { ...status, phase: "setup-required", reason: "Dedicated preparation credentials or publisher public key missing." };
    try {
      if (!status.runId && status.phase === "unknown") {
        const runs = z.object({ workflow_runs: z.array(z.object({ id: z.number().int().positive(), display_title: z.string(), head_sha: z.string() })) }).parse(await this.system.providerAdoptionRequest(`actions/workflows/${ADOPTION_WORKFLOW}/runs?event=workflow_dispatch&per_page=100`, credentials.token));
        const exact = runs.workflow_runs.filter((run) => run.display_title === `Provider adoption ${status?.requestId}` && run.head_sha === status?.base);
        const match = exact[0];
        if (exact.length !== 1 || !match) return status;
        status = this.save({ ...status, runId: match.id, reason: null });
      }
      if (!status.runId) return status;
      const run = z.object({ id: z.number(), path: z.string(), event: z.literal("workflow_dispatch"), head_sha: adoptionShaSchema, display_title: z.string(), run_attempt: z.literal(1), status: z.string(), conclusion: z.string().nullable() }).parse(await this.system.providerAdoptionRequest(`actions/runs/${status.runId}`, credentials.token));
      if (run.id !== status.runId || !WORKFLOW_PATHS.has(run.path) || run.display_title !== `Provider adoption ${status.requestId}`) throw new Error("Unexpected workflow identity.");
      if (run.head_sha !== status.base && !(run.status === "completed" && run.conclusion !== "success")) throw new Error("Unexpected workflow revision.");
      if (run.status === "completed" && run.conclusion !== "success") return this.save({ ...status, phase: "failed", reason: "Preparation failed or was cancelled. No candidate is approved for installation." });
      const jobs = z.object({ jobs: z.array(z.object({ name: z.string(), status: z.string(), conclusion: z.string().nullable() })) }).parse(await this.system.providerAdoptionRequest(`actions/runs/${status.runId}/jobs?per_page=100`, credentials.token));
      if (run.status !== "completed") {
        let phase: AdoptionStatus["phase"] = "preparation";
        if (jobs.jobs.some((job) => job.name.startsWith("qualify") && job.status === "in_progress")) phase = "qualification";
        if (jobs.jobs.some((job) => job.name === "publish" && job.status === "in_progress")) phase = "build";
        return this.save({ ...status, phase, reason: null });
      }
      if (run.conclusion !== "success" || !["prepare", "qualify (ubuntu-latest)", "qualify (macos-15)", "publish"].every((name) => jobs.jobs.some((job) => job.name === name && job.conclusion === "success"))) throw new Error("Required gate missing or unsuccessful.");
      const receipt = await readAdoptionReceipt(status.runId, credentials.key, credentials.token, (path, token, body) => this.system.providerAdoptionRequest(path, token, body));
      if (receipt.requestId !== status.requestId || receipt.base !== status.base || JSON.stringify(receipt.providers) !== JSON.stringify(status.providers)) throw new Error("Candidate mismatch.");
      return this.save({ ...status, phase: "ready", receipt, reason: null });
    } catch { return this.save({ ...status, phase: "unknown", reason: "Exact preparation or signed qualification could not be verified. Installation remains disabled." }); }
  }
  async approve(target: string, mac = false): Promise<void> {
    const status = await this.status();
    const receipt = status.receipt;
    if (this.system.dryRun || status.phase !== "ready" || !receipt || target !== (mac ? receipt.version : receipt.revision)) throw new Error("Confirm a ready, qualified provider candidate.");
  }
}
