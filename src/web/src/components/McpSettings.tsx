import { Copy, Loader2, RotateCw } from "lucide-react";
import { useEffect, useState } from "react";

import type { McpSettingsMetadata } from "../../../../desktop/mcpRpc.ts";

import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm";
import { Input, Label } from "@/components/ui/input";
import { SectionHeader } from "@/components/ui/settings";
import { errorMessage } from "@/lib/errors";
import { getMcpSettingsClient } from "@/lib/mcpSettings";
import { boardStore } from "@/lib/store";

const DESKTOP_ONLY_MESSAGE =
  "La gestion du jeton MCP est disponible dans l’application desktop Atelier.";

export function McpSettings() {
  const mcpClient = getMcpSettingsClient();
  const [settings, setSettings] = useState<McpSettingsMetadata | null>(null);
  const [loading, setLoading] = useState(mcpClient !== null);
  const [copyingToken, setCopyingToken] = useState(false);
  const [confirmRegeneration, setConfirmRegeneration] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (mcpClient === null) return;
    let active = true;
    void mcpClient
      .getSettings()
      .then((metadata) => {
        if (active) setSettings(metadata);
      })
      .catch((cause) => {
        if (active) setError(errorMessage(cause, "Impossible de charger les réglages MCP"));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [mcpClient]);

  const copyEndpoint = async (): Promise<void> => {
    if (settings === null) return;
    setError(null);
    try {
      await navigator.clipboard.writeText(settings.endpointUrl);
      boardStore.notify("Adresse MCP copiée", settings.endpointUrl);
    } catch (cause) {
      setError(errorMessage(cause, "Impossible de copier l’adresse MCP"));
    }
  };

  const copyToken = async (): Promise<void> => {
    if (mcpClient === null) return;
    setCopyingToken(true);
    setError(null);
    try {
      await mcpClient.copyToken();
      boardStore.notify("Jeton MCP copié", "Le jeton est prêt à être collé dans le client MCP.");
    } catch (cause) {
      setError(errorMessage(cause, "Impossible de copier le jeton MCP"));
    } finally {
      setCopyingToken(false);
    }
  };

  const regenerateToken = async (): Promise<void> => {
    if (mcpClient === null) return;
    setRegenerating(true);
    setError(null);
    try {
      const metadata = await mcpClient.regenerateToken();
      setSettings(metadata);
      setConfirmRegeneration(false);
      boardStore.notify(
        "Jeton MCP régénéré",
        "Les clients existants doivent maintenant utiliser le nouveau jeton.",
      );
    } catch (cause) {
      setError(errorMessage(cause, "Impossible de régénérer le jeton MCP"));
      throw cause;
    } finally {
      setRegenerating(false);
    }
  };

  const header = (
    <SectionHeader title="MCP" subtitle="Connexion des agents externes au tableau Atelier." />
  );

  if (mcpClient === null) {
    return (
      <div className="space-y-4">
        {header}
        <div className="rounded-md border p-3">
          <p className="text-sm text-muted-foreground">{DESKTOP_ONLY_MESSAGE}</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-4">
        {header}
        <div
          className="flex items-center gap-2 rounded-md border p-3 text-sm text-muted-foreground"
          role="status"
        >
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          Chargement des réglages MCP…
        </div>
      </div>
    );
  }

  if (settings === null) {
    return (
      <div className="space-y-4">
        {header}
        {error !== null && (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {header}
      <div className="space-y-4 rounded-md border p-3">
        <div className="space-y-1.5">
          <Label htmlFor="mcp-endpoint">Adresse de connexion</Label>
          <p className="text-xs text-muted-foreground">
            À renseigner dans le client MCP de l’agent.
          </p>
          <div className="flex gap-2">
            <Input
              id="mcp-endpoint"
              value={settings.endpointUrl}
              readOnly
              className="min-w-0 font-mono"
            />
            <Button
              variant="outline"
              size="sm"
              className="shrink-0"
              onClick={() => void copyEndpoint()}
            >
              <Copy className="h-4 w-4" aria-hidden />
              Copier l’adresse
            </Button>
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="mcp-token">Jeton d’accès</Label>
          <p className="text-xs text-muted-foreground">
            Le jeton reste masqué dans Atelier et est copié par l’application desktop.
          </p>
          <div className="flex gap-2">
            <Input id="mcp-token" value={settings.maskedToken} readOnly className="min-w-0 font-mono" />
            <Button
              variant="outline"
              size="sm"
              className="shrink-0"
              disabled={!settings.canCopyToken || copyingToken || regenerating}
              onClick={() => void copyToken()}
            >
              {copyingToken ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              ) : (
                <Copy className="h-4 w-4" aria-hidden />
              )}
              Copier le jeton
            </Button>
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-3">
          <div>
            <p className="text-sm font-medium">Régénération</p>
            <p className="text-xs text-muted-foreground">
              {settings.regenerationUnavailableReason ??
                "Crée un nouveau jeton et déconnecte immédiatement les clients existants."}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            disabled={!settings.canRegenerateToken || regenerating || copyingToken}
            onClick={() => setConfirmRegeneration(true)}
          >
            <RotateCw className="h-4 w-4" aria-hidden />
            Régénérer le jeton
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Source du jeton : {settings.tokenSource === "managed" ? "géré par Atelier" : "variable d’environnement"}.
        </p>
      </div>
      {error !== null && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
      <ConfirmDialog
        open={confirmRegeneration}
        onCancel={() => setConfirmRegeneration(false)}
        title="Régénérer le jeton MCP ?"
        description="Le jeton actuel cessera immédiatement de fonctionner. Tous les clients MCP déjà configurés seront déconnectés et devront recevoir le nouveau jeton."
        confirmLabel="Régénérer"
        destructive
        busy={regenerating}
        onConfirm={regenerateToken}
      />
    </div>
  );
}
