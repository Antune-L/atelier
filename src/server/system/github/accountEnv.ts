/**
 * Per-project GitHub account resolution: the single place deciding under which `gh` identity a
 * command runs. A project is resolved from the git common directory of the command's cwd (so its
 * slots, analysis and validation worktrees share the project's account), then its account's
 * `GH_CONFIG_DIR` and a per-account `GIT_CONFIG_GLOBAL` are applied. Projects without an account
 * keep the machine's default gh identity, unchanged. An attached project NEVER falls back to another
 * account: every ambiguity or failure is an error naming the account or the projects.
 */

import { chmodSync, existsSync, readdirSync, readFileSync, realpathSync, renameSync, statSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { isAbsolute, join, relative, resolve, sep } from "node:path";

import type { VcsProvider } from "../../../shared/constants.ts";
import { GITHUB_LOGIN_PATTERN, MACHINE_ACCOUNT_SEGMENT } from "../../../shared/github.ts";
import { runBoundedCommand } from "../boundedCommand.ts";
import type { BoundedCommandOptions, BoundedCommandResult } from "../boundedCommand.ts";
import { redactSecrets } from "../secretRedaction.ts";

import { isSshRemote } from "./remote.ts";

export const GITHUB_ACCOUNTS_DIRECTORY = "gh-accounts";
const DEFAULT_CLONE_ROOT_NAME = "kanban-projects";
const ACCOUNT_GITCONFIG_FILE = "gitconfig";
const PRIVATE_FILE_MODE = 0o600;
const PRIVATE_DIRECTORY_MODE = 0o700;
const GROUP_OTHER_BITS = 0o077;
const SYNC_COMMAND_TIMEOUT_MS = 10_000;
const IDENTITY_TIMEOUT_MS = 20_000;
const IDENTITY_CACHE_TTL_MS = 60_000;
const GITHUB_HOSTNAME = "github.com";

/** Ambient credentials that would override `GH_CONFIG_DIR`; never inherited by an attached project. */
export const GITHUB_TOKEN_ENV_KEYS = ["GH_TOKEN", "GITHUB_TOKEN", "GH_ENTERPRISE_TOKEN", "GITHUB_ENTERPRISE_TOKEN", "GH_HOST"] as const;

export interface GithubProjectBinding {
  key: string;
  label: string;
  repoPath: string;
  vcsProvider: VcsProvider;
  githubAccount: string | null;
}

export interface GithubResolution {
  /** The single project owning the cwd, or null when none matches. */
  project: GithubProjectBinding | null;
  /** Lowercased account login, or null for the machine's default gh identity. */
  account: string | null;
  /** Every project sharing the cwd's git common directory. */
  projects: GithubProjectBinding[];
}

/** Raised whenever an attached project cannot run under its own account. Messages name it. */
export class GithubAccountError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GithubAccountError";
  }
}

export type GithubCommandRunner = (args: string[], cwd: string, options?: BoundedCommandOptions) => Promise<BoundedCommandResult>;
export type GithubSyncCommandRunner = (args: string[], cwd: string, env?: Record<string, string>) => { exitCode: number; stdout: string; stderr: string };

const defaultSyncRunner: GithubSyncCommandRunner = (args, cwd, env) => {
  const result = Bun.spawnSync(args, {
    cwd,
    stdin: "ignore",
    stdout: "pipe",
    stderr: "pipe",
    timeout: SYNC_COMMAND_TIMEOUT_MS,
    ...(env ? { env } : {}),
  });
  return { exitCode: result.exitCode ?? 1, stdout: result.stdout.toString(), stderr: result.stderr.toString() };
};

let accountsRoot: string | null = null;
let projectSource: () => GithubProjectBinding[] = () => [];
let commandRunner: GithubCommandRunner = runBoundedCommand;
let syncCommandRunner: GithubSyncCommandRunner = defaultSyncRunner;
const commonDirCache = new Map<string, string>();
const identityCache = new Map<string, number>();

/** Wire the accounts registry under `<dataRoot>/gh-accounts` (boot). */
export function configureGithubAccountsRoot(dataRoot: string): void {
  accountsRoot = join(resolve(dataRoot), GITHUB_ACCOUNTS_DIRECTORY);
}

export function githubAccountsRoot(): string {
  if (accountsRoot === null) throw new GithubAccountError("Registre des comptes GitHub non initialisé.");
  return accountsRoot;
}

/** Root of server-side clones: `KANBAN_CLONE_ROOT`, else `~/kanban-projects` (distinct from dataRoot). */
export function githubCloneRoot(): string {
  const configured = process.env.KANBAN_CLONE_ROOT?.trim();
  return resolve(configured ? configured : join(homedir(), DEFAULT_CLONE_ROOT_NAME));
}

/** Wire the project list (boot, from the SQLite store). */
export function setGithubProjectSource(source: () => GithubProjectBinding[]): void {
  projectSource = source;
}

/** Test seam: replace the command runners (pass nothing to restore the real ones). */
export function setGithubCommandRunners(runners: { async?: GithubCommandRunner; sync?: GithubSyncCommandRunner } = {}): void {
  commandRunner = runners.async ?? runBoundedCommand;
  syncCommandRunner = runners.sync ?? defaultSyncRunner;
  commonDirCache.clear();
}

export function clearGithubIdentityCache(): void {
  identityCache.clear();
}

export function normalizeGithubLogin(login: string): string {
  return login.trim().toLowerCase();
}

function assertLogin(login: string): string {
  if (!GITHUB_LOGIN_PATTERN.test(login)) throw new GithubAccountError(`Compte GitHub invalide : ${login}.`);
  return normalizeGithubLogin(login);
}

export function accountConfigDir(login: string): string {
  return join(githubAccountsRoot(), assertLogin(login));
}

/** Directory 0700 and every file 0600; anything wider makes the account unusable. */
export function assertAccountFiles(login: string): void {
  const directory = accountConfigDir(login);
  let info;
  try {
    info = statSync(directory);
  } catch {
    throw new GithubAccountError(`Compte GitHub « ${login} » introuvable sur ce serveur : ajoute-le dans les Réglages.`);
  }
  if (!info.isDirectory()) throw new GithubAccountError(`Compte GitHub « ${login} » introuvable sur ce serveur : ajoute-le dans les Réglages.`);
  assertPrivateTree(directory, login);
}

function assertPrivateTree(directory: string, login: string): void {
  const info = statSync(directory);
  if ((info.mode & GROUP_OTHER_BITS) !== 0) {
    throw new GithubAccountError(`Compte GitHub « ${login} » inutilisable : permissions trop larges sur ${directory} (0700 attendu).`);
  }
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      assertPrivateTree(path, login);
      continue;
    }
    if ((statSync(path).mode & GROUP_OTHER_BITS) !== 0) {
      throw new GithubAccountError(`Compte GitHub « ${login} » inutilisable : permissions trop larges sur ${path} (0600 attendu).`);
    }
  }
}

/** Only the keys an attached project adds to an environment (merged by agent/shell callers). */
export function githubAccountEnvOverrides(login: string): Record<string, string> {
  const directory = accountConfigDir(login);
  return {
    GH_CONFIG_DIR: directory,
    GIT_CONFIG_GLOBAL: join(directory, ACCOUNT_GITCONFIG_FILE),
    GIT_TERMINAL_PROMPT: "0",
    GH_PROMPT_DISABLED: "1",
  };
}

/** Drop the ambient token variables and undefined values from an environment. */
export function withoutGithubTokens(base: Record<string, string | undefined>): Record<string, string> {
  const blocked = new Set<string>(GITHUB_TOKEN_ENV_KEYS);
  return Object.fromEntries(
    Object.entries(base).flatMap(([key, value]) => (value === undefined || blocked.has(key) ? [] : [[key, value]])),
  );
}

/**
 * The FULL environment of a command run under `login`. GH_TOKEN is deliberately not used: it would
 * have to carry the secret in the environment, and Codex strips `*TOKEN*`/`*KEY*` variables (which is
 * also why the credential helper is set through GIT_CONFIG_GLOBAL rather than GIT_CONFIG_KEY_n).
 */
export function githubAccountEnv(login: string, base: Record<string, string | undefined>): Record<string, string> {
  return { ...withoutGithubTokens(base), ...githubAccountEnvOverrides(login) };
}

/**
 * Write `<account>/gitconfig`, the account's GIT_CONFIG_GLOBAL. It includes the user's own global
 * config, then resets the github.com credential helpers (e.g. osxkeychain, which would answer with
 * the machine's account) and delegates to `gh auth git-credential`, which honours GH_CONFIG_DIR. So
 * `git push` from the server, agents or tmux shells authenticates as the account, and nothing is
 * ever written to the repository's `.git/config`.
 */
export function ensureAccountGitConfig(login: string, directory = accountConfigDir(login)): void {
  const home = homedir();
  const includes = [join(home, ".gitconfig"), join(home, ".config", "git", "config")].filter((path) => existsSync(path));
  const lines = [
    "# Generated by Kanban Agents for this GitHub account. Do not edit.",
    ...(includes.length > 0 ? ["[include]", ...includes.map((path) => `\tpath = ${path}`)] : []),
    `[credential "https://${GITHUB_HOSTNAME}"]`,
    "\thelper =",
    "\thelper = !gh auth git-credential",
    "",
  ];
  const content = lines.join("\n");
  const target = join(directory, ACCOUNT_GITCONFIG_FILE);
  if (existsSync(target)) {
    try {
      if (readFileSync(target, "utf8") === content) return;
    } catch {
      // Unreadable: rewritten below.
    }
  }
  const temporary = `${target}.tmp-${process.pid}-${Date.now()}`;
  writeFileSync(temporary, content, { mode: PRIVATE_FILE_MODE });
  renameSync(temporary, target);
}

function realpathOrSelf(path: string): string {
  try {
    return realpathSync(path);
  } catch {
    return resolve(path);
  }
}

function commonDirArgs(cwd: string): string[] {
  return ["git", "-C", cwd, "rev-parse", "--path-format=absolute", "--git-common-dir"];
}

async function commonDir(cwd: string): Promise<string | null> {
  const result = await commandRunner(commonDirArgs(cwd), existingDirectory(cwd));
  if (result.exitCode !== 0 || result.timedOut) return null;
  const path = result.stdout.trim();
  return path ? realpathOrSelf(path) : null;
}

function commonDirSync(cwd: string): string | null {
  const result = syncCommandRunner(commonDirArgs(cwd), existingDirectory(cwd));
  if (result.exitCode !== 0) return null;
  const path = result.stdout.trim();
  return path ? realpathOrSelf(path) : null;
}

/** Spawning in a missing cwd throws; the `-C` argument carries the real target anyway. */
function existingDirectory(cwd: string): string {
  return existsSync(cwd) ? cwd : process.cwd();
}

async function projectCommonDir(repoPath: string): Promise<string | null> {
  const cached = commonDirCache.get(repoPath);
  if (cached !== undefined) return cached;
  const dir = await commonDir(repoPath);
  if (dir !== null) commonDirCache.set(repoPath, dir);
  return dir;
}

function projectCommonDirSync(repoPath: string): string | null {
  const cached = commonDirCache.get(repoPath);
  if (cached !== undefined) return cached;
  const dir = commonDirSync(repoPath);
  if (dir !== null) commonDirCache.set(repoPath, dir);
  return dir;
}

function isInside(parent: string, child: string): boolean {
  const rel = relative(parent, child);
  return rel !== "" && !rel.startsWith("..") && !isAbsolute(rel);
}

/** An attached-account clone folder (`<cloneRoot>/<login>/…`) that matched no project. */
function unresolvedAttachedClone(cwd: string): string | null {
  const root = realpathOrSelf(githubCloneRoot());
  const target = realpathOrSelf(cwd);
  if (!isInside(root, target)) return null;
  const segment = relative(root, target).split(sep)[0];
  return segment && segment !== MACHINE_ACCOUNT_SEGMENT ? segment : null;
}

function projectLabels(projects: GithubProjectBinding[]): string {
  return projects.map((project) => `« ${project.label} »`).join(", ");
}

/** What the origin check names: the project, or the clone folder of a not-yet-created project. */
interface OriginOwner {
  label: string;
}

function decide(cwd: string, matches: GithubProjectBinding[]): GithubResolution & { check: OriginOwner | null } {
  if (matches.length === 0) {
    const segment = unresolvedAttachedClone(cwd);
    if (segment === null) return { project: null, account: null, projects: [], check: null };
    // A clone made under an account (`<cloneRoot>/<login>/…`) that is not a project yet, e.g. the
    // connection test of the creation form: it runs under the account it was cloned with, never
    // under the machine's. An unknown segment is an error.
    if (!GITHUB_LOGIN_PATTERN.test(segment) || accountsRoot === null || !existsSync(join(accountsRoot, normalizeGithubLogin(segment)))) {
      throw new GithubAccountError(`Projet introuvable pour ${cwd} (clone du compte GitHub « ${segment} ») : opération GitHub refusée plutôt que d'utiliser un autre compte.`);
    }
    return { project: null, account: normalizeGithubLogin(segment), projects: [], check: { label: cwd } };
  }
  const accounts = new Set(matches.map((project) => (project.githubAccount ? normalizeGithubLogin(project.githubAccount) : null)));
  if (accounts.size > 1) {
    throw new GithubAccountError(`Compte GitHub ambigu : les projets ${projectLabels(matches)} partagent le même dépôt git avec des comptes différents. Opération réseau refusée.`);
  }
  const [account = null] = accounts;
  const [project = null] = matches;
  if (account === null || project === null) return { project, account: null, projects: matches, check: null };
  if (project.vcsProvider !== "github") {
    throw new GithubAccountError(`Le projet « ${project.label} » n'est pas un projet GitHub : le compte « ${account} » ne peut pas s'y appliquer.`);
  }
  return { project, account, projects: matches, check: project };
}

function assertHttpsOrigin(project: OriginOwner, account: string, origin: { exitCode: number; stdout: string }): void {
  if (origin.exitCode !== 0) {
    throw new GithubAccountError(`Remote origin illisible pour le projet « ${project.label} » (compte « ${account} ») : opération réseau refusée.`);
  }
  if (isSshRemote(origin.stdout)) {
    throw new GithubAccountError(`Remote SSH refusé pour le projet « ${project.label} » rattaché au compte GitHub « ${account} » : utilise un remote HTTPS (https://github.com/…).`);
  }
}

function prepareAccount(account: string): void {
  assertAccountFiles(account);
  ensureAccountGitConfig(account);
}

export async function resolveGithubAccount(cwd: string): Promise<GithubResolution> {
  const projects = projectSource();
  const attachedCandidates = projects.length > 0;
  const dir = attachedCandidates ? await commonDir(cwd) : null;
  const matches: GithubProjectBinding[] = [];
  if (dir !== null) {
    for (const project of projects) {
      if (await projectCommonDir(project.repoPath) === dir) matches.push(project);
    }
  }
  const decision = decide(cwd, matches);
  if (decision.check !== null && decision.account !== null) {
    prepareAccount(decision.account);
    const origin = await commandRunner(["git", "-C", cwd, "remote", "get-url", "origin"], existingDirectory(cwd));
    assertHttpsOrigin(decision.check, decision.account, origin);
  }
  return { project: decision.project, account: decision.account, projects: decision.projects };
}

export function resolveGithubAccountSync(cwd: string): GithubResolution {
  const projects = projectSource();
  const dir = projects.length > 0 ? commonDirSync(cwd) : null;
  const matches = dir === null ? [] : projects.filter((project) => projectCommonDirSync(project.repoPath) === dir);
  const decision = decide(cwd, matches);
  if (decision.check !== null && decision.account !== null) {
    prepareAccount(decision.account);
    const origin = syncCommandRunner(["git", "-C", cwd, "remote", "get-url", "origin"], existingDirectory(cwd));
    assertHttpsOrigin(decision.check, decision.account, origin);
  }
  return { project: decision.project, account: decision.account, projects: decision.projects };
}

function identityArgs(): string[] {
  return ["gh", "api", "user", "--hostname", GITHUB_HOSTNAME, "--jq", ".login"];
}

function checkIdentity(login: string, result: { exitCode: number; stdout: string; stderr: string; timedOut?: boolean }): void {
  if (result.exitCode !== 0 || result.timedOut) {
    const detail = redactSecrets(result.stderr.trim() || result.stdout.trim()).slice(0, 300);
    throw new GithubAccountError(`Compte GitHub « ${login} » : identité illisible (token invalide ou expiré ?)${detail ? ` — ${detail}` : ""}.`);
  }
  const actual = result.stdout.trim();
  if (normalizeGithubLogin(actual) !== normalizeGithubLogin(login)) {
    throw new GithubAccountError(`Compte GitHub « ${login} » : gh répond sous le login « ${actual || "?"} ». Opération refusée.`);
  }
}

function identityCached(login: string): boolean {
  const verifiedAt = identityCache.get(normalizeGithubLogin(login));
  return verifiedAt !== undefined && Date.now() - verifiedAt < IDENTITY_CACHE_TTL_MS;
}

/** `gh api user` under the account must answer its login (case-insensitive). Successes cached 60 s. */
export async function verifyGithubIdentity(login: string): Promise<void> {
  if (identityCached(login)) return;
  assertAccountFiles(login);
  const result = await commandRunner(identityArgs(), process.cwd(), {
    env: githubAccountEnv(login, process.env),
    timeoutMs: IDENTITY_TIMEOUT_MS,
  });
  checkIdentity(login, result);
  identityCache.set(normalizeGithubLogin(login), Date.now());
}

export function verifyGithubIdentitySync(login: string): void {
  if (identityCached(login)) return;
  assertAccountFiles(login);
  checkIdentity(login, syncCommandRunner(identityArgs(), process.cwd(), githubAccountEnv(login, process.env)));
  identityCache.set(normalizeGithubLogin(login), Date.now());
}

export interface GithubCommandOptions {
  timeoutMs?: number;
  /** Check the account's identity first (push, merge, done transitions). */
  verifyIdentity?: boolean;
}

function redactResult(result: BoundedCommandResult): BoundedCommandResult {
  return { ...result, stdout: redactSecrets(result.stdout), stderr: redactSecrets(result.stderr) };
}

/**
 * THE wrapper for every `gh` and network `git` command of the server. Machine-default projects run
 * exactly as before; an attached project runs under its account or throws GithubAccountError.
 */
export async function runGithubCommand(args: string[], cwd: string, options: GithubCommandOptions = {}): Promise<BoundedCommandResult> {
  const resolution = await resolveGithubAccount(cwd);
  const timeout = options.timeoutMs === undefined ? {} : { timeoutMs: options.timeoutMs };
  if (resolution.account === null) return redactResult(await commandRunner(args, cwd, timeout));
  if (options.verifyIdentity) await verifyGithubIdentity(resolution.account);
  return redactResult(await commandRunner(args, cwd, { ...timeout, env: githubAccountEnv(resolution.account, process.env) }));
}

/** Account of the cwd for an identity check outside a command (merge, done gates). */
export async function verifyGithubAccountForCwd(cwd: string): Promise<GithubResolution> {
  const resolution = await resolveGithubAccount(cwd);
  if (resolution.account !== null) await verifyGithubIdentity(resolution.account);
  return resolution;
}

/**
 * Environment overrides for an agent session, shell or script rooted at `cwd`: null for the
 * machine default, the account keys otherwise (identity verified). Throws GithubAccountError.
 */
export function githubEnvForCwdSync(cwd: string): Record<string, string> | null {
  const resolution = resolveGithubAccountSync(cwd);
  if (resolution.account === null) return null;
  verifyGithubIdentitySync(resolution.account);
  return githubAccountEnvOverrides(resolution.account);
}

/**
 * `env` for a process rooted at `cwd`: unchanged for the machine default, else without ambient token
 * variables and with the account keys. Throws GithubAccountError (no silent machine fallback).
 */
export function applyGithubEnvSync(env: Record<string, string | undefined>, cwd: string): Record<string, string | undefined> {
  const github = githubEnvForCwdSync(cwd);
  return github === null ? env : { ...withoutGithubTokens(env), ...github };
}

/** True when GH_CONFIG_DIR points into the registered accounts (an attached-project environment). */
function isAccountEnvironment(env: Record<string, string | undefined>): boolean {
  const dir = env.GH_CONFIG_DIR;
  if (!dir || accountsRoot === null) return false;
  return isInside(accountsRoot, resolve(dir));
}

/**
 * Final provider-side scrub of an agent environment: an attached-project session must not inherit
 * GH_TOKEN/GITHUB_TOKEN from the server, which would override its GH_CONFIG_DIR. Machine-default
 * sessions are returned unchanged.
 */
export function scrubAmbientGithubTokens(env: Record<string, string | undefined>): Record<string, string | undefined> {
  return isAccountEnvironment(env) ? withoutGithubTokens(env) : env;
}

/** Restrict a newly written account tree to its owner (dirs 0700, files 0600). */
export function privatizeAccountTree(directory: string): void {
  chmodSync(directory, PRIVATE_DIRECTORY_MODE);
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) privatizeAccountTree(path);
    else chmodSync(path, PRIVATE_FILE_MODE);
  }
}
