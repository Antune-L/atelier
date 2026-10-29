import { Loader2 } from "lucide-react";
import { useState, type FormEvent, type ReactNode } from "react";

import type { ClaudeLoginStatus } from "@shared/claudeLogin";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { OAUTH_TOKEN_ENV_WARNING } from "@/lib/usageDisplay";

interface ClaudeLoginPanelProps {
  status: ClaudeLoginStatus | null;
  pending: boolean;
  error: string | null;
  onStart: () => void;
  onSubmit: (code: string) => void;
  onCancel: () => void;
}

/** « Connecter Claude »: runs `claude auth login` on the server, shows its URL and pipes back the pasted code. */
export function ClaudeLoginPanel({ status, pending, error, onStart, onSubmit, onCancel }: ClaudeLoginPanelProps): ReactNode {
  const [code, setCode] = useState("");
  const state = status?.state ?? "idle";

  const submit = (event: FormEvent): void => {
    event.preventDefault();
    const trimmed = code.trim();
    if (trimmed.length === 0) return;
    onSubmit(trimmed);
    setCode("");
  };

  const renderBody = (): ReactNode => {
    switch (state) {
      case "idle":
        return <Button size="sm" onClick={onStart} disabled={pending}>Connecter Claude</Button>;
      case "starting":
      case "submitting":
        return (
          <div className="flex items-center gap-2">
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
            <Button size="sm" variant="outline" onClick={onCancel} disabled={pending}>Annuler</Button>
          </div>
        );
      case "awaiting_code":
        return (
          <form className="flex flex-col gap-2" onSubmit={submit}>
            {status?.url && (
              <a href={status.url} target="_blank" rel="noreferrer noopener" className="break-all text-sm text-info underline">
                Ouvrir la page d'autorisation Claude
              </a>
            )}
            <div className="flex flex-wrap gap-2">
              <Input
                value={code}
                onChange={(event) => setCode(event.target.value)}
                placeholder="Code d'autorisation"
                aria-label="Code d'autorisation Claude"
                autoComplete="off"
                className="min-w-48 flex-1"
              />
              <Button size="sm" type="submit" disabled={pending || code.trim().length === 0}>Valider</Button>
              <Button size="sm" type="button" variant="outline" onClick={onCancel} disabled={pending}>Annuler</Button>
            </div>
          </form>
        );
      case "success":
        return status?.restartRequired ? <p className="text-sm font-medium text-warning">Redémarrage requis</p> : null;
      case "failed":
      case "expired":
      case "cancelled":
        return <Button size="sm" variant="outline" onClick={onStart} disabled={pending}>Réessayer</Button>;
    }
  };

  const failed = state === "failed" || state === "expired";
  return (
    <div className="flex flex-col gap-2 rounded-md border p-3">
      {status?.oauthTokenEnvSet && <p className="text-xs text-warning">{OAUTH_TOKEN_ENV_WARNING}</p>}
      {status?.message && state !== "idle" && (
        <p role={failed ? "alert" : undefined} className={failed ? "text-sm text-danger" : "text-sm text-muted-foreground"}>
          {status.message}
        </p>
      )}
      {error !== null && <p role="alert" className="text-sm text-danger">{error}</p>}
      {renderBody()}
    </div>
  );
}
