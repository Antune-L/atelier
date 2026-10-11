/**
 * Server-side GitHub repository listing and HTTPS clone for the « Depuis GitHub » project mode.
 * The clone runs `git clone -- <rebuilt https url> <dir>.partial-<nonce>` without a shell, under the
 * chosen account, bounded at 200 s, then renames the partial folder onto its target in one step.
 * `gh repo clone` is deliberately avoided: it adds an `upstream` remote on forks and follows the
 * user's `git_protocol` (possibly SSH).
 */

import { randomUUID } from "node:crypto";
import { existsSync, realpathSync } from "node:fs";
import { mkdir, rename, rm, stat } from "node:fs/promises";
import { dirname, join } from "node:path";
import { z } from "zod";

import { GITHUB_CLONE_TIMEOUT_MS } from "../../../shared/github.ts";
import type { CloneResult, GithubRepoSummary } from "../../../shared/github.ts";
import { runBoundedCommand, safeJsonParse } from "../boundedCommand.ts";
import { redactSecrets } from "../secretRedaction.ts";

import { definedEnv, githubAccountEnv, githubAccountLabel, githubCloneRoot, GithubAccountError, isInsidePath, verifyGithubIdentity } from "./accountEnv.ts";
import { parseCloneSource } from "./cloneSource.ts";
import { parseGithubRemote } from "./remote.ts";

const LIST_TIMEOUT_MS = 60_000;
const ERROR_DETAIL_LIMIT = 400;
const REPOS_ENDPOINT = "user/repos?per_page=100&affiliation=owner,collaborator,organization_member";

/** The clone source was refused before any process started (HTTP 400). */
export class CloneSourceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CloneSourceError";
  }
}

/** The target folder exists with another origin or is not a git repo (HTTP 409). */
export class CloneConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CloneConflictError";
  }
}

/** The clone exceeded its 200 s budget (HTTP 504). */
export class CloneTimeoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CloneTimeoutError";
  }
}

const ghRepoSchema = z.object({
  full_name: z.string(),
  name: z.string(),
  owner: z.object({ login: z.string() }),
  private: z.boolean(),
  html_url: z.string(),
});
const ghRepoPagesSchema = z.array(z.array(ghRepoSchema));

function commandEnv(account: string | null): Record<string, string> {
  return account === null ? { ...definedEnv(process.env), GIT_TERMINAL_PROMPT: "0" } : githubAccountEnv(account, process.env);
}

/** Every page of owner, collaborator and organization-member repositories; no partial list. */
export async function listGithubRepositories(account: string | null): Promise<GithubRepoSummary[]> {
  if (account !== null) await verifyGithubIdentity(account);
  const result = await runBoundedCommand(
    ["gh", "api", REPOS_ENDPOINT, "--paginate", "--slurp", "--hostname", "github.com"],
    process.cwd(),
    { env: commandEnv(account), timeoutMs: LIST_TIMEOUT_MS },
  );
  if (result.exitCode !== 0 || result.timedOut) {
    const detail = redactSecrets(result.timedOut ? "délai dépassé" : (result.stderr.trim() || result.stdout.trim())).slice(0, ERROR_DETAIL_LIMIT);
    throw new GithubAccountError(`Liste des dépôts GitHub illisible pour le ${githubAccountLabel(account)}${detail ? ` : ${detail}` : ""}.`);
  }
  const pages = ghRepoPagesSchema.safeParse(safeJsonParse(result.stdout));
  if (!pages.success) throw new GithubAccountError(`Réponse GitHub inattendue pour les dépôts du ${githubAccountLabel(account)}.`);
  const repos = new Map<string, GithubRepoSummary>();
  for (const repo of pages.data.flat()) {
    repos.set(repo.full_name.toLowerCase(), {
      fullName: repo.full_name,
      owner: repo.owner.login,
      name: repo.name,
      private: repo.private,
      htmlUrl: repo.html_url,
    });
  }
  return [...repos.values()].sort((a, b) => a.fullName.localeCompare(b.fullName));
}

/** A spawned clone, injectable for tests. Resolves once the process has EXITED. */
export type CloneProcessRunner = (args: string[], env: Record<string, string>, timeoutMs: number) => Promise<{ exitCode: number; stderr: string; timedOut: boolean }>;

const spawnClone: CloneProcessRunner = async (args, env, timeoutMs) => {
  const proc = Bun.spawn(args, { env, stdin: "ignore", stdout: "ignore", stderr: "pipe" });
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    proc.kill(9);
  }, timeoutMs);
  try {
    // Awaiting exit (and stderr) guarantees the killed git no longer writes into the partial folder.
    const [exitCode, stderr] = await Promise.all([proc.exited, new Response(proc.stderr).text()]);
    return { exitCode, stderr, timedOut };
  } finally {
    clearTimeout(timer);
  }
};

let cloneRunner: CloneProcessRunner = spawnClone;

/** Test seam: replace the clone process runner (nothing restores the real one). */
export function setCloneProcessRunner(runner?: CloneProcessRunner): void {
  cloneRunner = runner ?? spawnClone;
}

const cloneChains = new Map<string, Promise<unknown>>();

/** Serialize clones of the same target so two requests never race on one folder. */
async function serialized<T>(key: string, run: () => Promise<T>): Promise<T> {
  const previous = cloneChains.get(key) ?? Promise.resolve();
  const next = previous.catch(() => undefined).then(run);
  cloneChains.set(key, next);
  try {
    return await next;
  } finally {
    if (cloneChains.get(key) === next) cloneChains.delete(key);
  }
}


async function readOrigin(target: string): Promise<string | null> {
  const isRepo = await runBoundedCommand(["git", "-C", target, "rev-parse", "--show-toplevel"], target);
  if (isRepo.exitCode !== 0 || realpathSync(isRepo.stdout.trim()) !== realpathSync(target)) return null;
  const origin = await runBoundedCommand(["git", "-C", target, "config", "--get", "remote.origin.url"], target);
  return origin.exitCode === 0 ? origin.stdout.trim() : null;
}

function sameRepository(origin: string, owner: string, repo: string): boolean {
  const ref = parseGithubRemote(origin);
  return ref !== null
    && ref.host === "github.com"
    && ref.owner.toLowerCase() === owner.toLowerCase()
    && ref.repository.toLowerCase() === repo.toLowerCase();
}

export async function cloneGithubRepository(opts: { source: string; account: string | null }): Promise<CloneResult> {
  const parsed = parseCloneSource(opts.source, opts.account);
  if (!parsed.ok) throw new CloneSourceError(parsed.reason);
  const root = githubCloneRoot();
  const target = join(root, parsed.relativePath);
  return serialized(target, async () => {
    if (opts.account !== null) await verifyGithubIdentity(opts.account);
    await mkdir(dirname(target), { recursive: true });
    const realRoot = realpathSync(root);
    const realParent = realpathSync(dirname(target));
    if (!isInsidePath(realRoot, realParent)) {
      throw new CloneSourceError("Le dossier cible sort de la racine des clones : clonage refusé.");
    }
    const realTarget = join(realParent, parsed.repo.toLowerCase());
    if (existsSync(realTarget)) {
      const info = await stat(realTarget);
      const origin = info.isDirectory() ? await readOrigin(realTarget) : null;
      if (origin !== null && sameRepository(origin, parsed.owner, parsed.repo)) {
        return { repoPath: realTarget, cloneUrl: parsed.cloneUrl, reused: true };
      }
      throw new CloneConflictError(`Le dossier ${realTarget} existe déjà avec un autre dépôt ou n'est pas un dépôt git : rien n'a été modifié.`);
    }
    const partial = `${realTarget}.partial-${randomUUID()}`;
    try {
      const result = await cloneRunner(["git", "clone", "--", parsed.cloneUrl, partial], commandEnv(opts.account), GITHUB_CLONE_TIMEOUT_MS);
      if (result.timedOut) {
        throw new CloneTimeoutError(`Le clonage de ${parsed.cloneUrl} a dépassé ${GITHUB_CLONE_TIMEOUT_MS / 1000} s : il a été interrompu et le dossier partiel supprimé.`);
      }
      if (result.exitCode !== 0) {
        const detail = redactSecrets(result.stderr.trim()).slice(0, ERROR_DETAIL_LIMIT);
        throw new Error(`Clonage de ${parsed.cloneUrl} échoué avec le ${githubAccountLabel(opts.account)}${detail ? ` : ${detail}` : ""}`);
      }
      await rename(partial, realTarget);
      return { repoPath: realTarget, cloneUrl: parsed.cloneUrl, reused: false };
    } finally {
      await rm(partial, { recursive: true, force: true });
    }
  });
}

/** The folder a clone would land in, computed without touching the disk (dry-run). */
export function plannedClonePath(source: string, account: string | null): CloneResult {
  const parsed = parseCloneSource(source, account);
  if (!parsed.ok) throw new CloneSourceError(parsed.reason);
  return { repoPath: join(githubCloneRoot(), parsed.relativePath), cloneUrl: parsed.cloneUrl, reused: false };
}
