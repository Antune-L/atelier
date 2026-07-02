import { useId } from "react";

import type { CodexEffort, CodexModel } from "@shared/constants";

import { Label } from "@/components/ui/input";
import { Tabs } from "@/components/ui/tabs";
import { useCapabilities } from "@/hooks/useCapabilities";
import { resolveAgentDefaults } from "@/lib/agentDefaults";
import { CODEX_EFFORT_OPTIONS, CODEX_MODEL_OPTIONS } from "@/lib/display";

interface CodexAgentFieldsProps {
  codexModel: CodexModel | null;
  codexEffort: CodexEffort | null;
  onCodexModelChange: (model: CodexModel | null) => void;
  onCodexEffortChange: (effort: CodexEffort | null) => void;
}

/** Codex session knobs (model + reasoning effort) as segmented controls; null follows the app default. */
export function CodexAgentFields({
  codexModel,
  codexEffort,
  onCodexModelChange,
  onCodexEffortChange,
}: CodexAgentFieldsProps) {
  const capabilities = useCapabilities();
  const id = useId();
  const modelLabelId = `${id}-codex-model`;
  const effortLabelId = `${id}-codex-effort`;

  const { codexModel: defaultModel, codexEffort: defaultEffort } = resolveAgentDefaults(capabilities);

  return (
    <>
      <div className="flex flex-col items-start gap-1.5">
        <Label id={modelLabelId}>Modèle (Codex)</Label>
        <Tabs
          options={CODEX_MODEL_OPTIONS}
          value={codexModel ?? defaultModel}
          onChange={(value) => onCodexModelChange(value === defaultModel ? null : value)}
          aria-labelledby={modelLabelId}
        />
      </div>
      <div className="flex flex-col items-start gap-1.5">
        <Label id={effortLabelId}>Effort (Codex)</Label>
        <Tabs
          options={CODEX_EFFORT_OPTIONS}
          value={codexEffort ?? defaultEffort}
          onChange={(value) => onCodexEffortChange(value === defaultEffort ? null : value)}
          aria-labelledby={effortLabelId}
        />
      </div>
    </>
  );
}
