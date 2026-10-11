import { Loader2, Lock } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import type { GithubRepoSummary } from "@shared/github";
import { GITHUB_CLONE_TIMEOUT_MS } from "@shared/github";

import { Field } from "@/components/projects-settings/ProjectPanelParts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useGithubAccounts } from "@/hooks/useGithubAccounts";
import { api } from "@/lib/api";
import type { CloneProjectResponse } from "@/lib/api";
import { errorMessage } from "@/lib/errors";
import { cn } from "@/lib/utils";

const MACHINE_ACCOUNT_VALUE = "";
const MACHINE_ACCOUNT_LABEL = "Compte par défaut de la machine";
const CLONE_TIMEOUT_SECONDS = GITHUB_CLONE_TIMEOUT_MS / 1000;
const SCP_LINK_PATTERN = /^git@github\.com:([^/\s]+)\/([^/\s]+?)(?:\.git)?\/?$/i;
const HTTPS_LINK_PATTERN = /^https:\/\/github\.com\/([^/\s]+)\/([^/\s]+?)(?:\.git)?\/?$/i;
const SHORTHAND_PATTERN = /^([^/\s:]+)\/([^/\s:]+?)(?:\.git)?$/;

/**
 * HTTPS URL the server will rebuild from a link, shown before cloning. Display only: the server
 * validates the source again and returns the URL it actually used.
 */
export function previewCloneUrl(source: string): string | null {
  const trimmed = source.trim();
  const match = SCP_LINK_PATTERN.exec(trimmed) ?? HTTPS_LINK_PATTERN.exec(trimmed) ?? SHORTHAND_PATTERN.exec(trimmed);
  const owner = match?.[1];
  const repo = match?.[2];
  if (!owner || !repo || owner.startsWith("-")) return null;
  return `https://github.com/${owner}/${repo}.git`;
}

function accountName(account: string | null): string {
  return account === null ? "du compte par défaut de la machine" : `du compte « ${account} »`;
}

interface GithubCloneStepProps {
  disabled: boolean;
  onCloned: (result: CloneProjectResponse, account: string | null) => void;
  onError: (message: string | null) => void;
}

/** « Depuis GitHub »: pick an account, then a repository from its list or a git link, and clone it. */
export function GithubCloneStep({ disabled, onCloned, onError }: GithubCloneStepProps) {
  const { accounts } = useGithubAccounts();
  const [account, setAccount] = useState<string | null>(null);
  const [repos, setRepos] = useState<GithubRepoSummary[]>([]);
  const [loadingRepos, setLoadingRepos] = useState(true);
  const [reposError, setReposError] = useState<string | null>(null);
  const [filter, setFilter] = useState("");
  const [link, setLink] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [cloning, setCloning] = useState(false);

  useEffect(() => {
    let active = true;
    setLoadingRepos(true);
    setReposError(null);
    setRepos([]);
    setSelected(null);
    api.githubRepos(account)
      .then((list) => {
        if (active) setRepos(list);
      })
      .catch((cause: unknown) => {
        // No partial list: the error replaces it entirely and names the account.
        if (active) setReposError(errorMessage(cause, `Liste des dépôts ${accountName(account)} indisponible`));
      })
      .finally(() => {
        if (active) setLoadingRepos(false);
      });
    return () => {
      active = false;
    };
  }, [account]);

  const visibleRepos = useMemo(() => {
    const needle = filter.trim().toLowerCase();
    return needle === "" ? repos : repos.filter((repo) => repo.fullName.toLowerCase().includes(needle));
  }, [filter, repos]);

  const source = link.trim() !== "" ? link.trim() : selected;
  const plannedUrl = source === null ? null : previewCloneUrl(source);
  const locked = disabled || cloning;

  const clone = async (target: string): Promise<void> => {
    onError(null);
    setCloning(true);
    try {
      const result = await api.cloneProject({ source: target, account });
      onCloned(result, account);
    } catch (cause) {
      onError(errorMessage(cause, "Clonage du dépôt impossible"));
    } finally {
      setCloning(false);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <Field label="Compte GitHub">
        <Select
          value={account ?? MACHINE_ACCOUNT_VALUE}
          onChange={(event) => setAccount(event.target.value === MACHINE_ACCOUNT_VALUE ? null : event.target.value)}
          aria-label="Compte GitHub"
          disabled={locked}
        >
          <option value={MACHINE_ACCOUNT_VALUE}>{MACHINE_ACCOUNT_LABEL}</option>
          {accounts.map((entry) => (
            <option key={entry.login} value={entry.login}>
              {entry.login}{entry.status === "invalid" ? " (invalide)" : ""}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Dépôts">
        <div className="flex w-full flex-col gap-2">
          <Input
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
            placeholder="Filtrer owner/dépôt"
            aria-label="Filtrer les dépôts"
            disabled={locked || reposError !== null}
          />
          <div className="max-h-56 w-full overflow-y-auto rounded-md border" role="listbox" aria-label="Dépôts GitHub">
            {loadingRepos ? (
              <p className="flex items-center gap-2 p-2 text-xs text-muted-foreground" role="status">
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                Chargement des dépôts…
              </p>
            ) : reposError !== null ? (
              <p className="p-2 text-xs text-destructive" role="alert">{reposError}</p>
            ) : visibleRepos.length === 0 ? (
              <p className="p-2 text-xs text-muted-foreground">Aucun dépôt.</p>
            ) : (
              visibleRepos.map((repo) => (
                <button
                  key={repo.fullName}
                  type="button"
                  role="option"
                  aria-selected={selected === repo.fullName && link.trim() === ""}
                  disabled={locked}
                  onClick={() => {
                    setLink("");
                    setSelected(repo.fullName);
                    void clone(repo.fullName);
                  }}
                  className={cn(
                    "flex w-full items-center gap-2 px-2 py-1.5 text-left text-sm hover:bg-muted disabled:opacity-60",
                    selected === repo.fullName && link.trim() === "" && "bg-muted",
                  )}
                >
                  <span className="truncate">{repo.fullName}</span>
                  {repo.private && <Lock className="h-3 w-3 shrink-0 text-muted-foreground" aria-label="privé" />}
                </button>
              ))
            )}
          </div>
        </div>
      </Field>
      <Field label="Lien git">
        <div className="flex w-full items-center gap-2">
          <Input
            value={link}
            onChange={(event) => setLink(event.target.value)}
            onKeyDown={(event) => {
              if (event.key !== "Enter" || link.trim() === "") return;
              event.preventDefault();
              void clone(link.trim());
            }}
            placeholder="git@github.com:owner/repo.git, https://github.com/owner/repo ou owner/repo"
            aria-label="Lien git"
            disabled={locked}
          />
          <Button variant="outline" onClick={() => void clone(link.trim())} disabled={locked || link.trim() === ""}>
            Cloner
          </Button>
        </div>
      </Field>
      {source !== null && (
        <p className="text-xs text-muted-foreground">
          {plannedUrl === null
            ? "Lien non reconnu : seuls les dépôts github.com sont clonés ici (sinon, utilise « Dossier local »)."
            : <>Clone HTTPS : <code>{plannedUrl}</code></>}
        </p>
      )}
      {cloning && (
        <p role="status" className="flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
          Clonage en cours… (jusqu'à {CLONE_TIMEOUT_SECONDS} s pour un gros dépôt)
        </p>
      )}
    </div>
  );
}
