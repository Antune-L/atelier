import type { ReactNode } from "react";

import { IMPLEMENTER_LABELS, type Implementer, type Orchestrator } from "@shared/constants";

import { ProviderLogo } from "@/components/usage/ProviderLogo";
import { agentPairLabel } from "@/lib/display";

const LOGO_CLASS = "h-3.5 w-3.5";

export function AgentPairLabel({ orchestrator, implementer }: { orchestrator: Orchestrator; implementer: Implementer }): ReactNode {
  const label = agentPairLabel(orchestrator, implementer);
  return (
    <span className="inline-flex items-center gap-1" title={label} aria-label={label} role="img">
      <ProviderLogo provider={orchestrator} className={LOGO_CLASS} />
      {implementer !== orchestrator && (
        <>
          <span aria-hidden="true">·</span>
          {implementer === "composer" ? (
            <span aria-hidden="true">{IMPLEMENTER_LABELS[implementer]}</span>
          ) : (
            <ProviderLogo provider={implementer} className={LOGO_CLASS} />
          )}
        </>
      )}
    </span>
  );
}
