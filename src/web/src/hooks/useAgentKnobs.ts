import { useState } from "react";

import type { AgentEffort, AgentModel, CodexEffort, CodexModel, Implementer } from "@shared/constants";

/** A complete profile applied to the agent knobs in one batch. */
export interface AgentProfileConfigValues {
  model: AgentModel;
  effort: AgentEffort;
  implementerModel: AgentModel;
  implementerEffort: AgentEffort;
  implementer: Implementer;
  codexModel: CodexModel;
  codexEffort: CodexEffort;
}

export interface AgentKnobs {
  model: AgentModel | null;
  effort: AgentEffort | null;
  implementerModel: AgentModel | null;
  implementerEffort: AgentEffort | null;
  implementer: Implementer;
  codexModel: CodexModel | null;
  codexEffort: CodexEffort | null;
  setModel: (model: AgentModel | null) => void;
  setEffort: (effort: AgentEffort | null) => void;
  setImplementerModel: (model: AgentModel | null) => void;
  setImplementerEffort: (effort: AgentEffort | null) => void;
  setImplementer: (implementer: Implementer) => void;
  setCodexModel: (model: CodexModel | null) => void;
  setCodexEffort: (effort: CodexEffort | null) => void;
  applyProfile: (config: AgentProfileConfigValues) => void;
  reset: () => void;
}

/**
 * Per-ticket implementation-agent knobs (model/effort/implementer + sub-agent model/effort + Codex
 * model/effort) with profile application and reset. A null knob means "fall back to server config".
 * Shared by the new ticket and CSV import panels.
 */
export function useAgentKnobs(): AgentKnobs {
  const [model, setModel] = useState<AgentModel | null>(null);
  const [effort, setEffort] = useState<AgentEffort | null>(null);
  const [implementerModel, setImplementerModel] = useState<AgentModel | null>(null);
  const [implementerEffort, setImplementerEffort] = useState<AgentEffort | null>(null);
  const [implementer, setImplementer] = useState<Implementer>("claude");
  const [codexModel, setCodexModel] = useState<CodexModel | null>(null);
  const [codexEffort, setCodexEffort] = useState<CodexEffort | null>(null);

  const applyProfile = (config: AgentProfileConfigValues): void => {
    setModel(config.model);
    setEffort(config.effort);
    setImplementerModel(config.implementerModel);
    setImplementerEffort(config.implementerEffort);
    setImplementer(config.implementer);
    setCodexModel(config.codexModel);
    setCodexEffort(config.codexEffort);
  };

  const reset = (): void => {
    setModel(null);
    setEffort(null);
    setImplementerModel(null);
    setImplementerEffort(null);
    setImplementer("claude");
    setCodexModel(null);
    setCodexEffort(null);
  };

  return {
    model,
    effort,
    implementerModel,
    implementerEffort,
    implementer,
    codexModel,
    codexEffort,
    setModel,
    setEffort,
    setImplementerModel,
    setImplementerEffort,
    setImplementer,
    setCodexModel,
    setCodexEffort,
    applyProfile,
    reset,
  };
}
