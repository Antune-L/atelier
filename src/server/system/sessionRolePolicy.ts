import type { SettingSource } from "@anthropic-ai/claude-agent-sdk";

import { WORKER_TOOLS } from "../../shared/protocol.ts";
import type { WorkerToolName } from "../../shared/protocol.ts";

import type { AgentSessionRole } from "./agentSession.ts";

export const QUALITY_VALIDATOR_INSTRUCTIONS = "You are an independent quality agent. Follow only the rules in the repository under cwd. Personal host instructions and skills are not validation criteria. Do not edit source files, access external services, or delegate. Report only observations from completed tools; unsupported criteria are inconclusive. Repository inspection commands are restricted to pwd, ls, cat, head, tail, wc and rg, without shell expansion or redirection. Never use rg preprocessors, file inputs or symlink following. Read only repository files and inspect at most ten files, eighty lines each.";

/** Pipeline tools exposed to a session. Backend validation remains the second authorization layer. */
export function workerToolsForRole(role: AgentSessionRole | undefined): WorkerToolName[] {
  if (role === undefined || role === "orchestrator") return WORKER_TOOLS.map((entry) => entry.name);
  if (role === "triage") return ["ask_user", "submit_triage", "fail"];
  if (role === "feasibility") return ["submit_feasibility", "fail"];
  if (role === "split") return ["submit_split", "fail"];
  if (role === "atelier") return ["submit_prd_document", "fail"];
  return [];
}

/**
 * Which filesystem settings a session may load. Delegated review/verification sessions judge a
 * repository, so they must only see that repository's rules: dropping the `user` source keeps
 * `~/.claude/CLAUDE.md` (the operator's personal conventions) out of the verdict. They already opt
 * out of host skills (`skills: []`), the only reason the other roles need the `user` source.
 */
export function settingSourcesForRole(role: AgentSessionRole | undefined): SettingSource[] {
  return role === "reviewer" || role === "quality-validator" ? ["project"] : ["user", "project"];
}
