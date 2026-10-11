/**
 * Pure validation of a user-supplied clone source. The raw string never reaches `git`: only a
 * validated owner/repo pair survives, from which the HTTPS URL and the target folder are rebuilt.
 */

import { GITHUB_LOGIN_PATTERN, MACHINE_ACCOUNT_SEGMENT } from "../../../shared/github.ts";

import { parseGithubRemote } from "./remote.ts";

const GITHUB_HOST = "github.com";
const REPOSITORY_NAME_PATTERN = /^[A-Za-z0-9._-]{1,100}$/;
const OWNER_REPO_SHORTHAND_PATTERN = /^([^/]+)\/([^/]+)$/;
const GITHUB_HTTPS_PREFIX = /^https:\/\/github\.com\//i;
const OTHER_HOST_MESSAGE = "Seuls les dépôts github.com peuvent être clonés ici : pour Azure DevOps, GitHub Enterprise ou un autre hôte, clone le dépôt toi-même puis utilise le mode « Dossier local ».";
const INVALID_SOURCE_MESSAGE = "Lien git invalide : utilise git@github.com:owner/repo.git, https://github.com/owner/repo ou owner/repo.";

export type CloneSource =
  | { ok: true; owner: string; repo: string; cloneUrl: string; relativePath: string }
  | { ok: false; reason: string };

function refuse(reason: string): CloneSource {
  return { ok: false, reason };
}

/** Owner/repo named by the source, or a refusal; no host other than github.com passes. */
function extractOwnerRepo(source: string): { owner: string; repo: string } | { reason: string } {
  const shorthand = OWNER_REPO_SHORTHAND_PATTERN.exec(source);
  if (shorthand && !source.includes(":")) {
    return { owner: shorthand[1] ?? "", repo: (shorthand[2] ?? "").replace(/\.git$/, "") };
  }
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(source)) {
    let url: URL;
    try {
      url = new URL(source);
    } catch {
      return { reason: INVALID_SOURCE_MESSAGE };
    }
    if (url.protocol !== "https:" && url.protocol !== "ssh:") return { reason: INVALID_SOURCE_MESSAGE };
    if (url.protocol === "https:" && (url.username || url.password || source.slice(8).split("/")[0]?.includes("@"))) {
      return { reason: "Le lien ne doit pas contenir d'identifiants." };
    }
    if (url.search || url.hash || source.includes("?") || source.includes("#")) return { reason: INVALID_SOURCE_MESSAGE };
    if (url.hostname.toLowerCase() !== GITHUB_HOST) return { reason: OTHER_HOST_MESSAGE };
    if (url.port) return { reason: INVALID_SOURCE_MESSAGE };
    if (url.protocol === "https:" && !GITHUB_HTTPS_PREFIX.test(source)) return { reason: INVALID_SOURCE_MESSAGE };
  }
  const scpHost = /^(?:[^@/]+@)?([^@/:]+):(?!\/\/)/.exec(source)?.[1];
  if (scpHost !== undefined && !source.includes("://") && scpHost.toLowerCase() !== GITHUB_HOST) return { reason: OTHER_HOST_MESSAGE };
  const ref = parseGithubRemote(source.replace(/\/+$/, ""));
  if (ref === null) return { reason: INVALID_SOURCE_MESSAGE };
  if (ref.host !== GITHUB_HOST) return { reason: OTHER_HOST_MESSAGE };
  // scp form: only the conventional `git@` user is accepted.
  if (!/^[a-z][a-z0-9+.-]*:\/\//i.test(source) && !/^git@github\.com:/i.test(source)) return { reason: INVALID_SOURCE_MESSAGE };
  return { owner: ref.owner, repo: ref.repository };
}

export function parseCloneSource(input: string, account: string | null): CloneSource {
  const source = input.trim();
  if (source.length === 0) return refuse(INVALID_SOURCE_MESSAGE);
  if (source.startsWith("-")) return refuse("Le lien ne peut pas commencer par « - ».");
  if (/\s/.test(source)) return refuse("Le lien ne doit pas contenir d'espaces.");
  const lower = source.toLowerCase();
  if (lower.includes("ext::") || lower.includes("file://") || lower.includes("file:")) {
    return refuse("Ce type de lien git est interdit.");
  }
  if (account !== null && !GITHUB_LOGIN_PATTERN.test(account)) return refuse("Compte GitHub invalide.");
  const extracted = extractOwnerRepo(source);
  if ("reason" in extracted) return refuse(extracted.reason);
  const { owner, repo } = extracted;
  if (owner === "." || owner === ".." || repo === "." || repo === "..") return refuse("Les segments « . » et « .. » sont interdits.");
  if (!GITHUB_LOGIN_PATTERN.test(owner)) return refuse(`Propriétaire GitHub invalide : ${owner}.`);
  if (!REPOSITORY_NAME_PATTERN.test(repo)) return refuse(`Nom de dépôt invalide : ${repo}.`);
  const accountSegment = account === null ? MACHINE_ACCOUNT_SEGMENT : account.toLowerCase();
  return {
    ok: true,
    owner,
    repo,
    cloneUrl: `https://github.com/${owner}/${repo}.git`,
    relativePath: `${accountSegment}/${owner.toLowerCase()}/${repo.toLowerCase()}`,
  };
}
