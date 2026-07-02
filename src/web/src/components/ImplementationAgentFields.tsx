import { useId } from "react";

import {
  IMPLEMENTERS,
  IMPLEMENTER_LABELS,
  type AgentEffort,
  type AgentModel,
  type Implementer,
} from "@shared/constants";

import { Label } from "@/components/ui/input";
import { Tabs, type TabOption } from "@/components/ui/tabs";
import { useCapabilities } from "@/hooks/useCapabilities";
import { resolveAgentDefaults } from "@/lib/agentDefaults";
import { AGENT_EFFORT_OPTIONS, AGENT_MODEL_OPTIONS } from "@/lib/display";

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
  const capabilities = useCapabilities();
  const { composerAvailable, codexAvailable } = capabilities;
  const id = useId();
  const modelLabelId = `${id}-model`;
  const effortLabelId = `${id}-effort`;
  const implementerModelLabelId = `${id}-implementer-model`;
  const implementerEffortLabelId = `${id}-implementer-effort`;
  const implementerLabelId = `${id}-implementer`;

  // A null per-ticket knob follows the configured default, so highlight that tab directly.
  const {
    model: resolvedDefaultModel,
    effort: resolvedDefaultEffort,
    implementerModel: resolvedDefaultImplementerModel,
    implementerEffort: resolvedDefaultImplementerEffort,
  } = resolveAgentDefaults(capabilities);

  const implementerOptions: TabOption<Implementer>[] = IMPLEMENTERS.map((i) => {
    if (i === "composer") {
      return {
        value: i,
        label: composerAvailable ? IMPLEMENTER_LABELS[i] : `${IMPLEMENTER_LABELS[i]} — Cursor non détecté`,
        disabled: !composerAvailable,
      };
    }
    if (i === "codex") {
      return {
        value: i,
        label: codexAvailable ? IMPLEMENTER_LABELS[i] : `${IMPLEMENTER_LABELS[i]} — Codex non détecté`,
        disabled: !codexAvailable,
      };
    }
    return { value: i, label: IMPLEMENTER_LABELS[i] };
  });

  return (
    <div className="flex flex-col gap-3">
      {implementer !== "codex" && (
        <>
          <Field labelId={modelLabelId} label="Modèle (orchestrateur)">
            <Tabs
              options={AGENT_MODEL_OPTIONS}
              value={model ?? resolvedDefaultModel}
              onChange={(value) => onModelChange(value === resolvedDefaultModel ? null : value)}
              aria-labelledby={modelLabelId}
            />
          </Field>
          <Field labelId={effortLabelId} label="Effort (orchestrateur)">
            <Tabs
              options={AGENT_EFFORT_OPTIONS}
              value={effort ?? resolvedDefaultEffort}
              onChange={(value) => onEffortChange(value === resolvedDefaultEffort ? null : value)}
              aria-labelledby={effortLabelId}
            />
          </Field>
        </>
      )}
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
              options={AGENT_MODEL_OPTIONS}
              value={implementerModel ?? resolvedDefaultImplementerModel}
              onChange={(value) => onImplementerModelChange(value === resolvedDefaultImplementerModel ? null : value)}
              aria-labelledby={implementerModelLabelId}
            />
          </Field>
          <Field labelId={implementerEffortLabelId} label="Effort">
            <Tabs
              options={AGENT_EFFORT_OPTIONS}
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
      {implementer === "codex" && (
        <p className="text-xs text-muted-foreground">
          {codexAvailable
            ? "Codex pilote la session de bout en bout (planification, implémentation, review, tests, PR) — Claude n'intervient pas."
            : "Codex non détecté : installe le CLI puis authentifie-toi (CODEX_API_KEY ou `codex login`) (sinon le lancement échouera)."}
        </p>
      )}
    </div>
  );
}
