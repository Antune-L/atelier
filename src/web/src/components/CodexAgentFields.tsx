import { useId } from "react";

import { DEFAULT_CODEX_EFFORT, DEFAULT_CODEX_MODEL } from "@shared/constants";
import type { CodexEffort, CodexModel } from "@shared/constants";
import { pairedRuntimeCodexEffort } from "@shared/codexCapabilities";

import { CodexConnectionStatus } from "@/components/CodexConnectionStatus";
import { Label } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Tabs } from "@/components/ui/tabs";
import { useCapabilities } from "@/hooks/useCapabilities";
import { resolveAgentDefaults } from "@/lib/agentDefaults";
import { codexEffortTabOptions, codexModelTabOptions, isCodexFastAvailable } from "@/lib/display";

interface CodexAgentFieldsProps {
  codexModel: CodexModel | null;
  codexEffort: CodexEffort | null;
  codexFast: boolean;
  fallbackModel?: CodexModel | null;
  fallbackEffort?: CodexEffort | null;
  preserveExplicit?: boolean;
  showConnectionStatus?: boolean;
  onCodexModelChange: (model: CodexModel | null) => void;
  onCodexEffortChange: (effort: CodexEffort | null) => void;
  onCodexFastChange: (fast: boolean) => void;
}

/** Codex session knobs (model + reasoning effort) as segmented controls; null follows the app default. */
export function CodexAgentFields({
  codexModel,
  codexEffort,
  codexFast,
  fallbackModel,
  fallbackEffort,
  preserveExplicit = false,
  showConnectionStatus = true,
  onCodexModelChange,
  onCodexEffortChange,
  onCodexFastChange,
}: CodexAgentFieldsProps) {
  const capabilities = useCapabilities();
  const runtime = capabilities.codex;
  const id = useId();
  const modelLabelId = `${id}-codex-model`;
  const effortLabelId = `${id}-codex-effort`;

  const { codexModel: defaultModel, codexEffort: defaultEffort } = resolveAgentDefaults(capabilities);
  const resolvedDefaultModel = fallbackModel ?? defaultModel;
  const resolvedDefaultEffort = fallbackEffort ?? defaultEffort;
  const resolvedModel = codexModel ?? resolvedDefaultModel ?? DEFAULT_CODEX_MODEL;
  const fastAvailable = isCodexFastAvailable(runtime, resolvedModel);

  // Keep the selected effort within the authenticated model's runtime capabilities.
  const changeModel = (value: CodexModel): void => {
    onCodexModelChange(!preserveExplicit && value === resolvedDefaultModel ? null : value);
    const currentEffort = codexEffort ?? resolvedDefaultEffort ?? DEFAULT_CODEX_EFFORT;
    const paired = pairedRuntimeCodexEffort(runtime, value, currentEffort);
    if (paired !== currentEffort) {
      onCodexEffortChange(!preserveExplicit && paired === resolvedDefaultEffort ? null : paired);
    }
  };

  return (
    <>
      <div className="flex flex-col items-start gap-1.5">
        <Label id={modelLabelId}>Modèle (Codex)</Label>
        <Tabs
          options={codexModelTabOptions(runtime)}
          value={resolvedModel}
          onChange={changeModel}
          aria-labelledby={modelLabelId}
        />
      </div>
      <div className="flex flex-col items-start gap-1.5">
        <Label id={effortLabelId}>Effort (Codex)</Label>
        <Tabs
          options={codexEffortTabOptions(resolvedModel, runtime)}
          value={codexEffort ?? resolvedDefaultEffort}
          onChange={(value) => onCodexEffortChange(!preserveExplicit && value === resolvedDefaultEffort ? null : value)}
          aria-labelledby={effortLabelId}
        />
      </div>
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <Switch
            checked={codexFast}
            onCheckedChange={onCodexFastChange}
            disabled={!fastAvailable && !codexFast}
            aria-labelledby={`${id}-codex-fast`}
          />
          <span id={`${id}-codex-fast`} className="text-sm">Mode FAST</span>
        </div>
        <p className="pl-11 text-xs text-muted-foreground">
          {fastAvailable
            ? "Réponses plus rapides, consommation accrue."
            : "Mode FAST indisponible pour ce modèle et ce compte."}
        </p>
      </div>
      {showConnectionStatus && <CodexConnectionStatus />}
    </>
  );
}
