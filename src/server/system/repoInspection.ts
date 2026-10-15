import { basename, dirname } from "node:path";
import { z } from "zod";

import type { VcsProvider } from "../../shared/constants.ts";
import type { RepoInspection } from "../../shared/schemas.ts";
import { scriptArgumentSeparator, scriptRunner } from "./packageManager.ts";
import type { ResolvedPackageManager } from "./packageManager.ts";

export type RepoInspectionResult = Omit<RepoInspection, "existingProjectKey">;
type RepoSuggestion = NonNullable<RepoInspection["label"]>;
type VcsProviderSuggestion = NonNullable<RepoInspection["vcsProvider"]>;

export const PACKAGE_MANIFEST_FILE = "package.json";
export const REPO_NOT_FOUND_MESSAGE = "dossier introuvable";
export const FALLBACK_BASE_BRANCH = "main";
const REMOTE_HEAD_PREFIX = "origin/";
const NPM_SCOPE_PATTERN = /^@[^/]+\//;
const LABEL_WORD_SEPARATOR = /[-_./]+/;
const LABEL_WORD_JOINER = " ";
const SCP_LIKE_REMOTE_PATTERN = /^(?:[^@/\s]+@)?([A-Za-z0-9][^:/\s]*):(?!\/\/)/;
const SSH_URL_REMOTE_PATTERN = /^ssh:\/\/(?:[^@/\s]+@)?([A-Za-z0-9][^:/\s]*)/;
const SSH_CONFIG_HOSTNAME_PATTERN = /^hostname\s+(\S+)$/m;
const RUN_SCRIPT_CANDIDATES = ["dev", "start", "serve"] as const;
export const COMPOSE_FILE_NAMES = ["compose.yaml", "compose.yml", "docker-compose.yaml", "docker-compose.yml"] as const;
const VITE_BINARY = "vite";
const VITE_DEV_SUBCOMMANDS = ["dev", "serve"];
const SHELL_OPERATOR_PATTERN = /[&|;<>`$()\n]/;
const SCRIPT_TOKEN_SEPARATOR = /\s+/;
const OPTION_PREFIX = "-";
const GENERIC_MANIFEST_NAMES = ["root", "monorepo", "workspace", "workspaces"];
const PREFERRED_APP_FOLDERS = ["web", "web-app", "webapp", "frontend", "front", "app", "client"];
const SAFE_WORKSPACE_PATH_PATTERN = /^[\w@.-]+(?:\/[\w@.-]+)*$/;
const CHANGE_DIRECTORY_JOINER = " && ";
// NOTE: validation health-checks 127.0.0.1:$PORT; `--strictPort` makes Vite fail instead of silently taking another port.
const VITE_VALIDATION_FLAGS = "--port $PORT --host 127.0.0.1 --strictPort";

const PROVIDER_HOST_MARKERS: { provider: VcsProvider; markers: string[] }[] = [
  { provider: "github", markers: ["github.com"] },
  { provider: "azureDevops", markers: ["dev.azure.com", "visualstudio.com"] },
];

const packageManifestSchema = z.object({
  name: z.string().optional().catch(undefined),
  packageManager: z.string().optional().catch(undefined),
  workspaces: z.union([z.array(z.string()), z.object({ packages: z.array(z.string()).optional() })]).optional().catch(undefined),
  scripts: z.record(z.string(), z.unknown()).optional().catch(undefined),
});
export type PackageManifest = z.infer<typeof packageManifestSchema>;

export interface WorkspacePackage {
  path: string;
  manifest: PackageManifest;
}

export interface RepoFacts {
  repoPath: string;
  isGitRepo: boolean;
  manifest: PackageManifest | null;
  packageManager: ResolvedPackageManager | null;
  remoteHead: string | null;
  currentBranch: string | null;
  remoteUrl: string | null;
  /** Real hostname behind an SSH host alias of the origin URL (`ssh -G`), when one was resolved. */
  remoteSshHostname: string | null;
  knownGroups: string[];
  githubOwner: string | null;
  githubLogins: string[];
  composeFile: string | null;
  workspacePackages: WorkspacePackage[];
}

export type RepoInspectionContext = Pick<RepoFacts, "knownGroups" | "githubLogins">;

export function parsePackageManifest(text: string): PackageManifest | null {
  try {
    const parsed = packageManifestSchema.safeParse(JSON.parse(text));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

/** "@org/my-cool_app" becomes "My Cool App"; null when nothing word-like remains. */
export function formatProjectLabel(raw: string): string | null {
  const words = raw
    .trim()
    .replace(NPM_SCOPE_PATTERN, "")
    .split(LABEL_WORD_SEPARATOR)
    .filter((word) => word.length > 0)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1));
  return words.length > 0 ? words.join(LABEL_WORD_JOINER) : null;
}

function isGenericManifestName(name: string): boolean {
  return GENERIC_MANIFEST_NAMES.includes(name.trim().replace(NPM_SCOPE_PATTERN, "").toLowerCase());
}

export function suggestLabel(repoPath: string, manifest: PackageManifest | null): RepoSuggestion | null {
  const manifestLabel = manifest?.name && !isGenericManifestName(manifest.name) ? formatProjectLabel(manifest.name) : null;
  if (manifestLabel) return { value: manifestLabel, source: "packageManifest" };
  const folderLabel = formatProjectLabel(basename(repoPath));
  return folderLabel ? { value: folderLabel, source: "folderName" } : null;
}

export function suggestGroup(repoPath: string, knownGroups: string[]): RepoSuggestion | null {
  const parentName = basename(dirname(repoPath)).trim().toLowerCase();
  if (!parentName) return null;
  const match = knownGroups.find((group) => group.trim().toLowerCase() === parentName);
  return match ? { value: match, source: "parentFolder" } : null;
}

export function suggestBaseBranch(remoteHead: string | null, currentBranch: string | null): RepoSuggestion {
  if (remoteHead) {
    const branch = remoteHead.startsWith(REMOTE_HEAD_PREFIX) ? remoteHead.slice(REMOTE_HEAD_PREFIX.length) : remoteHead;
    if (branch) return { value: branch, source: "remoteHead" };
  }
  if (currentBranch) return { value: currentBranch, source: "currentBranch" };
  return { value: FALLBACK_BASE_BRANCH, source: "fallback" };
}

export function vcsProviderFromRemoteUrl(remoteUrl: string): VcsProvider | null {
  const url = remoteUrl.toLowerCase();
  return PROVIDER_HOST_MARKERS.find(({ markers }) => markers.some((marker) => url.includes(marker)))?.provider ?? null;
}

/** Host of an SSH remote (`git@alias:org/repo.git` or `ssh://git@alias/org/repo`), else null. */
export function sshHostFromRemoteUrl(remoteUrl: string): string | null {
  const match = SSH_URL_REMOTE_PATTERN.exec(remoteUrl) ?? SCP_LIKE_REMOTE_PATTERN.exec(remoteUrl);
  return match?.[1] ?? null;
}

/** The effective `hostname` line of `ssh -G <host>` output. */
export function hostnameFromSshConfig(output: string): string | null {
  return SSH_CONFIG_HOSTNAME_PATTERN.exec(output)?.[1] ?? null;
}

export function suggestVcsProvider(remoteUrl: string | null, remoteSshHostname: string | null): VcsProviderSuggestion | null {
  const provider = (remoteUrl ? vcsProviderFromRemoteUrl(remoteUrl) : null)
    ?? (remoteSshHostname ? vcsProviderFromRemoteUrl(remoteSshHostname) : null);
  return provider ? { value: provider, source: "remoteUrl" } : null;
}

function pickRunScript(manifest: PackageManifest | null): string | null {
  const scripts = manifest?.scripts;
  if (!scripts) return null;
  return RUN_SCRIPT_CANDIDATES.find((name) => Object.hasOwn(scripts, name)) ?? null;
}

export function suggestRunScript(manifest: PackageManifest | null, packageManager: ResolvedPackageManager | null): RepoSuggestion | null {
  const script = pickRunScript(manifest);
  if (!script) return null;
  return { value: `${scriptRunner(packageManager)} ${script}`, source: packageManager?.lockfile ? "lockfile" : "packageManifest" };
}

export function isViteDevScript(body: string): boolean {
  if (SHELL_OPERATOR_PATTERN.test(body)) return false;
  const [binary, subcommand] = body.trim().split(SCRIPT_TOKEN_SEPARATOR);
  if (binary !== VITE_BINARY) return false;
  return subcommand === undefined || subcommand.startsWith(OPTION_PREFIX) || VITE_DEV_SUBCOMMANDS.includes(subcommand);
}

function viteDevScript(manifest: PackageManifest | null): string | null {
  const script = pickRunScript(manifest);
  const body = script ? manifest?.scripts?.[script] : undefined;
  return script && typeof body === "string" && isViteDevScript(body) ? script : null;
}

function pickViteWorkspace(packages: WorkspacePackage[]): { path: string; script: string } | null {
  const candidates = packages.flatMap((entry) => {
    const script = viteDevScript(entry.manifest);
    return script && SAFE_WORKSPACE_PATH_PATTERN.test(entry.path) ? [{ path: entry.path, script }] : [];
  });
  if (candidates.length === 1) return candidates[0] ?? null;
  const preferred = candidates.filter((candidate) => PREFERRED_APP_FOLDERS.includes(basename(candidate.path).toLowerCase()));
  return preferred.length === 1 ? preferred[0] ?? null : null;
}

export function suggestValidationStartCommand(
  manifest: PackageManifest | null,
  packageManager: ResolvedPackageManager | null,
  workspacePackages: WorkspacePackage[],
): RepoSuggestion | null {
  const flags = `${scriptArgumentSeparator(packageManager)} ${VITE_VALIDATION_FLAGS}`;
  const rootScript = viteDevScript(manifest);
  if (rootScript) return { value: `${scriptRunner(packageManager)} ${rootScript}${flags}`, source: "viteScript" };
  const workspace = pickViteWorkspace(workspacePackages);
  if (!workspace) return null;
  const command = `cd ${workspace.path}${CHANGE_DIRECTORY_JOINER}${scriptRunner(packageManager)} ${workspace.script}${flags}`;
  return { value: command, source: "viteScript" };
}

export function suggestGithubAccount(githubOwner: string | null, githubLogins: string[]): RepoSuggestion | null {
  if (!githubOwner) return null;
  const owner = githubOwner.toLowerCase();
  const login = githubLogins.find((candidate) => candidate.trim().toLowerCase() === owner);
  return login ? { value: login, source: "remoteOwner" } : null;
}

export function buildRepoInspection(facts: RepoFacts): RepoInspectionResult {
  const label = suggestLabel(facts.repoPath, facts.manifest);
  if (!facts.isGitRepo) {
    return {
      repoPath: facts.repoPath,
      isGitRepo: false,
      label,
      group: null,
      baseBranch: null,
      vcsProvider: null,
      runScript: null,
      validationStartCommand: null,
      githubAccount: null,
      composeFile: null,
    };
  }
  return {
    repoPath: facts.repoPath,
    isGitRepo: true,
    label,
    group: suggestGroup(facts.repoPath, facts.knownGroups),
    baseBranch: suggestBaseBranch(facts.remoteHead, facts.currentBranch),
    vcsProvider: suggestVcsProvider(facts.remoteUrl, facts.remoteSshHostname),
    runScript: suggestRunScript(facts.manifest, facts.packageManager),
    validationStartCommand: suggestValidationStartCommand(facts.manifest, facts.packageManager, facts.workspacePackages),
    githubAccount: suggestGithubAccount(facts.githubOwner, facts.githubLogins),
    composeFile: facts.composeFile,
  };
}
