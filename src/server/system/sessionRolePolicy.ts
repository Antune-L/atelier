import type { SettingSource } from "@anthropic-ai/claude-agent-sdk";

import { WORKER_TOOLS } from "../../shared/protocol.ts";
import type { WorkerToolName } from "../../shared/protocol.ts";

import type { AgentSessionRole } from "./agentSession.ts";

/** Pipeline tools exposed to a session. Backend validation remains the second authorization layer. */
export function workerToolsForRole(role: AgentSessionRole | undefined): WorkerToolName[] {
  if (role === undefined || role === "orchestrator") return WORKER_TOOLS.map((entry) => entry.name);
  if (role === "triage") return ["ask_user", "submit_triage", "fail"];
  if (role === "feasibility") return ["submit_feasibility", "fail"];
  if (role === "split") return ["submit_split", "fail"];
  if (role === "reviewer") return ["submit_review"];
  return [];
}

/**
 * Which filesystem settings a session may load. Delegated review/verification sessions judge a
 * repository, so they must only see that repository's rules: dropping the `user` source keeps
 * `~/.claude/CLAUDE.md` (the operator's personal conventions) out of the verdict. They already opt
 * out of host skills (`skills: []`), the only reason the other roles need the `user` source.
 */
export function settingSourcesForRole(role: AgentSessionRole | undefined): SettingSource[] {
  return role === "reviewer" ? ["project"] : ["user", "project"];
}
