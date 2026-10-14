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
export function GithubAccountsSettings({ query = "" }: { query?: string }) {
  const { accounts, loading, error: loadError, refresh } = useGithubAccounts();
  const [token, setToken] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [dismissedQuery, setDismissedQuery] = useState("");
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
      setShowAdd(false);
      setDismissedQuery(query);
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

  const addVisible = showAdd || (query !== "" && dismissedQuery !== query);

  return (
    <div className="space-y-4">
      <SectionHeader title="Comptes GitHub" subtitle="Choisissez l'identité utilisée par chaque projet." />
      <div className="space-y-3 rounded-lg border p-4">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-semibold">{accounts.length} compte(s) enregistré(s)</p>
          <Button variant="outline" size="sm" disabled={loading} onClick={() => void refresh()}>Revérifier</Button>
        </div>
        {loading && accounts.length === 0 && <p className="flex items-center gap-2 text-sm text-muted-foreground" role="status">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />Vérification des comptes…</p>}
        {!loading && accounts.length === 0 && <p className="text-sm text-muted-foreground">Aucun compte enregistré. Les projets utilisent le compte GitHub par défaut de la machine.</p>}
        {accounts.map((account) => (
          <div key={account.login} className="flex flex-wrap items-center justify-between gap-3 rounded-md border p-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span
                  className={cn("h-2 w-2 rounded-full", account.status === "valid" ? "bg-success" : "bg-warning")}
                  aria-hidden
                />
                <span className="text-sm font-medium">{account.login}</span>
                <span className="text-xs text-muted-foreground">{account.status === "valid" ? "Accès confirmé" : "À reconnecter"}</span>
              </div>
              {account.reason !== null && <p className="mt-1 text-xs text-destructive">{account.reason}</p>}
              <p className="mt-1 text-xs text-muted-foreground">{account.projects.length > 0 ? `Projets : ${account.projects.join(", ")}` : "Aucun projet rattaché"}</p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => void remove(account.login)}
              disabled={removing !== null}
              aria-label={`Retirer le compte ${account.login}`}
            >
              {removing === account.login ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Trash2 className="h-4 w-4" aria-hidden />}Retirer
            </Button>
          </div>
        ))}
        <p className="text-xs text-muted-foreground">Le choix du compte se règle dans chaque projet. Sans compte dédié, le compte gh (outil GitHub en terminal) de la machine est utilisé.</p>
      </div>
      {added !== null && <p className="text-xs text-success" role="status">Compte « {added} » enregistré.</p>}
      {!addVisible && <Button size="sm" onClick={() => setShowAdd(true)}>
        <Plus className="h-4 w-4" aria-hidden />Connecter un compte GitHub</Button>}
      {addVisible && (
        <div className="space-y-3 rounded-lg border bg-muted/20 p-4">
          <div className="flex items-center justify-between gap-3">
            <h4 className="text-sm font-semibold">Connecter un compte GitHub</h4>
            <Button
              variant="ghost"
              size="sm"
              disabled={adding}
              onClick={() => { setShowAdd(false); setDismissedQuery(query); setToken(""); }}
            >Annuler</Button>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={TOKEN_INPUT_ID}>Jeton d’accès</Label>
            <Input
              id={TOKEN_INPUT_ID}
              type="password"
              autoComplete="off"
              spellCheck={false}
              value={token}
              onChange={(event) => setToken(event.target.value)}
              onKeyDown={(event) => { if (event.key !== "Enter") return; event.preventDefault(); void add(); }}
              placeholder="Coller un jeton GitHub"
              className="min-w-0 font-mono"
              disabled={adding}
            />
          </div>
          <details open={query !== "" || undefined}>
            <summary className="cursor-pointer text-xs font-medium text-muted-foreground">Permissions du jeton et stockage</summary>
            <div className="mt-2 space-y-2 text-xs text-muted-foreground">
              <p>Jeton classique : permissions repo et read:org. Jeton à permissions fines : Contents et Pull requests en écriture, Metadata en lecture. Pour une organisation avec SSO (connexion unique), autorisez le jeton pour cette organisation.</p>
              <p>Les jetons sont stockés sur le serveur et lisibles par tous les agents. Le compte choisit l'identité du projet ; il ne constitue pas une barrière de sécurité.</p>
            </div>
          </details>
          <Button size="sm" onClick={() => void add()} disabled={adding || token.trim() === ""}>{adding ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Plus className="h-4 w-4" aria-hidden />}Connecter le compte</Button>
        </div>
      )}
      {(error ?? loadError) !== null && <p className="text-sm text-destructive" role="alert">{error ?? loadError}</p>}
    </div>
  );
}
