/**
 * Pure parser turning a git `origin` remote URL into the `--org/--project/--repository` triple the
 * `az repos` CLI needs. Kept side-effect free so it can be unit-tested without spawning anything.
 */

const AZURE_HOST = "dev.azure.com";
const AZURE_SSH_HOST = "ssh.dev.azure.com";
const LEGACY_HOST_SUFFIX = ".visualstudio.com";
const LEGACY_SSH_HOST = "vs-ssh.visualstudio.com";
const LEGACY_COLLECTION_SEGMENT = "DefaultCollection";
const GIT_SEGMENT = "_git";
const SSH_VERSION_SEGMENT = "v3";
const GIT_SUFFIX = ".git";

/** `[user@]host:path` (git's SCP-like syntax); the lookahead keeps `https://…` out. */
const SCP_LIKE_RE = /^(?:[^@/]+@)?([^@/:]+):(?!\/\/)(.+)$/;

export interface AzureRepoRef {
  /** Organisation URL accepted by `az repos --org`, always normalised to dev.azure.com. */
  orgUrl: string;
  project: string;
  repository: string;
}

interface RemoteLocation {
  host: string;
  segments: string[];
}

export function parseAzureRepoRef(remoteUrl: string): AzureRepoRef | null {
  const location = parseRemoteLocation(remoteUrl);
  if (location === null) return null;
  const { host, segments } = location;
  if (host === AZURE_SSH_HOST || host === LEGACY_SSH_HOST) return fromSshSegments(segments);
  if (host === AZURE_HOST) return fromAzureSegments(segments);
  if (host.endsWith(LEGACY_HOST_SUFFIX)) {
    return fromLegacySegments(host.slice(0, -LEGACY_HOST_SUFFIX.length), segments);
  }
  return null;
}

function parseRemoteLocation(remoteUrl: string): RemoteLocation | null {
  const trimmed = remoteUrl.trim();
  if (trimmed === "") return null;
  const scp = SCP_LIKE_RE.exec(trimmed);
  if (scp !== null) {
    const [, host, path] = scp;
    if (host === undefined || path === undefined) return null;
    const segments = splitPath(path);
    return segments === null ? null : { host: host.toLowerCase(), segments };
  }
  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return null;
  }
  const segments = splitPath(parsed.pathname);
  return segments === null ? null : { host: parsed.hostname.toLowerCase(), segments };
}

function splitPath(path: string): string[] | null {
  try {
    return path
      .split("/")
      .filter((segment) => segment !== "")
      .map((segment) => decodeURIComponent(segment));
  } catch {
    return null;
  }
}

function fromSshSegments(segments: string[]): AzureRepoRef | null {
  if (segments[0] !== SSH_VERSION_SEGMENT) return null;
  const [, org, project, repository] = segments;
  if (org === undefined || project === undefined || repository === undefined) return null;
  return { orgUrl: azureOrgUrl(org), project, repository: stripGitSuffix(repository) };
}

function fromAzureSegments(segments: string[]): AzureRepoRef | null {
  const [org] = segments;
  if (org === undefined) return null;
  const collection = fromCollectionSegments(segments.slice(1));
  if (collection === null) return null;
  return { orgUrl: azureOrgUrl(org), ...collection };
}

function fromLegacySegments(org: string, segments: string[]): AzureRepoRef | null {
  if (org === "") return null;
  const rest = segments[0] === LEGACY_COLLECTION_SEGMENT ? segments.slice(1) : segments;
  const collection = fromCollectionSegments(rest);
  if (collection === null) return null;
  return { orgUrl: azureOrgUrl(org), ...collection };
}

/** `[project, _git, repo]`, or `[_git, repo]` when the project name equals the repository name. */
function fromCollectionSegments(segments: string[]): { project: string; repository: string } | null {
  const gitIndex = segments.indexOf(GIT_SEGMENT);
  if (gitIndex < 0) return null;
  const rawRepository = segments[gitIndex + 1];
  if (rawRepository === undefined || rawRepository === "") return null;
  const repository = stripGitSuffix(rawRepository);
  if (repository === "") return null;
  if (gitIndex === 0) return { project: repository, repository };
  if (gitIndex !== 1) return null;
  const project = segments[0];
  if (project === undefined || project === "") return null;
  return { project, repository };
}

function azureOrgUrl(org: string): string {
  return `https://${AZURE_HOST}/${org}`;
}

function stripGitSuffix(name: string): string {
  return name.endsWith(GIT_SUFFIX) ? name.slice(0, -GIT_SUFFIX.length) : name;
}
