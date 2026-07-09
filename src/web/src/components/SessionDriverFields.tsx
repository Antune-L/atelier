import { useId } from "react";

import { ORCHESTRATOR_LABELS, type CodexEffort, type CodexModel, type Orchestrator } from "@shared/constants";

import { CodexAgentFields } from "@/components/CodexAgentFields";
import { Label } from "@/components/ui/input";
import { Tabs, type TabOption } from "@/components/ui/tabs";
import { useCapabilities } from "@/hooks/useCapabilities";

interface SessionDriverFieldsProps {
  orchestrator: Orchestrator;
  codexModel: CodexModel | null;
  codexEffort: CodexEffort | null;
  onOrchestratorChange: (orchestrator: Orchestrator) => void;
  onCodexModelChange: (model: CodexModel | null) => void;
  onCodexEffortChange: (effort: CodexEffort | null) => void;
}

/**
 * Orchestrator picker for a review/clean/ask session (Claude or Codex — Composer only writes feature
 * code), plus the Codex model/effort knobs when Codex is selected.
 */
export function SessionDriverFields({
  orchestrator,
  codexModel,
  codexEffort,
  onOrchestratorChange,
  onCodexModelChange,
  onCodexEffortChange,
}: SessionDriverFieldsProps) {
  const { codexAvailable } = useCapabilities();
  const id = useId();
  const orchestratorLabelId = `${id}-orchestrator`;

  const options: TabOption<Orchestrator>[] = [
    { value: "claude", label: ORCHESTRATOR_LABELS.claude },
    {
      value: "codex",
      label: codexAvailable ? ORCHESTRATOR_LABELS.codex : `${ORCHESTRATOR_LABELS.codex} — non détecté`,
      disabled: !codexAvailable,
    },
  ];

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col items-start gap-1.5">
        <Label id={orchestratorLabelId}>Agent</Label>
        <Tabs
          options={options}
          value={orchestrator}
          onChange={onOrchestratorChange}
          aria-labelledby={orchestratorLabelId}
        />
      </div>
      {orchestrator === "codex" && (
        <CodexAgentFields
          codexModel={codexModel}
          codexEffort={codexEffort}
          onCodexModelChange={onCodexModelChange}
          onCodexEffortChange={onCodexEffortChange}
        />
      )}
    </div>
  );
}
