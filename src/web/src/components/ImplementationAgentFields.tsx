import { useId } from "react";

import {
  type AgentEffort,
  type AgentModel,
  type CodexEffort,
  type CodexModel,
  type Implementer,
  type Orchestrator,
} from "@shared/constants";

import { CodexAgentFields } from "@/components/CodexAgentFields";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/input";
import { Tabs } from "@/components/ui/tabs";
import { useCapabilities } from "@/hooks/useCapabilities";
import { resolveAgentDefaults } from "@/lib/agentDefaults";
import {
  AGENT_EFFORT_FULL_OPTIONS,
  AGENT_EFFORT_OPTIONS,
  AGENT_MODEL_FULL_OPTIONS,
  AGENT_MODEL_OPTIONS,
  implementerTabOptions,
  orchestratorTabOptions,
  type KnobLabelStyle,
} from "@/lib/display";

function Field({ labelId, label, children }: { labelId: string; label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col items-start gap-1.5">
      <Label id={labelId}>{label}</Label>
      {children}
    </div>
  );
}

interface ImplementationAgentFieldsProps {
  orchestrator: Orchestrator;
  model: AgentModel | null;
  effort: AgentEffort | null;
  implementerModel: AgentModel | null;
  implementerEffort: AgentEffort | null;
  implementer: Implementer;
  codexModel: CodexModel | null;
  codexEffort: CodexEffort | null;
  codexFast: boolean;
  codexImplementerModel: CodexModel | null;
  codexImplementerEffort: CodexEffort | null;
  codexImplementerFast: boolean | null;
  onOrchestratorChange: (orchestrator: Orchestrator) => void;
  onModelChange: (model: AgentModel | null) => void;
  onEffortChange: (effort: AgentEffort | null) => void;
  onImplementerModelChange: (model: AgentModel | null) => void;
  onImplementerEffortChange: (effort: AgentEffort | null) => void;
  onImplementerChange: (implementer: Implementer) => void;
  onCodexModelChange: (model: CodexModel | null) => void;
  onCodexEffortChange: (effort: CodexEffort | null) => void;
  onCodexFastChange: (fast: boolean) => void;
  onCodexImplementerModelChange: (model: CodexModel | null) => void;
  onCodexImplementerEffortChange: (effort: CodexEffort | null) => void;
  onCodexImplementerFastChange: (fast: boolean | null) => void;
  labelStyle?: KnobLabelStyle;
}

/** Per-ticket implementation-agent knobs (orchestrator + implementer sub-agent) as segmented controls. */
export function ImplementationAgentFields({
  orchestrator,
  model,
  effort,
  implementerModel,
  implementerEffort,
  implementer,
  codexModel,
  codexEffort,
  codexFast,
  codexImplementerModel,
  codexImplementerEffort,
  codexImplementerFast,
  onOrchestratorChange,
  onModelChange,
  onEffortChange,
  onImplementerModelChange,
  onImplementerEffortChange,
  onImplementerChange,
  onCodexModelChange,
  onCodexEffortChange,
  onCodexFastChange,
  onCodexImplementerModelChange,
  onCodexImplementerEffortChange,
  onCodexImplementerFastChange,
  labelStyle = "short",
}: ImplementationAgentFieldsProps) {
  const capabilities = useCapabilities();
  const { composerAvailable, codexAvailable } = capabilities;
  const id = useId();
  const orchestratorLabelId = `${id}-orchestrator`;
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
    codexModel: resolvedDefaultCodexModel,
    codexEffort: resolvedDefaultCodexEffort,
  } = resolveAgentDefaults(capabilities);

  const isFullLabels = labelStyle === "full";
  const modelOptions = isFullLabels ? AGENT_MODEL_FULL_OPTIONS : AGENT_MODEL_OPTIONS;
  const effortOptions = isFullLabels ? AGENT_EFFORT_FULL_OPTIONS : AGENT_EFFORT_OPTIONS;
  const orchestratorOptions = orchestratorTabOptions(codexAvailable);
  const implementerOptions = implementerTabOptions(orchestrator, composerAvailable, codexAvailable);
  const effectiveCodexModel = codexModel ?? resolvedDefaultCodexModel;
  const effectiveCodexEffort = codexEffort ?? resolvedDefaultCodexEffort;
  const inheritsCodexSettings = codexImplementerModel === null && codexImplementerEffort === null && codexImplementerFast === null;
  const inheritedCodexFields = [
    codexImplementerModel === null ? "modèle" : null,
    codexImplementerEffort === null ? "effort" : null,
    codexImplementerFast === null ? "FAST" : null,
  ].filter((field) => field !== null);
  const codexImplementerHint = inheritedCodexFields.length > 0
    ? `Héritage des réglages Codex du ticket : ${inheritedCodexFields.join(", ")}.`
    : "Modèle, effort et FAST indépendants de l’orchestrateur.";

  return (
    <div className="flex flex-col gap-3">
      <Field labelId={orchestratorLabelId} label="Orchestrateur">
        <Tabs
          options={orchestratorOptions}
          value={orchestrator}
          onChange={onOrchestratorChange}
          aria-labelledby={orchestratorLabelId}
        />
      </Field>
      {orchestrator === "claude" && (
        <>
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
        </>
      )}
      {orchestrator === "codex" && (
        <div className="flex flex-col gap-3 rounded-md border border-border/60 p-3">
          <p className="text-xs font-medium text-muted-foreground">Orchestrateur Codex</p>
          <CodexAgentFields
            codexModel={codexModel}
            codexEffort={codexEffort}
            codexFast={codexFast}
            labelStyle={labelStyle}
            onCodexModelChange={onCodexModelChange}
            onCodexEffortChange={onCodexEffortChange}
            onCodexFastChange={onCodexFastChange}
          />
          <p className="text-xs text-muted-foreground">
            {codexAvailable
              ? "Codex pilote la session de bout en bout (planification, implémentation, review, tests, PR) — Claude n'intervient pas."
              : "Codex non détecté : installe le CLI puis authentifie-toi (CODEX_API_KEY ou `codex login`) (sinon le lancement échouera)."}
          </p>
        </div>
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
      {implementer === "codex" && (
        <div className="flex flex-col gap-3 rounded-md border border-border/60 p-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-medium text-muted-foreground">
              {orchestrator === "codex" ? "Sous-agent implémenteur Codex" : "Session Codex déléguée"}
            </p>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                if (inheritsCodexSettings) {
                  if (effectiveCodexModel) onCodexImplementerModelChange(effectiveCodexModel);
                  if (effectiveCodexEffort) onCodexImplementerEffortChange(effectiveCodexEffort);
                  onCodexImplementerFastChange(codexFast);
                } else {
                  onCodexImplementerModelChange(null);
                  onCodexImplementerEffortChange(null);
                  onCodexImplementerFastChange(null);
                }
              }}
            >
              {inheritsCodexSettings ? "Personnaliser" : "Hériter des réglages Codex"}
            </Button>
          </div>
          <CodexAgentFields
            codexModel={codexImplementerModel}
            codexEffort={codexImplementerEffort}
            codexFast={codexImplementerFast ?? codexFast}
            fallbackModel={codexModel ?? resolvedDefaultCodexModel}
            fallbackEffort={codexEffort ?? resolvedDefaultCodexEffort}
            preserveExplicit
            showConnectionStatus={orchestrator !== "codex"}
            labelStyle={labelStyle}
            onCodexModelChange={onCodexImplementerModelChange}
            onCodexEffortChange={onCodexImplementerEffortChange}
            onCodexFastChange={onCodexImplementerFastChange}
          />
          <p className="text-xs text-muted-foreground">
            {codexImplementerHint}
          </p>
        </div>
      )}
    </div>
  );
}
