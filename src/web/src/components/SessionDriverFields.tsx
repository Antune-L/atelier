import { useId } from "react";

import { IMPLEMENTER_LABELS, type CodexEffort, type CodexModel } from "@shared/constants";
import type { SessionDriver } from "@shared/schemas";

import { CodexAgentFields } from "@/components/CodexAgentFields";
import { Label } from "@/components/ui/input";
import { Tabs, type TabOption } from "@/components/ui/tabs";
import { useCapabilities } from "@/hooks/useCapabilities";

interface SessionDriverFieldsProps {
  driver: SessionDriver;
  codexModel: CodexModel | null;
  codexEffort: CodexEffort | null;
  onDriverChange: (driver: SessionDriver) => void;
  onCodexModelChange: (model: CodexModel | null) => void;
  onCodexEffortChange: (effort: CodexEffort | null) => void;
}

/**
 * Driver picker for a review/clean/ask session (Claude or Codex — Composer only writes feature
 * code), plus the Codex model/effort knobs when Codex is selected.
 */
export function SessionDriverFields({
  driver,
  codexModel,
  codexEffort,
  onDriverChange,
  onCodexModelChange,
  onCodexEffortChange,
}: SessionDriverFieldsProps) {
  const { codexAvailable } = useCapabilities();
  const id = useId();
  const driverLabelId = `${id}-driver`;

  const options: TabOption<SessionDriver>[] = [
    { value: "claude", label: IMPLEMENTER_LABELS.claude },
    {
      value: "codex",
      label: codexAvailable ? IMPLEMENTER_LABELS.codex : `${IMPLEMENTER_LABELS.codex} — non détecté`,
      disabled: !codexAvailable,
    },
  ];

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col items-start gap-1.5">
        <Label id={driverLabelId}>Agent</Label>
        <Tabs options={options} value={driver} onChange={onDriverChange} aria-labelledby={driverLabelId} />
      </div>
      {driver === "codex" && (
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
