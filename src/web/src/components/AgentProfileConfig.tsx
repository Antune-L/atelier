import { useId } from "react";

import {
  CUSTOM_PROFILE_ID,
  CUSTOM_PROFILE_LABEL,
  type AgentEffort,
  type AgentModel,
  type Implementer,
} from "@shared/constants";

import { ImplementationAgentFields } from "@/components/ImplementationAgentFields";
import { Label } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useCapabilities } from "@/hooks/useCapabilities";
import { useProfiles } from "@/hooks/useProfiles";
import { resolveAgentDefaults } from "@/lib/agentDefaults";

interface AgentProfileConfigProps {
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
  /** Apply a whole profile at once (lets a single call site batch all knobs). */
  onApplyProfile: (config: {
    model: AgentModel;
    effort: AgentEffort;
    implementerModel: AgentModel;
    implementerEffort: AgentEffort;
    implementer: Implementer;
  }) => void;
}

/**
 * Profile picker over the implementation-agent knobs: a stored preset selects model/effort/implementer
 * in one click, while the "Configuration avancée" collapse exposes the raw knobs. Editing any knob so it
 * no longer matches a profile surfaces the "Personnalisé" entry (derived, never persisted).
 */
export function AgentProfileConfig({
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

  const selectedProfile = profiles.find(
    (p) =>
      p.model === effectiveModel &&
      p.effort === effectiveEffort &&
      p.implementer === implementer &&
      // Implementer knobs only differentiate profiles in claude mode (ignored under composer/codex).
      (implementer !== "claude" ||
        (p.implementerModel === effectiveImplementerModel && p.implementerEffort === effectiveImplementerEffort)),
  );
  const selectedId = selectedProfile?.id ?? CUSTOM_PROFILE_ID;

  const onSelectProfile = (value: string): void => {
    const profile = profiles.find((p) => p.id === value);
    if (!profile) return;
    onApplyProfile({
      model: profile.model,
      effort: profile.effort,
      implementerModel: profile.implementerModel,
      implementerEffort: profile.implementerEffort,
      implementer: profile.implementer,
    });
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col items-start gap-1.5">
        <Label id={profileLabelId}>Profil</Label>
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
        <summary className="cursor-pointer text-sm font-medium text-muted-foreground">Configuration avancée</summary>
        <div className="mt-3">
          <ImplementationAgentFields
            model={model}
            effort={effort}
            implementerModel={implementerModel}
            implementerEffort={implementerEffort}
            implementer={implementer}
            onModelChange={onModelChange}
            onEffortChange={onEffortChange}
            onImplementerModelChange={onImplementerModelChange}
            onImplementerEffortChange={onImplementerEffortChange}
            onImplementerChange={onImplementerChange}
          />
        </div>
      </details>
    </div>
  );
}
