import { CheckCircle2, Cloud, Loader2, ShieldCheck } from "lucide-react";
import { useEffect, useId, useState } from "react";

import type { CoolifyInventory, PreviewSettings, UpdatePreviewSettingsInput } from "@shared/preview";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { SectionHeader, SettingsFooter } from "@/components/ui/settings";
import { useBusyAction } from "@/hooks/useBusyAction";
import { useSavedFlag } from "@/hooks/useSavedFlash";
import { errorMessage } from "@/lib/errors";
import { FIELD_LABEL_CLASSES } from "@/lib/overlayStyles";
import { previewApi } from "@/lib/previewApi";

function ResourceSelect({ label, value, items, disabled, onChange }: {
  label: string;
  value: string | null;
  items: CoolifyInventory["servers"];
  disabled: boolean;
  onChange: (value: string | null) => void;
}) {
  const id = useId();
  const selectedMissing = value !== null && !items.some((item) => item.uuid === value);
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-1.5">
      <label htmlFor={id} className={FIELD_LABEL_CLASSES}>{label}</label>
      <Select id={id} value={value ?? ""} disabled={disabled} onChange={(event) => onChange(event.target.value || null)}>
        <option value="">Sélectionner…</option>
        {selectedMissing && <option value={value}>Ressource enregistrée · à vérifier</option>}
        {items.map((item) => <option key={item.uuid} value={item.uuid}>{item.name || "Ressource sans nom"}</option>)}
      </Select>
    </div>
  );
}

function settingsInput(settings: PreviewSettings): UpdatePreviewSettingsInput {
  return {
    baseUrl: settings.baseUrl,
    serverUuid: settings.serverUuid,
    projectUuid: settings.projectUuid,
    githubAppUuid: settings.githubAppUuid,
    sshHostAlias: settings.sshHostAlias,
    environmentName: settings.environmentName,
    domainBase: settings.domainBase,
  };
}

export function CoolifySettings() {
  const [settings, setSettings] = useState<PreviewSettings | null>(null);
  const [draft, setDraft] = useState<PreviewSettings | null>(null);
  const [token, setToken] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [inventory, setInventory] = useState<CoolifyInventory | null>(null);
  const { busy, error, setError, run } = useBusyAction();
  const { saved, flashSaved } = useSavedFlag();

  useEffect(() => {
    let active = true;
    void previewApi.settings().then(({ settings: loaded }) => {
      if (!active) return;
      setSettings(loaded);
      setDraft(loaded);
    }).catch((cause: unknown) => {
      if (active) setError(errorMessage(cause, "Impossible de charger la connexion Coolify."));
    });
    return () => { active = false; };
  }, [setError]);

  const dirty = settings !== null && draft !== null && (
    JSON.stringify(settingsInput(settings)) !== JSON.stringify(settingsInput(draft)) ||
    token !== "" || username !== "" || password !== ""
  );

  async function save(testConnection: boolean) {
    if (draft === null) return;
    setInventory(null);
    await run(async () => {
      const input: UpdatePreviewSettingsInput = settingsInput(draft);
      if (token.trim()) input.token = token.trim();
      if (username.trim()) input.previewAuthUsername = username.trim();
      if (password) input.previewAuthPassword = password;
      const result = await previewApi.updateSettings(input);
      setSettings(result.settings);
      setDraft(result.settings);
      setToken("");
      setUsername("");
      setPassword("");
      flashSaved();
      if (testConnection) {
        try {
          const connection = await previewApi.testConnection();
          if (!connection.ok) throw new Error("La connexion Coolify n'a pas été confirmée.");
          setInventory(connection.inventory);
        } catch (cause) {
          throw new Error(`Paramètres enregistrés. ${errorMessage(cause, "Impossible de tester la connexion Coolify.")}`);
        }
      }
    }, "Impossible d'enregistrer la connexion Coolify.");
  }

  return (
    <div className="space-y-5">
      <SectionHeader title="Coolify" subtitle="Créez une prévisualisation temporaire et protégée à partir d'une pull request GitHub." />
      {error && <p role="alert" className="rounded-md border border-danger/40 bg-danger/10 p-3 text-sm text-danger">{error}</p>}
      {draft === null ? (
        <div className="space-y-2">
          {!error && <p className="text-sm text-muted-foreground">Chargement de la connexion…</p>}
          {error && <Button variant="outline" size="sm" disabled={busy} onClick={() => void run(async () => {
            const result = await previewApi.settings();
            setSettings(result.settings);
            setDraft(result.settings);
          }, "Impossible de charger la connexion Coolify.")}>Réessayer</Button>}
        </div>
      ) : (
        <>
          <div className="space-y-3 rounded-lg border border-border bg-muted/20 p-4">
            <div className="flex items-center gap-2 text-sm font-medium"><Cloud className="size-4 text-primary" />Connexion à votre instance</div>
            <label className="flex flex-col gap-1.5">
              <span className={FIELD_LABEL_CLASSES}>Adresse Coolify</span>
              <Input type="url" placeholder="https://coolify.example.com" value={draft.baseUrl ?? ""} onChange={(event) => { setInventory(null); setDraft({ ...draft, baseUrl: event.target.value || null }); }} disabled={busy} />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className={FIELD_LABEL_CLASSES}>Jeton API</span>
              <Input type="password" autoComplete="new-password" placeholder={settings?.tokenConfigured ? "Jeton enregistré · saisir pour remplacer" : "Collez votre jeton Coolify"} value={token} onChange={(event) => setToken(event.target.value)} disabled={busy} />
            </label>
            <p className="text-xs text-muted-foreground">Les secrets sont enregistrés sur votre machine et ne sont jamais renvoyés par l'API.</p>
            <Button variant="outline" size="sm" disabled={busy || !draft.baseUrl || (!token && !settings?.tokenConfigured)} onClick={() => void save(true)}>
              {busy && <Loader2 className="size-3.5 animate-spin" />}Enregistrer et tester la connexion
            </Button>
            {inventory !== null && <p className="flex items-center gap-2 text-sm text-primary"><CheckCircle2 className="size-4" />Connexion vérifiée. Choisissez les ressources ci-dessous.</p>}
          </div>

          <div className="space-y-3">
            <div className="flex flex-col gap-3 sm:flex-row">
              <ResourceSelect label="Serveur" value={draft.serverUuid} items={inventory?.servers ?? []} disabled={busy || inventory === null} onChange={(value) => setDraft({ ...draft, serverUuid: value })} />
              <ResourceSelect label="Projet Coolify" value={draft.projectUuid} items={inventory?.projects ?? []} disabled={busy || inventory === null} onChange={(value) => setDraft({ ...draft, projectUuid: value })} />
            </div>
            <ResourceSelect label="GitHub App par défaut" value={draft.githubAppUuid} items={inventory?.githubApps ?? []} disabled={busy || inventory === null} onChange={(value) => setDraft({ ...draft, githubAppUuid: value })} />
            <p className="text-xs text-muted-foreground">Chaque projet choisit une connexion autorisée pour son dépôt. Cette GitHub App (connexion GitHub dans Coolify) est préférée seulement si son accès est vérifié ; un dépôt public peut fonctionner sans elle.</p>
            {inventory === null && <p className="text-xs text-muted-foreground">Testez la connexion pour charger les serveurs, projets et applications GitHub disponibles.</p>}
            <div className="flex flex-col gap-3 sm:flex-row">
              <label className="flex min-w-0 flex-1 flex-col gap-1.5"><span className={FIELD_LABEL_CLASSES}>Environnement</span><Input value={draft.environmentName} onChange={(event) => setDraft({ ...draft, environmentName: event.target.value })} disabled={busy} /></label>
              <label className="flex min-w-0 flex-1 flex-col gap-1.5"><span className={FIELD_LABEL_CLASSES}>Domaine des prévisualisations</span><Input placeholder="preview.example.com" value={draft.domainBase ?? ""} onChange={(event) => setDraft({ ...draft, domainBase: event.target.value || null })} disabled={busy} /></label>
            </div>
          </div>

          <div className="space-y-3 rounded-lg border border-border p-4">
            <div className="flex items-center gap-2 text-sm font-medium"><ShieldCheck className="size-4 text-primary" />Accès protégé</div>
            <p className="text-xs text-muted-foreground">Chaque prévisualisation demande ces identifiants dans le navigateur. {settings?.previewAuthConfigured ? "Des identifiants sont déjà enregistrés." : "Définissez-les avant le premier déploiement."}</p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <label className="flex min-w-0 flex-1 flex-col gap-1.5"><span className={FIELD_LABEL_CLASSES}>Nom d'utilisateur</span><Input autoComplete="off" placeholder="Saisir pour remplacer" value={username} onChange={(event) => setUsername(event.target.value)} disabled={busy} /></label>
              <label className="flex min-w-0 flex-1 flex-col gap-1.5"><span className={FIELD_LABEL_CLASSES}>Mot de passe</span><Input type="password" autoComplete="new-password" placeholder="Saisir pour remplacer" value={password} onChange={(event) => setPassword(event.target.value)} disabled={busy} /></label>
            </div>
          </div>
          <label className="flex flex-col gap-1.5">
            <span className={FIELD_LABEL_CLASSES}>Alias SSH pour le nettoyage (facultatif)</span>
            <Input placeholder="Alias déjà défini dans votre configuration SSH" value={draft.sshHostAlias ?? ""} onChange={(event) => setDraft({ ...draft, sshHostAlias: event.target.value || null })} disabled={busy} />
            <span className="text-xs text-muted-foreground">SSH (connexion sécurisée au serveur) permet de vérifier la suppression des ressources Docker appartenant à la prévisualisation.</span>
          </label>
          <SettingsFooter dirty={dirty} justSaved={saved}>
            <Button size="sm" disabled={busy || !dirty || !draft.environmentName.trim()} onClick={() => void save(false)}>Enregistrer</Button>
          </SettingsFooter>
        </>
      )}
    </div>
  );
}
