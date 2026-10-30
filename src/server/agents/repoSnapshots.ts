/**
 * Frozen read-only snapshots of origin/<base> for read-only sessions (Atelier, split, reformulate).
 * One detached worktree per (project, SHA) under `<root>/<projectKey>/<sha>`, shared by every session
 * on that SHA and never reset in place. A JSON sidecar written before `git worktree add` records the
 * repo that owns the worktree, so the periodic GC can remove orphans even after a crash or a project
 * config change. Every git operation runs under the shared per-repo mutex.
 */

import { existsSync } from "node:fs";
import { mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { z } from "zod";

import { getErrorMessage } from "../../shared/errors.ts";
import { SLOTS_ROOT } from "../config.ts";
import { createLogger } from "../logger.ts";
import type { KeyedMutex } from "../mutex.ts";
import type { SystemAdapter } from "../system/index.ts";

const log = createLogger("snapshots");

/** Distinct from ANALYSIS_WORKSPACES_ROOT, which triage boot recovery wipes. */
export const REPO_SNAPSHOTS_ROOT = join(SLOTS_ROOT, "snapshots");

const PROJECT_KEY_PATTERN = /^[A-Za-z0-9_-][A-Za-z0-9._-]*$/;
const SHA_PATTERN = /^[0-9a-f]{40}(?:[0-9a-f]{24})?$/;
const SIDECAR_SUFFIX = ".json";

const sidecarSchema = z.object({
  repoPath: z.string().min(1),
  projectKey: z.string(),
  sha: z.string(),
  createdAt: z.number(),
});

/** A sidecar truncated by a crash is unreadable, not fatal: it fails schema validation like any invalid one. */
function parseJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

export type RepoSnapshotSystem = Pick<SystemAdapter, "dryRun" | "fetch" | "readGitRef" | "readCommitTimestamp" | "addSnapshotWorktree" | "removeSnapshotWorktree">;

export interface RepoSnapshotsOptions {
  system: RepoSnapshotSystem;
  repoMutex: KeyedMutex;
  root?: string;
  fetchTimeoutMs?: number;
  gcIntervalMs?: number;
}

export interface AcquireSnapshotInput {
  projectKey: string;
  repoPath: string;
  baseBranch: string;
  /** Pinned SHA to reuse; null/undefined resolves the current origin/<baseBranch>. */
  sha?: string | null;
  fetch: boolean;
  /** Fail instead of falling back to the last known origin/<baseBranch> when the fetch fails. */
  requireFetch: boolean;
}

export interface SnapshotLease {
  cwd: string;
  sha: string;
  committedAt: number;
  baseBranch: string;
  fetchError: string | null;
  release(): void;
}

export class RepoSnapshots {
  private readonly system: RepoSnapshotSystem;
  readonly repoMutex: KeyedMutex;
  private readonly root: string;
  private readonly fetchTimeoutMs: number;
  private readonly gcIntervalMs: number;
  /** Live lease count per snapshot path. */
  private readonly leases = new Map<string, number>();
  private timer: ReturnType<typeof setInterval> | null = null;

  constructor(options: RepoSnapshotsOptions) {
    this.system = options.system;
    this.repoMutex = options.repoMutex;
    this.root = options.root ?? REPO_SNAPSHOTS_ROOT;
    this.fetchTimeoutMs = options.fetchTimeoutMs ?? 15_000;
    this.gcIntervalMs = options.gcIntervalMs ?? 10 * 60_000;
  }

  async acquire(input: AcquireSnapshotInput): Promise<SnapshotLease> {
    if (!PROJECT_KEY_PATTERN.test(input.projectKey)) throw new Error(`Clé de projet invalide pour un snapshot : ${input.projectKey}`);
    if (input.sha != null && !SHA_PATTERN.test(input.sha)) throw new Error(`SHA de snapshot invalide : ${input.sha}`);
    return this.repoMutex.run(input.repoPath, async () => {
      let fetchError: string | null = null;
      // Dry-run fetches are no-ops with a simulated delay: skip them so sandbox flows stay immediate.
      if (input.fetch && !this.system.dryRun) {
        try {
          await this.system.fetch(input.repoPath, input.baseBranch, { deadlineAt: Date.now() + this.fetchTimeoutMs });
        } catch (error) {
          const detail = getErrorMessage(error);
          if (input.requireFetch) throw new Error(`git fetch origin/${input.baseBranch} impossible : ${detail}`);
          fetchError = detail;
          log.warn("fetch du snapshot échoué, dernière référence connue utilisée", { repoPath: input.repoPath, baseBranch: input.baseBranch, detail });
        }
      }
      const sha = input.sha ?? (await this.system.readGitRef(input.repoPath, `origin/${input.baseBranch}`));
      if (!SHA_PATTERN.test(sha)) throw new Error(`SHA de snapshot invalide : ${sha}`);
      const committedAt = await this.system.readCommitTimestamp(input.repoPath, sha);
      const path = join(this.root, input.projectKey, sha);
      // A worktree checkout always has its `.git` file; a bare directory is a partial add to redo.
      if (!this.system.dryRun && !existsSync(join(path, ".git"))) await this.create(input.repoPath, input.projectKey, sha, path);
      this.leases.set(path, (this.leases.get(path) ?? 0) + 1);
      let released = false;
      return {
        cwd: path,
        sha,
        committedAt,
        baseBranch: input.baseBranch,
        fetchError,
        release: () => {
          if (released) return;
          released = true;
          const remaining = (this.leases.get(path) ?? 1) - 1;
          if (remaining > 0) this.leases.set(path, remaining);
          else this.leases.delete(path);
        },
      };
    });
  }

  private async create(repoPath: string, projectKey: string, sha: string, path: string): Promise<void> {
    const sidecar = `${path}${SIDECAR_SUFFIX}`;
    await mkdir(join(this.root, projectKey), { recursive: true });
    await writeFile(sidecar, JSON.stringify({ repoPath, projectKey, sha, createdAt: Date.now() }));
    if (existsSync(path)) await this.system.removeSnapshotWorktree(repoPath, path);
    try {
      await this.system.addSnapshotWorktree(repoPath, path, sha);
    } catch (error) {
      const detail = getErrorMessage(error);
      try {
        await this.system.removeSnapshotWorktree(repoPath, path);
        await rm(sidecar, { force: true });
      } catch (cleanupError) {
        log.warn("nettoyage du snapshot partiel échoué", { path, detail: getErrorMessage(cleanupError) });
      }
      throw new Error(`Création du snapshot ${sha.slice(0, 12)} impossible : ${detail}`);
    }
    log.info("snapshot créé", { repoPath, path });
  }

  /** Remove every snapshot without a live lease, using the repo recorded in its sidecar. Never throws. */
  async gc(): Promise<void> {
    if (this.system.dryRun) return;
    try {
      if (!existsSync(this.root)) return;
      for (const projectEntry of await readdir(this.root, { withFileTypes: true })) {
        if (!projectEntry.isDirectory()) continue;
        await this.gcProject(join(this.root, projectEntry.name));
      }
    } catch (error) {
      log.error("GC des snapshots échoué", { detail: getErrorMessage(error) });
    }
  }

  private async gcProject(projectDir: string): Promise<void> {
    const entries = await readdir(projectDir, { withFileTypes: true });
    const sidecars = new Set(entries.filter((entry) => entry.isFile() && entry.name.endsWith(SIDECAR_SUFFIX)).map((entry) => entry.name.slice(0, -SIDECAR_SUFFIX.length)));
    const dirs = entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name);
    for (const name of sidecars) {
      const path = join(projectDir, name);
      try {
        await this.gcRecorded(path);
      } catch (error) {
        log.warn("suppression du snapshot échouée", { path, detail: getErrorMessage(error) });
      }
    }
    for (const name of dirs) {
      if (sidecars.has(name)) continue;
      const path = join(projectDir, name);
      if (this.leases.has(path)) continue;
      try {
        await rm(path, { recursive: true, force: true });
        log.warn("snapshot sans métadonnées supprimé", { path });
      } catch (error) {
        log.warn("suppression du snapshot sans métadonnées échouée", { path, detail: getErrorMessage(error) });
      }
    }
  }

  private async gcRecorded(path: string): Promise<void> {
    const sidecar = `${path}${SIDECAR_SUFFIX}`;
    const parsed = sidecarSchema.safeParse(parseJson(await readFile(sidecar, "utf8")));
    if (!parsed.success) {
      if (this.leases.has(path)) return;
      await rm(path, { recursive: true, force: true });
      await rm(sidecar, { force: true });
      log.warn("métadonnées de snapshot invalides, dossier supprimé", { path });
      return;
    }
    const { repoPath } = parsed.data;
    await this.repoMutex.run(repoPath, async () => {
      // Checked under the mutex: an acquire on the same repo cannot interleave with the removal.
      if (this.leases.has(path)) return;
      await this.system.removeSnapshotWorktree(repoPath, path);
      await rm(sidecar, { force: true });
      log.info("snapshot supprimé", { repoPath, path });
    });
  }

  start(): void {
    void this.gc();
    if (this.timer) return;
    this.timer = setInterval(() => void this.gc(), this.gcIntervalMs);
    this.timer.unref?.();
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }
}
