import { useId } from "react";

import {
  AGENT_EFFORTS,
  AGENT_EFFORT_LABELS,
  AGENT_MODELS,
  AGENT_MODEL_LABELS,
  IMPLEMENTERS,
  IMPLEMENTER_LABELS,
  type AgentEffort,
  type AgentModel,
  type Implementer,
} from "@shared/constants";
import { agentEffortSchema, agentModelSchema } from "@shared/schemas";

import { Label } from "@/components/ui/input";
import { Tabs, type TabOption } from "@/components/ui/tabs";
import { useCapabilities } from "@/hooks/useCapabilities";

function Field({ labelId, label, children }: { labelId: string; label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col items-start gap-1.5">
      <Label id={labelId}>{label}</Label>
      {children}
    </div>
  );
}

interface ImplementationAgentFieldsProps {
  model: AgentModel | null;
  effort: AgentEffort | null;
  implementerModel: AgentModel | null;
  implementerEffort: AgentEffort | null;
  implementer: Implementer;
  onModelChange: (model: AgentModel | null) => void;
  onEffortChange: (effort: AgentEffort | null) => void;
  onImplementerModelChange: (model: AgentModel | null) => void;
  onImplementerEffortChange: (effort: AgentEffort | null) => void;
  onImplementerChange: (implementer: Implementer) => void;
}

/** Per-ticket implementation-agent knobs (orchestrator + implementer sub-agent) as segmented controls. */
export function ImplementationAgentFields({
  model,
  effort,
  implementerModel,
  implementerEffort,
  implementer,
  onModelChange,
  onEffortChange,
  onImplementerModelChange,
  onImplementerEffortChange,
  onImplementerChange,
}: ImplementationAgentFieldsProps) {
  const { composerAvailable, defaultModel, defaultEffort, defaultImplementerModel, defaultImplementerEffort } =
    useCapabilities();
  const id = useId();
  const modelLabelId = `${id}-model`;
  const effortLabelId = `${id}-effort`;
  const implementerModelLabelId = `${id}-implementer-model`;
  const implementerEffortLabelId = `${id}-implementer-effort`;
  const implementerLabelId = `${id}-implementer`;

  // A null per-ticket knob follows the configured default, so highlight that tab directly.
  const parsedDefaultModel = agentModelSchema.safeParse(defaultModel);
  const resolvedDefaultModel = parsedDefaultModel.success ? parsedDefaultModel.data : null;
  const parsedDefaultEffort = agentEffortSchema.safeParse(defaultEffort);
  const resolvedDefaultEffort = parsedDefaultEffort.success ? parsedDefaultEffort.data : null;
  const parsedDefaultImplementerModel = agentModelSchema.safeParse(defaultImplementerModel);
  const resolvedDefaultImplementerModel = parsedDefaultImplementerModel.success ? parsedDefaultImplementerModel.data : null;
  const parsedDefaultImplementerEffort = agentEffortSchema.safeParse(defaultImplementerEffort);
  const resolvedDefaultImplementerEffort = parsedDefaultImplementerEffort.success
    ? parsedDefaultImplementerEffort.data
    : null;

  const modelOptions: TabOption<AgentModel>[] = AGENT_MODELS.map((m) => ({ value: m, label: AGENT_MODEL_LABELS[m] }));
  const effortOptions: TabOption<AgentEffort>[] = AGENT_EFFORTS.map((e) => ({ value: e, label: AGENT_EFFORT_LABELS[e] }));
  const implementerOptions: TabOption<Implementer>[] = IMPLEMENTERS.map((i) => ({
    value: i,
    label: i === "composer" && !composerAvailable ? `${IMPLEMENTER_LABELS[i]} — Cursor non détecté` : IMPLEMENTER_LABELS[i],
    disabled: i === "composer" && !composerAvailable,
  }));

  return (
    <div className="flex flex-col gap-3">
      <Field labelId={modelLabelId} label="Modèle (orchestrateur)">
        <Tabs
          options={modelOptions}
          value={model ?? resolvedDefaultModel}
          onChange={(value) => onModelChange(value === resolvedDefaultModel ? null : value)}
          aria-labelledby={modelLabelId}
        />
      </Field>
      <Field labelId={effortLabelId} label="Effort (orchestrateur)">
        <Tabs
          options={effortOptions}
          value={effort ?? resolvedDefaultEffort}
          onChange={(value) => onEffortChange(value === resolvedDefaultEffort ? null : value)}
          aria-labelledby={effortLabelId}
        />
      </Field>
      <Field labelId={implementerLabelId} label="Implémenté par">
        <Tabs
          options={implementerOptions}
          value={implementer}
          onChange={onImplementerChange}
          aria-labelledby={implementerLabelId}
        />
      </Field>
      {implementer === "claude" && (
        <div className="flex flex-col gap-3 rounded-md border border-border/60 p-3">
          <p className="text-xs font-medium text-muted-foreground">Sous-agent implémenteur</p>
          <Field labelId={implementerModelLabelId} label="Modèle">
            <Tabs
              options={modelOptions}
              value={implementerModel ?? resolvedDefaultImplementerModel}
              onChange={(value) => onImplementerModelChange(value === resolvedDefaultImplementerModel ? null : value)}
              aria-labelledby={implementerModelLabelId}
            />
          </Field>
          <Field labelId={implementerEffortLabelId} label="Effort">
            <Tabs
              options={effortOptions}
              value={implementerEffort ?? resolvedDefaultImplementerEffort}
              onChange={(value) => onImplementerEffortChange(value === resolvedDefaultImplementerEffort ? null : value)}
              aria-labelledby={implementerEffortLabelId}
            />
          </Field>
        </div>
      )}
      {implementer === "composer" && (
        <p className="text-xs text-muted-foreground">
          {composerAvailable
            ? "Composer 2.5 écrit le code ; le modèle orchestrateur (Claude) planifie, relit et ouvre la PR."
            : "Cursor non détecté : installe-le puis `agent login` (sinon le lancement échouera)."}
        </p>
      )}
    </div>
  );
}
