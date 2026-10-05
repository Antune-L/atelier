import { Cloud, Loader2, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";

import type { PreviewProjectSettings, PreviewRecord, PreviewSettings } from "@shared/preview";
import type { ProjectInfo } from "@shared/schemas";

import { PreviewReadinessStatus } from "@/components/PreviewReadinessStatus";
import { ProjectSelect } from "@/components/ProjectSelect";
import { Button } from "@/components/ui/button";
import { BranchCombobox, Label } from "@/components/ui/input";
import { useBusyAction } from "@/hooks/useBusyAction";
import { usePreviewReadiness } from "@/hooks/usePreviewReadiness";
import { api } from "@/lib/api";
import { errorMessage } from "@/lib/errors";
import { FIELD_LABEL_CLASSES } from "@/lib/overlayStyles";
import { previewApi } from "@/lib/previewApi";
import { previewConnectionReady } from "@/lib/previewDisplay";
import { resolveProjectChoice } from "@/lib/projectSelection";
import { boardStore } from "@/lib/store";

function ProjectBranchPreviewForm({ project, onCreated, onOpenTicket }: { project: ProjectInfo; onCreated: (preview: PreviewRecord) => void; onOpenTicket: (ticketId: string) => void }) {
  const [branch, setBranch] = useState(project.baseBranch);
  const [branches, setBranches] = useState<string[] | null>(null);
  const [branchError, setBranchError] = useState<string | null>(null);
  const [settings, setSettings] = useState<PreviewSettings | null>(null);
  const [projectSettings, setProjectSettings] = useState<PreviewProjectSettings | null>(null);
  const [settingsError, setSettingsError] = useState<string | null>(null);
  const check = usePreviewReadiness(project.key, branch.trim());
  const { busy, error, run } = useBusyAction();

  useEffect(() => {
    let active = true;
    void api.projectBranches(project.key).then((result) => {
      if (active) setBranches(result);
    }).catch((cause: unknown) => {
      if (active) {
        setBranches([]);
        setBranchError(errorMessage(cause, "Impossible de charger les branches distantes. Saisissez une branche existante."));
      }
    });
    void Promise.all([previewApi.settings(), previewApi.projectSettings(project.key)]).then(([connection, configuration]) => {
      if (!active) return;
      setSettings(connection.settings);
      setProjectSettings(configuration.settings);
    }).catch((cause: unknown) => {
      if (active) setSettingsError(errorMessage(cause, "Impossible de charger les paramètres Coolify."));
    });
    return () => { active = false; };
  }, [project.key]);

  const branchOptions = branches?.includes(project.baseBranch) ? branches : [project.baseBranch, ...(branches ?? [])];
  const checkedBranch = check.readiness?.branch === branch.trim();
  const canLaunch = previewConnectionReady(settings) && projectSettings?.enabled === true &&
    checkedBranch && check.readiness?.status === "ready" && !check.loading && check.error === null && settingsError === null;

  async function launch() {
    if (!canLaunch) return;
    await run(async () => {
      const result = await previewApi.createBranchPreview(project.key, branch.trim());
      onCreated(result.preview);
    }, "Impossible de lancer la prévisualisation de cette branche.");
  }

  async function refresh() {
    await run(async () => {
      const [connection, configuration] = await Promise.all([previewApi.settings(), previewApi.projectSettings(project.key), check.refresh()]);
      setSettings(connection.settings);
      setProjectSettings(configuration.settings);
      setSettingsError(null);
    }, "Impossible de revérifier les paramètres Coolify.");
  }

  async function enable() {
    await run(async () => {
      const result = await previewApi.updateProjectSettings(project.key, { enabled: true });
      setProjectSettings(result.settings);
      await check.refresh();
    }, "Impossible d'activer les prévisualisations du projet.");
  }

  async function prepare() {
    await run(async () => {
      const result = await previewApi.prepareProject(project.key, branch.trim(), check.readiness?.preparationRetryAvailable === true);
      check.accept(result.readiness);
      if (result.ticket !== null) onOpenTicket(result.ticket.id);
    }, "Impossible de préparer le projet pour Coolify.");
  }

  return <div className="space-y-3">
    <div className="space-y-1.5">
      <Label htmlFor="preview-branch" className={FIELD_LABEL_CLASSES}>Branche distante à prévisualiser</Label>
      <BranchCombobox id="preview-branch" value={branch} onChange={setBranch} options={branchOptions} disabled={busy} placeholder="Branche distante existante" />
      <p className="text-xs text-muted-foreground">Choisissez une branche existante sur le dépôt distant. Aucun ticket ni pull request n'est nécessaire.</p>
      {branches === null && <p className="text-xs text-muted-foreground">Chargement des branches…</p>}
      {branchError && <p role="alert" className="text-xs text-danger">{branchError}</p>}
    </div>
    <PreviewReadinessStatus readiness={checkedBranch ? check.readiness : null} loading={check.loading || (check.error === null && check.readiness !== null && !checkedBranch)} error={check.error} />
    {settings !== null && !previewConnectionReady(settings) && <p className="text-sm text-muted-foreground">Complétez la connexion, les ressources et les identifiants d'accès dans Paramètres · Coolify.</p>}
    {projectSettings?.enabled === false && <div className="flex flex-wrap items-center gap-2"><p className="text-sm text-muted-foreground">Les prévisualisations sont désactivées pour ce projet.</p><Button size="sm" variant="outline" disabled={busy} onClick={() => void enable()}>Activer pour ce projet</Button></div>}
    {(error || settingsError) && <p role="alert" className="text-sm text-danger">{error || settingsError}</p>}
    <div className="flex flex-wrap gap-2">
      <Button size="sm" disabled={busy || !canLaunch} onClick={() => void launch()}>{busy ? <Loader2 className="size-3.5 animate-spin" /> : <Cloud className="size-3.5" />}Lancer la prévisualisation</Button>
      <Button size="sm" variant="outline" disabled={busy || check.loading || !branch.trim()} onClick={() => void refresh()}><RefreshCw className="size-3.5" />Revérifier la branche</Button>
      {!check.loading && checkedBranch && check.readiness?.status === "not_ready" && check.readiness.preparationTicketId === null && <Button size="sm" variant="outline" disabled={busy} onClick={() => void prepare()}>{check.readiness.preparationRetryAvailable ? "Relancer la préparation" : "Préparer pour Coolify"}</Button>}
    </div>
    <p className="text-xs text-muted-foreground">Le dernier commit distant sera fixé au lancement. La durée de vie et les identifiants d'accès viennent des paramètres Coolify.</p>
  </div>;
}

export function BranchPreviewForm({ projects, projectFilter, onCreated, onOpenTicket = (ticketId) => boardStore.openTicket(ticketId) }: { projects: ProjectInfo[]; projectFilter: string; onCreated: (preview: PreviewRecord) => void; onOpenTicket?: (ticketId: string) => void }) {
  const [projectChoice, setProjectChoice] = useState<string | null>(null);
  const choices = projectFilter === "all" ? projects : projects.filter((project) => project.key === projectFilter);
  const projectKey = resolveProjectChoice(choices, projectChoice);
  const project = choices.find((candidate) => candidate.key === projectKey);

  return <section className="space-y-4 rounded-lg border bg-card p-4">
    <div className="space-y-1">
      <h2 className="flex items-center gap-2 text-sm font-semibold"><Cloud className="size-4 text-primary" />Nouvelle prévisualisation</h2>
      <p className="text-xs text-muted-foreground">Déployez une branche dans un environnement temporaire.</p>
    </div>
    <ProjectSelect id="preview-project" projects={choices} value={projectKey} onChange={setProjectChoice} />
    {project !== undefined && <ProjectBranchPreviewForm key={project.key} project={project} onCreated={onCreated} onOpenTicket={onOpenTicket} />}
  </section>;
}
