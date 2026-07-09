import { useId } from "react";

import { DEFAULT_CODEX_EFFORT, DEFAULT_CODEX_MODEL, pairedCodexEffort } from "@shared/constants";
import type { CodexEffort, CodexModel } from "@shared/constants";

import { Label } from "@/components/ui/input";
import { Tabs } from "@/components/ui/tabs";
import { useCapabilities } from "@/hooks/useCapabilities";
import { resolveAgentDefaults } from "@/lib/agentDefaults";
import { CODEX_MODEL_OPTIONS, codexEffortTabOptions } from "@/lib/display";

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
  const resolvedModel = codexModel ?? defaultModel ?? DEFAULT_CODEX_MODEL;

  // Picking a model re-pairs the effort: an effort the new model doesn't support (e.g. ultra on
  // Luna) clamps to the model's strongest supported one.
  const changeModel = (value: CodexModel): void => {
    onCodexModelChange(value === defaultModel ? null : value);
    const currentEffort = codexEffort ?? defaultEffort ?? DEFAULT_CODEX_EFFORT;
    const paired = pairedCodexEffort(value, currentEffort);
    if (paired !== currentEffort) onCodexEffortChange(paired === defaultEffort ? null : paired);
  };

  return (
    <>
      <div className="flex flex-col items-start gap-1.5">
        <Label id={modelLabelId}>Modèle (Codex)</Label>
        <Tabs
          options={CODEX_MODEL_OPTIONS}
          value={resolvedModel}
          onChange={changeModel}
          aria-labelledby={modelLabelId}
        />
      </div>
      <div className="flex flex-col items-start gap-1.5">
        <Label id={effortLabelId}>Effort (Codex)</Label>
        <Tabs
          options={codexEffortTabOptions(resolvedModel)}
          value={codexEffort ?? defaultEffort}
          onChange={(value) => onCodexEffortChange(value === defaultEffort ? null : value)}
          aria-labelledby={effortLabelId}
        />
      </div>
    </>
  );
}
