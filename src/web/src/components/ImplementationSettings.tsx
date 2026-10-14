import { IMPLEMENTER_LABELS } from "@shared/constants";

import { AgentProfileConfig } from "@/components/AgentProfileConfig";
import type { AgentKnobs } from "@/hooks/useAgentKnobs";
import { useCapabilities } from "@/hooks/useCapabilities";
import { resolveAgentDefaults } from "@/lib/agentDefaults";
import { agentSummary } from "@/lib/atelier";

export function ImplementationSettings({ agent }: { agent: AgentKnobs }) {
  const defaults = resolveAgentDefaults(useCapabilities());
  let implementer = IMPLEMENTER_LABELS[agent.implementer];
  if (agent.implementer !== "composer") {
    implementer = agentSummary({
      orchestrator: agent.implementer,
      model: agent.implementerModel,
      effort: agent.implementerEffort,
      codexModel: agent.codexImplementerModel ?? agent.codexModel,
      codexEffort: agent.codexImplementerEffort ?? agent.codexEffort,
      codexFast: agent.codexImplementerFast ?? agent.codexFast,
    }, { ...defaults, model: defaults.implementerModel, effort: defaults.implementerEffort });
    if (agent.implementer === "codex" && (agent.codexImplementerFast ?? agent.codexFast)) {
      implementer += " · mode rapide";
    }
  }

  return (
    <section className="space-y-2 rounded-md border border-border p-3">
      <h3 className="text-sm font-medium">Profil et agent</h3>
      <dl className="space-y-1 text-xs">
        <div className="flex flex-wrap justify-between gap-2"><dt className="text-muted-foreground">Coordination</dt><dd>{agentSummary(agent, defaults)}{agent.orchestrator === "codex" && agent.codexFast ? " · mode rapide" : ""}</dd></div>
        <div className="flex flex-wrap justify-between gap-2"><dt className="text-muted-foreground">Implémentation</dt><dd>{implementer}</dd></div>
      </dl>
      <p className="text-xs text-muted-foreground">Les modèles non modifiés suivent les paramètres de l’application.</p>
      <details>
        <summary className="cursor-pointer text-xs font-medium text-primary">Choisir un profil ou modifier les agents</summary>
        <div className="mt-3 border-t border-border pt-3">
          <AgentProfileConfig
            orchestrator={agent.orchestrator}
            model={agent.model}
            effort={agent.effort}
            implementerModel={agent.implementerModel}
            implementerEffort={agent.implementerEffort}
            implementer={agent.implementer}
            codexModel={agent.codexModel}
            codexEffort={agent.codexEffort}
            codexFast={agent.codexFast}
            codexImplementerModel={agent.codexImplementerModel}
            codexImplementerEffort={agent.codexImplementerEffort}
            codexImplementerFast={agent.codexImplementerFast}
            onOrchestratorChange={agent.setOrchestrator}
            onModelChange={agent.setModel}
            onEffortChange={agent.setEffort}
            onImplementerModelChange={agent.setImplementerModel}
            onImplementerEffortChange={agent.setImplementerEffort}
            onImplementerChange={agent.setImplementer}
            onCodexModelChange={agent.setCodexModel}
            onCodexEffortChange={agent.setCodexEffort}
            onCodexFastChange={agent.setCodexFast}
            onCodexImplementerModelChange={agent.setCodexImplementerModel}
            onCodexImplementerEffortChange={agent.setCodexImplementerEffort}
            onCodexImplementerFastChange={agent.setCodexImplementerFast}
            onApplyProfile={agent.applyProfile}
          />
        </div>
      </details>
    </section>
  );
}
