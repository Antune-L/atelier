import { ChevronDown, ChevronRight, Pencil, Play, Plus, RefreshCw, Trash2, Zap } from "lucide-react";
import { useId, useState, type ReactNode } from "react";

import {
  AGENT_EFFORTS,
  AGENT_EFFORT_LABELS,
  AGENT_MODELS,
  AGENT_MODEL_LABELS,
  AUTOMATION_MIN_INTERVAL_MINUTES,
  AUTOMATION_RUN_STATUSES,
  AUTOMATION_TRIGGERS,
  AUTOMATION_TRIGGER_LABELS,
} from "@shared/constants";
import type { AgentEffort, AgentModel, AutomationRunStatus, AutomationTrigger } from "@shared/constants";
import type { Automation, AutomationRun, CreateAutomationInput } from "@shared/schemas";

import { Badge, type BadgeVariant } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmPopover } from "@/components/ui/confirm";
import { Dialog } from "@/components/ui/dialog";
import { Input, Label, Textarea } from "@/components/ui/input";
import { Markdown } from "@/components/ui/markdown";
import { Select } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, type TabOption } from "@/components/ui/tabs";
import { useBoard } from "@/hooks/useBoard";
import { api } from "@/lib/api";
import { formatDateTime, formatDuration } from "@/lib/display";
import { cn } from "@/lib/utils";

const DEFAULT_INTERVAL_MINUTES = 60;
const RECENT_RUNS_LIMIT = 5;
const ALL_RUNS = "all";

type FormTopic = "task" | "schedule" | "execution";
type RunStatusFilter = AutomationRunStatus | typeof ALL_RUNS;

const FORM_TOPICS: TabOption<FormTopic>[] = [
  { value: "task", label: "Tâche" },
  { value: "schedule", label: "Déclenchement" },
  { value: "execution", label: "Exécution" },
];

interface FormState {
  name: string;
  prompt: string;
  trigger: AutomationTrigger;
  intervalMinutes: number;
  model: AgentModel;
  effort: AgentEffort;
  enabled: boolean;
}

const EMPTY_FORM: FormState = {
  name: "",
  prompt: "",
  trigger: "on_launch",
  intervalMinutes: DEFAULT_INTERVAL_MINUTES,
  model: AGENT_MODELS[0],
  effort: "medium",
  enabled: true,
};

const RUN_STATUS_VARIANT: Record<AutomationRunStatus, BadgeVariant> = {
  running: "info",
  success: "success",
  failure: "danger",
};

const RUN_STATUS_LABEL: Record<AutomationRunStatus, string> = {
  running: "En cours",
  success: "Succès",
  failure: "Échec",
};

function toCreateInput(form: FormState): CreateAutomationInput {
  return {
    name: form.name.trim(),
    prompt: form.prompt.trim(),
    trigger: form.trigger,
    intervalMinutes: form.trigger === "recurring" ? form.intervalMinutes : null,
    model: form.model,
    effort: form.effort,
    enabled: form.enabled,
  };
}

function formFromAutomation(automation: Automation): FormState {
  return {
    name: automation.name,
    prompt: automation.prompt,
    trigger: automation.trigger,
    intervalMinutes: automation.intervalMinutes ?? DEFAULT_INTERVAL_MINUTES,
    model: automation.model,
    effort: automation.effort,
    enabled: automation.enabled,
  };
}

interface AutomationFormProps {
  value: FormState;
  onChange: (next: FormState) => void;
  idPrefix: string;
}

function AutomationForm({ value, onChange, idPrefix }: AutomationFormProps): ReactNode {
  const [topic, setTopic] = useState<FormTopic>("task");
  const set = (patch: Partial<FormState>): void => onChange({ ...value, ...patch });

  return (
    <div className="space-y-4">
      <Tabs options={FORM_TOPICS} value={topic} onChange={setTopic} aria-label="Réglages de l'automatisation" />
      {topic === "task" && (
        <section aria-label="Tâche" className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor={`${idPrefix}-name`}>Nom</Label>
            <Input id={`${idPrefix}-name`} value={value.name} onChange={(event) => set({ name: event.target.value })} placeholder="Nom de l'automatisation" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`${idPrefix}-prompt`}>Instructions</Label>
            <Textarea id={`${idPrefix}-prompt`} value={value.prompt} onChange={(event) => set({ prompt: event.target.value })} className="min-h-[160px]" placeholder="Décris la tâche à exécuter en arrière-plan depuis ~/…" />
          </div>
        </section>
      )}
      {topic === "schedule" && (
        <section aria-label="Déclenchement" className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor={`${idPrefix}-trigger`}>Déclencheur</Label>
            <Select id={`${idPrefix}-trigger`} className="w-full" value={value.trigger} onChange={(event) => set({ trigger: event.target.value === "recurring" ? "recurring" : "on_launch" })}>
              {AUTOMATION_TRIGGERS.map((trigger) => <option key={trigger} value={trigger}>{AUTOMATION_TRIGGER_LABELS[trigger]}</option>)}
            </Select>
          </div>
          {value.trigger === "recurring" && (
            <div className="space-y-1.5">
              <Label htmlFor={`${idPrefix}-interval`}>Intervalle (minutes)</Label>
              <Input id={`${idPrefix}-interval`} type="number" min={AUTOMATION_MIN_INTERVAL_MINUTES} step={1} value={value.intervalMinutes} onChange={(event) => set({ intervalMinutes: Math.max(AUTOMATION_MIN_INTERVAL_MINUTES, Math.floor(Number(event.target.value)) || AUTOMATION_MIN_INTERVAL_MINUTES) })} />
            </div>
          )}
          <div className="flex items-center gap-2">
            <Switch id={`${idPrefix}-enabled`} checked={value.enabled} onCheckedChange={(enabled) => set({ enabled })} />
            <Label htmlFor={`${idPrefix}-enabled`}>Déclenchements automatiques activés</Label>
          </div>
          <p className="text-xs leading-relaxed text-muted-foreground">
            {value.trigger === "on_launch" ? "Une routine activée se lance au prochain démarrage de l'application." : "Une routine activée se lance à l'intervalle choisi tant que l'application fonctionne."}
          </p>
        </section>
      )}
      {topic === "execution" && (
        <section aria-label="Exécution" className="space-y-4">
          <p className="text-xs text-muted-foreground">Ces routines utilisent Claude.</p>
          <div className="space-y-1.5">
            <Label htmlFor={`${idPrefix}-model`}>Modèle</Label>
            <Select id={`${idPrefix}-model`} className="w-full" value={value.model} onChange={(event) => set({ model: readModel(event.target.value, value.model) })}>
              {AGENT_MODELS.map((model) => <option key={model} value={model}>{AGENT_MODEL_LABELS[model]}</option>)}
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`${idPrefix}-effort`}>Effort</Label>
            <Select id={`${idPrefix}-effort`} className="w-full" value={value.effort} onChange={(event) => set({ effort: readEffort(event.target.value, value.effort) })}>
              {AGENT_EFFORTS.map((effort) => <option key={effort} value={effort}>{AGENT_EFFORT_LABELS[effort]}</option>)}
            </Select>
          </div>
        </section>
      )}
    </div>
  );
}

function readModel(value: string, fallback: AgentModel): AgentModel {
  return AGENT_MODELS.find((model) => model === value) ?? fallback;
}

function readEffort(value: string, fallback: AgentEffort): AgentEffort {
  return AGENT_EFFORTS.find((effort) => effort === value) ?? fallback;
}

function RunHistory({ runs }: { runs: AutomationRun[] }): ReactNode {
  const resultId = useId();
  const [filter, setFilter] = useState<RunStatusFilter>(ALL_RUNS);
  const [showAll, setShowAll] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const filtered = filter === ALL_RUNS ? runs : runs.filter((run) => run.status === filter);
  const visible = showAll ? filtered : filtered.slice(0, RECENT_RUNS_LIMIT);
  const selectedRun = visible.find((run) => run.id === selectedId);

  if (runs.length === 0) return <p className="text-sm text-muted-foreground">Aucune exécution pour le moment.</p>;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">{visible.length} sur {filtered.length} exécutions conservées</p>
        <Select aria-label="Filtrer l'historique par résultat" value={filter} onChange={(event) => setFilter(AUTOMATION_RUN_STATUSES.find((status) => status === event.target.value) ?? ALL_RUNS)}>
          <option value={ALL_RUNS}>Tous les résultats</option>
          {AUTOMATION_RUN_STATUSES.map((status) => <option key={status} value={status}>{RUN_STATUS_LABEL[status]}</option>)}
        </Select>
      </div>
      {visible.length === 0 && <p className="text-sm text-muted-foreground">Aucune exécution avec ce résultat.</p>}
      <ul className="space-y-1.5">
        {visible.map((run) => (
          <li key={run.id}>
            <button type="button" aria-expanded={selectedId === run.id} aria-controls={selectedId === run.id ? resultId : undefined} onClick={() => setSelectedId(selectedId === run.id ? null : run.id)} className={cn("flex w-full flex-wrap items-center justify-between gap-2 rounded-md border bg-background p-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring", selectedId === run.id && "border-primary bg-muted/40")}>
              <span className="flex flex-wrap items-center gap-2">
                <Badge variant={RUN_STATUS_VARIANT[run.status]}>{RUN_STATUS_LABEL[run.status]}</Badge>
                <span className="text-xs text-muted-foreground">{formatDateTime(run.startedAt)}</span>
              </span>
              <span className="text-xs text-muted-foreground">{selectedId === run.id ? "Masquer le résultat" : "Voir le résultat"}</span>
            </button>
          </li>
        ))}
      </ul>
      {filtered.length > RECENT_RUNS_LIMIT && (
        <Button variant="ghost" size="sm" onClick={() => setShowAll(!showAll)}>
          {showAll ? "Voir les plus récentes" : `Afficher les ${filtered.length} exécutions conservées`}
        </Button>
      )}
      {selectedRun && (
        <section id={resultId} aria-label="Résultat de l'exécution sélectionnée" className="space-y-2 rounded-md border bg-background p-3">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <Badge variant={RUN_STATUS_VARIANT[selectedRun.status]}>{RUN_STATUS_LABEL[selectedRun.status]}</Badge>
            <span>{formatDateTime(selectedRun.startedAt)}</span>
            {selectedRun.finishedAt !== null && <span className="text-muted-foreground">Durée : {formatDuration(selectedRun.finishedAt - selectedRun.startedAt)}</span>}
          </div>
          {selectedRun.result ? (
            <div className="max-h-64 overflow-auto rounded bg-muted/40 p-2 text-sm"><Markdown content={selectedRun.result} /></div>
          ) : (
            <p className="text-sm text-muted-foreground">{selectedRun.status === "running" ? "Exécution en cours. Le résultat apparaîtra à la fin." : "Aucun résultat disponible pour cette exécution."}</p>
          )}
        </section>
      )}
    </div>
  );
}

interface AutomationCardProps {
  automation: Automation;
  onEdit: (automation: Automation) => void;
}

function AutomationCard({ automation, onEdit }: AutomationCardProps): ReactNode {
  const [historyOpen, setHistoryOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const latestRun = automation.runs[0];
  const running = automation.runs.some((run) => run.status === "running");
  let schedule = AUTOMATION_TRIGGER_LABELS[automation.trigger];
  let activationDescription = "La routine se lancera au prochain démarrage de l'application.";
  const scheduleConfigured = automation.trigger !== "recurring" || automation.intervalMinutes !== null;
  if (automation.trigger === "recurring") {
    if (automation.intervalMinutes === null) {
      schedule = "Intervalle à configurer";
      activationDescription = "Définissez l'intervalle avant d'activer les déclenchements.";
    } else {
      schedule = `Toutes les ${automation.intervalMinutes} min`;
      activationDescription = `La routine se lancera toutes les ${automation.intervalMinutes} minutes tant que l'application fonctionne.`;
    }
  }

  const toggleEnabled = async (enabled: boolean): Promise<void> => {
    setBusy(true);
    setError("");
    try {
      await api.updateAutomation(automation.id, { enabled });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Échec de la mise à jour");
    } finally {
      setBusy(false);
    }
  };

  const runNow = async (): Promise<void> => {
    setBusy(true);
    setError("");
    try {
      await api.runAutomation(automation.id);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Échec du lancement");
    } finally {
      setBusy(false);
    }
  };

  const remove = async (): Promise<void> => {
    setBusy(true);
    setError("");
    try {
      await api.deleteAutomation(automation.id);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Échec de la suppression");
    } finally {
      setBusy(false);
    }
  };

  return (
    <article className="rounded-lg border bg-card p-4">
      <div className="flex flex-col justify-between gap-3 sm:flex-row">
        <div className="min-w-0 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="break-words font-medium">{automation.name}</h3>
            <Badge variant={automation.enabled ? "success" : "secondary"}>{automation.enabled ? "Activée" : "En pause"}</Badge>
          </div>
          <p className="line-clamp-2 break-words text-sm text-muted-foreground">{automation.prompt}</p>
          <p className="text-xs text-muted-foreground">{schedule} · {AGENT_MODEL_LABELS[automation.model]} · {AGENT_EFFORT_LABELS[automation.effort]}</p>
          <p className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            {latestRun ? <><span>Dernière exécution : {formatDateTime(latestRun.startedAt)}</span><Badge variant={RUN_STATUS_VARIANT[latestRun.status]}>{RUN_STATUS_LABEL[latestRun.status]}</Badge></> : "Aucune exécution"}
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap items-start gap-2">
          <Button size="sm" variant="outline" disabled={busy} onClick={() => onEdit(automation)}><Pencil className="h-3.5 w-3.5" />Modifier</Button>
          <ConfirmPopover title={automation.enabled ? "Suspendre l'automatisation" : "Activer l'automatisation"} description={automation.enabled ? "Les prochains déclenchements automatiques seront suspendus." : activationDescription} confirmLabel={automation.enabled ? "Suspendre" : "Activer"} onConfirm={() => toggleEnabled(!automation.enabled)}>
            <Button size="sm" variant="outline" disabled={busy || (!automation.enabled && !scheduleConfigured)} title={!scheduleConfigured ? "Définissez un intervalle dans Modifier avant l'activation" : undefined}>{automation.enabled ? "Suspendre" : "Activer"}</Button>
          </ConfirmPopover>
          <ConfirmPopover title="Lancer l'automatisation" description={`« ${automation.name} » sera exécutée maintenant avec ses réglages enregistrés.`} confirmLabel="Lancer" onConfirm={runNow}>
            <Button size="sm" variant="ghost" disabled={busy || !automation.enabled || running} title={!automation.enabled ? "Activez la routine avant de la lancer" : "Lancer maintenant"}><Play className="h-3.5 w-3.5" />Lancer</Button>
          </ConfirmPopover>
          <ConfirmPopover title="Supprimer l'automatisation" description={`« ${automation.name} » et son historique seront supprimés.`} confirmLabel="Supprimer" destructive onConfirm={remove}>
            <Button size="icon" variant="ghost" disabled={busy} title="Supprimer" aria-label={`Supprimer ${automation.name}`}><Trash2 className="h-4 w-4" /></Button>
          </ConfirmPopover>
        </div>
      </div>
      {error && <p role="alert" className="mt-2 text-sm text-destructive">{error}</p>}
      <button type="button" aria-expanded={historyOpen} onClick={() => setHistoryOpen(!historyOpen)} className="mt-3 flex items-center gap-1 rounded text-sm text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
        {historyOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        Historique ({automation.runs.length})
      </button>
      {historyOpen && <div className="mt-3 border-t pt-3"><RunHistory runs={automation.runs} /></div>}
    </article>
  );
}

export function AutomationView(): ReactNode {
  const { automations } = useBoard();
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const enabledCount = automations.filter((automation) => automation.enabled).length;
  const editingExists = editingId === null || automations.some((automation) => automation.id === editingId);
  const canSave = form.name.trim().length > 0 && form.prompt.trim().length > 0 && editingExists && !saving;

  const startCreate = (): void => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setError("");
    setEditorOpen(true);
  };

  const startEdit = (automation: Automation): void => {
    setEditingId(automation.id);
    setForm(formFromAutomation(automation));
    setError("");
    setEditorOpen(true);
  };

  const save = async (): Promise<void> => {
    if (!canSave) return;
    setSaving(true);
    setError("");
    try {
      const input = toCreateInput(form);
      if (editingId === null) await api.createAutomation(input);
      else await api.updateAutomation(editingId, input);
      setEditorOpen(false);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Échec de l'enregistrement");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto flex h-full w-full max-w-5xl flex-col gap-4 overflow-auto">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 font-semibold"><Zap className="h-4 w-4" />Routines enregistrées</h2>
          <p className="mt-1 text-xs text-muted-foreground">{automations.length} routine{automations.length > 1 ? "s" : ""} · {enabledCount} activée{enabledCount > 1 ? "s" : ""}</p>
        </div>
        <Button onClick={startCreate}><Plus className="h-4 w-4" />Nouvelle routine</Button>
      </div>
      <section aria-label="Routines enregistrées" className="space-y-3">
        {automations.length === 0 ? (
          <div className="rounded-lg border bg-card p-6 text-center">
            <p className="text-sm font-medium">Aucune routine configurée</p>
            <p className="mt-2 text-xs text-muted-foreground">Créez une tâche à exécuter au démarrage ou à intervalle régulier.</p>
          </div>
        ) : automations.map((automation) => <AutomationCard key={automation.id} automation={automation} onEdit={startEdit} />)}
      </section>
      <Dialog open={editorOpen} onOpenChange={setEditorOpen} blocking={saving} title={editingId === null ? "Nouvelle routine" : `Modifier ${form.name || "la routine"}`} description="Définissez la tâche, son déclenchement et les réglages Claude." footer={<><Button size="sm" variant="outline" disabled={saving} onClick={() => setEditorOpen(false)}>Annuler</Button><Button size="sm" disabled={!canSave} onClick={() => void save()}>{saving && <RefreshCw className="h-3.5 w-3.5 animate-spin" />}{editingId === null ? "Créer la routine" : "Enregistrer"}</Button></>}>
        <AutomationForm key={editingId ?? "new"} value={form} onChange={setForm} idPrefix="automation-editor" />
        {!editingExists && <p role="alert" className="text-sm text-destructive">Cette routine n'existe plus. Fermez l'éditeur pour revenir à la liste.</p>}
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      </Dialog>
    </div>
  );
}
