/**
 * Registry of the GitHub accounts this server may act as. The account folders under
 * `<dataRoot>/gh-accounts/<login>/` ARE the registry (one `GH_CONFIG_DIR` each, filled by
 * `gh auth login --with-token --insecure-storage`): no account table, and no token ever reaches
 * SQLite, config.json, a log or an API response. The machine's own gh config is never touched.
 */

import { randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, readdir, rename, rm, stat } from "node:fs/promises";
import { join } from "node:path";

import { githubLoginSchema } from "../../../shared/github.ts";
import type { GithubAccountStatus } from "../../../shared/github.ts";
import { redactSecrets } from "../secretRedaction.ts";

import {
  accountConfigDir,
  assertAccountFiles,
  ensureAccountGitConfig,
  githubAccountsRoot,
  GithubAccountError,
  normalizeGithubLogin,
  privatizeAccountTree,
  verifyGithubIdentity,
  withoutGithubTokens,
} from "./accountEnv.ts";

const LOGIN_TIMEOUT_MS = 30_000;
const PRIVATE_DIRECTORY_MODE = 0o700;
const PENDING_PREFIX = ".pending-";
const ERROR_DETAIL_LIMIT = 300;

export interface GithubAccountRegistry {
  list(): Promise<GithubAccountStatus[]>;
  /** Register (or replace) the account owning `token`; the token only ever travels on gh's stdin. */
  add(token: string): Promise<{ login: string }>;
  remove(login: string): Promise<void>;
  logins(): Promise<string[]>;
}

export interface GhProcessResult {
  exitCode: number;
  stdout: string;
  stderr: string;
  timedOut: boolean;
}

/** Runs gh with a FULL env and optional stdin payload; injectable for tests. */
export type GhProcessRunner = (args: string[], env: Record<string, string>, stdin: string | null) => Promise<GhProcessResult>;

/**
 * Dedicated spawn: unlike runBoundedCommand (stdin ignored) it pipes the token to gh's stdin, so the
 * secret never appears in an argv, an env var or a file we write.
 */
export const spawnGh: GhProcessRunner = async (args, env, stdin) => {
  const proc = Bun.spawn(args, { env, stdin: stdin === null ? "ignore" : "pipe", stdout: "pipe", stderr: "pipe" });
  if (stdin !== null && proc.stdin) {
    proc.stdin.write(stdin);
    await proc.stdin.end();
  }
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    proc.kill(9);
  }, LOGIN_TIMEOUT_MS);
  try {
    const [exitCode, stdout, stderr] = await Promise.all([
      proc.exited,
      new Response(proc.stdout).text(),
      new Response(proc.stderr).text(),
    ]);
    return { exitCode, stdout, stderr, timedOut };
  } finally {
    clearTimeout(timer);
  }
};

function failureDetail(result: GhProcessResult, token: string | null): string {
  const raw = result.timedOut ? "délai dépassé" : (result.stderr.trim() || result.stdout.trim());
  const scrubbed = token ? raw.split(token).join("[redacted]") : raw;
  return redactSecrets(scrubbed).slice(0, ERROR_DETAIL_LIMIT);
}

export class RealGithubAccountRegistry implements GithubAccountRegistry {
  constructor(private readonly runGh: GhProcessRunner = spawnGh) {}

  async logins(): Promise<string[]> {
    const root = githubAccountsRoot();
    if (!existsSync(root)) return [];
    const entries = await readdir(root, { withFileTypes: true });
    return entries
      .filter((entry) => entry.isDirectory() && !entry.name.startsWith(".") && githubLoginSchema.safeParse(entry.name).success)
      .map((entry) => entry.name)
      .sort();
  }

  async list(): Promise<GithubAccountStatus[]> {
    const logins = await this.logins();
    return Promise.all(logins.map(async (login): Promise<GithubAccountStatus> => {
      try {
        assertAccountFiles(login);
        await verifyGithubIdentity(login);
        return { login, status: "valid", reason: null };
      } catch (error) {
        const reason = error instanceof Error ? redactSecrets(error.message) : "Compte GitHub invalide.";
        return { login, status: "invalid", reason };
      }
    }));
  }

  async add(token: string): Promise<{ login: string }> {
    const secret = token.trim();
    if (!secret) throw new GithubAccountError("Token GitHub vide.");
    const root = githubAccountsRoot();
    await mkdir(root, { recursive: true, mode: PRIVATE_DIRECTORY_MODE });
    const pending = join(root, `${PENDING_PREFIX}${randomUUID()}`);
    await mkdir(pending, { mode: PRIVATE_DIRECTORY_MODE });
    try {
      // GH_CONFIG_DIR is ALWAYS the pending folder: gh auth never sees the machine's config, so the
      // machine's default and active accounts stay untouched.
      const env = { ...withoutGithubTokens(process.env), GH_CONFIG_DIR: pending, GH_PROMPT_DISABLED: "1" };
      const login = await this.runGh(["gh", "auth", "login", "--hostname", "github.com", "--with-token", "--insecure-storage"], env, `${secret}\n`);
      if (login.exitCode !== 0 || login.timedOut) {
        throw new GithubAccountError(`Token GitHub refusé : ${failureDetail(login, secret) || "gh auth login a échoué"}.`);
      }
      const user = await this.runGh(["gh", "api", "user", "--hostname", "github.com", "--jq", ".login"], env, null);
      const parsed = githubLoginSchema.safeParse(user.stdout.trim());
      if (user.exitCode !== 0 || user.timedOut || !parsed.success) {
        throw new GithubAccountError(`Identité GitHub illisible avec ce token : ${failureDetail(user, secret) || "réponse inattendue"}.`);
      }
      const accountLogin = normalizeGithubLogin(parsed.data);
      privatizeAccountTree(pending);
      ensureAccountGitConfig(accountLogin, pending);
      const target = accountConfigDir(accountLogin);
      // Replace an existing account of the same login: never two folders for one login.
      await rm(target, { recursive: true, force: true });
      await rename(pending, target);
      return { login: accountLogin };
    } catch (error) {
      await rm(pending, { recursive: true, force: true });
      if (error instanceof GithubAccountError) throw error;
      const message = error instanceof Error ? error.message : String(error);
      throw new GithubAccountError(`Ajout du compte GitHub impossible : ${redactSecrets(message.split(secret).join("[redacted]"))}`);
    }
  }

  async remove(login: string): Promise<void> {
    const parsed = githubLoginSchema.safeParse(login);
    if (!parsed.success) throw new GithubAccountError(`Compte GitHub invalide : ${login}.`);
    const directory = accountConfigDir(parsed.data);
    const info = await stat(directory).catch(() => null);
    if (!info?.isDirectory()) throw new GithubAccountError(`Compte GitHub « ${parsed.data} » introuvable.`);
    await rm(directory, { recursive: true, force: true });
  }
}

/** Dry-run registry: in memory only, never spawns gh and never writes under gh-accounts. */
export class FakeGithubAccountRegistry implements GithubAccountRegistry {
  static readonly DEFAULT_LOGIN = "dry-run-user";
  /** A token equal to this sentinel is refused, so the UI error path is exercisable in dry-run. */
  static readonly REJECTED_TOKEN = "invalid-token";
  private readonly accounts = new Set<string>();

  async logins(): Promise<string[]> {
    return [...this.accounts].sort();
  }

  async list(): Promise<GithubAccountStatus[]> {
    return (await this.logins()).map((login) => ({ login, status: "valid", reason: null }));
  }

  async add(token: string): Promise<{ login: string }> {
    const secret = token.trim();
    if (!secret || secret === FakeGithubAccountRegistry.REJECTED_TOKEN) throw new GithubAccountError("Token GitHub refusé (dry-run).");
    const login = FakeGithubAccountRegistry.DEFAULT_LOGIN;
    this.accounts.add(login);
    return { login };
  }

  async remove(login: string): Promise<void> {
    const normalized = normalizeGithubLogin(login);
    if (!this.accounts.delete(normalized)) throw new GithubAccountError(`Compte GitHub « ${login} » introuvable.`);
  }
}

export function createGithubAccountRegistry(dryRun: boolean): GithubAccountRegistry {
  return dryRun ? new FakeGithubAccountRegistry() : new RealGithubAccountRegistry();
}
