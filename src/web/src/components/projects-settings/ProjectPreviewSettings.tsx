import { Cloud, Loader2 } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";

import type { PreviewGithubSourceResolution, PreviewProjectSettings } from "@shared/preview";
import type { ManagedProject } from "@shared/schemas";

import { PreviewReadinessStatus } from "@/components/PreviewReadinessStatus";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useBusyAction } from "@/hooks/useBusyAction";
import { usePreviewReadiness } from "@/hooks/usePreviewReadiness";
import { useSavedFlag } from "@/hooks/useSavedFlash";
import { errorMessage } from "@/lib/errors";
import { FIELD_LABEL_CLASSES } from "@/lib/overlayStyles";
import { previewApi } from "@/lib/previewApi";
import { PREVIEW_GITHUB_SOURCE_ERROR, PREVIEW_GITHUB_SOURCE_LABELS } from "@/lib/previewDisplay";

export function ProjectPreviewSettings({ project }: { project: ManagedProject }) {
  const [settings, setSettings] = useState<PreviewProjectSettings | null>(null);
  const [draft, setDraft] = useState<PreviewProjectSettings | null>(null);
  const [preparationMessage, setPreparationMessage] = useState<string | null>(null);
  const [source, setSource] = useState<PreviewGithubSourceResolution | null>(null);
  const [sourceLoading, setSourceLoading] = useState(project.vcsProvider === "github");
  const [sourceError, setSourceError] = useState<string | null>(null);
  const sourceRequest = useRef(0);
  const connectionId = useId();
  const { busy, error, setError, run } = useBusyAction();
  const { saved, flashSaved } = useSavedFlag();
  const supported = project.vcsProvider === "github";
  const check = usePreviewReadiness(supported ? project.key : "");
  const dirty = settings !== null && draft !== null && JSON.stringify(settings) !== JSON.stringify(draft);
  const connectionDirty = settings !== null && draft !== null && settings.githubAppUuid !== draft.githubAppUuid;
  const candidates = source?.candidates ?? [];
  const selectedMissing = draft?.githubAppUuid != null && !candidates.some((candidate) => candidate.uuid === draft.githubAppUuid);
  const resolvedConnection = candidates.find((candidate) => candidate.uuid === source?.githubAppUuid);

  useEffect(() => {
    let active = true;
    void previewApi.projectSettings(project.key).then(({ settings: loaded }) => {
      if (!active) return;
      setSettings(loaded);
      setDraft(loaded);
    }).catch((cause: unknown) => {
      if (active) setError(errorMessage(cause, "Impossible de charger les prévisualisations du projet."));
    });
    if (supported) {
      const request = ++sourceRequest.current;
      void previewApi.projectSource(project.key).then(({ resolution }) => {
        if (active && request === sourceRequest.current) setSource(resolution);
      }).catch(() => {
        if (active && request === sourceRequest.current) setSourceError(PREVIEW_GITHUB_SOURCE_ERROR);
      }).finally(() => {
        if (active && request === sourceRequest.current) setSourceLoading(false);
      });
    }
    return () => { active = false; sourceRequest.current += 1; };
  }, [project.key, setError, supported]);

  async function checkSource() {
    const request = ++sourceRequest.current;
    setSourceLoading(true);
    setSourceError(null);
    try {
      const result = await previewApi.projectSource(project.key);
      if (request === sourceRequest.current) setSource(result.resolution);
    } catch {
      if (request === sourceRequest.current) setSourceError(PREVIEW_GITHUB_SOURCE_ERROR);
    } finally {
      if (request === sourceRequest.current) setSourceLoading(false);
    }
  }

  async function save(prepare: boolean) {
    if (draft === null) return;
    setPreparationMessage(null);
    await run(async () => {
      const result = await previewApi.updateProjectSettings(project.key, {
        enabled: draft.enabled,
        recipePath: draft.recipePath,
        ttlHours: draft.ttlHours,
        githubAppUuid: draft.githubAppUuid,
      });
      setSettings(result.settings);
      setDraft(result.settings);
      flashSaved();
      await Promise.all([checkSource(), check.refresh()]);
      if (prepare) {
        const preparation = await previewApi.prepareProject(project.key, undefined, check.readiness?.preparationRetryAvailable === true);
        check.accept(preparation.readiness);
        if (preparation.ticket === null) setPreparationMessage("Le projet est déjà prêt pour Coolify.");
        else setPreparationMessage(preparation.created ? `Carte « ${preparation.ticket.title} » créée dans À faire.` : `La carte « ${preparation.ticket.title} » existe déjà.`);
        const refreshed = await previewApi.projectSettings(project.key);
        setSettings(refreshed.settings);
        setDraft(refreshed.settings);
      }
    }, "Impossible d'enregistrer les prévisualisations du projet.");
  }

  return (
    <section className="space-y-3 rounded-lg border border-border bg-muted/20 p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="space-y-1">
          <h4 className="flex items-center gap-2 text-sm font-medium"><Cloud className="size-4 text-primary" />Prévisualisations Coolify</h4>
          <p className="text-xs text-muted-foreground">Un environnement temporaire par branche ou pull request, depuis son dernier commit.</p>
        </div>
        <Switch aria-label="Activer les prévisualisations Coolify" checked={draft?.enabled ?? false} disabled={!supported || draft === null || busy} onCheckedChange={(enabled) => { if (draft !== null) setDraft({ ...draft, enabled }); }} />
      </div>
      {!supported && <p className="text-sm text-muted-foreground">Azure DevOps n'est pas disponible pour les prévisualisations. Son support est prévu en V2.</p>}
      {error && <p role="alert" className="text-sm text-danger">{error}</p>}
      {supported && draft === null && !error && <p className="text-xs text-muted-foreground">Chargement…</p>}
      {supported && draft !== null && (
        <>
          <div className="flex flex-col gap-3 sm:flex-row">
            <label className="flex min-w-0 flex-1 flex-col gap-1.5"><span className={FIELD_LABEL_CLASSES}>Recette du projet</span><Input value={draft.recipePath} disabled={busy} onChange={(event) => setDraft({ ...draft, recipePath: event.target.value })} /><span className="text-xs text-muted-foreground">Fichier du dépôt qui décrit la construction et le démarrage.</span></label>
            <label className="flex flex-col gap-1.5 sm:w-40"><span className={FIELD_LABEL_CLASSES}>Durée de vie (heures)</span><Input type="number" value={draft.ttlHours} disabled={busy} onChange={(event) => setDraft({ ...draft, ttlHours: Number(event.target.value) })} /></label>
          </div>
          <div className="space-y-2 rounded-md border border-border p-3">
            <div className="flex flex-col gap-1.5">
              <label htmlFor={connectionId} className={FIELD_LABEL_CLASSES}>Connexion GitHub du projet</label>
              <Select id={connectionId} value={draft.githubAppUuid ?? ""} disabled={busy || sourceLoading} onChange={(event) => setDraft({ ...draft, githubAppUuid: event.target.value || null })}>
                <option value="">Automatique selon le dépôt</option>
                {selectedMissing && <option value={draft.githubAppUuid ?? ""}>Connexion enregistrée · à vérifier</option>}
                {candidates.map((candidate) => <option key={candidate.uuid} value={candidate.uuid}>{candidate.name || "Connexion GitHub"}</option>)}
              </Select>
            </div>
            <p className="text-xs text-muted-foreground">Le choix automatique vérifie l'accès au dépôt et préfère l'application par défaut uniquement si elle y a accès. Une sélection manuelle s'applique aux prochaines prévisualisations.</p>
            {connectionDirty ? (
              <p role="status" className="text-xs text-muted-foreground">Enregistrez cette sélection pour vérifier son accès au dépôt.</p>
            ) : (
              <div role="status" className="space-y-1 text-sm">
                {sourceLoading && <p className="flex items-center gap-2 text-muted-foreground"><Loader2 className="size-3.5 animate-spin" />Vérification de l'accès au dépôt…</p>}
                {!sourceLoading && sourceError && <p className="text-danger">{sourceError}</p>}
                {!sourceLoading && !sourceError && source !== null && (
                  <>
                    <p className={source.status === "resolved" ? "text-primary" : "text-muted-foreground"}>{PREVIEW_GITHUB_SOURCE_LABELS[source.status]}</p>
                    {source.status === "resolved" && source.source === "public" && <p className="text-xs text-muted-foreground">Dépôt public · aucune GitHub App nécessaire.</p>}
                    {source.status === "resolved" && source.source === "github_app" && <p className="text-xs text-muted-foreground">Connexion retenue : {resolvedConnection?.name || "Connexion GitHub vérifiée"}.</p>}
                  </>
                )}
              </div>
            )}
            <Button variant="outline" size="sm" disabled={busy || sourceLoading || connectionDirty} onClick={() => void checkSource()}>Vérifier l'accès au dépôt</Button>
          </div>
          <PreviewReadinessStatus readiness={check.readiness} loading={check.loading} error={check.error} />
          {dirty && <p className="text-xs text-muted-foreground">La vérification utilise la recette enregistrée et la branche de base du projet. Enregistrez vos changements pour les revérifier.</p>}
          <div className="flex flex-wrap items-center gap-2">
            {!check.loading && check.readiness?.status === "not_ready" && check.readiness.preparationTicketId === null && <Button variant="outline" size="sm" disabled={busy || sourceLoading || !draft.recipePath.trim() || draft.ttlHours <= 0} onClick={() => void save(true)}>{busy && <Loader2 className="size-3.5 animate-spin" />}{check.readiness.preparationRetryAvailable ? "Relancer la préparation" : "Préparer pour Coolify"}</Button>}
            <Button variant="outline" size="sm" disabled={busy || check.loading || dirty} onClick={() => void check.refresh()}>Revérifier le projet</Button>
            <Button size="sm" disabled={busy || sourceLoading || !dirty || !draft.recipePath.trim() || draft.ttlHours <= 0} onClick={() => void save(false)}>Enregistrer les prévisualisations</Button>
            {saved && <span className="text-xs text-primary">Enregistré</span>}
          </div>
          {check.readiness?.status === "not_ready" && <p className="text-xs text-muted-foreground">La préparation utilise une carte ordinaire, à lancer et à relire comme vos autres fonctionnalités. Après fusion dans la branche de base, revérifiez le projet.</p>}
          {preparationMessage && <p role="status" className="text-sm text-primary">{preparationMessage}</p>}
        </>
      )}
    </section>
  );
}
