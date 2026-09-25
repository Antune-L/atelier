import { basename, dirname } from "node:path";
import { z } from "zod";

import type { VcsProvider } from "../../shared/constants.ts";
import type { RepoInspection } from "../../shared/schemas.ts";

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
const DEFAULT_SCRIPT_RUNNER = "npm run";

const PROVIDER_HOST_MARKERS: { provider: VcsProvider; markers: string[] }[] = [
  { provider: "github", markers: ["github.com"] },
  { provider: "azureDevops", markers: ["dev.azure.com", "visualstudio.com"] },
];

/** Lockfiles in detection priority order, each mapped to the command prefix that runs a package script. */
const LOCKFILE_RUNNERS = [
  { file: "bun.lock", runner: "bun run" },
  { file: "bun.lockb", runner: "bun run" },
  { file: "pnpm-lock.yaml", runner: "pnpm" },
  { file: "yarn.lock", runner: "yarn" },
  { file: "package-lock.json", runner: "npm run" },
] as const;

export const LOCKFILE_NAMES: readonly string[] = LOCKFILE_RUNNERS.map((entry) => entry.file);

const packageManifestSchema = z.object({
  name: z.string().optional().catch(undefined),
  scripts: z.record(z.string(), z.unknown()).optional().catch(undefined),
});
export type PackageManifest = z.infer<typeof packageManifestSchema>;

export interface RepoFacts {
  repoPath: string;
  isGitRepo: boolean;
  manifest: PackageManifest | null;
  lockfile: string | null;
  remoteHead: string | null;
  currentBranch: string | null;
  remoteUrl: string | null;
  /** Real hostname behind an SSH host alias of the origin URL (`ssh -G`), when one was resolved. */
  remoteSshHostname: string | null;
  knownGroups: string[];
}

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

export function suggestLabel(repoPath: string, manifest: PackageManifest | null): RepoSuggestion | null {
  const manifestLabel = manifest?.name ? formatProjectLabel(manifest.name) : null;
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

export function suggestRunScript(manifest: PackageManifest | null, lockfile: string | null): RepoSuggestion | null {
  const scripts = manifest?.scripts;
  if (!scripts) return null;
  const script = RUN_SCRIPT_CANDIDATES.find((name) => Object.hasOwn(scripts, name));
  if (!script) return null;
  const runner = LOCKFILE_RUNNERS.find((entry) => entry.file === lockfile)?.runner ?? DEFAULT_SCRIPT_RUNNER;
  return { value: `${runner} ${script}`, source: "lockfile" };
}

export function buildRepoInspection(facts: RepoFacts): RepoInspectionResult {
  const label = suggestLabel(facts.repoPath, facts.manifest);
  if (!facts.isGitRepo) {
    return { repoPath: facts.repoPath, isGitRepo: false, label, group: null, baseBranch: null, vcsProvider: null, runScript: null };
  }
  return {
    repoPath: facts.repoPath,
    isGitRepo: true,
    label,
    group: suggestGroup(facts.repoPath, facts.knownGroups),
    baseBranch: suggestBaseBranch(facts.remoteHead, facts.currentBranch),
    vcsProvider: suggestVcsProvider(facts.remoteUrl, facts.remoteSshHostname),
    runScript: suggestRunScript(facts.manifest, facts.lockfile),
  };
}
