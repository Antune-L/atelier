import { Copy, Loader2, RotateCw } from "lucide-react";
import { useEffect, useState } from "react";

import type { McpSettingsMetadata } from "../../../../desktop/mcpRpc.ts";

import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm";
import { Input, Label } from "@/components/ui/input";
import { SectionHeader } from "@/components/ui/settings";
import { Tabs } from "@/components/ui/tabs";
import type { TabOption } from "@/components/ui/tabs";
import { errorMessage } from "@/lib/errors";
import { getMcpSettingsClient } from "@/lib/mcpSettings";
import { boardStore } from "@/lib/store";

const DESKTOP_ONLY_MESSAGE =
  "La gestion du jeton MCP est disponible dans l’application desktop Atelier.";

type McpClientKind = "manual" | "claude" | "codex";
const MCP_CLIENT_OPTIONS: TabOption<McpClientKind>[] = [
  { value: "manual", label: "Autre client" },
  { value: "claude", label: "Claude Code" },
  { value: "codex", label: "Codex" },
];
const MCP_TOKEN_ENVIRONMENT_NAME = "KANBAN_MCP_TOKEN";

function clientConfiguration(client: McpClientKind, endpointUrl: string): string {
  if (client === "codex") {
    return `[mcp_servers.atelier]\nurl = ${JSON.stringify(endpointUrl)}\nbearer_token_env_var = "${MCP_TOKEN_ENVIRONMENT_NAME}"`;
  }
  return JSON.stringify({
    mcpServers: {
      atelier: {
        type: "http",
        url: endpointUrl,
        headers: { Authorization: `Bearer \${${MCP_TOKEN_ENVIRONMENT_NAME}}` },
      },
    },
  }, null, 2);
}

export function McpSettings({ query = "" }: { query?: string }) {
  const mcpClient = getMcpSettingsClient();
  const [clientKind, setClientKind] = useState<McpClientKind>("manual");
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

  const copyConfiguration = async (): Promise<void> => {
    if (settings === null) return;
    setError(null);
    try {
      await navigator.clipboard.writeText(clientConfiguration(clientKind, settings.endpointUrl));
      boardStore.notify("Configuration MCP copiée", "Le modèle de configuration ne contient pas le jeton d'accès.");
    } catch (cause) {
      setError(errorMessage(cause, "Impossible de copier la configuration MCP"));
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
    <SectionHeader
      title="Connecter un outil"
      subtitle="MCP (protocole de connexion des outils) permet à un client externe d'accéder au tableau Atelier."
    />
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
      <div className="space-y-4 rounded-lg border p-4">
        <div className="space-y-2">
          <Label>Votre client</Label>
          <Tabs options={MCP_CLIENT_OPTIONS} value={clientKind} onChange={setClientKind} aria-label="Client MCP" />
          <p className="text-xs text-muted-foreground">Ajoutez Atelier comme serveur MCP distant. Le jeton Bearer est le secret qui autorise l'accès.</p>
        </div>
        {clientKind !== "manual" && (
          <div className="space-y-3 rounded-md border p-3">
            <p className="text-sm font-medium">Configuration {clientKind === "claude" ? "Claude Code" : "Codex"}</p>
            <p className="text-xs text-muted-foreground">Ajoutez ce serveur à votre configuration MCP. Placez le jeton copié dans la variable {MCP_TOKEN_ENVIRONMENT_NAME}, accessible au client avant son lancement.</p>
            <Button variant="outline" size="sm" onClick={() => void copyConfiguration()}>
              <Copy className="h-4 w-4" aria-hidden />Copier la configuration sans jeton</Button>
            <details open={query !== "" || undefined}>
              <summary className="cursor-pointer text-xs text-muted-foreground">Voir la configuration</summary>
              <pre className="mt-2 overflow-x-auto rounded bg-muted/30 p-3 text-xs">{clientConfiguration(clientKind, settings.endpointUrl)}</pre>
            </details>
          </div>
        )}
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-md bg-muted/30 p-3">
          <div>
            <p className="text-sm font-medium">1. Adresse du serveur</p>
            <p className="text-xs text-muted-foreground">Collez-la dans la connexion MCP de votre outil.</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => void copyEndpoint()}>
            <Copy className="h-4 w-4" aria-hidden />Copier l’adresse</Button>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-md bg-muted/30 p-3">
          <div>
            <p className="text-sm font-medium">2. Jeton d'accès</p>
            <p className="text-xs text-muted-foreground">Le secret reste masqué dans Atelier.</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            disabled={!settings.canCopyToken || copyingToken || regenerating}
            onClick={() => void copyToken()}
          >{copyingToken ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Copy className="h-4 w-4" aria-hidden />}Copier le jeton</Button>
        </div>
        <p className="text-xs text-muted-foreground">La copie prépare la configuration. Vérifiez ensuite la connexion depuis votre client.</p>
      </div>
      <details className="rounded-lg border p-4" open={query !== "" || undefined}>
        <summary className="cursor-pointer text-sm font-medium">Connexion manuelle et maintenance</summary>
        <div className="mt-4 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="mcp-endpoint">Adresse de connexion</Label>
            <Input id="mcp-endpoint" value={settings.endpointUrl} readOnly className="font-mono" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="mcp-token">Jeton d’accès masqué</Label>
            <Input id="mcp-token" value={settings.maskedToken} readOnly className="font-mono" />
          </div>
          <div className="rounded-md border p-3">
            <p className="text-sm font-medium">Renouveler le jeton d’accès</p>
            <p className="mt-1 text-xs text-muted-foreground">{settings.regenerationUnavailableReason ?? "Crée un nouveau jeton et déconnecte immédiatement les clients existants."}</p>
            <Button
              variant="outline"
              size="sm"
              className="mt-3"
              disabled={!settings.canRegenerateToken || regenerating || copyingToken}
              onClick={() => setConfirmRegeneration(true)}
            >
              <RotateCw className="h-4 w-4" aria-hidden />Renouveler le jeton d'accès</Button>
          </div>
          <p className="text-xs text-muted-foreground">Source du jeton : {settings.tokenSource === "managed" ? "géré par Atelier" : "variable d’environnement"}.</p>
        </div>
      </details>
      {error !== null && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
      <ConfirmDialog
        open={confirmRegeneration}
        onCancel={() => setConfirmRegeneration(false)}
        title="Renouveler le jeton MCP ?"
        description="Le jeton actuel cessera immédiatement de fonctionner. Tous les clients MCP déjà configurés seront déconnectés et devront recevoir le nouveau jeton."
        confirmLabel="Renouveler"
        destructive
        busy={regenerating}
        onConfirm={regenerateToken}
      />
    </div>
  );
}
