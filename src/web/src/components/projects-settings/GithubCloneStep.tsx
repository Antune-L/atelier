import { Loader2, Lock } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

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
const AZURE_HOST_MARKERS = ["dev.azure.com", "visualstudio.com"];
const UNRECOGNIZED_LINK_MESSAGE = "Lien non reconnu : seuls les dépôts github.com sont clonés ici (sinon, utilisez « Dossier local »).";
const AZURE_LINK_MESSAGE = "Dépôt Azure DevOps : clonez-le sur cette machine, puis choisissez son dossier dans « Dossier local ».";

function isAzureLink(source: string): boolean {
  const lowered = source.toLowerCase();
  return AZURE_HOST_MARKERS.some((marker) => lowered.includes(marker));
}

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
  const cloneButtonRef = useRef<HTMLButtonElement>(null);

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
    <div className="flex flex-col gap-4">
      <Field label="Compte GitHub">
        <Select
          value={account ?? MACHINE_ACCOUNT_VALUE}
          onChange={(event) => {
            setSelected(null);
            setAccount(event.target.value === MACHINE_ACCOUNT_VALUE ? null : event.target.value);
          }}
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
      <Field label="Choisir un dépôt">
        <div className="flex w-full flex-col gap-2">
          <Input
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
            placeholder="Rechercher un dépôt…"
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
              <p className="p-3 text-xs text-muted-foreground">
                {repos.length === 0 ? "Aucun dépôt disponible pour ce compte." : "Aucun dépôt ne correspond à votre recherche."}
              </p>
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
                    requestAnimationFrame(() => cloneButtonRef.current?.focus());
                  }}
                  className={cn(
                    "flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm hover:bg-muted disabled:opacity-60",
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
      <div className="flex flex-col gap-3 rounded-md border bg-muted/30 p-3">
        <div aria-live="polite" className="min-w-0 text-sm">
          {source === null ? (
            <p className="text-muted-foreground">Sélectionnez un dépôt pour continuer.</p>
          ) : (
            <>
              <p className="text-xs text-muted-foreground">Dépôt à cloner</p>
              <p className="mt-1 break-all font-medium">{source}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {plannedUrl !== null && <>Clone HTTPS : <code className="break-all">{plannedUrl}</code></>}
                {plannedUrl === null && (isAzureLink(source) ? AZURE_LINK_MESSAGE : UNRECOGNIZED_LINK_MESSAGE)}
              </p>
            </>
          )}
        </div>
        <Button ref={cloneButtonRef} onClick={() => { if (source !== null) void clone(source); }} disabled={locked || source === null} className="self-start">
          {cloning && <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />}
          Cloner ce dépôt
        </Button>
      </div>
      <details className="rounded-md border p-3">
        <summary className="cursor-pointer text-xs font-medium">Utiliser un lien GitHub</summary>
        <div className="mt-3 flex flex-col gap-2">
          <p className="text-xs text-muted-foreground">Pour un dépôt absent de la liste, collez son adresse puis confirmez le clonage.</p>
          <Field label="Lien git">
            <Input
              value={link}
              onChange={(event) => {
                setLink(event.target.value);
                if (event.target.value.trim() !== "") setSelected(null);
              }}
              onKeyDown={(event) => {
                if (event.key !== "Enter" || link.trim() === "") return;
                event.preventDefault();
                void clone(link.trim());
              }}
              placeholder="git@github.com:owner/repo.git, https://github.com/owner/repo ou owner/repo"
              aria-label="Lien git"
              disabled={locked}
            />
          </Field>
        </div>
      </details>
      {cloning && (
        <p role="status" className="flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
          Clonage en cours… (jusqu'à {CLONE_TIMEOUT_SECONDS} s pour un gros dépôt)
        </p>
      )}
    </div>
  );
}
