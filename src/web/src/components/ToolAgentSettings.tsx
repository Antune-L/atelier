import type { ComponentProps } from "react";

import type { AgentEffort, AgentModel } from "@shared/constants";

import { SessionDriverFields } from "@/components/SessionDriverFields";
import { Label } from "@/components/ui/input";
import { Tabs } from "@/components/ui/tabs";
import { useCapabilities } from "@/hooks/useCapabilities";
import { resolveAgentDefaults } from "@/lib/agentDefaults";
import { agentSummary } from "@/lib/atelier";
import { AGENT_EFFORT_OPTIONS, AGENT_MODEL_OPTIONS } from "@/lib/display";
import { FIELD_LABEL_CLASSES } from "@/lib/overlayStyles";

interface ToolAgentSettingsProps extends ComponentProps<typeof SessionDriverFields> {
  id: string;
  model?: AgentModel | null;
  effort?: AgentEffort | null;
  onModelChange?: (model: AgentModel | null) => void;
  onEffortChange?: (effort: AgentEffort | null) => void;
}

export function ToolAgentSettings({ id, model = null, effort = null, onModelChange, onEffortChange, ...driver }: ToolAgentSettingsProps) {
  const defaults = resolveAgentDefaults(useCapabilities());
  const summary = agentSummary({ ...driver, model, effort }, defaults);

  return (
    <section className="space-y-2 rounded-md border border-border p-3">
      <h3 className="text-sm font-medium">Agent</h3>
      <p className="text-sm">{summary}{driver.orchestrator === "codex" && driver.codexFast ? " · mode rapide" : ""}</p>
      <p className="text-xs text-muted-foreground">Les valeurs non modifiées suivent les paramètres de l’application.</p>
      <details>
        <summary className="cursor-pointer text-xs font-medium text-primary">Modifier l’agent et les modèles</summary>
        <div className="mt-3 space-y-3 border-t border-border pt-3">
          <SessionDriverFields {...driver} />
          {driver.orchestrator === "claude" && onModelChange && onEffortChange && (
            <>
              <div className="space-y-1.5">
                <Label id={`${id}-model`} className={FIELD_LABEL_CLASSES}>Modèle</Label>
                <Tabs options={AGENT_MODEL_OPTIONS} value={model ?? defaults.model} onChange={(value) => onModelChange(value === defaults.model ? null : value)} aria-labelledby={`${id}-model`} />
              </div>
              <div className="space-y-1.5">
                <Label id={`${id}-effort`} className={FIELD_LABEL_CLASSES}>Niveau de réflexion</Label>
                <Tabs options={AGENT_EFFORT_OPTIONS} value={effort ?? defaults.effort} onChange={(value) => onEffortChange(value === defaults.effort ? null : value)} aria-labelledby={`${id}-effort`} />
              </div>
            </>
          )}
        </div>
      </details>
    </section>
  );
}
