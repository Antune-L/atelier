import { useId } from "react";

import { SessionDriverFields } from "@/components/SessionDriverFields";
import { Label } from "@/components/ui/input";
import { Tabs } from "@/components/ui/tabs";
import { useCapabilities } from "@/hooks/useCapabilities";
import { resolveAgentDefaults } from "@/lib/agentDefaults";
import type { AtelierAgentSettings } from "@/lib/atelier";
import { AGENT_EFFORT_FULL_OPTIONS, AGENT_MODEL_FULL_OPTIONS } from "@/lib/display";
import { FIELD_LABEL_CLASSES } from "@/lib/overlayStyles";

interface AtelierAgentFieldsProps {
  value: AtelierAgentSettings;
  onChange: (patch: Partial<AtelierAgentSettings>) => void;
}

/** Agent picker of an Atelier session: Claude or Codex, with the matching model and effort knobs. */
export function AtelierAgentFields({ value, onChange }: AtelierAgentFieldsProps) {
  const capabilities = useCapabilities();
  const id = useId();
  const defaults = resolveAgentDefaults(capabilities);

  return (
    <div className="flex flex-col gap-3">
      <SessionDriverFields
        orchestrator={value.orchestrator}
        codexModel={value.codexModel}
        codexEffort={value.codexEffort}
        codexFast={value.codexFast}
        onOrchestratorChange={(orchestrator) => onChange({ orchestrator })}
        onCodexModelChange={(codexModel) => onChange({ codexModel })}
        onCodexEffortChange={(codexEffort) => onChange({ codexEffort })}
        onCodexFastChange={(codexFast) => onChange({ codexFast })}
      />
      {value.orchestrator === "claude" && (
        <>
          <div className="flex flex-col items-start gap-1.5">
            <Label id={`${id}-model`} className={FIELD_LABEL_CLASSES}>Modèle</Label>
            <Tabs
              options={AGENT_MODEL_FULL_OPTIONS}
              value={value.model ?? defaults.model}
              onChange={(model) => onChange({ model: model === defaults.model ? null : model })}
              aria-labelledby={`${id}-model`}
            />
          </div>
          <div className="flex flex-col items-start gap-1.5">
            <Label id={`${id}-effort`} className={FIELD_LABEL_CLASSES}>Réflexion (effort)</Label>
            <Tabs
              options={AGENT_EFFORT_FULL_OPTIONS}
              value={value.effort ?? defaults.effort}
              onChange={(effort) => onChange({ effort: effort === defaults.effort ? null : effort })}
              aria-labelledby={`${id}-effort`}
            />
          </div>
        </>
      )}
    </div>
  );
}
