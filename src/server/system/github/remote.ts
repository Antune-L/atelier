/**
 * The one parser of GitHub remotes (scp-like `git@host:owner/repo.git` and URL forms), shared by the
 * VCS client, the clone-source validation and the per-project account guard.
 */

import { sshHostFromRemoteUrl } from "../repoInspection.ts";

export const GITHUB_HOST = "github.com";
const GIT_REMOTE_SCP_RE = /^(?:[^@/]+@)?([^@/:]+):(?!\/\/)(.+)$/;

export interface GithubRepoRef {
  host: string;
  owner: string;
  repository: string;
}

export function parseGithubRemote(remote: string): GithubRepoRef | null {
  const trimmed = remote.trim();
  const scp = GIT_REMOTE_SCP_RE.exec(trimmed);
  let host: string;
  let path: string;
  if (scp && scp[1] && scp[2]) {
    host = scp[1].toLowerCase();
    path = scp[2];
  } else {
    try {
      const url = new URL(trimmed);
      host = url.hostname.toLowerCase();
      path = url.pathname;
    } catch {
      return null;
    }
  }
  const segments = path.replace(/^\/+/, "").replace(/\.git$/, "").split("/");
  if (segments.length !== 2 || !segments[0] || !segments[1] || host === "") return null;
  return { host, owner: segments[0], repository: segments[1] };
}

/** True for an SSH remote (`git@host:owner/repo` or `ssh://…`); HTTPS remotes return false. */
export function isSshRemote(remote: string): boolean {
  const trimmed = remote.trim();
  if (/^https?:\/\//i.test(trimmed)) return false;
  return sshHostFromRemoteUrl(trimmed) !== null;
}
