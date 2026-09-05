import { useState } from "react";

import type { AgentEffort, AgentModel, CodexEffort, CodexModel, Implementer, Orchestrator } from "@shared/constants";

import { useCapabilities } from "@/hooks/useCapabilities";
import { pairedImplementer } from "@/lib/agentPairing";

/** A complete profile applied to the agent knobs in one batch. */
export interface AgentProfileConfigValues {
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
}

export interface AgentKnobs {
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
  setOrchestrator: (orchestrator: Orchestrator) => void;
  setModel: (model: AgentModel | null) => void;
  setEffort: (effort: AgentEffort | null) => void;
  setImplementerModel: (model: AgentModel | null) => void;
  setImplementerEffort: (effort: AgentEffort | null) => void;
  setImplementer: (implementer: Implementer) => void;
  setCodexModel: (model: CodexModel | null) => void;
  setCodexEffort: (effort: CodexEffort | null) => void;
  setCodexFast: (fast: boolean) => void;
  setCodexImplementerModel: (model: CodexModel | null) => void;
  setCodexImplementerEffort: (effort: CodexEffort | null) => void;
  setCodexImplementerFast: (fast: boolean | null) => void;
  applyProfile: (config: AgentProfileConfigValues) => void;
  reset: () => void;
}

/**
 * Per-ticket implementation-agent knobs (orchestrator + model/effort/implementer + sub-agent
 * model/effort + Codex model/effort) with profile application and reset. A null knob means "fall
 * back to server config". Shared by the new ticket and CSV import panels.
 */
export function useAgentKnobs(): AgentKnobs {
  const capabilities = useCapabilities();
  const [orchestrator, setOrchestratorState] = useState<Orchestrator>("claude");
  const [model, setModel] = useState<AgentModel | null>(null);
  const [effort, setEffort] = useState<AgentEffort | null>(null);
  const [implementerModel, setImplementerModel] = useState<AgentModel | null>(null);
  const [implementerEffort, setImplementerEffort] = useState<AgentEffort | null>(null);
  const [implementer, setImplementer] = useState<Implementer>("claude");
  const [codexModel, setCodexModel] = useState<CodexModel | null>(null);
  const [codexEffort, setCodexEffort] = useState<CodexEffort | null>(null);
  const [codexFastOverride, setCodexFast] = useState<boolean | null>(null);
  const codexFast = codexFastOverride ?? capabilities.defaultCodexFast;
  const [codexImplementerModel, setCodexImplementerModel] = useState<CodexModel | null>(null);
  const [codexImplementerEffort, setCodexImplementerEffort] = useState<CodexEffort | null>(null);
  const [codexImplementerFast, setCodexImplementerFast] = useState<boolean | null>(null);

  // Picking an orchestrator re-pairs the implementer (isAllowedAgentPair): codex pilots only codex,
  // claude accepts any implementer, so the choice is preserved.
  const setOrchestrator = (next: Orchestrator): void => {
    setOrchestratorState(next);
    setImplementer((current) => pairedImplementer(next, current));
  };

  const applyProfile = (config: AgentProfileConfigValues): void => {
    setOrchestratorState(config.orchestrator);
    setModel(config.model);
    setEffort(config.effort);
    setImplementerModel(config.implementerModel);
    setImplementerEffort(config.implementerEffort);
    setImplementer(config.implementer);
    setCodexModel(config.codexModel);
    setCodexEffort(config.codexEffort);
    setCodexFast(config.codexFast);
    setCodexImplementerModel(config.codexImplementerModel);
    setCodexImplementerEffort(config.codexImplementerEffort);
    setCodexImplementerFast(config.codexImplementerFast);
  };

  const reset = (): void => {
    setOrchestratorState("claude");
    setModel(null);
    setEffort(null);
    setImplementerModel(null);
    setImplementerEffort(null);
    setImplementer("claude");
    setCodexModel(null);
    setCodexEffort(null);
    setCodexFast(null);
    setCodexImplementerModel(null);
    setCodexImplementerEffort(null);
    setCodexImplementerFast(null);
  };

  return {
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
    setOrchestrator,
    setModel,
    setEffort,
    setImplementerModel,
    setImplementerEffort,
    setImplementer,
    setCodexModel,
    setCodexEffort,
    setCodexFast,
    setCodexImplementerModel,
    setCodexImplementerEffort,
    setCodexImplementerFast,
    applyProfile,
    reset,
  };
}
