import { ChevronDown, ChevronRight, Pencil, Play, Plus, RefreshCw, Trash2, Zap } from "lucide-react";
import { useState, type ReactNode } from "react";

import {
  AGENT_EFFORTS,
  AGENT_EFFORT_LABELS,
  AGENT_MODELS,
  AGENT_MODEL_LABELS,
  AUTOMATION_TRIGGERS,
  AUTOMATION_TRIGGER_LABELS,
} from "@shared/constants";
import type { AgentEffort, AgentModel, AutomationRunStatus, AutomationTrigger } from "@shared/constants";
import type { Automation, AutomationRun, CreateAutomationInput } from "@shared/schemas";

import { Badge, type BadgeVariant } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmPopover } from "@/components/ui/confirm";
import { Input, Label, Textarea } from "@/components/ui/input";
import { Markdown } from "@/components/ui/markdown";
import { Select } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useBoard } from "@/hooks/useBoard";
import { api } from "@/lib/api";

const DEFAULT_INTERVAL_MINUTES = 60;

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
  const set = (patch: Partial<FormState>): void => onChange({ ...value, ...patch });

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Label htmlFor={`${idPrefix}-name`}>Nom</Label>
        <Input
          id={`${idPrefix}-name`}
          value={value.name}
          onChange={(e) => set({ name: e.target.value })}
          placeholder="Nom de l'automatisation"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor={`${idPrefix}-prompt`}>Prompt</Label>
        <Textarea
          id={`${idPrefix}-prompt`}
          value={value.prompt}
          onChange={(e) => set({ prompt: e.target.value })}
          className="min-h-[100px]"
          placeholder="Décris la tâche à exécuter en arrière-plan depuis ~/…"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor={`${idPrefix}-trigger`}>Déclencheur</Label>
          <Select
            id={`${idPrefix}-trigger`}
            className="w-full"
            value={value.trigger}
            onChange={(e) => set({ trigger: e.target.value === "recurring" ? "recurring" : "on_launch" })}
          >
            {AUTOMATION_TRIGGERS.map((trigger) => (
              <option key={trigger} value={trigger}>
                {AUTOMATION_TRIGGER_LABELS[trigger]}
              </option>
            ))}
          </Select>
        </div>

        {value.trigger === "recurring" && (
          <div className="space-y-1.5">
            <Label htmlFor={`${idPrefix}-interval`}>Intervalle (minutes)</Label>
            <Input
              id={`${idPrefix}-interval`}
              type="number"
              min={1}
              value={value.intervalMinutes}
              onChange={(e) => set({ intervalMinutes: Math.max(1, Number(e.target.value) || 1) })}
            />
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor={`${idPrefix}-model`}>Modèle</Label>
          <Select
            id={`${idPrefix}-model`}
            className="w-full"
            value={value.model}
            onChange={(e) => set({ model: readModel(e.target.value, value.model) })}
          >
            {AGENT_MODELS.map((model) => (
              <option key={model} value={model}>
                {AGENT_MODEL_LABELS[model]}
              </option>
            ))}
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor={`${idPrefix}-effort`}>Effort</Label>
          <Select
            id={`${idPrefix}-effort`}
            className="w-full"
            value={value.effort}
            onChange={(e) => set({ effort: readEffort(e.target.value, value.effort) })}
          >
            {AGENT_EFFORTS.map((effort) => (
              <option key={effort} value={effort}>
                {AGENT_EFFORT_LABELS[effort]}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Switch checked={value.enabled} onCheckedChange={(enabled) => set({ enabled })} />
        <Label>Activée</Label>
      </div>
    </div>
  );
}

function readModel(value: string, fallback: AgentModel): AgentModel {
  return AGENT_MODELS.find((m) => m === value) ?? fallback;
}

function readEffort(value: string, fallback: AgentEffort): AgentEffort {
  return AGENT_EFFORTS.find((e) => e === value) ?? fallback;
}

function RunHistory({ runs }: { runs: AutomationRun[] }): ReactNode {
  if (runs.length === 0) {
    return <p className="text-sm text-muted-foreground">Aucune exécution pour le moment.</p>;
  }
  return (
    <ul className="space-y-2">
      {runs.map((run) => (
        <li key={run.id} className="rounded-md border bg-background p-3">
          <div className="flex items-center gap-2">
            <Badge variant={RUN_STATUS_VARIANT[run.status]}>{RUN_STATUS_LABEL[run.status]}</Badge>
            <span className="text-xs text-muted-foreground">
              {new Date(run.startedAt).toLocaleString("fr-FR")}
            </span>
          </div>
          {run.result && (
            <div className="mt-2 max-h-64 overflow-auto rounded bg-muted/40 p-2 text-sm">
              <Markdown content={run.result} />
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}

interface AutomationCardProps {
  automation: Automation;
}

function AutomationCard({ automation }: AutomationCardProps): ReactNode {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<FormState>(() => formFromAutomation(automation));
  const [historyOpen, setHistoryOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const startEdit = (): void => {
    setForm(formFromAutomation(automation));
    setError("");
    setEditing(true);
  };

  const saveEdit = async (): Promise<void> => {
    setBusy(true);
    setError("");
    try {
      const input = toCreateInput(form);
      await api.updateAutomation(automation.id, {
        name: input.name,
        prompt: input.prompt,
        trigger: input.trigger,
        intervalMinutes: input.intervalMinutes,
        model: input.model,
        effort: input.effort,
        enabled: input.enabled,
      });
      setEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "échec de la mise à jour");
    } finally {
      setBusy(false);
    }
  };

  const toggleEnabled = async (enabled: boolean): Promise<void> => {
    setError("");
    try {
      await api.updateAutomation(automation.id, { enabled });
    } catch (err) {
      setError(err instanceof Error ? err.message : "échec de la mise à jour");
    }
  };

  const runNow = async (): Promise<void> => {
    setError("");
    try {
      await api.runAutomation(automation.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "échec du lancement");
    }
  };

  const remove = async (): Promise<void> => {
    setError("");
    try {
      await api.deleteAutomation(automation.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "échec de la suppression");
    }
  };

  return (
    <div className="rounded-lg border bg-card p-4">
      {editing ? (
        <div className="space-y-3">
          <AutomationForm value={form} onChange={setForm} idPrefix={`edit-${automation.id}`} />
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="flex gap-2">
            <Button size="sm" onClick={() => void saveEdit()} disabled={busy}>
              Enregistrer
            </Button>
            <Button size="sm" variant="outline" onClick={() => setEditing(false)} disabled={busy}>
              Annuler
            </Button>
          </div>
        </div>
      ) : (
        <>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="truncate font-medium">{automation.name}</span>
                <Badge variant="secondary">{AUTOMATION_TRIGGER_LABELS[automation.trigger]}</Badge>
                {automation.trigger === "recurring" && automation.intervalMinutes !== null && (
                  <Badge variant="outline">toutes les {automation.intervalMinutes} min</Badge>
                )}
              </div>
              <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{automation.prompt}</p>
              <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                <span>{AGENT_MODEL_LABELS[automation.model]}</span>
                <span>·</span>
                <span>{AGENT_EFFORT_LABELS[automation.effort]}</span>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <Switch checked={automation.enabled} onCheckedChange={(v) => void toggleEnabled(v)} />
              <Button size="icon" variant="ghost" onClick={() => void runNow()} title="Lancer maintenant">
                <Play className="h-4 w-4" />
              </Button>
              <Button size="icon" variant="ghost" onClick={startEdit} title="Modifier">
                <Pencil className="h-4 w-4" />
              </Button>
              <ConfirmPopover
                title="Supprimer l'automatisation"
                description={`« ${automation.name} » et son historique seront supprimés.`}
                confirmLabel="Supprimer"
                destructive
                onConfirm={remove}
              >
                <Button size="icon" variant="ghost" title="Supprimer" aria-label="Supprimer">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </ConfirmPopover>
            </div>
          </div>

          {error && <p className="mt-2 text-sm text-destructive">{error}</p>}

          <button
            type="button"
            onClick={() => setHistoryOpen((v) => !v)}
            className="mt-3 flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            {historyOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            Historique ({automation.runs.length})
          </button>
          {historyOpen && (
            <div className="mt-2">
              <RunHistory runs={automation.runs} />
            </div>
          )}
        </>
      )}
    </div>
  );
}

export function AutomationView(): ReactNode {
  const { automations } = useBoard();
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  const canCreate = form.name.trim().length > 0 && form.prompt.trim().length > 0 && !creating;

  const create = async (): Promise<void> => {
    if (!canCreate) return;
    setCreating(true);
    setError("");
    try {
      await api.createAutomation(toCreateInput(form));
      setForm(EMPTY_FORM);
    } catch (err) {
      setError(err instanceof Error ? err.message : "échec de la création");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="mx-auto flex h-full max-w-3xl flex-col gap-6 overflow-auto">
      <section className="rounded-lg border bg-card p-4">
        <div className="mb-3 flex items-center gap-2">
          <Zap className="h-5 w-5" />
          <h2 className="font-semibold">Nouvelle automatisation</h2>
        </div>
        <AutomationForm value={form} onChange={setForm} idPrefix="new" />
        {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
        <div className="mt-3">
          <Button onClick={() => void create()} disabled={!canCreate}>
            {creating ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Créer
          </Button>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="font-semibold">Automatisations ({automations.length})</h2>
        {automations.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucune automatisation configurée.</p>
        ) : (
          automations.map((automation) => <AutomationCard key={automation.id} automation={automation} />)
        )}
      </section>
    </div>
  );
}
