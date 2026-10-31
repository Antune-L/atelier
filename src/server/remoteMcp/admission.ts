import { remoteMcpProfileEngineError } from "../agents/executionConfig.ts";
import { isProjectKey } from "../config.ts";
import type { Store } from "../db/store.ts";
import type { SystemAdapter } from "../system/types.ts";
import { frozenAgentsOfProfile } from "../ticketOperations.ts";
import type { FrozenTicketAgents } from "../ticketOperations.ts";

export interface RemoteCardAdmissionDeps {
  store: Store;
  system: Pick<SystemAdapter, "checkCodexRuntime" | "checkClaudeAvailable">;
  composerAvailable: boolean;
}

export type RemoteCardsProfileResolution =
  | { ok: true; agents: FrozenTicketAgents }
  | { ok: false; reason: "not_configured" }
  | { ok: false; reason: "engine_unavailable"; detail: string };

export function remoteAllowedProjects(store: Store): Set<string> {
  return new Set(store.getAppSettings().remoteMcpProjectIds.filter(isProjectKey));
}

export async function resolveRemoteCardsProfile(deps: RemoteCardAdmissionDeps): Promise<RemoteCardsProfileResolution> {
  const profileId = deps.store.getAppSettings().remoteMcpCardsProfileId;
  const profile = profileId === null ? null : deps.store.getProfile(profileId);
  if (profile === null) return { ok: false, reason: "not_configured" };
  const engineError = await remoteMcpProfileEngineError(deps.system, deps.composerAvailable, profile);
  if (engineError !== null) return { ok: false, reason: "engine_unavailable", detail: engineError };
  return { ok: true, agents: frozenAgentsOfProfile(profile) };
}
