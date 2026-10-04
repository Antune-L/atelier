import { Cloud, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";

import type { PreviewProjectSettings } from "@shared/preview";
import type { ManagedProject } from "@shared/schemas";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useBusyAction } from "@/hooks/useBusyAction";
import { useSavedFlag } from "@/hooks/useSavedFlash";
import { errorMessage } from "@/lib/errors";
import { FIELD_LABEL_CLASSES } from "@/lib/overlayStyles";
import { previewApi } from "@/lib/previewApi";

export function ProjectPreviewSettings({ project }: { project: ManagedProject }) {
  const [settings, setSettings] = useState<PreviewProjectSettings | null>(null);
  const [draft, setDraft] = useState<PreviewProjectSettings | null>(null);
  const [preparationMessage, setPreparationMessage] = useState<string | null>(null);
  const { busy, error, setError, run } = useBusyAction();
  const { saved, flashSaved } = useSavedFlag();
  const supported = project.vcsProvider === "github";
  const dirty = settings !== null && draft !== null && JSON.stringify(settings) !== JSON.stringify(draft);

  useEffect(() => {
    let active = true;
    void previewApi.projectSettings(project.key).then(({ settings: loaded }) => {
      if (!active) return;
      setSettings(loaded);
      setDraft(loaded);
    }).catch((cause: unknown) => {
      if (active) setError(errorMessage(cause, "Impossible de charger les prévisualisations du projet."));
    });
    return () => { active = false; };
  }, [project.key, setError]);

  async function save(prepare: boolean) {
    if (draft === null) return;
    setPreparationMessage(null);
    await run(async () => {
      const result = await previewApi.updateProjectSettings(project.key, {
        enabled: draft.enabled,
        recipePath: draft.recipePath,
        ttlHours: draft.ttlHours,
      });
      setSettings(result.settings);
      setDraft(result.settings);
      flashSaved();
      if (prepare) {
        const preparation = await previewApi.prepareProject(project.key);
        setPreparationMessage(preparation.created ? `Carte « ${preparation.ticket.title} » créée dans À faire.` : `La carte « ${preparation.ticket.title} » existe déjà.`);
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
          <p className="text-xs text-muted-foreground">Un environnement temporaire par pull request, depuis son dernier commit.</p>
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
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" disabled={busy || !draft.recipePath.trim() || draft.ttlHours <= 0} onClick={() => void save(true)}>{busy && <Loader2 className="size-3.5 animate-spin" />}Préparer pour Coolify</Button>
            <Button size="sm" disabled={busy || !dirty || !draft.recipePath.trim() || draft.ttlHours <= 0} onClick={() => void save(false)}>Enregistrer les prévisualisations</Button>
            {saved && <span className="text-xs text-primary">Enregistré</span>}
          </div>
          <p className="text-xs text-muted-foreground">La préparation crée une carte ordinaire dans À faire, à lancer et à relire comme vos autres fonctionnalités.</p>
          {preparationMessage && <p role="status" className="text-sm text-primary">{preparationMessage}</p>}
          {draft.preparationTicketId !== null && preparationMessage === null && <p className="text-xs text-muted-foreground">Une carte de préparation est associée à ce projet.</p>}
        </>
      )}
    </section>
  );
}
