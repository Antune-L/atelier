import { useId } from "react";

import {
  CUSTOM_PROFILE_ID,
  CUSTOM_PROFILE_LABEL,
  type AgentEffort,
  type AgentModel,
  type CodexEffort,
  type CodexModel,
  type Implementer,
  type Orchestrator,
} from "@shared/constants";

import { ImplementationAgentFields } from "@/components/ImplementationAgentFields";
import { Label } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useCapabilities } from "@/hooks/useCapabilities";
import { useProfiles } from "@/hooks/useProfiles";
import { resolveAgentDefaults } from "@/lib/agentDefaults";
import { FIELD_LABEL_CLASSES } from "@/lib/overlayStyles";
import { matchesCodexImplementer } from "@/lib/profileMatching";
import { cn } from "@/lib/utils";

interface AgentProfileConfigProps {
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
  /** Apply a whole profile at once (lets a single call site batch all knobs). */
  onApplyProfile: (config: {
    orchestrator: Orchestrator;
    model: AgentModel;
    effort: AgentEffort;
    implementerModel: AgentModel;
    implementerEffort: AgentEffort;
    implementer: Implementer;
    codexModel: CodexModel;
    codexEffort: CodexEffort;
    codexFast: boolean;
    codexImplementerModel: CodexModel | null;
    codexImplementerEffort: CodexEffort | null;
    codexImplementerFast: boolean | null;
  }) => void;
}

/**
 * Profile picker over the implementation-agent knobs: a stored preset selects model/effort/implementer
 * in one click, while the "Configuration avancée" collapse exposes the raw knobs. Editing any knob so it
 * no longer matches a profile surfaces the "Personnalisé" entry (derived, never persisted).
 */
export function AgentProfileConfig({
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
  onApplyProfile,
}: AgentProfileConfigProps) {
  const profiles = useProfiles();
  const capabilities = useCapabilities();
  const id = useId();
  const profileLabelId = `${id}-profile`;

  // A null knob follows the configured default; resolve it before matching a stored profile.
  const defaults = resolveAgentDefaults(capabilities);
  const effectiveModel = model ?? defaults.model;
  const effectiveEffort = effort ?? defaults.effort;
  const effectiveImplementerModel = implementerModel ?? defaults.implementerModel;
  const effectiveImplementerEffort = implementerEffort ?? defaults.implementerEffort;
  const effectiveCodexModel = codexModel ?? defaults.codexModel;
  const effectiveCodexEffort = codexEffort ?? defaults.codexEffort;

  const selectedProfile = profiles.find((p) => {
    if (p.orchestrator !== orchestrator) return false;
    // Codex orchestrator: the Claude orchestrator/implementer knobs are ignored, only the Codex pair counts.
    if (orchestrator === "codex") {
      return p.codexModel === effectiveCodexModel && p.codexEffort === effectiveCodexEffort && p.codexFast === codexFast
        && matchesCodexImplementer(p, { codexImplementerModel, codexImplementerEffort, codexImplementerFast });
    }
    if (p.implementer !== implementer) return false;
    if (p.model !== effectiveModel || p.effort !== effectiveEffort) return false;
    if (implementer === "claude") {
      return p.implementerModel === effectiveImplementerModel && p.implementerEffort === effectiveImplementerEffort;
    }
    if (implementer === "codex") {
      return p.codexModel === effectiveCodexModel && p.codexEffort === effectiveCodexEffort && p.codexFast === codexFast
        && matchesCodexImplementer(p, { codexImplementerModel, codexImplementerEffort, codexImplementerFast });
    }
    return true;
  });
  const selectedId = selectedProfile?.id ?? CUSTOM_PROFILE_ID;

  const onSelectProfile = (value: string): void => {
    const profile = profiles.find((p) => p.id === value);
    if (!profile) return;
    onApplyProfile({
      orchestrator: profile.orchestrator,
      model: profile.model,
      effort: profile.effort,
      implementerModel: profile.implementerModel,
      implementerEffort: profile.implementerEffort,
      implementer: profile.implementer,
      codexModel: profile.codexModel,
      codexEffort: profile.codexEffort,
      codexFast: profile.codexFast,
      codexImplementerModel: profile.codexImplementerModel,
      codexImplementerEffort: profile.codexImplementerEffort,
      codexImplementerFast: profile.codexImplementerFast,
    });
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col items-start gap-1.5">
        <Label id={profileLabelId} className={FIELD_LABEL_CLASSES}>Profil</Label>
        <Select
          aria-labelledby={profileLabelId}
          className="w-full"
          value={selectedId}
          onChange={(e) => onSelectProfile(e.target.value)}
        >
          {selectedId === CUSTOM_PROFILE_ID && <option value={CUSTOM_PROFILE_ID}>{CUSTOM_PROFILE_LABEL}</option>}
          {profiles.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </Select>
      </div>
      <details className="rounded-md border bg-muted/30 px-3 py-2">
        <summary className={cn("cursor-pointer", FIELD_LABEL_CLASSES)}>Configuration avancée</summary>
        <div className="mt-3">
          <ImplementationAgentFields
            orchestrator={orchestrator}
            model={model}
            effort={effort}
            implementerModel={implementerModel}
            implementerEffort={implementerEffort}
            implementer={implementer}
            codexModel={codexModel}
            codexEffort={codexEffort}
            codexFast={codexFast}
            codexImplementerModel={codexImplementerModel}
            codexImplementerEffort={codexImplementerEffort}
            codexImplementerFast={codexImplementerFast}
            onOrchestratorChange={onOrchestratorChange}
            onModelChange={onModelChange}
            onEffortChange={onEffortChange}
            onImplementerModelChange={onImplementerModelChange}
            onImplementerEffortChange={onImplementerEffortChange}
            onImplementerChange={onImplementerChange}
            onCodexModelChange={onCodexModelChange}
            onCodexEffortChange={onCodexEffortChange}
            onCodexFastChange={onCodexFastChange}
            onCodexImplementerModelChange={onCodexImplementerModelChange}
            onCodexImplementerEffortChange={onCodexImplementerEffortChange}
            onCodexImplementerFastChange={onCodexImplementerFastChange}
          />
        </div>
      </details>
    </div>
  );
}
