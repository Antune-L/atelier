import { Loader2, Plus, Trash2 } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { SectionHeader } from "@/components/ui/settings";
import { useGithubAccounts } from "@/hooks/useGithubAccounts";
import { api } from "@/lib/api";
import { errorMessage } from "@/lib/errors";
import { cn } from "@/lib/utils";

const TOKEN_INPUT_ID = "github-account-token";

/** GitHub accounts a project can be attached to: add by pasted token, check status, remove. */
export function GithubAccountsSettings() {
  const { accounts, loading, error: loadError, refresh } = useGithubAccounts();
  const [token, setToken] = useState("");
  const [adding, setAdding] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [added, setAdded] = useState<string | null>(null);

  const add = async (): Promise<void> => {
    const pasted = token.trim();
    if (pasted === "") return;
    setAdding(true);
    setError(null);
    setAdded(null);
    // The token is cleared right away: it is never shown back, even after a failure.
    setToken("");
    try {
      const { login } = await api.addGithubAccount(pasted);
      setAdded(login);
      await refresh();
    } catch (cause) {
      setError(errorMessage(cause, "Ajout du compte GitHub impossible"));
    } finally {
      setAdding(false);
    }
  };

  const remove = async (login: string): Promise<void> => {
    setRemoving(login);
    setError(null);
    setAdded(null);
    try {
      await api.removeGithubAccount(login);
      await refresh();
    } catch (cause) {
      setError(errorMessage(cause, "Retrait du compte GitHub impossible"));
    } finally {
      setRemoving(null);
    }
  };

  return (
    <div className="space-y-4">
      <SectionHeader
        title="Comptes GitHub"
        subtitle="Comptes utilisables par projet. Sans compte, un projet utilise le compte gh par défaut de la machine."
      />
      <div className="space-y-3 rounded-md border p-3">
        <div className="space-y-1.5">
          <Label htmlFor={TOKEN_INPUT_ID}>Ajouter un compte</Label>
          <p className="text-xs text-muted-foreground">
            Token classique : scopes <code>repo</code> et <code>read:org</code>. Token fine-grained : Contents et Pull
            requests en écriture, Metadata en lecture. Pour une organisation sous SSO, autorise le token pour cette
            organisation.
          </p>
          <div className="flex gap-2">
            <Input
              id={TOKEN_INPUT_ID}
              type="password"
              autoComplete="off"
              spellCheck={false}
              value={token}
              onChange={(event) => setToken(event.target.value)}
              onKeyDown={(event) => {
                if (event.key !== "Enter") return;
                event.preventDefault();
                void add();
              }}
              placeholder="Coller un token GitHub"
              className="min-w-0 font-mono"
              disabled={adding}
            />
            <Button size="sm" className="shrink-0" onClick={() => void add()} disabled={adding || token.trim() === ""}>
              {adding ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Plus className="h-4 w-4" aria-hidden />}
              Ajouter
            </Button>
          </div>
          {added !== null && (
            <p className="text-xs text-success" role="status">
              Compte « {added} » enregistré.
            </p>
          )}
        </div>
        <div className="space-y-2 border-t pt-3">
          {loading && accounts.length === 0 ? (
            <p className="flex items-center gap-2 text-sm text-muted-foreground" role="status">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              Vérification des comptes…
            </p>
          ) : accounts.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucun compte enregistré.</p>
          ) : (
            accounts.map((account) => (
              <div key={account.login} className="flex flex-wrap items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span
                      className={cn("h-2 w-2 rounded-full", account.status === "valid" ? "bg-success" : "bg-warning")}
                      aria-hidden
                    />
                    <span className="text-sm font-medium">{account.login}</span>
                    <span className="text-xs text-muted-foreground">{account.status === "valid" ? "valide" : "invalide"}</span>
                  </div>
                  {account.reason !== null && <p className="text-xs text-destructive">{account.reason}</p>}
                  {account.projects.length > 0 && (
                    <p className="text-xs text-muted-foreground">Projets : {account.projects.join(", ")}</p>
                  )}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => void remove(account.login)}
                  disabled={removing !== null}
                  aria-label={`Retirer le compte ${account.login}`}
                >
                  {removing === account.login ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Trash2 className="h-4 w-4" aria-hidden />}
                  Retirer
                </Button>
              </div>
            ))
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          Les tokens sont stockés sur le serveur et lisibles par tous les agents : le compte d'un projet choisit
          l'identité utilisée, ce n'est pas une barrière de sécurité.
        </p>
      </div>
      {(error ?? loadError) !== null && (
        <p className="text-sm text-destructive" role="alert">
          {error ?? loadError}
        </p>
      )}
    </div>
  );
}
