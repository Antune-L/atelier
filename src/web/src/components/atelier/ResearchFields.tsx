import { useId } from "react";

import {
  ATELIER_ADVERSARIAL_SUBAGENTS,
  ORCHESTRATORS,
  RESEARCH_OPTION_KEYS,
  RESEARCH_OPTION_LABELS,
  type Orchestrator,
  type ResearchOptionKey,
} from "@shared/constants";
import { enabledResearchOptionKeys, researchOptionsFromKeys } from "@shared/schemas";
import type { ResearchOptions } from "@shared/schemas";

import { Switch } from "@/components/ui/switch";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

interface ResearchFieldsProps {
  enabled: boolean;
  options: ResearchOptions;
  /** The Atelier agent: adversarial-review sub-agents always run on its provider. */
  orchestrator: Orchestrator;
  onEnabledChange: (enabled: boolean) => void;
  onOptionsChange: (options: ResearchOptions) => void;
}

const HINT_ON = "L'agent vérifie avant de proposer.";
const HINT_OFF = "L'agent répond directement.";
const SUBAGENTS_HINT =
  "Les sous-agents utilisent le même fournisseur que l'agent de l'Atelier : change l'agent pour utiliser l'autre modèle.";

function isResearchOptionKey(value: string): value is ResearchOptionKey {
  return RESEARCH_OPTION_KEYS.some((key) => key === value);
}

/** "Réflexion préalable" switch plus the verifications the agent runs before proposing. */
export function ResearchFields({ enabled, options, orchestrator, onEnabledChange, onOptionsChange }: ResearchFieldsProps) {
  const id = useId();
  const selected = enabledResearchOptionKeys(options);

  const changeOptions = (values: string[]): void => {
    onOptionsChange(researchOptionsFromKeys(values.filter(isResearchOptionKey)));
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <Switch checked={enabled} onCheckedChange={onEnabledChange} aria-labelledby={`${id}-research`} />
        <span id={`${id}-research`} className="text-sm">Réflexion préalable</span>
        <span className="text-xs text-muted-foreground">{enabled ? HINT_ON : HINT_OFF}</span>
      </div>
      {enabled && (
        <ToggleGroup
          type="multiple"
          variant="outline"
          size="sm"
          value={selected}
          onValueChange={changeOptions}
          className="flex-wrap justify-start"
          aria-label="Vérifications préalables"
        >
          {RESEARCH_OPTION_KEYS.map((key) => (
            <ToggleGroupItem key={key} value={key} className="h-7 text-xs">
              {RESEARCH_OPTION_LABELS[key]}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      )}
      {enabled && options.adversarialReview && (
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <span id={`${id}-subagents`} className="text-xs text-muted-foreground">Sous-agents</span>
            {/* Read-only: the value follows the orchestrator, the other family stays disabled. */}
            <ToggleGroup
              type="single"
              variant="outline"
              size="sm"
              value={orchestrator}
              className="justify-start"
              aria-labelledby={`${id}-subagents`}
            >
              {ORCHESTRATORS.map((family) => (
                <ToggleGroupItem
                  key={family}
                  value={family}
                  disabled={family !== orchestrator}
                  title={family === orchestrator ? undefined : SUBAGENTS_HINT}
                  className="h-7 text-xs"
                >
                  {ATELIER_ADVERSARIAL_SUBAGENTS[family].label}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </div>
          <span className="text-xs text-muted-foreground">{SUBAGENTS_HINT}</span>
        </div>
      )}
    </div>
  );
}
